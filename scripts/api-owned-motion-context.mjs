/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url),flags=['optional','self','skipSelf','host'];
export const SELECT_MOTION_SYMBOL='legacy-select/primary/MatLegacySelect';
export const PSEUDO_MOTION_SYMBOL='legacy-core/primary/MatLegacyPseudoCheckbox';
export const SNACK_MOTION_SYMBOL='legacy-snack-bar/primary/MatLegacySnackBarContainer';
const ownedMotionProfiles=Object.freeze({
 [SELECT_MOTION_SYMBOL]:Object.freeze({family:'legacy-select',property:'_animationsEnabled',enabled:true}),
 [PSEUDO_MOTION_SYMBOL]:Object.freeze({family:'legacy-core',property:'_animationsDisabled',enabled:false}),
 [SNACK_MOTION_SYMBOL]:Object.freeze({family:'legacy-snack-bar',property:'_animationsEnabled',enabled:true}),
});
export const ownedMotionProfile=symbolId=>Object.hasOwn(ownedMotionProfiles,symbolId)?ownedMotionProfiles[symbolId]:null;
const sha=text=>createHash('sha256').update(text).digest('hex');
const matrix=[
 {id:'override-enabled',override:'enabled',state:'enabled',count:1},
 {id:'override-disabled',override:'di-disabled',state:'di-disabled',count:1},
 {id:'override-reduced',override:'reduced-motion',state:'reduced-motion',count:1},
 {id:'material-disabled',material:true,state:'di-disabled',count:2},
 {id:'noop-module',module:'NoopAnimations',state:'di-disabled',count:3},
 {id:'media-enabled',state:'enabled',count:4,queries:1},
 {id:'media-reduced',reduced:true,state:'reduced-motion',count:4,queries:1},
 {id:'media-throws',throws:true,state:'enabled',count:4,queries:1},
 {id:'media-missing',missing:true,state:'enabled',count:4,unresolved:true},
];

function frames(stack){
 return String(stack||'').split('\n').flatMap(line=>{
  const match=line.match(/(?:\(|at )(file:\/\/[^()]+|\/[^()]+):(\d+):(\d+)\)?$/);
  return match?[{file:match[1].startsWith('file:')?fileURLToPath(match[1]):match[1],line:+match[2],column:+match[3]}]:[];
 });
}

/** Correlate actual exported function bytes with the actual loaded family file, read-only. */
function sourceScope(file,Type,{classConstructor=false}={}){
 const source=readFileSync(file,'utf8'),text=Function.prototype.toString.call(Type),start=source.indexOf(text);
 if(start<0||source.indexOf(text,start+1)>=0)throw Error('owned motion function source is absent/ambiguous');
 let ranges=[[start,start+text.length]];
 if(classConstructor){
  const ts=require('typescript'),parsed=ts.createSourceFile('owned-constructor.js','('+text+')',ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const expression=parsed.statements[0]?.expression?.expression;
  if(parsed.parseDiagnostics.length||parsed.statements.length!==1||!expression||!ts.isClassExpression(expression))
   throw Error('owned motion caller constructor source is unsupported');
  ranges=expression.members.filter(member=>ts.isConstructorDeclaration(member)
   ||ts.isPropertyDeclaration(member)&&member.initializer&&!member.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword))
   .map(member=>[start+member.getStart(parsed)-1,start+member.end-1]);
 }
 const lineStarts=[0];for(let index=source.indexOf('\n');index>=0;index=source.indexOf('\n',index+1))lineStarts.push(index+1);
 return {file,ranges,lineStarts,proof:{file,sha256:sha(source),function_text_sha256:sha(text)}};
}
function inside(frame,scope){
 const line=scope.lineStarts[frame?.line-1];
 return frame?.file===scope.file&&line!==undefined&&frame.column>0
  &&scope.ranges.some(([start,end])=>line+frame.column-1>=start&&line+frame.column-1<end);
}
function helperOrigin(request,stateScope,disabledScope,callerScope){
 const calls=frames(request.stack),index=calls.findIndex(frame=>inside(frame,stateScope));
 if(index<0)return null;
 if(disabledScope&&!inside(calls[index+1],disabledScope))return null;
 const caller=calls[index+(disabledScope?2:1)];
 return callerScope&&!inside(caller,callerScope)?null:caller;
}
function assertRequests(requests,expected,{allowUnresolved=false}={}){
 if(requests.length!==expected.length)throw Error('owned motion request count differs from independent contract');
 for(let index=0;index<requests.length;index++){
  const actual=requests[index],want=expected[index];
  if(actual.token!==want.token||flags.some(flag=>Boolean(actual[flag])!==Boolean(want[flag]))
   ||Boolean(actual.unresolved)!==Boolean(allowUnresolved&&index===requests.length-1))
   throw Error('owned motion request identity/flags/resolution differs from independent contract');
 }
}
function serialized(requests,expected){
 return requests.map((request,index)=>({ident:expected[index].ident,identity_matched:request.token===expected[index].token,
  unresolved:Boolean(request.unresolved),...Object.fromEntries(flags.map(flag=>[flag,Boolean(request[flag])]))}));
}

