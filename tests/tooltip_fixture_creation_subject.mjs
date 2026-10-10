/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine Angular creation/query/self-DI, with renderer and tooltip protocols. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [mode, production] = process.argv.slice(2);
if (production === 'true') globalThis.ngDevMode = false;
if (mode === 'zoneful') await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const browser = await import('@angular/platform-browser');
const payload = JSON.parse(readFileSync(new URL('./tooltip-fixture-creation-payload.json', import.meta.url)));
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
let created = 0, destroyed = 0, initialized = 0;
class TooltipProtocol {
  element = core.inject(core.ElementRef).nativeElement;
  dead = false;
  constructor() {created++;}
  set message(value) {
    if (!this.dead) Promise.resolve().then(() => {
      if (!this.dead && value) this.element.attributes.set('aria-describedby', 'protocol-description');
    });
  }
  ngAfterViewInit() {initialized++;}
  ngOnDestroy() {this.dead = true; destroyed++; this.element.attributes.delete('aria-describedby');}
}
core.Directive({selector: '[matTooltip]', standalone: false, inputs: ['message:matTooltip']})(TooltipProtocol);
const exported = {};
new Function('exports', 'Component', 'Directive', 'ViewChild', 'TemplateRef', 'ViewContainerRef', 'signal', 'inject', 'MatLegacyTooltip', payload.fixture)
  (exported, core.Component, core.Directive, core.ViewChild, core.TemplateRef, core.ViewContainerRef, core.signal, core.inject, TooltipProtocol);
class FixtureModule {}
core.NgModule({declarations: [exported.TooltipAriaLifetimeLab, exported.CaptureTooltipForAriaLifetime, TooltipProtocol]})(FixtureModule);
const app = await browser.createApplication({providers: [
  core[mode === 'zoneful' ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'](),
  {provide: common.IMAGE_CONFIG, useValue: {disableImageSizeWarning: true, disableImageLazyLoadWarning: true}},
  {provide: core.DOCUMENT, useValue: {head: {children: [], querySelectorAll: () => []}}},
  {provide: core.RendererFactory2, useValue: {createRenderer: () => renderer}},
]});
let module, component;
try {
  module = core.createNgModule(FixtureModule, app.injector);
  component = core.createComponent(exported.TooltipAriaLifetimeLab, {environmentInjector: module.injector, hostElement: host});
  app.attachView(component.hostView); app.tick();
  assert.equal(created, 0, 'probe directive is created only by the requested embedded view');
  const observation = await component.instance.run();
  assert.deepEqual(observation, {actual_directive_created: true, host_removed: true,
    initial_description_absent: true, pending_cleanup_clear: true, later_request_clear: true});
  assert.equal(created, 1); assert.equal(destroyed, 1);
  assert.equal(initialized, 0, 'capture must work in creation before any forced embedded-view update');
  const repeated = await component.instance.run(); assert.deepEqual(repeated, observation);
  assert.equal(created, 2); assert.equal(destroyed, 2); assert.equal(initialized, 0);
  console.log(JSON.stringify({creation_phase_self_DI_passed: true, repeated_runs_passed: true,
    genuine_public_component_and_embedded_view: true, renderer_protocol: true,
    actual_legacy_tooltip_executed: false, native_executed: false}));
} finally {component?.destroy(); module?.destroy(); app.destroy(); core.destroyPlatform();}
