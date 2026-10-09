/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {originalCompilerFactoryContext} from './api-original-factory-contexts.mjs';
const require=createRequire(import.meta.url),flags=['optional','self','skipSelf','host'];
const profiles={
 'legacy-dialog/primary/MatLegacyDialogContainer':{depth:1,arity:9},
 'legacy-dialog/primary/_MatLegacyDialogContainerBase':{depth:0,arity:8},
};
const fields=[
 {field:'_legacyChangeDetector',name:'ChangeDetectorRef',spec:'@angular/core'},
 {field:'_legacyDialogRef',name:'DialogRef',spec:'@angular/cdk/dialog'},
 {field:'_legacyFocusPlatform',name:'Platform',spec:'@angular/cdk/platform'},
 {field:'_legacyFocusRenderer',name:'Renderer2',spec:'@angular/core'},
];
const ownerExport='_MatLegacyDialogContainerBase',sha=text=>createHash('sha256').update(text).digest('hex');
export function ownedDialogFocusProfile(symbolId){return Object.hasOwn(profiles,symbolId)?profiles[symbolId]:null;}
function frames(stack){return String(stack||'').split('\n').flatMap(line=>{const match=line.match(/(?:\(|at )(file:\/\/[^()]+|\/[^()]+):(\d+):(\d+)\)?$/);return match?[{file:match[1].startsWith('file:')?fileURLToPath(match[1]):match[1],line:+match[2],column:+match[3]}]:[];});}
function located(file,source,ranges){const lineStarts=[0];for(let at=source.indexOf('\n');at>=0;at=source.indexOf('\n',at+1))lineStarts.push(at+1);return {file,ranges,lineStarts};}
function inside(frame,scope){const line=scope.lineStarts[frame?.line-1];return frame?.file===scope.file&&line!==undefined&&frame.column>0&&scope.ranges.some(([a,b])=>line+frame.column-1>=a&&line+frame.column-1<b);}

