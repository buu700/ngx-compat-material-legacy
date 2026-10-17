/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four individual complete-source reviews. This does not execute Angular or admit a runtime gate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve, posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteMixedPeerAsyncFile} from '../compatibility/rc/mixed-peer-async-source-authenticator.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/mixed-peer-async-source-';
const hash = value => createHash('sha256').update(value).digest('hex');
const pinSha = '21b76bb4eba5ac05901625e49fd2e5dfd67c1f311d429c46d8d5da6c3868049e';
export const PEER_ASYNC_SHAS = ['325533aae8d81d21f55d96bf9ebaaa9136882bd6',
  '32c53088d171b949477df8198c26b51ebb8caa74', '263dadf4f2865d93a3455edca87496625a9d538e',
  '897bcff943e5d695ffe927deec354770b4720926'];
const parse = text => {const file = ts.createSourceFile('review.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0, 'unparseable reviewed source'); return file;};
function collect(node, predicate) {const out = []; function visit(n) {if (predicate(n)) out.push(n); ts.forEachChild(n, visit);} visit(node); return out;}
function semantic(node) {const children = []; ts.forEachChild(node, n => {children.push(semantic(n));});
  return [node.kind, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];}
const fingerprint = node => hash(JSON.stringify(semantic(node)));
const fact = node => ({kind: ts.SyntaxKind[node.kind], raw: node.getText(), sha256: hash(node.getText()), semantic_sha256: fingerprint(node)});
const named = (file, className) => {const matches = collect(file, n => ts.isClassDeclaration(n) && n.name?.text === className);
  assert.equal(matches.length, 1, 'missing/ambiguous class ' + className); return matches[0];};
const member = (file, className, name) => {const matches = named(file, className).members.filter(n => n.name?.getText() === name && !!n.body);
  assert.equal(matches.length, 1, 'missing/ambiguous method ' + className + '.' + name); return matches[0];};
/** Only a finite fixture projection; no scheduling, error-phase or rendered-output equivalence. */
export function projectPeerFixture(text, index) {
  const file = parse(text), removed = [];
  const changed = ts.transform(file, [context => {const visit = node => {
    if (ts.isImportDeclaration(node)) {removed.push(fact(node)); return undefined;}
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.arguments.length === 0 &&
        /^(fixture|fixture.componentRef|propOrderFixture)\.changeDetectorRef\.markForCheck$/.test(node.expression.expression.getText())) {
      removed.push(fact(node)); return undefined;
    }
    if (index === 0 && ts.isPropertyAssignment(node) && node.name.getText() === 'providers' &&
        node.initializer.getText() === '[provideZoneChangeDetection()]') {removed.push(fact(node)); return undefined;}
    if (index === 0 && ts.isCallExpression(node) && node.expression.getText() === 'provideZoneChangeDetection' && node.arguments.length === 0) {
      removed.push(fact(node)); return undefined;
    }
    return ts.visitEachChild(node, visit, context);
  }; return node => ts.visitNode(node, visit);}]);
  const result = {semantic_sha256: fingerprint(changed.transformed[0]), removed}; changed.dispose(); return result;
}
function frame(member, side, index) {
  const text = member[side].text, file = parse(text), subject = {members: [member]};
  return {sha256: hash(text), semantic_sha256: fingerprint(file),
    cases: originalEnvironmentCases(subject, side).map(({raw, normalized_callback_sha256, ...row}) => row),
    hooks: overlayHooks(subject, side).map(({raw, ...row}) => row),
    imports: file.statements.filter(ts.isImportDeclaration).map(fact),
    declarations: file.statements.filter(n => !ts.isImportDeclaration(n)).map(fact),
    finite_fixture_projection: member.path.endsWith('.spec.ts') && index < 2 ? projectPeerFixture(text, index) : null};
}
export function observePeerAsyncSubject(subject, index) {
  assert.equal(subject.sha, PEER_ASYNC_SHAS[index]);
  const files = subject.members.map(m => ({path: m.path, before: frame(m, 'before', index), after: frame(m, 'after', index)}));
  const before = files.flatMap(n => n.before.cases), after = files.flatMap(n => n.after.cases), byKey = new Map(after.map(n => [n.key, n]));
  assert.equal(before.length, [223, 411, 739, 21][index]); assert.equal(after.length, before.length);
  const pairs = before.map(old => {const next = byKey.get(old.key); assert.ok(next, 'historical source regression lost');
    assert.equal(old.mode, next.mode); return {key: old.key, before_sha256: old.sha256, after_sha256: next.sha256,
      complete_callback_semantics_equal: old.callback_sha256 === next.callback_sha256};});
  assert.equal(pairs.filter(n => n.complete_callback_semantics_equal).length, [204, 76, 728, 19][index]);
  // These two files have individually reviewed error/flush, signal-binding and provider changes.
  // Every other spec in the first two commits must retain ALL operations beyond this finite projection.
  const exceptions = ['src/material/menu/menu.spec.ts', 'src/cdk/drag-drop/directives/drag.spec.ts'];
  if (index < 2) for (const file of files.filter(n => n.path.endsWith('.spec.ts') && !exceptions.includes(n.path)))
    assert.equal(file.before.finite_fixture_projection.semantic_sha256, file.after.finite_fixture_projection.semantic_sha256,
      'operation escaped finite fixture projection ' + file.path);
  return {sha: subject.sha, files, cases_before: before.length, cases_after: after.length,
    unchanged_complete_callbacks: pairs.filter(n => n.complete_callback_semantics_equal).length, pairs,
    source_conclusion_only: true, scheduling_error_lifecycle_or_runtime_equivalence_proved: false};
}
export function reviewPeerAsyncSubject(subject, index, pin) {
  assert.deepEqual(subject.members.map(n => [n.path, hash(n.before.text), hash(n.after.text)]),
    pin.observation.files.map(n => [n.path, n.before.sha256, n.after.sha256]), 'original complete member bytes drifted');
  const observed = observePeerAsyncSubject(subject, index);
  assert.equal(hash(JSON.stringify(observed)), hash(JSON.stringify(pin.observation)), 'unreviewed complete original source frame');
  return observed;
}
export function inspectPeerAsyncFloor(floor) {
  assert.equal(floor.version, floor.line === 'main' ? '22.1.7' : '21.2.14');
  assert.equal(floor.archive.name, '@angular/cdk'); assert.equal(floor.archive.version, floor.version);
  assert.equal(floor.archive_sha256_verified, true); assert.equal(floor.archive_sri_sha512_verified, true);
  const members = new Map(); for (const row of floor.members) {assert.equal(hash(row.text), row.sha256);
    assert.equal(Buffer.byteLength(row.text), row.bytes); assert.ok(!members.has(row.archive_member)); members.set(row.archive_member, row);}
  const manifest = JSON.parse(members.get('package/package.json').text); assert.equal(manifest.version, floor.version);
  const sources = new Map();
  for (const source of floor.mapped_sources) {const mapping = JSON.parse(members.get(source.source_map_member).text);
    assert.equal(hash(source.text), source.source_sha256); const i = mapping.sources.indexOf(source.source_map_path);
    assert.ok(i >= 0); assert.equal(mapping.sourcesContent[i], source.text);
    const file = parse(source.text), jsPath = source.source_map_member.slice(0, -4);
    assert.ok(members.has(jsPath), 'mapped source absent from captured runtime closure');
    sources.set(source.source_map_path.split('/src/cdk/')[1], {file, js: parse(members.get(jsPath).text), source});}
  assert.equal(sources.size, 11);
  const overlay = parse(members.get('package/' + manifest.exports['./overlay'].default.slice(2)).text);
  const declarationPath = 'package/' + manifest.exports['./overlay'].types.slice(2);
  function publicDeclaration(name, path = declarationPath, seen = new Set()) {
    assert.ok(!seen.has(path + ':' + name), 'declaration re-export cycle'); seen.add(path + ':' + name);
    const file = parse(members.get(path).text), local = file.statements.filter(n =>
      (ts.isClassDeclaration(n) || ts.isFunctionDeclaration(n)) && n.name?.text === name);
    if (local.length === 1) {
      assert.ok(local[0].modifiers?.some(n => n.kind === ts.SyntaxKind.ExportKeyword) || file.statements.some(n =>
        ts.isExportDeclaration(n) && !n.moduleSpecifier && n.exportClause && ts.isNamedExports(n.exportClause) &&
        n.exportClause.elements.some(e => e.name.text === name)), 'local declaration is not public ' + name);
      return local[0];
    }
    for (const n of file.statements) {
      if (!ts.isExportDeclaration(n) || !n.moduleSpecifier || !n.exportClause || !ts.isNamedExports(n.exportClause)) continue;
      const specifier = n.exportClause.elements.find(e => e.name.text === name);
      if (specifier) return publicDeclaration(specifier.propertyName?.text || name,
        posix.normalize(posix.join(posix.dirname(path), n.moduleSpecifier.text.replace(/\.js$/, '.d.ts'))), seen);
    }
    for (const n of file.statements) {
      if (!ts.isImportDeclaration(n) || !n.importClause?.namedBindings || !ts.isNamedImports(n.importClause.namedBindings)) continue;
      const specifier = n.importClause.namedBindings.elements.find(e => e.name.text === name);
      if (specifier) return publicDeclaration(specifier.propertyName?.text || name,
        posix.normalize(posix.join(posix.dirname(path), n.moduleSpecifier.text.replace(/\.js$/, '.d.ts'))), seen);
    }
    assert.fail('missing public declaration ' + name);
  }
  const factoryPaths = {createOverlayRef: 'overlay/overlay.ts',
    createFlexibleConnectedPositionStrategy: 'overlay/position/flexible-connected-position-strategy.ts',
    createGlobalPositionStrategy: 'overlay/position/global-position-strategy.ts',
    createBlockScrollStrategy: 'overlay/scroll/block-scroll-strategy.ts',
    createRepositionScrollStrategy: 'overlay/scroll/reposition-scroll-strategy.ts'};
  const factories = [];
  for (const [name, path] of Object.entries(factoryPaths)) {
    const exported = overlay.statements.filter(n => ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause) &&
      n.exportClause.elements.some(e => e.name.text === name)); assert.equal(exported.length, 1, 'missing public factory export ' + name);
    const row = sources.get(path), find = file => {const found = file.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
      assert.equal(found.length, 1, 'missing factory ' + name); return found[0];};
    const source = find(row.file), shipped = find(row.js), decl = publicDeclaration(name);
    assert.ok(!ts.getJSDocDeprecatedTag(decl), 'deprecated factory');
    assert.equal(fingerprint(source.body), fingerprint(shipped.body), 'factory source/shipped implementation differs');
    factories.push({name, declaration: fact(decl), source: fact(source), shipped_body: fact(shipped.body)});
  }
  const oldService = publicDeclaration('Overlay'); assert.ok(!ts.getJSDocDeprecatedTag(oldService), 'Overlay service deprecated');
  assert.ok(overlay.statements.some(n => ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause) &&
    n.exportClause.elements.some(e => e.name.text === 'Overlay')), 'public Overlay service export missing');
  for (const name of ['create', 'position']) assert.ok(!ts.getJSDocDeprecatedTag(oldService.members.find(n => n.name?.getText() === name)));
  const row = sources.get('overlay/overlay.ts');
  for (const name of ['create', 'position']) assert.equal(fingerprint(member(row.file, 'Overlay', name).body), fingerprint(member(row.js, 'Overlay', name).body));
  assert.equal(member(row.file, 'Overlay', 'create').body.getText().replace(/\s/g, ''), '{returncreateOverlayRef(this._injector,config);}');
  const context = sources.get('menu/context-menu-trigger.ts');
  const listbox = sources.get('listbox/listbox.ts');
  return {line: floor.line, version: floor.version, factories, public_overlay_service: fact(oldService),
    overlay_create: fact(member(row.file, 'Overlay', 'create')), overlay_position: fact(member(row.file, 'Overlay', 'position')),
    context_menu_open: fact(member(context.file, 'CdkContextMenuTrigger', 'open')),
    listbox_disabled_state: fact(member(listbox.file, 'CdkListbox', 'setDisabledState')),
    drag_registry: fact(named(sources.get('drag-drop/drag-drop-registry.ts').file, 'DragDropRegistry')),
    drag_ref: fact(named(sources.get('drag-drop/drag-ref.ts').file, 'DragRef')),
    complete_member_frames: floor.members.map(({text, ...row}) => row), actual_runtime_or_floor_qualified: false};
}
export function inspectPeerErrorDefaults(capsule) {
  return capsule.subjects.filter(n => n.line !== 'original').map(subject => {
    const text = subject.runtime_member.text; assert.equal(hash(text), subject.runtime_member.sha256);
    const file = parse(text), handler = member(file, 'TestBedApplicationErrorHandler', 'handleError');
    assert.ok(text.includes('const RETHROW_APPLICATION_ERRORS_DEFAULT = true;'));
    assert.ok(text.includes('moduleDef.rethrowApplicationErrors ?? RETHROW_APPLICATION_ERRORS_DEFAULT'));
    assert.ok(handler.body.getText().includes('this.whenStableRejectFunctions.size > 0'));
    assert.ok(handler.body.getText().includes('fn(e)')); assert.ok(handler.body.getText().includes('throw e;'));
    const stable = member(file, 'ComponentFixture', 'whenStable');
    assert.ok(stable.body.getText().includes('this.appErrorHandler.whenStableRejectFunctions.add(reject)'));
    const compile = member(file, 'TestBedCompiler', 'compileTestModule');
    assert.ok(compile.body.getText().includes('if (this.rethrowApplicationTickErrors)'));
    assert.ok(compile.body.getText().includes('const handler = inject$1(TestBedApplicationErrorHandler)'));
    return {line: subject.line, version: subject.version, handler: fact(handler), when_stable: fact(stable),
      test_module_error_provider: fact(compile),
      default_rethrow_application_errors: true, source_only: true, actual_fixture_or_floor_executed: false};
  });
}
export function reviewPeerAsyncFloor(floor, pin) {const observed = inspectPeerAsyncFloor(floor);
  assert.deepEqual(observed, pin, 'unreviewed exact published minimum frame'); return observed;}
