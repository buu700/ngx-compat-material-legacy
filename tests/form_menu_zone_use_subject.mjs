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
const core = await import('@angular/core'), rx = await import('rxjs'), ops = await import('rxjs/operators');
const payload = JSON.parse(readFileSync(new URL('./form-menu-zone-use-payload.json', import.meta.url)));
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
const drain = () => new Promise(resolve => globalThis.setTimeout(resolve, 12));
function fieldFixture(js = payload.field, direction = true) {
  const render = new rx.Subject(), dir = {change: new rx.Subject(), value: 'ltr'}, registrations = [], updates = [], frames = new Map(), captured = [];
  const injector = app?.injector, forwarding = []; let serial = 0, hookSubscriptions = 0, hookTeardowns = 0;
  const afterFormFieldRender = (supplied, suppliedInjector) => {
    forwarding.push({sameZone: supplied === zone, sameInjector: suppliedInjector === injector, inside: core.NgZone.isInAngularZone()});
    return new rx.Observable(subscriber => {
      hookSubscriptions++; const subscription = render.subscribe(subscriber);
      return () => {hookTeardowns++; subscription.unsubscribe();};
    });
  };
  const requestAnimationFrame = callback => {
    const id = serial++, inside = core.NgZone.isInAngularZone(); registrations.push({id, inside}); captured.push(callback);
    frames.set(id, globalThis.setTimeout(() => {frames.delete(id); callback(0);}, 0)); return id;
  };
  const cancelAnimationFrame = id => {globalThis.clearTimeout(frames.get(id)); frames.delete(id);};
  class ColorProtocol {constructor(element) {this._elementRef = element; this.color = this.defaultColor = 'primary';}}
  const exports = {}, values = {ColorProtocol, Subject: rx.Subject, Subscription: rx.Subscription, merge: rx.merge,
    takeUntil: ops.takeUntil, afterFormFieldRender, legacyAnimationsDisabled: () => true,
    requestAnimationFrame, cancelAnimationFrame, nextUniqueId: 0, floatingLabelScale: .75, outlineGapPadding: 5};
  new Function('exports', ...Object.keys(values), js)(exports, ...Object.values(values));
  const native = {classList: {add() {}, remove() {}}}, cdr = {markForCheck() {}, detectChanges() {}};
  const instance = new exports.Replay(new core.ElementRef(native), cdr, direction ? dir : undefined,
    {appearance: 'outline'}, {isBrowser: true}, zone, 'NoopAnimations', injector);
  assert.equal(instance._ngZone, zone, 'form-required-service-identity'); assert.equal(instance._injector, injector);
  const query = () => {const result = new core.QueryList(); result.reset([]); return result;};
  Object.assign(instance, {_control: {errorState: false, setDescribedByIds() {}}, _prefixChildren: query(), _suffixChildren: query(),
    _hintChildren: query(), _errorChildren: query()});
  // Geometry remains owned by the authentic prior whole-field report. This supplement observes only call context/lifetime.
  instance.updateOutlineGap = () => updates.push(core.NgZone.isInAngularZone());
  zone.run(() => instance.ngAfterContentInit());
  return {instance, dir, render, forwarding, registrations, updates, frames, captured,
    counts: () => ({hookSubscriptions, hookTeardowns}), destroy() {instance.ngOnDestroy();},
    cleanup() {instance.ngOnDestroy(); render.complete(); dir.change.complete(); for (const handle of frames.values()) globalThis.clearTimeout(handle); frames.clear();}};
}
async function outsideRegistration(js = payload.field) {
  const f = fieldFixture(js);
  try {
    assert.deepEqual(f.forwarding, [{sameZone: true, sameInjector: true, inside: false}], 'field-helper-same-zone-outside');
    assert.deepEqual(f.counts(), {hookSubscriptions: 1, hookTeardowns: 0});
    zone.run(() => f.dir.change.next('rtl')); await drain();
    assert.deepEqual(f.registrations, [{id: 0, inside: false}], 'field-frame-registration-outside');
    assert.deepEqual(f.updates, [false], 'field-real-node-frame-adapter-callback-outside');
    assert.equal(f.frames.size, 0); assert.equal(f.instance._directionFrames.size, 0);
  } finally {f.cleanup();}
}
async function noDirection() {
  const f = fieldFixture(payload.field, false);
  try {f.dir.change.next('rtl'); await drain(); assert.equal(f.registrations.length, 0); assert.equal(f.updates.length, 0);
    assert.deepEqual(f.forwarding, [{sameZone: true, sameInjector: true, inside: false}]);
  } finally {f.cleanup();}
}
async function destroyCancellation(js = payload.field) {
  const f = fieldFixture(js);
  try {
    zone.run(() => f.dir.change.next('rtl')); assert.equal(f.frames.size, 1); f.destroy();
    assert.equal(f.frames.size, 0, 'field-destroy-cancels-frame'); assert.equal(f.instance._directionFrames.size, 0);
    await drain(); assert.equal(f.updates.length, 0); assert.equal(f.counts().hookTeardowns, 1, 'field-hook-unsubscribed');
    f.render.next(); f.dir.change.next('ltr'); assert.equal(f.registrations.length, 1); assert.equal(f.updates.length, 0);
  } finally {f.cleanup();}
}
async function capturedLateFrame(js = payload.field) {
  const f = fieldFixture(js);
  try {zone.run(() => f.dir.change.next('rtl')); f.destroy();
    for (const callback of f.captured) callback(0);
    assert.equal(f.updates.length, 0, 'field-late-frame-cannot-update');
  } finally {f.cleanup();}
}
function menuFixture(js, supplied = true) {
  const listeners = new Set(), host = {addEventListener: (_type, callback) => listeners.add(callback), removeEventListener: (_type, callback) => listeners.delete(callback)};
  const cdr = {markForCheck() {}}, injector = core.Injector.create({providers: [{provide: core.ChangeDetectorRef, useValue: cdr}]}), exports = {};
  class MenuProtocol {}
  new Function('exports', 'Subscription', 'EventEmitter', 'inject', 'ChangeDetectorRef', '_MatMenuBase',
    'passiveEventListenerOptions', 'isFakeTouchstartFromScreenReader', js)
    (exports, rx.Subscription, core.EventEmitter, core.inject, core.ChangeDetectorRef, MenuProtocol, {passive: true}, () => false);
  const args = [{}, new core.ElementRef(host), {}, () => {}, null, null, undefined, null];
  if (supplied) args.push(zone);
  const instance = core.runInInjectionContext(injector, () => new exports.Replay(...args));
  assert.equal(instance._ngZone, supplied ? zone : undefined, 'menu-optional-service-identity');
  assert.equal(instance._changeDetectorRef, cdr); assert.equal(listeners.size, 1);
  const positionEvents = new rx.Subject(); let subscriptions = 0, teardowns = 0;
  const position = {positionChanges: new rx.Observable(subscriber => {
    subscriptions++; const subscription = positionEvents.subscribe(subscriber); return () => {teardowns++; subscription.unsubscribe();};
  })};
  return {instance, position, positionEvents, counts: () => ({subscriptions, teardowns}),
    cleanup() {positionEvents.complete(); instance.ngOnDestroy(); assert.equal(listeners.size, 0); injector.destroy();}};
}
function positions(js = payload.menu, supplied = true) {
  const f = menuFixture(js, supplied), rows = [];
  try {
    f.instance._subscribeToPositions({setPositionClasses: (x, y) => rows.push({x, y, inside: core.NgZone.isInAngularZone()})}, f.position);
    assert.equal(f.counts().subscriptions, 1);
    for (const overlayX of ['start', 'end']) for (const overlayY of ['top', 'bottom']) {
      zone.runOutsideAngular(() => f.positionEvents.next({connectionPair: {overlayX, overlayY}}));
    }
    const inside = supplied && mode === 'zoneful';
    assert.deepEqual(rows, [{x: 'after', y: 'below', inside}, {x: 'after', y: 'above', inside},
      {x: 'before', y: 'below', inside}, {x: 'before', y: 'above', inside}], 'menu-position-mapping-and-reentry');
    f.positionEvents.complete(); assert.equal(f.counts().teardowns, 1);
    zone.runOutsideAngular(() => f.positionEvents.next({connectionPair: {overlayX: 'start', overlayY: 'top'}})); assert.equal(rows.length, 4);
  } finally {f.cleanup();}
}
function noPositionCallback(js = payload.menu) {
  const f = menuFixture(js);
  try {f.instance._subscribeToPositions({}, f.position); assert.equal(f.counts().subscriptions, 0, 'menu-no-callback-no-subscription');}
  finally {f.cleanup();}
}
const cases = [], faults = [];
try {
  for (const [id, action] of [['field-outside-registration-and-real-node-capture', outsideRegistration], ['field-without-direction', noDirection],
    ['field-destruction-cancels-frame-and-hook', destroyCancellation], ['field-captured-late-frame', capturedLateFrame]]) {
    await action(); cases.push({id, result: 'pass'});
  }
  for (const [name, js] of [['untouched16', payload.originalMenu], ['current', payload.menu]]) {
    positions(js, true); cases.push({id: name + '-menu-with-public-zone', result: 'pass'});
    positions(js, false); cases.push({id: name + '-menu-without-zone', result: 'pass'});
    noPositionCallback(js); cases.push({id: name + '-menu-without-position-callback', result: 'pass'});
  }
  const rejects = async (id, action) => {await assert.rejects(async () => action(), error => error.code === 'ERR_ASSERTION'); faults.push({id, result: 'rejected'});};
  await rejects('wrong-field-forwarded-zone', () => outsideRegistration(payload.faults.fieldWrongZone));
  await rejects('uncanceled-field-frame', () => destroyCancellation(payload.faults.fieldNoCancel));
  await rejects('late-field-frame-write', () => capturedLateFrame(payload.faults.fieldLateWrite));
  await rejects('wrong-menu-horizontal-class', () => positions(payload.faults.menuWrongX));
  await rejects('wrong-menu-vertical-class', () => positions(payload.faults.menuWrongY));
  await rejects('menu-subscription-without-callback', () => noPositionCallback(payload.faults.menuNoCallbackGuard));
  if (mode === 'zoneful') {
    await rejects('field-helper-inside-zone', () => outsideRegistration(payload.faults.fieldInsideHook));
    await rejects('field-frame-inside-zone', () => outsideRegistration(payload.faults.fieldInsideFrame));
    await rejects('menu-position-left-outside-zone', () => positions(payload.faults.menuOutside));
  }
  console.log(JSON.stringify({cases, faults, genuine_public_application: !!app, genuine_public_zone: true,
    real_Node_task_capture_with_protocol_RAF: true, actual_legacy_component_native_or_packed_executed: false}));
} finally {app?.destroy(); if (app) core.destroyPlatform();}
