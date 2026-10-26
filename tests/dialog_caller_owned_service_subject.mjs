/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine Dialog.open with tagged/owned base and ref; test container supplies animation events. */
import assert from 'node:assert/strict';
const [line, mode, side = 'before'] = process.argv.slice(2);
console.error('worker ' + line + ': imports');
await import('zone.js/node'); await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const browser = await import('@angular/platform-browser'), cdk = await import('@angular/cdk/dialog');
const overlay = await import('@angular/cdk/overlay'), portal = await import('@angular/cdk/portal');
const material = await import('@angular/material/dialog');
const {documentProtocol} = await import('./a11y-node-protocol.mjs');
if (mode === 'production') core.enableProdMode();
const metadata = new WeakMap();
Reflect.metadata = (key, value) => target => {const values = metadata.get(target) ?? new Map();
  values.set(key, value); metadata.set(target, values);};
Reflect.getOwnMetadata = (key, target) => metadata.get(target)?.get(key);
globalThis.Document = class DocumentProtocolType {};
const port = documentProtocol(core);
const location = new URL('https://dialog-probe.invalid/');
port.document.location = location; port.window.location = location;
port.window.history = {state: null, pushState() {}, replaceState() {}, forward() {}, back() {}, go() {}};
globalThis.document = port.document; globalThis.window = port.window; globalThis.getComputedStyle = port.window.getComputedStyle;
const app = await browser.createApplication({providers: [core.importProvidersFrom(cdk.DialogModule),
  core.provideZoneChangeDetection({eventCoalescing: false, runCoalescing: false}),
  {provide: core.PLATFORM_ID, useValue: 'server'}, {provide: common.DOCUMENT, useValue: port.document},
  {provide: core.CSP_NONCE, useValue: null}, {provide: core.RendererFactory2, useValue: {createRenderer: port.renderer}}]});
console.error('worker ' + line + ': application ready');
let Base, ContainerBase, Ref;
if (line === 'original') {
  // Removed helpers are used only from the untouched tagged reference.
  Base = material._MatDialogBase; ContainerBase = material._MatDialogContainerBase; Ref = material.MatDialogRef;
} else {
  Base = (await import('./' + side + '/projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.mjs'))._MatDialogBase;
  ContainerBase = (await import('./' + side + '/projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.mjs'))._MatDialogContainerBase;
  Ref = (await import('./' + side + '/projects/ngx-material-legacy/legacy-dialog/dialog-ref.mjs')).MatLegacyDialogRef;
}
assert.equal(typeof Base, 'function'); assert.equal(typeof ContainerBase, 'function'); assert.equal(typeof Ref, 'function');
const Data = new core.InjectionToken('dialog-owned-service-data');
class Container extends ContainerBase {
  _startExitAnimation() {
    this._animationStateChanged.emit({state: 'closing', totalTime: 0});
    this._animationStateChanged.emit({state: 'closed', totalTime: 0});
  }
}
core.Component({selector: 'dialog-owned-service-container-probe', standalone: true, imports: [portal.PortalModule],
  template: '<ng-template cdkPortalOutlet></ng-template>'})(Container);
class Content {
  ref = core.inject(Ref); peer = core.inject(cdk.DialogRef); data = core.inject(Data);
  container = core.inject(Container);
}
core.Component({selector: 'dialog-owned-service-content-probe', standalone: true, template: ''})(Content);
class Service extends Base {}
const calls = [], scroll = () => ({attach() {calls.push('scroll-attach');}, enable() {calls.push('scroll-enable');}, disable() {calls.push('scroll-disable');}});
const scalar = value => value === undefined ? {kind: 'undefined'} : value;
const configSnapshot = (config, data) => ({keys: Reflect.ownKeys(config).map(String), properties: Object.fromEntries(
  Reflect.ownKeys(config).map(key => {const descriptor = Object.getOwnPropertyDescriptor(config, key);
    assert.ok(Object.hasOwn(descriptor, 'value')); const value = descriptor.value;
    return [String(key), {value: value === undefined ? {kind: 'undefined'} : value === data ? {kind: 'data-identity'} :
      value === null || typeof value !== 'object' ? value : {kind: 'strategy-port', keys: Object.keys(value).sort()},
      enumerable: descriptor.enumerable, writable: descriptor.writable, configurable: descriptor.configurable}];}))});
