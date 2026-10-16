/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Read-only source/admission controls; no packed or release execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectSelectionComparatorJudgments} from '../scripts/selection-comparator-source-judgments.mjs';
import {selectionComparatorSourceContext, reverseSelectionComparatorSource, readSelectionComparatorBefore, selectionRequirementsBefore} from '../scripts/selection-comparator-packed-source-context.mjs';
import {artifactBehaviorRequirements} from '../scripts/upstream-artifact-behavior-evidence.mjs';
import {generatedIdentityRequirements} from '../scripts/upstream-generated-identity-evidence.mjs';
import {bidiBehaviorRequirements} from '../scripts/upstream-bidi-evidence.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(resolve(root, path));
const hash = value => createHash('sha256').update(value).digest('hex');
const {data, prior} = selectionComparatorSourceContext(read), result = inspectSelectionComparatorJudgments({root});
assert.equal(result.entries.length, 17); assert.equal(result.writes.size, 22); assert.equal(result.proof.unchanged_product_members, 1141);
assert.equal(result.proof.earlier_context_receipts_requalified.length, 6); assert.equal(result.proof.new_authored_use_closures, 0);
assert.equal(result.frozenEvidence.insufficient, 0); assert.equal(result.currentAdmission.review_evidence.insufficient, 0);
const old = new Map(prior.members.map(row => [row.path, row])); let sourceNegatives = 0, metadataNegatives = 0, inspectorNegatives = 0;
for (const change of data.source_changes) {
  const current = read(change.path).toString(), before = old.get(change.path);
  assert.equal(reverseSelectionComparatorSource(change.path, current, {readMember: read}), before.text);
  assert.equal(reverseSelectionComparatorSource(change.path, before.text, {readMember: read}), before.text);
  assert.throws(() => reverseSelectionComparatorSource(change.path, current + '\n// unreviewed source\n', {readMember: read})); sourceNegatives++;
}
for (const path of ['compatibility/rc/selection-comparator-packed-inputs.json', data.prior.path, data.supplement.path]) {
  assert.throws(() => selectionComparatorSourceContext(name => name === path ? Buffer.concat([read(name), Buffer.from(' ')]) : read(name))); sourceNegatives++;
}
for (const row of data.before_requirements) {
  const line = row.line === 'any' ? data.line : row.line;
  const current = artifactBehaviorRequirements(row.sha) || generatedIdentityRequirements(row.sha) || bidiBehaviorRequirements(row.sha, line); assert.ok(current);
  assert.deepEqual(selectionRequirementsBefore(row.sha, current, line, {readMember: read}), row.definition);
  for (const change of [value => {value.members.pop();}, value => {value.kind = 'unreviewed-runtime-policy';}]) {
    const bad = structuredClone(current); change(bad); assert.throws(() => selectionRequirementsBefore(row.sha, bad, line, {readMember: read})); metadataNegatives++;
  }
}
const unrelated = Buffer.from('unrelated'); assert.equal(readSelectionComparatorBefore('unrelated', () => unrelated), unrelated);
const targets = [
  'projects/ngx-material-legacy/legacy-list/selection-list.ts', data.original.path,
  'scripts/selection-comparator-packed-fixture.mjs', 'scripts/selection-comparator-packed-contract.mjs',
  'compatibility/rc/selection-comparator-packed-tagged-protocol.json', 'compatibility/rc/selection-comparator-packed-admission-controls.json',
  'tests/bidi_isolated_requalification_probe.mjs', prior.entries[0].evidence_report,
];
for (const path of targets) {
  let corrupted = Buffer.concat([read(path), Buffer.from(' ')]);
  if (path.endsWith('tagged-protocol.json') || path.endsWith('admission-controls.json')) {
    const report = JSON.parse(read(path));
    report[path.endsWith('tagged-protocol.json') ? 'fixture_sha256' : 'helper_sha256'] = '0'.repeat(64);
    corrupted = Buffer.from(JSON.stringify(report));
  }
  assert.throws(() => inspectSelectionComparatorJudgments({root, readMember: name => name === path ? corrupted : read(name)}), path); inspectorNegatives++;
}
for (const path of ['compatibility/f10/disposition-ledger/ledger.json', 'compatibility/f10/authored-dependency-dispositions.json']) {
  const content = JSON.parse(read(path));
  if (content.entries) content.entries.find(row => row.sha === data.target_sha).reason = 'unreviewed live decision';
  else content.symbol_uses.find(row => row.source_review?.path.includes('requalified-boundaries')).disposition = 'unreviewed';
  const corrupted = Buffer.from(JSON.stringify(content));
  assert.throws(() => inspectSelectionComparatorJudgments({root, readMember: name => name === path ? corrupted : read(name)}), path); inspectorNegatives++;
}
const report = {schema_version: 1, line: data.line, complete_preceding_source_programs_recovered: 20, source_corruptions_rejected: sourceNegatives,
  complete_prior_definitions_recovered: 13, metadata_corruptions_rejected: metadataNegatives, actual_source_inspector_corruptions_rejected: inspectorNegatives,
  individual_source_decisions: 1, existing_runtime_contexts_requalified: 16, existing_roles_requalified: 167, new_authored_use_closures: 0,
  frozen_reviewed: result.frozenEvidence.reviewed, delta_reviewed: result.currentAdmission.review_evidence.reviewed,
  actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed',
  producer_sha256: hash(read('tests/selection_comparator_source_judgments_probe.mjs')), inspector_sha256: hash(read('scripts/selection-comparator-source-judgments.mjs'))};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
