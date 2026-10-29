/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Owned reference replay and genuine public Injector diagnostic; no historical code executes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';

const root = process.cwd(), prefix = 'compatibility/rc/21x-base-class-removal-source-';
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex'), bindings = new Map();
function readBound(path, expected) {
  const absolute = resolve(root, path), raw = readFileSync(absolute);
  if (expected) assert.equal(hash(raw), expected, path);
  const ref = {path: relative(root, absolute), sha256: hash(raw), bytes: raw.length};
  if (bindings.has(absolute)) assert.deepEqual(bindings.get(absolute), ref);
  else bindings.set(absolute, ref);
  return raw;
}
readBound(fileURLToPath(import.meta.url));
readBound(require.resolve('typescript'));
assert.equal(process.version, 'v24.21.0');
assert.equal(ts.version, '5.9.2');
const versions = {};
for (const [name, expected] of [['@angular/core', '21.2.23'], ['@angular/compiler', '21.2.23'],
  ['@angular/cdk', '21.2.14'], ['@angular/material', '21.2.14'], ['rxjs', '7.8.2']]) {
  const version = JSON.parse(readBound('node_modules/' + name + '/package.json')).version;
  assert.equal(version, expected, name); versions[name] = version;
}
const original = JSON.parse(gunzipSync(readBound(prefix + 'originals.json.gz',
  '3cb87a97a4365dd9959ec4c5fd4a5a2e1f0d5c3656e91e7e1aef65181955f49a')));
const worksheet = JSON.parse(readBound(prefix + 'worksheet.json',
  'a7459210660b5eea641d1239ef0a2c8fb329df8a4c2ef8c8a89a123353b1dace'));
for (const key of ['protected_ledger', 'protected_registry', 'protected_roster', 'prior_source_admission']) {
  const ref = worksheet[key]; assert.equal(readBound(ref.path, ref.sha256).length, ref.bytes);
}
const tagged = original.tagged_reference.members.find(m => m.path === 'src/material/snack-bar/snack-bar-ref.ts');
assert.ok(tagged);
assert.equal(hash(tagged.body), 'dd0c31f1907650bf197f97b75de8eaac94d4cb203e9ed01c4b872cb5bfba8f66');
const supplement = JSON.parse(readBound(prefix + 'tagged-alias-supplement.json',
  '98906ac4377fba4132cb404ba6953f302ccc7730d1585e3dac589f6360b316c0'));
const legacyBarrel = supplement.members.find(m => m.path === 'src/material/legacy-snack-bar/public-api.ts');
assert.equal(hash(legacyBarrel.body), legacyBarrel.sha256);
const refPath = 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-ref.ts';
const servicePath = 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts';
const refText = readBound(refPath).toString(), serviceText = readBound(servicePath).toString();
const barrelText = readBound('projects/ngx-material-legacy/legacy-snack-bar/public-api.ts').toString();
const peerDeclaration = readBound('node_modules/@angular/material/types/snack-bar.d.ts').toString();
const cyph = ['shared/js/cyph/services/material-dialog.service.ts', 'shared/js/cyph/modules/cyph-web.module.ts']
  .map(path => {
    const bytes = readBound('/home/parallels/cyph/' + path);
    return {path, sha256: hash(bytes), bytes: bytes.length};
  });
const parse = text => {
  const source = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;
};
const printer = ts.createPrinter({removeComments: true});
function owner(text, name) {
  const source = parse(text), node = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === name);
  assert.ok(node, name); return {source, node};
}
function classTokens(text, name) {
  const {source, node} = owner(text, name);
  return printer.printNode(ts.EmitHint.Unspecified, node, source);
}
assert.equal(classTokens(refText, 'MatSnackBarRef'), classTokens(tagged.body, 'MatSnackBarRef'));
assert.match(refText, /const MAX_TIMEOUT = Math\.pow\(2, 31\) - 1;/);
const findAlias = (text, exported) => {
  const source = parse(text);
  for (const n of source.statements) if (ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause)) {
    const item = n.exportClause.elements.find(e => e.name.text === exported);
    if (item) return {specifier: n.moduleSpecifier.text, original: (item.propertyName || item.name).text};
  }
  assert.fail('Missing alias ' + exported);
};
assert.deepEqual(findAlias(legacyBarrel.body, 'MatLegacySnackBarRef'),
  {specifier: '@angular/material/snack-bar', original: 'MatSnackBarRef'});
