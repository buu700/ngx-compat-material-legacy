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
const review = 'compatibility/f10/authored-use-reviews/historical-menu-requalified-property-and-parameter-boundaries.json';
const selected = path => JSON.parse(read(path)).symbol_uses.filter(row => row.source_review?.path === review);
const frozen = selected('compatibility/f10/authored-dependency-dispositions.json');
const current = selected('compatibility/f10/authored-dependency-current-dispositions.json');
assert.equal(frozen.length, 188); assert.equal(current.length, 28);
const rows = [...frozen, ...current];
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
const observe = (files = {}, actualLine = line, scope = rows) => authoredUseReviewEvidence({symbol_uses: scope},
  actualLine, path => Object.hasOwn(files, path) ? files[path] : read(path), hash);
assert.deepEqual(observe(), {reviewed: 216, insufficient: 0, insufficient_uses: []});
const controls = [];
const proof = 'compatibility/rc/historical-menu-annotation-requalification-proof.json';
for (const [id, file, bytes] of [
  ['changed-proof', proof, Buffer.from('unverified scope statement')],
  ['missing-proof', proof, Buffer.alloc(0)],
  ['changed-inspector', 'scripts/historical-menu-annotation-requalification.mjs', Buffer.from('different classifier')],
  ['changed-input-identities', 'compatibility/rc/historical-menu-annotation-requalification-inputs.json', Buffer.from('different inputs')],
  ['changed-review-membership', review, Buffer.from('different membership')],
]) {assert.equal(observe({[file]: bytes}).insufficient, 216); controls.push({id, rejected: 216});}
assert.equal(observe({}, line === 'main' ? '21.x' : 'main').insufficient, 216);
controls.push({id: 'wrong-line', rejected: 216});
const files = new Set(rows.map(row => row.file));
for (const file of files) {
  const scope = rows.filter(row => row.file === file);
  assert.equal(observe({['projects/ngx-material-legacy/' + file]: Buffer.from('different source role')},
    line, scope).insufficient, scope.length);
}
controls.push({id: 'changed-caller-source', files: files.size, rejected: 216});
const report = {schema_version: 1, line, source_requalified_rows: rows.length,
  frozen_rows: frozen.length, current_rows: current.length, controls,
  role: 'Actual authored-use admission for the finite public property/parameter annotation reviews; no native/packed/floor/G11 claim'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line, valid_rows: rows.length, negative_groups: controls.length,
  caller_files_checked: files.size, native_or_packed_qualified: false}));