/** Additional owned motion behavior is proved separately from the immutable original constructor DI. */
export function partitionOwnedSelectMotion(requests,core,owned,layout,material,Type,files,runFactory,injector,value,symbolId=SELECT_MOTION_SYMBOL){
 const profile=ownedMotionProfile(symbolId);
 if(!profile)throw Error('unknown owned motion caller');
 const stateScope=sourceScope(files.core,owned.getLegacyAnimationsState);
 const disabledScope=sourceScope(files.core,owned.legacyAnimationsDisabled);
 const callerScope=sourceScope(files.caller,Type,{classConstructor:true});
 const expected=[
  {ident:'LEGACY_ANIMATIONS_TEST_OVERRIDE',token:owned.LEGACY_ANIMATIONS_TEST_OVERRIDE,optional:true},
  {ident:'MATERIAL_ANIMATIONS',token:material.MATERIAL_ANIMATIONS,optional:true},
  {ident:'ANIMATION_MODULE_TYPE',token:core.ANIMATION_MODULE_TYPE,optional:true},
  {ident:'MediaMatcher',token:layout.MediaMatcher,optional:false},
 ];
 if(expected.some(item=>!item.token)||owned.MATERIAL_ANIMATIONS!==material.MATERIAL_ANIMATIONS)
  throw Error('owned motion public token identities missing');
 const retained=[],classified=[];
 for(const request of requests){
  if(helperOrigin(request,stateScope,disabledScope,callerScope))classified.push(request);else retained.push(request);
 }
 const control=runFactory(owned.getLegacyAnimationsState,core.Injector,core.runInInjectionContext,{injector,captureStack:true});
 if(control.outcome!=='returned'||!['enabled','di-disabled','reduced-motion'].includes(control.value)
  ||control.requests.some(request=>!helperOrigin(request,stateScope)))throw Error('owned motion independent control incomplete');
 assertRequests(control.requests,expected.slice(0,control.requests.length));
 assertRequests(classified,expected.slice(0,control.requests.length));
 const componentState=value[profile.property],expectedState=profile.enabled?control.value==='enabled':control.value!=='enabled';
 if(!classified.length||componentState!==expectedState)throw Error('owned component motion state differs from control');
 const cases=[];
 for(const cell of matrix){
  const queries=[],parent=core.Injector.create({providers:[]});
  const child=core.Injector.create({parent,providers:[
   {provide:expected[0].token,useValue:cell.override??null},
   {provide:expected[1].token,useValue:{animationsDisabled:Boolean(cell.material)}},
   {provide:expected[2].token,useValue:cell.module??'BrowserAnimations'},
   ...(cell.missing?[]:[{provide:expected[3].token,useValue:{matchMedia(query){queries.push(query);if(cell.throws)throw Error('controlled media failure');return {matches:Boolean(cell.reduced)};}}}]),
  ]});
  try{
   const observed=runFactory(owned.getLegacyAnimationsState,core.Injector,core.runInInjectionContext,{injector:child,captureStack:true});
   if(observed.outcome!=='returned'||observed.value!==cell.state
    ||queries.length!==(cell.queries||0)||queries.some(query=>query!=='(prefers-reduced-motion)')
    ||observed.requests.some(request=>!helperOrigin(request,stateScope)))throw Error('owned motion state/query branch differs: '+cell.id);
   assertRequests(observed.requests,expected.slice(0,cell.count),{allowUnresolved:cell.unresolved});
   const stateQueries=[...queries];queries.length=0;
   const disabled=runFactory(owned.legacyAnimationsDisabled,core.Injector,core.runInInjectionContext,{injector:child,captureStack:true});
   if(disabled.outcome!=='returned'||disabled.value!==(cell.state!=='enabled')
    ||queries.length!==(cell.queries||0)||queries.some(query=>query!=='(prefers-reduced-motion)')
    ||disabled.requests.some(request=>!helperOrigin(request,stateScope,disabledScope)))throw Error('owned motion disabled branch differs: '+cell.id);
   assertRequests(disabled.requests,expected.slice(0,cell.count),{allowUnresolved:cell.unresolved});
   cases.push({id:cell.id,result:'pass',state:observed.value,disabled:disabled.value,queries:stateQueries,
    disabled_queries:[...queries],requests:serialized(observed.requests,expected),disabled_requests:serialized(disabled.requests,expected)});
  }finally{child.destroy();parent.destroy();}
 }
 return {requests:retained,observation:{symbol_id:symbolId,
  role:'Owned helper source/caller, independent same-node control and finite state matrix; original constructor expectations unchanged',
  total_requests:requests.length,retained_requests:retained.length,classified_requests:classified.length,
  sources:{state:stateScope.proof,disabled:disabledScope.proof,caller:callerScope.proof},
  caller:helperOrigin(classified[0],stateScope,disabledScope,callerScope),
  state:control.value,component_enabled:profile.enabled?componentState:!componentState,verified:true,
  requests:serialized(classified,expected),control_requests:serialized(control.requests,expected),cases}};
}

