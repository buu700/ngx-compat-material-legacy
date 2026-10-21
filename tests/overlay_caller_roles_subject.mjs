/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine SDK service/module behavior with explicit server-renderer protocols. */
import assert from 'node:assert/strict';
const [line, zoneMode, mode] = process.argv.slice(2);
if (zoneMode === 'zoneful') await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const browser = await import('@angular/platform-browser'), peer = await import('@angular/cdk/overlay');
const portal = await import('@angular/cdk/portal'), factories = await import('./factories.mjs');
const {node, renderer} = await import('./render-protocol.mjs');
if (mode === 'production') core.enableProdMode();
const make = name => {
  const value = node(name, document);
  value.contains = function(child) {return this === child || this.childNodes.some(c => c === child || c.contains?.(child));};
  value.getRootNode = () => document;
  return value;
};
const document = Object.assign(new EventTarget(), {
  activeElement: null, defaultView: null, doctype: {}, createElement: name => make(name),
  createTextNode: value => ({nodeType: 3, textContent: value, parentNode: null, ownerDocument: document,
    remove() {this.parentNode?.removeChild(this);}}),
  createComment: value => ({nodeType: 8, textContent: value, parentNode: null, ownerDocument: document,
    remove() {this.parentNode?.removeChild(this);}}),
  querySelector() {return null;}, querySelectorAll() {return [];}, getElementsByClassName() {return [];},
});
document.head = make('head'); document.body = make('body'); document.documentElement = make('html');
document.documentElement.appendChild(document.head); document.documentElement.appendChild(document.body);
// BlockScrollStrategy also reads the public window/viewport protocol on server
// platforms. These dimensions and scroll calls are fixtures,not native geometry.
const windowProtocol = Object.assign(new EventTarget(), {innerWidth: 1024, innerHeight: 768,
  pageXOffset: 0, pageYOffset: 0, scroll(x, y) {this.pageXOffset = x; this.pageYOffset = y;}});
document.defaultView = windowProtocol;
globalThis.window = windowProtocol;
globalThis.document = document;
document.body.scrollHeight = 2000; document.body.scrollWidth = 1024;
document.documentElement.clientHeight = 768; document.documentElement.clientWidth = 1024;
document.documentElement.scrollHeight = 2000; document.documentElement.scrollWidth = 1024;
const application = await browser.createApplication({providers: [
  core.importProvidersFrom(peer.OverlayModule),
  ...(zoneMode === 'zoneful' ? [core.provideZoneChangeDetection({eventCoalescing: false, runCoalescing: false})] : [core.provideZonelessChangeDetection()]),
  {provide: common.Location, useValue: {subscribe() {return {unsubscribe() {}};}}},
  {provide: core.PLATFORM_ID, useValue: 'server'}, {provide: common.DOCUMENT, useValue: document},
  {provide: core.CSP_NONCE, useValue: null},
  {provide: core.RendererFactory2, useValue: {createRenderer: () => renderer(core, document)}},
 ]});
