/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const SELECT_DETACH_CASE_ID='packed-consumer/harness/select-close-on-real-scroll-detach';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/** Admit complete actual-node observations; synthetic inputs test this predicate only. */
export function packedSelectDetachCase(observed){
 let okay=false;
 try{
  const demand=value=>{if(!value)throw Error('Missing select detach observation');};
  demand(observed?.execution==='packed-angular-testbed-dom'&&observed.error===null&&observed.tokens_distinct===true);
  demand(Array.isArray(observed.generations)&&observed.generations.length===2);
  for(const generation of ['legacy','current']){
   const found=observed.generations.filter(row=>row.generation===generation);demand(found.length===1);const row=found[0];
   demand(row.public_select_instance===true&&row.public_scrollable_instance===true&&row.public_overlay_directive_instance===true);
   demand(row.foreign_generation_nodes===0&&typeof row.host_id==='string'&&row.host_id.length>0);
   demand(row.initial?.panel_open===false&&row.initial.expanded==='false'&&row.initial.controls===null&&row.initial.active_descendant===null&&row.initial.value==='a');
   demand(Array.isArray(row.cycles)&&row.cycles.length===2);
   const closed=(state,index)=>state?.panel_open===false&&state.expanded==='false'&&state.controls===null&&state.active_descendant===null
     &&state.value==='a'&&state.focused===true&&state.overlay_attached===false&&state.panel_connected===false&&state.panel_resolution_count===0
     &&state.directive_detach_count===index+1&&state.ref_detach_count===index+1&&same(state.opened_events,Array.from({length:index+1},()=>[true,false]).flat());
   for(const [index,cycle]of row.cycles.entries()){
    demand(cycle.cycle===index);const open=cycle.opened;
    demand(open?.panel_open===true&&open.expanded==='true'&&open.value==='a'&&open.focused===true&&open.overlay_attached===true&&open.panel_connected===true);
    demand(open.real_close_strategy===true&&open.panel_id===row.host_id+'-panel'&&open.controls===open.panel_id&&open.panel_resolution_count===1&&open.panel_resolves_exactly===true);
    demand(typeof open.selected_option_id==='string'&&open.selected_option_id.length>0&&open.active_descendant===open.selected_option_id&&open.active_resolution_count===1&&open.active_option_is_in_panel===true);
    demand(open.directive_detach_count===index&&open.ref_detach_count===index&&same(open.opened_events,[...Array.from({length:index},()=>[true,false]).flat(),true]));
    demand(closed(cycle.closed,index)&&closed(cycle.idle_scroll,index));
   }
   demand(Array.isArray(row.native_scroll_events)&&row.native_scroll_events.length===4&&row.native_scroll_events.every(event=>event.type==='scroll'&&event.target_matches_scrollable===true));
   demand(row.cleanup?.fixture_destroyed===true&&row.cleanup.host_connected===false&&row.cleanup.panel_resolution_count===0&&row.cleanup.any_overlay_attached===false&&row.cleanup.own_subscriptions_closed===true);
  }
  okay=true;
 }catch{/* Partial or corrupt observations remain failed. */}
 return {case_id:SELECT_DETACH_CASE_ID,result:okay?'pass':'fail',observation:observed??null,
  failure:okay?null:'Missing or failed real-scroll select closure, public overlay detachment, state/ARIA/focus, reopening or cleanup'};
}
