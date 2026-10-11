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
const payload = JSON.parse(readFileSync(new URL('./anchor-zone-payload.json', import.meta.url)));
let app, zone;
if (line === 'original') zone = new core.NgZone({enableLongStackTrace: false});
else {
  const common = await import('@angular/common'), browser = await import('@angular/platform-browser');
  app = await browser.createApplication({providers: [
    core[mode === 'zoneful' ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'](),
    {provide: common.IMAGE_CONFIG, useValue: {disableImageSizeWarning: true, disableImageLazyLoadWarning: true}},
    {provide: core.DOCUMENT, useValue: {head: {children: []}}},
    {provide: core.RendererFactory2, useValue: {createRenderer: () => ({})}},
  ]}); zone = app.injector.get(core.NgZone);
  if (mode === 'zoneless') assert.equal(typeof globalThis.Zone, 'undefined');
}
function load(text) {
  const mixins = {}, out = {};
  for (const source of Object.values(payload.mixins)) new Function('exports', 'require', source)(mixins, spec => {
    assert.equal(spec, '@angular/cdk/coercion'); return coercion;
  });
  new Function('exports', 'require', text)(out, spec => {
    assert.ok(['@angular/material/core', './internal/common-behaviors'].includes(spec), 'unexpected runtime dependency: ' + spec);
    return mixins;
  }); return out.MatLegacyAnchor;
}
const Current = load(payload.current), Original = load(payload.original);
function observe(Class, supplied = true) {
  const colors = new Set(), records = [], monitors = [], stops = [], listeners = [];
  const host = {classList: {add: value => colors.add(value), remove: value => colors.delete(value)},
    hasAttribute: attribute => attribute === 'mat-raised-button',
    addEventListener(type, handler) {
      records.push({type, inside: core.NgZone.isInAngularZone()});
      listeners.push({handler, context: globalThis.Zone?.current});
    }, removeEventListener(type, handler) {
      assert.equal(type, 'click'); assert.equal(listeners.filter(r => r.handler === handler).length, 1,
        'remove the same actual listener'); listeners.splice(listeners.findIndex(r => r.handler === handler), 1);
    }};
  const ref = new core.ElementRef(host), focusMonitor = {monitor: (...args) => monitors.push(args), stopMonitoring: (...args) => stops.push(args)};
  const anchor = zone.run(() => new Class(focusMonitor, ref, 'NoopAnimations', supplied ? zone : undefined));
  assert.equal(anchor._ngZone, supplied ? zone : undefined, 'historical optional zone identity');
  zone.run(() => anchor.ngAfterViewInit());
  assert.deepEqual(monitors, [[ref, true]], 'owned parent receives unchanged host and child-monitoring flag');
  assert.deepEqual([...colors].sort(), ['mat-button-base', 'mat-raised-button']);
  assert.deepEqual(records, [{type: 'click', inside: mode === 'zoneful' && !supplied}], 'registration/fallback zone contract');
  const dispatch = () => {
    const result = {prevented: 0, stopped: 0};
    const event = {preventDefault: () => result.prevented++, stopImmediatePropagation: () => result.stopped++};
    for (const row of [...listeners]) {const invoke = () => row.handler(event); row.context ? row.context.run(invoke) : invoke();}
    return result;
  };
  anchor.disabled = false; assert.deepEqual(dispatch(), {prevented: 0, stopped: 0}, 'enabled link continues');
  anchor.disabled = true; assert.deepEqual(dispatch(), {prevented: 1, stopped: 1}, 'disabled link blocks navigation and sibling handlers');
  anchor.disabled = false; assert.deepEqual(dispatch(), {prevented: 0, stopped: 0}, 'reenabled link continues');
  zone.run(() => anchor.ngOnDestroy());
  assert.deepEqual(stops, [[ref]], 'owned parent monitor teardown preserved');
  assert.equal(listeners.length, 0, 'no click listener after destroy');
  anchor.disabled = true; assert.deepEqual(dispatch(), {prevented: 0, stopped: 0});
  return {colors: [...colors].sort(), records, monitors: monitors.length, stops: stops.length};
}
const cases = [], mutants = [];
try {
  for (const supplied of [true, false]) {
    assert.deepEqual(observe(Current, supplied), observe(Original, supplied)); cases.push(supplied ? 'supplied-public-zone' : 'manual-optional-zone-fallback');
  }
  for (const [id, text] of Object.entries(payload.mutations)) {
    if (mode === 'zoneless' && id === 'inside-registration') continue;
    assert.throws(() => observe(load(text), id !== 'missing-fallback'), error => error instanceof assert.AssertionError, id);
    mutants.push(id);
  }
  console.log(JSON.stringify({line, mode, production: production === 'true', cases, mutations: mutants,
    complete_parent_anchor_and_mixins_executed: true, native_or_packed_qualified: false}));
} finally {app?.destroy(); if (app) core.destroyPlatform();}