/** Verify exact own helper/field AST and public import bindings before classifying a trace. */
function scopes(file,Owner){
 const ts=require('typescript'),source=readFileSync(file,'utf8'),parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(parsed.parseDiagnostics.length)throw Error('owned dialog FESM syntax unavailable');
 const imports=new Map();for(const statement of parsed.statements)if(ts.isImportDeclaration(statement)&&statement.importClause?.namedBindings&&ts.isNamedImports(statement.importClause.namedBindings))for(const item of statement.importClause.namedBindings.elements)imports.set(item.name.text,{name:item.propertyName?.text||item.name.text,spec:statement.moduleSpecifier.text});
 const text=Function.prototype.toString.call(Owner),start=source.indexOf(text);
 if(start<0||source.indexOf(text,start+1)>=0)throw Error('owned dialog constructor source absent/ambiguous');
 const clsFile=ts.createSourceFile('owner.js','('+text+')',ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),cls=clsFile.statements[0]?.expression?.expression;
 if(clsFile.parseDiagnostics.length||!cls||!ts.isClassExpression(cls))throw Error('owned dialog constructor AST unavailable');
 let helperName;const properties=fields.map(record=>{
  const matches=cls.members.filter(n=>ts.isPropertyDeclaration(n)&&n.name?.getText(clsFile)===record.field&&n.initializer);if(matches.length!==1)throw Error('owned dialog ambient field missing/ambiguous');
  const value=matches[0].initializer;
  if(!ts.isCallExpression(value)||!ts.isIdentifier(value.expression)||value.arguments.length!==1||!ts.isIdentifier(value.arguments[0]))throw Error('owned dialog ambient field call differs');
  if(helperName&&helperName!==value.expression.text)throw Error('owned dialog ambient helper identities differ');helperName=value.expression.text;
  if(!isDeepStrictEqual(imports.get(value.arguments[0].text),{name:record.name,spec:record.spec}))throw Error('owned dialog ambient token is not the exact public import');
  return {...record,scope:located(file,source,[[start+value.getStart(clsFile)-1,start+value.end-1]])};
 });
 const helpers=parsed.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===helperName);if(helpers.length!==1)throw Error('owned dialog ambient helper absent/ambiguous');
 const helper=helpers[0],statements=helper.body?.statements;
 if(helper.parameters.length!==1||!ts.isIdentifier(helper.parameters[0].name)||statements?.length!==2||!ts.isTryStatement(statements[0])||!ts.isReturnStatement(statements[1]))throw Error('owned dialog ambient helper structure differs');
 const attempt=statements[0],assertion=attempt.tryBlock.statements[0]?.expression,returned=statements[1].expression;
 if(attempt.tryBlock.statements.length!==1||!assertion||!ts.isCallExpression(assertion)||!ts.isIdentifier(assertion.expression)
  ||!isDeepStrictEqual(imports.get(assertion.expression.text),{name:'assertInInjectionContext',spec:'@angular/core'})
  ||assertion.arguments.length!==1||assertion.arguments[0].getText(parsed)!==helperName||attempt.finallyBlock
  ||attempt.catchClause?.block.statements.length!==1||!ts.isReturnStatement(attempt.catchClause.block.statements[0])||attempt.catchClause.block.statements[0].expression?.kind!==ts.SyntaxKind.NullKeyword
  ||!returned||!ts.isCallExpression(returned)||!ts.isIdentifier(returned.expression)
  ||!isDeepStrictEqual(imports.get(returned.expression.text),{name:'inject',spec:'@angular/core'})
  ||returned.arguments.length!==2||returned.arguments[0].getText(parsed)!==helper.parameters[0].name.text)
  throw Error('owned dialog ambient helper behavior differs');
 const options=returned.arguments[1],option=options?.properties?.[0];if(!ts.isObjectLiteralExpression(options)||options.properties.length!==1||!ts.isPropertyAssignment(option)||option.name.getText(parsed)!=='optional'||option.initializer.kind!==ts.SyntaxKind.TrueKeyword)throw Error('owned dialog ambient helper injection flags differ');
 // These readonly service fields must not be replaced later by arbitrary values.
 const visit=node=>{if(ts.isBinaryExpression(node)&&node.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&node.operatorToken.kind<=ts.SyntaxKind.LastAssignment&&ts.isPropertyAccessExpression(node.left)&&node.left.expression.kind===ts.SyntaxKind.ThisKeyword&&fields.some(f=>f.field===node.left.name.text))throw Error('owned dialog ambient field reassigned');ts.forEachChild(node,visit);};visit(cls);
 return {helper:located(file,source,[[helper.getStart(parsed),helper.end]]),properties,
  proof:{file,sha256:sha(source),owner_text_sha256:sha(text),helper_text_sha256:sha(helper.getText(parsed))}};
}

