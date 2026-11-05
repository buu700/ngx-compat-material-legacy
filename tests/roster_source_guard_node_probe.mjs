/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual current roster subject and registered epoch route; candidate must be applied first. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const root=process.cwd();
const INPUTS='compatibility/rc/current-roster-source-epoch-inputs.json';
const PLANNER='scripts/canonical-source-guard-plan.mjs';
const SELF='scripts/current-authored-roster-source.mjs';
const ROSTERS=['compatibility/f10/authored-dependency-dispositions.json',
 'compatibility/f10/authored-dependency-current-dispositions.json'];
const drift=Buffer.from('\n// current roster guard callback drift\n');
import {currentAuthoredRosterSourceSubject,currentAuthoredRosterRawRead} from '../scripts/current-authored-roster-source.mjs';
import {composeCanonicalSourceGuards} from '../scripts/canonical-source-guard-plan.mjs';
import {readHistoricalContractRepairOwnerMember} from '../scripts/historical-contract-repair-readers.mjs';
const group=process.argv[2];assert.ok(['constructor','guard','late'].includes(group));
const disk=path=>readHistoricalContractRepairOwnerMember(root,path);
const digest=raw=>createHash('sha256').update(raw).digest('hex');
const original=disk(INPUTS);
let calls=0,onRead=()=>{},override=null;
const read=path=>{
 const bytes=disk(path);calls++;
 onRead(path,bytes);
 return override?override(path,bytes):bytes;
};
const reset=()=>{calls=0;onRead=()=>{};override=null;};
const restoreBytes=()=>{
 const now=disk(INPUTS);
 assert.ok(now.equals(original)||now.equals(Buffer.concat([original,drift])),'foreign roster input bytes preserved');
 if(!now.equals(original))writeFileSync(join(root,INPUTS),original);
};
const restoreTarget=()=>{try{restoreBytes();}finally{reset();}};
let rejected=0;
const reject=(fn,match=()=>true)=>{assert.throws(fn,error=>error?.code==='ERR_ASSERTION'&&match(error));rejected++;};
const makeSubject=()=>currentAuthoredRosterSourceSubject({root,read});

