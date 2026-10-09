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
export const MENU_CONTENT_SYMBOL='legacy-menu/primary/MatLegacyMenuContent';
const fields=['_template','_appRef','_injector','_viewContainerRef','_document','_changeDetectorRef'];
const steps=['initial-detach','attach-context','reattach-replaces-view','move-anchor-and-reattach','detach-destroys-owned-view','attach-before-destroy'];

/** Only the unused resolver slot in the authenticated historical constructor is retired. */
export function menuContentContract(symbol){
 if(symbol?.symbol_id!==MENU_CONTENT_SYMBOL)return null;
 assert.equal(symbol.family,'legacy-menu');assert.equal(symbol.kind,'primary');assert.equal(symbol.name,'MatLegacyMenuContent');
 const original=originalCompilerFactoryContext(symbol.shape.originalFactory);
 assert.deepEqual(symbol.shape.originalFactoryContext,original);
 assert.equal(original.parameter_factory_key,'@angular/material:fesm2022/menu.mjs#_MatMenuContentBase');
 const params=originalContextDi(symbol.shape);
 assert.deepEqual(params.map(p=>[p.ident,p.imported,p.spec,Boolean(p.optional),Boolean(p.self),Boolean(p.skipSelf),Boolean(p.host)]),[
  ['TemplateRef','TemplateRef','@angular/core',false,false,false,false],
  ['ComponentFactoryResolver','ComponentFactoryResolver','@angular/core',false,false,false,false],
  ['ApplicationRef','ApplicationRef','@angular/core',false,false,false,false],
  ['Injector','Injector','@angular/core',false,false,false,false],
  ['ViewContainerRef','ViewContainerRef','@angular/core',false,false,false,false],
  ['DOCUMENT','DOCUMENT','@angular/common',false,false,false,false],
  ['ChangeDetectorRef','ChangeDetectorRef','@angular/core',false,false,false,false],
 ]);
 return {symbol_id:MENU_CONTENT_SYMBOL,original_arity:7,owned_arity:6,removed_index:1,
  removed_ident:'ComponentFactoryResolver',parameter_factory_key:original.parameter_factory_key,
  original_source_sha256:original.ancestry.find(a=>a.key===original.parameter_factory_key).source_sha256,
  runtime_requests:params.filter((_,index)=>index!==1)};
}

