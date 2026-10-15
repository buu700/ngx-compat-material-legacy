/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const [line,variant,entry]=process.argv.slice(2);
await import('zone.js/node');await import('@angular/compiler');
const core=await import('@angular/core'),common=await import('@angular/common'),browser=await import('@angular/platform-browser'),peer=await import('@angular/material/radio'),a11y=await import('@angular/cdk/a11y');
const {UniqueSelectionDispatcher}=await import('@angular/cdk/collections');
const legacy=line==='original'?await import('@angular/material/legacy-radio'):await import(pathToFileURL(entry));
const Group=line==='original'?legacy.MatLegacyRadioGroup:legacy._MatRadioGroupBase,Button=line==='original'?legacy.MatLegacyRadioButton:legacy._MatRadioButtonBase;
const detector={markForCheck(){}},monitor={stopMonitoring(){}};
const renderer={createElement:name=>({tagName:name}),createText:()=>({}),appendChild(){},insertBefore(){},removeChild(){},setAttribute(){},removeAttribute(){},addClass(){},removeClass(){},setProperty(){},setStyle(){},removeStyle(){},parentNode(){return null;},nextSibling(){return null;},destroy(){},listen(){return ()=>{};}};
const providers=[core.provideZoneChangeDetection(),{provide:core.PLATFORM_ID,useValue:"server"},{provide:line==='original'?common.DOCUMENT:core.DOCUMENT,useValue:{head:{children:[],querySelectorAll(){return [];}}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>renderer}}];
if(common.IMAGE_CONFIG)providers.push({provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}});
const app=await browser.createApplication({providers}),dispatcher=app.injector.get(UniqueSelectionDispatcher),element=new core.ElementRef({}),radios=[],groups=[];let context;
const failures=[],cases=[];function check(id,run){try{run();cases.push(id);}catch(error){failures.push(id);}}
try{
 context=core.createEnvironmentInjector([{provide:core.ChangeDetectorRef,useValue:detector},{provide:core.ElementRef,useValue:element},{provide:a11y.FocusMonitor,useValue:monitor},{provide:core.Renderer2,useValue:renderer}],app.injector);
 const makeGroup=()=>{const g=new Group(detector);g._radios=new core.QueryList();groups.push(g);return g;};
 const makePeerGroup=()=>{const g=core.runInInjectionContext(context,()=>line==='original'?new peer.MatRadioGroup(detector):new peer.MatRadioGroup());g._radios=new core.QueryList();groups.push(g);return g;};
 const own=makeGroup(),modern=makePeerGroup();
 const makeOwn=group=>{const radio=new Button(group,element,detector,monitor,dispatcher);radios.push(radio);return radio;};
 const makePeer=group=>{const radio=core.runInInjectionContext(context,()=>line==='original'?new peer.MatRadioButton(group,element,detector,monitor,dispatcher):new peer.MatRadioButton());radio.radioGroup=group;radios.push(radio);return radio;};
 const ownRadio=makeOwn(own),peerRadio=makePeer(modern),peerExtra=[makePeer(null),makePeer(null)];
 own._radios.reset([ownRadio]);modern._radios.reset([peerRadio]);own.value='legacy-value';modern.value='peer-value';ownRadio.value=own.value;peerRadio.value=modern.value;ownRadio.ngOnInit();peerRadio.ngOnInit();own.ngAfterContentInit();modern.ngAfterContentInit();
 const initial={own_name:own.name,peer_name:modern.name,own_id:ownRadio.id,peer_ids:[peerRadio,...peerExtra].map(r=>r.id)};
 check('generated-button-identities',()=>{const ids=[ownRadio,...[peerRadio,...peerExtra]].map(r=>r.id);assert.equal(new Set(ids).size,ids.length);assert.equal(ownRadio.inputId,ownRadio.id+'-input');});
 check('default-group-independence',()=>{assert.equal(ownRadio.checked,true);assert.equal(peerRadio.checked,true);ownRadio.checked=false;ownRadio._onInputInteraction({stopPropagation(){}});assert.equal(ownRadio.checked,true);assert.equal(peerRadio.checked,true);assert.notEqual(own.name,modern.name);});
 check('explicit-shared-name-selects-across-generations',()=>{own.name=modern.name;ownRadio.checked=false;peerRadio.checked=true;ownRadio._onInputInteraction({stopPropagation(){}});assert.equal(ownRadio.checked,true);assert.equal(peerRadio.checked,false);});
 check('explicit-id-and-input-fallback',()=>{const generated=ownRadio.id;ownRadio.id='consumer-radio';assert.equal(ownRadio.inputId,'consumer-radio-input');ownRadio.id='';assert.equal(ownRadio.inputId,generated+'-input');ownRadio.id=generated;});
 check('generated-legacy-repetition-and-explicit-name',()=>{const next=makeGroup(),nextButton=makeOwn(next);assert.notEqual(next.name,initial.own_name);assert.notEqual(nextButton.id,initial.own_id);next.name='consumer-group';nextButton.value='x';next._radios.reset([nextButton]);nextButton.ngOnInit();assert.equal(next.name,'consumer-group');assert.equal(nextButton.name,'consumer-group');});
 check('listener-unregistration',()=>{ownRadio.ngOnDestroy();const selected=ownRadio.checked;dispatcher.notify('other-id',ownRadio.name);assert.equal(ownRadio.checked,selected);});
 console.log(JSON.stringify({line,variant,cases,failures,initial,actual_owned_full_base_modules:line!=='original',genuine_tagged_legacy_public_classes:line==='original',genuine_public_peer_group_and_button_constructors:true,default_root_dispatcher:true,platform_id:"server",document_renderer_element_focus_and_detector_protocol:true,whole_angular_component_node_qualified:false}));
}finally{for(const radio of radios)radio.ngOnDestroy();for(const group of groups)group.ngOnDestroy();context?.destroy();app.destroy();core.destroyPlatform();}
