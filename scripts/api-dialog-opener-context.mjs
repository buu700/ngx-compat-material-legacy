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
let contentId=0;
export const DIALOG_OPENER_SYMBOL='legacy-dialog/testing/MatTestLegacyDialogOpener';
export function dialogOpenerProfile(symbol){
 if(symbol?.symbol_id!==DIALOG_OPENER_SYMBOL)return null;
 assert.equal(symbol.family,'legacy-dialog');assert.equal(symbol.kind,'testing');assert.equal(symbol.name,'MatTestLegacyDialogOpener');
 const context=originalCompilerFactoryContext(symbol.shape.originalFactory);assert.deepEqual(symbol.shape.originalFactoryContext,context);
 assert.equal(context.parameter_factory_key,'@angular/material:fesm2022/legacy-dialog/testing.mjs#MatTestLegacyDialogOpener');
 assert.deepEqual(originalContextDi(symbol.shape).map(p=>[p.ident,p.imported,p.spec,Boolean(p.optional),Boolean(p.self),Boolean(p.skipSelf),Boolean(p.host)]),[
  ['MatLegacyDialog','MatLegacyDialog','@angular/material/legacy-dialog',false,false,false,false],
 ]);
 return {symbol_id:DIALOG_OPENER_SYMBOL,parameter_factory_key:context.parameter_factory_key,original_source_sha256:context.source_sha256,constructor_arity:1};
}

/** Configure the real exported helper via its public API, preserving previous owned static state. */
export function createDialogOpenerContext(profile,Type,owned,core){
 class Content{
  data=core.inject(owned.MAT_LEGACY_DIALOG_DATA);
  destroyed=false;
  ngOnDestroy(){this.destroyed=true;}
 }
 core.Component({standalone:true,selector:'api-dialog-opener-content-'+contentId++,template:'<p>Dialog caller content</p>'})(Content);
 const config=new owned.MatLegacyDialogConfig();Object.assign(config,{id:'api-dialog-opener',data:{case:profile.symbol_id},autoFocus:false,restoreFocus:false,hasBackdrop:false,enterAnimationDuration:0,exitAnimationDuration:0});
 const previous={component:Type.component,config:Type.config};
 assert.ok(Type.withComponent(Content,config)===Type&&Type.component===Content&&Type.config===config,'dialog opener public configuration differs');
 const state={profile,Type,owned,Content,config,previous,ref:null,result:'api-dialog-result',closed:[],subscriptions:[]};
 state.close=()=>{try{for(const subscription of state.subscriptions)subscription.unsubscribe();state.ref?.close();}finally{Type.withComponent(previous.component,previous.config);}};
 return state;
}

