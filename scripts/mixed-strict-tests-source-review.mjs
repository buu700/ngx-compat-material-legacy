/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Three complete test/setup migrations; no original Angular or framework execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteMixedStrictTestsFile} from '../compatibility/rc/mixed-strict-tests-source-authenticator.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript'), hash = x => createHash('sha256').update(x).digest('hex');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/mixed-strict-tests-source-', pinSha = 'c4f4b0d00326a347dafad26107751f4e978e97ac730096f23f6a0911ca57f70a';
export const STRICT_TEST_SHAS = ['2c88e9ba9f9b037683e166ecf0d825ee7e39a79c', '839dfba8fc3a7bd9f7865a5eeed6aff1155c5d80', '03adcb539967937f1113d3afddf90aa9574f9e0f'];
const parse = text => {const f = ts.createSourceFile('original.ts', text, ts.ScriptTarget.Latest, true); assert.equal(f.parseDiagnostics.length, 0); return f;};
const name = n => n?.name?.getText() ?? '';
function nodes(node, predicate) {const found = []; function visit(n) {if (predicate(n)) found.push(n); ts.forEachChild(n, visit);} visit(node); return found;}
function semantic(node, drop = new Set(), markers = false) {
  if (drop.has(node) || markers && node.kind === ts.SyntaxKind.ExclamationToken) return null;
  const children = []; ts.forEachChild(node, n => {const value = semantic(n, drop, markers); if (value !== null) children.push(value);});
  return [node.kind, node.operator ?? null, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];
}
const fingerprint = (node, drop, markers) => hash(JSON.stringify(semantic(node, drop, markers)));
const fact = node => ({kind: ts.SyntaxKind[node.kind], raw: node.getText(), sha256: hash(node.getText()), semantic_sha256: fingerprint(node)});
const fieldChanges = {
  'src/cdk/dialog/dialog.spec.ts': {
    'ComponentWithTemplateRef.localValue': ["localValue: string;", "localValue = '';"],
    'ComponentWithTemplateRef.dialogRef': ['dialogRef: DialogRef<any>;', 'dialogRef: DialogRef<any> | undefined;'],
    'ContentElementDialog.closeButtonAriaLabel': ['closeButtonAriaLabel: string;', "closeButtonAriaLabel = '';"],
  },
  'src/cdk/scrolling/scrollable.spec.ts': {'ScrollableViewport.dir': ['@Input() dir: Direction;', "@Input() dir: Direction = 'ltr';"]},
};
export function projectStrictInitialization(text, path, side) {
  const file = parse(text), drop = new Set(), fields = fieldChanges[path] || {}, excluded = [];
  for (const n of nodes(file, ts.isPropertyDeclaration)) {const key = name(n.parent) + '.' + name(n);
    if (fields[key]) {assert.equal(n.getText(), fields[key][side === 'before' ? 0 : 1]); drop.add(n); excluded.push({key, ...fact(n)});}}
  assert.equal(excluded.length, Object.keys(fields).length);
  return {projection_sha256: fingerprint(file, drop, true), excluded,
    definite_assignment_marker_frames: nodes(file, n => n.kind === ts.SyntaxKind.ExclamationToken).map(fact),
    actual_emitted_metadata_compiler_or_runtime_equivalence_proved: false};
}
const moves = [
  ['src/material/core/ripple/ripple.spec.ts', 'src/material/core/ripple/ripple.zone.spec.ts', "'does not run events inside the NgZone'", "'MatRipple'", "'MatRipple Zone.js integration'", '4b236b1116e0571e6af48b99f632bf547e20b6207063668bf2a7caa98a3f0acf'],
  ['src/material/snack-bar/snack-bar.spec.ts', 'src/material/snack-bar/snack-bar.zone.spec.ts', "'should clear the dismiss timeout when dismissed before timeout expiration'", "'MatSnackBar'", "'MatSnackBar Zone.js integration'", '9d62502ab687e21eeb1d813a9689e730e6bd73ccc0050158b4b55577e9e6bc08'],
  ['src/material/snack-bar/snack-bar.spec.ts', 'src/material/snack-bar/snack-bar.zone.spec.ts', "'should clear the dismiss timeout when dismissed with action'", "'MatSnackBar'", "'MatSnackBar Zone.js integration'", '34cfee5dbc4dbdd2649ad4c9c2f6e8867051fdc9e5de69fd6c567d69d8b2a76e'],
  ['src/material/tooltip/tooltip.spec.ts', 'src/material/tooltip/tooltip.zone.spec.ts', "'should execute the `hide` call, after scrolling away, inside the NgZone'", "'MDC-based MatTooltip'", "'MDC-based MatTooltip Zone.js integration'", 'e2a7ea0945d845e93e647df5d78125897f0ed1ab778fd394bd0f9945a9b345fa'],
];
export function pairStrictTestCases(subject, index) {
  const specs = {members: subject.members.filter(n => n.path.endsWith('.spec.ts'))}, before = originalEnvironmentCases(specs, 'before'), after = originalEnvironmentCases(specs, 'after');
  assert.equal(before.length, [420, 917, 452][index]); assert.equal(after.length, before.length);
  const byKey = new Map(after.map(n => [n.key, n])), used = new Set(), pairs = [];
  for (const old of before) {
    let next = byKey.get(old.key), relocation = null;
    if (!next) {assert.equal(index, 0); relocation = moves.find(n => old.path === n[0] && old.name === n[2] && old.suites[0] === n[3]); assert.ok(relocation);
      const found = after.filter(n => n.path === relocation[1] && n.name === old.name && n.suites[0] === relocation[4] && JSON.stringify(n.suites.slice(1)) === JSON.stringify(old.suites.slice(1)));
      assert.equal(found.length, 1); next = found[0]; assert.equal(old.callback_sha256, relocation[5]); assert.equal(next.callback_sha256, old.callback_sha256);}
    assert.equal(next.mode, old.mode); assert.ok(!used.has(next.key)); used.add(next.key);
    pairs.push({before_key: old.key, after_key: next.key, before_sha256: old.sha256, after_sha256: next.sha256,
      complete_callback_semantics_equal: old.callback_sha256 === next.callback_sha256, exact_reviewed_relocation: relocation});
  }
  assert.equal(used.size, after.length); assert.equal(pairs.filter(n => n.exact_reviewed_relocation).length, index === 0 ? 4 : 0);
  assert.equal(pairs.filter(n => n.complete_callback_semantics_equal).length, [300, 917, 452][index]); return {before, after, pairs};
}
const flowCall = n => ts.isCallExpression(n) && /(?:configureTestingModule|createComponent|markForCheck|detectChanges|checkNoChanges|whenStable|isStable|tick|flush|flushMicrotasks|discardPeriodicTasks|provideZoneChangeDetection|provideCheckNoChangesConfig|provideZonelessChangeDetection|fakeAsync|waitForAsync)$/.test(n.expression.getText());
function sourceFrame(member, side) {
  const raw = member[side].text;
  if (!member.path.endsWith('.ts')) {const config = ts.parseConfigFileTextToJson(member.path, raw); assert.equal(config.error, undefined); return {sha256: hash(raw), raw, json_data: config.config};}
  const file = parse(raw), subject = {members: [member]};
  return {sha256: hash(raw), raw, semantic_sha256: fingerprint(file),
    class_and_function_frames: nodes(file, n => ts.isClassDeclaration(n) || ts.isFunctionDeclaration(n)).map(fact),
    imports: nodes(file, ts.isImportDeclaration).map(fact), flow_calls_in_source_order: nodes(file, flowCall).map(fact),
    throw_try_and_catch_frames: nodes(file, n => ts.isThrowStatement(n) || ts.isTryStatement(n) || ts.isCatchClause(n)).map(fact),
    cases: originalEnvironmentCases(subject, side).map(({raw, ...row}) => row), hooks: overlayHooks(subject, side).map(({raw, ...row}) => row)};
}
export function observeStrictTestSubject(subject, index) {
  assert.equal(subject.sha, STRICT_TEST_SHAS[index]);
  const files = subject.members.map(n => ({path: n.path, before: sourceFrame(n, 'before'), after: sourceFrame(n, 'after')}));
  const {before, after, pairs} = pairStrictTestCases(subject, index), projections = [], checkConfiguration = [], zoneFixtures = [];
  if (index === 0) for (const path of ['src/material/core/ripple/ripple.zone.spec.ts', 'src/material/snack-bar/snack-bar.zone.spec.ts', 'src/material/tooltip/tooltip.zone.spec.ts']) {
    const member = subject.members.find(n => n.path === path), file = parse(member.after.text);
    const providers = nodes(file, n => ts.isCallExpression(n) && n.expression.getText() === 'provideZoneChangeDetection').map(fact);
    assert.equal(providers.length, path.includes('/ripple/') ? 0 : 1);
    zoneFixtures.push({path, explicit_zone_change_detection_provider_calls: providers, filename_alone_proves_zoneful_preparation: false});
  }
  if (index === 1) for (const member of subject.members.filter(n => n.path.endsWith('.ts'))) {
    for (const side of ['before', 'after']) {const file = parse(member[side].text);
      for (const n of nodes(file, n => ts.isCallExpression(n) && n.expression.getText() === 'provideCheckNoChangesConfig')) checkConfiguration.push({path: member.path, side, ...fact(n)});}}
  if (index === 1) {assert.equal(checkConfiguration.filter(n => n.side === 'before').length, 0);
    assert.equal(checkConfiguration.filter(n => n.raw === 'provideCheckNoChangesConfig({exhaustive: false})').length, 19);
    assert.equal(checkConfiguration.filter(n => n.raw === 'provideCheckNoChangesConfig({exhaustive: true})').length, 1); assert.equal(checkConfiguration.length, 20);}
  if (index === 2) for (const member of subject.members) {
    const a = projectStrictInitialization(member.before.text, member.path, 'before'), b = projectStrictInitialization(member.after.text, member.path, 'after');
    assert.equal(a.projection_sha256, b.projection_sha256); projections.push({path: member.path, before: a, after: b});
  }
  return {sha: subject.sha, files, pairs, initialization_source_projections: projections, check_no_changes_configurations: checkConfiguration, added_zone_fixture_preparation: zoneFixtures,
    cases_before: before.length, cases_after: after.length, unchanged_complete_callbacks: pairs.filter(n => n.complete_callback_semantics_equal).length,
    exact_reviewed_case_relocations: pairs.filter(n => n.exact_reviewed_relocation).length,
    fixture_provider_notification_error_lifetime_or_emitted_metadata_equivalence_proved: false,
    actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified: false};
}
export function reviewStrictTestSubject(subject, index, pin) {
  assert.deepEqual(subject.members.map(n => [n.path, hash(n.before.text), hash(n.after.text)]), pin.observation.files.map(n => [n.path, n.before.sha256, n.after.sha256]), 'original complete source bytes drifted');
  const observed = observeStrictTestSubject(subject, index); assert.deepEqual(observed, pin.observation); return observed;
}
export function inspectStrictTestOwnedContext({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), intake = JSON.parse(read(prefix + 'intake.json'));
  for (const ref of intake.owned_context_read) assert.equal(hash(read(ref.path)), ref.sha256, 'owned strict runner/context changed ' + ref.path);
  const paths = candidateProductSourcePaths(root); assert.equal(paths.length, 1028);
  const bootstrap = read('testing/legacy-runner/init-test-env.ts').toString(); assert.ok(bootstrap.includes('provideZoneChangeDetection()'));
  assert.ok(!bootstrap.includes('prototype.whenStable')); assert.ok(!bootstrap.includes('provideCheckNoChangesConfig'));
  return {owned_context: intake.owned_context_read, source_members: paths.length,
    source_members_sha256: hash(JSON.stringify(paths.map(path => ({path, sha256: hash(read(path))})))),
    explicit_owned_zoneful_preparation: true, public_fixture_stability_untouched: true, upstream_exhaustive_false_exceptions_adopted: 0,
    required_consumer_HTML_CSS_SCSS_changes: 0, actual_framework_error_lifecycle_or_floor_executed: false};
}
export function strictTestPins({root = rootDefault, readMember} = {}) {const read = readMember || (p => readFileSync(resolve(root, p))), raw = read(prefix + 'observation-pins.json.gz'); assert.equal(hash(raw), pinSha); return JSON.parse(gunzipSync(raw));}
export function inspectStrictTestSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), pins = strictTestPins({root, readMember: read});
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const load = n => {const raw = read(prefix + n); assert.equal(hash(raw), pins.capsules[line][n]); return JSON.parse(gunzipSync(raw));};
  const originals = load('subjects.json.gz'), acquisition = load('acquisition.json.gz');
  assert.deepEqual(originals.subjects.map(n => n.sha), STRICT_TEST_SHAS); assert.deepEqual(acquisition.subjects, STRICT_TEST_SHAS);
  const censusRaw = read('compatibility/rc/upstream-complete-patch-census.json.gz'), census = JSON.parse(gunzipSync(censusRaw));
  assert.equal(census.commits.length, 1697); assert.equal(hash(censusRaw), originals.source_inventory.sha256);
  for (const packet of [originals, acquisition]) {assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256); assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);}
  assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false); assert.equal(acquisition.upstream_or_candidate_source_executed, false);
  const subjects = originals.subjects.map((subject, index) => {
    const original = census.commits.find(n => n.sha === subject.sha); assert.equal(original.raw_commit, subject.raw_commit); assert.deepEqual(original.complete_changed_files, subject.complete_changed_files);
    assert.equal(hash(read(prefix + subject.sha + '.original.patch')), subject.diff_sha256);
    const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), hunks = []; assert.equal(parts.length, subject.members.length);
    for (const [i, member] of subject.members.entries()) {const diff = parts[i]; hunks.push(...reviewCompleteMixedStrictTestsFile({...subject, members: [member], complete_changed_files: [subject.complete_changed_files[i]],
      diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, STRICT_TEST_SHAS));}
    assert.equal(hunks.length, subject.original_hunks); return {...reviewStrictTestSubject(subject, index, pins.subjects[index]), hunks, review: pins.subjects[index].review};
  });
  const owned = inspectStrictTestOwnedContext({root, readMember: read}); assert.deepEqual(owned, pins.owned_context[line]);
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root); assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subjects, owned_context: owned, complete_original_files: 49, complete_original_body_records: 98, file_status_counts: {M: 46, A: 3},
    complete_original_hunks: 227, retained_source_case_identities: 1789, unchanged_complete_source_callbacks: 1669, exact_reviewed_case_relocations: 4,
    owned_product_members: product.product_members, current_required_historical_case_ids: 2228, product_or_consumer_changes: 0, required_consumer_HTML_CSS_SCSS_changes: 0,
    actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectStrictTestSources(), at = process.argv.indexOf('--out'); if (at >= 0) writeFileSync(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, subjects: 3, files: 49, hunks: 227, cases: 1789, callback_equal: 1669, relocations: 4, actual_runtime_qualified: false}));
}
