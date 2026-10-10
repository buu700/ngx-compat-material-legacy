/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Entire canonical probe; explicit DOM/geometry/control/clock protocols only. */
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {requiredProbeSource, candidateInstallSpec} from '../scripts/browser-required-cells.mjs';
const raw = requiredProbeSource(), turn = () => new Promise(resolve => setImmediate(resolve));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(family, faults = {}, source = raw) {
  const window = {}, jobs = new Map(), classes = name => ({contains: value => name === value});
  let now = 0, serial = 0, selected = 0, selectOpen = false, focused = false, touched = false;
  let outlineVisible = true, outlinePrefix = false, direction = 'ltr', scroll = 0, labelFocused = false;
  const clicked = [], surface = {setAttribute() {}};
  const labels = [0, 1].map(index => ({offsetLeft: index * 100, offsetWidth: 100,
    click() {clicked.push(index); selected = index;}}));
  const ink = {tagName: 'MAT-INK-BAR', classList: classes('mat-ink-bar'),
    computed: {visibility: faults.hiddenInk ? 'hidden' : 'visible'}};
  Object.defineProperty(ink, 'style', {get: () => ({left: String(selected * 100 +
    (faults.wrongInkAt === selected ? 1 : 0)) + 'px', width: (faults.zeroInk ? '0' : '100') + 'px'})});
  const group = {querySelectorAll(selector) {
    if (selector === 'mat-ink-bar.mat-ink-bar') return faults.noInk ? [] : [ink];
    if (selector === '.mat-tab-label.mat-tab-label-active') return [labels[selected]];
    if (selector === '.mat-tab-label') return labels;
    return [];
  }};
  const pane = {style: {fontSize: faults.paneFont || '20px'}};
  const option = {tagName: 'MAT-OPTION', classList: classes(faults.optionClass || 'mat-option'),
    computed: {fontSize: faults.optionFont || '20px'}, getBoundingClientRect: () => ({height: faults.optionHeight ?? 60})};
  const panel = {classList: classes('mat-select-panel'), computed: {fontSize: faults.panelFont || '20px'},
    querySelectorAll: () => faults.noOption ? [] : [option], closest: () => pane};
  const trigger = {computed: {fontSize: faults.triggerFont || '20px'}, click() {selectOpen = true;}};
  const chip = {focus() {document.activeElement = chip; focused = !faults.noChipFocus;}};
  const target = {focus() {
    if (!faults.noDomFocusMove || !focused) document.activeElement = target;
    if (focused) {focused = !!faults.blurStaysFocused; if (!faults.noTouched) touched = true;}
  }};
  const startWidth = () => (outlinePrefix ? 45 : 15) +
    (faults.wrongOutlineStart || (faults.wrongRtlStart && direction === 'rtl') ? 10 : 0);
  const container = {getBoundingClientRect: () => ({left: 0, right: 300, width: 300}),
    querySelectorAll: selector => [0, 1].map(() => ({style: {width: String(
      selector === '.mat-form-field-outline-start' ? startWidth() : faults.wrongOutlineGap ? 80 : 70) + 'px'}}))};
  const label = {children: [{offsetWidth: 80, getBoundingClientRect: () => ({left: outlinePrefix ? 50 : 20, right: 280})}]};
  const outline = {tagName: 'MAT-FORM-FIELD', classList: classes('mat-form-field-appearance-outline'),
    getBoundingClientRect: () => ({width: outlineVisible ? 300 : 0, height: outlineVisible ? 50 : 0}),
    get computed() {return {direction};}, querySelector(selector) {
      if (selector === '.mat-form-field-flex') return container;
      if (selector === '.mat-form-field-label') return label;
      if (selector === '.mat-form-field-prefix') return outlinePrefix ? {} : null;
      return null;
    }};
  const wrapper = {get computed() {return {display: outlineVisible ? 'block' : 'none'};}};
  const outlineButtons = {
    '#p-outline-prefix': {click() {clicked.push('prefix'); outlinePrefix = !faults.noOutlinePrefix;}},
    '#p-outline-hide': {click() {clicked.push('hide'); outlineVisible = !!faults.noOutlineHide; outlinePrefix = false;}},
    '#p-outline-show': {click() {clicked.push('show'); outlineVisible = !faults.noOutlineShow;}},
    '#p-outline-rtl': {click() {clicked.push('rtl'); direction = faults.noOutlineRtl ? 'ltr' : 'rtl';}},
  };
  const paginationLabel = {focus() {labelFocused = true; document.activeElement = paginationLabel;}};
  const pointerListeners = new Set();
  const before = {tagName: 'BUTTON', type: 'button', tabIndex: -1, disabled: true,
    getAttribute: () => 'true', click() {if (faults.disabledScroll) scroll = -10;}};
  const after = {tagName: faults.paginationNotButton ? 'DIV' : 'BUTTON', type: 'button', tabIndex: -1,
    disabled: false, getAttribute: () => 'true', scrollIntoView() {},
    getBoundingClientRect: () => ({x: labelFocused ? 100 : 500, y: 50,
      width: faults.noPaginationBox ? 0 : 20, height: 20}),
    addEventListener: (_type, fn) => pointerListeners.add(fn), removeEventListener: (_type, fn) => pointerListeners.delete(fn)};
  const paginationList = {get style() {return {transform: 'translateX(' + scroll + 'px)'};}};
  const pagination = {querySelectorAll: () => [before, after], querySelector(selector) {
    return {'.mat-tab-header-pagination-before': before, '.mat-tab-header-pagination-after': after,
      '.mat-tab-list': paginationList, '.mat-tab-label': paginationLabel}[selector] || null;
  }};
  const boundaryContainer = {getBoundingClientRect: () => ({left: 0, right: 200, width: 200}),
    querySelectorAll: selector => [0, 1].map(() => ({style: {width: String(
      selector === '.mat-form-field-outline-start' ? 45 : faults.boundaryClamp ? 140 : faults.boundaryShort ? 70 : 490) + 'px'}}))};
  const boundary = {tagName: 'MAT-FORM-FIELD', classList: classes('mat-form-field-appearance-outline'),
    offsetParent: faults.boundaryOffsetParent ? {} : null, getRootNode: () => faults.boundaryRoot ? {} : document,
    getBoundingClientRect: () => ({width: 200, height: 50}),
    computed: {direction: 'ltr', position: faults.boundaryPosition ? 'absolute' : 'fixed'},
    querySelector(selector) {
      if (selector === '.mat-form-field-flex') return boundaryContainer;
      if (selector === '.mat-form-field-label') return {children: [{offsetWidth: faults.boundaryShort ? 80 : 640,
        getBoundingClientRect: () => ({left: 50, right: 690})}]};
      if (selector === '.mat-form-field-prefix') return faults.boundaryPrefix ? null : {};
      if (selector === '.mat-form-field-suffix') return faults.boundarySuffix ? null : {};
      return null;
    }};
  const noLabel = {tagName: 'MAT-FORM-FIELD',classList:{contains: name => name==='mat-form-field'||
    name==='mat-form-field-can-float'||(name==='mat-form-field-has-label'&&!!faults.noLabelHasLabel)||
    (name==='mat-form-field-should-float'&&!faults.noLabelDoesNotFloat)},
    querySelector: () => ({disabled: !faults.noLabelEnabled,value: faults.noLabelWrongValue?'': 'off'}),
    querySelectorAll: () => faults.noLabelElement?[{}]:[]};
  window.__lab = {closeTransient() {},
    readChipFormState: () => ({focused, touched}), resetChipFormState() {touched = !!faults.touchedBefore;}};
  if (faults.noChipApi) delete window.__lab.readChipFormState;
  const document = {activeElement: null, getElementById: id => id === 'surface' ? surface : null,
    querySelector(selector) {
      if (selector === '#wrap-' + family) return {};
      if (selector === '#wrap-field' && family === 'form-field') return {};
      if (selector === '#p-field.mat-form-field #p-hint') return {};
      if (selector === '#p-field-disabled') return faults.noLabelMissing?null:noLabel;
      if (selector === '#p-outline') return outline;
      if (selector === '#p-outline-boundary') return faults.boundaryMissing ? null : boundary;
      if (selector === '#p-outline-wrapper') return wrapper;
      if (outlineButtons[selector]) return outlineButtons[selector];
      if (selector === '#p-tabs') return group;
      if (selector === '#p-pagination-tabs') return faults.noPagination ? null : pagination;
      if (selector === '#p-select .mat-select-trigger') return trigger;
      if (selector === '#p-chip-list .mat-chip') return faults.noChip ? null : chip;
      if (selector === '#p-field-input') return target;
      return null;
    },
    querySelectorAll: selector => selector === '.cdk-overlay-pane .mat-select-panel' && selectOpen ? [panel] : []};
  runInNewContext(source, {window, document, Promise, JSON, String, Number, Array, parseFloat,
    DOMMatrix: class {constructor(transform) {this.m41 = Number(transform.match(/translateX\(([-\d.]+)px\)/)[1]);}},
    innerWidth: 1280, innerHeight: 900, requestAnimationFrame(callback) {
      const id = ++serial; jobs.set(id, {callback, due: now + 16}); return id;
    },
    getComputedStyle: node => node.computed, Date: {now: () => now},
    setTimeout(callback, delay = 0) {const id = ++serial; jobs.set(id, {callback, due: now + delay}); return id;},
    clearTimeout: id => jobs.delete(id)});
  return {window, clicked, jobs, begin() {window.__begin({family, state: 'default'});}, status() {return window.__poll();},
    async advance(ms) {
      const end = now + ms; let iterations = 0;
      while (true) {
        const next = [...jobs].sort((a, b) => a[1].due - b[1].due)[0];
        if (!next || next[1].due > end) break;
        assert.ok(iterations++ < 250, 'clock protocol did not quiesce');
        now = next[1].due; jobs.delete(next[0]); next[1].callback(); await turn();
        const action = window.__poll().pointer;
        if (action && !faults.missingPointerDriver) {
          assert.equal(action.x, 110, 'pointer box must be measured after label focus');
          clicked.push('pointer');
          if (!faults.noPaginationScroll) scroll = -100;
          if (faults.pointerStealsFocus) document.activeElement = after;
          for (const fn of pointerListeners) fn({isTrusted: !faults.untrustedPointer});
          assert.equal(window.__pointerDone(action.id), true);
        }
      }
      now = end; await turn();
    }};
}
const cases = [];
async function check(id, family, faults, expected) {
  const f = fixture(family, faults); f.begin(); await f.advance(1700);
  assert.equal(f.status().done, true, id); assert.equal(f.status().ok, expected, id);
  if (family === 'tabs' && expected) assert.deepEqual(f.clicked, [0, 1, 0, 'pointer']);
  if (family === 'form-field' && expected) assert.deepEqual(f.clicked, ['prefix', 'hide', 'show', 'rtl']);
  cases.push({id, result: 'pass'});
}
await check('tabs-first-second-first', 'tabs', {}, true);
for (const faults of [{wrongInkAt: 0}, {wrongInkAt: 1}, {zeroInk: true}, {hiddenInk: true}, {noInk: true}]) {
  await check('tabs-reject-' + JSON.stringify(faults), 'tabs', faults, false);
}
for (const faults of [{paginationNotButton: true}, {disabledScroll: true}, {pointerStealsFocus: true},
    {noPaginationScroll: true}, {untrustedPointer: true}, {noPagination: true}, {noPaginationBox: true}]) {
  await check('pagination-reject-' + JSON.stringify(faults), 'tabs', faults, false);
}
await check('select-all-fonts-and-historical-height', 'select', {}, true);
for (const faults of [{triggerFont: '16px'}, {paneFont: '16px'}, {panelFont: '16px'},
    {optionFont: '16px'}, {optionHeight: 48}, {noOption: true}, {optionClass: 'mdc-list-item'}]) {
  await check('select-reject-' + JSON.stringify(faults), 'select', faults, false);
}
await check('chip-real-focus-and-control-touch-transition', 'chips', {}, true);
for (const faults of [{noChipFocus: true}, {blurStaysFocused: true}, {noTouched: true},
    {touchedBefore: true}, {noDomFocusMove: true}, {noChipApi: true}, {noChip: true}]) {
  await check('chips-reject-' + JSON.stringify(faults), 'chips', faults, false);
}
await check('outlined-prefix-hide-show-and-rtl', 'form-field', {}, true);
for (const faults of [{wrongOutlineStart: true}, {wrongOutlineGap: true}, {noOutlinePrefix: true},
    {noOutlineHide: true}, {noOutlineShow: true}, {noOutlineRtl: true}, {wrongRtlStart: true}]) {
  await check('outline-reject-' + JSON.stringify(faults), 'form-field', faults, false);
}
for (const faults of [{boundaryClamp: true}, {boundaryShort: true}, {boundaryPosition: true},
    {boundaryOffsetParent: true}, {boundaryRoot: true}, {boundaryPrefix: true}, {boundarySuffix: true}, {boundaryMissing: true}]) {
  await check('outline-boundary-reject-' + JSON.stringify(faults), 'form-field', faults, false);
}
for (const faults of [{noLabelHasLabel:true},{noLabelDoesNotFloat:true},{noLabelEnabled:true},
    {noLabelWrongValue:true},{noLabelElement:true},{noLabelMissing:true}]) {
  await check('tagged-no-label-state-reject-'+JSON.stringify(faults),'form-field',faults,false);
}
const bypassFont = raw.replace('return legacySelectFontNativeOkay(observation) ? observation : null;',
  'return observation.panel_count === 1 ? observation : null;');
