/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line,mode,production,passive] = process.argv.slice(2);
if(production==='true')globalThis.ngDevMode=false;
if(mode==='zoneful')await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core'),common=await import('@angular/common'),browser=await import('@angular/platform-browser');
const registrations=[],timers=new Map();let now=1000,serial=0;
const capture=options=>typeof options==='boolean'?options:!!options?.capture;
class NodeProtocol {
  constructor(){this.children=[];this.listeners=new Map();this.style={};this.classList={add(){}};}
  contains(node){for(let p=node;p;p=p.parent)if(p===this)return true;return false;}
  appendChild(node){node.parent=this;this.children.push(node);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
  getBoundingClientRect(){return {left:0,top:0,right:100,bottom:48,width:100,height:48};}
  addEventListener(type,handler,options){const rows=this.listeners.get(type)||[];rows.push({handler,capture:capture(options)});this.listeners.set(type,rows);
    registrations.push({target:this,type,capture:capture(options),passive:typeof options==='object'?options.passive:undefined,inside:core.NgZone.isInAngularZone()});}
  removeEventListener(type,handler,options){this.listeners.set(type,(this.listeners.get(type)||[]).filter(row=>row.handler!==handler||row.capture!==capture(options)));}
  fire(type){for(const{handler}of[...(this.listeners.get(type)||[])])typeof handler==='function'?handler({type}):handler.handleEvent({type});}
}
const document=new NodeProtocol();document.head={children:[]};document.createElement=()=>new NodeProtocol();
const window={addEventListener(type,_listener,options){if(type==='test'&&passive==='true')void options.passive;},
  removeEventListener(){},
  getComputedStyle:()=>({transitionProperty:'transform, opacity',transitionDuration:'0.225s, 0.15s'})};
globalThis.window=window;globalThis.document=document;globalThis.Node=NodeProtocol;
Object.defineProperty(globalThis,'navigator',{value:{userAgent:'Renderer protocol'},configurable:true});
const platform=await import('@angular/cdk/platform'),a11y=await import('@angular/cdk/a11y'),coercion=await import('@angular/cdk/coercion');
let app,zone;
if(line==='original')zone=new core.NgZone({enableLongStackTrace:false});
else{app=await browser.createApplication({providers:[core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection'](),
 {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
 {provide:core.DOCUMENT,useValue:document},{provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}}]});zone=app.injector.get(core.NgZone);}
const injector=core.Injector.create({providers:[{provide:core.PLATFORM_ID,useValue:'browser'}]});
const serverInjector=core.Injector.create({providers:[{provide:core.PLATFORM_ID,useValue:'server'}]});
const makePlatform=browser=>line==='original'?new platform.Platform(browser?'browser':'server')
 :core.runInInjectionContext(browser?injector:serverInjector,()=>new platform.Platform());
const browserPlatform=makePlatform(true),serverPlatform=makePlatform(false);
assert.equal(browserPlatform.isBrowser,true);assert.equal(serverPlatform.isBrowser,false);
const payload=JSON.parse(readFileSync(new URL('./ripple-renderer-public-payload.json',import.meta.url)));
const setTimeout=(fn,delay)=>{const id=serial++;timers.set(id,{fn,due:now+delay,inside:core.NgZone.isInAngularZone()});return id;};
const clearTimeout=id=>timers.delete(id);
const DateProtocol={now:()=>now};
function load(mutation={}) {
 const modules=new Map(),external={'@angular/core':core,'@angular/cdk/platform':platform,'@angular/cdk/a11y':a11y,'@angular/cdk/coercion':coercion};
 function module(key){if(modules.has(key))return modules.get(key);const out={};modules.set(key,out);
  const require=specifier=>external[specifier]||module({'./ripple-ref':'ref','./ripple-event-manager':'manager','../internal/dom/shadow-dom':'helper'}[specifier]);
  new Function('exports','require','window','document','setTimeout','clearTimeout','Date',mutation[key]||payload[key])
    (out,require,window,document,setTimeout,clearTimeout,DateProtocol);return out;}
 return module('renderer').LegacyRippleRenderer;
}
function fixture(mutation={},options={}) {
 const Renderer=load(mutation),element=new NodeProtocol(),target={rippleConfig:{},rippleDisabled:false};
 const chosen=options.server?serverPlatform:browserPlatform;
 const ref=new core.ElementRef(element);const renderer=zone.run(()=>new Renderer(target,zone,options.raw?element:ref,chosen));
 zone.run(()=>renderer.setupTriggerEvents(options.raw?element:ref));
 const advance=ms=>{now+=ms;for(let count=0;count<20;count++){const due=[...timers].filter(([,row])=>row.due<=now);if(!due.length)return;
   for(const[id,row]of due){if(!timers.has(id))continue;timers.delete(id);zone.runOutsideAngular(()=>row.fn());}}throw Error('timer loop');};
 const mouse=(extra={})=>({type:'mousedown',buttons:1,detail:1,clientX:10,clientY:10,target:element,composedPath:()=>[element],...extra});
 const dispatch=event=>zone.runOutsideAngular(()=>{for(const{handler}of document.listeners.get(event.type)||[])handler.handleEvent(event);});
 const down=extra=>dispatch(mouse(extra)),up=()=>zone.run(()=>renderer.handleEvent({type:'mouseup'}));
 const cleanup=()=>{renderer._removeTriggerEvents();renderer.fadeOutAll();advance(250);for(const node of [...element.children])node.fire('transitioncancel');assert.equal(element.children.length,0);};
 return{renderer,element,target,advance,down,up,mouse,dispatch,cleanup};
}
const cases=[],mutants=[];
const check=(id,action)=>{action();assert.equal(timers.size,0,id+' timer leaked');cases.push(id);};
function held(mutation={}){const f=fixture(mutation);f.down();assert.equal(f.element.children.length,1);f.advance(400);
 assert.equal(f.element.children.length,1);f.up();f.advance(250);assert.equal(f.element.children.length,0);f.cleanup();}
function fakeMouse(mutation={}){for(const extra of[{buttons:0},{detail:0}]){const f=fixture(mutation);f.down(extra);assert.equal(f.element.children.length,0);f.cleanup();}}
function fakeTouch(mutation={}){const f=fixture(mutation);f.dispatch({type:'touchstart',target:f.element,changedTouches:[{identifier:-1,radiusX:1,radiusY:1,clientX:10,clientY:10}],composedPath:()=>[f.element]});assert.equal(f.element.children.length,0);f.cleanup();}
function coercionInput(mutation={}){const f=fixture(mutation);f.down();assert.equal(f.element.children.length,1);f.cleanup();}
function outside(mutation={}){const start=registrations.length,f=fixture(mutation);zone.run(()=>f.renderer.handleEvent(f.mouse()));
 assert.ok([...timers.values()].every(row=>row.inside===false));assert.ok(registrations.slice(start).every(row=>row.inside===false));f.advance(400);f.up();
 assert.ok([...timers.values()].every(row=>row.inside===false));f.cleanup();}
try {
 check('held-enter-and-exit-fallback',()=>held());
 check('genuine-element-ref-coercion',()=>coercionInput());
 check('raw-element-coercion',()=>{const f=fixture({}, {raw:true});f.down();assert.equal(f.element.children.length,1);f.cleanup();});
 check('screen-reader-mousedown-both-predicates',()=>fakeMouse());
 check('screen-reader-touch-predicate',()=>fakeTouch());
 check('genuine-touch-and-800ms-mouse-suppression',()=>{const f=fixture();f.dispatch({type:'touchstart',target:f.element,touches:[{identifier:1}],changedTouches:[{identifier:1,clientX:10,clientY:10}],composedPath:()=>[f.element]});
  assert.equal(f.element.children.length,1);f.down();assert.equal(f.element.children.length,1);f.advance(800);f.down();assert.equal(f.element.children.length,2);f.up();f.cleanup();});
 check('disabled-input-is-inert',()=>{const f=fixture();f.target.rippleDisabled=true;f.down();assert.equal(f.element.children.length,0);f.cleanup();});
 check('genuine-server-platform-never-registers-trigger',()=>{const start=registrations.length,f=fixture({}, {server:true});assert.equal(registrations.length,start);f.renderer._removeTriggerEvents();});
 check('genuine-zone-outside-enter-exit-pointer-registration',()=>outside());
 check('normalized-passive-options',()=>{const start=registrations.length,f=fixture();f.down();const local=registrations.slice(start).filter(row=>row.target!==document);
  assert.ok(local.length>=6);assert.ok(local.filter(row=>row.type==='mouseup').every(row=>row.capture===true));
  assert.ok(local.filter(row=>row.type==='mouseup').every(row=>passive==='true'?row.passive===true:row.passive===undefined));f.cleanup();});
 check('persistent-reference-retains-and-fades',()=>{const f=fixture(),ref=zone.run(()=>f.renderer.fadeInRipple(10,10,{persistent:true}));f.advance(400);assert.equal(ref.state,1);assert.equal(f.element.children.length,1);ref.fadeOut();f.advance(250);assert.equal(ref.state,3);f.cleanup();});
 check('native-completion-protocol-cancels-fallback',()=>{const f=fixture();f.down();f.element.children[0].fire('transitionend');assert.equal(timers.size,0);f.up();f.element.children[0].fire('transitionend');assert.equal(timers.size,0);f.cleanup();});
 for(const[id,mutation]of Object.entries(payload.mutations)){
  if(id==='insideZone'&&mode==='zoneless')continue;
  const action=id==='fakeMouse'?()=>fakeMouse(mutation):id==='fakeTouch'?()=>fakeTouch(mutation):id==='coercion'?()=>coercionInput(mutation):id==='insideZone'?()=>outside(mutation):()=>held(mutation);
  assert.throws(action,id);timers.clear();for(const rows of document.listeners.values())rows.length=0;mutants.push(id);
 }
 assert.equal(cases.length,12);
 console.log(JSON.stringify({cases,mutations:mutants,genuine_public_dependencies:['NgZone','ElementRef','Platform','normalizePassiveListenerOptions','isFakeMousedownFromScreenReader','isFakeTouchstartFromScreenReader','coerceElement'],
  complete_owned_renderer_ref_manager_helper_executed:true,actual_native_DOM_or_motion_or_hydration_executed:false}));
}finally{injector.destroy();serverInjector.destroy();app?.destroy();if(app)core.destroyPlatform();timers.clear();}
