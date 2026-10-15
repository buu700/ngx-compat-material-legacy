/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
const [line,mode]=process.argv.slice(2);
if(mode==='zoneful')await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core'),common=await import('@angular/common'),browser=await import('@angular/platform-browser');
const {UniqueSelectionDispatcher:Type}=await import('@angular/cdk/collections');
const manual=new Type(),calls=[];
manual.notify('nobody','none');
const removeFirst=manual.listen((id,name)=>calls.push(['first',id,name]));
let removeSelf;removeSelf=manual.listen((id,name)=>{calls.push(['self',id,name]);removeSelf();});
const removeLast=manual.listen((id,name)=>calls.push(['last',id,name]));
manual.notify('a','group');manual.notify('b','different');
assert.deepEqual(calls,[['first','a','group'],['self','a','group'],['last','a','group'],['first','b','different'],['last','b','different']]);
removeFirst();removeFirst();removeLast();manual.notify('c','group');assert.equal(calls.length,5);
const addDuring=new Type(),added=[];let extra=false;
addDuring.listen(()=>{added.push('first');if(!extra){extra=true;addDuring.listen(()=>added.push('new'));}});addDuring.notify('a','g');assert.deepEqual(added,['first','new']);
const errors=new Type(),message=new Error('listener failure');const off=errors.listen(()=>{throw message;});let after=0;errors.listen(()=>after++);assert.throws(()=>errors.notify('a','g'),e=>e===message);assert.equal(after,0);off();errors.notify('b','g');assert.equal(after,1);
manual.listen(()=>calls.push('late'));manual.ngOnDestroy();manual.notify('d','g');assert.equal(calls.length,5);addDuring.ngOnDestroy();errors.ngOnDestroy();
const providers=[core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection'](),
 {provide:line==='original'?common.DOCUMENT:core.DOCUMENT,useValue:{head:{children:[]}}},
 {provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}}];
if(common.IMAGE_CONFIG)providers.push({provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}});
let a,b,child;
try{
 a=await browser.createApplication({providers});b=await browser.createApplication({providers});
 const first=a.injector.get(Type),second=b.injector.get(Type);child=core.createEnvironmentInjector([],a.injector);
 assert.ok(first instanceof Type&&second instanceof Type);assert.equal(a.injector.get(Type),first);assert.equal(child.get(Type),first);assert.notEqual(first,second);
 let seen=0,other=0;first.listen(()=>seen++);second.listen(()=>other++);first.notify('a','group');assert.equal(seen,1);assert.equal(other,0);
 child.destroy();child=null;first.notify('b','group');assert.equal(seen,2);
 a.destroy();a=null;first.notify('c','group');assert.equal(seen,2);second.notify('d','group');assert.equal(other,1);
 b.destroy();b=null;second.notify('e','group');assert.equal(other,1);
 console.log(JSON.stringify({line,mode,default_root_service:true,child_identity:true,applications_isolated:true,destruction_clears_listeners:true,manual_listener_cases:7,document_and_renderer_protocol:true,whole_component_or_native_or_packed_qualified:false}));
}finally{child?.destroy();a?.destroy();b?.destroy();core.destroyPlatform();}
