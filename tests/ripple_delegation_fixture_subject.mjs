/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine Angular view/DI scheduling; iframe/renderer/DOM/CSS/event/clock protocols. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [mode,production,variant]=process.argv.slice(2);
if(production==='true')globalThis.ngDevMode=false;
if(mode==='zoneful')await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core'),common=await import('@angular/common');
const browser=await import('@angular/platform-browser'),platform=await import('@angular/cdk/platform');
const payload=JSON.parse(readFileSync(new URL('./ripple-delegation-fixture-payload.json',import.meta.url)));
const okay=new Function('return ('+payload.contract+')')();
const jobs=new Map();let now=0,serial=0,childAPI;
const clockTimeout=(fn,ms)=>{if(ms===500)return setTimeout(fn,ms);const id=serial++;jobs.set(id,{fn,due:now+ms});return id;};
const clockClear=id=>typeof id==='number'?jobs.delete(id):clearTimeout(id);
async function drive(promise){let done=false,value,failure;promise.then(v=>{done=true;value=v;},e=>{done=true;failure=e;});
 const deadline=Date.now()+3000;while(!done&&Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,1));
  const next=[...jobs].sort((a,b)=>a[1].due-b[1].due)[0];if(next){now=next[1].due;jobs.delete(next[0]);next[1].fn();}}
 assert.equal(done,true,'fixture did not settle');if(failure)throw failure;return value;}
class NodeProtocol{constructor(name){this.name=name;this.children=[];this.attributes=new Map();this.style={};this.listeners=new Map();}
 get isConnected(){return this.rootConnected||!!this.parent?.isConnected;}hasAttribute(name){return this.attributes.has(name);}
 contains(node){for(let p=node;p;p=p.parent)if(p===this)return true;return false;}
 querySelector(selector){return this.children.find(node=>node.name===(selector==='button'?'button':selector))||null;}
 addEventListener(type,listener){const set=this.listeners.get(type)||new Set();set.add(listener);this.listeners.set(type,set);}
 removeEventListener(type,listener){this.listeners.get(type)?.delete(listener);}
 emit(event){event.target??=this;for(const listener of [...(this.listeners.get(event.type)||[])])typeof listener==='function'?listener(event):listener.handleEvent(event);}
 dispatchEvent(event){event.target=this;document.emit(event);for(let node=this;node;node=node.parent)node.emit(event);return true;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}
 getBoundingClientRect(){return{x:5,y:7,width:this.name==='button'?120:200,height:this.name==='button'?48:80};}
 appendChild(node){insert(this,node);return node;}
 scrollIntoView(){}
}
class ElementProtocol extends NodeProtocol{}
class FrameProtocol extends ElementProtocol{constructor(){super('iframe');this.clientLeft=0;this.clientTop=0;
 this.contentWindow={document:{querySelector:()=>null,documentElement:{dataset:{labReady:'1'}}},get __lab(){return childAPI;}};}
 getBoundingClientRect(){return{x:100,y:80,width:320,height:180};}}
globalThis.HTMLElement=ElementProtocol;
const childHost=new ElementProtocol('child-host'),parentHost=new ElementProtocol('parent-host');childHost.rootConnected=parentHost.rootConnected=true;
const insert=(parent,child,before)=>{child.remove();const i=before?parent.children.indexOf(before):-1;parent.children.splice(i<0?parent.children.length:i,0,child);child.parent=parent;};
const renderer={data:{},destroy(){},createElement:name=>new ElementProtocol(name),createComment:text=>Object.assign(new NodeProtocol('comment'),{textContent:text}),
 createText:text=>Object.assign(new NodeProtocol('text'),{textContent:text}),appendChild:(p,n)=>insert(p,n),insertBefore:insert,removeChild:(_p,n)=>n.remove(),
 selectRootElement:()=>childHost,parentNode:n=>n.parent||null,nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1]||null,
 setAttribute:(n,k,v)=>n.attributes.set(k,v),removeAttribute:(n,k)=>n.attributes.delete(k),addClass(){},removeClass(){},setStyle(){},removeStyle(){},
 setProperty:(n,k,v)=>{n[k]=v;},setValue:(n,v)=>{n.textContent=v;},listen:()=>()=>{}};
const document=new ElementProtocol('document');document.createElement=name=>name==='iframe'?new FrameProtocol():new ElementProtocol(name);
const window=new ElementProtocol('window');const location={href:'http://127.0.0.1:9999/index.html?entry=frozen'};window.location=location;globalThis.window=window;
class MouseProtocol{constructor(type,options={}){Object.assign(this,{type,isTrusted:false},options);}composedPath(){return[this.target];}}
const active=new Map();let registrations=0;
const delegate={handleEvent(event){const entries=[...active];if(variant==='reversed-order')entries.reverse();
 for(const[node,ripple]of entries)if(node.contains(event.target))ripple.fadeInRipple(event.clientX,event.clientY,{});}};
