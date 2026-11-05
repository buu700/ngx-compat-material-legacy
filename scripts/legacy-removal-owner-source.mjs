/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite code successors; prior images are literal comparison data only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {tableLocalCompilationOwnerSourceSubject} from './table-local-compilation-owner-source.mjs';
import {packedUpstreamLedgerCurrentSourceLane} from './packed-upstream-ledger-epoch.mjs';
import {composeCanonicalSourceGuards} from './canonical-source-guard-plan.mjs';
const SELF='scripts/legacy-removal-owner-source.mjs',INPUTS='compatibility/rc/21x-legacy-removal-admission-owner-inputs.json';
const PIN='f64114770b458614c1251e8aae33b245999e64fee8ffa9216324e0f253bd4e0f';
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const bufferEquals=Buffer.prototype.equals,apply=Reflect.apply;
const equal=(a,b)=>Buffer.isBuffer(b)&&apply(bufferEquals,a,[b]);
function ownValue(object,key){const d=Object.getOwnPropertyDescriptor(object,key);assert.ok(d&&Object.hasOwn(d,'value'),'non-data legacy source guard '+key);return d.value;}
function original(root,commit,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:16*1024*1024});
}
export function legacyRemovalOwnerSourceSubject({root,read=path=>readEvidenceMember(root,path)}={}){
 assert.ok(JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.'));
 const actual=packedUpstreamLedgerCurrentSourceLane({root,read});
 const successor=tableLocalCompilationOwnerSourceSubject({root,read});
 const bound=new Map(successor.bound.map(ref=>[ref.path,{...ref}])),member=(ref,resolution)=>{const before=resolution?readEvidenceMember(root,ref.path):undefined,raw=read(ref.path);if(resolution){assert.deepEqual(ref,resolution.reference,'changed planned legacy member');assert.ok(equal(before,raw),'nonphysical planned legacy member '+ref.path);assert.ok(equal(before,readEvidenceMember(root,ref.path)),'planned legacy member changed during callback '+ref.path);}const owned=resolution?true:successor.ownsReference(ref),qualified=resolution?resolution.qualified:owned?successor.qualifyReference(ref):ref,comparison=resolution?resolution.comparison:owned?successor.comparisonBytes(ref):raw;assert.ok(Buffer.isBuffer(raw));assert.equal(hash(comparison),ref.sha256,'changed legacy owner code '+ref.path);if(ref.bytes!==undefined)assert.equal(comparison.length,ref.bytes);assert.equal(hash(raw),qualified.sha256,'changed actual legacy owner successor '+ref.path);assert.ok(raw.equals(readEvidenceMember(root,ref.path)),'nonphysical legacy owner code '+ref.path);bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return comparison;};
 const packet=JSON.parse(member({path:INPUTS,sha256:PIN}));assert.equal(packet.schema_version,1);assert.equal(packet.line,'21.x');assert.equal(packet.canonical_dispositions_applied,0);assert.equal(packet.old_program_executed,false);assert.equal(packet.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 member({path:SELF,sha256:hash(image),bytes:image.length});const transitions=new Map();
 const staticRefs=[...packet.code_transitions.map(row=>row.after),...packet.source_members];
 const collect=resolutions=>{let index=0;const staticMember=ref=>member(ref,resolutions?.[index++]??undefined);
 for(const row of packet.code_transitions){
  assert.equal(row.before.path,row.after.path);assert.ok(!transitions.has(row.after.path));
  const before=original(root,packet.source_parent,row.before.path);assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
  let expected=before.toString();for(const edit of row.literal_edits){assert.equal(expected.split(edit.before).length,2,'ambiguous legacy owner successor '+row.after.path);expected=expected.replace(edit.before,edit.after);}
  assert.equal(hash(expected),row.after.sha256);assert.equal(Buffer.byteLength(expected),row.after.bytes);const after=staticMember(row.after);assert.equal(after.toString(),expected);
  transitions.set(row.after.path,{before:{...row.before},after:{...row.after},beforeBytes:before,afterBytes:after});
 }
 assert.equal(transitions.size,packet.code_transition_count);assert.ok(transitions.size>=4);for(const ref of packet.source_members)staticMember(ref);
 if(resolutions)assert.equal(index,staticRefs.length,'unused planned legacy members');};
 // Share only this exact table subject's complete graph. Opaque or mismatched
 // tuples keep the original sequence, including every frame/registry operation.
 const guard=Object.getOwnPropertyDescriptor(successor,'assertCurrent'),plan=Object.getOwnPropertyDescriptor(successor,'guardPlan'),batch=Object.getOwnPropertyDescriptor(successor,'legacyStaticReferences'),ownership=Object.getOwnPropertyDescriptor(successor,'ownsReference');
 const tuple=plan&&Object.hasOwn(plan,'value')?plan.value:undefined;
 const plainTuple=tuple&&typeof tuple==='object'&&!types.isProxy(tuple);
 const tupleGuard=plainTuple?Object.getOwnPropertyDescriptor(tuple,'assertCurrent'):undefined;
 const tupleNode=plainTuple?Object.getOwnPropertyDescriptor(tuple,'node'):undefined;
 const uncovered=staticRefs.filter(ref=>!bound.has(ref.path));
 const usable=guard&&Object.hasOwn(guard,'value')&&typeof guard.value==='function'&&batch&&Object.hasOwn(batch,'value')&&typeof batch.value==='function'&&ownership&&Object.hasOwn(ownership,'value')&&typeof ownership.value==='function'&&
  plainTuple&&Object.isFrozen(tuple)&&Reflect.ownKeys(tuple).length===2&&tupleGuard&&Object.hasOwn(tupleGuard,'value')&&tupleGuard.value===guard.value&&tupleNode&&Object.hasOwn(tupleNode,'value')&&tupleNode.value&&typeof tupleNode.value==='object'&&!types.isProxy(tupleNode.value)&&
  uncovered.every(ref=>Number.isSafeInteger(ref.bytes)&&ref.bytes>=0&&!apply(ownership.value,undefined,[ref]));
 if(usable){
  for(const ref of uncovered){const raw=readEvidenceMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'physical uncovered legacy source '+ref.path);assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:ref.bytes});}
  const snapshot=structuredClone(staticRefs);
  const check=()=>{assert.deepEqual(staticRefs,snapshot,'changed legacy packet references');for(const [key,saved]of [['assertCurrent',guard],['guardPlan',plan],['legacyStaticReferences',batch],['ownsReference',ownership]]){const now=Object.getOwnPropertyDescriptor(successor,key);assert.ok(now);for(const field of ['value','enumerable','writable','configurable'])assert.equal(now[field],saved[field],'changed legacy binding '+key);}assert.equal(ownValue(tuple,'assertCurrent'),guard.value);assert.equal(ownValue(tuple,'node'),tupleNode.value);};
  const physical=()=>{for(const ref of bound.values()){const raw=readEvidenceMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'physical planned legacy source '+ref.path);assert.equal(raw.length,ref.bytes);}};
  const bindingNode=Object.freeze({dependencies:Object.freeze([tupleNode.value]),preflight:()=>{check();physical();},consume:()=>{check();const resolutions=apply(batch.value,undefined,[staticRefs]);collect(resolutions);check();},final:()=>{physical();check();}});
  composeCanonicalSourceGuards(Object.freeze([bindingNode]))();
 }else collect();
 const registrySubject=()=>{
  const path='scripts/upstream-source-contract-registry.mjs',before=gunzipSync(member(packet.registry_before_image)),after=gunzipSync(member(packet.registry_after_image)),physical=read(path),raw=successor.predecessorData(path,physical);
  assert.ok(physical.equals(readEvidenceMember(root,path)),'nonphysical registry comparison source');assert.ok(raw.equals(before)||raw.equals(after),'unqualified registry comparison source');
  const reference={path,sha256:hash(physical),bytes:physical.length},prior=bound.get(path);if(prior)assert.equal(reference.sha256,prior.sha256);else bound.set(path,reference);return {before,after,raw,reference};
 };
 const qualifyRegistry=value=>{const ref=successor.predecessorReference(value),subject=registrySubject(),previous=ref.sha256===hash(subject.before)?subject.before:ref.sha256===hash(subject.after)?subject.after:null;assert.ok(previous,'unqualified registry reference');if(ref.bytes!==undefined)assert.equal(ref.bytes,previous.length);return {...ref,...subject.reference};};
 const qualifyReference=value=>{const ref=successor.predecessorReference(value),row=transitions.get(ref.path);if(!row)return ref.path==='scripts/upstream-source-contract-registry.mjs'?qualifyRegistry(ref):successor.qualifyReference(ref);const previous=ref.sha256===row.before.sha256?row.before:ref.sha256===row.after.sha256?row.after:null;assert.ok(previous,'unqualified legacy code reference '+ref.path);if(ref.bytes!==undefined)assert.equal(ref.bytes,previous.bytes);return successor.qualifyReference({...ref,sha256:row.after.sha256,bytes:row.after.bytes});};
 // Never returned from a public read/raw route and never imported/evaluated.
 const comparisonBytes=ref=>{if(successor.ownsReference(ref))return successor.comparisonBytes(ref);const row=transitions.get(ref.path);if(!row){if(ref.path==='scripts/upstream-source-contract-registry.mjs'){qualifyRegistry(ref);const subject=registrySubject();return Buffer.from(ref.sha256===hash(subject.before)?subject.before:subject.after);}return Buffer.from(member(ref));}qualifyReference(ref);return Buffer.from(ref.sha256===row.before.sha256?row.beforeBytes:row.afterBytes);};
 const registryComparisonBytes=()=>Buffer.from(registrySubject().before);
 const originalAssertCurrent=()=>{successor.assertCurrent();for(const ref of bound.values()){const raw=actual.read(ref.path);assert.equal(hash(raw),ref.sha256,'late legacy owner code '+ref.path);assert.equal(raw.length,ref.bytes);assert.ok(raw.equals(readEvidenceMember(root,ref.path)));}for(const ref of bound.values()){const raw=readEvidenceMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'final physical legacy owner code '+ref.path);assert.equal(raw.length,ref.bytes);}};
 let assertCurrent=originalAssertCurrent,guardNode,guardPlan;
 if(Object.hasOwn(successor,'guardPlan')){
  const priorGuard=ownValue(successor,'assertCurrent'),priorPlan=ownValue(successor,'guardPlan'),sourceRead=ownValue(actual,'read');
  assert.ok(Object.isFrozen(priorPlan));assert.deepEqual(Reflect.ownKeys(priorPlan).sort(),['assertCurrent','node']);assert.equal(ownValue(priorPlan,'assertCurrent'),priorGuard);
  const priorNode=ownValue(priorPlan,'node');
  const metadata=()=>{assert.equal(ownValue(successor,'assertCurrent'),priorGuard);assert.equal(ownValue(successor,'guardPlan'),priorPlan);assert.equal(ownValue(actual,'read'),sourceRead);};
  const physical=()=>{for(const ref of bound.values()){
   const raw=readEvidenceMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'physical legacy source input '+ref.path);assert.equal(raw.length,ref.bytes);
  }};
  let consuming=false;
  const idle=()=>assert.equal(consuming,false,'reentrant legacy source consumption');
  guardNode=Object.freeze({dependencies:Object.freeze([priorNode]),
   preflight:()=>{idle();metadata();physical();},
   consume:()=>{
    idle();consuming=true;
    try{for(const ref of bound.values()){
     const before=readEvidenceMember(root,ref.path);assert.equal(hash(before),ref.sha256,'late legacy source input '+ref.path);assert.equal(before.length,ref.bytes);
     const raw=sourceRead(ref.path);assert.ok(equal(before,raw),'nonphysical legacy source input '+ref.path);
     assert.ok(equal(before,readEvidenceMember(root,ref.path)),'legacy source input changed during callback '+ref.path);
    }}finally{consuming=false;}
   },
   final:()=>{physical();metadata();},
  });
  const composed=composeCanonicalSourceGuards(Object.freeze([guardNode]));assertCurrent=()=>{idle();composed();};guardPlan=Object.freeze({assertCurrent,node:guardNode});
 }
 assertCurrent();return {packet:structuredClone(packet),bound:structuredClone([...bound.values()]),qualifyReference,comparisonBytes,registryComparisonBytes,predecessorData:successor.predecessorData,assertCurrent,...(guardPlan?{guardNode,guardPlan}:{}),old_program_executed:false,canonical_frame_admission_granted:false,current_native_or_full_audit_credit:false};
}
