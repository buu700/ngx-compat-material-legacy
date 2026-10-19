/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Unknown bytes may not receive the historical six-role ledger view. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {inspectRippleOptionsIntegration, historicalRippleAuthoredReader, rippleIntegrationPrior,
  RIPPLE_AUTHORED_LEDGER, RIPPLE_INTEGRATION_INPUTS, RIPPLE_INTEGRATION_PRIOR} from '../scripts/ripple-global-options-integration.mjs';
const read = path => readFileSync(path), prior = rippleIntegrationPrior(), good = inspectRippleOptionsIntegration();
const view = historicalRippleAuthoredReader(), controls = [];
assert.equal(view(RIPPLE_AUTHORED_LEDGER).toString(), prior.ledger.text);
for (const path of prior.source_members.map(member => member.path)) assert.deepEqual(view(path), read(path));
const key = row => JSON.stringify([row.file, row.module, row.symbol]);
const selected = new Set(prior.selected.map(key));
const ledger = JSON.parse(read(RIPPLE_AUTHORED_LEDGER));
const changes = [
  ['reopen-selected', body => body.symbol_uses.find(row => selected.has(key(row))).disposition = 'open'],
  ['foreign-review', body => body.symbol_uses.find(row => selected.has(key(row))).source_review.path = 'compatibility/rc/foreign.json'],
  ['changed-review-seal', body => body.symbol_uses.find(row => selected.has(key(row))).source_review.sha256 = '0'.repeat(64)],
  ['close-unreviewed-zone', body => Object.assign(body.symbol_uses.find(row => row.file === 'legacy-chips/chip.ts' && row.symbol === 'NgZone'), {status: 'reviewed', disposition: 'closed'})],
  ['unrelated-row', body => body.symbol_uses.find(row => !selected.has(key(row))).symbol += '_changed'],
  ['missing-role', body => body.symbol_uses.pop()],
  ['duplicate-role', body => body.symbol_uses.push(body.symbol_uses[0])],
  ['wrong-reviewed-count', body => body.reviewed_uses++],
  ['wrong-open-count', body => body.open_uses--],
  ['wrong-note', body => body.note += ' native passed'],
  ['wrong-line', body => body.line = body.line === 'main' ? '21.x' : 'main'],
];
for (const [id, mutate] of changes) {
  const body = structuredClone(ledger); mutate(body);
  const bytes = Buffer.from(JSON.stringify(body, null, 2) + '\n');
  const altered = path => path === RIPPLE_AUTHORED_LEDGER ? bytes : read(path);
  assert.throws(() => inspectRippleOptionsIntegration({read: altered}), id);
  assert.throws(() => historicalRippleAuthoredReader({read: altered}), id);
  controls.push(id);
}
for (const [id, bytes] of [['old-ledger-is-not-current', Buffer.from(prior.ledger.text)],
  ['unknown-ledger-whitespace', Buffer.concat([read(RIPPLE_AUTHORED_LEDGER), Buffer.from('\n')])]]) {
  assert.throws(() => historicalRippleAuthoredReader({read: path => path === RIPPLE_AUTHORED_LEDGER ? bytes : read(path)}));
  controls.push(id);
}
const paths = [...new Set([RIPPLE_INTEGRATION_PRIOR, RIPPLE_INTEGRATION_INPUTS, prior.review.path,
  ...prior.independent_evidence.map(member => member.path), ...prior.source_members.map(member => member.path),
  ...prior.test_preimages.map(member => member.path)])];
for (const path of paths) {
  assert.throws(() => historicalRippleAuthoredReader({read: member => member === path ?
    Buffer.concat([read(member), Buffer.from('\n')]) : read(member)}), path);
  controls.push('changed-bound-subject-' + path);
}
assert.equal(good.selected_roles_admitted, 6); assert.equal(good.reviewed, 1452); assert.equal(good.open, 284);
const report = {...good, rejection_controls: controls.length, controls,
  altered_ledger_rejected_by_both_current_and_history_checks: true,
  current_source_reader_substitutions: 0, native_admission_exceptions_added: 0,
  old_test_assertion_expectations_changed: 0};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
