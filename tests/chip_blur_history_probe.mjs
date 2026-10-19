/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Boundary controls; the complete original module executes separately. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {chipBlurHistoryInputs, CHIP_BLUR_HISTORY_INPUTS} from '../scripts/chip-blur-history-inputs.mjs';
import {validateRecentCaseReceipt} from '../scripts/chip-recent-history.mjs';
import {historicalFrameMembers, inspectHistoricalReplayCurrent} from '../scripts/historical-source-replay.mjs';
const read = path => readFileSync(path), {data, prior} = chipBlurHistoryInputs(), controls = [];
const current = inspectHistoricalReplayCurrent();
assert.equal(historicalFrameMembers(process.cwd(), data.frame).length, data.frame.members);
assert.equal(current.guard.authenticated_current_wrapper_successors, 2);
for (const path of [CHIP_BLUR_HISTORY_INPUTS, data.prior.path, data.program,
  ...prior.originals.filter(member => member.path !== data.program).map(member => member.path),
  prior.shared_engine_before.path]) {
  assert.throws(() => chipBlurHistoryInputs({read: member => member === path ?
    Buffer.concat([read(member), Buffer.from('\n')]) : read(member)}));
  controls.push('changed-fixed-original-or-wrapper-' + path);
}
for (const args of [['--module', 'tests.test_chip_blur_runtime'], ['--report'],
  ['--report', 'a', '--report', 'b'], ['--unregistered', 'outside']]) {
  const invalid = spawnSync(process.execPath, ['scripts/run-chip-blur-history.mjs', ...args], {encoding: 'utf8'});
  assert.equal(invalid.status, 2); assert.match(invalid.stderr, /Usage:/);
  controls.push('invalid-cli-' + JSON.stringify(args));
}
const receipt = {tests_run: 1, started: [...data.case_ids], passed: [...data.case_ids], failures: [], errors: [],
  skipped: [], expected_failures: [], unexpected_successes: [], successful: true};
assert.equal(validateRecentCaseReceipt(data, receipt), true);
for (const [id, change] of [
  ['missing-case', body => body.passed.pop()], ['duplicate-case', body => body.passed.push(body.passed[0])],
  ['wrong-case', body => body.passed[0] = 'foreign.case'], ['not-started', body => body.started.pop()],
  ['wrong-count', body => body.tests_run = 0], ['failure', body => body.failures.push(body.passed[0])],
  ['error', body => body.errors.push(body.passed[0])], ['skipped', body => body.skipped.push(body.passed[0])],
  ['expected-failure', body => body.expected_failures.push(body.passed[0])],
  ['unexpected-success', body => body.unexpected_successes.push(body.passed[0])],
  ['unsuccessful', body => body.successful = false],
]) {
  const body = structuredClone(receipt); change(body);
  assert.throws(() => validateRecentCaseReceipt(data, body)); controls.push(id);
}
for (const field of ['tree', 'tree_listing_sha256', 'members']) {
  const frame = structuredClone(data.frame); frame[field] = field === 'members' ? frame.members - 1 : '0'.repeat(field === 'tree' ? 40 : 64);
  assert.throws(() => historicalFrameMembers(process.cwd(), frame)); controls.push('changed-frame-' + field);
}
for (const path of ['projects/ngx-material-legacy/legacy-chips/chip.ts', 'tests/chip_zone_use_probe.mjs']) {
  assert.throws(() => inspectHistoricalReplayCurrent({readMember: member => member === path ?
    Buffer.concat([read(member), Buffer.from('\n')]) : read(member)}));
  controls.push('unknown-current-source-' + path);
}
assert.equal(controls.length, 26);
const report = {schema_version: 1, line: data.line, original_modules: 1, original_case_ids: 1,
  original_zone_subjects: 10, original_mutation_rejections: 36, rejection_controls: controls.length, controls,
  guarded_current_members: current.guard.guarded_current_members,
  original_programs_preserved: 3, actual_original_module_executions: 0,
  actual_current_source_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
