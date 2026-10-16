/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Predicate fixtures derived from the three regression contracts, never product receipts. */
export const chipMenuTooltipPackedSamples={
 chip:{execution:'packed-angular-testbed-dom',public_chips:true,public_lists:true,template_value_accessor:true,reactive_value_accessor:true,same_nodes_after_cycles:true,
  phases:['initial','form-disabled','form-enabled'].map((phase,index)=>({phase,template_disabled:true,individual_disabled:true,
   inherited_disabled:index===1,list_disabled:index===1,form_disabled:index===1,template_aria:'true',individual_aria:'true',inherited_aria:String(index===1)}))},
 menu:{execution:'packed-angular-testbed-dom',public_menu:true,public_triggers:true,recreated_items:true,transferred_items_recreated:true,subscriptions_closed:true,
  first_events:[true,false,true,false,true,false],second_events:[true,false],
  phases:[['initial',0,0,0,false,false],['first-open',2,2,0,true,false],['first-close',0,2,2,false,false],['reopen',2,4,2,true,false],
   ['second-close',0,4,4,false,false],['transfer-before',2,6,4,true,false],['transfer-after',2,8,6,false,true],
   ['transfer-settled',2,8,6,false,true],['transfer-close',0,8,8,false,false]].map(([phase,items,created,destroyed,first_open,second_open])=>
    ({phase,items,created,destroyed,first_open,second_open,connected_items:items,panel_connected:items>0}))},
 tooltip:{execution:'packed-angular-testbed-dom',public_directive:true,eager_before_show:true,eager_node_container:true,initial_container_views:0,same_host_after_cycles:true,
  eager:{disabled_empty:true,no_overlay_created:true,overlay_identity:true,scroll_dispatcher_identity:true,view_container_node:true,manual_constructor_identity:true,strategy_identity:true,document_identity:true},
  cycles:[0,1].map(cycle=>({cycle,
   shown:{public_portal:true,public_component:true,same_eager_container:true,same_portal:true,same_overlay:true,container_views:1,overlay_attached:true,overlay_connected:true,tooltip_connected:true,visible:true,text:'Tip text'},
   hidden:{container_views:0,overlay_attached:false,tooltip_connected:false,instance_released:true,visible:false,same_eager_container:true}}))},
};
