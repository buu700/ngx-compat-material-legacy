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
import {readFileSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {originalCompilerFactoryContext,originalContextDi} from './api-original-factory-contexts.mjs';
import {partitionPublicConstructorRequests} from './api-public-constructor-internals.mjs';
const require=createRequire(import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex');
export const TAB_PORTAL_SYMBOL='legacy-tabs/primary/MatLegacyTabBodyPortal';
export function tabPortalContract(symbol){
 if(symbol?.symbol_id!==TAB_PORTAL_SYMBOL)return null;
 assert.equal(symbol.family,'legacy-tabs');assert.equal(symbol.kind,'primary');assert.equal(symbol.name,'MatLegacyTabBodyPortal');
 const original=originalCompilerFactoryContext(symbol.shape.originalFactory);assert.deepEqual(original,symbol.shape.originalFactoryContext);
 assert.equal(original.parameter_factory_key,'@angular/material:fesm2022/legacy-tabs.mjs#MatLegacyTabBodyPortal');
 const p=originalContextDi(symbol.shape);assert.equal(p.length,4);
 for(const [index,name,spec]of [[0,'ComponentFactoryResolver','@angular/core'],[1,'ViewContainerRef','@angular/core'],[3,'DOCUMENT','@angular/common']]){
  assert.equal(p[index].ident,name);assert.equal(p[index].imported,name);assert.equal(p[index].spec,spec);
 }
 assert.equal(original.factory_parameters[2].unresolved_expression,'forwardRef(() => MatLegacyTabBody)');
 assert.deepEqual([p[2].ident,p[2].imported,p[2].spec,p[2].original_reference_expression],['MatLegacyTabBody','MatLegacyTabBody',null,'forwardRef(() => MatLegacyTabBody)']);
 for(const param of p)for(const flag of ['optional','self','skipSelf','host'])assert.equal(Boolean(param[flag]),false);
 return {symbol_id:TAB_PORTAL_SYMBOL,original_arity:4,owned_arity:3,removed_index:0,removed_ident:'ComponentFactoryResolver',parameter_factory_key:original.parameter_factory_key,runtime_requests:p.slice(1)};
}
const fields=[['_moduleRef','NgModuleRef',true],['_document','DOCUMENT',false],['_viewContainerRef','ViewContainerRef',false]];
function scopes(Owner,file){
 const parentText=Function.prototype.toString.call(Owner);
 if(!readFileSync(file,'utf8').includes(parentText)){
  const directory=dirname(file),matches=readdirSync(directory).filter(name=>/^_portal[-\w]*chunk\.mjs$/.test(name)).map(name=>join(directory,name)).filter(path=>readFileSync(path,'utf8').includes(parentText));
  assert.equal(matches.length,1,'public exported portal parent source is absent/ambiguous');file=matches[0];
 }
 const ts=require('typescript'),source=readFileSync(file,'utf8'),text=Function.prototype.toString.call(Owner),at=source.indexOf(text);assert.ok(at>=0&&source.indexOf(text,at+1)<0,'public portal parent source absent/ambiguous');
 const root=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),parsed=ts.createSourceFile('parent.js','('+text+')',ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),cls=parsed.statements[0]?.expression?.expression;assert.ok(!root.parseDiagnostics.length&&!parsed.parseDiagnostics.length&&ts.isClassExpression(cls));
 const imports=new Map();for(const n of root.statements)if(ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))for(const e of n.importClause.namedBindings.elements)imports.set(e.name.text,{name:e.propertyName?.text||e.name.text,spec:n.moduleSpecifier.text});
 const ranges=fields.map(([field,name,optional])=>{
  const matches=cls.members.filter(n=>ts.isPropertyDeclaration(n)&&n.name?.getText(parsed)===field);assert.equal(matches.length,1);
  const call=matches[0].initializer;assert.ok(ts.isCallExpression(call)&&ts.isIdentifier(call.expression));assert.deepEqual(imports.get(call.expression.text),{name:'inject',spec:'@angular/core'});assert.equal(call.arguments.length,optional?2:1);
  const binding=imports.get(call.arguments[0].getText(parsed));assert.ok(binding?.name===name&&(binding.spec==='@angular/core'||name==='DOCUMENT'&&binding.spec==='@angular/common'));
  if(optional){const options=call.arguments[1];assert.ok(ts.isObjectLiteralExpression(options));assert.equal(options.properties.length,1);const option=options.properties[0];assert.ok(ts.isPropertyAssignment(option));assert.equal(option.name.getText(parsed),'optional');assert.equal(option.initializer.kind,ts.SyntaxKind.TrueKeyword);}
  return [at+call.getStart(parsed)-1,at+call.end-1];
 });
 const starts=[0];for(let i=source.indexOf('\n');i>=0;i=source.indexOf('\n',i+1))starts.push(i+1);
 return {file,ranges,starts,proof:{file,sha256:sha(source),parent_text_sha256:sha(text)}};
}
function origin(request,scope){return String(request.stack||'').split('\n').some(line=>{const m=line.match(/(?:\(|at )(file:\/\/[^()]+|\/[^()]+):(\d+):(\d+)\)?$/);if(!m)return false;const file=m[1].startsWith('file:')?fileURLToPath(m[1]):m[1],at=scope.starts[+m[2]-1]+(+m[3])-1;return file===scope.file&&scope.ranges.some(([a,b])=>at>=a&&at<b);});}
export function observeTabPortalContext(contract,capture,fixture,Type,owned,portal,core,runFactory){
 const value=capture.value,parent=fixture.parentNode.owner,node=fixture.template,Owner=portal.CdkPortalOutlet;
 assert.equal(capture.constructor_calls,1);assert.equal(capture.inputs.length,3);assert.ok(Object.getPrototypeOf(Type)===Owner&&value instanceof Owner,'tab portal public parent identity differs');
 assert.ok(parent instanceof owned.MatLegacyTabBody&&capture.inputs[1]===parent&&value._host===parent,'tab portal original parent input differs');
 assert.ok(capture.inputs[0].element.nativeElement===node.container.element.nativeElement&&capture.inputs[2]===fixture.document,'tab portal original caller inputs differ');
 const source=scopes(Owner,require.resolve('@angular/cdk/portal')),classified=[],retained=[];
 for(const request of capture.requests)if(origin(request,source))classified.push(request);else retained.push(request);
 const control=runFactory(()=>new Owner(),core.Injector,core.runInInjectionContext,{injector:node.injector,captureStack:true});assert.equal(control.outcome,'returned',control.error);
 const partition=partitionPublicConstructorRequests(control.requests,core,runFactory,node.injector);assert.equal(partition.requests.length,3);assert.equal(classified.length,3);
 for(let i=0;i<3;i++)for(const request of [classified[i],partition.requests[i]]){
  assert.ok(request.token===core[fields[i][1]]&&!request.unresolved,'public portal parent token/control differs');
  for(const flag of ['optional','self','skipSelf','host'])assert.equal(Boolean(request[flag]),flag==='optional'&&fields[i][2]);
 }
 // Independent genuine public outlet controls exercise the actual caller view.
 const context={case:'public-parent'},content=new portal.TemplatePortal(node.template,node.container,context);
 const publicView=control.value.attach(content);assert.ok(control.value.attachedRef===publicView&&publicView.context===context&&!publicView.destroyed&&node.container.length===1);control.value.ngOnDestroy();assert.ok(publicView.destroyed&&node.container.length===0);
 assert.ok(value._moduleRef===control.value._moduleRef&&value._document===fixture.document&&value._viewContainerRef.element.nativeElement===node.container.element.nativeElement,'public portal parent values/node differ');
 // This exported factory creates a second outlet under a real body. Dispose
 // the fixture-owned original sibling so each diagnostic outlet owns one view.
 // The packed/native component suite separately tests the normal single outlet.
 assert.ok(parent._portalHost instanceof Type&&parent._portalHost!==value);parent._portalHost.ngOnDestroy();
 const previous={content:parent._content,preserve:parent.preserveContent},views=[];let attached=0;
 const subscription=value.attached.subscribe(()=>attached++);
 try{
  parent._content=new portal.TemplatePortal(node.template,node.container,{case:'owned-parent'});value.ngOnInit();assert.equal(value.hasAttached(),false);
  parent._beforeCentering.emit(true);const first=value.attachedRef;assert.ok(first&&!first.destroyed&&first.context===parent._content.context&&node.container.length===1);views.push(first);assert.equal(attached,1);
  parent._beforeCentering.emit(true);assert.ok(value.attachedRef===first);assert.equal(attached,1);
  parent.preserveContent=true;parent._afterLeavingCenter.emit();assert.ok(value.hasAttached()&&!first.destroyed);
  parent.preserveContent=false;parent._afterLeavingCenter.emit();assert.ok(!value.hasAttached()&&first.destroyed&&node.container.length===0);
  parent._beforeCentering.emit(true);const second=value.attachedRef;assert.ok(second&&second!==first&&!second.destroyed&&node.container.length===1);views.push(second);assert.equal(attached,2);
  return {requests:retained,state:{parent,node,views,subscription,previous,parentSubscriptions:[value._centeringSub,value._leavingSub]},observation:{symbol_id:TAB_PORTAL_SYMBOL,original_arity:4,owned_arity:3,removed_index:0,removed_ident:'ComponentFactoryResolver',constructor_calls:1,original_inputs_identical:true,public_parent_identity_matched:true,parent_source:source.proof,total_requests:capture.requests.length,retained_requests:retained.length,classified_requests:3,requests:fields.map(([_field,ident,optional])=>({ident,spec:'@angular/core',identity_matched:true,unresolved:false,optional,self:false,skipSelf:false,host:false})),independent_public_parent_view_control:true,fixture_sibling_outlet_isolated:true,attach_detach_preserve_reattach:true,attached_events:2}};
 }catch(error){value.ngOnDestroy();subscription.unsubscribe();parent._content=previous.content;parent.preserveContent=previous.preserve;throw error;}
}
export function finishTabPortalContext(state,fixture,evidence){
 const {parent,node,views,subscription,previous,parentSubscriptions}=state;subscription.unsubscribe();
 try{assert.ok(views.every(view=>view.destroyed)&&node.container.length===0,'tab portal teardown retained an owned view');assert.ok(parentSubscriptions.every(sub=>sub.closed===true),'tab portal teardown retained a parent subscription');parent._beforeCentering.emit(true);assert.equal(node.container.length,0,'tab portal teardown reattached a view');parent._afterLeavingCenter.emit();assert.ok(!parent._destroyed&&!fixture.parentNode.destroyed&&!fixture.component.hostView.destroyed&&!fixture.environment.destroyed,'tab portal teardown destroyed borrowed caller');evidence.owned_views_destroyed=true;evidence.parent_subscriptions_removed=true;evidence.borrowed_parent_view_alive=true;return evidence;}
 finally{parent._content=previous.content;parent.preserveContent=previous.preserve;}
}
export function tabPortalObservationProblems(row){
 if(row?.symbol?.symbol_id!==TAB_PORTAL_SYMBOL)return [];
 const contract=tabPortalContract(row.symbol),x=row.factory_tab_portal_context;
 const parent=row.factory_tab_portal_parent_context;
 if(!isDeepStrictEqual(parent,{actual_parent_component:true,actual_parent_view_initialized:true,actual_content_element_and_portal_queries:true,parent_self_provider_identical:true,child_ancestor_provider_identical:true,child_self_provider_absent:true,actual_constructor_parent_identical:true,borrowed_parent_view_alive_after_child_teardown:true}))return ['tab portal actual parent/component/view/scope evidence incomplete'];
 const keys=['symbol_id','original_arity','owned_arity','removed_index','removed_ident','constructor_calls','original_inputs_identical','public_parent_identity_matched','parent_source','total_requests','retained_requests','classified_requests','requests','independent_public_parent_view_control','fixture_sibling_outlet_isolated','attach_detach_preserve_reattach','attached_events','owned_views_destroyed','parent_subscriptions_removed','borrowed_parent_view_alive'];
 if(row.factory_outcome!=='returned'||!x||!isDeepStrictEqual(Object.keys(x).sort(),keys.sort())||!isDeepStrictEqual(Object.keys(x.parent_source||{}).sort(),['file','sha256','parent_text_sha256'].sort())||x.symbol_id!==TAB_PORTAL_SYMBOL||x.original_arity!==contract.original_arity||x.owned_arity!==3||x.removed_index!==0||x.removed_ident!=='ComponentFactoryResolver'||x.constructor_calls!==1||!Number.isInteger(x.total_requests)||!Number.isInteger(x.retained_requests)||x.retained_requests<0||x.classified_requests!==3||x.retained_requests+3!==x.total_requests||!/^.*\/fesm2022\/(?:portal|_portal[-\w]*chunk)\.mjs$/.test(x.parent_source?.file||'')||['sha256','parent_text_sha256'].some(k=>!/^([a-f0-9]{64})$/.test(x.parent_source?.[k]||''))||!isDeepStrictEqual(x.requests,fields.map(([_field,ident,optional])=>({ident,spec:'@angular/core',identity_matched:true,unresolved:false,optional,self:false,skipSelf:false,host:false})))||x.attached_events!==2||['original_inputs_identical','public_parent_identity_matched','independent_public_parent_view_control','fixture_sibling_outlet_isolated','attach_detach_preserve_reattach','owned_views_destroyed','parent_subscriptions_removed','borrowed_parent_view_alive'].some(k=>x[k]!==true))return ['tab portal original/public-parent/view/lifetime evidence incomplete'];
 return [];
}
