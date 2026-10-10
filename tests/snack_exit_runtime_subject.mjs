/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Isolated genuine public zones, whole source classes and explicit portal/DOM/motion protocols. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line,mode,production] = process.argv.slice(2);
if (production === 'true') globalThis.ngDevMode=false;
if (mode === 'zoneful') await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core'),common=await import('@angular/common');
const rx=await import('rxjs'),ops=await import('rxjs/operators');
const payload=JSON.parse(readFileSync(new URL('./snack-exit-payload.json',import.meta.url)));
let app,zone;
if (line === 'original') zone=new core.NgZone({enableLongStackTrace:false});
else {
  const browser=await import('@angular/platform-browser');
  app=await browser.createApplication({providers:[
    core[mode === 'zoneful' ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'](),
    {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
    {provide:core.DOCUMENT,useValue:{head:{children:[]}}},
    {provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}},
  ]});
  zone=app.injector.get(core.NgZone);
  if (mode === 'zoneless') assert.equal(typeof globalThis.Zone,'undefined');
}
const injector=core.Injector.create({providers:[{provide:common.DOCUMENT,useValue:{querySelectorAll:()=>[]}}]});
let activeWaits=0;const waits=new Set();
const subscribe=zone.onMicrotaskEmpty.subscribe;
zone.onMicrotaskEmpty.subscribe=function(...args){const sub=subscribe.apply(this,args);activeWaits++;waits.add(sub);sub.add(()=>{activeWaits--;waits.delete(sub);});return sub;};
const drain=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(js=payload.candidate,{leaf=false,disabled=false}={}) {
  let now=0,next=1,queued=0;const timers=new Map();
  const setTimer=(callback,delay)=>{const id=next++;timers.set(id,{callback,due:now+delay});return id;};
  const clearTimer=id=>timers.delete(id);
  const exports={};
  new Function('exports','PortalProtocol','inject','DOCUMENT','Subject','take','uniqueId','queueMicrotask','setTimeout','clearTimeout',js)
    (exports,class{},core.inject,common.DOCUMENT,rx.Subject,ops.take,0,callback=>{queued++;queueMicrotask(callback);},setTimer,clearTimer);
  let Type=exports.Replay;
  assert.equal(Type.length,5,'historical-constructor-arity');
  if (leaf) {
    const helper={};new Function('exports',payload.motion)(helper);
    const child={};new Function('exports','OwnedBase','legacyAnimationsDisabled','legacyHostMotionEvent','ENTER_MS','EXIT_MS','setTimeout','clearTimeout','queueMicrotask',payload.leaf)
      (child,Type,()=>disabled,helper.legacyHostMotionEvent,150,75,setTimer,clearTimer,callback=>{queued++;queueMicrotask(callback);});
    Type=child.Replay;
  }
  const attributes=new Map(),classes=new Set(),host=new EventTarget();
  Object.assign(host,{setAttribute:(name,value)=>attributes.set(name,value),querySelector:()=>null,
    classList:{add:name=>classes.add(name)}});
  const instance=core.runInInjectionContext(injector,()=>new Type(zone,new core.ElementRef(host),
    {markForCheck(){},detectChanges(){}},{FIREFOX:false,isBrowser:false},{politeness:'polite'}));
  let disposals=0,exits=0,enters=0,exitCompletions=0,exitCalls=0;
  const nextExit=instance._onExit.next;
  instance._onExit.next=function(...args){exitCalls++;return nextExit.apply(this,args);};
  instance._onExit.subscribe({next:()=>exits++,complete:()=>exitCompletions++});
  instance._onEnter.subscribe(()=>enters++);
  const refExports={};new Function('exports','Subject','MAX_TIMEOUT','setTimeout','clearTimeout',payload.ref)
    (refExports,rx.Subject,2**31-1,setTimer,clearTimer);
  const ref=new refExports.Replay(instance,{dispose(){disposals++;instance.ngOnDestroy();}}),dismissals=[],dismissalZones=[];
  ref.afterDismissed().subscribe(value=>{dismissalZones.push(core.NgZone.isInAngularZone());dismissals.push(value);});
  const event=(name,child=false)=>{const value=new Event('animationend');
    Object.defineProperties(value,{target:{value:child?new EventTarget():host},currentTarget:{value:host},animationName:{value:name}});
    return value;};
  return {instance,ref,host,attributes,timers,dismissals,dismissalZones,event,queued:()=>queued,
    counts:()=>({disposals,exits,enters,exitCompletions,exitCalls}),
    advance(time){now=time;for(const[id,job]of [...timers].sort((a,b)=>a[1].due-b[1].due))if(job.due<=time){timers.delete(id);zone.run(job.callback);}},
    // Explicit fixture cleanup releases historical pending waits; it is not source behavior.
    close(){zone.run(()=>instance.ngOnDestroy());timers.clear();for(const wait of waits)wait.unsubscribe();}};
}
async function baseExit(js=payload.candidate,expected=true) {
  const f=fixture(js);
  try {
    zone.run(()=>{
      f.instance.onAnimationEnd({fromState:'visible',toState:'hidden'});
      f.instance.onAnimationEnd({fromState:'visible',toState:'hidden'});
      assert.equal(f.counts().disposals,0,'completion-is-deferred');
    });
    if(mode==='zoneful')assert.equal(f.counts().disposals,1,'original-zoneful-microtask-empty-timing');
    await drain();
    assert.equal(f.counts().disposals,expected?1:0,'exit-disposes-overlay');
    if(expected){assert.deepEqual(f.dismissals,[{dismissedByAction:false}]);assert.equal(f.counts().exitCompletions,1);}
    const before=f.counts().exitCalls;
    zone.run(()=>{});await drain();
    if(expected&&js!==payload.original)assert.equal(f.counts().exitCalls,before,'completed-wait-is-released');
    if(js===payload.candidate){assert.equal(f.counts().exitCalls,expected?1:0,'exit-completes-once');assert.equal(activeWaits,0,'no-retained-exit-wait');}
    return {dismissals:[...f.dismissals],disposals:f.counts().disposals};
  } finally {f.close();await drain();}
}
async function stableExit(js=payload.candidate) {
  const f=fixture(js);
  try {
    zone.runOutsideAngular(()=>{f.instance.onAnimationEnd({fromState:'visible',toState:'hidden'});
      assert.equal(f.counts().disposals,0,'stable-completion-is-asynchronous');});
    await drain();assert.equal(f.counts().disposals,1,'stable-exit-disposes-overlay');
    if(mode==='zoneful')assert.deepEqual(f.dismissalZones,[true],'dismissal-reenters-angular-zone');
    assert.equal(f.queued(),1,'stable-exit-schedules-once');assert.equal(activeWaits,0,'stable-exit-does-not-retain-zone-wait');
    return {dismissals:f.dismissals,queued:f.queued()};
  } finally {f.close();await drain();}
}
async function motionExit(kind,js=payload.candidate) {
  const f=fixture(js,{leaf:true,disabled:kind==='disabled'});
  try {
    zone.run(()=>f.instance.enter());
    if(kind!=='disabled') {zone.run(()=>f.instance.onAnimationEnd(f.event('mat-legacy-snack-bar-enter')));assert.equal(f.timers.has(f.instance._enterFallback),false);}
    assert.equal(f.counts().enters,1,'enter-notifies');
    zone.run(()=>f.ref.dismissWithAction());
    assert.equal(f.attributes.get('mat-exit'),'','exit-attribute-retained');
    assert.equal(f.instance._animationState,'hidden','exit-state-retained');
    assert.equal(f.counts().disposals,0,'motion-completion-is-deferred');
    if(kind==='event') {
      zone.run(()=>f.instance.onAnimationEnd(f.event('mat-legacy-snack-bar-exit',true)));
      assert.equal(f.counts().disposals,0,'child-motion-event-is-ignored');
      f.advance(74);assert.equal(f.counts().disposals,0,'exit-fallback-not-early');
      zone.run(()=>f.instance.onAnimationEnd(f.event('mat-legacy-snack-bar-exit')));
    } else if(kind==='fallback') {
      f.advance(124);assert.equal(f.counts().disposals,0,'exit-fallback-not-early');f.advance(125);
    }
    await drain();assert.equal(f.counts().disposals,1,'motion-exit-disposes-overlay');
    assert.deepEqual(f.dismissals,[{dismissedByAction:true}]);
    assert.equal(f.timers.size,0,'exit-and-destroy-release-timers');
    f.advance(300);zone.run(()=>f.instance.onAnimationEnd(f.event('mat-legacy-snack-bar-exit')));await drain();
    assert.equal(f.counts().disposals,1,'late-motion-cannot-dispose-twice');
    assert.equal(activeWaits,0,'no-motion-exit-zone-wait');
    return {kind,...f.counts(),dismissals:f.dismissals};
  } finally {f.close();await drain();}
}
async function destroyBeforeMotion(js=payload.candidate) {
  const f=fixture(js,{leaf:true});
  zone.run(()=>{f.instance.enter();f.ref.dismiss();f.instance.ngOnDestroy();});await drain();
  assert.equal(f.counts().disposals,1,'destroy-delivers-exit');
  assert.equal(f.timers.size,0,'destroy-clears-motion-and-announcement-timers');
  f.advance(300);await drain();assert.equal(f.counts().disposals,1,'destroy-cannot-deliver-late-motion');
  f.close();await drain();return f.counts();
}
try {
  const original=await baseExit(payload.original,mode==='zoneful'),candidate=await baseExit();
  if(mode==='zoneful')assert.deepEqual(candidate,original);
  const stable=await stableExit(),motions=[];
  for(const kind of ['event','fallback','disabled'])motions.push(await motionExit(kind));
  const destroyed=await destroyBeforeMotion(),mutations=[];
  const reject=async(id,operation,message)=>{await assert.rejects(operation,error=>error.code==='ERR_ASSERTION'&&error.message.startsWith(message));mutations.push({id,rejected:true});};
  if(line!=='original') {
    if(mode==='zoneless') {
      await reject('prior-zone-only-wait',()=>baseExit(payload.mutations.priorWait),'exit-disposes-overlay');
      await reject('synchronous-stable-removal',()=>stableExit(payload.mutations.synchronous),'stable-completion-is-asynchronous');
      await reject('missing-pending-guard',()=>stableExit(payload.mutations.noGuard),'stable-exit-schedules-once');
    } else {
      await reject('always-microtask-removal',()=>baseExit(payload.mutations.alwaysStable),'original-zoneful-microtask-empty-timing');
      await reject('repeated-zone-wait',()=>baseExit(payload.mutations.noOnce),'completed-wait-is-released');
      await reject('outside-zone-notification',()=>stableExit(payload.mutations.noRun),'dismissal-reenters-angular-zone');
    }
  }
  console.log(JSON.stringify({original,candidate,stable,motions,destroyed,mutations,
    genuine_public_zone:true,genuine_public_application:!!app,whole_constructors_executed:true,
    native_executed:false,actual_legacy_node_DI_executed:false}));
} finally {zone.onMicrotaskEmpty.subscribe=subscribe;injector.destroy();app?.destroy();core.destroyPlatform();}
