/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Three original candidate programs; current applied-source tests stay separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {sourceIntegrationWrapperHash} from './historical-source-replay.mjs';
export const DIALOG_CALLER_HISTORY_INPUTS = 'compatibility/rc/dialog-caller-history-inputs.json';
export const DIALOG_CALLER_HISTORY_MODULES = Object.freeze([
  'tests.test_dialog_caller_source', 'tests.test_dialog_caller_config_types', 'tests.test_dialog_caller_config_runtime',
]);
const pins = {main: 'b413c5360d78e80b3905a58ae1dffbd5b0d87e6fcb7cac35c2ca06fa6a2a3a2d', '21.x': '2fbde2774343ab60fe7e3dfa75dc4604f55b2c198ec16f61b4968d745125a53d'};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const currentTests = ['tests/test_dialog_caller_config_boundary.py', 'tests/test_dialog_caller_config_integration.py'];
const originalCache = new Map();
export function dialogCallerHistoryInputs({root = process.cwd(), read = path => readFileSync(join(root, path))} = {}) {
  const bytes = read(DIALOG_CALLER_HISTORY_INPUTS), data = JSON.parse(bytes);
  assert.equal(hash(bytes), pins[data.line], 'changed dialog candidate history registry');
  assert.equal(data.schema_version, 1); assert.equal(data.id, 'dialog-candidate-source-models');
  assert.equal(data.module_count, 3); assert.equal(data.case_count, 3); assert.equal(data.timeout_ms, 180000);
  assert.equal(data.original_JS_and_Python_programs_unchanged, true); assert.equal(data.new_source_closures, 0);
  assert.equal(data.actual_current_source_native_packed_or_floor_qualified, false); assert.equal(data.g11_claim, 'not-passed');
  assert.deepEqual(data.entries.map(entry => entry.module), DIALOG_CALLER_HISTORY_MODULES);
  assert.deepEqual(data.case_ids, data.entries.flatMap(entry => entry.case_ids));
  assert.equal(new Set(data.case_ids).size, 3);
  const stored = read(data.prior.path); assert.equal(hash(stored), data.prior.sha256, 'changed original candidate preimages');
  const unpacked = gunzipSync(stored); assert.equal(hash(unpacked), data.prior.raw_sha256);
  const prior = JSON.parse(unpacked);
  assert.equal(prior.line, data.line); assert.equal(prior.source_parent, data.frame.commit);
  assert.equal(prior.preimages.length, 3);
  const environment = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
  for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete environment[name];
  for (const entry of data.entries) {
    assert.equal(entry.program, entry.module.replaceAll('.', '/') + '.py');
    assert.equal(entry.case_ids.length, 1);
    assert.ok(entry.case_ids[0].startsWith(entry.module + '.') && /\.test_[A-Za-z0-9_]+$/.test(entry.case_ids[0]));
    const previous = prior.preimages.find(member => member.path === entry.program); assert.ok(previous);
    assert.equal(hash(previous.text), previous.sha256); assert.equal(previous.sha256, entry.program_sha256);
    const key = JSON.stringify([root, data.frame.commit, entry.program]);
    if (!originalCache.has(key)) originalCache.set(key, execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0',
      '-c', 'maintenance.auto=0', 'show', data.frame.commit + ':' + entry.program],
    {cwd: root, env: environment, maxBuffer: 1024 * 1024}));
    assert.equal(hash(originalCache.get(key)), entry.program_sha256, 'changed original candidate program');
    assert.equal(hash(read(entry.program)), entry.wrapper_sha256, 'changed candidate history wrapper');
  }
  assert.deepEqual(data.current_applied_test_programs.map(member => member.path), currentTests);
  // The boundary test remains current. The former integration test now replays
  // its exact source checkpoint; only its registered command routing may differ.
  // The live25-row integration independently covers the current source ledger.
  for (const member of data.current_applied_test_programs)
    assert.equal(hash(read(member.path)), sourceIntegrationWrapperHash({root,path:member.path,
      expectedSha:member.sha256,readMember:read}), 'changed separate applied-product test ' + member.path);
  return {data, prior, sha256: hash(bytes)};
}
export function selectDialogCallerHistory(data, requested = []) {
  assert.ok(Array.isArray(requested)); assert.equal(new Set(requested).size, requested.length);
  assert.ok(requested.every(name => DIALOG_CALLER_HISTORY_MODULES.includes(name)), 'unregistered candidate history module');
  const entries = requested.length ? data.entries.filter(entry => requested.includes(entry.module)) : data.entries;
  assert.ok(entries.length);
  return {modules: entries.map(entry => entry.module), complete: entries.length === 3,
    entry: {id: data.id, frame: data.frame, case_ids: entries.flatMap(entry => entry.case_ids),
      timeout_ms: data.timeout_ms, programs: entries.map(entry => ({path: entry.program, sha256: entry.program_sha256}))}};
}
