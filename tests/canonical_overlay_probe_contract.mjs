/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete canonical browser probe with explicit DOM/timer/lab protocols. */
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {candidateInstallSpec, requiredProbeSource} from '../scripts/browser-required-cells.mjs';
import {tooltipAriaLifetimeFixture} from '../scripts/tooltip-aria-lifetime-fixture.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const good = {actual_directive_created: true, host_removed: true, initial_description_absent: true,
  pending_cleanup_clear: true, later_request_clear: true};
const raw = requiredProbeSource(), turn = () => new Promise(resolve => setImmediate(resolve));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture({observation = good, api = true, reject = false, show = true, source = raw,
    family = 'tooltip', automaticFocus = true, selectionApi = true, selectionEvent = true,
    selectionValue = true, selectionCloses = true, optionPresent = true,
    wrongTooltipPosition = false, noWidthGrowth = false, staleMessage = false} = {}) {
  let now = 0, next = 0, visible = false, calls = 0;
  const jobs = new Map(), surface = {className: '', setAttribute() {}}, window = {};
  window.__lab = {closeTransient() {visible = false; wider = false;}};
  if (api) window.__lab.runTooltipAriaLifetime = () => {
    calls++;
    if (reject) return Promise.reject(new Error('fixture operation failed'));
    return observation;
  };
  let menuVisible = false, autoVisible = false, selected = null;
  const item = {contains: node => node === item, focus() {throw new Error('manual focus would mask initialization');}};
  const input = {value: '', focus() {}, dispatchEvent() {autoVisible = true;}};
  const option = {click() {
    if (selectionEvent) selected = 'a';
    if (selectionValue) input.value = 'a';
    if (selectionCloses) autoVisible = false;
  }};
  const menuTrigger = {click() {menuVisible = true; if (automaticFocus) document.activeElement = item;}};
  let wider = false;
  const host = {focus() {}, scrollIntoView() {}, dispatchEvent() {visible = show;},
    getBoundingClientRect: () => ({left: 190, width: 20, bottom: 40})};
  const tip = {classList: {contains: name => name === 'mat-tooltip'},
    get textContent() {return wider && !staleMessage ? 'A longer tooltip message for repositioning' : 'Hello tip';},
    getBoundingClientRect: () => ({left: wider && !noWidthGrowth ? 100 : 175,
      top: wrongTooltipPosition ? 10 : 48, width: wider && !noWidthGrowth ? 200 : 50, height: 24})};
  if (selectionApi) window.__lab.readAutocompleteSelection = () => selected;
  const document = {getElementById: id => id === 'surface' ? surface : null,
    querySelector: selector => {
      if (selector === '#wrap-tooltip') return {};
      if (selector === '#wrap-menu' || selector === '#wrap-autocomplete') return {};
      if (selector === '#p-menu-trigger') return menuTrigger;
      if (selector === '.mat-menu-panel #p-menu-item') return menuVisible ? item : null;
      if (selector === '#p-auto') return input;
      if (selector === '.mat-autocomplete-panel .mat-option') return autoVisible && optionPresent ? option : null;
      if (selector === '.mat-autocomplete-panel') return autoVisible ? {} : null;
      if (selector === '#p-tooltip') return host;
      if (selector === '#p-tooltip-change') return {click() {wider = true;}};
      if (selector === '.mat-tooltip') return visible ? tip : null;
      return null;
    }, querySelectorAll: selector => selector === '.mat-tooltip' && visible ? [tip] : []};
  const context = {window, document, Promise, JSON, String, MouseEvent: class MouseEvent {},
    innerWidth: 800, innerHeight: 600, getComputedStyle: () => ({visibility: 'visible', display: 'block'}),
    FocusEvent: class FocusEvent {}, InputEvent: class InputEvent {}, KeyboardEvent: class KeyboardEvent {},
    Date: {now: () => now},
    setTimeout(callback, delay = 0) {const id = ++next; jobs.set(id, {callback, due: now + delay}); return id;},
    clearTimeout: id => jobs.delete(id)};
  runInNewContext(source, context);
  return {window, jobs, get calls() {return calls;}, begin() {window.__begin({family, state: 'default'});},
    async advance(ms) {
      const end = now + ms; let work = 0;
      while (true) {
        const nextJob = [...jobs].sort((a, b) => a[1].due - b[1].due)[0];
        if (!nextJob || nextJob[1].due > end) break;
        assert.ok(work++ < 100, 'timer protocol did not quiesce');
        now = nextJob[1].due; jobs.delete(nextJob[0]); nextJob[1].callback(); await turn();
      }
      now = end; await turn();
    }, status() {return window.__poll();}};
}
const cases = [];
async function check(id, operation) {await operation(); cases.push({id, result: 'pass'});}
await check('visible-tooltip-plus-complete-aria-observation', async () => {
  const f = fixture(); f.begin(); await f.advance(0);
  assert.equal(f.status().done, true); assert.equal(f.status().ok, true); assert.equal(f.calls, 1);
  assert.ok(f.status().evidence.includes('ARIA destruction'));
  assert.equal(f.jobs.size, 0, 'resolved operation releases timeout');
});
for (const observation of [null, {}, [], 'true', {...good, error: 'native failed'}]) {
  await check('reject-invalid-observation-' + cases.length, async () => {
    const f = fixture({observation}); f.begin(); await f.advance(0);
    assert.equal(f.status().done, true); assert.equal(f.status().ok, false);
  });
}
for (const key of Object.keys(good)) for (const value of [false, 'true', undefined]) {
  await check('reject-' + key + '-' + String(value), async () => {
    const f = fixture({observation: {...good, [key]: value}}); f.begin(); await f.advance(0);
    assert.equal(f.status().ok, false);
  });
}
await check('missing-lab-operation-cannot-credit-visible-tooltip', async () => {
  const f = fixture({api: false}); f.begin(); await f.advance(0);
  assert.equal(f.status().ok, false); assert.ok(f.status().evidence.includes('API missing'));
});
await check('rejected-operation-fails-and-releases-timeout', async () => {
  const f = fixture({reject: true}); f.begin(); await f.advance(0);
  assert.equal(f.status().ok, false); assert.equal(f.jobs.size, 0);
});
await check('unresolved-operation-cannot-credit-visible-tooltip', async () => {
  const f = fixture({observation: new Promise(() => {})}); f.begin(); await f.advance(0);
  assert.equal(f.status().done, false); await f.advance(1501);
  assert.equal(f.status().done, true); assert.equal(f.status().ok, false);
  assert.ok(f.status().evidence.includes('timed out'));
});
await check('missing-visible-tooltip-does-not-run-lifetime-operation', async () => {
  const f = fixture({show: false}); f.begin(); await f.advance(1600);
  assert.equal(f.status().ok, false); assert.equal(f.calls, 0);
});
for (const flag of ['wrongTooltipPosition', 'noWidthGrowth', 'staleMessage']) {
  await check('tooltip-rejects-' + flag, async () => {
    const f = fixture({[flag]: true}); f.begin(); await f.advance(1600);
    assert.equal(f.status().done, true); assert.equal(f.status().ok, false);
  });
}
async function replaced(source = raw) {
  let firstResolve, secondResolve, requests = 0;
  const first = new Promise(resolve => {firstResolve = resolve;});
  const second = new Promise(resolve => {secondResolve = resolve;});
  const f = fixture({source});
  f.window.__lab.runTooltipAriaLifetime = () => ++requests === 1 ? first : second;
  f.begin(); await f.advance(0); assert.equal(f.status().done, false);
  f.begin(); await f.advance(0); assert.equal(requests, 2);
  firstResolve(good); await turn();
  assert.equal(f.status().done, false, 'prior-tooltip-operation-cannot-credit-replacement');
  secondResolve({...good, pending_cleanup_clear: false}); await turn();
  assert.equal(f.status().done, true); assert.equal(f.status().ok, false); assert.equal(f.jobs.size, 0);
}
await check('prior-operation-cannot-credit-replacement-cell', () => replaced());
await check('menu-requires-automatic-focus', async () => {
  const f = fixture({family: 'menu'}); f.begin(); await f.advance(0);
  assert.equal(f.status().ok, true); assert.ok(f.status().evidence.includes('automatic first-item focus'));
});
await check('visible-menu-without-automatic-focus-fails', async () => {
  const f = fixture({family: 'menu', automaticFocus: false}); f.begin(); await f.advance(1600);
  assert.equal(f.status().ok, false);
});
await check('autocomplete-requires-dom-event-value-and-close', async () => {
  const f = fixture({family: 'autocomplete'}); f.begin(); await f.advance(0);
  assert.equal(f.status().ok, true); assert.ok(f.status().evidence.includes('public selection'));
});
for (const flag of ['selectionEvent', 'selectionValue', 'selectionCloses', 'selectionApi', 'optionPresent']) {
  await check('autocomplete-rejects-missing-' + flag, async () => {
    const f = fixture({family: 'autocomplete', [flag]: false}); f.begin(); await f.advance(1600);
    assert.equal(f.status().ok, false);
  });
}
const guardless = raw.replace('if (window.__status === request) finish(ok, evidence);', 'finish(ok, evidence);');
assert.notEqual(guardless, raw);
await assert.rejects(() => replaced(guardless), error => error.code === 'ERR_ASSERTION' &&
  error.message.startsWith('prior-tooltip-operation-cannot-credit-replacement'));