assert.deepEqual(findAlias(barrelText, 'MatLegacySnackBarRef'),
  {specifier: './internal/snack-bar-ref', original: 'MatSnackBarRef'});
const peerRef = owner(peerDeclaration, 'MatSnackBarRef');
const peerConstructor = peerRef.node.members.find(ts.isConstructorDeclaration);
assert.equal(peerConstructor.parameters[0].type.getText(peerRef.source), 'MatSnackBarContainer');
assert.equal(peerRef.node.members.find(n => n.name?.getText(peerRef.source) === 'containerInstance')
  .type.getText(peerRef.source), 'MatSnackBarContainer');

for (const name of ['@angular/compiler', '@angular/core', '@angular/material/snack-bar', 'rxjs'])
  readBound(fileURLToPath(import.meta.resolve(name)));
await import('@angular/compiler');
const {Injector} = await import('@angular/core');
const {MatSnackBarRef: PeerRef, MAT_SNACK_BAR_DATA} = await import('@angular/material/snack-bar');
const {Subject} = await import('rxjs');
function replayClass(text, name, dependencies) {
  const {source, node} = owner(text, name);
  const transformed = ts.transform(node, [context => current => {
    const visit = n => ts.isDecorator(n) ? undefined : ts.visitEachChild(n, visit, context);
    return ts.visitNode(current, visit);
  }]);
  let printed;
  try { printed = printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], source); }
  finally { transformed.dispose(); }
  const emitted = ts.transpileModule(printed.replace(/^export /, ''), {compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, removeComments: true,
  }}).outputText;
  assert.doesNotMatch(emitted, /\b(?:import|require)\b|__decorate/);
  return new Function(...Object.keys(dependencies), emitted + '\nreturn ' + name)(...Object.values(dependencies));
}
function lifetime(text, mode) {
  const events = [], timers = [];
  const LocalRef = replayClass(text, 'MatSnackBarRef', {
    Subject, MAX_TIMEOUT: 2147483647,
    setTimeout: (callback, delay) => {timers.push({callback, delay}); return timers.length;},
    clearTimeout: id => events.push(['clear-timeout', id ?? null]),
  });
  const container = {_onEnter: new Subject(), _onExit: new Subject(),
    exit: () => {events.push(['exit']); return container._onExit;}};
  const ref = new LocalRef(container, {dispose: () => events.push(['dispose'])});
  assert.equal(ref.containerInstance, container);
  assert.equal(ref.afterOpened(), container._onEnter);
  ref.afterOpened().subscribe({next: () => events.push(['opened']), complete: () => events.push(['opened-complete'])});
  ref.onAction().subscribe({next: () => events.push(['action']), complete: () => events.push(['action-complete'])});
  ref.afterDismissed().subscribe({next: event => events.push(['dismissed', event]),
    complete: () => events.push(['dismissed-complete'])});
  container._onEnter.next(); container._onEnter.complete();
  ref._dismissAfter(Infinity); assert.equal(timers[0].delay, 2147483647);
  ref._open();
  if (mode === 'action') ref.dismissWithAction();
  else if (mode === 'deprecated-action') ref.closeWithAction();
  else timers[0].callback();
  container._onExit.next(); container._onExit.complete();
  const expected = [['opened'], ['opened-complete'],
    ...(mode === 'timeout' ? [] : [['action'], ['action-complete']]), ['exit'], ['clear-timeout', 1],
    ...(mode === 'timeout' ? [] : [['clear-timeout', 1]]), ['dispose'],
    ...(mode === 'timeout' ? [['action-complete']] : []),
    ['dismissed', {dismissedByAction: mode !== 'timeout'}], ['dismissed-complete']];
  assert.deepEqual(events, expected);
  return {mode, events, capped_duration: timers[0].delay};
}
const lifetimes = ['action', 'deprecated-action', 'timeout'].map(mode => lifetime(refText, mode));
const lifetimeFaults = [
  ['missing-exit-subscription', 'containerInstance._onExit.subscribe(() => this._finishDismiss());', ''],
  ['wrong-action-payload', 'dismissedByAction: this._dismissedByAction', 'dismissedByAction: false'],
  ['wrong-open-stream', 'return this.containerInstance._onEnter;', 'return this._afterOpened;'],
].map(([name, before, after]) => {
  assert.equal(refText.split(before).length, 2);
  assert.throws(() => lifetime(refText.replace(before, after), 'action'), {name: 'AssertionError'});
  return name;
});
const LocalRef = replayClass(refText, 'MatSnackBarRef', {Subject});
const Service = replayClass(serviceText, '_MatSnackBarBase', {Injector, MatSnackBarRef: LocalRef, MAT_SNACK_BAR_DATA});
const marker = {legacyReference: true}, data = {message: 'historical data'};
function injectorCase(implementation, inheritedPeer) {
  const inherited = {modernReference: true};
  const parent = Injector.create({providers: inheritedPeer ? [{provide: PeerRef, useValue: inherited}] : []});
  const service = new implementation(null, null, parent, null, null, {});
  const injector = service._createInjector({data}, marker);
  const row = {inherited_peer: inheritedPeer, local_ref_exact: injector.get(LocalRef) === marker,
    data_exact: injector.get(MAT_SNACK_BAR_DATA) === data,
    peer_ref_is_local: injector.get(PeerRef, null) === marker,
    peer_ref_is_inherited_modern: injector.get(PeerRef, null) === inherited,
    peer_ref_missing: injector.get(PeerRef, null) === null};
  injector.destroy(); parent.destroy(); return row;
}
const currentInjectors = [false, true].map(inherited => injectorCase(Service, inherited));
assert.equal(currentInjectors[0].peer_ref_missing, true);
assert.equal(currentInjectors[1].peer_ref_is_inherited_modern, true);
assert.ok(currentInjectors.every(r => r.local_ref_exact && r.data_exact && !r.peer_ref_is_local));
const provider = '{provide: MatSnackBarRef, useValue: snackBarRef},';
assert.equal(serviceText.split(provider).length, 2);
const proposedService = serviceText.replace(provider, provider + '\n        {provide: PeerMatSnackBarRef, useValue: snackBarRef},');
const BridgedService = replayClass(proposedService, '_MatSnackBarBase',
  {Injector, MatSnackBarRef: LocalRef, PeerMatSnackBarRef: PeerRef, MAT_SNACK_BAR_DATA});
