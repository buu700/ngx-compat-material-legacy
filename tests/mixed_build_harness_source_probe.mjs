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
import {inspectBuildHarnessSources, buildHarnessPins, reviewBuildHarnessSubject, pairBuildHarnessCases,
  observeBuildHarnessSubject, inspectBuildHarnessOwnedContext, projectBuildHarnessFile} from '../scripts/mixed-build-harness-source-review.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), prefix = 'compatibility/rc/mixed-build-harness-source-';
const read = p => readFileSync(resolve(root, p)), hash = x => createHash('sha256').update(x).digest('hex');
const originals = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))).subjects;
const pins = buildHarnessPins({root}), actual = inspectBuildHarnessSources({root}), cases = [];
assert.deepEqual(actual.subjects.map(n => [n.cases_before, n.cases_after, n.unchanged_complete_callbacks]), [[86, 86, 78], [85, 85, 85], [82, 82, 82], [2765, 2763, 2763]]);
assert.equal(actual.source_case_identities_before, 3018); assert.equal(actual.retained_source_case_identities, 3016);
assert.equal(actual.unchanged_complete_source_callbacks, 3008); assert.equal(actual.exact_identity_relabels, 684);
assert.equal(actual.explicitly_removed_exact_duplicate_registrations, 2);
assert.equal(actual.archived_executable_tool_bundles_not_behavior_or_security_reviewed, 2);
assert.equal(actual.owned_product_members, 1141); assert.equal(actual.current_required_historical_case_ids, 2228);
assert.equal(actual.actual_original_tool_Sass_Angular_native_artifact_browser_SSR_or_floor_qualified, false);
function reject(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
for (const [index, subject] of originals.entries()) {
  for (const [i, member] of subject.members.entries()) {
    const changed = structuredClone(subject); changed.members[i].after.text += '\n/* unreviewed complete-source drift */\n';
    reject(subject.sha + ':' + member.path + ':after-drift', () => reviewBuildHarnessSubject(changed, index, pins.subjects[index]));
    const both = structuredClone(subject); both.members[i].before.text += '\n/* unreviewed source */\n'; both.members[i].after.text += '\n/* unreviewed source */\n';
    reject(subject.sha + ':' + member.path + ':synchronized-drift', () => reviewBuildHarnessSubject(both, index, pins.subjects[index]));
  }
  const i = subject.members.findIndex(n => n.path.endsWith('.spec.ts')), changed = structuredClone(subject);
  changed.members[i].after.text = changed.members[i].after.text.replace(/\bit\(/, 'xit('); assert.notEqual(changed.members[i].after.text, subject.members[i].after.text);
  reject(subject.sha + ':disabled-case', () => pairBuildHarnessCases(changed, index));
  const cleanup = structuredClone(subject); cleanup.members[i].after.text += '\nafterEach(() => { throw Error("cleanup drift"); });\n';
  reject(subject.sha + ':cleanup-hook', () => reviewBuildHarnessSubject(cleanup, index, pins.subjects[index]));
}
for (const ref of pins.owned_context[actual.line].owned_context)
  reject('owned-runner-policy-context:' + ref.path, () => inspectBuildHarnessOwnedContext({root,
    readMember: p => p === ref.path ? Buffer.concat([read(p), Buffer.from('\n/* context drift */\n')]) : read(p)}));
for (const member of originals[3].members.filter(n => n.path.endsWith('.spec.ts'))) {
  const before = projectBuildHarnessFile(member.before.text, member.path, 'titles', 'before');
  reject('operations-beyond-titles:' + member.path, () => assert.equal(before.projection_sha256,
    projectBuildHarnessFile(member.after.text + '\nthrow Error("extra operation");\n', member.path, 'titles', 'after').projection_sha256));
}
for (const removed of actual.subjects[3].explicitly_removed_exact_duplicate_registrations) {
  const changed = structuredClone(originals[3]), member = changed.members.find(n => n.path === removed.path);
  assert.ok(member.after.text.includes(removed.raw)); member.after.text = member.after.text.replace(removed.raw, 'void 0');
  reject('retained-original-duplicate-missing:' + removed.path, () => pairBuildHarnessCases(changed, 3));
}
{
  const member = originals[3].members.find(n => n.path === 'src/cdk/table/text-column.spec.ts');
  const changed = member.before.text.replace("data.propertyA + '!'", "data.propertyA + '?'"); assert.notEqual(changed, member.before.text);
  reject('non-identical-removed-duplicate', () => projectBuildHarnessFile(changed, member.path, 'titles', 'before'));
}
for (const line of ["import 'zone.js';\n", "import 'zone.js/testing';\n", "import 'reflect-metadata';\n"]) {
  const changed = structuredClone(originals[2]), member = changed.members.find(n => n.path === 'test/angular-test.init.ts');
  assert.ok(member.after.text.includes(line)); member.after.text = member.after.text.replace(line, '');
  reject('initializer-side-effect-import:' + line.trim(), () => observeBuildHarnessSubject(changed, 2));
}
for (const [index, path, side, from, to] of [
  [0, 'src/cdk/schematics/utils/project-style-file.ts', 'after', "const buildStyles = buildOptions['styles'];", 'const buildStyles = [];'],
  [0, 'tools/tslint-rules/ngOnChangesPropertyAccessRule.ts', 'before', "node.expression.name.text !== 'hasOwnProperty'", "node.expression.name.text !== 'other'"],
  [1, 'src/material/form-field/testing/form-field-harness.spec.ts', 'after', '    MatOption,', ''],
  [1, 'src/material/radio/radio.spec.ts', 'after', 'CommonModule, TranscludingWrapper]', 'CommonModule]'],
  [2, 'test/angular-test.init.ts', 'after', 'throw e;', 'return;'],
  [2, 'scripts/create-legacy-tests-bundle.mjs', 'after', 'treeShaking: false', 'treeShaking: true'],
  [2, 'scripts/create-legacy-tests-bundle.mjs', 'after', 'return sass.compile(inputFile,', 'return sass.compileAsync(inputFile,'],
  [2, 'src/cdk/a11y/key-manager/list-key-manager.spec.ts', 'after', 'runDirectionalKeyTests.call(context)', 'runDirectionalKeyTests.call(this)'],
  [0, 'src/cdk/schematics/utils/project-main-file.ts', 'after', "buildOptions['browser']", "buildOptions['main']"],
  [3, 'src/aria/listbox/listbox.spec.ts', 'after', '${focusMode}', '${unreviewedOperation()}'],
]) {
  const changed = structuredClone(originals[index]), member = changed.members.find(n => n.path === path);
  assert.ok(member[side].text.includes(from), path + ':' + from); member[side].text = member[side].text.replace(from, to);
  reject(index + ':' + path + ':individual-contract:' + from, () => reviewBuildHarnessSubject(changed, index, pins.subjects[index]));
}
for (const suffix of ['subjects.json.gz', 'observation-pins.json.gz'])
  reject('source-capsule:' + suffix, () => inspectBuildHarnessSources({root,
    readMember: p => p === prefix + suffix ? Buffer.concat([read(p), Buffer.from('drift')]) : read(p)}));
assert.equal(cases.length, 313);
const report = {schema_version: 1, line: actual.line,
  helper: {path: 'scripts/mixed-build-harness-source-review.mjs', sha256: hash(read('scripts/mixed-build-harness-source-review.mjs'))},
  producer: {path: 'tests/mixed_build_harness_source_probe.mjs', sha256: hash(read('tests/mixed_build_harness_source_probe.mjs'))},
  negative_controls: cases.length, cases, source_case_identities_before: 3018, retained_source_case_identities: 3016,
  unchanged_complete_source_callbacks: 3008, exact_identity_relabels: 684,
  actual_original_tool_Sass_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: actual.line, negative_controls: cases.length, retained_cases: 3016, actual_runtime_qualified: false}));
