/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {analyzeExplicitTestEdits} from './upstream-test-import-cleanup-analysis.mjs';
const ts = createRequire(import.meta.url)('typescript'), printer = ts.createPrinter({removeComments: true});
const hash = x => createHash('sha256').update(x).digest('hex');
export const TEST_SETUP_PEERS = 'compatibility/rc/upstream-test-setup-peer-boundary.json.gz';
export const TEST_SETUP_PROFILES = Object.freeze({
  '1c605257faf3f2bb2f19ce31ef26be55794c834a': {kind: 'aria-root-provider', files: ['src/cdk/a11y/aria-describer/aria-describer.spec.ts'], owned: ['projects/ngx-material-legacy/legacy-tooltip/tooltip.ts']},
  '0be125bba77b30979a65742b1e96e5bcc0d6606b': {kind: 'scrolling-fixture-scheduling', files: ['src/cdk/scrolling/scroll-dispatcher.spec.ts', 'src/cdk/scrolling/scroll-dispatcher.zone.spec.ts', 'src/cdk/scrolling/scrollable.spec.ts', 'src/cdk/scrolling/virtual-scroll-viewport.spec.ts', 'src/cdk/scrolling/virtual-scroll-viewport.zone.spec.ts'], owned: ['projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts', 'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.spec.ts']},
  '41d618a1f99d204085408dde35a6f5257d7b3d5c': {kind: 'icon-retained-setup', files: ['src/components-examples/material/icon/icon-harness/icon-harness-example.spec.ts', 'src/material/icon/icon.spec.ts', 'src/material/icon/testing/icon-harness.spec.ts'], owned: ['projects/ngx-material-legacy/styles/icon/_icon-theme.scss']},
  'a2a34f787ec2d3620d3cb0e4b3549f503cc54dd3': {kind: 'checkbox-helper-inlining', files: ['src/material/checkbox/checkbox.spec.ts'], owned: ['projects/ngx-material-legacy/legacy-checkbox/checkbox.spec.ts']},
  'c3ba13317df4019926ab3f16c1ced544928dd858': {kind: 'datepicker-partial-imports', files: ['src/material/datepicker/calendar-body.spec.ts', 'src/material/datepicker/calendar-header.spec.ts', 'src/material/datepicker/month-view.spec.ts', 'src/material/datepicker/multi-year-view.spec.ts', 'src/material/datepicker/testing/calendar-harness.spec.ts', 'src/material/datepicker/year-view.spec.ts'], owned: ['projects/ngx-material-legacy/styles/datepicker/_datepicker-theme.scss', 'projects/ngx-material-legacy/legacy-form-field/testing/form-field-harness.ts']},
  'c07b524e34e8b3978645d698ebe40812f6701349': {kind: 'tab-viewport-test-provider', files: ['src/material/tabs/tab-body.spec.ts', 'src/material/tabs/tab-group.spec.ts', 'src/material/tabs/tab-header.spec.ts', 'src/material/tabs/tab-nav-bar/tab-nav-bar.spec.ts'], owned: ['projects/ngx-material-legacy/legacy-tabs/tab-header.ts', 'projects/ngx-material-legacy/legacy-tabs/tab-header.spec.ts', 'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts']},
});
const parse = (path, text) => {const f = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(f.parseDiagnostics.length, 0); return f;};
const print = (n, file) => printer.printNode(ts.EmitHint.Unspecified, n, file);
const compact = text => text.replace(/\s/g, '');
const isConfig = n => ts.isCallExpression(n) && n.expression.getText() === 'TestBed.configureTestingModule' && n.arguments.length === 1 && ts.isObjectLiteralExpression(n.arguments[0]);
const collect = (file, predicate) => {const result = []; const visit = n => {if (predicate(n)) result.push(n); ts.forEachChild(n, visit);}; visit(file); return result;};
const importsProperty = call => call.arguments[0].properties.find(p => ts.isPropertyAssignment(p) && p.name.getText() === 'imports');
const plainImports = p => {assert.ok(ts.isArrayLiteralExpression(p.initializer) && p.initializer.elements.every(ts.isIdentifier)); return p.initializer.elements.map(n => n.text);};
const providerKey = (call, file) => JSON.stringify(call.arguments[0].properties.filter(p => p !== importsProperty(call)).map(p => compact(print(p, file))));
const contextKey = (node, file) => {
  const names = []; for (let n = node.parent; n; n = n.parent) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['describe', 'it'].includes(n.expression.text) && ts.isStringLiteralLike(n.arguments[0])) names.push(n.expression.text + ':' + n.arguments[0].text);
    if (ts.isFunctionDeclaration(n) && n.name) names.push('function:' + n.name.text);
  } return names.reverse().join('/');
};

