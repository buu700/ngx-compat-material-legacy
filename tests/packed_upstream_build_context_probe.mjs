/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** A fresh context must satisfy the original complete build and suite checks. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildScopeEvidenceOk} from '../scripts/upstream-build-scope-evidence.mjs';
import {testConsolidationBatchOk, testConsolidationEntryOk}
  from '../scripts/upstream-test-consolidation-evidence.mjs';
import {qualifyPackedUpstreamConsolidationInspector, packedUpstreamFocusMetadataEpoch}
  from '../scripts/packed-upstream-source-requalification.mjs';
import {snackDomSourceContext} from '../scripts/snack-dom-source-context.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const buildPath = 'compatibility/rc/packed-upstream-source-build.json';
const reviewPath = 'compatibility/rc/packed-upstream-source-test-consolidation.json';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const oldBuildPath = 'compatibility/rc/snack-dom-source-context-build.json';
const oldReviewPath = 'compatibility/rc/snack-dom-source-context-test-consolidation.json';
const inspectorPath = 'scripts/upstream-test-consolidation-evidence.mjs';
const oldBuild = JSON.parse(read(oldBuildPath)), oldReview = JSON.parse(read(oldReviewPath));
const product = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--',
  'projects/ngx-material-legacy'], {cwd: root, encoding: 'utf8'}).trim().split('\n').sort();
assert.equal(product.length, 1142);
const build = structuredClone(oldBuild);
build.candidate_context.source_commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
build.candidate_context.source_tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], {cwd: root, encoding: 'utf8'}).trim();
build.candidate_context.product_members = product.map(path => ({path, sha256: hash(read(path)), bytes: read(path).length}));
build.candidate_context.files = build.candidate_context.files.map(member => ({...member,
  sha256: hash(read(member.path)), bytes: read(member.path).length}));
const review = structuredClone(oldReview);
const line = build.line, cases = [], rejected = [];

function proposal(buildBody = build, reviewBody = review, overrides = new Map(), contextPath = buildPath) {
  const buildBytes = bytes(buildBody), context = structuredClone(reviewBody);
  context.candidate_context = {path: contextPath, sha256: hash(buildBytes)};
  const contextBytes = bytes(context), ledger = JSON.parse(read(ledgerPath));
  for (const entry of ledger.entries) {
    if (entry.evidence_report === oldBuildPath || entry.evidence_report === buildPath) {
      entry.evidence_report = contextPath; entry.source_check.evidence_report_sha256 = hash(buildBytes);
    }
    if (entry.evidence_report === oldReviewPath || entry.evidence_report === reviewPath) {
      entry.evidence_report = reviewPath; entry.source_check.evidence_report_sha256 = hash(contextBytes);
    }
  }
  const writes = new Map([[contextPath, buildBytes], [reviewPath, contextBytes], [ledgerPath, bytes(ledger)]]);
  for (const [path, value] of overrides) writes.set(path, value);
  return {context, ledger, read: path => writes.get(path) ?? read(path)};
}
const proposed = proposal();
const buildEntries = proposed.ledger.entries.filter(entry => entry.evidence_report === buildPath);
assert.equal(buildEntries.length, 14);
for (const entry of buildEntries) assert.equal(buildScopeEvidenceOk(build, entry, proposed.read, product), true);
assert.deepEqual(build.reviews, oldBuild.reviews); assert.deepEqual(review.reviews, oldReview.reviews);
cases.push('fourteen-current-build-entries-retain-all-original-reviews');
assert.equal(testConsolidationBatchOk(proposed.context, proposed.read, product), true);
const rows = proposed.ledger.entries.filter(entry => entry.evidence_report === reviewPath);
assert.equal(rows.length, 32);
for (const entry of rows) assert.equal(testConsolidationEntryOk(proposed.context, entry, proposed.read, true), true);
cases.push('thirty-two-current-consolidation-entries-use-full-original-build-and-suite-predicates');
const inspector = qualifyPackedUpstreamConsolidationInspector({root, read});
const epoch = packedUpstreamFocusMetadataEpoch({root, read});
assert.equal(hash(epoch.read(inspectorPath)), hash(inspector.before));
assert.equal(hash(epoch.raw(inspectorPath)), inspector.ref.sha256);
assert.equal(epoch.inspectors.length, 2);
const historical = snackDomSourceContext({root, read});
assert.equal(historical.members, 20); assert.equal(historical.packed_repair_epoch_members, 16);
assert.equal(historical.current_successors, 25);
cases.push('exact-one-edit-inspector-successor-keeps-old-CVA-and-source-context-evidence-separate');

