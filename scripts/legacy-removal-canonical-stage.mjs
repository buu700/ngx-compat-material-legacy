/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exactly one source decision and two derived scalars; actual owner admission is separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
import admission from './upstream-legacy-removal-admission.cjs';
import {legacyRemovalOwnerSourceSubject} from './legacy-removal-owner-source.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {readHistoricalContractRepairOwnerMember} from './historical-contract-repair-readers.mjs';
import {composeCanonicalSourceGuards} from './canonical-source-guard-plan.mjs';
import {types} from 'node:util';
export const LEGACY_REMOVAL_LEDGER='compatibility/f10/disposition-ledger/ledger.json';
export const LEGACY_REMOVAL_LEDGER_BEFORE='f0aa2808e6bf022e9901b6edc249e1b08e7be9b7af06af4f154131e4a54c9cee';
export const LEGACY_REMOVAL_REGISTRY='scripts/upstream-source-contract-registry.mjs';
export const LEGACY_REMOVAL_REGISTRY_BEFORE='03a18cd09e4183f4307f1ec2c17d0797eea72db0440e23530e4d015ea0dae6a8';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const bufferEquals=Buffer.prototype.equals,apply=Reflect.apply,functionToString=Function.prototype.toString;
const equal=(a,b)=>Buffer.isBuffer(b)&&apply(bufferEquals,a,[b]);
function own(object,key,optional=false){
 assert.ok(object&&typeof object==='object'&&!types.isProxy(object),'invalid legacy guard object');
 const d=Object.getOwnPropertyDescriptor(object,key);
 if(optional&&!d)return undefined;
 assert.ok(d&&Object.hasOwn(d,'value'),'non-data legacy guard '+key);return d;
}
function same(object,key,before){
 const now=own(object,key,before===undefined);
 if(before===undefined){assert.equal(now,undefined,'added legacy guard '+key);return;}
 for(const flag of ['value','enumerable','writable','configurable'])assert.equal(now[flag],before[flag],'changed legacy guard '+key);
}
const loadedInspector=own(admission,'inspectCanonicalSource').value;
function assertInspector(){
 assert.equal(own(admission,'inspectCanonicalSource').value,loadedInspector,'changed legacy canonical source inspector');
 assert.equal(hash(functionToString.call(loadedInspector)),'619ce1daf34bc76fa9e610af6e28496957094b4ff4c5d14eb492664405cd67ca','unauthenticated legacy source inspector');
}
// A missing, malformed or initially mismatched tuple leaves the entire
// operation original. The captured successful tuple cannot later change.
function completeTools(subject){
 const guard=own(subject,'assertCurrent'),plan=own(subject,'guardPlan',true);
 if(!plan)return null;
 const tuple=plan.value;
 if(!tuple||typeof tuple!=='object'||types.isProxy(tuple)||!Object.isFrozen(tuple)||
    Reflect.ownKeys(tuple).sort().join(',')!=='assertCurrent,node')return null;
 const tg=Object.getOwnPropertyDescriptor(tuple,'assertCurrent'),tn=Object.getOwnPropertyDescriptor(tuple,'node');
 if(!tg||!tn||!Object.hasOwn(tg,'value')||!Object.hasOwn(tn,'value')||tg.value!==guard.value||!tn.value)return null;
 return {node:tn.value,check:()=>{same(subject,'assertCurrent',guard);same(subject,'guardPlan',plan);same(tuple,'assertCurrent',tg);same(tuple,'node',tn);assert.ok(Object.isFrozen(tuple));}};
}
export function legacyRemovalRegistrySuccessor(before){
 assert.ok(Buffer.isBuffer(before));assert.equal(hash(before),LEGACY_REMOVAL_REGISTRY_BEFORE);
 const text=before.toString(),marker='];\n';assert.equal(text.split(marker).length,2);
 const record=`  {sha:'${admission.LEGACY_REMOVAL_SHA}',proof_kind:'${admission.LEGACY_REMOVAL_PROOF_KIND}',\n    scope_key:'${admission.LEGACY_REMOVAL_SCOPE_KEY}',module:'upstream-legacy-removal-admission.cjs'},\n`;
 assert.ok(!text.includes(admission.LEGACY_REMOVAL_SHA));return Buffer.from(text.replace(marker,record+marker));
}
export function applyLegacyRemovalCanonicalStage({before,body}={}){
 assert.ok(Buffer.isBuffer(before));assert.equal(hash(before),LEGACY_REMOVAL_LEDGER_BEFORE,'unqualified legacy removal ledger before-image');
 const data=JSON.parse(before),expected=structuredClone(data),sha=admission.LEGACY_REMOVAL_SHA;
 assert.equal(data.entries.length,1697);assert.equal(new Set(data.entries.map(row=>row.sha)).size,1697);
 assert.equal(data.closed_dispositions,424);assert.equal(data.open_or_deferred,1273);
 const index=data.entries.findIndex(row=>row.sha===sha);assert.ok(index>=0);const prior=data.entries[index];
 assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
 const entry={...prior,final_disposition:'not-applicable',reason:body.decision,read_note_disposition:'owned-retained',review_depth:'individual-compatibility',evidence_report:admission.LEGACY_REMOVAL_REVIEW,individual_proof:admission.legacyRemovalProof(body)};
 assert.equal(admission.metadataOk({entry,body,review:body,proof:entry.individual_proof}),true);
 expected.entries[index]=entry;expected.closed_dispositions=425;expected.open_or_deferred=1272;
 const text=replaceHistoricalConsumerEntries(before,[{sha,after_entry:entry}]).toString(),split=text.indexOf('"entries": [');assert.ok(split>=0);
 let header=text.slice(0,split);
 for(const[key,from,to]of [['closed_dispositions',424,425],['open_or_deferred',1273,1272]]){
  const old='  "'+key+'": '+from+',',next='  "'+key+'": '+to+',';assert.equal(header.split(old).length,2);header=header.replace(old,next);
 }
 const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
 assert.deepEqual(expected.entries.filter(row=>row.sha!==sha),data.entries.filter(row=>row.sha!==sha));
 assert.deepEqual(expected.entries.filter(row=>row.final_disposition==='security-review'),data.entries.filter(row=>row.final_disposition==='security-review'));
 assert.equal(expected.entries.filter(row=>row.final_disposition==='security-review').length,1);
 return {before:Buffer.from(before),after,entries:[structuredClone(entry)],individual_decisions:1,summary_scalar_tokens:2,unselected_entries_preserved:1696,canonical_admission_granted:false,current_native_packed_browser_floor_or_full_audit_qualified:false};
}

