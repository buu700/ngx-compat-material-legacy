/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four complete fixture/build source decisions; no original source or framework execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteMixedFixtureBuildFile} from '../compatibility/rc/mixed-fixture-build-source-authenticator.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {lockSourceEntries} from './mixed-zone-moves-source-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript'), hash = x => createHash('sha256').update(x).digest('hex');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/mixed-fixture-build-source-', pinSha = '345feb090aac7a4a63a8a8ba7f80c6b138348004a22d028412c130cd14b6b03c';
export const FIXTURE_BUILD_SHAS = ['a0eb8b06917b6fc83e13578a8a7358e008844c6f', 'dc3bfc34ebc4ef733a7fedfe341efc0b5e25c4d7',
  '544257ad0f58e70688abe0d80eccaa73d25ba5d8', '2b82d638c90df83d44613b81c2eeeab24821e8b2'];
const ownedPaths = ['toolchain-lock.json', '.node-version', '.npm-version', 'package.json', 'pnpm-lock.yaml',
  'projects/ngx-material-legacy/package.json', 'testing/legacy-runner/init-test-env.ts',
  'projects/ngx-material-legacy/internal/public-constructor-context.ts',
  'projects/ngx-material-legacy/legacy-table/internal/public-constructor-context.ts',
  'projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts',
  'projects/ngx-material-legacy/legacy-tabs/internal/public-constructor-context.ts',
  'projects/ngx-material-legacy/legacy-table/table.spec.ts',
  'projects/ngx-material-legacy/legacy-chips/chip-list.ts', 'projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts'];
function semantic(node) {const children = []; ts.forEachChild(node, n => {children.push(semantic(n));});
  return [node.kind, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];}
