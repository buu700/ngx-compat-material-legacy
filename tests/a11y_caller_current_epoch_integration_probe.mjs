/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** A11y integration: historical component receipt and actual current epoch are separate evidence. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {a11yCallerPrior, a11yCallerSource} from '../scripts/a11y-caller-contracts.mjs';
import {inspectA11yCallerReview, A11Y_CALLER_CURRENT_REVIEW} from '../scripts/a11y-caller-reviews.mjs';
import {
  inspectComponentConfigCurrentReview,
  inspectComponentConfigHistoricalReceipt,
  COMPONENT_CONFIG_CURRENT_REVIEW,
  COMPONENT_CONFIG_REVIEW,
} from '../scripts/component-config-current-reviews.mjs';

const root = process.cwd();
const read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

const prior = a11yCallerPrior({root, read});
const source = a11yCallerSource({root, read});
const a11y = inspectA11yCallerReview({root, read});
assert.equal(prior.line, 'main');
assert.equal(source.continuation.role, 'a11y-current-source-graph-continuation');
assert.equal(source.sources.size, 116);
assert.equal(a11y.reviews.length, 16);
assert.deepEqual(a11y.reviews.map(row => [row.file, row.module, row.symbol]).sort(),
  prior.selected.map(row => [row.original_row.file, row.original_row.module, row.original_row.symbol]).sort());
assert.deepEqual(a11y.review_ref, {path: A11Y_CALLER_CURRENT_REVIEW, sha256: hash(read(A11Y_CALLER_CURRENT_REVIEW))});

// Authenticate the original 73-row component decision receipt without interpreting
// its historical candidate hashes as current-source evidence.
const historical = inspectComponentConfigHistoricalReceipt({root, read});
assert.equal(historical.line, 'main');
assert.equal(historical.status, 'reviewed');
assert.equal(historical.reviews.length, 73);
assert.equal(hash(read(COMPONENT_CONFIG_REVIEW)), '24cb5555d22af0f57332d6c1eb236c6afb30aaaf12dfe884d54009b5c5ee097e');

// Authenticate the new current-epoch source, type, public-runtime and owned-runtime
// evidence separately. Actual runtime execution remains in its maintained runtime probes.
const current = inspectComponentConfigCurrentReview({root, read});
assert.equal(current.line, 'main');
assert.equal(current.status, 'reviewed');
assert.equal(current.reviews.length, 73);
assert.equal(current.current_source_epoch, 'fdef9be37d516b922efc5301c8f16d0e456f4d48');
assert.equal(hash(read(COMPONENT_CONFIG_CURRENT_REVIEW)), hash(JSON.stringify(current, null, 2) + '\n'));
assert.deepEqual(current.reviews.map(row => [row.file, row.module, row.symbol]).sort(),
  historical.reviews.map(row => [row.file, row.module, row.symbol]).sort());

const report = {
  schema_version: 1,
  line: 'main',
  a11y_historical_source_parent: prior.source_parent,
  a11y_current_source_epoch: source.current_parent,
  a11y_historical_graph_files: 118,
  a11y_current_graph_files: source.sources.size,
  a11y_exact_roles: a11y.reviews.length,
  component_historical_receipt: {path: COMPONENT_CONFIG_REVIEW, sha256: hash(read(COMPONENT_CONFIG_REVIEW)), rows: historical.reviews.length},
  component_current_epoch_review: {path: COMPONENT_CONFIG_CURRENT_REVIEW, sha256: hash(read(COMPONENT_CONFIG_CURRENT_REVIEW)), rows: current.reviews.length, epoch: current.current_source_epoch},
  old_receipt_used_as_current_evidence: false,
  canonical_closures_integrated: 0,
  actual_native_packed_AOT_or_full_floor_qualified: false,
  g11_claim: 'not-passed',
};
assert.ok(process.argv[2], 'external report path required');
writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
