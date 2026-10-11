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
const core = await import('@angular/core'), coercion = await import('@angular/cdk/coercion');
const rx = await import('rxjs'), operators = await import('rxjs/operators');
const payload = JSON.parse(readFileSync(new URL('./progress-bar-zone-payload.json', import.meta.url)));
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
// Preserve registration-zone semantics explicitly. This is an event-target
// protocol, not a claim that Node Zone.js patches native browser EventTargets.
class EventTargetProtocol {
  listeners = new Map(); registrations = []; removals = [];
  addEventListener(type, handler) {
    const row = {handler, inside: core.NgZone.isInAngularZone(), context: globalThis.Zone?.current};
    this.registrations.push({type, inside: row.inside});
    const rows = this.listeners.get(type) || []; rows.push(row); this.listeners.set(type, rows);
  }
  removeEventListener(type, handler) {
    const rows = this.listeners.get(type) || [];
    assert.equal(rows.filter(r => r.handler === handler).length, 1, 'remove the registered callback once');
    this.listeners.set(type, rows.filter(r => r.handler !== handler)); this.removals.push(type);
  }
  fire(target = this) {
    for (const row of [...(this.listeners.get('transitionend') || [])]) {
      const invoke = () => row.handler({type: 'transitionend', target});
      row.context ? row.context.run(invoke) : invoke();
    }
  }
}
function load(text, colorText) {
  const color = {}, out = {};
  new Function('exports', 'require', colorText)(color, spec => {
    assert.equal(spec, '@angular/core'); return core;
  });
  new Function('exports', 'require', text)(out, spec => {
    if (spec === '@angular/core') return core;
    if (spec === '@angular/cdk/coercion') return coercion;
    if (spec === 'rxjs') return rx;
    if (spec === 'rxjs/operators') return operators;
    assert.ok(['@angular/material/core', './internal/common-behaviors'].includes(spec), 'unexpected runtime dependency: ' + spec);
    return color;
  });
  return out.MatLegacyProgressBar;
}
const historical = load(payload.original, payload.originalColor), candidate = load(payload.current, payload.ownedColor);
function fixture(Class = candidate, options = {}) {
  const colors = new Set(), host = {classList: {add: name => colors.add(name), remove: name => colors.delete(name)}};
  const marks = [], detector = {markForCheck: () => marks.push(core.NgZone.isInAngularZone())};
  const bar = zone.run(() => new Class(new core.ElementRef(host), zone, options.animationMode,
    {getPathname: () => '/route?q=(a)#ignored'}, options.defaults, detector));
  assert.ok(bar._ngZone === zone, 'whole constructor preserves supplied genuine zone identity');
  const target = new EventTargetProtocol(), emissions = [];
  bar._primaryValueBar = new core.ElementRef(target);
  let enters = 0;
  const recorded = new Proxy(zone, {get(value, key) {
    if (key === 'run') return callback => {enters++; return value.run(callback);};
    const member = Reflect.get(value, key); return typeof member === 'function' ? member.bind(value) : member;
  }});
  // Construction received the genuine zone. This narrowly recording proxy
  // forwards runtime calls to it, without simulating framework scheduling.
  bar._ngZone = recorded;
  const init = () => zone.run(() => bar.ngAfterViewInit());
  const subscribe = () => bar.animationEnd.subscribe(value => emissions.push({value, inside: core.NgZone.isInAngularZone()}));
  const destroy = () => zone.run(() => bar.ngOnDestroy());
  return {bar, colors, marks, target, emissions, init, subscribe, destroy, enters: () => enters};
}
function observe(Class) {
  const f = fixture(Class, {defaults: {color: 'warn', mode: 'buffer'}});
  assert.ok(f.bar.animationEnd instanceof core.EventEmitter);
  f.bar.value = '40'; f.bar.bufferValue = 125;
  assert.equal(f.bar.value, 40); assert.equal(f.bar.bufferValue, 100);
  assert.deepEqual([...f.colors], ['mat-warn']);
  assert.equal(f.bar._rectangleFillValue, `url('/route?q=(a)#${f.bar.progressbarId}')`);
  f.init(); const sub = f.subscribe();
  f.target.fire({role: 'child'}); assert.equal(f.emissions.length, 0, 'child transitions ignored');
  let expectedEmissions = 0;
  for (const state of ['determinate', 'buffer', 'indeterminate', 'query']) {
    f.bar.mode = state; f.target.fire();
    if (state === 'determinate' || state === 'buffer') expectedEmissions++;
    assert.equal(f.emissions.length, expectedEmissions, 'individual mode eligibility: ' + state);
  }
  assert.deepEqual(f.emissions.map(r => r.value), [{value: 40}, {value: 40}]);
  assert.equal(f.enters(), 2, 'only two accepted emissions re-enter Angular');
  assert.ok(f.target.registrations.every(r => r.type === 'transitionend' && r.inside === false));
  if (mode === 'zoneful') assert.ok(f.emissions.every(r => r.inside));
  else assert.ok(f.emissions.every(r => !r.inside));
  sub.unsubscribe(); f.bar.mode = 'determinate'; f.target.fire();
  assert.equal(f.enters(), 2, 'no observer means no zone entry');
  const emitted = f.emissions.length;
  f.destroy(); f.target.fire(); assert.equal(f.emissions.length, emitted, 'destroy prevents callbacks');
  assert.deepEqual(f.target.removals, ['transitionend']);
  assert.equal(f.target.listeners.get('transitionend').length, 0);
  return {emissions: f.emissions, registrations: f.target.registrations, removals: f.target.removals,
    zone_entries: f.enters(), marks: f.marks, colors: [...f.colors]};
}
const cases = [], mutants = [];
try {
  assert.deepEqual(observe(candidate), observe(historical)); cases.push('complete-historical-mode-target-zone-and-teardown-parity');
  const clamp = fixture();
  for (const [input, expected] of [[-5, 0], [150, 100], ['12.5', 12.5], ['bad', 0], [null, 0]]) {
    clamp.bar.value = input; assert.equal(clamp.bar.value, expected);
  }
  for (const [input, expected] of [[-5, 0], [150, 100], [12.5, 12.5], [0, 0]]) {
    clamp.bar.bufferValue = input; assert.equal(clamp.bar.bufferValue, expected);
  }
  assert.deepEqual(clamp.bar._primaryTransform(), {transform: 'scale3d(0, 1, 1)'});
  for (const state of ['determinate', 'indeterminate', 'query']) {clamp.bar.mode = state; assert.equal(clamp.bar._bufferTransform(), null);}
  clamp.bar.mode = 'buffer'; clamp.bar.bufferValue = 25;
  assert.deepEqual(clamp.bar._bufferTransform(), {transform: 'scale3d(0.25, 1, 1)'});
  cases.push('historical-value-buffer-clamping-and-transforms');
  const noop = fixture(candidate, {animationMode: 'NoopAnimations'});
  assert.equal(noop.bar._isNoopAnimation, true); noop.init(); const sub = noop.subscribe(); noop.target.fire();
  assert.equal(noop.emissions.length, 1); sub.unsubscribe(); noop.destroy();
  cases.push('noop-mode-retains-explicit-transition-contract');
  const early = fixture(); early.destroy(); assert.equal(early.target.registrations.length, 0);
  cases.push('destroy-before-view-initialization-is-inert');
  for (const [id, text] of Object.entries(payload.mutations)) {
    if (mode === 'zoneless' && id === 'inside-registration') continue;
    const Changed = load(text, payload.ownedColor);
    assert.throws(() => observe(Changed), error => error instanceof assert.AssertionError, id + ' must fail a contract assertion');
    mutants.push(id);
  }
  console.log(JSON.stringify({line, mode, production: production === 'true', cases, mutations: mutants,
    complete_manual_classes_executed: true, native_or_packed_qualified: false}));
} finally {app?.destroy(); if (app) core.destroyPlatform();}
