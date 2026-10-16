/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real original validators and current-caller/metadata rejection checks for the chip delta. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {STABILITY_CONTEXT_INPUTS, inspectStabilityContextRequalification,
  reviewChipContextInventory} from '../scripts/spec-stability-context-requalification.mjs';
import {SPEC_CONTEXT_SCOPE_PATHS, assertSpecContextMetadataState,
  validateSpecContextScopes} from '../scripts/spec-small-context-requalification.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {scanCurrentAuthoredUses, currentAuthoredUseAdmission} from '../scripts/authored-current-use-inventory.mjs';
import {CHIP_SOURCE, CHIP_SPEC} from '../scripts/spec-stability-chip-repair.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const result = inspectStabilityContextRequalification({root}), cases = [];
assert.equal(result.writes.size, 44); assert.equal(result.updates.size, 116); assert.equal(result.previous.size, 42);
assert.equal(result.frozenEvidence.reviewed, 1446); assert.equal(result.frozenEvidence.insufficient, 0);
assert.equal(result.currentAdmission.source_snapshot_valid, true);
assert.equal(result.currentAdmission.review_evidence.reviewed, 178);
assert.equal(result.currentAdmission.review_evidence.insufficient, 0);
const proposed = path => result.writes.get(path) || read(path);
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const inventoryPath = 'testing/legacy-runner/historical-inventory.json';
const frozenPath = 'compatibility/f10/authored-dependency-dispositions.json';
const currentPath = 'compatibility/f10/authored-dependency-current-dispositions.json';
for (const path of [CHIP_SOURCE, CHIP_SPEC, inventoryPath]) assert.equal(result.writes.has(path), false);
let metadataControls = 0;
for (const state of ['before', 'proposed']) {
  const map = new Map([...new Set([...result.previous.keys(), ...result.writes.keys()])].map(path =>
    [path, state === 'before' ? result.previous.get(path) || result.writes.get(path) :
      result.writes.get(path) || result.previous.get(path)]));
  const activeRead = path => map.get(path) || read(path);
  const has = path => state === 'before' ? result.previous.has(path) : map.has(path);
  assertSpecContextMetadataState({previous: result.previous, writes: result.writes, read: activeRead, has});
  for (const [path, bytes] of map) {
    if (!has(path)) continue;
    const changed = Buffer.concat([bytes, Buffer.from(' ')]);
    assert.throws(() => assertSpecContextMetadataState({previous: result.previous, writes: result.writes,
      read: name => name === path ? changed : activeRead(name), has}), /metadata changed/);
    cases.push({id: state + '-metadata-' + path, result: 'rejected'}); metadataControls++;
  }
}
assert.equal(metadataControls, 119);
const inventoryOptions = {beforeSha: result.inputs.reviewed_delta[1].before_sha256,
  currentSha: result.inputs.reviewed_delta[1].current_sha256,
  parent: result.inputs.before_frame.commit, sourceProof: result.sourceProofRef};
const inventory = JSON.parse(result.currentInventory);
assert.equal(reviewChipContextInventory(result.beforeInventory, result.currentInventory,
  inventoryOptions).candidate_source_bindings_changed, 1);
