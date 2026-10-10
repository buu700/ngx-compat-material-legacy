/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line,mode,production]=process.argv.slice(2);
if(production==='true')globalThis.ngDevMode=false;
if(mode==='zoneful')await import('zone.js/node');
await import('@angular/compiler');const core=await import('@angular/core');
const payload=JSON.parse(readFileSync(new URL('./ripple-event-manager-payload.json',import.meta.url)));
let app,zone;
if(line==='original')zone=new core.NgZone({enableLongStackTrace:false});
else{const common=await import('@angular/common'),browser=await import('@angular/platform-browser');
 app=await browser.createApplication({providers:[core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection'](),
 {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
 {provide:core.DOCUMENT,useValue:{head:{children:[]}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}}]});
 zone=app.injector.get(core.NgZone);
}
class NodeProtocol{constructor(parent){this.parent=parent;}contains(node){for(let p=node;p;p=p.parent)if(p===this)return true;return false;}}
function fixture(original=false,mutation={}){
 const listeners=new Map(),registrations=[],deliveries=[];
 const capture=options=>typeof options==='boolean'?options:!!options?.capture;
 const document={addEventListener(type,handler,options){registrations.push({type,handler,options,inside:core.NgZone.isInAngularZone()});listeners.set(type,{handler,capture:capture(options)});},
  removeEventListener(type,handler,options){const current=listeners.get(type);if(current?.handler===handler&&current.capture===capture(options))listeners.delete(type);}};
 let manager;
 if(original)manager=new (new Function('document','passiveCapturingEventOptions$1',payload.original+'\nreturn RippleEventManager;')(document,{capture:true,passive:true}))();
 else{const helpers={},exports={};new Function('exports',mutation.helper||payload.helper)(helpers);
  new Function('exports','require','document',mutation.manager||payload.manager)(exports,()=>helpers,document);manager=new exports.LegacyRippleEventManager();}
 const parent=new NodeProtocol(),child=new NodeProtocol(parent),target=new NodeProtocol(child);
 const a={handleEvent:()=>deliveries.push('parent')},b={handleEvent:()=>deliveries.push('child')};
 const add=(type,element,handler)=>zone.run(()=>manager.addHandler(zone,type,element,handler));
 const dispatch=event=>{const listener=listeners.get(event.type)?.handler;
  if(listener)typeof listener==='function'?listener(event):listener.handleEvent(event);};
 return{manager,listeners,registrations,deliveries,parent,child,target,a,b,add,dispatch,
  nested(){add('mousedown',parent,a);add('mousedown',child,b);},
  event(path='ordinary'){return{type:'mousedown',target,...(path==='absent'?{}:{composedPath:()=>path==='throw'?(()=>{throw Error('replayed path unavailable');})():path==='empty'?[]:[target,child,parent]})};},
  cleanup(){manager.removeHandler('mousedown',parent,a);manager.removeHandler('mousedown',child,b);}};
}
const cases=[],mutations=[];
function matching(original=false,mutation={}){
 const f=fixture(original,mutation);f.nested();f.dispatch(f.event());assert.deepEqual(f.deliveries,['parent','child']);
 assert.equal(f.registrations.length,1);assert.equal(f.registrations[0].inside,false);
 assert.equal(f.registrations[0].options.capture,true);assert.equal(f.registrations[0].options.passive,true);
 f.cleanup();assert.equal(f.listeners.size,0);
}
function fallback(kind,original=false,mutation={}){
 const f=fixture(original,mutation);f.nested();f.dispatch(f.event(kind));assert.deepEqual(f.deliveries,['parent','child']);f.cleanup();
}
try{
 matching(true);cases.push({id:'tagged-registration-order-and-outside-zone-listener',result:'pass'});
 matching();cases.push({id:'owned-registration-order-and-outside-zone-listener',result:'pass'});
 fallback('absent',true);fallback('absent');cases.push({id:'missing-composed-path-matches-tagged-fallback',result:'pass'});
 const shared=fixture();shared.nested();shared.add('mousedown',shared.parent,shared.a);
 shared.add('touchstart',shared.parent,shared.a);assert.equal(shared.registrations.length,2);
 shared.manager.removeHandler('mousedown',shared.parent,shared.a);assert.equal(shared.listeners.size,2);
 shared.dispatch(shared.event());assert.deepEqual(shared.deliveries,['child']);shared.cleanup();assert.equal(shared.listeners.size,1);
 shared.manager.removeHandler('touchstart',shared.parent,shared.a);assert.equal(shared.listeners.size,0);
 cases.push({id:'shared-duplicate-and-independent-event-ownership',result:'pass'});
 for(const original of[true,false]){const f=fixture(original);f.child.parent=undefined;f.nested();f.dispatch(f.event());assert.deepEqual(f.deliveries,['child']);f.cleanup();}
 cases.push({id:'path-ancestor-without-node-containment-does-not-receive-event',result:'pass'});
 for(const original of[true,false]){const f=fixture(original);f.nested();f.dispatch({...f.event(),target:null});assert.deepEqual(f.deliveries,['parent','child']);f.cleanup();}
 cases.push({id:'first-composed-node-remains-target-over-retargeted-property',result:'pass'});
 fallback('throw');const taggedThrow=fixture(true);taggedThrow.nested();assert.throws(()=>taggedThrow.dispatch(taggedThrow.event('throw')),/replayed path/);taggedThrow.cleanup();
 cases.push({id:'throwing-replay-path-is-explicit-repaired-tag-deviation',result:'pass'});
 fallback('empty');const taggedEmpty=fixture(true);taggedEmpty.nested();taggedEmpty.dispatch(taggedEmpty.event('empty'));assert.deepEqual(taggedEmpty.deliveries,[]);taggedEmpty.cleanup();
 cases.push({id:'owned-empty-path-fallback-is-preserved-and-explicit',result:'pass'});
 const nullTarget=fixture();nullTarget.nested();nullTarget.dispatch({type:'mousedown',target:null});assert.deepEqual(nullTarget.deliveries,[]);nullTarget.cleanup();
 cases.push({id:'null-target-is-inert',result:'pass'});
 const reentrant=fixture();const removing={handleEvent:()=>{reentrant.deliveries.push('remove');reentrant.manager.removeHandler('mousedown',reentrant.child,reentrant.b);}};
 reentrant.add('mousedown',reentrant.parent,removing);reentrant.add('mousedown',reentrant.child,reentrant.b);reentrant.dispatch(reentrant.event());assert.deepEqual(reentrant.deliveries,['remove']);
 reentrant.manager.removeHandler('mousedown',reentrant.parent,removing);assert.equal(reentrant.listeners.size,0);
 cases.push({id:'handler-removal-during-dispatch-retains-live-map-semantics',result:'pass'});
 for(const[id,mutation]of Object.entries(payload.mutations)){
  if(id==='insideZone'&&mode==='zoneless')continue; // The genuine public zoneless zone has no inside context.
  const action=id==='noFallback'?()=>fallback('absent',false,mutation):id==='noReplayGuard'?()=>fallback('throw',false,mutation):()=>matching(false,mutation);
  assert.throws(action);mutations.push({id,result:'rejected'});
 }
 console.log(JSON.stringify({cases,mutations,genuine_public_zone:true,actual_native_or_ripple_renderer_executed:false}));
}finally{app?.destroy();if(app)core.destroyPlatform();}
