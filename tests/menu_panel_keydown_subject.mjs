/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real parser/dispatcher with explicit renderer/body/overlay/menu protocols. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseTemplate} from '@angular/compiler';
import * as core from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {OverlayKeyboardDispatcher} from '@angular/cdk/overlay';
import {FocusKeyManager} from '@angular/cdk/a11y';
import * as keycodes from '@angular/cdk/keycodes';
import {Subject,Subscription} from 'rxjs';
const payload=JSON.parse(readFileSync(new URL('./menu-keydown-payload.json',import.meta.url))),line=process.argv[2];
function events(source){
 const result=parseTemplate(source,'menu-keydown-source.html',{});assert.equal(result.errors,null,JSON.stringify(result.errors));const rows=[];
 function walk(nodes,path=[]){for(const [index,node]of nodes.entries()){
  const next=[...path,(node.name||node.tagName||node.constructor.name)+':'+index];
  for(const event of node.outputs||[])rows.push({name:event.name,target:event.target??null,phase:event.phase??null,handler:event.handler.source.replace(/\s+/g,''),element:node.name||node.tagName,path:next});
  if(node.children)walk(node.children,next);
  if(node.branches)walk(node.branches,next);
  if(node.cases)walk(node.cases,next);
  if(node.empty)walk([node.empty],next);
 }}walk(result.nodes);return rows;
}
assert.equal(events(payload.original).filter(event=>event.name==='keydown').length,1);
const singleRoute=source=>events(source).filter(event=>event.name==='keydown').length===0;
assert.equal(singleRoute(payload.current),true,'overlay route has no duplicate panel keydown listener');
assert.equal(singleRoute(payload.current.replace('    [ngClass]="_classList"','    [ngClass]="_classList"\n    (keydown)="_handleKeydown($event)"')),false);
let dispatcherObservation=null,mutantsRejected=0;
if(line!=='original'){
 function execute(createOverlay,handler){
  const makeMenu=new Function(...payload.keycodeNames,handler+';return MenuProtocol;');
  const Menu=makeMenu(...payload.keycodeNames.map(name=>keycodes[name]));
  const Trigger=new Function('_MatMenuBase',createOverlay+';return TriggerProtocol;')(Menu);
  const body=new EventTarget(),trace=[],closed=[],refs=[],items=[],managers=[];let listened=0,cleaned=0,created=0;
  const zone={run:fn=>fn(),runOutsideAngular:fn=>fn()};
  const renderer={listen:(target,name,callback)=>{assert.equal(target,'body');assert.equal(name,'keydown');listened++;body.addEventListener(name,callback);return()=>{cleaned++;body.removeEventListener(name,callback);};}};
  const injector=core.Injector.create({providers:[{provide:core.DOCUMENT||DOCUMENT,useValue:{body}},{provide:core.NgZone,useValue:zone},{provide:core.RendererFactory2,useValue:{createRenderer:()=>renderer}}]});
  const dispatcher=core.runInInjectionContext(injector,()=>new OverlayKeyboardDispatcher());
  const make=(name,parent)=>{
   const menu=new Menu(),focus=[];
   const choices=[0,1,2].map(index=>({disabled:index===1,focus:origin=>focus.push([index,origin])}));items.push(choices);
   const manager=new FocusKeyManager(choices).withWrap();managers.push(manager);manager.setFirstItemActive();
   Object.assign(menu,{_keyManager:manager,parentMenu:parent?.menu,direction:'ltr',closed:{emit:reason=>{closed.push([name,reason]);dispatcher.remove(ref);}}});
   const actualHandler=menu._handleKeydown;menu._handleKeydown=function(event){trace.push([name,event]);return actualHandler.call(this,event);};
   const stream=new Subject(),ref={_keydownEvents:stream,keydownEvents:()=>stream.asObservable(),hasAttached:()=>true};refs.push(ref);
   const trigger=Object.create(Trigger.prototype);Object.assign(trigger,{menu,_overlayRef:null,_keydownSubscription:Subscription.EMPTY,_getOverlayConfig:()=>({positionStrategy:{}}),_subscribeToPositions:()=>{},_overlay:{create:()=>{created++;return ref;}}});
   assert.equal(trigger._createOverlay(menu),ref);assert.equal(trigger._createOverlay(menu),ref);assert.equal(stream.observers.length,1);
   return {menu,manager,focus,ref,trigger};
  };
  const event=code=>{const value=new Event('keydown',{bubbles:true,cancelable:true});Object.defineProperties(value,{keyCode:{value:code},shiftKey:{value:false},altKey:{value:false},ctrlKey:{value:false},metaKey:{value:false}});const previous=trace.length;body.dispatchEvent(value);assert.equal(trace.length,previous+1,'one delivery per body event');assert.equal(trace.at(-1)[1],value,'same original event forwarded');return value;};
  try{
   const parent=make('parent',null);dispatcher.add(parent.ref);event(40);assert.equal(parent.manager.activeItemIndex,2);
   const child=make('child',parent);dispatcher.add(child.ref);event(40);assert.equal(child.manager.activeItemIndex,2);assert.equal(parent.manager.activeItemIndex,2);
   dispatcher.add(child.ref);event(40);assert.equal(child.manager.activeItemIndex,0,'duplicate add does not double-deliver');
   const empty={_keydownEvents:new Subject()};dispatcher.add(empty);event(40);assert.equal(child.manager.activeItemIndex,2);dispatcher.remove(empty);
   const rejected={_keydownEvents:new Subject(),eventPredicate:()=>false};const rejectedSubscription=rejected._keydownEvents.subscribe(()=>assert.fail('rejected overlay received event'));dispatcher.add(rejected);event(40);assert.equal(child.manager.activeItemIndex,0);dispatcher.remove(rejected);rejectedSubscription.unsubscribe();
   const back=event(37);assert.deepEqual(closed,[['child','keydown']]);assert.equal(back.defaultPrevented,false);assert.equal(parent.manager.activeItemIndex,2);
   const escape=event(27);assert.deepEqual(closed,[['child','keydown'],['parent','keydown']]);assert.equal(escape.defaultPrevented,true);assert.equal(trace.at(-1)[0],'parent');
   assert.equal(created,2,'each owned trigger creates its overlay once');assert.equal(listened,1);assert.equal(cleaned,1);
   const before=trace.length;body.dispatchEvent(new Event('keydown'));assert.equal(trace.length,before,'no listener after final overlay removal');
   return {events:trace.length,topmost_only:true,same_event:true,duplicate_add_deduplicated:true,empty_and_predicate_rejected_overlays_skipped:true,child_close_does_not_redeliver_to_parent:true,disabled_item_skipped:true,listener_registered:listened,listener_removed:cleaned};
  }finally{dispatcher.ngOnDestroy();for(const ref of refs)ref._keydownEvents.complete();for(const manager of managers)manager.destroy();injector.destroy();}
 }
 dispatcherObservation=execute(payload.createOverlay,payload.handler);
 for(const [createOverlay,handler]of payload.mutants){assert.throws(()=>execute(createOverlay,handler));mutantsRejected++;}
}
const census=[];
for(const row of payload.templates){
 if(row.original_source===null){census.push({path:row.path,mapping:row.mapping,unmapped:true});continue;}
 try{
  const old=events(row.original_source),current=events(row.current_source),key=event=>JSON.stringify(event),ordinary=old.filter(event=>event.phase===null),currentSet=new Set(current.map(key)),oldSet=new Set(old.map(key));
  const semantic=({path,...event})=>JSON.stringify(event),semanticCurrent=new Set(current.map(semantic));
  census.push({path:row.path,mapping:row.mapping,original_events:old.length,current_events:current.length,original_ordinary_missing:ordinary.filter(event=>!currentSet.has(key(event))),candidate_added:current.filter(event=>!oldSet.has(key(event))),semantic_ordinary_missing:[...new Map(ordinary.filter(event=>!semanticCurrent.has(semantic(event))).map(event=>[semantic(event),event])).values()],path_or_structural_wrapper_differences_are_not_missing_behavior:true});
 }catch(error){census.push({path:row.path,mapping:row.mapping,parse_error:String(error)});}
}
if(line!=='original'){
 const observed=path=>events(payload.templates.find(row=>row.path.endsWith(path)).current_source);
 assert.ok(observed('legacy-snack-bar/simple-snack-bar.html').some(event=>event.name==='click'&&event.handler==='action()'),'walk current @if branches');
 const paginator=observed('legacy-paginator/paginator.html');
 for(const handler of ['firstPage()','lastPage()','_changePageSize($event.value)'])assert.ok(paginator.some(event=>event.handler===handler),'walk nested current @if: '+handler);
 assert.ok(observed('legacy-tabs/tab-group.html').some(event=>event.name==='click'&&event.handler==='_handleClick(tab,tabHeader,i)'),'walk current @for children');
}
console.log(JSON.stringify({line,original_panel_keydown:1,current_panel_keydown:0,duplicate_panel_binding_rejected:true,dispatcher:dispatcherObservation,mutants_rejected:mutantsRejected,template_census:census,
 scope:'Genuine public parser and current CDK dispatcher/FocusKeyManager with Node EventTarget body and renderer/overlay/item/menu-identity protocols. Complete owned createOverlay and handleKeydown methods replay; no whole component construction, Angular node/template listener registration, actual OverlayRef, native DOM/packed/AOT or canonical floor qualification.'}));
