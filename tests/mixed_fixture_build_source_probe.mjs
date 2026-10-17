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
import {inspectFixtureBuildSources, fixtureBuildPins, reviewFixtureBuildSubject, observeFixtureBuildSubject,
  inspectFixtureBuildOwnedContext} from '../scripts/mixed-fixture-build-source-review.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), prefix = 'compatibility/rc/mixed-fixture-build-source-';
const read = p => readFileSync(resolve(root, p)), hash = x => createHash('sha256').update(x).digest('hex');
const originals = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))).subjects;
const pins = fixtureBuildPins({root}), actual = inspectFixtureBuildSources({root}), cases = [];
assert.deepEqual(actual.subjects.map(n => [n.cases_before, n.cases_after, n.unchanged_complete_callbacks]),
  [[39, 39, 39], [74, 74, 74], [226, 226, 225], [67, 66, 66]]);
assert.equal(actual.source_case_identities_before, 406); assert.equal(actual.retained_source_case_identities, 405);
assert.equal(actual.unchanged_complete_source_callbacks, 404); assert.equal(actual.explicitly_commented_out_upstream_cases, 1);
assert.equal(actual.owned_product_members, 1141); assert.equal(actual.current_required_historical_case_ids, 2228);
assert.equal(actual.actual_Angular_native_artifact_browser_SSR_or_floor_qualified, false);
function reject(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
for (const [index, subject] of originals.entries()) {
  for (const [i, member] of subject.members.entries()) {
    const changed = structuredClone(subject); changed.members[i].after.text += '\n/* unreviewed full-source drift */\n';
    reject(subject.sha + ':' + member.path + ':after-drift', () => reviewFixtureBuildSubject(changed, index, pins.subjects[index]));
    const both = structuredClone(subject); both.members[i].before.text += '\n/* unreviewed source */\n'; both.members[i].after.text += '\n/* unreviewed source */\n';
    reject(subject.sha + ':' + member.path + ':synchronized-drift', () => reviewFixtureBuildSubject(both, index, pins.subjects[index]));
  }
  const i = subject.members.findIndex(n => n.path.endsWith('.spec.ts')), changed = structuredClone(subject);
  changed.members[i].after.text = changed.members[i].after.text.replace(/\bit\(/, 'xit(');
  assert.notEqual(changed.members[i].after.text, subject.members[i].after.text);
  reject(subject.sha + ':disabled-case', () => observeFixtureBuildSubject(changed, index));
  const cleanup = structuredClone(subject); cleanup.members[i].after.text += '\nafterEach(() => { throw Error("cleanup drift"); });\n';
  reject(subject.sha + ':cleanup-hook', () => reviewFixtureBuildSubject(cleanup, index, pins.subjects[index]));
}
for (const ref of pins.owned_context[actual.line].owned_context)
  reject('owned-fixture-or-tool-context:' + ref.path, () => assert.deepEqual(inspectFixtureBuildOwnedContext({root,
    readMember: p => p === ref.path ? Buffer.concat([read(p), Buffer.from('\n/* context drift */\n')]) : read(p)}), pins.owned_context[actual.line]));
{
  const original = originals[3], deleted = pins.subjects[3].observation.removed_active_source_cases[0];
  const restored = structuredClone(original); restored.members.find(n => n.path === deleted.path).after.text += '\n' + deleted.raw + ';\n';
  reject('explicit-commented-case-restored-unreviewed', () => observeFixtureBuildSubject(restored, 3));
  const changed = structuredClone(original); changed.members.find(n => n.path === deleted.path).before.text =
    changed.members.find(n => n.path === deleted.path).before.text.replace('expect(chipGridInstance._keyManager.activeItemIndex).toBe(-1)', 'expect(chipGridInstance._keyManager.activeItemIndex).toBe(0)');
  reject('commented-case-contract-changed-before-removal', () => observeFixtureBuildSubject(changed, 3));
  const current = 'projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts';
  reject('owned-empty-repopulation-regression-disabled', () => inspectFixtureBuildOwnedContext({root, readMember: p => p === current ?
    Buffer.from(read(p).toString().replace("it('should clear a destroyed active chip when the list becomes empty'", "xit('should clear a destroyed active chip when the list becomes empty'")) : read(p)}));
}
for (const [index, path, from, to] of [
  [0, 'src/cdk/portal/portal.spec.ts', 'this.parentInjector.get<any>(token, notFoundValue)', 'this.parentInjector.get<any>(token)'],
  [1, 'src/cdk/table/table.spec.ts', 'ContentChildren(CdkColumnDef, {descendants: false})', 'ContentChildren(CdkColumnDef, {descendants: true})'],
  [1, 'src/cdk/table/table.spec.ts', 'ContentChildren(CdkRowDef, {descendants: false})', 'ContentChildren(CdkRowDef, {descendants: true})'],
  [2, 'src/cdk/overlay/overlay.spec.ts', 'expect(() => {', 'expect(() => { throw Error("initialization drift");'],
  [2, 'guides/using-component-harnesses.md', 'TestBed.configureTestingModule', 'TestBed.resetTestingModule'],
  [3, 'goldens/material/chips/index.api.md', 'protected _lastDestroyedFocusedChipIndex: number | null;', 'protected _lastDestroyedFocusedChipIndex: number;'],
]) {
  const changed = structuredClone(originals[index]), member = changed.members.find(n => n.path === path);
  assert.ok(member.after.text.includes(from)); member.after.text = member.after.text.replace(from, to);
  reject(index + ':' + path + ':individual-contract-drift:' + from, () => reviewFixtureBuildSubject(changed, index, pins.subjects[index]));
}
for (const suffix of ['subjects.json.gz', 'observation-pins.json.gz'])
  reject('source-capsule:' + suffix, () => inspectFixtureBuildSources({root,
    readMember: p => p === prefix + suffix ? Buffer.concat([read(p), Buffer.from('drift')]) : read(p)}));
assert.equal(cases.length, 57);
const report = {schema_version: 1, line: actual.line,
  helper: {path: 'scripts/mixed-fixture-build-source-review.mjs', sha256: hash(read('scripts/mixed-fixture-build-source-review.mjs'))},
  producer: {path: 'tests/mixed_fixture_build_source_probe.mjs', sha256: hash(read('tests/mixed_fixture_build_source_probe.mjs'))},
  negative_controls: cases.length, cases, source_case_identities_before: 406, retained_source_case_identities: 405,
  unchanged_complete_source_callbacks: 404, explicitly_commented_out_upstream_cases: 1,
  actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: actual.line, negative_controls: cases.length, retained_cases: 405, actual_runtime_qualified: false}));