const proposedInjectors = [false, true].map(inherited => injectorCase(BridgedService, inherited));
assert.ok(proposedInjectors.every(r => r.local_ref_exact && r.data_exact && r.peer_ref_is_local &&
  !r.peer_ref_is_inherited_modern && !r.peer_ref_missing));
assert.notEqual(LocalRef, PeerRef);
for (const [absolute, ref] of bindings) {
  const raw = readFileSync(absolute); assert.equal(raw.length, ref.bytes); assert.equal(hash(raw), ref.sha256);
}
const report = {
  schema_version: 1, line: '21.x', sha: worksheet.sha, node: process.version, typescript: ts.version, versions,
  scope: 'Exact owned historical reference class body and full owned service class replay with Angular decorators removed;real public minimum Injector/RxJS/peer token. Container,overlay and clock are explicit protocols. Historical source is parsed for identity only and never executed. Proposed extra public-token provider is tested in memory only.',
  historical_ref_class_tokens_identical: true, tagged_legacy_ref_alias_shared_with_current: true,
  owned_ref_alias_is_local: true, current_peer_constructor_and_container_property: 'MatSnackBarContainer',
  nominal_peer_ref_identity_retained: false, lifetimes, lifetime_faults_rejected: lifetimeFaults,
  current_injectors: currentInjectors, proposed_injectors: proposedInjectors,
  finding: 'Owned legacy content resolves its local ref,but a historical current MatSnackBarRef token lookup is missing or inherits an unrelated modern reference. A scoped local provider alias can preserve content-injector lookup identity while keeping the owned historical reference/container.',
  recommendation: 'Retain the owned historical ref and local public legacy alias;assess the deliberate nominal/subtype TypeScript change separately. Carry an explicit current-public-token provider bridge into a separately bounded repair after full source assessment;do not restore modern container inheritance or alter legacy structure/styles.',
  cyph_read_only_source_refs: cyph, cyph_modified: false, consumer_build_executed: false,
  historical_programs_executed: false, product_changes: 0, canonical_dispositions_changed: 0,
  current_legacy_Angular_node_or_native_packed_browser_floor_qualified: false,
  whole_SHA_substantive_review_complete: false, g11_claim: 'not-passed', source_bindings: [...bindings.values()],
};
writeFileSync(prefix + 'snack-reference-qualified.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({result: 'snack-reference-contract-diagnostic-qualified', lifetime_routes: lifetimes.length,
  lifetime_faults_rejected: lifetimeFaults.length, injector_cases: currentInjectors.length + proposedInjectors.length,
  historical_DI_gap_reproduced: true, product_changes: 0, whole_SHA_qualified: false}));
