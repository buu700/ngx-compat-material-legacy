/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createRequire} from 'node:module';
import {readFileSync,existsSync,realpathSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),cache=new WeakMap();
const flags=['optional','self','skipSelf','host'];

function frames(stack){
 return String(stack||'').split('\n').flatMap(line=>{
  const match=line.match(/(?:\(|at )(file:\/\/[^()]+|\/[^()]+):(\d+):(\d+)\)?$/);
  if(!match)return [];
  return [{file:match[1].startsWith('file:')?fileURLToPath(match[1]):match[1],line:Number(match[2]),column:Number(match[3])}];
 });
}

/** Read-only correlation with the actual exported public constructor's code. No private symbol imports. */
export function emitterScope(core,frame){
 const Type=core.EventEmitter,pkg=join(dirname(frame.file),'../package.json');
 if(!existsSync(pkg)||!existsSync(frame.file))return null;
 const metadataRaw=readFileSync(pkg,'utf8'),metadata=JSON.parse(metadataRaw);
 if(metadata.name!=='@angular/core'||metadata.version!==core.VERSION.full)return null;
 const source=readFileSync(frame.file,'utf8'),text=Function.prototype.toString.call(Type);
 if(!source.includes(text))return null;
 // Resolve the public entry from the physical peer containing the caller. Read
 // both files on every call; a parsed result is reusable only for identical bytes.
 const localRequire=createRequire(frame.file);let entry;
 try{entry=localRequire.resolve('@angular/core');if(realpathSync(entry)!==realpathSync(require.resolve('@angular/core')))return null;}catch{return null;}
 const entrySource=readFileSync(entry,'utf8'),key=createHash('sha256').update(metadataRaw).update('\0').update(entrySource).update('\0').update(source).update('\0').update(text).digest('hex');
 let files=cache.get(Type);if(!files){files=new Map();cache.set(Type,files);}
 const prior=files.get(frame.file);if(prior?.key===key)return prior.result;
 const ts=require('typescript'),parse=(name,content)=>ts.createSourceFile(name,content,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const entryAst=parse(entry,entrySource);if(entryAst.parseDiagnostics.length)return null;
 const reexports=entryAst.statements.flatMap(n=>ts.isExportDeclaration(n)&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier)&&n.exportClause&&ts.isNamedExports(n.exportClause)?[...n.exportClause.elements].filter(e=>e.name.text==='EventEmitter').map(e=>({local:(e.propertyName||e.name).text,spec:n.moduleSpecifier.text})):[]);
 const entryNamed=entryAst.statements.flatMap(n=>ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause)?[...n.exportClause.elements].filter(e=>e.name.text==='EventEmitter'):[]);
 const entryDirect=entryAst.statements.flatMap(n=>n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)?(ts.isClassDeclaration(n)&&n.name?.text==='EventEmitter'?[n]:ts.isVariableStatement(n)?[...n.declarationList.declarations].filter(d=>ts.isIdentifier(d.name)&&d.name.text==='EventEmitter'):[]):[]);
 if(entryAst.statements.some(n=>ts.isExportDeclaration(n)&&!n.exportClause))return null;
 let exported='EventEmitter';
 if(realpathSync(entry)!==realpathSync(frame.file)){
  if(entryNamed.length!==1||entryDirect.length||reexports.length!==1||!reexports[0].spec.startsWith('./'))return null;
  let target;try{target=realpathSync(resolve(dirname(entry),reexports[0].spec));}catch{return null;}
  if(target!==realpathSync(frame.file))return null;exported=reexports[0].local;
 }else if(reexports.length)return null;
 const options={allowJs:true,noResolve:true,noLib:true,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022};
 const host=ts.createCompilerHost(options),get=host.getSourceFile.bind(host);
 host.getSourceFile=(f,v,...args)=>f===frame.file?parse(f,source):get(f,v,...args);
 const program=ts.createProgram([frame.file],options,host),parsed=program.getSourceFile(frame.file);
 if(!parsed||parsed.parseDiagnostics.length)return null;
 const checker=program.getTypeChecker(),mod=checker.getSymbolAtLocation(parsed),entries=mod?checker.getExportsOfModule(mod).filter(x=>x.name===exported):[];
 const named=parsed.statements.flatMap(n=>ts.isExportDeclaration(n)&&!n.moduleSpecifier&&n.exportClause&&ts.isNamedExports(n.exportClause)?[...n.exportClause.elements].filter(e=>e.name.text===exported):[]);
 const direct=parsed.statements.flatMap(n=>n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)?(ts.isClassDeclaration(n)&&n.name?.text===exported?[n]:ts.isVariableStatement(n)?[...n.declarationList.declarations].filter(d=>ts.isIdentifier(d.name)&&d.name.text===exported):[]):[]);
 if(entries.length!==1||named.length+direct.length!==1)return null;
 let symbol=entries[0].flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(entries[0]):entries[0],cls=null;const bindings=new Set();
 for(let i=0;i<5;i++){
  if(symbol?.declarations?.length!==1)return null;bindings.add(symbol);const d=symbol.declarations[0];
  if(ts.isClassDeclaration(d)&&d.parent===parsed){cls=d;break;}
  if(!ts.isVariableDeclaration(d)||d.parent?.parent?.parent!==parsed||!(d.parent.flags&ts.NodeFlags.Const)||!d.initializer)return null;
  if(ts.isClassExpression(d.initializer)){cls=d.initializer;break;}
  if(!ts.isIdentifier(d.initializer))return null;symbol=checker.getSymbolAtLocation(d.initializer);
 }
 if(!cls||cls.getText(parsed)!==text)return null;
 // Lexical bindings used by the export must never be assigned, incremented,
 // destructured or replaced by a for-in/of target anywhere in the module.
 // Direct eval can write lexical bindings without a statically visible target.
 let unsafe=false;
 function targetHasBinding(node){
  if(ts.isIdentifier(node)){
   const symbol=checker.getSymbolAtLocation(node);
   if(bindings.has(symbol))return true;
   if(ts.isShorthandPropertyAssignment(node.parent)&&checker.getShorthandAssignmentValueSymbol(node.parent)&&bindings.has(checker.getShorthandAssignmentValueSymbol(node.parent)))return true;
  }
  return ts.forEachChild(node,targetHasBinding)||false;
 }
 function scan(node){
  if(ts.isCallExpression(node)){let callee=node.expression;while(ts.isParenthesizedExpression(callee))callee=callee.expression;if(ts.isIdentifier(callee)&&callee.text==='eval')unsafe=true;}
  if(ts.isBinaryExpression(node)&&node.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&node.operatorToken.kind<=ts.SyntaxKind.LastAssignment&&targetHasBinding(node.left))unsafe=true;
  if((ts.isPrefixUnaryExpression(node)||ts.isPostfixUnaryExpression(node))&&(node.operator===ts.SyntaxKind.PlusPlusToken||node.operator===ts.SyntaxKind.MinusMinusToken)&&targetHasBinding(node.operand))unsafe=true;
  if((ts.isForInStatement(node)||ts.isForOfStatement(node))&&!ts.isVariableDeclarationList(node.initializer)&&targetHasBinding(node.initializer))unsafe=true;
  if(!unsafe)ts.forEachChild(node,scan);
 }
 scan(parsed);if(unsafe)return null;
 const ranges=cls.members.filter(member=>ts.isConstructorDeclaration(member)||ts.isPropertyDeclaration(member)&&member.initializer&&!member.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword)).map(member=>[member.getStart(parsed),member.end]);
 const lineStarts=[0];for(let index=source.indexOf('\n');index>=0;index=source.indexOf('\n',index+1))lineStarts.push(index+1);
 const result={ranges,lineStarts,proof:{api:'@angular/core#EventEmitter',peer_version:metadata.version,file:frame.file,sha256:createHash('sha256').update(source).digest('hex'),constructor_text_sha256:createHash('sha256').update(text).digest('hex')}};
 files.set(frame.file,{key,result});return result;
}

