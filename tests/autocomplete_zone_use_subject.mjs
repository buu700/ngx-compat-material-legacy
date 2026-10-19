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
const core = await import('@angular/core'), layout = await import('@angular/cdk/layout');
const rx = await import('rxjs'), ops = await import('rxjs/operators'), {EventEmitter: NodeEvents} = await import('node:events');
const payload = JSON.parse(readFileSync(new URL('./autocomplete-zone-use-payload.json', import.meta.url)));
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
function fixture(js = payload.candidate, withWindow = true) {
  const emitter = new NodeEvents(), registrations = [], removals = [], callbackZones = [], wrapped = new Map(), forwarded = [], lookups = [];
  let foreignEvents = 0, borrowedDestructions = 0, destroyed = false, ownerDestroyed = false, attached = true, focused;
  const borrowed = {ngOnDestroy() {borrowedDestructions++;}};
  const injector = core.Injector.create({providers: [{provide: layout.BreakpointObserver, useValue: borrowed}]}), get = injector.get.bind(injector);
  injector.get = (...args) => {lookups.push(args); return get(...args);};
  const windowProtocol = {
    addEventListener(type, listener, options) {
      registrations.push({type, listener, options, inside: core.NgZone.isInAngularZone()});
      const callback = (...args) => {callbackZones.push(core.NgZone.isInAngularZone()); return listener(...args);};
      wrapped.set(listener, callback); emitter.on(type, callback);
    },
    removeEventListener(type, listener, options) {
      removals.push({type, listener, options}); const callback = wrapped.get(listener);
      if (callback) {emitter.off(type, callback); wrapped.delete(listener);}
    },
  };
  emitter.on('blur', () => foreignEvents++);
  const document = new EventTarget(); document.defaultView = withWindow ? windowProtocol : undefined;
  const native = {value: '', readOnly: false, disabled: false, focus() {focused = native; document.activeElement = native;}, contains: () => false};
  document.activeElement = focused = native;
  const stable = new rx.Subject(), detections = [], opened = [], closed = [], keys = new rx.Subject(), pointers = new rx.Subject(), detachments = new rx.Subject();
  const exports = {}, values = {Subject: rx.Subject, Subscription: rx.Subscription, defer: rx.defer, Observable: rx.Observable,
    merge: rx.merge, fromEvent: rx.fromEvent, observableOf: rx.of, delay: ops.delay, filter: ops.filter, map: ops.map,
    switchMap: ops.switchMap, take: ops.take, tap: ops.tap, startWith: ops.startWith, BreakpointObserver: layout.BreakpointObserver,
    focusedElementPierceShadowDom: () => focused, coerceBooleanProperty: value => value != null && String(value) !== 'false',
    afterLegacyRender: (supplied, suppliedInjector) => {forwarded.push({sameZone: supplied === zone, sameInjector: suppliedInjector === injector}); return stable;},
    MatOptionSelectionChange: class OptionEventProtocol {}, window: undefined, inject: core.inject};
  new Function('exports', ...Object.keys(values), js)(exports, ...Object.values(values));
  const view = {injector}, cdr = {detectChanges() {detections.push(core.NgZone.isInAngularZone());}};
  // This call deliberately has no ambient injection context. The supplied public injector owns the borrowed value.
  const instance = new exports.Replay(new core.ElementRef(native), {}, view, zone, cdr, () => {}, null, null,
    document, {change: () => rx.EMPTY}, null);
  assert.equal(instance._zone, zone, 'required-zone-retained');
  const query = new core.QueryList(), option = {value: 'alpha', onSelectionChange: new rx.Subject(), disabled: false}; query.reset([option]);
  const panel = {options: query, showPanel: true, autoActiveFirstOption: false, requireSelection: false,
    _keyManager: {tabOut: new rx.Subject(), setActiveItem() {}}, opened: new core.EventEmitter(), closed: new core.EventEmitter(),
    _latestOpeningTrigger: instance, _isOpen: true, _setVisibility() {this.showPanel = this.options.length > 0;}};
  panel.opened.subscribe(() => opened.push(core.NgZone.isInAngularZone())); panel.closed.subscribe(() => closed.push(core.NgZone.isInAngularZone()));
  Object.assign(instance, {autocomplete: panel, _positionStrategy: {reapplyLastPosition() {}}, _closingActionsSubscription: new rx.Subscription(),
    _overlayRef: {hasAttached: () => attached, detach() {attached = false; detachments.next();}, dispose() {attached = false;},
      updatePosition() {}, keydownEvents: () => keys, outsidePointerEvents: () => pointers, detachments: () => detachments,
      overlayElement: {contains: () => false}}});
  const destroy = () => {if (!destroyed) {destroyed = true; instance.ngOnDestroy();}};
  return {instance, injector, borrowed, lookups, registrations, removals, callbackZones, forwarded, emitter, panel, stable, detections, opened, closed,
    borrowedDestructions: () => borrowedDestructions, foreignEvents: () => foreignEvents,
    initialize() {zone.run(() => instance.ngAfterViewInit());},
    focus(value) {focused = document.activeElement = value ? native : null;},
    blur() {zone.run(() => emitter.emit('blur'));}, destroy,
    destroyOwner() {if (!ownerDestroyed) {ownerDestroyed = true; injector.destroy();}},
    cleanup() {destroy(); this.destroyOwner(); emitter.removeAllListeners(); stable.complete(); keys.complete(); pointers.complete(); detachments.complete(); option.onSelectionChange.complete(); query.destroy();}};
}
function construction(js = payload.candidate) {
  const f = fixture(js);
  try {
    assert.equal(f.instance._breakpointObserver, f.borrowed, 'same-borrowed-view-service');
    assert.equal(f.lookups.length, 1, 'one-public-view-lookup'); assert.deepEqual(f.lookups[0], [layout.BreakpointObserver]);
    f.destroy(); assert.equal(f.borrowedDestructions(), 0, 'child-cannot-destroy-borrowed-service');
    assert.equal(f.injector.get(layout.BreakpointObserver), f.borrowed, 'owner-service-remains-live');
    f.destroyOwner(); assert.equal(f.borrowedDestructions(), 1, 'actual-public-injector-owns-service-destruction');
  } finally {f.cleanup();}
}
function blurLifecycle(js = payload.candidate, registration = true) {
  const f = fixture(js);
  try {
    f.initialize(); assert.equal(f.registrations.length, 1); const registered = f.registrations[0];
    assert.equal(registered.type, 'blur'); assert.equal(registered.listener, f.instance._windowBlurHandler); assert.equal(registered.options, undefined);
    if (registration) assert.equal(registered.inside, false, 'blur-registration-outside-zone');
    f.instance._overlayAttached = false; f.focus(true); f.blur(); assert.equal(f.instance._canOpenOnNextFocus, false);
    f.focus(false); f.blur(); assert.equal(f.instance._canOpenOnNextFocus, true);
    f.instance._overlayAttached = true; f.focus(true); f.blur(); assert.equal(f.instance._canOpenOnNextFocus, true);
    assert.deepEqual(f.callbackZones, [false, false, false], 'actual-Node-listener-callback-captured-outside-zone');
    f.instance._overlayAttached = false; f.destroy();
    assert.equal(f.removals.length, 1); assert.equal(f.removals[0].listener, registered.listener, 'same-listener-removed');
    assert.equal(f.emitter.listenerCount('blur'), 1, 'only-foreign-listener-survives');
    f.instance._canOpenOnNextFocus = false; f.focus(false); f.blur();
    assert.equal(f.instance._canOpenOnNextFocus, false, 'destroyed-listener-cannot-change-state');
    assert.equal(f.callbackZones.length, 3); assert.equal(f.foreignEvents(), 4);
  } finally {f.cleanup();}
}
function absentWindowProtocol() {
  const f = fixture(payload.candidate, false);
  try {f.initialize(); assert.equal(f.registrations.length, 0); f.destroy(); assert.equal(f.removals.length, 0);}
  finally {f.cleanup();}
}
function reentry(js = payload.candidate) {
  const f = fixture(js), inside = mode === 'zoneful';
  try {
    f.panel.showPanel = false; f.instance._overlayAttached = true;
    zone.run(() => {f.instance._closingActionsSubscription = f.instance._subscribeToClosingActions();});
    assert.deepEqual(f.forwarded, [{sameZone: true, sameInjector: true}], 'same-zone-and-view-injector-forwarded');
    zone.runOutsideAngular(() => f.stable.next());
    assert.deepEqual(f.detections, [inside], 'view-update-reenters-zone'); assert.deepEqual(f.opened, [inside], 'opened-event-reenters-zone');
    zone.runOutsideAngular(() => f.instance.closePanel());
    assert.deepEqual(f.closed, [inside], 'closed-event-reenters-zone'); assert.equal(f.instance.panelOpen, false);
  } finally {f.cleanup();}
}
const cases = [], faults = [];
try {
  for (const [id, action] of [['current-required-service-and-borrowed-view-owner', construction],
    ['current-blur-registration-callback-and-removal', blurLifecycle], ['untouched16-blur-registration-callback-and-removal', () => blurLifecycle(payload.original)],
    ['current-absent-window-protocol', absentWindowProtocol], ['current-helper-forwarding-and-two-view-reentries', reentry]]) {
    action(); cases.push({id, result: 'pass'});
  }
  const reject = (id, action) => {assert.throws(action, error => error.code === 'ERR_ASSERTION'); faults.push({id, result: 'rejected'});};
  reject('blur-listener-retained', () => blurLifecycle(payload.faults.noRemove));
  reject('wrong-blur-listener-identity', () => blurLifecycle(payload.faults.wrongRemove));
  reject('wrong-borrowed-view-service', () => construction(payload.faults.wrongBorrowed));
  reject('child-destroys-borrowed-service', () => construction(payload.faults.destroyBorrowed));
  reject('wrong-helper-zone-forwarding', () => reentry(payload.faults.wrongForwarding));
  if (mode === 'zoneful') {
    reject('blur-registration-moved-inside-zone', () => blurLifecycle(payload.faults.insideBlur));
    reject('real-Node-blur-callback-moved-inside-zone', () => blurLifecycle(payload.faults.insideBlur, false));
    reject('view-update-left-outside-zone', () => reentry(payload.faults.outsideView));
    reject('closed-event-left-outside-zone', () => reentry(payload.faults.outsideClose));
  }
  console.log(JSON.stringify({cases, faults, genuine_public_application: !!app, genuine_public_zone_and_injector: true,
    real_Node_event_callback_capture: true, actual_legacy_node_DI_native_view_or_real_observer_executed: false}));
} finally {app?.destroy(); if (app) core.destroyPlatform();}
