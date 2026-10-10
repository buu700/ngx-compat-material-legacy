/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole menu class, genuine public zones/key manager/queries, protocol items and DOM. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line,mode,production,baseline] = process.argv.slice(2);
if(production==='true')globalThis.ngDevMode=false;
if(mode==='zoneful')await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core'),a11y=await import('@angular/cdk/a11y');
const rx=await import('rxjs'),ops=await import('rxjs/operators');
const payload=JSON.parse(readFileSync(new URL('./menu-focus-payload.json',import.meta.url)));
let app,zone;
if(line==='original')zone=new core.NgZone({enableLongStackTrace:false});
else{
 const common=await import('@angular/common'),browser=await import('@angular/platform-browser');
 app=await browser.createApplication({providers:[core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection'](),
  {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
  {provide:core.DOCUMENT,useValue:{head:{children:[]}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}}]});
 zone=app.injector.get(core.NgZone);if(mode==='zoneless')assert.equal(typeof globalThis.Zone,'undefined');
}
const drain=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(js=payload.candidate,{disabled=false,activeInside=false}={}){
 const exports={};
 new Function('exports','QueryList','EventEmitter','Subject','Subscription','merge','startWith','switchMap','take',
  'FocusKeyManager','legacyAnimationsDisabled','menuPanelUid','ENTER_ANIMATION','EXIT_ANIMATION',js)
  (exports,core.QueryList,core.EventEmitter,rx.Subject,rx.Subscription,rx.merge,ops.startWith,ops.switchMap,ops.take,
   a11y.FocusKeyManager,()=>false,0,'mat-legacy-menu-enter','mat-legacy-menu-exit');
 const Type=exports.Replay;assert.equal(Type.length,4,'historical-constructor-arity');
 const host={className:''},instance=new Type(new core.ElementRef(host),zone,
  {xPosition:'after',yPosition:'below',overlapTrigger:false,backdropClass:'backdrop'}, {markForCheck(){}});
 const focuses=[];let panelFocus=0;
 const panel={contains:()=>activeInside,focus(){panelFocus++;}};
 globalThis.document={activeElement:activeInside?host:{},body:{},documentElement:{}};
 const items=[0,1].map(index=>({_parentMenu:instance,disabled,_focused:new rx.Subject(),getLabel:()=>String(index),
  _getHostElement:()=>({closest:()=>panel}),_hasFocus:()=>false,
  focus(origin){focuses.push([index,origin]);this._focused.next(this);}}));
 instance._allItems=new core.QueryList();instance._allItems.reset(items);instance.ngAfterContentInit();
 return{instance,items,focuses,panelFocus:()=>panelFocus,close(){instance.ngOnDestroy();items.forEach(item=>item._focused.complete());}};
}
async function normal(js,expected=true){
 const f=fixture(js);
 try{
  zone.run(()=>{f.instance.focusFirstItem('touch');assert.equal(f.focuses.length,0,'focus-waits-for-stability');});
  await drain();assert.deepEqual(f.focuses,expected?[[0,'touch']]:[],'focus-retains-origin');
  zone.run(()=>{});await drain();assert.deepEqual(f.focuses,expected?[[0,'touch']]:[],'focus-occurs-once');
  return{focuses:[...f.focuses]};
 }finally{f.close();await drain();}
}
async function canceled(js=payload.candidate){
 const f=fixture(js);
 try{
  zone.run(()=>{f.instance.focusFirstItem('keyboard');f.instance.ngOnDestroy();});
  await drain();assert.deepEqual(f.focuses,[],'destroy-cancels-queued-focus');assert.equal(f.panelFocus(),0);
 }finally{f.close();await drain();}
}
async function superseded(js=payload.candidate){
 const f=fixture(js);
 try{
  zone.run(()=>{f.instance.focusFirstItem('program');f.instance.focusFirstItem('touch');});
  await drain();assert.deepEqual(f.focuses,[[0,'touch']],'only-latest-focus-request-applies');
  zone.run(()=>{});await drain();assert.deepEqual(f.focuses,[[0,'touch']],'latest-request-is-once-only');
 }finally{f.close();await drain();}
}
async function afterDestroy(js=payload.candidate){
 const f=fixture(js);
 try{f.instance.ngOnDestroy();const request=f.instance._firstItemFocusSubscription;
  zone.run(()=>f.instance.focusFirstItem('program'));await drain();
  assert.equal(f.instance._firstItemFocusSubscription,request,'destroyed-menu-rejects-new-focus-request');
  assert.deepEqual(f.focuses,[],'destroyed-menu-rejects-new-focus');assert.equal(f.panelFocus(),0);
 }finally{f.close();await drain();}
}
async function duringChange(js=payload.candidate){
 const f=fixture(js);
 try{f.instance._keyManager.change.subscribe(()=>f.instance.ngOnDestroy());
  zone.run(()=>f.instance.focusFirstItem('keyboard'));await drain();
  assert.deepEqual(f.focuses,[],'destroy-during-key-change-prevents-parent-focus');
  assert.equal(f.panelFocus(),0,'destroy-during-key-change-prevents-panel-fallback');
 }finally{f.close();await drain();}
}
async function closedBeforeReady(js=payload.candidate){
 const f=fixture(js);
 try{zone.run(()=>{f.instance._startAnimation();f.instance.focusFirstItem('program');f.instance._resetAnimation();});
  await drain();assert.deepEqual(f.focuses,[],'closing-cancels-pending-focus');
 }finally{f.close();await drain();}
}
async function semantics(){
 const inside=fixture(payload.candidate,{activeInside:true});
 zone.run(()=>inside.instance.focusFirstItem('mouse'));await drain();assert.deepEqual(inside.focuses,[],'existing-panel-focus-preserved');inside.close();await drain();
 const disabled=fixture(payload.candidate,{disabled:true});
 zone.run(()=>disabled.instance.focusFirstItem('keyboard'));await drain();assert.deepEqual(disabled.focuses,[]);
 assert.equal(disabled.panelFocus(),1,'all-disabled-items-focus-panel');disabled.close();await drain();
 return{existingFocusPreserved:true,allDisabledPanelFallback:true};
}
const cases=[],mutations=[];
async function check(id,operation){try{await operation();cases.push({id,result:'pass'});}catch(error){if(baseline!=='true')throw error;cases.push({id,result:'fail',error:error.message});}}
try{
 const original=await normal(payload.original,mode==='zoneful'),candidate=await normal(payload.candidate);
 if(mode==='zoneful')assert.deepEqual(candidate,original);
 await check('destroy-before-ready',()=>canceled());await check('superseded-request',()=>superseded());
 await check('request-after-destroy',()=>afterDestroy());await check('destroy-in-key-change',()=>duringChange());
 await check('close-before-ready',()=>closedBeforeReady());
 const controls=await semantics();
 if(line!=='original'&&baseline!=='true'){
  const reject=async(id,operation,message)=>{await assert.rejects(operation,error=>error.code==='ERR_ASSERTION'&&error.message.startsWith(message));mutations.push({id,rejected:true});};
  if(mode==='zoneless'){
   await reject('prior-unowned-promise',()=>canceled(payload.mutations.prior),'destroy-cancels-queued-focus');
   await reject('superseded-request-still-applies',()=>superseded(payload.mutations.noClosedGuard),'only-latest-focus-request-applies');
  }
  await reject('post-destroy-request',()=>afterDestroy(payload.mutations.noEntryGuard),'destroyed-menu-rejects-new-focus');
  await reject('parent-resumes-focus-after-destroy',()=>duringChange(payload.mutations.noClearActive),'destroy-during-key-change-prevents-parent-focus');
  await reject('panel-fallback-after-destroy',()=>duringChange(payload.mutations.noContinuationGuard),'destroy-during-key-change-prevents-panel-fallback');
  await reject('pending-focus-after-close',()=>closedBeforeReady(payload.mutations.noCloseCancel),'closing-cancels-pending-focus');
 }
 console.log(JSON.stringify({original,candidate,cases,controls,mutations,genuine_public_key_manager:true,
  genuine_public_zone:true,genuine_public_application:!!app,whole_constructor_executed:true,
  native_executed:false,actual_legacy_node_DI_executed:false}));
}finally{app?.destroy();core.destroyPlatform();delete globalThis.document;}
