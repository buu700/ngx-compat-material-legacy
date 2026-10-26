/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public SDK dialog APIs; DOM, positions and scroll strategies are explicit ports. */
import assert from 'node:assert/strict';
const [line, mode] = process.argv.slice(2);
await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const browser = await import('@angular/platform-browser'), cdk = await import('@angular/cdk/dialog');
const portal = await import('@angular/cdk/portal');
const material = await import('@angular/material/dialog'), rx = await import('rxjs');
const {documentProtocol} = await import('./a11y-node-protocol.mjs');
assert.equal(core.VERSION.full, {original: '16.2.12', main: '22.1.7', '21.x': '21.2.23'}[line]);
if (mode === 'production') core.enableProdMode();
const port = documentProtocol(core);
globalThis.document = port.document; globalThis.window = port.window;
globalThis.getComputedStyle = port.window.getComputedStyle;
const app = await browser.createApplication({providers: [core.importProvidersFrom(cdk.DialogModule),
  core.provideZoneChangeDetection({eventCoalescing: false, runCoalescing: false}),
  {provide: core.PLATFORM_ID, useValue: 'server'}, {provide: common.DOCUMENT, useValue: port.document},
  {provide: core.CSP_NONCE, useValue: null}, {provide: core.RendererFactory2, useValue: {createRenderer: port.renderer}}]});