export function inspectPeerOwnedScope({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path))), paths = candidateProductSourcePaths(root), rows = [];
  const forbidden = /^@angular\/(?:cdk(?:-experimental)?\/(?:menu|drag-drop|listbox|column-resize|popover-edit|combobox)|material-experimental\/column-resize)(?:\/|$)/;
  const ownedOverlay = [];
  for (const path of paths) {const raw = read(path), text = raw.toString(); rows.push({path, sha256: hash(raw)});
    if (!path.endsWith('.ts') || path.endsWith('.spec.ts')) continue;
    const file = parse(text); for (const n of collect(file, n => ts.isImportDeclaration(n) || ts.isExportDeclaration(n))) {
      if (!n.moduleSpecifier) continue; assert.ok(!forbidden.test(n.moduleSpecifier.text), 'unexpected affected peer dependency ' + path);
      if (n.moduleSpecifier.text === '@angular/cdk/overlay') ownedOverlay.push({path, declaration: fact(n)});
    }
    for (const n of collect(file, ts.isClassDeclaration)) assert.ok(!['CdkContextMenuTrigger', 'DragDropRegistry', 'DragRef', 'CdkListbox', 'CdkCombobox', 'Resizable', 'EditServices', 'CdkPopoverEdit'].includes(n.name?.text), 'ordinary peer fork');
  }
  assert.equal(paths.length, 1028); assert.ok(ownedOverlay.length > 0);
  const bootstrap = read('testing/legacy-runner/init-test-env.ts').toString();
  assert.equal(hash(bootstrap), 'c74c044e7869eb96e8a704b62e36e4c27a2115cb3e0b4815ebb634035f4de15c', 'bootstrap preparation changed');
  const menu = read('projects/ngx-material-legacy/legacy-menu/menu.spec.ts').toString();
  const regression = originalEnvironmentCases({members: [{path: 'legacy-menu/menu.spec.ts', after: {text: menu}}]}, 'after')
    .find(n => n.name === "'should throw if assigning a menu that contains the trigger'");
  assert.ok(regression?.raw.includes('.toThrowError(/menu cannot contain its own trigger/)'));
  return {source_members: paths.length, members_sha256: hash(JSON.stringify(rows)), affected_CDK_or_experimental_dependencies: 0,
    owned_overlay_routes: ownedOverlay, bootstrap_sha256: hash(bootstrap), recursive_menu_case: regression,
    required_consumer_CSS_SCSS_changes: 0, actual_runtime_or_floor_executed: false};
}
export function peerAsyncPins({root = rootDefault, readMember} = {}) {const read = readMember || (p => readFileSync(resolve(root, p)));
  const bytes = read(prefix + 'observation-pins.json.gz'); assert.equal(hash(bytes), pinSha, 'reviewed pins changed'); return JSON.parse(gunzipSync(bytes));}
