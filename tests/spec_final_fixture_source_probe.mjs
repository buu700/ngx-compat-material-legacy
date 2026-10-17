/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FINAL_FIXTURE_SHAS, finalFixturePins, inspectFinalFixtureSources,
  reviewFinalFixtureFile, projectFinalClock} from '../scripts/spec-final-fixture-source-review.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const originals = JSON.parse(gunzipSync(readFileSync(resolve(root, 'compatibility/rc/spec-final-fixture-source-subjects.json.gz'))));
const pins = finalFixturePins({root}), actual = inspectFinalFixtureSources({root});
assert.equal(actual.subjects.length, 4); assert.equal(actual.paired_cases, 4001);
assert.deepEqual(actual.subjects.map(s => [s.complete_original_files, s.complete_original_hunks, s.cases_before,
  s.hooks_before, s.hooks_after]), [[24, 285, 1712, 238, 238], [33, 87, 876, 150, 124],
  [11, 23, 671, 94, 94], [16, 141, 742, 115, 115]]);
assert.equal(actual.actual_Angular_native_artifact_or_floor_qualified, false);
const cases = [];
function rejected(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
for (const [index, subject] of originals.subjects.entries()) for (const [i, member] of subject.members.entries()) {
  const pin = pins.subjects[index].files[i];
  const altered = structuredClone(member);
  const mutate = text => /\bexpect(?:Async)?\(/.test(text) ? text.replace(/\bexpect(?:Async)?\(/, '$&999, ') :
    text + '\nthrow new Error("unreviewed original operation");\n';
  altered.after.text = mutate(altered.after.text);
  rejected(subject.sha + ':' + member.path + ':changed-predicate-or-operation', () => reviewFinalFixtureFile(altered, subject.sha, pin));
  const synchronized = structuredClone(member);
  synchronized.before.text = mutate(synchronized.before.text); synchronized.after.text = mutate(synchronized.after.text);
  rejected(subject.sha + ':' + member.path + ':same-change-on-both-sides', () => reviewFinalFixtureFile(synchronized, subject.sha, pin));
}
for (const [index, subject] of originals.subjects.entries()) {
  const member = subject.members[0], pin = pins.subjects[index].files[0];
  const missing = structuredClone(member); missing.after.text = missing.after.text.replace(/\bit\(/, 'xit(');
  rejected(subject.sha + ':disabled-test', () => reviewFinalFixtureFile(missing, subject.sha, pin));
  const hook = structuredClone(member); hook.after.text += '\nafterEach(() => { throw new Error("cleanup drift"); });\n';
  rejected(subject.sha + ':cleanup-hook-added', () => reviewFinalFixtureFile(hook, subject.sha, pin));
  const template = subject.members.find(m => m.after.text.includes('template:'));
  assert.ok(template);
  const fixture = structuredClone(template); fixture.after.text = fixture.after.text.replace('template:', 'templateUrl:');
  const fixturePin = pins.subjects[index].files.find(p => p.path === template.path);
  rejected(subject.sha + ':fixture-template-contract-changed', () => reviewFinalFixtureFile(fixture, subject.sha, fixturePin));
}
const tooltip = originals.subjects[0].members.find(m => m.path === 'src/material/tooltip/tooltip.spec.ts');
const clock = projectFinalClock(tooltip, 'before');
assert.equal(clock.records.filter(n => n.operation === 'individual-spy-installed-before-position-update').length, 2);
const wrongSpy = structuredClone(tooltip);
wrongSpy.before.text = wrongSpy.before.text.replace("spyOn(tooltipDirective._overlayRef!, 'updatePosition').and.callThrough();",
  "spyOn(tooltipDirective._overlayRef!, 'detach').and.callThrough();");
assert.notEqual(projectFinalClock(wrongSpy, 'before').fingerprint, projectFinalClock(tooltip, 'after').fingerprint);
cases.push({id: 'tooltip-reorder-does-not-erase-other-spy-contracts', result: 'rejected'});
assert.deepEqual(actual.subjects.map(s => s.sha), FINAL_FIXTURE_SHAS);
const report = {schema_version: 1, line: actual.line, complete_original_files: 84, complete_original_hunks: 536,
  paired_original_cases: 4001, negative_controls: cases.length, cases,
  actual_Angular_native_artifact_or_floor_qualified: false, source_conclusion_only: true, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, cases: undefined}));
