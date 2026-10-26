/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact applied patch and current records; no complete upstream/cohort walk or native execution. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {snackDomSourceContext} from '../scripts/snack-dom-source-context.mjs';
import {dialogServiceDefaultSourceRebinding, DIALOG_SERVICE_DEFAULT_REVIEW} from '../scripts/dialog-caller-service-default-source-rebinding.mjs';
import {scanCurrentAuthoredUses, currentAuthoredUseAdmission} from '../scripts/authored-current-use-inventory.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const load = path => JSON.parse(read(path)), id = row => JSON.stringify([row.file, row.module, row.symbol]);
const checked = dialogServiceDefaultSourceRebinding({root}), line = checked.line;
const parent = checked.prior.source_parent;
const oldCache = new Map(), before = path => {
  if (!oldCache.has(path)) oldCache.set(path, execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0',
    '-c', 'maintenance.auto=0', 'show', parent + ':' + path], {cwd: root, maxBuffer: 24 * 1024 * 1024,
    env: {...process.env, GIT_NO_LAZY_FETCH: '1'}}));
  return oldCache.get(path);
};
assert.deepEqual(load(DIALOG_SERVICE_DEFAULT_REVIEW), checked.review);
const registry = load('compatibility/rc/snack-dom-source-context-inputs.json');
assert.equal(registry.writes.length, 24);
for (const member of registry.writes) assert.equal(hash(read(member.path)), member.sha256);
const changedProducts = execFileSync('git', ['diff', '--name-only', parent, '--', 'projects/ngx-material-legacy'],
  {cwd: root, encoding: 'utf8'}).trim().split('\n').filter(Boolean).sort();
assert.deepEqual(changedProducts, checked.boundary.targets.map(member => member.path).sort());
const oldContextPath = 'compatibility/f10/authored-use-reviews/snack-dom-source-context.json';
assert.equal(hash(read(oldContextPath)), hash(before(oldContextPath)), 'immutable prior63 source-context report changed');
const newContextPath = 'compatibility/f10/authored-use-reviews/dialog-config-inherited-source-context.json';
const oldContext = JSON.parse(before(newContextPath)), newContext = load(newContextPath);
assert.equal(newContext.reviews.length, 63);
for (const item of newContext.reviews) {
  const old = oldContext.reviews.find(previous => id(previous) === id(item)); assert.ok(old);
  const restored = structuredClone(item);
  assert.deepEqual(item.independent_evidence.map(member => member.path), old.independent_evidence.map(member => member.path));
  for (let index = 0; index < item.independent_evidence.length; index++) {
    const actual = item.independent_evidence[index], previous = old.independent_evidence[index];
    if (actual.sha256 !== previous.sha256) assert.equal(actual.path, 'scripts/chip-focus-contract.mjs');
  }
  restored.independent_evidence = old.independent_evidence;
  if (restored.portal_source_requalification?.qualification.inputs)
    restored.portal_source_requalification.qualification.inputs = old.portal_source_requalification.qualification.inputs;
  const currentQualification = restored.portal_source_requalification?.qualification;
  if (currentQualification?.service) {
    assert.deepEqual(currentQualification.service, {targets: checked.boundary.targets, qualification: checked.boundary.ref,
      source_scope_only: true, actual_native_packed_or_floor_qualified: false});
    assert.equal(old.portal_source_requalification.qualification.service, undefined);
    delete currentQualification.service;
  }
  assert.deepEqual(restored, old, 'inherited case changed beyond exact current producer/registry provenance');
}
const configContextPath = 'compatibility/f10/authored-use-reviews/dialog-config-source-context.json';
const oldConfig = JSON.parse(before(configContextPath)), currentConfig = load(configContextPath);
assert.equal(currentConfig.reviews.length, 32);
for (const item of currentConfig.reviews) {
  const old = oldConfig.reviews.find(previous => id(previous) === id(item)); assert.ok(old);
  const restored = structuredClone(item);
  assert.deepEqual(item.independent_evidence.map(member => member.path), old.independent_evidence.map(member => member.path));
  for (let index = 0; index < item.independent_evidence.length; index++) {
    const actual = item.independent_evidence[index], previous = old.independent_evidence[index];
    if (actual.sha256 !== previous.sha256) {
      assert.equal(actual.path, 'scripts/dialog-caller-config-source-rebinding.mjs');
      assert.equal(actual.sha256, load('compatibility/rc/snack-dom-source-context-product-inputs.json').service_defaults.role_inspector_export.sha256);
    }
  }
  restored.independent_evidence = old.independent_evidence;
  assert.deepEqual(restored, old, 'prior32 case changed beyond the checked one-line inspector export');
}
const selected = new Set(checked.rows.map(item => id(item.original_row)));
const inherited = new Set([...newContext.reviews, ...currentConfig.reviews].map(id));
const inheritedPaths = new Set([newContextPath, configContextPath]);
const paths = ['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json'];
let selectedChanges = 0, snapshotChanges = 0, inheritedChanges = 0;
for (const path of paths) {
  const old = JSON.parse(before(path)), current = load(path);
  assert.equal(current.symbol_uses.length, old.symbol_uses.length);
  for (let index = 0; index < old.symbol_uses.length; index++) {
    const a = old.symbol_uses[index], b = current.symbol_uses[index];
    assert.equal(id(a), id(b)); assert.equal(a.disposition, b.disposition); assert.equal(a.status, b.status);
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    const restored = structuredClone(b);
    if (selected.has(id(a))) {
      assert.equal(b.source_review.path, DIALOG_SERVICE_DEFAULT_REVIEW);
      assert.equal(b.source_review.sha256, hash(read(DIALOG_SERVICE_DEFAULT_REVIEW)));
      assert.deepEqual(b.source_review_history.slice(0, -1), a.source_review_history ?? []);
      restored.source_review = a.source_review;
      if (a.source_review_history === undefined) delete restored.source_review_history;
      else restored.source_review_history = a.source_review_history;
      selectedChanges++;
    } else if (inherited.has(id(a)) && inheritedPaths.has(b.source_review?.path)) {
      assert.equal(b.source_review.path, a.source_review.path);
      assert.equal(b.source_review.sha256, hash(read(b.source_review.path)));
      restored.source_review = a.source_review; inheritedChanges++;
    }
    if (path.endsWith('current-dispositions.json') && checked.boundary.targets.some(member => member.path === 'projects/ngx-material-legacy/' + a.file)) {
      restored.candidate_source_sha256 = a.candidate_source_sha256; restored.occurrences = a.occurrences;
      snapshotChanges++;
    }
    assert.deepEqual(restored, a, 'unreviewed authored row change ' + id(a));
  }
}
assert.equal(selectedChanges, 11);
const earlierBindings = [...JSON.parse(before(paths[0])).symbol_uses, ...JSON.parse(before(paths[1])).symbol_uses]
  .filter(row => [newContextPath, configContextPath, 'compatibility/f10/authored-use-reviews/menu-panel-source-context.json'].includes(row.source_review?.path));
