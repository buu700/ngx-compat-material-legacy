/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete browser probe with explicit DOM/CSS-event/clock protocols only. */
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {requiredProbeSource, candidateInstallSpec} from '../scripts/browser-required-cells.mjs';
const raw = requiredProbeSource(), turn = () => new Promise(resolve => setImmediate(resolve));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function fixture(fault = {}, source = raw) {
  const window = {}, jobs = new Map(), listeners = new Map(), opened = [];
  let now = 0, serial = 0, host = null, state = {dataset: {}}, mode = 'event';
  const schedule = (fn, ms = 0) => {const id = ++serial; jobs.set(id, {fn, due: now + ms}); return id;};
  const emit = (type, target, name) => {
    let stopped = false;
    const event = {target, animationName: name, isTrusted: !(fault.mode === mode && fault.untrustedCss),
      stopImmediatePropagation() {stopped = true;}};
    for (const fn of listeners.get(type) || []) fn(event);
    return stopped;
  };
  const button = {scrollIntoView() {}, getBoundingClientRect: () => ({x: 200, y: 100, width: 60, height: 30}),
    closest: selector => selector === '.mat-simple-snackbar-action' ? {} : null};
  const container = {classList: {contains: name => name === 'mat-snack-bar-container-animations-enabled' && !fault.disabledMotion},
    matches: selector => selector === '.mat-snack-bar-container', querySelector: () => button};
  const opener = {click() {
    mode = opened.length ? 'fallback' : 'event'; opened.push(mode);
    host = container; const start = now; let delivered = false;
    const applies = fault.mode === mode;
    state = {dataset: {entered: '0', dismissed: '0', completed: 'false', action: 'false'}};
    const enter = delivery => {
      if (delivered || (applies && fault.noEnter)) return;
      delivered = true;
      Object.assign(state.dataset, {entered: applies && fault.duplicateEnter ? '2' : '1', enterMs: String(now - start),
        enterDelivery: applies && fault.wrongDelivery ? 'other' : delivery});
    };
    schedule(() => {if (!emit('animationend', container, 'mat-legacy-snack-bar-enter')) enter('event');}, 150);
    schedule(() => enter('fallback'), applies && fault.earlyFallback ? 170 : 200);
  }};
  window.__lab = {closeTransient() {host = null;}};
  const surface = {setAttribute() {}};
  const document = {getElementById: id => id === 'surface' ? surface : id === 'snack-motion-state' ? state : null,
    querySelector(selector) {
      if (selector === '#wrap-snack') return {};
      if (selector === '#p-snack') return {click() {host = {};}};
      if (selector === '#snack-motion-open') return fault.noFixture ? null : opener;
      if (selector === '.mat-snack-bar-container') return host;
      if (selector === '.mat-snack-bar-container .mat-simple-snackbar-action button') return host ? button : null;
      return null;
    }, addEventListener(type, fn) {if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn);},
    removeEventListener(type, fn) {listeners.get(type)?.delete(fn);}};
  runInNewContext(source, {window, document, Promise, JSON, String, Number, Array,
    innerWidth: 1280, innerHeight: 900, performance: {now: () => now}, Date: {now: () => now},
    setTimeout: schedule, clearTimeout: id => jobs.delete(id)});
  function clickAction(request) {
    const applies = fault.mode === mode;
    assert.equal(request.x, 230); assert.equal(request.y, 115);
    const event = {target: button, isTrusted: !(applies && fault.untrustedAction)};
    for (const fn of listeners.get('click') || []) fn(event);
    let delivered = false;
    const exit = delivery => {
      if (delivered) return; delivered = true;
      Object.assign(state.dataset, {dismissed: applies && fault.duplicateDismiss ? '2' : '1',
        dismissedAt: String(now), completed: String(!(applies && fault.noComplete)),
        action: String(!(applies && fault.noAction)), exitDelivery: applies && fault.wrongDelivery ? 'other' : delivery});
      if (!(applies && fault.noRemoval)) host = null;
    };
    schedule(() => {if (!emit('animationend', container, 'mat-legacy-snack-bar-exit')) exit('event');}, 75);
    schedule(() => exit('fallback'), applies && fault.earlyFallback ? 100 : 125);
  }
  return {window, opened, listeners, begin() {window.__begin({family: 'snack-bar', state: 'default'});},
    async advance(ms, drive = true) {
      const end = now + ms; let iterations = 0;
      while (true) {
        const next = [...jobs].sort((a, b) => a[1].due - b[1].due)[0];
        if (!next || next[1].due > end) break;
        assert.ok(iterations++ < 400, 'clock protocol did not quiesce');
        now = next[1].due; jobs.delete(next[0]); next[1].fn(); await turn();
        const request = window.__poll().pointer;
        if (request && drive) {clickAction(request); assert.equal(window.__pointerDone(request.id), true);}
      }
      now = end; await turn();
    }};
}

