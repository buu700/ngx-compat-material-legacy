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
const [line,order,stage,optionEntry,groupEntry]=process.argv.slice(2);
await import('zone.js/node');await import('@angular/compiler');
const core=await import('@angular/core'),common=await import('@angular/common'),browser=await import('@angular/platform-browser'),peer=await import('@angular/material/core');
const resources=JSON.parse(readFileSync(new URL('./resources.json',import.meta.url))),resourceRequests=[],resourceErrors=[];
// Serve the exact local resource text through the public fetch protocol. This does
// not compile Sass or claim component-node/style rendering.
globalThis.fetch=async request=>{const url=String(request),resource=resources.find(r=>r.url===url);if(!resource){resourceErrors.push(url);throw Error('Unexpected resource URL '+url);}resourceRequests.push({url,sha256:resource.sha256,bytes:resource.bytes});return new Response(resource.text,{headers:{'Content-Type':'text/plain; charset=utf-8'}});};
const legacy=line==='original'?await import('@angular/material/legacy-core'):{...await import(pathToFileURL(optionEntry)),...await import(pathToFileURL(groupEntry))};
await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(resourceErrors,[]);
const detector={markForCheck(){}},element=new core.ElementRef({});
const renderer={createElement:name=>({tagName:name}),createText:()=>({}),appendChild(){},insertBefore(){},removeChild(){},setAttribute(){},removeAttribute(){},addClass(){},removeClass(){},setProperty(){},setStyle(){},removeStyle(){},parentNode(){return null;},nextSibling(){return null;},destroy(){},listen(){return ()=>{};}};
const providers=[core.provideZoneChangeDetection(),{provide:core.PLATFORM_ID,useValue:'server'},{provide:line==='original'?common.DOCUMENT:core.DOCUMENT,useValue:{head:{children:[],querySelectorAll(){return [];}}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>renderer}}];
if(common.IMAGE_CONFIG)providers.push({provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}});
const app=await browser.createApplication({providers});let context;const options=[];
try{
 context=core.createEnvironmentInjector([{provide:core.ChangeDetectorRef,useValue:detector},{provide:core.ElementRef,useValue:element},{provide:core.Renderer2,useValue:renderer}],app.injector);
 const createOwn=()=>{const group=new legacy.MatLegacyOptgroup(null),option=new legacy.MatLegacyOption(element,detector,null,group);options.push(option);return {group,option};};
 const createPeer=()=>core.runInInjectionContext(context,()=>{const group=line==='original'?new peer.MatOptgroup(null):new peer.MatOptgroup(),option=line==='original'?new peer.MatOption(element,detector,null,group):new peer.MatOption();options.push(option);return {group,option};});
 let own,modern;if(order==='legacy-first'){own=createOwn();modern=createPeer();}else{modern=createPeer();own=createOwn();}
 assert.ok(own.option instanceof legacy.MatLegacyOption&&own.group instanceof legacy.MatLegacyOptgroup);assert.ok(modern.option instanceof peer.MatOption&&modern.group instanceof peer.MatOptgroup);
 const ids={option:{legacy:own.option.id,peer:modern.option.id},optgroup:{legacy:own.group._labelId,peer:modern.group._labelId}};
 for(const value of Object.values(ids).flatMap(row=>Object.values(row)))assert.ok(typeof value==='string'&&value.length>0);
 own.option.id='consumer-option';assert.equal(own.option.id,'consumer-option');own.group.label='Consumer label';assert.equal(own.group.label,'Consumer label');
 const parentsShared=line==='original'&&Object.getPrototypeOf(legacy.MatLegacyOption)===Object.getPrototypeOf(peer.MatOption)&&Object.getPrototypeOf(legacy.MatLegacyOptgroup)===Object.getPrototypeOf(peer.MatOptgroup);if(line==='original')assert.equal(parentsShared,true);
 assert.deepEqual(resourceErrors,[]);
 console.log(JSON.stringify({line,order,stage,ids,resource_requests:resourceRequests,raw_SCSS_source_protocol_not_compilation:true,option_ids_unique:ids.option.legacy!==ids.option.peer,optgroup_label_ids_unique:ids.optgroup.legacy!==ids.optgroup.peer,explicit_option_input_preserved:true,group_label_input_preserved:true,actual_public_peer_constructors:true,tagged_genuine_legacy_constructors:line==='original',actual_complete_owned_leaf_modules:line!=='original',tagged_public_legacy_and_modern_parents_identical:parentsShared,platform_id:'server',document_renderer_element_change_detector_protocol:true,whole_angular_node_or_native_or_packed_qualified:false}));
}finally{for(const option of options)option.ngOnDestroy();context?.destroy();app.destroy();core.destroyPlatform();}
