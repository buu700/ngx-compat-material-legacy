/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Compiled with the extracted consumer and called on its actual legacy list.
 * The original two-call regression remains independently required by the host. */
export function selectionComparatorPackedFixture() {
  return `import {SelectionModel} from '@angular/cdk/collections';
import {MatLegacySelectionList} from '@ngx-compat/material-legacy/legacy-list';
import {packedSelectionComparatorCase} from './selection-comparator-contract.mjs';
export async function observePackedSelectionComparator(fixture:any,list:MatLegacySelectionList,comparableList:MatLegacySelectionList){
 const observed:any={execution:'packed-angular-testbed-dom',error:null,states:[]};
 const model=list.selectedOptions,options=list.options.toArray();
 const comparableModel=comparableList.selectedOptions,comparableOptions=comparableList.options.toArray();
 let subscription:any;
 try{
  const host=fixture.nativeElement.querySelector('#selection-comparator-list') as HTMLElement;
  const nodes=Array.from(host.querySelectorAll('mat-list-option'));
  const comparableHost=fixture.nativeElement.querySelector('#selection-comparator-comparable-list') as HTMLElement;
  const comparableNodes=Array.from(comparableHost.querySelectorAll('mat-list-option'));
  observed.public_selection_model=model instanceof SelectionModel;
  observed.option_count=options.length;
  observed.legacy_list_structure=host.classList.contains('mat-selection-list');
  observed.list_multiple=list.multiple;observed.model_is_multiple=model.isMultipleSelection();
  observed.comparable_model_public=comparableModel instanceof SelectionModel;
  observed.comparable_model_distinct=comparableModel!==model&&comparableList!==list;
  observed.comparable_option_count=comparableOptions.length;
  observed.comparable_options_distinct=comparableOptions.every(option=>!options.includes(option));
  observed.comparable_list_structure=comparableHost.classList.contains('mat-selection-list');
  observed.before_indices=model.selected.map(option=>options.indexOf(option));
  model.compareWith=(left,right)=>left.value===right.value;
  model.clear();fixture.detectChanges();await fixture.whenStable();
  const events:Array<{source_is_model:boolean,added_indices:number[],removed_indices:number[]}>=[];
  subscription=model.changed.subscribe(event=>events.push({source_is_model:event.source===model,
   added_indices:event.added.map(option=>options.indexOf(option)),
   removed_indices:event.removed.map(option=>options.indexOf(option))}));
  const snapshot=(stage:string)=>({stage,same_model:list.selectedOptions===model,
   same_options:list.options.toArray().length===options.length&&list.options.toArray().every((option,index)=>option===options[index]),
   same_nodes:host.querySelectorAll('mat-list-option').length===nodes.length
    &&nodes.every((node,index)=>host.querySelectorAll('mat-list-option')[index]===node&&node.isConnected),
   legacy_option_classes:nodes.every(node=>node.classList.contains('mat-list-option')),
   selected_indices:model.selected.map(option=>options.indexOf(option)),selected_values:model.selected.map(option=>option.value),
   option_selected:options.map(option=>option.selected),aria_selected:nodes.map(node=>node.getAttribute('aria-selected')),
   same_comparable_model:comparableList.selectedOptions===comparableModel,
   same_comparable_options:comparableList.options.toArray().length===comparableOptions.length
    &&comparableList.options.toArray().every((option,index)=>option===comparableOptions[index]),
   same_comparable_nodes:comparableHost.querySelectorAll('mat-list-option').length===comparableNodes.length
    &&comparableNodes.every((node,index)=>comparableHost.querySelectorAll('mat-list-option')[index]===node&&node.isConnected),
   comparable_selected_indices:comparableModel.selected.map(option=>comparableOptions.indexOf(option)),
   comparable_option_selected:comparableOptions.map(option=>option.selected),
   comparable_aria_selected:comparableNodes.map(node=>node.getAttribute('aria-selected')),
   events:events.map(event=>({...event,added_indices:[...event.added_indices],removed_indices:[...event.removed_indices]}))});
  observed.states.push(snapshot('initial'));
  for(const [stage,action]of [
   ['first-real',()=>model.setSelection(options[0])],
   ['first-equivalent',()=>model.setSelection(comparableOptions[0])],
   ['repeat-first-equivalent',()=>model.setSelection(comparableOptions[0])],
   ['second-real',()=>model.setSelection(options[1])],
   ['second-equivalent',()=>model.setSelection(comparableOptions[1])],
   ['cleared',()=>model.clear()],['restored-first',()=>model.setSelection(options[0])],
  ]as const){action();fixture.detectChanges();await fixture.whenStable();observed.states.push(snapshot(stage));}
 }catch(error){observed.error=String(error);}
 finally{
  subscription?.unsubscribe();
  observed.after_indices=model.selected.map(option=>options.indexOf(option));
  observed.cleanup={subscription_closed:subscription?.closed===true};
 }
 return {observed,okay:packedSelectionComparatorCase(observed).result==='pass'};
}
`;
}
