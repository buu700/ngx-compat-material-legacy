/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {dialogOwnedContractSourceRebinding as qualify} from '../scripts/dialog-caller-owned-contract-source-rebinding.mjs';
const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = value => createHash('sha256').update(value).digest('hex');
const ledgers = ['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json', 'compatibility/f10/disposition-ledger/ledger.json'];
const before = ledgers.map(path => hash(read(path))), q = qualify({root});
assert.equal(q.rows.length, 45); assert.equal(q.review.new_semantic_closures, 0);
for (let index = 0; index < q.rows.length; index++) {
  const current = q.review.reviews[index], previous = q.rows[index].complete_prior_case;
  assert.deepEqual(current.prior_source_context.case, previous);
  assert.equal(current.conclusion, previous.conclusion);
  assert.ok(current.current_source_role.occurrences.length);
  assert.ok(current.current_source_role.complete_caller_members.length);
  assert.equal(current.semantic_contracts.historical_prior_case_is_current_runtime_oracle, false);
}
const handle = q.review.reviews.find(row => row.file === 'legacy-dialog/dialog-ref.ts' && row.symbol === 'ComponentRef');
assert.match(handle.prior_source_context.case.decision, /template dialogs retain null/);
assert.match(handle.decision, /prior template-null assertion is superseded/);
const counts = Object.fromEntries(q.boundary.targets.map(member => [member.path,
  q.rows.filter(item => member.path === 'projects/ngx-material-legacy/' + item.original_row.file).length]));
assert.deepEqual(Object.values(counts), [5, 11, 1, 28]);
const controls = [q.prior.prior_review_members[0].path,
  'compatibility/rc/dialog-caller-owned-contract-source-impact.json', q.boundary.ref.path,
  'compatibility/rc/api/dialog-template-component-state-decision.json', ...q.boundary.targets.map(member => member.path)];
for (const changed of controls) assert.throws(() => qualify({root, read: path =>
  path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path)}), error => error?.code === 'ERR_ASSERTION');
let changed;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
qualify({root, read: late});
for (changed of [q.boundary.targets[0].path, q.boundary.targets[2].path])
  assert.throws(() => qualify({root, read: late}), error => error?.code === 'ERR_ASSERTION');
assert.deepEqual(ledgers.map(path => hash(read(path))), before);
console.log(JSON.stringify({line: q.line, individual_source_rebindings: 45, source_files: counts,
  complete_prior_cases_preserved: 45, prior_template_null_claim_explicitly_superseded: true,
  current_roles_recomputed: 45, corruptions_rejected: controls.length, late_changes_rejected: 2,
  canonical_ledgers_unchanged: true, new_semantic_closures: 0,
  native_packed_AOT_or_full_floor_qualified: false}));
