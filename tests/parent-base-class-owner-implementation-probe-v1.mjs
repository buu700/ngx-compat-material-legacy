/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Focused real precursor source/frame guards; no complete composed owner. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import admission from '../scripts/upstream-base-class-removal-admission.cjs';
import {baseClassRemovalCanonicalFrameSubject, baseClassRemovalOwnerSourceSubject} from '../scripts/base-class-removal-owner-source.mjs';
import {baseClassRemovalOwnerContext, BASE_CLASS_REMOVAL_LEDGER as LEDGER,
  BASE_CLASS_REMOVAL_REGISTRY as REGISTRY} from '../scripts/base-class-removal-canonical-stage.mjs';

assert.equal(process.versions.node, '24.21.0');
const root = process.cwd(), out = process.argv[2];
assert.match(out ?? '', /^compatibility\/rc\/parent-base-class-owner-implementation-[a-z0-9-]+\.json$/);
assert.equal(existsSync(join(root, out)), false);
const start = performance.now(), checks = [], hash = raw => createHash('sha256').update(raw).digest('hex');
const disk = path => readFileSync(join(root, path));
const STAGE = 'scripts/base-class-removal-canonical-stage.mjs';
const PACKET = 'compatibility/rc/21x-base-class-removal-admission-owner-inputs-v1.json';
const LEAF = 'scripts/base-class-removal-owner-source.mjs';
const canonicalBefore = [LEDGER, REGISTRY, 'compatibility/rc/21x-remaining-disposition-worksheet.json']
  .map(path => ({path, sha256: hash(disk(path)), bytes: disk(path).length}));
const check = (id, callback) => {callback(); checks.push(id);};
const frame = baseClassRemovalCanonicalFrameSubject({root, read: disk});
check('actual42669precursor-binds-all-compressed-and-plain-Git-derived-images', () => {
  assert.equal(frame.applied, false); assert.equal(frame.registryApplied, false); assert.equal(frame.precursor, true);
  assert.equal(frame.bound.length, 13);
  assert.ok(frame.registrySubject().raw.equals(frame.registryBefore));
  assert.ok(frame.registrySubject().comparison.equals(frame.registryBefore));
  assert.ok(frame.ledgerSubject().raw.equals(frame.stage.before));
});
check('private70to69-only-registry-data-normalization-no-public-projection', () => {
  assert.ok(frame.predecessorData(REGISTRY, frame.registryAfter).equals(frame.registryBefore));
  assert.ok(frame.predecessorData(REGISTRY, frame.registryBefore).equals(frame.registryBefore));
  assert.ok(frame.predecessorData(LEDGER, frame.stage.after).equals(frame.stage.after));
  const unknown = Buffer.from('unknown70-lookalike');
  assert.ok(frame.predecessorData(REGISTRY, unknown).equals(unknown));
  assert.equal(frame.ownsReference({path: REGISTRY, sha256: hash(unknown), bytes: unknown.length}), false);
  assert.throws(() => frame.qualifyReference({path: REGISTRY, sha256: hash(unknown), bytes: unknown.length}));
});
check('finite-registry-reference-normalization-preserves-metadata', () => {
  const ref = {path: REGISTRY, sha256: hash(frame.registryAfter), bytes: frame.registryAfter.length, purpose: 'finite metadata'};
  assert.deepEqual(frame.predecessorReference(ref), {...ref, sha256: hash(frame.registryBefore), bytes: frame.registryBefore.length});
  assert.deepEqual(frame.qualifyReference(ref), {...ref, ...frame.registrySubject().reference});
  assert.ok(frame.comparisonBytes(ref).equals(frame.registryAfter));
});
const coldPaths = [LEAF, PACKET, STAGE, frame.proposal.review.path, frame.packet.proposal.path,
  frame.proposal.ledger_before_image.path, frame.proposal.ledger_after_image.path,
  frame.proposal.registry_before_image.path, frame.proposal.registry_after_image.path, LEDGER, REGISTRY];
