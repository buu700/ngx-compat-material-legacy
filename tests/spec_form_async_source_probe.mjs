/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source tampering/observation controls, not Angular scheduler or native tests. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {originalEnvironmentCases} from '../scripts/spec-test-environment-source-review.mjs';
import {FORM_ASYNC_SHAS, FORM_ASYNC_SPECIAL, analyzeFormAsyncOriginal, compareFormAsyncCases,
  projectFormAsyncBody, reviewFormAsyncGlobals, inspectFormAsyncSources,
} from '../scripts/spec-form-async-source-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = inspectFormAsyncSources({root});
const originals = JSON.parse(gunzipSync(read('compatibility/rc/spec-form-async-source-subjects.json.gz')));
const controls = [];
function reject(id, action, pattern) { assert.throws(action, pattern, id); controls.push({id, result: 'rejected'}); }
for (const subject of originals.subjects) {
  for (const [id, mutate] of [
    ['raw-commit', row => { row.raw_commit += '\n'; row.raw_commit_sha256 = hash(row.raw_commit); }],
    ['missing-file', row => { row.members.pop(); row.complete_changed_files.pop(); }],
    ['foreign-file', row => { row.members[0].path = 'src/material/foreign.spec.ts'; }],
    ['missing-hunk', row => { row.original_hunks--; }],
    ['rehashed-body', row => { const m = row.members[0].after; m.text += '\n'; m.sha256 = hash(m.text); m.bytes = Buffer.byteLength(m.text); }],
    ['rehashed-diff', row => { row.diff = row.diff.replace(/^@@ /m, '@@  '); row.diff_sha256 = hash(row.diff); row.diff_bytes = Buffer.byteLength(row.diff); }],
  ]) {
    const changed = structuredClone(subject); mutate(changed);
    reject(subject.sha + '-' + id, () => analyzeFormAsyncOriginal(changed));
  }
  const before = originalEnvironmentCases(subject, 'before'), after = originalEnvironmentCases(subject, 'after');
  for (const [id, mutate] of [
    ['lost-case', rows => rows.pop()], ['duplicate-case', rows => rows.push(rows[0])],
    ['reused-case', rows => { rows[1] = rows[0]; }],
    ['case-order', rows => { [rows[0], rows[1]] = [rows[1], rows[0]]; }],
    ['suite-identity', rows => { rows[0].suites = [...rows[0].suites, "'unreviewed scope'"]; }],
  ]) {
    const changed = structuredClone(after); mutate(changed);
    reject(subject.sha + '-' + id, () => compareFormAsyncCases(subject.sha, before, changed));
  }
  for (const mode of ['fit', 'xit']) {
    const changed = structuredClone(subject); assert.ok(changed.members[0].after.text.includes("it('"));
    changed.members[0].after.text = changed.members[0].after.text.replace("it('", mode + "('");
    reject(subject.sha + '-test-mode-' + mode, () => compareFormAsyncCases(subject.sha,
      before, originalEnvironmentCases(changed, 'after')));
  }
  const globals = structuredClone(subject);
  assert.ok(globals.members[0].after.text.includes('@Component({'));
  globals.members[0].after.text = globals.members[0].after.text.replace('@Component({', '@Component({unreviewed: true,');
  reject(subject.sha + '-fixture-metadata', () => reviewFormAsyncGlobals(globals));
}
function changedCase(index, afterSha, mutate) {
  const subject = originals.subjects[index], after = originalEnvironmentCases(subject, 'after'), row = after.find(n => n.sha256 === afterSha);
  assert.ok(row); const changed = structuredClone(subject), text = changed.members[0].after.text;
  assert.equal(text.split(row.raw).length, 2); const next = mutate(row.raw); assert.notEqual(next, row.raw);
  changed.members[0].after.text = text.replace(row.raw, next);
  return {before: originalEnvironmentCases(subject, 'before'), after: originalEnvironmentCases(changed, 'after')};
}
for (const [index, special, needle, replacement, id] of [
  [0, 'notch', 'await wait(16)', 'await wait(17)', 'input-native-frame-duration'],
  [0, 'notch', '.toBeTruthy()', '.toBeFalsy()', 'input-notch-predicate'],
  [1, 'checkboxThrow', '.not.toThrow()', '.toThrow()', 'checkbox-no-throw-subject'],
  [2, 'slideThrow', '.not.toThrow()', '.toThrow()', 'slide-toggle-no-throw-subject'],
  [3, 'rapidSheet', 'i < 3', 'i < 2', 'rapid-sheet-loop-bound'],
]) {
  const changed = changedCase(index, FORM_ASYNC_SPECIAL[special][1], raw => {
    assert.ok(raw.includes(needle), id); return raw.replace(needle, replacement);
  });
  reject(id, () => compareFormAsyncCases(FORM_ASYNC_SHAS[index], changed.before, changed.after));
}
{
  const subject = originals.subjects[0], after = originalEnvironmentCases(subject, 'after'), row = after[0];
  const changed = changedCase(0, row.sha256, raw => { const at = raw.lastIndexOf('}'); return raw.slice(0, at) + '\nflush();\n' + raw.slice(at); });
  assert.equal(projectFormAsyncBody(changed.before[0], 0).projected_body_sha256,
    projectFormAsyncBody(changed.after[0], 0).projected_body_sha256);
  reject('projection-is-not-a-timeline-equivalence-waiver', () => compareFormAsyncCases(subject.sha, changed.before, changed.after), /ordered original raw case pair changed/);
  reject('stale-callback-metadata', () => projectFormAsyncBody({...after[0], raw: after[0].raw + ' '}, 0));
}
for (const [index, needle, replacement, id] of [
  [0, "describe('MatInput with forms'", "describe('Unreviewed input with forms'", 'only-two-exact-suite-renames'],
  [0, 'beforeEach(', 'afterEach(', 'hook-kind-and-scope'],
  [0, 'TestBed.configureTestingModule({', 'TestBed.configureTestingModule({unreviewed: true,', 'provider-setup-operations'],
  [3, 'setTimeout(resolve, milliseconds)', 'setTimeout(resolve, milliseconds + 1)', 'bottom-sheet-native-helper'],
]) {
  const changed = structuredClone(originals.subjects[index]); assert.ok(changed.members[0].after.text.includes(needle));
  changed.members[0].after.text = changed.members[0].after.text.replace(needle, replacement);
  reject(id, () => reviewFormAsyncGlobals(changed));
}
for (const path of ['compatibility/rc/spec-form-async-source-subjects.json.gz',
  'compatibility/rc/spec-form-async-source-acquisition.json.gz', 'scripts/acquire-upstream-spec-originals.py',
  'projects/ngx-material-legacy/legacy-input/input.spec.ts', 'projects/ngx-material-legacy/legacy-checkbox/checkbox.spec.ts',
  'projects/ngx-material-legacy/legacy-slide-toggle/slide-toggle.spec.ts', 'projects/ngx-material-legacy/legacy-chips/chip-list.ts',
  'projects/ngx-material-legacy/legacy-form-field/form-field.html',
  'projects/ngx-material-legacy/legacy-form-field/form-field-outline.scss',
  'compatibility/f10/authored-use-reviews/chip-empty-context-requalification.json']) {
  reject('capture-or-owned-context-' + path, () => inspectFormAsyncSources({root,
    readMember: name => name === path ? Buffer.concat([read(name), Buffer.from('\n')]) : read(name)}));
}
assert.deepEqual(report.subjects.map(n => n.sha), FORM_ASYNC_SHAS);
const pairs = report.subjects.flatMap(n => n.pairs), hooks = report.subjects.flatMap(n => n.hookPairs);
assert.equal(pairs.filter(n => n.unchanged_complete_callback_semantics).length, 77);
assert.equal(pairs.filter(n => n.exact_predicate_expressions_equal).length, 280);
assert.equal(pairs.filter(n => n.body_equal_after_only_recorded_boundary_changes).length, 282);
assert.equal(report.subjects.reduce((n, s) => n + s.fixtureClasses.length, 0), 90);
assert.equal(hooks.length, 22);
assert.equal(pairs.flatMap(n => n.after.steps).filter(n => n.text === 'await wait(0);').length, 26);
assert.equal(pairs.flatMap(n => n.after.steps).filter(n => n.text === 'await wait(16);').length, 3);
assert.equal(pairs.flatMap(n => n.after.steps).filter(n => n.text.endsWith('.whenStable();')).length, 36);
assert.equal(report.subjects[1].pairs.find(n => n.individual_observation === 'checkboxThrow').before.steps.filter(n => n.within_expect_subject).length, 2);
assert.equal(report.subjects[2].pairs.find(n => n.individual_observation === 'slideThrow').before.steps.filter(n => n.within_expect_subject).length, 3);
const result = {schema_version: 1, line: report.line, complete_original_files: 4, complete_original_hunks: 205,
  static_occurrences_paired: 283, explicit_input_suite_renames: 2, unchanged_complete_callbacks: 77,
  exact_predicate_expressions_equal: 280, individually_changed_predicates: 3,
  whole_bodies_equal_after_only_recorded_boundary_changes: 282, individual_rapid_sheet_observation_changes: 1,
  setup_hooks_reviewed: 22, fixture_class_bodies_preserved: 90, native_zero_ms_waits: 26,
  native_input16ms_waits: 3, new_stability_waits: 36, controls: controls.length, cases: controls,
  owned_product_members: 1141, current_owned_cases: 2223, old_owned_cases_preserved: 2222,
  helper_sha256: hash(read('scripts/spec-form-async-source-review.mjs')),
  producer_sha256: hash(read('tests/spec_form_async_source_probe.mjs')),
  production_HTML_CSS_SCSS_or_template_changes: 0, actual_Angular_native_artifact_or_floor_qualified: false, g11_claim: 'not-passed'};
const out = process.argv.indexOf('--out');
if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...result, cases: undefined}));
