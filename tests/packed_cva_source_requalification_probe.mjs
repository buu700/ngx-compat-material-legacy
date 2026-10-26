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
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  PACKED_CVA_ROLE_INPUTS, preparePackedCvaSourceRequalification, reviewPackedDetectorCalls,
  assertPackedCvaApplied, packedCvaRoleHistoricalReader,
} from '../scripts/packed-cva-source-requalification.mjs';
import {packedRepairTypeEvidenceRead, snackDomRawCurrentRead} from '../scripts/snack-dom-source-context.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), started = performance.now();
const read = path => readFileSync(join(root, path));
const hash = value => createHash('sha256').update(value).digest('hex');
const key = row => JSON.stringify([row.file, row.module, row.symbol]);
const prepared = preparePackedCvaSourceRequalification({root, read});
assert.deepEqual(prepared.roles, {changed: 68, detectors: 2, accessor: 6});
assert.equal(prepared.admission.ready, true);
assert.equal(prepared.admission.review_evidence.reviewed, 315);
const controls = [];
function rejects(label, action) {
  assert.throws(action, error => error?.code === 'ERR_ASSERTION', label); controls.push(label);
}
let preserved = 0, selected = 0;
for (const member of prepared.inputs.prior_ledgers) {
  const before = JSON.parse(prepared.before.get(member.path));
  const after = JSON.parse(prepared.writes.get(member.path));
  assert.equal(before.symbol_uses.length, after.symbol_uses.length);
  const expected = new Set([...prepared.inputs.selected, ...prepared.inputs.accessor_roles]
    .filter(row => row.ledger === member.path).map(key));
  for (let index = 0; index < before.symbol_uses.length; index++) {
    const old = before.symbol_uses[index], current = after.symbol_uses[index];
    assert.equal(key(current), key(old));
    if (!expected.has(key(old))) { assert.deepEqual(current, old); preserved++; continue; }
    assert.equal(current.status, 'reviewed'); assert.equal(current.disposition, 'closed'); selected++;
    const allowed = new Set(['status', 'disposition', 'source_review', 'source_review_history']);
    if (member.path.includes('current-dispositions')) {
      allowed.add('candidate_source_sha256'); allowed.add('occurrences');
    }
    const without = row => Object.fromEntries(Object.entries(row).filter(([name]) => !allowed.has(name)));
    assert.deepEqual(without(current), without(old), 'original selected-row fields changed');
  }
}
assert.equal(preserved, 1804); assert.equal(selected, 247);

const overrides = new Map(prepared.writes);
const appliedRead = path => overrides.has(path) ? Buffer.from(overrides.get(path)) : read(path);
assertPackedCvaApplied(prepared, appliedRead);
const historical = packedCvaRoleHistoricalReader({root, read: appliedRead});
assert.equal(historical.raw, appliedRead); assert.equal(historical.members, 3);
for (const member of prepared.inputs.prior_ledgers) {
  assert.equal(hash(historical.read(member.path)), member.sha256);
  assert.notEqual(hash(historical.raw(member.path)), member.sha256);
  const copied = historical.read(member.path); copied.fill(0);
  assert.equal(hash(historical.read(member.path)), member.sha256);
}
for (const [path, expected] of prepared.writes) {
  overrides.set(path, Buffer.concat([expected, Buffer.from('\n')]));
  rejects('changed canonical successor: ' + path, () => assertPackedCvaApplied(prepared, appliedRead));
  rejects('late canonical/evidence mutation: ' + path,
    () => historical.read(prepared.inputs.prior_ledgers[0].path));
  overrides.set(path, expected);
}
const boundPaths = [PACKED_CVA_ROLE_INPUTS, ...prepared.inputs.bound_inputs.map(m => m.path),
  'scripts/authored-additional-use-baseline.mjs',
  prepared.inputs.prior_reviews[0].path,
  'projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts',
  'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.scss'];
for (const path of boundPaths) {
  const corrupted = Buffer.concat([read(path), Buffer.from('\n')]);
  rejects('changed preparation input: ' + path,
    () => preparePackedCvaSourceRequalification({root, read: name => name === path ? corrupted : read(name)}));
}

