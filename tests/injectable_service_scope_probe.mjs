/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync, spawnSync} from 'node:child_process';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = b => createHash('sha256').update(b).digest('hex');
const read = p => readFileSync(join(root, p), 'utf8');
const worksheet = JSON.parse(read('compatibility/rc/injectable-service-scope-worksheet.json'));
const files = ['legacy-dialog/dialog.ts', 'legacy-dialog/internal/dialog-base.ts',
  'legacy-snack-bar/snack-bar.ts', 'legacy-core/internal/datetime/native-date-adapter.ts',
  'legacy-core/internal/legacy-viewport.ts'];
const leaf = 'projects/ngx-material-legacy/legacy-snack-bar/snack-bar.ts';
const modulePath = 'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-module.ts';
const git = p => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
  'show', worksheet.source_parent + ':' + p], {cwd: root, encoding: 'utf8'});
function inspect(readSource = read) {
  const paths = files.map(file => 'projects/ngx-material-legacy/' + file);
  const options = {noResolve: true, target: ts.ScriptTarget.ES2022, experimentalDecorators: true};
  const host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host);
  host.readFile = p => paths.some(path => p === join(root, path)) ?
    readSource(p.slice(root.length + 1)) : originalRead(p);
  const program = ts.createProgram(paths.map(p => join(root, p)), options, host);
  const checker = program.getTypeChecker(), cases = [];
  for (const file of files) {
    const path = 'projects/ngx-material-legacy/' + file, source = program.getSourceFile(join(root, path));
    assert.equal(source.parseDiagnostics.length, 0);
    const imports = source.statements.filter(ts.isImportDeclaration)
      .filter(n => n.moduleSpecifier.text === '@angular/core')
      .flatMap(n => n.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === 'Injectable'));
    assert.equal(imports.length, 1);
    const imported = imports[0], symbol = checker.getSymbolAtLocation(imported.name), references = [];
    assert.ok(!imported.isTypeOnly && !imported.parent.parent.isTypeOnly);
    assert.deepEqual(symbol.declarations, [imported]);
    function visit(n) {
      if (ts.isIdentifier(n) && n !== imported.name && n !== imported.propertyName && checker.getSymbolAtLocation(n) === symbol) {
        const call = n.parent;
        assert.ok(ts.isCallExpression(call) && call.expression === n && ts.isDecorator(call.parent));
        assert.ok(ts.isClassDeclaration(call.parent.parent));
        assert.equal(call.arguments.length, file.endsWith('legacy-viewport.ts') ? 1 : 0);
        if (call.arguments.length) assert.equal(call.arguments[0].getText(source), "{providedIn: 'root'}");
        references.push({line: source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1,
          owner: call.parent.parent.name.text, expression: call.getText(source)});
      }
      ts.forEachChild(n, visit);
    }
    visit(source); assert.equal(references.length, 1);
    cases.push({file, module: '@angular/core', symbol: 'Injectable',
      candidate_source_sha256: hash(source.text), references});
  }
  assert.equal(readSource(leaf).replace('@Injectable()', '@Injectable({providedIn: MatLegacySnackBarModule})')
    .replace("import {MatLegacySnackBarContainer} from './snack-bar-container';\n",
      "import {MatLegacySnackBarContainer} from './snack-bar-container';\nimport {MatLegacySnackBarModule} from './snack-bar-module';\n"), git(leaf));
  assert.ok(readSource(modulePath).includes("import {MatLegacySnackBar} from './snack-bar';\n"));
  assert.ok(readSource(modulePath).includes('    MatLegacySnackBar,\n'));
  assert.equal(readSource(modulePath).replace("import {MatLegacySnackBar} from './snack-bar';\n", '')
    .replace('    MatLegacySnackBar,\n', ''), git(modulePath));
  return cases;
}
const cases = inspect(), sourceControls = [];
for (const [id, path, changed] of [
  ['type-only-injectable', leaf, read(leaf).replace('Injectable,', 'type Injectable,')],
  ['deprecated-module-scope', leaf, read(leaf).replace('@Injectable()', '@Injectable({providedIn: MatLegacySnackBarModule})')],
  ['wrong-root-scope', leaf, read(leaf).replace('@Injectable()', "@Injectable({providedIn: 'root'})")],
  ['missing-module-provider', modulePath, read(modulePath).replace('    MatLegacySnackBar,\n', '')],
  ['changed-constructor', leaf, read(leaf).replace('breakpointObserver: BreakpointObserver', 'breakpointObserver?: BreakpointObserver')],
  ['extra-injectable-role', leaf, read(leaf) + '\n@Injectable() class Extra {}\n'],
]) {
  assert.notEqual(changed, read(path));
  assert.throws(() => inspect(p => p === path ? changed : read(p)), assert.AssertionError, id);
  sourceControls.push({id, rejected: true});
}
const loaded = prepareMaterialPublicSubjects(root), worker = read('tests/injectable_service_scope_subject.mjs');
const results = [], negatives = [], declarations = [];
try {
  for (const model of loaded.models) {
    let interfaceCount = 0;
    for (const [path, text] of model.sources) if (path.startsWith('@angular/core/') && path.endsWith('.d.ts')) {
      const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
      for (const n of source.statements) if (ts.isInterfaceDeclaration(n) && n.name.text === 'Injectable') {
        assert.ok(n.getText(source).includes('This\n     * option is DEPRECATED.'));
        assert.ok(n.getText(source).includes("'root'")); interfaceCount++;
      }
    }
    assert.equal(interfaceCount, 1);
    const path = join(model.root, 'metadata.ts');
    const fixture = "import {Injectable, NgModule} from '@angular/core';\n" +
      cases.map((c, index) => '@' + c.references[0].expression + ' class Service' + index + ' {}').join('\n') +
      '\n@NgModule({providers: [Service2]}) class Module {}\n';
    writeFileSync(path, fixture);
    const program = ts.createProgram([path], {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, experimentalDecorators: true,
      strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
      getCanonicalFileName: p => p, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    const checker = program.getTypeChecker(), source = program.getSourceFile(path), publicDeclarations = [];
    for (const imported of source.statements[0].importClause.namedBindings.elements) {
      const symbol = checker.getAliasedSymbol(checker.getSymbolAtLocation(imported.name));
      assert.ok(symbol.declarations.length);
      for (const n of symbol.declarations) {
        assert.ok(!ts.getJSDocTags(n).some(t => ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text)));
        const declarationSource = n.getSourceFile(), relative = declarationSource.fileName.slice(model.root.length + '/node_modules/'.length);
        assert.equal(declarationSource.text, model.sources.get(relative));
        publicDeclarations.push({symbol: imported.name.text, path: relative, sha256: hash(declarationSource.text), kind: ts.SyntaxKind[n.kind]});
      }
    }
    declarations.push({line: model.line, publicDeclarations, exact_owned_metadata_type_checks: cases.length,
      compiler: ts.version, strict: true, skipLibCheck: false, diagnostics: 0, compiler_floor_qualified: false});
    writeFileSync(join(model.root, 'scope-subject.mjs'), worker);
    const payload = variant => writeFileSync(join(model.root, 'injectable-scope-input.json'), JSON.stringify({line: model.line, variant}));
    payload('normal');
    const text = execFileSync(process.execPath, [join(model.root, 'scope-subject.mjs')], {cwd: model.root, encoding: 'utf8', timeout: 10000});
    results.push(JSON.parse(text.trim().split('\n').at(-1)));
    for (const variant of ['missing-provider', 'reuse-parent']) {
      payload(variant);
      const result = spawnSync(process.execPath, [join(model.root, 'scope-subject.mjs')], {cwd: model.root, encoding: 'utf8', timeout: 10000});
      assert.notEqual(result.status, 0, variant);
      assert.match(result.stderr, /AssertionError|NG0201|NullInjectorError|No provider/);
      negatives.push({line: model.line, variant, rejected: true});
    }
  }
  const report = {schema_version: 1, line: worksheet.line, source_parent: worksheet.source_parent,
    cases, results, declarations, source_negative_controls: sourceControls, actual_scope_negative_controls: negatives,
    public_subject_capsule_sha256: loaded.capsule_hash, producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))),
    worker_sha256: hash(worker), scope: 'Five checker-bound public Injectable annotation roles and unchanged snack-bar constructor/service code; module-providedIn association moves to an explicit module provider. Genuine public original/minimum DI scope comparisons use service protocols. Exact metadata and public provider types compile against complete peer declarations with borrowed TS6. No full owned service/overlay/native/AOT/packed/compiler/runtime floor/G11 claim.', g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({source_callers: cases.length, peer_models: results.length,
    source_negatives: sourceControls.length, actual_scope_negatives: negatives.length}));
} finally { loaded.dispose(); }
