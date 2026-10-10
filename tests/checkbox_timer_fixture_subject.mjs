/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [mode, production, variant] = process.argv.slice(2);
if (production === 'true') globalThis.ngDevMode = false;
if (mode === 'zoneful') await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const browser = await import('@angular/platform-browser');
const payload = JSON.parse(readFileSync(new URL('./checkbox-timer-fixture-payload.json', import.meta.url)));
const nativeOkay = new Function('return (' + payload.contract + ')')();
class NodeProtocol {
  constructor(name) {this.name = name; this.children = []; this.attributes = new Map();}
  get isConnected() {return this.rootConnected || !!this.parent?.isConnected;}
  hasAttribute(name) {return this.attributes.has(name);}
}
class HTMLElementProtocol extends NodeProtocol {}
globalThis.HTMLElement = HTMLElementProtocol;
const host = new HTMLElementProtocol('host'); host.rootConnected = true;
const insert = (parent, child, before) => {
  if (child.parent) child.parent.children = child.parent.children.filter(node => node !== child);
  const index = before ? parent.children.indexOf(before) : -1;
  parent.children.splice(index < 0 ? parent.children.length : index, 0, child); child.parent = parent;
};
const renderer = {data: {}, destroy() {}, createElement: name => new HTMLElementProtocol(name),
  createComment: text => Object.assign(new NodeProtocol('comment'), {textContent: text}),
  createText: text => Object.assign(new NodeProtocol('text'), {textContent: text}),
  appendChild: (parent, child) => insert(parent, child), insertBefore: insert,
  removeChild(parent, child) {if (parent) parent.children = parent.children.filter(node => node !== child); child.parent = null;},
  selectRootElement: () => host, parentNode: node => node.parent || null,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
  setAttribute: (node, key, value) => node.attributes.set(key, value), removeAttribute: (node, key) => node.attributes.delete(key),
  addClass() {}, removeClass() {}, setStyle() {}, removeStyle() {}, setProperty: (node, key, value) => {node[key] = value;},
  setValue: (node, value) => {node.textContent = value;}, listen: () => () => {}};
const nativeSetTimeout = setTimeout, nativeClearTimeout = clearTimeout;
const clockJobs = new Map(); let clockNow = 0, clockSerial = 0;
const clockTimeout = (fn, ms) => {
  // Render deadlines remain real; the normal Angular scheduler is not replaced.
  if (ms === 500) return nativeSetTimeout(fn, ms);
  const id = clockSerial++; clockJobs.set(id, {fn, due: clockNow + ms}); return id;
};
const clockClear = id => typeof id === 'number' ? clockJobs.delete(id) : nativeClearTimeout(id);
async function drive(promise) {
  let done = false, value, failure;
  promise.then(result => {done = true; value = result;}, error => {done = true; failure = error;});
  const deadline = Date.now() + 3000;
  while (!done && Date.now() < deadline) {
    await new Promise(resolve => nativeSetTimeout(resolve, 1));
    const next = [...clockJobs].sort((a, b) => a[1].due - b[1].due)[0];
    if (next) {clockNow = next[1].due; clockJobs.delete(next[0]); next[1].fn();}
  }
  assert.equal(done, true, 'fixture clock/view wiring did not settle');
  if (failure) throw failure; return value;
}
const observers = new Map();
class ObserverProtocol {
  records = [];
  constructor(callback) {this.callback = callback;}
  observe(node) {this.node = node; observers.set(node, this);}
  takeRecords() {const rows = this.records; this.records = []; return rows;}
  disconnect() {observers.delete(this.node);}
}
let created = 0, initialized = 0, destroyed = 0;
class CheckboxProtocol {
  checked = false;
  node = core.inject(core.ElementRef).nativeElement;
  timers = new Set();
  classes = new Set();
  clicks = 0;
  constructor() {
    created++;
    const writes = () => observers.get(this.node)?.records.push({attributeName: 'class'});
    this.node.classList = {contains: name => this.classes.has(name), [Symbol.iterator]: () => this.classes[Symbol.iterator]()};
    this.path = {addEventListener: (_name, callback) => {this.ended = callback;}, removeEventListener: () => {this.ended = undefined;}};
    this.node.querySelector = selector => selector.includes('input') ? {click: () => this.click()} : this.path;
    this.add = name => {this.classes.add(name); writes();};
    this.remove = name => {this.classes.delete(name); writes();};
  }
  ngAfterViewInit() {initialized++;}
  click() {
    this.checked = !this.checked; this.clicks++;
    const name = this.checked ? 'mat-checkbox-anim-unchecked-checked' : 'mat-checkbox-anim-checked-unchecked';
    if (this.previous) this.remove(this.previous);
    this.add(name); this.previous = name;
    const cleanup = {name, id: undefined};
    cleanup.id = clockTimeout(() => {
      this.timers.delete(cleanup);
      if (variant === 'old-cleanup' || !Array.from(this.timers).some(pending => pending.name === name)) this.remove(name);
    }, 1000);
    this.timers.add(cleanup);
    if (this.clicks === 3) clockTimeout(() => {
      if (this.classes.has(name)) this.ended?.({target: this.path, isTrusted: variant !== 'untrusted-animation',
        animationName: 'mat-checkbox-unchecked-checked-checkmark-path', elapsedTime: 0.18});
    }, 180);
  }
  ngOnDestroy() {
    destroyed++;
    if (variant !== 'late-write') this.timers.forEach(timer => clockClear(timer.id));
    this.timers.clear();
    for (const name of [...this.classes]) this.remove(name);
  }
}
core.Directive({selector: 'mat-checkbox', standalone: false})(CheckboxProtocol);
const exported = {};
new Function('exports', 'Component', 'Directive', 'ViewChild', 'TemplateRef', 'ViewContainerRef', 'signal', 'inject', 'Injector',
  'afterNextRender', 'MatLegacyCheckbox', 'setTimeout', 'clearTimeout', 'performance', 'getComputedStyle', 'MutationObserver', payload.fixture)
  (exported, core.Component, core.Directive, core.ViewChild, core.TemplateRef, core.ViewContainerRef, core.signal, core.inject,
    core.Injector, core.afterNextRender, CheckboxProtocol, clockTimeout, clockClear,
    {now: () => clockNow}, () => ({animationName: 'mat-checkbox-unchecked-checked-checkmark-path', animationDuration: '0.18s'}), ObserverProtocol);
