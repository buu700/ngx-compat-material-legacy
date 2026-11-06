/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned focus code and public FocusTrap; synthetic DOM, not native qualification. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url), ts = require('typescript');
const url = name => pathToFileURL(require.resolve(name)).href;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
await import(url('@angular/compiler'));
const core = await import(url('@angular/core'));
const {FocusTrap, FocusTrapFactory, InteractivityChecker, FocusMonitor} = await import(url('@angular/cdk/a11y'));
const {Platform} = await import(url('@angular/cdk/platform'));
const {DialogRef} = await import(url('@angular/cdk/dialog'));
const {MatDialogConfig} = await import(url('@angular/material/dialog'));
const {Subject} = await import(url('rxjs'));
const portal = await import(url('@angular/cdk/portal'));
const folder = 'projects/ngx-material-legacy/legacy-dialog/internal/';
const basePath = folder + 'dialog-container-base.ts', focusPath = folder + 'dialog-initial-focus.ts';
const originalBase = readFileSync(resolve(root, basePath), 'utf8');
const originalFocus = readFileSync(resolve(root, focusPath), 'utf8');

export async function load(baseSource = originalBase, focusSource = originalFocus, moduleUrlOnly = false, stateOnly = false) {
  function emit(raw) {
    let js = ts.transpileModule(raw, {compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true,
    }}).outputText;
    js = js.replace(/(['"])(@angular\/[^'"]+|rxjs(?:\/operators)?)\1/g, (_, quote, name) => JSON.stringify(url(name)));
    return js;
  }
  const focusUrl = 'data:text/javascript;base64,' + Buffer.from(emit(focusSource)).toString('base64');
  const stateUrl = 'data:text/javascript;base64,' + Buffer.from(emit(readFileSync(resolve(root,folder+'dialog-container-state.ts'),'utf8'))).toString('base64');
  if (stateOnly) return import(stateUrl);
  const base = emit(baseSource).replaceAll("'./dialog-initial-focus'", JSON.stringify(focusUrl)).replaceAll("'./dialog-container-state'", JSON.stringify(stateUrl));
  const baseUrl = 'data:text/javascript;base64,' + Buffer.from(base).toString('base64');
  if (moduleUrlOnly) return baseUrl;
  const loaded = await import(baseUrl);
  return loaded._MatDialogContainerBase;
}

export function fixture(Base, autoFocus = 'first-tabbable', isBrowser = true, mode = {}) {
  const log = [], listeners = new Map(), selections = new Set();
  let anchorCreations = 0;
  const document = {ELEMENT_NODE: 1, activeElement: null, body: {},
    createElement(name) { anchorCreations++; return element(`anchor-${anchorCreations}`); },
    querySelector() { return null; }};
  const hadDocument = Object.hasOwn(globalThis, 'document'), priorDocument = globalThis.document;
  globalThis.document = document;
  function element(name, focusable = false, tabbable = focusable) {
    const node = {name, nodeType: 1, children: [], focusable, tabbable, attributes: new Map(),
      focus(options) { log.push({kind: 'focus', name, options}); document.activeElement = node; },
      contains(other) { return node.children.some(child => child === other || child.contains(other)); },
      querySelector(selector) {
        const visit = n => n.children.find(child =>
          (selector.includes('cdkFocusInitial') ? child.initial : selector === child.selector)
          || visit(child));
        return visit(node) || null;
      },
      querySelectorAll() { return []; },
      hasAttribute(name) { return node.attributes.has(name) || name === 'cdkFocusInitial' && !!node.initial; },
      setAttribute(name, value) { node.attributes.set(name, value); },
      classList: {add() {}},
      addEventListener(event, callback) {listeners.set(node.name + ':' + event, callback);},
      removeEventListener(event) {listeners.delete(node.name + ':' + event);}, remove() {},
      removeAttribute(name) { node.attributes.delete(name); if (name === 'tabindex') delete node.tabIndex; },
    };
    return node;
  }
  const host = element('dialog'), first = element('first', true), second = element('second', true);
  const heading = element('heading'); heading.selector = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
  host.children = [first, second, heading];
  const checker = {isFocusable: node => node.focusable, isTabbable: node => node.tabbable};
  const stable = new Subject();
  const zone = {isStable: mode.unstableZone !== true, onStable: stable, runOutsideAngular: callback => callback()};
  const config = Object.assign(mode.configFactory ? mode.configFactory() : {},
    {autoFocus, restoreFocus: false, ...mode.config});
  const backdrop = new Subject();
  const overlay = {backdropClick: () => backdrop, keydownEvents: () => new Subject(),
    outsidePointerEvents: () => new Subject(), detachments: () => new Subject(),
    dispose() {throw Error('borrowed overlay must not be disposed');}};
  const monitor = {focusVia(target, origin) {log.push({kind: 'monitor', target, origin}); target.focus();}};
  const factory = {create(node, deferred) {
    log.push({kind: 'create-selection', deferred});
    const trap = new FocusTrap(node, checker, zone, document, deferred, core.Injector.NULL);
    selections.add(trap); const destroy = trap.destroy.bind(trap);
    trap.destroy = () => { destroy(); selections.delete(trap); log.push({kind: 'destroy-selection'}); };
    return trap;
  }};
  const renderer = {listen(target, event, callback) {
    const key = target.name + ':' + event; assert.equal(listeners.has(key), false);
    listeners.set(key, callback); return () => listeners.delete(key);
  }};
  const owner = mode.dialogOwner ? new DialogRef(overlay, {...config, disableClose: true}) : null;
  const injector = core.Injector.create({providers: [
    {provide: core.ElementRef, useValue: new core.ElementRef(host)},
    {provide: core.DOCUMENT, useValue: document},
    {provide: FocusTrapFactory, useValue: factory},
    {provide: MatDialogConfig, useValue: config},
    {provide: InteractivityChecker, useValue: checker},
    {provide: core.NgZone, useValue: zone},
    {provide: FocusMonitor, useValue: monitor},
    {provide: core.Renderer2, useValue: renderer},
    {provide: core.ChangeDetectorRef, useValue: {markForCheck() {}}},
    {provide: Platform, useValue: {isBrowser}},
    {provide: DialogRef, useValue: owner},
    ...(mode.ambientMismatch ? [
      {provide: core.ElementRef, useValue: new core.ElementRef({focus() {throw Error('ambient element used');}})},
      {provide: FocusTrapFactory, useValue: {create() {throw Error('ambient factory used');}}},
      {provide: MatDialogConfig, useValue: {autoFocus: 'wrong-selector'}},
      {provide: InteractivityChecker, useValue: {isFocusable() {throw Error('ambient checker used');}}},
      {provide: core.NgZone, useValue: {runOutsideAngular() {throw Error('ambient zone used');}}},
      {provide: FocusMonitor, useValue: {focusVia() {throw Error('ambient monitor used');}}},
    ] : []),
    ...(mode.providers || []),
  ]});
  const baseArgs = [new core.ElementRef(host), factory, mode.noDocument ? null : document,
    config, checker, zone, overlay, ...(mode.noMonitor ? [] : [monitor])];
  const args = mode.mapArguments ? mode.mapArguments(baseArgs, injector) : baseArgs;
  let instance;
  try {
    instance = mode.manual ? new Base(...args)
      : core.runInInjectionContext(injector, () => new Base(...args));
  } catch (error) {
    injector.destroy();
    if (hadDocument) globalThis.document = priorDocument; else delete globalThis.document;
    throw error;
  }
  if (owner) owner.containerInstance = instance;
  let notifications = 0, completed = 0;
  instance._focusTrapped.subscribe({next() { notifications++; log.push({kind: 'notification'}); },
    complete() { completed++; }});
  return {instance, document, host, first, second, heading, log, listeners, selections,
    element, args, factory, config, overlay, backdrop, monitor, injector, owner, zone, stable, notifications: () => notifications, completed: () => completed,
    anchorCreations: () => anchorCreations,
    destroy() { try { instance.ngOnDestroy(); } finally { injector.destroy();
      if (hadDocument) globalThis.document = priorDocument; else delete globalThis.document; } }};
}

async function observations(Base) {
  const cases = [];
  async function check(id, body) {
    try { await body(); cases.push({id, result: 'pass'}); }
    catch (error) { cases.push({id, result: 'fail', error: error.message.slice(0, 400)}); }
  }
  await check('stable-zone-focus-and-notification-order', async () => {
    const f = fixture(Base);
    try {
      f.instance._trapFocus(); assert.equal(f.document.activeElement, f.first);
      await Promise.resolve(); assert.equal(f.document.activeElement, f.first);
      assert.equal(f.log.find(e => e.kind === 'focus').options, undefined);
      assert.equal(f.log.at(-1).kind, 'notification'); assert.equal(f.notifications(), 1);
      assert.equal(f.selections.size, 0); assert.equal(f.anchorCreations(), 0);
      assert.equal(f.log.find(e => e.kind === 'create-selection').deferred, true);
    } finally { f.destroy(); }
  });
  await check('unstable-zone-waits-on-the-supplied-public-stability-event-once',async()=>{
    const f=fixture(Base,'first-tabbable',true,{unstableZone:true});
    try{f.instance._trapFocus();await Promise.resolve();assert.equal(f.log.length,0);
      assert.equal(f.stable.observers.length,1);f.zone.isStable=true;f.stable.next();
      assert.equal(f.document.activeElement,f.first);assert.equal(f.notifications(),1);
      assert.equal(f.stable.observers.length,0);f.stable.next();assert.equal(f.notifications(),1);
    }finally{f.destroy();}
  });
  await check('destroy-unsubscribes-from-the-borrowed-unstable-zone',async()=>{
    const f=fixture(Base,'first-tabbable',true,{unstableZone:true});
    f.instance._trapFocus();assert.equal(f.stable.observers.length,1);f.destroy();
    assert.equal(f.stable.observers.length,0);assert.equal(f.stable.isStopped,false);
    f.stable.next();await Promise.resolve();assert.equal(f.log.length,0);
  });
  for(const mode of [false,'dialog','first-heading','button']){
    await check('direct-and-selector-focus-is-synchronous:'+String(mode),async()=>{
      const f=fixture(Base,mode,true,{unstableZone:true});if(mode==='button')f.second.selector='button';
      try{f.instance._trapFocus();assert.equal(f.document.activeElement,
        mode==='first-heading'?f.heading:mode==='button'?f.second:f.host);
        assert.equal(f.notifications(),1);assert.equal(f.stable.observers.length,0);
      }finally{f.destroy();}
    });
  }
  await check('only-the-failed-initial-selection-fallback-is-deferred',async()=>{
    const f=fixture(Base);f.host.children=[];
    try{f.instance._trapFocus();assert.equal(f.document.activeElement,null);assert.equal(f.notifications(),0);
      await Promise.resolve();assert.equal(f.document.activeElement,f.host);assert.equal(f.notifications(),1);
    }finally{f.destroy();}
  });
  await check('destroy-cancels-the-deferred-empty-selection-fallback',async()=>{
    const f=fixture(Base);f.host.children=[];f.instance._trapFocus();f.destroy();await Promise.resolve();
    assert.equal(f.document.activeElement,null);assert.equal(f.notifications(),0);
  });
  await check('synchronous-focus-observer-destruction-cleans-new-selector-listeners',async()=>{
    const f=fixture(Base,'first-heading');const focus=f.heading.focus.bind(f.heading);
    f.heading.focus=()=>{focus();f.destroy();};
    f.instance._trapFocus();assert.equal(f.listeners.size,0);assert.equal(f.heading.tabIndex,undefined);
    assert.equal(f.notifications(),0);assert.equal(f.completed(),1);
  });
  await check('explicit-initial-marker-prioritized', async () => {
    const f = fixture(Base, true); f.second.initial = true;
    try { f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.document.activeElement, f.second); }
    finally { f.destroy(); }
  });
  await check('empty-tabbable-content-falls-back-to-container', async () => {
    const f = fixture(Base); f.host.children = [];
    try { f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.document.activeElement, f.host); }
    finally { f.destroy(); }
  });
  await check('dialog-mode-preserves-already-contained-focus', async () => {
    const f = fixture(Base, 'dialog'); f.document.activeElement = f.second;
    try { f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.document.activeElement, f.second);
      assert.equal(f.log.some(e => e.kind === 'focus'), false); assert.equal(f.notifications(), 1); }
    finally { f.destroy(); }
  });
  await check('false-mode-captures-container-from-outside', async () => {
    const f = fixture(Base, false); f.document.activeElement = f.element('outside', true);
    try { f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.document.activeElement, f.host); }
    finally { f.destroy(); }
  });
  await check('open-shadow-active-element-is-contained', async () => {
    const f = fixture(Base, 'dialog'); const outside = f.element('shadow-host');
    outside.shadowRoot = {activeElement: f.second}; f.document.activeElement = outside;
    try { f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.log.some(e => e.kind === 'focus'), false); }
    finally { f.destroy(); }
  });
  await check('empty-shadow-root-preserves-original-active-element-resolution', async () => {
    const f = fixture(Base, 'dialog'); f.host.shadowRoot = {activeElement: null};
    f.document.activeElement = f.host;
    try { f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.log.filter(e => e.kind === 'focus').length, 1); }
    finally { f.destroy(); }
  });
  await check('self-referencing-shadow-active-element-stops', async () => {
    const f = fixture(Base, 'dialog'); f.host.shadowRoot = {activeElement: f.host};
    f.document.activeElement = f.host;
    try { f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.log.some(e => e.kind === 'focus'), false); }
    finally { f.destroy(); }
  });
  await check('heading-temporary-tabindex-restored-on-blur', async () => {
    const f = fixture(Base, 'first-heading');
    try { f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.document.activeElement, f.heading);
      assert.equal(f.heading.tabIndex, -1); assert.equal(f.listeners.size, 2);
      f.listeners.get('heading:blur')(); assert.equal(f.heading.tabIndex, undefined); assert.equal(f.listeners.size, 0); }
    finally { f.destroy(); }
  });
  await check('selector-temporary-tabindex-restored-on-mousedown', async () => {
    const f = fixture(Base, 'custom'); f.heading.selector = 'custom';
    try { f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.document.activeElement, f.heading);
      f.listeners.get('heading:mousedown')(); assert.equal(f.heading.tabIndex, undefined); assert.equal(f.listeners.size, 0); }
    finally { f.destroy(); }
  });
  await check('focusable-selector-keeps-existing-tabindex', async () => {
    const f = fixture(Base, 'button'); f.second.selector = 'button'; f.second.tabIndex = 3;
    try { f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.document.activeElement, f.second);
      assert.equal(f.second.tabIndex, 3); assert.equal(f.listeners.size, 0); }
    finally { f.destroy(); }
  });
  await check('destroy-cleans-selector-listeners-and-temporary-tabindex', async () => {
    const f = fixture(Base, 'first-heading');
    f.instance._trapFocus(); await Promise.resolve();
    assert.equal(f.heading.tabIndex, -1); assert.equal(f.listeners.size, 2);
    f.destroy(); assert.equal(f.heading.tabIndex, undefined); assert.equal(f.listeners.size, 0);
  });
  await check('recapture-cleans-previous-selector-listeners', async () => {
    const f = fixture(Base, 'first-heading');
    try {
      f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.listeners.size, 2);
      f.instance._config.autoFocus = 'first-tabbable';
      f.document.activeElement = f.element('outside', true);
      f.instance._recaptureFocus(); await Promise.resolve();
      assert.equal(f.document.activeElement, f.first); assert.equal(f.heading.tabIndex, undefined);
      assert.equal(f.listeners.size, 0); assert.equal(f.notifications(), 2);
    } finally { f.destroy(); }
  });
  await check('restore-failure-still-cleans-owned-selector-state', async () => {
    const f = fixture(Base, 'first-heading');
    f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.listeners.size, 2);
    f.instance._config.restoreFocus = 'restore-selector';
    f.document.querySelector = () => { throw Error('owned restore failed'); };
    assert.throws(() => f.destroy(), /owned restore failed/);
    assert.equal(f.heading.tabIndex, undefined); assert.equal(f.listeners.size, 0);
    assert.equal(f.completed(), 1);
  });
  await check('manual-outside-injection-focuses-synchronously', async () => {
    const f = fixture(Base, 'first-tabbable', true, {manual: true});
    try { f.instance._captureInitialFocus(); assert.equal(f.document.activeElement, f.first); }
    finally { f.destroy(); }
  });
  await check('non-application-ref-injector-keeps-synchronous-focus', async () => {
    const f = fixture(Base, 'first-tabbable', true, {providers: [{provide: core.ApplicationRef, useValue: {}}]});
    try { f.instance._captureInitialFocus(); assert.equal(f.document.activeElement, f.first); }
    finally { f.destroy(); }
  });
  await check('missing-selector-does-not-invent-focus', async () => {
    const f = fixture(Base, 'missing');
    try { f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.document.activeElement, null);
      assert.equal(f.notifications(), 1); assert.equal(f.selections.size, 0); }
    finally { f.destroy(); }
  });
  await check('destroy-before-zone-stability-cancels-focus-and-completes', async () => {
    const f = fixture(Base, 'first-tabbable', true, {unstableZone:true}); f.instance._trapFocus(); f.destroy(); f.stable.next(); await Promise.resolve();
    assert.equal(f.document.activeElement, null); assert.equal(f.log.length, 0);
    assert.equal(f.notifications(), 0); assert.equal(f.completed(), 1);
  });
  await check('focus-request-after-destroy-is-inert', async () => {
    const f = fixture(Base); f.destroy(); f.instance._trapFocus(); await Promise.resolve();
    assert.equal(f.log.length, 0); assert.equal(f.notifications(), 0); assert.equal(f.completed(), 1);
  });
  await check('ssr-does-not-access-dom-or-create-selection', async () => {
    const f = fixture(Base, 'first-tabbable', false);
    f.host.querySelector = () => { throw Error('SSR selector access'); };
    try { f.instance._trapFocus(); await Promise.resolve(); assert.equal(f.document.activeElement, null);
      assert.equal(f.log.length, 1); assert.equal(f.notifications(), 1); assert.equal(f.anchorCreations(), 0); }
    finally { f.destroy(); }
  });
  await check('delayed-focus-waits-for-owned-open-completion', async () => {
    const f = fixture(Base); f.instance._config.delayFocusTrap = true;
    const animations = [];
    f.instance._animationStateChanged.subscribe(event => animations.push(event));
    try {
      f.instance._captureInitialFocus(); await Promise.resolve();
      assert.equal(f.log.length, 0); assert.equal(f.notifications(), 0);
      f.instance._openAnimationDone(150);
      assert.deepEqual(animations, [{state: 'opened', totalTime: 150}]);
      assert.equal(f.document.activeElement, f.first);
      await Promise.resolve(); assert.equal(f.document.activeElement, f.first);
      assert.equal(f.notifications(), 1); assert.equal(f.anchorCreations(), 0);
    } finally { f.destroy(); }
  });
  return cases;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const Base = await load(), cases = await observations(Base);
