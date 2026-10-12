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
const inventory = JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json'));
const path = 'compatibility/f10/authored-use-reviews/table-data-source-public-boundaries.json';
const rows = inventory.symbol_uses.filter(r => r.source_review?.path === path); assert.equal(rows.length, 3);
const controls = [];
for (const row of rows) {
  assert.equal(authoredUseReviewEvidence({symbol_uses: [row]}, inventory.line, read, hash).reviewed, 1);
  for (const fault of ['wrong-line', 'missing-use', 'stale-source', 'changed-runtime', 'changed-rxjs-subject']) {
    const body = JSON.parse(read(path)), review = body.reviews.find(r => r.symbol === row.symbol);
    if (fault === 'wrong-line') body.line = inventory.line === 'main' ? '21.x' : 'main';
    if (fault === 'missing-use') body.reviews = body.reviews.filter(r => r !== review);
    if (fault === 'stale-source') review.candidate_source_sha256 = '0'.repeat(64);
    if (fault === 'changed-runtime') review.independent_evidence.find(r => r.path.endsWith('runtime-diagnostic.json')).sha256 = '0'.repeat(64);
    if (fault === 'changed-rxjs-subject') review.independent_evidence.find(r => r.path.endsWith('rxjs-subjects.json')).sha256 = '0'.repeat(64);
    const bytes = Buffer.from(JSON.stringify(body)), candidate = {...row, source_review: {path, sha256: hash(bytes)}};
    assert.equal(authoredUseReviewEvidence({symbol_uses: [candidate]}, inventory.line, p => p === path ? bytes : read(p), hash).insufficient, 1);
    controls.push({symbol: row.symbol, fault, rejected: true});
  }
}
const report = {schema_version: 1, line: inventory.line, positive_uses: rows.length, negative_controls: controls,
  scope: 'Three exact source-bound API admissions; five actual source/admission mutations per use. Not full G11.'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: inventory.line, positive_uses: rows.length, negative_controls: controls.length}));
