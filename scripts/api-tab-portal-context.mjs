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
// Bind the reviewed routing protocol to the exact packed helper, including its
// imports. A changed helper requires a successor review, not a loose match.
export function tabPortalHelperProof(source,file){
 const ts=require('typescript'),root=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(root.parseDiagnostics.length,0);
 const bindings=new Map();
 for(const n of root.statements)if(ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))
  for(const e of n.importClause.namedBindings.elements)bindings.set(e.name.text,[e.propertyName?.text||e.name.text,n.moduleSpecifier.text]);
 for(const [name,spec] of [['Injector','@angular/core'],['ViewContainerRef','@angular/core'],['runInInjectionContext','@angular/core'],['DOCUMENT','@angular/common'],['CdkPortalOutlet','@angular/cdk/portal']])
  assert.deepEqual(bindings.get(name),[name,spec]);
 const expected={LegacyTabPortalConstructorInjector:'7bd3b7214c459fcc9d9bc5b39478fc961c21dcabad96ac568638c1985927c9b1',constructLegacyTabBodyPortal:'66e27d40f99692aa3a5f22191d80748a8217067af9b08f285ec1e929e1736f4a'};
 for(const [name,digest] of Object.entries(expected)){
  const matches=root.statements.filter(n=>n.name?.text===name);assert.equal(matches.length,1);
  assert.equal(sha(matches[0].getText(root)),digest,`packed portal helper ${name} changed`);
 }
 const classes=root.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyTabBodyPortal');assert.equal(classes.length,1);
 const constructors=classes[0].members.filter(ts.isConstructorDeclaration);assert.equal(constructors.length,1);
 const constructor_sha256=sha(constructors[0].getText(root));assert.equal(constructor_sha256,'ac8815e9cac68d552c74855a0476fc4254367e5daeea9aa3f2d634d7a1312c33');
 return {file:'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs',sha256:sha(source),helper_sha256:expected,constructor_sha256,class_text_sha256:sha(classes[0].getText(root))};
}
export function portalParentScopeFromSource(Owner,source,file){
 const ts=require('typescript'),root=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(root.parseDiagnostics.length,0,'public portal peer source must parse');
 // Resolve the public export to an actual top-level declaration, not a text
 // occurrence: comments, nested expressions and unexported decoys do not count.
 const exports=[];
 for(const n of root.statements)if(ts.isExportDeclaration(n)&&!n.moduleSpecifier&&n.exportClause&&ts.isNamedExports(n.exportClause))
  for(const e of n.exportClause.elements)if(e.name.text==='CdkPortalOutlet')exports.push(e.propertyName?.text||e.name.text);
 const direct=root.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text==='CdkPortalOutlet'&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword));
 if(direct.length)exports.push('CdkPortalOutlet');
 assert.equal(exports.length,1,'public portal export absent or ambiguous');
 const matches=root.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===exports[0]);
 assert.equal(matches.length,1,'public portal class declaration absent or ambiguous');
 const cls=matches[0],text=Function.prototype.toString.call(Owner);
 assert.equal(cls.getText(root),text,'runtime public portal class differs from exported source declaration');
 const imports=new Map();
 const declarations=new Map();
 const declare=name=>declarations.set(name,(declarations.get(name)||0)+1);
 const declarePattern=name=>{if(ts.isIdentifier(name))declare(name.text);else if(ts.isObjectBindingPattern(name)||ts.isArrayBindingPattern(name))for(const e of name.elements)if(ts.isBindingElement(e))declarePattern(e.name);};
 for(const n of root.statements){
  if(ts.isImportDeclaration(n)&&n.importClause){if(n.importClause.name)declare(n.importClause.name.text);const b=n.importClause.namedBindings;if(b&&ts.isNamespaceImport(b))declare(b.name.text);else if(b&&ts.isNamedImports(b))for(const e of b.elements)declare(e.name.text);}
  else if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)declarePattern(d.name);
  else if((ts.isClassDeclaration(n)||ts.isFunctionDeclaration(n))&&n.name)declare(n.name.text);
 }
 for(const n of root.statements)if(ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))
  for(const e of n.importClause.namedBindings.elements){const key=e.name.text;assert.ok(!imports.has(key),'duplicate imported local');imports.set(key,{name:e.propertyName?.text||key,spec:n.moduleSpecifier.text});}
 const ranges=fields.map(([field,name,optional])=>{
  const members=cls.members.filter(n=>ts.isPropertyDeclaration(n)&&n.name?.getText(root)===field);assert.equal(members.length,1);
  const call=members[0].initializer;assert.ok(ts.isCallExpression(call)&&ts.isIdentifier(call.expression));assert.deepEqual(imports.get(call.expression.text),{name:'inject',spec:'@angular/core'});assert.equal(declarations.get(call.expression.text),1);assert.equal(call.arguments.length,optional?2:1);
  const argument=call.arguments[0];assert.ok(ts.isIdentifier(argument));const binding=imports.get(argument.text);assert.ok(binding?.name===name&&(binding.spec==='@angular/core'||name==='DOCUMENT'&&binding.spec==='@angular/common'));assert.equal(declarations.get(argument.text),1);
  // These are class field initializers with identifier-only callees and token
  // arguments. Reject a class name shadowing either imported binding.
  assert.notEqual(cls.name?.text,call.expression.text);assert.notEqual(cls.name?.text,argument.text);
  if(optional){const options=call.arguments[1];assert.ok(ts.isObjectLiteralExpression(options));assert.equal(options.properties.length,1);const option=options.properties[0];assert.ok(ts.isPropertyAssignment(option));assert.equal(option.name.getText(root),'optional');assert.equal(option.initializer.kind,ts.SyntaxKind.TrueKeyword);}
  return [call.getStart(root),call.end];
 });
 const starts=[0];for(let i=source.indexOf('\n');i>=0;i=source.indexOf('\n',i+1))starts.push(i+1);
 return {file,ranges,starts,proof:{module:'@angular/cdk/portal#CdkPortalOutlet',sha256:sha(source),parent_text_sha256:sha(text)}};
}
function scopes(Owner,file){return portalParentScopeFromSource(Owner,readFileSync(file,'utf8'),file);}

