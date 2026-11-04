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
