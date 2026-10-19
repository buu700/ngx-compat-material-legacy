/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Compiled in the disposable consumer with extracted library and real peer modules. */
export function generatedIdentityPackedFixture() {
  const scope = legacy => {
    const generation = legacy ? 'legacy' : 'current', prefix = legacy ? 'MatLegacy' : 'Mat';
    const type = name => prefix + name;
    const template = `<mat-optgroup data-packed-kind="standalone" label="Standalone ${generation}">
  <mat-option value="a">Standalone A</mat-option>
  <mat-option id="packed-${generation}-option-explicit" value="b">Standalone B</mat-option>
</mat-optgroup>
<input data-packed-kind="autocomplete-input" aria-label="Autocomplete ${generation}" [matAutocomplete]="auto">
<mat-autocomplete #auto="matAutocomplete" [autoActiveFirstOption]="true">
  <mat-option value="a">Auto A</mat-option><mat-option value="b">Auto B</mat-option>
</mat-autocomplete>
<mat-select aria-label="Select zero ${generation}" [value]="'a'">
  <mat-option value="a">Select zero A</mat-option><mat-option value="b">Select zero B</mat-option>
</mat-select>
<mat-select aria-label="Select one ${generation}" [value]="'a'">
  <mat-option value="a">Select one A</mat-option><mat-option value="b">Select one B</mat-option>
</mat-select>
<button data-packed-kind="menu-trigger" [matMenuTriggerFor]="menu">Open ${generation} menu</button>
<mat-menu #menu="matMenu" aria-label="Menu ${generation}">
  <button mat-menu-item>Menu A</button><button mat-menu-item>Menu B</button>
</mat-menu>
<nav mat-tab-nav-bar [tabPanel]="panel">
  <a mat-tab-link [active]="active === 0" (click)="active = 0">Tab A</a>
  <a mat-tab-link id="packed-${generation}-tab-explicit" [active]="active === 1" (click)="active = 1">Tab B</a>
</nav>
<mat-tab-nav-panel #panel>Panel ${generation}</mat-tab-nav-panel>`;
    return `@Component({standalone:true,selector:'packed-${generation}-identity',
 imports:[${['Option', 'Autocomplete', 'Select', 'Menu', 'Tabs', 'SnackBar'].map(name => type(name) + 'Module').join(',')}],
 template:${JSON.stringify(template)}})
class Packed${legacy ? 'Legacy' : 'Current'}IdentityScope {
 active=0;
 @ViewChild(${type('Autocomplete')}) autocomplete!:${type('Autocomplete')};
 @ViewChild(${type('AutocompleteTrigger')}) trigger!:${type('AutocompleteTrigger')};
 @ViewChildren(${type('Select')}) selects!:QueryList<${type('Select')}>;
 @ViewChild(${type('MenuTrigger')}) menuTrigger!:${type('MenuTrigger')};
 @ViewChild(${type('TabNavPanel')}) panel!:${type('TabNavPanel')};
 @ViewChildren(${type('TabLink')}) links!:QueryList<${type('TabLink')}>;
}
`;
  };
  return String.raw`import {Component, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Overlay} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {take} from 'rxjs/operators';
import {MatOptionModule, MatOption, MatOptgroup} from '@angular/material/core';
import {MatAutocompleteModule, MatAutocomplete, MatAutocompleteTrigger} from '@angular/material/autocomplete';
import {MatSelectModule, MatSelect} from '@angular/material/select';
import {MatMenuModule, MatMenu, MatMenuTrigger} from '@angular/material/menu';
import {MatTabsModule, MatTabNavPanel, MatTabLink} from '@angular/material/tabs';
import {MatSnackBarModule, MatSnackBar} from '@angular/material/snack-bar';
import {MatLegacyOptionModule, MatLegacyOption, MatLegacyOptgroup} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyAutocompleteModule, MatLegacyAutocomplete, MatLegacyAutocompleteTrigger} from '@ngx-compat/material-legacy/legacy-autocomplete';
import {MatLegacySelectModule, MatLegacySelect} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacyMenuModule, MatLegacyMenu, MatLegacyMenuTrigger} from '@ngx-compat/material-legacy/legacy-menu';
import {MatLegacyTabsModule, MatLegacyTabNavPanel, MatLegacyTabLink} from '@ngx-compat/material-legacy/legacy-tabs';
import {MatLegacySnackBarModule, MatLegacySnackBar} from '@ngx-compat/material-legacy/legacy-snack-bar';
import {packedGeneratedIdentityCase} from './generated-identity-contract.mjs';

${scope(true)}
${scope(false)}
@Component({standalone:true,selector:'packed-identity-modal',
 host:{role:'dialog','aria-modal':'true','aria-owns':'packed-identity-preserved'},
 template:'<span id="packed-identity-preserved">Preserved modal ownership</span>'})
class PackedIdentityModal {}
export const GENERATED_IDENTITY_IMPORTS=[PackedLegacyIdentityScope,PackedCurrentIdentityScope,PackedIdentityModal];

export async function observePackedGeneratedIdentity(){
 const observed:any={execution:'packed-angular-testbed-dom',error:null,orders:[]};
 const once=(stream:any)=>new Promise<void>((resolve,reject)=>stream.pipe(take(1)).subscribe({next:()=>resolve(),error:reject}));
 const allWithId=(id:string)=>Array.from(document.querySelectorAll('[id]')).filter((node:any)=>node.id===id) as Element[];
 const resolveExactly=(element:Element)=>!!element&&allWithId(element.id).length===1&&document.getElementById(element.id)===element;
 try{for(const creationOrder of [['legacy','current'],['current','legacy']]){
  const order:any={order:creationOrder[0]+'-first',creation_order:creationOrder,scopes_separate:false,nodes:[],default_edges:[],changed_tab_edges:[],explicit_edges:[],explicit:[],generations:[],duplicate_id_snapshots:[],snack_lifecycle:[]};
  observed.orders.push(order);
  const fixtures:any[]=[],models:any[]=[],snacks:any[]=[];let modalOverlay:any,modal:HTMLElement|undefined;
  const duplicates=()=>{const seen=new Set<string>();for(const element of Array.from(document.querySelectorAll('[id]')) as HTMLElement[]){if(seen.has(element.id))order.duplicate_id_snapshots.push(element.id);seen.add(element.id);}};
  const settle=async()=>{for(const fixture of fixtures)fixture.detectChanges();for(const fixture of fixtures)await fixture.whenStable();for(const fixture of fixtures)fixture.detectChanges();};
  const record=(model:any,role:string,index:number,element:Element,ownerMatches:boolean)=>{
   if(!element)throw Error('Missing '+model.generation+' '+role+' '+index);
   order.nodes.push({generation:model.generation,role,index,id:element.id,resolution_count:allWithId(element.id).length,exact_node:document.getElementById(element.id)===element,owner_matches:ownerMatches});
  };
  const edge=(rows:any[],model:any,name:string,source:Element,attribute:string,target:Element)=>{
   if(!source||!target)throw Error('Missing ARIA endpoint '+name);
   rows.push({generation:model.generation,name,attribute,value:source.getAttribute(attribute),target_id:target.id,target_count:allWithId(target.id).length,exact_target:document.getElementById(target.id)===target});
  };
  const tabEdges=(rows:any[])=>{for(const model of models){const root=model.fixture.nativeElement as HTMLElement,links=root.querySelectorAll('[mat-tab-link]'),panel=root.querySelector('mat-tab-nav-panel')!;edge(rows,model,'tab-panel',links[model.view.active],'aria-controls',panel);edge(rows,model,'tab-label',panel,'aria-labelledby',links[model.view.active]);}};
  try{
   for(const generation of creationOrder){
    const legacy=generation==='legacy',fixture=TestBed.createComponent(legacy?PackedLegacyIdentityScope as any:PackedCurrentIdentityScope as any);fixtures.push(fixture);
    await settle();
    const classes=legacy?{option:MatLegacyOption,group:MatLegacyOptgroup,auto:MatLegacyAutocomplete,select:MatLegacySelect,menu:MatLegacyMenu,link:MatLegacyTabLink,panel:MatLegacyTabNavPanel,other:MatSelect}:{option:MatOption,group:MatOptgroup,auto:MatAutocomplete,select:MatSelect,menu:MatMenu,link:MatTabLink,panel:MatTabNavPanel,other:MatLegacySelect};
    const root=fixture.nativeElement as HTMLElement,view=fixture.componentInstance as any;
    const state:any={generation,public_instances:view.autocomplete instanceof classes.auto&&view.selects.length===2&&view.selects.toArray().every((v:any)=>v instanceof classes.select)&&view.menuTrigger.menu instanceof classes.menu&&view.links.length===2&&view.links.toArray().every((v:any)=>v instanceof classes.link)&&view.panel instanceof classes.panel&&fixture.debugElement.queryAll(By.directive(classes.option)).every((v:any)=>v.componentInstance instanceof classes.option),legacy_structure:{}};
    const model={generation,legacy,fixture,view,classes,state,input:root.querySelector('[data-packed-kind="autocomplete-input"]')!};models.push(model);order.generations.push(state);
   }
   order.scopes_separate=models.every(model=>model.fixture.debugElement.queryAll(By.directive(model.classes.other)).length===0);
   for(const model of models){
    const root=model.fixture.nativeElement as HTMLElement,group=root.querySelector('mat-optgroup[data-packed-kind="standalone"]')!,options=group.querySelectorAll('mat-option'),label=group.querySelector('span[id]')!;
    record(model,'option',0,options[0],model.fixture.debugElement.queryAll(By.directive(model.classes.option)).some((v:any)=>v.nativeElement===options[0]));
    record(model,'optgroup-label',0,label,model.fixture.debugElement.queryAll(By.directive(model.classes.group)).some((v:any)=>v.nativeElement===group));
    model.state.option_explicit_id=options[1].id;model.state.option_explicit_resolves=resolveExactly(options[1]);model.state.group_label=label.textContent?.trim();
    edge(order.default_edges,model,'group-label',group,'aria-labelledby',label);
    const selects=root.querySelectorAll('mat-select');
    for(let index=0;index<2;index++){record(model,'select',index,selects[index],model.view.selects.get(index) instanceof model.classes.select);record(model,'select-value',index,selects[index].querySelector('.mat-select-value,.mat-mdc-select-value')!,true);}
    record(model,'tab-link',0,root.querySelector('[mat-tab-link]')!,model.view.links.first instanceof model.classes.link);
    record(model,'tab-panel',0,root.querySelector('mat-tab-nav-panel')!,model.view.panel instanceof model.classes.panel);
    if(model.legacy)Object.assign(model.state.legacy_structure,{option_text:!!options[0].querySelector('.mat-option-text'),group_label:label.classList.contains('mat-optgroup-label'),select_trigger:!!selects[0].querySelector('.mat-select-trigger'),select_value:!!selects[0].querySelector('.mat-select-value'),tab_link:root.querySelector('[mat-tab-link]')!.classList.contains('mat-tab-link'),tab_panel:root.querySelector('mat-tab-nav-panel')!.classList.contains('mat-tab-nav-panel')});
   }
   tabEdges(order.default_edges);duplicates();
   for(const model of models)model.view.trigger.openPanel();await settle();
   for(const model of models){const panel=model.view.autocomplete.panel.nativeElement as HTMLElement,active=model.view.trigger.activeOption,option=Array.from(panel.querySelectorAll('mat-option')).find((node:any)=>node.id===active?.id)!;record(model,'autocomplete',0,panel,model.view.autocomplete instanceof model.classes.auto);record(model,'active-option',0,option,active instanceof model.classes.option);edge(order.default_edges,model,'autocomplete-panel',model.input,model.legacy?'aria-owns':'aria-controls',panel);edge(order.default_edges,model,'autocomplete-active',model.input,'aria-activedescendant',option);if(model.legacy)model.state.legacy_structure.autocomplete_panel=panel.classList.contains('mat-autocomplete-panel');}
   duplicates();for(const model of models)model.view.trigger.closePanel();await settle();
   for(let index=0;index<2;index++){
    for(const model of models)model.view.selects.get(index).open();await settle();
    for(const model of models){const select=model.view.selects.get(index),host=model.fixture.nativeElement.querySelectorAll('mat-select')[index],panel=select.panel.nativeElement as HTMLElement,selected=select.options.find((v:any)=>v.selected),option=Array.from(panel.querySelectorAll('mat-option')).find((node:any)=>node.id===selected?.id)!;record(model,'select-panel',index,panel,select instanceof model.classes.select);record(model,'active-option',index+1,option,selected instanceof model.classes.option);edge(order.default_edges,model,'select-'+index+'-panel',host,'aria-controls',panel);edge(order.default_edges,model,'select-'+index+'-active',host,'aria-activedescendant',option);if(model.legacy)model.state.legacy_structure.select_panel_wrap=panel.parentElement!.classList.contains('mat-select-panel-wrap');}
    duplicates();for(const model of models)model.view.selects.get(index).close();await settle();
   }
   for(const model of models)model.view.menuTrigger.openMenu();await settle();
   for(const model of models){const panel=document.getElementById(model.view.menuTrigger.menu.panelId)!;record(model,'menu-panel',0,panel,model.view.menuTrigger.menu instanceof model.classes.menu);edge(order.default_edges,model,'menu-panel',model.fixture.nativeElement.querySelector('[data-packed-kind="menu-trigger"]'),'aria-controls',panel);if(model.legacy)Object.assign(model.state.legacy_structure,{menu_panel:panel.classList.contains('mat-menu-panel'),menu_content:!!panel.querySelector('.mat-menu-content')});}
   duplicates();for(const model of models)model.view.menuTrigger.closeMenu();await settle();
   for(const model of models)(model.fixture.nativeElement.querySelectorAll('[mat-tab-link]')[1] as HTMLElement).click();await settle();tabEdges(order.changed_tab_edges);
   for(const model of models){const key='packed-'+model.generation+'-';model.view.autocomplete.id=key+'autocomplete-override';model.view.selects.first.id=key+'select-override';model.view.panel.id=key+'tab-panel-override';model.view.links.first.id=key+'tab-link-override';model.view.active=0;}await settle();tabEdges(order.explicit_edges);
   for(const model of models)model.view.trigger.openPanel();await settle();
   for(const model of models)edge(order.explicit_edges,model,'autocomplete-panel',model.input,model.legacy?'aria-owns':'aria-controls',model.view.autocomplete.panel.nativeElement);
   duplicates();for(const model of models)model.view.trigger.closePanel();await settle();
   for(const model of models)model.view.selects.first.open();await settle();
   for(const model of models){const root=model.fixture.nativeElement as HTMLElement,select=root.querySelector('mat-select')!,panel=root.querySelector('mat-tab-nav-panel')!,link=root.querySelector('[mat-tab-link]')!;edge(order.explicit_edges,model,'select-0-panel',select,'aria-controls',model.view.selects.first.panel.nativeElement);const autoId=model.view.autocomplete.id;order.explicit.push({generation:model.generation,ids:{autocomplete:autoId,select:select.id,'tab-panel':panel.id,'tab-link':link.id},select_value_id:select.querySelector('.mat-select-value,.mat-mdc-select-value')!.id,option_id:root.querySelector('mat-option[id$="option-explicit"]')!.id,values_resolve:[select,panel,link].every(resolveExactly)});}
   duplicates();for(const model of models)model.view.selects.first.close();await settle();
   modalOverlay=TestBed.inject(Overlay).create();const modalRef=modalOverlay.attach(new ComponentPortal(PackedIdentityModal));modalRef.changeDetectorRef.detectChanges();modal=modalRef.location.nativeElement;
   for(const model of models){const service=model.fixture.debugElement.injector.get(model.legacy?MatLegacySnackBar as any:MatSnackBar as any) as any;const ref=service.open('Identity '+model.generation,'Close',{duration:0,announcementMessage:'',politeness:'polite',panelClass:'packed-identity-'+model.generation});snacks.push({model,ref});await settle();}
   for(const item of snacks){const host=document.querySelector('.packed-identity-'+item.model.generation)!,live=host.querySelector(item.model.legacy?'[id^="mat-legacy-snack-bar-container-live-"]':'[id^="mat-snack-bar-container-live-"]')!;item.live=live;record(item.model,'snack-live',0,live,!!host);item.model.state.snack_panel_class=host.classList.contains('packed-identity-'+item.model.generation);if(item.model.legacy)item.model.state.legacy_structure.snack_container=host.classList.contains('mat-snack-bar-container');}
   const snackState=(stage:string)=>{const owns=(modal!.getAttribute('aria-owns')||'').split(/\s+/).filter(Boolean);order.snack_lifecycle.push({stage,modal_owns:owns,live_present:snacks.map(item=>item.live.isConnected),all_references_resolve:owns.every(id=>allWithId(id).length===1)});duplicates();};
   snackState('opened');
   for(let index=0;index<snacks.length;index++){const item=snacks[index],done=once(item.ref.afterDismissed());item.ref.dismiss();await done;await settle();snackState(index===0?'first-dismissed':'both-dismissed');}
  }finally{
   for(const item of snacks)item.ref.dismiss();
   modalOverlay?.dispose();for(const fixture of fixtures)if(!fixture.componentRef.hostView.destroyed)fixture.destroy();
   order.cleanup={fixtures_destroyed:fixtures.filter(fixture=>fixture.componentRef.hostView.destroyed).length,modal_disposed:!!modal&&!modal.isConnected,retained_target_count:order.nodes.filter((node:any)=>allWithId(node.id).length>0).length,overlay_target_count:document.querySelectorAll('.cdk-overlay-container [id^="mat-autocomplete-"],.cdk-overlay-container [id^="mat-select-"],.cdk-overlay-container [id^="mat-menu-panel-"],.cdk-overlay-container [id^="mat-snack-bar-container-live-"],.cdk-overlay-container [id^="mat-legacy-snack-bar-container-live-"]').length};
  }
 }}catch(error){observed.error=String(error);}
 return {observed,okay:packedGeneratedIdentityCase(observed).result==='pass'};
}
`;
}
