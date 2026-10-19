/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line, mode, production] = process.argv.slice(2);
if (production === 'true') globalThis.ngDevMode = false;
if (mode === 'zoneful') await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), keycodes = await import('@angular/cdk/keycodes'), rx = await import('rxjs'), ops = await import('rxjs/operators');
const payload = JSON.parse(readFileSync(new URL('./tooltip-select-zone-use-payload.json', import.meta.url)));
let app, zone;
if (line === 'original') zone = new core.NgZone({enableLongStackTrace: false});
else {
  const common = await import('@angular/common'), browser = await import('@angular/platform-browser');
  app = await browser.createApplication({providers: [core[mode === 'zoneful' ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'](),
    {provide: common.IMAGE_CONFIG, useValue: {disableImageSizeWarning: true, disableImageLazyLoadWarning: true}},
    {provide: core.DOCUMENT, useValue: {head: {children: []}}}, {provide: core.RendererFactory2, useValue: {createRenderer: () => ({})}}]});
  zone = app.injector.get(core.NgZone);
}
if (mode === 'zoneless') assert.equal(typeof globalThis.Zone, 'undefined');
const manual = app ? null : core.Injector.create({providers: []}), injector = app?.injector ?? manual;
const drain = () => new Promise(resolve => globalThis.setTimeout(resolve, 12));
function selectConstruction() {
  class TraitsProtocol {constructor(element, matcher, parent, group, ngControl) {this._elementRef = element; this.ngControl = ngControl; this.stateChanges = new rx.Subject(); this.disabled = false;}}
  const exports = {}, values = {TraitsProtocol, nextUniqueId: 0, Subject: rx.Subject, Observable: rx.Observable, defer: rx.defer, merge: rx.merge,
    EventEmitter: core.EventEmitter, filter: ops.filter, map: ops.map, startWith: ops.startWith, switchMap: ops.switchMap, take: ops.take,
    takeUntil: ops.takeUntil, distinctUntilChanged: ops.distinctUntilChanged};
  new Function('exports', ...Object.keys(values), payload.select)(exports, ...Object.values(values));
  for (const withInjector of [false, true]) {
    const control = {}, element = new core.ElementRef({}), args = [{}, {markForCheck() {}}, zone, {}, element, null, null, null, null, control, '0', () => ({}), {}, undefined];
    if (withInjector) args.push(injector); const instance = new exports.Replay(...args);
    try {assert.equal(instance._ngZone, zone, 'same-protected-select-zone'); assert.equal(instance._injector, withInjector ? injector : undefined);
      assert.equal(control.valueAccessor, instance); assert.equal(exports.Replay.length, 15);
    } finally {instance.ngOnDestroy();}
  }
}
function fixture(js = payload.tooltip) {
  const origins = new rx.Subject(), positions = new rx.Subject(), keys = new rx.Subject(), detachments = new rx.Subject(), pointers = new rx.Subject(), direction = new rx.Subject();
  const calls = [], descriptions = [], monitors = [], host = {style: {}, removeEventListener() {}}, element = new core.ElementRef(host);
  let visible = true, disposed = 0;
  const strategy = {positionChanges: positions};
  for (const name of ['withTransformOriginOn', 'withFlexibleDimensions', 'withViewportMargin', 'withScrollableContainers']) strategy[name] = () => strategy;
  const overlayRef = {detachments: () => detachments, outsidePointerEvents: () => pointers, keydownEvents: () => keys,
    addPanelClass() {}, dispose() {disposed++;}};
  const overlay = {position: () => ({flexibleConnectedTo: () => strategy}), create: () => overlayRef};
  const exports = {}, values = {Subject: rx.Subject, Observable: rx.Observable, take: ops.take, takeUntil: ops.takeUntil,
    afterTooltipRender: () => rx.EMPTY, passiveListenerOptions: {}, PANEL_CLASS: 'tooltip-panel', ESCAPE: keycodes.ESCAPE, hasModifierKey: keycodes.hasModifierKey};
  new Function('exports', ...Object.keys(values), js)(exports, ...Object.values(values));
  const instance = new exports.Replay(overlay, element, {getAncestorScrollContainers: () => []}, {injector}, zone, {isBrowser: false},
    {removeDescription() {}, describe(...args) {descriptions.push({inside: core.NgZone.isInAngularZone(), message: args[1]});}},
    {monitor(value) {monitors.push(value); return origins;}, stopMonitoring() {}}, () => ({}), {value: 'ltr', change: direction}, null, {});
  assert.equal(instance._ngZone, zone, 'same-tooltip-zone'); assert.equal(exports.Replay.length, 12);
  // Visibility, positioning and tooltip rendering remain explicit protocols; consumed zone callbacks stay intact.
  instance.show = () => calls.push({kind: 'show', inside: core.NgZone.isInAngularZone()});
  instance.hide = delay => calls.push({kind: 'hide', delay, inside: core.NgZone.isInAngularZone()});
  instance._updatePosition = instance._updateCurrentPositionClass = () => {};
  let destroyed = false;
  const destroy = () => {if (!destroyed) {destroyed = true; instance.ngOnDestroy();}};
  return {instance, calls, descriptions, monitors, origins, positions, keys, element, destroy, visible(value) {visible = value;},
    initialize() {instance.ngAfterViewInit();},
    overlay() {instance._createOverlay(); instance._tooltipInstance = {isVisible: () => visible, _handleBodyInteraction() {}};},
    cleanup() {destroy(); for (const stream of [origins, positions, keys, detachments, pointers, direction]) stream.complete();}, disposed: () => disposed};
}
function focusContexts(js = payload.tooltip) {
  const f = fixture(js), inside = mode === 'zoneful';
  try {f.initialize(); assert.deepEqual(f.monitors, [f.element]);
    zone.runOutsideAngular(() => {f.origins.next(null); f.origins.next('keyboard'); f.origins.next('mouse');});
    assert.deepEqual(f.calls, [{kind: 'hide', delay: 0, inside}, {kind: 'show', inside}], 'focus-callbacks-reenter-zone');
    f.destroy(); f.origins.next('keyboard'); assert.equal(f.calls.length, 2);
  } finally {f.cleanup();}
}
function clippedContext(js = payload.tooltip) {
  const f = fixture(js), change = clipped => ({connectionPair: {}, scrollableViewProperties: {isOverlayClipped: clipped}});
  try {f.overlay(); zone.runOutsideAngular(() => {f.positions.next(change(false)); f.visible(false); f.positions.next(change(true));}); assert.deepEqual(f.calls, []);
    f.visible(true); zone.runOutsideAngular(() => f.positions.next(change(true)));
    assert.deepEqual(f.calls, [{kind: 'hide', delay: 0, inside: mode === 'zoneful'}], 'clipped-overlay-callback-reenters-zone');
    f.destroy(); f.positions.next(change(true)); assert.equal(f.calls.length, 1); assert.equal(f.disposed(), 1);
  } finally {f.cleanup();}
}
function escapeContext(js = payload.tooltip) {
  const f = fixture(js); let prevented = 0, stopped = 0;
  const event = (keyCode, shiftKey = false) => ({keyCode, shiftKey, preventDefault() {prevented++;}, stopPropagation() {stopped++;}});
  try {f.overlay(); zone.runOutsideAngular(() => {f.keys.next(event(13)); f.keys.next(event(keycodes.ESCAPE, true)); f.visible(false); f.keys.next(event(keycodes.ESCAPE));});
    assert.deepEqual(f.calls, []); f.visible(true); zone.runOutsideAngular(() => f.keys.next(event(keycodes.ESCAPE)));
    assert.deepEqual(f.calls, [{kind: 'hide', delay: 0, inside: mode === 'zoneful'}], 'Escape-callback-reenters-zone'); assert.equal(prevented, 1); assert.equal(stopped, 1);
    f.destroy(); f.keys.next(event(keycodes.ESCAPE)); assert.equal(f.calls.length, 1);
  } finally {f.cleanup();}
}
async function ariaContext(js = payload.tooltip, cancel = false) {
  const f = fixture(js);
  try {f.instance._message = 'description'; zone.run(() => f.instance._syncAriaDescription('old'));
    if (cancel) f.destroy(); await drain();
    assert.deepEqual(f.descriptions, cancel ? [] : [{inside: false, message: 'description'}], cancel ? 'destroy-cancels-genuine-Promise-description' : 'description-Promise-captured-outside-zone');
  } finally {f.cleanup();}
}
const cases = [], faults = [];
try {
  for (const [id, action] of [['select-fourteen-and-fifteen-argument-service-identity', selectConstruction], ['tooltip-focus-reentry-and-destroy', focusContexts],
    ['tooltip-clipped-overlay-reentry-and-destroy', clippedContext], ['tooltip-Escape-reentry-and-destroy', escapeContext],
    ['tooltip-real-Promise-description-context', ariaContext], ['tooltip-destroy-cancels-real-Promise-description', () => ariaContext(payload.tooltip, true)]]) {
    await action(); cases.push({id, result: 'pass'});
  }
  const reject = async (id, action) => {await assert.rejects(async () => action(), error => error.code === 'ERR_ASSERTION'); faults.push({id, result: 'rejected'});};
  await reject('description-after-destroy', () => ariaContext(payload.faults.noAriaDestroy, true));
  if (mode === 'zoneful') {
    await reject('focus-hide-left-outside-zone', () => focusContexts(payload.faults.outsideFocusHide));
    await reject('focus-show-left-outside-zone', () => focusContexts(payload.faults.outsideFocusShow));
    await reject('clipped-hide-left-outside-zone', () => clippedContext(payload.faults.outsideClipped));
    await reject('Escape-hide-left-outside-zone', () => escapeContext(payload.faults.outsideEscape));
    await reject('description-Promise-moved-inside-zone', () => ariaContext(payload.faults.insideAria));
  }
  console.log(JSON.stringify({cases, faults, genuine_public_zones_and_current_providers: true, genuine_Promise_context_capture: true,
    actual_legacy_node_DI_native_tooltip_select_DOM_or_packed_executed: false}));
} finally {manual?.destroy(); app?.destroy(); if (app) core.destroyPlatform();}
