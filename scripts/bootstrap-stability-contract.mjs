/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Execute only the owned bootstrap with controlled public-module doubles, never upstream source. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = data => createHash('sha256').update(data).digest('hex');
const prefix = 'compatibility/rc/bootstrap-stability-';
export const BOOTSTRAP_PATH = 'testing/legacy-runner/init-test-env.ts';
const beforePins = {main: 'ad28f1069e31f94215368462dce0c5bdc821cf8a0b04134df869cf0e3bb4bd74',
  '21.x': '54e0a11e43fb22cdf150379eecdc49f9e892c3007c7f48956fbdbef87e2ec537'};
const referencePath = 'compatibility/rc/mixed-peer-async-source-fixture-stability-reference-intake.json.gz';
const referencePin = 'e86b0d8dca357eea93985d99eb54cbf76578dc7282e6046f6e525de65f890337';
const parse = text => {const file = ts.createSourceFile('bootstrap.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0); return file;};
function collect(node, predicate) {const rows = []; function visit(n) {if (predicate(n)) rows.push(n); ts.forEachChild(n, visit);} visit(node); return rows;}
function semantic(node) {const children = []; ts.forEachChild(node, n => {children.push(semantic(n));});
  return [node.kind, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];}
const fingerprint = node => hash(JSON.stringify(semantic(node)));
export function bootstrapBefore({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path))), line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const bytes = read(prefix + 'before.json.gz'); assert.equal(hash(bytes), beforePins[line]);
  const before = JSON.parse(gunzipSync(bytes)); assert.equal(before.line, line);
  assert.equal(before.bootstrap.path, BOOTSTRAP_PATH); assert.equal(hash(before.bootstrap.text), before.bootstrap.sha256);
  assert.equal(before.affected_source_receipts.length, 9); return before;
}
export function publicFixtureReferenceFacts({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path))), bytes = read(referencePath);
  assert.equal(hash(bytes), referencePin); const packet = JSON.parse(gunzipSync(bytes));
  assert.equal(hash(read(packet.metadata_capsule.path)), packet.metadata_capsule.sha256);
  assert.deepEqual(packet.subjects.map(n => [n.line, n.version]), [['original', '16.2.12'], ['main', '22.1.7'], ['21.x', '21.2.23']]);
  return packet.subjects.map(subject => {
    assert.equal(subject.archive_sha256_verified, true); assert.equal(subject.archive_sri_sha512_verified, true);
    assert.equal(hash(subject.runtime_member.text), subject.runtime_member.sha256);
    const file = parse(subject.runtime_member.text), classes = collect(file, n => ts.isClassDeclaration(n) && n.name?.text === 'ComponentFixture');
    assert.equal(classes.length, 1); const methods = classes[0].members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(file) === 'whenStable');
    assert.equal(methods.length, 1); const first = methods[0].body.statements[0]; assert.ok(ts.isIfStatement(first));
    assert.equal(first.expression.getText(file), 'this.isStable()');
    assert.equal(first.thenStatement.statements[0].expression.getText(file), 'Promise.resolve(false)');
    return {line: subject.line, version: subject.version, public_method_sha256: hash(methods[0].getText(file)),
      stable_fast_return_guarded_by_isStable: true, original_complete_runtime_member_sha256: subject.runtime_member.sha256,
      actual_upstream_fixture_or_floor_executed: false};
  });
}
/** Only the import and the two statements implementing the override may change. */
export function compareBootstrapSource(before, after) {
  const source = parse(before), current = parse(after), removed = [];
  const transformed = ts.transform(source, [context => {
    const visit = node => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === '@angular/core/testing') {
        const clause = node.importClause; assert.ok(clause && ts.isNamedImports(clause.namedBindings));
        const dropped = clause.namedBindings.elements.filter(n => n.name.text === 'ComponentFixture'); assert.equal(dropped.length, 1);
        removed.push({kind: 'unused-public-fixture-import', sha256: hash(dropped[0].getText(source))});
        return ts.factory.updateImportDeclaration(node, node.modifiers,
          ts.factory.updateImportClause(clause, clause.isTypeOnly, clause.name,
            ts.factory.updateNamedImports(clause.namedBindings, clause.namedBindings.elements.filter(n => n.name.text !== 'ComponentFixture'))),
          node.moduleSpecifier, node.attributes);
      }
      if (ts.isVariableStatement(node) && node.declarationList.declarations.length === 1) {
        const declaration = node.declarationList.declarations[0];
        if (declaration.name.getText(source) === 'whenStable' && declaration.initializer?.getText(source) === 'ComponentFixture.prototype.whenStable') {
          removed.push({kind: 'captured-public-method', sha256: hash(node.getText(source))}); return undefined;
        }
      }
      if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression) &&
          node.expression.left.getText(source) === 'ComponentFixture.prototype.whenStable') {
        assert.equal(node.expression.operatorToken.kind, ts.SyntaxKind.EqualsToken);
        removed.push({kind: 'unconditional-fakeAsync-stability-override', sha256: hash(node.getText(source))}); return undefined;
      }
      return ts.visitEachChild(node, visit, context);
    }; return node => ts.visitNode(node, visit);
  }]);
  assert.deepEqual(removed.map(n => n.kind), ['unused-public-fixture-import', 'captured-public-method', 'unconditional-fakeAsync-stability-override']);
  assert.equal(fingerprint(transformed.transformed[0]), fingerprint(current), 'bootstrap changed beyond the owned stability override');
  transformed.dispose(); return {before_sha256: hash(before), current_sha256: hash(after), removed,
    all_other_bootstrap_operations_preserved: true, no_historical_callback_or_product_edit: true};
}
function gate() {
  let resolveGate, rejectGate;
  const promise = new Promise((resolve, reject) => {resolveGate = resolve; rejectGate = reject;});
  promise.catch(() => {}); return {promise, resolve: resolveGate, reject: rejectGate};
}
export async function exerciseBootstrapContract(text) {
  const compilation = ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS, experimentalDecorators: true}, reportDiagnostics: true});
  assert.deepEqual(compilation.diagnostics.filter(n => n.category === ts.DiagnosticCategory.Error), []);
  const cases = [];
  for (const fakeAsyncMarker of [false, true]) {
    class ContractFixture {
      constructor(stable) {this.stable = stable; this.completion = gate();}
      isStable() {return this.stable;}
      whenStable() {return this.isStable() ? Promise.resolve(false) : this.completion.promise;}
    }
    class CommonModule {} class BrowserTestingModule {}
    const init = [], configured = [], provider = {zoneChangeDetection: true};
    const testBed = {initTestEnvironment: (...args) => {init.push(args);},
      configureTestingModule: definition => {configured.push(definition); return testBed;}};
    const modules = {'@angular/compiler': {}, 'zone.js': {}, 'zone.js/testing': {},
      '@angular/common': {CommonModule}, '@angular/core': {NgModule: () => target => target, provideZoneChangeDetection: () => provider},
      '@angular/core/testing': {ComponentFixture: ContractFixture, getTestBed: () => testBed},
      '@angular/platform-browser/testing': {BrowserTestingModule, platformBrowserTesting: () => ({publicTestingPlatform: true})}};
    const imports = [];
    const context = {exports: {}, Reflect: {}, Promise, WeakMap, Map,
      Zone: {current: {get: key => key === 'FakeAsyncTestZoneSpec' && fakeAsyncMarker ? {} : undefined}},
      require: name => {assert.ok(Object.hasOwn(modules, name), 'unreviewed bootstrap module '+name); imports.push(name); return modules[name];}};
    vm.runInNewContext(compilation.outputText, context, {timeout: 1000, filename: 'owned-legacy-bootstrap.js'});
    assert.equal(init.length, 1); testBed.configureTestingModule();
    assert.ok(configured[0].imports.includes(CommonModule), 'CommonModule preparation lost');
    for (const scenario of ['stable', 'pending-resolution', 'pending-rejection', 'pending-destruction']) {
      const fixture = new ContractFixture(scenario === 'stable'), error = Error('controlled '+scenario);
      let result, thrown;
      try {result = fixture.whenStable();} catch (e) {thrown = e;}
      let settled = false, value, rejection;
      const observed = Promise.resolve(result).then(v => {settled = true; value = v;}, e => {settled = true; rejection = e;});
      await Promise.resolve(); await Promise.resolve();
      const settledBeforeCompletion = settled;
      if (scenario === 'pending-resolution') {fixture.stable = true; fixture.completion.resolve(true);}
      else if (scenario !== 'stable') fixture.completion.reject(error);
      await observed;
      const passed = !thrown && (scenario === 'stable' ? settledBeforeCompletion && value === false && !rejection :
        !settledBeforeCompletion && (scenario === 'pending-resolution' ? value === true && !rejection : rejection === error));
      cases.push({id: (fakeAsyncMarker ? 'fakeAsync-marker' : 'outside-fakeAsync')+'/'+scenario,
        result: passed ? 'pass' : 'fail', settled_before_framework_completion: settledBeforeCompletion,
        preserved_framework_rejection: scenario.includes('rejection') || scenario.includes('destruction') ? rejection === error : null});
    }
  }
  return {model: 'Complete owned bootstrap executed with public-module doubles and controlled promises; no actual Angular fixture, Zone fakeAsync, compiler application, renderer/browser or supported floor.',
    cases, passed: cases.filter(n => n.result === 'pass').length, failed: cases.filter(n => n.result !== 'pass').length,
    actual_Angular_fixture_native_browser_or_floor_qualified: false};
}
