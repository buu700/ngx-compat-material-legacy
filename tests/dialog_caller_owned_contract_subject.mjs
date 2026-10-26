/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine service/portal ownership; test subclass delegates focus methods and supplies motion events. */
import assert from 'node:assert/strict';
const [line, mode, side = 'candidate', phase = 'current'] = process.argv.slice(2);
await import('zone.js/node'); await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const browser = await import('@angular/platform-browser'), cdk = await import('@angular/cdk/dialog');
const overlay = await import('@angular/cdk/overlay'), portal = await import('@angular/cdk/portal');
const material = await import('@angular/material/dialog');
const rx = await import('rxjs');
const {documentProtocol} = await import('./a11y-node-protocol.mjs');
if (mode === 'production') core.enableProdMode();
const metadata = new WeakMap();
Reflect.metadata = (key, value) => target => {const values = metadata.get(target) ?? new Map();
  values.set(key, value); metadata.set(target, values);};
Reflect.getOwnMetadata = (key, target) => metadata.get(target)?.get(key);
globalThis.Document = class DocumentProtocolType {};
const port = documentProtocol(core), location = new URL('https://dialog-contract.invalid/');
port.document.location = location; port.window.location = location;
port.window.history = {state: null, pushState() {}, replaceState() {}, forward() {}, back() {}, go() {}};
globalThis.document = port.document; globalThis.window = port.window; globalThis.getComputedStyle = port.window.getComputedStyle;
const renderer = port.renderer();
// Angular-created elements need the same declared contains/query/focus ports as document-created nodes.
renderer.createElement = name => port.make(name);
const app = await browser.createApplication({providers: [core.importProvidersFrom(cdk.DialogModule),
  core.provideZoneChangeDetection({eventCoalescing: false, runCoalescing: false}),
  {provide: core.PLATFORM_ID, useValue: 'server'}, {provide: common.DOCUMENT, useValue: port.document},
  {provide: core.CSP_NONCE, useValue: null}, {provide: core.RendererFactory2, useValue: {createRenderer: () => renderer}}]});
let Base, ContainerBase, Ref, taggedLegacyRefIdentity = null;
if (line === 'original') {
  // Removed original helpers are reference subjects only, never current upstream dependencies.
  const legacy = await import('@angular/material/legacy-dialog');
  taggedLegacyRefIdentity = legacy.MatLegacyDialogRef === material.MatDialogRef;
  assert.equal(typeof legacy.MatLegacyDialogRef, 'function');
  assert.ok(Object.getPrototypeOf(legacy.MatLegacyDialogRef.prototype) === material.MatDialogRef.prototype);
  assert.deepEqual(Reflect.ownKeys(legacy.MatLegacyDialogRef.prototype), ['constructor']);
  Base = material._MatDialogBase; ContainerBase = material._MatDialogContainerBase; Ref = legacy.MatLegacyDialogRef;
} else {
  Base = (await import('./' + side + '/projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.mjs'))._MatDialogBase;
  ContainerBase = (await import('./' + side + '/projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.mjs'))._MatDialogContainerBase;
  Ref = (await import('./' + side + '/projects/ngx-material-legacy/legacy-dialog/dialog-ref.mjs')).MatLegacyDialogRef;
}
const Data = new core.InjectionToken('dialog-owned-contract-data');
class Container extends ContainerBase {
  requests = [];
  _startExitAnimation() {this.requests.push('exit'); this._animationStateChanged.emit({state: 'closing', totalTime: 0});
    this._animationStateChanged.emit({state: 'closed', totalTime: 0});}
  _trapFocus() {this.requests.push('trap-focus'); return super._trapFocus();}
  _recaptureFocus() {this.requests.push('recapture-focus'); return super._recaptureFocus();}
  attachTemplatePortal(content) {return this.templateView = super.attachTemplatePortal(content);}
  opened() {super._openAnimationDone(0);}
}
core.Component({selector: 'dialog-owned-contract-container', standalone: true, imports: [portal.PortalModule],
  template: '<ng-template cdkPortalOutlet></ng-template>'})(Container);