const chipRow = value => value.rows.find(row => row.candidate === CHIP_SPEC);
const inventoryMutations = [
  value => { chipRow(value).candidate_sha256 = '0'.repeat(64); },
  value => { chipRow(value).historical_sha256 = '0'.repeat(64); },
  value => { chipRow(value).execution.bound_to_current_head = true; },
  value => { chipRow(value).execution.state = 'passed'; },
  value => { value.candidate_snapshot.member_refreshes.pop(); },
  value => { value.candidate_snapshot.member_refreshes.at(-1).source_proof.sha256 = '0'.repeat(64); },
  value => { value.counts.adapted--; },
  value => { value.rows.find(row => row.candidate !== CHIP_SPEC).family = 'foreign'; },
];
for (const [index, mutate] of inventoryMutations.entries()) {
  const changed = structuredClone(inventory); mutate(changed);
  assert.throws(() => reviewChipContextInventory(result.beforeInventory, json(changed), inventoryOptions));
  cases.push({id: 'inventory-delta-' + index, result: 'rejected'});
}
const entries = [...result.updates.values()].filter(n => SPEC_CONTEXT_SCOPE_PATHS.includes(n.evidence_report));
const documents = SPEC_CONTEXT_SCOPE_PATHS.map(path => JSON.parse(result.writes.get(path)));
const semanticMutations = [
  value => { value.candidate_context.product_members.pop(); },
  value => { value.historical_suite_context.pop(); },
  value => { value.source_scope.retained_contexts[0].candidate_member_sha256 = '0'.repeat(64); },
  value => { value.source_scope.retained_architecture.product_source_population_sha256 = '0'.repeat(64); },
  value => { value.candidate_context.library_builder = 'unreviewed builder'; },
  value => { value.ownership_context.historical_selection = 56; },
];
for (const [index, mutate] of semanticMutations.entries()) {
  const changed = structuredClone(documents); mutate(changed[index]);
  const path = SPEC_CONTEXT_SCOPE_PATHS[index], bytes = json(changed[index]), rehashed = structuredClone(entries);
  for (const entry of rehashed) if (entry.evidence_report === path && entry.source_check) {
    entry.source_check.evidence_report_sha256 = hash(bytes);
  }
  assert.throws(() => validateSpecContextScopes({documents: changed, entries: rehashed,
    read: name => name === path ? bytes : proposed(name), productPaths: result.productPaths, line: result.line}));
  cases.push({id: 'rehashed-original-scope-semantics-' + index, result: 'rejected'});
}
for (const [path, mutate, pattern] of [
  [STABILITY_CONTEXT_INPUTS, bytes => Buffer.concat([bytes, Buffer.from(' ')]), /stability context input changed/],
  ['projects/ngx-material-legacy/legacy-select/select.scss', bytes => Buffer.concat([bytes, Buffer.from('\n/* changed */')]), /unreviewed current context source/],
  [inventoryPath, bytes => Buffer.concat([bytes, Buffer.from(' ')]), /unreviewed current context source/],
  [CHIP_SOURCE, bytes => Buffer.from(bytes.toString().replace('this.chips.length === 0', 'this.chips.length === 1')), /unreviewed current context source/],
  [ledgerPath, bytes => { const value = JSON.parse(bytes); value.entries.find(n => !result.updates.has(n.sha)).reason += ' unreviewed'; return json(value); }, /live context metadata changed/],
]) {
  const changed = mutate(read(path)); assert.notDeepEqual(changed, read(path));
  assert.throws(() => inspectStabilityContextRequalification({root,
    readMember: name => name === path ? changed : read(name)}), pattern);
  cases.push({id: 'actual-current-caller-' + path, result: 'rejected'});
}
const reviewPath = result.inputs.new_authored_review_path, packet = JSON.parse(proposed(reviewPath));
const selected = result.frozenAfter.symbol_uses.filter(n => n.source_review?.path === reviewPath);
assert.equal(selected.length, 27); assert.equal(packet.reviews.length, 27);
for (const row of selected) {
  const changed = structuredClone(packet), candidate = structuredClone(row);
  changed.reviews.find(n => n.file === row.file && n.module === row.module && n.symbol === row.symbol)
    .candidate_source_sha256 = '0'.repeat(64);
  const bytes = json(changed); candidate.source_review.sha256 = hash(bytes);
  const actual = authoredUseReviewEvidence({symbol_uses: [candidate]}, result.line,
    path => path === reviewPath ? bytes : proposed(path), hash);
  assert.equal(actual.reviewed, 0); assert.equal(actual.insufficient, 1);
  cases.push({id: 'rehashed-chip-import-source-' + row.module + '#' + row.symbol, result: 'rejected'});
}
const focusUse = selected.find(n => n.symbol === 'FocusKeyManager'); assert.ok(focusUse);
for (const [index, mutate] of [
  value => { value.conclusion = 'private-upstream'; },
  value => { value.independent_evidence = []; },
  value => { value.independent_evidence[0].sha256 = '0'.repeat(64); },
].entries()) {
  const changed = structuredClone(packet), candidate = structuredClone(focusUse);
  mutate(changed.reviews.find(n => n.symbol === 'FocusKeyManager'));
  const bytes = json(changed); candidate.source_review.sha256 = hash(bytes);
  const actual = authoredUseReviewEvidence({symbol_uses: [candidate]}, result.line,
    path => path === reviewPath ? bytes : proposed(path), hash);
  assert.equal(actual.reviewed, 0); assert.equal(actual.insufficient, 1);
  cases.push({id: 'rehashed-public-contract-receipt-' + index, result: 'rejected'});
}
const active = scanCurrentAuthoredUses({root});
const seed = JSON.parse(read('compatibility/f10/authored-dependency-inventory-seed.json')).symbol_uses;
for (const [index, mutate] of [
  value => { value.current_source_population_sha256 = '0'.repeat(64); },
  value => { value.current_source_files--; },
  value => { value.symbol_uses[0].candidate_source_sha256 = '0'.repeat(64); },
  value => { value.symbol_uses[0].occurrences[0].line++; },
].entries()) {
  const changed = structuredClone(result.currentAfter); mutate(changed);
  assert.equal(currentAuthoredUseAdmission({current: active, frozen: seed, candidate: changed,
    line: result.line, readMember: proposed}).source_snapshot_valid, false);
  cases.push({id: 'authored-source-snapshot-' + index, result: 'rejected'});
}
for (const [index, mutate] of [
  value => { value.prequalified_wrapper_receipt_transitions[0].affected_shas.push('0'.repeat(40)); },
  value => { value.prequalified_wrapper_receipt_transitions[0].edits[0].after += ' changed'; },
].entries()) {
  const changed = structuredClone(result.inputs); mutate(changed);
  assert.throws(() => inspectStabilityContextRequalification({root,
    readMember: path => path === STABILITY_CONTEXT_INPUTS ? json(changed) : read(path)}), /stability context input changed/);
  cases.push({id: 'foreign-wrapper-transition-' + index, result: 'rejected'});
}
let changedNativeSets = 0;
for (const registered of result.inputs.runtime_requirements) {
  const before = result.beforeLedger.entries.find(n => n.sha === registered.sha), after = result.updates.get(registered.sha);
  const oldScope = before.individual_proof[registered.field], next = after.individual_proof[registered.field];
  assert.deepEqual({...next, source_members: []}, {...oldScope, source_members: []});
  let changed = false;
  for (const [index, member] of next.source_members.entries()) {
    assert.equal(member.path, oldScope.source_members[index].path); assert.equal(member.sha256, hash(proposed(member.path)));
    if (member.sha256 !== oldScope.source_members[index].sha256) {
      changed = true; assert.ok(result.inputs.reviewed_delta.some(n => n.path === member.path) || result.writes.has(member.path));
    }
  }
  if (changed) changedNativeSets++;
  const oldReview = JSON.parse(result.previous.get(before.evidence_report));
  const review = JSON.parse(result.writes.get(after.evidence_report)), restored = structuredClone(review);
  for (const field of ['individual_proof', 'reviewed_source_members', 'independent_evidence']) {
    if (Object.hasOwn(oldReview, field)) restored[field] = oldReview[field]; else delete restored[field];
  }
  delete restored.chip_empty_context_requalification; assert.deepEqual(restored, oldReview);
  assert.deepEqual({...after, individual_proof: before.individual_proof, evidence_report: before.evidence_report}, before);
}
assert.ok(changedNativeSets >= 9);
for (const sha of result.inputs.generic_source_shas) {
  const before = result.beforeLedger.entries.find(n => n.sha === sha), after = result.updates.get(sha);
  const oldReview = JSON.parse(result.previous.get(before.evidence_report));
  const review = JSON.parse(result.writes.get(after.evidence_report)), restored = structuredClone(review);
  restored.individual_proof = oldReview.individual_proof;
  restored.independent_source_evidence = oldReview.independent_source_evidence;
  delete restored.chip_empty_context_requalification; assert.deepEqual(restored, oldReview);
  assert.deepEqual({...after, individual_proof: before.individual_proof, evidence_report: before.evidence_report}, before);
  for (const ref of after.individual_proof.source_evidence) assert.equal(ref.sha256, hash(proposed(ref.path)));
}
for (const row of selected) {
  const before = result.frozenBefore.symbol_uses.find(n => n.file === row.file && n.module === row.module && n.symbol === row.symbol);
  const oldPacket = JSON.parse(result.oldRead(before.source_review.path));
  const old = oldPacket.reviews.find(n => n.file === row.file && n.module === row.module && n.symbol === row.symbol);
  const next = packet.reviews.find(n => n.file === row.file && n.module === row.module && n.symbol === row.symbol);
  assert.ok(next.decision.startsWith(old.decision + '\n\nChip empty-query context:'));
  const restored = {...next, candidate_source_sha256: old.candidate_source_sha256,
    decision: old.decision, independent_evidence: old.independent_evidence};
  delete restored.chip_empty_context_requalification; assert.deepEqual(restored, old);
}
for (const ref of result.inputs.prior_authored_review_packets) assert.equal(hash(read(ref.path)), ref.sha256);
assert.deepEqual(result.currentAfter.symbol_uses, result.currentBefore.symbol_uses);
assert.deepEqual(result.frozenAfter.symbol_uses.map(n => [n.file, n.module, n.symbol, n.status, n.disposition]),
  result.frozenBefore.symbol_uses.map(n => [n.file, n.module, n.symbol, n.status, n.disposition]));