const cases = [];
async function check(id, fault, expected, source = raw) {
  const f = fixture(fault, source); f.begin(); await f.advance(4000);
  const status = f.window.__poll();
  assert.equal(status.done, true, id); assert.equal(status.ok, expected, id + ': ' + status.evidence);
  assert.equal([...f.listeners.values()].reduce((n, set) => n + set.size, 0), 0, 'case-owned listeners released');
  if (expected) assert.deepEqual(f.opened, ['event', 'fallback']);
  cases.push({id, result: 'pass'});
}
await check('enabled-event-and-suppressed-css-fallback', {}, true);
await check('missing-enabled-fixture', {noFixture: true}, false);
await check('globally-disabled-motion-cannot-pass', {disabledMotion: true}, false);
for (const mode of ['event', 'fallback']) for (const key of ['untrustedCss', 'untrustedAction', 'duplicateEnter',
  'duplicateDismiss', 'noComplete', 'noAction', 'noRemoval', 'wrongDelivery', 'noEnter']) {
  await check(mode + '-reject-' + key, {mode, [key]: true}, false);
}
await check('fallback-deadlines-required', {mode: 'fallback', earlyFallback: true}, false);
const stale = fixture(); stale.begin(); await stale.advance(250, false);
const request = stale.window.__poll().pointer; assert.ok(request);
stale.begin(); assert.equal(stale.window.__pointerDone(request.id), false, 'replacement rejects old pointer acknowledgment');
assert.equal([...stale.listeners.values()].reduce((n, set) => n + set.size, 0), 0);
cases.push({id: 'replacement-releases-listeners-and-rejects-old-input', result: 'pass'});
const actionBypass = raw.replace('observation.trusted_action_events === 1 && legacySnackMotionNativeOkay(observation)',
  "legacySnackMotionNativeOkay({...observation, exit_ms: observation.mode === 'event' ? 75 : 125})");
assert.notEqual(actionBypass, raw);
const bypass = fixture({mode: 'event', untrustedAction: true}, actionBypass); bypass.begin(); await bypass.advance(4000);
assert.equal(bypass.window.__poll().ok, true, 'dropping trusted action/timestamp gate exposes false pass');
const completeBypass = raw.replace('legacySnackMotionNativeOkay(observation) ? observation : null',
  'legacySnackMotionNativeOkay({...observation, completed: true}) ? observation : null');
assert.notEqual(completeBypass, raw);
const incomplete = fixture({mode: 'event', noComplete: true}, completeBypass); incomplete.begin(); await incomplete.advance(4000);
assert.equal(incomplete.window.__poll().ok, true, 'dropping completion gate exposes unfinished dismissal');
const generated = [];
for (const zoneless of [false, true]) {
  const spec = candidateInstallSpec({core: '22.1.7', cdk: '22.1.7', material: '22.1.7', rxjs: '7.8.2',
    typescript: '6.0.3', zone: '0.16.3', tslib: '2.8.1', sass: '1.104.1'}, zoneless);
  for (const text of ['class SnackMotionLab', "useValue: 'enabled'", 'SnackMotionLab, TooltipAriaLifetimeLab',
    '<lab-snack-motion></lab-snack-motion>']) assert.ok(spec.labSource.includes(text), text);
  generated.push({zoneless, source_sha256: hash(spec.labSource)});
}
const report = {schema_version: 1, cases, mutation_rejections: 2, generated, complete_probe_sha256: hash(raw),
  native_executed: false, actual_legacy_executed: false,
  scope: 'Complete canonical snack probe under explicit DOM/CSS-event/clock protocols. Shared actual readers, trace ownership and predicate execute. No browser, actual Angular/legacy lifecycle, CSS engine, packed artifact, AOT or floors qualified.'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({cases: cases.length, mutation_rejections: 2, native_executed: false}));
