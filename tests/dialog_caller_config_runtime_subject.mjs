/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned configuration/constructors and public injector execution on explicit node ports. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line, mode, selectedSide] = process.argv.slice(2);
assert.ok(['before', 'candidate'].includes(selectedSide));
await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), browser = await import('@angular/platform-browser');
const a11y = await import('@angular/cdk/a11y');
const overlay = await import('@angular/cdk/overlay'), dialog = await import('@angular/material/dialog');
const rx = await import('rxjs');
if (mode === 'production') core.enableProdMode();
// Standard TypeScript design metadata and a Document constructor marker are
// explicit environment protocols, not replacements for Angular factories.
const metadata = new WeakMap();
Reflect.metadata = (key, value) => target => {
  const values = metadata.get(target) ?? new Map(); values.set(key, value); metadata.set(target, values);
};
Reflect.getOwnMetadata = (key, target) => metadata.get(target)?.get(key);
globalThis.Document = class DocumentProtocolType {};
const {documentProtocol} = await import('./a11y-node-protocol.mjs');
const port = documentProtocol(core);
globalThis.document = port.document; globalThis.window = port.window;
globalThis.getComputedStyle = port.window.getComputedStyle;
const snapshot = value => ({keys: Reflect.ownKeys(value).map(String), properties: Object.fromEntries(
  Reflect.ownKeys(value).map(key => {const d = Object.getOwnPropertyDescriptor(value, key);
    assert.ok(Object.hasOwn(d, 'value'), 'unexpected config getter');
    return [String(key), {value: d.value === undefined ? {kind: 'undefined'} : typeof d.value === 'function' ?
      {kind: 'function', source: String(d.value)} : {kind: typeof d.value, value: d.value},
    writable: d.writable, enumerable: d.enumerable, configurable: d.configurable}];}))});
const cases = [], observations = {sides: {}};
const application = await browser.createApplication({providers: [core.importProvidersFrom(a11y.A11yModule),
  core.provideZoneChangeDetection({eventCoalescing: false, runCoalescing: false}),
  {provide: core.PLATFORM_ID, useValue: 'browser'}, {provide: core.DOCUMENT, useValue: port.document},
  {provide: core.CSP_NONCE, useValue: null},
  {provide: core.RendererFactory2, useValue: {createRenderer: port.renderer}}]});
