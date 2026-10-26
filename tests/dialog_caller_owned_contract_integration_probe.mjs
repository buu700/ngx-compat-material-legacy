/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bounded current-source reconciliation; no full historical/coordinator run. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {snackDomSourceContext, snackDomRawCurrentRead} from '../scripts/snack-dom-source-context.mjs';
import {dialogOwnedContractSourceRebinding, DIALOG_OWNED_CONTRACT_REVIEW} from '../scripts/dialog-caller-owned-contract-source-rebinding.mjs';
import {scanCurrentAuthoredUses, currentAuthoredUseAdmission} from '../scripts/authored-current-use-inventory.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const load = path => JSON.parse(read(path)), id = row => JSON.stringify([row.file, row.module, row.symbol]);
const checked = dialogOwnedContractSourceRebinding({root}), line = checked.line, parent = checked.prior.source_parent;
const cache = new Map(), before = path => {
  if (!cache.has(path)) cache.set(path, execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0',
    '-c', 'maintenance.auto=0', 'show', parent + ':' + path], {cwd: root, maxBuffer: 24 * 1024 * 1024,
    env: {...process.env, GIT_NO_LAZY_FETCH: '1'}}));
  return cache.get(path);
};
assert.deepEqual(load(DIALOG_OWNED_CONTRACT_REVIEW), checked.review);
const registry = load('compatibility/rc/snack-dom-source-context-inputs.json');
assert.equal(registry.writes.length, 25);
for (const member of registry.writes) assert.equal(hash(read(member.path)), member.sha256);
const changedProducts = execFileSync('git', ['diff', '--name-only', parent, '--', 'projects/ngx-material-legacy'],
  {cwd: root, encoding: 'utf8'}).trim().split('\n').filter(Boolean).sort();