if(group==='constructor'){
 const counts=new Map();onRead=path=>counts.set(path,(counts.get(path)??0)+1);
 const roster=makeSubject();reset();
 assert.ok(['21.x','main'].includes(roster.line));
 assert.deepEqual(roster.historical_metadata_paths,ROSTERS);
 assert.equal(currentAuthoredRosterRawRead({root,read:roster.metadataRead}),read);
 assert.throws(()=>currentAuthoredRosterRawRead({root:resolve(root,'..'),read:roster.metadataRead}));
 const spoof=path=>roster.metadataRead(path);Object.assign(spoof,{root,raw:read,metadataRead:roster.metadataRead});
 assert.equal(currentAuthoredRosterRawRead({root,read:spoof}),spoof,'shape spoof received private WeakMap registration');
 for(let index=0;index<ROSTERS.length;index++){
  const path=ROSTERS[index],before=roster.before[index],after=roster.after[index];
  assert.equal(before.path,path);assert.equal(after.path,path);
  assert.equal(digest(roster.metadataRead(path)),before.sha256);assert.equal(roster.metadataRead(path).length,before.bytes);
  assert.equal(digest(disk(path)),after.sha256);assert.equal(disk(path).length,after.bytes);
  assert.deepEqual(roster.historicalReference(after),before);
  assert.deepEqual(roster.qualify(before),after);
 }
 for(const path of [SELF,INPUTS,PLANNER]){
  const current=disk(path);assert.ok(roster.raw(path).equals(current));assert.ok(roster.metadataRead(path).equals(current));
 }
 // A second actual constructor member callback must remain fresh, rather
 // than a later assertCurrent callback merely appearing to prove this.
 const repeated=JSON.parse(disk(INPUTS)).current_evidence[0].path;
 let memberReads=0,callbacksAtFault=0;
 override=(path,bytes)=>{
  if(path===repeated&&new Error().stack.includes('at member (')&&++memberReads===2){callbacksAtFault=calls;return Buffer.concat([bytes,drift]);}
  return bytes;
 };
 reject(()=>makeSubject(),error=>error.message.includes(repeated)&&error.message.includes('nonphysical current roster input'));
 assert.equal(memberReads,2);assert.equal(calls,callbacksAtFault,'a later constructor callback ran after repeated-member rejection');
 reset();
 for(const returned of ['old','new']){
  let reached=false,later=0;
  onRead=path=>{if(reached){later++;return;}if(path===INPUTS){reached=true;writeFileSync(join(root,INPUTS),Buffer.concat([original,drift]));}};
  override=(path,bytes)=>path===INPUTS&&returned==='new'?disk(INPUTS):bytes;
  try{reject(makeSubject,error=>error.message.includes(INPUTS)&&/nonphysical|changed during callback/.test(error.message));assert.equal(reached,true);assert.equal(later,0);}
  finally{restoreTarget();}
 }
 assert.ok(disk(INPUTS).equals(original));
 console.log(JSON.stringify({result:'pass',group,line:roster.line,actual_roster_subject:true,
  private_WeakMap_unwrap_and_foreign_root_rejection:true,spoof_reader_rejected:true,
  exact_historical_roster_before_images:2,current_program_passthrough:true,
  repeated_member_second_callback_rejected:true,rejected_faults:rejected,
  product_or_program_before_images_exposed:false,current_source_read_uses_historical_projection:false,
  actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'}));
}else if(group==='guard'){
 const roster=makeSubject();reset();
 assert.ok(Object.isFrozen(roster.guardNode)&&Object.isFrozen(roster.guardPlan));
 assert.equal(roster.guardPlan.node,roster.guardNode);assert.equal(roster.guardPlan.assertCurrent,roster.assertCurrent);
 const target=roster.bound.find(ref=>ref.path===INPUTS);assert.ok(target);
 writeFileSync(join(root,INPUTS),Buffer.concat([original,drift]));let coldCallbacks=0;
 onRead=()=>{coldCallbacks++;restoreBytes();};
 try{
  reject(roster.assertCurrent,error=>error.message.includes(INPUTS)&&/physical current roster input/.test(error.message));
  assert.equal(coldCallbacks,0,'cold drift was restored by a reader callback');
 }finally{restoreTarget();}
 roster.assertCurrent();reset();

 for(const forged of [bytes=>Buffer.concat([bytes,drift]),()=>({not:'a Buffer'})]){
  let reached=false,later=0,callbacksAtTarget=0;
  override=(path,bytes)=>{
   if(path===INPUTS){reached=true;callbacksAtTarget=calls;return forged(bytes);}
   if(reached)later++;
   return bytes;
  };
  reject(roster.assertCurrent,error=>error.message.includes(INPUTS)&&/nonphysical or late current roster input/.test(error.message));
  assert.equal(reached,true);assert.equal(later,0);assert.equal(calls,callbacksAtTarget);
  reset();roster.assertCurrent();reset();
 }

 for(const returned of ['old','new']){
  let changed=false,later=0,callbacksAtTarget=0;
  onRead=path=>{
   if(changed){later++;return;}
   if(path===INPUTS){changed=true;writeFileSync(join(root,INPUTS),Buffer.concat([original,drift]));}
  };
  override=(path,bytes)=>{
   if(path!==INPUTS)return bytes;
   callbacksAtTarget=calls;return returned==='old'?bytes:disk(INPUTS);
  };
  try{
   reject(roster.assertCurrent,error=>error.message.includes(INPUTS)&&/nonphysical or late current roster input|changed during callback/.test(error.message));
   assert.equal(changed,true);assert.equal(later,0);assert.equal(calls,callbacksAtTarget);
  }finally{restoreTarget();}
  roster.assertCurrent();reset();
 }

 const alternate=composeCanonicalSourceGuards(Object.freeze([roster.guardNode]));
 for(const nested of [roster.assertCurrent,alternate]){
  let entered=false,nestedError=null,callbacksInside=null;
  onRead=path=>{
   if(path!==PLANNER||entered)return;
   entered=true;const before=calls;
   try{nested();}catch(error){nestedError=error;}
   callbacksInside=calls-before;
  };
  roster.assertCurrent();assert.equal(entered,true);assert.match(nestedError?.message??'',/reentrant/);assert.equal(callbacksInside,0);
  reset();roster.assertCurrent();reset();
 }

 const sentinel=new Error('roster supplied reader sentinel');let thrownAt=null;
 onRead=path=>{if(!thrownAt){thrownAt=path;throw sentinel;}};
 assert.throws(roster.assertCurrent,error=>error===sentinel);assert.ok(thrownAt);
 reset();roster.assertCurrent();reset();
 assert.ok(disk(INPUTS).equals(original));
 console.log(JSON.stringify({result:'pass',group,line:roster.line,actual_roster_guard_node:true,
  cold_restored_by_first_callback_rejected:true,forged_and_nonBuffer_callbacks_rejected:2,
  old_new_same_callback_physical_mutations_rejected:2,
  direct_and_alternate_whole_plan_reentry_controls:2,provided_exception_recovery:true,
  rejected_faults:rejected,restoration_passed:true,product_or_program_before_images_exposed:false,
  current_source_read_uses_historical_projection:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,
  g11_claim:'not-passed'}));
}
else if(group==='late'){
 const roster=makeSubject();reset();
 // Two separately constructed actual subjects provide distinct actual nodes.
 // The second node's last supplied callback changes an already consumed first
 // node input; the first node's real final predicate must reject it.
 const laterSubject=makeSubject();reset();
 assert.notEqual(laterSubject.guardNode,roster.guardNode);
 const lastPath=roster.bound.at(-1).path;assert.notEqual(lastPath,INPUTS);
 let lastCallbacks=0,changedByLaterNode=false;
 onRead=path=>{
  if(path===lastPath&&++lastCallbacks===2){
   changedByLaterNode=true;writeFileSync(join(root,INPUTS),Buffer.concat([original,drift]));
  }
 };
 const twoActualNodes=composeCanonicalSourceGuards(Object.freeze([roster.guardNode,laterSubject.guardNode]));
 try{
  reject(twoActualNodes,error=>error.message.includes(INPUTS)&&/physical current roster input/.test(error.message));
  assert.equal(changedByLaterNode,true);assert.equal(lastCallbacks,2);
 }finally{restoreTarget();}
 roster.assertCurrent();laterSubject.assertCurrent();reset();

 assert.ok(disk(INPUTS).equals(original));
 console.log(JSON.stringify({result:'pass',group,line:roster.line,actual_roster_guard_node:true,
  distinct_later_actual_node_callback_reached_first_node_final:true,
  rejected_faults:rejected,restoration_passed:true,
  actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'}));
}