function origin(request,core){
 const calls=frames(request.stack);
 for(let index=0;index<calls.length;index++){
  const frame=calls[index],scope=emitterScope(core,frame);
  if(!scope)continue;
  const start=scope.lineStarts[frame.line-1];if(start===undefined||frame.column<1)continue;
  const position=start+frame.column-1;
  if(scope.ranges.some(([start,end])=>position>=start&&position<end)){
   const caller=calls[index+1];if(!caller)throw Error('public constructor caller scope unavailable');
   return {proof:scope.proof,caller,key:JSON.stringify(caller)};
  }
 }
 return null;
}

/** Every classified invocation must reproduce an independent public control's exact object identities/flags. */
export function partitionPublicConstructorRequests(requests,core,runFactory,injector){
 const retained=[],groups=new Map();
 for(const request of requests){
  const scoped=origin(request,core);
  if(!scoped){retained.push(request);continue;}
  if(!groups.has(scoped.key))groups.set(scoped.key,{...scoped,requests:[]});
  groups.get(scoped.key).requests.push(request);
 }
 const observations=[];
 if(groups.size){
  const control=runFactory(()=>new core.EventEmitter(),core.Injector,core.runInInjectionContext,{injector,captureStack:true});
  if(control.outcome!=='returned'||!(control.value instanceof core.EventEmitter)||!control.requests.length)
   throw Error('public EventEmitter control execution incomplete');
  if(control.requests.some(request=>!origin(request,core)||request.unresolved))throw Error('public EventEmitter control origin/resolution incomplete');
  control.value.complete();
  for(const group of groups.values()){
   if(group.requests.length!==control.requests.length)throw Error('public EventEmitter invocation request count differs from control');
   for(let index=0;index<group.requests.length;index++){
    const actual=group.requests[index],expected=control.requests[index];
    if(actual.token!==expected.token||actual.unresolved||flags.some(flag=>Boolean(actual[flag])!==Boolean(expected[flag])))
     throw Error('public EventEmitter invocation identity/flags/resolution differs from control');
   }
   observations.push({api:'@angular/core#EventEmitter',source:group.proof,caller:group.caller,
    control_outcome:control.outcome,verified:true,requests:group.requests.map(request=>({
     observed_label:request.label,identity_matched:true,unresolved:false,...Object.fromEntries(flags.map(flag=>[flag,Boolean(request[flag])]))})),
    control_requests:control.requests.map(request=>Object.fromEntries(flags.map(flag=>[flag,Boolean(request[flag])])))});
  }
 }
 return {requests:retained,observation:{role:'actual public constructor internals independently replayed; no historical token waiver',
  total_traced_requests:requests.length,retained_requests:retained.length,classified_requests:requests.length-retained.length,groups:observations}};
}

