/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
import {SLIDER_THUMB_DESTROY_SHA, SLIDER_THUMB_DESTROY_SUBJECT, sliderThumbDestroyEvidenceOk,
  reviewSliderThumbDestroyScope} from '../scripts/upstream-slider-thumb-destroy-scope.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(resolve(root, p));
const json = p => JSON.parse(read(p)), hash = b => createHash('sha256').update(b).digest('hex');
const entry = json('compatibility/f10/disposition-ledger/ledger.json').entries.find(r => r.sha === SLIDER_THUMB_DESTROY_SHA);
const body = json(entry.evidence_report), paths = candidateProductSourcePaths(root), controls = [];
assert.equal(sliderThumbDestroyEvidenceOk(body, entry, read, () => paths, body.line), true);
assert.equal(body.paths.length, 2); assert.equal(body.hunk_reviews.length, 3);
assert.equal(hash(JSON.stringify(body.prior_entry)), body.prior_entry_sha256);
if (body.line === 'main') assert.deepEqual(body.prior_entry.files, ['src/material/slider/slider-thumb.ts']);
function rejectBody(id, change) {
  const value = structuredClone(body); change(value);
  assert.equal(sliderThumbDestroyEvidenceOk(value, entry, read, () => paths, body.line), false, id); controls.push(id);
}
rejectBody('missing-upstream-spec', b => b.paths.pop());
rejectBody('wrong-full-patch', b => b.diff += '\n');
rejectBody('wrong-patch-digest', b => b.diff_sha256 = 'f'.repeat(64));
rejectBody('wrong-SHA', b => b.sha = 'f'.repeat(40));
rejectBody('wrong-branch', b => b.line = b.line === 'main' ? '21.x' : 'main');
rejectBody('unfinished-review', b => b.status = 'pending');
rejectBody('unearned-inheritance', b => b.final_disposition = 'inherited');
rejectBody('invented-constructor-execution', b => b.source_scope.constructors_Angular_views_native_browser_packed_or_floor_executed = true);
rejectBody('omitted-legacy-cleanup', b => b.source_scope.cleanup_contexts.pop());
rejectBody('weakened-original-failure', b => b.source_scope.modern_method_replay.original_undefined_input_throws = false);
rejectBody('lost-whole-source-population', b => b.source_scope.retained_architecture.product_source_files = 1);
rejectBody('modern-slider-companion', b => b.source_scope.current_companion_roster.names.push('slider'));
rejectBody('omitted-test-hunk-review', b => b.hunk_reviews.pop());
rejectBody('forged-G11-claim', b => b.g11_claim = 'passed');
for (const [id, change] of [
  ['renamed-proof-kind', r => r.individual_proof.proof_kind = 'diff-read'],
  ['incomplete-entry-paths', r => r.files.pop()],
  ['foreign-affected-line', r => r.individual_proof.affected_branches = ['other']],
  ['borrowed-decision', r => r.individual_proof.decision = 'different'],
  ['lost-prior-disposition', r => r.prior_dispositions.pop()],
]) {
  const value = structuredClone(entry); change(value);
  assert.equal(sliderThumbDestroyEvidenceOk(body, value, read, () => paths, body.line), false, id); controls.push(id);
}
for (const [id, path, edit] of [
  ['changed-global-cleanup', 'projects/ngx-material-legacy/legacy-slider/slider.ts', s => s.replace("document.removeEventListener('touchcancel', this._pointerUp, activeEventOptions);", '')],
  ['changed-legacy-destroy', 'projects/ngx-material-legacy/legacy-slider/slider.ts', s => s.replace('this._lastPointerEvent = null;', 'this._lastPointerEvent = undefined;')],
  ['changed-legacy-HTML', 'projects/ngx-material-legacy/legacy-slider/slider.html', s => s + '<input matSliderThumb>'],
  ['new-current-companion', 'scripts/companion-bridge-peer-oracle.mjs', s => s.replace("'badge', 'bottom-sheet'", "'slider', 'badge', 'bottom-sheet'")],
]) {
  const before = read(path).toString(), after = edit(before); assert.notEqual(before, after);
  assert.throws(() => reviewSliderThumbDestroyScope(p => p === path ? Buffer.from(after) : read(p), () => paths, body.line), undefined, id);
  controls.push(id);
}
for (const [id, bytes] of [
  ['new-visual-thumb', 'class MatSliderVisualThumb {}'],
  ['new-public-runtime-import', "import {MatSliderModule} from '@angular/material/slider';"],
]) {
  const extra = 'projects/ngx-material-legacy/untracked-modern-slider-route.ts';
  assert.equal(sliderThumbDestroyEvidenceOk(body, entry, p => p === extra ? Buffer.from(bytes) : read(p), () => [...paths, extra], body.line), false, id);
  controls.push(id);
}
assert.equal(sliderThumbDestroyEvidenceOk(body, entry, p => p === SLIDER_THUMB_DESTROY_SUBJECT ? Buffer.from('wrong') : read(p), () => paths, body.line), false);
controls.push('changed-authentic-subject');
const output = {schema_version: 1, line: body.line, source_only: true, reviewed_SHAs: 1,
  full_changed_files: 2, original_hunks: 3, retained_original_methods: 8, additional_cleanup_methods: 1,
  original_modern_failure_reproduced: true, modern_initialized_EventTarget_cleanup: 6,
  original_and_owned_legacy_receiver_scenarios: 4, negative_controls: controls,
  inputs: ['scripts/upstream-slider-thumb-destroy-scope.mjs', 'tests/upstream_slider_thumb_destroy_probe.mjs', entry.evidence_report,
    SLIDER_THUMB_DESTROY_SUBJECT].map(path => ({path, sha256: hash(read(path))})),
  actual_constructors_Angular_views_native_packed_or_floor_execution: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({reviewed_SHAs: 1, full_changed_files: 2, original_hunks: 3, negative_controls: controls.length,
  actual_constructors_Angular_views_native_packed_or_floor_execution: false}));
