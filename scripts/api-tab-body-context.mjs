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
const require=createRequire(import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex'),ownerExport='_MatLegacyTabBodyBase';
const profiles=Object.freeze({'legacy-tabs/primary/MatLegacyTabBody':1,'legacy-tabs/primary/_MatLegacyTabBodyBase':0});
export function tabBodyProfile(symbol){
 if(!Object.hasOwn(profiles,symbol?.symbol_id))return null;
 assert.equal(symbol.family,'legacy-tabs');assert.equal(symbol.kind,'primary');assert.equal(symbol.name,profiles[symbol.symbol_id]===1?'MatLegacyTabBody':ownerExport);
 const original=originalCompilerFactoryContext(symbol.shape.originalFactory);assert.deepEqual(original,symbol.shape.originalFactoryContext);
 assert.equal(original.parameter_factory_key,profiles[symbol.symbol_id]===1?'@angular/material:fesm2022/legacy-tabs.mjs#MatLegacyTabBody':'@angular/material:fesm2022/tabs.mjs#_MatTabBodyBase');
 assert.deepEqual(originalContextDi(symbol.shape).map(p=>[p.ident,p.imported,p.spec,Boolean(p.optional),Boolean(p.self),Boolean(p.skipSelf),Boolean(p.host)]),[
 ['ElementRef','ElementRef','@angular/core',false,false,false,false],['Directionality','Directionality','@angular/cdk/bidi',true,false,false,false],['ChangeDetectorRef','ChangeDetectorRef','@angular/core',false,false,false,false]]);
 return {symbol_id:symbol.symbol_id,depth:profiles[symbol.symbol_id],constructor_arity:3,parameter_factory_key:original.parameter_factory_key};
}
function frames(stack){return String(stack||'').split('\n').flatMap(line=>{const m=line.match(/(?:\(|at )(file:\/\/[^()]+|\/[^()]+):(\d+):(\d+)\)?$/);return m?[{file:m[1].startsWith('file:')?fileURLToPath(m[1]):m[1],line:+m[2],column:+m[3]}]:[];});}
function located(file,source,start,end){const starts=[0];for(let at=source.indexOf('\n');at>=0;at=source.indexOf('\n',at+1))starts.push(at+1);return {file,starts,start,end};}
function inside(frame,scope){const at=scope.starts[frame?.line-1];return frame?.file===scope.file&&at!==undefined&&frame.column>0&&at+frame.column-1>=scope.start&&at+frame.column-1<scope.end;}
function scopes(Type,owned,file,profile){
 const Owner=owned[ownerExport];assert.ok(typeof Owner==='function'&&(profile.depth===0?Type===Owner:Object.getPrototypeOf(Type)===Owner&&Type.prototype instanceof Owner),'tab-body exact public constructor owner differs');
 const ts=require('typescript'),source=readFileSync(file,'utf8'),text=Function.prototype.toString.call(Owner),at=source.indexOf(text);
 assert.ok(at>=0&&source.indexOf(text,at+1)<0,'tab-body owner source absent/ambiguous');
 const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),clsFile=ts.createSourceFile('owner.js','('+text+')',ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),cls=clsFile.statements[0]?.expression?.expression;
 assert.ok(!parsed.parseDiagnostics.length&&!clsFile.parseDiagnostics.length&&ts.isClassExpression(cls));
 const imports=new Map();for(const n of parsed.statements)if(ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))for(const e of n.importClause.namedBindings.elements)imports.set(e.name.text,{name:e.propertyName?.text||e.name.text,spec:n.moduleSpecifier.text});
 const fields=cls.members.filter(n=>ts.isPropertyDeclaration(n)&&n.name?.getText(clsFile)==='_ngZone');assert.equal(fields.length,1);
 const call=fields[0].initializer;assert.ok(call&&ts.isCallExpression(call)&&ts.isIdentifier(call.expression)&&call.arguments.length===0);
 const helperName=call.expression.text,helpers=parsed.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===helperName);assert.equal(helpers.length,1);
 const helper=helpers[0],items=helper.body?.statements,attempt=items?.[0],assertion=attempt?.tryBlock?.statements?.[0]?.expression,returned=items?.[1]?.expression;
 assert.equal(helper.parameters.length,0);assert.equal(items?.length,2);
 assert.ok(ts.isTryStatement(attempt)&&attempt.tryBlock.statements.length===1&&!attempt.finallyBlock&&ts.isCallExpression(assertion)&&ts.isIdentifier(assertion.expression));
 assert.deepEqual(imports.get(assertion.expression.text),{name:'assertInInjectionContext',spec:'@angular/core'});assert.equal(assertion.arguments.length,1);assert.equal(assertion.arguments[0].getText(parsed),helperName);
 assert.equal(attempt.catchClause?.block.statements.length,1);assert.ok(ts.isReturnStatement(attempt.catchClause.block.statements[0]));assert.equal(attempt.catchClause.block.statements[0].expression?.kind,ts.SyntaxKind.NullKeyword);
 assert.ok(ts.isReturnStatement(items[1])&&ts.isCallExpression(returned)&&ts.isIdentifier(returned.expression));assert.deepEqual(imports.get(returned.expression.text),{name:'inject',spec:'@angular/core'});assert.equal(returned.arguments.length,2);assert.deepEqual(imports.get(returned.arguments[0].getText(parsed)),{name:'NgZone',spec:'@angular/core'});
 const option=returned.arguments[1];assert.ok(ts.isObjectLiteralExpression(option));assert.equal(option.properties.length,1);assert.ok(ts.isPropertyAssignment(option.properties[0]));assert.equal(option.properties[0].name.getText(parsed),'optional');assert.equal(option.properties[0].initializer.kind,ts.SyntaxKind.TrueKeyword);
 const constructors=cls.members.filter(ts.isConstructorDeclaration);assert.equal(constructors.length,1);assert.equal(constructors[0].parameters.length,3);
 const visit=n=>{if(ts.isBinaryExpression(n)&&n.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&n.operatorToken.kind<=ts.SyntaxKind.LastAssignment&&n.left.getText(clsFile)==='this._ngZone')throw Error('tab-body zone field reassigned');ts.forEachChild(n,visit);};visit(cls);
 return {helper:located(file,source,helper.getStart(parsed),helper.end),caller:located(file,source,at+call.getStart(clsFile)-1,at+call.end-1),proof:{file,sha256:sha(source),owner_text_sha256:sha(text),helper_text_sha256:sha(helper.getText(parsed))}};
}
export function partitionTabBodyZone(requests,core,owned,Type,symbol,file,runFactory,injector,value,capture){
 const profile=tabBodyProfile(symbol);assert.ok(profile);const source=scopes(Type,owned,file,profile);
 assert.equal(capture?.constructor_calls,1);assert.equal(capture.inputs.length,3);assert.ok(capture.value===value);
 const classified=[],retained=[];for(const request of requests){const trace=frames(request.stack),at=trace.findIndex(f=>inside(f,source.helper));if(at>=0&&inside(trace[at+1],source.caller))classified.push(request);else retained.push(request);}
 const control=runFactory(()=>core.inject(core.NgZone,{optional:true}),core.Injector,core.runInInjectionContext,{injector});assert.equal(control.outcome,'returned',control.error);assert.equal(control.requests.length,1);assert.equal(classified.length,1);
 for(const request of [classified[0],control.requests[0]]){assert.ok(request.token===core.NgZone);assert.ok(!request.unresolved);assert.equal(Boolean(request.optional),true);for(const flag of ['self','skipSelf','host'])assert.equal(Boolean(request[flag]),false);}
 assert.ok(value._ngZone===control.value,'tab-body zone differs from actual same-node optional control');
 const actualElement=injector.get(core.ElementRef);assert.ok(capture.inputs[0].nativeElement===actualElement.nativeElement&&value._elementRef===capture.inputs[0],'tab-body supplied element identity differs');
 return {requests:retained,observation:{profile,constructor_calls:1,constructor_arity:3,actual_element_identity_matched:true,source:source.proof,total_requests:requests.length,retained_requests:retained.length,classified_requests:1,verified:true,public_control_outcome:'returned',request:{ident:'NgZone',spec:'@angular/core',identity_matched:true,value_matched:true,unresolved:false,optional:true,self:false,skipSelf:false,host:false}}};
}
export function tabBodyObservationProblems(row){
 const profile=tabBodyProfile(row?.symbol);if(!profile||row.factory_outcome!=='returned')return [];
 const x=row.factory_tab_body_context;
 return !x||!isDeepStrictEqual(Object.keys(x).sort(),['profile','constructor_calls','constructor_arity','actual_element_identity_matched','source','total_requests','retained_requests','classified_requests','verified','public_control_outcome','request'].sort())||!isDeepStrictEqual(x.profile,profile)||x.constructor_calls!==1||x.constructor_arity!==3||x.actual_element_identity_matched!==true||x.verified!==true||x.public_control_outcome!=='returned'
  ||!Number.isInteger(x.total_requests)||!Number.isInteger(x.retained_requests)||x.retained_requests<0||x.classified_requests!==1||x.retained_requests+1!==x.total_requests
  ||!isDeepStrictEqual(Object.keys(x.source||{}).sort(),['file','sha256','owner_text_sha256','helper_text_sha256'].sort())||!x.source?.file?.endsWith('/fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs')||['sha256','owner_text_sha256','helper_text_sha256'].some(k=>!/^([a-f0-9]{64})$/.test(x.source?.[k]||''))
  ||!isDeepStrictEqual(x.request,{ident:'NgZone',spec:'@angular/core',identity_matched:true,value_matched:true,unresolved:false,optional:true,self:false,skipSelf:false,host:false})?['tab-body original constructor/public zone identity evidence incomplete']:[];
}