function origin(request,scope){return String(request.stack||'').split('\n').some(line=>{const m=line.match(/(?:\(|at )(file:\/\/[^()]+|\/[^()]+):(\d+):(\d+)\)?$/);if(!m)return false;const file=m[1].startsWith('file:')?fileURLToPath(m[1]):m[1],at=scope.starts[+m[2]-1]+(+m[3])-1;return file===scope.file&&scope.ranges.some(([a,b])=>at>=a&&at<b);});}
export function observeTabPortalContext(contract,capture,fixture,Type,owned,portal,core,runFactory,packedFile){
 const value=capture.value,parent=fixture.parentNode.owner,node=fixture.template,Owner=portal.CdkPortalOutlet;
 assert.equal(capture.constructor_calls,1);assert.equal(capture.inputs.length,3);assert.ok(Object.getPrototypeOf(Type)===Owner&&value instanceof Owner,'tab portal public parent identity differs');
 assert.ok(parent instanceof owned.MatLegacyTabBody&&capture.inputs[1]===parent&&value._host===parent,'tab portal original parent input differs');
 assert.ok(capture.inputs[0].element.nativeElement===node.container.element.nativeElement&&capture.inputs[2]===fixture.document,'tab portal original caller inputs differ');
 const helper=tabPortalHelperProof(readFileSync(packedFile,'utf8'),packedFile);
 assert.equal(sha(Function.prototype.toString.call(Type)),helper.class_text_sha256,'actual exported portal class differs from packed helper caller');
 const source=scopes(Owner,require.resolve('@angular/cdk/portal')),retained=capture.requests;
 const control=runFactory(()=>new Owner(),core.Injector,core.runInInjectionContext,{injector:node.injector,captureStack:true});assert.equal(control.outcome,'returned',control.error);
 const partition=partitionPublicConstructorRequests(control.requests,core,runFactory,node.injector);assert.equal(partition.requests.length,3);
 assert.ok(partition.requests.every(request=>origin(request,source)),'public parent control request source differs');
 for(let i=0;i<3;i++)for(const request of [partition.requests[i]]){
  assert.ok(request.token===core[fields[i][1]]&&!request.unresolved,'public portal parent token/control differs');
  for(const flag of ['optional','self','skipSelf','host'])assert.equal(Boolean(request[flag]),flag==='optional'&&fields[i][2]);
 }
 // Independent genuine public outlet controls exercise the actual caller view.
 const context={case:'public-parent'},content=new portal.TemplatePortal(node.template,node.container,context);
 const publicView=control.value.attach(content);assert.ok(control.value.attachedRef===publicView&&publicView.context===context&&!publicView.destroyed&&node.container.length===1);control.value.ngOnDestroy();assert.ok(publicView.destroyed&&node.container.length===0);
 assert.ok(value._moduleRef===control.value._moduleRef&&value._document===fixture.document&&value._viewContainerRef.element.nativeElement===node.container.element.nativeElement,'public portal parent values/node differ');
 assert.equal(value._viewContainerRef,capture.inputs[0]);
 // An independently supplied container/document must reach the genuine parent.
 const suppliedModule={case:'manual-module'},caller=capture.inputs[0].injector;
 const suppliedInjector=new class extends core.Injector {get(token,notFound,options){return token===core.NgModuleRef?suppliedModule:caller.get(token,notFound,options);}};
 const suppliedContainer=new Proxy(capture.inputs[0],{get:(target,key)=>key==='injector'?suppliedInjector:Reflect.get(target,key,target)}),suppliedDocument={case:'manual-document'};
 const manual=new Type(suppliedContainer,parent,suppliedDocument);
 assert.ok(manual instanceof Owner&&manual._viewContainerRef===suppliedContainer&&manual._document===suppliedDocument&&manual._host===parent&&manual._moduleRef===suppliedModule);
 manual.ngOnDestroy();assert.ok(!parent._destroyed&&!fixture.parentNode.destroyed,'manual portal destroyed borrowed parent');
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
  return {requests:retained,state:{parent,node,views,subscription,previous,parentSubscriptions:[value._centeringSub,value._leavingSub]},observation:{symbol_id:TAB_PORTAL_SYMBOL,original_arity:4,owned_arity:3,removed_index:0,removed_ident:'ComponentFactoryResolver',constructor_calls:1,original_inputs_identical:true,public_parent_identity_matched:true,parent_source:source.proof,packed_helper:helper,outer_requests:retained.length,public_control_requests:3,requests:fields.map(([_field,ident,optional])=>({ident,spec:'@angular/core',identity_matched:true,unresolved:false,optional,self:false,skipSelf:false,host:false})),manual_argument_overrides:true,independent_public_parent_view_control:true,fixture_sibling_outlet_isolated:true,attach_detach_preserve_reattach:true,attached_events:2}};
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
 const keys=['symbol_id','original_arity','owned_arity','removed_index','removed_ident','constructor_calls','original_inputs_identical','public_parent_identity_matched','parent_source','packed_helper','outer_requests','public_control_requests','requests','manual_argument_overrides','independent_public_parent_view_control','fixture_sibling_outlet_isolated','attach_detach_preserve_reattach','attached_events','owned_views_destroyed','parent_subscriptions_removed','borrowed_parent_view_alive'];
 if(row.factory_outcome!=='returned'||!x||!isDeepStrictEqual(Object.keys(x).sort(),keys.sort())||!isDeepStrictEqual(Object.keys(x.parent_source||{}).sort(),['module','sha256','parent_text_sha256'].sort())||x.symbol_id!==TAB_PORTAL_SYMBOL||x.original_arity!==contract.original_arity||x.owned_arity!==3||x.removed_index!==0||x.removed_ident!=='ComponentFactoryResolver'||x.constructor_calls!==1||x.outer_requests!==3||x.public_control_requests!==3||!x.packed_helper||!isDeepStrictEqual(Object.keys(x.packed_helper).sort(),['file','sha256','helper_sha256','constructor_sha256','class_text_sha256'].sort())||x.packed_helper.file!=='fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs'||!['6da280036d123a97c111549e054ca67903c68600f1cc261424f39b356be763a1','ab6891ffa20dfd036d6f5ff7d81925df754bed95fc0ca3953a04fec0e3c098ac'].includes(x.packed_helper.sha256)||x.packed_helper.constructor_sha256!=='ac8815e9cac68d552c74855a0476fc4254367e5daeea9aa3f2d634d7a1312c33'||x.packed_helper.class_text_sha256!=='03de6ce93296f02b532c8d58e2846b47c13b5ffcd634120643f166f8e2b3c999'||!isDeepStrictEqual(x.packed_helper.helper_sha256,{LegacyTabPortalConstructorInjector:'7bd3b7214c459fcc9d9bc5b39478fc961c21dcabad96ac568638c1985927c9b1',constructLegacyTabBodyPortal:'66e27d40f99692aa3a5f22191d80748a8217067af9b08f285ec1e929e1736f4a'})||x.parent_source.module!=='@angular/cdk/portal#CdkPortalOutlet'||x.parent_source.sha256!=='3a6fef548d07cebf7e4f7a86ea703016e4acc5d1e897765ad6e7b528671dfa3c'||x.parent_source.parent_text_sha256!=='87b72e375ccab842a448d69875b38ab163a3a7fdbbc666cb294c7ba0d73db8f6'||!isDeepStrictEqual(x.requests,fields.map(([_field,ident,optional])=>({ident,spec:'@angular/core',identity_matched:true,unresolved:false,optional,self:false,skipSelf:false,host:false})))||x.attached_events!==2||['original_inputs_identical','public_parent_identity_matched','manual_argument_overrides','independent_public_parent_view_control','fixture_sibling_outlet_isolated','attach_detach_preserve_reattach','owned_views_destroyed','parent_subscriptions_removed','borrowed_parent_view_alive'].some(k=>x[k]!==true))return ['tab portal original/public-parent/view/lifetime evidence incomplete'];
 return [];
}
