/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Full strategy-metadata source review; original framework/source is never executed. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteExplicitDetectionFile} from '../compatibility/rc/mixed-explicit-detection-source-authenticator.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript'), hash = x => createHash('sha256').update(x).digest('hex');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/mixed-explicit-detection-source-', pinSha = 'ed20e8e1ace007b5ff4ebcb70c69ada8c3f12233f8776545abba194e6050497d';
export const EXPLICIT_DETECTION_SHA = '780639853242381b4fa307f913a49241e9514ba6';
function nodes(root, predicate) {const rows = []; function visit(n) {if (predicate(n)) rows.push(n); ts.forEachChild(n, visit);} visit(root); return rows;}
const parse = text => {const file = ts.createSourceFile('original.ts', text, ts.ScriptTarget.Latest, true); assert.equal(file.parseDiagnostics.length, 0); return file;};
function semantic(node, drop = new Set()) {
  if (drop.has(node)) return null;
  const children = []; ts.forEachChild(node, n => {const value = semantic(n, drop); if (value !== null) children.push(value);});
  return [node.kind, node.operator ?? null, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];
}
const fingerprint = (node, drop) => hash(JSON.stringify(semantic(node, drop)));
const component = n => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Component' && n.arguments.length === 1 && ts.isObjectLiteralExpression(n.arguments[0]);
const policy = n => ts.isPropertyAssignment(n) && n.name.getText() === 'changeDetection';
const owner = n => {for (let p = n.parent; p; p = p.parent) if (ts.isClassDeclaration(p) || ts.isClassExpression(p)) return p.name?.getText() ?? '<anonymous>'; return '<non-class Component call>';};
const strategyImports = file => nodes(file, n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === '@angular/core' && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings))
  .flatMap(n => n.importClause.namedBindings.elements.filter(x => !x.propertyName && x.name.text === 'ChangeDetectionStrategy'));
