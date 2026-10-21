/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Admission cannot replace actual after sources with historical comparison inputs. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {inspectDialogConfigBoundary, dialogConfigOverlayBridge} from '../scripts/dialog-caller-config-boundary.mjs';
import {dialogConfigSourceRebinding} from '../scripts/dialog-caller-config-source-rebinding.mjs';
const root = process.cwd(), raw = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const proposal = JSON.parse(raw('compatibility/rc/dialog-caller-config-candidate.json'));
const before = new Map(proposal.members.map(member => [member.path, Buffer.from(member.before.text)]));
const after = new Map(proposal.members.map(member => [member.path, Buffer.from(member.after.text)]));
const beforeRead = path => before.has(path) ? Buffer.from(before.get(path)) : raw(path);
const afterRead = path => after.has(path) ? Buffer.from(after.get(path)) : raw(path);
const rejected = (action, message) => assert.throws(action, error => error?.code === 'ERR_ASSERTION', message);
const originalLedgers = new Map(['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json',
  'compatibility/f10/disposition-ledger/ledger.json'].map(path => [path, hash(raw(path))]));
assert.equal(inspectDialogConfigBoundary({root, read: beforeRead}).raw_product_applied, false);
rejected(() => inspectDialogConfigBoundary({root, read: beforeRead, requireApplied: true}), 'before source admitted');
rejected(() => dialogConfigSourceRebinding({root, read: beforeRead}), 'before source review admitted');
const boundary = inspectDialogConfigBoundary({root, read: afterRead, requireApplied: true});
assert.equal(boundary.raw_product_applied, true);
assert.equal(boundary.preimages.size, 3);
assert.equal(boundary.proposed_sources.size, 49);
for (const path of before.keys()) rejected(() => inspectDialogConfigBoundary({root,
  read: member => member === path ? before.get(path) : afterRead(member), requireApplied: true}), 'partial application ' + path);
let corruptions = 0;
for (const path of boundary.proposed_sources.keys()) {
  rejected(() => inspectDialogConfigBoundary({root, requireApplied: true,
    read: member => member === path ? Buffer.concat([afterRead(member), Buffer.from('\n')]) : afterRead(member)}), path);
  corruptions++;
}
const bridge = dialogConfigOverlayBridge({root, read: afterRead});
assert.equal(bridge.current_overlay_source_files, 145);
assert.ok(bridge.all_affected_sources_in_fresh_semantic_program);
assert.equal(bridge.current_dialog_semantic_source_files, 51);
const expanded = JSON.parse(raw(bridge.additional_semantic_qualification.path));
for (const path of [bridge.additional_semantic_qualification.path, ...expanded.additional_sources,
  'tests/dialog_caller_config_overlay_type_probe.mjs']) {
  rejected(() => dialogConfigOverlayBridge({root,
    read: member => member === path ? Buffer.concat([afterRead(member), Buffer.from('\n')]) : afterRead(member)}), path);
  corruptions++;
}
const rebound = dialogConfigSourceRebinding({root, read: afterRead});
assert.equal(rebound.rows.length, 32);
assert.equal(rebound.review.new_semantic_closures, 0);
assert.equal(rebound.review.reviews.length, 32);
for (const review of rebound.review.reviews) {
  assert.equal(review.conclusion, review.prior_source_context.case.conclusion);
  assert.ok(review.current_source_role.complete_caller_members.length);
}
assert.equal(rebound.review.reviews.filter(review => review.symbol === 'Inject')[0]
  .current_source_role.constructor_parameter_annotations.length, 2);
for (const member of rebound.prior.prior_review_members) {
  rejected(() => dialogConfigSourceRebinding({root,
    read: path => path === member.path ? Buffer.concat([afterRead(path), Buffer.from('\n')]) : afterRead(path)}));
  corruptions++;
}
for (const path of ['compatibility/rc/dialog-caller-config-source-impact.json', boundary.qualification.path,
  boundary.types.ref.path, 'compatibility/rc/dialog-caller-config-candidate.json']) {
  rejected(() => dialogConfigSourceRebinding({root,
    read: member => member === path ? Buffer.concat([afterRead(member), Buffer.from('\n')]) : afterRead(member)}));
  corruptions++;
}
const affected = new Set(bridge.affected_current_sources);
const unaffected = JSON.parse(raw(bridge.prior_overlay_bridge.prior_capture.path)).sources
  .find(member => !affected.has(member.path) && !boundary.proposed_sources.has(member.path));
assert.ok(unaffected);
rejected(() => dialogConfigOverlayBridge({root,
  read: path => path === unaffected.path ? Buffer.concat([afterRead(path), Buffer.from('\n')]) : afterRead(path)}));
corruptions++;
let changed = null;
const lateRead = path => path === changed ? Buffer.concat([afterRead(path), Buffer.from('\n')]) : afterRead(path);
inspectDialogConfigBoundary({root, read: lateRead, requireApplied: true});
for (changed of [proposal.members[1].path, boundary.qualification.path])
  rejected(() => inspectDialogConfigBoundary({root, read: lateRead, requireApplied: true}));
for (const [path, digest] of originalLedgers) assert.equal(hash(raw(path)), digest, 'canonical ledger mutated');
const report = {schema_version: 1, line: boundary.line, modeled_after_source_files: 49,
  expanded_semantic_source_files: 51, overlay_source_files: 145, affected_overlay_sources_covered: affected.size,
  source_rebindings_prepared: 32, complete_prior_cases_preserved: 32, explicit_current_Inject_annotations: 2,
  partial_applications_rejected: 3, before_source_admission_rejected: 2,
  corruptions_rejected: corruptions, late_changes_rejected: 2, canonical_ledgers_unchanged: 3,
  current_product_applied: inspectDialogConfigBoundary({root}).raw_product_applied,
  model_only_after_admission_in_this_probe: true, source_closures: 0,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
