/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Five finite source decisions; no native, packed, floor or full Sass credit. */
'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {join,resolve}=require('node:path');
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-button-tokenization-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-button-tokenization-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='d0ee311891176b215a62b856ade76c77713a4bc9355ec32c0d2cf381af76c160';
const QUALIFICATION={path:PREFIX+'source-qualification.json',sha256:'e2b342e2169aadd31b0cc722f4591028fab6f2aec486ba13d34084115ad42521',bytes:4062};
const SOURCE_REVIEW={path:PREFIX+'source-review.json',sha256:'4fa19472ae965a5fbc097b51ab60f344acd7791909d97221a954a25f89e9463a',bytes:870169};
const PATCHES={"48a988a448200c9ad4a0099e7879b9eff3da0a41":"fc902b3df4880b7ce3e889b964d3c03227e272649d07abb7495eed059848aabe","f2b4a04d5b6d91e2af81610fb5c95945759ad390":"f740abe765835606847e8e9f32023790c1b28a8d356ef11b2699489af727a26a","823c40192915f805132272e15a27230b621c1b77":"fbb8ba4f94fe0101c7cdc80ce54b3beaf33fc34d73f9651076a87d6fdc7d9f99","5c822977dbe77b7db92233a877e26ae7c1bdeaad":"4c8c00cf669c5e9d0c80ef2108bda29b1b075f2ed31182ba0ac877eed35973d5","592307261faf09f9603310a9fb97d1d18bc40f6e":"6fd643b7b34c41a3181c7f1bdc12d9e85d4faf2de5f41cf8f70fae1afe801f9c"};
const KIND='individual-historical-button-tokenization-source-review',SCOPE='button_tokenization_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
const handlerRef={path:HANDLER,sha256:hash(image),bytes:image.length};

function buttonTokenizationProof(row){
 assert.ok(Object.hasOwn(PATCHES,row?.sha));
 return {proof_kind:KIND,diff_sha256:PATCHES[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},
   handler:{...handlerRef},bounded_sass_compiler_cases:14,full_sass_gate_executed:false,source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}

/** Pure metadata comparison; no file reads, process execution or source cache. */
function metadataOk({entry,body,review,proof=entry?.individual_proof}){
 try{
  assert.equal(hash(JSON.stringify(body,null,2)+'\n'),REVIEW_HASH);
  assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,5);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(PATCHES));
  assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,18);assert.equal(body.original_hunks,47);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);
  assert.equal(body.fresh_bounded_sass_compiler_execution,true);assert.equal(body.tagged_reference_sass_executed,true);assert.equal(body.upstream_post16_sass_or_typescript_tests_or_workflows_executed,false);assert.equal(body.package_install_or_javascript_runtime_execution,false);assert.equal(body.full_sass_gate_executed,false);assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.ok(Object.hasOwn(PATCHES,entry.sha));
  const row=body.reviews.find(value=>value.sha===entry.sha);assert.deepEqual(review,row);
  assert.equal(row.status,'reviewed');assert.equal(row.source_review_complete,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.reason,row.decision);assert.ok(row.decision.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);
  assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,PATCHES[entry.sha]);
  assert.deepEqual(proof,buttonTokenizationProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}

/** Recompute all original/current source facts on every invocation. */
function inspectSource({entry,body,review,proof,root=ROOT,read=path=>readFileSync(join(root,path))}){
  // Source inspection imports the current ledger owner through its candidate
  // inventory helper; defer it until the owner has finished initializing.
  const source=require('./upstream-button-tokenization-source-review.mjs');
  assert.equal(resolve(root),ROOT);assert.equal(metadataOk({entry,body,review,proof}),true);
  const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,handlerRef,
   ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
  const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed button tokenization admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
  assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
  const current=source.reviewButtonTokenizationSource({root,read});
  assert.deepEqual(current.report,JSON.parse(read(SOURCE_REVIEW.path)));
  current.assertCurrent();assertBound();return true;
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={BUTTON_TOKENIZATION_REVIEW:REVIEW,BUTTON_TOKENIZATION_REVIEW_HASH:REVIEW_HASH,BUTTON_TOKENIZATION_SHAS:Object.freeze(Object.keys(PATCHES)),
 BUTTON_TOKENIZATION_PROOF_KIND:KIND,BUTTON_TOKENIZATION_SCOPE_KEY:SCOPE,buttonTokenizationProof,metadataOk,sourceOk,inspectSource};
