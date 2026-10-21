/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Independent source/decision receipt guards; original populations and native gates remain. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {qualifiedComponentConfigOwned} from '../scripts/component-config-caller-owned-evidence.mjs';
import {inspectComponentConfigOwnedHelpers,compareComponentConfigHelpers} from '../scripts/component-config-caller-owned-helpers.mjs';
import {inspectComponentConfigReview, COMPONENT_CONFIG_REVIEW} from '../scripts/component-config-caller-reviews.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const q = qualifiedComponentConfigOwned({root}), review = inspectComponentConfigReview({root});
assert.equal(review.reviews.length, 73);
assert.equal(review.frozen_prepared, 44);
assert.equal(review.additional_prepared, 29);
assert.equal(review.reviews.filter(row => row.conclusion === 'stable-public-peer').length, 68);
assert.equal(review.reviews.filter(row => row.conclusion === 'owned-replacement').length, 5);
assert.equal(review.reviews.filter(row => row.unused_header_binding).length, 3);
const controls = [...new Set([COMPONENT_CONFIG_REVIEW, ...review.reviews[0].independent_evidence.map(m => m.path),
  'tests/component_config_caller_owned_runtime_probe.mjs', 'tests/component_config_caller_owned_runtime_subject.mjs',
  'tests/component_config_caller_owned_subjects.mjs', 'tests/component_config_caller_constructor_cases.mjs', 'tests/component_config_caller_tagged_runtime_subject.mjs', 'compatibility/rc/api/export-name-allowlist.json',
  ...q.source.prior.sources.map(m => m.path)])];
for (const path of controls) {
  assert.throws(() => inspectComponentConfigReview({root,
    read: member => member === path ? Buffer.concat([read(member), Buffer.from('\n')]) : read(member),
  }), error => error?.code === 'ERR_ASSERTION', path);
}
let changed = null;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
inspectComponentConfigReview({root, read: late});
for (changed of ['projects/ngx-material-legacy/legacy-progress-bar/progress-bar.ts', q.ref.path]) {
  assert.throws(() => inspectComponentConfigReview({root, read: late}), error => error?.code === 'ERR_ASSERTION');
}
for (const field of ['decision', 'candidate_source_sha256', 'conclusion']) {
  const bad = structuredClone(review);
  bad.reviews[0][field] = 'invalid';
  const bytes = Buffer.from(JSON.stringify(bad, null, 2) + '\n');
  assert.throws(() => inspectComponentConfigReview({root,
    read: path => path === COMPONENT_CONFIG_REVIEW ? bytes : read(path),
  }), /changed prepared individual configuration review/);
}
const helpers = inspectComponentConfigOwnedHelpers({qualified:q,read});
const semanticControls = [
  ['ownedState', '  Checked,', '  Checked = 3,'],
  ['ownedLocation', '_location.pathname + _location.search', '_location.pathname'],
  ['ownedLocation', "'mat-progress-bar-location'", "'wrong-location-token'"],
  ['ownedDefaults', 'mode?: ProgressBarMode', 'mode?: string'],
  ['ownedDefaults', 'InjectionToken<MatProgressBarDefaultOptions>', 'InjectionToken<any>'],
  ['ownedLocation', 'MAT_PROGRESS_BAR_LOCATION_FACTORY(): MatProgressBarLocation', 'MAT_PROGRESS_BAR_LOCATION_FACTORY(): any'],
];
for (const [field,from,to] of semanticControls) {
  const inputs=structuredClone(helpers.inputs);
  assert.equal(inputs[field].split(from).length,2,'non-unique helper semantic control');
  inputs[field]=inputs[field].replace(from,to);
  assert.throws(()=>compareComponentConfigHelpers(inputs),error=>error?.code==='ERR_ASSERTION',field+':'+from);
}
const ledgers = new Map(q.source.prior.ledgers.map(m => [m.path, JSON.parse(read(m.path))]));
let integrated = 0;
for (const selected of q.source.prior.selected) {
  const old = selected.original_row, row = ledgers.get(selected.ledger).symbol_uses.find(r =>
    r.file === old.file && r.module === old.module && r.symbol === old.symbol);
  assert.ok(row);
  if (row.disposition === 'closed') {
    assert.equal(row.status, 'reviewed');
    assert.deepEqual(row.source_review, {path: COMPONENT_CONFIG_REVIEW, sha256: hash(read(COMPONENT_CONFIG_REVIEW))});
    integrated++;
  } else assert.equal(row.disposition, 'open');
}
assert.ok([0, 73].includes(integrated), 'partial configuration canonical integration');
if (!integrated) for (const path of ledgers.keys()) {
  assert.equal(hash(read(path)), hash(execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0',
    'show', 'HEAD:' + path], {cwd: root, maxBuffer: 24 * 1024 * 1024,
    env: {...process.env, GIT_NO_LAZY_FETCH: '1'}})), 'preparation changed canonical obligations');
}
const frozen = ledgers.get('compatibility/f10/authored-dependency-dispositions.json');
const added = ledgers.get('compatibility/f10/authored-dependency-current-dispositions.json');
assert.equal(frozen.symbol_uses.length, 1736);
assert.equal(added.symbol_uses.length, 315);
assert.equal(ledgers.get('compatibility/f10/disposition-ledger/ledger.json').entries.length, 1697);
assert.equal(frozen.symbol_uses.filter(row => row.module === '@angular/forms' &&
  row.symbol === 'NG_VALUE_ACCESSOR' && row.disposition === 'open').length, 6);
assert.equal(added.live_symbol_use_count, 314);
assert.equal(added.retained_removed_additional_uses.length, 1);
const report = {line: review.line, individual_routes: 73, frozen: 44, additional: 29,
  public_runtime_cases: 210, owned_runtime_cases: 46, actual_source_mutants_rejected: 10, helper_semantic_controls_rejected: semanticControls.length,
  source_and_proof_corruptions_rejected: controls.length, late_changes_rejected: 2,
  review_row_corruptions_rejected: 3, canonical_closures_integrated: integrated,
  original1697_1736_315_and_six_packed_CVA_obligations_retained: true,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
