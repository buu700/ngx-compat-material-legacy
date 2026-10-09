/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {originalCompilerFactoryContext,originalContextDi} from './api-original-factory-contexts.mjs';
const require=createRequire(import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex');
export const AUTOCOMPLETE_SYMBOL='legacy-autocomplete/primary/MatLegacyAutocompleteTrigger';
const ownerExport='_MatLegacyAutocompleteTriggerBase';
export function autocompleteProfile(symbol){
 if(symbol?.symbol_id!==AUTOCOMPLETE_SYMBOL)return null;
 assert.equal(symbol.family,'legacy-autocomplete');assert.equal(symbol.kind,'primary');assert.equal(symbol.name,'MatLegacyAutocompleteTrigger');
 const original=originalCompilerFactoryContext(symbol.shape.originalFactory);assert.deepEqual(symbol.shape.originalFactoryContext,original);
 assert.equal(original.parameter_factory_key,'@angular/material:fesm2022/autocomplete.mjs#_MatAutocompleteTriggerBase');
 assert.equal(original.factory_parameters.length,11);const view=originalContextDi(symbol.shape)[2];
 assert.deepEqual([view.ident,view.imported,view.spec,Boolean(view.optional),Boolean(view.self),Boolean(view.skipSelf),Boolean(view.host)],['ViewContainerRef','ViewContainerRef','@angular/core',false,false,false,false]);
 return {symbol_id:AUTOCOMPLETE_SYMBOL,parameter_factory_key:original.parameter_factory_key,original_source_sha256:original.ancestry.find(a=>a.key===original.parameter_factory_key).source_sha256,constructor_arity:11,view_index:2};
}

export function autocompleteFormFieldTokenMatches(symbol,param,owned,peer,token){
 const profile=autocompleteProfile(symbol);assert.ok(profile);
 const original=originalContextDi(symbol.shape)[7];assert.deepEqual(param,original);
 assert.deepEqual([param.ident,param.imported,param.spec,Boolean(param.optional),Boolean(param.host)],['MAT_FORM_FIELD','MAT_FORM_FIELD','@angular/material/form-field',true,true]);
 return Boolean(owned.MAT_LEGACY_FORM_FIELD&&owned.MAT_LEGACY_FORM_FIELD!==peer.MAT_FORM_FIELD&&token===owned.MAT_LEGACY_FORM_FIELD);
}

function sourceScope(Type,owned,file){
 const Owner=owned[ownerExport];assert.ok(typeof Owner==='function'&&Object.getPrototypeOf(Type)===Owner&&Type.prototype instanceof Owner,'autocomplete exact owned constructor identity differs');
 const ts=require('typescript'),source=readFileSync(file,'utf8'),owner=Function.prototype.toString.call(Owner),at=source.indexOf(owner);
 assert.ok(at>=0&&source.indexOf(owner,at+1)<0,'autocomplete constructor source absent/ambiguous');
 const root=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),parsed=ts.createSourceFile('owner.js','('+owner+')',ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),cls=parsed.statements[0]?.expression?.expression;
 assert.ok(!root.parseDiagnostics.length&&!parsed.parseDiagnostics.length&&ts.isClassExpression(cls));
 const bindings=root.statements.filter(ts.isImportDeclaration).flatMap(n=>n.moduleSpecifier.text==='@angular/cdk/layout'&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)?n.importClause.namedBindings.elements.filter(e=>(e.propertyName?.text||e.name.text)==='BreakpointObserver').map(e=>e.name.text):[]);
 assert.equal(bindings.length,1);const constructors=cls.members.filter(ts.isConstructorDeclaration);assert.equal(constructors.length,1);assert.equal(constructors[0].parameters.length,11);
 const assignments=[];const visit=node=>{if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&node.left.getText(parsed)==='this._breakpointObserver')assignments.push(node);ts.forEachChild(node,visit);};visit(cls);
 assert.equal(assignments.length,1);const expr=assignments[0].right;
 assert.ok(assignments[0].pos>=constructors[0].pos&&assignments[0].end<=constructors[0].end&&ts.isCallExpression(expr)&&expr.expression.getText(parsed)==='this._viewContainerRef.injector.get'&&expr.arguments.length===1&&expr.arguments[0].getText(parsed)===bindings[0],'autocomplete lookup is not the exact public view injector request');
 const starts=[0];for(let i=source.indexOf('\n');i>=0;i=source.indexOf('\n',i+1))starts.push(i+1);
 return {file,start:at+expr.getStart(parsed)-1,end:at+expr.end-1,starts,proof:{file,sha256:sha(source),owner_text_sha256:sha(owner),lookup_text_sha256:sha(expr.getText(parsed))}};
}
function sourceCall(stack,scope){return String(stack).split('\n').some(line=>{const m=line.match(/(?:\(|at )(file:\/\/[^()]+|\/[^()]+):(\d+):(\d+)\)?$/);if(!m)return false;const file=m[1].startsWith('file:')?fileURLToPath(m[1]):m[1],start=scope.starts[+m[2]-1];return file===scope.file&&start!==undefined&&start+(+m[3])-1>=scope.start&&start+(+m[3])-1<scope.end;});}

