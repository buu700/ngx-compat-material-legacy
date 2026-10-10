/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine Angular views and complete public CDK portal; container/renderer/DOM protocols. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [mode, production, variant] = process.argv.slice(2);
if (production === 'true') globalThis.ngDevMode = false;
if (mode === 'zoneful') await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const {Subject} = await import('rxjs');
const browser = await import('@angular/platform-browser'), portal = await import('@angular/cdk/portal');
const payload = JSON.parse(readFileSync(new URL('./snack-announcement-fixture-payload.json', import.meta.url)));
class NodeProtocol {
  constructor(name) {this.name = name; this.children = []; this.attributes = new Map();}
  get isConnected() {return this.rootConnected || !!this.parent?.isConnected;}
  hasAttribute(name) {return this.attributes.has(name);}
  removeAttribute(name) {this.attributes.delete(name);}
  contains(node) {return node === this || this.children.some(child => child.contains(node));}
  querySelector(selector) {
    const attribute = selector.slice(1,-1);
    for (const child of this.children) {
      if (child.attributes.has(attribute)) return child;
      const nested = child.querySelector(selector); if (nested) return nested;
    }
    return null;
  }
  get textContent() {return this.text || this.children.map(child => child.textContent).join('');}
  set textContent(text) {this.text = text;}
  appendChild(child) {insert(this,child); return child;}
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
const override = new core.InjectionToken('announcement motion protocol');
class ConfigProtocol {}
class LegacyConfigProtocol extends ConfigProtocol {politeness = 'assertive';}
let created = 0, initialized = 0, destroyed = 0;
const seenModes = [], pendingTimers = new Set();
class ContainerProtocol {
  element = core.inject(core.ElementRef).nativeElement;
  zone = core.inject(core.NgZone);
  config = core.inject(ConfigProtocol);
  mode = core.inject(override);
  _onAnnounce = new Subject();
  _animationState = 'void';
  _live = 'assertive';
  _liveElementId = 'announcement-protocol-live-' + created;
  constructor() {
    created++; seenModes.push(this.mode);
    assert.equal(this.config.politeness, 'assertive');
    assert.ok(['enabled','di-disabled'].includes(this.mode));
  }
  ngAfterViewInit() {initialized++;}
  attachTemplatePortal(value) {
    assert.ok(value instanceof portal.TemplatePortal);
    return this.outlet.attachTemplatePortal(value);
  }
  enter() {
    this._animationState = 'visible';
    if (variant === 'missing-announcement') return;
    this.zone.runOutsideAngular(() => {
      this.timer = setTimeout(() => {
        pendingTimers.delete(this.timer);
        const inert = this.element.querySelector('[aria-hidden]'), live = this.element.querySelector('[aria-live]');
        if (inert && live) {
          inert.removeAttribute('aria-hidden'); live.appendChild(inert);
          this._onAnnounce.next(); this._onAnnounce.complete();
        }
      }, 150);
      pendingTimers.add(this.timer);
    });
  }
  ngOnDestroy() {
    destroyed++;
    if (variant !== 'late-announcement') {clearTimeout(this.timer); pendingTimers.delete(this.timer);}
  }
}
core.ViewChild(portal.CdkPortalOutlet, {static:true})(ContainerProtocol.prototype, 'outlet');
core.Component({selector:'snack-bar-container', standalone:false, template:payload.containerTemplate})(ContainerProtocol);
const exported = {};
new Function('exports', 'Component', 'Directive', 'ViewChild', 'TemplateRef', 'ViewContainerRef',
  'signal', 'inject', 'Injector', 'afterNextRender', 'TemplatePortal', 'MatSnackBarConfig',
  'MatLegacySnackBarConfig', 'MatLegacySnackBarContainer', 'LEGACY_ANIMATIONS_TEST_OVERRIDE', payload.fixture)
  (exported, core.Component, core.Directive, core.ViewChild, core.TemplateRef, core.ViewContainerRef,
    core.signal, core.inject, core.Injector, core.afterNextRender, portal.TemplatePortal, ConfigProtocol,
    LegacyConfigProtocol, ContainerProtocol, override);
class FixtureModule {}
core.NgModule({imports:[portal.PortalModule], declarations:[exported.SnackAnnouncementLifetimeLab,
  exported.CaptureSnackAnnouncementLifetime, ContainerProtocol]})(FixtureModule);
const app = await browser.createApplication({providers:[
  core[mode === 'zoneful' ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'](),
  {provide:common.IMAGE_CONFIG, useValue:{disableImageSizeWarning:true, disableImageLazyLoadWarning:true}},
  {provide:core.DOCUMENT, useValue:{head:{children:[],querySelectorAll:()=>[]}}},
  {provide:core.RendererFactory2, useValue:{createRenderer:()=>renderer}},
]});
let module, component;
try {
  module = core.createNgModule(FixtureModule, app.injector);
  component = core.createComponent(exported.SnackAnnouncementLifetimeLab,
    {environmentInjector:module.injector, hostElement:host});
  app.attachView(component.hostView); app.tick();
  assert.equal(created,0);
  const pending = component.instance.run();
  await assert.rejects(component.instance.run(), /snack announcement fixture already running/);
  const observation = await pending;
  if (variant === 'missing-announcement') {
    assert.match(observation.error,/live announcement did not complete and move portal content/);
    assert.equal(created,1); assert.equal(initialized,1); assert.equal(destroyed,1);
  } else {
    assert.equal(observation.observations.length,2);
    for (const [index,row] of observation.observations.entries()) {
      assert.deepEqual(row,{mode:['enabled','disabled'][index],actual_container_created:true,initialized:true,
        live_announcements:1,live_completed:true,live_content_moved:true,live_inert_hidden_removed:true,
        queued_announcements_before_destroy:0,portal_content_present:true,queued_inert_hidden:true,entered_state:true,
        direct_view_destroyed:true,host_removed:true,retained_inert_and_live_nodes:true,
        late_announcements:variant==='late-announcement'?1:0,late_completion:variant==='late-announcement',
        late_content_moved:variant==='late-announcement',late_inert_hidden_removed:variant==='late-announcement'});
    }
    assert.deepEqual(seenModes,['enabled','enabled','di-disabled','di-disabled']);
    assert.equal(created,4); assert.equal(initialized,4); assert.equal(destroyed,4);
    if (variant === 'live') {
      assert.deepEqual(await component.instance.run(),observation,'completed fixture can run again');
      assert.equal(created,8); assert.equal(initialized,8); assert.equal(destroyed,8);
    }
  }
  assert.equal(pendingTimers.size,0);
  console.log(JSON.stringify({variant,genuine_public_Angular_views_and_portal_outlet:true,
    automatic_render_after_initial_tick:true,operation_starts_outside_NgZone:true,
    concurrent_run_rejected:true,repeated_run_checked:variant==='live',
    container_config_renderer_DOM_protocols:true,actual_legacy_container_executed:false,native_executed:false}));
} finally {
  component?.destroy(); module?.destroy(); app.destroy(); core.destroyPlatform();
  for (const timer of pendingTimers) clearTimeout(timer);
}
