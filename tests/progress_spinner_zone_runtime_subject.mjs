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
const core = await import('@angular/core'), platform = await import('@angular/cdk/platform');
const coercion = await import('@angular/cdk/coercion'), rx = await import('rxjs');
const payload = JSON.parse(readFileSync(new URL('./progress-spinner-zone-payload.json', import.meta.url)));
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
function browserPlatform(kind) {
  if (kind === 'server') {delete globalThis.document; delete globalThis.window; delete globalThis.navigator;}
  else {
    globalThis.document = {};
    globalThis.window = {};
    Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {userAgent: kind === 'safari' ? 'AppleWebKit Safari' : 'Firefox'}});
  }
  const owner = core.Injector.create({providers: [platform.Platform, {provide: core.PLATFORM_ID, useValue: kind === 'server' ? 'server' : 'browser'}]});
  try {const service = owner.get(platform.Platform);
    assert.equal(service.isBrowser, kind !== 'server'); assert.equal(service.SAFARI, kind === 'safari'); return service;
  } finally {owner.destroy();}
}
function load(text, colorText) {
  const color = {}, out = {};
  new Function('exports', 'require', colorText)(color, spec => {assert.equal(spec, '@angular/core'); return core;});
  new Function('exports', 'require', text)(out, spec => {
    if (spec === '@angular/core') return core;
    if (spec === '@angular/cdk/coercion') return coercion;
    if (spec === 'rxjs') return rx;
    if (['@angular/material/core', './internal/common-behaviors'].includes(spec)) return color;
    assert.ok(['@angular/cdk/platform', '@ngx-compat/material-legacy/legacy-core'].includes(spec), 'unreviewed runtime dependency: ' + spec);
    return new Proxy({}, {get() {throw Error('unqualified shadow-root/style method executed');}});
  }); return out.MatLegacyProgressSpinner;
}
const Current = load(payload.current, payload.ownedColor), Original = load(payload.original, payload.originalColor);
function observe(Class, kind = 'safari', missing = '') {
  const peer = browserPlatform(kind), changes = new rx.Subject(), delay = [], marks = [], colors = new Set();
  const element = {nodeName: 'mat-progress-spinner', classList: {add: name => colors.add(name), remove: name => colors.delete(name)}};
  const viewport = {change: value => {delay.push(value); return changes;}};
  const detector = {markForCheck: () => marks.push(core.NgZone.isInAngularZone())};
  const borrowedDocument = {head: {}, role: 'document-head-identity-protocol'};
  const args = [new core.ElementRef(element), peer, borrowedDocument, 'NoopAnimations',
    {color: 'warn', diameter: 48, strokeWidth: 6}, detector, viewport, zone, 'nonce'];
  for (const [name, index] of [['detector', 5], ['viewport', 6], ['zone', 7]]) if (missing === name) args[index] = undefined;
  const spinner = zone.run(() => new Class(...args));
  assert.equal(spinner._document, borrowedDocument);
  assert.equal(spinner._nonce, 'nonce'); assert.equal(spinner.diameter, 48); assert.equal(spinner.strokeWidth, 6);
  assert.deepEqual([...colors], ['mat-warn']);
  const subscribed = kind === 'safari' && !missing;
  assert.deepEqual(delay, subscribed ? [150] : [], 'exact viewport subscription guard and delay');
  assert.equal(changes.observers.length, subscribed ? 1 : 0, 'one optional viewport subscription');
  let expected = 0;
  for (const state of ['determinate', 'indeterminate', 'determinate', 'indeterminate']) {
    spinner.mode = state; zone.runOutsideAngular(() => changes.next({type: 'resize'}));
    if (subscribed && state === 'indeterminate') expected++;
    assert.equal(marks.length, expected, 'individual mode resize eligibility: ' + state);
  }
  if (mode === 'zoneful') assert.ok(marks.every(Boolean), 're-enter Angular to request change detection');
  else assert.ok(marks.every(value => value === false), 'zoneless callback executes without a Zone global');
  zone.run(() => spinner.ngOnDestroy());
  assert.equal(changes.observers.length, 0, 'destroy removes the resize subscription');
  const count = marks.length; zone.runOutsideAngular(() => changes.next({type: 'resize'}));
  assert.equal(marks.length, count, 'destroyed spinner cannot mark');
  changes.complete();
  return {delay, marks, colors: [...colors], diameter: spinner.diameter, strokeWidth: spinner.strokeWidth};
}
const cases = [], mutants = [];
try {
  for (const [kind, missing] of [['safari', ''], ['other', ''], ['server', ''], ['safari', 'detector'], ['safari', 'viewport'], ['safari', 'zone']]) {
    assert.deepEqual(observe(Current, kind, missing), observe(Original, kind, missing)); cases.push(kind + '/' + (missing || 'complete'));
  }
  for (const [id, text] of Object.entries(payload.mutations)) {
    if (id === 'missing-zone-entry' && mode === 'zoneless') continue;
    const Changed = load(text, payload.ownedColor);
    const kind = id === 'server-subscription' ? 'server' : id === 'non-safari-subscription' ? 'other' : 'safari';
    const missing = id === 'missing-detector-guard' ? 'detector' : id === 'missing-viewport-guard' ? 'viewport' : id === 'missing-zone-guard' ? 'zone' : '';
    assert.throws(() => observe(Changed, kind, missing), error => error instanceof assert.AssertionError
      || id === 'missing-viewport-guard' && error instanceof TypeError && error.message.includes("reading 'change'"), id);
    mutants.push(id);
  }
  console.log(JSON.stringify({line, mode, production: production === 'true', cases, mutations: mutants,
    complete_manual_classes_loaded: true, native_style_init_or_packed_qualified: false}));
} finally {app?.destroy(); if (app) core.destroyPlatform();}