assert.ok(cases.every(c => c.result === 'pass'), JSON.stringify(cases.filter(c => c.result !== 'pass')));
const mutations = [];
const mutants = [
  ['destroy-guard-removed', originalBase.replaceAll('if (this._legacyFocusDestroyed)', 'if (false)'), originalFocus,
    'focus-request-after-destroy-is-inert'],
  ['anchors-enabled', originalBase, originalFocus.replace('factory.create(element, true)', 'factory.create(element, false)'),
    'stable-zone-focus-and-notification-order'],
  ['selection-destroy-removed', originalBase, originalFocus.replace('selection.destroy();', '/* leaked selection */'),
    'stable-zone-focus-and-notification-order'],
  ['forced-tabindex-cleanup-removed', originalBase, originalFocus.replace("target.removeAttribute('tabindex');", '/* lost cleanup */'),
    'heading-temporary-tabindex-restored-on-blur'],
  ['zone-subscription-not-released',originalBase.replace('this._legacyFocusStableSubscriptions.unsubscribe();','/* leaked zone subscription */'),originalFocus,
    'destroy-unsubscribes-from-the-borrowed-unstable-zone'],
  ['zone-stability-wait-bypassed',originalBase.replace('&& !this._ngZone.isStable','&& false'),originalFocus,
    'unstable-zone-waits-on-the-supplied-public-stability-event-once'],
  ['cleanup-created-during-focus-destruction-leaked',originalBase.replace('cleanup?.();','/* leaked newly created cleanup */'),originalFocus,
    'synchronous-focus-observer-destruction-cleans-new-selector-listeners'],
];
for (const [id, base, focus, failingCase] of mutants) {
  assert.ok(base !== originalBase || focus !== originalFocus);
  const results = await observations(await load(base, focus));
  assert.equal(results.find(c => c.id === failingCase).result, 'fail', id);
  mutations.push({id, rejected_by: failingCase});
}
const report = {schema_version: 1, role: 'Owned focus/source lifecycle diagnostic; not native/AOT/packed/minimum qualification',
  node: process.version, compiler: ts.version, runtime_peer: {framework: core.VERSION.full,
    cdk_package: JSON.parse(readFileSync(require.resolve('@angular/cdk/package.json'))).version},
  sources: [basePath, focusPath, folder + 'dialog-container-state.ts', 'scripts/dialog-initial-focus-source-test.mjs'].map(path => {const bytes = readFileSync(resolve(root, path));
    return {path, sha256: sha(bytes), bytes: bytes.length};}), cases, mutations,
  limits: ['Actual owned two-module code and current public FocusTrap execute under synthetic DOM and borrowed service fixtures.',
    'Public FocusTrapFactory.create protocol is supplied by a fixture that constructs the real public FocusTrap; actual factory/root service setup is not executed.',
    'Actual21 minimum peer, native focus/keyboard/rendered CSS, strict AOT, canonical toolchain and packed/runtime-floor qualification are not executed.',
    'Full dialog constructor, portal, native focus restoration and API qualification require their separate reviews.']};
const args = process.argv.slice(2);
if (args.length) { assert.equal(args.length, 2); assert.equal(args[0], '--report');
  assert.equal(existsSync(args[1]), false); writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify({cases: cases.length, mutants_rejected: mutations.length,
  node: report.node, compiler: report.compiler, runtime_peer: report.runtime_peer}));

}
