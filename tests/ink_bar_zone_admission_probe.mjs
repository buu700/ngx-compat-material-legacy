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
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(join(root, p));
const hash = b => createHash('sha256').update(b).digest('hex');
const ledger = JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json'));
const rows = ledger.symbol_uses.filter(r => r.file === 'legacy-tabs/ink-bar.ts' && r.module === '@angular/core' && r.symbol === 'NgZone');
assert.equal(rows.length, 1); const row = rows[0], path = row.source_review.path, controls = [];
assert.equal(authoredUseReviewEvidence({symbol_uses: [row]}, ledger.line, read, hash).reviewed, 1);
for (const id of ['wrong-line', 'missing-caller', 'stale-source', 'changed-runtime-evidence']) {
  const body = JSON.parse(read(path)), review = body.reviews[0];
  if (id === 'wrong-line') body.line = ledger.line === 'main' ? '21.x' : 'main';
  if (id === 'missing-caller') body.reviews = [];
  if (id === 'stale-source') review.candidate_source_sha256 = '0'.repeat(64);
  if (id === 'changed-runtime-evidence') review.independent_evidence[1].sha256 = '0'.repeat(64);
  const bytes = Buffer.from(JSON.stringify(body)), candidate = {...row, source_review: {path, sha256: hash(bytes)}};
  assert.equal(authoredUseReviewEvidence({symbol_uses: [candidate]}, ledger.line, p => p === path ? bytes : read(p), hash).insufficient, 1, id);
  controls.push({id, rejected: true});
}
const report = {schema_version: 1, line: ledger.line, source_roles: 1, negative_controls: controls,
  scope: 'One real per-caller source-review admission and four real admission faults; no full native/floor/G11 claim.'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: ledger.line, source_roles: 1, negatives: controls.length}));