assert.deepEqual(JSON.parse(result.writes.get(ledgerPath)).entries.map(n => [n.sha, n.final_disposition]),
  result.beforeLedger.entries.map(n => [n.sha, n.final_disposition]));
assert.equal(cases.length, 174);
const report = {schema_version: 1, line: result.line, source_scope_rows: 83, native_source_bindings: 20,
  changed_native_source_sets: changedNativeSets, generic_source_records: 13,
  qualified_entries: 116, proposed_writes: 44, frozen_import_receipts: 27,
  immutable_prior_authored_packets: 18, exact_prequalified_wrapper_receipts: 2,
  metadata_corruption_controls: metadataControls, controls: cases.length, cases,
  original_cases_preserved: 2222, additional_cases: 1, current_case_cells: 2228,
  untouched_other_ledger_entries: 1581, all1697_dispositions_and_all_authored_statuses_preserved: true,
  frozen_reviewed: 1446, frozen_insufficient: 0, delta_reviewed: 178, delta_insufficient: 0,
  current_uses: 1958, current_source_files: 531, current_authored_source_snapshot_valid: true,
  producer_sha256: hash(read('tests/spec_stability_context_probe.mjs')),
  helper_sha256: hash(read('scripts/spec-stability-context-requalification.mjs')),
  inputs_sha256: hash(read(STABILITY_CONTEXT_INPUTS)),
  actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
const out = process.argv.indexOf('--out');
if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, cases: undefined}));
