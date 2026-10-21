/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Registration and rejection controls only; does not execute a historical cohort. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {dialogCallerHistoryInputs, selectDialogCallerHistory, DIALOG_CALLER_HISTORY_INPUTS} from '../scripts/dialog-caller-history-inputs.mjs';
const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const checked = dialogCallerHistoryInputs({root}), {data, prior} = checked;
const enginePath = 'scripts/chip-recent-history.mjs', engine = read(enginePath).toString();
const addedImport = "import {dialogCallerHistoryInputs,selectDialogCallerHistory} from './dialog-caller-history-inputs.mjs';\n";
assert.equal(engine.split(addedImport).length, 2);
const start = engine.indexOf('export async function runDialogCallerHistory('), end = engine.indexOf('\nasync function runHistoricalModules(', start);
assert.ok(start > 0 && end > start);
const restoredEngine = (engine.slice(0, start) + engine.slice(end + 1)).replace(addedImport, '');
const originalEngine = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
  'show', data.frame.commit + ':' + enginePath], {cwd: root, maxBuffer: 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
assert.equal(hash(restoredEngine), hash(originalEngine), 'existing historical runner was altered');
const all = selectDialogCallerHistory(data);
assert.equal(all.complete, true); assert.equal(all.modules.length, 3); assert.equal(all.entry.case_ids.length, 3);
const one = selectDialogCallerHistory(data, [data.entries[1].module]);
assert.equal(one.complete, false); assert.equal(one.entry.case_ids.length, 1);
for (const requested of [['foreign'], [data.entries[0].module, data.entries[0].module]])
  assert.throws(() => selectDialogCallerHistory(data, requested), error => error?.code === 'ERR_ASSERTION');
const controls = [DIALOG_CALLER_HISTORY_INPUTS, data.prior.path, ...data.entries.map(entry => entry.program),
  ...data.current_applied_test_programs.map(member => member.path)];
for (const path of controls) assert.throws(() => dialogCallerHistoryInputs({root,
  read: member => member === path ? Buffer.concat([read(member), Buffer.from('\n')]) : read(member)}),
error => error?.code === 'ERR_ASSERTION', path);
let changed = null;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
dialogCallerHistoryInputs({root, read: late});
for (changed of [data.entries[1].program, data.prior.path])
  assert.throws(() => dialogCallerHistoryInputs({root, read: late}), error => error?.code === 'ERR_ASSERTION');
assert.equal(prior.preimages.length, 3);
const frameSources = ['legacy-dialog/dialog-config.ts', 'legacy-dialog/internal/dialog-container-base.ts',
  'legacy-dialog/internal/dialog-initial-focus.ts'].map(path => 'projects/ngx-material-legacy/' + path);
const candidate = JSON.parse(read('compatibility/rc/dialog-caller-config-candidate.json'));
for (const path of frameSources) {
  const member = candidate.members.find(member => member.path === path); assert.ok(member);
  const original = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'show', data.frame.commit + ':' + path], {cwd: root, maxBuffer: 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
  assert.equal(hash(original), member.before.sha256);
  assert.equal(hash(read(path)), member.after.sha256, 'current product lost its applied fix');
}
const report = {schema_version: 1, line: data.line, registered_modules: 3, original_cases: 3,
  separate_current_applied_test_programs: 2, current_product_still_applied: true,
  metadata_corruptions_rejected: controls.length, late_changes_rejected: 2, invalid_selectors_rejected: 2,
  diagnostic_subset_never_complete: true, original_cases_executed: 0,
  existing_historical_runner_bytes_preserved: true,
  actual_current_source_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
