/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two finite source decisions; no native, packed, floor or full Sass credit. */
'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {join,resolve}=require('node:path');
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-selector-density-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-selector-density-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='ae07d2cf974c7b52b4644c868811fa47381ca76cc4d635d9eeafbf4d714375ae';
const QUALIFICATION={path:PREFIX+'source-qualification.json',sha256:'78665c894ecc8e77991c0515aa75bbb64a1a0d13536be29a6ef0eadc1c1373da',bytes:3627};
const SOURCE_REVIEW={path:PREFIX+'source-review.json',sha256:'a14eb5cd3a75a1a8ce6de86c6b8988f55112c33766813a259174a73b4d037df1',bytes:165835};
const PATCHES={"999029aa5a23e9577503775c1ea4513e5c3cb4f9":"249c9cc504ffdd33543602ea6736e3d064bb6bb7df3d994d4d41494455fadc5e","4395cdf55a4b08d76aecd2e0378f3079289ce9c0":"a46ce23442183185d6483e3747f9080c4d80b6251db87aa559126a8dbdd75c6b"};
const KIND='individual-historical-selector-density-source-review',SCOPE='selector_density_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
const handlerRef={path:HANDLER,sha256:hash(image),bytes:image.length};

function selectorDensityProof(row){
 assert.ok(Object.hasOwn(PATCHES,row?.sha));
 return {proof_kind:KIND,diff_sha256:PATCHES[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},
   handler:{...handlerRef},bounded_sass_compiler_cases:20,full_sass_gate_executed:false,source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}

/** Pure metadata comparison; no file reads, process execution or source cache. */
function metadataOk({entry,body,review,proof=entry?.individual_proof}){
 try{
  assert.equal(hash(JSON.stringify(body,null,2)+'\n'),REVIEW_HASH);
  assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,2);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(PATCHES));
  assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,4);assert.equal(body.original_hunks,5);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);
  assert.equal(body.fresh_bounded_sass_compiler_execution,true);assert.equal(body.tagged_reference_sass_executed,true);assert.equal(body.reviewed_after_selector_mixin_sass_executed,true);assert.equal(body.upstream_typescript_tests_or_workflows_executed,false);assert.equal(body.full_sass_gate_executed,false);assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.ok(Object.hasOwn(PATCHES,entry.sha));
  const row=body.reviews.find(value=>value.sha===entry.sha);assert.deepEqual(review,row);
  assert.equal(row.status,'reviewed');assert.equal(row.source_review_complete,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.reason,row.decision);assert.ok(row.decision.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);
  assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,PATCHES[entry.sha]);
  assert.deepEqual(proof,selectorDensityProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}

/** Recompute all original/current source facts on every invocation. */
function inspectSource({entry,body,review,proof,root=ROOT,read=path=>readFileSync(join(root,path))}){
  // Source inspection imports the current ledger owner through its candidate
  // inventory helper; defer it until the owner has finished initializing.
  const source=require('./upstream-selector-density-source-review.mjs');
  assert.equal(resolve(root),ROOT);assert.equal(metadataOk({entry,body,review,proof}),true);
  const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,handlerRef,
   ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
  const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed selector/density admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
  assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
  const current=source.reviewSelectorDensitySource({root,read});
  assert.deepEqual(current.report,JSON.parse(read(SOURCE_REVIEW.path)));
  current.assertCurrent();assertBound();return true;
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={SELECTOR_DENSITY_REVIEW:REVIEW,SELECTOR_DENSITY_REVIEW_HASH:REVIEW_HASH,SELECTOR_DENSITY_SHAS:Object.freeze(Object.keys(PATCHES)),
 SELECTOR_DENSITY_PROOF_KIND:KIND,SELECTOR_DENSITY_SCOPE_KEY:SCOPE,selectorDensityProof,metadataOk,sourceOk,inspectSource};
