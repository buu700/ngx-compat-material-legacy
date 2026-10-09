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

// Published16 factories refer to classes/tokens declared in the same FESM by
// local name. These finite unchanged public parent roles are not owned aliases.
// Removed/private tokens (including CDK_TABLE) deliberately have no entry.
const profiles={
 'legacy-dialog/primary/_MatLegacyDialogContainerBase':[
  {factory:'@angular/material:fesm2022/dialog.mjs#_MatDialogContainerBase',index:3,name:'MatDialogConfig',spec:'@angular/material/dialog'},
 ],
 ...Object.fromEntries(['MatLegacySnackBarContainer','_MatLegacySnackBarContainerBase'].map(name=>[
  'legacy-snack-bar/primary/'+name,[{factory:'@angular/material:fesm2022/snack-bar.mjs#_MatSnackBarContainerBase',index:4,name:'MatSnackBarConfig',spec:'@angular/material/snack-bar'}],
 ])),
 'legacy-menu/primary/MatLegacyMenuTrigger':[
  {factory:'@angular/material:fesm2022/menu.mjs#_MatMenuTriggerBase',index:5,name:'MatMenuItem',spec:'@angular/material/menu'},
 ],
 'legacy-table/primary/MatLegacyTextColumn':[
  {factory:'@angular/cdk:fesm2022/table.mjs#CdkTextColumn',index:0,name:'CdkTable',spec:'@angular/cdk/table'},
  {factory:'@angular/cdk:fesm2022/table.mjs#CdkTextColumn',index:1,name:'TEXT_COLUMN_OPTIONS',spec:'@angular/cdk/table'},
 ],
 ...Object.fromEntries(['MatLegacyCell','MatLegacyHeaderCell','MatLegacyFooterCell'].map(name=>[
  'legacy-table/primary/'+name,[{factory:'@angular/cdk:fesm2022/table.mjs#'+name.replace('MatLegacy','Cdk'),index:0,name:'CdkColumnDef',spec:'@angular/cdk/table'}],
 ])),
};

/** Authenticate both the inherited factory and its exact local parameter. */
export function originalPublicParentTokenRole(symbol,param){
 const profile=profiles[symbol?.symbol_id]?.find(p=>p.name===param?.ident);
 if(!profile)return null;
 assert.equal(symbol.family,symbol.symbol_id.split('/')[0]);assert.equal(symbol.kind,'primary');
 assert.equal(symbol.name,symbol.symbol_id.split('/')[2]);
 const context=originalCompilerFactoryContext(symbol.shape.originalFactory);
 assert.deepEqual(symbol.shape.originalFactoryContext,context,'public parent original context changed');
 assert.equal(context.parameter_factory_key,profile.factory,'public parent factory owner differs');
 const original=context.factory_parameters[profile.index];assert.ok(original,'original public parent parameter missing');
 const {index,local_name,...expected}=original;
 assert.equal(index,profile.index);assert.equal(local_name,profile.name);
 assert.equal(expected.ident,profile.name);assert.equal(expected.imported,profile.name);assert.equal(expected.spec,null);
 assert.deepEqual(param,expected,'public parent parameter differs from original factory');
 const ancestor=context.ancestry.find(a=>a.key===profile.factory);assert.ok(ancestor);
 return {role:'authenticated-unchanged-public-parent-token',symbol_id:symbol.symbol_id,
  parameter_factory_key:profile.factory,parameter_index:profile.index,original_source_sha256:ancestor.source_sha256,
  original_ident:profile.name,original_spec:null,public_spec:profile.spec,public_export:profile.name};
}

/** The emitted receipt must retain the exact authenticated role and flags. */
export function publicParentTokenRoleObservationProblems(row){
 if(!profiles[row?.symbol?.symbol_id]||row.factory_outcome!=='returned')return [];
 try{
  const params=originalContextDi(row.symbol.shape,row.runtime_context||{});
  for(const [index,param]of params.entries()){
   const role=originalPublicParentTokenRole(row.symbol,param);if(!role)continue;
   const observed=row.runtime_requests?.[index];assert.ok(observed,'public parent request evidence missing');
   assert.deepEqual(observed.public_parent_token_role,role,'public parent role receipt differs');
   assert.equal(observed.identity_matched,true);assert.equal(observed.unresolved,false);
   assert.equal(observed.expected_ident,param.ident);assert.equal(observed.expected_spec,param.spec);
   for(const flag of ['optional','self','skipSelf','host']){
    assert.equal(observed[flag],Boolean(param[flag]));assert.equal(observed['expected_'+flag],Boolean(param[flag]));
   }
  }
  return [];
 }catch(error){return ['public parent token role evidence incomplete: '+String(error.message)];}
}
