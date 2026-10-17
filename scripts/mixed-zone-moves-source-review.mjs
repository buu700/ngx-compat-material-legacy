/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four complete zone/test migrations, including M/A/D bodies and exact case relocations. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteMixedZoneMovesFile} from '../compatibility/rc/mixed-zone-moves-source-authenticator.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/mixed-zone-moves-source-', pinSha = '233903018312f589237200e66edb578a68de745b5c671e345ece1dcda6e5a0b7';
const hash = value => createHash('sha256').update(value).digest('hex');
export const ZONE_MOVES_SHAS = ['d38798a474278c3d4b1533ae3ad7273786be9372', '16d946e7ef8a0908d3b3b65820f757f832b7d646',
  '04d3b63de2fb843beb55836e39e930c3342d26f1', 'df8adda2164bdf5ef10a0d15225d2b22209f3df4'];
const parse = text => {const file = ts.createSourceFile('original.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0); return file;};
function collect(node, predicate) {const rows = []; function visit(n) {if (predicate(n)) rows.push(n); ts.forEachChild(n, visit);} visit(node); return rows;}
const name = node => node?.name?.getText() ?? '';
function semantic(node) {const children = []; ts.forEachChild(node, n => {children.push(semantic(n));});
  return [node.kind, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];}
const fingerprint = node => hash(JSON.stringify(semantic(node)));
const fact = node => ({kind: ts.SyntaxKind[node.kind], raw: node.getText(), sha256: hash(node.getText()), semantic_sha256: fingerprint(node)});
function namedClass(text, className) {const found = collect(parse(text), n => ts.isClassDeclaration(n) && name(n) === className);
  assert.equal(found.length, 1); return found[0];}
export function projectZoneRuntime(text, path) {
  const file = parse(text), removed = [];
  const changed = ts.transform(file, [context => {const visit = node => {
    const menu = path === 'src/cdk/menu/menu-base.ts';
    const drop = ts.isImportDeclaration(node) || (menu ?
      ((ts.isPropertyDeclaration(node) && ['_menuStackHasFocus', '_tabIndexSignal'].includes(name(node))) ||
       (ts.isMethodDeclaration(node) && ['_getTabIndex', '_subscribeToMenuStackHasFocus'].includes(name(node)))) :
      (name(node.parent) === 'CdkTreeNode' && ((ts.isPropertyDeclaration(node) && name(node) === '_changeDetectorRef') ||
       (ts.isMethodDeclaration(node) && name(node) === 'ngOnInit'))));
    if (drop) {removed.push(fact(node)); return undefined;}
    return ts.visitEachChild(node, visit, context);
  }; return node => ts.visitNode(node, visit);}]);
  const result = {semantic_sha256: fingerprint(changed.transformed[0]), removed}; changed.dispose(); return result;
}
const moves = [[], [], [
  ['src/cdk/text-field/autofill.spec.ts', 'src/cdk/text-field/autofill.zone.spec.ts', "'should emit on stream inside the NgZone'", "'AutofillMonitor'", "'AutofillMonitor'"],
], [
  ['src/cdk/scrolling/scroll-dispatcher.spec.ts', 'src/cdk/scrolling/scroll-dispatcher.zone.spec.ts', "'should not execute the global events in the Angular zone'", "'ScrollDispatcher'", "'ScrollDispatcher Zone.js integration'"],
  ['src/cdk/scrolling/scroll-dispatcher.spec.ts', 'src/cdk/scrolling/scroll-dispatcher.zone.spec.ts', "'should not execute the scrollable events in the Angular zone'", "'ScrollDispatcher'", "'ScrollDispatcher Zone.js integration'"],
  ['src/cdk/scrolling/viewport-ruler.spec.ts', 'src/cdk/scrolling/viewport-ruler.zone.spec.ts', "'should run the resize event outside the NgZone'", "'ViewportRuler'", "'ViewportRuler'"],
  ['src/cdk/scrolling/viewport-ruler.spec.ts', 'src/cdk/scrolling/viewport-ruler.zone.spec.ts', "'should run events outside of the NgZone, even if the subcription is from inside'", "'ViewportRuler'", "'ViewportRuler'"],
  ['src/cdk/text-field/autofill.zone.spec.ts', 'src/cdk/text-field/autofill.zone.spec.ts', "'should emit on stream inside the NgZone'", "'AutofillMonitor'", "'AutofillMonitor Zone.js integration'"],
]];
export function pairZoneCases(before, after, index) {
  const afterByKey = new Map(after.map(n => [n.key, n])), used = new Set(), pairs = [];
  for (const old of before) {
    let next = afterByKey.get(old.key), relocation = null;
    if (!next) {
      relocation = moves[index].find(n => old.path === n[0] && old.name === n[2] && old.suites[0] === n[3]);
      assert.ok(relocation, 'unreviewed lost case identity ' + old.name);
      const found = after.filter(n => n.path === relocation[1] && n.name === old.name && n.suites[0] === relocation[4] &&
        JSON.stringify(n.suites.slice(1)) === JSON.stringify(old.suites.slice(1)));
      assert.equal(found.length, 1); next = found[0]; assert.equal(next.callback_sha256, old.callback_sha256, 'relocated callback changed');
    }
    assert.ok(!used.has(next.key), 'case reused'); used.add(next.key); assert.equal(next.mode, old.mode);
    pairs.push({before_key: old.key, after_key: next.key, before_sha256: old.sha256, after_sha256: next.sha256,
      complete_callback_semantics_equal: old.callback_sha256 === next.callback_sha256, exact_reviewed_relocation: relocation});
  }
  assert.equal(used.size, after.length, 'new unreviewed case');
  assert.equal(pairs.filter(n => n.exact_reviewed_relocation).length, moves[index].length); return pairs;
}
export function lockSourceEntries(text) {
  const starts = [...text.matchAll(/^(?!#|\s)([^\n]+):\r?$/gm)], rows = [];
  for (const [i, match] of starts.entries()) {const raw = text.slice(match.index, starts[i + 1]?.index ?? text.length);
    rows.push({header: match[1], sha256: hash(raw), version: raw.match(/^  version "([^"]+)"/m)?.[1] ?? null,
      resolved: raw.match(/^  resolved "([^"]+)"/m)?.[1] ?? null, integrity: raw.match(/^  integrity (.+)$/m)?.[1] ?? null});}
  assert.ok(rows.length > 0); assert.equal(new Set(rows.map(n => n.header)).size, rows.length); return rows;
}
function sourceFrame(member, side) {
  const text = member[side].text;
  if (member.path === 'yarn.lock') return {sha256: hash(text), bytes: Buffer.byteLength(text), entries: lockSourceEntries(text)};
  if (!/\.(ts|js)$/.test(member.path)) return {sha256: hash(text), raw: text};
  const file = parse(text), subject = {members: [member]};
  return {sha256: hash(text), semantic_sha256: fingerprint(file), raw: text,
    cases: originalEnvironmentCases(subject, side).map(({raw, normalized_callback_sha256, ...row}) => row),
    hooks: overlayHooks(subject, side).map(({raw, ...row}) => row),
    class_and_function_frames: collect(file, n => ts.isClassDeclaration(n) || ts.isFunctionDeclaration(n)).map(fact)};
}
export function observeZoneMovesSubject(subject, index) {
  assert.equal(subject.sha, ZONE_MOVES_SHAS[index]);
  const files = subject.members.map(member => ({path: member.path, status: subject.complete_changed_files.find(n => n.path === member.path).status,
    before: sourceFrame(member, 'before'), after: sourceFrame(member, 'after')}));
  const specs = subject.members.filter(n => n.path.endsWith('.spec.ts'));
  const before = originalEnvironmentCases({members: specs}, 'before'), after = originalEnvironmentCases({members: specs}, 'after');
  assert.equal(before.length, [105, 10, 219, 64][index]); assert.equal(after.length, before.length);
  const pairs = pairZoneCases(before, after, index);
  assert.equal(pairs.filter(n => n.complete_callback_semantics_equal).length, [102, 9, 161, 57][index]);
  const runtime = [];
  if (index === 2) for (const path of ['src/cdk/menu/menu-base.ts', 'src/cdk/tree/tree.ts']) {
    const member = subject.members.find(n => n.path === path); assert.ok(member);
    const a = projectZoneRuntime(member.before.text, path), b = projectZoneRuntime(member.after.text, path);
    assert.equal(a.semantic_sha256, b.semantic_sha256, 'unreviewed runtime operation'); runtime.push({path, before: a, after: b});
  }
  const lifecycle = subject.members.map((m, i) => ({path: m.path, status: subject.complete_changed_files[i].status,
    before_present: m.before.git_blob !== '0'.repeat(40), after_present: m.after.git_blob !== '0'.repeat(40),
    before_sha256: m.before.sha256, after_sha256: m.after.sha256}));
  return {sha: subject.sha, files, runtime, pairs, lifecycle, cases_before: before.length, cases_after: after.length,
    unchanged_complete_callbacks: pairs.filter(n => n.complete_callback_semantics_equal).length,
    exact_reviewed_relocations: pairs.filter(n => n.exact_reviewed_relocation).length,
    fixture_provider_notification_error_or_lifecycle_equivalence_proved: false, actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false};
}
export function reviewZoneMovesSubject(subject, index, pin) {
  assert.deepEqual(subject.members.map(n => [n.path, hash(n.before.text), hash(n.after.text)]),
    pin.observation.files.map(n => [n.path, n.before.sha256, n.after.sha256]), 'original complete source bytes drifted');
  const observed = observeZoneMovesSubject(subject, index); assert.deepEqual(observed, pin.observation, 'unreviewed original frame'); return observed;
}
export function inspectZoneOwnedContext({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), intake = JSON.parse(read(prefix + 'intake.json'));
  for (const ref of intake.owned_context_read) assert.equal(hash(read(ref.path)), ref.sha256, 'owned zone/lifecycle context changed ' + ref.path);
  const paths = candidateProductSourcePaths(root), rows = [];
  for (const path of paths) {const raw = read(path); rows.push({path, sha256: hash(raw)});
    if (!path.endsWith('.ts') || path.endsWith('.spec.ts')) continue;
    const file = parse(raw.toString());
    for (const node of collect(file, n => ts.isImportDeclaration(n) || ts.isExportDeclaration(n))) {
      if (node.moduleSpecifier) assert.ok(!/^@angular\/cdk\/(?:menu|tree)(?:\/|$)/.test(node.moduleSpecifier.text), 'owned menu/tree CDK runtime dependency');
    }
    for (const node of collect(file, ts.isClassDeclaration)) assert.ok(!['CdkMenuBase', 'CdkTree', 'CdkTreeNode'].includes(name(node)), 'ordinary CDK fork');
  }
  assert.equal(paths.length, 1028);
  const original = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))).subjects[0];
  const deleted = original.members.find(n => n.path.endsWith('/mock-ng-zone.ts')); assert.ok(deleted && deleted.after.text === '');
  const deletedClass = fact(namedClass(deleted.before.text, 'MockNgZone')),
    retainedClass = fact(namedClass(read('testing/legacy-runner/shims/mock-ng-zone.ts').toString(), 'MockNgZone'));
  assert.equal(deletedClass.semantic_sha256, retainedClass.semantic_sha256, 'historical local shim contract changed');
  const ownedClass = fact(namedClass(read('projects/ngx-material-legacy/internal/testing/owned-test-events.ts').toString(), 'MockNgZone'));
  const bootstrap = read('testing/legacy-runner/init-test-env.ts').toString();
  assert.ok(bootstrap.includes('provideZoneChangeDetection()')); assert.ok(!bootstrap.includes('prototype.whenStable'));
  return {source_members: paths.length, members_sha256: hash(JSON.stringify(rows)), owned_context: intake.owned_context_read,
    retained_deleted_helper_class: retainedClass, historical_deleted_class_semantics_equal: true, current_owned_test_event_mock: ownedClass,
    explicit_legacy_zoneful_preparation: true, public_fixture_stability_untouched: true,
    required_consumer_HTML_CSS_SCSS_changes: 0, actual_fixture_Angular_native_or_floor_executed: false};
}
export function zoneMovesPins({root = rootDefault, readMember} = {}) {const read = readMember || (p => readFileSync(resolve(root, p)));
  const raw = read(prefix + 'observation-pins.json.gz'); assert.equal(hash(raw), pinSha); return JSON.parse(gunzipSync(raw));}
export function inspectZoneMovesSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), pins = zoneMovesPins({root, readMember: read});
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const load = n => {const raw = read(prefix + n); assert.equal(hash(raw), pins.capsules[line][n]); return JSON.parse(gunzipSync(raw));};
  const originals = load('subjects.json.gz'), acquisition = load('acquisition.json.gz');
  assert.deepEqual(originals.subjects.map(n => n.sha), ZONE_MOVES_SHAS); assert.deepEqual(acquisition.subjects, ZONE_MOVES_SHAS);
  const censusRaw = read('compatibility/rc/upstream-complete-patch-census.json.gz'), census = JSON.parse(gunzipSync(censusRaw));
  assert.equal(census.commits.length, 1697); assert.equal(hash(censusRaw), originals.source_inventory.sha256);
  for (const packet of [originals, acquisition]) {assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
    assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);}
  assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false);
  assert.equal(acquisition.upstream_or_candidate_source_executed, false);
  const subjects = originals.subjects.map((subject, index) => {
    const original = census.commits.find(n => n.sha === subject.sha); assert.equal(original.raw_commit, subject.raw_commit);
    assert.deepEqual(original.complete_changed_files, subject.complete_changed_files);
    assert.equal(hash(read(prefix + subject.sha + '.original.patch')), subject.diff_sha256);
    const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), hunks = []; assert.equal(parts.length, subject.members.length);
    for (const [i, member] of subject.members.entries()) {const diff = parts[i];
      hunks.push(...reviewCompleteMixedZoneMovesFile({...subject, members: [member], complete_changed_files: [subject.complete_changed_files[i]],
        diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, ZONE_MOVES_SHAS));}
    assert.equal(hunks.length, subject.original_hunks);
    return {...reviewZoneMovesSubject(subject, index, pins.subjects[index]), hunks, review: pins.subjects[index].review};
  });
  const owned = inspectZoneOwnedContext({root, readMember: read}); assert.deepEqual(owned, pins.owned_context[line]);
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root);
  assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subjects, owned_context: owned, complete_original_files: 28, complete_original_body_records: 56,
    file_status_counts: {M: 24, A: 3, D: 1}, complete_original_hunks: 225,
    retained_source_case_identities: 398, unchanged_complete_source_callbacks: 329, exact_reviewed_case_relocations: 6,
    owned_product_members: product.product_members, current_required_historical_case_ids: 2228,
    product_or_consumer_changes: 0, required_consumer_HTML_CSS_SCSS_changes: 0,
    actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectZoneMovesSources(), at = process.argv.indexOf('--out');
  if (at >= 0) writeFileSync(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, subjects: 4, files: 28, hunks: 225, cases: 398, callback_equal: 329, relocations: 6, actual_runtime_qualified: false}));
}
