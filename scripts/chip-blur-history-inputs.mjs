/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** One fixed complete original module; never current or runtime qualification. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
export const CHIP_BLUR_HISTORY_INPUTS = 'compatibility/rc/chip-blur-history-inputs.json';
const pins = {main: 'aa39d7ad27a3543cf6adde7615a66e3232b669acfdfee3a4f299bd61296e825c', '21.x': '41b62dfa9a05755c845ec1c78dcd7115677c0f11a92d11b506e2cbd816cd511e'};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function chipBlurHistoryInputs({root = process.cwd(), read = path => readFileSync(join(root, path))} = {}) {
  const bytes = read(CHIP_BLUR_HISTORY_INPUTS), data = JSON.parse(bytes);
  assert.equal(hash(bytes), pins[data.line], 'changed original chip-blur history inputs');
  assert.equal(data.schema_version, 1); assert.equal(data.id, 'chip-blur-original');
  assert.equal(data.module, 'tests.test_chip_blur_runtime');
  assert.equal(data.program, 'tests/test_chip_blur_runtime.py');
  assert.deepEqual(data.case_ids, ['tests.test_chip_blur_runtime.ChipBlurRuntimeTests.test_blur_form_state_and_request_lifetimes']);
  assert.equal(data.timeout_ms, 150000); assert.equal(data.actual_current_source_native_packed_or_floor_qualified, false);
  assert.equal(data.g11_claim, 'not-passed');
  const stored = read(data.prior.path); assert.equal(hash(stored), data.prior.sha256, 'changed original chip-blur preimages');
  const raw = gunzipSync(stored); assert.equal(hash(raw), data.prior.raw_sha256); const prior = JSON.parse(raw);
  assert.equal(prior.line, data.line); assert.equal(prior.source_parent, data.source_parent); assert.deepEqual(prior.frame, data.frame);
  assert.equal(prior.originals.length, 3);
  const environment = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
  for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete environment[name];
  for (const member of prior.originals) {
    assert.equal(hash(member.text), member.sha256);
    const original = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
      'show', data.frame.commit + ':' + member.path], {cwd: root, env: environment, maxBuffer: 1024 * 1024});
    assert.equal(hash(original), member.sha256, 'changed original chip-blur program');
    if (member.path === data.program) assert.equal(member.sha256, data.program_sha256);
    else assert.equal(hash(read(member.path)), member.sha256, 'original Node probe/worker must remain untouched');
  }
  assert.equal(hash(read(data.program)), data.wrapper_sha256, 'unknown chip-blur wrapper');
  let engine = prior.shared_engine_before.text;
  assert.equal(hash(engine), prior.shared_engine_before.sha256);
  assert.equal(data.shared_engine_edits.length, 3);
  for (const [before, after] of data.shared_engine_edits) {
    assert.equal(engine.split(before).length, 2, 'ambiguous shared engine edit'); engine = engine.replace(before, after);
  }
  assert.equal(hash(engine), data.shared_engine_after_sha256);
  assert.equal(hash(read(prior.shared_engine_before.path)), data.shared_engine_after_sha256, 'unknown shared engine bytes');
  return {data, prior, sha256: hash(bytes)};
}