const cases = [], observations = {states: {}, refs: [], inputs: [], service: {}, defaults: {}, template: {}};
const check = (name, action) => {action(); cases.push(name);};
try {
  check('genuine-public-config-and-state-exports', () => {
    assert.equal(typeof cdk.DialogConfig, 'function'); assert.equal(typeof material.MatDialogConfig, 'function');
    assert.equal(Object.hasOwn(material, 'AutoFocusTarget'), false);
    assert.equal(Object.hasOwn(material, 'DialogPosition'), false);
    let values;
    if (line === 'original') {
      // The tagged const enum is erased. Observe its values through the genuine
      // tagged ref rather than inventing a runtime enum export for that SDK.
      assert.equal(Object.hasOwn(material, 'MatDialogState'), false);
      const detached = new rx.Subject(), backdrop = new rx.Subject(), keys = new rx.Subject(), outside = new rx.Subject();
      let attached = true;
      const owner = {detachments: () => detached, backdropClick: () => backdrop, keydownEvents: () => keys,
        outsidePointerEvents: () => outside, detachBackdrop() {}, dispose() {
          const wasAttached = attached; attached = false;
          backdrop.complete(); keys.complete(); outside.complete(); if (wasAttached) detached.next(); detached.complete();}};
      const animation = new core.EventEmitter(), container = {_animationStateChanged: animation,
        _startExitAnimation() {animation.emit({state: 'closing', totalTime: 0});}};
      const peer = new cdk.DialogRef(owner, {id: 'tagged-state', disableClose: true, closeOnOverlayDetachments: false});
      peer.containerInstance = container;
      const reference = new material.MatDialogRef(peer, {disableClose: true}, container);
      const OPEN = reference.getState(); reference.close('state'); const CLOSING = reference.getState();
      animation.emit({state: 'closed', totalTime: 0}); const CLOSED = reference.getState();
      values = {OPEN, CLOSING, CLOSED}; animation.complete();
    } else values = {OPEN: material.MatDialogState.OPEN, CLOSING: material.MatDialogState.CLOSING, CLOSED: material.MatDialogState.CLOSED};
    assert.deepEqual(Object.values(values), [0, 1, 2]);
    observations.states = {runtimeEnumExported: Object.hasOwn(material, 'MatDialogState'), values};
  });
  const service = app.injector.get(cdk.Dialog);
  check('genuine-public-dialog-module-and-injector-owner', () => {
    assert.ok(service instanceof cdk.Dialog); assert.equal(app.injector.get(cdk.Dialog), service);
    assert.equal(service.openDialogs.length, 0);
    let empty = 0; const subscription = service.afterAllClosed.subscribe(() => empty++);
    assert.equal(empty, 1); subscription.unsubscribe();
  });
  const defaults = new material.MatDialogConfig();
  observations.defaults = Object.fromEntries(['autoFocus', 'disableClose', 'hasBackdrop', 'restoreFocus', 'ariaModal', 'maxWidth']
    .map(name => [name, defaults[name] === undefined ? {kind: 'undefined'} : defaults[name]]));
  for (const closeOnDetach of [true, false]) {
    const detached = new rx.Subject(), backdrop = new rx.Subject(), keys = new rx.Subject(), outside = new rx.Subject();
    const calls = [], events = [], container = {_closeInteractionType: null, _recaptureFocus() {calls.push(['recapture']);}};
    const owner = {detachments: () => detached, backdropClick: () => backdrop,
      keydownEvents: () => keys, outsidePointerEvents: () => outside,
      updatePosition: () => calls.push(['position']), updateSize: size => calls.push(['size', size]),
      addPanelClass: classes => calls.push(['add', classes]), removePanelClass: classes => calls.push(['remove', classes]),
      dispose() {calls.push(['dispose']); backdrop.complete(); keys.complete(); outside.complete(); detached.next(); detached.complete();}};
    const config = {id: 'public-ref', disableClose: true, closeOnOverlayDetachments: closeOnDetach};
    const ref = new cdk.DialogRef(owner, config); ref.containerInstance = container;
    const component = {}; ref.componentInstance = component;
    ref.closed.subscribe({next: value => {events.push(['closed', value]); assert.equal(ref.componentInstance, component);},
      complete: () => events.push(['complete'])});
    check('public-ref-identities-and-observable-ports-' + closeOnDetach, () => {
      assert.equal(ref.overlayRef, owner); assert.equal(ref.config, config); assert.equal(ref.id, 'public-ref');
      assert.equal(ref.backdropClick, backdrop); assert.equal(ref.keydownEvents, keys);
    });
    check('public-ref-update-position-size-and-class-forwarding-' + closeOnDetach, () => {
      assert.equal(ref.updatePosition(), ref); assert.equal(ref.updateSize(), ref);
      assert.equal(ref.updateSize('40px', '30px'), ref); assert.equal(ref.addPanelClass(['one', 'two']), ref);
      assert.equal(ref.removePanelClass('one'), ref);
      assert.deepEqual(calls, [['position'], ['size', {width: '', height: ''}], ['size', {width: '40px', height: '30px'}],
        ['add', ['one', 'two']], ['remove', 'one']]);
    });
    check('public-ref-close-result-and-focus-origin-idempotence-' + closeOnDetach, () => {
      detached.next();
      if (!closeOnDetach) {assert.deepEqual(events, []); ref.close('result', {focusOrigin: 'keyboard'});}
      ref.close('repeat');
      assert.equal(calls.filter(call => call[0] === 'dispose').length, 1);
      assert.deepEqual(events, [['closed', closeOnDetach ? undefined : 'result'], ['complete']]);
      assert.equal(container._closeInteractionType, closeOnDetach ? 'program' : 'keyboard');
      assert.equal(ref.componentInstance, null); assert.equal(ref.containerInstance, null);
    });
    observations.refs.push({closeOnDetach, calls, events, origin: container._closeInteractionType});
  }
  for (const disabled of [false, true]) for (const kind of ['keyboard', 'backdrop']) {
    check('public-ref-user-input-' + kind + '-disabled-' + disabled, () => {
      const backdrop = new rx.Subject(), keys = new rx.Subject(), detached = new rx.Subject(), outside = new rx.Subject();
      let disposed = 0, recaptured = 0, prevented = 0, closed = 0;
      const container = {_closeInteractionType: null, _recaptureFocus() {recaptured++;}};
      const owner = {backdropClick: () => backdrop, keydownEvents: () => keys, detachments: () => detached,
        outsidePointerEvents: () => outside, dispose() {disposed++; backdrop.complete(); keys.complete(); outside.complete(); detached.next(); detached.complete();}};
      const ref = new cdk.DialogRef(owner, {id: 'input-ref', disableClose: disabled}); ref.containerInstance = container;
      ref.closed.subscribe(() => closed++);
      keys.next({keyCode: 27, ctrlKey: true, preventDefault() {prevented++;}});
      assert.equal(closed, 0); assert.equal(prevented, 0);
      if (kind === 'keyboard') keys.next({keyCode: 27, preventDefault() {prevented++;}});
      else backdrop.next({type: 'click'});
      assert.equal(closed, disabled ? 0 : 1); assert.equal(disposed, disabled ? 0 : 1);
      assert.equal(prevented, !disabled && kind === 'keyboard' ? 1 : 0);
      if (!disabled) assert.equal(container._closeInteractionType, kind === 'keyboard' ? 'keyboard' : 'mouse');
      observations.inputs.push({disabled, kind, closed, disposed, recaptured, prevented});
      if (disabled) ref.close();
    });
  }
  if (line !== 'original') check('public-current-close-predicate-can-veto-explicit-close', () => {
    const events = new rx.Subject(), inputs = new rx.Subject(); let disposed = 0, predicateCalls = 0, closed = 0;
    const ref = new cdk.DialogRef({backdropClick: () => inputs, keydownEvents: () => inputs,
      outsidePointerEvents: () => inputs, detachments: () => events, dispose() {disposed++; inputs.complete(); events.complete();}},
    {id: 'predicate', closePredicate() {predicateCalls++; return false;}});
    ref.containerInstance = {}; ref.closed.subscribe(() => closed++);
    ref.close('vetoed'); assert.equal(predicateCalls, 1); assert.equal(closed, 0); assert.equal(disposed, 0);
    ref.config.closePredicate = undefined; ref.close('released'); assert.equal(closed, 1); assert.equal(disposed, 1);
  });
  const ContainerToken = new core.InjectionToken('dialog-public-container-payload');
  const ContentToken = new core.InjectionToken('dialog-public-content-payload');
  class Container extends portal.BasePortalOutlet {
    constructor() {
      super();
      this.element = core.inject(core.ElementRef); this.injector = core.inject(core.Injector);
      this.config = core.inject(cdk.DialogConfig); this.ref = core.inject(cdk.DialogRef);
      this.payload = this.injector.get(ContainerToken);
    }
    attachComponentPortal(content) {return this.outlet.attachComponentPortal(content);}
    attachTemplatePortal(content) {return this.templateView = this.outlet.attachTemplatePortal(content);}
    ngOnDestroy() {this.outlet.dispose(); super.dispose();}
  }
  core.ViewChild(portal.CdkPortalOutlet, {static: true})(Container.prototype, 'outlet');
  core.Component({selector: 'dialog-public-container-probe', standalone: true, imports: [portal.PortalModule],
    template: '<ng-template cdkPortalOutlet></ng-template>'})(Container);
  class Content {
    ref = core.inject(cdk.DialogRef); data = core.inject(cdk.DIALOG_DATA); payload = core.inject(ContentToken);
  }
  core.Component({selector: 'dialog-public-content-probe', standalone: true, template: ''})(Content);
  const data = {value: 'data'}, containerPayload = {}, contentPayload = {}, calls = [];
  const position = {attach: owner => {calls.push('position-attach');}, apply: () => calls.push('position-apply'),
    detach: () => calls.push('position-detach'), dispose: () => calls.push('position-dispose')};
  const scroll = {attach: owner => {calls.push('scroll-attach');}, enable: () => calls.push('scroll-enable'),
    disable: () => calls.push('scroll-disable')};
  let createdConfig, providerRef, providerContainer, providerConfig;
  const config = {id: 'public-service', data, hasBackdrop: false, disableClose: true, closeOnOverlayDetachments: false,
    positionStrategy: position, scrollStrategy: scroll,
    container: {type: Container, providers(value) {createdConfig = value; return [{provide: ContainerToken, useValue: containerPayload}];}},
    providers(ref, value, container) {providerRef = ref; providerConfig = value; providerContainer = container;
      return [{provide: ContentToken, useValue: contentPayload}];}};
  let closedValue, allClosed = 0, opened = 0;
  const closeSubscription = service.afterAllClosed.subscribe(() => allClosed++);
  const openSubscription = service.afterOpened.subscribe(() => opened++);
  const ref = service.open(Content, config);
  check('genuine-dialog-open-provider-hooks-and-component-identities', () => {
    assert.ok(ref instanceof cdk.DialogRef); assert.ok(ref.containerInstance instanceof Container);
    assert.ok(ref.componentInstance instanceof Content); assert.equal(ref.componentRef.instance, ref.componentInstance);
    assert.equal(ref.componentInstance.ref, ref); assert.equal(ref.componentInstance.data, data);
    assert.equal(ref.componentInstance.payload, contentPayload); assert.equal(ref.containerInstance.payload, containerPayload);
    assert.equal(ref.containerInstance.ref, ref); assert.equal(ref.containerInstance.config, ref.config);
    assert.equal(createdConfig, ref.config); assert.equal(providerConfig, ref.config);
    assert.equal(providerRef, ref); assert.equal(providerContainer, ref.containerInstance);
    assert.notEqual(ref.config, config); assert.equal(ref.config.data, data);
    assert.equal(service.getDialogById('public-service'), ref); assert.equal(service.openDialogs.length, 1); assert.equal(opened, 1);
  });
  ref.closed.subscribe(value => closedValue = value);
  ref.close('closed');
  check('genuine-dialog-close-releases-component-views-and-service-tracking', () => {
    assert.equal(closedValue, 'closed'); assert.equal(service.openDialogs.length, 0);
    assert.equal(service.getDialogById('public-service'), undefined); assert.equal(allClosed, 2);
    assert.equal(app.viewCount, 0); assert.equal(config.data, data);
  });
  observations.service = {providerIdentitiesPreserved: true, opened, allClosed, closedValue, calls,
    viewsAfterClose: app.viewCount, originalConfigDataUnmodified: config.data === data};
  closeSubscription.unsubscribe(); openSubscription.unsubscribe();
  class Capture {template = core.inject(core.TemplateRef);}
  core.Directive({selector: '[dialogPublicCapture]', standalone: true})(Capture);
  class Owner {}
  core.ViewChild(Capture, {static: true})(Owner.prototype, 'capture');
  core.Component({selector: 'dialog-public-template-owner', standalone: true, imports: [Capture],
    template: '<ng-template dialogPublicCapture let-value let-dialog="dialogRef"><span></span></ng-template>'})(Owner);
  const owner = core.createComponent(Owner, {environmentInjector: app.injector, hostElement: port.make('template-owner')});
  app.attachView(owner.hostView); owner.changeDetectorRef.detectChanges();
  let templateProviderRef, contextInvokedAfterProviders = false;
  const templateConfig = {...config, id: 'public-template', providers(value, options, container) {
    templateProviderRef = value; return [{provide: ContentToken, useValue: contentPayload}];
  }, templateContext() {contextInvokedAfterProviders = !!templateProviderRef; return {custom: contentPayload};}};
  const templateRef = service.open(owner.instance.capture.template, templateConfig);
  check('genuine-dialog-template-context-provider-order-and-owner-lifetime', () => {
    const view = templateRef.containerInstance.templateView;
    assert.equal(view.context.$implicit, data); assert.equal(view.context.dialogRef, templateRef);
    assert.equal(view.context.custom, contentPayload); assert.equal(templateProviderRef, templateRef);
    assert.equal(contextInvokedAfterProviders, true); assert.equal(view.destroyed, false);
    const scalar = value => value === undefined ? {kind: 'undefined'} : value === null ? null : {kind: typeof value};
    observations.template = {componentRef: scalar(templateRef.componentRef), componentInstance: scalar(templateRef.componentInstance),
      contextIdentitiesPreserved: true, providerBeforeTemplateContext: contextInvokedAfterProviders};
    templateRef.close(); assert.equal(view.destroyed, true); assert.equal(owner.hostView.destroyed, false);
  });
  owner.destroy();
  check('genuine-dialog-parent-service-public-owner-identity', () => {
    const child = core.createEnvironmentInjector([cdk.Dialog], app.injector);
    try {const nested = child.get(cdk.Dialog); assert.notEqual(nested, service);
      assert.equal(nested.openDialogs, service.openDialogs); assert.equal(nested.afterOpened, service.afterOpened);
    } finally {child.destroy();}
    assert.equal(service.openDialogs.length, 0); assert.equal(app.viewCount, 0);
  });
  console.log(JSON.stringify({line, mode, cases, observations, genuine_public_Dialog_open_and_DialogRef: true,
    generated_test_component_factories_executed: true, generated_legacy_component_factories_executed: false,
    native_DOM_positions_scroll_or_current_owned_callers_qualified: false, SDK_source_rewrites: false,
    actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'}));
} finally {app.destroy(); core.destroyPlatform();}
