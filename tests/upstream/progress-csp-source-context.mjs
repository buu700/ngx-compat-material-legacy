/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
/** Exact finite additions only. Existing historical controls then compare the
 * whole recovered preceding file, without changing their assertions or pins. */
export const PROGRESS_CSP_INTEGRATION = {
  checker: [
    ["import {requiresProgressCsp,validateProgressCsp} from './upstream-progress-csp-evidence.mjs';\n", ''],
    ['  if (requiresProgressCsp(entry, proof)) {\n    const result = validateProgressCsp({root, entry, proof, request});\n    artifactBehaviorResults.set(entry.sha, result);\n    if (!result.ok) return false;\n  }\n', ''],
    ["  let browserExecution;\n  if (process.env.RC_UPSTREAM_BROWSER_MATRIX !== undefined) {\n    try { browserExecution = JSON.parse(process.env.RC_UPSTREAM_BROWSER_MATRIX); }\n    catch { return {error: 'RC_UPSTREAM_BROWSER_MATRIX is not JSON'}; }\n  }\n", ''],
    ['packedConsumerExecution, historicalExecution, browserExecution};', 'packedConsumerExecution, historicalExecution};'],
    ['  const sensitive = sensitiveClass(entry) || requiresProgressCsp(entry, entry.individual_proof);', '  const sensitive = sensitiveClass(entry);'],
  ],
  coordinator: [
    ["        env['RC_UPSTREAM_BROWSER_MATRIX'] = json.dumps({\n            'run_id': ACTIVE_RUN.manifest['run_id'],\n            'invocation_id': ACTIVE_RUN.invocations.get('browser-matrix'),\n            'exit_code': ACTIVE_RUN.exit_codes.get('browser-matrix'),\n        }, sort_keys=True)\n", ''],
  ],
};
export function stripProgressCspIntegration(text, kind) {
  assert.ok(Object.hasOwn(PROGRESS_CSP_INTEGRATION, kind));
  for (const [current, preceding] of PROGRESS_CSP_INTEGRATION[kind]) {
    assert.equal(text.split(current).length, 2, 'missing/duplicate finite progress CSP integration');
    text = text.replace(current, () => preceding);
  }
  return text;
}

/** The older historical suite predates the independently reviewed six-scope
 * packed guard. Recover its complete three-scope predecessor from that change's
 * authenticated capsule; its original expected hash remains an assertion. */
export function precedingHistoricalContextMember(path, read) {
  const bytes = read(path);
  if (path !== 'scripts/upstream-artifact-behavior-evidence.mjs') return bytes;
  const hash = value => createHash('sha256').update(value).digest('hex');
  const input = read('compatibility/rc/chip-menu-tooltip-admission-inputs.json'), capsule = JSON.parse(input);
  assert.equal(hash(input), {main: 'be081b35365d33367f0295dfdb52c750cdaea4efe836899eeacc1a4d66561b56',
    '21.x': '7be7c160690ed24054fac496bffa824e2c168ad03c6911a74245216def90699a'}[capsule.line]);
  const changeBytes = read(capsule.guard_change.path); assert.equal(hash(changeBytes), capsule.guard_change.sha256);
  const change = JSON.parse(changeBytes); assert.equal(change.path, path); assert.equal(hash(bytes), change.current_sha256);
  const archived = read(capsule.prior.path); assert.equal(hash(archived), capsule.prior.sha256);
  const raw = gunzipSync(archived); assert.equal(hash(raw), capsule.prior.raw_sha256);
  const previous = JSON.parse(raw).members.find(row => row.path === path); assert.ok(previous); assert.equal(hash(previous.text), previous.sha256);
  let recovered = bytes.toString();
  for (const [preceding, current] of [...change.edits].reverse()) {
    assert.equal(recovered.split(current).length, 2); recovered = recovered.replace(current, () => preceding);
  }
  assert.equal(recovered, previous.text); assert.equal(hash(recovered), change.before_sha256);
  return Buffer.from(recovered);
}
