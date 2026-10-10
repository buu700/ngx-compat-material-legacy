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
import {requiredProbeSource, candidateInstallSpec, candidateQualificationDefects} from '../scripts/browser-required-cells.mjs';
const checkboxObservation = {actual_checkbox_created: true, initialized: true, unchecked_between_clicks: true, live_checked: true,
  old_cleanup_elapsed_ms: 1150, newest_cleanup_elapsed_at_sample_ms: 250, survives_old_cleanup: true,
  latest_cleanup_elapsed_ms: 1100, latest_cleanup: true, animation_name: 'mat-checkbox-unchecked-checked-checkmark-path',
  animation_duration_ms: 180, trusted_animation_ends: 1, animation_elapsed_seconds: 0.18,
  pending_class_before_destroy: true, view_destroyed: true, host_removed: true, classes_cleared_on_destroy: true, late_class_writes: 0};
const rippleMotion = trigger => ({trigger, inside_angular:false, enter_ms:225,
  transition_properties:['opacity','transform'],transition_durations_ms:[225],
  ends:[{property:'transform',seconds:0.225,trusted:true},{property:'opacity',seconds:0.15,trusted:true}],hidden:true,removed:true});
const rippleObservation = {actual_owned_renderers:2,actual_view_created:true,trusted_mousedown_events:1,
  owned_listener_adds:2,owned_listener_removes:2,owned_listener_balance:0,trusted_order:['outer','inner'],
  native_motion:[rippleMotion('outer'),rippleMotion('inner')],missing_path_order:['outer','inner'],throwing_path_order:['outer','inner'],
  held_past_enter_fallback:true,missing_exit_fallback_removed:true,
  calls_after_removal:0,controlled_ripples_removed:true,view_destroyed:true,host_removed:true,
  uncaught_window_errors:0,actual_angular_hydration_replay_executed:false};