assert.deepEqual(changedProducts, checked.boundary.targets.map(member => member.path).sort());
assert.ok(changedProducts.every(path => path.endsWith('.ts')));
for (const member of checked.prior.prior_review_members) assert.equal(hash(read(member.path)), member.sha256);
const inheritedPath = 'compatibility/f10/authored-use-reviews/dialog-config-inherited-source-context.json';
const oldInherited = JSON.parse(before(inheritedPath)), currentInherited = load(inheritedPath);
assert.equal(currentInherited.reviews.length, 63);
for (const item of currentInherited.reviews) {
  const old = oldInherited.reviews.find(previous => id(previous) === id(item)); assert.ok(old);
  const restored = structuredClone(item);
  assert.deepEqual(item.independent_evidence.map(member => member.path), old.independent_evidence.map(member => member.path));
  for (let index = 0; index < item.independent_evidence.length; index++) if (
    item.independent_evidence[index].sha256 !== old.independent_evidence[index].sha256)
    assert.equal(item.independent_evidence[index].path, 'scripts/chip-focus-contract.mjs');
  restored.independent_evidence = old.independent_evidence;
  const qualification = restored.portal_source_requalification?.qualification;
  if (qualification?.inputs) qualification.inputs = old.portal_source_requalification.qualification.inputs;
  if (qualification?.owned) {
    assert.deepEqual(qualification.owned, {targets: checked.boundary.targets, qualification: checked.boundary.ref,
      source_scope_only: true, actual_native_packed_or_floor_qualified: false});
    assert.equal(old.portal_source_requalification.qualification.owned, undefined); delete qualification.owned;
  }
  assert.deepEqual(restored, old, 'unreviewed inherited semantic case change');
}
const selected = new Set(checked.rows.map(item => id(item.original_row)));
const paths = ['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json'];
let selectedChanges = 0, inheritedChanges = 0, snapshotChanges = 0;
for (const path of paths) {
  const old = JSON.parse(before(path)), current = load(path);
  assert.equal(current.symbol_uses.length, old.symbol_uses.length);
  for (let index = 0; index < old.symbol_uses.length; index++) {
    const a = old.symbol_uses[index], b = current.symbol_uses[index];
    assert.equal(id(a), id(b)); assert.equal(a.status, b.status); assert.equal(a.disposition, b.disposition);
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    const restored = structuredClone(b);
    if (selected.has(id(a))) {
      assert.equal(b.source_review.path, DIALOG_OWNED_CONTRACT_REVIEW);
      assert.equal(b.source_review.sha256, hash(read(DIALOG_OWNED_CONTRACT_REVIEW)));
      assert.deepEqual(b.source_review_history.slice(0, -1), a.source_review_history ?? []);
      assert.deepEqual(b.source_review_history.at(-1).prior_source_review, a.source_review);
      restored.source_review = a.source_review;
      if (a.source_review_history === undefined) delete restored.source_review_history;
      else restored.source_review_history = a.source_review_history;
      selectedChanges++;
    } else if (b.source_review?.sha256 !== a.source_review?.sha256) {
      assert.equal(a.source_review.path, inheritedPath); assert.equal(b.source_review.path, inheritedPath);
      assert.equal(b.source_review.sha256, hash(read(inheritedPath)));
      restored.source_review = a.source_review; inheritedChanges++;
    }
    if (path === paths[1] && checked.boundary.targets.some(member => member.path === 'projects/ngx-material-legacy/' + a.file)) {
      restored.candidate_source_sha256 = a.candidate_source_sha256; restored.occurrences = a.occurrences; snapshotChanges++;
    }
    assert.deepEqual(restored, a, 'unreviewed authored row change ' + id(a));
  }
}
assert.equal(selectedChanges, 45);
const context = snackDomSourceContext({root});
assert.equal(context.members, 20); assert.equal(context.current_successors, 25);
const nativeRead = snackDomRawCurrentRead({root, read: context.read});
for (const member of checked.boundary.targets) {
  assert.equal(hash(nativeRead(member.path)), member.sha256);
  assert.equal(hash(context.read(member.path)), member.path.endsWith('dialog-container-base.ts') ?
    '752582e2bf49bc2f11431fa7bf35941f381a830dc5d837e14246a40ef010c01c' :
    member.path.endsWith('dialog-base.ts') ? checked.boundary.defaults.targets[0].before_sha256 : member.before_sha256);
}
const frozen = load(paths[0]), additional = load(paths[1]);
const a = authoredUseReviewEvidence(frozen, line, read, hash), b = authoredUseReviewEvidence(additional, line, read, hash);
assert.deepEqual([a.reviewed, a.insufficient, b.reviewed, b.insufficient], [1712, 0, 308, 0]);
const open = frozen.symbol_uses.concat(additional.symbol_uses).filter(row => row.disposition !== 'closed');
assert.equal(open.length, 31);
assert.equal(open.filter(row => row.module === '@angular/forms' && row.symbol === 'NG_VALUE_ACCESSOR').length, 6);
const current = scanCurrentAuthoredUses({root}), admission = currentAuthoredUseAdmission({current,
  frozen: frozen.symbol_uses, candidate: additional, line, readMember: read});
assert.ok(admission.scope_valid && admission.source_snapshot_valid && admission.inventory.complete);
assert.deepEqual([admission.current_uses, admission.current_source_files, admission.additional_uses,
  admission.additional_obligations, admission.retained_removed_additional_obligations], [1963, 532, 313, 315, 2]);
assert.equal(admission.ready, false);
let invalidAdmissions = 0;
for (const mutate of [candidate => candidate.retained_removed_additional_uses.pop(),
  candidate => {candidate.current_source_population_sha256 = '0'.repeat(64);}]) {
  const candidate = structuredClone(additional); mutate(candidate);
  const rejected = currentAuthoredUseAdmission({current, frozen: frozen.symbol_uses, candidate, line, readMember: read});
  assert.equal(rejected.ready, false); assert.equal(rejected.additional_obligations, 315);
  assert.ok(!rejected.scope_valid || !rejected.source_snapshot_valid || !rejected.inventory.complete); invalidAdmissions++;
}
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const ledger = load(ledgerPath), oldLedger = JSON.parse(before(ledgerPath));
assert.equal(ledger.entries.length, 1697); assert.equal(oldLedger.entries.length, 1697);
const semanticKeys = new Set(['case_ids', 'required_run', 'requires_native', 'kind', 'proof_kind', 'role', 'decision',
  'hunk_sha256', 'source_scope_only', 'actual_native_packed_or_floor_qualified', 'g11_claim']);