export function inspectPeerAsyncSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), pins = peerAsyncPins({root, readMember: read});
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const load = name => {const raw = read(prefix + name); assert.equal(hash(raw), pins.capsules[line][name]); return JSON.parse(gunzipSync(raw));};
  const originals = load('subjects.json.gz'), acquisition = load('acquisition.json.gz');
  assert.deepEqual(originals.subjects.map(n => n.sha), PEER_ASYNC_SHAS); assert.deepEqual(acquisition.subjects, PEER_ASYNC_SHAS);
  const censusRaw = read('compatibility/rc/upstream-complete-patch-census.json.gz'), census = JSON.parse(gunzipSync(censusRaw));
  assert.equal(hash(censusRaw), originals.source_inventory.sha256); assert.equal(census.commits.length, 1697);
  for (const packet of [originals, acquisition]) {assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
    assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);}
  assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false);
  assert.equal(acquisition.upstream_or_candidate_source_executed, false);
  const subjects = originals.subjects.map((subject, index) => {
    const row = census.commits.find(n => n.sha === subject.sha); assert.equal(row.raw_commit, subject.raw_commit);
    assert.deepEqual(row.complete_changed_files, subject.complete_changed_files);
    assert.equal(hash(read(prefix + subject.sha + '.original.patch')), subject.diff_sha256);
    const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), hunks = [];
    assert.equal(parts.length, subject.members.length);
    for (const [i, member] of subject.members.entries()) {const diff = parts[i];
      hunks.push(...reviewCompleteMixedPeerAsyncFile({...subject, members: [member], complete_changed_files: [subject.complete_changed_files[i]],
        diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, PEER_ASYNC_SHAS));
    }
    assert.equal(hunks.length, subject.original_hunks);
    return {...reviewPeerAsyncSubject(subject, index, pins.subjects[index]), hunks, review: pins.subjects[index].review};
  });
  const floorRaw = read(prefix + 'published-peer-floors.json.gz'); assert.equal(hash(floorRaw), pins.floor_capsule_sha256);
  const floors = JSON.parse(gunzipSync(floorRaw)); assert.equal(hash(read(floors.metadata_capsule.path)), floors.metadata_capsule.sha256);
  const floorReviews = floors.floors.map((floor, i) => reviewPeerAsyncFloor(floor, pins.floor_reviews[i]));
  const errorRaw = read(prefix + 'fixture-stability-reference-intake.json.gz'); assert.equal(hash(errorRaw), pins.error_capsule_sha256);
  const errorDefaults = inspectPeerErrorDefaults(JSON.parse(gunzipSync(errorRaw))); assert.deepEqual(errorDefaults, pins.error_defaults);
  const owned = inspectPeerOwnedScope({root, readMember: read}); assert.deepEqual(owned, pins.owned_scope[line]);
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root);
  assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subjects, floor_reviews: floorReviews, error_defaults: errorDefaults, owned_scope: owned,
    complete_original_files: 44, complete_original_hunks: 661, complete_original_bodies: 88,
    retained_cases: 1394, unchanged_complete_callbacks: 1027, owned_product_members: product.product_members,
    current_required_historical_case_ids: 2228, product_or_consumer_changes: 0, required_consumer_CSS_SCSS_changes: 0,
    source_conclusion_only: true, actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectPeerAsyncSources(), at = process.argv.indexOf('--out');
  if (at >= 0) writeFileSync(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, subjects: report.subjects.length, files: report.complete_original_files,
    hunks: report.complete_original_hunks, retained_cases: report.retained_cases, actual_runtime_qualified: false}));
}
