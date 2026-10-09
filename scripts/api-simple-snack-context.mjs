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
export const SIMPLE_SNACK_SYMBOL='legacy-snack-bar/primary/LegacySimpleSnackBar';
export function simpleSnackProfile(symbol){
 if(symbol?.symbol_id!==SIMPLE_SNACK_SYMBOL)return null;
 assert.equal(symbol.family,'legacy-snack-bar');assert.equal(symbol.kind,'primary');assert.equal(symbol.name,'LegacySimpleSnackBar');
 const context=originalCompilerFactoryContext(symbol.shape.originalFactory);assert.deepEqual(symbol.shape.originalFactoryContext,context);
 assert.equal(context.parameter_factory_key,'@angular/material:fesm2022/legacy-snack-bar.mjs#LegacySimpleSnackBar');
 assert.deepEqual(originalContextDi(symbol.shape).map(p=>[p.ident,p.imported,p.spec,Boolean(p.optional),Boolean(p.self),Boolean(p.skipSelf),Boolean(p.host)]),[
  ['MatSnackBarRef','MatSnackBarRef','@angular/material/snack-bar',false,false,false,false],
  ['MAT_SNACK_BAR_DATA','MAT_SNACK_BAR_DATA','@angular/material/snack-bar',false,false,false,false],
 ]);
 return {symbol_id:SIMPLE_SNACK_SYMBOL,parameter_factory_key:context.parameter_factory_key,original_source_sha256:context.source_sha256,constructor_arity:2};
}

/** Genuine Angular container, owned historical reference and public Overlay.create; no service stubs. */
export function createSimpleSnackContext(profile,owned,peer,overlay,core,ownedCore){
 const Ref=owned.MatLegacySnackBarRef,Container=owned.MatLegacySnackBarContainer,Config=owned.MatLegacySnackBarConfig,Data=peer.MAT_SNACK_BAR_DATA;
 assert.ok(typeof Ref==='function'&&Ref!==peer.MatSnackBarRef&&typeof Container==='function'&&typeof Config==='function');
 assert.ok(owned.MAT_LEGACY_SNACK_BAR_DATA===Data&&Config.prototype instanceof peer.MatSnackBarConfig);
 const data={message:'API caller message',action:'API caller action'},config=new Config();Object.assign(config,{data,politeness:'off',announcementMessage:''});
 const state={profile,Ref,Container,Data,data,config,overlay,ref:null,container:null,overlayRef:null,disposed:false,actions:0,dismissals:[],subscriptions:[]};
 state.parentHost={tag:'snack-bar-container',imports:[owned.MatLegacySnackBarModule],token:Container};
 state.providers=[{provide:ownedCore.LEGACY_ANIMATIONS_TEST_OVERRIDE,useValue:'di-disabled'}];
 state.parentProviders=[{provide:Config,useValue:config},{provide:peer.MatSnackBarConfig,useValue:config},{provide:Data,useValue:data},{provide:Ref,useFactory:()=>{
  assert.ok(state.ref===null,'simple snack caller reference constructed twice');
  state.container=core.inject(Container,{self:true});state.overlayRef=core.inject(overlay.Overlay).create();
  assert.ok(state.container instanceof Container&&state.overlayRef instanceof overlay.OverlayRef);
  state.subscriptions.push(state.overlayRef.attachments().subscribe({complete:()=>{state.disposed=true;}}));
  state.ref=new Ref(state.container,state.overlayRef);
  state.subscriptions.push(state.ref.onAction().subscribe(()=>state.actions++),state.ref.afterDismissed().subscribe(event=>state.dismissals.push(event)));
  return state.ref;
 }}];
 state.close=()=>{for(const subscription of state.subscriptions)subscription.unsubscribe();state.overlayRef?.dispose();};
 return state;
}

