/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Candidate qualification cannot silently authorize changed raw source or old admission. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {inspectDialogServiceDefaults} from '../scripts/dialog-caller-service-default-boundary.mjs';
const root = process.cwd(), raw = path => readFileSync(join(root, path));
const hash = value => createHash('sha256').update(value).digest('hex');
const proposalPath = 'compatibility/rc/dialog-caller-service-default-candidate.json';
const proposal = JSON.parse(raw(proposalPath)), member = proposal.members[0];
const beforeRead = path => path === member.path ? Buffer.from(member.before.text) : raw(path);
const afterRead = path => path === member.path ? Buffer.from(member.after.text) : raw(path);
const reject = action => assert.throws(action, error => error?.code === 'ERR_ASSERTION');
const ledgers = new Map(['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json',
  'compatibility/f10/disposition-ledger/ledger.json'].map(path => [path, hash(raw(path))]));
assert.equal(inspectDialogServiceDefaults({root, read: beforeRead}).raw_product_applied, false);
reject(() => inspectDialogServiceDefaults({root, read: beforeRead, requireApplied: true}));
const q = inspectDialogServiceDefaults({root, read: afterRead, requireApplied: true});
assert.equal(q.raw_product_applied, true); assert.equal(q.preimages.size, 1);
assert.equal(q.proposed_sources.size, 49);
let corruptions = 0;
for (const path of [member.path, proposalPath, q.ref.path, q.proof.public_runtime.path,
  'tests/dialog_caller_owned_service_probe.mjs', 'tests/dialog_caller_owned_service_subject.mjs',
  'projects/ngx-material-legacy/legacy-dialog/dialog-ref.ts']) {
  reject(() => inspectDialogServiceDefaults({root, requireApplied: true,
    read: name => name === path ? Buffer.concat([afterRead(name), Buffer.from('\n')]) : afterRead(name)}));
  corruptions++;
}
let changed;
const lateRead = path => path === changed ? Buffer.concat([afterRead(path), Buffer.from('\n')]) : afterRead(path);
inspectDialogServiceDefaults({root, read: lateRead, requireApplied: true});
for (changed of [member.path, q.ref.path]) reject(() => inspectDialogServiceDefaults({root, read: lateRead, requireApplied: true}));
for (const [path, digest] of ledgers) assert.equal(hash(raw(path)), digest);
const actual = inspectDialogServiceDefaults({root});
console.log(JSON.stringify({line: q.line, actual_product_applied: actual.raw_product_applied,
  model_only_after_admission_in_this_probe: true, modeled_semantic_sources: q.proposed_sources.size,
  contexts: q.proof.contexts.length, cases: q.proof.contexts.reduce((count, context) => count + context.cases.length, 0),
  actual_source_faults: q.proof.source_faults.length, corruptions_rejected: corruptions,
  before_admission_rejected: 1, late_changes_rejected: 2, canonical_ledgers_unchanged: ledgers.size,
  source_closures: 0, actual_native_packed_AOT_or_full_floor_qualified: false}));