/** File membership is from authenticated minimum npm archives, never a younger install. */
export function testSetupPeerBoundary(readMember, line) {
  const bytes = readMember(TEST_SETUP_PEERS); assert.equal(hash(bytes), 'a4d31ca58bcbeb68b283b07f50fc73d4cfe0c8b87b0532ff4c9d29244347402e');
  const raw = gunzipSync(bytes); assert.equal(hash(raw), '25bf47e22a3498a6f47dd148491664d9247711520ed940937b1b0e7c3c309765');
  const body = JSON.parse(raw), subject = body.subjects.find(s => s.line === line); assert.ok(subject);
  const base = JSON.parse(readMember('compatibility/rc/menu-item-public-subjects.json')).subjects.find(s => s.line === line); assert.ok(base);
  const records = subject.packages.map(p => {
    const expected = base.archives.find(a => a.name === p.name); assert.ok(expected);
    for (const key of ['version', 'archive_sha256', 'integrity', 'archive_bytes']) assert.equal(p[key], expected[key]);
    assert.equal(p.package_manifest.name, p.name); assert.equal(p.package_manifest.version, p.version);
    assert.ok(p.members.length && new Set(p.members).size === p.members.length); assert.deepEqual(p.members, [...p.members].sort());
    assert.ok(!p.members.some(n => n.endsWith('.spec.ts')));
    for (const source of p.a11y_source) {assert.ok(p.members.includes(source.path)); assert.equal(hash(source.text), source.sha256);}
    return {name: p.name, version: p.version, archive_sha256: p.archive_sha256, integrity: p.integrity,
      published_members: p.members.length, published_spec_files: 0, published_population_sha256: hash(JSON.stringify(p.members))};
  });
  const source = subject.packages.find(p => p.name === '@angular/cdk').a11y_source[0], file = parse(source.path, source.text);
  const declarations = collect(file, n => ts.isObjectLiteralExpression(n) && n.properties.some(p => ts.isPropertyAssignment(p) && ['type', 'token'].includes(p.name.getText(file)) && p.initializer.getText(file) === 'AriaDescriber')
    && n.properties.some(p => ts.isPropertyAssignment(p) && p.name.getText(file) === 'providedIn' && ts.isStringLiteral(p.initializer) && p.initializer.text === 'root'));
  const serviceDeclarations = collect(file, n => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'ɵɵngDeclareService'
    && n.arguments.length === 1 && ts.isObjectLiteralExpression(n.arguments[0]) && n.arguments[0].properties.some(p => ts.isPropertyAssignment(p) && p.name.getText(file) === 'type' && p.initializer.getText(file) === 'AriaDescriber'));
  let declarationKind;
  if (line === '21.x') {assert.ok(declarations.length > 0); assert.equal(serviceDeclarations.length, 0); declarationKind = 'explicit-root-injectable';}
  else {
    assert.equal(serviceDeclarations.length, 1); assert.equal(declarations.length, 0);
    assert.ok(!serviceDeclarations[0].arguments[0].properties.some(p => p.name?.getText(file) === 'autoProvided'));
    const coreBytes = readMember('compatibility/rc/material-public-subjects.json'); assert.equal(hash(coreBytes), 'f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3');
    const core = JSON.parse(coreBytes).subjects.find(s => s.line === 'main').members.find(m => m.package === '@angular/core' && m.module_path === 'types/core.d.ts'); assert.ok(core);
    const stored = readMember(core.path), declaration = core.compression === 'gzip' ? gunzipSync(stored) : stored;
    assert.equal(hash(declaration), core.sha256); const text = declaration.toString();
    assert.ok(text.includes('interface Service {') && text.includes('Defaults to `true`.') && text.includes('autoProvided?: boolean;'));
    declarationKind = 'automatic-service-default; no root-injectable equivalence claim';
  }
  return {line, capsule_sha256: hash(bytes), packages: records, aria_provider_declaration_source: {path: source.path, sha256: source.sha256, declaration_kind: declarationKind},
    published_peer_spec_files: 0, source_only: true, peer_test_setup_or_runtime_executed: false};
}

