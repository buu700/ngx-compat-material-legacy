/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete-original and observation controls; these are not Angular/native executions. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {originalEnvironmentCases} from '../scripts/spec-test-environment-source-review.mjs';
import {CHIP_SOURCE, CHIP_SPEC} from '../scripts/spec-stability-chip-repair.mjs';
import {STABILITY_SHAS, STABILITY_SPECIAL, analyzeStabilityOriginal, compareStabilityCases,
  reviewStabilityCasePair, reviewStabilityGlobals, inspectStabilitySources,
} from '../scripts/spec-stability-source-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = inspectStabilitySources({root});
const originals = JSON.parse(gunzipSync(read('compatibility/rc/spec-stability-source-subjects.json.gz')));
const controls = [];
function reject(id, action) { assert.throws(action, undefined, id); controls.push({id, result: 'rejected'}); }
for (const subject of originals.subjects) {
  for (const [id, mutate] of [
    ['raw-commit', row => { row.raw_commit += '\n'; row.raw_commit_sha256 = hash(row.raw_commit); }],
    ['missing-file', row => { row.members.pop(); row.complete_changed_files.pop(); }],
    ['foreign-file', row => { row.members[0].path = 'src/cdk/unknown.spec.ts'; }],
    ['missing-hunk', row => { row.original_hunks--; }],
    ['rehashed-body', row => { const m = row.members[0].after; m.text += '\n'; m.sha256 = hash(m.text); m.bytes = Buffer.byteLength(m.text); }],
    ['rehashed-diff', row => { row.diff = row.diff.replace(/^@@ /m, '@@  '); row.diff_sha256 = hash(row.diff); row.diff_bytes = Buffer.byteLength(row.diff); }],
  ]) {
    const changed = structuredClone(subject); mutate(changed);
    reject(subject.sha + '-' + id, () => analyzeStabilityOriginal(changed));
  }
  const before = originalEnvironmentCases(subject, 'before'), after = originalEnvironmentCases(subject, 'after');
  for (const [id, mutate] of [
    ['lost-case', rows => rows.pop()],
    ['duplicate-case', rows => rows.push(rows[0])],
    ['reused-case', rows => { rows[1] = rows[0]; }],
    ['case-order', rows => { [rows[0], rows[1]] = [rows[1], rows[0]]; }],
  ]) {
    const changed = structuredClone(after); mutate(changed);
    reject(subject.sha + '-' + id, () => compareStabilityCases(subject.sha, before, changed));
  }
  for (const mode of ['fit', 'xit']) {
    const changed = structuredClone(subject), member = changed.members.find(n => n.after.text.includes("it('"));
    assert.ok(member); member.after.text = member.after.text.replace("it('", mode + "('");
    reject(subject.sha + '-test-mode-' + mode, () => compareStabilityCases(subject.sha,
      before, originalEnvironmentCases(changed, 'after')));
  }
}
function changedPair(index, sha256, needle, replacement, id) {
  const subject = originals.subjects[index], before = originalEnvironmentCases(subject, 'before'),
    after = originalEnvironmentCases(subject, 'after'), row = before.find(n => n.sha256 === sha256);
  assert.ok(row); const next = after.find(n => n.key === row.key); assert.ok(next);
  assert.ok(next.raw.includes(needle), id);
  const changed = structuredClone(subject), member = changed.members.find(n => n.path === next.path);
  assert.equal(member.after.text.split(next.raw).length, 2);
  member.after.text = member.after.text.replace(next.raw, next.raw.replace(needle, replacement));
  const mutant = originalEnvironmentCases(changed, 'after').find(n => n.key === row.key);
  reject(id, () => reviewStabilityCasePair(subject.sha, row, mutant));
}
changedPair(0, STABILITY_SPECIAL.debounce[0], 'wait(50)', 'wait(51)', 'tree-unreviewed-interkey-wait');
changedPair(0, STABILITY_SPECIAL.debounce[0], 'not.toBe(0)', 'toBe(0)', 'tree-changed-immediate-observer');
changedPair(1, STABILITY_SPECIAL.foodObserver[0], 'foods()', 'foods().slice()', 'chip-observer-context-not-assumed-equivalent');
changedPair(1, STABILITY_SPECIAL.chipStability[0], 'fixture.whenStable()', 'fixture.detectChanges()', 'chip-stability-operation-not-dropped');
changedPair(3, STABILITY_SPECIAL.tooltipStability[0], '600', '601', 'tooltip-unreviewed-touch-deadline');
changedPair(3, STABILITY_SPECIAL.tooltipStability[0], 'assertTooltipInstance(fixture.componentInstance.tooltip, false)',
  'assertTooltipInstance(fixture.componentInstance.tooltip, true)', 'tooltip-helper-assertion-not-ignored');
{
  const subject = originals.subjects[3], before = originalEnvironmentCases(subject, 'before'), after = originalEnvironmentCases(subject, 'after');
  const old = before.find(n => n.path.includes('/drop-list-shared.') && n.raw.includes('await wait(10)'));
  assert.ok(old);
  changedPair(3, old.sha256, 'await wait(100)', 'await wait(101)', 'drag-duration-not-arbitrarily-normalized');
  const next = after.find(n => n.key === old.key);
  reject('changed-raw-with-stale-callback-metadata', () => reviewStabilityCasePair(subject.sha, old,
    {...next, raw: next.raw.replace('await wait(100)', 'await wait(101)')}));
}
// Exercise the ordinary semantic comparator independently of complete-source pins.
{
  const subject = originals.subjects[2], before = originalEnvironmentCases(subject, 'before');
  const old = before.find(n => n.raw.includes('.toBe(')); assert.ok(old);
  changedPair(2, old.sha256, '.toBe(', '.not.toBe(', 'unchanged-input-predicate-cannot-be-weakened');
  const withDeclaration = before.find(n => n.raw.includes('const ')); assert.ok(withDeclaration);
  changedPair(2, withDeclaration.sha256, 'const ', 'let ', 'declaration-kind-not-ignored');
}
for (const [index, path, needle, replacement, id] of [
  [0, 'src/cdk/a11y/key-manager/tree-key-manager.spec.ts', 'const debounceInterval = 300;', 'const debounceInterval = 301;', 'tree-shared-interval-context'],
  [1, 'src/material/chips/chip-grid.spec.ts', '@for (food of foods(); track food)', '@for (food of foods; track food)', 'signal-template-call'],
  [1, 'src/material/chips/chip-grid.spec.ts', 'readonly foods = signal([', 'readonly foods = signal(["new",', 'signal-value-population'],
  [1, 'src/material/chips/chip-listbox.spec.ts', 'setTimeout(resolve, milliseconds)', 'setTimeout(resolve, milliseconds + 1)', 'wait-helper-deadline'],
  [2, 'src/material/input/input.spec.ts', 'class MatInputOnPush', 'class MatInputRenamed', 'explicit-OnPush-fixture-identity'],
  [3, 'src/material/tooltip/tooltip.spec.ts', "describe('MatTooltip', () => {", "describe('MatTooltip', () => { const unreviewed = 1;", 'unreviewed-noncase-operation'],
]) {
  const changed = structuredClone(originals.subjects[index]), member = changed.members.find(n => n.path === path);
  assert.ok(member.after.text.includes(needle), id); member.after.text = member.after.text.replace(needle, replacement);
  reject(id, () => reviewStabilityGlobals(changed));
}
for (const path of ['compatibility/rc/spec-stability-source-subjects.json.gz',
  'compatibility/rc/spec-stability-source-acquisition.json.gz', 'scripts/acquire-upstream-spec-originals.py',
  CHIP_SOURCE, CHIP_SPEC, 'projects/ngx-material-legacy/legacy-input/input.spec.ts',
  'compatibility/f10/authored-use-reviews/chip-empty-context-requalification.json']) {
  reject('capture-or-owned-context-' + path, () => inspectStabilitySources({root,
    readMember: name => name === path ? Buffer.concat([read(name), Buffer.from('\n')]) : read(name)}));
}
const context = JSON.parse(read('compatibility/rc/spec-stability-context-checkpoint.json'));
for (const field of ['source_scope_rows_requalified', 'native_source_bindings_requalified', 'frozen_import_receipts_requalified']) {
  const changed = {...context, [field]: context[field] - 1};
  reject('context-obligation-' + field, () => inspectStabilitySources({root, readMember: name =>
    name === 'compatibility/rc/spec-stability-context-checkpoint.json' ? Buffer.from(JSON.stringify(changed)) : read(name)}));
}
assert.deepEqual(report.subjects.map(n => n.sha), STABILITY_SHAS);
assert.equal(report.repair.product_members, 1141); assert.equal(report.repair.unchanged_product_members, 1139);
assert.deepEqual(report.subjects[0].tree_declared_item_contexts, ['Observable children', 'array children']);
assert.equal(report.subjects[0].removed[0].default_interval_tested, 200);
assert.equal(report.subjects[1].added[0].kind, 'previously-commented-chip-destruction-registration-activated');
const durations = report.subjects[3].pairs.flatMap(n => n.timer_changes);
assert.equal(durations.length, 28);
assert.equal(durations.filter(n => n.before_ms === 10 && n.after_ms === 100).length, 2);
assert.equal(durations.filter(n => n.before_ms === 20 && n.after_ms === 100).length, 25);
assert.equal(durations.filter(n => n.before_ms === 500 && n.after_ms === 600).length, 1);
const result = {schema_version: 1, line: report.line, complete_original_files: 7, complete_original_hunks: 42,
  paired_static_occurrences: 575, removed_registrations: 1, added_registrations: 1,
  unchanged_callbacks: 545, changed_callbacks_reviewed: 30, wait_duration_changes: 28,
  noncase_programs_reviewed: 7, private_fixture_or_helper_changes: 3,
  controls: controls.length, cases: controls, owned_product_members: 1141,
  old_owned_cases_preserved: 2222, current_owned_cases: 2223,
  helper_sha256: hash(read('scripts/spec-stability-source-review.mjs')),
  producer_sha256: hash(read('tests/spec_stability_source_probe.mjs')),
  new_Angular_case_executed: false, production_HTML_CSS_SCSS_or_template_changes: 0,
  actual_Angular_native_artifact_or_floor_qualified: false, g11_claim: 'not-passed'};
const out = process.argv.indexOf('--out');
if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...result, cases: undefined}));