export function publicConstructorPartitionProblems(partition){
 if(!partition||!Number.isInteger(partition.total_traced_requests)||!Number.isInteger(partition.retained_requests)
  ||!Number.isInteger(partition.classified_requests)||!Array.isArray(partition.groups)
  ||[partition.total_traced_requests,partition.retained_requests,partition.classified_requests].some(count=>count<0)
  ||partition.retained_requests+partition.classified_requests!==partition.total_traced_requests)
  return ['public constructor request partition incomplete'];
 let count=0;
 for(const group of partition.groups){
  if(group.api!=='@angular/core#EventEmitter'||group.verified!==true||group.control_outcome!=='returned'
   ||!group.source||group.source.api!==group.api||!/^\d+\.\d+\.\d+/.test(group.source.peer_version)
   ||!/^([a-f0-9]{64})$/.test(group.source.sha256)||!/^([a-f0-9]{64})$/.test(group.source.constructor_text_sha256)
   ||!group.caller?.file||!Number.isInteger(group.caller.line)||!Number.isInteger(group.caller.column)
   ||!Array.isArray(group.requests)||!group.requests.length
   ||!Array.isArray(group.control_requests)||group.control_requests.length!==group.requests.length
   ||group.requests.some((request,index)=>request.identity_matched!==true||request.unresolved!==false
    ||flags.some(flag=>typeof request[flag]!=='boolean'||typeof group.control_requests[index][flag]!=='boolean'
     ||request[flag]!==group.control_requests[index][flag])))
   return ['public constructor control/source evidence incomplete'];
  count+=group.requests.length;
 }
 return count===partition.classified_requests?[]:['public constructor classified request coverage differs'];
}
