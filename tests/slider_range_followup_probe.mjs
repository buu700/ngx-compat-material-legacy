/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Source applicability and real CLI binding only; no browser/floor execution.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
import {SLIDER_RANGE_SHAS, analyzeSliderRangeSubjects, replaySliderRangeSubject, sliderRangeEvidenceOk} from '../scripts/upstream-slider-range-followups.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), read = p => fs.readFileSync(path.join(root, p));
const json = p => JSON.parse(read(p)), hash = value => createHash('sha256').update(value).digest('hex');
const ts = createRequire(import.meta.url)('typescript');
const line = json('projects/ngx-material-legacy/package.json').version.startsWith('21.') ? '21.x' : 'main';
const {packet, results} = analyzeSliderRangeSubjects(read, line);
assert.equal(results.reduce((n, row) => n + row.files, 0), 9); assert.equal(results.reduce((n, row) => n + row.hunks, 0), 15);
const ledger = json('compatibility/f10/disposition-ledger/ledger.json'); assert.equal(ledger.entries.length, 1697);
const entries = SLIDER_RANGE_SHAS.map(sha => ledger.entries.find(row => row.sha === sha));
const reportPath = entries[0].evidence_report, body = json(reportPath), productPaths = () => candidateProductSourcePaths(root);
for (const entry of entries) assert.equal(sliderRangeEvidenceOk(body, entry, read, productPaths, line), true, entry.sha);
assert.equal(body.source_scope.owned_methods.length, 16);
assert.deepEqual(body.source_scope.peers.map(row => [row.version, row.active_input_animation.source_observation]), [['22.1.7', 'post-fix'], ['21.2.14', 'pre-fix']]);
const observations = [];
function replaceMember(text, className, memberName, from, to) {
  const file = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true);
  const owner = file.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === className); assert.ok(owner);
  const member = owner.members.find(n => n.name?.getText(file) === memberName); assert.ok(member);
  const part = member.getText(file); assert.equal(part.split(from).length, 2, memberName + ' mutation anchor');
  return text.slice(0, member.getStart(file)) + part.replace(from, to) + text.slice(member.end);
}
function mutatedMember(subjectIndex, suffix, className, memberName, from, to) {
  const subject = structuredClone(packet.subjects[subjectIndex]);
  const source = subject.members.find(row => row.path.endsWith(suffix)); assert.ok(source);
  source.after.text = replaceMember(source.after.text, className, memberName, from, to);
  return subject;
}
for (const [id, args] of [
  ['range-loses-inactive-width', [0, 'slider-input.ts', 'MatSliderRangeThumb', '_setValue', 'this._updateWidthInactive();', '']],
  ['range-loses-sibling-update', [0, 'slider-input.ts', 'MatSliderRangeThumb', '_setValue', 'this._updateSibling();', '']],
  ['safari-retains-input-focus', [1, 'slider-input.ts', 'MatSliderThumb', '_onPointerUp', 'this._setIsFocused(false);', '']],
  ['safari-loses-hover-restoration', [1, 'slider-thumb.ts', 'MatSliderVisualThumb', '_onDragEnd', 'this._showHoverRipple();', '']],
  ['focus-loses-transition-reset', [2, 'slider-input.ts', 'MatSliderThumb', '_onFocus', 'this._slider._setTransition(false);', '']],
  ['focus-reorders-track-update', [2, 'slider-input.ts', 'MatSliderThumb', '_onFocus', 'this._slider._setTransition(false);\n    this._slider._updateTrackUI(this);', 'this._slider._updateTrackUI(this);\n    this._slider._setTransition(false);']],
  ['active-input-always-animates', [3, 'slider-input.ts', 'MatSliderThumb', '_onInput', 'withAnimation: !this._isActive', 'withAnimation: true']],
  ['input-guard-loses-or-branch', [3, 'slider-input.ts', 'MatSliderThumb', '_onInput', 'this._slider.step || !this._isActive', 'this._slider.step && !this._isActive']],
  ['sibling-layout-hunk-changes-runtime', [3, 'slider-input.ts', 'MatSliderRangeThumb', 'getSibling', 'this._isEndThumb ?', '!this._isEndThumb ?']],
]) {
  assert.throws(() => replaySliderRangeSubject(mutatedMember(...args)), undefined, id);
  observations.push({id, result: 'rejected', kind: 'source-method-semantic-counterfactual'});
}
const semanticMutants = observations.length;
function negative(id, mutateBody, mutateEntry, replacement) {
  const activeBody = structuredClone(body), entry = structuredClone(entries[0]); mutateBody?.(activeBody); mutateEntry?.(entry);
  const bytes = Buffer.from(JSON.stringify(activeBody, null, 2) + '\n');
  if (id !== 'stale-report-identity') entry.source_check.evidence_report_sha256 = hash(bytes);
  const alteredRead = p => p === reportPath ? bytes : replacement?.(p) ?? read(p);
  assert.equal(sliderRangeEvidenceOk(activeBody, entry, alteredRead, productPaths, line), false, id);
  observations.push({id, result: 'rejected', kind: 'source-scope-admission'});
}
negative('wrong-line', b => { b.line = line === 'main' ? '21.x' : 'main'; });
negative('omitted-subject', b => { b.scope_sha_ids.pop(); });
negative('forged-hunk-judgment', b => { b.reviews[2].hunk_reviews[0].judgment = 'An unrelated but long rationale cannot replace the reviewed track and focus behavior.'.repeat(3); });
negative('forged-individual-decision', b => { b.reviews[0].decision = 'This sufficiently long generic marker claims completion without any substantive source ownership analysis.'.repeat(3); }, e => { e.reason = 'This sufficiently long generic marker claims completion without any substantive source ownership analysis.'.repeat(3); });
negative('stale-report-identity', null, e => { e.source_check.evidence_report_sha256 = '0'.repeat(64); });
negative('contradictory-top-level-patch-hash', null, e => { e.diff_sha256 = '0'.repeat(64); });
negative('ordinary-kind-cannot-bypass', null, e => { e.individual_proof.proof_kind = 'ordinary-review'; });
negative('inherited-verdict-cannot-bypass', null, e => { e.final_disposition = 'inherited'; });
negative('omitted-owned-value-context', b => { b.source_scope.owned_methods.shift(); });
negative('fabricated-floor-fix-presence', b => { b.source_scope.peers[1].active_input_animation.source_observation = 'post-fix'; });
const slider = 'projects/ngx-material-legacy/legacy-slider/slider.ts';
negative('modern-parent-introduced', null, null, p => p === slider ? Buffer.from(read(p).toString().replace('extends _MatSliderBase', 'extends MatSliderThumb')) : undefined);
negative('owned-pointer-settlement-lost', null, null, p => p === slider ? Buffer.from(replaceMember(read(p).toString(), 'MatLegacySlider', '_pointerUp', 'this._isSliding = null;', 'this._isSliding = \'pointer\';')) : undefined);
negative('modern-import-alias-introduced', null, null, p => p === 'projects/ngx-material-legacy/legacy-slider/public-api.ts' ? Buffer.concat([read(p), Buffer.from("\nimport {MatSlider as Renamed} from '@angular/material/slider';\n")]) : undefined);
negative('historical-template-mutated', null, null, p => p === 'projects/ngx-material-legacy/legacy-slider/slider.html' ? Buffer.concat([read(p), Buffer.from('<input type="range">')]) : undefined);
negative('stylesheet-subject-mutated', null, null, p => p === 'projects/ngx-material-legacy/legacy-slider/slider.scss' ? Buffer.concat([read(p), Buffer.from('\n.unrelated { color: red; }\n')]) : undefined);
negative('authenticated-original-capsule-mutated', null, null, p => p === 'compatibility/rc/slider-range-followup-subjects.json.gz' ? Buffer.concat([read(p), Buffer.from('\n')]) : undefined);
const helperMutants = observations.length - semanticMutants;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'slider-range-source-cli-'));
try {
  const seed = path.join(temp, 'seed.json'), file = path.join(temp, 'ledger.json');
  fs.writeFileSync(seed, JSON.stringify({commits: SLIDER_RANGE_SHAS.map(sha => ({sha})), fixture_only: true}));
  for (const [id, mutate, expectedSourceErrors] of [
    ['current-four-source-gates', null, 0],
    ['actual-cli-rejects-renamed-proof', e => { e.individual_proof.proof_kind = 'ordinary-review'; }, 1],
    ['actual-cli-rejects-patch-identity-contradiction', e => { e.diff_sha256 = '0'.repeat(64); }, 1],
  ]) {
    const rows = structuredClone(entries); mutate?.(rows[0]);
    fs.writeFileSync(file, JSON.stringify({entries: rows, g11_claim: 'not-passed', fixture_only: true}));
    const report = path.join(temp, id + '.json'), env = {...process.env};
    for (const name of Object.keys(env).filter(key => key.startsWith('RC_'))) delete env[name];
    const child = spawnSync(process.execPath, ['scripts/check-upstream-audit-disposition.mjs', '--admission', '--line', line,
      '--seed', seed, '--ledger', file, '--report', report], {cwd: root, env, encoding: 'utf8', timeout: 30000});
    assert.ok([0, 1].includes(child.status), child.stderr);
    const result = JSON.parse(fs.readFileSync(report));
    assert.equal(result.evidence_failures.length, expectedSourceErrors, id + ': ' + JSON.stringify(result.evidence_failures));
    if (expectedSourceErrors) assert.equal(result.evidence_failures[0].reason, 'invalid-slider-range-followup-scope');
    assert.equal(result.g11_claim, 'not-passed');
    observations.push({id, exit_code: child.status, source_gate_errors: result.evidence_failures.length,
      kind: 'actual-CLI-four-row-scope-fixture', whole_G11_qualification: false});
  }
} finally { fs.rmSync(temp, {recursive: true, force: true}); }
const report = {schema_version: 1, line, compiler: ts.version, individual_subjects: 4, original_files: 9, original_hunks: 15,
  tagged_owned_methods: 16, semantic_mutants_rejected: semanticMutants, helper_mutants_rejected: helperMutants,
  actual_CLI_source_binding_cases: 3, observations, actual_native_packed_browser_or_floor_qualified: false};
const out = process.argv.indexOf('--out'); if (out >= 0) fs.writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line, compiler: ts.version, individual_subjects: 4, semantic_mutants_rejected: semanticMutants,
  helper_mutants_rejected: helperMutants, actual_CLI_source_binding_cases: 3, actual_native_packed_browser_or_floor_qualified: false}));
