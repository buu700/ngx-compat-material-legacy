/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {originalCompilerFactoryContext,originalContextDi} from './api-original-factory-contexts.mjs';
const require=createRequire(import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex');
// Finite qualification: a488 packed tabs module under Angular Core/CDK 22.1.7.
// A changed bundle, runtime minimum, class/helper bytes or source layout needs new evidence.
const qualifiedSource=Object.freeze({file:'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs',sha256:'6da280036d123a97c111549e054ca67903c68600f1cc261424f39b356be763a1',owner_text_sha256:'5e9b4f6e16a70d3385259a45b6c1a587435f5e5d09dce244867e1bbfbbf81b19',helper_text_sha256:'240504b1d61cc7feee5cf56873f53f4c6f8132f4b49282c73508ca51fe7f06d4',owner_export:'MatLegacyPaginatedTabHeader',owner_local:'MatPaginatedTabHeader',owner_start:83493,owner_end:109635,field_start:83664,field_end:83689,core_version:'22.1.7',cdk_version:'22.1.7'});
const qualifiedLocals=Object.freeze({MatLegacyPaginatedTabHeader:'MatPaginatedTabHeader',MatLegacyTabHeader:'MatLegacyTabHeader',MatLegacyTabNav:'MatLegacyTabNav',_MatLegacyTabHeaderBase:'_MatTabHeaderBase',_MatLegacyTabNavBase:'_MatTabNavBase'});
const names=Object.freeze({MatLegacyPaginatedTabHeader:'@angular/material:fesm2022/tabs.mjs#MatPaginatedTabHeader',MatLegacyTabHeader:'@angular/material:fesm2022/legacy-tabs.mjs#MatLegacyTabHeader',MatLegacyTabNav:'@angular/material:fesm2022/legacy-tabs.mjs#MatLegacyTabNav',_MatLegacyTabHeaderBase:'@angular/material:fesm2022/tabs.mjs#_MatTabHeaderBase',_MatLegacyTabNavBase:'@angular/material:fesm2022/tabs.mjs#_MatTabNavBase'});
export function tabHeaderProfile(symbol){
 if(!Object.hasOwn(names,symbol?.name)||symbol.symbol_id!==`legacy-tabs/primary/${symbol.name}`)return null;
 assert.equal(symbol.family,'legacy-tabs');assert.equal(symbol.kind,'primary');
 const original=originalCompilerFactoryContext(symbol.shape.originalFactory);assert.deepEqual(original,symbol.shape.originalFactoryContext);assert.equal(original.parameter_factory_key,names[symbol.name]);
 const nav=symbol.name.includes('Nav');const order=nav?['ElementRef','Directionality','NgZone','ChangeDetectorRef','ViewportRuler','Platform','ANIMATION_MODULE_TYPE']:['ElementRef','ChangeDetectorRef','ViewportRuler','Directionality','NgZone','Platform','ANIMATION_MODULE_TYPE'];
 const ps=originalContextDi(symbol.shape);assert.equal(ps.length,7);
 assert.deepEqual(ps.map(p=>p.ident),order);
 for(const p of ps){assert.equal(p.imported,p.ident);assert.equal(Boolean(p.optional),['Directionality','ANIMATION_MODULE_TYPE'].includes(p.ident));for(const f of ['self','skipSelf','host'])assert.equal(Boolean(p[f]),false);}
 assert.equal(ps[nav?4:2].spec,'@angular/cdk/scrolling');
 return {symbol_id:symbol.symbol_id,constructor_arity:7,viewport_index:nav?4:2,parameter_factory_key:names[symbol.name]};
}
function frames(stack){return String(stack||'').split('\n').flatMap(l=>{const m=l.match(/(?:\(|at )(file:\/\/[^()]+|\/[^()]+):(\d+):(\d+)\)?$/);return m?[{file:m[1].startsWith('file:')?fileURLToPath(m[1]):m[1],line:+m[2],column:+m[3]}]:[];});}
function location(file,source,start,end){const starts=[0];for(let i=source.indexOf('\n');i>=0;i=source.indexOf('\n',i+1))starts.push(i+1);return {file,start,end,starts};}
function inside(f,s){const p=s.starts[f?.line-1];return f?.file===s.file&&p!==undefined&&f.column>0&&p+f.column-1>=s.start&&p+f.column-1<s.end;}
export function tabHeaderSourceScopes(Type,owned,file,publicName){
 const Owner=owned.MatLegacyPaginatedTabHeader;assert.equal(typeof Owner,'function');assert.ok(Type===Owner||Type.prototype instanceof Owner);
 const exportName=publicName??Object.keys(names).find(name=>owned[name]===Type);assert.ok(exportName&&owned[exportName]===Type&&Object.hasOwn(names,exportName));
 const source=readFileSync(file,'utf8'),ts=require('typescript'),p=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(p.parseDiagnostics.length,0);
 const bindings=new Map(),imports=new Map();
 function add(name,node){if(!name)return;const list=bindings.get(name)||[];list.push(node);bindings.set(name,list);}
 function bindingNames(name,node){if(ts.isIdentifier(name))add(name.text,node);else if(ts.isObjectBindingPattern(name)||ts.isArrayBindingPattern(name))for(const element of name.elements)if(ts.isBindingElement(element))bindingNames(element.name,node);}
 for(const n of p.statements){
  if(ts.isImportDeclaration(n)&&n.importClause){const clause=n.importClause;if(clause.name)add(clause.name.text,n);const b=clause.namedBindings;if(b&&ts.isNamedImports(b))for(const e of b.elements){add(e.name.text,e);imports.set(e.name.text,{name:e.propertyName?.text||e.name.text,spec:n.moduleSpecifier.text,node:e});}else if(b&&ts.isNamespaceImport(b))add(b.name.text,b);}
  else if((ts.isClassDeclaration(n)||ts.isFunctionDeclaration(n))&&n.name)add(n.name.text,n);
  else if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)bindingNames(d.name,d);
 }
 function uniqueBinding(name,node){const list=bindings.get(name);assert.equal(list?.length,1,`ambiguous lexical binding: ${name}`);assert.equal(list[0]===node,true,`unexpected lexical binding: ${name}`);}
 function exportedClass(runtime,name){
  const targets=[];for(const n of p.statements){
   if(ts.isExportDeclaration(n)&&!n.moduleSpecifier&&n.exportClause&&ts.isNamedExports(n.exportClause))for(const e of n.exportClause.elements)if(e.name.text===name)targets.push((e.propertyName||e.name).text);
   if(ts.isClassDeclaration(n)&&n.name?.text===name&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))targets.push(name);
  }
  assert.equal(targets.length,1,`public export binding missing or ambiguous: ${name}`);const local=targets[0],decls=bindings.get(local);assert.equal(decls?.length,1,`export binding is not unique: ${name}`);const declaration=decls[0];
  const cls=ts.isClassDeclaration(declaration)?declaration:ts.isVariableDeclaration(declaration)&&declaration.initializer&&ts.isClassExpression(declaration.initializer)?declaration.initializer:null;
  assert.ok(cls,`export binding is not a top-level class: ${name}`);assert.equal(cls.getText(p)===Function.prototype.toString.call(runtime),true,`exported runtime class source mismatch: ${name}`);return {cls,local};
 }
 const owner=exportedClass(Owner,'MatLegacyPaginatedTabHeader'),selected=exportedClass(Type,exportName),cls=owner.cls;const text=cls.getText(p);
 const fields=cls.members.filter(n=>ts.isPropertyDeclaration(n)&&n.name?.getText(p)==='_renderInjector');assert.equal(fields.length,1);const call=fields[0].initializer;assert.ok(call&&ts.isCallExpression(call)&&ts.isIdentifier(call.expression)&&call.arguments.length===0);
 const helperName=call.expression.text,hs=p.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===helperName);assert.equal(hs.length,1);const h=hs[0];uniqueBinding(helperName,h);assert.notEqual(cls.name?.text,helperName);const items=h.body?.statements,attempt=items?.[0],guard=attempt?.tryBlock?.statements?.[0]?.expression,ret=items?.[1]?.expression;
 function publicImport(id,name){assert.ok(ts.isIdentifier(id));const i=imports.get(id.text);assert.ok(i);assert.equal(i.name,name);assert.equal(i.spec,'@angular/core');uniqueBinding(id.text,i.node);}
 assert.equal(h.parameters.length,0);assert.equal(items.length,2);assert.ok(ts.isTryStatement(attempt)&&attempt.tryBlock.statements.length===1&&!attempt.finallyBlock&&ts.isCallExpression(guard));publicImport(guard.expression,'assertInInjectionContext');assert.equal(guard.arguments.length,1);assert.equal(guard.arguments[0].getText(p),helperName);
 assert.equal(attempt.catchClause?.block.statements.length,1);assert.ok(ts.isReturnStatement(attempt.catchClause.block.statements[0]));assert.equal(attempt.catchClause.block.statements[0].expression?.kind,ts.SyntaxKind.NullKeyword);
 assert.ok(ts.isReturnStatement(items[1])&&ts.isCallExpression(ret));publicImport(ret.expression,'inject');assert.equal(ret.arguments.length,1);publicImport(ret.arguments[0],'Injector');
 const constructors=cls.members.filter(ts.isConstructorDeclaration);assert.equal(constructors.length,1);assert.equal(constructors[0].parameters.length,7);
 const visit=n=>{if(ts.isBinaryExpression(n)&&n.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&n.operatorToken.kind<=ts.SyntaxKind.LastAssignment&&n.left.getText(p)==='this._renderInjector')throw Error('render injector reassigned');ts.forEachChild(n,visit);};visit(cls);
 return {helper:location(file,source,h.getStart(p),h.end),caller:location(file,source,call.getStart(p),call.end),proof:{file:'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs',sha256:sha(source),owner_text_sha256:sha(text),helper_text_sha256:sha(h.getText(p)),owner_export:'MatLegacyPaginatedTabHeader',owner_local:owner.local,selected_export:exportName,selected_local:selected.local,owner_start:cls.getStart(p),owner_end:cls.end,field_start:call.getStart(p),field_end:call.end}};
}
export function partitionTabHeaderInjector(requests,core,owned,Type,symbol,file,runFactory,injector,value,capture,fixture,coreOwned,cdkVersion){
 const profile=tabHeaderProfile(symbol);assert.ok(profile);const source=tabHeaderSourceScopes(Type,owned,file,symbol.name);assert.equal(capture?.constructor_calls,1);assert.equal(capture.inputs.length,7);assert.equal(capture.value,value);assert.equal(capture.inputs[profile.viewport_index],injector.get(coreOwned._LegacyViewport));assert.equal(value._viewportRuler,capture.inputs[profile.viewport_index]);
 const classified=[],retained=[];for(const request of requests){const trace=frames(request.stack),at=trace.findIndex(f=>inside(f,source.helper));if(at>=0&&inside(trace[at+1],source.caller))classified.push(request);else retained.push(request);}
 const control=runFactory(()=>core.inject(core.Injector),core.Injector,core.runInInjectionContext,{injector});assert.equal(control.outcome,'returned',control.error);assert.equal(control.requests.length,1);assert.equal(classified.length,1);
 for(const r of [classified[0],control.requests[0]]){assert.equal(r.token,core.Injector);assert.ok(!r.unresolved);for(const f of ['optional','self','skipSelf','host'])assert.equal(Boolean(r[f]),false);}
 const actualElement=injector.get(core.ElementRef),captured=value._renderInjector;assert.equal(typeof captured?.get,'function');assert.equal(capture.inputs[0].nativeElement,actualElement.nativeElement);assert.equal(captured.get(core.ElementRef).nativeElement,actualElement.nativeElement);assert.equal(control.value.get(core.ElementRef).nativeElement,actualElement.nativeElement);assert.equal(captured.get(core.ApplicationRef),injector.get(core.ApplicationRef));assert.equal(captured.get(fixture.scopeToken),fixture.childValue);assert.equal(control.value.get(fixture.scopeToken),fixture.childValue);assert.equal(fixture.parentNode.injector.get(fixture.scopeToken),fixture.parentValue);assert.notEqual(fixture.childValue,fixture.parentValue);
 return {requests:retained,observation:{profile,source:{...source.proof,core_version:core.VERSION.full,cdk_version:cdkVersion},total_requests:requests.length,retained_requests:retained.length,classified_requests:1,constructor_calls:1,constructor_arity:7,node_element_matched:true,viewport_input_matched:true,application_matched:true,child_scope_matched:true,parent_scope_distinct:true,public_control_outcome:'returned',request:{ident:'Injector',spec:'@angular/core',identity_matched:true,unresolved:false,optional:false,self:false,skipSelf:false,host:false},role:'owned render scheduling dependency; actual node scope; not a historical constructor parameter'}};
}

