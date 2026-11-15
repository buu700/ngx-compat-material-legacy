/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Runs inside an authenticated, isolated public namespace. Geometry/services are protocols. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line, mode, production] = process.argv.slice(2);
if (production === 'true') globalThis.ngDevMode = false;
if (mode === 'zoneful') await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), a11y = await import('@angular/cdk/a11y');
const rx = await import('rxjs'), ops = await import('rxjs/operators');
const material = await import('@angular/material/core'), layout = await import('@angular/cdk/layout');
const payload = JSON.parse(readFileSync(new URL('./tab-header-render-payload.json', import.meta.url)));
const materialToken=material.MATERIAL_ANIMATIONS || new core.InjectionToken('original-model-no-material-motion-token');
const motion={};
new Function('exports','MediaMatcher','InjectionToken','assertInInjectionContext','inject','MATERIAL_ANIMATIONS',payload.motion)
  (motion,layout.MediaMatcher,core.InjectionToken,core.assertInInjectionContext,core.inject,materialToken);
assert.notEqual(motion.LEGACY_ANIMATION_MODE,materialToken);
assert.notEqual(motion.LEGACY_ANIMATION_MODE,core.ANIMATION_MODULE_TYPE);

// No ResizeObserver callbacks or incidental viewport/direction emissions can mask the initial wait.
globalThis.ResizeObserver = undefined;
let app, zone, manual;
if (line === 'original') {
  zone = new core.NgZone({enableLongStackTrace: false});
  manual = core.Injector.create({providers: []});
} else {
  const common = await import('@angular/common'), browser = await import('@angular/platform-browser');
  app = await browser.createApplication({providers: [
    core[mode === 'zoneful' ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'](),
    {provide: common.IMAGE_CONFIG, useValue: {disableImageSizeWarning: true, disableImageLazyLoadWarning: true}},
    {provide: core.DOCUMENT, useValue: {head: {children: []}}},
    {provide: core.RendererFactory2, useValue: {createRenderer: () => ({})}},
  ]});
  zone = app.injector.get(core.NgZone);
  if (mode === 'zoneless') assert.equal(typeof globalThis.Zone, 'undefined');
}
let renders = 0, registrations = 0;
function helper(js) {
  const exports = {};
  new Function('exports', 'afterNextRender', 'ApplicationRef', 'assertInInjectionContext', 'inject', 'Injector', 'Observable', 'take', js)
    (exports, (callback, options) => {registrations++; return core.afterNextRender(() => {renders++; callback();}, options);},
      core.ApplicationRef, core.assertInInjectionContext, core.inject, core.Injector, rx.Observable, ops.take);
  return exports;
}
function replay(js, helperJs) {
  const exports = {}, hooks = helper(helperJs);
  const names = ['Subject','EMPTY','Observable','merge','observableOf','timer','fromEvent',
    'debounceTime','take','switchMap','startWith','skip','takeUntil','filter',
    'EventEmitter','FocusKeyManager','ownedHeaderResize','afterTabHeaderRender','tabHeaderRenderInjector',
    'passiveEventListenerOptions','HEADER_SCROLL_DELAY','HEADER_SCROLL_INTERVAL','coerceBooleanProperty','coerceNumberProperty','resolveLegacyAnimationMode'];
  const values = [rx.Subject,rx.EMPTY,rx.Observable,rx.merge,rx.of,rx.timer,rx.fromEvent,
    ops.debounceTime,ops.take,ops.switchMap,ops.startWith,ops.skip,ops.takeUntil,ops.filter,
    core.EventEmitter,a11y.FocusKeyManager,() => rx.EMPTY,hooks.afterTabHeaderRender,hooks.tabHeaderRenderInjector,
    {passive:true},650,100,value => value != null && String(value) !== 'false',value => Number(value),motion.resolveLegacyAnimationMode];
  new Function('exports', ...names, js)(exports, ...values);
  return exports.Replay;
}
function fixture(js, helperJs = payload.helper, context = true, animationMode = undefined, injectionScope = app?.injector) {
  const Type = replay(js, helperJs), ink = [], marks = [], writes = [];
  assert.equal(Type.length, 7, 'historical-constructor-arity');
  function node(name, width = 90) {
    const result = new EventTarget();
    Object.assign(result, {name,offsetWidth:width,scrollWidth:600,offsetLeft:0,scrollLeft:0,textContent:name});
    result.style = new Proxy({}, {set(target,key,value) {writes.push([name,key,value]); target[key]=value; return true;}});
    return result;
  }
  const create = () => new Type(new core.ElementRef(node('host',220)), {markForCheck() {marks.push('mark');}},
    {change(delay) {assert.equal(delay,150); return rx.EMPTY;}}, {value:'ltr',change:rx.EMPTY}, zone,
    {isBrowser:true,TRIDENT:false,EDGE:false}, animationMode);
  const instance = context && app ? core.runInInjectionContext(injectionScope,create) : create();
  instance._items = new core.QueryList();
  instance._items.reset([0,1,2].map(index => ({disabled:false,elementRef:new core.ElementRef(node('item'+index)),focus(){}})));
  instance._inkBar = {alignToElement(element){ink.push(element.name);},hide(){ink.push('hide');}};
  for (const name of ['_tabListContainer','_tabList','_tabListInner','_nextPaginator','_previousPaginator'])
    instance[name] = new core.ElementRef(node(name,name === '_tabListContainer' ? 220 : 600));
  return {instance,ink,marks,writes};
}
const drain = () => new Promise(resolve => setTimeout(resolve,0));
const render = () => app?.tick();
async function align(js, helperJs = payload.helper, context = true, expected = true) {
  const f = fixture(js,helperJs,context);
  try {
    zone.run(() => {
      f.instance.ngAfterContentInit();
      assert.equal(f.ink.length,0,'initial-alignment-is-deferred');
      if (mode === 'zoneful') {render(); assert.equal(f.ink.length,0,'zoneful-render-cannot-preempt-stability');}
    });
    render(); await drain();
    assert.deepEqual(f.ink,expected ? ['item0'] : [],'initial-render-aligns-selected-label');
    if (expected) {
      assert.equal(f.instance._showPaginationControls,true,'initial-pagination-enabled');
      assert.equal(f.instance._disableScrollBefore,true);
      assert.equal(f.instance._disableScrollAfter,false);
    }
    const before = f.ink.length;
    zone.run(() => {}); render(); await drain();
    assert.equal(f.ink.length,before,'initial-alignment-is-once-only');
    return {ink:[...f.ink],pagination:f.instance._showPaginationControls,
      beforeDisabled:f.instance._disableScrollBefore,afterDisabled:f.instance._disableScrollAfter,writes:[...f.writes]};
  } finally {f.instance.ngOnDestroy();}
}
async function cancel(js, helperJs = payload.helper) {
  const f = fixture(js,helperJs), before = renders;
  zone.run(() => {f.instance.ngAfterContentInit();f.instance.ngOnDestroy();});
  render(); await drain();
  assert.equal(f.ink.length,0,'destroyed-header-cannot-align');
  assert.equal(renders,before,'destroy-cancels-render-hook');
  return {ink:f.ink.length,renderHookCanceled:true};
}
// Compare the whole source methods against the untouched 16 header at the
// small-overflow boundary. Geometry is a protocol, not a native browser layout.
async function paginationBoundary(js, expected) {
  const f = fixture(js);
  try {
    const result = [];
    for (const width of [220, 221, 224, 225, 224]) {
      f.instance._tabListInner.nativeElement.scrollWidth = width;
      f.instance._checkPaginationEnabled();
      result.push(f.instance._showPaginationControls);
    }
    assert.deepEqual(result, expected, 'tagged-small-overflow-pagination');
    return result;
  } finally {f.instance.ngOnDestroy();}
}
async function errorCleanup(helperJs) {
  let active = 0;
  const emitter = zone.onStable, subscribe = emitter.subscribe;
  emitter.subscribe = function(...args) {const sub = subscribe.apply(this,args); active++;sub.add(() => active--);return sub;};
  const failing = core.Injector.create({providers:[{provide:core.ApplicationRef,useFactory:() => {throw new Error('expected-lookup-failure');}}]});
  try {
    let error;
    helper(helperJs).afterTabHeaderRender(zone,failing).subscribe({error:value => error=value});
    assert.equal(error?.message,'expected-lookup-failure');
    assert.equal(active,0,'lookup-error-cleans-zone-subscription');
  } finally {emitter.subscribe=subscribe;failing.destroy();}
}
async function modePolicy(js) {
  const manualNoop=fixture(js,payload.helper,false,'NoopAnimations'),manualBrowser=fixture(js,payload.helper,false,'BrowserAnimations');
  try {
    assert.equal(manualNoop.instance._animationMode,'NoopAnimations','manual-noop-mode');
    assert.equal(manualBrowser.instance._animationMode,'BrowserAnimations','manual-browser-mode');
  } finally {manualNoop.instance.ngOnDestroy();manualBrowser.instance.ngOnDestroy();}
  if(!app)return {manualNoop:true,manualBrowser:true,ambientQualified:false};
  const matcher={matchMedia:()=>({matches:false})};
  for(const [kind,providers] of [
    ['owned',[{provide:motion.LEGACY_ANIMATION_MODE,useValue:'NoopAnimations'}]],
    ['material',[{provide:materialToken,useValue:{animationsDisabled:true}}]],
    ['reduced',[{provide:layout.MediaMatcher,useValue:{matchMedia:()=>({matches:true})}}]],
  ]) {
    const scope=core.Injector.create({parent:app.injector,providers:[{provide:layout.MediaMatcher,useValue:matcher},...providers]});
    const current=fixture(js,payload.helper,true,'BrowserAnimations',scope);
    try {assert.equal(current.instance._animationMode,'NoopAnimations','ambient-mode-'+kind);}
    finally {current.instance.ngOnDestroy();scope.destroy();}
  }
  return {manualNoop:true,manualBrowser:true,ambientQualified:true,owned:true,material:true,reduced:true};
}
try {
  const modes=await modePolicy(payload.candidate);
  const boundaryReference = await paginationBoundary(payload.original, [false, true, true, true, true]);
  const boundaryCandidate = await paginationBoundary(payload.candidate, boundaryReference);
  const old = await align(payload.original,payload.helper,true,mode === 'zoneful');
  const candidate = await align(payload.candidate);
  if (mode === 'zoneful') assert.deepEqual(candidate,old);
  const manualResult = await align(payload.candidate,payload.helper,false,mode === 'zoneful');
  const canceled = await cancel(payload.candidate);
  await errorCleanup(payload.helper);
  const mutations = [];
  const reject = async (id,operation,message) => {
    await assert.rejects(operation,error => error.code === 'ERR_ASSERTION' && error.message.startsWith(message));
    mutations.push({id,rejected:true});
  };
  await reject('five-pixel-threshold', () => paginationBoundary(payload.mutations.fivePixelThreshold, boundaryReference), 'tagged-small-overflow-pagination');
  if (line !== 'original') {
    await reject('missing-owned-mode-resolution',() => modePolicy(payload.mutations.missingModeResolution),'ambient-mode-');
    if (mode === 'zoneless') {
      await reject('prior-zone-only-wait',() => align(payload.mutations.priorWait),'initial-render-aligns-selected-label');
      await reject('missing-injection-context-capture',() => align(payload.mutations.noCapture),'initial-render-aligns-selected-label');
      await reject('destroy-without-cancel',() => cancel(payload.mutations.noDestroy),'destroy-cancels-render-hook');
      await reject('retained-render-handle',() => cancel(payload.candidate,payload.mutations.leakedRender),'destroy-cancels-render-hook');
    } else {
      await reject('removed-stability-guard',() => align(payload.candidate,payload.mutations.premature),'zoneful-render-cannot-preempt-stability');
      await reject('removed-once-only-completion',() => align(payload.candidate,payload.mutations.noOnce),'initial-alignment-is-once-only');
    }
    await reject('lookup-error-leaks-subscription',() => errorCleanup(payload.mutations.noErrorCleanup),'lookup-error-cleans-zone-subscription');
  }
  console.log(JSON.stringify({old,candidate,boundaryReference,boundaryCandidate,manualResult,canceled,mutations,registrations,renders,
    genuine_public_key_manager:true,genuine_public_zone:true,genuine_public_application:!!app,
    whole_constructor_executed:true,angular_decorators_or_node_DI_executed:false,native_executed:false}));
} finally {app?.destroy();manual?.destroy();core.destroyPlatform();}
