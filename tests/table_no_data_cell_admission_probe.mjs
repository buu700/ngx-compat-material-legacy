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
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p)), hash = b => createHash('sha256').update(b).digest('hex');
const frozen = JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json'));
const current = JSON.parse(read('compatibility/f10/authored-dependency-current-dispositions.json'));
const path = 'compatibility/f10/authored-use-reviews/table-no-data-cell-requalified-boundaries.json';
const rows = [...frozen.symbol_uses, ...current.symbol_uses].filter(row => row.source_review?.path === path);
assert.equal(rows.length, 18); const controls = [];
for (const row of rows) {
  assert.equal(authoredUseReviewEvidence({symbol_uses: [row]}, frozen.line, read, hash).reviewed, 1);
  for (const id of ['wrong-line', 'missing-caller', 'stale-source', 'changed-independent-evidence']) {
    const body = JSON.parse(read(path)), review = body.reviews.find(r => r.file === row.file && r.module === row.module && r.symbol === row.symbol);
    if (id === 'wrong-line') body.line = frozen.line === 'main' ? '21.x' : 'main';
    if (id === 'missing-caller') body.reviews = body.reviews.filter(r => r !== review);
    if (id === 'stale-source') review.candidate_source_sha256 = '0'.repeat(64);
    if (id === 'changed-independent-evidence') review.independent_evidence[0].sha256 = '0'.repeat(64);
    const bytes = Buffer.from(JSON.stringify(body)), candidate = {...row, source_review: {path, sha256: hash(bytes)}};
    assert.equal(authoredUseReviewEvidence({symbol_uses: [candidate]}, frozen.line, p => p === path ? bytes : read(p), hash).insufficient, 1, id);
    controls.push({file: row.file, symbol: row.symbol, id, rejected: true});
  }
}
const report = {schema_version: 1, line: frozen.line, positive_callers: rows.length, negative_controls: controls,
  scope: 'Eighteen real source-review admissions and four actual admission faults per caller. Source/DI semantic proofs remain separately bound; full G11 is not passed.'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: frozen.line, positive_callers: rows.length, negative_controls: controls.length}));
