/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {originalCompilerFactoryContext,originalContextDi} from './api-original-factory-contexts.mjs';

// Required historical hosts are actual Angular components/directives. These
// profiles supply caller context, never replace the child factory or its tokens.
const profiles={
 'legacy-chips/primary/MatLegacyChipRemove':{
  factory:'@angular/material:fesm2022/legacy-chips.mjs#MatLegacyChipRemove',index:0,elementIndex:1,
  token:'MatLegacyChip',owner:'MatLegacyChip',module:'MatLegacyChipsModule',tag:'mat-chip'},
 'legacy-list/primary/MatLegacyListOption':{
  factory:'@angular/material:fesm2022/legacy-list.mjs#MatLegacyListOption',index:2,elementIndex:0,
  token:'MatLegacySelectionList',owner:'MatLegacySelectionList',module:'MatLegacyListModule',tag:'mat-selection-list'},
 ...Object.fromEntries(['MatLegacyCell','MatLegacyHeaderCell','MatLegacyFooterCell'].map(name=>[
  'legacy-table/primary/'+name,{
   factory:'@angular/cdk:fesm2022/table.mjs#'+name.replace('MatLegacy','Cdk'),index:0,elementIndex:1,
   token:'CdkColumnDef',publicSpec:'@angular/cdk/table',owner:'MatLegacyColumnDef',module:'MatLegacyTableModule',
   tag:'section',attributes:{matColumnDef:'api-diagnostic-column'}},
 ])),
};

export function requiredParentFactoryProfile(symbol){
 const profile=profiles[symbol?.symbol_id];if(!profile)return null;
 assert.equal(symbol.family,symbol.symbol_id.split('/')[0]);assert.equal(symbol.kind,'primary');
 assert.equal(symbol.name,symbol.symbol_id.split('/')[2]);
 const context=originalCompilerFactoryContext(symbol.shape.originalFactory);
 assert.deepEqual(symbol.shape.originalFactoryContext,context,'required parent original context changed');
 assert.equal(context.parameter_factory_key,profile.factory);
 const param=originalContextDi(symbol.shape)[profile.index];
 assert.equal(param.ident,profile.token);assert.equal(param.imported,profile.token);assert.equal(param.spec,null);
 for(const flag of ['optional','self','skipSelf','host'])assert.equal(Boolean(param[flag]),false);
 const ancestor=context.ancestry.find(a=>a.key===profile.factory);assert.ok(ancestor);
 return {role:'genuine-required-angular-parent-host',symbol_id:symbol.symbol_id,
  parameter_factory_key:profile.factory,parameter_index:profile.index,
  original_source_sha256:ancestor.source_sha256,constructor_arity:context.factory_parameters.length,
  element_index:profile.elementIndex,token_export:profile.token,token_spec:profile.publicSpec||null,
  owner_export:profile.owner,owner_module:profile.module,parent_tag:profile.tag,
  parent_attributes:profile.attributes||{}};
}

/** Compare actual captured constructor values, not request labels or counts. */
export function observeRequiredParentInputs(profile,capture,fixture,Type,token,core){
 assert.equal(capture.constructor_calls,1);assert.equal(capture.inputs.length,profile.constructor_arity);
 const parent=fixture.parentNode.owner,child=fixture.element;
 assert.ok(parent instanceof Type,'required parent is not the actual owned class');
 assert.ok(fixture.parentNode.injector.get(token,undefined,{self:true})===parent,'parent self-provider returned a different instance');
 assert.ok(child.injector.get(token)===parent,'child ancestor-provider returned a different instance');
 assert.ok(child.injector.get(token,null,{self:true,optional:true})===null,'required parent moved to child node');
 // Do not ask assert.equal to format a live Angular graph on failure. A wrong
 // input must produce a bounded diagnostic rather than exhaust host memory.
 assert.ok(capture.inputs[profile.parameter_index]===parent,'constructor received a different required parent');
 assert.ok(capture.inputs[profile.element_index] instanceof core.ElementRef);
 assert.ok(capture.inputs[profile.element_index].nativeElement===child.element.nativeElement,'constructor received a different child element');
 assert.ok(fixture.parentNode.element.nativeElement!==child.element.nativeElement,'parent and child share a node');
 assert.equal(fixture.parentNode.destroyed,false);assert.equal(fixture.component.hostView.destroyed,false);
 assert.equal(fixture.environment.destroyed,false);
 if(profile.owner_export==='MatLegacySelectionList'){
  assert.ok(parent.options instanceof core.QueryList,'Angular content query was not initialized');
  assert.equal(parent._contentInitialized,true,'selection list lifecycle was not initialized');
  assert.notEqual(parent._isDestroyed,true,'selection list was destroyed');
 }
 return {profile,constructor_calls:1,constructor_arity:capture.inputs.length,
  required_input_identical:true,owned_parent_instance:true,parent_self_provider_identical:true,
  child_ancestor_provider_identical:true,child_self_provider_absent:true,child_element_identical:true,
  separate_parent_node:true,angular_parent_initialized:true};
}

export function requiredParentContextObservationProblems(row){
 if(!profiles[row?.symbol?.symbol_id]||row.factory_outcome!=='returned')return [];
 try{
  const profile=requiredParentFactoryProfile(row.symbol),evidence=row.factory_required_parent_context;
  assert.deepEqual(evidence,{profile,constructor_calls:1,constructor_arity:profile.constructor_arity,
   required_input_identical:true,owned_parent_instance:true,parent_self_provider_identical:true,
   child_ancestor_provider_identical:true,child_self_provider_absent:true,child_element_identical:true,
   separate_parent_node:true,angular_parent_initialized:true,borrowed_parent_alive_after_child_teardown:true,
   borrowed_nodes_alive_after_child_teardown:true,borrowed_environment_alive_after_child_teardown:true},
  'required parent construction/lifetime receipt differs');
  return [];
 }catch(error){return ['required parent context evidence incomplete: '+String(error.message)];}
}
