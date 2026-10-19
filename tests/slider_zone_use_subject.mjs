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
const core = await import('@angular/core'), platform = await import('@angular/cdk/platform'), coercion = await import('@angular/cdk/coercion');
const rx = await import('rxjs'), {EventEmitter: NodeEvents} = await import('node:events');
const payload = JSON.parse(readFileSync(new URL('./slider-zone-use-payload.json', import.meta.url)));
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
const options = platform.normalizePassiveListenerOptions({passive: false});
function fixture(js = payload.candidate) {
  const registrations = [], removals = [], callbacks = [], focuses = [], inputs = [], changes = [], values = [];
  let stopped = 0, destroyed = false, foreign = 0;
  function target(name) {
    const events = new NodeEvents(), mappings = new Map();
    const node = {name, style: {}, contains: value => value === node,
      focus() {focuses.push(core.NgZone.isInAngularZone());}, blur() {},
      addEventListener(type, listener, opts) {
        registrations.push({name, type, listener, options: opts, inside: core.NgZone.isInAngularZone()});
        let byListener = mappings.get(type); if (!byListener) mappings.set(type, byListener = new Map());
        const callback = event => {callbacks.push({name, type, inside: core.NgZone.isInAngularZone()}); listener.call(node, event);};
        byListener.set(listener, callback); events.on(type, callback);
      },
      removeEventListener(type, listener, opts) {
        removals.push({name, type, listener, options: opts}); const callback = mappings.get(type)?.get(listener);
        if (callback) {events.off(type, callback); mappings.get(type).delete(listener);}
      },
      emit(type, event) {zone.run(() => events.emit(type, event));}, count(type) {return events.listenerCount(type);},
      total() {return events.eventNames().reduce((sum, event) => sum + events.listenerCount(event), 0);},
      cleanup() {events.removeAllListeners();}, foreign() {events.on('mousedown', () => foreign++);},
    }; return node;
  }
  const host = target('host'), document = target('document'), window = target('window'); document.defaultView = window; host.foreign();
  class TraitsProtocol {constructor(element) {this._elementRef = element; this.disabled = false;}}
  const exports = {}, supplied = {TraitsProtocol, EventEmitter: core.EventEmitter, Subscription: rx.Subscription,
    coerceBooleanProperty: coercion.coerceBooleanProperty, coerceNumberProperty: coercion.coerceNumberProperty,
    activeEventOptions: options, MIN_AUTO_TICK_SEPARATION: 30, DISABLED_THUMB_GAP: 7, MIN_VALUE_NONACTIVE_THUMB_GAP: 7, MIN_VALUE_ACTIVE_THUMB_GAP: 10, window};
  new Function('exports', ...Object.keys(supplied), js)(exports, ...Object.values(supplied));
  const instance = new exports.Replay(new core.ElementRef(host), {stopMonitoring() {stopped++;}}, {markForCheck() {}, detectChanges() {}},
    {value: 'ltr', change: rx.EMPTY}, '0', zone, document, undefined);
  assert.equal(instance._ngZone, zone, 'same-required-slider-zone'); assert.equal(exports.Replay.length, 8);
  instance._sliderWrapper = new core.ElementRef({getBoundingClientRect: () => ({left: 0, top: 0, width: 100, height: 100})});
  instance.input.subscribe(event => inputs.push({value: event.value, sameSource: event.source === instance, inside: core.NgZone.isInAngularZone()}));
  instance.change.subscribe(event => changes.push({value: event.value, sameSource: event.source === instance, inside: core.NgZone.isInAngularZone()}));
  instance.valueChange.subscribe(value => values.push(value));
  const destroy = () => {if (!destroyed) {destroyed = true; instance.ngOnDestroy();}};
  return {instance, host, document, window, registrations, removals, callbacks, focuses, inputs, changes, values, destroy,
    stopped: () => stopped, foreign: () => foreign, cleanup() {destroy(); host.cleanup(); document.cleanup(); window.cleanup();}};
}
function mouse(type, x = 50, {button = 0, cancelable = true} = {}) {
  let prevented = 0; return {type, clientX: x, clientY: 50, button, cancelable, preventDefault() {prevented++;}, prevented: () => prevented};
}
function touch(type, host, x = 50, id = 17, changedId = id) {
  const point = {identifier: id, target: host, clientX: x, clientY: 50};
  return {type, touches: type === 'touchend' ? [] : [point], changedTouches: [{...point, identifier: changedId}], cancelable: true, preventDefault() {}};
}
function construction(js = payload.candidate, registration = true) {
  const f = fixture(js);
  try {assert.equal(f.registrations.length, 2); assert.deepEqual(f.registrations.map(row => row.type), ['mousedown', 'touchstart']);
    for (const row of f.registrations) {assert.equal(row.listener, f.instance._pointerDown); assert.equal(row.options, options);
      if (registration) assert.equal(row.inside, false, 'slider-host-registration-outside');}
  } finally {f.cleanup();}
}
function mouseDrag(js = payload.candidate, registration = true) {
  const f = fixture(js), inside = mode === 'zoneful';
  try {if (registration) assert.ok(f.registrations.every(row => !row.inside), 'slider-host-registration-outside');
    const down = mouse('mousedown'); f.host.emit('mousedown', down); assert.equal(f.instance.value, 50); assert.equal(down.prevented(), 1);
    assert.deepEqual(f.callbacks.filter(row => row.name === 'host'), [{name: 'host', type: 'mousedown', inside: false}], 'actual-Node-host-callback-captured-outside');
    assert.deepEqual(f.focuses, [inside, inside], 'slider-pointer-work-reenters-zone');
    f.document.emit('mousemove', mouse('mousemove', 75)); assert.deepEqual(f.values, [], 'tagged-valueChange-waits-for-drag-commit');
    f.document.emit('mouseup', mouse('mouseup', 75));
    assert.equal(f.instance.value, 75); assert.equal(f.instance._isSliding, null);
    assert.deepEqual(f.inputs, [{value: 50, sameSource: true, inside}, {value: 75, sameSource: true, inside}], 'pointer-input-context-and-values');
    assert.deepEqual(f.changes, [{value: 75, sameSource: true, inside}]); assert.deepEqual(f.values, [75]);
    assert.equal(f.document.total(), 0); assert.equal(f.window.total(), 0);
  } finally {f.cleanup();}
}
function touchDrag(js = payload.candidate) {
  const f = fixture(js), inside = mode === 'zoneful';
  try {f.host.emit('touchstart', touch('touchstart', f.host, 40)); assert.equal(f.instance._touchId, 17); assert.equal(f.instance.value, 40);
    f.document.emit('touchmove', touch('touchmove', f.host, 65)); assert.equal(f.instance.value, 65);
    f.document.emit('touchend', touch('touchend', f.host, 65, 17, 99)); assert.equal(f.instance._isSliding, 'pointer', 'foreign-touch-cannot-release-drag');
    f.document.emit('touchend', touch('touchend', f.host, 65)); assert.equal(f.instance._isSliding, null); assert.equal(f.instance._touchId, undefined);
    assert.deepEqual(f.inputs, [{value: 40, sameSource: true, inside}, {value: 65, sameSource: true, inside}]);
    assert.deepEqual(f.changes, [{value: 65, sameSource: true, inside}]); assert.equal(f.document.total(), 0); assert.equal(f.window.total(), 0);
  } finally {f.cleanup();}
}
function guards(js = payload.candidate) {
  for (const kind of ['disabled', 'nonprimary', 'active-keyboard', 'active-pointer', 'empty-touch']) {
    const f = fixture(js);
    try {if (kind === 'disabled') f.instance.disabled = true; if (kind.startsWith('active-')) f.instance._isSliding = kind.slice(7);
      const event = kind === 'empty-touch' ? {type: 'touchstart', touches: [], changedTouches: []} : mouse('mousedown', 50, {button: kind === 'nonprimary' ? 2 : 0});
      f.host.emit(event.type, event); assert.equal(f.focuses.length, 0, 'pointer-guard-' + kind); assert.equal(f.inputs.length, 0); assert.equal(f.document.total(), 0);
    } finally {f.cleanup();}
  }
}
function noncancelable() {
  const f = fixture();
  try {const event = mouse('mousedown', 50, {cancelable: false}); f.host.emit('mousedown', event); assert.equal(f.instance.value, 50); assert.equal(event.prevented(), 0);}
  finally {f.cleanup();}
}
function destroyActive(js = payload.candidate) {
  const f = fixture(js);
  try {f.host.emit('mousedown', mouse('mousedown')); f.destroy();
    assert.equal(f.host.count('mousedown'), 1, 'destroy-retains-only-foreign-host-mousedown-listener'); assert.equal(f.host.count('touchstart'), 0, 'destroy-removes-host-touch-listener');
    assert.equal(f.document.total(), 0, 'destroy-removes-global-listeners'); assert.equal(f.window.total(), 0); assert.equal(f.stopped(), 1);
    for (const row of f.registrations) assert.ok(f.removals.some(removed => removed.name === row.name && removed.type === row.type && removed.listener === row.listener && removed.options === row.options), 'exact-listener-options-identity-removed');
    const before = f.focuses.length; f.host.emit('mousedown', mouse('mousedown')); f.document.emit('mousemove', mouse('mousemove', 90));
    assert.equal(f.focuses.length, before); assert.equal(f.foreign(), 2);
  } finally {f.cleanup();}
}
const cases = [], faults = [];
try {
  for (const [id, action] of [['current-and-tagged-construction', () => {construction(); construction(payload.original);}], ['untouched16-mouse-flow', () => mouseDrag(payload.original)],
    ['current-mouse-flow', mouseDrag], ['untouched16-touch-flow', () => touchDrag(payload.original)], ['current-touch-flow', touchDrag],
    ['current-pointer-guards', guards], ['current-noncancelable-pointer', noncancelable], ['current-active-destruction', destroyActive]]) {
    action(); cases.push({id, result: 'pass'});
  }
  const reject = (id, action) => {assert.throws(action, error => error.code === 'ERR_ASSERTION'); faults.push({id, result: 'rejected'});};
  for (const [id, name] of [['missing-mouse-removal', 'noMouseRemove'], ['missing-touch-removal', 'noTouchRemove'], ['missing-global-move-removal', 'noGlobalMoveRemove']]) reject(id, () => destroyActive(payload.faults[name]));
  for (const name of ['noDisabledGuard', 'noActiveGuard', 'noPrimaryGuard']) reject(name, () => guards(payload.faults[name]));
  if (mode === 'zoneful') {
    reject('host-registration-moved-inside-zone', () => construction(payload.faults.insideRegistration));
    reject('real-Node-host-callback-moved-inside-zone', () => mouseDrag(payload.faults.insideRegistration, false));
    reject('pointer-work-left-outside-zone', () => mouseDrag(payload.faults.noReentry));
  }
  console.log(JSON.stringify({cases, faults, genuine_public_zones_and_current_providers: true, actual_Node_listener_capture: true,
    native_mouse_touch_DOM_geometry_CSS_or_component_node_DI_qualified: false}));
} finally {app?.destroy(); if (app) core.destroyPlatform();}
