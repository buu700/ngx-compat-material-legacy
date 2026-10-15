/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Strengthens the existing select cell, retaining its original harness conditions.
export const SELECT_FOCUS_CLICK_CASE_ID='packed-consumer/harness/legacy-select';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const events=(pairs,open=false)=>[...Array.from({length:pairs},()=>[true,false]).flat(),...(open?[true]:[])];
export function packedSelectFocusClickCase(observed){
 let okay=false;
 try{
  const demand=value=>{if(!value)throw Error('Missing select focus/click observation');};
  demand(observed?.execution==='packed-angular-testbed-dom'&&observed.error===null);
  demand(Array.isArray(observed.contexts)&&observed.contexts.length===4);
  for(const generation of ['legacy','current'])for(const enclosure of ['bare','form-field']){
   const found=observed.contexts.filter(row=>row.generation===generation&&row.enclosure===enclosure);demand(found.length===1);const row=found[0];
   demand(row.public_select_instance===true&&row.public_overlay_directive_instance===true&&row.foreign_generation_nodes===0&&typeof row.host_id==='string'&&row.host_id.length>0);
   demand(row.enclosure_present===(enclosure==='form-field')&&row.legacy_structure===true);
   const open=(state,pairs)=>state?.panel_open===true&&state.overlay_attached===true&&state.expanded==='true'&&state.controls===row.host_id+'-panel'&&state.panel_id===row.host_id+'-panel'&&state.value==='a'&&state.focused===true&&state.panel_resolution_count===1&&state.panel_connected===true&&same(state.opened_events,events(pairs,true))&&state.directive_detach_count===pairs;
   const closed=(state,pairs,focus=true)=>state?.panel_open===false&&state.overlay_attached===false&&state.expanded==='false'&&state.controls===null&&state.panel_id===row.host_id+'-panel'&&state.value==='a'&&(!focus||state.focused===true)&&state.panel_resolution_count===0&&state.panel_connected===false&&same(state.opened_events,events(pairs))&&state.directive_detach_count===pairs;
   demand(closed(row.initial,0,false));
   demand(Array.isArray(row.cycles)&&row.cycles.length===2);
   for(const [index,cycle]of row.cycles.entries()){
    demand(cycle.cycle===index&&open(cycle.after_focus,index)&&open(cycle.after_click,index)&&closed(cycle.after_backdrop,index+1));
    demand(cycle.after_focus.focus_handler_delta===1&&cycle.after_focus.no_touch_on_focus===true);
    demand(cycle.after_click.focus_handler_delta===0&&cycle.after_click.no_extra_touched===true&&cycle.after_click.state_change_delta===0&&cycle.after_click.no_detach===true&&cycle.after_click.same_panel_node===true&&cycle.after_click.same_overlay_ref===true);
   }
   demand(Array.isArray(row.blocked)&&row.blocked.length===2);
   for(const kind of ['disabled','empty']){const rows=row.blocked.filter(state=>state.kind===kind);demand(rows.length===1);const state=rows[0];demand(state.disabled===(kind==='disabled')&&state.option_count===(kind==='disabled'?2:0)&&state.events_unchanged===true&&state.noop_open_state_change_delta===0&&state.noop_open_touch_delta===0&&closed(state,2,false));}
   demand(closed(row.plain_click?.before,2)&&open(row.plain_click.opened,2)&&closed(row.plain_click.closed,3));
   demand(open(row.manual_toggle?.opened,3)&&closed(row.manual_toggle.closed,4));
   demand(closed(row.closed_noop,4)&&row.closed_noop.state_change_delta===0&&row.closed_noop.touch_delta===0&&row.closed_noop.events_unchanged===true&&row.closed_noop.no_detach===true);
   demand(row.cleanup?.fixture_destroyed===true&&row.cleanup.host_connected===false&&row.cleanup.known_panels_remaining===0&&row.cleanup.any_overlay_attached===false&&row.cleanup.own_subscriptions_closed===true);
  }
  okay=true;
 }catch{/* Source markers and incomplete observations cannot qualify this cell. */}
 return {case_id:SELECT_FOCUS_CLICK_CASE_ID,result:okay?'pass':'fail',observation:observed??null,
  failure:okay?null:'Missing focus-before-click continuity, native backdrop closure, disabled/empty guards, public toggle or cleanup in bare/form-field legacy/current scopes'};
}
