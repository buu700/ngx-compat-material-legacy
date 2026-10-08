/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Owned native primitives vs untouched tagged helper; synthetic window/clock only. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), req = createRequire(import.meta.url);
const ts = req('typescript'), url = name => pathToFileURL(req.resolve(name)).href;
await import(url('@angular/compiler'));
const sourcePath = 'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts';
const referencePath = 'reference/material-16.2.14/viewport-sources/viewport-ruler.ts';
const source = readFileSync(resolve(root, sourcePath), 'utf8'), reference = readFileSync(resolve(root, referencePath), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(reference), '2cd3078732370fd98fad1fdf1c443acbaab5b5986fbf3cadd7ff546d51c3ed76');
async function load(text, name) {
  const emitted = ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, experimentalDecorators: true}}).outputText
    .replace(/(['"])(@angular\/[^'"]+|rxjs(?:\/operators)?)\1/g,
      (_, quote, spec) => JSON.stringify(url(spec === '@angular/common' ? '@angular/core' : spec)));
  return (await import('data:text/javascript;base64,' + Buffer.from(emitted).toString('base64')))[name];
}
function clock() {
  const saved = [globalThis.setInterval, globalThis.clearInterval], jobs = new Map(); let now = 0, next = 0;
  globalThis.setInterval = (run, delay = 0, ...args) => {
    const id = ++next, period = Math.max(Number(delay), 1); jobs.set(id, {run: () => run(...args), period, due: now + period}); return id;
  };
  globalThis.clearInterval = id => jobs.delete(id);
  return {jobs, advance(duration) {const end = now + duration; let work = 0;
    while (true) {const entry = [...jobs].sort((a, b) => a[1].due - b[1].due)[0];
      if (!entry || entry[1].due > end) break; assert.ok(work++ < 100, 'clock did not quiesce');
      now = entry[1].due; entry[1].due += entry[1].period; entry[1].run();}
    now = end;
  }, restore() {jobs.clear(); [globalThis.setInterval, globalThis.clearInterval] = saved;}};
}
function fixture(Viewport, browser = true, fallback = false) {
  const c = clock(), registrations = [], removals = []; let outside = false, outsideCalls = 0, widthReads = 0;
  const zone = {runOutsideAngular(run) {outsideCalls++; outside = true; try {return run();} finally {outside = false;}}};
  const target = new EventTarget(); let width = 640, height = 480;
  Object.defineProperty(target, 'innerWidth', {get() {widthReads++; return width;}, set(value) {width = value;}});
  Object.defineProperty(target, 'innerHeight', {get() {return height;}, set(value) {height = value;}});
  target.scrollY = 13; target.scrollX = 17;
  const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
  target.addEventListener = (name, listener) => {registrations.push({name, outside}); add(name, listener);};
  target.removeEventListener = (name, listener) => {removals.push(name); remove(name, listener);};
  const rect = {top: -41.25, left: -52.5};
  const element = {scrollTop: 23, scrollLeft: 29, getBoundingClientRect: () => rect};
  const document = {defaultView: fallback ? null : target, documentElement: element, body: {scrollTop: 7, scrollLeft: 11}};
  const hadWindow = Object.hasOwn(globalThis, 'window'), priorWindow = globalThis.window;
  if (fallback) globalThis.window = target;
  const platform = {isBrowser: browser};
  const viewport = new Viewport(platform, zone, document);
  let destroyed = false;
  return {c, target, viewport, platform, document, rect, registrations, removals,
    get outsideCalls() {return outsideCalls;}, get widthReads() {return widthReads;},
    event(name = 'resize') {const event = new Event(name); target.dispatchEvent(event); return event;},
    destroy() {if (!destroyed) {destroyed = true; viewport.ngOnDestroy();}},
    close() {try {this.destroy();} finally {c.restore(); if (hadWindow) globalThis.window = priorWindow; else delete globalThis.window;}}};
}
async function observations(Viewport) {
  const cases = [];
  async function check(id, run) {try {cases.push({id, result: 'pass', value: await run()});}
    catch (caught) {cases.push({id, result: 'fail', error: String(caught.message).slice(0, 600)});}}
  await check('one-owner-two-native-listeners-outside-zone', () => {const f = fixture(Viewport); try {
    assert.deepEqual(f.registrations, [{name: 'resize', outside: true}, {name: 'orientationchange', outside: true}]);
    assert.equal(f.outsideCalls, 1); f.destroy(); assert.deepEqual(f.removals, ['resize', 'orientationchange']);
    return {registrations: f.registrations, removals: f.removals};
  } finally {f.close();}});
  await check('size-copies-cache-and-default-twenty-ms-invalidation', () => {const f = fixture(Viewport); try {
    const first = f.viewport.getViewportSize(); first.width = 999;
    assert.deepEqual(f.viewport.getViewportSize(), {width: 640, height: 480}); assert.equal(f.widthReads, 1);
    f.target.innerWidth = 820; f.event(); f.c.advance(19);
    assert.equal(f.viewport.getViewportSize().width, 640); f.c.advance(1);
    assert.deepEqual(f.viewport.getViewportSize(), {width: 820, height: 480}); assert.equal(f.widthReads, 2);
    return {size: f.viewport.getViewportSize(), reads: f.widthReads};
  } finally {f.close();}});
  await check('default-change-audits-latest-event-and-cache-is-invalidated-first', () => {const f = fixture(Viewport); try {
    f.viewport.getViewportSize(); const observations = []; const sub = f.viewport.change().subscribe(event =>
      observations.push([event.type, f.viewport.getViewportSize().width]));
    f.target.innerWidth = 900; f.event('resize'); f.c.advance(7); f.event('orientationchange'); f.c.advance(12);
    assert.deepEqual(observations, []); f.c.advance(1); assert.deepEqual(observations, [['orientationchange', 900]]);
    sub.unsubscribe(); return observations;
  } finally {f.close();}});
  for (const delay of [0, -1]) await check('nonpositive-' + delay + '-shares-synchronous-subject', () => {const f = fixture(Viewport); try {
    assert.equal(f.viewport.change(0), f.viewport.change(-1)); const got = [];
    const sub = f.viewport.change(delay).subscribe(event => got.push(event)); const event = f.event();
    assert.deepEqual(got, [event]); sub.unsubscribe(); return got.map(event => event.type);
  } finally {f.close();}});
  await check('one-fifty-ms-control-stream-keeps-last-event', () => {const f = fixture(Viewport); try {
    const got = [], sub = f.viewport.change(150).subscribe(event => got.push(event.type));
    f.event(); f.c.advance(40); f.event('orientationchange'); f.c.advance(109); assert.deepEqual(got, []);
    f.c.advance(1); assert.deepEqual(got, ['orientationchange']); sub.unsubscribe(); return got;
  } finally {f.close();}});
  await check('pinch-zoom-client-rect-precedes-scroll-properties', () => {const f = fixture(Viewport); try {
    assert.deepEqual(f.viewport.getViewportScrollPosition(), {top: 41.25, left: 52.5});
    assert.deepEqual(f.viewport.getViewportRect(), {top: 41.25, left: 52.5, bottom: 521.25, right: 692.5, height: 480, width: 640});
    return f.viewport.getViewportRect();
  } finally {f.close();}});
  await check('body-window-element-zero-scroll-fallback-order', () => {const f = fixture(Viewport); try {
    f.rect.top = f.rect.left = 0; const values = [f.viewport.getViewportScrollPosition()];
    f.document.body.scrollTop = f.document.body.scrollLeft = 0; values.push(f.viewport.getViewportScrollPosition());
    f.target.scrollY = f.target.scrollX = 0; values.push(f.viewport.getViewportScrollPosition());
    f.document.documentElement.scrollTop = f.document.documentElement.scrollLeft = 0;
    values.push(f.viewport.getViewportScrollPosition());
    assert.deepEqual(values, [{top: 7, left: 11}, {top: 13, left: 17}, {top: 23, left: 29}, {top: 0, left: 0}]); return values;
  } finally {f.close();}});
  await check('document-default-view-and-global-window-fallback', () => {const f = fixture(Viewport, true, true); try {
    assert.deepEqual(f.viewport.getViewportSize(), {width: 640, height: 480});
    return f.viewport.getViewportRect();
  } finally {f.close();}});
  await check('nonbrowser-geometry-has-no-listeners-or-scroll-reads', () => {const f = fixture(Viewport, false); try {
    f.document.documentElement.getBoundingClientRect = () => {throw new Error('server scroll geometry read');};
    assert.deepEqual(f.registrations, []); assert.deepEqual(f.viewport.getViewportScrollPosition(), {top: 0, left: 0});
    assert.deepEqual(f.viewport.getViewportRect(), {top: 0, left: 0, bottom: 0, right: 0, height: 0, width: 0});
    assert.deepEqual(f.viewport.getViewportSize(), {width: 0, height: 0}); assert.equal(f.widthReads, 0);
    return {rect: f.viewport.getViewportRect(), registrations: f.registrations};
  } finally {f.close();}});
  await check('destroy-removes-events-completes-own-stream-without-destroying-borrowed-values', () => {const f = fixture(Viewport); try {
    const got = []; let complete = 0; f.platform.ngOnDestroy = f.document.ngOnDestroy = () => {throw new Error('borrowed dependency destroyed');};
    f.viewport.change(0).subscribe({next: event => got.push(event.type), complete: () => complete++});
    f.event(); f.destroy(); f.event('orientationchange'); assert.deepEqual(got, ['resize']); assert.equal(complete, 1);
    return {got, complete, removals: f.removals};
  } finally {f.close();}});
  await check('pending-audit-completion-remains-peer-operator-behavior', () => {const f = fixture(Viewport); try {
    const got = []; f.viewport.change(150).subscribe({next: event => got.push(event.type), complete: () => got.push('complete')});
    f.event(); f.destroy(); f.c.advance(150); return got;
  } finally {f.close();}});
  await check('unsubscribed-control-stream-does-not-complete-root-stream', () => {const f = fixture(Viewport); try {
    const got = [], root = f.viewport.change(0).subscribe(event => got.push(event.type));
    const control = f.viewport.change(150).subscribe(() => {throw new Error('unsubscribed control ran');});
    f.event(); control.unsubscribe(); f.c.advance(150); f.event('orientationchange');
    assert.deepEqual(got, ['resize', 'orientationchange']); root.unsubscribe(); return got;
  } finally {f.close();}});
  return cases;
}
const original = await observations(await load(reference, 'ViewportRuler'));
assert.ok(original.every(c => c.result === 'pass'), JSON.stringify(original.filter(c => c.result === 'fail')));
const candidate = await observations(await load(source, '_LegacyViewport'));
assert.deepEqual(candidate, original, 'owned results must match independently executed untouched tagged behavior');
const mutations = [];
for (const [id, altered] of [
  ['default-delay-one', source.replace('throttleTime: number = 20', 'throttleTime: number = 1')],
  ['no-orientation-listener', source.replace("target.addEventListener('orientationchange', state.listener);", '')],
  ['cache-invalidates-immediately', source.replace('this.change().subscribe(() => state.size = null)', 'this.change(0).subscribe(() => state.size = null)')],
  ['cache-exposed-to-callers', source.replace('const result = {...state.size};', 'const result = state.size;')],
  ['window-scroll-before-client-rect', source.replace('-rect.top || document.body.scrollTop || target.scrollY', 'target.scrollY || document.body.scrollTop || -rect.top')],
  ['no-listener-removal', source.replace("target.removeEventListener('resize', state.listener);", '')],
  ['no-root-completion', source.replace('state.changes.complete();', '')],
]) {
  assert.notEqual(altered, source, id + ': mutation did not apply');
  const results = await observations(await load(altered, '_LegacyViewport'));
  assert.notDeepEqual(results, original, id + ': mutation escaped');
  mutations.push({id, rejected: true, failed_cases: results.filter((c, i) => JSON.stringify(c) !== JSON.stringify(original[i])).map(c => c.id)});
}
const report = {schema_version: 1, role: 'Owned legacy viewport native primitives vs independent untouched tagged execution; source/synthetic window/clock only',
  node: process.version, compiler: ts.version, source: {path: sourcePath, sha256: sha(source)},
  untouched_reference: {path: referencePath, sha256: sha(reference)}, original, candidate, mutations,
  limits: ['Reference bytes remain untouched; only its DOCUMENT import resolves to the current public Core token for manual constructor execution.',
    'Both classes execute against the same borrowed installed RxJS/Angular22 runtime with synthetic windows/geometry/clock.',
    'Cache/event/scroll observations come from tagged code, not candidate expectations or current private ruler execution.',
    'No native Angular zoneful/zoneless/root-singleton/AOT/packed/actual21/minimum/floor qualification.']};
const argv = process.argv.slice(2), at = argv.indexOf('--report');
if (at !== -1) {assert.equal(existsSync(argv[at + 1]), false); writeFileSync(argv[at + 1], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({tagged_cases: original.length, candidate_cases: candidate.length, mutants_rejected: mutations.length,
  node: process.version, compiler: ts.version}));