const bypass = raw.replace('legacyTooltipAriaLifetimeNativeOkay(observation),', 'true,');
assert.notEqual(bypass, raw);
const bypassed = fixture({source: bypass, observation: {...good, pending_cleanup_clear: false}});
bypassed.begin(); await bypassed.advance(0); assert.equal(bypassed.status().ok, true,
  'removing the canonical lifecycle gate must expose a false pass');
const fixtures = [];
for (const zoneless of [false, true]) {
  const spec = candidateInstallSpec({core: '22.1.7', material: '22.1.7', cdk: '22.1.7',
    rxjs: '7.8.2', typescript: ts.version, zone: '0.16.3', tslib: '2.8.1', sass: '1.104.1'}, zoneless);
  assert.equal(spec.labSource.split(tooltipAriaLifetimeFixture).length - 1, 1, 'one shared native fixture owner');
  assert.ok(spec.labSource.includes('runTooltipAriaLifetime()'));
  assert.ok(spec.labSource.includes('declarations: [LabRoot, DialogBody, LabForceInvalid, SnackMotionLab, TooltipAriaLifetimeLab, CaptureTooltipForAriaLifetime]'));
  const source = ts.createSourceFile('main.ts', spec.labSource, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  const result = ts.transpileModule(spec.labSource, {compilerOptions: {target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, experimentalDecorators: true}, reportDiagnostics: true});
  assert.equal(result.diagnostics.length, 0);
  fixtures.push({zoneless, generated_source_sha256: hash(spec.labSource), syntax: 'pass', actual_AOT_or_native: false});
}
const report = {schema_version: 1, cases, compiler: ts.version, generated_fixtures: fixtures,
  source_sha256: hash(raw), shared_fixture_sha256: hash(tooltipAriaLifetimeFixture),
  mutation_rejections: 2, native_executed: false, actual_legacy_node_DI_executed: false,
  scope: 'Complete canonical tooltip/menu/autocomplete browser probe with DOM/timer/lab protocols and real promise scheduling; generated consumer syntax only. No browser, directive/node DI, packed artifact, actual Angular compiler templates, or floor qualification.'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({cases: cases.length, mutation_rejections: 2, native_executed: false,
  generated_fixtures: fixtures.length, compiler: ts.version}));
