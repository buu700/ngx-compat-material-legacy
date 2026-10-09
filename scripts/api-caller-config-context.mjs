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

const profiles={
 'legacy-dialog/primary/MatLegacyDialogContainer':{
  factory:'@angular/material:fesm2022/legacy-dialog.mjs#MatLegacyDialogContainer',index:3,
  token:'MatLegacyDialogConfig',owner:'MatLegacyDialogConfig',publicSpec:'@angular/material/dialog',publicExport:'MatDialogConfig',elementIndex:0,overlayIndex:6},
 'legacy-dialog/primary/_MatLegacyDialogContainerBase':{
  factory:'@angular/material:fesm2022/dialog.mjs#_MatDialogContainerBase',index:3,
  token:'MatDialogConfig',owner:'MatLegacyDialogConfig',publicSpec:'@angular/material/dialog',publicExport:'MatDialogConfig',elementIndex:0,overlayIndex:6},
 ...Object.fromEntries(['MatLegacySnackBarContainer','_MatLegacySnackBarContainerBase'].map(name=>[
  'legacy-snack-bar/primary/'+name,{
   factory:'@angular/material:fesm2022/snack-bar.mjs#_MatSnackBarContainerBase',index:4,
   token:'MatSnackBarConfig',owner:'MatLegacySnackBarConfig',publicSpec:'@angular/material/snack-bar',publicExport:'MatSnackBarConfig',elementIndex:1},
 ])),
};

export function callerConfigProfile(symbol){
 const profile=Object.hasOwn(profiles,symbol?.symbol_id)?profiles[symbol.symbol_id]:null;if(!profile)return null;
 assert.equal(symbol.family,symbol.symbol_id.split('/')[0]);assert.equal(symbol.kind,'primary');assert.equal(symbol.name,symbol.symbol_id.split('/')[2]);
 const context=originalCompilerFactoryContext(symbol.shape.originalFactory);
 assert.deepEqual(symbol.shape.originalFactoryContext,context,'caller configuration original context changed');
 assert.equal(context.parameter_factory_key,profile.factory);
 const param=originalContextDi(symbol.shape)[profile.index];
 assert.equal(param.ident,profile.token);assert.equal(param.imported,profile.token);assert.equal(param.spec,null);
 for(const flag of ['optional','self','skipSelf','host'])assert.equal(Boolean(param[flag]),false);
 const ancestor=context.ancestry.find(a=>a.key===profile.factory);assert.ok(ancestor);
 const values=symbol.family==='legacy-dialog'
  ?{id:'api-caller-config-'+symbol.name,ariaLabelledBy:'api-caller-heading',autoFocus:false,disableClose:true,data:{case:symbol.symbol_id}}
  :{politeness:'assertive',announcementMessage:'',horizontalPosition:'center',verticalPosition:'bottom',data:{message:'api caller message',action:'api caller action'}};
 return {role:'genuine-caller-configuration-on-angular-parent',symbol_id:symbol.symbol_id,
  parameter_factory_key:profile.factory,parameter_index:profile.index,original_source_sha256:ancestor.source_sha256,
  constructor_arity:context.factory_parameters.length,element_index:profile.elementIndex,
  token_export:profile.token,owner_export:profile.owner,public_spec:profile.publicSpec,public_export:profile.publicExport,
  overlay_index:profile.overlayIndex??null,caller_values:values};
}

/** Caller-owned configuration and a genuine public overlay, never stub services. */
export function createCallerConfigContext(profile,owned,peer,overlay,core){
 const Type=owned[profile.owner_export],PeerType=peer[profile.public_export];
 assert.ok(typeof Type==='function'&&typeof PeerType==='function'&&Type.prototype instanceof PeerType,'configuration public/owned types differ');
 const config=new Type();Object.assign(config,structuredClone(profile.caller_values));
 const token=profile.token_export===profile.owner_export?Type:PeerType;
 const state={profile,config,Type,PeerType,token,overlay,ref:null,refHost:null,refPane:null,refDisposed:false,subscription:null};
 state.providers=[{provide:Type,useValue:config},{provide:PeerType,useValue:config}];
 if(profile.overlay_index!==null)state.providers.push({provide:overlay.OverlayRef,useFactory:()=>{
  assert.ok(state.ref===null,'caller overlay constructed more than once');
  state.ref=core.inject(overlay.Overlay).create();
  assert.ok(state.ref instanceof overlay.OverlayRef,'public Overlay.create returned a different reference');
  state.refHost=state.ref.hostElement;state.refPane=state.ref.overlayElement;
  state.subscription=state.ref.attachments().subscribe({complete:()=>{state.refDisposed=true;}});
  return state.ref;
 }});
 state.close=()=>{state.subscription?.unsubscribe();state.ref?.dispose();};
 return state;
}