/** Account for each private setup operation, then compare every remaining original/after token. */
export function analyzeIndividualTestSetup(sha, subject) {
  const profile = TEST_SETUP_PROFILES[sha]; assert.ok(profile && subject.sha === sha); assert.deepEqual(subject.members.map(m => m.path), profile.files);
  return subject.members.map(member => {
    const before = parse(member.path, member.before.text), after = parse(member.path, member.after.text), actions = [];
    const configs = collect(before, isConfig), afterConfigs = collect(after, isConfig), replacements = new Map();
    for (const call of configs) {
      const imported = importsProperty(call);
      if (!imported) continue;
      const originalNames = plainImports(imported), originalKey = compact(print(call, before));
      if (afterConfigs.some(c => compact(print(c, after)) === originalKey)) continue;
      const other = call.arguments[0].properties.filter(p => p !== imported);
      if (!other.length) {replacements.set(call, ts.factory.createIdentifier('TestBed')); actions.push({kind: 'remove-import-only-setup', line: before.getLineAndCharacterOfPosition(call.getStart()).line + 1, imports: originalNames}); continue;}
      const matches = afterConfigs.filter(c => providerKey(c, after) === providerKey(call, before) && contextKey(c, after) === contextKey(call, before));
      if (profile.kind === 'tab-viewport-test-provider' && member.path.endsWith('/tab-header.spec.ts')) {
        assert.equal(compact(print(other[0], before)), 'providers:[ViewportRuler]'); assert.equal(other.length, 1); assert.equal(matches.length, 0);
        replacements.set(call, ts.factory.createIdentifier('TestBed')); actions.push({kind: 'remove-modern-viewport-test-provider', imports: originalNames}); continue;
      }
      assert.equal(matches.length, 1, 'ambiguous retained provider setup');
      const remaining = importsProperty(matches[0]), names = remaining ? plainImports(remaining) : [];
      assert.ok(names.every(n => originalNames.includes(n))); assert.ok(names.length < originalNames.length);
      const props = call.arguments[0].properties.filter(p => p !== imported);
      if (remaining) props.unshift(ts.factory.createPropertyAssignment('imports', ts.factory.createArrayLiteralExpression(names.map(n => ts.factory.createIdentifier(n)))));
      replacements.set(call, ts.factory.updateCallExpression(call, call.expression, call.typeArguments, [ts.factory.updateObjectLiteralExpression(call.arguments[0], props)]));
      actions.push({kind: 'reduce-setup-imports', imports_before: originalNames, imports_after: names, unchanged_provider_sha256: hash(providerKey(call, before))});
    }
    let helper;
    if (profile.kind === 'aria-root-provider') {
      helper = collect(before, n => ts.isFunctionDeclaration(n) && n.name?.text === 'createFixture')[0]; assert.ok(helper && helper.parameters.length === 1 && helper.body.statements.length === 5);
      const param = helper.parameters[0]; assert.equal(param.name.getText(before), 'providers'); assert.equal(param.type.getText(before), 'Provider[]'); assert.equal(param.initializer.getText(before), '[]');
      const statement = helper.body.statements[0]; assert.ok(ts.isExpressionStatement(statement) && isConfig(statement.expression));
      const props = statement.expression.arguments[0].properties; assert.equal(props.length, 1);
      assert.ok(ts.isPropertyAssignment(props[0]) && props[0].name.getText(before) === 'providers' && ts.isArrayLiteralExpression(props[0].initializer));
      const values = props[0].initializer.elements; assert.equal(values.length, 2);
      assert.ok(ts.isIdentifier(values[0]) && values[0].text === 'AriaDescriber' && ts.isSpreadElement(values[1]) && values[1].expression.getText(before) === 'providers');
      const references = collect(before, n => ts.isIdentifier(n) && n.text === 'createFixture');
      const calls = references.filter(n => n !== helper.name); assert.ok(calls.every(n => ts.isCallExpression(n.parent) && n.parent.expression === n && n.parent.arguments.length === 0));
      replacements.set(statement, null); actions.push({kind: 'remove-private-root-provider-bootstrap', zero_argument_helper_calls: calls.length});
    }
    if (profile.kind === 'checkbox-helper-inlining') {
      helper = collect(before, n => ts.isFunctionDeclaration(n) && n.name?.text === 'createComponent')[0]; assert.ok(helper && helper.parameters.length === 1 && helper.body.statements.length === 2);
      assert.equal(helper.parameters[0].name.getText(before), 'componentType'); assert.equal(helper.parameters[0].type.getText(before), 'Type<T>');
      const cfg = helper.body.statements[0]; assert.ok(ts.isExpressionStatement(cfg) && isConfig(cfg.expression));
      assert.deepEqual(plainImports(importsProperty(cfg.expression)), ['MatCheckboxModule', 'FormsModule', 'ReactiveFormsModule', 'componentType']);
      assert.equal(cfg.expression.arguments[0].properties.length, 1);
      assert.equal(compact(print(helper.body.statements[1], before)), 'returnTestBed.createComponent<T>(componentType);');
      const references = collect(before, n => ts.isIdentifier(n) && n.text === 'createComponent' && n !== helper.name && !ts.isPropertyAccessExpression(n.parent));
      assert.ok(references.length && references.every(n => ts.isCallExpression(n.parent) && n.parent.expression === n && n.parent.arguments.length === 1 && !n.parent.typeArguments));
      for (const n of references) replacements.set(n, ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('TestBed'), 'createComponent'));
      replacements.set(helper, null); actions.push({kind: 'inline-private-checkbox-helper', calls: references.length});
    }
    const unwrapPaths = ['src/cdk/scrolling/scroll-dispatcher.spec.ts', 'src/cdk/scrolling/scroll-dispatcher.zone.spec.ts', 'src/cdk/scrolling/virtual-scroll-viewport.zone.spec.ts'];
    let unwrap;
    if (profile.kind === 'scrolling-fixture-scheduling' && unwrapPaths.includes(member.path)) {
      unwrap = collect(before, n => ts.isCallExpression(n) && n.expression.getText(before) === 'beforeEach' && n.arguments.length === 1 && ts.isCallExpression(n.arguments[0]) && n.arguments[0].expression.getText(before) === 'waitForAsync')[0];
      assert.ok(unwrap); actions.push({kind: 'unwrap-one-beforeEach-waitForAsync'});
    }
    let fixtureImports;
    if (profile.kind === 'scrolling-fixture-scheduling' && member.path.endsWith('/virtual-scroll-viewport.spec.ts')) {
      const cls = before.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'VirtualScrollWithItemInjectingViewContainer'); assert.ok(cls);
      const decorator = ts.getDecorators(cls).find(d => d.expression.expression.text === 'Component'); fixtureImports = decorator.expression.arguments[0].properties.find(p => p.name.getText(before) === 'imports');
      assert.deepEqual(plainImports(fixtureImports), ['ScrollingModule']); actions.push({kind: 'add-explicit-injected-child-fixture-import', name: 'InjectsViewContainer'});
    }
    const transform = ts.transform(before, [context => {
      const visit = node => {
        if (replacements.has(node)) return replacements.get(node) || undefined;
        if (node === fixtureImports) return ts.factory.updatePropertyAssignment(node, node.name, ts.factory.createArrayLiteralExpression([ts.factory.createIdentifier('InjectsViewContainer'), ts.factory.createIdentifier('ScrollingModule')]));
        let updated = ts.visitEachChild(node, visit, context);
        if (node === helper && profile.kind === 'aria-root-provider') updated = ts.factory.updateFunctionDeclaration(updated, updated.modifiers, updated.asteriskToken, updated.name, updated.typeParameters, [], updated.type, updated.body);
        if (node === unwrap) updated = ts.factory.updateCallExpression(updated, updated.expression, updated.typeArguments, [updated.arguments[0].arguments[0]]);
        if (ts.isExpressionStatement(updated) && ts.isIdentifier(updated.expression) && updated.expression.text === 'TestBed') return undefined;
        if (ts.isExpressionStatement(updated) && ts.isCallExpression(updated.expression) && ts.isIdentifier(updated.expression.expression) && updated.expression.expression.text === 'beforeEach' && updated.expression.arguments.length === 1) {
          let fn = updated.expression.arguments[0]; if (ts.isCallExpression(fn) && ts.isIdentifier(fn.expression) && ['waitForAsync', 'fakeAsync'].includes(fn.expression.text) && fn.arguments.length === 1) fn = fn.arguments[0];
          if ((ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) && ts.isBlock(fn.body) && !fn.body.statements.length) return undefined;
        } return updated;
      }; return node => ts.visitNode(node, visit);
    }]);
    const expected = printer.printFile(transform.transformed[0]); transform.dispose();
    assert.ok(actions.length);
    const source = analyzeExplicitTestEdits(member.path, member.before.text, member.after.text, [{start: 0, end: member.before.text.length, text: expected, role: 'individual-original-AST-setup-operations'}]);
    return {path: member.path, actions, source};
  });
}