export function ownedSelectMotionProblems(observation,symbolId=SELECT_MOTION_SYMBOL){
 const x=observation,problems=[];
 if(!ownedMotionProfile(symbolId)||!x||x.symbol_id!==symbolId||x.verified!==true
  ||!Number.isInteger(x.total_requests)||!Number.isInteger(x.retained_requests)||!Number.isInteger(x.classified_requests)
  ||x.retained_requests<0||x.classified_requests<1||x.retained_requests+x.classified_requests!==x.total_requests
  ||!['enabled','di-disabled','reduced-motion'].includes(x.state)||x.component_enabled!==(x.state==='enabled')
  ||!x.caller?.file||!Number.isInteger(x.caller.line)||!Number.isInteger(x.caller.column))
  return ['owned select motion execution/control evidence incomplete'];
 if(['state','disabled','caller'].some(name=>!x.sources?.[name]?.file
  ||!/^([a-f0-9]{64})$/.test(x.sources[name].sha256)||!/^([a-f0-9]{64})$/.test(x.sources[name].function_text_sha256)))
  problems.push('owned motion source/caller correlation incomplete');
 if(symbolId===SNACK_MOTION_SYMBOL&&(x.caller?.file!==x.sources?.caller?.file
  ||!x.sources?.caller?.file?.endsWith('/fesm2022/ngx-compat-material-legacy-legacy-snack-bar.mjs')))
  problems.push('owned snack-bar motion caller belongs to a different public entry');
 const names=['LEGACY_ANIMATIONS_TEST_OVERRIDE','MATERIAL_ANIMATIONS','ANIMATION_MODULE_TYPE','MediaMatcher'];
 const check=(requests,count,unresolved=false)=>Array.isArray(requests)&&requests.length===count&&requests.every((r,index)=>
  r.ident===names[index]&&r.identity_matched===true&&r.optional===(index<3)
  &&r.self===false&&r.skipSelf===false&&r.host===false&&r.unresolved===(unresolved&&index===count-1));
 if(!check(x.requests,x.classified_requests)||!check(x.control_requests,x.classified_requests))
  problems.push('owned motion actual/control identity/options differ');
 if(!Array.isArray(x.cases)||x.cases.length!==matrix.length||matrix.some((cell,index)=>{
  const actual=x.cases[index];return actual?.id!==cell.id||actual.result!=='pass'||actual.state!==cell.state||actual.disabled!==(cell.state!=='enabled')
   ||!Array.isArray(actual.queries)||actual.queries.length!==(cell.queries||0)
   ||actual.queries.some(query=>query!=='(prefers-reduced-motion)')||!check(actual.requests,cell.count,Boolean(cell.unresolved))
   ||!Array.isArray(actual.disabled_queries)||actual.disabled_queries.length!==(cell.queries||0)
   ||actual.disabled_queries.some(query=>query!=='(prefers-reduced-motion)')||!check(actual.disabled_requests,cell.count,Boolean(cell.unresolved));
 }))problems.push('owned motion state/query matrix incomplete');
 return problems;
}
