/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Minimum peers execute the unchanged parent-behavior assertion bodies in fresh processes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {prepareMenuItemPublicSubjects} from '../scripts/menu-item-public-subjects.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const read = p => readFileSync(join(root, p), 'utf8'), hash = b => createHash('sha256').update(b).digest('hex');
const prefix = 'projects/ngx-material-legacy/legacy-menu/';
const helperPath = prefix + 'internal/menu-item-context.ts', helper = read(helperPath);
function sourceReview(raw) {
  const file = ts.createSourceFile(helperPath, raw, ts.ScriptTarget.Latest, true); assert.equal(file.parseDiagnostics.length, 0);
  const imports = file.statements.filter(ts.isImportDeclaration);
  const core = imports.filter(n => n.moduleSpecifier.text === '@angular/core').flatMap(n => n.importClause?.namedBindings?.elements || []);
  const injected = core.filter(n => (n.propertyName || n.name).text === 'inject'); assert.equal(injected.length, 1);
  const binding = injected[0]; assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly);
  const options = {noResolve: true, noLib: true}, path = join(root, helperPath), host = ts.createCompilerHost(options); host.getSourceFile = p => p === path ? file : undefined;
  const checker = ts.createProgram([path], options, host).getTypeChecker(), imported = checker.getSymbolAtLocation(binding.name), references = [];
  const visit = node => {
    if (ts.isIdentifier(node) && node.text === binding.name.text && node !== binding.name && node !== binding.propertyName) {
      assert.ok(checker.getSymbolAtLocation(node) === imported, 'shadowed Core inject');
      assert.ok(ts.isCallExpression(node.parent) && node.parent.expression === node, 'escaped Core inject');
      references.push(node.parent);
    }
    ts.forEachChild(node, visit);
  }; visit(file);
  const expected = [['Injector', '@angular/core', false], ['MAT_MENU_PANEL', './menu-panel-token', true],
    ['ElementRef', '@angular/core', false], ['DOCUMENT', '@angular/core', false], ['FocusMonitor', '@angular/cdk/a11y', false], ['ChangeDetectorRef', '@angular/core', false]];
  assert.equal(references.length, expected.length);
  const tokens = [];
  for (let index = 0; index < expected.length; index++) {
    const [name, module, optional] = expected[index], call = references[index];
    const declared = imports.filter(n => n.moduleSpecifier.text === module).flatMap(n => n.importClause?.namedBindings?.elements || []).filter(n => (n.propertyName || n.name).text === name); assert.equal(declared.length, 1);
    assert.ok(!declared[0].isTypeOnly && !declared[0].parent.parent.isTypeOnly);
    assert.ok(checker.getSymbolAtLocation(call.arguments[0]) === checker.getSymbolAtLocation(declared[0].name), 'wrong captured token');
    assert.equal(call.arguments.length, optional ? 2 : 1);
    if (optional) {assert.ok(ts.isObjectLiteralExpression(call.arguments[1])); assert.equal(call.arguments[1].properties.length, 1); const property = call.arguments[1].properties[0]; assert.ok(ts.isPropertyAssignment(property)); assert.equal(property.name.getText(file), 'optional'); assert.equal(property.initializer.kind, ts.SyntaxKind.TrueKeyword);}
    let owner = call; while (owner.parent && !ts.isFunctionDeclaration(owner)) owner = owner.parent;
    assert.ok(ts.isFunctionDeclaration(owner) && owner.name.text === 'constructLegacyMenuItem');
    tokens.push({line: file.getLineAndCharacterOfPosition(call.getStart(file)).line + 1, kind: 'captured-public-token', token: name, module, optional, expression: call.getText(file)});
  }
  const constructor = file.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'constructLegacyMenuItem'); assert.ok(constructor);
  return {file: 'legacy-menu/internal/menu-item-context.ts', module: '@angular/core', symbol: 'inject', candidate_source_sha256: hash(raw), references: tokens, scope: constructor.getText(file)};
}
const review = sourceReview(helper), sourceControls = [];
for (const [id, mutant] of [
  ['wrong-Core-import', helper.replace("from '@angular/core'", "from 'foreign-core'")],
  ['owned-panel-not-optional', helper.replace('inject(MAT_MENU_PANEL, {optional: true})', 'inject(MAT_MENU_PANEL)')],
  ['required-document-is-optional', helper.replace('inject(DOCUMENT)', 'inject(DOCUMENT,{optional:true})')],
  ['numeric-panel-flags', helper.replace('inject(MAT_MENU_PANEL, {optional: true})', 'inject(MAT_MENU_PANEL,8)')],
  ['wrong-element-capture', helper.replace('inject(ElementRef)', 'inject(DOCUMENT)')],
  ['wrong-detector-capture', helper.replace('inject(ChangeDetectorRef)', 'inject(ElementRef)')],
  ['wrong-application-capture', helper.replace('inject(Injector)', 'inject(ChangeDetectorRef)')],
  ['shadowed-import', helper.replace('target: Function', 'target: Function, inject: Function')],
  ['escaped-import', helper + '\nexport const escaped = inject;\n'],
]) {assert.notEqual(mutant, helper); assert.throws(() => sourceReview(mutant), undefined, id); sourceControls.push({id, rejected: true});}
const workerPath = 'tests/menu_item_di_runtime_probe.mjs', worker = read(workerPath);
const oldRoot = "const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');";
assert.equal(worker.split(oldRoot).length, 2);
const relocated = worker.replace(oldRoot, 'const root = ' + JSON.stringify(root) + ';');
const importCore = "const core = await import(url('@angular/core'));"; assert.equal(relocated.split(importCore).length, 2);
const capsulePath = 'compatibility/rc/menu-item-public-subjects.json', capsuleBytes = readFileSync(join(root, capsulePath)), capsule = JSON.parse(capsuleBytes);
const namespaceControls = [];
for (const [id, mutate] of [
  ['wrong-framework-base-capsule', c => c.base_capsule.sha256 = '0'.repeat(64)],
  ['wrong-line', c => c.subjects[1].line = 'main'],
  ['borrowed-main-closure', c => c.subjects[1].closures = c.subjects[0].closures],
  ['missing-runtime-edge', c => c.subjects[0].closures.runtime.edges.pop()],
  ['missing-type-member', c => c.subjects[0].closures.types.members.pop()],
  ['missing-peer-source', c => c.subjects[0].additions.pop()],
]) {
  const changed = structuredClone(capsule); mutate(changed);
  assert.throws(() => prepareMenuItemPublicSubjects(root, {readMember: p => p === capsulePath ? Buffer.from(JSON.stringify(changed)) : readFileSync(join(root, p))}), /capsule changed/);
  namespaceControls.push({id, rejected: true});
}
const memberPath = capsule.subjects[0].additions[0].path;
for (const id of ['changed-compressed-peer-member', 'missing-compressed-peer-member']) {
  assert.throws(() => prepareMenuItemPublicSubjects(root, {readMember: p => {
    const bytes = readFileSync(join(root, p));
    return p !== memberPath ? bytes : id.startsWith('missing') ? Buffer.alloc(0) : Buffer.concat([bytes, Buffer.from('tamper')]);
  }}));
  namespaceControls.push({id, rejected: true});
}
const apiWorkerPath = 'tests/menu_item_api_contract_probe.mjs', apiWorker = read(apiWorkerPath);
const apiRoot = "const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), req = createRequire(import.meta.url);";
assert.equal(apiWorker.split(apiRoot).length, 2);
let apiImports = 0;
const apiScript = apiWorker.replace(apiRoot, 'const root = ' + JSON.stringify(root) + ', req = createRequire(import.meta.url);')
  .replace(/(['"])(\.\.\/scripts\/[^'"]+\.mjs)\1/g, (_, quote, spec) => {
    apiImports++; const target = resolve(root, 'tests', spec);
    assert.ok(target.startsWith(join(root, 'scripts/'))); readFileSync(target);
    return JSON.stringify(pathToFileURL(target).href);
  });
assert.equal(apiImports, 5);
const loaded = prepareMenuItemPublicSubjects(root), runtime = [], declarations = [], strictTypes = [], apiFactory = [];
try {
  for (const model of loaded.models) {
    // resolve calls in the source diagnostic from the temporary genuine namespace.
    // Only the source-root setup and production-mode setup change; assertions stay intact.
    for (const mode of ['development', 'production']) {
      const script = mode === 'production' ? relocated.replace(importCore, importCore + '\ncore.enableProdMode();') : relocated;
      const file = join(model.root, 'minimum-menu-runtime-' + mode + '.mjs'), report = join(model.root, 'minimum-menu-runtime-' + mode + '.json');
      writeFileSync(file, script);
      const stdout = execFileSync(process.execPath, [file, '--report', report], {cwd: model.root, encoding: 'utf8', timeout: 20000});
      const result = JSON.parse(readFileSync(report)), summary = JSON.parse(stdout.trim().split('\n').at(-1));
      assert.equal(result.runtime_peer, model.packages.get('@angular/core').version); assert.equal(summary.failed, 0);
      assert.equal(result.mutations.length, 5); assert.ok(result.cases.every(c => c.result === 'pass'));
      for (const cap of result.sources) assert.equal(hash(readFileSync(join(root, cap.path))), cap.sha256);
      runtime.push({line: model.line, mode, framework: result.runtime_peer, components: model.packages.get('@angular/material').version, node: result.node, compiler: result.compiler, cases: result.cases, mutations: result.mutations, borrowed: model.borrowed, worker_sha256: hash(script), assertion_body_sha256: hash(worker)});
    }
    const apiFile = join(model.root, 'minimum-menu-api-factory.mjs'), apiReport = join(model.root, 'minimum-menu-api-factory.json');
    writeFileSync(apiFile, apiScript);
    const apiStdout = execFileSync(process.execPath, [apiFile, '--report', apiReport], {cwd: model.root, encoding: 'utf8', timeout: 20000});
    const apiResult = JSON.parse(readFileSync(apiReport)), apiSummary = JSON.parse(apiStdout.trim().split('\n').at(-1));
    assert.equal(apiResult.runtime_peer, model.packages.get('@angular/core').version);
    assert.equal(apiSummary.runtime_positive, 1); assert.equal(apiSummary.runtime_mutants, 7);
    assert.equal(apiSummary.authority_mutants, 4); assert.equal(apiSummary.signature_mutants, 12); assert.equal(apiSummary.settlement_mutants, 13);
    for (const cap of apiResult.source_caps) assert.equal(hash(readFileSync(join(root, cap.path))), cap.sha256);
    apiFactory.push({line: model.line, framework: apiResult.runtime_peer, components: model.packages.get('@angular/material').version, relocated_worker_sha256: hash(apiScript), original_worker_sha256: hash(apiWorker), summary: apiSummary, source_caps: apiResult.source_caps, actual_factory: apiResult.runtime[0], authority_mutants: apiResult.authority_mutants, signature_mutants: apiResult.signature_mutants, runtime_mutants: apiResult.runtime.slice(1), settlement_mutants: apiResult.settlement_mutants});
    const peer = 'node_modules/@angular/material/types/menu.d.ts', text = readFileSync(join(model.root, peer), 'utf8'), source = ts.createSourceFile(peer, text, ts.ScriptTarget.Latest, true);
    const item = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'MatMenuItem'); assert.ok(item);
    const exported = source.statements.filter(ts.isExportDeclaration).some(n => n.exportClause?.elements?.some(e => e.name.text === 'MatMenuItem')); assert.ok(exported);
    const unstable = n => ts.getJSDocTags(n).filter(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text));
    assert.equal(unstable(item).length, 0);
    const parent = item.members.find(n => n.name?.getText(source) === '_parentMenu'), constructor = item.members.find(ts.isConstructorDeclaration); assert.ok(parent && constructor);
    assert.ok(!parent.modifiers?.some(m => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.ReadonlyKeyword].includes(m.kind)));
    assert.equal(unstable(parent).length, 0); assert.equal(unstable(constructor).length, 0);
    declarations.push({line: model.line, version: model.packages.get('@angular/material').version, source_sha256: hash(text), public_export: true, parent_member: parent.getText(source), constructor: constructor.getText(source), no_unstable_markers: true});
    const fixture = join(model.root, 'minimum-menu-consumer.mts');
    const fixtureText = `import {MatMenuItem} from '@angular/material/menu';
import {MatLegacyMenuItem} from ${JSON.stringify(join(root, prefix + 'menu-item'))};
import {MAT_MENU_PANEL} from ${JSON.stringify(join(root, prefix + 'internal/menu-panel-token'))};
import type {InjectionToken} from '@angular/core';
import type {MatMenuPanel} from ${JSON.stringify(join(root, prefix + 'internal/menu-panel'))};
declare const owned:MatLegacyMenuItem;const peer:MatMenuItem=owned;
const token:InjectionToken<MatMenuPanel>=MAT_MENU_PANEL;
class Consumer extends MatLegacyMenuItem {state='consumer';}
new MatLegacyMenuItem();new Consumer();new MatMenuItem();void [peer,token];
// @ts-expect-error Obsolete manual dependency arguments are deliberately retired.
new MatLegacyMenuItem({});
// @ts-expect-error No legacy instance initialization arguments are introduced.
new Consumer({});
`;
    writeFileSync(fixture, fixtureText);
    const options = {strict: true, noEmit: true, skipLibCheck: false, types: [], lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], experimentalDecorators: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler};
    const host = ts.createCompilerHost(options);
    host.resolveModuleNames = (names, from) => names.map(name => ts.resolveModuleName(name,
      name.startsWith('@angular/') ? join(model.root, '__peer__.mts') : from, options, host).resolvedModule);
    const program = ts.createProgram([fixture], options, host), diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    const sourceFiles = program.getSourceFiles().filter(f => f.fileName.startsWith(join(root, prefix)));
    assert.ok(sourceFiles.some(f => f.fileName === join(root, helperPath)));
    const checker = program.getTypeChecker(), selectedCalls = [];
    const helperSource = program.getSourceFile(join(root, helperPath));
    const inspectCall = node => {
      if (ts.isCallExpression(node) && (node.expression.getText(helperSource) === 'inject' || node.expression.getText(helperSource) === 'this.application.get')) {
        const signature = checker.getResolvedSignature(node); assert.ok(signature);
        assert.ok(!signature.getJsDocTags().some(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.name)));
        assert.ok(signature.declaration.getSourceFile().fileName.startsWith(join(model.root, 'node_modules/@angular/core/')));
        selectedCalls.push({call: node.getText(helperSource), declaration: signature.declaration.getText(signature.declaration.getSourceFile())});
      }
      ts.forEachChild(node, inspectCall);
    }; inspectCall(helperSource); assert.equal(selectedCalls.length, 7);
    strictTypes.push({line: model.line, compiler: ts.version, strict: true, skipLibCheck: false, diagnostics: 0, negative_types: 2, nondeprecated_actual_source_calls: selectedCalls, actual_owned_source_files: sourceFiles.map(f => ({path: f.fileName.slice(root.length + 1), sha256: hash(f.text)})), fixture_sha256: hash(fixtureText)});
  }
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const report = {schema_version: 1, line, role: 'One current inject import with actual owned leaf/current minimum public parent and caller root; source-only diagnostic', node: process.version, compiler: ts.version, source_review: review, source_controls: sourceControls, namespace_controls: namespaceControls,
    public_namespace_capsule_sha256: loaded.capsule_hash, base_capsule_sha256: loaded.base_capsule_hash, declarations, strictTypes, runtime, api_factory: apiFactory,
    worker_source_sha256: hash(worker), producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), namespace_helper_sha256: hash(read('scripts/menu-item-public-subjects.mjs')),
    limits: ['Complete static runtime/type closures authenticate exact framework22.1.7/components22.1.7 and framework21.2.23/components21.2.14. RxJS/tslib, hostNode22.23.3 and TypeScript6.0.3 are borrowed; this is not the full installed Node/RxJS/compiler consumer-floor matrix.',
      'Actual owned leaf, genuine peer parent and genuine public application root execute. Node services/panel and DOM are explicit protocols; native template Input transforms/query/provider identity, AOT/packed/SSR/CSP/style geometry and complete G02/G11/G12 qualification remain independent.',
      'The original constructor/factory reference is untouched. Manual constructor parity remains deliberately absent under finite delegated technical judgment; the earlier historical-implementation approval is separate.'], g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({current_uses: 1, minimum_namespaces: 2, development_production_contexts: runtime.length, parent_cases: runtime.reduce((n, r) => n + r.cases.length, 0), parent_mutations_rejected: runtime.reduce((n, r) => n + r.mutations.length, 0), source_controls: sourceControls.length, namespace_controls: namespaceControls.length, strict_subjects: strictTypes.length, actual_JIT_factory_subjects: apiFactory.length, packed_or_native_qualified: false}));
} finally {loaded.dispose();}