const observations = [], cases = [];
try {
  const peerService = app.injector.get(cdk.Dialog), data = {value: 'owned-data'};
  const variants = [
    {id: 'generic-defaults'},
    {id: 'custom-defaults', defaults: {ariaModal: false, maxWidth: '12px', disableClose: true}},
    {id: 'empty-defaults', defaults: {}},
    {id: 'per-open-overrides', overrides: {ariaModal: false, maxWidth: '16px'}},
    {id: 'explicit-undefined', overrides: {ariaModal: undefined, maxWidth: undefined}},
    {id: 'custom-class', customClass: true},
  ];
  for (const variant of variants) {
    const defaults = variant.defaults;
    console.error('worker ' + line + ': service ' + variant.id);
    const service = new Service(app.injector.get(overlay.Overlay), app.injector, defaults, undefined,
      app.injector.get(overlay.OverlayContainer), scroll, Ref, Container, Data);
    if (variant.customClass) {
      service.dialogConfigClass = class CustomConfig extends material.MatDialogConfig {
        constructor() {super(); this.ariaModal = false; this.maxWidth = '9px';}
      };
    }
    const defaultsBefore = defaults ? JSON.stringify(defaults) : null;
    const options = {id: variant.id, data, hasBackdrop: false, ...variant.overrides};
    const optionsBefore = JSON.stringify(options);
    let peer, empty = 0;
    const subscription = peerService.afterOpened.subscribe(value => peer = value);
    const all = service.afterAllClosed.subscribe(() => empty++);
    console.error('worker ' + line + ': opening');
    let ref;
    try {ref = service.open(Content, options);} catch (error) {
      // This custom config/base-container combination lacks the original config provider.
      // Retain the genuine tagged failure; it is not a passing ownership/lifecycle case.
      assert.ok(line === 'original' && variant.customClass, String(error));
      assert.equal(error.name, 'NullInjectorError');
      assert.ok(error.message.includes('No provider for MatDialogConfig'));
      observations.push({kind: variant.id, providerConstructionError: error.name,
        missingProvider: 'MatDialogConfig', ownershipOrLifecycleQualified: false});
      cases.push('custom-class-tagged-provider-error-retained');
      subscription.unsubscribe(); all.unsubscribe(); service.ngOnDestroy();
      continue;
    }
    console.error('worker ' + line + ': opened');
    try {
      assert.ok(peer instanceof cdk.DialogRef); assert.ok(ref instanceof Ref); assert.ok(ref._containerInstance instanceof ContainerBase);
      assert.ok(ref.componentInstance.ref === ref, 'content legacy ref identity');
      assert.ok(ref.componentInstance.peer === (line === 'original' ? peer : null), 'content CDK ref boundary');
      assert.ok(ref.componentInstance.data === data, 'content data identity');
      assert.ok(ref.componentInstance.container === ref._containerInstance, 'content container identity');
      assert.ok(ref.componentRef === peer.componentRef, 'component ref identity');
      assert.ok(ref.componentInstance === peer.componentInstance, 'component instance identity');
      assert.ok(service.getDialogById(options.id) === ref, 'legacy service lookup identity');
      assert.ok(service.openDialogs[0] === ref, 'legacy tracking identity');
      assert.ok(peerService.getDialogById(options.id) === peer, 'peer service lookup identity');
      const config = ref._containerInstance._config;
      if (side === 'candidate' && variant.id === 'generic-defaults') {
        assert.equal(config.ariaModal, true, 'candidate generic default ariaModal');
        assert.equal(config.maxWidth, '80vw', 'candidate generic default maxWidth');
      }
      observations.push({kind: variant.id, ariaModal: scalar(config.ariaModal),
        maxWidth: scalar(config.maxWidth), materialConfigDataIdentity: config.data === data,
        peerConfigDataIdentity: peer.config.data === data, disableCloseAtPeer: peer.disableClose,
        ownDisableClose: ref.disableClose, providerIdentitiesPreserved: true,
        contentCdkRefProvider: line === 'original' ? 'peer-ref' : 'null-sentinel', completeEffectiveConfig: configSnapshot(config, data)});
      cases.push(variant.id + '-actual-service-provider-and-component-contract');
      let result; ref.afterClosed().subscribe(value => result = value);
      console.error('worker ' + line + ': closing'); ref.close('closed');
      console.error('worker ' + line + ': closed');
      assert.equal(result, 'closed'); assert.equal(service.openDialogs.length, 0); assert.equal(peerService.openDialogs.length, 0);
      assert.equal(service.getDialogById(options.id), undefined); assert.equal(empty, 2); assert.equal(app.viewCount, 0);
      assert.equal(JSON.stringify(options), optionsBefore); assert.equal(defaults ? JSON.stringify(defaults) : null, defaultsBefore);
      cases.push(variant.id + '-actual-service-ref-close-and-input-ownership');
    } finally {if (service.openDialogs.length) service.closeAll(); subscription.unsubscribe(); all.unsubscribe(); service.ngOnDestroy();}
  }
  console.log(JSON.stringify({line, mode, side, cases, observations, genuine_public_Dialog_open: true,
    actual_owned_source_files: line === 'original' ? 0 : 49,
    generated_test_subclass_factories_and_queries_executed: true, legacy_leaf_factories_templates_or_styles_executed: false,
    DOM_renderer_and_test_animation_events_are_protocols: true,
    actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'}));
} finally {app.destroy(); core.destroyPlatform();}