function rejects(id, candidate) {
  assert.equal(testConsolidationBatchOk(candidate.context, candidate.read, product), false, id);
  rejected.push(id);
}
rejects('arbitrary-new-context-path', proposal(build, review, new Map(), 'compatibility/rc/unreviewed-build.json'));
const omitted = structuredClone(build); omitted.candidate_context.product_members.pop();
rejects('missing-product-member-with-consistent-report-hashes', proposal(omitted));
const wrongLine = structuredClone(build); wrongLine.candidate_context.line = line === 'main' ? '21.x' : 'main';
rejects('wrong-line-build-context', proposal(wrongLine));
const changedReview = structuredClone(build); changedReview.reviews[0].final_disposition = 'inherited';
rejects('changed-original-build-decision', proposal(changedReview));
rejects('old-inspector-product-view', proposal(build, review, new Map([[inspectorPath, inspector.before]])));
const weakened = read(inspectorPath).toString().replace(
  "assert.ok(buildScopeEvidenceOk(context,contextEntry,readRepo,currentProductPaths),'current complete product/build context invalid');",
  "assert.ok(true,'current complete product/build context invalid');");
assert.notEqual(weakened, read(inspectorPath).toString());
rejects('skip-full-build-predicate-inspector', proposal(build, review, new Map([[inspectorPath, Buffer.from(weakened)]])));
const inventoryPath = 'testing/legacy-runner/historical-inventory.json';
const inventory = JSON.parse(read(inventoryPath)); inventory.denominator = 56;
const inventoryBytes = bytes(inventory), inventoryReview = structuredClone(review);
inventoryReview.historical_suite_context.find(ref => ref.path === inventoryPath).sha256 = hash(inventoryBytes);
rejects('changed-historical-denominator-with-consistent-context-hash',
  proposal(build, inventoryReview, new Map([[inventoryPath, inventoryBytes]])));
const missingSuite = structuredClone(review); missingSuite.historical_suite_context.pop();
rejects('missing-historical-suite-member', proposal(build, missingSuite));
let late = false;
const lateEpoch = packedUpstreamFocusMetadataEpoch({root,
  read: path => late && path === inspectorPath ? inspector.before : read(path)});
late = true; assert.throws(() => lateEpoch.read(inspectorPath));
rejected.push('late-consolidation-inspector-reversion');
late = false;
const mutatedReference = packedUpstreamFocusMetadataEpoch({root,
  read: path => late && path === inspectorPath ? inspector.before : read(path)});
mutatedReference.inspectors.find(ref => ref.path === inspectorPath).sha256 = hash(inspector.before);
late = true; assert.throws(() => mutatedReference.read(inspectorPath));
rejected.push('returned-inspector-reference-cannot-bypass-current-code-check');

console.log(JSON.stringify({line, result: 'pass', cases, rejected, current_build_entries: 14,
  current_consolidation_entries: 32, source_context_members: 20, packed_epoch_members: 16,
  original_reviews_preserved: true, canonical_ledger_applied: false,
  inspector_sha256: inspector.ref.sha256, producer_sha256: hash(read('tests/packed_upstream_build_context_probe.mjs')),
  current_native_packed_or_floor_or_g11_credit: false}));
