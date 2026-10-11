/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reports = ['deferred-control-historical-dependency-requalification', 'public-focus-monitor-service-boundary']
  .map(name => 'compatibility/f10/authored-use-reviews/' + name + '.json');
const rows = ['authored-dependency-dispositions', 'authored-dependency-current-dispositions']
  .flatMap(name => JSON.parse(read('compatibility/f10/' + name + '.json')).symbol_uses)
  .filter(row => reports.includes(row.source_review?.path));
assert.equal(rows.length, 43);
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
const observe = (files = {}, actualLine = line) => authoredUseReviewEvidence({symbol_uses: rows}, actualLine,
  path => Object.hasOwn(files, path) ? files[path] : read(path), hash);
assert.deepEqual(observe(), {reviewed: 43, insufficient: 0, insufficient_uses: []});
const controls = [];
for (const [id, path, rejected] of [
  ['changed-lifetime-proof', 'compatibility/rc/deferred-control-lifetime-source-proof.json', 43],
  ['missing-lifetime-diagnostic', 'compatibility/rc/deferred-control-lifetime-diagnostic.json', 43],
  ['changed-role-comparison', 'compatibility/rc/deferred-control-dependency-requalification-diagnostic.json', 43],
  ['changed-comparison-producer', 'tests/deferred_control_dependency_requalification_probe.mjs', 43],
  ['changed-genuine-service-observations', 'compatibility/rc/focus-monitor-public-diagnostic.json', 16],
]) {
  assert.equal(observe({[path]: Buffer.from('changed evidence')}).insufficient, rejected);
  controls.push({id, rejected});
}
assert.equal(observe({}, line === 'main' ? '21.x' : 'main').insufficient, 43);
controls.push({id: 'wrong-line', rejected: 43});
const callers = new Map();
for (const row of rows) callers.set(row.file, (callers.get(row.file) || 0) + 1);
for (const [file, count] of callers) {
  assert.equal(observe({['projects/ngx-material-legacy/' + file]: Buffer.from('changed caller')}).insufficient, count);
}
controls.push({id: 'changed-caller-source', files: callers.size, rejected: 43});
for (const path of reports) {
  const count = rows.filter(row => row.source_review.path === path).length;
  assert.equal(observe({[path]: Buffer.from('changed membership')}).insufficient, count);
}
controls.push({id: 'changed-review-membership', reports: reports.length, rejected: 43});
const report = {schema_version: 1, line, reviewed_source_rows: 43, controls, caller_files: callers.size,
  native_or_packed_or_full_floors_qualified: false};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line, reviewed_rows: 43, negative_groups: controls.length, caller_files: callers.size}));
