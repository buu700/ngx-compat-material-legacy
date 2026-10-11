/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
const [line, production, variant = 'valid'] = process.argv.slice(2);
globalThis.ngDevMode = production !== 'true';
await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const a11y = await import('@angular/cdk/a11y'), platform = await import('@angular/cdk/platform');
const {Subject} = await import('rxjs');
const cases = [], check = (id, action) => {action(); cases.push(id);};
const listeners = () => ({handlers: new Map(),
  addEventListener(name, fn) {if (!this.handlers.has(name)) this.handlers.set(name, new Set()); this.handlers.get(name).add(fn);},
  removeEventListener(name, fn) {this.handlers.get(name)?.delete(fn);},
  dispatch(event) {for (const fn of [...(this.handlers.get(event.type) || [])]) fn(event);},
  count() {return [...this.handlers.values()].reduce((n, set) => n + set.size, 0);}});
const windowProtocol = listeners(), documentProtocol = {...listeners(), activeElement: null, defaultView: windowProtocol};
class ElementProtocol {
  nodeType = 1;
  parentElement = null;
  focusOptions = [];
  classes = new Set();
  classList = {toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)};
  contains(node) {for (; node; node = node.parentElement) if (node === this) return true; return false;}
  focus(options) {this.focusOptions.push(options); documentProtocol.activeElement = this;
    documentProtocol.dispatch({type: 'focus', target: this});}
}
// Only the relatedTarget instance check uses this protocol class. No browser globals are emulated otherwise.
globalThis.Node = ElementProtocol;
const modality = new Subject(), zoneProtocol = {run: fn => fn(), runOutsideAngular: fn => fn()};
const create = browser => core.Injector.create({providers: [a11y.FocusMonitor,
  {provide: core.NgZone, useValue: zoneProtocol},
  {provide: platform.Platform, useValue: {isBrowser: browser}},
  {provide: a11y.InputModalityDetector, useValue: {modalityDetected: modality, mostRecentTarget: null}},
  {provide: common.DOCUMENT, useValue: documentProtocol}]});
const injector = create(true), service = injector.get(a11y.FocusMonitor);
assert.equal(Object.getPrototypeOf(service), a11y.FocusMonitor.prototype);
if (variant === 'skip-stop') service.stopMonitoring = () => {};
if (variant === 'lose-options') {const focus = service.focusVia.bind(service); service.focusVia = (el, origin) => focus(el, origin);}
if (variant === 'lose-child-monitor') {const monitor = service.monitor.bind(service); service.monitor = el => monitor(el, false);}
try {
  check('public-service-token-and-inherited-injector-identity', () => {
    assert.equal(injector.get(a11y.FocusMonitor), service);
    const child = core.Injector.create({providers: [], parent: injector});
    try {assert.equal(child.get(a11y.FocusMonitor), service);}
    finally {child.destroy();}
    assert.throws(() => injector.get(new core.InjectionToken('FocusMonitor')));
  });
  check('element-ref-native-alias-and-repeat-monitor-cache', () => {
    const element = new ElementProtocol(), ref = new core.ElementRef(element);
    const stream = service.monitor(ref, false), events = [];
    stream.subscribe({next: value => events.push(value), complete: () => events.push('complete')});
    assert.equal(service.monitor(element), stream);
    const options = {preventScroll: true};
    service.focusVia(ref, 'keyboard', options);
    assert.equal(element.focusOptions[0], options);
    assert.deepEqual(events, ['keyboard']);
    assert.ok(element.classes.has('cdk-focused') && element.classes.has('cdk-keyboard-focused'));
    // Calling focusVia on the active element must still update origin and shared classes.
    service.focusVia(element, 'mouse');
    assert.equal(element.focusOptions.length, 1);
    assert.deepEqual(events, ['keyboard', 'mouse']);
    assert.ok(element.classes.has('cdk-mouse-focused') && !element.classes.has('cdk-keyboard-focused'));
    documentProtocol.dispatch({type: 'blur', target: element, relatedTarget: null});
    assert.deepEqual(events, ['keyboard', 'mouse', null]);
    service.stopMonitoring(ref); service.stopMonitoring(element);
    assert.deepEqual(events, ['keyboard', 'mouse', null, 'complete']);
    assert.equal(element.classes.size, 0);
    assert.equal(documentProtocol.count(), 0); assert.equal(windowProtocol.count(), 0);
  });
  check('child-monitor-escalation-and-internal-blur', () => {
    const parent = new ElementProtocol(), child = new ElementProtocol(); child.parentElement = parent;
    const stream = service.monitor(parent, false), events = [];
    stream.subscribe({next: value => events.push(value), complete: () => events.push('complete')});
    service.focusVia(child, 'keyboard'); assert.deepEqual(events, []);
    assert.equal(service.monitor(new core.ElementRef(parent), true), stream);
    service.focusVia(child, 'program'); assert.deepEqual(events, ['program']);
    documentProtocol.dispatch({type: 'blur', target: child, relatedTarget: parent});
    assert.deepEqual(events, ['program']);
    documentProtocol.dispatch({type: 'blur', target: child, relatedTarget: null});
    assert.deepEqual(events, ['program', null]);
    service.stopMonitoring(parent); assert.deepEqual(events, ['program', null, 'complete']);
  });
  check('public-factory-has-explicit-manual-construction-difference', () => {
    if (line === 'original') {
      const manual = new a11y.FocusMonitor(zoneProtocol, {isBrowser: false},
        {modalityDetected: modality}, documentProtocol);
      assert.ok(manual instanceof a11y.FocusMonitor); manual.ngOnDestroy();
    } else assert.throws(() => new a11y.FocusMonitor(), error => error.code === -203);
  });
  check('non-element-and-server-monitor-complete-without-events', () => {
    for (const server of [false, true]) {
      const scoped = create(!server);
      try {
        let completed = 0, emitted = 0;
        const element = server ? new ElementProtocol() : {nodeType: 3};
        scoped.get(a11y.FocusMonitor).monitor(new core.ElementRef(element), true)
          .subscribe({next: () => emitted++, complete: () => completed++});
        assert.equal(completed, 1); assert.equal(emitted, 0);
        scoped.get(a11y.FocusMonitor).stopMonitoring(element);
      } finally {scoped.destroy();}
    }
  });
  check('injector-destruction-completes-streams-and-removes-listeners', () => {
    const a = new ElementProtocol(), b = new ElementProtocol(), events = [];
    service.monitor(a).subscribe({complete: () => events.push('a')});
    service.monitor(b, true).subscribe({complete: () => events.push('b')});
    assert.equal(documentProtocol.count(), 2); assert.equal(windowProtocol.count(), 1);
    injector.destroy(); assert.deepEqual(events, ['a', 'b']);
    assert.equal(documentProtocol.count(), 0); assert.equal(windowProtocol.count(), 0);
  });
} finally {if (!injector.destroyed) injector.destroy(); modality.complete();}
console.log(JSON.stringify({line, production: production === 'true', cases,
  genuine_public_service_factory_and_methods_executed: true,
  DOM_document_platform_zone_modality_values_are_protocols: true,
  actual_legacy_components_executed: false, native_or_packed_qualified: false}));
