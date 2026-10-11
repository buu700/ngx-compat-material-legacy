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
const exactReviews = new Set(['class-decorator', 'animation-token', 'attribute', 'key-manager'].map(kind =>
  'compatibility/f10/authored-use-reviews/historical-menu-requalified-' + kind + '-boundaries.json'));
const rows = ['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json'].flatMap(path => JSON.parse(read(path)).symbol_uses)
  .filter(row => exactReviews.has(row.source_review?.path));
assert.equal(rows.length, 187);
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
const observe = (files = {}, actualLine = line, selected = rows) => authoredUseReviewEvidence({symbol_uses: selected},
  actualLine, path => Object.hasOwn(files, path) ? files[path] : read(path), hash);
assert.deepEqual(observe(), {reviewed: 187, insufficient: 0, insufficient_uses: []});
const controls = [];
const proof = 'compatibility/rc/historical-menu-metadata-requalification-proof.json';
for (const [id, file, bytes] of [
  ['changed-proof', proof, Buffer.from('unverified scope statement')],
  ['missing-proof', proof, Buffer.alloc(0)],
  ['changed-inspector', 'scripts/historical-menu-metadata-requalification.mjs', Buffer.from('different classifier')],
  ['changed-input-identities', 'compatibility/rc/historical-menu-metadata-requalification-inputs.json', Buffer.from('different inputs')],
]) {assert.equal(observe({[file]: bytes}).insufficient, 187); controls.push({id, rejected: 187});}
assert.equal(observe({}, line === 'main' ? '21.x' : 'main').insufficient, 187);
controls.push({id: 'wrong-line', rejected: 187});
const unique = new Set(rows.map(row => row.file));
for (const file of unique) {
  const expected = rows.filter(row => row.file === file).length;
  assert.equal(observe({['projects/ngx-material-legacy/' + file]: Buffer.from('different source role')}, line, rows.filter(row => row.file === file)).insufficient, expected);
}
controls.push({id: 'changed-caller-source', files: unique.size, rejected: 187});
for (const path of new Set(rows.map(row => row.source_review.path))) {
  const expected = rows.filter(row => row.source_review.path === path).length;
  assert.equal(observe({[path]: Buffer.from('altered review membership')}).insufficient, expected);
}
controls.push({id: 'changed-review-membership', reviews: 4, rejected: 187});
const report = {schema_version: 1, line, source_requalified_rows: rows.length, controls,
  role: 'Actual authored-use admission for the finite historical-menu metadata/token/key-manager reviews; no native/packed/floor/G11 claim'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line, valid_rows: rows.length, negative_groups: controls.length,
  caller_files_checked: unique.size, native_or_packed_qualified: false}));