export async function observeDialogOpenerContext(state,capture,fixture,core,runFactory){
 const value=capture.value,{profile,owned,Content,config}=state,service=fixture.element.injector.get(owned.MatLegacyDialog);
 assert.equal(capture.constructor_calls,1);assert.equal(capture.inputs.length,1);
 assert.ok(service instanceof owned.MatLegacyDialog&&capture.inputs[0]===service&&value.dialog===service,'dialog opener genuine caller service differs');
 const ref=value.dialogRef;
 assert.ok(ref instanceof owned.MatLegacyDialogRef&&ref.componentInstance instanceof Content,'dialog opener reference/content identity differs');state.ref=ref;
 assert.ok(ref.componentInstance.data===config.data,'dialog opener content data differs');
 assert.ok(ref.componentRef&&ref.componentRef.instance===ref.componentInstance&&!ref.componentRef.hostView.destroyed,'dialog opener actual component view differs');
 assert.ok(service.getDialogById(config.id)===ref&&service.openDialogs.includes(ref),'dialog opener genuine service registry differs');
 assert.ok(ref._containerInstance instanceof owned.MatLegacyDialogContainer&&ref._containerInstance._animationsEnabled===false,'dialog opener owned container/motion differs');
 const instance=ref.componentInstance;state.subscriptions.push(ref.afterClosed().subscribe(result=>state.closed.push(result)));
 ref.close(state.result);await Promise.resolve();await Promise.resolve();
 assert.deepEqual(state.closed,[state.result]);assert.equal(value.closedResult,state.result,'dialog opener normal result did not reach helper');
 assert.ok(instance.destroyed&&ref.componentRef.hostView.destroyed&&service.getDialogById(config.id)===undefined&&!service.openDialogs.includes(ref),'dialog opener normal close retained view/registry');
 assert.ok(!fixture.component.hostView.destroyed&&!fixture.element.destroyed&&!fixture.template.destroyed&&!fixture.environment.destroyed,'dialog opener normal close destroyed borrowed context');
 // Independently run the exact exported compiler factory on the same caller node,
 // then destroy the helper before closing its still-live dialog. This proves
 // unsubscribe behavior against an actual pending afterClosed stream.
 state.Type.withComponent(Content,config);
 const control=runFactory(state.Type.ɵfac,core.Injector,core.runInInjectionContext,{injector:fixture.element.injector});
 assert.equal(control.outcome,'returned',control.error);
 assert.equal(control.requests.length,1);const request=control.requests[0];
 assert.ok(request.token===owned.MatLegacyDialog&&!request.unresolved&&['optional','self','skipSelf','host'].every(flag=>!request[flag]),'dialog opener pending-close factory identity/options differ');
 const pending=control.value,pendingRef=pending.dialogRef,pendingResults=[];
 assert.ok(pending instanceof state.Type&&pending.dialog===service&&pendingRef instanceof owned.MatLegacyDialogRef&&pendingRef.componentInstance instanceof Content,'dialog opener pending-close instance/ref/content differs');
 const pendingContent=pendingRef.componentInstance,subscription=pendingRef.afterClosed().subscribe(result=>pendingResults.push(result));
 try{
  pending.closedResult='api-pending-preserved';
  pending.ngOnDestroy();assert.equal(state.Type.component,undefined);assert.equal(state.Type.config,undefined);
  assert.equal(pending.closedResult,'api-pending-preserved');assert.equal(pendingContent.destroyed,false);assert.ok(service.openDialogs.includes(pendingRef));
  const escape=new Event('keydown',{cancelable:true});Object.defineProperties(escape,{keyCode:{value:27},key:{value:'Escape'}});
  fixture.document.body.dispatchEvent(escape);await Promise.resolve();await Promise.resolve();
  assert.equal(escape.defaultPrevented,true,'dialog opener real body Escape event was not handled');
  assert.deepEqual(pendingResults,[undefined]);assert.equal(pending.closedResult,'api-pending-preserved','destroyed dialog opener still received a pending close result');
  assert.ok(pendingContent.destroyed&&!service.openDialogs.includes(pendingRef),'dialog opener pending close retained its content/registry');
  assert.ok(!fixture.component.hostView.destroyed&&!fixture.environment.destroyed,'pending dialog close destroyed borrowed caller');
 }finally{subscription.unsubscribe();pendingRef.close();state.Type.withComponent(Content,config);}
 return {profile,constructor_calls:1,constructor_arity:1,public_with_component_configured:true,genuine_caller_service_identical:true,
  genuine_owned_ref_content_container:true,actual_component_view:true,content_data_identical:true,service_registry_identity:true,
  fixture_motion_disabled:true,result_delivery:true,closed_content_destroyed:true,closed_service_registry_cleared:true,borrowed_context_alive_after_dialog_close:true,pending_close_unsubscribe_control:true,pending_keyboard_escape_control:true};
}

export function finishDialogOpenerContext(state,value,fixture,evidence){
 assert.ok(state.Type.component===undefined,'dialog opener teardown did not clear component configuration');assert.ok(state.Type.config===undefined,'dialog opener teardown did not clear dialog configuration');
 assert.equal(value.closedResult,state.result);
 assert.ok(!fixture.component.hostView.destroyed&&!fixture.element.destroyed&&!fixture.template.destroyed&&!fixture.environment.destroyed,'dialog opener teardown destroyed caller context');
 evidence.public_static_configuration_cleared_on_teardown=true;evidence.borrowed_context_alive_after_opener_teardown=true;return evidence;
}

export function dialogOpenerObservationProblems(row){
 if(row?.symbol?.symbol_id!==DIALOG_OPENER_SYMBOL)return [];
 const profile=dialogOpenerProfile(row.symbol),want={profile,constructor_calls:1,constructor_arity:1,public_with_component_configured:true,genuine_caller_service_identical:true,
  genuine_owned_ref_content_container:true,actual_component_view:true,content_data_identical:true,service_registry_identity:true,
  fixture_motion_disabled:true,result_delivery:true,closed_content_destroyed:true,closed_service_registry_cleared:true,borrowed_context_alive_after_dialog_close:true,pending_close_unsubscribe_control:true,pending_keyboard_escape_control:true,
  public_static_configuration_cleared_on_teardown:true,borrowed_context_alive_after_opener_teardown:true};
 return row.factory_outcome==='returned'&&isDeepStrictEqual(row.factory_dialog_opener_context,want)?[]:['configured dialog opener actual service/content/result/lifetime evidence incomplete'];
}