/** Real terminal source stage; prior complete-frame gates still own admission. */
export function legacyRemovalOwnerContext({root,read=path=>readFileSync(join(root,path)),composeSourceGuards=false}={}){
 assert.equal(typeof composeSourceGuards,'boolean');
 const checkInspector=assertInspector;
 if(composeSourceGuards)checkInspector();
 const tools=legacyRemovalOwnerSourceSubject({root,read}),packet=tools.packet;
 const dependency=composeSourceGuards?completeTools(tools):null;
 const bound=new Map(tools.bound.map(ref=>[ref.path,{...ref}]));
 const member=ref=>{const raw=read(ref.path);assert.ok(Buffer.isBuffer(raw));assert.equal(hash(raw),ref.sha256,'changed legacy owner input '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;};
 const proposal=JSON.parse(member(packet.proposal)),body=JSON.parse(member(proposal.review));
 const before=gunzipSync(member(packet.ledger_before_image)),registryBefore=gunzipSync(member(packet.registry_before_image));
 const stage=applyLegacyRemovalCanonicalStage({before,body}),registryAfter=legacyRemovalRegistrySuccessor(registryBefore);
 assert.equal(hash(stage.before),proposal.before.sha256);assert.equal(hash(stage.after),proposal.after.sha256);assert.equal(hash(registryAfter),proposal.registry_after.sha256);
 assert.ok(gunzipSync(member(packet.ledger_after_image)).equals(stage.after));assert.ok(gunzipSync(member(packet.registry_after_image)).equals(registryAfter));
 const actualLedger=read(LEGACY_REMOVAL_LEDGER),actualRegistry=read(LEGACY_REMOVAL_REGISTRY);
 assert.ok(actualRegistry.equals(readEvidenceMember(root,LEGACY_REMOVAL_REGISTRY)),'nonphysical legacy source registry');
 const comparisonRegistry=tools.predecessorData(LEGACY_REMOVAL_REGISTRY,actualRegistry);
 assert.ok(comparisonRegistry.equals(registryBefore)||comparisonRegistry.equals(registryAfter),'unqualified legacy source registry');
 const applied=actualLedger.equals(stage.after),registryApplied=comparisonRegistry.equals(registryAfter);if(applied)assert.ok(registryApplied,'legacy ledger successor requires its exact source registry successor');
 for(const[path,raw]of [[LEGACY_REMOVAL_LEDGER,actualLedger],[LEGACY_REMOVAL_REGISTRY,actualRegistry]])bound.set(path,{path,sha256:hash(raw),bytes:raw.length});
 // The default and a missing complete dependency use the entire original
 // construction and guard, including its original supplied reader.
 let phase='consume',sourceActive=false,stageActive=false;
 const idle=()=>{assert.equal(sourceActive,false,'reentrant legacy admission source');assert.equal(stageActive,false,'reentrant legacy canonical stage');};
 const checkedSourceRead=path=>{
  assert.ok(phase==='consume'||phase==='physical','invalid legacy source phase');
  const physical=readHistoricalContractRepairOwnerMember(root,path);
  if(phase==='physical')return physical;
  const supplied=read(path);assert.ok(equal(physical,supplied),'nonphysical legacy admission source '+path);
  assert.ok(equal(physical,readHistoricalContractRepairOwnerMember(root,path)),'legacy admission changed during callback '+path);
  return physical;
 };
 if(dependency){dependency.check();checkInspector();}
 const source=dependency?loadedInspector({root,read:checkedSourceRead,entries:stage.entries,body}):admission.inspectCanonicalSource({root,read,entries:stage.entries,body});
 const sourceGuard=dependency?own(source,'assertCurrent'):null;
 for(const incoming of source.bound){
  const ref={...incoming};
  if(ref.bytes===undefined){
   if(dependency){const physical=readHistoricalContractRepairOwnerMember(root,ref.path);assert.equal(hash(physical),ref.sha256,'unqualified legacy source physical '+ref.path);ref.bytes=physical.length;}
   else ref.bytes=read(ref.path).length;
  }
  if(dependency){const prior=bound.get(ref.path);if(prior){assert.equal(prior.sha256,ref.sha256,'conflicting legacy source reference '+ref.path);assert.equal(prior.bytes,ref.bytes,'conflicting legacy source size '+ref.path);}}
  bound.set(ref.path,ref);
 }
 const originalAssertCurrent=()=>{tools.assertCurrent();source.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late legacy canonical input '+ref.path);assert.equal(raw.length,ref.bytes);}};
 let assertCurrent=originalAssertCurrent,guardNode,guardPlan;
 if(dependency){
  const physicalLedger=tools.bound.find(ref=>ref.path===LEGACY_REMOVAL_LEDGER);assert.ok(physicalLedger,'missing authenticated legacy physical ledger');
  const physicalBound=[...bound.values()].map(ref=>({...ref,...(ref.path===LEGACY_REMOVAL_LEDGER?physicalLedger:{})}));
  const physicalByPath=new Map(physicalBound.map(ref=>[ref.path,ref]));
  const metadata=()=>{checkInspector();dependency.check();same(source,'assertCurrent',sourceGuard);};
  const sweep=()=>{for(const ref of physicalBound){const raw=readHistoricalContractRepairOwnerMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'physical legacy canonical input '+ref.path);assert.equal(raw.length,ref.bytes);}};
  const executeSource=next=>{
   idle();assert.equal(phase,'consume','changed legacy source phase');sourceActive=true;
   try{phase=next;metadata();assert.equal(apply(sourceGuard.value,undefined,[]),undefined,'legacy source guard returned a value');metadata();}
   finally{phase='consume';sourceActive=false;}
  };
  const sourceNode=Object.freeze({dependencies:Object.freeze([]),
   preflight:()=>{executeSource('physical');},
   consume:()=>{executeSource('consume');},
   final:()=>{executeSource('physical');},
  });
  guardNode=Object.freeze({dependencies:Object.freeze([dependency.node,sourceNode]),
   preflight:()=>{idle();metadata();sweep();},
   consume:()=>{idle();stageActive=true;try{for(const ref of bound.values()){
    const physicalRef=physicalByPath.get(ref.path);assert.ok(physicalRef);
    const beforePhysical=readHistoricalContractRepairOwnerMember(root,ref.path);
    assert.equal(hash(beforePhysical),physicalRef.sha256,'late physical legacy canonical input '+ref.path);assert.equal(beforePhysical.length,physicalRef.bytes);
    const supplied=read(ref.path);assert.ok(Buffer.isBuffer(supplied));assert.equal(hash(supplied),ref.sha256,'late legacy canonical input '+ref.path);assert.equal(supplied.length,ref.bytes);
    if(ref.path!==LEGACY_REMOVAL_LEDGER)assert.ok(equal(beforePhysical,supplied),'nonphysical legacy canonical input '+ref.path);
    assert.ok(equal(beforePhysical,readHistoricalContractRepairOwnerMember(root,ref.path)),'legacy canonical input changed during callback '+ref.path);
   }}finally{stageActive=false;}},
   final:()=>{idle();sweep();metadata();},
  });
  const composed=composeCanonicalSourceGuards(Object.freeze([guardNode]));
  assertCurrent=()=>{idle();composed();};guardPlan=Object.freeze({assertCurrent,node:guardNode});
 }
 // This private metadata view only maps the two independently derived exact
 // successors. The old actual compiled functions still reject unknown frames.
 const metadataRead=path=>{
  if(path===LEGACY_REMOVAL_LEDGER){const raw=read(path);assert.ok(raw.equals(actualLedger),'late legacy ledger');return applied?Buffer.from(before):raw;}
  return read(path);
 };
 const wrapPrepared=prior=>{
  assertCurrent();assert.ok(prior.canonical_after.equals(before),'legacy stage does not succeed the complete browser metadata after-image');
  const currentBound=new Map(prior.bound);for(const ref of bound.values())currentBound.set(ref.path,ref.sha256);
  const assertPrior=()=>{assertCurrent();prior.assertCurrent?.();prior.prior_metadata_assert_current?.();assertCurrent();};
  const native=prior.native_spec_source,nativeBound=native.bound.map(ref=>({...ref,sha256:currentBound.get(ref.path)??ref.sha256,bytes:read(ref.path).length}));
  assertPrior();return {...prior,canonical_after:Buffer.from(stage.after),bound:currentBound,
   legacy_removal_stage:{...stage,assertCurrent:assertPrior,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
   native_spec_source:{...native,bound:nativeBound,assertCurrent:()=>{assertCurrent();native.assertCurrent();assertCurrent();}},
   assertCurrent:assertPrior,prior_metadata_assert_current:assertPrior};
 };
 assertCurrent();return {applied,registryApplied,before:Buffer.from(before),after:Buffer.from(stage.after),registryBefore:Buffer.from(registryBefore),registryAfter:Buffer.from(registryAfter),metadataRead,wrapPrepared,bound:structuredClone([...bound.values()]),assertCurrent,...(guardPlan?{guardNode,guardPlan}:{}),source_facts:structuredClone(source.facts),source_scope_only:true,current_native_packed_browser_floor_or_full_audit_qualified:false};
}
