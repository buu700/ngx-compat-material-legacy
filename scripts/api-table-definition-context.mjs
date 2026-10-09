/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {originalCompilerFactoryContext,originalContextDi} from './api-original-factory-contexts.mjs';
const names=['MatLegacyColumnDef','MatLegacyHeaderRowDef','MatLegacyFooterRowDef','MatLegacyRowDef'];
export function tableDefinitionContract(symbol){
 if(!names.some(name=>symbol?.symbol_id==='legacy-table/primary/'+name))return null;
 assert.equal(symbol.family,'legacy-table');assert.equal(symbol.kind,'primary');assert.equal(symbol.name,symbol.symbol_id.split('/')[2]);
 const parent=symbol.name.replace('MatLegacy','Cdk'),index=symbol.name==='MatLegacyColumnDef'?0:2;
 const original=originalCompilerFactoryContext(symbol.shape.originalFactory);assert.deepEqual(original,symbol.shape.originalFactoryContext);
 assert.equal(original.parameter_factory_key,'@angular/cdk:fesm2022/table.mjs#'+parent);
 const params=originalContextDi(symbol.shape);assert.equal(params.length,index+1);
 assert.deepEqual(params[index],{ident:'CDK_TABLE',imported:'CDK_TABLE',spec:null,optional:true});
 if(index===2)assert.deepEqual(params.slice(0,2),[
  {ident:'TemplateRef',imported:'TemplateRef',spec:'@angular/core',optional:false},
  {ident:'IterableDiffers',imported:'IterableDiffers',spec:'@angular/core',optional:false},
 ]);
 return {symbol_id:symbol.symbol_id,original_factory:original.parameter_factory_key,constructor_arity:index+1,table_index:index,
  original_ident:'CDK_TABLE',original_spec:null,public_spec:'@angular/cdk/table',public_export:'CdkTable',public_parent_export:parent};
}
export function tableDefinitionTokenMatches(symbol,param,peer,token){
 const contract=tableDefinitionContract(symbol);if(!contract||param?.ident!=='CDK_TABLE')return null;
 assert.deepEqual(param,originalContextDi(symbol.shape)[contract.table_index]);
 return typeof peer.CdkTable==='function'&&token===peer.CdkTable;
}
export function createTableDefinitionCapture(contract,fixture,peer,owned,core,kind='legacy'){
 assert.ok(['legacy','peer','none','nested'].includes(kind));
 const node=contract.table_index===0?fixture.element:fixture.template,table=node.injector.get(peer.CdkTable,null,{optional:true});
 if(kind==='none')assert.equal(table,null);else{
  assert.ok(table instanceof peer.CdkTable,'table definition caller is not a genuine public table');
  assert.ok(kind==='peer'||table instanceof owned.MatLegacyTable,'table definition caller is not the genuine legacy table');
  assert.ok(fixture.parentNode.owner===table&&fixture.parentNode.injector.get(peer.CdkTable,undefined,{self:true})===table,'table definition parent provider identity differs');
  assert.equal(node.injector.get(peer.CdkTable,null,{self:true,optional:true}),null,'table definition parent moved to child node');
  assert.ok(table._contentRowDefs instanceof core.QueryList&&table._contentRowDefs.length===1&&table._hasInitialized===true,'table definition actual parent query/lifecycle is incomplete');
 }
 if(kind==='nested'){
  const outer=fixture.outerParentNode?.owner;
  assert.ok(outer instanceof owned.MatLegacyTable&&outer!==table,'nested definition requires two actual legacy tables');
  assert.ok(fixture.parentNode.injector.get(peer.CdkTable,null,{skipSelf:true})===outer,'nested table parent lookup did not resolve the outer table');
  assert.ok(node.injector.get(peer.CdkTable)===table,'nested definition resolved the wrong nearest table');
 }
 const state={contract,fixture,peer,owned,core,node,table,kind,destroyCalls:0,descriptor:table?Object.getOwnPropertyDescriptor(table,'ngOnDestroy'):null};
 const destroy=table?.ngOnDestroy;
 if(table)Object.defineProperty(table,'ngOnDestroy',{configurable:true,value(...args){state.destroyCalls++;return destroy.apply(this,args);}});
 state.beforeConstructor=inputs=>{assert.equal(inputs.length,contract.constructor_arity);assert.ok(inputs[contract.table_index]===table,'table definition original table input differs');};
 state.close=()=>{if(table){if(state.descriptor)Object.defineProperty(table,'ngOnDestroy',state.descriptor);else delete table.ngOnDestroy;}};
 return state;
}
export function observeTableDefinitionInputs(state,capture,Type){
 const {contract,fixture,peer,owned,core,node,table,kind}=state,value=capture.value;
 assert.equal(capture.constructor_calls,1);assert.equal(capture.inputs.length,contract.constructor_arity);
 assert.ok(Object.getPrototypeOf(Type)===peer[contract.public_parent_export]&&value instanceof peer[contract.public_parent_export],'table definition public parent identity differs');
 assert.ok(capture.inputs[contract.table_index]===table&&value._table===table,'table definition supplied ownership differs');
 if(contract.table_index===2){
  assert.ok(value.template===capture.inputs[0]&&value.template instanceof core.TemplateRef&&value.template.elementRef.nativeElement===node.template.elementRef.nativeElement,'table definition supplied template differs');
  assert.ok(value._differs===capture.inputs[1]&&value._differs===node.injector.get(core.IterableDiffers),'table definition supplied differ service differs');
 }
 // Preserve the historical manual constructor outside ambient DI, including consumer subclass fields.
 const manual=new Type(...capture.inputs);assert.ok(manual instanceof Type&&manual._table===table,'table definition manual construction changed supplied ownership');
 class ConsumerDefinition extends Type{consumerMarker='retained';}
 const consumer=new ConsumerDefinition(...capture.inputs);assert.ok(consumer instanceof ConsumerDefinition&&consumer instanceof Type&&consumer.consumerMarker==='retained'&&consumer._table===table,'table definition consumer subclass initialization differs');
 if(contract.table_index===2)assert.ok(manual.template===capture.inputs[0]&&consumer.template===capture.inputs[0]&&manual._differs===capture.inputs[1]&&consumer._differs===capture.inputs[1],'table definition manual/subclass borrowed dependencies differ');
 const checks=[];
 if(contract.table_index===0){
  value.name='alpha/$ Beta';assert.equal(value.name,'alpha/$ Beta');assert.equal(value.cssClassFriendlyName,'alpha---Beta');assert.deepEqual(value._columnCssClassName,['cdk-column-alpha---Beta','mat-column-alpha---Beta']);
  value.name='';assert.equal(value.name,'alpha/$ Beta');assert.deepEqual(value._columnCssClassName,['cdk-column-alpha---Beta','mat-column-alpha---Beta']);checks.push('historical-name-sanitization-dual-class-prefix-and-empty-write');
 }else{
  value.columns=['first','second'];value.ngOnChanges({columns:new core.SimpleChange(undefined,value.columns,true)});assert.equal(value.getColumnsDiff(),null);
  value.columns=['second','third'];const diff=value.getColumnsDiff(),added=[],removed=[];assert.ok(diff);diff.forEachAddedItem(r=>added.push(r.item));diff.forEachRemovedItem(r=>removed.push(r.item));assert.deepEqual(added,['third']);assert.deepEqual(removed,['first']);assert.equal(value.getColumnsDiff(),null);checks.push('actual-public-iterable-differ-add-remove-and-stable-repeat');
  const column=new owned.MatLegacyColumnDef(table);
  const templates=fixture.templates.toArray().slice(0,3);assert.equal(templates.length,3);assert.equal(new Set(templates.map(t=>t.elementRef.nativeElement)).size,3);
  column.cell=new owned.MatLegacyCellDef(templates[0]);column.headerCell=new owned.MatLegacyHeaderCellDef(templates[1]);column.footerCell=new owned.MatLegacyFooterCellDef(templates[2]);
  const templateIndex=contract.public_parent_export==='CdkHeaderRowDef'?1:contract.public_parent_export==='CdkFooterRowDef'?2:0;
  assert.ok(value.extractCellTemplate(column)===templates[templateIndex],'table definition selected a different cell template');checks.push('actual-owned-cell-template-selection');
  const context={$implicit:{case:'borrowed-row'}},view=node.container.createEmbeddedView(value.template,context);assert.ok(view.context===context&&!view.destroyed);view.destroy();assert.ok(view.destroyed);checks.push('actual-template-view-context-and-disposal');
 }
 if(contract.public_parent_export!=='CdkRowDef'){
  for(const property of contract.table_index===0?['sticky','stickyEnd']:['sticky']){
   value[property]=false;value.resetStickyChanged();
   for(const [input,want,changed]of [['',true,true],['',true,false],['false',false,true],[null,false,false],['true',true,true],[undefined,false,true]]){
    value[property]=input;assert.equal(value[property],want);assert.equal(value.hasStickyChanged(),changed);assert.equal(value.hasStickyChanged(),false);
   }
   checks.push(property+'-historical-direct-write-coercion-and-dirty-read-reset');
  }
 }else{const predicate=(index,row)=>index===2&&row.case==='selected';value.when=predicate;assert.ok(value.when===predicate&&value.when(2,{case:'selected'})&&!value.when(1,{case:'selected'}));checks.push('public-row-predicate-retained');}
 return {contract,constructor_calls:1,constructor_arity:contract.constructor_arity,table_kind:kind,public_parent_identity_matched:true,original_supplied_inputs_identical:true,parent_provider_scope_verified:true,
  manual_outside_di_preserved:true,consumer_subclass_preserved:true,actual_parent_query_initialized:kind!=='none',checks:checks.map(id=>({id,result:'pass'}))};
}
export function finishTableDefinitionContext(state,evidence){
 const {fixture,table}=state;assert.equal(state.destroyCalls,0,'table definition destroyed its borrowed table');
 assert.ok(!fixture.parentNode.destroyed&&!fixture.element.destroyed&&!fixture.template.destroyed&&!fixture.component.hostView.destroyed&&!fixture.environment.destroyed,'table definition destroyed borrowed caller context');
 if(table){let events=0;const sub=table.contentChanged.subscribe(()=>events++);try{table.renderRows();assert.equal(events,1,'table definition borrowed table no longer renders');}finally{sub.unsubscribe();}}
 return {...evidence,borrowed_table_destroy_calls:0,borrowed_context_alive:true,borrowed_table_public_render_control:!!table};
}
export function tableDefinitionObservationProblems(row){
 const contract=tableDefinitionContract(row?.symbol);if(!contract)return [];
 const x=row.factory_table_definition_context,wantChecks=contract.table_index===0?['historical-name-sanitization-dual-class-prefix-and-empty-write','sticky-historical-direct-write-coercion-and-dirty-read-reset','stickyEnd-historical-direct-write-coercion-and-dirty-read-reset']:
  ['actual-public-iterable-differ-add-remove-and-stable-repeat','actual-owned-cell-template-selection','actual-template-view-context-and-disposal',contract.public_parent_export==='CdkRowDef'?'public-row-predicate-retained':'sticky-historical-direct-write-coercion-and-dirty-read-reset'];
 const want={contract,constructor_calls:1,constructor_arity:contract.constructor_arity,table_kind:'legacy',public_parent_identity_matched:true,original_supplied_inputs_identical:true,parent_provider_scope_verified:true,manual_outside_di_preserved:true,consumer_subclass_preserved:true,actual_parent_query_initialized:true,checks:wantChecks.map(id=>({id,result:'pass'})),borrowed_table_destroy_calls:0,borrowed_context_alive:true,borrowed_table_public_render_control:true};
 const r=row.runtime_requests?.[contract.table_index];
 return row.factory_outcome==='returned'&&isDeepStrictEqual(x,want)&&r?.identity_matched===true&&r.expected_ident==='CDK_TABLE'&&r.expected_spec===null&&r.unresolved===false&&r.optional===true&&r.expected_optional===true&&['self','skipSelf','host'].every(f=>r[f]===false&&r['expected_'+f]===false)&&isDeepStrictEqual(r.table_definition_token_role,contract)?[]:['table definition original/public token, parent, behavior and lifetime evidence incomplete'];
}