assert.notEqual(bypassFont, raw);
const exposed = fixture('select', {paneFont: '16px'}, bypassFont); exposed.begin(); await exposed.advance(1700);
assert.equal(exposed.status().ok, true, 'removing the font gate must expose the former presence-only pass');
const bypassChip = raw.replace('finish(legacyChipBlurNativeOkay(observation),', 'finish(true,');
assert.notEqual(bypassChip, raw);
const wrongFocus = fixture('chips', {noDomFocusMove: true}, bypassChip); wrongFocus.begin(); await wrongFocus.advance(1700);
assert.equal(wrongFocus.status().ok, true, 'removing the complete blur observation gate must expose a false pass');
async function replacedWait(source = raw) {
  const f = fixture('chips', {noChipFocus: true}, source); f.begin(); await f.advance(0);
  assert.equal(f.status().done, false);
  f.window.__status = {done: false, ok: false, evidence: 'replacement cell'};
  await f.advance(1700);
  assert.equal(f.status().done, false, 'prior-wait-cannot-complete-replacement-cell');
}
await replacedWait(); cases.push({id: 'queued-wait-cannot-complete-replacement-cell', result: 'pass'});
const leakedWait = raw.replace('      if (window.__status !== request) return;', '');
assert.notEqual(leakedWait, raw);
await assert.rejects(() => replacedWait(leakedWait), error => error.code === 'ERR_ASSERTION' &&
  error.message.startsWith('prior-wait-cannot-complete-replacement-cell'));
