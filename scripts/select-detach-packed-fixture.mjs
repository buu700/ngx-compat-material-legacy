/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Runs against the extracted library and genuine public peer/CDK modules. */
export function selectDetachPackedFixture(){
 return String.raw`import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {CdkScrollable,CdkScrollableModule} from '@angular/cdk/scrolling';
import {CdkConnectedOverlay,CloseScrollStrategy,Overlay} from '@angular/cdk/overlay';
import {MatSelectModule,MatSelect,MAT_SELECT_SCROLL_STRATEGY} from '@angular/material/select';
import {MatLegacySelectModule,MatLegacySelect,MAT_LEGACY_SELECT_SCROLL_STRATEGY} from '@ngx-compat/material-legacy/legacy-select';
import {packedSelectDetachCase} from './select-detach-contract.mjs';

// Scope the override to this fixture, preserving the application's default strategies.
@Component({standalone:true,selector:'packed-legacy-scroll-select',imports:[MatLegacySelectModule,CdkScrollableModule],
 providers:[{provide:MAT_LEGACY_SELECT_SCROLL_STRATEGY,useFactory:(overlay:Overlay)=>()=>overlay.scrollStrategies.close(),deps:[Overlay]}],
 template:'<div cdkScrollable><mat-select aria-label="Legacy scroll select" value="a"><mat-option value="a">One</mat-option><mat-option value="b">Two</mat-option></mat-select></div>'})
class PackedLegacyScrollSelect {}
@Component({standalone:true,selector:'packed-current-scroll-select',imports:[MatSelectModule,CdkScrollableModule],
 providers:[{provide:MAT_SELECT_SCROLL_STRATEGY,useFactory:(overlay:Overlay)=>()=>overlay.scrollStrategies.close(),deps:[Overlay]}],
 template:'<div cdkScrollable><mat-select aria-label="Current scroll select" value="a"><mat-option value="a">One</mat-option><mat-option value="b">Two</mat-option></mat-select></div>'})
class PackedCurrentScrollSelect {}
export const SELECT_DETACH_IMPORTS=[PackedLegacyScrollSelect,PackedCurrentScrollSelect];

export async function observePackedSelectDetach(){
 const observed:any={execution:'packed-angular-testbed-dom',error:null,tokens_distinct:MAT_LEGACY_SELECT_SCROLL_STRATEGY!==(MAT_SELECT_SCROLL_STRATEGY as any),generations:[]};
 const matches=(id:string)=>Array.from(document.querySelectorAll('[id]')).filter((node:any)=>node.id===id) as Element[];
 try{for(const generation of ['legacy','current']){
  let fixture:any;const subscriptions:any[]=[],refs:any[]=[],refSet=new Set<any>(),panels:HTMLElement[]=[];
  const row:any={generation,cycles:[],native_scroll_events:[]};observed.generations.push(row);
  let host:HTMLElement|undefined,directiveDetachCount=0,refDetachCount=0;const openedEvents:boolean[]=[];
  try{
   const legacy=generation==='legacy',Owned=legacy?MatLegacySelect:MatSelect,Other=legacy?MatSelect:MatLegacySelect;
   fixture=TestBed.createComponent(legacy?PackedLegacyScrollSelect as any:PackedCurrentScrollSelect as any);
   const settle=async()=>{fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();};
   await settle();
   const selectNode=fixture.debugElement.query(By.directive(Owned)),select=selectNode.componentInstance as any;
   host=selectNode.nativeElement;row.host_id=host!.id;row.public_select_instance=select instanceof Owned;
   row.foreign_generation_nodes=fixture.debugElement.queryAll(By.directive(Other)).length;
   const scrollNode=fixture.debugElement.query(By.directive(CdkScrollable)),scrollable=scrollNode.injector.get(CdkScrollable),scrollElement=scrollable.getElementRef().nativeElement;
   row.public_scrollable_instance=scrollable instanceof CdkScrollable;
   // queryAllNodes includes structural-directive comment anchors and projected views.
   const directives=[...new Set(fixture.debugElement.queryAllNodes((node:any)=>!!node.injector.get(CdkConnectedOverlay,null)).map((node:any)=>node.injector.get(CdkConnectedOverlay)))];
   if(directives.length!==1)throw Error('Expected one real CdkConnectedOverlay');
   const directive=directives[0] as CdkConnectedOverlay;row.public_overlay_directive_instance=directive instanceof CdkConnectedOverlay;
   subscriptions.push(directive.detach.subscribe(()=>directiveDetachCount++));
   subscriptions.push(select.openedChange.subscribe((value:boolean)=>openedEvents.push(value)));
   subscriptions.push(scrollable.elementScrolled().subscribe((event:Event)=>row.native_scroll_events.push({type:event.type,target_matches_scrollable:event.target===scrollElement})));
   const basic=()=>({panel_open:select.panelOpen,expanded:host!.getAttribute('aria-expanded'),controls:host!.getAttribute('aria-controls'),active_descendant:host!.getAttribute('aria-activedescendant'),value:select.value,focused:document.activeElement===host});
   row.initial=basic();select.focus();await settle();
   for(let cycle=0;cycle<2;cycle++){
    select.open();await settle();
    const ref=directive.overlayRef,panel=select.panel.nativeElement as HTMLElement;panels.push(panel);
    if(!refSet.has(ref)){refSet.add(ref);refs.push(ref);subscriptions.push(ref.detachments().subscribe(()=>refDetachCount++));}
    const selected=select.options.find((option:any)=>option.selected),active=selected?matches(selected.id):[];
    const opened={...basic(),overlay_attached:ref.hasAttached(),panel_connected:panel.isConnected,panel_id:panel.id,panel_resolution_count:matches(panel.id).length,panel_resolves_exactly:document.getElementById(panel.id)===panel,
     real_close_strategy:ref.getConfig().scrollStrategy instanceof CloseScrollStrategy,selected_option_id:selected?.id,active_resolution_count:active.length,active_option_is_in_panel:active.length===1&&panel.contains(active[0]),directive_detach_count:directiveDetachCount,ref_detach_count:refDetachCount,opened_events:[...openedEvents]};
    const closed=()=>({...basic(),overlay_attached:ref.hasAttached(),panel_connected:panel.isConnected,panel_resolution_count:matches(panel.id).length,directive_detach_count:directiveDetachCount,ref_detach_count:refDetachCount,opened_events:[...openedEvents]});
    scrollElement.dispatchEvent(new Event('scroll'));await settle();const afterScroll=closed();
    scrollElement.dispatchEvent(new Event('scroll'));await settle();
    row.cycles.push({cycle,opened,closed:afterScroll,idle_scroll:closed()});
   }
  }finally{
   if(fixture&&!fixture.componentRef.hostView.destroyed)fixture.destroy();for(const subscription of subscriptions)subscription.unsubscribe();
   row.cleanup={fixture_destroyed:fixture?.componentRef.hostView.destroyed===true,host_connected:host?.isConnected??false,panel_resolution_count:panels.reduce((sum,panel)=>sum+matches(panel.id).length,0),any_overlay_attached:refs.some(ref=>ref.hasAttached()),own_subscriptions_closed:subscriptions.every(subscription=>subscription.closed)};
  }
 }}catch(error){observed.error=String(error);}
 return {observed,okay:packedSelectDetachCase(observed).result==='pass'};
}
`;
}
