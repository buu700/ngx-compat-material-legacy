/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic observation only; never native execution evidence. */
import {CONTENT_OBSERVER_STAGES} from '../scripts/content-observer-native-contract.mjs';
const record=(type,target_type,added_types=[],removed_types=[])=>({native:true,type,target_type,added_types,removed_types});
export function contentObserverNativeSample(zoneless){
  const stages=CONTENT_OBSERVER_STAGES.map(id=>{
    const comment=id.startsWith('comment-'),destroyed=['destroyed-owner','reobserve-detached','final-unsubscribe'].includes(id);
    let raw=[record('childList',1,[comment?8:3])];
    if(id==='comment-edit')raw=[record('characterData',8)];
    if(id==='comment-remove')raw=[record('childList',1,[],[8])];
    if(['text-edit','text-same','reobserve-detached','final-unsubscribe'].includes(id))raw=[record('characterData',3)];
    if(id==='text-remove')raw=[record('childList',1,[],[3])];
    if(id==='mixed-add')raw=[record('childList',1,[8,3])];
    if(id==='mixed-remove')raw=[record('childList',1,[],[8]),record('childList',1,[],[3])];
    const events=comment||['shared-after-unsubscribe','destroyed-owner','final-unsubscribe'].includes(id)?0:1,owned=comment||destroyed?0:1;
    return {id,raw_records:raw,delivered_records:events?(id==='mixed-remove'?[raw[1]]:structuredClone(raw)):[],public_events:events,
      public_zones:Array(events).fill(!zoneless),owned_callbacks:owned,owned_zones:Array(owned).fill(!zoneless),
      pagination_calls:owned&&id!=='text-same'?1:0,text_changed:!comment&&id!=='text-same',cache_matches_text:!destroyed,
      owner_destroyed:destroyed,owner_connected:!destroyed};
  });
  return {execution:'packed-native-content-observer-legacy-header',error:null,zoneless,mutations_outside_angular:true,
    identity:{public_content_observer:true,owned_legacy_header:true,legacy_structure:true,shared_native_observer:true},
    calibration:{text_add_notified:true,text_remove_notified:true},initial_native_generations:1,stages,
    native_generations:[{id:1,observes:1,disconnects:1,active:false},{id:3,observes:1,disconnects:1,active:false}],
    cleanup:{owned_header_destroyed:true,direct_subscription_closed:true,fresh_subscription_closed:true,control_disconnected:true,trace_restored:true}};
}
export {record as contentObserverNativeRecord};
