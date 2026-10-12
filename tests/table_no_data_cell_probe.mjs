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
const worksheet = JSON.parse(read('compatibility/rc/table-no-data-cell-worksheet.json'));
const ownedPath = 'projects/ngx-material-legacy/legacy-table/row.ts', helperPath = 'projects/ngx-material-legacy/legacy-table/internal/public-constructor-context.ts';
const originalPath = 'reference/material-16.2.14/table-no-data-cells/row.ts';
const rendererPath = 'reference/material-16.2.14/table-outlet-sources/cdk-table.ts';
const source = read(ownedPath), before = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', worksheet.source_parent + ':' + ownedPath], {cwd: root, encoding: 'utf8'});
assert.equal(source.replace("    // Material 16 did not add classes to the cells inside a no-data row.\n    row._cellClassNames = [];\n    // Even an empty classList.add call creates a class attribute in the DOM.\n    row._cellSelector = ':not(*)';\n", ''), before);
const printer = ts.createPrinter({removeComments: false});
function ast(path, text) {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;}
function owner(text) {const source = ast(ownedPath, text), matches = source.statements.filter(n => ts.isClassDeclaration(n) && n.name?.text === 'MatLegacyNoDataRow'); assert.equal(matches.length, 1); return matches[0].getFullText(source);}
function renderer(path, text) {const source = ast(path, text), cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'CdkTable'); assert.ok(cls);
  const method = cls.members.find(n => ts.isMethodDeclaration(n) && n.name?.text === '_updateNoDataRow'); assert.ok(method);
  return {source: method.getText(source), body: printer.printNode(ts.EmitHint.Unspecified, method.body, source)};}
const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, experimentalDecorators: true}}).outputText;
const provenance = JSON.parse(read('reference/material-16.2.14/table-no-data-cells/provenance.json'));
assert.equal(hash(read(originalPath)), provenance.untouched_source.sha256);
const originalProvenance = JSON.parse(read('reference/material-16.2.14/table-outlet-sources/provenance.json'));
assert.equal(hash(read(rendererPath)), originalProvenance.files.find(r => r.path === rendererPath).sha256);
const originalRenderer = renderer(rendererPath, read(rendererPath));
assert.doesNotMatch(originalRenderer.source, /_cellClassNames|querySelectorAll/);
const worker = read('tests/table_no_data_cell_subject.mjs'), loaded = prepareMaterialPublicSubjects(root), results = [], types = [], archiveProofs = [];
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
    const render = model.line === 'original' ? originalRenderer : renderer(runtimePath, runtimeSource);
    archiveProofs.push({line: model.line, version: metadata.version, archive_sha256: hash(bytes), archive_sri: metadata.integrity,
      public_route: '@angular/cdk/table', public_entry_sha256: hash(runtimeSource), renderer_sha256: hash(render.source), renderer_method: render.source});
    writeFileSync(join(model.root, 'helper.mjs'), emit(read(helperPath)));
    const header = "import {CdkNoDataRow} from '@angular/cdk/table';\nimport {Directive,TemplateRef} from '@angular/core';\n";
    const code = header + (model.line === 'original' ? '' : "import {constructWithPublicDependencies} from './helper.mjs';\n") + owner(model.line === 'original' ? read(originalPath) : source);
    if (model.line !== 'original') {
      const typed = join(model.root, 'owned-no-data.ts'), helper = join(model.root, 'helper.ts');
      writeFileSync(helper, read(helperPath)); writeFileSync(typed, code.replace('./helper.mjs', './helper'));
      const program = ts.createProgram([typed, helper], {strict: true, experimentalDecorators: true,
        noEmit: true, skipLibCheck: false, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], types: []});
      const diagnostics = ts.getPreEmitDiagnostics(program); assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: p => p, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
      const checker = program.getTypeChecker(), imported = program.getSourceFile(typed).statements[0].importClause.namedBindings.elements[0];
      const symbol = checker.getAliasedSymbol(checker.getSymbolAtLocation(imported.name)); assert.equal(symbol.declarations.length, 1);
      const declaration = symbol.declarations[0]; assert.ok(ts.isClassDeclaration(declaration));
      assert.ok(!ts.getJSDocTags(declaration).some(t => ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text)));
      for (const name of ['_contentClassNames', '_cellClassNames', '_cellSelector', 'templateRef']) {
        const member = declaration.members.find(n => n.name?.text === name); assert.ok(member);
        assert.ok(!member.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword));
        assert.ok(!ts.getJSDocTags(member).some(t => ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text)));
      }
      types.push({line: model.line, public_export_and_members_stable: true, strict: true, skipLibCheck: false,
        diagnostics: 0, compiler: ts.version, compiler_floor_qualified: false});
    }
    for (const variant of model.line === 'original' ? ['original'] : ['before', 'after', 'wrong-root-class', 'missing-selector-guard']) {
      const candidate = variant === 'before' ? before : variant === 'wrong-root-class' ? source.replace("row._contentClassNames = ['mat-no-data-row'];", "row._contentClassNames = ['cdk-no-data-row'];") : variant === 'missing-selector-guard' ? source.replace("    row._cellSelector = ':not(*)';\n", '') : source;
      writeFileSync(join(model.root, 'no-data-owned.mjs'), emit(model.line === 'original' ? code : header + "import {constructWithPublicDependencies} from './helper.mjs';\n" + owner(candidate)));
      const emittedRender = ast('renderer.js', emit('function render() ' + render.body));
      const renderBody = emittedRender.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'render').body.getText(emittedRender);
      writeFileSync(join(model.root, 'no-data-input.mjs'), 'export const line=' + JSON.stringify(model.line) + ';\nexport const renderSource=' + JSON.stringify(renderBody) + ';\n');
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
    const after = results.find(r => r.line === line && r.variant === 'after'); assert.deepEqual(after.observations, original.observations, 'historical DOM and view lifecycle');
    for (const variant of ['before', 'wrong-root-class', 'missing-selector-guard']) {
      const changed = results.find(r => r.line === line && r.variant === variant); assert.notDeepEqual(changed.observations, original.observations, variant);
      controls.push({line, variant, rejected: true, mismatched_cases: changed.observations.filter((r, i) => r.html !== original.observations[i].html).map(r => r.id)});
    }
  }
  const report = {schema_version: 1, line: worksheet.line, source_parent: worksheet.source_parent,
    source: {path: ownedPath, before_sha256: hash(before), candidate_sha256: hash(source)}, helper: {path: helperPath, sha256: hash(read(helperPath))},
    original: {path: originalPath, sha256: hash(read(originalPath)), renderer_path: rendererPath, renderer_sha256: hash(read(rendererPath))},
    public_subject_capsule_sha256: loaded.capsule_hash, archiveProofs, types, results, controls,
    producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), worker_sha256: hash(worker),
    scope: 'Actual public original/current CdkNoDataRow namespaces, complete actual owned constructors and borrower helper execute in Chromium with native DOM. Whole immutable original/current table renderer methods are replayed with explicit embedded-view/outlet/change-detector protocols. Seven DOM cases and empty/data/empty lifecycle match Original16. The genuine complete CdkTable, actual owned node/compiled component and exact packed application remain final Actions obligations; compiler/runtime floors and G11 are not qualified.', g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({models: 3, native_cases: 21, original_dom_equivalence: true, negative_controls: controls.length, actual_complete_table: false}));
} finally {loaded.dispose();}
