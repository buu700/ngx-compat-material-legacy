/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Focus-before-click observations against the extracted artifact and current peer. */
export function selectFocusClickPackedFixture(){
 return String.raw`import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {CdkConnectedOverlay,OverlayContainer} from '@angular/cdk/overlay';
import {MatSelect,MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatLegacySelect,MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {packedSelectFocusClickCase} from './select-focus-click-contract.mjs';
const OUTSIDE='<button data-focus-click-outside>Outside</button>';
const SELECT='<mat-select #control="matSelect" aria-label="Focus click select" value="a" [disabled]="disabled" (focus)="openOnFocus(control)">@if(!empty){<mat-option value="a">One</mat-option><mat-option value="b">Two</mat-option>}</mat-select>';
const BARE=OUTSIDE+SELECT,FIELD=OUTSIDE+'<mat-form-field><mat-label>Focus click</mat-label>'+SELECT+'</mat-form-field>';
class FocusClickState {disabled=false;empty=false;openFromFocus=true;focusCalls=0;openOnFocus(control:any){this.focusCalls++;if(this.openFromFocus)control.open();}}
@Component({standalone:true,selector:'packed-legacy-bare-focus-click',imports:[MatLegacySelectModule],template:BARE})
class LegacyBareFocusClick extends FocusClickState {}
@Component({standalone:true,selector:'packed-legacy-field-focus-click',imports:[MatLegacySelectModule,MatLegacyFormFieldModule],template:FIELD})
class LegacyFieldFocusClick extends FocusClickState {}
@Component({standalone:true,selector:'packed-current-bare-focus-click',imports:[MatSelectModule],template:BARE})
class CurrentBareFocusClick extends FocusClickState {}
@Component({standalone:true,selector:'packed-current-field-focus-click',imports:[MatSelectModule,MatFormFieldModule],template:FIELD})
class CurrentFieldFocusClick extends FocusClickState {}
export const SELECT_FOCUS_CLICK_IMPORTS=[LegacyBareFocusClick,LegacyFieldFocusClick,CurrentBareFocusClick,CurrentFieldFocusClick];

export async function observePackedSelectFocusClick(){
 const observed:any={execution:'packed-angular-testbed-dom',error:null,contexts:[]};
 const matches=(id:string)=>Array.from(document.querySelectorAll('[id]')).filter((node:any)=>node.id===id) as HTMLElement[];
 try{for(const generation of ['legacy','current'])for(const enclosure of ['bare','form-field']){
  const row:any={generation,enclosure,cycles:[],blocked:[]};observed.contexts.push(row);
  let fixture:any,host:HTMLElement|undefined;const subscriptions:any[]=[],refs:any[]=[],knownRefs=new Set<any>(),panelIds=new Set<string>();
  try{
   const legacy=generation==='legacy',Select=legacy?MatLegacySelect:MatSelect,Other=legacy?MatSelect:MatLegacySelect;
   const Host=legacy?(enclosure==='bare'?LegacyBareFocusClick:LegacyFieldFocusClick):(enclosure==='bare'?CurrentBareFocusClick:CurrentFieldFocusClick);
   fixture=TestBed.createComponent(Host as any);
   const settle=async()=>{fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();};
   await settle();const view=fixture.componentInstance,node=fixture.debugElement.query(By.directive(Select)),select=node.componentInstance as any;
   host=node.nativeElement;const trigger=host!.querySelector('.mat-select-trigger,.mat-mdc-select-trigger') as HTMLElement,outside=fixture.nativeElement.querySelector('[data-focus-click-outside]') as HTMLElement;
   const directives=[...new Set(fixture.debugElement.queryAllNodes((element:any)=>!!element.injector.get(CdkConnectedOverlay,null)).map((element:any)=>element.injector.get(CdkConnectedOverlay)))];
   if(directives.length!==1)throw Error('Expected one genuine CdkConnectedOverlay');const directive=directives[0] as CdkConnectedOverlay;
   let detached=0,touched=0,stateChanges=0;const openedEvents:boolean[]=[];
   subscriptions.push(directive.detach.subscribe(()=>detached++));subscriptions.push(select.openedChange.subscribe((value:boolean)=>openedEvents.push(value)));
   select.registerOnTouched(()=>touched++);subscriptions.push(select.stateChanges.subscribe(()=>stateChanges++));
   row.public_select_instance=select instanceof Select;row.public_overlay_directive_instance=directive instanceof CdkConnectedOverlay;
   row.foreign_generation_nodes=fixture.debugElement.queryAll(By.directive(Other)).length;row.host_id=host!.id;
   row.enclosure_present=!!fixture.nativeElement.querySelector('mat-form-field');
   row.legacy_structure=legacy?!!host!.querySelector('.mat-select-value')&&trigger.classList.contains('mat-select-trigger')&&(enclosure==='bare'||fixture.nativeElement.querySelector('mat-form-field').classList.contains('mat-form-field')):true;
   const attachRef=()=>{const ref=directive.overlayRef;if(!knownRefs.has(ref)){knownRefs.add(ref);refs.push(ref);}return ref;};
   const state=()=>{const panelId=select.id+'-panel',panels=matches(panelId);return {panel_open:select.panelOpen,overlay_attached:refs.some(ref=>ref.hasAttached()),expanded:host!.getAttribute('aria-expanded'),controls:host!.getAttribute('aria-controls'),value:select.value,focused:document.activeElement===host,panel_id:panelId,panel_resolution_count:panels.length,panel_connected:panels.length===1&&panels[0].isConnected,opened_events:[...openedEvents],directive_detach_count:detached};};
   const backdrop=()=>{const found=TestBed.inject(OverlayContainer).getContainerElement().querySelectorAll('.cdk-overlay-backdrop');if(found.length!==1)throw Error('Expected one real select backdrop');return found[0] as HTMLElement;};
   row.initial=state();
   for(let cycle=0;cycle<2;cycle++){
    outside.focus();await settle();const calls=view.focusCalls,touchBefore=touched;
    host!.focus();await settle();const ref=attachRef(),panel=select.panel.nativeElement as HTMLElement;panelIds.add(panel.id);
    const focusState={...state(),focus_handler_delta:view.focusCalls-calls,no_touch_on_focus:touched===touchBefore};
    const focusCalls=view.focusCalls,touchAfterFocus=touched,statesAfterFocus=stateChanges,detachBefore=detached;
    trigger.click();await settle();
    const clicked={...state(),focus_handler_delta:view.focusCalls-focusCalls,no_extra_touched:touched===touchAfterFocus,state_change_delta:stateChanges-statesAfterFocus,no_detach:detached===detachBefore,same_panel_node:select.panel?.nativeElement===panel,same_overlay_ref:directive.overlayRef===ref};
    backdrop().click();await settle();row.cycles.push({cycle,after_focus:focusState,after_click:clicked,after_backdrop:state()});
   }
   for(const kind of ['disabled','empty']){
    outside.focus();view.disabled=kind==='disabled';view.empty=kind==='empty';await settle();const beforeEvents=[...openedEvents];
    host!.focus();trigger.click();await settle();const statesBefore=stateChanges,touchBefore=touched;select.open();await settle();
    row.blocked.push({kind,disabled:select.disabled,option_count:select.options.length,...state(),events_unchanged:JSON.stringify(openedEvents)===JSON.stringify(beforeEvents),noop_open_state_change_delta:stateChanges-statesBefore,noop_open_touch_delta:touched-touchBefore});
   }
   view.disabled=false;view.empty=false;view.openFromFocus=false;await settle();outside.focus();host!.focus();await settle();
   const plainBefore=state();trigger.click();await settle();attachRef();const plainOpened=state();backdrop().click();await settle();
   row.plain_click={before:plainBefore,opened:plainOpened,closed:state()};
   select.toggle();await settle();attachRef();const toggleOpened=state();select.toggle();await settle();row.manual_toggle={opened:toggleOpened,closed:state()};
   const statesBefore=stateChanges,touchBefore=touched,eventsBefore=[...openedEvents],detachBefore=detached;select.close();select.close();await settle();
   row.closed_noop={...state(),state_change_delta:stateChanges-statesBefore,touch_delta:touched-touchBefore,events_unchanged:JSON.stringify(openedEvents)===JSON.stringify(eventsBefore),no_detach:detached===detachBefore};
  }finally{
   if(fixture&&!fixture.componentRef.hostView.destroyed)fixture.destroy();for(const subscription of subscriptions)subscription.unsubscribe();
   row.cleanup={fixture_destroyed:fixture?.componentRef.hostView.destroyed===true,host_connected:host?.isConnected??false,known_panels_remaining:[...panelIds].reduce((n,id)=>n+matches(id).length,0),any_overlay_attached:refs.some(ref=>ref.hasAttached()),own_subscriptions_closed:subscriptions.every(subscription=>subscription.closed)};
  }
 }}catch(error){observed.error=String(error);}
 return {observed,okay:packedSelectFocusClickCase(observed).result==='pass'};
}
`;
}
