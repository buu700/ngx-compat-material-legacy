/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {ngZoneIntegrationPrior, inspectNgZoneUseIntegration, ngZoneIntegrationParentReader,
  historicalRippleAuthoredReader, NG_ZONE_INTEGRATION_PRIOR, RIPPLE_AUTHORED_LEDGER} from '../scripts/ng-zone-use-integration.mjs';
const read = p => readFileSync(p), hash = b => createHash('sha256').update(b).digest('hex');
const key = row => JSON.stringify([row.file, row.module, row.symbol]);
const prior = ngZoneIntegrationPrior(), good = inspectNgZoneUseIntegration(), controls = [];
const ledger = JSON.parse(read(RIPPLE_AUTHORED_LEDGER));
const selectedKeys = new Set(prior.selected.map(key));
const selected = {...ledger, symbol_uses: ledger.symbol_uses.filter(row => selectedKeys.has(key(row)))};
const parent = ngZoneIntegrationParentReader(), historical = historicalRippleAuthoredReader();
assert.equal(parent(RIPPLE_AUTHORED_LEDGER).toString(), prior.ledger.text);
assert.equal(JSON.parse(historical(RIPPLE_AUTHORED_LEDGER)).reviewed_uses, 1446);
for (const member of prior.bound_members) assert.equal(parent(member.path).equals(read(member.path)), true, member.path);
for (const edit of prior.test_context_edits) assert.equal(parent(edit.path).toString(), edit.text);
const changes = [
  ['reopen-selected', b => b.symbol_uses.find(r => selectedKeys.has(key(r))).disposition = 'open'],
  ['foreign-review', b => b.symbol_uses.find(r => selectedKeys.has(key(r))).source_review.path = 'compatibility/rc/foreign.json'],
  ['changed-review-seal', b => b.symbol_uses.find(r => selectedKeys.has(key(r))).source_review.sha256 = '0'.repeat(64)],
  ['close-unreviewed-role', b => Object.assign(b.symbol_uses.find(r => r.disposition === 'open'), {status: 'reviewed', disposition: 'closed'})],
  ['unrelated-row', b => b.symbol_uses.find(r => !selectedKeys.has(key(r))).symbol += '_changed'],
  ['missing-row', b => b.symbol_uses.pop()], ['duplicate-row', b => b.symbol_uses.push(b.symbol_uses[0])],
  ['wrong-reviewed-count', b => b.reviewed_uses++], ['wrong-open-count', b => b.open_uses--],
  ['wrong-note', b => b.note += ' native passed'], ['wrong-line', b => b.line = b.line === 'main' ? '21.x' : 'main'],
];
for (const [id, mutate] of changes) {
  const body = structuredClone(ledger); mutate(body);
  const bytes = Buffer.from(JSON.stringify(body, null, 2) + '\n');
  const altered = path => path === RIPPLE_AUTHORED_LEDGER ? bytes : read(path);
  assert.throws(() => inspectNgZoneUseIntegration({read: altered}), id);
  assert.throws(() => ngZoneIntegrationParentReader({read: altered}), id);
  controls.push(id);
}
for (const [id, bytes] of [['parent-ledger-is-not-current', Buffer.from(prior.ledger.text)],
  ['unknown-ledger-whitespace', Buffer.concat([read(RIPPLE_AUTHORED_LEDGER), Buffer.from('\n')])]]) {
  assert.throws(() => ngZoneIntegrationParentReader({read: path => path === RIPPLE_AUTHORED_LEDGER ? bytes : read(path)}), id);
  controls.push(id);
}
for (const path of [NG_ZONE_INTEGRATION_PRIOR, ...prior.bound_members.map(m => m.path),
  ...prior.test_context_edits.map(m => m.path)]) {
  const altered = p => p === path ? Buffer.concat([read(p), Buffer.from('\n')]) : read(p);
  assert.throws(() => ngZoneIntegrationParentReader({read: altered}), path);
  controls.push('changed-bound-member:' + path);
}
let canonicalControls = 0;
assert.deepEqual(authoredUseReviewEvidence(selected, prior.line, read, hash),
  {reviewed: 12, insufficient: 0, insufficient_uses: []});
for (const row of selected.symbol_uses) {
  const path = 'projects/ngx-material-legacy/' + row.file;
  const evidence = authoredUseReviewEvidence(selected, prior.line,
    p => p === path ? Buffer.concat([read(p), Buffer.from('\n')]) : read(p), hash);
  assert.equal(evidence.reviewed, 11); assert.equal(evidence.insufficient, 1);
  assert.deepEqual(evidence.insufficient_uses, [{file: row.file, module: row.module, symbol: row.symbol}]);
  canonicalControls++;
}
const leaf = 'projects/ngx-material-legacy/legacy-select/select.ts';
const inherited = authoredUseReviewEvidence(selected, prior.line,
  p => p === leaf ? Buffer.concat([read(p), Buffer.from('\n')]) : read(p), hash);
assert.equal(inherited.reviewed, 11); assert.equal(inherited.insufficient, 1);
assert.equal(inherited.insufficient_uses[0].file, 'legacy-select/internal/select-base.ts'); canonicalControls++;
const report = {...good, rejection_controls: controls.length, controls,
  canonical_source_or_inherited_leaf_controls: canonicalControls,
  parent_context_bytes_and_original1446_projection_verified: true,
  original_assertion_expectations_changed: 0};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
