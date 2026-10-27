/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Individual source proofs; the separate root probe executes mandatory SHA controls. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {testingApi21xSourceProof} from '../scripts/upstream-testing-api-21x-admission.mjs';
import {candidateSourceEvidenceOk, candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
import {reviewMetadataComplete, individualReviewScopeOk} from '../scripts/upstream-individual-evidence-scope.mjs';
import {validateInheritedExecution} from '../scripts/upstream-inherited-execution-evidence.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reportPath = 'compatibility/rc/upstream-testing-api-21x-individual-admission.json';
const body = JSON.parse(read(reportPath)), ledger = JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const paths = () => candidateProductSourcePaths(root), cases = [], rejected = [];
let applied = 0;
const entries = body.reviews.map(review => {
  const before = ledger.entries.find(entry => entry.sha === review.sha); assert.ok(before);
  const proof = testingApi21xSourceProof(review);
  if (before.final_disposition === 'needs-individual-review') {
    assert.equal(hash(JSON.stringify(before, null, 2) + '\n'), review.prior_entry_sha256);
  } else {
    assert.equal(before.final_disposition, review.final_disposition);
    assert.equal(before.reason, review.decision); assert.deepEqual(before.individual_proof, proof); applied++;
  }
  const entry = {...before, final_disposition: review.final_disposition, reason: review.decision,
    review_depth: review.review_depth, evidence_report: reportPath, individual_proof: proof};
  assert.equal(reviewMetadataComplete({entry, proof, body, review}), true);
  assert.equal(individualReviewScopeOk({entry, proof, body, review, requiresIndividual: true,
    claimsBehavior: review.final_disposition === 'inherited'}), true);
  assert.equal(candidateSourceEvidenceOk(proof, read, paths), true);
  cases.push('individual-source-and-scope/' + review.sha); return entry;
});
const inherited = entries.find(entry => entry.final_disposition === 'inherited');
const execution = validateInheritedExecution({root, entry: inherited, proof: inherited.individual_proof, line: '21.x'});
assert.equal(execution.ok, true, execution.detail); assert.equal(execution.executed_case_ids.length, 55);
assert.equal(execution.actual_native_packed_or_floor_qualified, false);
cases.push('fresh-packed-harness-and-public-minimum-protocol-execution');
for (const entry of entries) {
  const withoutScope = structuredClone(entry.individual_proof); delete withoutScope.testing_api_21x;
  assert.equal(candidateSourceEvidenceOk(withoutScope, read, paths), false);
  rejected.push('missing-source-scope/' + entry.sha);
}
const proof = entries[0].individual_proof;
for (const [id, corrupt] of [
  ['changed-review', path => path === reportPath ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path)],
  ['changed-current-harness', path => path === 'projects/ngx-material-legacy/legacy-button/testing/button-harness.ts'
    ? Buffer.concat([read(path), Buffer.from('\n// unreviewed\n')]) : read(path)],
  ['changed-style', path => path === 'projects/ngx-material-legacy/styles/button/_button-theme.scss'
    ? Buffer.concat([read(path), Buffer.from('\n// unreviewed\n')]) : read(path)],
  ['changed-original-capsule', path => path === body.original_subjects[0].path
    ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path)],
]) {assert.equal(candidateSourceEvidenceOk(proof, corrupt, paths), false); rejected.push(id);}
const extra = () => [...paths(), 'projects/ngx-material-legacy/unreviewed-extra.ts'];
assert.equal(candidateSourceEvidenceOk(proof, read, extra), false); rejected.push('unknown-source-population');
const wrongProof = {...proof, diff_sha256: '0'.repeat(64)};
assert.equal(candidateSourceEvidenceOk(wrongProof, read, paths), false); rejected.push('wrong-patch-digest-with-scope');
assert.equal(candidateSourceEvidenceOk({...proof, affected_branches: ['main']}, read, paths), false);
rejected.push('wrong-proof-branch');
const wrongExecution = validateInheritedExecution({root, entry: inherited,
  proof: {...inherited.individual_proof, reachable_behavior: {kind: 'source-only', id: 'wrong'}}, line: '21.x'});
assert.equal(wrongExecution.ok, false); rejected.push('source-label-cannot-replace-fresh-inherited-protocol');
const rejectedBranch = validateInheritedExecution({root, entry: inherited, proof: inherited.individual_proof, line: 'main'});
assert.equal(rejectedBranch.ok, false); rejected.push('21x-execution-cannot-clear-main');
assert.ok(applied === 0 || applied === 7, 'partial canonical transition');

const summary = {line: '21.x', result: 'pass', cases, rejected, individual_reviews: 7,
  original_hunks: 76, original_file_occurrences: 38, fresh_inherited_cases: 55,
  packed_case_count: 26 + 55, root_mandatory_SHA_hook_covered_by_this_probe: false, canonical_applied: applied === 7,
  producer_sha256: hash(read('tests/upstream_testing_api_21x_admission_probe.mjs')),
  current_native_packed_or_floor_or_g11_credit: false};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({summary, entries, execution}, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(summary));
