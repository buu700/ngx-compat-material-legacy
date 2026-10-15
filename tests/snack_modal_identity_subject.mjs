/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [line,family,order,entry,clearFirst]=process.argv.slice(2);
await import('zone.js/node');await import('@angular/compiler');
const core=await import('@angular/core'),common=await import('@angular/common'),browser=await import('@angular/platform-browser'),a11y=await import('@angular/cdk/a11y'),platformNS=await import('@angular/cdk/platform'),corePeer=await import('@angular/material/core'),{Subject}=await import('rxjs');
const resources=JSON.parse(readFileSync(new URL('./resources.json',import.meta.url))),requests=[],resourceErrors=[];
globalThis.fetch=async request=>{const url=String(request),resource=resources.find(r=>r.url===url);if(!resource){resourceErrors.push(url);throw Error('Unexpected owned resource '+url);}requests.push({url,sha256:resource.sha256,bytes:resource.bytes});return new Response(resource.text,{headers:{'Content-Type':'text/plain; charset=utf-8'}});};
const route=family==='tab-link'||family==='tab-panel'?'tabs':family,peer=await import('@angular/material/'+route),legacy=line==='original'?await import('@angular/material/legacy-'+route):await import(pathToFileURL(entry));
await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(resourceErrors,[]);
let doc;const makeElement=(tag='div')=>{const attributes=new Map(),classes=new Set();return {nodeType:1,nodeName:tag.toUpperCase(),tagName:tag.toUpperCase(),ownerDocument:doc,style:{},classList:{add(...names){names.forEach(n=>classes.add(n));},remove(...names){names.forEach(n=>classes.delete(n));},contains:name=>classes.has(name),toggle(name){if(classes.has(name)){classes.delete(name);return false;}classes.add(name);return true;}},setAttribute:(n,v)=>attributes.set(n,String(v)),getAttribute:n=>attributes.get(n)??null,hasAttribute:n=>attributes.has(n),removeAttribute:n=>attributes.delete(n),addEventListener(){},removeEventListener(){},focus(){},blur(){},appendChild(){},removeChild(){},querySelector(){return null;},querySelectorAll(){return [];},getRootNode:()=>doc,getBoundingClientRect:()=>({top:0,left:0,right:10,bottom:10,width:10,height:10}),clientWidth:10,clientHeight:10,offsetWidth:10,offsetHeight:10,isConnected:false};};
doc={head:{children:[],querySelectorAll(){return [];},appendChild(){}},createElement:makeElement,querySelectorAll(){return [];},querySelector(){return null;},getElementsByClassName(){return [];},addEventListener(){},removeEventListener(){}};doc.body=makeElement('body');doc.documentElement=makeElement('html');
const modal=makeElement();modal.setAttribute('aria-owns','fixture-preserved');doc.querySelectorAll=selector=>selector==='body > .cdk-overlay-container [aria-modal="true"]'?[modal]:[];
const detector={markForCheck(){},detectChanges(){}},element=new core.ElementRef(makeElement());
const renderer={createElement:makeElement,createText:()=>({}),appendChild(){},insertBefore(){},removeChild(){},setAttribute(){},removeAttribute(){},addClass(){},removeClass(){},setProperty(){},setStyle(){},removeStyle(){},parentNode(){return null;},nextSibling(){return null;},destroy(){},listen(){return ()=>{};},selectRootElement:node=>node};
const monitor={monitor:()=>new Subject(),stopMonitoring(){},focusVia(){}},live={announce:async()=>{},clear(){}},viewport={change:()=>new Subject(),getViewportSize:()=>({width:800,height:600}),getViewportRect:()=>({top:0,left:0,width:800,height:600}),getViewportScrollPosition:()=>({top:0,left:0})};
const providers=[core.provideZoneChangeDetection(),{provide:core.PLATFORM_ID,useValue:'server'},{provide:line==='original'?common.DOCUMENT:core.DOCUMENT,useValue:doc},{provide:core.RendererFactory2,useValue:{createRenderer:()=>renderer}},{provide:a11y.FocusMonitor,useValue:monitor},{provide:a11y.LiveAnnouncer,useValue:live}];
if(common.IMAGE_CONFIG)providers.push({provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}});
if(peer.MatSnackBarConfig)providers.push({provide:peer.MatSnackBarConfig,useValue:new peer.MatSnackBarConfig()});
const app=await browser.createApplication({providers});let context;
try{
 context=core.createEnvironmentInjector([{provide:core.ChangeDetectorRef,useValue:detector},{provide:core.ElementRef,useValue:element},{provide:core.Renderer2,useValue:renderer},{provide:core.ViewContainerRef,useValue:{element,injector:app.injector,length:0}},{provide:core.ANIMATION_MODULE_TYPE,useValue:'NoopAnimations'}],app.injector);
 const zone=context.get(core.NgZone),platform=context.get(platformNS.Platform),matcher=context.get(corePeer.ErrorStateMatcher),scroll=()=>({enable(){},disable(){},attach(){},detach(){}});
 const defaults=family==='autocomplete'?context.get(peer.MAT_AUTOCOMPLETE_DEFAULT_OPTIONS):family==='menu'?context.get(peer.MAT_MENU_DEFAULT_OPTIONS):{};
 let ownArgs,peerArgs,Own,Peer,fields;
 if(family==='autocomplete'){Own=legacy.MatLegacyAutocomplete;Peer=peer.MatAutocomplete;ownArgs=[detector,element,defaults,platform];peerArgs=ownArgs;fields=[['autocomplete','id']];}
 if(family==='menu'){Own=legacy.MatLegacyMenu;Peer=peer.MatMenu;ownArgs=[element,zone,defaults,detector];peerArgs=ownArgs;fields=[['menu-panel','panelId']];}
 if(family==='select'){Own=legacy.MatLegacySelect;Peer=peer.MatSelect;ownArgs=[viewport,detector,zone,matcher,element,null,null,null,null,null,'0',scroll,live,{},context];peerArgs=ownArgs;fields=[['select','id'],['select-value','_valueId']];}
 if(family==='snack-bar'){Own=legacy.MatLegacySnackBarContainer;Peer=peer.MatSnackBarContainer;ownArgs=[zone,element,detector,platform,new peer.MatSnackBarConfig()];peerArgs=ownArgs;fields=[['snack-live','_liveElementId']];}
 if(family==='tab-panel'){Own=legacy.MatLegacyTabNavPanel;Peer=peer.MatTabNavPanel;ownArgs=[];peerArgs=[];fields=[['tab-panel','id']];}
 if(family==='tab-link'){
  const navArgs=[element,null,zone,detector,viewport,platform,'NoopAnimations'];
  const peerNav=core.runInInjectionContext(context,()=>line==='original'?new peer.MatTabNav(...navArgs,{}):new peer.MatTabNav());
  const ownNav=core.runInInjectionContext(context,()=>new legacy.MatLegacyTabNav(...navArgs));
  const child=core.createEnvironmentInjector([{provide:peer.MatTabNav,useValue:peerNav}],context);context=child;
  Own=legacy.MatLegacyTabLink;Peer=peer.MatTabLink;ownArgs=[ownNav,element,zone,platform,null,'0',monitor,'NoopAnimations'];peerArgs=[peerNav,element,null,'0',monitor,'NoopAnimations'];fields=[['tab-link','id']];
 }
 assert.equal(typeof Own,'function');assert.equal(typeof Peer,'function');
 const createOwn=()=>core.runInInjectionContext(context,()=>new Own(...ownArgs)),createPeer=()=>core.runInInjectionContext(context,()=>line==='original'?new Peer(...peerArgs):new Peer());
 let own,peers;if(order==='legacy-first'){own=createOwn();peers=Array.from({length:family==='select'?2:1},createPeer);}else{peers=Array.from({length:family==='select'?2:1},createPeer);own=createOwn();}
 assert.ok(own instanceof Own);assert.ok(peers.every(item=>item instanceof Peer));
 assert.equal(family,'snack-bar');assert.ok(['legacy','current'].includes(clearFirst));
 const items={legacy:own,current:peers[0]},alive=new Set(['legacy','current']),modalStages=[];
 const capture=stage=>{const tokens=(modal.getAttribute('aria-owns')||'').split(/\s+/).filter(Boolean),expected=['fixture-preserved',...[...alive].map(name=>items[name]._liveElementId)];modalStages.push({stage,tokens,expected,okay:JSON.stringify([...tokens].sort())===JSON.stringify([...expected].sort())});};
 const exposeOrder=order==='legacy-first'?['legacy','current']:['current','legacy'];
 for(const name of exposeOrder)items[name]._exposeToModals();capture('opened');
 for(const name of [clearFirst,clearFirst==='legacy'?'current':'legacy']){items[name]._clearFromModals();alive.delete(name);capture('cleared-'+name);}

 const values=fields.map(([role,key])=>{const ownValue=own[key],peerValues=peers.map(item=>item[key]);assert.ok([ownValue,...peerValues].every(v=>typeof v==='string'&&v.length>0),'generated identity value must be a string');return {role,property:key,legacy:ownValue,peers:peerValues,unique:!peerValues.includes(ownValue)};});
 let explicit=null;if(['autocomplete','select','tab-link','tab-panel'].includes(family)){own.id='consumer-identity';assert.equal(own.id,'consumer-identity');explicit={id:own.id,preserved:true};}
 assert.deepEqual(resourceErrors,[]);console.log(JSON.stringify({line,family,order,clear_first:clearFirst,modal_stages:modalStages,actual_whole_modal_methods_executed:true,actual_modal_nodes_or_overlay_lifecycle_qualified:false,values,explicit,resource_requests:requests,actual_public_peer_constructors:true,genuine_tagged_legacy_constructors:line==='original',complete_owned_leaf_graph_constructed:line!=='original',platform_id:'server',document_renderer_element_services_resource_text_protocols:true,raw_stylesheets_not_compiled_or_rendered:true,actual_angular_nodes_or_native_or_packed_qualified:false}));
}finally{context?.destroy();app.destroy();core.destroyPlatform();}
