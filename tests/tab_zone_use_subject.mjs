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
const core = await import('@angular/core'), a11y = await import('@angular/cdk/a11y');
const rx = await import('rxjs'), ops = await import('rxjs/operators'), {EventEmitter: NodeEvents} = await import('node:events');
const payload = JSON.parse(readFileSync(new URL('./tab-zone-use-payload.json', import.meta.url)));
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
const manualInjector = app ? null : core.Injector.create({providers: [{provide: core.NgZone, useValue: zone}]}), contextInjector = app?.injector ?? manualInjector;
const drain = () => new Promise(resolve => globalThis.setTimeout(resolve, 12));
function headerFixture(js = payload.header) {
  const observers = [], listeners = [], mouseCallbacks = [], stops = [], updates = [], alignments = [], marks = [], forwarded = [];
  const viewport = new rx.Subject(), rendered = new rx.Subject();
  class ResizeProtocol {
    constructor(callback) {
      this.targets = []; this.disconnected = 0; this.inside = core.NgZone.isInAngularZone(); this.callbacks = []; this.events = new NodeEvents();
      this.events.on('resize', entries => {this.callbacks.push(core.NgZone.isInAngularZone()); callback(entries);}); observers.push(this);
    }
    observe(target) {this.targets.push(target);}
    disconnect() {this.disconnected++; this.events.removeAllListeners();}
    emit() {zone.run(() => this.events.emit('resize', this.targets.map(target => ({target, contentRect: {width: 20, height: 10}}))));}
  }
  function node(name) {
    const events = new NodeEvents(), mappings = new Map();
    return {name, offsetWidth: 220, scrollWidth: 600, offsetLeft: 0, scrollLeft: 0, textContent: name, style: {},
      addEventListener(type, listener) {listeners.push({type, listener, inside: core.NgZone.isInAngularZone()});
        const callback = value => {mouseCallbacks.push(core.NgZone.isInAngularZone()); listener(value);}; mappings.set(listener, callback); events.on(type, callback);},
      removeEventListener(type, listener) {const callback = mappings.get(listener); if (callback) events.off(type, callback); mappings.delete(listener);},
      emit(type) {zone.run(() => events.emit(type, {type}));}, listenerCount(type) {return events.listenerCount(type);}};
  }
  const hooks = {};
  new Function('exports', 'afterNextRender', 'ApplicationRef', 'assertInInjectionContext', 'inject', 'Injector', 'Observable', 'take', payload.headerHelper)
    (hooks, core.afterNextRender, core.ApplicationRef, core.assertInInjectionContext, core.inject, core.Injector, rx.Observable, ops.take);
  const resize = {};
  new Function('exports', 'EMPTY', 'Observable', 'ResizeObserver', payload.resizeHelper)(resize, rx.EMPTY, rx.Observable, ResizeProtocol);
  const host = node('host'), exports = {}, values = {Subject: rx.Subject, EMPTY: rx.EMPTY, Observable: rx.Observable,
    merge: rx.merge, observableOf: rx.of, timer: rx.timer, fromEvent: rx.fromEvent, debounceTime: ops.debounceTime, take: ops.take,
    switchMap: ops.switchMap, startWith: ops.startWith, skip: ops.skip, takeUntil: ops.takeUntil, filter: ops.filter,
    EventEmitter: core.EventEmitter, FocusKeyManager: a11y.FocusKeyManager, ResizeObserver: ResizeProtocol,
    ownedHeaderResize: (element, supplied) => {forwarded.push({target: 'ownedHeaderResize', sameZone: supplied === zone, sameElement: element === host}); return resize.ownedHeaderResize(element, supplied);},
    afterTabHeaderRender: (supplied, injector) => {forwarded.push({target: 'afterTabHeaderRender', sameZone: supplied === zone, sameInjector: injector === contextInjector}); return rendered;},
    tabHeaderRenderInjector: hooks.tabHeaderRenderInjector, passiveEventListenerOptions: {passive: true}, HEADER_SCROLL_DELAY: 650, HEADER_SCROLL_INTERVAL: 100,
    coerceBooleanProperty: value => value != null && String(value) !== 'false', coerceNumberProperty: value => Number(value)};
  new Function('exports', ...Object.keys(values), js)(exports, ...Object.values(values));
  const instance = core.runInInjectionContext(contextInjector, () => new exports.Replay(new core.ElementRef(host),
    {markForCheck() {marks.push(core.NgZone.isInAngularZone());}}, {change: () => viewport}, {value: 'ltr', change: rx.EMPTY}, zone, {isBrowser: true}, undefined));
  assert.equal(instance._ngZone, zone, 'same-header-zone'); assert.equal(instance._renderInjector, contextInjector); assert.equal(exports.Replay.length, 7);
  instance._items = new core.QueryList(); instance._items.reset([0, 1].map(index => ({disabled: false, elementRef: new core.ElementRef(node('item' + index)), focus() {}})));
  for (const name of ['_tabListContainer', '_tabList', '_tabListInner', '_nextPaginator', '_previousPaginator']) instance[name] = new core.ElementRef(node(name));
  instance.updatePagination = () => updates.push(core.NgZone.isInAngularZone());
  instance._alignInkBarToSelectedTab = () => alignments.push(core.NgZone.isInAngularZone()); instance._getMaxScrollDistance = () => 100;
  instance._stopScrolling.subscribe(() => stops.push(core.NgZone.isInAngularZone()));
  return {instance, host, observers, listeners, mouseCallbacks, stops, updates, alignments, marks, forwarded, viewport, rendered,
    initialize() {zone.run(() => instance.ngAfterContentInit());}, cleanup() {instance.ngOnDestroy(); viewport.complete(); rendered.complete(); instance._items.destroy();}};
}
async function headerMouseleave(js = payload.header) {
  const f = headerFixture(js);
  try {assert.equal(f.listeners.length, 1); assert.equal(f.listeners[0].inside, false, 'mouseleave-registration-outside');
    f.host.emit('mouseleave'); assert.deepEqual(f.mouseCallbacks, [false], 'Node-mouseleave-callback-captured-outside'); assert.deepEqual(f.stops, [false]);
    f.instance.ngOnDestroy(); assert.equal(f.host.listenerCount('mouseleave'), 0); f.host.emit('mouseleave'); assert.equal(f.stops.length, 1);
  } finally {f.cleanup();}
}
async function headerReentry(js = payload.header) {
  const f = headerFixture(js), inside = mode === 'zoneful';
  try {f.initialize(); assert.deepEqual(f.forwarded, [{target: 'ownedHeaderResize', sameZone: true, sameElement: true}, {target: 'afterTabHeaderRender', sameZone: true, sameInjector: true}]);
    zone.runOutsideAngular(() => f.viewport.next()); await drain(); assert.deepEqual(f.updates, [inside], 'viewport-realignment-reenters-zone');
    f.updates.length = f.alignments.length = 0; f.host.textContent = 'changed'; zone.runOutsideAngular(() => f.instance._onContentChanges());
    assert.deepEqual(f.updates, [inside], 'content-realignment-reenters-zone'); assert.deepEqual(f.alignments, [inside]); assert.deepEqual(f.marks, [inside]);
    f.instance.ngOnDestroy(); const before = f.updates.length; f.viewport.next(); f.rendered.next(); await drain(); assert.equal(f.updates.length, before);
  } finally {f.cleanup();}
}
async function headerResize(js = payload.header) {
  const f = headerFixture(js);
  try {f.initialize(); const items = f.observers.find(observer => observer.targets.some(target => target.name === 'item0'));
    assert.ok(items); assert.equal(items.inside, false, 'item-observer-registration-outside');
    items.emit(); items.emit(); await drain(); assert.deepEqual(items.callbacks, [false, false], 'Node-item-observer-callback-captured-outside');
    assert.deepEqual(f.updates, [mode === 'zoneful']);
    f.instance._items.reset([{disabled: false, elementRef: new core.ElementRef({name: 'replacement'}), focus() {}}]); f.instance._items.notifyOnChanges();
    assert.equal(items.disconnected, 1); const replacement = f.observers.at(-1); assert.equal(replacement.inside, false);
    f.instance.ngOnDestroy(); assert.ok(f.observers.every(observer => observer.disconnected === 1)); const before = f.updates.length;
    replacement.emit(); await drain(); assert.equal(f.updates.length, before, 'destroyed-header-cannot-realign');
  } finally {f.cleanup();}
}
function bodyType(js, setTimeout = globalThis.setTimeout, clearTimeout = globalThis.clearTimeout) {
  const exports = {};
  new Function('exports', 'assertInInjectionContext', 'inject', 'NgZone', 'EventEmitter', 'Subject', 'Subscription',
    'distinctUntilChanged', 'legacyAnimationsDisabled', 'setTimeout', 'clearTimeout', js)
    (exports, core.assertInInjectionContext, core.inject, core.NgZone, core.EventEmitter, rx.Subject, rx.Subscription,
      ops.distinctUntilChanged, () => false, setTimeout, clearTimeout);
  return exports.Replay;
}
function bodyFixture(js = payload.body, profile = 'provided') {
  const handles = new Map(), registrations = [], callbacks = [], completions = [], values = new Map(), priorities = new Map();
  let serial = 1, destroyed = false;
  const setTimeout = (callback, delay) => {
    assert.equal(delay, 600, 'default500ms-plus100ms-delivery-buffer-requested'); const id = serial++;
    registrations.push({requested_ms: delay, inside: core.NgZone.isInAngularZone()});
    handles.set(id, globalThis.setTimeout(() => {handles.delete(id); callbacks.push(core.NgZone.isInAngularZone()); callback();}, 0)); return id;
  };
  const clearTimeout = id => {if (handles.has(id)) globalThis.clearTimeout(handles.get(id)); handles.delete(id);};
  const Type = bodyType(js, setTimeout, clearTimeout), local = profile === 'missing' ? core.Injector.create({providers: []}) : null;
  const style = {get visibility() {return values.get('visibility') ?? '';},
    getPropertyValue: name => values.get(name) ?? '', getPropertyPriority: name => priorities.get(name) ?? '',
    setProperty(name, value, priority = '') {values.set(name, value); priorities.set(name, priority);},
    removeProperty(name) {const old = values.get(name) ?? ''; values.delete(name); priorities.delete(name); return old;}};
  const host = {clientHeight: 123, classList: {add() {}, remove() {}, toggle() {}}}, args = [new core.ElementRef(host),
    {value: 'ltr', change: new rx.Subject()}, {markForCheck() {}}];
  let instance;
  assert.doesNotThrow(() => {instance = profile === 'manual' ? new Type(...args) : core.runInInjectionContext(local ?? contextInjector, () => new Type(...args));}, 'historical-three-argument-construction-remains-available');
  assert.equal(Type.length, 3); assert.equal(instance._elementRef, args[0]);
  assert.equal(instance._ngZone, profile === 'provided' ? zone : null, 'same-optional-public-zone-or-null');
  instance._contentElement = new core.ElementRef({style, getBoundingClientRect: () => ({width: 320, height: 123})});
  instance._translateTabComplete.subscribe(() => completions.push(core.NgZone.isInAngularZone()));
  instance.position = -1; instance.ngOnInit();
  const destroy = () => {if (!destroyed) {destroyed = true; instance.ngOnDestroy();}};
  return {instance, registrations, callbacks, completions, handles,
    start() {(profile === 'provided' ? zone.run.bind(zone) : zone.runOutsideAngular.bind(zone))(() => {instance.position = 0;});}, destroy,
    cleanup() {destroy(); for (const handle of handles.values()) globalThis.clearTimeout(handle); handles.clear(); args[1].change.complete(); local?.destroy();}};
}
async function bodyTimer(js = payload.body, profile = 'provided', registration = true) {
  const f = bodyFixture(js, profile);
  try {f.start(); if (registration) assert.deepEqual(f.registrations, [{requested_ms: 600, inside: false}], 'body-fallback-registration-outside');
    await drain(); assert.deepEqual(f.callbacks, [false], 'actual-Node-body-callback-captured-outside');
    assert.deepEqual(f.completions, [profile === 'provided' && mode === 'zoneful'], 'body-completion-reenters-provided-zone');
    assert.equal(f.instance._fallbackTimer, undefined); assert.equal(f.handles.size, 0);
  } finally {f.cleanup(); await drain();}
}
async function bodyCancellation(js = payload.body) {
  const f = bodyFixture(js);
  try {f.start(); f.destroy(); assert.equal(f.handles.size, 0, 'body-destruction-cancels-real-Node-task');
    await drain(); assert.deepEqual(f.callbacks, []); assert.deepEqual(f.completions, []);
  } finally {f.cleanup(); await drain();}
}
function providerError(js = payload.body) {
  const sentinel = new Error('expected optional NgZone provider failure'), local = core.Injector.create({providers: [{provide: core.NgZone, useFactory: () => {throw sentinel;}}]});
  const Type = bodyType(js);
  try {assert.throws(() => core.runInInjectionContext(local, () => new Type(new core.ElementRef({}), null, {})), error => error === sentinel, 'optional-provider-error-must-propagate');}
  finally {local.destroy();}
}
const cases = [], faults = [];
try {
  for (const [id, action] of [['header-mouseleave-registration-capture-and-teardown', headerMouseleave],
    ['header-forwarded-service-and-content-viewport-reentry', headerReentry], ['header-item-observer-registration-capture-replacement-and-teardown', headerResize],
    ['body-manual-construction-and-fallback', () => bodyTimer(payload.body, 'manual')], ['body-missing-optional-service-and-fallback', () => bodyTimer(payload.body, 'missing')],
    ['body-provided-service-and-real-task-reentry', bodyTimer], ['body-provider-errors-propagate', providerError], ['body-destruction-cancels-real-task', bodyCancellation]]) {
    await action(); cases.push({id, result: 'pass'});
  }
  const reject = async (id, action) => {await assert.rejects(async () => action(), error => error.code === 'ERR_ASSERTION'); faults.push({id, result: 'rejected'});};
  await reject('body-missing-manual-context-guard', () => bodyTimer(payload.faults.noContextGuard, 'manual'));
  await reject('body-required-service-instead-of-optional', () => bodyTimer(payload.faults.requiredService, 'missing'));
  await reject('body-provider-error-swallowed', () => providerError(payload.faults.swallowedError));
  await reject('body-real-task-not-canceled', () => bodyCancellation(payload.faults.noBodyCancel));
  if (mode === 'zoneful') {
    await reject('header-mouseleave-moved-inside-zone', () => headerMouseleave(payload.faults.insideMouseleave));
    await reject('header-content-left-outside-zone', () => headerReentry(payload.faults.outsideContent));
    await reject('header-viewport-left-outside-zone', () => headerReentry(payload.faults.outsideViewport));
    await reject('header-item-observer-moved-inside-zone', () => headerResize(payload.faults.insideResize));
    await reject('body-fallback-registration-moved-inside-zone', () => bodyTimer(payload.faults.insideBodyTimer));
    await reject('body-real-Node-callback-moved-inside-zone', () => bodyTimer(payload.faults.insideBodyTimer, 'provided', false));
    await reject('body-finish-left-outside-zone', () => bodyTimer(payload.faults.noBodyReentry));
  }
  console.log(JSON.stringify({cases, faults, genuine_public_zones_injectors_and_current_providers: true,
    actual_Node_event_and_task_capture: true, native_observer_delivery_or_600ms_timer_or_component_node_DI_qualified: false}));
} finally {manualInjector?.destroy(); app?.destroy(); if (app) core.destroyPlatform();}