/** Instrument only the supplied instance's public getter; delegate every request to its real injector. */
export function createAutocompleteCapture(profile,core,Type,owned,file,layout){
 const scope=sourceScope(Type,owned,file),state={profile,core,layout,scope,reads:[],requests:[],view:null,injector:null,originalDescriptor:null};
 state.beforeConstructor=values=>{
  assert.equal(values.length,11);assert.ok(state.view===null,'autocomplete constructor interception repeated');
  const view=state.view=values[2];assert.ok(view&&typeof view.injector?.get==='function','autocomplete supplied public view injector unavailable');
  const injector=state.injector=view.injector;state.originalDescriptor=Object.getOwnPropertyDescriptor(view,'injector');
  state.service=injector.get(layout.BreakpointObserver);state.destroyDescriptor=Object.getOwnPropertyDescriptor(state.service,'ngOnDestroy');state.destroyCalls=0;
  const destroy=state.service.ngOnDestroy;Object.defineProperty(state.service,'ngOnDestroy',{configurable:true,value(...args){state.destroyCalls++;return destroy.apply(this,args);}});
  const tracing=new class extends core.Injector{get(token,...args){const request={token,args_count:args.length,stack:new Error().stack};state.requests.push(request);try{request.value=injector.get(token,...args);return request.value;}catch(error){request.unresolved=true;throw error;}}};
  Object.defineProperty(view,'injector',{configurable:true,get(){state.reads.push(new Error().stack);return tracing;}});
 };
 state.restore=()=>{if(state.view){if(state.originalDescriptor)Object.defineProperty(state.view,'injector',state.originalDescriptor);else delete state.view.injector;}};
 state.close=()=>{state.restore();if(state.service){if(state.destroyDescriptor)Object.defineProperty(state.service,'ngOnDestroy',state.destroyDescriptor);else delete state.service.ngOnDestroy;}};
 return state;
}

