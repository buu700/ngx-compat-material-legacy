/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One complete original legacy-removal source exclusion; no runtime acceptance. */
'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {join,resolve}=require('node:path');
const {types}=require('node:util');
const {composeCanonicalSourceGuards}=require('./canonical-source-guard-plan.mjs');
const {readHistoricalContractRepairOwnerMember}=require('./historical-contract-repair-readers.mjs');
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-legacy-removal-admission.cjs';
const SHA='f7e3ae3bd1b86d5987df57bb06d350001c592931';
const REVIEW="compatibility/rc/21x-legacy-removal-admission-individual-review.json",REVIEW_HASH="0463edeb805c14023d197271aa290536f0d23d1fbed3f1f31948668506b2e4b1",DIFF="d1477575b2278fe7848fbc158df11dfcc142698ec496a34c0c340f6e3b37826c";
const QUALIFICATION={"path":"compatibility/rc/21x-legacy-removal-source-qualification.json","sha256":"94072e0defad3ef1359882397251634de228a2f67e128e44512cc5efe022e2e1","bytes":7229},SOURCE_REVIEW={"path":"compatibility/rc/21x-legacy-removal-source-review.json","sha256":"9193f477e02e8f5e3444c962f6ceaf372080582e7d485c3a9950058d7827fa65","bytes":542133},BOUNDARY={"path":"compatibility/rc/21x-legacy-removal-source-boundary-reviewed.json","sha256":"ded2ca527aab48999037dd9fb3728d71b46031721663d8c530fc0f280d33e68e","bytes":315786},VERIFIER={"path":"scripts/upstream-legacy-removal-source.mjs","sha256":"c1570fbdae80e1e4ef1cf9da8120c948c003d9ee5fcf0d804b109e3e45fac38d","bytes":28313},SUCCESSOR={"path":"compatibility/rc/21x-legacy-removal-admission-source-successor.json","sha256":"d0d8210968ead5eec6ec8a7e9952f7f770422f6e383230c312360d3f8d2ab523","bytes":1877};
const KIND='individual-historical-legacy-removal-source-exclusion',SCOPE='legacy_removal_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename),handlerRef={path:HANDLER,sha256:hash(image),bytes:image.length};
const {historicalContractRepairReaderSubject}=require('./historical-contract-repair-readers.mjs');
// The immutable review records its original checker; actual code is bound below.
const originalHandlerRef={"path":"scripts/upstream-legacy-removal-admission.cjs","sha256":"d9b41716669129ee6c9754ecbb3d5fbf75083ca067aaa65b0e4a1fc3ff65137a","bytes":6358};
function legacyRemovalProof(row){
 assert.equal(row?.sha,SHA);
 return {proof_kind:KIND,diff_sha256:DIFF,review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:SHA,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},source_boundary:{...BOUNDARY},source_verifier:{...VERIFIER},source_successor:{...SUCCESSOR},handler:{...originalHandlerRef},complete_original_files:746,original_text_hunks:797,individual_nondeletion_hunks:97,deleted_paths_complete_membership:702,source_scope_only:true,actual_native_packed_browser_floor_or_full_audit_qualified:false}};
}
/** Pure complete metadata comparison; never reads files or a source result. */
function metadataOk({entry,body,review,proof=entry?.individual_proof}){
 try{
  assert.equal(hash(JSON.stringify(body,null,2)+'\n'),REVIEW_HASH);assert.deepEqual(body,review);
  assert.equal(body.line,'21.x');assert.equal(body.sha,SHA);assert.equal(body.status,'reviewed');assert.equal(body.source_review_complete,true);
  assert.equal(body.proposed_final_disposition,'not-applicable');assert.equal(body.source_scope_only,true);assert.equal(body.g11_claim,'not-passed');assert.equal(body.actual_native_packed_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.original_file_occurrences,746);assert.equal(body.original_hunks,797);assert.equal(body.individual_modification_hunks,97);assert.equal(body.complete_deleted_paths,702);
  assert.equal(body.complete_original_paths.length,746);assert.equal(new Set(body.complete_original_paths).size,746);assert.equal(body.diff_sha256,DIFF);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);assert.deepEqual(body.source_boundary,BOUNDARY);assert.deepEqual(body.current_source_verifier,VERIFIER);assert.deepEqual(body.current_source_successor,SUCCESSOR);
  assert.equal(entry.sha,SHA);assert.equal(entry.final_disposition,'not-applicable');assert.equal(entry.read_note_disposition,'owned-retained');assert.equal(entry.reason,body.decision);assert.ok(entry.reason.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);assert.deepEqual(entry.files,body.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  assert.deepEqual(proof,legacyRemovalProof(body));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}
const planner=composeCanonicalSourceGuards,functionToString=Function.prototype.toString,equals=Buffer.prototype.equals;
const PLANNER=Object.freeze({path:'scripts/canonical-source-guard-plan.mjs',sha256:'4f632a3fe97975804edf5b89c1cc5abadc002ef78fe16c3a40edbadde460fc9f',bytes:4609});
function assertPlanner(root){
 assert.equal(require('./canonical-source-guard-plan.mjs').composeCanonicalSourceGuards,planner);
 assert.equal(hash(Reflect.apply(functionToString,planner,[])),'fecc474c121931506ce1f0f97e176886957f1504da46e74a085a068910ff9947');
 const raw=readHistoricalContractRepairOwnerMember(root,PLANNER.path);assert.equal(hash(raw),PLANNER.sha256);assert.equal(raw.length,PLANNER.bytes);
}
function completeChild(subject){
 try{
  if(!subject||typeof subject!=='object'||types.isProxy(subject))return null;
  const ds=Object.getOwnPropertyDescriptors(subject),gd=ds.assertCurrent,pd=ds.guardPlan;
  if(!gd||!pd||!Object.hasOwn(gd,'value')||!Object.hasOwn(pd,'value'))return null;
  const plan=pd.value;if(!plan||typeof plan!=='object'||types.isProxy(plan)||!Object.isFrozen(plan)||Object.getPrototypeOf(plan)!==Object.prototype)return null;
  const dsPlan=Object.getOwnPropertyDescriptors(plan);
  if(Reflect.ownKeys(dsPlan).some(k=>typeof k!=='string')||Reflect.ownKeys(dsPlan).sort().join(',')!=='assertCurrent,node'||!Object.hasOwn(dsPlan.assertCurrent,'value')||!Object.hasOwn(dsPlan.node,'value')||dsPlan.assertCurrent.value!==gd.value||typeof gd.value!=='function'||types.isProxy(gd.value))return null;
  const node=dsPlan.node.value;if(!node||typeof node!=='object'||types.isProxy(node))return null;
  return {node,check:()=>{
   for(const [object,key,before] of [[subject,'assertCurrent',gd],[subject,'guardPlan',pd],[plan,'assertCurrent',dsPlan.assertCurrent],[plan,'node',dsPlan.node]]){const now=Object.getOwnPropertyDescriptor(object,key);assert.ok(now&&Object.hasOwn(now,'value'));for(const flag of ['value','enumerable','writable','configurable'])assert.equal(now[flag],before[flag],'changed legacy admission child '+key);}
   assert.ok(Object.isFrozen(plan));assert.deepEqual(Reflect.ownKeys(plan).sort(),['assertCurrent','node']);
  }};
 }catch{return null;}
}
/** Fresh object, hunk, API, Sass, test and complete current-source verification. */
function inspectSource({entry,body,review,proof,root=ROOT,read:suppliedRead=path=>readFileSync(join(root,path))}){
 assert.equal(resolve(root),ROOT);assert.equal(metadataOk({entry,body,review,proof}),true);assertPlanner(root);
 let active=false;const idle=()=>assert.equal(active,false,'reentrant legacy admission source');
 const read=path=>{idle();active=true;try{return suppliedRead(path);}finally{active=false;}};
 const tools=historicalContractRepairReaderSubject({root,read});
 const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,BOUNDARY,VERIFIER,SUCCESSOR,handlerRef,PLANNER,{path:body.patch_file,sha256:DIFF}].map(ref=>tools.qualify(ref)??{...ref});
 for(const ref of tools.bound)if(!bound.some(member=>member.path===ref.path))bound.push({...ref});
 const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed legacy removal admission source '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
 assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
 const verifierPath=require.resolve('./upstream-legacy-removal-source.mjs'),verifierModule=require(verifierPath),verifierDescriptor=Object.getOwnPropertyDescriptor(verifierModule,'inspectLegacyRemovalSourceReview');
 assert.ok(verifierDescriptor&&Object.hasOwn(verifierDescriptor,'value')&&typeof verifierDescriptor.value==='function','missing loaded legacy inspector');const verifier=verifierDescriptor.value;
 const assertVerifier=()=>{assert.equal(require.cache[verifierPath]?.exports,verifierModule,'changed loaded legacy inspector module');assert.deepEqual(Object.getOwnPropertyDescriptor(verifierModule,'inspectLegacyRemovalSourceReview'),verifierDescriptor,'changed loaded legacy inspector descriptor');assert.equal(hash(Reflect.apply(functionToString,verifier,[])),'e2a0142d9a77bc095c1b91c7a55500ffa219b7993d9fdfa9a88defd4a09dc844','changed loaded legacy inspector function');};
 assertVerifier();const source=verifier({root,read});assertVerifier();
 assert.deepEqual(source.review,JSON.parse(read(SOURCE_REVIEW.path)));assert.deepEqual(source.historical_comparison_report,JSON.parse(read(BOUNDARY.path)));
 const originalGuard=()=>{idle();assertVerifier();tools.assertCurrent();assertBound();source.assertCurrent();assertBound();assertVerifier();};
 const children=[tools,source].map(completeChild);let assertCurrent=originalGuard,guardNode,guardPlan;
 if(children.every(Boolean)){
  const metadata=()=>{idle();assertPlanner(root);assertVerifier();for(const child of children)child.check();assertVerifier();};
  const physical=()=>{for(const ref of bound){const raw=readHistoricalContractRepairOwnerMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'physical legacy admission input '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
  guardNode=Object.freeze({dependencies:Object.freeze(children.map(child=>child.node)),
   preflight:()=>{metadata();physical();},
   consume:()=>{metadata();for(const ref of bound){const before=readHistoricalContractRepairOwnerMember(root,ref.path);assert.equal(hash(before),ref.sha256);if(ref.bytes!==undefined)assert.equal(before.length,ref.bytes);const supplied=read(ref.path);assert.ok(Buffer.isBuffer(supplied)&&Reflect.apply(equals,before,[supplied]),'nonphysical legacy admission input '+ref.path);assert.ok(Reflect.apply(equals,before,[readHistoricalContractRepairOwnerMember(root,ref.path)]),'legacy admission input changed during callback '+ref.path);}metadata();},
   final:()=>{metadata();physical();metadata();}});
  let composed;try{composed=planner(Object.freeze([guardNode]));}catch{guardNode=undefined;}
  if(composed){assertCurrent=()=>{idle();composed();};guardPlan=Object.freeze({assertCurrent,node:guardNode});}
 }
 assertCurrent();return {bound:[...bound,...source.bound],assertCurrent,...(guardPlan?{guardNode,guardPlan}:{}),facts:source.facts};
}
function sourceOk(args){try{const source=inspectSource(args);source.assertCurrent();return true;}catch{return false;}}
function inspectCanonicalSource({entries,body,...args}){
 assert.deepEqual(entries.map(row=>row.sha),[SHA]);const source=inspectSource({...args,entry:entries[0],body,review:body,proof:entries[0].individual_proof});
 return {...source,individual_metadata_cases:1,fresh_whole_body_source_reviews:1,source_scope_only:true,current_native_packed_floor_or_G11_credit:false};
}
module.exports={LEGACY_REMOVAL_SHA:SHA,LEGACY_REMOVAL_REVIEW:REVIEW,LEGACY_REMOVAL_REVIEW_HASH:REVIEW_HASH,LEGACY_REMOVAL_PROOF_KIND:KIND,LEGACY_REMOVAL_SCOPE_KEY:SCOPE,legacyRemovalProof,metadataOk,sourceOk,inspectSource,inspectCanonicalSource};
