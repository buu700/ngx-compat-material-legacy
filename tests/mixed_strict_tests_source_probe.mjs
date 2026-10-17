/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectStrictTestSources, strictTestPins, reviewStrictTestSubject, pairStrictTestCases,
  observeStrictTestSubject, inspectStrictTestOwnedContext, projectStrictInitialization} from '../scripts/mixed-strict-tests-source-review.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), prefix = 'compatibility/rc/mixed-strict-tests-source-';
const read = p => readFileSync(resolve(root, p)), hash = x => createHash('sha256').update(x).digest('hex');
const originals = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))).subjects;
const pins = strictTestPins({root}), actual = inspectStrictTestSources({root}), cases = [];
assert.deepEqual(actual.subjects.map(n => [n.cases_before, n.cases_after, n.unchanged_complete_callbacks]), [[420, 420, 300], [917, 917, 917], [452, 452, 452]]);
assert.equal(actual.exact_reviewed_case_relocations, 4);
assert.equal(actual.owned_product_members, 1141); assert.equal(actual.current_required_historical_case_ids, 2228);
assert.equal(actual.actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified, false);
function reject(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
for (const [index, subject] of originals.entries()) {
  for (const [i, member] of subject.members.entries()) for (const side of ['before', 'after']) {
    const changed = structuredClone(subject); changed.members[i][side].text += '\n/* complete source drift */\n';
    reject(subject.sha + ':' + member.path + ':' + side + '-drift', () => reviewStrictTestSubject(changed, index, pins.subjects[index]));
  }
  const i = subject.members.findIndex(n => n.path.endsWith('.spec.ts')), changed = structuredClone(subject);
  changed.members[i].after.text = changed.members[i].after.text.replace(/\bit\(/, 'xit('); assert.notEqual(changed.members[i].after.text, subject.members[i].after.text);
  reject(subject.sha + ':disabled-case', () => pairStrictTestCases(changed, index));
  const cleanup = structuredClone(subject); cleanup.members[i].after.text += '\nafterEach(() => { throw Error("cleanup drift"); });\n';
  reject(subject.sha + ':cleanup-hook', () => reviewStrictTestSubject(cleanup, index, pins.subjects[index]));
}
for (const ref of pins.owned_context[actual.line].owned_context)
  reject('owned-runner-context:' + ref.path, () => inspectStrictTestOwnedContext({root,
    readMember: p => p === ref.path ? Buffer.concat([read(p), Buffer.from('\n/* context drift */\n')]) : read(p)}));
for (const member of originals[2].members) {
  const before = projectStrictInitialization(member.before.text, member.path, 'before');
  reject('operation-beyond-initialization:' + member.path, () => assert.equal(before.projection_sha256,
    projectStrictInitialization(member.after.text + '\nthrow Error("extra operation");\n', member.path, 'after').projection_sha256));
}
for (const pair of actual.subjects[0].pairs.filter(n => n.exact_reviewed_relocation)) {
  const move = pair.exact_reviewed_relocation, changed = structuredClone(originals[0]), member = changed.members.find(n => n.path === move[1]);
  assert.ok(member.after.text.includes(move[2])); member.after.text = member.after.text.replace(move[2], "'changed moved identity'");
  reject('moved-case-identity:' + move[1] + ':' + move[2], () => pairStrictTestCases(changed, 0));
}
for (const [path, from, to] of [
  ['src/material/core/ripple/ripple.zone.spec.ts', 'describe(', 'provideZoneChangeDetection();\ndescribe('],
  ['src/material/snack-bar/snack-bar.zone.spec.ts', 'provideZoneChangeDetection()', 'provideZonelessChangeDetection()'],
  ['src/material/tooltip/tooltip.zone.spec.ts', 'provideZoneChangeDetection()', 'provideZonelessChangeDetection()'],
]) {
  const changed = structuredClone(originals[0]), member = changed.members.find(n => n.path === path); assert.ok(member.after.text.includes(from)); member.after.text = member.after.text.replace(from, to);
  reject('exact-zone-provider-preparation:' + path, () => observeStrictTestSubject(changed, 0));
}
for (const [from, to] of [['exhaustive: true', 'exhaustive: false'], ['exhaustive: false', 'exhaustive: true']]) {
  const changed = structuredClone(originals[1]), member = changed.members.find(n => n.after.text.includes(from)); assert.ok(member); member.after.text = member.after.text.replace(from, to);
  reject('global-and-local-check-config:' + from, () => observeStrictTestSubject(changed, 1));
}
for (const [path, from, to] of [
  ['src/cdk/dialog/dialog.spec.ts', "localValue = '';", "localValue = 'different';"],
  ['src/cdk/dialog/dialog.spec.ts', 'dialogRef: DialogRef<any> | undefined;', 'dialogRef: DialogRef<any>;'],
  ['src/cdk/dialog/dialog.spec.ts', "closeButtonAriaLabel = '';", "closeButtonAriaLabel = 'different';"],
  ['src/cdk/scrolling/scrollable.spec.ts', "@Input() dir: Direction = 'ltr';", "@Input() dir: Direction = 'rtl';"],
]) {
  const member = originals[2].members.find(n => n.path === path); assert.ok(member.after.text.includes(from));
  reject('finite-initializer-exclusion:' + from, () => projectStrictInitialization(member.after.text.replace(from, to), path, 'after'));
}
for (const suffix of ['subjects.json.gz', 'observation-pins.json.gz'])
  reject('capsule:' + suffix, () => inspectStrictTestSources({root,
    readMember: p => p === prefix + suffix ? Buffer.concat([read(p), Buffer.from('drift')]) : read(p)}));
assert.equal(cases.length, 158);
const report = {schema_version: 1, line: actual.line,
  helper: {path: 'scripts/mixed-strict-tests-source-review.mjs', sha256: hash(read('scripts/mixed-strict-tests-source-review.mjs'))},
  producer: {path: 'tests/mixed_strict_tests_source_probe.mjs', sha256: hash(read('tests/mixed_strict_tests_source_probe.mjs'))},
  negative_controls: cases.length, cases, retained_source_case_identities: 1789, unchanged_complete_source_callbacks: 1669, exact_reviewed_case_relocations: 4,
  actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: actual.line, negative_controls: cases.length, retained_cases: 1789, actual_runtime_qualified: false}));