const generated = [];
for (const zoneless of [false, true]) {
  const spec = candidateInstallSpec({core: '22.1.7', cdk: '22.1.7', material: '22.1.7',
    rxjs: '7.8.2', typescript: '6.0.3', zone: '0.16.3', tslib: '2.8.1', sass: '1.104.1'}, zoneless);
  assert.ok(spec.labSource.includes('readonly chipControl = new FormControl<string | null>(null)'));
  assert.ok(spec.labSource.includes('ReactiveFormsModule,'));
  assert.ok(spec.labSource.includes(JSON.stringify('id="p-tabs"').slice(1, -1)));
  assert.ok(spec.labSource.includes(JSON.stringify('style="font-size:20px"').slice(1, -1)));
  generated.push({zoneless, source_sha256: hash(spec.labSource)});
}
const report = {schema_version: 1, cases, mutation_rejections: 3, generated,
  complete_probe_sha256: hash(raw), native_executed: false, actual_legacy_or_forms_executed: false,
  scope: 'Complete canonical default tabs/select/chips/form-field browser probe under explicit DOM/style/geometry/control/timer protocols. Shared actual predicates and DOM readers execute; no browser, Angular/forms/legacy instances, packed artifact, AOT or consumer floors are qualified.'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({cases: cases.length, mutation_rejections: 3, native_executed: false}));