for (const path of coldPaths) check('cold-nonphysical-callback-rejects:' + path, () => {
  const wrong = name => name === path ? Buffer.concat([disk(name), Buffer.from('\n')]) : disk(name);
  wrong.assertCurrent = () => {}; wrong.toString = () => disk.toString();
  assert.throws(() => baseClassRemovalCanonicalFrameSubject({root, read: wrong}), /nonphysical/);
});
check('projected427ledger-on-physical426-never-gains-frame-authority', () => {
  assert.throws(() => baseClassRemovalCanonicalFrameSubject({root, read: path => path === LEDGER ? frame.stage.after : disk(path)}), /nonphysical/);
});
check('projected70registry-on-physical69-never-gains-frame-authority', () => {
  assert.throws(() => baseClassRemovalCanonicalFrameSubject({root, read: path => path === REGISTRY ? frame.registryAfter : disk(path)}), /nonphysical/);
});
check('foreign-root-rejects-before-any-fallback', () => {
  let reads = 0;
  assert.throws(() => baseClassRemovalCanonicalFrameSubject({root: root + '/wrong', read: path => {reads++; return disk(path);}}));
  assert.equal(reads, 0);
});
check('transient-supplied-byte-change-rejects-on-first-observed-read', () => {
  let changed = false;
  assert.throws(() => baseClassRemovalCanonicalFrameSubject({root, read: path => {
    if (path === PACKET && !changed) {changed = true; return Buffer.concat([disk(path), Buffer.from(' ')]);}
    return disk(path);
  }}), /nonphysical/);
  frame.assertCurrent();
});
for (const path of [PACKET, STAGE, REGISTRY, LEDGER]) check('late-callback-change-rejects-restoration-passes:' + path, () => {
  let changed = false;
  const live = baseClassRemovalCanonicalFrameSubject({root, read: name => changed && name === path ? Buffer.from('late-spoof') : disk(name)});
  changed = true; assert.throws(() => live.assertCurrent(), /nonphysical/);
  changed = false; live.assertCurrent();
});
check('final-physical-guard-detects-callback-side-effect-after-earlier-stage-read', () => {
  const before = disk(STAGE); let armed = true;
  try {
    assert.throws(() => baseClassRemovalCanonicalFrameSubject({root, read: path => {
      const raw = disk(path);
      if (path === REGISTRY && armed) {armed = false; writeFileSync(join(root, STAGE), Buffer.concat([before, Buffer.from('\n')]));}
      return raw;
    }}), /late base-class frame member/);
  } finally {writeFileSync(join(root, STAGE), before);}
  frame.assertCurrent();
});
const source = baseClassRemovalOwnerSourceSubject({root, read: disk});
check('fresh-original-handler1119-and-owner-union1129-source-bindings', () => {
  assert.equal(source.source.bound.length, 1119); assert.equal(source.bound.length, 1129);
  assert.equal(source.source.facts.historical_source_bindings_revalidated, 715);
  assert.equal(source.source.facts.pure_original_authentication_reexecuted, true);
  assert.equal(source.source.facts.pure_individual_hunk_review_reexecuted, true);
});
const originalInspector = admission.inspectSource;
check('loaded-handler-substitution-rejects-cold-and-late-without-changing-files', () => {
  try {
    admission.inspectSource = (...args) => originalInspector(...args);
    admission.inspectSource.toString = () => Function.prototype.toString.call(originalInspector);
    assert.throws(() => baseClassRemovalOwnerSourceSubject({root, read: disk}), /loaded base-class source inspector/);
    assert.throws(() => source.assertCurrent(), /loaded base-class source inspector/);
  } finally {admission.inspectSource = originalInspector;}
  source.assertCurrent();
});
const owner = baseClassRemovalOwnerContext({root, read: disk});
check('actual-fresh-owner-context-is-precursor-and-only-ledger-metadata-route-exists', () => {
  assert.equal(owner.applied, false); assert.equal(owner.registryApplied, false); assert.equal(owner.precursor, true);
  assert.ok(owner.metadataRead(LEDGER).equals(disk(LEDGER)));
  assert.ok(owner.metadataRead(REGISTRY).equals(disk(REGISTRY)));
  assert.equal(owner.source_facts.pure_original_authentication_reexecuted, true);
});
const faults = {prior: false, metadata: false, native: false}, calls = {prior: 0, metadata: 0, native: 0};
const prior = {canonical_after: Buffer.from(owner.before), bound: new Map(),
  assertCurrent: () => {calls.prior++; assert.equal(faults.prior, false, 'prior-source-fault');},
  prior_metadata_assert_current: () => {calls.metadata++; assert.equal(faults.metadata, false, 'prior-metadata-fault');},
  native_spec_source: {bound: [{path: STAGE, sha256: frame.packet.stage_before.sha256, bytes: frame.packet.stage_before.bytes},
    {path: LEDGER, sha256: hash(owner.before), bytes: owner.before.length}],
    assertCurrent: () => {calls.native++; assert.equal(faults.native, false, 'prior-native-fault');}},
};
const wrapped = owner.wrapPrepared(prior);
check('complete-prior426-wraps-pure427-proposal-and-known-native-refs-become-actual', () => {
  assert.ok(wrapped.canonical_after.equals(owner.after));
  assert.equal(wrapped.base_class_removal_stage.physically_applied, false);
  assert.equal(wrapped.base_class_removal_stage.individual_decisions, 1);
  const stageRef = wrapped.native_spec_source.bound.find(ref => ref.path === STAGE);
  assert.equal(stageRef.sha256, hash(disk(STAGE))); assert.equal(stageRef.bytes, disk(STAGE).length);
  const ledgerRef = wrapped.native_spec_source.bound.find(ref => ref.path === LEDGER);
  assert.equal(ledgerRef.sha256, hash(disk(LEDGER))); assert.equal(ledgerRef.bytes, disk(LEDGER).length);
});
for (const [key, invoke, message] of [['prior', () => wrapped.assertCurrent(), /prior-source-fault/],
  ['metadata', () => wrapped.assertCurrent(), /prior-metadata-fault/],
  ['native', () => wrapped.native_spec_source.assertCurrent(), /prior-native-fault/]]) {
  check('prior-' + key + '-guard-still-rejects-after-new-source-success', () => {
    faults[key] = true; try {assert.throws(invoke, message);} finally {faults[key] = false;}
    wrapped.assertCurrent();
  });
}
for (const key of ['assertCurrent', 'prior_metadata_assert_current']) check('changed-prior-guard-function-rejects:' + key, () => {
  const before = prior[key]; prior[key] = () => {};
  try {assert.throws(() => wrapped.assertCurrent(), /changed prior/);} finally {prior[key] = before;}
  wrapped.assertCurrent();
});
check('replaced-native-subject-rejects-even-when-old-function-remains-valid', () => {
  const before = prior.native_spec_source; prior.native_spec_source = {...before};
  try {assert.throws(() => wrapped.assertCurrent(), /changed prior base-class native subject/);} finally {prior.native_spec_source = before;}
});
check('missing-prior-guard-and-unrelated-prior-ledger-reject', () => {
  assert.throws(() => owner.wrapPrepared({...prior, assertCurrent: undefined}));
  assert.throws(() => owner.wrapPrepared({...prior, prior_metadata_assert_current: undefined}));
  assert.throws(() => owner.wrapPrepared({...prior, canonical_after: Buffer.from('not-complete426')}));
});
check('late-physical-owner-packet-mutation-rejects-and-restoration-passes', () => {
  const before = disk(PACKET);
  try {
    writeFileSync(join(root, PACKET), Buffer.concat([before, Buffer.from(' ')]));
    assert.throws(() => owner.assertCurrent(), /late base-class frame member/);
  } finally {writeFileSync(join(root, PACKET), before);}
  owner.assertCurrent(); wrapped.assertCurrent();
});
check('all-protected-canonical-files-remain-byte-identical', () => {
  assert.deepEqual(canonicalBefore, canonicalBefore.map(ref => ({path: ref.path, sha256: hash(disk(ref.path)), bytes: disk(ref.path).length})));
});
const report = {schema_version: 1, status: 'focused-physical-precursor-source-and-owner-controls-pass', node: process.version,
  checks_passed: checks.length, checks, seconds: (performance.now() - start) / 1000,
  fresh_handler_bound: source.source.bound.length, owner_bound: source.bound.length, frame_bound: frame.bound.length,
  native_prior_guard_calls: calls, actual_precursor42669_source_constructed: true,
  proposed42770_images_derived_and_authenticated: true, actual_physical42770_pair_executed: false,
  prior_composed_owner_substituted_only_for_wrap_guard_controls: true,
  actual_full_composed_owner_executed: false, canonical_changes_applied: false,
  immutable_v6_handler_source_inputs_changed: false, protected_canonical_refs: canonicalBefore,
  source_inputs: [LEAF, STAGE, PACKET].map(path => ({path, sha256: hash(disk(path)), bytes: disk(path).length})),
  current_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed'};
writeFileSync(join(root, out), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({status: report.status, checks: checks.length, seconds: report.seconds, source_inputs: report.source_inputs}));