function configValues(config,profile){return Object.fromEntries(Object.keys(profile.caller_values).map(key=>[key,config[key]]));}

export function observeCallerConfigInputs(state,capture,fixture,core){
 const {profile,config,Type,PeerType,token}=state,child=fixture.element;
 assert.equal(capture.constructor_calls,1);assert.equal(capture.inputs.length,profile.constructor_arity);
 assert.ok(config instanceof Type&&config instanceof PeerType,'caller config lost its owned/public identity');
 assert.ok(capture.inputs[profile.parameter_index]===config,'constructor received a different caller configuration');
 assert.ok(fixture.parentNode.injector.get(token,undefined,{self:true})===config,'caller config moved from parent scope');
 assert.ok(child.injector.get(token)===config,'child received a different ancestor configuration');
 assert.ok(child.injector.get(token,null,{self:true,optional:true})===null,'caller config moved onto the child');
 assert.ok(capture.inputs[profile.element_index] instanceof core.ElementRef);
 assert.ok(capture.inputs[profile.element_index].nativeElement===child.element.nativeElement,'constructor received a different child node');
 assert.ok(isDeepStrictEqual(configValues(config,profile),profile.caller_values),'caller configuration changed during construction');
 if(profile.overlay_index!==null){
  assert.ok(state.ref instanceof state.overlay.OverlayRef);
  assert.ok(capture.inputs[profile.overlay_index]===state.ref,'constructor received a different overlay reference');
  assert.ok(child.injector.get(state.overlay.OverlayRef)===state.ref);
  assert.ok(child.injector.get(state.overlay.OverlayRef,null,{self:true,optional:true})===null,'overlay reference moved onto child');
 }
 return {profile,constructor_calls:1,constructor_arity:capture.inputs.length,owned_public_config_instance:true,
  constructor_config_identical:true,parent_self_config_identical:true,child_ancestor_config_identical:true,
  child_self_config_absent:true,constructor_child_element_identical:true,
  genuine_public_overlay:profile.overlay_index===null?null:true,constructor_overlay_identical:profile.overlay_index===null?null:true};
}

export function callerConfigLifetimeEvidence(state,fixture){
 assert.ok(isDeepStrictEqual(configValues(state.config,state.profile),state.profile.caller_values),'owned teardown mutated caller configuration');
 const overlayAlive=state.profile.overlay_index===null?null:!state.refDisposed
  &&state.ref.hostElement===state.refHost&&state.ref.overlayElement===state.refPane
  &&state.refHost.parentNode!==null&&state.refPane.parentNode===state.refHost;
 return {caller_config_unchanged_after_teardown:true,borrowed_overlay_alive_after_teardown:overlayAlive,
  borrowed_parent_alive_after_teardown:!fixture.parentNode.destroyed,
  borrowed_nodes_alive_after_teardown:!fixture.component.hostView.destroyed&&!fixture.element.destroyed&&!fixture.template.destroyed,
  borrowed_environment_alive_after_teardown:!fixture.environment.destroyed};
}

export function callerConfigObservationProblems(row){
 if(!profiles[row?.symbol?.symbol_id]||row.factory_outcome!=='returned')return [];
 try{
  const profile=callerConfigProfile(row.symbol);
  assert.deepEqual(row.factory_caller_config_context,{profile,constructor_calls:1,constructor_arity:profile.constructor_arity,
   owned_public_config_instance:true,constructor_config_identical:true,parent_self_config_identical:true,
   child_ancestor_config_identical:true,child_self_config_absent:true,constructor_child_element_identical:true,
   genuine_public_overlay:profile.overlay_index===null?null:true,constructor_overlay_identical:profile.overlay_index===null?null:true,
   caller_config_unchanged_after_teardown:true,borrowed_overlay_alive_after_teardown:profile.overlay_index===null?null:true,
   borrowed_parent_alive_after_teardown:true,borrowed_nodes_alive_after_teardown:true,borrowed_environment_alive_after_teardown:true},
  'caller configuration identity/scope/lifetime receipt differs');
  return [];
 }catch(error){return ['caller configuration context evidence incomplete: '+String(error.message)];}
}
