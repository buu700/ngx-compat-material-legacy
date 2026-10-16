/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const CHIP_DISABLED_CASE_ID='packed-consumer/harness/chip-individual-disabled-form-isolation';
export const MENU_LAZY_CASE_ID='packed-consumer/harness/menu-lazy-item-destruction';
export const TOOLTIP_CONTAINER_CASE_ID='packed-consumer/harness/tooltip-original-eager-dependencies';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const demand=value=>{if(!value)throw Error('Incomplete packed behavior observations');};
function evaluate(caseId,observed,check,failure){
 let okay=false;try{demand(observed?.execution==='packed-angular-testbed-dom');check(observed);okay=true;}catch{/* Incomplete observations fail. */}
 return {case_id:caseId,result:okay?'pass':'fail',observation:observed??null,failure:okay?null:failure};
}
/** #29795: the list/form disabled state cannot overwrite an individual input. */
export function packedChipDisabledCase(observed){
 return evaluate(CHIP_DISABLED_CASE_ID,observed,o=>{
  demand(o.public_chips===true&&o.public_lists===true&&o.template_value_accessor===true&&o.reactive_value_accessor===true&&o.same_nodes_after_cycles===true);
  demand(Array.isArray(o.phases)&&o.phases.length===3);
  for(const [index,name]of ['initial','form-disabled','form-enabled'].entries()){
   const p=o.phases[index],disabled=index===1;demand(p?.phase===name);
   demand(p.template_disabled===true&&p.individual_disabled===true&&p.inherited_disabled===disabled&&p.list_disabled===disabled&&p.form_disabled===disabled);
   demand(p.template_aria==='true'&&p.individual_aria==='true'&&p.inherited_aria===String(disabled));
  }
 },'Missing form initialization, disabled-input isolation, disable/enable or actual chip ARIA observations');
}
/** #30301: detach real lazy views, including after another trigger takes over. */
export function packedMenuLazyCase(observed){
 return evaluate(MENU_LAZY_CASE_ID,observed,o=>{
  demand(o.public_menu===true&&o.public_triggers===true&&o.recreated_items===true&&o.transferred_items_recreated===true&&o.subscriptions_closed===true);
  const expected=[['initial',0,0,0,false,false],['first-open',2,2,0,true,false],['first-close',0,2,2,false,false],
   ['reopen',2,4,2,true,false],['second-close',0,4,4,false,false],['transfer-before',2,6,4,true,false],
   ['transfer-after',2,8,6,false,true],['transfer-settled',2,8,6,false,true],['transfer-close',0,8,8,false,false]];
  demand(Array.isArray(o.phases)&&o.phases.length===expected.length);
  for(const [index,[name,items,created,destroyed,first,second]]of expected.entries()){
   const p=o.phases[index];demand(p?.phase===name&&p.items===items&&p.created===created&&p.destroyed===destroyed);
   demand(p.connected_items===items&&p.first_open===first&&p.second_open===second&&p.panel_connected===(items>0));
  }
  demand(same(o.first_events,[true,false,true,false,true,false])&&same(o.second_events,[true,false]));
 },'Missing lazy item/query destruction, distinct recreated views, shared-panel transfer or settled ownership observations');
}
/** Upstream 68b267: the actual attached ComponentPortal uses the eagerly captured node VCR. */
export function packedTooltipContainerCase(observed){
 return evaluate(TOOLTIP_CONTAINER_CASE_ID,observed,o=>{
  const eager=['disabled_empty','no_overlay_created','overlay_identity','scroll_dispatcher_identity','view_container_node','manual_constructor_identity','strategy_identity','document_identity'];
  demand(o.public_directive===true&&o.eager_before_show===true&&o.eager_node_container===true&&o.initial_container_views===0&&o.same_host_after_cycles===true);
  demand(o.eager&&eager.every(k=>o.eager[k]===true));
  demand(Array.isArray(o.cycles)&&o.cycles.length===2);
  for(const [index,cycle]of o.cycles.entries()){
   demand(cycle?.cycle===index);const p=cycle.shown;
   demand(p?.public_portal===true&&p.public_component===true&&p.same_eager_container===true&&p.same_portal===true&&p.same_overlay===true);
   demand(p.container_views===1&&p.overlay_attached===true&&p.overlay_connected===true&&p.tooltip_connected===true&&p.visible===true&&p.text==='Tip text');
   const h=cycle.hidden;demand(h?.container_views===0&&h.overlay_attached===false&&h.tooltip_connected===false&&h.instance_released===true&&h.visible===false&&h.same_eager_container===true);
  }
 },'Missing eager node ViewContainerRef identity or real tooltip portal attachment, hiding and reuse observations');
}