export async function partitionOwnedDialogFocus(requests,core,owned,Type,symbol,file,runFactory,injector,value,importModule){
 const profile=ownedDialogFocusProfile(symbol.symbol_id);if(!profile)throw Error('unknown owned dialog focus caller');
 const original=originalCompilerFactoryContext(symbol.shape.originalFactory);
 if(!isDeepStrictEqual(original,symbol.shape.originalFactoryContext)||original.factory_parameters.length!==profile.arity)throw Error('original dialog focus constructor context differs');
 const Owner=owned[ownerExport];if(typeof Owner!=='function'||profile.depth===0&&Owner!==Type||profile.depth===1&&(Object.getPrototypeOf(Type)!==Owner||!(Type.prototype instanceof Owner)))throw Error('owned dialog focus constructor identity differs');
 const source=scopes(file,Owner),tokens=await Promise.all(fields.map(async field=>(await importModule(field.spec))[field.name]));if(tokens.some(t=>typeof t!=='function'))throw Error('public dialog focus token missing');
 const retained=[],classified=[];
 for(const request of requests){const calls=frames(request.stack),at=calls.findIndex(frame=>inside(frame,source.helper)),property=at>=0?source.properties.find(field=>inside(calls[at+1],field.scope)):null;if(property)classified.push({request,field:property.field});else retained.push(request);}
 const control=runFactory(()=>tokens.map(token=>core.inject(token,{optional:true})),core.Injector,core.runInInjectionContext,{injector,captureStack:true});
 if(control.outcome!=='returned'||control.requests.length!==4||classified.length!==4)throw Error('owned dialog focus actual/control count differs');
 for(let index=0;index<4;index++){
  const request=classified[index].request,want=control.requests[index];
  if(classified[index].field!==fields[index].field||request.token!==tokens[index]||want.token!==tokens[index]||request.unresolved||want.unresolved
   ||flags.some(flag=>Boolean(request[flag])!==(flag==='optional')||Boolean(want[flag])!==(flag==='optional')))
   throw Error('owned dialog focus field/token/options/control differ');
  const actual=value[fields[index].field];
  // Angular's real ViewRef implements this public protocol without extending
  // the exported abstract ChangeDetectorRef class. Its concrete view is proved
  // by the later public destruction challenge, not an instanceof shortcut.
  if(index===0){if(typeof actual?.destroy!=='function'||typeof actual.markForCheck!=='function'||typeof actual.detectChanges!=='function'||actual.destroyed!==false)throw Error('owned dialog focus detector public protocol is incomplete');}
  else if(actual!==control.value[index])throw Error('owned dialog focus service value differs from actual caller control');
 }
 return {requests:retained,observation:{symbol_id:symbol.symbol_id,role:'Exact owned ambient helper/constructor source plus independently resolved public optional services;original expectations unchanged',
  constructor_owner:{public_export:ownerExport,depth:profile.depth,owned_class_identity_matched:true},source:source.proof,
  total_requests:requests.length,retained_requests:retained.length,classified_requests:4,verified:true,
  requests:classified.map(({request},index)=>({field:fields[index].field,ident:fields[index].name,spec:fields[index].spec,identity_matched:true,value_matched:true,unresolved:false,...Object.fromEntries(flags.map(flag=>[flag,Boolean(request[flag])]))})),
  public_control_outcome:'returned',detector_scope_verified:false}};
}

/** Destroy only the diagnostic borrowed view after the owned instance's lifetime checks. */
export function challengeOwnedDialogFocusDetector(value,fixture,observation){
 if(!value._legacyFocusDestroyed||fixture.element.destroyed||fixture.template.destroyed||fixture.environment.destroyed)throw Error('owned dialog focus lifetime incomplete before scope challenge');
 value._legacyChangeDetector.destroy();
 if(!fixture.element.destroyed||!fixture.template.destroyed||fixture.environment.destroyed)throw Error('owned dialog focus detector does not belong to the caller view');
 observation.detector_scope_verified=true;observation.borrowed_context_alive_after_owned_teardown=true;
}

export function ownedDialogFocusObservationProblems(row){
 const profile=ownedDialogFocusProfile(row?.symbol?.symbol_id);if(!profile||row.factory_outcome!=='returned')return [];
 const x=row.factory_owned_dialog_focus_context;
 if(!x||x.symbol_id!==row.symbol.symbol_id||x.verified!==true||x.public_control_outcome!=='returned'||x.detector_scope_verified!==true||x.borrowed_context_alive_after_owned_teardown!==true
  ||!isDeepStrictEqual(x.constructor_owner,{public_export:ownerExport,depth:profile.depth,owned_class_identity_matched:true})
  ||!Number.isInteger(x.total_requests)||!Number.isInteger(x.retained_requests)||x.retained_requests<0||x.classified_requests!==4||x.retained_requests+4!==x.total_requests
  ||!x.source?.file?.endsWith('/fesm2022/ngx-compat-material-legacy-legacy-dialog.mjs')||['sha256','owner_text_sha256','helper_text_sha256'].some(key=>!/^([a-f0-9]{64})$/.test(x.source?.[key]||''))
  ||!Array.isArray(x.requests)||x.requests.length!==4||x.requests.some((r,index)=>!isDeepStrictEqual(r,{field:fields[index].field,ident:fields[index].name,spec:fields[index].spec,identity_matched:true,value_matched:true,unresolved:false,optional:true,self:false,skipSelf:false,host:false})))
  return ['owned dialog focus source/identity/options/lifetime evidence incomplete'];
 return [];
}
