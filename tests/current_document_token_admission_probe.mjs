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
const review = 'compatibility/f10/authored-use-reviews/current-complete-document-token-boundary.json';
const rows = ['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json'].flatMap(path => JSON.parse(read(path)).symbol_uses)
  .filter(row => row.source_review?.path === review);
assert.equal(rows.length, 16);
assert.equal(rows.filter(row => row.module === '@angular/core').length, 4);
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
const observe = (files = {}, actualLine = line) => authoredUseReviewEvidence({symbol_uses: rows}, actualLine,
  path => Object.hasOwn(files, path) ? files[path] : read(path), hash);
assert.deepEqual(observe(), {reviewed: 16, insufficient: 0, insufficient_uses: []});
const controls = [];
for (const [id, path, bytes] of [
  ['changed-proof', 'compatibility/rc/current-document-token-public-proof.json', Buffer.from('different proof')],
  ['missing-diagnostic', 'compatibility/rc/current-document-token-public-diagnostic.json', Buffer.alloc(0)],
  ['changed-census-producer', 'scripts/document-token-use-review.mjs', Buffer.from('different census')],
  ['changed-review-membership', review, Buffer.from('different review')],
]) {assert.equal(observe({[path]: bytes}).insufficient, 16); controls.push({id, rejected: 16});}
assert.equal(observe({}, line === 'main' ? '21.x' : 'main').insufficient, 16);
controls.push({id: 'wrong-line', rejected: 16});
for (const row of rows) {
  assert.equal(observe({['projects/ngx-material-legacy/' + row.file]: Buffer.from('changed token source')}).insufficient, 1);
}
controls.push({id: 'changed-caller-source', files: 16, rejected: 16});
const report = {schema_version: 1, line, reviewed_source_rows: 16, controls,
  native_or_packed_or_full_floors_qualified: false};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line, valid_rows: 16, negative_groups: controls.length, caller_files: 16,
  native_or_packed_qualified: false}));