class Content {ref = core.inject(Ref); data = core.inject(Data);}
core.Component({selector: 'dialog-owned-contract-content', standalone: true, template: ''})(Content);
class Service extends Base {}
const scroll = () => ({attach() {}, enable() {}, disable() {}});
const scalar = value => value === undefined ? {kind: 'undefined'} : value === null ? null : {kind: typeof value};
const resultValue = value => value === undefined ? {kind: 'undefined'} : value;
const observations = [], cases = [];
const peerRegistrationChecks = [];
const ownedState = phase === 'proposal' ? await import('./' + side + '/projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-state.mjs') : null;
try {
  const peerService = app.injector.get(cdk.Dialog), data = {value: 'owned-contract-data'};
  const service = new Service(app.injector.get(overlay.Overlay), app.injector, undefined, undefined,
    app.injector.get(overlay.OverlayContainer), scroll, Ref, Container, Data);
  function open(content, config = {}) {
    let peer;
    const sub = peerService.afterOpened.subscribe(value => peer = value);
    const ref = service.open(content, {hasBackdrop: false, data, ...config}); sub.unsubscribe();
    assert.ok(peer instanceof cdk.DialogRef); assert.ok(ref instanceof Ref);
    assert.ok(ref._containerInstance instanceof ContainerBase); return {ref, peer, container: ref._containerInstance};
  }
  function lifecycle(ref) {
    const events = [];
    ref.afterOpened().subscribe({next: () => events.push(['opened', ref.getState()]), complete: () => events.push(['opened-complete'])});
    ref.beforeClosed().subscribe({next: value => events.push(['before', resultValue(value), ref.getState()]), complete: () => events.push(['before-complete'])});
    ref.afterClosed().subscribe({next: value => events.push(['closed', resultValue(value), ref.getState(), scalar(ref.componentInstance)]), complete: () => events.push(['closed-complete'])});
    return events;
  }
  console.error(line + ': component lifecycle');
  {
    const {ref, peer, container} = open(Content), events = lifecycle(ref), instance = ref.componentInstance;
    assert.ok(instance.ref === ref); assert.ok(instance.data === data); assert.ok(ref.componentRef === peer.componentRef);
    assert.equal(ref.getState(), 0); container.opened(); assert.equal(ref.getState(), 0);
    const late = []; ref.afterOpened().subscribe({next: () => late.push('opened'), complete: () => late.push('complete')});
    ref.close('component-result'); assert.equal(service.openDialogs.length, 0); assert.equal(peerService.openDialogs.length, 0);
    if (ownedState) {assert.equal(ownedState.legacyDialogContainerPeer(container), null); peerRegistrationChecks.push('component-peer-released');}
    const lateBefore = []; ref.beforeClosed().subscribe({next: value => lateBefore.push(resultValue(value)), complete: () => lateBefore.push('complete')});
    assert.equal(app.viewCount, 0);
    observations.push({kind: 'component-lifecycle', events, lateOpened: late, lateBeforeClosed: lateBefore, state: ref.getState(),
      componentInstanceAfterClose: scalar(ref.componentInstance), requests: [...container.requests]});
    cases.push('actual-component-service-ref-state-and-events', 'actual-component-late-open-subscription-and-owner-cleanup',
      'actual-component-late-before-close-subscription');
  }
  console.error(line + ': template ownership');
  {
    class Capture {template = core.inject(core.TemplateRef);}
    core.Directive({selector: '[dialogOwnedCapture]', standalone: true})(Capture);
    class Owner {}
    core.ViewChild(Capture, {static: true})(Owner.prototype, 'capture');
    core.Component({selector: 'dialog-owned-template-owner', standalone: true, imports: [Capture],
      template: '<ng-template dialogOwnedCapture let-value let-dialog="dialogRef"><span></span></ng-template>'})(Owner);
    const owner = core.createComponent(Owner, {environmentInjector: app.injector, hostElement: port.make('owned-template-host')});
    app.attachView(owner.hostView); owner.changeDetectorRef.detectChanges();
    const {ref, peer, container} = open(owner.instance.capture.template), view = container.templateView;
    const events = lifecycle(ref);
    assert.ok(view.context.$implicit === data); assert.ok(view.context.dialogRef === ref);
    assert.equal(view.destroyed, false); assert.equal(owner.hostView.destroyed, false);
    const before = {componentRef: scalar(ref.componentRef), componentInstance: scalar(ref.componentInstance),
      peerComponentRef: scalar(peer.componentRef), peerComponentInstance: scalar(peer.componentInstance)};
    container.opened(); ref.close('template-result');
    if (ownedState) {assert.equal(ownedState.legacyDialogContainerPeer(container), null); peerRegistrationChecks.push('template-peer-released');}
    const lateBefore = []; ref.beforeClosed().subscribe({next: value => lateBefore.push(resultValue(value)), complete: () => lateBefore.push('complete')});
    assert.equal(view.destroyed, true); assert.equal(owner.hostView.destroyed, false);
    assert.equal(service.openDialogs.length, 0); assert.equal(peerService.openDialogs.length, 0);
    observations.push({kind: 'template-ownership', before, events, lateBeforeClosed: lateBefore, state: ref.getState(),
      instanceAfterClose: scalar(ref.componentInstance), contextIdentities: true, borrowedOwnerSurvived: true});
    cases.push('actual-template-context-and-component-nullability', 'actual-template-close-events-and-borrowed-owner-lifetime',
      'actual-template-late-before-close-subscription');
    owner.destroy(); assert.equal(app.viewCount, 0);
  }
  console.error(line + ': real backdrop inputs');
  for (const disabled of [false, true]) {
    const {ref, peer, container} = open(Content, {hasBackdrop: true, disableClose: disabled}), events = lifecycle(ref);
    container.opened(); const initialRequests = container.requests.length;
    const backdrop = peer.overlayRef.backdropElement;
    assert.ok(backdrop && typeof backdrop.dispatchEvent === 'function', 'public real-overlay backdrop');
    const event = new Event('click', {cancelable: true}); backdrop.dispatchEvent(event);
    observations.push({kind: 'backdrop-input', disabled, prevented: event.defaultPrevented,
      state: ref.getState(), events: [...events], requests: container.requests.slice(initialRequests),
      trackedAfterInput: service.openDialogs.length});
    cases.push('actual-overlay-backdrop-disabled-' + disabled);
    if (service.openDialogs.length) ref.close('cleanup');
    assert.equal(service.openDialogs.length, 0); assert.equal(peerService.openDialogs.length, 0); assert.equal(app.viewCount, 0);
  }
  service.ngOnDestroy();
  console.error(line + ': isolated ref protocols');
  function manual({disabled = false, containerFactory, bindRef = true, legacyConfig = {disableClose: disabled}} = {}) {
    const backdrop = new rx.Subject(), keys = new rx.Subject(), detached = new rx.Subject(), outside = new rx.Subject();
    const animation = new core.EventEmitter(), calls = []; let attached = true;
    const strategy = {};
    for (const name of ['left', 'right', 'top', 'bottom', 'centerHorizontally', 'centerVertically']) {
      strategy[name] = value => {calls.push(['strategy', name, resultValue(value)]); return strategy;};
    }
    const owner = {backdropClick: () => backdrop, keydownEvents: () => keys, detachments: () => detached,
      outsidePointerEvents: () => outside, updatePosition: () => calls.push(['position']),
      updateSize: value => calls.push(['size', value]), addPanelClass: value => calls.push(['add', value]),
      removePanelClass: value => calls.push(['remove', value]), detachBackdrop: () => calls.push(['detach-backdrop']),
      dispose() {calls.push(['dispose-request']); const wasAttached = attached; attached = false;
        backdrop.complete(); keys.complete(); outside.complete(); if (wasAttached) {calls.push(['dispose-effect']); detached.next();}
        detached.complete();}};
    const payload = containerFactory ? containerFactory(owner, legacyConfig) : {_animationStateChanged: animation, _closeInteractionType: null,
      _recaptureFocus() {calls.push(['recapture-focus']);},
      _startExitAnimation() {calls.push(['exit']); animation.emit({state: 'closing', totalTime: 0}); animation.emit({state: 'closed', totalTime: 0});}};
    if (!bindRef) return {payload, calls, keys, backdrop, detached, animation, owner};
    const peer = new cdk.DialogRef(owner, {id: 'manual-owned-ref', disableClose: true,
      closeOnOverlayDetachments: false, positionStrategy: strategy});
    peer.containerInstance = payload;
    const ref = new Ref(peer, legacyConfig, payload);
    const component = {}; peer.componentInstance = component; ref.componentInstance = component;
    assert.ok(ref.backdropClick() === backdrop); assert.ok(ref.keydownEvents() === keys);
    return {ref, peer, payload, calls, keys, backdrop, detached, animation};
  }
  for (const variant of ['opened-close', 'close-before-opened', 'reentrant-close', 'repeat-close', 'detach-before-opened', 'completion-detach']) {
    const m = manual(), events = lifecycle(m.ref);
    if (['opened-close', 'reentrant-close', 'repeat-close'].includes(variant)) m.animation.emit({state: 'opened', totalTime: 0});
    if (variant === 'reentrant-close') {
      let reentered = false; m.ref.beforeClosed().subscribe(() => {if (!reentered) {reentered = true; m.ref.close('second');}});
    }
    if (variant === 'completion-detach') m.ref.afterOpened().subscribe({complete: () => m.detached.next()});
    if (variant === 'detach-before-opened') m.detached.next(); else m.ref.close('first');
    if (variant === 'repeat-close') m.ref.close('second');
    if (['close-before-opened', 'detach-before-opened', 'completion-detach'].includes(variant)) m.animation.emit({state: 'opened', totalTime: 0});
    observations.push({kind: 'manual-ref-lifecycle', variant, state: m.ref.getState(), events,
      calls: [...m.calls], closeOrigin: m.payload._closeInteractionType, instanceAfterClose: scalar(m.ref.componentInstance)});
    cases.push('manual-actual-ref-lifecycle-' + variant);
    m.peer.close();
  }
  for (const disabled of [false, true]) for (const kind of ['keyboard', 'backdrop', 'modified-escape', 'other-key']) {
    const m = manual({disabled}), events = lifecycle(m.ref); m.animation.emit({state: 'opened', totalTime: 0});
    let prevented = 0;
    const event = {type: kind === 'backdrop' ? 'click' : 'keydown', keyCode: kind === 'other-key' ? 13 : 27,
      ctrlKey: kind === 'modified-escape', altKey: false, shiftKey: false, metaKey: false, preventDefault() {prevented++;}};
    if (kind === 'backdrop') m.backdrop.next(event); else m.keys.next(event);
    observations.push({kind: 'manual-ref-input', disabled, input: kind, prevented, state: m.ref.getState(),
      events: [...events], calls: [...m.calls], closeOrigin: m.payload._closeInteractionType});
    cases.push('manual-actual-ref-input-' + kind + '-disabled-' + disabled);
    if (m.ref.getState() !== 2) m.ref.close('cleanup'); m.peer.close();
  }
  {
    const m = manual();
    for (const position of [undefined, {left: '1px', top: '2px'}, {right: '3px', bottom: '4px'},
      {left: '', right: '5px', top: '', bottom: '6px'}]) assert.ok(m.ref.updatePosition(position) === m.ref);
    assert.ok(m.ref.updateSize() === m.ref); assert.ok(m.ref.updateSize('40px', '30px') === m.ref);
    assert.ok(m.ref.addPanelClass(['one', 'two']) === m.ref); assert.ok(m.ref.removePanelClass('one') === m.ref);
    observations.push({kind: 'manual-ref-forwarding', calls: [...m.calls]});
    cases.push('manual-actual-ref-position-precedence-and-defaults', 'manual-actual-ref-size-and-panel-class-forwarding');
    m.ref.close('cleanup'); m.peer.close();
  }
  console.error(line + ': manually constructed actual container');
  function manualContainer(owner, config) {
    const host = port.make('manual-container'); port.document.body.appendChild(host);
    const factory = {create: () => ({destroy() {}, focusInitialElementWhenReady: () => Promise.resolve(false),
      focusFirstTabbableElement: () => false, focusLastTabbableElement: () => false})};
    const zone = {isStable: true, onStable: new rx.Subject(), runOutsideAngular: action => action(), run: action => action()};
    return new Container(new core.ElementRef(host), factory, port.document, config,
      {isFocusable: () => true, isTabbable: () => true}, zone, owner, {focusVia: target => target.focus()});
  }
  for (const disabled of [false, true]) {
    const config = Object.assign(new material.MatDialogConfig(), {disableClose: disabled,
      autoFocus: 'dialog', delayFocusTrap: true, restoreFocus: false});
    const m = manual({disabled, legacyConfig: config, containerFactory: manualContainer});
    try {
      m.payload._contentAttached(); m.payload.opened();
      assert.ok(port.document.activeElement === m.payload._elementRef.nativeElement);
      port.document.body.focus(); const start = m.payload.requests.length;
      m.backdrop.next({type: 'click', preventDefault() {}});
      observations.push({kind: 'manual-actual-container-backdrop', disabled, state: m.ref.getState(),
        requests: m.payload.requests.slice(start), focusedAfterInput: port.document.activeElement === port.document.body ? 'outside' : 'container'});
      cases.push('manual-actual-container-and-peer-backdrop-disabled-' + disabled);
      if (m.ref.getState() !== 2) m.ref.close('cleanup'); m.peer.close();
    } finally {
      if (ownedState) assert.ok(ownedState.legacyDialogContainerPeer(m.payload) === m.peer, 'manual peer registration identity');
      m.payload.ngOnDestroy();
      if (ownedState) {assert.equal(ownedState.legacyDialogContainerPeer(m.payload), null); peerRegistrationChecks.push('manual-peer-released-' + disabled);}
      m.payload._elementRef.nativeElement.remove();
    }
  }
  {
    const config = Object.assign(new material.MatDialogConfig(), {disableClose: false,
      autoFocus: 'dialog', delayFocusTrap: true, restoreFocus: false});
    const m = manual({bindRef: false, legacyConfig: config, containerFactory: manualContainer});
    try {
      m.payload._contentAttached(); port.document.body.focus(); const start = m.payload.requests.length;
      m.payload._recaptureFocus();
      assert.ok(port.document.activeElement === m.payload._elementRef.nativeElement);
      observations.push({kind: 'manual-unpaired-direct-recapture', requests: m.payload.requests.slice(start), focusedContainer: true});
      cases.push('manual-unpaired-container-direct-recapture-preserved');
    } finally {m.payload.ngOnDestroy(); m.payload._elementRef.nativeElement.remove(); m.owner.dispose();}
  }
  if (phase === 'proposal') {
    const component = observations.find(row => row.kind === 'component-lifecycle');
    assert.deepEqual(component.lateOpened, ['complete'], 'historical opening stream must not replay');
    assert.deepEqual(component.lateBeforeClosed, ['complete'], 'historical before-close stream must not replay');
    const template = observations.find(row => row.kind === 'template-ownership');
    assert.deepEqual(template.before.componentRef, {kind: 'undefined'}, 'historical template component ref');
    assert.deepEqual(template.before.componentInstance, {kind: 'undefined'}, 'historical template component instance');
    assert.deepEqual(template.lateBeforeClosed, ['complete']);
    const backdrop = observations.find(row => row.kind === 'backdrop-input' && !row.disabled);
    assert.deepEqual(backdrop.requests.filter(request => request !== 'recapture-focus'), ['exit'], 'enabled backdrop must not trap focus');
    for (const row of observations.filter(row => row.kind === 'manual-actual-container-backdrop')) {
      assert.equal(row.focusedAfterInput, row.disabled ? 'container' : 'outside', 'manual paired container focus');
      assert.deepEqual(row.requests.filter(request => request !== 'recapture-focus'), row.disabled ? ['trap-focus'] : ['exit']);
      if (row.disabled) assert.deepEqual(row.requests, ['recapture-focus', 'trap-focus'], 'manual paired container duplicate recapture');
    }
  }
  console.log(JSON.stringify({line, mode, side, phase, cases, observations, taggedLegacyRefIdentity, peerRegistrationChecks,
    genuine_public_Dialog_open: true, actual_owned_source_files: line === 'original' ? 0 : 49,
    generated_test_subclass_factories_and_queries_executed: true, test_focus_overrides_delegate_to_actual_super: true,
    legacy_leaf_factories_templates_or_styles_executed: false, DOM_renderer_and_test_animation_events_are_protocols: true,
    manual_ref_uses_genuine_public_DialogRef: true, manual_OverlayRef_and_animation_container_are_protocols: true,
    actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'}));
} finally {app.destroy(); core.destroyPlatform();}
