/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync, spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url);
const ts = require('typescript'), esbuild = require('esbuild');
const read = p => readFileSync(join(root, p), 'utf8'), hash = b => createHash('sha256').update(b).digest('hex');
const worksheet = JSON.parse(read('compatibility/rc/table-column-class-worksheet.json'));
const ownedPath = 'projects/ngx-material-legacy/legacy-table/cell.ts', helperPath = 'projects/ngx-material-legacy/legacy-table/internal/public-constructor-context.ts';
const originalPath = 'reference/material-16.2.14/table-column-classes/cell.ts';
const source = read(ownedPath), before = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', worksheet.source_parent + ':' + ownedPath], {cwd: root, encoding: 'utf8'});
const classesPath = 'projects/ngx-material-legacy/legacy-table/internal/column-classes.ts';
assert.doesNotMatch(source, /_columnCssClassName|_updateColumnCssClassName|_setNameInput|this\._name/);
const classes = read(classesPath);
assert.doesNotMatch(classes, /_columnCssClassName|_setNameInput|_updateColumnCssClassName/);
const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, experimentalDecorators: true}}).outputText;
const provenance = JSON.parse(read('reference/material-16.2.14/table-column-classes/provenance.json'));
assert.equal(hash(read(originalPath)), provenance.sha256);
const worker = read('tests/table_column_class_subject.mjs'), loaded = prepareMaterialPublicSubjects(root);
const results = [], types = [], archiveProofs = [];
const chrome = [process.env.CHROME_BIN, '/usr/bin/chromium-browser', '/snap/bin/chromium'].find(p => p && existsSync(p)); assert.ok(chrome);
try {
  for (const model of loaded.models) {
    const metadata = model.subject.packages.find(p => p.name === '@angular/cdk');
    const archive = '/home/parallels/.cache/ngx-compat-material-legacy-closeout/keycode-subjects/cdk-' + metadata.version + '.tgz';
    const bytes = readFileSync(archive); assert.equal(hash(bytes), metadata.archive_sha256); assert.equal(bytes.length, metadata.archive_bytes);
    assert.equal('sha512-' + createHash('sha512').update(bytes).digest('base64'), metadata.integrity);
    const members = execFileSync('tar', ['-tzvf', archive], {encoding: 'utf8'}).trim().split('\n');
    assert.ok(members.length); for (const row of members) {assert.ok(['-', 'd'].includes(row[0]), 'nonregular tar member');
      const path = row.split(/\s+/).at(-1); assert.ok(path.startsWith('package/') && !path.split('/').includes('..') && !path.includes('\\'));}
    const packageRoot = join(model.root, 'node_modules/@angular/cdk'); mkdirSync(packageRoot, {recursive: true});
    execFileSync('tar', ['--no-same-owner', '--no-same-permissions', '-xzf', archive, '-C', packageRoot, '--strip-components=1']);
    const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'))); assert.equal(pkg.version, metadata.version);
    const runtimePath = join(packageRoot, pkg.exports['./table'].default), runtimeSource = readFileSync(runtimePath, 'utf8');
    archiveProofs.push({line: model.line, version: metadata.version, archive_sha256: hash(bytes), archive_sri: metadata.integrity,
      public_route: '@angular/cdk/table', public_entry_sha256: hash(runtimeSource)});
    writeFileSync(join(model.root, 'helper.mjs'), emit(read(helperPath)));
    const code = model.line === 'original' ? read(originalPath) : source;
    const cellCode = code.replace("./internal/public-constructor-context'", "./helper.mjs'")
      .replace("./internal/column-classes'", "./column-classes.mjs'");
    if (model.line !== 'original') {
      const typed = join(model.root, 'owned-cells.ts'), helper = join(model.root, 'helper.ts'), classFile = join(model.root, 'column-classes.ts');
      writeFileSync(helper, read(helperPath)); writeFileSync(classFile, classes);
      writeFileSync(typed, cellCode.replace('./helper.mjs', './helper').replace('./column-classes.mjs', './column-classes'));
      const program = ts.createProgram([typed, helper, classFile], {strict: true, experimentalDecorators: true,
        noEmit: true, skipLibCheck: false, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], types: []});
      const diagnostics = ts.getPreEmitDiagnostics(program); assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: p => p, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
      const checker = program.getTypeChecker(), s = program.getSourceFile(typed);
      const publicImports = [];
      for (const file of [typed, classFile]) {
        const checked = program.getSourceFile(file);
        for (const statement of checked.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text.startsWith('@angular/'))) {
          for (const item of statement.importClause.namedBindings.elements) {
            const binding = checker.getAliasedSymbol(checker.getSymbolAtLocation(item.name));
            assert.ok(binding.declarations?.length);
            for (const declaration of binding.declarations) {
              assert.ok(!ts.getJSDocTags(declaration).some(t => ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text)), item.name.text);
            }
            publicImports.push({file: file === typed ? ownedPath : classesPath, module: statement.moduleSpecifier.text,
              symbol: (item.propertyName || item.name).text, source_sha256: hash(file === typed ? source : classes)});
          }
        }
      }
      const imported = s.statements.filter(ts.isImportDeclaration).find(n => n.moduleSpecifier.text === '@angular/cdk/table')
        .importClause.namedBindings.elements.find(e => e.name.text === 'CdkColumnDef');
      const symbol = checker.getAliasedSymbol(checker.getSymbolAtLocation(imported.name)); assert.equal(symbol.declarations.length, 1);
      const declaration = symbol.declarations[0];
      assert.ok(!ts.getJSDocTags(declaration).some(t => ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text)));
      for (const name of ['name', 'cssClassFriendlyName', 'hasStickyChanged', 'resetStickyChanged', 'sticky', 'stickyEnd', '_table']) {
        const member = declaration.members.find(n => n.name?.text === name); assert.ok(member);
        assert.ok(!member.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword));
        assert.ok(!ts.getJSDocTags(member).some(t => ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text)));
      }
      types.push({line: model.line, publicImports, public_export_and_members_stable: true, strict: true, skipLibCheck: false,
        diagnostics: 0, compiler: ts.version, compiler_floor_qualified: false});
    }
    for (const variant of model.line === 'original' ? ['original'] : ['after', 'unmarked-column', 'missing-mixed-cell-bridge', 'missing-owned-cell-class']) {
      const helperCode = variant === 'unmarked-column' ? classes.replace('legacyColumns.add(definition);', '') :
        variant === 'missing-mixed-cell-bridge' ? classes.replace('    addLegacyColumnClass(column, elementRef.nativeElement);', '') : classes;
      writeFileSync(join(model.root, 'column-classes.mjs'), model.line === 'original' ? 'export {};\n' : emit(helperCode));
      writeFileSync(join(model.root, 'owned-cells.mjs'), emit(variant === 'missing-owned-cell-class' ? cellCode.replaceAll('    addLegacyColumnClass(columnDef, elementRef.nativeElement);\n', '') : cellCode));
      writeFileSync(join(model.root, 'input.mjs'), 'export const line=' + JSON.stringify(model.line) + ';\n');
      writeFileSync(join(model.root, 'subject.mjs'), worker);
      await esbuild.build({entryPoints: [join(model.root, 'subject.mjs')], bundle: true, format: 'iife', platform: 'browser', outfile: join(model.root, 'bundle.js'), logLevel: 'silent'});
      writeFileSync(join(model.root, 'index.html'), '<pre id="report">pending</pre><script>window.addEventListener("error",function(e){document.getElementById("report").textContent=JSON.stringify({error:String(e.message)});});</script><script src="bundle.js"></script>');
      const server = createServer((request, response) => {const name = request.url === '/bundle.js' ? 'bundle.js' : 'index.html'; response.setHeader('Content-Type', name.endsWith('.js') ? 'application/javascript' : 'text/html'); response.end(readFileSync(join(model.root, name)));});
      await new Promise(done => server.listen(0, '127.0.0.1', done));
      let html;
      try {html = await new Promise((done, reject) => {
        const child = spawn(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--no-first-run', '--user-data-dir=' + join(model.root, 'chrome-' + variant), '--virtual-time-budget=1000', '--dump-dom', 'http://127.0.0.1:' + server.address().port], {stdio: ['ignore', 'pipe', 'pipe']});
        let output = '', error = ''; child.stdout.on('data', b => output += b); child.stderr.on('data', b => error += b);
        const timer = setTimeout(() => {child.kill(); reject(Error('Chromium timeout'));}, 20000);
        child.on('error', reject); child.on('close', code => {clearTimeout(timer); code === 0 ? done(output) : reject(Error(error.slice(-1000)));});
      });} finally {server.close();}
      const text = html.match(/<pre id="report">([\s\S]*?)<\/pre>/)?.[1]; assert.ok(text && text !== 'pending', html.slice(-1500));
      const observation = JSON.parse(text.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"'));
      assert.ok(!observation.error, observation.error); results.push({line: model.line, variant, ...observation});
    }
  }
  const original = results.find(r => r.variant === 'original'), controls = [];
  for (const line of ['main', '21.x']) {
    const after = results.find(r => r.line === line && r.variant === 'after'); assert.deepEqual(after.results, original.results, 'historical final cell classes');
    for (const variant of ['unmarked-column', 'missing-mixed-cell-bridge', 'missing-owned-cell-class']) {
      const changed = results.find(r => r.line === line && r.variant === variant); assert.notDeepEqual(changed.results, original.results, variant);
      controls.push({line, variant, rejected: true, mismatched_cases: changed.results.filter((r, i) => r.classes !== original.results[i].classes).length});
    }
  }
  const report = {schema_version: 1, line: worksheet.line, source_parent: worksheet.source_parent,
    source: {path: ownedPath, before_sha256: hash(before), candidate_sha256: hash(source)}, helper: {path: helperPath, sha256: hash(read(helperPath))},
    original: {path: originalPath, sha256: hash(read(originalPath))}, class_helper: {path: classesPath, sha256: hash(classes)},
    public_subject_capsule_sha256: loaded.capsule_hash, archiveProofs, types, results, controls,
    producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), worker_sha256: hash(worker),
    scope: 'Entire authenticated original/current public CDK namespaces and complete owned/untouched column and cell modules execute in Chromium. Legacy/native/flex/mixed-CDK/raw-peer-column/sanitized/renamed final classes match Original16. Table/ElementRef values are explicit protocols and the private bridge is manually constructed. Genuine complete Angular node/module/AOT/packed integration and runtime/compiler floors remain separate.', g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({models: 3, native_class_cases: original.results.length * 3, original_class_equivalence: true, negative_controls: controls.length, actual_complete_table: false}));
} finally {loaded.dispose();}
