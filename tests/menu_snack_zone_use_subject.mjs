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
const core = await import('@angular/core'), common = await import('@angular/common'), a11y = await import('@angular/cdk/a11y');
const rx = await import('rxjs'), ops = await import('rxjs/operators');
const payload = JSON.parse(readFileSync(new URL('./menu-snack-zone-use-payload.json', import.meta.url)));
let app, zone;
if (line === 'original') zone = new core.NgZone({enableLongStackTrace: false});
else {
  const browser = await import('@angular/platform-browser');
  app = await browser.createApplication({providers: [core[mode === 'zoneful' ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'](),
    {provide: common.IMAGE_CONFIG, useValue: {disableImageSizeWarning: true, disableImageLazyLoadWarning: true}},
    {provide: core.DOCUMENT, useValue: {head: {children: []}}}, {provide: core.RendererFactory2, useValue: {createRenderer: () => ({})}}]});
  zone = app.injector.get(core.NgZone);
}
if (mode === 'zoneless') assert.equal(typeof globalThis.Zone, 'undefined');
const documentToken = core.DOCUMENT ?? common.DOCUMENT;
const injector = core.Injector.create({providers: [{provide: documentToken, useValue: {querySelectorAll: () => []}}]});
const drain = () => new Promise(resolve => globalThis.setTimeout(resolve, 12));
function menuConstruction() {
  const exports = {};
  new Function('exports', 'QueryList', 'EventEmitter', 'Subject', 'Subscription', 'merge', 'startWith', 'switchMap', 'take',
    'FocusKeyManager', 'legacyAnimationsDisabled', 'menuPanelUid', 'ENTER_ANIMATION', 'EXIT_ANIMATION', payload.menu)
    (exports, core.QueryList, core.EventEmitter, rx.Subject, rx.Subscription, rx.merge, ops.startWith, ops.switchMap, ops.take,
      a11y.FocusKeyManager, () => false, 0, 'mat-legacy-menu-enter', 'mat-legacy-menu-exit');
  for (const withDetector of [false, true]) {
    const args = [new core.ElementRef({className: ''}), zone, {xPosition: 'after', yPosition: 'below', overlapTrigger: false}];
    if (withDetector) args.push({markForCheck() {}});
    const instance = new exports.Replay(...args);
    try {assert.equal(instance._ngZone, zone, 'same-required-menu-zone'); assert.equal(exports.Replay.length, 4);}
    finally {instance.ngOnDestroy();}
  }
}
function snackFixture(js = payload.snack) {
  const handles = new Map(), registrations = [], callbacks = [], announces = [], enters = [], detectorZones = [], attributeZones = [];
  let serial = 1, queries = 0, moves = 0, destroyed = false;
  const setTimeout = (callback, delay) => {
    assert.equal(delay, 150, 'historical-announcement-delay-requested'); const id = serial++;
    registrations.push({requested_ms: delay, inside: core.NgZone.isInAngularZone()});
    handles.set(id, globalThis.setTimeout(() => {handles.delete(id); callbacks.push(core.NgZone.isInAngularZone()); callback();}, 0)); return id;
  };
  const clearTimeout = id => {if (handles.has(id)) globalThis.clearTimeout(handles.get(id)); handles.delete(id);};
  const inert = {removeAttribute(name) {assert.equal(name, 'aria-hidden');}}, live = {appendChild(node) {assert.equal(node, inert); moves++;}};
  const host = {setAttribute(name, value) {assert.equal(name, 'mat-exit'); assert.equal(value, ''); attributeZones.push(core.NgZone.isInAngularZone());},
    querySelector(selector) {queries++; return selector === '[aria-hidden]' ? inert : selector === '[aria-live]' ? live : null;}};
  const exports = {};
  new Function('exports', 'PortalProtocol', 'inject', 'DOCUMENT', 'Subject', 'take', 'uniqueId', 'queueMicrotask', 'setTimeout', 'clearTimeout', js)
    (exports, class {}, core.inject, documentToken, rx.Subject, ops.take, 0, globalThis.queueMicrotask, setTimeout, clearTimeout);
  const instance = core.runInInjectionContext(injector, () => new exports.Replay(zone, new core.ElementRef(host),
    {markForCheck() {detectorZones.push(core.NgZone.isInAngularZone());}, detectChanges() {}}, {FIREFOX: false, isBrowser: false}, {politeness: 'polite'}));
  assert.equal(instance._ngZone, zone, 'same-required-snack-zone'); assert.equal(exports.Replay.length, 5);
  instance._onEnter.subscribe(() => enters.push(core.NgZone.isInAngularZone()));
  instance._onAnnounce.subscribe(() => announces.push(core.NgZone.isInAngularZone()));
  const destroy = () => {if (!destroyed) {destroyed = true; instance.ngOnDestroy();}};
  return {instance, registrations, callbacks, announces, enters, detectorZones, attributeZones, handles, destroy,
    counts: () => ({queries, moves}), cleanup() {destroy(); for (const handle of handles.values()) globalThis.clearTimeout(handle); handles.clear();}};
}
async function enterContext(kind, js = payload.snack) {
  const f = snackFixture(js);
  try {
    zone.runOutsideAngular(() => {
      if (kind === 'string') f.instance.onAnimationEnd('mat-legacy-snack-bar-enter');
      else if (kind === 'state') f.instance.onAnimationEnd({fromState: 'void', toState: 'visible'});
      else f.instance._notifyEnter();
    });
    assert.deepEqual(f.enters, [mode === 'zoneful'], 'enter-notification-reenters-zone-' + kind);
  } finally {f.cleanup(); await drain();}
}
async function exitContext(js = payload.snack) {
  const f = snackFixture(js);
  try {
    const result = zone.runOutsideAngular(() => f.instance.exit()); assert.equal(result, f.instance._onExit);
    assert.equal(f.instance._animationState, 'hidden'); assert.deepEqual(f.detectorZones, [mode === 'zoneful'], 'exit-detector-reenters-zone');
    assert.deepEqual(f.attributeZones, [mode === 'zoneful'], 'exit-host-write-reenters-zone');
  } finally {f.cleanup(); await drain();}
}
async function announcement(js = payload.snack, registration = true) {
  const f = snackFixture(js);
  try {
    zone.run(() => f.instance.enter());
    if (registration) assert.deepEqual(f.registrations, [{requested_ms: 150, inside: false}], 'announcement-registration-outside-zone');
    await drain(); assert.deepEqual(f.callbacks, [false], 'real-Node-announcement-callback-outside-zone');
    assert.deepEqual(f.announces, [false]); assert.deepEqual(f.counts(), {queries: 2, moves: 1}); assert.equal(f.handles.size, 0);
  } finally {f.cleanup(); await drain();}
}
async function canceledAnnouncement(js = payload.snack) {
  const f = snackFixture(js);
  try {
    zone.run(() => f.instance.enter()); f.destroy(); assert.equal(f.handles.size, 0, 'destroy-cancels-real-Node-announcement');
    await drain(); assert.deepEqual(f.callbacks, []); assert.deepEqual(f.announces, []); assert.deepEqual(f.counts(), {queries: 0, moves: 0});
  } finally {f.cleanup(); await drain();}
}
const cases = [], faults = [];
try {
  menuConstruction(); cases.push({id: 'whole-menu-constructor-three-and-four-arguments', result: 'pass'});
  for (const kind of ['string', 'state', 'notify']) {await enterContext(kind); cases.push({id: 'snack-enter-context-' + kind, result: 'pass'});}
  await exitContext(); cases.push({id: 'snack-exit-context', result: 'pass'});
  await announcement(); cases.push({id: 'real-Node-announcement-registration-and-callback', result: 'pass'});
  await canceledAnnouncement(); cases.push({id: 'destroy-cancels-real-Node-announcement', result: 'pass'});
  const reject = async (id, action) => {await assert.rejects(action, error => error.code === 'ERR_ASSERTION'); faults.push({id, result: 'rejected'});};
  await reject('missing-real-Node-announcement-cancel', () => canceledAnnouncement(payload.faults.noCancel));
  if (mode === 'zoneful') {
    for (const kind of ['string', 'state', 'notify']) await reject('enter-left-outside-zone-' + kind, () => enterContext(kind, payload.faults[kind + 'Outside']));
    await reject('exit-left-outside-zone', () => exitContext(payload.faults.exitOutside));
    await reject('announcement-registration-moved-inside-zone', () => announcement(payload.faults.insideAnnouncement));
    await reject('real-Node-announcement-callback-moved-inside-zone', () => announcement(payload.faults.insideAnnouncement, false));
  }
  console.log(JSON.stringify({cases, faults, genuine_public_zone_and_injector: true, genuine_public_application: !!app,
    actual_Node_task_capture: true, announcement_delay_deliberately_accelerated_from150ms_to0ms: true,
    actual_legacy_node_DI_native_CSS_browser_or_packed_executed: false}));
} finally {injector.destroy(); app?.destroy(); if (app) core.destroyPlatform();}