try {
  const environment = application.injector, factory = environment.get(a11y.FocusTrapFactory);
  const checker = environment.get(a11y.InteractivityChecker), zone = environment.get(core.NgZone);
  for (const side of [selectedSide]) {
    const owned = path => import('./' + side + '/projects/ngx-material-legacy/' + path + '.mjs');
    const {MatLegacyDialogConfig} = await owned('legacy-dialog/dialog-config');
    const config = new MatLegacyDialogConfig();
    assert.ok(config instanceof dialog.MatDialogConfig, 'config-public-parent-identity');
    const exports = await owned('legacy-dialog/dialog-config');
    assert.deepEqual(Object.keys(exports), ['MatLegacyDialogConfig'], 'type-view-created-runtime-export');
    const result = {defaults: snapshot(config), peerSubtype: true, focus: [], constructors: [], lifecycle: []};
    observations.sides[side] = result;
    cases.push(side + '-actual-owned-config-constructor-and-descriptors');
    const focus = await owned('legacy-dialog/internal/dialog-initial-focus');
    for (const policy of [false, true, 'dialog', 'first-tabbable', 'first-heading', '.wanted']) {
      const host = port.make('section'), button = port.make('button'), heading = port.make('h2');
      button.setAttribute('cdkFocusInitial', ''); heading.classList.add('wanted');
      host.appendChild(button); host.appendChild(heading); port.document.body.appendChild(host);
      port.document.activeElement = port.document.body;
      let settled = 0;
      const beforeAnchors = port.log.anchorInsertions;
      const cleanup = focus.focusLegacyDialogInitially({element: host, config: {autoFocus: policy},
        factory, checker, renderer: port.renderer(), ngZone: zone, isBrowser: true,
        isDestroyed: () => false, onFocusSettled: () => settled++}, {preventScroll: true});
      const target = policy === false || policy === 'dialog' ? host :
        policy === true || policy === 'first-tabbable' ? button : heading;
      assert.equal(port.document.activeElement, target, 'focus-policy-' + String(policy));
      assert.equal(settled, 1, 'focus-policy-notification-' + String(policy));
      assert.equal(port.log.focus.at(-1).options.preventScroll, true);
      assert.equal(port.log.anchorInsertions, beforeAnchors, 'temporary-selection-inserted-anchors');
      const temporary = heading.getAttribute('tabindex');
      cleanup?.();
      assert.equal(heading.getAttribute('tabindex'), null, 'owned-selector-cleanup');
      result.focus.push({policy, target: target === host ? 'host' : target === button ? 'button' : 'heading',
        settled, temporaryTabindex: temporary, optionsPreserved: true, temporaryAnchors: 0});
      host.remove(); cases.push(side + '-owned-focus-policy-' + String(policy));
    }
    const { _MatDialogContainerBase: Base } = await owned('legacy-dialog/internal/dialog-container-base');
    const {legacyDialogFocusNotifications} = await owned('legacy-dialog/internal/dialog-container-state');
    const {parameterTokens} = await import('./' + side + '/observed-core.mjs');
    const design = Reflect.getOwnMetadata('design:paramtypes', Base);
    assert.ok(design);
    if (side === 'before') assert.equal(design[3], dialog.MatDialogConfig, 'original-implicit-public-config-token');
    for (const delayed of [false, true]) {
      const previous = port.make('button'), host = port.make('section'), heading = port.make('h2');
      host.appendChild(heading); port.document.body.appendChild(previous); port.document.body.appendChild(host);
      previous.focus();
      const supplied = new dialog.MatDialogConfig();
      supplied.autoFocus = delayed ? 'first-heading' : false;
      supplied.delayFocusTrap = delayed; supplied.restoreFocus = true; supplied.disableClose = true;
      const backdrop = new rx.Subject(), monitorCalls = [], payload = {backdropClick: () => backdrop};
      const monitor = {focusVia(target, origin) {monitorCalls.push(origin); target.focus();}};
      class Probe extends Base { _startExitAnimation() {} start() {this._contentAttached();} opened() {this._openAnimationDone(0);} }
      core.Injectable()(Probe);
      const child = core.createEnvironmentInjector([{provide: Probe, useClass: Probe},
        {provide: core.ElementRef, useValue: new core.ElementRef(host)},
        {provide: dialog.MatDialogConfig, useValue: supplied},
        {provide: overlay.OverlayRef, useValue: payload}, {provide: a11y.FocusMonitor, useValue: monitor}], environment);
      try {
        const instance = child.get(Probe);
        assert.equal(instance._config, supplied, 'candidate-public-injector-config-identity');
        if (side === 'candidate') assert.equal(parameterTokens.get(Base)?.get(3), dialog.MatDialogConfig,
          'candidate-explicit-di-public-token');
        const events = [];
        legacyDialogFocusNotifications(instance).subscribe({next: () => events.push('focus'), complete: () => events.push('complete')});
        instance._animationStateChanged.subscribe(event => events.push(event.state));
        instance.start();
        assert.equal(port.document.querySelectorAll('.cdk-focus-trap-anchor').length, 2);
        if (delayed) {assert.equal(port.document.activeElement, previous); instance.opened();}
        assert.equal(port.document.activeElement, delayed ? heading : host, 'container-focus-target');
        if (!delayed) {previous.focus(); backdrop.next({}); assert.equal(port.document.activeElement, host, 'backdrop-focus-recapture');}
        instance._closeInteractionType = 'keyboard';
        instance.ngOnDestroy(); instance.ngOnDestroy();
        assert.equal(port.document.activeElement, previous, 'focus-restoration-target');
        assert.deepEqual(monitorCalls, ['keyboard'], 'focus-restoration-origin-and-idempotence');
        assert.equal(port.document.querySelectorAll('.cdk-focus-trap-anchor').length, 0, 'persistent-trap-cleanup');
        assert.equal(backdrop.observed, false, 'backdrop-subscription-cleanup');
        assert.equal(heading.getAttribute('tabindex'), null, 'container-selector-cleanup');
        assert.deepEqual(events, delayed ? ['focus', 'opened', 'complete'] : ['focus', 'focus', 'complete']);
        result.lifecycle.push({delayed, events, injectorConfigIdentity: true,
          focusRestored: true, cleanup: true, idempotent: true,
          actualPublicInjector: true, actualJITConstructorFactory: true,
          generatedTemplateOrQueryExecuted: false});
      } finally {child.destroy(); previous.remove(); host.remove();}
      cases.push(side + '-public-injector-and-owned-focus-lifecycle-' + delayed);
    }
    const {MatLegacyDialogContainer: Container} = await owned('legacy-dialog/dialog-container');
    for (const [enter, exit] of [[undefined, undefined], ['250ms', '0.05s'], ['0ms', '0ms'], ['bad', 'bad']]) {
      const host = port.make('section'), cfg = new MatLegacyDialogConfig();
      if (enter !== undefined) cfg.enterAnimationDuration = enter;
      if (exit !== undefined) cfg.exitAnimationDuration = exit;
      const ref = {backdropClick: () => new rx.Subject()};
      const instance = new Container(new core.ElementRef(host), factory, port.document, cfg,
        checker, zone, ref, {markForCheck() {}}, {focusVia(target) {target.focus();}});
      try {
        assert.equal(instance._config, cfg);
        result.constructors.push({enter: enter ?? null, exit: exit ?? null,
          effectiveEnter: instance._enterAnimationDuration, effectiveExit: instance._exitAnimationDuration,
          animationsEnabled: instance._animationsEnabled, manualConfigIdentity: true});
      } finally {instance.ngOnDestroy();}
      cases.push(side + '-actual-container-duration-constructor-' + String(enter));
    }
  }
  if (selectedSide === 'candidate') {
    const before = JSON.parse(readFileSync(new URL('./before-observations-' + mode + '.json', import.meta.url)));
    assert.deepEqual(observations.sides.candidate.defaults, before.defaults, 'candidate-full-config-shape-beforeafter');
    assert.deepEqual(observations.sides.candidate.focus, before.focus, 'candidate-focus-policy-beforeafter');
    assert.deepEqual(observations.sides.candidate.lifecycle, before.lifecycle, 'candidate-lifecycle-beforeafter');
    assert.deepEqual(observations.sides.candidate.constructors, before.constructors, 'candidate-effective-motion-defaults-beforeafter');
  }
} finally {application.destroy();}
console.log(JSON.stringify({line, mode, selectedSide, cases, observations,
  standard_Reflect_metadata_Document_DOM_Renderer_and_overlay_monitor_payloads_are_protocols: true,
  actual_public_injector_JIT_constructor_factory: true,
  generated_leaf_Component_factory_template_or_query_execution: false,
  public_application_and_injectors: true, current_owned_source_on_other_SDK: false,
  actual_native_packed_AOT_or_full_floor_qualified: false}));
