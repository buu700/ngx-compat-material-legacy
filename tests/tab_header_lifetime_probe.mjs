/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned header/resize helper/public key manager; synthetic geometry/clock only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url), ts = require('typescript');
const url = name => pathToFileURL(require.resolve(name)).href;
await import(url('@angular/compiler'));
const core = await import(url('@angular/core'));
const {Subject, Observable} = await import(url('rxjs'));
const sourcePath = 'projects/ngx-material-legacy/legacy-tabs/internal/paginated-tab-header.ts';
const helperPath = 'projects/ngx-material-legacy/legacy-tabs/internal/owned-header-resize.ts';
const source = readFileSync(resolve(root, sourcePath), 'utf8');
const helper = readFileSync(resolve(root, helperPath), 'utf8');
const sha = text => createHash('sha256').update(text).digest('hex');
const data = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext, experimentalDecorators: true}}).outputText
  .replace(/(['"])(@angular\/[^'"]+|rxjs(?:\/operators)?)\1/g, (_, quote, name) => JSON.stringify(url(name)));
const helperUrl = data(emit(helper));
const viewportPath = 'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts';
const viewportUrl = data(emit(readFileSync(resolve(root, viewportPath), 'utf8')));
async function load(text = source) {
  return (await import(data(emit(text).replaceAll("'./owned-header-resize'", JSON.stringify(helperUrl))
    .replaceAll("'@ngx-compat/material-legacy/legacy-core'", JSON.stringify(viewportUrl)))))
    .MatPaginatedTabHeader;
}
function clock() {
  const saved = ['setInterval', 'clearInterval'].map(name => [name, globalThis[name]]);
  let now = 0, next = 1; const jobs = new Map();
  globalThis.setInterval = (callback, delay = 0, ...args) => {
    const id = next++, period = Math.max(Number(delay), 1);
    jobs.set(id, {callback: () => callback(...args), period, due: now + period}); return id;
  };
  globalThis.clearInterval = id => jobs.delete(id);
  return {jobs, advance(duration) {
    const end = now + duration; let iterations = 0;
    while (true) {
      const entry = [...jobs].sort((a, b) => a[1].due - b[1].due)[0];
      if (!entry || entry[1].due > end) break;
      assert.ok(iterations++ < 100, 'clock work did not terminate');
      now = entry[1].due; entry[1].due += entry[1].period; entry[1].callback();
    }
    now = end;
  }, restore() {jobs.clear(); for (const [name, value] of saved) globalThis[name] = value;}};
}
function fixture(Base, options = {}) {
  const c = clock(), resizeObservers = [], hadResize = Object.hasOwn(globalThis, 'ResizeObserver');
  const savedResize = globalThis.ResizeObserver;
  class ResizeObserver {
    constructor(callback) {this.callback = callback; this.targets = []; this.disconnected = false; resizeObservers.push(this);}
    observe(target) {this.targets.push(target);}
    disconnect() {this.disconnected = true;}
  }
  globalThis.ResizeObserver = ResizeObserver;
  const counts = {marks: 0, ink: 0, hidden: 0, focus: 0, stable: 0, viewport: 0, direction: 0,
    outside: 0, runs: 0, keyDestroy: 0, measurements: 0, scrollWrites: 0};
  const writes = [], stable = new Subject(), viewport = new Subject(), direction = new Subject();
  const tracked = (subject, name) => new Observable(observer => {
    counts[name]++; const subscription = subject.subscribe(observer);
    return () => {counts[name]--; subscription.unsubscribe();};
  });
  const zone = {onStable: tracked(stable, 'stable'), runOutsideAngular(run) {counts.outside++; return run();},
    run(run) {counts.runs++; return run();}};
  const detector = {markForCheck() {counts.marks++; options.onMark?.(header);}};
  const rulerCalls = [], ruler = {change(delay) {rulerCalls.push(delay); return tracked(viewport, 'viewport');}};
  const dir = {value: options.rtl ? 'rtl' : 'ltr', change: tracked(direction, 'direction')};
  const nodes = [];
  function node(name, width = 90) {
    const value = new EventTarget(); value.name = name; let scrollWidth = 300;
    Object.defineProperties(value, {
      offsetWidth: {get() {counts.measurements++; return width;}, set(val) {width = val;}},
      scrollWidth: {get() {counts.measurements++; return scrollWidth;}, set(val) {scrollWidth = val;}},
    });
    value.offsetLeft = nodes.length * 100; let scrollLeft = 0; value.textContent = name;
    Object.defineProperty(value, 'scrollLeft', {get() {return scrollLeft;},
      set(val) {counts.scrollWrites++; scrollLeft = val;}});
    value.style = new Proxy({}, {set(target, key, val) {writes.push([name, key, val]); target[key] = val; return true;}});
    nodes.push(value); return value;
  }
  class Header extends Base {_itemSelected() {}}
  const header = new Header(new core.ElementRef(node('host')), detector, ruler, dir, zone,
    {isBrowser: true, TRIDENT: !!options.trident, EDGE: !!options.edge}, undefined);
  header._items = new core.QueryList();
  header._items.reset([0, 1, 2].map(index => ({disabled: false,
    elementRef: new core.ElementRef(node('item' + index)), focus() {counts.focus++;}})));
  header._inkBar = {alignToElement() {counts.ink++;}, hide() {counts.hidden++;}};
  for (const name of ['_tabListContainer', '_tabList', '_tabListInner', '_nextPaginator', '_previousPaginator'])
    header[name] = new core.ElementRef(node(name));
  header._tabListInner.nativeElement.offsetWidth = 300;
  let destroyed = false;
  return {header, c, counts, writes, stable, viewport, direction, resizeObservers, rulerCalls,
    init() {header.ngAfterContentInit(); header.ngAfterViewInit();},
    destroy() {if (!destroyed) {destroyed = true; header.ngOnDestroy();}},
    close() {
      try {this.destroy();} finally {
        c.restore(); if (hadResize) globalThis.ResizeObserver = savedResize; else delete globalThis.ResizeObserver;
      }
    }};
}
const work = f => [f.counts.marks, f.counts.ink, f.counts.hidden, f.counts.focus, f.writes.length,
  f.counts.measurements, f.header.scrollDistance, f.counts.scrollWrites];
async function observations(Base) {
  const cases = []; async function check(id, run) {
    try {await run(); cases.push({id, result: 'pass'});} catch (error) {
      cases.push({id, result: 'fail', error: String(error.message).slice(0, 400)});
    }
  }
  await check('live-initial-stable-realignment-remains-once', async () => {
    const f = fixture(Base); try {f.init(); assert.equal(f.counts.stable, 1); assert.deepEqual(f.rulerCalls, [150]);
      f.stable.next(); assert.equal(f.counts.ink, 1); assert.equal(f.counts.stable, 0);
      f.stable.next(); assert.equal(f.counts.ink, 1);
    } finally {f.close();}
  });
  await check('destroy-before-stable-unsubscribes-without-late-work', async () => {
    const f = fixture(Base); try {f.init(); f.destroy(); assert.equal(f.counts.stable, 0);
      const before = work(f); f.stable.next(); assert.deepEqual(work(f), before);
    } finally {f.close();}
  });
  for (const kind of ['viewport', 'direction', 'items']) await check(kind + '-queued-realignment-is-cancelled-on-destroy', async () => {
    const f = fixture(Base); try {f.init(); f.stable.next();
      if (kind === 'items') f.header._items.notifyOnChanges(); else f[kind].next('rtl');
      f.destroy(); const before = work(f); await Promise.resolve(); assert.deepEqual(work(f), before);
    } finally {f.close();}
  });
  await check('live-viewport-realignment-remains-deferred-and-clamps', async () => {
    const f = fixture(Base); try {f.init(); f.stable.next(); f.header.scrollDistance = 180;
      f.header._tabListInner.nativeElement.scrollWidth = 180;
      const before = f.counts.ink; f.viewport.next(); assert.equal(f.counts.ink, before);
      await Promise.resolve(); assert.equal(f.counts.ink, before + 1); assert.equal(f.header.scrollDistance, 90);
    } finally {f.close();}
  });
  await check('destroy-in-index-focused-observer-prevents-own-and-public-parent-focus', async () => {
    const f = fixture(Base); try {f.init(); f.header.indexFocused.subscribe(() => f.destroy());
      f.header.focusIndex = 1; assert.equal(f.counts.focus, 0); assert.equal(f.header._keyManager.activeItem, null);
    } finally {f.close();}
  });
  await check('destroy-during-focus-pagination-mark-prevents-label-focus', async () => {
    let enabled = false; const f = fixture(Base, {onMark: header => {if (enabled) header.ngOnDestroy();}});
    try {f.init(); f.stable.next(); enabled = true; f.header.focusIndex = 1;
      assert.equal(f.counts.focus, 0);
    } finally {f.close();}
  });
  for (const rtl of [false, true]) await check((rtl ? 'rtl' : 'ltr') + '-destroy-in-label-focus-prevents-container-scroll-reset', async () => {
    const f = fixture(Base, {rtl}); try {f.init(); const before = f.counts.scrollWrites, measured = f.counts.measurements;
      f.header._items.get(0).focus = () => {f.counts.focus++; f.destroy();};
      f.header._setTabFocus(0); assert.equal(f.counts.focus, 1);
      assert.equal(f.counts.scrollWrites, before); assert.equal(f.counts.measurements, measured);
    } finally {f.close();}
  });
  await check('destroy-is-idempotent-and-releases-live-observers', async () => {
    const f = fixture(Base); try {f.init(); const manager = f.header._keyManager, originalDestroy = manager.destroy.bind(manager);
      manager.destroy = () => {f.counts.keyDestroy++; originalDestroy();};
      f.destroy(); f.header.ngOnDestroy(); assert.equal(f.counts.keyDestroy, 1);
      assert.equal(f.counts.viewport, 0); assert.equal(f.counts.direction, 0); assert.equal(f.counts.stable, 0);
      assert.ok(f.resizeObservers.every(o => o.disconnected));
    } finally {f.close();}
  });
  await check('destroy-before-hooks-cannot-register-new-observers', async () => {
    const f = fixture(Base); try {f.destroy(); f.init();
      assert.equal(f.counts.stable, 0); assert.equal(f.counts.viewport, 0); assert.equal(f.counts.direction, 0);
      assert.equal(f.resizeObservers.length, 0); assert.equal(f.c.jobs.size, 0);
    } finally {f.close();}
  });
  await check('late-content-callback-does-not-reenter-zone-after-destroy', async () => {
    const f = fixture(Base); try {f.init(); f.destroy(); const before = work(f), runs = f.counts.runs;
      f.header._onContentChanges(); assert.deepEqual(work(f), before); assert.equal(f.counts.runs, runs);
    } finally {f.close();}
  });
  await check('destroy-releases-own-subscriptions-without-completing-borrowed-streams', async () => {
    const f = fixture(Base), events = [];
    const borrowed = [f.stable, f.viewport, f.direction].map((subject, index) => subject.subscribe(() => events.push(index)));
    try {f.init(); f.destroy(); f.stable.next(); f.viewport.next(); f.direction.next(); assert.deepEqual(events, [0, 1, 2]);
    } finally {borrowed.forEach(s => s.unsubscribe()); f.close();}
  });
  await check('left-paginator-press-cancels-default-focus-and-retains-hold-scroll', async () => {
    const f = fixture(Base); try {f.init();
      const event = new Event('mousedown', {cancelable: true}); Object.defineProperty(event, 'button', {value: 0});
      f.header._handlePaginatorPress('after', event); assert.equal(event.defaultPrevented, true);
      assert.equal(f.c.jobs.size, 1); f.c.advance(650); assert.equal(f.header.scrollDistance, 30);
      f.header._stopInterval(); assert.equal(f.c.jobs.size, 0);
    } finally {f.close();}
  });
  await check('destroy-in-event-cancellation-cannot-start-a-paginator-timer', async () => {
    const f = fixture(Base); try {f.init();
      const event = new Event('mousedown', {cancelable: true}); Object.defineProperty(event, 'button', {value: 0});
      const prevent = event.preventDefault.bind(event); event.preventDefault = () => {prevent(); f.destroy();};
      f.header._handlePaginatorPress('after', event); assert.equal(event.defaultPrevented, true);
      assert.equal(f.c.jobs.size, 0);
    } finally {f.close();}
  });
  await check('right-paginator-press-keeps-default-and-does-not-scroll', async () => {
    const f = fixture(Base); try {f.init();
      const event = new Event('mousedown', {cancelable: true}); Object.defineProperty(event, 'button', {value: 2});
      f.header._handlePaginatorPress('after', event); assert.equal(event.defaultPrevented, false);
      assert.equal(f.c.jobs.size, 0);
    } finally {f.close();}
  });
  await check('destroyed-paginator-press-leaves-event-default-untouched', async () => {
    const f = fixture(Base); try {f.init(); f.destroy();
      const event = new Event('mousedown', {cancelable: true}); Object.defineProperty(event, 'button', {value: 0});
      f.header._handlePaginatorPress('after', event); assert.equal(event.defaultPrevented, false);
      assert.equal(f.c.jobs.size, 0);
    } finally {f.close();}
  });
  await check('destroy-cancels-active-paginator-timer', async () => {
    const f = fixture(Base); try {f.init(); f.header._handlePaginatorPress('after'); assert.equal(f.c.jobs.size, 1);
      f.destroy(); assert.equal(f.c.jobs.size, 0); const before = work(f); f.c.advance(850); assert.deepEqual(work(f), before);
    } finally {f.close();}
  });
  await check('late-paginator-press-cannot-create-new-timer-after-destroy', async () => {
    const f = fixture(Base); try {f.init(); f.destroy(); f.header._handlePaginatorPress('after');
      assert.equal(f.c.jobs.size, 0);
    } finally {f.close();}
  });
  await check('live-paginator-delay-interval-stop-and-right-button-remain', async () => {
    const f = fixture(Base); try {f.init(); f.header._handlePaginatorPress('after', {button: 2}); assert.equal(f.c.jobs.size, 0);
      f.header._handlePaginatorPress('after'); f.c.advance(649); assert.equal(f.header.scrollDistance, 0);
      f.c.advance(1); assert.equal(f.header.scrollDistance, 30); f.c.advance(100); assert.equal(f.header.scrollDistance, 60);
      f.header._stopInterval(); assert.equal(f.c.jobs.size, 0);
    } finally {f.close();}
  });
  await check('destroy-cancels-debounced-header-resize-and-disconnects-observers', async () => {
    const f = fixture(Base); try {f.init(); f.stable.next();
      f.resizeObservers[0].callback([{contentRect: {width: 90, height: 30}}]); assert.equal(f.c.jobs.size, 1);
      f.destroy(); assert.equal(f.c.jobs.size, 0); const before = work(f);
      for (const observer of f.resizeObservers) observer.callback([{contentRect: {width: 100, height: 30}}]);
      f.c.advance(100); await Promise.resolve(); assert.deepEqual(work(f), before);
    } finally {f.close();}
  });
  await check('destroy-during-pagination-mark-prevents-later-style-and-ink-work', async () => {
    let enabled = false; const f = fixture(Base, {onMark: header => {if (enabled) header.ngOnDestroy();}});
    try {f.init(); enabled = true; f.stable.next(); assert.equal(f.writes.length, 0); assert.equal(f.counts.ink, 0);
      assert.equal(f.counts.marks, 1);
    } finally {f.close();}
  });
  for (const rtl of [false, true]) await check((rtl ? 'rtl' : 'ltr') + '-live-transform-rounding-and-legacy-scroll-reset', async () => {
    const f = fixture(Base, {rtl, trident: true}); try {
      f.header.scrollDistance = 31.5; f.header._tabListContainer.nativeElement.scrollLeft = 20;
      f.header._updateTabScrollPosition();
      assert.equal(f.header._tabList.nativeElement.style.transform, `translateX(${rtl ? 32 : -31}px)`);
      assert.equal(f.header._tabListContainer.nativeElement.scrollLeft, 0);
      f.header.disablePagination = true; const count = f.writes.length;
      f.header._updateTabScrollPosition(); assert.equal(f.writes.length, count);
    } finally {f.close();}
  });
  return cases;
}
const argv = process.argv.slice(2), baseline = argv.includes('--baseline');
const cases = await observations(await load());
if (!baseline) assert.ok(cases.every(c => c.result === 'pass'), JSON.stringify(cases.filter(c => c.result === 'fail')));
const report = {schema_version: 1, role: 'Owned tab-header source lifecycle/state and targeted transform diagnostic only',
  line: JSON.parse(readFileSync(resolve(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main',
  node: process.version, compiler: ts.version, runtime_peer: core.VERSION.full,
  sources: [{path: sourcePath, sha256: sha(source)}, {path: helperPath, sha256: sha(helper)}], cases,
  limits: ['Actual owned class/helper and public current22 FocusKeyManager execute; geometry/events/clock are synthetic.',
    'No native browser rendering, actual21 runtime, AOT, packed, canonical or minimum runtime/compiler qualification.',
    'Viewport private-source boundary, table/menu constructors and every other plan requirement remain separate.']};
if (!baseline) {
  report.mutations = [];
  const mutants = [
    ['leaked-stable-subscription', source.replace('take(1), takeUntil(this._destroyed)', 'take(1)'),
      'destroy-before-stable-unsubscribes-without-late-work'],
    ['stale-promise-realignment', source.replace('Promise.resolve().then(() => {\n            if (this._isDestroyed) return;',
      'Promise.resolve().then(() => {'), 'viewport-queued-realignment-is-cancelled-on-destroy'],
    ['public-parent-focus-continuation', source.replace('this._keyManager?.updateActiveItem(-1);', ''),
      'destroy-in-index-focused-observer-prevents-own-and-public-parent-focus'],
    ['repeated-destruction', source.replace('ngOnDestroy() {\n    if (this._isDestroyed) return;', 'ngOnDestroy() {'),
      'destroy-is-idempotent-and-releases-live-observers'],
    ['event-cancellation-after-destruction', source.replace('this._isDestroyed || (mouseEvent && mouseEvent.button != null && mouseEvent.button !== 0)',
      '(mouseEvent && mouseEvent.button != null && mouseEvent.button !== 0)'), 'destroyed-paginator-press-leaves-event-default-untouched'],
    ['late-timer-after-event-cancellation', source.replace('mouseEvent?.preventDefault?.();\n    if (this._isDestroyed) return;', 'mouseEvent?.preventDefault?.();'), 'destroy-in-event-cancellation-cannot-start-a-paginator-timer'],
    ['removed-pointer-focus-cancellation', source.replace('mouseEvent?.preventDefault?.();', ''), 'left-paginator-press-cancels-default-focus-and-retains-hold-scroll'],
    ['pagination-after-destruction-mark', source.replace('this._checkPaginationEnabled();\n    if (this._isDestroyed) return;',
      'this._checkPaginationEnabled();'), 'destroy-during-pagination-mark-prevents-later-style-and-ink-work'],
    ['late-content-zone-reentry', source.replace('_onContentChanges() {\n    if (this._isDestroyed) return;', '_onContentChanges() {'),
      'late-content-callback-does-not-reenter-zone-after-destroy'],
    ['hooks-after-destruction', source.replace('ngAfterContentInit() {\n    if (this._isDestroyed) return;', 'ngAfterContentInit() {'),
      'destroy-before-hooks-cannot-register-new-observers'],
    ['focus-after-pagination-destroy', source.replace('this._scrollToLabel(tabIndex);\n      if (this._isDestroyed) return;',
      'this._scrollToLabel(tabIndex);'), 'destroy-during-focus-pagination-mark-prevents-label-focus'],
    ['container-after-label-destroy', source.replace('this._items.toArray()[tabIndex].focus();\n      if (this._isDestroyed) return;',
      'this._items.toArray()[tabIndex].focus();'), 'rtl-destroy-in-label-focus-prevents-container-scroll-reset'],
  ];
  for (const [id, text, caseId] of mutants) {
    assert.notEqual(text, source, 'mutation did not change source: ' + id);
    const observation = (await observations(await load(text))).find(c => c.id === caseId);
    assert.equal(observation.result, 'fail', 'mutation escaped its lifetime assertion: ' + id);
    report.mutations.push({id, rejected_by: caseId, observed_failure: observation.error});
  }
}
const at = argv.indexOf('--report');
if (at !== -1) {assert.equal(existsSync(argv[at + 1]), false); writeFileSync(argv[at + 1], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({cases: cases.length, failed: cases.filter(c => c.result === 'fail'),
  mutants_rejected: report.mutations?.length || 0, node: report.node, compiler: report.compiler, runtime_peer: report.runtime_peer}));
