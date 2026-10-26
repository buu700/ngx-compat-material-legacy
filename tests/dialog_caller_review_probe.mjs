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
import {join} from 'node:path';
import {inspectDialogCallerReview} from '../scripts/dialog-caller-review.mjs';
const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgers = ['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json', 'compatibility/f10/disposition-ledger/ledger.json'];
const before = ledgers.map(path => hash(read(path))), q = inspectDialogCallerReview({root});
assert.equal(q.review.reviews.length, 18); assert.equal(q.rows.length, 18);
assert.deepEqual(q.review.reviews.reduce((counts, row) => ({...counts,
  [row.conclusion]: (counts[row.conclusion] ?? 0) + 1}), {}),
{'stable-public-peer': 16, 'owned-replacement': 1, 'removed-use': 1});
for (const row of q.review.reviews) {
  assert.equal(row.candidate_source_sha256, hash(read('projects/ngx-material-legacy/' + row.file)));
  assert.equal(row.actual_native_packed_AOT_or_full_floor_qualified, false);
  assert.ok(row.current_source_role);
  assert.ok(row.decision.length >= 80);
  for (const evidence of row.independent_evidence) assert.equal(hash(read(evidence.path)), evidence.sha256);
}
assert.equal(q.peerFields.length, 3);
for (const sdk of q.peerFields) assert.deepEqual(sdk.fields.map(field => field.name), ['overlayRef', 'containerInstance', 'disableClose']);
const controls = [q.boundary.ref.path, q.boundary.defaults.configuration.types.ref.path,
  q.boundary.sdkDeclarations[0].path, ...q.boundary.targets.map(member => member.path),
  'projects/ngx-material-legacy/legacy-dialog/public-api.ts',
  'projects/ngx-material-legacy/legacy-dialog/internal/dialog-initial-focus.ts'];
for (const changed of controls) assert.throws(() => inspectDialogCallerReview({root, read: path =>
  path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path)}), error => error?.code === 'ERR_ASSERTION');
let changed;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
inspectDialogCallerReview({root, read: late});
for (changed of [q.boundary.targets[0].path, q.boundary.ref.path])
  assert.throws(() => inspectDialogCallerReview({root, read: late}), error => error?.code === 'ERR_ASSERTION');
assert.deepEqual(ledgers.map(path => hash(read(path))), before);
const report = {schema_version: 1, line: q.line, prepared_individual_reviews: 18,
  stable_public_peer: 16, owned_replacement: 1, retained_removed_use: 1,
  current_source_files: 49, SDKs_with_public_peer_identity_and_close_fields: 3,
  corruptions_rejected: controls.length, late_changes_rejected: 2, canonical_ledgers_unchanged: true,
  canonical_writes_performed: 0, actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
