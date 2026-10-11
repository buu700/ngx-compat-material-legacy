/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectHistoricalMenuViewportRequalification, VIEWPORT_INPUTS}
  from '../scripts/historical-menu-viewport-requalification.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const report = inspectHistoricalMenuViewportRequalification({root});
assert.equal(report.viewport_uses, 8); assert.equal(report.unchanged_call_sites, 6);
assert.equal(report.prior_runtime_contexts, 10);
const controls = [];
const archivePath = JSON.parse(read(VIEWPORT_INPUTS)).lines[report.line].archive.path;
for (const [id, path, bytes] of [
  ['changed-input-identities', VIEWPORT_INPUTS, Buffer.from('different inputs')],
  ['changed-authenticated-prior-producer', archivePath, Buffer.from('different archive')],
  ['changed-viewport-helper', 'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts', Buffer.from('different helper')],
  ['changed-viewport-producer', 'scripts/packed-consumer-aot-smoke.mjs', Buffer.from(read('scripts/packed-consumer-aot-smoke.mjs').toString('utf8').replace('parsed.viewportShared === true', 'true'))],
  ['changed-original-runtime-receipt', 'compatibility/rc/legacy-viewport-public-source-diagnostic.json', Buffer.from('different runtime receipt')],
]) {
  assert.notDeepEqual(bytes, read(path));
  assert.throws(() => inspectHistoricalMenuViewportRequalification({root,
    readMember: member => member === path ? bytes : read(member)}));
  controls.push({id, rejected: true});
}
report.negative_controls = controls;
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.line, uses: 8, unchanged_calls: 6, negative_controls: controls.length,
  previous_runtime_rerun: false, native_or_packed_qualified: false}));
