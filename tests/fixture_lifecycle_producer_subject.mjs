/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public ComponentRef/ViewRef lifecycle; renderer and Fixture handles are protocols. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line,mode,production]=process.argv.slice(2);
if(production==='true')globalThis.ngDevMode=false;
if(mode==='zoneful')await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core'),common=await import('@angular/common'),browser=await import('@angular/platform-browser');
const payload=JSON.parse(readFileSync(new URL('./fixture-lifecycle-payload.json',import.meta.url)));
class NodeProtocol{constructor(name){this.name=name;this.nodeType=1;this.attributes=new Map();this.children=[];}hasAttribute(name){return this.attributes.has(name);}getAttribute(name){return this.attributes.get(name)??null;}}
class HTMLElementProtocol extends NodeProtocol{}
globalThis.HTMLElement=HTMLElementProtocol;
const insert=(parent,node,before)=>{if(node.parent)node.parent.children=node.parent.children.filter(n=>n!==node);const index=before?parent.children.indexOf(before):-1;parent.children.splice(index<0?parent.children.length:index,0,node);node.parent=parent;};
let componentDestroyed=0,componentCreated=0;const references=[];
const renderer={data:{},destroy(){},createElement:name=>new HTMLElementProtocol(name),createComment:text=>Object.assign(new NodeProtocol('comment'),{nodeType:8,textContent:text}),createText:text=>Object.assign(new NodeProtocol('text'),{nodeType:3,textContent:text}),appendChild:(p,n)=>insert(p,n),insertBefore:insert,removeChild(p,n){if(p)p.children=p.children.filter(v=>v!==n);n.parent=null;},selectRootElement:n=>n,parentNode:n=>n.parent??null,nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1]??null,setAttribute:(n,k,v)=>n.attributes.set(k,v),removeAttribute:(n,k)=>n.attributes.delete(k),addClass(){},removeClass(){},setStyle(){},removeStyle(){},setProperty:(n,k,v)=>{n[k]=v;},setValue:(n,v)=>{n.textContent=v;},listen:()=>()=>{}};
const providers=[{provide:core.RendererFactory2,useValue:{createRenderer:()=>renderer}},{provide:line==='original'?common.DOCUMENT:core.DOCUMENT,useValue:{head:{children:[],querySelectorAll:()=>[]}}},{provide:core.PLATFORM_ID,useValue:'server'}];
if(common.IMAGE_CONFIG)providers.push({provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}});
providers.push(core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection']());
const app=await browser.createApplication({providers});
class LifecycleSubject{constructor(){componentCreated++;}ngOnDestroy(){componentDestroyed++;}}
core.Component({selector:'closeout-fixture-lifecycle',standalone:true,template:''})(LifecycleSubject);
function makeFixture({noop=false,deceptive=false}={}){const componentRef=core.createComponent(LifecycleSubject,{environmentInjector:app.injector,hostElement:new HTMLElementProtocol('host')});componentRef.changeDetectorRef.detectChanges();references.push(componentRef);assert.equal(componentRef.hostView.destroyed,false);const fixture={componentRef,destroyCalls:0,destroy(){this.destroyCalls++;if(!noop)this.componentRef.destroy();}};if(deceptive)Object.defineProperty(fixture,'destroyed',{get:()=>true});return fixture;}
function functions(code){const exports={};new Function('exports',code)(exports);return exports;}
function check(row,functions){const {readField,cleanup}=functions,observations=[];const cases=(id,fn)=>{fn();observations.push(id);};
 cases('live-destroy-repeat-with-deceptive-unrelated-flag',()=>{const fixtures=Array.from({length:row.array_state?2:1},()=>makeFixture({deceptive:true})),fixture=fixtures[0];assert.equal(readField(fixture,fixtures),row.array_state?0:false);for(const f of fixtures)cleanup(f);assert.equal(readField(fixture,fixtures),row.array_state?2:true);for(const f of fixtures)cleanup(f);assert.ok(fixtures.every(f=>f.destroyCalls===1));});
 cases('already-destroyed-view-skips-repeat-fixture-call',()=>{const fixtures=Array.from({length:row.array_state?2:1},()=>makeFixture());for(const f of fixtures)f.componentRef.destroy();assert.equal(readField(fixtures[0],fixtures),row.array_state?2:true);for(const f of fixtures)cleanup(f);assert.ok(fixtures.every(f=>f.destroyCalls===0));});
 cases('failed-destruction-cannot-report-clean',()=>{const fixtures=Array.from({length:row.array_state?2:1},()=>makeFixture({noop:true}));for(const f of fixtures)cleanup(f);assert.equal(readField(fixtures[0],fixtures),row.array_state?0:false);assert.ok(fixtures.every(f=>f.destroyCalls===1));for(const f of fixtures)f.componentRef.destroy();});
 if(row.guard_allows_absent)cases('missing-fixture-guard',()=>{assert.doesNotThrow(()=>cleanup(undefined));if(row.optional_state)assert.equal(readField(undefined,[]),false);});
 if(row.array_state)cases('mixed-view-lifetimes-are-counted',()=>{const fixtures=[makeFixture(),makeFixture()];fixtures[0].componentRef.destroy();assert.equal(readField(fixtures[0],fixtures),1);for(const f of fixtures)cleanup(f);assert.equal(readField(fixtures[0],fixtures),2);assert.deepEqual(fixtures.map(f=>f.destroyCalls),[0,1]);});
 return observations;}
let faultCount=0;const results=[];
try{for(const row of payload){const f=functions(row.code),cases=check(row,f);results.push({family:row.family,cases});
 for(const [id,override]of [
  ['fabricated-success-state',{...f,readField:()=>row.array_state?2:true}],
  ['unsupported-old-fixture-field',{...f,readField:(fixture,fixtures)=>row.array_state?fixtures.filter(f=>f.destroyed).length:row.optional_state?fixture?.destroyed===true:fixture.destroyed}],
  ['missing-destruction-callback',{...f,cleanup:()=>{}}],
  ['unconditional-repeat-destruction',{...f,cleanup:fixture=>fixture.destroy()}],
 ]){assert.throws(()=>check(row,override),undefined,row.family+':'+id);faultCount++;}
 }
}finally{for(const ref of references)if(!ref.hostView.destroyed)ref.destroy();app.destroy();core.destroyPlatform();}
assert.equal(componentCreated,componentDestroyed,'every genuine public component view is destroyed exactly once');
assert.equal(faultCount,28);
console.log(JSON.stringify({line,mode,production:production==='true',results,behavior_faults_rejected:faultCount,genuine_public_ComponentRef_and_ViewRef:true,public_components_created:componentCreated,public_components_destroyed:componentDestroyed,renderer_and_Fixture_handle_protocols:true,actual_TestBed_ComponentFixture_or_legacy_component_executed:false,native_browser_or_packed_qualified:false}));
