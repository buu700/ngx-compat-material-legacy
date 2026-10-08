/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned constructor/portal/focus composition, synthetic DOM diagnostic. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {fixture, load} from './dialog_initial_focus_runtime_probe.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url), ts = require('typescript');
const url = name => pathToFileURL(require.resolve(name)).href;
const core = await import(url('@angular/core'));
const containerState = await load(undefined,undefined,false,true);
const {Dialog, DialogConfig} = await import(url('@angular/cdk/dialog'));
const {MatDialogConfig} = await import(url('@angular/material/dialog'));
const {Subject} = await import(url('rxjs'));
const {BasePortalOutlet, ComponentPortal, TemplatePortal, DomPortal} = await import(url('@angular/cdk/portal'));
const basePath = 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts';
const raw = readFileSync(resolve(root, basePath), 'utf8');
const servicePath = 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts';
const serviceRaw = readFileSync(resolve(root, servicePath), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function recordingOutlet() {
  const log = [], component = {}, template = {};
  class Outlet extends BasePortalOutlet {
    attachComponentPortal(portal) {log.push({kind: 'component', portal}); return component;}
    attachTemplatePortal(portal) {log.push({kind: 'template', portal}); return template;}
    attachDomPortal = portal => {log.push({kind: 'dom', portal});};
    detach() {log.push({kind: 'detach'}); super.detach();}
    dispose() {log.push({kind: 'dispose'}); super.dispose();}
  }
  return {outlet: new Outlet(), log, component, template};
}

async function loadService(raw) {
  const emitted = ts.transpileModule(raw, {compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true,
  }}).outputText.replace(/(['"])(@angular\/[^'"]+|rxjs(?:\/operators)?)\1/g,
    (_, quote, name) => JSON.stringify(url(name)));
  // The owned container/ref imports are type-only in this actual service.
  assert.ok(!emitted.includes("from '../"));
  return (await import('data:text/javascript;base64,' + Buffer.from(emitted).toString('base64')))._MatDialogBase;
}

async function observations(Base, serviceSource = serviceRaw) {
  const cases = [];
  async function check(id, body) {
    try {await body(); cases.push({id, result: 'pass'});}
    catch(error) {cases.push({id, result: 'fail', error: error.message.slice(0, 450)});}
  }
  await check('actual-owned-service-scopes-public-and-legacy-config-to-same-object', async () => {
    const Service = await loadService(serviceSource);let captured, ref;
    const closed = new Subject();
    class LegacyConfig extends MatDialogConfig {ariaModal = true;}
    class LegacyRef {
      constructor(cdkRef, config, container) {this.config = config;this.container = container;}
      updatePosition() {} afterClosed() {return closed;}
    }
    const container = {}, componentRef = {}, componentInstance = {};
    const dialog = {open(component, config) {captured = config;
      const cdkRef = {componentRef, componentInstance};
      config.providers(cdkRef, config, container);return cdkRef;}};
    const injector = core.Injector.create({providers: [{provide: Dialog, useValue: dialog}]});
    const position = {centerHorizontally() {return this;}, centerVertically() {return this;}};
    const overlay = {position: () => ({global: () => position})};
    try {
      const service = new Service(overlay, injector, undefined, undefined, {}, () => ({}), LegacyRef, Base, {});
      service.dialogConfigClass = LegacyConfig;ref = service.open(class Content {}, {autoFocus: 'dialog'});
      const providers = captured.container.providers();
      for(const token of [LegacyConfig, MatDialogConfig, DialogConfig]) {
        const matches = providers.filter(p => p.provide === token);assert.equal(matches.length, 1);
        assert.equal(matches[0].useValue, ref.config);
      }
      assert.equal(ref.config.ariaModal, true);assert.equal(ref.config.autoFocus, 'dialog');
      assert.equal(ref.componentRef, componentRef);assert.equal(ref.componentInstance, componentInstance);
      assert.equal(captured.templateContext().dialogRef, ref);assert.deepEqual(service.openDialogs, [ref]);
      closed.next();assert.deepEqual(service.openDialogs, []);service.ngOnDestroy();
    } finally {injector.destroy();}
  });
  await check('manual-eight-arguments-outside-injection-context', async () => {
    const f = fixture(Base, 'first-heading', true, {manual: true});
    try {
      assert.equal(f.instance._config, f.config);assert.equal(f.instance._elementRef, f.args[0]);
      assert.equal(f.instance._focusTrapFactory, f.factory);assert.equal(f.instance._ngZone, f.args[5]);
      f.instance._trapFocus();await Promise.resolve();assert.equal(f.document.activeElement, f.heading);
      assert.equal(f.listeners.size, 2);f.listeners.get('heading:blur')();
      assert.equal(f.listeners.size, 0);assert.equal(f.heading.tabIndex, undefined);
    } finally {f.destroy();}
  });
  await check('supplied-arguments-override-different-ambient-di-values', async () => {
    const f = fixture(Base, 'first-heading', true, {ambientMismatch: true});
    try {f.instance._trapFocus();await Promise.resolve();assert.equal(f.document.activeElement, f.heading);
      assert.equal(f.instance._config, f.config);assert.equal(f.instance._elementRef, f.args[0]);}
    finally {f.destroy();}
  });
  await check('borrowed-services-survive-container-destruction', async () => {
    const f = fixture(Base, false, true, {manual: true});
    for(const service of [f.factory, f.args[4], f.args[5], f.overlay, f.monitor])
      service.destroy = () => {throw Error('borrowed service destroyed');};
    f.destroy();assert.equal(f.completed(), 1);f.instance.ngOnDestroy();assert.equal(f.completed(), 1);
  });
  await check('initial-aria-label-and-onpush-title-queue', async () => {
    const f = fixture(Base, 'first-tabbable', true, {config: {ariaLabelledBy: 'provided'}});let marks = 0;
    assert.deepEqual(f.instance._ariaLabelledByQueue, ['provided']);
    // Ambient ChangeDetectorRef belongs to the fixture; title mutations must mark it.
    const detector = f.injector.get(core.ChangeDetectorRef);detector.markForCheck = () => marks++;
    try {containerState.addLegacyDialogTitle(f.instance,'first');containerState.addLegacyDialogTitle(f.instance,'second');
      containerState.removeLegacyDialogTitle(f.instance,'missing');containerState.removeLegacyDialogTitle(f.instance,'first');
      assert.deepEqual(f.instance._ariaLabelledByQueue, ['provided', 'second']);assert.equal(marks, 3);}
    finally {f.destroy();}
  });
  await check('historical-title-queue-mock-needs-no-current-container-methods',async()=>{
    const container={_ariaLabelledByQueue:['supplied']};
    containerState.addLegacyDialogTitle(container,'first');containerState.addLegacyDialogTitle(container,'second');
    containerState.removeLegacyDialogTitle(container,'missing');containerState.removeLegacyDialogTitle(container,'first');
    assert.deepEqual(container._ariaLabelledByQueue,['supplied','second']);
  });
  await check('destroyed-title-owner-never-mutates-or-marks-its-old-queue',async()=>{
    const f=fixture(Base,'dialog',true,{config:{ariaLabelledBy:'supplied'}});let marks=0;
    f.injector.get(core.ChangeDetectorRef).markForCheck=()=>marks++;f.destroy();
    containerState.addLegacyDialogTitle(f.instance,'late');containerState.removeLegacyDialogTitle(f.instance,'supplied');
    assert.deepEqual(f.instance._ariaLabelledByQueue,['supplied']);assert.equal(marks,0);
  });
  for(const kind of ['component', 'template', 'dom']) {
    await check(`public-generic-${kind}-portal-and-result-identity`, async () => {
      const f = fixture(Base, false, true, {manual: true}), o = recordingOutlet();
      f.instance._portalOutlet = o.outlet;
      const p = kind === 'component' ? new ComponentPortal(class Content {})
        : kind === 'template' ? new TemplatePortal({}, {}) : new DomPortal(f.first);
      try {
        const result = f.instance.attach(p);
        assert.equal(o.log[0].kind, kind);assert.equal(o.log[0].portal, p);
        assert.equal(result, kind === 'dom' ? undefined : o[kind]);
        assert.equal(f.instance.hasAttached(), true);assert.equal(o.outlet.hasAttached(), true);
        assert.equal(f.anchorCreations(), 2);assert.equal(f.selections.size, 1);
        await Promise.resolve();assert.equal(f.document.activeElement, f.host);
      } finally {f.destroy();}
      assert.equal(f.selections.size, 0);assert.equal(o.outlet.hasAttached(), true);
      assert.equal(o.log.some(e => e.kind === 'dispose'), false);
    });
  }
  await check('direct-attachment-duplicate-does-not-replace-content', async () => {
    const f = fixture(Base, false), o = recordingOutlet();f.instance._portalOutlet = o.outlet;
    try {f.instance.attachComponentPortal(new ComponentPortal(class First {}));
      assert.throws(() => f.instance.attachTemplatePortal(new TemplatePortal({}, {})), /already attached/);
      assert.equal(o.log.length, 1);await Promise.resolve();assert.equal(f.notifications(), 1);}
    finally {f.destroy();}
  });
  await check('failed-portal-dispatch-does-not-start-focus-or-backdrop', async () => {
    const f = fixture(Base), o = recordingOutlet();f.instance._portalOutlet = o.outlet;
    o.outlet.attachComponentPortal = () => {throw Error('attachment failed');};
    try {assert.throws(() => f.instance.attachComponentPortal(new ComponentPortal(class Failed {})), /attachment failed/);
      await Promise.resolve();assert.equal(f.anchorCreations(), 0);assert.equal(f.notifications(), 0);
      assert.equal(f.backdrop.observers.length, 0);}
    finally {f.destroy();}
  });
  await check('detach-and-dispose-delegate-without-destroying-borrowed-services', async () => {
    const f = fixture(Base, false), o = recordingOutlet();f.instance._portalOutlet = o.outlet;
    try {f.instance.attach(new ComponentPortal(class First {}));await Promise.resolve();
      f.instance.detach();assert.equal(o.outlet.hasAttached(), false);assert.equal(f.instance.hasAttached(), false);
      f.instance.attach(new TemplatePortal({}, {}));await Promise.resolve();
      assert.equal(f.anchorCreations(), 2);assert.equal(f.backdrop.observers.length, 1);
      f.instance.dispose();assert.equal(o.log.filter(e => e.kind === 'dispose').length, 1);
      assert.equal(f.instance.hasAttached(), false);
      assert.throws(() => f.instance.attachComponentPortal(new ComponentPortal(class Later {})), /disposed/);
    } finally {f.destroy();}
  });
  await check('attachment-after-destruction-is-rejected', async () => {
    const f = fixture(Base), o = recordingOutlet();f.instance._portalOutlet = o.outlet;f.destroy();
    assert.throws(() => f.instance.attachComponentPortal(new ComponentPortal(class Later {})), /destroyed/);
    assert.equal(o.log.length, 0);assert.equal(f.anchorCreations(), 0);
  });
  await check('manual-overlay-backdrop-recaptures-only-when-disabled', async () => {
    const f = fixture(Base, false, true, {manual: true});
    try {f.config.disableClose = true;f.instance._contentAttached();await Promise.resolve();
      f.document.activeElement = f.element('outside', true);f.backdrop.next({});await Promise.resolve();
      assert.equal(f.document.activeElement, f.host);assert.equal(f.notifications(), 2);
      f.config.disableClose = false;f.document.activeElement = f.first;f.backdrop.next({});await Promise.resolve();
      assert.equal(f.document.activeElement, f.first);assert.equal(f.notifications(), 2);
    } finally {f.destroy();}
    assert.equal(f.backdrop.observers.length, 0);
  });
  await check('real-public-dialogref-backdrop-recaptures-exactly-once', async () => {
    const f = fixture(Base, false, true, {dialogOwner: true});
    try {f.config.disableClose = true;f.instance._contentAttached();await Promise.resolve();
      assert.equal(f.backdrop.observers.length, 1);f.document.activeElement = f.element('outside', true);
      f.backdrop.next({});await Promise.resolve();assert.equal(f.notifications(), 2);
      assert.equal(f.document.activeElement, f.host);
    } finally {f.destroy();}
    // The public DialogRef owns its subscription; the container does not remove it.
    assert.equal(f.backdrop.observers.length, 1);
  });
  await check('different-public-dialogref-does-not-steal-supplied-overlay', async () => {
    const f = fixture(Base, false, true, {dialogOwner: true});
    try {f.owner.overlayRef = {};f.config.disableClose = true;f.instance._contentAttached();
      assert.equal(f.backdrop.observers.length, 2);await Promise.resolve();}
    finally {f.destroy();}
    assert.equal(f.backdrop.observers.length, 1);
  });
  await check('previous-focus-and-close-origin-restored-through-supplied-monitor', async () => {
    const f = fixture(Base, false, true, {manual: true});const previous = f.element('previous', true);
    f.document.activeElement = previous;f.config.restoreFocus = true;f.instance._closeInteractionType = 'keyboard';
    f.instance._contentAttached();await Promise.resolve();assert.equal(f.document.activeElement, f.host);
    f.destroy();assert.equal(f.document.activeElement, previous);
    assert.equal(f.log.find(e => e.kind === 'monitor').origin, 'keyboard');
    assert.equal(f.instance._closeInteractionType, null);assert.equal(f.selections.size, 0);
  });
  await check('omitted-eighth-monitor-uses-target-focus-without-di', async () => {
    const f = fixture(Base, false, true, {manual: true, noMonitor: true});const target = f.element('target', true);
    f.config.restoreFocus = target;f.document.activeElement = f.document.body;
    f.destroy();assert.equal(f.document.activeElement, target);assert.equal(f.log.some(e => e.kind === 'monitor'), false);
  });
  await check('selector-target-uses-exact-supplied-document', async () => {
    const f = fixture(Base, false, true, {ambientMismatch: true}), target = f.element('selected', true);
    f.config.restoreFocus = '.restore';f.document.querySelector = selector => {
      assert.equal(selector, '.restore');return target;};f.document.activeElement = f.document.body;
    f.destroy();assert.equal(f.document.activeElement, target);
  });
  await check('disabled-restoration-preserves-current-focus', async () => {
    const f = fixture(Base, false, true, {manual: true}), previous = f.element('previous', true);
    f.document.activeElement = previous;f.instance._contentAttached();await Promise.resolve();
    f.destroy();assert.equal(f.document.activeElement, f.host);assert.equal(f.log.some(e => e.kind === 'monitor'), false);
  });
  await check('outside-consumer-focus-is-never-overridden', async () => {
    const f = fixture(Base, false), target = f.element('target', true), outside = f.element('outside', true);
    f.config.restoreFocus = target;f.document.activeElement = outside;f.destroy();
    assert.equal(f.document.activeElement, outside);assert.equal(f.log.length, 0);
  });
  await check('open-shadow-contained-focus-allows-restoration', async () => {
    const f = fixture(Base, false), target = f.element('target', true), shadow = f.element('shadow', true);
    f.config.restoreFocus = target;shadow.shadowRoot = {activeElement: f.second};f.document.activeElement = shadow;
    f.destroy();assert.equal(f.document.activeElement, target);
  });
  await check('restoration-failure-still-destroys-persistent-trap-and-subscription', async () => {
    const f = fixture(Base, 'first-heading', true, {manual: true});
    f.instance._contentAttached();await Promise.resolve();assert.equal(f.selections.size, 1);
    f.config.restoreFocus = '.bad';f.document.querySelector = () => {throw Error('selector failed');};
    assert.throws(() => f.destroy(), /selector failed/);assert.equal(f.selections.size, 0);
    assert.equal(f.listeners.size, 0);assert.equal(f.backdrop.observers.length, 0);assert.equal(f.completed(), 1);
  });
  await check('persistent-trap-failure-still-releases-selector-state-and-notifications', async () => {
    const f = fixture(Base, 'first-heading', true, {manual: true});
    const create = f.factory.create.bind(f.factory);
    f.factory.create = (...args) => {const trap = create(...args), destroy = trap.destroy.bind(trap);
      trap.destroy = () => {destroy();throw Error('trap cleanup failed');};return trap;};
    f.instance._contentAttached();await Promise.resolve();assert.equal(f.listeners.size, 4);
    assert.throws(() => f.destroy(), /trap cleanup failed/);
    assert.equal(f.listeners.size, 0);assert.equal(f.backdrop.observers.length, 0);assert.equal(f.completed(), 1);
  });
  await check('ssr-restoration-selector-does-not-query-document', async () => {
    const f = fixture(Base, 'first-tabbable', false);
    f.config.restoreFocus = '.server';f.document.querySelector = () => {throw Error('SSR restore query');};
    f.destroy();assert.equal(f.completed(), 1);assert.equal(f.log.length, 0);
  });
  await check('ssr-content-does-not-create-persistent-trap', async () => {
    const f = fixture(Base, 'first-tabbable', false);f.host.querySelector = () => {throw Error('SSR DOM query');};
    try {f.instance._contentAttached();await Promise.resolve();assert.equal(f.anchorCreations(), 0);
      assert.equal(f.selections.size, 0);assert.equal(f.document.activeElement, null);}
    finally {f.destroy();}
  });
  await check('manual-server-without-global-document-never-touches-dom', async () => {
    const f = fixture(Base, 'first-tabbable', false, {manual: true, noDocument: true});
    delete globalThis.document;f.host.querySelector = () => {throw Error('manual SSR DOM query');};
    try {f.instance._contentAttached();await Promise.resolve();assert.equal(f.anchorCreations(), 0);
      assert.equal(f.selections.size, 0);assert.equal(f.document.activeElement, null);}
    finally {f.destroy();}
  });
  return cases;
}
const cases = await observations(await load());
assert.ok(cases.every(c => c.result === 'pass'), JSON.stringify(cases.filter(c => c.result !== 'pass')));
const mutations = [];
for(const [id, from, to, rejectedBy] of [
  ['constructor-config-identity-lost', 'this._document = _document;', 'this._document = _document;this._config = {...this._config};', 'supplied-arguments-override-different-ambient-di-values'],
  ['outside-focus-guard-removed', '!active || active === this._document?.body || active === element || element.contains(active)', 'true', 'outside-consumer-focus-is-never-overridden'],
  ['persistent-trap-cleanup-removed', 'this._legacyFocusTrap?.destroy();', '/* leaked persistent trap */', 'restoration-failure-still-destroys-persistent-trap-and-subscription'],
  ['backdrop-cleanup-removed', 'this._legacyBackdropSubscription?.unsubscribe();', '/* leaked backdrop */', 'manual-overlay-backdrop-recaptures-only-when-disabled'],
  ['duplicate-owner-check-removed', 'owner instanceof DialogRef', 'false && owner instanceof DialogRef', 'real-public-dialogref-backdrop-recaptures-exactly-once'],
  ['overlay-identity-check-removed', 'owner.overlayRef === this._legacyOverlayRef && ', '', 'different-public-dialogref-does-not-steal-supplied-overlay'],
  ['portal-content-initialization-removed', 'this._contentAttached();', '/* skipped focus setup */', 'public-generic-component-portal-and-result-identity'],
]) {
  assert.ok(raw.includes(from), id);const changed = raw.replaceAll(from, to);
  const actual = await observations(await load(changed));
  assert.equal(actual.find(c => c.id === rejectedBy).result, 'fail', id);
  mutations.push({id, rejected_by: rejectedBy});
}
const alias = '{provide: MatDialogConfig, useValue: config},';
assert.ok(serviceRaw.includes(alias));
const aliasMutation = await observations(await load(), serviceRaw.replace(alias, '/* omitted public config alias */'));
const aliasCase = 'actual-owned-service-scopes-public-and-legacy-config-to-same-object';
assert.equal(aliasMutation.find(c => c.id === aliasCase).result, 'fail');
mutations.push({id: 'public-config-alias-removed', rejected_by: aliasCase});
const sources = [basePath, 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-initial-focus.ts',
  'projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts', 'tests/dialog_container_public_runtime_probe.mjs'];
const report = {schema_version: 1, role: 'Owned constructor/public primitive source diagnostic; not native/AOT/packed/minimum qualification',
  node: process.version, compiler: ts.version, runtime_peer: {framework: core.VERSION.full,
    cdk_package: JSON.parse(readFileSync(require.resolve('@angular/cdk/package.json'))).version},
  sources: sources.map(path => {const bytes = readFileSync(resolve(root, path));return {path, sha256: sha(bytes), bytes: bytes.length};}),
  cases, mutations, limits: ['Actual owned container, focus helper and service code execute with real public BasePortalOutlet, portal classes, FocusTrap and DialogRef.',
    'Portal rendering and borrowed services use finite recording fixtures and synthetic DOM; actual CdkPortalOutlet/native view, public root service construction and browser keyboard behavior are not executed.',
    'Source protocol proof on installed22.1.7 does not qualify actual21 minimum, canonical Node/pnpm, AOT, packed artifacts or consumer floors.',
    'Original inherited API comparison, public class/provider identity, complete motion lifecycle and native regression qualification remain open.']};
const args = process.argv.slice(2);
if(args.length) {assert.equal(args.length, 2);assert.equal(args[0], '--report');assert.equal(existsSync(args[1]), false);
  writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({cases: cases.length, mutants_rejected: mutations.length, node: report.node,
  compiler: report.compiler, runtime_peer: report.runtime_peer}));
