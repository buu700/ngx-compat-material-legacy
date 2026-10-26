/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Immutable before evidence must not qualify partial, changed, or raw-before product. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {inspectDialogOwnedContracts} from '../scripts/dialog-caller-owned-contract-boundary.mjs';
const root = process.cwd(), raw = path => readFileSync(join(root, path));
const hash = value => createHash('sha256').update(value).digest('hex');
const proposalPath = 'compatibility/rc/dialog-caller-owned-contract-candidate.json';
const proposal = JSON.parse(raw(proposalPath));
const before = new Map(proposal.members.map(member => [member.path, Buffer.from(member.before.text)]));
const after = new Map(proposal.members.map(member => [member.path, Buffer.from(member.after.text)]));
const beforeRead = path => before.has(path) ? Buffer.from(before.get(path)) : raw(path);
const afterRead = path => after.has(path) ? Buffer.from(after.get(path)) : raw(path);
const reject = action => assert.throws(action, error => error?.code === 'ERR_ASSERTION');
const ledgerPaths = ['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json', 'compatibility/f10/disposition-ledger/ledger.json'];
const ledgers = new Map(ledgerPaths.map(path => [path, hash(raw(path))]));
assert.equal(inspectDialogOwnedContracts({root, read: beforeRead}).raw_product_applied, false);
reject(() => inspectDialogOwnedContracts({root, read: beforeRead, requireApplied: true}));
const q = inspectDialogOwnedContracts({root, read: afterRead, requireApplied: true});
assert.equal(q.raw_product_applied, true); assert.equal(q.preimages.size, 4);
assert.equal(q.proposed_sources.size, 49); assert.equal(q.sdkDeclarations.length, 3);
for (const path of before.keys()) reject(() => inspectDialogOwnedContracts({root, requireApplied: true,
  read: name => name === path ? before.get(path) : afterRead(name)}));
const controls = [...before.keys(), proposalPath, q.ref.path, 'tests/dialog_caller_owned_contract_subject.mjs',
  'projects/ngx-material-legacy/legacy-dialog/dialog-config.ts', q.sdkDeclarations[0].path];
for (const path of controls) reject(() => inspectDialogOwnedContracts({root, requireApplied: true,
  read: name => name === path ? Buffer.concat([afterRead(name), Buffer.from('\n')]) : afterRead(name)}));
let changed;
const late = path => path === changed ? Buffer.concat([afterRead(path), Buffer.from('\n')]) : afterRead(path);
inspectDialogOwnedContracts({root, read: late, requireApplied: true});
for (changed of [proposal.members[0].path, q.ref.path]) reject(() => inspectDialogOwnedContracts({root, read: late, requireApplied: true}));
for (const [path, digest] of ledgers) assert.equal(hash(raw(path)), digest);
const actual = inspectDialogOwnedContracts({root});
console.log(JSON.stringify({line: q.line, actual_product_applied: actual.raw_product_applied,
  model_only_after_admission_in_this_probe: true, modeled_semantic_sources: q.proposed_sources.size,
  runtime_cases: q.proof.runtime_subjects.reduce((sum, context) => sum + context.cases.length, 0),
  real_source_faults: q.proof.source_faults.length, public_peer_member_declarations_checked: q.sdkDeclarations.length,
  class_signatures_unchanged_except_componentRef: q.class_signatures_unchanged_except_componentRef,
  raw_before_admission_rejected: 1, partial_applications_rejected: 4, corruptions_rejected: controls.length,
  late_changes_rejected: 2, canonical_ledgers_unchanged: ledgers.size, source_closures: 0,
  actual_native_packed_AOT_or_full_floor_qualified: false}));
