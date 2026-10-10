/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine Angular scheduled initialization/DI/destruction and real CDK Dir; field/DOM/frame protocols. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [mode, production, variant] = process.argv.slice(2);
if (production === 'true') globalThis.ngDevMode = false;
if (mode === 'zoneful') await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const browser = await import('@angular/platform-browser'), bidi = await import('@angular/cdk/bidi');
const payload = JSON.parse(readFileSync(new URL('./field-direction-fixture-payload.json', import.meta.url)));
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
  setAttribute: (node, key, value) => node.attributes.set(key, value),
  removeAttribute: (node, key) => node.attributes.delete(key),
  addClass() {}, removeClass() {}, setStyle() {}, removeStyle() {},
  setProperty: (node, key, value) => {node[key] = value;}, setValue: (node, value) => {node.textContent = value;}, listen: () => () => {}};
const frames = new Map(); let frameSerial = 0;
globalThis.requestAnimationFrame = callback => {
  const id = frameSerial++;
  frames.set(id, setTimeout(() => {frames.delete(id); callback(performance.now());}, 5));
  return id;
};
globalThis.cancelAnimationFrame = id => {clearTimeout(frames.get(id)); frames.delete(id);};
let created = 0, initialized = 0, destroyed = 0;
class FieldProtocol {
  direction = core.inject(bidi.Directionality);
  pending = new Set();
  constructor() {created++;}
  updateOutlineGap() {}
  ngAfterViewInit() {
    initialized++;
    if (variant !== 'missing-subscription') this.subscription = this.direction.change.subscribe(() => {
      const id = requestAnimationFrame(() => {this.pending.delete(id); this.updateOutlineGap();});
      this.pending.add(id);
    });
  }
  ngOnDestroy() {
    destroyed++;
    if (variant !== 'late-frame') this.pending.forEach(id => cancelAnimationFrame(id));
    this.pending.clear(); this.subscription?.unsubscribe();
  }
}
core.Directive({selector: 'mat-form-field', standalone: false})(FieldProtocol);
const exported = {};
new Function('exports', 'Component', 'Directive', 'ViewChild', 'TemplateRef', 'ViewContainerRef',
  'signal', 'inject', 'Injector', 'afterNextRender', 'Directionality', 'Dir', 'MatLegacyFormField', payload.fixture)
  (exported, core.Component, core.Directive, core.ViewChild, core.TemplateRef, core.ViewContainerRef,
    core.signal, core.inject, core.Injector, core.afterNextRender, bidi.Directionality, bidi.Dir, FieldProtocol);
class FixtureModule {}
core.NgModule({imports: [bidi.BidiModule], declarations: [exported.FormFieldDirectionLifetimeLab,
  exported.CaptureFieldDirectionLifetime, FieldProtocol]})(FixtureModule);
const app = await browser.createApplication({providers: [
  core[mode === 'zoneful' ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'](),
  {provide: common.IMAGE_CONFIG, useValue: {disableImageSizeWarning: true, disableImageLazyLoadWarning: true}},
  {provide: core.DOCUMENT, useValue: {head: {children: [], querySelectorAll: () => []}}},
  {provide: core.RendererFactory2, useValue: {createRenderer: () => renderer}},
]});
let module, component;
try {
  module = core.createNgModule(FixtureModule, app.injector);
  component = core.createComponent(exported.FormFieldDirectionLifetimeLab,
    {environmentInjector: module.injector, hostElement: host});
  app.attachView(component.hostView); app.tick();
  assert.equal(created, 0);
  const run = () => component.instance.run();
  const observation = await run();
  if (variant === 'missing-subscription') {
    assert.match(observation.error, /live direction emission did not reach field/);
  } else {
    assert.deepEqual(observation, {actual_field_created: true, actual_directionality_created: true,
      initialized: true, live_updates: 1, queued_updates_before_destroy: 0,
      view_destroyed: true, host_removed: true, late_updates: variant === 'late-frame' ? 2 : 0});
  }
  assert.equal(created, 1); assert.equal(initialized, 1); assert.equal(destroyed, 1);
  if (variant === 'live') {
    assert.deepEqual(await run(), observation);
    assert.equal(created, 2); assert.equal(initialized, 2); assert.equal(destroyed, 2);
  }
  console.log(JSON.stringify({variant, genuine_public_view_initialization_and_destruction: true,
    genuine_public_cdk_Dir_and_node_DI: true, automatic_render_after_initial_tick: true,
    renderer_field_and_frame_protocols: true, actual_legacy_field_executed: false, native_executed: false}));
} finally {
  component?.destroy(); module?.destroy(); app.destroy(); core.destroyPlatform();
  for (const timer of frames.values()) clearTimeout(timer);
}