/** Exercise the actual owned instance and genuine public template/DOM portal classes. */
export function observeMenuContentContext(contract,capture,fixture,core,portal){
 const value=capture.value,node=fixture.template,inputs=capture.inputs;
 assert.equal(capture.constructor_calls,1);assert.equal(inputs.length,6);
 assert.ok(value._template instanceof core.TemplateRef&&value._template.elementRef.nativeElement===node.template.elementRef.nativeElement,'menu content borrowed template node differs');
 assert.ok(value._viewContainerRef.element.nativeElement===node.container.element.nativeElement,'menu content borrowed container node differs');
 assert.ok(value._injector.get(core.ElementRef).nativeElement===node.template.elementRef.nativeElement,'menu content borrowed injector node differs');
 assert.ok(value._injector.get(fixture.scopeToken)===node.injector.get(fixture.scopeToken),'menu content borrowed injector ancestor scope differs');
 const app=node.injector.get(core.ApplicationRef),document=node.injector.get(core.DOCUMENT);
 assert.ok(value._appRef===app&&value._document===document,'menu content public caller services differ');
 for(let index=0;index<6;index++)assert.ok(value[fields[index]]===inputs[index],'menu content constructor field/input differs');
 assert.ok(typeof value._changeDetectorRef?.destroy==='function'&&typeof value._changeDetectorRef.markForCheck==='function'&&value._changeDetectorRef.destroyed===false,'menu content caller detector protocol differs');
 const initialCount=node.container.length,views=[],context1={case:'first'},context2={case:'second'};
 let events=0;const subscription=value._attached.subscribe(()=>events++);
 const anchor=node.template.elementRef.nativeElement,parent=anchor.parentNode;
 assert.ok(parent&&initialCount===0,'menu content diagnostic requires an empty caller container');
 const originalChildren=[...parent.childNodes];
 const check=(context,eventCount)=>{
  assert.ok(value._portal instanceof portal.TemplatePortal&&value._outlet instanceof portal.DomPortalOutlet,'menu content portal public identities differ');
  assert.ok(value._portal.templateRef===value._template&&value._portal.viewContainerRef===value._viewContainerRef,'menu content portal borrowed inputs differ');
  assert.ok(value._portal.isAttached&&value._outlet.hasAttached(),'menu content portal attachment differs');
  assert.equal(node.container.length,1);const view=node.container.get(0);assert.ok(view&&view.destroyed===false&&view.context===context,'menu content context/view differs');
  assert.ok(value._outlet.outletElement.parentNode===anchor.parentNode,'menu content outlet stayed in a stale pane');
  const siblings=anchor.parentNode.childNodes;assert.equal(siblings.indexOf(value._outlet.outletElement),siblings.indexOf(anchor)-1);
  assert.equal(events,eventCount);views.push(view);return view;
 };
 try{
  value.detach();assert.equal(node.container.length,0);assert.equal(events,0);
  value.attach(context1);const first=check(context1,1),outlet=value._outlet,templatePortal=value._portal;
  value.attach(context2);const second=check(context2,2);assert.ok(first.destroyed&&second!==first&&value._outlet===outlet&&value._portal===templatePortal,'menu content reattachment does not replace only its view');
  const nextParent=document.createElement('section');parent.appendChild(nextParent);nextParent.appendChild(anchor);
  try{value.attach(context1);check(context1,3);assert.ok(second.destroyed&&value._outlet===outlet,'menu content movement replaced caller/outlet identity');}
  finally{parent.appendChild(anchor);nextParent.remove();}
  value.detach();assert.equal(node.container.length,0);assert.ok(views.every(v=>v.destroyed)&&!value._portal.isAttached,'menu content detach retained owned views');
  value.attach(context2);check(context2,4);
  return {symbol_id:contract.symbol_id,original_arity:7,owned_arity:6,removed_index:1,removed_ident:'ComponentFactoryResolver',constructor_calls:1,
   constructor_fields_identical:true,caller_template_container_injector_scope_verified:true,caller_app_document_identical:true,
   steps:steps.map(id=>({id,result:'pass'})),attached_events:events,owned_views:views.length,
   original_children:originalChildren,view_refs:views,caller_detector:value._changeDetectorRef,initial_app_view_count:app.viewCount,app,parent,anchor,subscription};
 }catch(error){subscription.unsubscribe();value.ngOnDestroy();throw error;}
}

export function finishMenuContentContext(state,value,fixture){
 state.subscription.unsubscribe();
 assert.equal(fixture.template.container.length,0);assert.ok(state.view_refs.every(view=>view.destroyed),'menu content teardown retained an owned view');
 assert.ok(!value._portal.isAttached&&value._outlet.outletElement.parentNode===null,'menu content teardown retained its outlet');
 assert.equal(state.app.viewCount,state.initial_app_view_count);
 assert.ok(!fixture.component.hostView.destroyed&&!fixture.element.destroyed&&!fixture.template.destroyed&&!fixture.environment.destroyed,'menu content teardown destroyed borrowed context');
 const {original_children,view_refs,caller_detector,initial_app_view_count,app,parent,anchor,subscription,...evidence}=state;
 evidence.borrowed_context_alive_after_owned_teardown=true;evidence.owned_views_destroyed=true;evidence.outlet_removed=true;
 caller_detector.destroy();
 assert.ok(fixture.element.destroyed&&fixture.template.destroyed&&!fixture.environment.destroyed,'menu content detector does not belong to caller view');
 evidence.caller_detector_scope_verified=true;return evidence;
}

export function menuContentObservationProblems(row){
 if(row?.symbol?.symbol_id!==MENU_CONTENT_SYMBOL)return [];
 const contract=menuContentContract(row.symbol),x=row.factory_menu_content_context;
 const want={symbol_id:contract.symbol_id,original_arity:7,owned_arity:6,removed_index:1,removed_ident:'ComponentFactoryResolver',constructor_calls:1,
  constructor_fields_identical:true,caller_template_container_injector_scope_verified:true,caller_app_document_identical:true,
  steps:steps.map(id=>({id,result:'pass'})),attached_events:4,owned_views:4,
  borrowed_context_alive_after_owned_teardown:true,owned_views_destroyed:true,outlet_removed:true,caller_detector_scope_verified:true};
 return row.factory_outcome==='returned'&&isDeepStrictEqual(x,want)?[]:['menu content conservative resolver-removal behavior/caller/lifetime evidence incomplete'];
}