function semantic(a, b) {
  if (a && typeof a === 'object') for (const [key, value] of Object.entries(a)) {
    if (semanticKeys.has(key)) assert.deepEqual(b?.[key], value, 'upstream judgment/native requirement changed');
    semantic(value, b?.[key]);
  }
}
let changedSHA = 0;
const nativeFields = ['artifact_behavior', 'content_observer_behavior', 'form_field_hover_behavior',
  'media_matcher_behavior', 'progress_csp_behavior', 'ripple_replay_behavior', 'historical_behavior',
  'tab_completion_behavior', 'generated_identity_behavior', 'native_date_behavior', 'bidi_behavior',
  'selection_behavior', 'owned_style_behavior'];
const native = [];
for (let index = 0; index < ledger.entries.length; index++) {
  const a = oldLedger.entries[index], b = ledger.entries[index]; assert.equal(a.sha, b.sha); semantic(a, b);
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    const restored = {...b};
    for (const key of ['source_check', 'individual_proof']) {
      if (Object.hasOwn(a, key)) restored[key] = a[key]; else delete restored[key];
    }
    assert.deepEqual(restored, a); changedSHA++;
  }
  for (const field of nativeFields) if (b.individual_proof?.[field]) native.push({sha: b.sha, field});
}
assert.equal(native.length, line === 'main' ? 34 : 33);
const controls = [...checked.boundary.targets.map(member => member.path), DIALOG_OWNED_CONTRACT_REVIEW,
  checked.boundary.ref.path, 'scripts/authored-additional-use-baseline.mjs'];
for (const changed of controls) assert.throws(() => snackDomSourceContext({root, read: path =>
  path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path)}), error => error?.code === 'ERR_ASSERTION');
let changed;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
snackDomSourceContext({root, read: late});
for (changed of [checked.boundary.targets[2].path, DIALOG_OWNED_CONTRACT_REVIEW])
  assert.throws(() => snackDomSourceContext({root, read: late}), error => error?.code === 'ERR_ASSERTION');
const report = {schema_version: 1, line, preparation_commit: parent, exact_product_sources: 4,
  consumer_HTML_CSS_SCSS_changes: 0, source_context_rebindings: 45, selected_changes: selectedChanges,
  inherited_provenance_updates: inheritedChanges, additional_snapshot_updates: snapshotChanges,
  complete_prior45_cases_preserved: true, inherited63_complete_judgments_preserved: true,
  all1697_semantic_dispositions_and_native_requirements_preserved: true, SHA_source_metadata_refreshes: changedSHA,
  frozen_valid: 1712, additional_valid: 308, source_insufficient: 0, open: 31, cumulative_source_closures: 336,
  live_current_peer_uses: 1963, live_additional: 313, retained_removed_additional: 2, additional_obligations: 315,
  historical_subjects: 20, current_source_successors: 25, total_distinct_source_context_bindings: 103,
  historical_reader_unwrapped_for_raw_native_admission: true,
  new_source_closures: 0, native_requirements_preserved: native, fresh_native_validators_executed: false,
  invalid_current_admissions_rejected_with_all315_obligations_retained: invalidAdmissions,
  owner_input_corruptions_rejected: controls.length, late_changes_rejected: 2,
  full_upstream_or_historical_cohort_walk_executed: false, actual_native_packed_AOT_or_full_floor_qualified: false,
  g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line, source_rebindings: 45, open: 31, source_insufficient: 0, current_peer_uses: 1963,
  retained_removed_additional: 2, native_requirements: native.length, changed_SHA_source_metadata: changedSHA}));