const typeRead = packedRepairTypeEvidenceRead({root, read});
assert.equal(snackDomRawCurrentRead({root, read: typeRead}), read);
for (const [path, before] of prepared.product_preimages) {
  assert.equal(hash(typeRead(path)), hash(before));
  assert.equal(hash(snackDomRawCurrentRead({root, read: typeRead})(path)), hash(read(path)));
}
const adapterPath = 'scripts/authored-additional-use-baseline.mjs';
assert.notEqual(hash(typeRead(adapterPath)), hash(read(adapterPath)));

const menu = 'projects/ngx-material-legacy/legacy-menu/internal/menu-content-base.ts';
const tab = 'projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts';
const oldRead = path => prepared.product_preimages.get(path) ?? read(path);
for (const [id, path, transform] of [
  ['wrong terminal detector receiver', tab, text => text.replace('this._changeDetectorRef.markForCheck();', 'this._ngZone.markForCheck();')],
  ['changed constructor ownership', tab, text => text.replace('this._changeDetectorRef = changeDetectorRef;', 'this._changeDetectorRef = this._elementRef;')],
  ['completion before view notification', tab, text => text.replace('this._changeDetectorRef.markForCheck();\n    this._translateTabComplete.next(transition);', 'this._translateTabComplete.next(transition);\n    this._changeDetectorRef.markForCheck();')],
  ['detector call argument', tab, text => text.replace('this._changeDetectorRef.markForCheck();', 'this._changeDetectorRef.markForCheck(true);')],
  ['nonpublic detector type', tab, text => text.replace('_changeDetectorRef: ChangeDetectorRef;', '_changeDetectorRef: ElementRef;')],
  ['type-only runtime detector binding', tab, text => text.replace('  ChangeDetectorRef,', '  type ChangeDetectorRef,')],
  ['lazy destruction condition lost', menu, text => text.replace('if (this._portal?.isAttached)', 'if (true)')],
  ['mark before lazy view destruction', menu, text => text.replace('this._portal.detach();\n      // Refresh content queries after the embedded view has been destroyed.\n      this._changeDetectorRef.markForCheck();', 'this._changeDetectorRef.markForCheck();\n      this._portal.detach();')],
]) {
  const before = read(path).toString(), after = transform(before); assert.notEqual(after, before, id);
  rejects(id, () => reviewPackedDetectorCalls(root, oldRead,
    name => name === path ? Buffer.from(after) : read(name)));
}

const review = JSON.parse(prepared.writes.get('compatibility/f10/authored-use-reviews/packed-cva-current-source-boundaries.json'));
for (const selected of prepared.inputs.selected) {
  const oldBody = JSON.parse(prepared.before.get(selected.prior_source_review.path));
  const old = oldBody.reviews.find(row => key(row) === key(selected));
  const current = review.reviews.find(row => key(row) === key(selected));
  assert.equal(current.prior_decision, old.decision); assert.equal(current.conclusion, old.conclusion);
  assert.equal(current.prior_complete_case.sha256, hash(JSON.stringify(old)));
}
const report = {schema_version: 1, line: prepared.line, passed: true,
  existing_source_roles_requalified: 241, changed_source_roles: 68,
  new_accessor_source_roles: 6, detector_receiver_and_ordering_reviews: 2,
  original_complete_cases_and_decisions_preserved: 241, unselected_rows_preserved: preserved,
  frozen_uses: 1736, additional_obligations: 315, source_snapshot_valid: prepared.admission.source_snapshot_valid,
  controls, negative_controls: controls.length, source_scope_only: true,
  current_coordinator_native_or_floor_qualified: false, g11_claim: 'not-passed',
  runtime: {node: process.version, arch: process.arch, platform: process.platform},
  source_members: ['scripts/packed-cva-source-requalification.mjs', PACKED_CVA_ROLE_INPUTS,
    'scripts/snack-dom-source-context.mjs', adapterPath,
    'tests/packed_cva_source_requalification_probe.mjs', 'tests/test_packed_cva_source_requalification.py', 'flake.nix']
    .map(path => ({path, sha256: hash(read(path))})), seconds: (performance.now() - started) / 1000};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, controls: undefined, source_members: undefined}));