assert.equal(earlierBindings.length, 86);
assert.equal(new Set([...earlierBindings.map(id), ...selected]).size, 97);
const context = snackDomSourceContext({root});
assert.equal(context.members, 18); assert.equal(context.current_successors, 24);
const frozen = load(paths[0]), additional = load(paths[1]);
const a = authoredUseReviewEvidence(frozen, line, read, hash), b = authoredUseReviewEvidence(additional, line, read, hash);
assert.deepEqual([a.reviewed, a.insufficient, b.reviewed, b.insufficient], [1712, 0, 308, 0]);
assert.equal(frozen.symbol_uses.filter(row => row.disposition !== 'closed').length +
  additional.symbol_uses.filter(row => row.disposition !== 'closed').length, 31);
assert.equal(frozen.symbol_uses.filter(row => row.module === '@angular/forms' && row.symbol === 'NG_VALUE_ACCESSOR' && row.disposition === 'open').length, 6);
const current = scanCurrentAuthoredUses({root}), admission = currentAuthoredUseAdmission({current,
  frozen: frozen.symbol_uses, candidate: additional, line, readMember: read});
assert.ok(admission.scope_valid && admission.source_snapshot_valid && admission.inventory.complete);
assert.deepEqual([admission.current_uses, admission.current_source_files, admission.additional_uses,
  admission.additional_obligations, admission.retained_removed_additional_obligations], [1963, 532, 313, 315, 2]);
assert.equal(admission.ready, false);
let invalidAdmissions = 0;
for (const mutate of [candidate => candidate.retained_removed_additional_uses.pop(),
  candidate => {candidate.symbol_uses = candidate.symbol_uses.filter(row => id(row) !==
    id({file: 'legacy-dialog/internal/dialog-initial-focus.ts', module: '@angular/material/dialog', symbol: 'MatDialogConfig'}));},
  candidate => {candidate.current_source_population_sha256 = '0'.repeat(64);},
]) {
  const candidate = structuredClone(additional); mutate(candidate);
  const rejected = currentAuthoredUseAdmission({current, frozen: frozen.symbol_uses, candidate, line, readMember: read});
  assert.equal(rejected.ready, false); assert.equal(rejected.additional_obligations, 315);
  assert.ok(!rejected.scope_valid || !rejected.source_snapshot_valid || !rejected.inventory.complete);
  invalidAdmissions++;
}
const corruptProof = currentAuthoredUseAdmission({current, frozen: frozen.symbol_uses, candidate: additional, line,
  readMember: path => path === checked.boundary.ref.path ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path)});
