/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual public modules and QueryLists; item callbacks and keyboard events are protocols. */
import assert from 'node:assert/strict';
import {keyManagerPublicSubjects} from '../scripts/key-manager-public-subjects.mjs';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const key=(keyCode,key='')=>({keyCode,key,altKey:false,ctrlKey:false,shiftKey:false,metaKey:false,prevented:0,preventDefault(){this.prevented++;}});
async function exercise(model){
 const observations={},queryLists=[],managers=[],events=[];
 const items=['Alpha','Beta','Gamma'].map((label,index)=>({id:index,disabled:index===1,getLabel(){return label;},focus(origin){events.push(['focus',index,origin]);},setActiveStyles(){events.push(['active',index]);},setInactiveStyles(){events.push(['inactive',index]);}}));
 const query=()=>{const list=new model.framework.runtime.QueryList();list.reset(items);list.notifyOnChanges();queryLists.push(list);return list;};
 const manager=(name,collection)=>{const value=new model.runtime[name](collection);managers.push(value);return value;};
 try{
  const focus=manager('FocusKeyManager',query()).withWrap().withHomeAndEnd().setFocusOrigin('keyboard');
  focus.setFirstItemActive();focus.setNextItemActive();focus.setNextItemActive();assert.deepEqual(events,[['focus',0,'keyboard'],['focus',2,'keyboard'],['focus',0,'keyboard']]);
  observations.focus_wrap_disabled_and_origin=events.splice(0);
  const active=manager('ActiveDescendantKeyManager',query()).withWrap();active.setFirstItemActive();active.setNextItemActive();assert.equal(active.activeItem,items[2]);
  observations.active_descendant_style_order=events.splice(0);
  const list=manager('ListKeyManager',items).withWrap().withHomeAndEnd().withPageUpDown(true,1).withHorizontalOrientation('ltr');
  const changes=[];list.change.subscribe(value=>changes.push(value));
  list.setActiveItem(0);for(const code of [39,35,36,34,33]){const event=key(code);list.onKeydown(event);assert.equal(event.prevented,1);}
  observations.array_horizontal_home_end_page={changes:[...changes],active_item:list.activeItem.id,active_index:list.activeItemIndex};
  list.withHorizontalOrientation('rtl');list.setActiveItem(0);list.onKeydown(key(39));observations.rtl_right_arrow=list.activeItemIndex;
  const before=list.activeItemIndex,blocked=key(40);blocked.ctrlKey=true;list.onKeydown(blocked);assert.equal(list.activeItemIndex,before);assert.equal(blocked.prevented,0);observations.disallowed_modifier_preserved=true;
  list.withAllowedModifierKeys(['shiftKey']);const shift=key(40);shift.shiftKey=true;list.onKeydown(shift);observations.allowed_shift_down=list.activeItemIndex;
  list.skipPredicate(()=>false);list.setActiveItem(0);list.onKeydown(key(40));assert.equal(list.activeItem,items[1]);observations.custom_skip_reaches_disabled=list.activeItemIndex;
  let tabbed=0;list.tabOut.subscribe(()=>tabbed++);const tab=key(9);list.onKeydown(tab);assert.equal(tabbed,1);assert.equal(tab.prevented,0);observations.tab_out=tabbed;
  const dynamicQuery=query(),dynamic=manager('FocusKeyManager',dynamicQuery);const dynamicChanges=[];dynamic.change.subscribe(value=>dynamicChanges.push(value));dynamic.setActiveItem(items[2]);
  dynamicQuery.reset([items[2],items[0]]);dynamicQuery.notifyOnChanges();observations.query_reorder={active_index:dynamic.activeItemIndex,active_id:dynamic.activeItem?.id??null,changes:[...dynamicChanges]};
  dynamicQuery.reset([items[0]]);dynamicQuery.notifyOnChanges();observations.query_active_removal={active_index:dynamic.activeItemIndex,active_id:dynamic.activeItem?.id??null,changes:[...dynamicChanges]};events.length=0;
  let completed=0;dynamic.change.subscribe({complete(){completed++;}});dynamic.tabOut.subscribe({complete(){completed++;}});dynamic.destroy();const stateBefore=dynamic.activeItemIndex;dynamicQuery.reset(items);dynamicQuery.notifyOnChanges();assert.equal(dynamic.activeItemIndex,stateBefore);assert.equal(completed,2);observations.destroy_unsubscribes_query_and_completes=completed;events.length=0;
  const typedItems=items.map(item=>({...item,disabled:false})),typeahead=manager('FocusKeyManager',typedItems).withTypeAhead(5);const event=key(71,'g');typeahead.onKeydown(event);assert.equal(typeahead.isTyping(),true);await pause(40);assert.equal(typeahead.activeItem,typedItems[2]);assert.equal(typeahead.isTyping(),false);observations.typeahead_debounced_selection={active_index:typeahead.activeItemIndex,events:events.splice(0)};
  const pending=manager('FocusKeyManager',typedItems).withTypeAhead(5);pending.onKeydown(key(65,'a'));pending.destroy();await pause(40);assert.deepEqual(events,[]);observations.destroy_cancels_pending_typeahead=true;
  const empty=manager('FocusKeyManager',[]).withWrap();empty.setFirstItemActive();empty.setNextItemActive();empty.setPreviousItemActive();observations.empty={active_index:empty.activeItemIndex,active_item:empty.activeItem};
  return observations;
 }finally{for(const value of managers)value.destroy();for(const value of queryLists)value.destroy();}
}
const subjects=await keyManagerPublicSubjects(),observations=[];
try{
 for(const model of subjects.models){
  const result=await exercise(model);if(observations.length)assert.deepEqual(result,observations[0].cases,'public key-manager behavior differs from authentic tagged subject');
  observations.push({line:model.subject.line,framework:model.subject.framework_version,cdk:model.subject.cdk_version,cases:result,query_list_and_array_constructors_outside_DI:true,public_entry:model.public_entry,complete_runtime_modules:model.complete_runtime_modules});
 }
 console.log(JSON.stringify({schema_version:1,observations,subject_capsule_sha256:subjects.capsule_sha256,rxjs:subjects.rxjs,node:process.version,native_execution:false,scope:'Complete public a11y entrypoints with genuine matching compiler/Core/Common/platform-browser and QueryLists; item callbacks/keyboard events are protocols, not owned Angular views or native dispatch',g11_claim:'not-passed'},null,2));
}finally{subjects.dispose();}