export function observeAutocompleteInputs(state,capture,fixture){
 const {core,layout,profile,scope,view,injector}=state,value=capture.value;
 assert.equal(capture.constructor_calls,1);assert.equal(capture.inputs.length,11);assert.ok(capture.inputs[2]===view&&value._viewContainerRef===view,'autocomplete supplied view/input identity differs');
 assert.ok(view.element.nativeElement===fixture.element.element.nativeElement&&injector.get(core.ElementRef).nativeElement===fixture.element.element.nativeElement,'autocomplete public view injector belongs to a different node');
 assert.ok(injector.get(fixture.scopeToken,undefined,{self:true})===fixture.childValue,'autocomplete view injector self scope differs');
 assert.equal(state.reads.length,1);assert.equal(state.requests.length,1);const request=state.requests[0];
 assert.ok(sourceCall(state.reads[0],scope)&&sourceCall(request.stack,scope),'autocomplete public lookup source differs');
 assert.ok(request.token===layout.BreakpointObserver&&request.args_count===0&&!request.unresolved,'autocomplete public breakpoint token/options differ');
 const independent=fixture.element.injector.get(layout.BreakpointObserver);
 assert.ok(independent instanceof layout.BreakpointObserver&&request.value===independent&&value._breakpointObserver===independent,'autocomplete breakpoint service differs from actual caller control');
 value.ngAfterViewInit();
 const window=fixture.document.defaultView;assert.ok(window instanceof EventTarget);
 value._canOpenOnNextFocus=false;window.dispatchEvent(new Event('blur'));
 assert.equal(value._canOpenOnNextFocus,true,'autocomplete genuine window blur handler did not execute');
 return {profile,source:scope.proof,constructor_owner:{public_export:ownerExport,depth:1,owned_class_identity_matched:true},constructor_calls:1,constructor_arity:11,
  supplied_view_input_identical:true,supplied_view_node_self_scope:true,public_getter_reads:1,public_lookup_requests:1,lookup:{ident:'BreakpointObserver',spec:'@angular/cdk/layout',token_identity_matched:true,args_count:0,unresolved:false,value_identical_to_independent_control:true},
  actual_service_instance:true,window_listener_delivery:true};
}

export async function finishAutocompleteContext(state,value,fixture,evidence){
 assert.equal(state.destroyCalls,0,'autocomplete destroyed borrowed public breakpoint service');
 assert.equal(value._componentDestroyed,true,'autocomplete owned destroy hook did not execute');assert.ok(!fixture.element.destroyed&&!fixture.template.destroyed&&!fixture.environment.destroyed,'autocomplete teardown destroyed borrowed context');
 value._canOpenOnNextFocus=false;fixture.document.defaultView.dispatchEvent(new Event('blur'));assert.equal(value._canOpenOnNextFocus,false,'autocomplete teardown retained window listener');
 const events=[],subscription=value._breakpointObserver.observe(state.layout.Breakpoints.HandsetLandscape).subscribe(x=>events.push(x.matches));
 subscription.unsubscribe();assert.ok(events.length>0&&events.every(x=>typeof x==='boolean'),'autocomplete teardown destroyed borrowed breakpoint service');
 evidence.window_listener_removed_on_teardown=true;evidence.borrowed_context_alive_after_teardown=true;evidence.borrowed_service_usable_after_teardown=true;return evidence;
}

export function autocompleteObservationProblems(row){
 if(row?.symbol?.symbol_id!==AUTOCOMPLETE_SYMBOL)return [];
 const profile=autocompleteProfile(row.symbol),x=row.factory_autocomplete_context;
 const {source,...rest}=x||{},want={profile,constructor_owner:{public_export:ownerExport,depth:1,owned_class_identity_matched:true},constructor_calls:1,constructor_arity:11,supplied_view_input_identical:true,supplied_view_node_self_scope:true,public_getter_reads:1,public_lookup_requests:1,
  lookup:{ident:'BreakpointObserver',spec:'@angular/cdk/layout',token_identity_matched:true,args_count:0,unresolved:false,value_identical_to_independent_control:true},actual_service_instance:true,window_listener_delivery:true,window_listener_removed_on_teardown:true,borrowed_context_alive_after_teardown:true,borrowed_service_usable_after_teardown:true};
 return row.factory_outcome==='returned'&&isDeepStrictEqual(rest,want)&&source?.file?.endsWith('/fesm2022/ngx-compat-material-legacy-legacy-autocomplete.mjs')&&['sha256','owner_text_sha256','lookup_text_sha256'].every(k=>/^[a-f0-9]{64}$/.test(source[k]||''))?[]:['autocomplete public view/service/source/window/lifetime evidence incomplete'];
}