export function individualTestSetupScope(sha, subject, readMember, line) {
  const profile = TEST_SETUP_PROFILES[sha]; assert.ok(profile); const source = analyzeIndividualTestSetup(sha, subject);
  const manifest = JSON.parse(readMember('projects/ngx-material-legacy/package.json')); assert.equal(manifest.version.startsWith('21.') ? '21.x' : 'main', line);
  const owned = profile.owned.map(path => ({path, sha256: hash(readMember(path))}));
  if (profile.kind === 'checkbox-helper-inlining') {
    const file = parse(profile.owned[0], readMember(profile.owned[0]).toString());
    const helper = collect(file, n => ts.isFunctionDeclaration(n) && n.name?.text === 'createComponent')[0]; assert.ok(helper && helper.parameters.length === 2);
    assert.equal(helper.parameters[1].name.getText(file), 'extraDeclarations');
    const config = collect(helper, isConfig)[0]; assert.ok(config);
    assert.deepEqual(plainImports(importsProperty(config)), ['MatLegacyCheckboxModule', 'FormsModule', 'ReactiveFormsModule']);
    const declarations = config.arguments[0].properties.find(p => p.name.getText(file) === 'declarations');
    assert.ok(declarations && ts.isArrayLiteralExpression(declarations.initializer));
    assert.deepEqual(declarations.initializer.elements.map(n => compact(print(n, file))), ['componentType', '...extraDeclarations']);
  }
  if (profile.kind === 'tab-viewport-test-provider') {
    const file = parse(profile.owned[1], readMember(profile.owned[1]).toString());
    assert.ok(file.statements.some(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === '@ngx-compat/material-legacy/legacy-core'
      && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) && n.importClause.namedBindings.elements.some(e => e.propertyName?.text === '_LegacyViewport' && e.name.text === 'ViewportRuler')));
    assert.ok(collect(file, isConfig).some(c => c.arguments[0].properties.some(p => ts.isPropertyAssignment(p) && p.name.getText(file) === 'providers'
      && ts.isArrayLiteralExpression(p.initializer) && p.initializer.elements.some(n => ts.isIdentifier(n) && n.text === 'ViewportRuler'))));
  }
  return {schema_version: 1, line, sha, kind: profile.kind, diff_sha256: subject.diff_sha256, complete_changed_files: profile.files,
    source_operations: source, minimum_peer_boundary: testSetupPeerBoundary(readMember, line), owned_context: owned,
    source_only: true, upstream_setup_correctness_owned_behavior_native_or_packed_executed: false, g11_claim: 'not-passed'};
}