export function tabHeaderObservationProblems(row){
 const profile=tabHeaderProfile(row?.symbol);if(!profile)return [];if(row.factory_outcome!=='returned')return ['tab header actual factory did not return'];
 const x=row.factory_tab_header_context, r=row.runtime_requests?.[profile.viewport_index];
 const keys=['profile','source','total_requests','retained_requests','classified_requests','constructor_calls','constructor_arity','node_element_matched','viewport_input_matched','application_matched','child_scope_matched','parent_scope_distinct','public_control_outcome','request','role','fixture_destroyed'];
 const parameters=originalContextDi(row.symbol.shape),labels=parameters.map(p=>p.ident==='ViewportRuler'?'_LegacyViewport':p.ident==='ANIMATION_MODULE_TYPE'?'AnimationModuleType':p.ident);
 const requestsOkay=Array.isArray(row.runtime_requests)&&row.runtime_requests.length===7&&row.runtime_requests.every((v,i)=>{const expected=parameters[i];return v.expected_ident===expected.ident&&v.expected_spec===expected.spec&&v.identity_matched===(i!==profile.viewport_index)&&v.observed_label===labels[i]&&v.observation_evidence==='public Injector request trace'&&v.unresolved===false&&['optional','self','skipSelf','host'].every(k=>v[k]===Boolean(expected[k])&&v['expected_'+k]===Boolean(expected[k]));});
 const observedOkay=isDeepStrictEqual(row.observed,parameters.map((p,i)=>labels[i]+(p.optional?'?':'')));
 const replacement={historical:'@angular/cdk/scrolling#ViewportRuler',actual:'@ngx-compat/material-legacy/legacy-core#_LegacyViewport',classification:'owned replacement for upstream docs-private helper',historical_provider_selects_actual:false,customization:'docs-private; no stable customization guarantee'};
 return !requestsOkay||!observedOkay||row.factory_returned_owned_instance!==true||row.factory_node_kind!=='element'||!isDeepStrictEqual(row.factory_context_modules,['legacy-tabs/primary/MatLegacyTabsModule'])||row.factory_context!=='actual Angular element/template nodes and public application providers with synthetic Renderer2/server DOM and public MockPlatformLocation URL backend; native/browser/AOT/packed/floors separate'||!x||!isDeepStrictEqual(Object.keys(x).sort(),keys.sort())||!isDeepStrictEqual(x.profile,profile)||x.constructor_calls!==1||x.constructor_arity!==7||x.node_element_matched!==true||x.viewport_input_matched!==true||x.application_matched!==true||x.child_scope_matched!==true||x.parent_scope_distinct!==true||x.fixture_destroyed!==true||x.public_control_outcome!=='returned'||x.role!=='owned render scheduling dependency; actual node scope; not a historical constructor parameter'
 ||x.total_requests!==8||x.retained_requests!==7||x.classified_requests!==1||!isDeepStrictEqual(Object.keys(x.source||{}).sort(),['file','sha256','owner_text_sha256','helper_text_sha256','owner_export','owner_local','selected_export','selected_local','owner_start','owner_end','field_start','field_end','core_version','cdk_version'].sort())||['sha256','owner_text_sha256','helper_text_sha256'].some(k=>!/^([a-f0-9]{64})$/.test(x.source?.[k]||''))||Object.entries(qualifiedSource).some(([key,value])=>x.source?.[key]!==value)||x.source.selected_export!==row.symbol.name||x.source.selected_local!==qualifiedLocals[row.symbol.name]
 ||!isDeepStrictEqual(x.request,{ident:'Injector',spec:'@angular/core',identity_matched:true,unresolved:false,optional:false,self:false,skipSelf:false,host:false})||!r||r.expected_ident!=='ViewportRuler'||r.expected_spec!=='@angular/cdk/scrolling'||r.observed_label!=='_LegacyViewport'||r.identity_matched!==false||r.unresolved!==false||!isDeepStrictEqual(r.intentional_token_difference,replacement)||['optional','self','skipSelf','host'].some(k=>r[k]!==false||r['expected_'+k]!==false)
 ?['tab header owned render injector or intentional viewport token difference evidence incomplete']:[];
}
/** Exact five declaration pairs only; this is an intentional change, not a type identity waiver. */
export function approvedTabHeaderSignatureRecord(symbol,packed,record){
 const profile=tabHeaderProfile(symbol);if(!profile)return false;
 const viewport=profile.viewport_index===2?'ElementRef,ChangeDetectorRef,ViewportRuler,Directionality,NgZone,Platform,string?':'ElementRef,Directionality,NgZone,ChangeDetectorRef,ViewportRuler,Platform,string?';
 const original='public constructor('+(symbol.name==='MatLegacyPaginatedTabHeader'?viewport.replace('ElementRef,','ElementRef<HTMLElement>,'):viewport)+')';
 const actual=original.replace('ViewportRuler','_LegacyViewport');
 const sigs=[...(packed.ownSignatures||packed.signatures||[]),...(packed.inheritedConstructor?.signatures||[])];
 return record?.symbol_id===profile.symbol_id&&record.classification==='intentional-legacy-difference'&&record.historical_signature===original&&record.owned_signature===actual&&typeof record.rationale==='string'&&record.rationale.length>0&&!record.construction_contract&&sigs.includes(actual);
}