assert.equal(corruptProof.scope_valid, false); assert.equal(corruptProof.additional_obligations, 315); invalidAdmissions++;
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json', ledger = load(ledgerPath), oldLedger = JSON.parse(before(ledgerPath));
assert.equal(ledger.entries.length, 1697); assert.equal(oldLedger.entries.length, 1697);
const semanticKeys = new Set(['case_ids', 'required_run', 'requires_native', 'kind', 'proof_kind', 'role', 'decision',
  'hunk_sha256', 'source_scope_only', 'actual_native_packed_or_floor_qualified', 'g11_claim']);
function semantic(a, b) {
  if (a && typeof a === 'object') for (const [key, value] of Object.entries(a)) {
    if (semanticKeys.has(key)) assert.deepEqual(b?.[key], value, 'original upstream judgment/native requirement changed');
    semantic(value, b?.[key]);
  }
}
let changedSHA = 0;
for (let index = 0; index < ledger.entries.length; index++) {
  const a = oldLedger.entries[index], b = ledger.entries[index];
  assert.equal(a.sha, b.sha); semantic(a, b);
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    const restored = {...b};
    for (const key of ['source_check', 'individual_proof']) {
      if (Object.hasOwn(a, key)) restored[key] = a[key];
      else delete restored[key];
    }
    assert.deepEqual(restored, a);
    changedSHA++;
  }
}
const definitions = {artifact_behavior: ['artifact-behavior', 'validateArtifactBehavior'], content_observer_behavior: ['content-observer', 'validateContentObserver'],
  form_field_hover_behavior: ['form-field-hover', 'validateFormFieldHover'], media_matcher_behavior: ['media-matcher', 'validateMediaMatcher'],
  progress_csp_behavior: ['progress-csp', 'validateProgressCsp'], ripple_replay_behavior: ['ripple-replay', 'validateRippleReplay'],
  historical_behavior: ['historical-behavior', 'validateHistoricalBehavior'], tab_completion_behavior: ['tab-completion', 'validateTabCompletion'],
  generated_identity_behavior: ['generated-identity', 'validateGeneratedIdentity'], native_date_behavior: ['native-date', 'validateNativeDate'],
  bidi_behavior: ['bidi', 'validateBidiBehavior'], selection_behavior: ['selection', 'validateSelectionBehavior'], owned_style_behavior: ['owned-style', 'validateOwnedStyle']};
const native = [];
for (const entry of ledger.entries) for (const [field, [module, name]] of Object.entries(definitions)) if (entry.individual_proof?.[field]) {
  const api = await import(pathToFileURL(join(root, 'scripts/upstream-' + module + '-evidence.mjs')));
  const result = api[name]({root, entry, proof: entry.individual_proof, request: {line}});
  assert.deepEqual(result, {ok: false, detail: 'missing coordinator run'});
  native.push({sha: entry.sha, field, result});
}
assert.equal(native.length, line === 'main' ? 34 : 33);
const controls = [...checked.boundary.targets.map(member => member.path), DIALOG_SERVICE_DEFAULT_REVIEW,
  oldContextPath, checked.boundary.ref.path, 'scripts/authored-additional-use-baseline.mjs'];
for (const path of controls) assert.throws(() => snackDomSourceContext({root,
  read: member => member === path ? Buffer.concat([read(member), Buffer.from('\n')]) : read(member)}),
error => error?.code === 'ERR_ASSERTION', path);
let changed = null;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
snackDomSourceContext({root, read: late});
for (changed of [checked.boundary.targets[0].path, checked.boundary.ref.path])
  assert.throws(() => snackDomSourceContext({root, read: late}), error => error?.code === 'ERR_ASSERTION');
const report = {schema_version: 1, line, preparation_commit: parent, exact_product_sources: 1,
  consumer_HTML_CSS_SCSS_changes: 0, source_context_rebindings: 11, selected_changes: selectedChanges,
  inherited_provenance_updates: inheritedChanges, additional_snapshot_updates: snapshotChanges,
  old63_report_bytes_preserved: true, inherited63_complete_judgments_preserved: true, prior32_complete_judgments_preserved: true,
  all1697_semantic_dispositions_and_native_requirements_preserved: true, SHA_source_metadata_refreshes: changedSHA,
  frozen_valid: 1712, additional_valid: 308, source_insufficient: 0, open: 31, cumulative_source_closures: 336,
  live_current_peer_uses: 1963, live_additional: 313, retained_removed_additional: 2, additional_obligations: 315,
  historical_subjects: 18, current_source_successors: 24, new_source_closures: 0, raw_native_requirements: native,
  invalid_current_admissions_rejected_with_all315_obligations_retained: invalidAdmissions,
  owner_input_corruptions_rejected: controls.length, late_changes_rejected: 2,
  full_upstream_or_historical_cohort_walk_executed: false, actual_native_packed_AOT_or_full_floor_qualified: false,
  g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line, source_rebindings: 11, open: 31, source_insufficient: 0, current_peer_uses: 1963,
  retained_removed_additional: 2, native_missing: native.length, changed_SHA_source_metadata: changedSHA}));