const raw = requiredProbeSource(), turn = () => new Promise(resolve => setImmediate(resolve));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(family, faults = {}, source = raw) {
  const window = {}, jobs = new Map(), classes = name => ({contains: value => name === value});
  let now = 0, serial = 0, selected = 0, selectOpen = false, focused = false, touched = false;
  let outlineVisible = true, outlinePrefix = false, direction = 'ltr', scroll = 0, labelFocused = false;
  const clicked = [], disposed = [], surface = {setAttribute() {}};
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
    prepareRippleFrame: () => faults.ripplePrepareReject ? Promise.reject(new Error('child bootstrap failed')) :
      faults.ripplePreparePending ? new Promise(() => {}) : Promise.resolve(),
    scrollRippleFrame() {}, rippleFrameTargetBox: () => ({x:100,y:80,width:faults.rippleNoGeometry?0:200,height:100}),
    disposeRippleFrame() {disposed.push('frame');},
    finishRippleFrame: () => faults.rippleFinishReject ? Promise.reject(new Error('child observation failed')) :
      faults.rippleFinishPending ? new Promise(() => {}) : Promise.resolve(faults.rippleMissingResult?undefined:
        {...rippleObservation,...(faults.rippleObservation||{})}),
    runCheckboxTimerLifetime: () => faults.checkboxReject ? Promise.reject(new Error('fixture failure')) :
      faults.checkboxPending ? new Promise(() => {}) : Promise.resolve(faults.checkboxMissingResult ? undefined :
        {...checkboxObservation, ...(faults.checkboxObservation || {})}),
    runFormFieldDirectionLifetime: () => faults.directionReject ? Promise.reject(new Error('fixture failure')) :
      faults.directionPending ? new Promise(() => {}) : Promise.resolve(faults.directionMissingResult ? undefined : {
        actual_field_created: !faults.directionNoField, actual_directionality_created: !faults.directionNoDir,
        initialized: !faults.directionUninitialized, live_updates: faults.directionNoLive ? 0 : faults.directionBadCount ? 1.5 : 1,
        queued_updates_before_destroy: faults.directionImmediate ? 1 : 0, view_destroyed: !faults.directionNotDestroyed,
        host_removed: !faults.directionHostRetained, late_updates: faults.directionLate ? 2 : 0}),
    readChipFormState: () => ({focused, touched}), resetChipFormState() {touched = !!faults.touchedBefore;}};
  if (faults.rippleMissingApi) delete window.__lab.prepareRippleFrame;
  if (faults.checkboxMissingApi) delete window.__lab.runCheckboxTimerLifetime;
  if (faults.directionMissingApi) delete window.__lab.runFormFieldDirectionLifetime;
  if (faults.noChipApi) delete window.__lab.readChipFormState;
  const document = {activeElement: null, getElementById: id => id === 'surface' ? surface : null,
    querySelector(selector) {
      if (selector === '#wrap-' + family) return {};
      if (selector === '#wrap-field' && family === 'form-field') return {};
      if (selector === '#p-core.mat-pseudo-checkbox-checked') return {};
      if (selector === '#p-checkbox.mat-checkbox') return {};
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
  return {window, clicked, disposed, jobs, begin() {window.__begin({family, state: 'default'});}, status() {return window.__poll();},
    async advance(ms) {
      const end = now + ms; let iterations = 0;
      while (true) {
        const next = [...jobs].sort((a, b) => a[1].due - b[1].due)[0];
        if (!next || next[1].due > end) break;
        assert.ok(iterations++ < 250, 'clock protocol did not quiesce');
        now = next[1].due; jobs.delete(next[0]); next[1].callback(); await turn();
        const action = window.__poll().pointer;
        if (action && !faults.missingPointerDriver) {
          if (family === 'core') {
            assert.equal(action.x,200,'owned ripple iframe coordinate must be translated');assert.equal(action.y,130);
          } else {
            assert.equal(action.x, 110, 'pointer box must be measured after label focus');
            if (!faults.noPaginationScroll) scroll = -100;
            if (faults.pointerStealsFocus) document.activeElement = after;
            for (const fn of pointerListeners) fn({isTrusted: !faults.untrustedPointer});
          }
          clicked.push('pointer');
          assert.equal(window.__pointerDone(action.id), true);
        }
      }
      now = end; await turn();
    }};
}
const cases = [];
async function check(id, family, faults, expected) {
  const f = fixture(family, faults); f.begin(); await f.advance(family === 'core' ? 6200 : family === 'checkbox' ? 4700 : 1700);
  assert.equal(f.status().done, true, id); assert.equal(f.status().ok, expected, id);
  if (family === 'core' && !faults.rippleMissingApi) assert.equal(f.disposed.length,1,id+' must dispose owned frame');
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
for (const faults of [{directionReject:true},{directionPending:true},{directionMissingResult:true},
    {directionNoField:true},{directionNoDir:true},{directionUninitialized:true},{directionNoLive:true},
    {directionBadCount:true},{directionImmediate:true},{directionNotDestroyed:true},
    {directionHostRetained:true},{directionLate:true},{directionMissingApi:true}]) {
  await check('direction-lifetime-reject-'+JSON.stringify(faults),'form-field',faults,false);
}
await check('checkbox-complete-timer-and-native-animation-observation', 'checkbox', {}, true);
for (const field of Object.keys(checkboxObservation)) {
  await check('checkbox-reject-missing-' + field, 'checkbox', {checkboxObservation: {[field]: undefined}}, false);
}
for (const faults of [{checkboxReject:true}, {checkboxPending:true}, {checkboxMissingResult:true}, {checkboxMissingApi:true},
  {checkboxObservation:{old_cleanup_elapsed_ms:999}}, {checkboxObservation:{newest_cleanup_elapsed_at_sample_ms:1000}},
  {checkboxObservation:{latest_cleanup_elapsed_ms:999}}, {checkboxObservation:{animation_duration_ms:100}},
  {checkboxObservation:{trusted_animation_ends:0}}, {checkboxObservation:{late_class_writes:1}}]) {
  await check('checkbox-reject-'+JSON.stringify(faults), 'checkbox', faults, false);
}
const bypassCheckbox = raw.replace('finish(legacyCheckboxTimerLifetimeNativeOkay(lifetime),', 'finish(true,');
assert.notEqual(bypassCheckbox, raw);
const leakedCheckbox = fixture('checkbox', {checkboxObservation:{late_class_writes:1}}, bypassCheckbox);
leakedCheckbox.begin(); await leakedCheckbox.advance(4700);
assert.equal(leakedCheckbox.status().ok, true, 'removing checkbox lifetime gate must expose a late-write false pass');
const replacedCheckbox = fixture('checkbox', {checkboxPending:true});
replacedCheckbox.begin(); await replacedCheckbox.advance(0);
assert.equal(replacedCheckbox.status().done, false);
replacedCheckbox.window.__status = {done:false, ok:false, evidence:'replacement checkbox cell'};
await replacedCheckbox.advance(4700);
assert.equal(replacedCheckbox.status().done, false, 'pending checkbox lifetime cannot complete replacement cell');
cases.push({id:'checkbox-lifetime-timeout-cannot-complete-replacement-cell',result:'pass'});
await check('core-owned-ripple-complete-native-observation','core',{},true);
for (const field of Object.keys(rippleObservation)) {
  await check('core-ripple-reject-missing-'+field,'core',{rippleObservation:{[field]:undefined}},false);
}
for (const faults of [{ripplePrepareReject:true},{ripplePreparePending:true},{rippleFinishReject:true},{rippleFinishPending:true},
  {rippleMissingResult:true},{rippleMissingApi:true},{rippleNoGeometry:true},
  {rippleObservation:{trusted_order:['inner','outer']}},{rippleObservation:{owned_listener_balance:1}},
  {rippleObservation:{native_motion:[{...rippleMotion('outer'),ends:[]},rippleMotion('inner')]}},
  {rippleObservation:{native_motion:[{...rippleMotion('outer'),enter_ms:0},rippleMotion('inner')]}},
  {rippleObservation:{native_motion:[{...rippleMotion('outer'),inside_angular:true},rippleMotion('inner')]}},
  {rippleObservation:{calls_after_removal:1}},{rippleObservation:{uncaught_window_errors:1}},
  {rippleObservation:{held_past_enter_fallback:false}},{rippleObservation:{missing_exit_fallback_removed:false}},
  {rippleObservation:{actual_angular_hydration_replay_executed:true}}]) {
  await check('core-ripple-reject-'+JSON.stringify(faults),'core',faults,false);
}
const bypassRipple = raw.replace('finish(legacyRippleDelegationLifetimeNativeOkay(ripple),','finish(true,');
assert.notEqual(bypassRipple,raw);
const leakedRipple = fixture('core',{rippleObservation:{owned_listener_balance:1}},bypassRipple);
leakedRipple.begin();await leakedRipple.advance(6200);assert.equal(leakedRipple.status().ok,true,'removing owned ripple gate exposes listener-leak false pass');
const replacedRipple = fixture('core',{ripplePreparePending:true});replacedRipple.begin();await replacedRipple.advance(0);
assert.equal(replacedRipple.status().done,false);replacedRipple.window.__status={done:false,ok:false,evidence:'replacement core cell'};
await replacedRipple.advance(6200);assert.equal(replacedRipple.status().done,false,'obsolete ripple preparation cannot complete replacement cell');
cases.push({id:'core-ripple-prepare-timeout-cannot-complete-replacement-cell',result:'pass'});
const bypassLifetime = raw.replace('finish(legacyFormFieldDirectionLifetimeNativeOkay(lifetime),', 'finish(true,');
assert.notEqual(bypassLifetime, raw);
const lateDirection = fixture('form-field', {directionLate:true}, bypassLifetime);
lateDirection.begin(); await lateDirection.advance(1700);
assert.equal(lateDirection.status().ok, true, 'removing direction lifetime gate must expose a late-update false pass');
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
const replacedLifetime = fixture('form-field', {directionPending:true});
replacedLifetime.begin(); await replacedLifetime.advance(0);
assert.equal(replacedLifetime.status().done, false);
replacedLifetime.window.__status = {done:false, ok:false, evidence:'replacement field cell'};
await replacedLifetime.advance(1700);
assert.equal(replacedLifetime.status().done, false, 'pending field lifetime cannot complete replacement cell');
cases.push({id:'field-lifetime-timeout-cannot-complete-replacement-cell',result:'pass'});
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
  assert.ok(spec.labSource.includes('runFormFieldDirectionLifetime()'));
  assert.ok(spec.labSource.includes('runCheckboxTimerLifetime()'));
  assert.ok(spec.labSource.includes('prepareRippleFrame()'));
  assert.ok(spec.labSource.includes('legacyRippleOnly'));
  assert.ok(spec.labSource.includes('disposeRippleDelegation()'));
  assert.ok(spec.labSource.includes('new LegacyRippleRenderer('));
  assert.ok(spec.labSource.includes('CaptureCheckboxTimerLifetime,'));
  assert.ok(spec.labSource.includes('afterNextRender(() =>'));
  assert.deepEqual(candidateQualificationDefects(spec), []);
  assert.ok(spec.labSource.includes(JSON.stringify('id="p-tabs"').slice(1, -1)));
  assert.ok(spec.labSource.includes(JSON.stringify('style="font-size:20px"').slice(1, -1)));
  generated.push({zoneless, source_sha256: hash(spec.labSource)});
}
const report = {schema_version: 1, cases, mutation_rejections: 6, generated,
  complete_probe_sha256: hash(raw), native_executed: false, actual_legacy_or_forms_executed: false,
  scope: 'Complete canonical default tabs/select/chips/form-field/checkbox/core browser probe under explicit DOM/style/geometry/control/timer protocols. Shared actual predicates and DOM readers execute; no browser, Angular/forms/legacy instances, packed artifact, AOT or consumer floors are qualified.'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({cases: cases.length, mutation_rejections: 6, native_executed: false}));
