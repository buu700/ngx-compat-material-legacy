/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four complete-original applicability reviews; source comparisons never admit native behavior. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from './authenticated-single-spec-review.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const STABILITY_SHAS = ['ad5fba32ac21e4fb32ba75591dfa1273f692d58a',
  '88b24e0296bfadcac4bc47c823b47890eeda7a6b', '658952712df682e26130b754fa19c041712ad747',
  'e1481e44cd14f3fb6222939e33ec856858299fa4'];
export const STABILITY_PATHS = [['src/cdk/a11y/key-manager/tree-key-manager.spec.ts'],
  ['src/material/chips/chip-grid.spec.ts', 'src/material/chips/chip-listbox.spec.ts'],
  ['src/material/input/input.spec.ts'], ['src/cdk/drag-drop/directives/drop-list-shared.spec.ts',
    'src/material/sidenav/drawer.spec.ts', 'src/material/tooltip/tooltip.spec.ts']];
export const STABILITY_CAPSULES = {
  main: ['9612288e34795175517212df2ff4a9052ba0975c96166927d2cfb2c37be265a2', '706373adfb5cae2b22018979d2f9d3494af8bcf4428b442104a0a923e9514acc'],
  '21.x': ['5342753190e2b85262558c4b04c454559e510779561d60438ad7338729f28539', '5626aae055fee214d4cca5982ca4fedb631340d315cf6214c7ad44c09ec78dce'],
};
export const STABILITY_SPECIAL = {
  removedDefault: ['e1b02d56a7ef99827bc9d3e3f892cb88001ec79176d51c890726d82dc6a64bae', null],
  debounce: ['13ba5ff8769e139a844479ec3baa328ea4c61ff9bc854f4dcadb1fa4ab450409', 'b76a5c3d6136e9d4da53caa838c58f16f486dc184c4a298b165a8ee770006ca2'],
  addedChip: [null, '144de86f007ce71d27b763125eef461753f99a463b600a27969003a171457aa8'],
  foodObserver: ['054b7f278e628d3973742b4014fe6e34012d16fd4669dfd1d46199b637202c83', '31026a45328ebe7f63938041b25489735e0909e33ded17bfe4f5846024f139ab'],
  chipStability: ['b42e8a3da69a5b5702a5cdfa4d75db5327cb2e2bb09cffdf5fb8eada7e04aed7', '6665ae6be88113e3f3a220726d495b2793b7e1581734699adfbfb987dde634a5'],
  tooltipStability: ['de0610ce2ceca537e0e1be886ea43ddc39cc68c22c677ae2864ae86403a955b9', '59bf0be587cb3349a261986cd75f7d500712174cd9b74719cc84e9fb1cdd5c90'],
};
const classPairs = {
  InputChipGrid: ['400a4bd799a9077a504f085a1c362f3961bca35c0af843fce39b5e1438efe51e', 'a5e910f07540b20bf471a3a666dc748f5da57aceb7dbb04dca0ffe47572db560'],
  MatInputOnPush: ['71901680acd31df884d55087bfb463f94f04752c3399230e9d084a98015cac78', '31ecf460a26fdd71b6948edf5da4ce1d88aff6f5b5a94b9ef3626c01e12edaa1'],
};
const parse = (text, path = 'source.spec.ts') => {
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0); return file;
};
const collect = (node, predicate) => {
  const rows = []; function visit(n) { if (predicate(n)) rows.push(n); ts.forEachChild(n, visit); }
  visit(node); return rows;
};
const semantic = node => {
  const children = []; ts.forEachChild(node, n => { children.push(semantic(n)); });
  return [node.kind, ts.isVariableDeclarationList(node) ? node.flags &
    (ts.NodeFlags.Const | ts.NodeFlags.Let | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing) : null,
  ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];
};
const fingerprint = node => hash(JSON.stringify(semantic(node)));
const named = node => node.name?.text;
const callName = (node, file) => ts.isCallExpression(node) ? node.expression.getText(file) : '';
const special = (kind, before, after) => {
  const pair = STABILITY_SPECIAL[kind]; assert.ok(pair);
  assert.equal(before ? hash(before.raw) : null, pair[0]);
  assert.equal(after ? hash(after.raw) : null, pair[1]);
};
export function authenticateStabilityOriginal(subject) {
  const index = STABILITY_SHAS.indexOf(subject.sha); assert.ok(index >= 0, 'unregistered stability original');
  assert.deepEqual(subject.members.map(n => n.path), STABILITY_PATHS[index]);
  assert.deepEqual(subject.complete_changed_files.map(n => n.path), STABILITY_PATHS[index]);
  assert.equal(hash(subject.diff), subject.diff_sha256); assert.equal(Buffer.byteLength(subject.diff), subject.diff_bytes);
  const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), hunks = [];
  assert.equal(parts.length, subject.members.length);
  for (const [i, member] of subject.members.entries()) {
    const identity = subject.complete_changed_files[i], diff = parts[i];
    assert.equal(identity.status, 'M'); assert.equal(identity.before_mode, '100644'); assert.equal(identity.after_mode, '100644');
    hunks.push(...reviewCompleteSingleSpec({...subject, members: [member], complete_changed_files: [identity],
      diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, STABILITY_SHAS));
  }
  assert.equal(hunks.length, subject.original_hunks); return hunks;
}
function timer(node, file) {
  if (!ts.isAwaitExpression(node)) return null;
  const value = node.expression;
  if (ts.isCallExpression(value) && callName(value, file) === 'wait' && value.arguments.length === 1 && ts.isNumericLiteral(value.arguments[0])) {
    return {node, milliseconds: Number(value.arguments[0].text), form: 'wait-helper'};
  }
  if (!ts.isNewExpression(value) || value.expression.getText(file) !== 'Promise' || value.arguments?.length !== 1) return null;
  const executor = value.arguments[0];
  if (!ts.isArrowFunction(executor) || executor.parameters.length !== 1 || !ts.isIdentifier(executor.parameters[0].name)) return null;
  const body = executor.body;
  if (!ts.isCallExpression(body) || callName(body, file) !== 'setTimeout' || body.arguments.length !== 2 ||
      body.arguments[0].getText(file) !== executor.parameters[0].name.text || !ts.isNumericLiteral(body.arguments[1])) return null;
  return {node, milliseconds: Number(body.arguments[1].text), form: 'inline-Promise'};
}
function transformedCallback(file, replacements, {foodObserver = false, removeStability = false} = {}) {
  let foodCount = 0, stableCount = 0;
  const result = ts.transform(file, [context => {
    const visit = node => {
      if (replacements.has(node)) return ts.factory.createAwaitExpression(ts.factory.createCallExpression(
        ts.factory.createIdentifier('recordedTimerStep'), undefined, [ts.factory.createNumericLiteral(replacements.get(node))]));
      if (foodObserver && ts.isCallExpression(node) && callName(node, file) === 'fixture.componentInstance.foods' && node.arguments.length === 0) {
        foodCount++; return node.expression;
      }
      if (removeStability && ts.isExpressionStatement(node) && ts.isAwaitExpression(node.expression) &&
          callName(node.expression.expression, file) === 'fixture.whenStable') { stableCount++; return undefined; }
      return ts.visitEachChild(node, visit, context);
    };
    return node => ts.visitNode(node, visit);
  }]);
  try { return {sha256: fingerprint(result.transformed[0]), foodCount, stableCount}; } finally { result.dispose(); }
}
export function reviewStabilityCasePair(subjectSha, before, after) {
  assert.equal(before.key, after.key);
  assert.equal(before.path, after.path); assert.equal(before.mode, after.mode);
  assert.equal(before.name, after.name); assert.deepEqual(before.suite_identities, after.suite_identities);
  for (const row of [before, after]) {
    const file = parse(row.raw), call = file.statements[0]?.expression;
    assert.ok(ts.isCallExpression(call)); assert.equal(callName(call, file), row.mode);
    assert.equal(hash(row.raw), row.sha256);
    assert.equal(fingerprint(call.arguments[1]), row.callback_sha256, 'stale callback metadata');
  }
  if (before.callback_sha256 === after.callback_sha256) return {semantic_callback_equal: true, timer_changes: []};
  if (subjectSha === STABILITY_SHAS[0]) {
    special('debounce', before, after);
    assert.equal(before.assertions.length, 3); assert.equal(after.assertions.length, 2);
    assert.ok(before.raw.includes('wait(debounceInterval - 1)') && after.raw.includes('wait(debounceInterval * 1.5)'));
    assert.equal((before.raw.match(/wait\(1\)/g) || []).length, 2);
    assert.equal((after.raw.match(/wait\(50\)/g) || []).length, 2);
    return {semantic_callback_equal: false, kind: 'debounce-near-boundary-observation-removed',
      custom_interval: 300, inter_key_waits: {before: [1, 1], after: [50, 50]},
      partial_interval_assertion_removed: true, final_wait_multiplier: 1.5,
      observations_or_scheduling_equivalent: false, timer_changes: []};
  }
  const a = parse(before.raw), b = parse(after.raw), oldTimers = collect(a, ts.isAwaitExpression).map(n => timer(n, a)).filter(Boolean),
    newTimers = collect(b, ts.isAwaitExpression).map(n => timer(n, b)).filter(Boolean);
  assert.equal(oldTimers.length, newTimers.length, 'unreviewed timer population');
  const left = new Map(), right = new Map(), changes = [];
  for (let i = 0; i < oldTimers.length; i++) {
    const old = oldTimers[i], next = newTimers[i];
    if (old.milliseconds === next.milliseconds && old.form === next.form) continue;
    if (old.form !== next.form) {
      assert.equal(subjectSha, STABILITY_SHAS[1]); assert.ok(before.path.endsWith('/chip-listbox.spec.ts'));
      assert.equal(old.form, 'inline-Promise'); assert.equal(next.form, 'wait-helper'); assert.equal(old.milliseconds, next.milliseconds);
    } else {
      assert.equal(subjectSha, STABILITY_SHAS[3]);
      const expected = before.path.includes('/drop-list-shared.') ? [10, 100] : before.path.includes('/drawer.') ? [20, 100] : [500, 600];
      assert.deepEqual([old.milliseconds, next.milliseconds], expected, 'unreviewed wait duration');
    }
    left.set(old.node, i); right.set(next.node, i);
    changes.push({ordinal: i, before_ms: old.milliseconds, after_ms: next.milliseconds, before_form: old.form, after_form: next.form});
  }
  const food = before.sha256 === STABILITY_SPECIAL.foodObserver[0];
  const stable = before.sha256 === STABILITY_SPECIAL.chipStability[0] || before.sha256 === STABILITY_SPECIAL.tooltipStability[0];
  if (food) special('foodObserver', before, after);
  if (stable) special(before.path.endsWith('/chip-listbox.spec.ts') ? 'chipStability' : 'tooltipStability', before, after);
  const old = transformedCallback(a, left), next = transformedCallback(b, right, {foodObserver: food, removeStability: stable});
  assert.equal(next.foodCount, food ? 1 : 0); assert.equal(next.stableCount, stable ? 1 : 0);
  assert.equal(old.sha256, next.sha256, 'unreviewed callback operation/assertion/declaration change');
  return {semantic_callback_equal: false, operations_equal_after_only_recorded_changes: true,
    timer_changes: changes, food_array_observation_replaced_by_signal_read: food,
    new_stability_waits: stable ? 1 : 0, fixture_or_native_scheduling_equivalence_proved: false};
}
function fixtureClass(file, name) {
  const rows = collect(file, n => ts.isClassDeclaration(n) && named(n) === name);
  assert.equal(rows.length, 1); return rows[0];
}
function globalProgram(file, path) {
  const result = ts.transform(file, [context => {
    const visit = node => {
      if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && ['it', 'fit', 'xit'].includes(callName(node.expression, file))) return undefined;
      if (path.endsWith('/chip-grid.spec.ts') && ts.isClassDeclaration(node) && named(node) === 'InputChipGrid') return undefined;
      if (path.endsWith('/chip-listbox.spec.ts') && ts.isFunctionDeclaration(node) && named(node) === 'wait') return undefined;
      if (path === STABILITY_PATHS[2][0] && ts.isPropertyAssignment(node) && node.name.getText(file) === 'changeDetection') {
        let parent = node; while (parent && !ts.isClassDeclaration(parent)) parent = parent.parent;
        if (named(parent || {}) === 'MatInputOnPush') { assert.equal(node.initializer.getText(file), 'ChangeDetectionStrategy.OnPush'); return undefined; }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return node => ts.visitNode(node, visit);
  }]);
  try { return fingerprint(result.transformed[0]); } finally { result.dispose(); }
}
export function reviewStabilityGlobals(subject) {
  const programs = [], fixtureChanges = [];
  for (const member of subject.members) {
    const before = parse(member.before.text, member.path), after = parse(member.after.text, member.path);
    if (member.path.endsWith('/chip-grid.spec.ts') || member.path === STABILITY_PATHS[2][0]) {
      const name = member.path.endsWith('/chip-grid.spec.ts') ? 'InputChipGrid' : 'MatInputOnPush';
      const a = fixtureClass(before, name), b = fixtureClass(after, name);
      assert.equal(hash(a.getText(before)), classPairs[name][0]); assert.equal(hash(b.getText(after)), classPairs[name][1]);
      if (name === 'InputChipGrid') {
        const old = a.members.find(n => named(n) === 'foods').initializer, next = b.members.find(n => named(n) === 'foods').initializer;
        assert.ok(ts.isArrayLiteralExpression(old)); assert.equal(callName(next, after), 'signal');
        assert.deepEqual(semantic(old), semantic(next.arguments[0])); assert.equal(old.elements.length, 8);
        const template = file => collect(fixtureClass(file, name), n => ts.isPropertyAssignment(n) && n.name.getText(file) === 'template')[0].initializer.text;
        assert.equal(template(before).replace('@for (food of foods; track food)', '@for (food of foods(); track food)'), template(after));
        fixtureChanges.push({path: member.path, name, before_sha256: classPairs[name][0], after_sha256: classPairs[name][1],
          kind: 'private-mutable-array-fixture-to-readonly-signal', original_values_and_order: 8,
          add_uses_fresh_array_update: true, remove_copies_then_splices: true,
          mutation_notification_identity_or_render_equivalence_proved: false, owned_fixture_changed: false});
      } else {
        assert.ok(a.getText(before).includes('changeDetection: ChangeDetectionStrategy.OnPush'));
        assert.ok(!b.getText(after).includes('changeDetection:'));
        fixtureChanges.push({path: member.path, name, before_sha256: classPairs[name][0], after_sha256: classPairs[name][1],
          kind: 'explicit-OnPush-removed-from-private-fixture', minimum_peer_default_equivalence_proved: false, owned_explicit_OnPush_retained: true});
      }
    }
    if (member.path.endsWith('/chip-listbox.spec.ts')) {
      const a = collect(before, n => ts.isFunctionDeclaration(n) && named(n) === 'wait'), b = collect(after, n => ts.isFunctionDeclaration(n) && named(n) === 'wait');
      assert.equal(a.length, 0); assert.equal(b.length, 1);
      const expected = parse('function wait(milliseconds: number) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }');
      assert.deepEqual(semantic(b[0]), semantic(expected.statements[0]));
      fixtureChanges.push({path: member.path, kind: 'wait-helper-extracted', parameters_and_Promise_setTimeout_operations_checked: true,
        actual_Angular_native_scheduling_equivalence_proved: false});
    }
    assert.equal(globalProgram(before, member.path), globalProgram(after, member.path), 'unreviewed noncase program change ' + member.path);
    programs.push({path: member.path, all_other_noncase_operations_and_metadata_equal: true});
  }
  return {programs, fixtureChanges};
}
export function compareStabilityCases(subjectSha, before, after) {
  const index = STABILITY_SHAS.indexOf(subjectSha); assert.ok(index >= 0);
  const left = new Map(before.map(n => [n.key, n])), right = new Map(after.map(n => [n.key, n]));
  assert.equal(left.size, before.length); assert.equal(right.size, after.length);
  const removed = before.filter(n => !right.has(n.key)), added = after.filter(n => !left.has(n.key));
  assert.equal(removed.length, index === 0 ? 1 : 0); assert.equal(added.length, index === 1 ? 1 : 0);
  if (removed.length) special('removedDefault', removed[0], null);
  if (added.length) special('addedChip', null, added[0]);
  assert.deepEqual(before.filter(n => right.has(n.key)).map(n => n.key), after.filter(n => left.has(n.key)).map(n => n.key), 'case order changed');
  const pairs = before.filter(n => right.has(n.key)).map(old => {
    const next = right.get(old.key);
    return {path: old.path, suites: old.suites, name: old.name, mode: old.mode,
      before_sha256: old.sha256, after_sha256: next.sha256, ...reviewStabilityCasePair(subjectSha, old, next)};
  });
  assert.deepEqual([before.length, after.length], [[53, 52], [119, 120], [102, 102], [302, 302]][index]);
  assert.equal(pairs.filter(n => !n.semantic_callback_equal).length, [1, 7, 0, 22][index]);
  assert.equal([...before, ...after].filter(n => n.mode !== 'it').length, 0);
  return {before, after, removed, added, pairs};
}
export function analyzeStabilityOriginal(subject) {
  const index = STABILITY_SHAS.indexOf(subject.sha); assert.ok(index >= 0);
  const hunks = authenticateStabilityOriginal(subject);
  const {before, after, removed, added, pairs} = compareStabilityCases(subject.sha,
    originalEnvironmentCases(subject, 'before'), originalEnvironmentCases(subject, 'after'));
  const globals = reviewStabilityGlobals(subject);
  let treeContexts;
  if (index === 0) {
    const file = parse(subject.members[0].before.text), parameter = collect(file, n => ts.isVariableDeclaration(n) && named(n) === 'itemParameters')[0];
    assert.ok(ts.isArrayLiteralExpression(parameter.initializer));
    treeContexts = parameter.initializer.elements.map(n => n.properties.find(p => p.name.text === 'description').initializer.text);
    assert.deepEqual(treeContexts, ['Observable children', 'array children']);
    assert.ok(subject.members[0].before.text.includes('const debounceInterval = 300;'));
    assert.ok(removed[0].raw.includes('const defaultInterval = 200;') && removed[0].raw.includes('typeAheadDebounceInterval: true'));
  }
  return {sha: subject.sha, complete_original_files: subject.members.length, complete_original_hunks: hunks.length,
    before_static_occurrences: before.length, after_static_occurrences: after.length,
    full_ordered_path_suite_mode_occurrence_pairing: true,
    removed: removed.map(n => ({path: n.path, suites: n.suites, name: n.name, sha256: n.sha256,
      original_assertions: n.assertions, kind: 'default-debounce-test-registration-removed', default_interval_tested: 200})),
    added: added.map(n => ({path: n.path, suites: n.suites, name: n.name, sha256: n.sha256,
      kind: 'previously-commented-chip-destruction-registration-activated', legacy_purpose_adapted_without_signal_or_grid_fork: true})),
    tree_declared_item_contexts: treeContexts, pairs, ...globals, hunks,
    callback_identity_is_not_fixture_or_peer_behavior_equivalence: true,
    actual_original_or_owned_Angular_native_or_floor_tests_executed: false};
}
export function inspectStabilitySources({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path)));
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const paths = ['compatibility/rc/spec-stability-source-subjects.json.gz', 'compatibility/rc/spec-stability-source-acquisition.json.gz'];
  const [originals, acquisition] = paths.map((path, i) => { const bytes = read(path); assert.equal(hash(bytes), STABILITY_CAPSULES[line][i]); return JSON.parse(gunzipSync(bytes)); });
  for (const packet of [originals, acquisition]) {
    assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
    assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);
    assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects, STABILITY_SHAS);
  }
  assert.deepEqual(originals.subjects.map(n => n.sha), STABILITY_SHAS);
  assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false);
  const census = JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));
  assert.equal(census.line, line);
  for (const subject of originals.subjects) {
    const row = census.commits.find(n => n.sha === subject.sha); assert.equal(row.raw_commit, subject.raw_commit);
    assert.deepEqual(row.complete_changed_files, subject.complete_changed_files);
  }
  const subjects = originals.subjects.map(analyzeStabilityOriginal), repair = inspectChipEmptyRepair({root, readMember: read});
  const context = JSON.parse(read('compatibility/rc/spec-stability-context-checkpoint.json'));
  assert.equal(context.source_scope_rows_requalified, 83); assert.equal(context.native_source_bindings_requalified, 20);
  assert.equal(context.frozen_import_receipts_requalified, 27); assert.equal(context.rejection_controls_passed_before_write, 174);
  for (const ref of context.output_metadata) if (ref.path !== 'compatibility/f10/disposition-ledger/ledger.json') assert.equal(hash(read(ref.path)), ref.sha256);
  const replay = JSON.parse(read('compatibility/rc/spec-stability-replay-checkpoint.json'));
  assert.equal(replay.registered_original_programs, 20); assert.equal(replay.guard_controls_passed, 81);
  assert.equal(replay.actual_original_programs_replayed, 2); assert.equal(replay.python_integration_tests_passed, 2);
  const input = read('projects/ngx-material-legacy/legacy-input/input.spec.ts').toString();
  assert.ok(fixtureClass(parse(input), 'MatInputOnPush').getText().includes('changeDetection: ChangeDetectionStrategy.OnPush'));
  return {schema_version: 1, line, subjects, complete_original_files: 7, complete_original_hunks: 42,
    before_static_occurrences: 576, after_static_occurrences: 576, paired_static_occurrences: 575,
    removed_default_debounce_registrations: 1, added_chip_destruction_registrations: 1,
    changed_callbacks_individually_accounted_for: 30, unchanged_callback_semantics: 545,
    noncase_programs_reviewed: 7, private_fixture_and_helper_changes: 3,
    owned_empty_chip_reset_source_qualified: true, owned_cases_preserved: 2222, current_owned_cases: 2223,
    new_Angular_case_executed: false, repair, production_HTML_CSS_SCSS_or_template_changes: 0,
    actual_Angular_native_artifact_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectStabilitySources(), out = process.argv.indexOf('--out');
  if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({...report, subjects: undefined, repair: undefined}));
}
