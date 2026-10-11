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
import {SLIDER_INPUT_SHAS, SLIDER_INPUT_SUBJECTS, reviewSliderInputScope, sliderInputScopeEvidenceOk} from '../scripts/upstream-slider-input-scope.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(join(root, p));
const hash = raw => createHash('sha256').update(raw).digest('hex');
const path = 'compatibility/f10/disposition-ledger/evidence/closeout-three-slider-input-source-review.json';
const body = JSON.parse(read(path)), ledger = JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const paths = candidateProductSourcePaths(root), rows = ledger.entries.filter(r => SLIDER_INPUT_SHAS.includes(r.sha)); assert.equal(rows.length, 3);
for (const row of rows) assert.equal(sliderInputScopeEvidenceOk(body, row, read, () => paths, body.line), true, row.sha);
const controls = [];
const rejectBody = (id, mutate) => {const changed = structuredClone(body); mutate(changed); assert.equal(sliderInputScopeEvidenceOk(changed, rows[0], read, () => paths, body.line), false, id); controls.push({id, rejected: true});};
for (const [id, mutate] of [
  ['wrong-line', b => b.line = b.line === 'main' ? '21.x' : 'main'],
  ['missing-SHA', b => b.reviews.pop()],
  ['duplicate-SHA', b => b.reviews[1] = b.reviews[0]],
  ['missing-public-API-guard', b => b.reviews[0].paths.pop()],
  ['missing-modern-spec', b => b.reviews[0].paths = b.reviews[0].paths.filter(p => !p.endsWith('.spec.ts'))],
  ['wrong-original-context', b => b.source_scope.retained_contexts[0].original_member_sha256 = '0'.repeat(64)],
  ['missing-retained-handler', b => b.source_scope.retained_contexts.pop()],
  ['missing-absence-population', b => b.source_scope.product_source_files = 0],
  ['broadened-disposition', b => b.reviews[0].final_disposition = 'inherited'],
]) rejectBody(id, mutate);
const rejectEntry = (id, mutate) => {const row = structuredClone(rows[0]); mutate(row); assert.equal(sliderInputScopeEvidenceOk(body, row, read, () => paths, body.line), false, id); controls.push({id, rejected: true});};
rejectEntry('wrong-proof-kind', r => r.individual_proof.proof_kind = 'batch');
rejectEntry('wrong-branch', r => r.individual_proof.affected_branches = ['main']);
rejectEntry('missing-full-entry-path', r => r.files.pop());
const tsPath = 'projects/ngx-material-legacy/legacy-slider/slider.ts', source = read(tsPath).toString();
const htmlPath = 'projects/ngx-material-legacy/legacy-slider/slider.html', html = read(htmlPath).toString();
for (const [id, member, before, after] of [
  ['changed-legacy-touch-listener', tsPath, source, source.replace("element.addEventListener('touchstart', this._pointerDown, activeEventOptions);", '')],
  ['changed-legacy-focus-state', tsPath, source, source.replace("this._isActive = !!origin && origin !== 'keyboard';", 'this._isActive = !!origin;')],
  ['changed-legacy-pointer-update', tsPath, source, source.replace('this._lastPointerEvent = event;', 'this._lastPointerEvent = null;')],
  ['modern-input-in-legacy-DOM', htmlPath, html, html + '<input matSliderThumb>\n'],
  ['changed-legacy-DOM-class', htmlPath, html, html.replace('mat-slider-thumb-label-text', 'mdc-slider__value-indicator')],
]) {
  assert.notEqual(before, after, id + ': mutation did not apply');
  assert.throws(() => reviewSliderInputScope(p => p === member ? Buffer.from(after) : read(p), () => paths, body.line), undefined, id);
  controls.push({id, rejected: true});
}
const extra = 'projects/ngx-material-legacy/untracked-modern-slider.ts';
assert.equal(sliderInputScopeEvidenceOk(body, rows[0], p => p === extra ? Buffer.from('class MatSliderThumb {}') : read(p), () => [...paths, extra], body.line), false);
controls.push({id: 'untracked-modern-input-source', rejected: true});
assert.equal(sliderInputScopeEvidenceOk(body, rows[0], p => p === SLIDER_INPUT_SUBJECTS ? Buffer.from('changed upstream input') : read(p), () => paths, body.line), false);
controls.push({id: 'changed-original-upstream-capsule', rejected: true});
assert.equal(sliderInputScopeEvidenceOk(body, rows[0], p => p === rows[0].individual_proof.patch_file ? Buffer.from('diff --git a/other b/other\n') : read(p), () => paths, body.line), false);
controls.push({id: 'changed-full-patch', rejected: true});
const facts = reviewSliderInputScope(read, () => paths, body.line);
const result = {schema_version: 1, line: body.line, role: 'Three individual modern-input applicability source checks with original-derived controls',
  node: process.version, reviewed_shas: rows.length, full_changed_files: facts.original_changed_files,
  retained_original_contexts: facts.retained_contexts.length, candidate_source_files: facts.product_source_files,
  negative_controls: controls, inputs: [path, SLIDER_INPUT_SUBJECTS, 'scripts/upstream-slider-input-scope.mjs', 'tests/upstream_slider_input_scope_probe.mjs'].map(path => ({path, sha256: hash(read(path))})),
  native_iOS_browser_or_packed_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({reviewed_shas: rows.length, full_changed_files: facts.original_changed_files, retained_original_contexts: facts.retained_contexts.length, negative_controls: controls.length, native_iOS_browser_or_packed_qualified: false}));
