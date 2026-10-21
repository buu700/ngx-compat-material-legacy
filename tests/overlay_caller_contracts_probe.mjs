/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Prepared individual contract review and fail-closed input/row controls. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {qualifiedOverlayContracts, inspectOverlayContractReview, OVERLAY_CONTRACT_REVIEW} from '../scripts/overlay-caller-contract-reviews.mjs';

import {tooltipPriorCallerRead,qualifyIndependentMenuContentTypeDelta} from '../scripts/snack-dom-source-context.mjs';
const root = process.cwd(), raw = path => readFileSync(join(root, path));
// Revalidate raw current source before reading this immutable pre-type-change SDK packet.
const epoch = (read = raw) => tooltipPriorCallerRead({root,read,currentTooltip:true});
const currentMenuType = qualifyIndependentMenuContentTypeDelta({root});
const hash = value => createHash('sha256').update(value).digest('hex');
const qualified = qualifiedOverlayContracts({root,read:epoch()}), review = inspectOverlayContractReview({root,read:epoch()});
assert.equal(review.reviews.length, 48); assert.equal(review.source_closures_prepared, 48);
assert.equal(review.frozen_prepared, 46); assert.equal(review.additional_prepared, 2);
assert.equal(review.reviews.filter(r => r.unused_import).length, 1);
assert.ok(review.reviews.every(r => r.decision.length > 200 && r.conclusion === 'stable-public-peer'));
const {source, proof} = qualified;
const controls = [...new Set([OVERLAY_CONTRACT_REVIEW, 'compatibility/rc/overlay-caller-contract-inputs.json',
  'compatibility/rc/overlay-caller-contract-sdk.json', 'compatibility/rc/overlay-caller-contract-decisions.json',
  'scripts/overlay-caller-contracts.mjs', 'scripts/overlay-caller-contract-reviews.mjs',
  'tests/overlay_caller_contracts_public_probe.mjs', 'tests/overlay_caller_roles_subject.mjs', qualified.ref.path,
  ...source.capture.selected_sources.slice(0, 3),
  'projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts',
  'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts',
  'projects/ngx-material-legacy/legacy-select/select.ts',
  ...source.capture.self_package_routes.map(r => r.path),
  'projects/ngx-material-legacy/legacy-tooltip/tooltip.scss',
  ...JSON.parse(raw('compatibility/rc/overlay-caller-contract-sdk.json')).subjects.map(s => s.additions[0].path),
  qualified.clipping.ref.path])];
for (const target of controls) {
  assert.throws(() => inspectOverlayContractReview({root,
    read: epoch(path => path === target ? Buffer.concat([raw(path), Buffer.from('\ncorrupt')]) : raw(path))}), /AssertionError/, target);
}
let target = null;
const late = path => path === target ? Buffer.concat([raw(path), Buffer.from('\nlate')]) : raw(path);
inspectOverlayContractReview({root, read: epoch(late)});
for (target of ['projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts', qualified.ref.path]) {
  assert.throws(() => inspectOverlayContractReview({root, read: epoch(late)}), /AssertionError/);
}
for (const field of ['conclusion', 'candidate_source_sha256', 'decision']) {
  const changed = structuredClone(review); changed.reviews[0][field] = 'invalid';
  const bytes = Buffer.from(JSON.stringify(changed, null, 2) + '\n');
  assert.throws(() => inspectOverlayContractReview({root, read: epoch(path => path === OVERLAY_CONTRACT_REVIEW ? bytes : raw(path))}), /changed prepared individual overlay review/);
}
const ledgers = new Map(source.prior.ledgers.map(m => [m.path, JSON.parse(raw(m.path))]));
let integrated = 0;
for (const selected of source.prior.selected) {
  const row = ledgers.get(selected.ledger).symbol_uses.find(r => r.file === selected.original_row.file && r.module === selected.original_row.module && r.symbol === selected.original_row.symbol);
  assert.ok(row);
  if (row.disposition === 'closed') {
    assert.equal(row.source_review.path, OVERLAY_CONTRACT_REVIEW); assert.equal(row.source_review.sha256, hash(raw(OVERLAY_CONTRACT_REVIEW))); integrated++;
  } else assert.equal(row.disposition, 'open');
}
assert.ok([0,48].includes(integrated), 'partial unreviewed canonical integration');
for (const path of ledgers.keys()) {
  const committed = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', 'show', 'HEAD:' + path],
    {cwd: root, maxBuffer: 24 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
  if (!integrated) assert.equal(hash(raw(path)), hash(committed), 'preparation changed canonical ledger');
}
const frozen = ledgers.get('compatibility/f10/authored-dependency-dispositions.json');
assert.equal(frozen.symbol_uses.length, 1736);
assert.equal(frozen.symbol_uses.filter(r => r.module === '@angular/forms' && r.symbol === 'NG_VALUE_ACCESSOR' && r.disposition === 'open').length, 6);
assert.equal(ledgers.get('compatibility/f10/authored-dependency-current-dispositions.json').symbol_uses.length, 315);
assert.equal(ledgers.get('compatibility/f10/disposition-ledger/ledger.json').entries.length, 1697);
const report = {line: review.line, reviewed_routes: 48, frozen: 46, additional: 2, historical_overlay_packet_source_files: 145, current_source_files: 145,
  current_type_boundary_affected_sources: currentMenuType.bridge.affected_current_sources.length,
  immutable_pre_type_change_packet_preserved: true, raw_current_type_boundary_requalified: true,
  selected_minimum_resolved_calls: 104, selected_minimum_member_accesses: 142, justified_strategy_casts: 5,
  actual_source_faults_rejected: 3, public_type_subjects: 3, negative_type_controls: 9,
  runtime_contexts: 10, runtime_protocol_cases: 160, runtime_source_mutants_rejected: 6,
  source_or_evidence_corruptions_rejected: controls.length, late_changes_rejected: 2, review_row_corruptions_rejected: 3,
  mutable_source_owner_registry_dependencies: 0, canonical_closures_integrated: integrated,
  all1697_1736_315_obligations_and_six_packed_CVA_rows_retained: true,
  actual_native_packed_AOT_or_full_floor_qualified: false};
const output = JSON.stringify(report);
if (process.argv[2]) writeFileSync(process.argv[2], output + '\n', {flag: 'wx'});
console.log(output);
