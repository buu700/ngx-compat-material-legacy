/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public zones; native event/resize objects are explicit protocols. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line, mode, production] = process.argv.slice(2);
if (production === 'true') globalThis.ngDevMode = false;
if (mode === 'zoneful') await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), rx = await import('rxjs'), ops = await import('rxjs/operators');
const payload = JSON.parse(readFileSync(new URL('./ng-zone-remaining-payload.json', import.meta.url)));
let app, zone;
if (line === 'original') zone = new core.NgZone({enableLongStackTrace: false});
else {
  const common = await import('@angular/common'), browser = await import('@angular/platform-browser');
  app = await browser.createApplication({providers: [
    core[mode === 'zoneful' ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'](),
    {provide: common.IMAGE_CONFIG, useValue: {disableImageSizeWarning: true, disableImageLazyLoadWarning: true}},
    {provide: core.DOCUMENT, useValue: {head: {children: []}}},
    {provide: core.RendererFactory2, useValue: {createRenderer: () => ({})}},
  ]});
  zone = app.injector.get(core.NgZone);
  if (mode === 'zoneless') assert.equal(typeof globalThis.Zone, 'undefined');
}
const zoneful = mode === 'zoneful', inZone = () => core.NgZone.isInAngularZone();
const drain = () => new Promise(resolve => setTimeout(resolve, 0));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const cases = [], mutations = [];
async function check(id, action) {await action(); cases.push({id, result: 'pass'});}
function load(js) {
  const exports = {};
  new Function('exports', 'require', js)(exports, spec => {
    if (spec === '@angular/core') return core;
    if (spec === 'rxjs') return rx;
    if (spec === 'rxjs/operators') return ops;
    if (spec === '@angular/cdk/platform') return {Platform: class PlatformProtocol {}};
    throw new Error('unreviewed helper dependency ' + spec);
  });
  return exports;
}
async function resize(js = payload.resize) {
  const previous = globalThis.ResizeObserver, observers = [], got = [], registrations = [];
  class ResizeObserverProtocol {
    constructor(callback) {this.callback = callback; this.disconnects = 0; observers.push(this);}
    observe(element) {registrations.push({element, inside: inZone()});}
    disconnect() {this.disconnects++;}
  }
  globalThis.ResizeObserver = ResizeObserverProtocol;
  let subscription;
  try {
    const helper = load(js).ownedHeaderResize, element = {};
    zone.run(() => {subscription = helper(element, zone).subscribe(value => got.push(value));});
    assert.deepEqual(registrations, [{element, inside: false}], 'resize-registers-outside-zone');
    const entry = [{target: element}];
    observers[0].callback(entry); assert.equal(got[0], entry);
    subscription.unsubscribe();
    assert.equal(observers[0].disconnects, 1, 'resize-unsubscribe-disconnects');
    observers[0].callback([{target: element}]);
    assert.equal(got.length, 1, 'queued-resize-after-unsubscribe-is-ignored');
    subscription.unsubscribe(); assert.equal(observers[0].disconnects, 1);
    delete globalThis.ResizeObserver;
    let complete = 0;
    helper(element, zone).subscribe({next: () => assert.fail('absent resize observer emitted'), complete: () => complete++});
    assert.equal(complete, 1, 'absent-resize-observer-completes');
  } finally {
    subscription?.unsubscribe();
    if (previous === undefined) delete globalThis.ResizeObserver; else globalThis.ResizeObserver = previous;
  }
}
async function viewport(js = payload.viewport) {
  const Type = load(js)._LegacyViewport, target = new EventTarget(), registrations = [], removals = [];
  Object.assign(target, {innerWidth: 640, innerHeight: 480});
  const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
  target.addEventListener = (name, listener) => {registrations.push({name, inside: inZone()}); add(name, listener);};
  target.removeEventListener = (name, listener) => {removals.push(name); remove(name, listener);};
  const platform = {isBrowser: true}, document = {defaultView: target};
  platform.ngOnDestroy = document.ngOnDestroy = () => assert.fail('borrowed dependency destroyed');
  let instance, subscription, completed = 0;
  const got = [];
  try {
    zone.run(() => {instance = new Type(platform, zone, document);});
    assert.deepEqual(registrations, [{name: 'resize', inside: false}, {name: 'orientationchange', inside: false}],
      'viewport-registers-outside-zone');
    assert.deepEqual(instance.getViewportSize(), {width: 640, height: 480});
    subscription = instance.change(0).subscribe({next: event => got.push(event.type), complete: () => completed++});
    target.innerWidth = 820; target.dispatchEvent(new Event('resize'));
    assert.deepEqual(got, ['resize']);
    await delay(30);
    assert.deepEqual(instance.getViewportSize(), {width: 820, height: 480});
    instance.ngOnDestroy();
    assert.deepEqual(removals, ['resize', 'orientationchange'], 'viewport-destroy-removes-listeners');
    assert.equal(completed, 1, 'viewport-destroy-completes-root-stream');
    target.dispatchEvent(new Event('orientationchange')); assert.deepEqual(got, ['resize']);
  } finally {subscription?.unsubscribe(); instance?.ngOnDestroy(); await drain();}
}
try {
  await check('run-is-synchronous-preserves-return-and-reenters', async () => {
    assert.equal(inZone(), false);
    const receiver = {value: 3};
    const result = zone.run(function(value) {assert.equal(this, receiver); assert.equal(inZone(), zoneful);
      assert.equal(zone.isStable, !zoneful); return this.value + value;}, receiver, [4]);
    assert.equal(result, 7); assert.equal(inZone(), false); await drain();
  });
  await check('run-rethrows-the-identical-error', async () => {
    const error = new Error('owned callback failure'), errors = [];
    const subscription = zone.onError.subscribe(value => errors.push(value));
    try {assert.throws(() => zone.run(() => {throw error;}), value => value === error); await drain();
      assert.deepEqual(errors, []);} finally {subscription.unsubscribe();}
  });
  await check('outside-tasks-stay-outside-and-run-tasks-stay-inside', async () => {
    const observations = [];
    zone.run(() => {
      const result = zone.runOutsideAngular(() => {
        assert.equal(inZone(), false);
        Promise.resolve().then(() => observations.push(['outside-promise', inZone()]));
        setTimeout(() => observations.push(['outside-timer', inZone()]), 0);
        return 11;
      });
      assert.equal(result, 11); assert.equal(inZone(), zoneful);
      Promise.resolve().then(() => observations.push(['inside-promise', inZone()]));
    });
    await drain();
    assert.deepEqual(observations, [['outside-promise', false], ['inside-promise', zoneful], ['outside-timer', false]]);
  });
  await check('public-stability-events-and-unsubscription', async () => {
    const events = [], subscriptions = [
      zone.onMicrotaskEmpty.subscribe(() => events.push(['empty', inZone()])),
      zone.onStable.subscribe(() => events.push(['stable', inZone()])),
    ];
    try {
      zone.run(() => Promise.resolve().then(() => assert.equal(inZone(), zoneful)));
      await drain(); assert.equal(zone.isStable, true);
      if (zoneful) {assert.ok(events.some(([name, inside]) => name === 'empty' && inside));
        assert.ok(events.some(([name, inside]) => name === 'stable' && !inside));}
      else assert.deepEqual(events, []);
      subscriptions.forEach(subscription => subscription.unsubscribe());
      const before = events.length; zone.run(() => {}); await drain(); assert.equal(events.length, before);
    } finally {subscriptions.forEach(subscription => subscription.unsubscribe());}
  });
  await check('owned-header-resize-registration-and-lifetime', () => resize());
  if (line !== 'original') await check('whole-owned-viewport-registration-cache-and-lifetime', () => viewport());
  async function reject(id, operation, message) {
    await assert.rejects(operation, error => error.code === 'ERR_ASSERTION' && error.message.startsWith(message));
    mutations.push({id, rejected: true});
  }
  await reject('resize-no-disconnect', () => resize(payload.mutations.resizeNoDisconnect), 'resize-unsubscribe-disconnects');
  if (zoneful) await reject('resize-no-outside-zone', () => resize(payload.mutations.resizeInside), 'resize-registers-outside-zone');
  if (line !== 'original') {
    await reject('viewport-no-listener-removal', () => viewport(payload.mutations.viewportNoRemove), 'viewport-destroy-removes-listeners');
    await reject('viewport-no-root-completion', () => viewport(payload.mutations.viewportNoComplete), 'viewport-destroy-completes-root-stream');
    if (zoneful) await reject('viewport-no-outside-zone', () => viewport(payload.mutations.viewportInside), 'viewport-registers-outside-zone');
  }
  console.log(JSON.stringify({cases, mutations, genuine_public_zone: true, genuine_public_application: !!app,
    owned_resize_function_executed: true, whole_owned_viewport_executed: line !== 'original',
    native_event_resize_objects: false, actual_legacy_component_instances_qualified: false}));
} finally {app?.destroy(); core.destroyPlatform();}
