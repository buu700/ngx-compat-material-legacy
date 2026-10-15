/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** One complete visual-thumb patch; retained legacy architecture, no inherited fix. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {analyzeSliderInputSubjects, reviewSliderInputScope} from './upstream-slider-input-scope.mjs';

const ts = createRequire(import.meta.url)('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex');
const gitHash = (kind, text) => createHash('sha1').update(`${kind} ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
export const SLIDER_THUMB_DESTROY_SHA = '41766330b6993628dc511bf8595b8d58dd495c22';
export const SLIDER_THUMB_DESTROY_ROLE = 'C04 individual modern visual-thumb early-destruction applicability';
export const SLIDER_THUMB_DESTROY_KIND = 'retained-legacy-slider-visual-thumb-exclusion';
export const SLIDER_THUMB_DESTROY_SUBJECT = 'compatibility/rc/slider-thumb-destroy-subject.json.gz';
const patchHash = '4947c3df7e1412dc60a015a4fa89b16c47256f2b717397590a73ac97988ddaa7';
const paths = ['src/material/slider/slider-thumb.ts', 'src/material/slider/slider.spec.ts'];
const candidate = 'projects/ngx-material-legacy/legacy-slider/slider.ts';
function method(text, className, name) {
  const file = ts.createSourceFile('source.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0);
  const cls = file.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === className); assert.ok(cls);
  const node = cls.members.find(n => ts.isMethodDeclaration(n) && n.name?.getText(file) === name); assert.ok(node);
  return ts.createPrinter({removeComments: true}).printNode(ts.EmitHint.Unspecified, node, file);
}
function prototype(methods) {
  const js = ts.transpileModule('class Replay {' + methods.join('\n') + '}',
    {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
  return new Function('activeEventOptions', js + ';return Replay.prototype;')({passive: false});
}
class WitnessTarget extends EventTarget {
  removed = [];
  removeEventListener(type, listener, options) {
    this.removed.push(type); return super.removeEventListener(type, listener, options);
  }
}
const modernEvents = ['pointermove', 'pointerdown', 'pointerup', 'pointerleave', 'focus', 'blur'];
function modernReplay(before, after) {
  const old = prototype([method(before, 'MatSliderVisualThumb', 'ngOnDestroy')]);
  const current = prototype([method(after, 'MatSliderVisualThumb', 'ngOnDestroy')]);
  assert.throws(() => old.ngOnDestroy.call({_sliderInputEl: undefined}), TypeError);
  assert.doesNotThrow(() => current.ngOnDestroy.call({_sliderInputEl: undefined}));
  let calls = 0; const input = new WitnessTarget(), listener = () => calls++;
  const receiver = {_sliderInputEl: input, _onPointerMove: listener, _onDragStart: listener,
    _onDragEnd: listener, _onMouseLeave: listener, _onFocus: listener, _onBlur: listener};
  for (const name of modernEvents) input.addEventListener(name, listener);
  current.ngOnDestroy.call(receiver);
  for (const name of modernEvents) input.dispatchEvent(new Event(name));
  assert.deepEqual(input.removed, modernEvents); assert.equal(calls, 0);
  return {original_undefined_input_throws: true, patched_undefined_input_safe: true,
    patched_real_EventTarget_removed: input.removed, callbacks_after_cleanup: calls,
    scope: 'Complete methods with explicit receiver, not component construction or browser execution'};
}
function legacyReplay(text, activeGlobals) {
  const proto = prototype(['ngOnDestroy', '_removeGlobalEvents'].map(name => method(text, 'MatLegacySlider', name)));
  const host = new WitnessTarget(), document = new WitnessTarget(), window = new WitnessTarget();
  let callbacks = 0, stopped = 0, unsubscribed = 0;
  const listener = () => callbacks++, elementRef = {nativeElement: host};
  const receiver = {_elementRef: elementRef, _document: document, _getWindow: () => window,
    _pointerDown: listener, _pointerMove: listener, _pointerUp: listener, _windowBlur: listener,
    _lastPointerEvent: {}, _focusMonitor: {stopMonitoring(ref) {assert.equal(ref, elementRef); stopped++;}},
    _dirChangeSubscription: {unsubscribe() {unsubscribed++;}}, _removeGlobalEvents: proto._removeGlobalEvents};
  const hostEvents = ['mousedown', 'touchstart'], documentEvents = ['mousemove', 'mouseup', 'touchmove', 'touchend', 'touchcancel'];
  for (const name of hostEvents) host.addEventListener(name, listener, {passive: false});
  if (activeGlobals) {
    for (const name of documentEvents) document.addEventListener(name, listener, {passive: false});
    window.addEventListener('blur', listener);
  }
  proto.ngOnDestroy.call(receiver);
  for (const name of hostEvents) host.dispatchEvent(new Event(name));
  for (const name of documentEvents) document.dispatchEvent(new Event(name));
  window.dispatchEvent(new Event('blur'));
  assert.equal(callbacks, 0); assert.equal(receiver._lastPointerEvent, null);
  assert.equal(stopped, 1); assert.equal(unsubscribed, 1);
  assert.deepEqual(host.removed, hostEvents); assert.deepEqual(document.removed, documentEvents); assert.deepEqual(window.removed, ['blur']);
  return {active_globals: activeGlobals, host_removed: host.removed, document_removed: document.removed,
    window_removed: window.removed, callbacks_after_cleanup: callbacks, pointer_cleared: true,
    focus_monitor_protocol_calls: stopped, direction_subscription_protocol_calls: unsubscribed};
}
export function reviewSliderThumbDestroyScope(readMember, productPaths, line) {
  const stored = readMember(SLIDER_THUMB_DESTROY_SUBJECT);
  assert.equal(hash(stored), '1783a1d9b6ced4c73e20c9fe1adf824c6b29490788ccf771a7fb910df83a9a07');
  const raw = gunzipSync(stored); assert.equal(hash(raw), '7cb58ea537ca89f25514758b224275c48a852e013b43b387330ff8e6a5a36b61');
  const subject = JSON.parse(raw); assert.equal(subject.sha, SLIDER_THUMB_DESTROY_SHA);
  assert.equal(gitHash('commit', subject.raw_commit), subject.sha);
  assert.deepEqual(subject.raw_commit.split('\n').filter(s => s.startsWith('parent ')), ['parent ' + subject.parent]);
  assert.equal(hash(subject.diff), patchHash); assert.equal(subject.diff_sha256, patchHash);
  assert.deepEqual(subject.members.map(m => m.path), paths);
  assert.deepEqual(subject.diff.split('\n').filter(s => s.startsWith('diff --git ')).map(s => s.split(' b/')[1]), paths);
  assert.equal(subject.diff.split('\n').filter(s => s.startsWith('@@')).length, 3);
  for (const member of subject.members) {
    for (const side of ['before', 'after']) {
      assert.equal(gitHash('blob', member[side].text), member[side].git_blob);
      assert.equal(hash(member[side].text), member[side].sha256);
    }
    assert.ok(subject.diff.includes('index ' + member.before.git_blob + '..' + member.after.git_blob));
  }
  const sourceScope = reviewSliderInputScope(readMember, productPaths, line);
  for (const path of productPaths()) assert.doesNotMatch(readMember(path).toString(),
    /@angular\/material\/slider(?:['"/]|$)|mat-slider-visual-thumb/, 'modern slider runtime route introduced');
  const companionPath = 'scripts/companion-bridge-peer-oracle.mjs', companionText = readMember(companionPath).toString();
  const companionFile = ts.createSourceFile(companionPath, companionText, ts.ScriptTarget.Latest, true);
  const roster = companionFile.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(companionFile) === 'COMPANIONS')?.initializer;
  assert.ok(roster && ts.isArrayLiteralExpression(roster) && roster.elements.every(ts.isStringLiteral));
  const companions = roster.elements.map(n => n.text);
  assert.deepEqual(companions, ['badge', 'bottom-sheet', 'button-toggle', 'datepicker', 'divider', 'expansion',
    'grid-list', 'icon', 'sidenav', 'stepper', 'sort', 'toolbar', 'tree']);
  const original = analyzeSliderInputSubjects(readMember).original.find(m => m.path.endsWith('slider.ts'));
  const current = readMember(candidate).toString();
  const cleanupContexts = ['ngOnDestroy', '_removeGlobalEvents'].map(name => {
    const before = method(original.text, 'MatLegacySlider', name), after = method(current, 'MatLegacySlider', name);
    assert.equal(before, after, 'legacy cleanup method changed'); return {name, sha256: hash(before)};
  });
  const legacy = [false, true].map(active => {
    const tagged = legacyReplay(original.text, active), owned = legacyReplay(current, active);
    assert.deepEqual(tagged, owned); return {tagged, owned};
  });
  return {schema_version: 1, line, sha: subject.sha, diff_sha256: patchHash, paths, hunks: 3,
    original_subject_sha256: hash(stored), retained_architecture: sourceScope, cleanup_contexts: cleanupContexts,
    excluded_runtime_routes: ['@angular/material/slider', 'mat-slider-visual-thumb'],
    current_companion_roster: {path: companionPath, sha256: hash(companionText), names: companions},
    modern_method_replay: modernReplay(subject.members[0].before.text, subject.members[0].after.text),
    legacy_method_replay: legacy, constructors_Angular_views_native_browser_packed_or_floor_executed: false,
    g11_claim: 'not-passed'};
}
export function sliderThumbDestroyEvidenceOk(body, entry, readMember, productPaths, line) {
  try {
    assert.equal(entry.sha, SLIDER_THUMB_DESTROY_SHA); assert.equal(body.sha, entry.sha);
    assert.equal(body.role, SLIDER_THUMB_DESTROY_ROLE); assert.equal(body.status, 'reviewed'); assert.equal(body.line, line);
    assert.equal(body.g11_claim, 'not-passed');
    assert.equal(body.diff_sha256, patchHash); assert.equal(hash(body.diff), patchHash);
    assert.deepEqual(body.source_scope, reviewSliderThumbDestroyScope(readMember, productPaths, line));
    assert.deepEqual(entry.files, paths); assert.deepEqual(body.paths, paths);
    assert.deepEqual(body.hunk_reviews.map(row => [row.path, row.hunk]), [[paths[0], 1], [paths[0], 2], [paths[1], 1]]);
    assert.ok(body.hunk_reviews.every(row => typeof row.decision === 'string' && row.decision.length > 50));
    assert.equal(body.prior_entry.sha, entry.sha); assert.equal(hash(JSON.stringify(body.prior_entry)), body.prior_entry_sha256);
    assert.deepEqual(entry.prior_dispositions.at(-1), body.prior_entry);
    assert.equal(body.final_disposition, 'not-applicable'); assert.equal(entry.final_disposition, body.final_disposition);
    assert.deepEqual(body.affected_branches, [line]); assert.deepEqual(entry.affected_branches, [line]);
    const proof = entry.individual_proof; assert.equal(proof.proof_kind, SLIDER_THUMB_DESTROY_KIND);
    assert.equal(proof.diff_sha256, patchHash); assert.equal(proof.review_depth, 'individual-compatibility');
    assert.equal(body.review_depth, proof.review_depth); assert.deepEqual(proof.affected_branches, [line]);
    assert.equal(proof.decision, body.decision); assert.ok(body.decision.length > 150);
    return true;
  } catch {return false;}
}