function frame(member, side) {
  const raw = member[side].text;
  if (member.path === 'yarn.lock') return {sha256: hash(raw), bytes: Buffer.byteLength(raw), entries: lockSourceEntries(raw)};
  if (!member.path.endsWith('.ts')) return {sha256: hash(raw), raw};
  const file = ts.createSourceFile('original.ts', raw, ts.ScriptTarget.Latest, true); assert.equal(file.parseDiagnostics.length, 0);
  const classAndFunction = []; function visit(n) {if (ts.isClassDeclaration(n) || ts.isFunctionDeclaration(n))
    classAndFunction.push({raw: n.getText(), sha256: hash(n.getText()), semantic_sha256: hash(JSON.stringify(semantic(n)))}); ts.forEachChild(n, visit);} visit(file);
  return {sha256: hash(raw), raw, semantic_sha256: hash(JSON.stringify(semantic(file))), class_and_function_frames: classAndFunction,
    hooks: overlayHooks({members: [member]}, side).map(({raw, ...row}) => row),
    cases: originalEnvironmentCases({members: [member]}, side).map(({raw, ...row}) => row)};
}
export function observeFixtureBuildSubject(subject, index) {
  assert.equal(subject.sha, FIXTURE_BUILD_SHAS[index]);
  const specs = {members: subject.members.filter(n => n.path.endsWith('.spec.ts'))};
  const before = originalEnvironmentCases(specs, 'before'), after = originalEnvironmentCases(specs, 'after'), byKey = new Map(after.map(n => [n.key, n]));
  assert.equal(before.length, [39, 74, 226, 67][index]); assert.equal(after.length, [39, 74, 226, 66][index]);
  const pairs = [], removed = [];
  for (const old of before) {
    const next = byKey.get(old.key);
    if (!next) {assert.equal(index, 3); assert.equal(old.path, 'src/material/chips/chip-grid.spec.ts');
      assert.equal(old.name, "'should clear the active item in key manager when the last focused chip is destroyed'");
      assert.equal(old.callback_sha256, 'de73d52afbae8a307bfa149bdd1ef3782aa1808770243504db4195e9b93cfe80');
      assert.equal(old.mode, 'it'); removed.push(old); continue;}
    assert.equal(next.mode, old.mode); pairs.push({before_key: old.key, after_key: next.key,
      before_sha256: old.sha256, after_sha256: next.sha256, complete_callback_semantics_equal: old.callback_sha256 === next.callback_sha256});
  }
  assert.equal(removed.length, index === 3 ? 1 : 0); assert.equal(pairs.length, after.length);
  assert.equal(pairs.filter(n => n.complete_callback_semantics_equal).length, [39, 74, 225, 66][index]);
  return {sha: subject.sha, files: subject.members.map(n => ({path: n.path, before: frame(n, 'before'), after: frame(n, 'after')})),
    pairs, removed_active_source_cases: removed, cases_before: before.length, cases_after: after.length,
    unchanged_complete_callbacks: pairs.filter(n => n.complete_callback_semantics_equal).length,
    fixture_injector_query_compilation_error_or_lifecycle_equivalence_proved: false,
    actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false};
}
export function reviewFixtureBuildSubject(subject, index, pin) {
  assert.deepEqual(subject.members.map(n => [n.path, hash(n.before.text), hash(n.after.text)]),
    pin.observation.files.map(n => [n.path, n.before.sha256, n.after.sha256]), 'original complete source bytes drifted');
  const observed = observeFixtureBuildSubject(subject, index); assert.deepEqual(observed, pin.observation); return observed;
}
export function inspectFixtureBuildOwnedContext({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), rows = ownedPaths.map(path => ({path, sha256: hash(read(path))}));
  const paths = candidateProductSourcePaths(root); assert.equal(paths.length, 1028);
  const source = paths.map(path => ({path, sha256: hash(read(path))}));
  const path = 'projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts';
  const cases = originalEnvironmentCases({members: [{path, before: {text: read(path).toString()}}]}, 'before');
  const regression = cases.filter(n => n.name === "'should clear a destroyed active chip when the list becomes empty'");
  assert.equal(regression.length, 1); assert.equal(regression[0].mode, 'it');
  assert.ok(regression[0].raw.includes('testComponent.chips = [];')); assert.ok(regression[0].raw.includes('testComponent.chips = [10, 11];'));
  assert.ok(regression[0].raw.includes('expect(keyManager.activeItem).toBeNull()'));
  return {owned_context: rows, source_members: paths.length, source_members_sha256: hash(JSON.stringify(source)),
    retained_active_chip_empty_repopulation_regression: regression[0], required_consumer_HTML_CSS_SCSS_changes: 0,
    actual_Angular_fixture_native_or_floor_executed: false};
}
export function fixtureBuildPins({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), raw = read(prefix + 'observation-pins.json.gz');
  assert.equal(hash(raw), pinSha); return JSON.parse(gunzipSync(raw));
}
export function inspectFixtureBuildSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), pins = fixtureBuildPins({root, readMember: read});
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const load = n => {const raw = read(prefix + n); assert.equal(hash(raw), pins.capsules[line][n]); return JSON.parse(gunzipSync(raw));};
  const originals = load('subjects.json.gz'), acquisition = load('acquisition.json.gz');
  assert.deepEqual(originals.subjects.map(n => n.sha), FIXTURE_BUILD_SHAS); assert.deepEqual(acquisition.subjects, FIXTURE_BUILD_SHAS);
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
      hunks.push(...reviewCompleteMixedFixtureBuildFile({...subject, members: [member], complete_changed_files: [subject.complete_changed_files[i]],
        diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, FIXTURE_BUILD_SHAS));}
    assert.equal(hunks.length, subject.original_hunks);
    return {...reviewFixtureBuildSubject(subject, index, pins.subjects[index]), hunks, review: pins.subjects[index].review};
  });
  const owned = inspectFixtureBuildOwnedContext({root, readMember: read}); assert.deepEqual(owned, pins.owned_context[line]);
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root);
  assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subjects, owned_context: owned, complete_original_files: 12, complete_original_body_records: 24,
    complete_original_hunks: 58, source_case_identities_before: 406, retained_source_case_identities: 405,
    unchanged_complete_source_callbacks: 404, explicitly_commented_out_upstream_cases: 1,
    owned_product_members: product.product_members, current_required_historical_case_ids: 2228,
    product_or_consumer_changes: 0, required_consumer_HTML_CSS_SCSS_changes: 0,
    actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectFixtureBuildSources(), at = process.argv.indexOf('--out');
  if (at >= 0) writeFileSync(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, subjects: 4, files: 12, hunks: 58, before: 406, after: 405, callback_equal: 404, actual_runtime_qualified: false}));
}