class RefProtocol{constructor(element){this.element=element;this.state=0;}fadeOut(){}}
class RippleProtocol{
 constructor(_target,zone,node){this.zone=zone;this.node=node;this.refs=[];}
 setupTriggerEvents(node){if(!active.size)this.zone.runOutsideAngular(()=>{for(const type of['mousedown','touchstart'])document.addEventListener(type,delegate,{capture:true,passive:true});registrations+=2;});active.set(node,this);}
 fadeInRipple(){const node=new ElementProtocol('ripple');node.style.transitionDuration='225ms';insert(this.node,node);const ref=new RefProtocol(node);this.refs.push(ref);
  clockTimeout(()=>{if(variant!=='no-motion')node.emit({type:'transitionend',target:node,isTrusted:true,propertyName:'transform',elapsedTime:0.225});
   clockTimeout(()=>{ref.state=3;node.remove();if(variant!=='no-motion')node.emit({type:'transitionend',target:node,isTrusted:true,propertyName:'opacity',elapsedTime:0.15});},150);},225);
  return ref;}
 _removeTriggerEvents(){active.delete(this.node);if(!active.size&&variant!=='missing-remove')for(const type of['mousedown','touchstart'])document.removeEventListener(type,delegate,true);}
 fadeOutAll(){for(const ref of this.refs){ref.state=3;ref.element.remove();}}
}
const exported={};
new Function('exports','Component','ViewChild','TemplateRef','ViewContainerRef','ElementRef','NgZone','Injector','inject','signal','afterNextRender','Platform',
 'LegacyRippleRenderer','LegacyRippleRef','LegacyRippleState','HTMLElement','document','window','location','MouseEvent','getComputedStyle','performance','setTimeout','clearTimeout',payload.fixture)
 (exported,core.Component,core.ViewChild,core.TemplateRef,core.ViewContainerRef,core.ElementRef,core.NgZone,core.Injector,core.inject,core.signal,core.afterNextRender,platform.Platform,
 RippleProtocol,RefProtocol,{HIDDEN:3},ElementProtocol,document,window,location,MouseProtocol,
 ()=>({transitionProperty:'opacity, transform',transitionDuration:'0.225s'}),{now:()=>now},clockTimeout,clockClear);
class FixtureModule{}
core.NgModule({declarations:[exported.RippleDelegationLab,exported.RippleDelegationFrameLab]})(FixtureModule);
const app=await browser.createApplication({providers:[core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection'](),
 {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
 {provide:core.DOCUMENT,useValue:{head:{children:[],querySelectorAll:()=>[]}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>renderer}}]});
let module,child,parent;
try{
 module=core.createNgModule(FixtureModule,app.injector);
 child=core.createComponent(exported.RippleDelegationLab,{environmentInjector:module.injector,hostElement:childHost});
 parent=core.createComponent(exported.RippleDelegationFrameLab,{environmentInjector:module.injector,hostElement:parentHost});
 app.attachView(child.hostView);app.attachView(parent.hostView);app.tick();
 childAPI={prepareRippleDelegation:()=>child.instance.prepare(),finishRippleDelegation:()=>child.instance.finish(),
 rippleDelegationTarget:()=>child.instance.target(),disposeRippleDelegation:()=>child.instance.dispose()};
 const run=async()=>{
  await drive(parent.instance.prepare());const frame=parent.instance.frame;
  assert.match(frame.src,/entry=frozen/);assert.match(frame.src,/legacyRippleOnly=1/);
  assert.deepEqual(parent.instance.targetBox(),{x:105,y:87,width:120,height:48});
  const node=child.instance.target();app.injector.get(core.NgZone).runOutsideAngular(()=>{
   node.dispatchEvent(Object.assign(new MouseProtocol('mousedown',{detail:1,buttons:1,clientX:60,clientY:30}),{isTrusted:true}));
   node.dispatchEvent(Object.assign(new MouseProtocol('mouseup'),{isTrusted:true}));});
  const observation=await drive(parent.instance.finish());assert.equal(frame.isConnected,false);assert.equal(active.size,0);
  assert.equal(observation.actual_angular_hydration_replay_executed,false);return observation;
 };
 const observation=await run();assert.equal(okay(observation),variant==='live',JSON.stringify(observation));
 if(variant==='live'){const repeated=parent.instance.prepare();await assert.rejects(parent.instance.prepare(),/already running/);
  await drive(repeated);parent.instance.dispose();assert.equal(active.size,0);assert.equal(parent.instance.frame,undefined);assert.equal(jobs.size,0);
  assert.equal(okay(await run()),true);}
 assert.ok(registrations>=2);
 console.log(JSON.stringify({variant,genuine_angular_query_node_DI_and_scheduled_embedded_view:true,genuine_public_ngzone_and_platform:true,
  renderer_iframe_DOM_CSS_event_clock_protocols:true,actual_owned_renderer_or_second_realm_or_native_executed:false}));
}finally{parent?.destroy();child?.destroy();module?.destroy();app.destroy();core.destroyPlatform();jobs.clear();}
