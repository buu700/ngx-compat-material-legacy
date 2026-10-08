/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createRequire} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
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
function emitterScope(core,frame){
 const Type=core.EventEmitter;
 let files=cache.get(Type);if(!files){files=new Map();cache.set(Type,files);}
 if(files.has(frame.file))return files.get(frame.file);
 const pkg=join(dirname(frame.file),'../package.json');
 if(!existsSync(pkg)||!existsSync(frame.file))return null;
 const metadata=JSON.parse(readFileSync(pkg,'utf8'));
 if(metadata.name!=='@angular/core'||metadata.version!==core.VERSION.full)return null;
 const source=readFileSync(frame.file,'utf8'),text=Function.prototype.toString.call(Type),start=source.indexOf(text);
 if(start<0||source.indexOf(text,start+1)>=0){files.set(frame.file,null);return null;}
 const ts=require('typescript'),parsed=ts.createSourceFile('public-constructor.js',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(parsed.parseDiagnostics.length||parsed.statements.length!==1||!ts.isClassDeclaration(parsed.statements[0]))
  throw Error('public EventEmitter constructor source is unsupported');
 const cls=parsed.statements[0];
 const ranges=cls.members.filter(member=>ts.isConstructorDeclaration(member)
  ||ts.isPropertyDeclaration(member)&&member.initializer&&!member.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword))
  .map(member=>[start+member.getStart(parsed),start+member.end]);
 const lineStarts=[0];for(let index=source.indexOf('\n');index>=0;index=source.indexOf('\n',index+1))lineStarts.push(index+1);
 const result={ranges,lineStarts,proof:{api:'@angular/core#EventEmitter',peer_version:metadata.version,file:frame.file,
  sha256:createHash('sha256').update(source).digest('hex'),constructor_text_sha256:createHash('sha256').update(text).digest('hex')}};
 files.set(frame.file,result);return result;
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
