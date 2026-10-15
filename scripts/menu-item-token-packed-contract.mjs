/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const MENU_ITEM_TOKEN_CASE_ID='packed-consumer/harness/nested-menu-item-token-ownership';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const kinds=['child-disabled','child-first','first','sibling-item','submenu','wrapped'];
const truth=(value,fields)=>fields.every(field=>value?.[field]===true);
/** Complete actual-node observations only; synthetic data tests admission itself. */
export function packedMenuItemTokenCase(observed){
 let okay=false;
 try{
  const demand=value=>{if(!value)throw Error('Missing nested menu token observation');};
  demand(observed?.execution==='packed-angular-testbed-dom'&&observed.error===null);
  demand(Array.isArray(observed.generations)&&observed.generations.length===2);
  for(const generation of ['legacy','current']){
   const found=observed.generations.filter(row=>row.generation===generation);demand(found.length===1);const row=found[0],legacy=generation==='legacy';
   demand(row.ancestor_decoy_present===true&&Array.isArray(row.cycles)&&row.cycles.length===2);
   for(const [index,cycle]of row.cycles.entries()){
    demand(cycle.cycle===index&&cycle.fresh_instances===true);
    demand(same(cycle.queries,{all:['child-disabled','child-first','first','submenu','wrapped'],direct:['first','submenu','wrapped'],shallow:['first','submenu'],child:['child-disabled','child-first'],sibling:['sibling-item']}));
    demand(cycle.peer_token_query_count===6&&cycle.legacy_item_query_count===(legacy?6:0));
    demand(Array.isArray(cycle.providers)&&cycle.providers.length===6&&same(cycle.providers.map(provider=>provider.kind),kinds));
    for(const provider of cycle.providers)demand(provider.public_token_is_item===true&&provider.parent_matches===true&&provider.owned_instance===legacy&&provider.peer_instance===!legacy);
    demand(truth(cycle,['root_optional_self_null','sibling_optional_self_null','submenu_self_item','submenu_parent_root','submenu_mode','initial_closed']));
    demand(truth(cycle.opened,['root_open','child_open','sibling_closed','root_focus_after_down','child_focus_after_right','root_panel_resolves','child_panel_resolves','root_controls','child_controls','distinct_panels','child_parent_root','root_direct_unchanged','generation_structure']));
    demand(truth(cycle.back,['root_open','child_closed','focus_submenu','child_panel_removed','child_aria_closed']));
    demand(truth(cycle.closed,['root_closed','child_closed','root_panel_removed','child_panel_removed','root_aria_closed','focus_root_trigger']));
    demand(truth(cycle.sibling,['sibling_open','root_closed','child_closed','own_panel_resolves','own_controls','own_query_only']));
    demand(truth(cycle.reopened,['root_open','child_open','sibling_closed','root_panel_resolves','child_panel_resolves','same_self_item']));
    demand(cycle.removed?.items_destroyed===12&&cycle.removed.subjects_closed===true&&cycle.removed.known_panels_remaining===0&&cycle.removed.item_nodes_disconnected===true&&cycle.removed.remaining_item_tokens===0&&cycle.removed.remaining_triggers===0);
   }
   demand(truth(row.cleanup,['fixture_destroyed','item_nodes_disconnected','own_subscriptions_closed'])&&row.cleanup.fixture_host_connected===false&&row.cleanup.known_panels_remaining===0);
  }
  okay=true;
 }catch{/* Missing, stale or partial observations remain failed. */}
 return {case_id:MENU_ITEM_TOKEN_CASE_ID,result:okay?'pass':'fail',observation:observed??null,
  failure:okay?null:'Missing actual nested item provider/Self injection, direct/descendant query ownership, keyboard/ARIA/focus, sibling isolation, reopening or destruction'};
}