export function projectExplicitDetectionFile(member) {
  const before = parse(member.before.text), after = parse(member.after.text), a = nodes(before, component), b = nodes(after, component), drop = new Set();
  assert.equal(a.length, b.length, 'Component call population changed');
  const additions = [], preserved = [], implicit = [];
  for (let i = 0; i < a.length; i++) {
    assert.equal(owner(a[i]), owner(b[i]), 'Component owner/order changed');
    const old = a[i].arguments[0].properties.filter(policy), next = b[i].arguments[0].properties.filter(policy);
    if (old.length) {assert.equal(next.length, old.length); assert.deepEqual(next.map(n => n.getText()), old.map(n => n.getText()));
      preserved.push({component_index: i, owner: owner(a[i]), before: old.map(n => n.getText()), after: next.map(n => n.getText())}); continue;}
    if (!next.length) {implicit.push({component_index: i, owner: owner(a[i])}); continue;}
    assert.equal(next.length, 1); assert.equal(next[0].initializer.getText(), 'ChangeDetectionStrategy.Eager'); drop.add(next[0]);
    additions.push({component_index: i, owner: owner(b[i]), raw: next[0].getText(),
      before_complete_metadata_sha256: hash(a[i].arguments[0].getText()), after_complete_metadata_sha256: hash(b[i].arguments[0].getText())});
  }
  const oldImports = strategyImports(before), newImports = strategyImports(after), addedImports = [];
  if (!oldImports.length) {
    assert.equal(newImports.length, 1);
    for (const n of newImports) {drop.add(n); const declaration = n.parent.parent.parent;
      addedImports.push({module: '@angular/core', raw: n.getText(), complete_import: declaration.getText()});
      if (!declaration.importClause.name && declaration.importClause.namedBindings.elements.length === 1) drop.add(declaration);}
  } else assert.deepEqual(newImports.map(n => n.getText()), oldImports.map(n => n.getText()));
  const oldSha = fingerprint(before), projectedSha = fingerprint(after, drop); assert.equal(projectedSha, oldSha, 'operations outside exact strategy additions changed');
  return {path: member.path, before_sha256: hash(member.before.text), after_sha256: hash(member.after.text),
    before_whole_ast_sha256: oldSha, after_whole_ast_sha256: fingerprint(after), after_projection_sha256: projectedSha,
    complete_component_call_count: a.length, added_strategy_properties: additions, newly_imported_strategy_bindings: addedImports,
    preserved_existing_strategy_properties: preserved, implicit_component_policies_still_present: implicit,
    all_other_whole_source_operations_equal_after_finite_metadata_projection: true, actual_strategy_default_renderer_error_or_lifetime_equivalence_proved: false};
}
const identity = n => ({path: n.path, mode: n.mode, suites: n.suites, suite_identities: n.suite_identities, name: n.name, name_identity: n.name_identity, key: n.key, sha256: n.sha256, callback_sha256: n.callback_sha256, assertions: n.assertions});
export function pairExplicitDetectionCases(subject) {
  const specs = {members: subject.members.filter(n => n.path.endsWith('.spec.ts'))}, before = originalEnvironmentCases(specs, 'before'), after = originalEnvironmentCases(specs, 'after');
  assert.equal(before.length, 5964); assert.equal(after.length, before.length);
  const byKey = new Map(after.map(n => [n.key, n])); assert.equal(byKey.size, after.length); assert.equal(new Set(before.map(n => n.key)).size, before.length);
  const pairs = before.map(old => {const next = byKey.get(old.key); assert.ok(next); assert.equal(next.mode, old.mode);
    return {before: identity(old), after: identity(next), complete_callback_semantics_equal: old.callback_sha256 === next.callback_sha256};});
  assert.equal(pairs.filter(n => n.complete_callback_semantics_equal).length, 5959);
  assert.deepEqual(pairs.filter(n => !n.complete_callback_semantics_equal).map(n => n.before.path), [
    'src/cdk/a11y/key-manager/list-key-manager.spec.ts', 'src/cdk/overlay/dispatchers/overlay-outside-click-dispatcher.spec.ts',
    'src/cdk/portal/portal.spec.ts', 'src/material/button/button.spec.ts', 'src/material/dialog/dialog.spec.ts']);
  return pairs;
}
export function observeExplicitDetectionSubject(subject) {
  assert.equal(subject.sha, EXPLICIT_DETECTION_SHA); assert.equal(subject.members.length, 220);
  const files = subject.members.map(projectExplicitDetectionFile), pairs = pairExplicitDetectionCases(subject);
  assert.equal(files.reduce((n, f) => n + f.complete_component_call_count, 0), 965);
  assert.equal(files.reduce((n, f) => n + f.added_strategy_properties.length, 0), 945);
  assert.equal(files.reduce((n, f) => n + f.newly_imported_strategy_bindings.length, 0), 206);
  return {sha: subject.sha, files, pairs, source_cases_before: 5964, source_cases_after: 5964, unchanged_complete_callbacks: 5959,
    changed_complete_callbacks: 5, added_strategy_properties: 945, new_strategy_imports: 206,
    existing_strategy_properties_preserved: files.reduce((n, f) => n + f.preserved_existing_strategy_properties.length, 0),
    implicit_component_policies_still_present: files.reduce((n, f) => n + f.implicit_component_policies_still_present.length, 0),
    all220_whole_source_projections_equal: true, minimum_peer_Eager_API_presence_or_default_equivalence_proved: false,
    actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified: false};
}
export function reviewExplicitDetectionSubject(subject, pin) {
  assert.deepEqual(subject.members.map(n => [n.path, hash(n.before.text), hash(n.after.text)]), pin.observation.files.map(n => [n.path, n.before_sha256, n.after_sha256]), 'complete original source drifted');
  const observed = observeExplicitDetectionSubject(subject); assert.deepEqual(observed, pin.observation); return observed;
}
export function inspectExplicitDetectionOwnedContext({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), intake = JSON.parse(read(prefix + 'intake.json'));
  for (const ref of intake.owned_context_read) assert.equal(hash(read(ref.path)), ref.sha256, 'owned runner/toolchain/context changed ' + ref.path);
  const paths = candidateProductSourcePaths(root); assert.equal(paths.length, 1028); const bootstrap = read('testing/legacy-runner/init-test-env.ts').toString();
  assert.ok(bootstrap.includes('provideZoneChangeDetection()')); assert.ok(!bootstrap.includes('prototype.whenStable')); assert.ok(!bootstrap.includes('provideExperimentalZonelessChangeDetection'));
  return {owned_context: intake.owned_context_read, source_members: paths.length, source_members_sha256: hash(JSON.stringify(paths.map(path => ({path, sha256: hash(read(path))})))),
    owned_public_zoneful_preparation: true, public_fixture_stability_untouched: true, new_Eager_peer_dependency_adopted: false,
    required_consumer_HTML_CSS_SCSS_changes: 0, actual_framework_default_error_lifecycle_or_floor_executed: false};
}
export function explicitDetectionPins({root = rootDefault, readMember} = {}) {const read = readMember || (p => readFileSync(resolve(root, p))), raw = read(prefix + 'observation-pins.json.gz'); assert.equal(hash(raw), pinSha); return JSON.parse(gunzipSync(raw));}
export function inspectExplicitDetectionSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), pins = explicitDetectionPins({root, readMember: read});
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const load = n => {const raw = read(prefix + n); assert.equal(hash(raw), pins.capsules[line][n]); return JSON.parse(gunzipSync(raw));};
  const originals = load('subjects.json.gz'), acquisition = load('acquisition.json.gz'); assert.deepEqual(originals.subjects.map(n => n.sha), [EXPLICIT_DETECTION_SHA]); assert.deepEqual(acquisition.subjects, [EXPLICIT_DETECTION_SHA]);
  const censusRaw = read('compatibility/rc/upstream-complete-patch-census.json.gz'), census = JSON.parse(gunzipSync(censusRaw)); assert.equal(census.commits.length, 1697); assert.equal(hash(censusRaw), originals.source_inventory.sha256);
  for (const packet of [originals, acquisition]) {assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256); assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);}
  assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false); assert.equal(acquisition.upstream_or_candidate_source_executed, false);
  const subject = originals.subjects[0], source = census.commits.find(n => n.sha === EXPLICIT_DETECTION_SHA); assert.equal(source.raw_commit, subject.raw_commit); assert.deepEqual(source.complete_changed_files, subject.complete_changed_files);
  assert.equal(hash(read(prefix + subject.sha + '.original.patch')), subject.diff_sha256);
  const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), hunks = []; assert.equal(parts.length, 220);
  for (const [i, member] of subject.members.entries()) {const diff = parts[i]; hunks.push(...reviewCompleteExplicitDetectionFile({...subject, members: [member], complete_changed_files: [subject.complete_changed_files[i]], diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, [EXPLICIT_DETECTION_SHA]));}
  assert.equal(hunks.length, 1118); const observation = reviewExplicitDetectionSubject(subject, pins.subject);
  const owned = inspectExplicitDetectionOwnedContext({root, readMember: read}); assert.deepEqual(owned, pins.owned_context[line]);
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root); assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subject: {...observation, hunks, review: pins.subject.review}, owned_context: owned,
    complete_original_files: 220, complete_original_body_records: 440, complete_original_hunks: 1118, retained_source_case_identities: 5964,
    unchanged_complete_source_callbacks: 5959, changed_complete_callbacks: 5, added_strategy_properties: 945, new_strategy_imports: 206,
    owned_product_members: product.product_members, current_required_historical_case_ids: 2228, product_or_consumer_changes: 0,
    required_consumer_HTML_CSS_SCSS_changes: 0, actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectExplicitDetectionSources(), at = process.argv.indexOf('--out'); if (at >= 0) writeFileSync(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, files: 220, hunks: 1118, cases: 5964, callback_equal: 5959, metadata_additions: 945, actual_runtime_qualified: false}));
}