class FixtureModule {}
core.NgModule({declarations: [exported.CheckboxTimerLifetimeLab, exported.CaptureCheckboxTimerLifetime, CheckboxProtocol]})(FixtureModule);
const app = await browser.createApplication({providers: [
  core[mode === 'zoneful' ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'](),
  {provide: common.IMAGE_CONFIG, useValue: {disableImageSizeWarning: true, disableImageLazyLoadWarning: true}},
  {provide: core.DOCUMENT, useValue: {head: {children: [], querySelectorAll: () => []}}},
  {provide: core.RendererFactory2, useValue: {createRenderer: () => renderer}},
]});
let module, component;
try {
  module = core.createNgModule(FixtureModule, app.injector);
  component = core.createComponent(exported.CheckboxTimerLifetimeLab, {environmentInjector: module.injector, hostElement: host});
  app.attachView(component.hostView); app.tick();
  assert.equal(created, 0);
  const observation = await drive(component.instance.run());
  assert.equal(observation.error, undefined, observation.error);
  assert.equal(created, 2); assert.equal(initialized, 2); assert.equal(destroyed, 2);
  assert.equal(observation.survives_old_cleanup, variant !== 'old-cleanup');
  assert.equal(observation.late_class_writes, variant === 'late-write' ? 1 : 0);
  assert.equal(observation.trusted_animation_ends, ['old-cleanup', 'untrusted-animation'].includes(variant) ? 0 : 1);
  assert.equal(nativeOkay(observation), variant === 'live');
  if (variant === 'live') {
    const repeated = component.instance.run();
    await assert.rejects(component.instance.run(), /already running/);
    assert.equal(nativeOkay(await drive(repeated)), true);
    assert.equal(created, 4); assert.equal(initialized, 4); assert.equal(destroyed, 4);
  }
  console.log(JSON.stringify({variant, actual_public_view_initialization_destruction_and_node_DI: true,
    scheduled_render_after_initial_tick: true, explicit_checkbox_DOM_CSS_event_observer_and_virtual_clock_protocols: true,
    actual_legacy_checkbox_executed: false, native_executed: false}));
} finally {component?.destroy(); module?.destroy(); app.destroy(); core.destroyPlatform();}
