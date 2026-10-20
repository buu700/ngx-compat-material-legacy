/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine Core; renderer/DOM and table parents are explicit protocols. */
import assert from 'node:assert/strict';
import '@angular/compiler';
import {Injector,InjectionToken,Renderer2,IterableDiffers,runInInjectionContext,enableProdMode} from '@angular/core';
const mode=process.argv[2];if(mode==='production')enableProdMode();
const {ambientService,manualRenderer,TaggedFocus}=await import('./caller-parts.mjs');
const {focusLegacyDialogInitially}=await import('./dialog-initial-focus.mjs');
const rows=await import('./row-protocols.mjs'),cases=[];
const check=(id,body)=>{body();cases.push(id);};
const value={owned:'caller'},missing=new InjectionToken('missing'),token=new InjectionToken('present');
class ClassToken {}
check('outside-context-is-null',()=>{assert.equal(ambientService(token),null);assert.equal(ambientService(Renderer2),null);});
const injector=Injector.create({providers:[{provide:token,useValue:value},{provide:ClassToken,useValue:value},{provide:Renderer2,useValue:value}]});
try{
 check('public-generic-and-class-token-identity',()=>runInInjectionContext(injector,()=>{assert.equal(ambientService(token),value);assert.equal(ambientService(ClassToken),value);}));
 check('public-renderer-token-identity',()=>runInInjectionContext(injector,()=>assert.equal(ambientService(Renderer2),value)));
 check('missing-optional-token-is-null',()=>runInInjectionContext(injector,()=>assert.equal(ambientService(missing),null)));
}finally{injector.destroy();}
check('explicit-null-and-false-values-retained',()=>{const context=Injector.create({providers:[{provide:token,useValue:null},{provide:ClassToken,useValue:false}]});try{runInInjectionContext(context,()=>{assert.equal(ambientService(token),null);assert.equal(ambientService(ClassToken),false);});}finally{context.destroy();}});
check('provider-error-propagates-and-context-restores',()=>{const context=Injector.create({providers:[{provide:token,useFactory:()=>{throw Error('controlled provider failure');}}]});try{assert.throws(()=>runInInjectionContext(context,()=>ambientService(token)),/controlled provider failure/);assert.equal(ambientService(token),null);}finally{context.destroy();}});
let destroyed=0;
const factory={supports:input=>Array.isArray(input),create:()=>({diff:()=>null})},differs=IterableDiffers.create([factory]);
// Registry token forwarding, not a replacement implementation of iterable differ behavior.
assert.equal(differs.find([]),factory);
const template={ngOnDestroy(){destroyed++;}},table={ngOnDestroy(){destroyed++;}};
for(const name of ['MatLegacyHeaderRowDef','MatLegacyFooterRowDef','MatLegacyRowDef'])check('exact-forwarding:'+name,()=>{
 const result=new rows[name](template,differs,table);assert.equal(result.differs,differs);assert.equal(result.template,template);assert.equal(result._table,table);assert.ok(result instanceof rows[name]);assert.equal(destroyed,0);
});
check('ambient-registry-cannot-replace-supplied-registry',()=>{const other=IterableDiffers.create([]),context=Injector.create({providers:[{provide:IterableDiffers,useValue:other}]});try{runInInjectionContext(context,()=>assert.equal(new rows.MatLegacyRowDef(template,differs,table).differs,differs));assert.equal(context.get(IterableDiffers),other);}finally{context.destroy();}assert.equal(destroyed,0);});
function fixture(focusable){
 const events=new Map(),trace=[];let tabIndex=focusable?4:null;
 const target={get tabIndex(){return tabIndex;},set tabIndex(v){tabIndex=v;trace.push(['tabindex',v]);},addEventListener(event,callback){assert.ok(!events.has(event));events.set(event,callback);trace.push(['listen',event]);},removeEventListener(event,callback){assert.equal(events.get(event),callback);events.delete(event);trace.push(['remove',event]);},removeAttribute(name){assert.equal(name,'tabindex');tabIndex=null;trace.push(['remove-attribute',name]);},focus(options){trace.push(['focus',options]);}};
 const zone={runOutsideAngular(fn){trace.push(['outside-zone']);return fn();}},checker={isFocusable:()=>focusable};
 return {target,trace,events,zone,checker,snapshot:()=>({trace,tabIndex,listeners:[...events.keys()]})};
}
const options={preventScroll:true},rendererCases=[];
for(const focusable of [false,true])for(const action of ['blur','mousedown','dispose']){
 const run=(tagged,manual)=>{const f=fixture(focusable);let cleanup=null;
  if(tagged){const reference=new TaggedFocus();reference._interactivityChecker=f.checker;reference._ngZone=f.zone;reference._forceFocus(f.target,options);}
  else{const renderer=manual?manualRenderer:{listen:(target,event,callback)=>{target.addEventListener(event,callback);return()=>target.removeEventListener(event,callback);}};
   cleanup=focusLegacyDialogInitially({element:{querySelector:()=>f.target},config:{autoFocus:'button'},checker:f.checker,renderer,ngZone:f.zone,isBrowser:true,isDestroyed:()=>false,onFocusSettled(){}},options);
   assert.deepEqual(f.trace.find(e=>e[0]==='focus'),['focus',options]);
  }
  if(action==='dispose'){cleanup?.();const after=f.snapshot();cleanup?.();assert.deepEqual(f.snapshot(),after);}
  else f.events.get(action)?.();
  return f.snapshot();
 };
 const owned=run(false,false),manual=run(false,true);assert.deepEqual(owned,manual);
 if(action!=='dispose')assert.deepEqual(owned,run(true,false),'tagged focus/listener cleanup changed');
 assert.equal(owned.listeners.length,0);assert.equal(owned.tabIndex,focusable?4:null);
 rendererCases.push({focusable,action,trace:owned.trace});
}
check('renderer-listen-and-disposer-six-protocol-cases',()=>assert.equal(rendererCases.length,6));
check('borrowed-values-remain-unowned',()=>assert.equal(destroyed,0));
assert.equal(cases.length,12);
console.log(JSON.stringify({mode,cases,differ_constructor_protocols:3,renderer_protocol_cases:6,untouched_tagged_renderer_event_comparisons:4,renderer_cases:rendererCases,actual_legacy_parents_or_native_renderer_executed:false,actual_native_packed_or_full_floor_qualified:false}));