const environment = application.injector;
const cases = [], observations = {};
const serverBlockScroll = [];
let ref;
try {
  const service = environment.get(peer.Overlay), container = environment.get(peer.OverlayContainer);
  let destroyed = 0;
  class Content {value = 'content'; ngOnDestroy() {destroyed++;}}
  core.Component({standalone: true, selector: 'overlay-content-protocol', template: '<span>content</span>'})(Content);
  const position = service.position().global().width('100px').height('50px').centerHorizontally().top('10px');
  const config = new peer.OverlayConfig({positionStrategy: position, hasBackdrop: false,
    panelClass: ['legacy-pane'], scrollStrategy: service.scrollStrategies.noop()});
  ref = service.create(config);
  assert.ok(ref instanceof peer.OverlayRef);
  assert.equal(ref.getConfig().positionStrategy, position);
  const events = [];
  ref.attachments().subscribe(() => events.push('attach'));
  ref.detachments().subscribe(() => events.push('detach'));
  assert.equal(ref.hasAttached(), false);
  const component = ref.attach(new portal.ComponentPortal(Content));
  component.changeDetectorRef.detectChanges();
  assert.equal(component.instance.value, 'content');
  assert.equal(ref.hasAttached(), true);
  assert.equal(container.getContainerElement().contains(ref.overlayElement), true);
  cases.push('real-component-portal-attaches-to-real-overlay');
  ref.updateSize({width: 120, height: 70, minWidth: '10px', maxWidth: 200});
  assert.equal(ref.overlayElement.style.width, '120px');
  assert.equal(ref.overlayElement.style.height, '70px');
  ref.addPanelClass(['extra', 'legacy-pane']);
  assert.equal(ref.overlayElement.classList.contains('extra'), true);
  ref.removePanelClass('extra');
  assert.equal(ref.overlayElement.classList.contains('extra'), false);
  cases.push('public-size-and-panel-class-setters');
  ref.detach();
  assert.equal(ref.hasAttached(), false); assert.equal(destroyed, 1);
  ref.attach(new portal.ComponentPortal(Content));
  ref.dispose(); ref = null;
  assert.equal(destroyed, 2);
  assert.deepEqual(events, ['attach', 'detach', 'attach', 'detach']);
  observations.portal = {events, destroyed};
  cases.push('detach-reopen-dispose-real-component-lifetimes');

  const firstOrigin = make('button'), secondOrigin = make('button');
  const pair = new peer.ConnectionPositionPair({originX: 'start', originY: 'bottom'}, {overlayX: 'start', overlayY: 'top'});
  const connectedPosition = service.position().flexibleConnectedTo(firstOrigin)
    .withPositions([pair]).withFlexibleDimensions(false).withGrowAfterOpen(true)
    .withLockedPosition().withPush(false).withViewportMargin(8).withTransformOriginOn('.panel');
  assert.ok(connectedPosition instanceof peer.FlexibleConnectedPositionStrategy);
  assert.equal(connectedPosition._origin, firstOrigin);
  connectedPosition.setOrigin(secondOrigin);
  assert.equal(connectedPosition._origin, secondOrigin);
  observations.origin = [pair.originX, pair.originY, pair.overlayX, pair.overlayY];
  cases.push('public-position-pair-and-origin-identity');

  observations.factories = [];
  for (const family of ['dialog', 'autocomplete', 'menu', 'select', 'tooltip']) {
    const expectedKind = family === 'dialog' ? 'block' : 'reposition';
    const expectedConfig = family === 'tooltip' ? {scrollThrottle: 20} : null;
    for (const prefix of ['tagged', 'current']) {
      const factory = factories[prefix + '_' + family], calls = [];
      const protocol = {scrollStrategies: {
        block() {calls.push({kind: 'block', config: null}); return service.scrollStrategies.block();},
        reposition(config) {calls.push({kind: 'reposition', config: config ?? null}); return service.scrollStrategies.reposition(config);},
      }};
      const thunk = factory(protocol);
      assert.equal(typeof thunk, 'function'); assert.equal(calls.length, 0, 'factory must stay lazy');
      const one = thunk(), two = thunk();
      assert.notEqual(one, two, 'a new strategy belongs to each overlay');
      assert.deepEqual(calls, [{kind: expectedKind, config: expectedConfig}, {kind: expectedKind, config: expectedConfig}]);
      assert.ok(one instanceof (expectedKind === 'block' ? peer.BlockScrollStrategy : peer.RepositionScrollStrategy));
      // Also execute the complete factory against the real Overlay service.
      const realStrategy = factory(service)();
      assert.ok(realStrategy instanceof (expectedKind === 'block' ? peer.BlockScrollStrategy : peer.RepositionScrollStrategy));
      ref = service.create({positionStrategy: service.position().global(), scrollStrategy: realStrategy});
      const beforeDestroyed = destroyed;
      ref.attach(new portal.ComponentPortal(Content));
      const blockEnabled = document.documentElement.classList.contains('cdk-global-scrollblock');
      if (expectedKind === 'block') serverBlockScroll.push({family, prefix, enabled: blockEnabled});
      assert.equal(blockEnabled, expectedKind === 'block');
      ref.detach(); assert.equal(destroyed, beforeDestroyed + 1);
      assert.equal(document.documentElement.classList.contains('cdk-global-scrollblock'), false);
      ref.dispose(); ref = null; assert.equal(destroyed, beforeDestroyed + 1);
      observations.factories.push({family, prefix, lazy: true, distinct: true, kind: expectedKind, config: expectedConfig});
      cases.push(prefix + '-' + family + '-factory-real-strategy-lifetime');
    }
  }

  class Host {open = core.signal(false);}
  core.ViewChild(peer.CdkOverlayOrigin)(Host.prototype, 'origin');
  core.ViewChild(peer.CdkConnectedOverlay)(Host.prototype, 'connected');
  core.Component({standalone: true, selector: 'overlay-module-host', imports: [peer.OverlayModule],
    template: '<button cdkOverlayOrigin #origin="cdkOverlayOrigin"></button><ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="open()"><span>connected</span></ng-template>'})(Host);
  const host = core.createComponent(Host, {hostElement: make('overlay-module-host'), environmentInjector: environment});
  const app = environment.get(core.ApplicationRef);
  app.attachView(host.hostView);
  try {
    app.tick();
    assert.ok(host.instance.origin instanceof peer.CdkOverlayOrigin);
    assert.ok(host.instance.connected instanceof peer.CdkConnectedOverlay);
    host.instance.open.set(true); host.changeDetectorRef.markForCheck(); app.tick(); host.changeDetectorRef.detectChanges();
    assert.equal(host.instance.connected.open, true);
    assert.equal(host.instance.connected.overlayRef.hasAttached(), true);
    host.instance.open.set(false); host.changeDetectorRef.markForCheck(); app.tick(); host.changeDetectorRef.detectChanges();
    assert.equal(host.instance.connected.open, false);
    assert.equal(host.instance.connected.overlayRef.hasAttached(), false);
    observations.connected = {genuineModule: true, opened: true, detached: true};
    cases.push('real-overlay-module-directive-open-close');
  } finally {app.detachView(host.hostView); host.destroy();}
  assert.equal(host.hostView.destroyed, true);
  cases.push('connected-host-destroyed');
  console.log(JSON.stringify({line, zoneMode, mode, cases, observations,
    server_block_scroll_observations: serverBlockScroll,
    server_block_scroll_is_not_native_browser_equivalence: true,
    synthetic_server_renderer_and_location_protocol: true, actual_native_packed_AOT_or_full_floor_qualified: false}));
} finally {ref?.dispose(); application.destroy();}
