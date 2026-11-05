/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure one-row/two-scalar proposal; no filesystem writes or owner acceptance. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import admission from './upstream-base-class-removal-admission.cjs';
export const BASE_CLASS_REMOVAL_LEDGER = 'compatibility/f10/disposition-ledger/ledger.json';
export const BASE_CLASS_REMOVAL_LEDGER_BEFORE = 'e9ef5c0bf543977809134c3367cf9a33bdda62233ab6b944dc3c4e4ac101585e';
export const BASE_CLASS_REMOVAL_REGISTRY = 'scripts/upstream-source-contract-registry.mjs';
export const BASE_CLASS_REMOVAL_REGISTRY_BEFORE = 'be50b37d181b43960361860dd7cb3bb24d0f2d1b0a2ecfaa5a85a791e4869399';
const hash = raw => createHash('sha256').update(raw).digest('hex');

export function baseClassRemovalRegistrySuccessor(before) {
  assert.ok(Buffer.isBuffer(before)); assert.equal(hash(before), BASE_CLASS_REMOVAL_REGISTRY_BEFORE);
  const text = before.toString(), marker = '];\n';
  assert.equal(text.split(marker).length, 2); assert.ok(!text.includes(admission.BASE_CLASS_REMOVAL_SHA));
  assert.equal([...text.matchAll(/\{sha:'/g)].length, 69);
  const record = `  {sha:'${admission.BASE_CLASS_REMOVAL_SHA}',proof_kind:'${admission.BASE_CLASS_REMOVAL_PROOF_KIND}',\n    scope_key:'${admission.BASE_CLASS_REMOVAL_SCOPE_KEY}',module:'upstream-base-class-removal-admission.cjs'},\n`;
  const after = Buffer.from(text.replace(marker, record + marker));
  assert.equal([...after.toString().matchAll(/\{sha:'/g)].length, 70);
  assert.equal(after.toString().replace(record, ''), text);
  return after;
}

export function applyBaseClassRemovalCanonicalStage({before, body} = {}) {
  assert.ok(Buffer.isBuffer(before)); assert.equal(hash(before), BASE_CLASS_REMOVAL_LEDGER_BEFORE, 'unqualified base-class ledger before-image');
  const data = JSON.parse(before), expected = structuredClone(data), sha = admission.BASE_CLASS_REMOVAL_SHA;
  assert.equal(data.entries.length, 1697); assert.equal(new Set(data.entries.map(row => row.sha)).size, 1697);
  assert.equal(data.closed_dispositions, 426); assert.equal(data.open_or_deferred, 1271);
  const index = data.entries.findIndex(row => row.sha === sha); assert.ok(index >= 0);
  const prior = data.entries[index]; assert.deepEqual(prior, body.before_entry);
  assert.equal(prior.final_disposition, 'needs-individual-review'); assert.equal(prior.evidence_report, null);
  const entry = {...prior, final_disposition: 'do-not-adopt', reason: body.decision, read_note_disposition: 'owned-retained',
    review_depth: 'individual-compatibility', evidence_report: admission.BASE_CLASS_REMOVAL_REVIEW, individual_proof: admission.baseClassRemovalProof(body)};
  assert.equal(admission.metadataOk({entry, body, review: body}), true);
  expected.entries[index] = entry; expected.closed_dispositions = 427; expected.open_or_deferred = 1270;
  const format = value => JSON.stringify(value, null, 2).replace(/\n/g, '\n    ');
  const text = before.toString(), oldEntry = format(prior); assert.equal(text.split(oldEntry).length, 2);
  let next = text.replace(oldEntry, format(entry));
  const entriesAt = next.indexOf('"entries": ['); assert.ok(entriesAt >= 0);
  let header = next.slice(0, entriesAt);
  for (const [key, from, to] of [['closed_dispositions', 426, 427], ['open_or_deferred', 1271, 1270]]) {
    const old = '  "' + key + '": ' + from + ',', successor = '  "' + key + '": ' + to + ',';
    assert.equal(header.split(old).length, 2); header = header.replace(old, successor);
  }
  const after = Buffer.from(header + next.slice(entriesAt)); assert.deepEqual(JSON.parse(after), expected);
  assert.deepEqual(expected.entries.filter(row => row.sha !== sha), data.entries.filter(row => row.sha !== sha));
  const security = rows => rows.filter(row => row.final_disposition === 'security-review');
  assert.deepEqual(security(expected.entries), security(data.entries)); assert.equal(security(expected.entries).length, 1);
  return {before: Buffer.from(before), after, entries: [structuredClone(entry)], individual_decisions: 1,
    summary_scalar_tokens: 2, unselected_entries_preserved: 1696, security_review_entries_preserved: 1,
    source_scope_only: true, canonical_admission_granted: false, canonical_transaction_delegated_to_shared_owner: true,
    current_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed'};
}

/** The immutable proposal above remains DATA-authenticated; this appended owner
 * composes fresh physical source qualification without applying canonical files. */
import {baseClassRemovalOwnerSourceSubject} from './base-class-removal-owner-source.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
export const BASE_CLASS_REMOVAL_OWNER_SOURCE_SHA256 = '8941be95923157b3f7ef959f7fa77f9a47624e41fa4b338d5aa4a7d25a7539c1';
const ownerIsBuffer = Buffer.isBuffer, ownerBufferEquals = Buffer.prototype.equals, ownerApply = Reflect.apply;
const ownerEqual = (actual, supplied) => ownerIsBuffer(supplied) && ownerApply(ownerBufferEquals, actual, [supplied]);
function ownerValue(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  assert.ok(descriptor && Object.hasOwn(descriptor, 'value'), 'non-data prior base-class metadata ' + key);
  return descriptor.value;
}
function ownerDataCopy(object) {
  return Object.fromEntries(Object.entries(Object.getOwnPropertyDescriptors(object)).map(([key, descriptor]) => {
    assert.ok(Object.hasOwn(descriptor, 'value'), 'non-data prior base-class field ' + key);
    return [key, descriptor.value];
  }));
}

export function baseClassRemovalOwnerContext({root, read = path => readFileSync(join(root, path))} = {}) {
  const owner = baseClassRemovalOwnerSourceSubject({root, read});
  const frames = owner.frames, applied = frames.applied;
  const before = Buffer.from(owner.stage.before), after = Buffer.from(owner.stage.after);
  const bound = new Map(owner.bound.map(ref => [ref.path, {...ref}]));
  const assertCurrent = owner.assertCurrent;
  const metadataRead = path => {
    if (path !== BASE_CLASS_REMOVAL_LEDGER) return read(path);
    const current = frames.ledgerSubject().raw;
    return applied ? Buffer.from(before) : current;
  };
  const wrapPrepared = prior => {
    assert.ok(ownerEqual(before, ownerValue(prior, 'canonical_after')), 'base-class stage does not follow complete table owner');
    const priorBound = ownerValue(prior, 'bound'); assert.ok(priorBound instanceof Map);
    const priorGuard = ownerValue(prior, 'assertCurrent'), metadataGuard = ownerValue(prior, 'prior_metadata_assert_current');
    assert.equal(typeof priorGuard, 'function'); assert.equal(typeof metadataGuard, 'function');
    const native = ownerValue(prior, 'native_spec_source');
    const nativeReferences = ownerValue(native, 'bound'), nativeGuard = ownerValue(native, 'assertCurrent');
    assert.ok(Array.isArray(nativeReferences)); assert.equal(typeof nativeGuard, 'function');
    const assertPriorMetadata = () => {
      assert.equal(ownerValue(prior, 'assertCurrent'), priorGuard, 'changed prior base-class source guard');
      assert.equal(ownerValue(prior, 'prior_metadata_assert_current'), metadataGuard, 'changed prior base-class metadata guard');
      assert.equal(ownerValue(prior, 'native_spec_source'), native, 'changed prior base-class native subject');
      assert.equal(ownerValue(native, 'assertCurrent'), nativeGuard, 'changed prior base-class native guard');
      assert.equal(ownerValue(prior, 'bound'), priorBound, 'changed prior base-class bound map');
      assert.equal(ownerValue(native, 'bound'), nativeReferences, 'changed prior base-class native references');
      assert.ok(ownerEqual(before, ownerValue(prior, 'canonical_after')), 'late prior base-class ledger');
    };
    const assertPrior = () => {
      assertPriorMetadata(); assertCurrent(); assertPriorMetadata();
      priorGuard(); metadataGuard(); assertCurrent(); assertPriorMetadata();
    };
    const currentBound = new Map(priorBound);
    for (const ref of bound.values()) currentBound.set(ref.path, ref.sha256);
    const nativeBound = nativeReferences.map(ref => {
      const actual = bound.get(ref.path);
      return actual ? {...ref, sha256: actual.sha256, bytes: actual.bytes} : {...ref};
    });
    assertPrior();
    return {...ownerDataCopy(prior), canonical_after: Buffer.from(after), bound: currentBound,
      base_class_removal_stage: {...owner.stage, before: Buffer.from(before), after: Buffer.from(after),
        entries: structuredClone(owner.stage.entries), assertCurrent: assertPrior,
        physically_applied: applied, source_scope_only: true, current_native_or_packed_or_floor_qualified: false},
      native_spec_source: {...ownerDataCopy(native), bound: nativeBound,
        assertCurrent: () => {assertPrior(); nativeGuard(); assertPrior();}},
      assertCurrent: assertPrior, prior_metadata_assert_current: assertPrior};
  };
  assertCurrent();
  return {applied, registryApplied: frames.registryApplied, precursor: frames.precursor,
    before: Buffer.from(before), after: Buffer.from(after),
    registryBefore: Buffer.from(owner.registryBefore), registryAfter: Buffer.from(owner.registryAfter),
    metadataRead, wrapPrepared, bound: structuredClone([...bound.values()]), assertCurrent, guardPlan: owner.guardPlan,
    source_facts: structuredClone(owner.source.facts), source_scope_only: true,
    current_native_packed_browser_floor_or_full_audit_qualified: false};
}
