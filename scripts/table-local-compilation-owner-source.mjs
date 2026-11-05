/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current tool successors; predecessor bytes are comparison data only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {types} from 'node:util';
import {composeCanonicalSourceGuards} from './canonical-source-guard-plan.mjs';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {historicalContractRepairReaderSubject} from './historical-contract-repair-readers.mjs';
import {baseClassRemovalCanonicalFrameSubject} from './base-class-removal-owner-source.mjs';
import {packedUpstreamLedgerCurrentSourceLane} from './packed-upstream-ledger-epoch.mjs';
const SELF='scripts/table-local-compilation-owner-source.mjs',INPUTS='compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json';
const PIN='1a35dd57edd9952a23d4bb2e8e9783f19583c00badfd7e9846fdbd2abc94f48b';
const LEGACY_INPUTS='compatibility/rc/21x-legacy-removal-admission-owner-inputs.json',LEGACY_PIN='f64114770b458614c1251e8aae33b245999e64fee8ffa9216324e0f253bd4e0f';
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex'),originals=new Map();
const bufferEquals=Buffer.prototype.equals,apply=Reflect.apply;
const equal=(actual,supplied)=>Buffer.isBuffer(supplied)&&apply(bufferEquals,actual,[supplied]);
function data(object,key,optional=false){
 assert.ok(object&&typeof object==='object'&&!types.isProxy(object));
 const descriptor=Object.getOwnPropertyDescriptor(object,key);
 if(optional&&!descriptor)return undefined;
 assert.ok(descriptor&&Object.hasOwn(descriptor,'value'),'non-data table guard metadata '+key);
 return descriptor;
}
function same(object,key,before){
 const after=data(object,key,before===undefined);
 if(before===undefined){assert.equal(after,undefined);return;}
 for(const flag of ['value','enumerable','writable','configurable'])assert.equal(after[flag],before[flag],'changed table guard metadata '+key);
}
function planOf(subject){
 const guard=data(subject,'assertCurrent'),plan=data(subject,'guardPlan',true);
 let node;
 if(plan){
  assert.ok(plan.value&&typeof plan.value==='object'&&!types.isProxy(plan.value)&&Object.isFrozen(plan.value));
  assert.deepEqual(Reflect.ownKeys(plan.value).sort(),['assertCurrent','node']);
  assert.equal(data(plan.value,'assertCurrent').value,guard.value,'incomplete table dependency tuple');
  node=data(plan.value,'node').value;
 }
 return {node,check:()=>{same(subject,'assertCurrent',guard);same(subject,'guardPlan',plan);}};
}
function original(root,commit,path){
 const key=root+'\0'+commit+'\0'+path;if(!originals.has(key)){
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
  originals.set(key,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:16*1024*1024}));
 }return Buffer.from(originals.get(key));
}
export function tableLocalCompilationOwnerSourceSubject({root,read=path=>readEvidenceMember(root,path)}={}){
 assert.ok(JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.'));
 const actual=packedUpstreamLedgerCurrentSourceLane({root,read});
 const frames=baseClassRemovalCanonicalFrameSubject({root,read:actual.read});
 const repairs=historicalContractRepairReaderSubject({root,read});
 const bound=new Map([...repairs.bound,...frames.bound].map(ref=>[ref.path,{...ref}])),member=(ref,resolution)=>{
  if(resolution)assert.deepEqual(ref,resolution.reference,'changed planned table member');
  const before=resolution?readEvidenceMember(root,ref.path):undefined,raw=read(ref.path);
  if(resolution){
   assert.deepEqual(ref,resolution.reference,'changed planned table member during callback');
   assert.ok(equal(before,raw),'nonphysical planned table member '+ref.path);
   assert.ok(equal(before,readEvidenceMember(root,ref.path)),'planned table member changed during callback '+ref.path);
  }
  const qualified=resolution?(resolution.qualified??ref):(repairs.qualify(ref)??ref);
  const comparison=resolution?(resolution.comparison===undefined?raw:resolution.comparison):(repairs.ownsReference(ref)?repairs.comparisonBytes(ref):raw);
  assert.ok(Buffer.isBuffer(raw));assert.equal(hash(comparison),ref.sha256,'changed table owner input '+ref.path);if(ref.bytes!==undefined)assert.equal(comparison.length,ref.bytes);assert.equal(hash(raw),qualified.sha256,'changed actual table owner successor '+ref.path);assert.ok(raw.equals(readEvidenceMember(root,ref.path)),'nonphysical table owner source '+ref.path);bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return comparison;
 };
 const packet=JSON.parse(member({path:INPUTS,sha256:PIN}));assert.equal(packet.schema_version,1);assert.equal(packet.line,'21.x');assert.equal(packet.old_program_executed,false);assert.equal(packet.canonical_dispositions_applied,0);assert.equal(packet.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 member({path:SELF,sha256:hash(image),bytes:image.length});const transitions=new Map();
 // Resolve only this authenticated packet's static comparison metadata. Each
 // later member still reads and checks the actual supplied/physical source.
 // Results are consumed once in packet order and grant no current-state proof.
 const staticRefs=[...packet.code_transitions.map(row=>row.after),...packet.source_members];
 const batchDescriptor=Object.getOwnPropertyDescriptor(repairs,'referenceBatch');
 let staticResolutions;
 if(batchDescriptor){
  assert.ok(Object.hasOwn(batchDescriptor,'value')&&typeof batchDescriptor.value==='function','non-data reference batch');
  const requests=[],positions=staticRefs.map(ref=>{
   const qualified=requests.push({kind:'qualify',reference:structuredClone(ref)})-1;
   const comparison=repairs.ownsReference(ref)?requests.push({kind:'comparison',reference:structuredClone(ref)})-1:undefined;
   return {reference:structuredClone(ref),qualified,comparison};
  });
  const results=apply(batchDescriptor.value,undefined,[requests]);
  staticResolutions=positions.map(row=>({reference:row.reference,qualified:results[row.qualified],...(row.comparison===undefined?{}:{comparison:results[row.comparison]})}));
 }
 let staticIndex=0;
 const staticMember=ref=>{const resolution=staticResolutions?.[staticIndex++];return member(ref,resolution);};
 for(const row of packet.code_transitions){
  assert.equal(row.before.path,row.after.path);assert.ok(!transitions.has(row.after.path));const before=original(root,packet.source_parent,row.before.path);assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
  let expected=before.toString();for(const edit of row.literal_edits){assert.equal(expected.split(edit.before).length,2,'ambiguous table owner edit '+row.after.path);expected=expected.replace(edit.before,edit.after);}
  assert.equal(hash(expected),row.after.sha256);assert.equal(Buffer.byteLength(expected),row.after.bytes);const after=staticMember(row.after);assert.equal(after.toString(),expected);
  transitions.set(row.after.path,{before:{...row.before},after:{...row.after},beforeBytes:before,afterBytes:after});
 }
 assert.equal(transitions.size,packet.code_transition_count);assert.ok(transitions.size>=4);for(const ref of packet.source_members)staticMember(ref);
 if(staticResolutions)assert.equal(staticIndex,staticResolutions.length,'unused planned table members');
 const registry='scripts/upstream-source-contract-registry.mjs',ledger='compatibility/f10/disposition-ledger/ledger.json',roster='compatibility/rc/21x-remaining-disposition-worksheet.json';
 const pairs=new Map([[registry,{before:gunzipSync(member(packet.registry_before_image)),after:gunzipSync(member(packet.registry_after_image))}],[ledger,{before:gunzipSync(member(packet.ledger_before_image)),after:gunzipSync(member(packet.ledger_after_image))}],[roster,{before:gunzipSync(member(packet.roster_before_image)),after:gunzipSync(member(packet.roster_after_image))}]]);
 const ancestor=gunzipSync(member(packet.registry_ancestor_image));
 const registrySubject=()=>{
  const physical=read(registry),pair=pairs.get(registry),frame=frames.registrySubject(),raw=frame.comparison;assert.ok(physical.equals(frame.raw)&&physical.equals(readEvidenceMember(root,registry)),'nonphysical current registry');assert.ok([ancestor,pair.before,pair.after].some(value=>raw.equals(value)),'unknown current registry frame');
  const reference={...frame.reference};if(bound.has(registry))assert.equal(bound.get(registry).sha256,reference.sha256);else bound.set(registry,reference);return {raw,physical,reference};
 };
 const ownsReference=ref=>{const row=transitions.get(ref.path);return frames.ownsReference(ref)||repairs.ownsReference(ref)||Boolean(row&&[row.before.sha256,row.after.sha256].includes(ref.sha256))||ref.path===registry&&[ancestor,...Object.values(pairs.get(registry))].some(raw=>hash(raw)===ref.sha256);};
 const predecessorReference=value=>{
  const repaired=repairs.predecessorReference(value)??value,ref=frames.ownsReference(repaired)?frames.predecessorReference(repaired):repaired;
  const row=transitions.get(ref.path);if(row&&ref.sha256===row.after.sha256){if(ref.bytes!==undefined)assert.equal(ref.bytes,row.after.bytes);return {...ref,sha256:row.before.sha256,bytes:row.before.bytes};}
  const pair=pairs.get(ref.path);if(pair&&ref.sha256===hash(pair.after)){if(ref.bytes!==undefined)assert.equal(ref.bytes,pair.after.length);return {...ref,sha256:hash(pair.before),bytes:pair.before.length};}return {...ref};
 };
 const qualifyReference=value=>{
  const repaired=repairs.predecessorReference(value)??value,ref=frames.ownsReference(repaired)?frames.predecessorReference(repaired):repaired;
  const row=transitions.get(ref.path);if(row){const previous=ref.sha256===row.before.sha256?row.before:ref.sha256===row.after.sha256?row.after:null;assert.ok(previous,'unknown table code reference '+ref.path);if(ref.bytes!==undefined)assert.equal(ref.bytes,previous.bytes);return repairs.qualify({...ref,...row.after})??{...ref,...row.after};}
  if(ref.path===registry){const previous=[ancestor,...Object.values(pairs.get(registry))].find(raw=>hash(raw)===ref.sha256);assert.ok(previous,'unknown table registry reference');if(ref.bytes!==undefined)assert.equal(ref.bytes,previous.length);return {...ref,...registrySubject().reference};}return repairs.qualify(ref)??{...ref};
 };
 const comparisonBytes=ref=>{
  if(frames.ownsReference(ref))return frames.comparisonBytes(ref);
  if(repairs.ownsReference(ref))return repairs.comparisonBytes(ref);
  const row=transitions.get(ref.path);if(row){qualifyReference(ref);return Buffer.from(ref.sha256===row.before.sha256?row.beforeBytes:row.afterBytes);}
  if(ref.path===registry){qualifyReference(ref);return Buffer.from([ancestor,...Object.values(pairs.get(registry))].find(raw=>hash(raw)===ref.sha256));}return Buffer.from(member(ref));
 };
 // Resolve only immutable historical comparison data for the caller's finite
 // legacy packet operation. Current source bytes are consumed afresh by each
 // batch request and again by the caller; unrecognized cases use its old path.
 const legacyStaticReferences=refs=>{
  assert.ok(Array.isArray(refs)&&refs.length>0);
  const snapshot=structuredClone(refs),legacyRaw=readEvidenceMember(root,LEGACY_INPUTS);
  assert.equal(hash(legacyRaw),LEGACY_PIN,'changed legacy batch packet');
  const legacy=JSON.parse(legacyRaw),expected=[...legacy.code_transitions.map(row=>row.after),...legacy.source_members];
  assert.equal(expected.length,25);assert.deepEqual(snapshot,expected,'foreign legacy batch references');
  const batch=data(repairs,'referenceBatch',true);
  if(!batch||typeof batch.value!=='function')return null;
  const available=new Map(repairs.transitions.map(row=>[row.path,row]));
  const eligible=[];
  for(let i=0;i<snapshot.length;i++){
   const ref=snapshot[i],row=available.get(ref.path);
   // Only a strict historical before-image can be retained as comparison DATA.
   if(row&&row.before.sha256===ref.sha256&&row.before.sha256!==row.after.sha256&&
      repairs.ownsReference(ref)&&!frames.ownsReference(ref)&&ref.path!==registry){
    eligible.push(i);
   }
  }
  if(!eligible.length)return null;
  const first=[];
  for(const i of eligible){first.push({kind:'predecessor',reference:snapshot[i]},{kind:'comparison',reference:snapshot[i]});}
  const initial=apply(batch.value,undefined,[first]);same(repairs,'referenceBatch',batch);assert.deepEqual(refs,snapshot);
  const accepted=[],second=[];
  for(let index=0;index<eligible.length;index++){
   const i=eligible[index],normalized=initial[index*2]??snapshot[i];
   if(frames.ownsReference(normalized)||transitions.has(normalized.path)||normalized.path===registry)continue;
   accepted.push({i,normalized,comparison:initial[index*2+1]});
   second.push({kind:'qualify',reference:normalized});
  }
  if(!accepted.length)return null;
  const qualified=apply(batch.value,undefined,[second]);same(repairs,'referenceBatch',batch);assert.deepEqual(refs,snapshot);
  const result=snapshot.map(()=>null);
  for(let i=0;i<accepted.length;i++){
   const row=accepted[i];result[row.i]={reference:snapshot[row.i],qualified:qualified[i]??row.normalized,comparison:row.comparison};
  }
  return result;
 };
 // A finite private data comparison only. Unknown bytes pass through unchanged
 // to the original strict predecessor gate; no public read/raw uses this view.
 const predecessorData=(path,raw)=>{assert.ok(Buffer.isBuffer(raw));const normalized=frames.predecessorData(path,raw),pair=pairs.get(path);return Buffer.from(pair&&normalized.equals(pair.after)?pair.before:normalized);};
 const originalAssertCurrent=()=>{actual.assertCurrent();frames.assertCurrent();repairs.assertCurrent();for(const ref of bound.values()){const raw=actual.read(ref.path);assert.equal(hash(raw),ref.sha256,'late table owner input '+ref.path);assert.equal(raw.length,ref.bytes);assert.ok(raw.equals(readEvidenceMember(root,ref.path)));}for(const ref of bound.values()){const raw=readEvidenceMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'final physical table owner input '+ref.path);assert.equal(raw.length,ref.bytes);}};
 const lane=planOf(actual),repairPlan=planOf(repairs);
 let assertCurrent=originalAssertCurrent,guardNode,guardPlan;
 // An empty lane has no registered scope. Any nonempty opaque lane retains
 // the complete original operation rather than pretending it has a node.
 if((actual.registered_frames===0||lane.node)&&repairPlan.node){
  const frameNode=data(frames,'guardNode'),frameGuard=data(frames,'assertCurrent'),sourceRead=data(actual,'read');
  const physical=()=>{for(const ref of bound.values()){
   const raw=readEvidenceMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'physical table owner input '+ref.path);assert.equal(raw.length,ref.bytes);
  }};
  const metadata=()=>{lane.check();repairPlan.check();same(frames,'guardNode',frameNode);same(frames,'assertCurrent',frameGuard);same(actual,'read',sourceRead);};
  let consuming=false;
  const idle=()=>assert.equal(consuming,false,'reentrant table owner source consumption');
  guardNode=Object.freeze({
   dependencies:Object.freeze([...(lane.node?[lane.node]:[]),frameNode.value,repairPlan.node]),
   preflight:()=>{idle();metadata();physical();},
   consume:()=>{
    idle();consuming=true;
    try{for(const ref of bound.values()){
     const before=readEvidenceMember(root,ref.path);assert.equal(hash(before),ref.sha256,'late table owner input '+ref.path);assert.equal(before.length,ref.bytes);
     const raw=sourceRead.value(ref.path);assert.ok(equal(before,raw),'nonphysical table owner source input '+ref.path);
     assert.ok(equal(before,readEvidenceMember(root,ref.path)),'table owner input changed during callback '+ref.path);
    }}finally{consuming=false;}
   },
   final:()=>{physical();metadata();},
  });
  const composed=composeCanonicalSourceGuards(Object.freeze([guardNode]));
  assertCurrent=()=>{idle();composed();};
  guardPlan=Object.freeze({assertCurrent,node:guardNode});
 }
 const retainsReferences=(refs,node)=>{
  if(node!==guardNode||!guardPlan||!Array.isArray(refs)||types.isProxy(refs))return false;
  for(let index=0;index<refs.length;index++){
   const item=Object.getOwnPropertyDescriptor(refs,String(index));
   if(!item||!Object.hasOwn(item,'value'))return false;
   const ref=item.value;
   if(!ref||typeof ref!=='object'||types.isProxy(ref))return false;
   const fields=['path','sha256','bytes'].map(key=>Object.getOwnPropertyDescriptor(ref,key));
   if(fields.some(field=>!field||!Object.hasOwn(field,'value')))return false;
   const [path,sha256,bytes]=fields.map(field=>field.value),actual=bound.get(path);
   if(!actual||actual.path!==path||actual.sha256!==sha256||actual.bytes!==bytes)return false;
  }
  return true;
 };
 assertCurrent();return {packet:structuredClone(packet),bound:structuredClone([...bound.values()]),ownsReference,predecessorReference,qualifyReference,comparisonBytes,predecessorData,registryComparisonBytes:()=>Buffer.from(registrySubject().raw),assertCurrent,...(guardPlan?{guardNode,guardPlan,legacyStaticReferences,retainsReferences}:{}),old_program_executed:false,canonical_frame_admission_granted:false,current_native_or_full_audit_credit:false};
}
