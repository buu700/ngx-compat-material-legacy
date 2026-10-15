/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual node/provider/query observations against the extracted artifact. */
export function menuItemTokenPackedFixture(){
 return String.raw`import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {MatMenuModule,MatMenu,MatMenuItem,MatMenuTrigger} from '@angular/material/menu';
import {MatLegacyMenuModule,MatLegacyMenu,MatLegacyMenuItem,MatLegacyMenuTrigger} from '@ngx-compat/material-legacy/legacy-menu';
import {packedMenuItemTokenCase} from './menu-item-token-contract.mjs';
const ANCESTOR_ITEM={fixtureAncestor:true};
const TEMPLATE='@if(visible){<button data-menu-token="root-trigger" [matMenuTriggerFor]="root">Root</button><mat-menu #root="matMenu" data-menu-token="root"><button mat-menu-item data-menu-token="first">First</button><div><button mat-menu-item disabled data-menu-token="wrapped">Wrapped disabled</button></div><button mat-menu-item [matMenuTriggerFor]="child" data-menu-token="submenu">Child</button><mat-menu #child="matMenu" data-menu-token="child"><button mat-menu-item data-menu-token="child-first">Child first</button><button mat-menu-item disabled data-menu-token="child-disabled">Child disabled</button></mat-menu></mat-menu><button data-menu-token="sibling-trigger" [matMenuTriggerFor]="sibling">Sibling</button><mat-menu #sibling="matMenu" data-menu-token="sibling"><button mat-menu-item data-menu-token="sibling-item">Sibling item</button></mat-menu>}';
@Component({standalone:true,selector:'packed-legacy-item-token',imports:[MatLegacyMenuModule],providers:[{provide:MatMenuItem,useValue:ANCESTOR_ITEM}],template:TEMPLATE})
class PackedLegacyItemToken {visible=true;}
@Component({standalone:true,selector:'packed-current-item-token',imports:[MatMenuModule],providers:[{provide:MatMenuItem,useValue:ANCESTOR_ITEM}],template:TEMPLATE})
class PackedCurrentItemToken {visible=true;}
export const MENU_ITEM_TOKEN_IMPORTS=[PackedLegacyItemToken,PackedCurrentItemToken];

export async function observePackedMenuItemToken(){
 const observed:any={execution:'packed-angular-testbed-dom',error:null,generations:[]};
 const matching=(id:string)=>Array.from(document.querySelectorAll('[id]')).filter((node:any)=>node.id===id) as HTMLElement[];
 try{for(const generation of ['legacy','current']){
  let fixture:any;const panels=new Set<string>(),subscriptions:any[]=[],hosts:HTMLElement[]=[];
  const row:any={generation,cycles:[]};observed.generations.push(row);
  try{
   const legacy=generation==='legacy',Menu=legacy?MatLegacyMenu:MatMenu,Item=legacy?MatLegacyMenuItem:MatMenuItem,Trigger=legacy?MatLegacyMenuTrigger:MatMenuTrigger;
   fixture=TestBed.createComponent(legacy?PackedLegacyItemToken as any:PackedCurrentItemToken as any);
   const settle=async()=>{fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();};
   await settle();row.ancestor_decoy_present=fixture.debugElement.injector.get(MatMenuItem)===ANCESTOR_ITEM;
   let previousItems:any[]=[];
   for(let cycle=0;cycle<2;cycle++){
    if(cycle){fixture.componentInstance.visible=true;await settle();}
    const nodes=fixture.debugElement.queryAll(By.directive(Item)),items=nodes.map((node:any)=>node.injector.get(Item));
    const kind=(item:any)=>item._getHostElement().getAttribute('data-menu-token');
    const kinds=(list:any)=>list.toArray().map(kind).sort();
    const named=(name:string)=>fixture.debugElement.query((node:any)=>node.nativeElement?.getAttribute?.('data-menu-token')===name);
    const root=named('root').injector.get(Menu),child=named('child').injector.get(Menu),sibling=named('sibling').injector.get(Menu);
    const rootNode=named('root-trigger'),subNode=named('submenu'),siblingNode=named('sibling-trigger');
    const rootTrigger=rootNode.injector.get(Trigger),subTrigger=subNode.injector.get(Trigger),siblingTrigger=siblingNode.injector.get(Trigger);
    const subItem=subNode.injector.get(Item),first=items.find((item:any)=>kind(item)==='first'),childFirst=items.find((item:any)=>kind(item)==='child-first');
    const state:any={cycle,fresh_instances:cycle===0||items.every((item:any)=>!previousItems.includes(item)),
     queries:{all:kinds(root._allItems),direct:kinds(root._directDescendantItems),shallow:kinds(root.items),child:kinds(child._directDescendantItems),sibling:kinds(sibling._directDescendantItems)},
     peer_token_query_count:fixture.debugElement.queryAll(By.directive(MatMenuItem)).length,legacy_item_query_count:fixture.debugElement.queryAll(By.directive(MatLegacyMenuItem)).length,
     providers:nodes.map((node:any)=>{const item=node.injector.get(Item),name=kind(item);return {kind:name,public_token_is_item:node.injector.get(MatMenuItem)===item,owned_instance:item instanceof MatLegacyMenuItem,peer_instance:item instanceof MatMenuItem,parent_matches:item._parentMenu===(name.startsWith('child-')?child:name==='sibling-item'?sibling:root)};}).sort((a:any,b:any)=>a.kind.localeCompare(b.kind)),
     root_optional_self_null:(rootTrigger as any)._menuItemInstance===null,sibling_optional_self_null:(siblingTrigger as any)._menuItemInstance===null,
     submenu_self_item:(subTrigger as any)._menuItemInstance===subItem,submenu_parent_root:(subTrigger as any)._parentMaterialMenu===root,submenu_mode:subTrigger.triggersSubmenu(),
     initial_closed:!rootTrigger.menuOpen&&!subTrigger.menuOpen&&!siblingTrigger.menuOpen};
    row.cycles.push(state);previousItems=items;
    let completed=0;const currentSubscriptions:any[]=[];
    for(const item of items){hosts.push(item._getHostElement());for(const output of [item._focused,item._hovered]){const subscription=output.subscribe({complete:()=>completed++});subscriptions.push(subscription);currentSubscriptions.push(subscription);}}
    const key=(element:HTMLElement,key:string,keyCode:number)=>element.dispatchEvent(new KeyboardEvent('keydown',{key,code:key,keyCode,bubbles:true}));
    const resolved=(menu:any)=>{const matches=matching(menu.panelId);panels.add(menu.panelId);return matches.length===1&&matches[0].getAttribute('role')==='menu';};
    const noPanel=(menu:any)=>matching(menu.panelId).length===0;
    const controls=(element:HTMLElement,menu:any)=>element.getAttribute('aria-controls')===menu.panelId&&element.getAttribute('aria-expanded')==='true';
    const closedAria=(element:HTMLElement)=>element.getAttribute('aria-controls')===null&&element.getAttribute('aria-expanded')==='false';
    rootTrigger.openMenu();await settle();
    first.focus('keyboard');key(first._getHostElement(),'ArrowDown',40);await settle();const rootFocus=document.activeElement===subItem._getHostElement();
    key(subItem._getHostElement(),'ArrowRight',39);await settle();
    const rootPanel=matching(root.panelId)[0],childPanel=matching(child.panelId)[0];
    state.opened={root_open:rootTrigger.menuOpen,child_open:subTrigger.menuOpen,sibling_closed:!siblingTrigger.menuOpen,root_focus_after_down:rootFocus,child_focus_after_right:document.activeElement===childFirst._getHostElement(),
     root_panel_resolves:resolved(root),child_panel_resolves:resolved(child),root_controls:controls(rootNode.nativeElement,root),child_controls:controls(subNode.nativeElement,child),
     distinct_panels:root.panelId!==child.panelId&&rootPanel!==childPanel,child_parent_root:child.parentMenu===root,root_direct_unchanged:JSON.stringify(kinds(root._directDescendantItems))===JSON.stringify(state.queries.direct),
     generation_structure:legacy?!!rootPanel?.classList.contains('mat-menu-panel')&&!!rootPanel.querySelector('.mat-menu-content')&&nodes.every((node:any)=>node.nativeElement.classList.contains('mat-menu-item')&&!node.nativeElement.classList.contains('mat-mdc-menu-item')):!!rootPanel?.classList.contains('mat-mdc-menu-panel')};
    key(childFirst._getHostElement(),'ArrowLeft',37);await settle();
    state.back={root_open:rootTrigger.menuOpen,child_closed:!subTrigger.menuOpen,focus_submenu:document.activeElement===subItem._getHostElement(),child_panel_removed:noPanel(child),child_aria_closed:closedAria(subNode.nativeElement)};
    rootTrigger.closeMenu();await settle();
    state.closed={root_closed:!rootTrigger.menuOpen,child_closed:!subTrigger.menuOpen,root_panel_removed:noPanel(root),child_panel_removed:noPanel(child),root_aria_closed:closedAria(rootNode.nativeElement),focus_root_trigger:document.activeElement===rootNode.nativeElement};
    siblingTrigger.openMenu();await settle();
    state.sibling={sibling_open:siblingTrigger.menuOpen,root_closed:!rootTrigger.menuOpen,child_closed:!subTrigger.menuOpen,own_panel_resolves:resolved(sibling),own_controls:controls(siblingNode.nativeElement,sibling),own_query_only:JSON.stringify(kinds(sibling._directDescendantItems))==='["sibling-item"]'};
    siblingTrigger.closeMenu();await settle();
    rootTrigger.openMenu();await settle();subItem.focus('keyboard');key(subItem._getHostElement(),'ArrowRight',39);await settle();
    state.reopened={root_open:rootTrigger.menuOpen,child_open:subTrigger.menuOpen,sibling_closed:!siblingTrigger.menuOpen,root_panel_resolves:resolved(root),child_panel_resolves:resolved(child),same_self_item:(subTrigger as any)._menuItemInstance===subItem};
    fixture.componentInstance.visible=false;await settle();
    state.removed={items_destroyed:completed,subjects_closed:currentSubscriptions.every(subscription=>subscription.closed),known_panels_remaining:[...panels].reduce((n,id)=>n+matching(id).length,0),item_nodes_disconnected:items.every((item:any)=>!item._getHostElement().isConnected),remaining_item_tokens:fixture.debugElement.queryAll(By.directive(MatMenuItem)).length,remaining_triggers:fixture.debugElement.queryAll(By.directive(Trigger)).length};
   }
  }finally{
   if(fixture&&!fixture.destroyed)fixture.destroy();
   row.cleanup={fixture_destroyed:fixture?.destroyed===true,fixture_host_connected:fixture?.nativeElement?.isConnected??false,known_panels_remaining:[...panels].reduce((n,id)=>n+matching(id).length,0),item_nodes_disconnected:hosts.every(host=>!host.isConnected),own_subscriptions_closed:subscriptions.every(subscription=>subscription.closed)};
   for(const subscription of subscriptions)subscription.unsubscribe();
  }
 }}catch(error){observed.error=String(error);}
 return {observed,okay:packedMenuItemTokenCase(observed).result==='pass'};
}
`;
}