export function observeSimpleSnackInputs(state,capture,fixture){
 const {profile,ref,data,Ref,Container,Data,container,overlayRef}=state,value=capture.value;
 assert.equal(capture.constructor_calls,1);assert.equal(capture.inputs.length,2);
 assert.ok(ref instanceof Ref&&container instanceof Container&&container===fixture.parentNode.owner,'simple snack caller parent/reference identity differs');
 assert.ok(ref.containerInstance===container&&overlayRef instanceof state.overlay.OverlayRef,'simple snack reference container/overlay differs');
 assert.ok(container._animationsEnabled===false,'simple snack fixture motion policy was not applied');
 assert.ok(capture.inputs[0]===ref&&capture.inputs[1]===data&&value.snackBarRef===ref&&value.data===data,'simple snack constructor borrowed inputs differ');
 for(const [token,want]of [[Ref,ref],[Data,data]]){
  assert.ok(fixture.parentNode.injector.get(token,undefined,{self:true})===want,'simple snack parent provider differs');
  assert.ok(fixture.element.injector.get(token)===want,'simple snack child ancestor provider differs');
  assert.ok(fixture.element.injector.get(token,null,{self:true,optional:true})===null,'simple snack caller provider moved onto child');
 }
 assert.equal(state.actions,0);assert.equal(state.disposed,false);
 assert.equal(value.hasAction,true);const action=data.action;
 try{data.action='';assert.equal(value.hasAction,false);}finally{data.action=action;}
 assert.equal(value.hasAction,true);
 return {profile,constructor_calls:1,constructor_arity:2,owned_reference_instance:true,genuine_angular_container:true,genuine_public_overlay:true,
  constructor_ref_data_identical:true,parent_self_providers_identical:true,child_ancestor_providers_identical:true,child_self_providers_absent:true,
  has_action_true_false_true:true,fixture_motion_disabled:true};
}

/** First prove borrowed lifetime, then explicitly exercise the child's intended action. */
export async function finishSimpleSnackContext(state,value,fixture,evidence){
 assert.equal(state.actions,0,'simple snack construction/teardown prematurely triggered an action');assert.equal(state.disposed,false,'simple snack construction/teardown prematurely disposed caller overlay');
 assert.ok(isDeepStrictEqual(state.data,{message:'API caller message',action:'API caller action'})&&state.config.data===state.data,'simple snack teardown changed caller data');
 assert.ok(!fixture.component.hostView.destroyed&&!fixture.element.destroyed&&!fixture.template.destroyed&&!fixture.parentNode.destroyed&&!fixture.environment.destroyed,'simple snack teardown destroyed borrowed context');
 assert.ok(state.container._destroyed===false,'simple snack teardown destroyed caller container');
 evidence.borrowed_context_alive_after_owned_teardown=true;evidence.caller_data_unchanged_after_owned_teardown=true;evidence.caller_overlay_alive_after_owned_teardown=true;
 value.action();await Promise.resolve();
 assert.equal(state.actions,1,'simple snack child action did not reach caller reference');assert.deepEqual(state.dismissals,[{dismissedByAction:true}]);assert.equal(state.disposed,true);
 assert.equal(state.container._animationState,'hidden');assert.equal(fixture.parentNode.element.nativeElement.hasAttribute('mat-exit'),true);
 assert.ok(!fixture.parentNode.destroyed&&!fixture.environment.destroyed,'simple snack action destroyed fixture parent/environment');
 evidence.action_events=1;evidence.dismissals=[{dismissedByAction:true}];evidence.action_disposed_caller_overlay=true;evidence.action_exit_state_and_attribute=true;
 return evidence;
}

export function simpleSnackObservationProblems(row){
 if(row?.symbol?.symbol_id!==SIMPLE_SNACK_SYMBOL)return [];
 const profile=simpleSnackProfile(row.symbol),want={profile,constructor_calls:1,constructor_arity:2,owned_reference_instance:true,genuine_angular_container:true,genuine_public_overlay:true,
  constructor_ref_data_identical:true,parent_self_providers_identical:true,child_ancestor_providers_identical:true,child_self_providers_absent:true,
  has_action_true_false_true:true,fixture_motion_disabled:true,borrowed_context_alive_after_owned_teardown:true,caller_data_unchanged_after_owned_teardown:true,caller_overlay_alive_after_owned_teardown:true,
  action_events:1,dismissals:[{dismissedByAction:true}],action_disposed_caller_overlay:true,action_exit_state_and_attribute:true};
 return row.factory_outcome==='returned'&&isDeepStrictEqual(row.factory_simple_snack_context,want)?[]:['simple snack genuine caller/data/action/lifetime evidence incomplete'];
}
