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
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-slider-m3-repairs-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-slider-m3-repairs-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='9a2a03432b03c9815fd12c8aabbcad5002e21e0d3995c81ed6d93a85f3b965a3';
const QUALIFICATION={"path":"compatibility/rc/21x-c04-slider-m3-repairs-source-qualification.json","sha256":"75afde9dfa14c1dbd3a031506146bbb96c4006b40e94f3a5a499ddb6bfef7b55","bytes":6094};
const SOURCE_REVIEW={"path":"compatibility/rc/21x-c04-slider-m3-repairs-source-review.json","sha256":"2aed7df6f65661ad75484d3ab0af7cc8d2b444c2b597d75dbbbb006965165ce7","bytes":406098};
const PATCHES={"4550637812dadb67a9af21df261899eaf3f1ae4c":"a23da920b33d5b2848939ed594a1298bcb818322f2a686652b679b20d958f6d0","90b37e5652bad1044dff3c4702aa4b73b715117a":"d12d786ece63cc1e97e30d6711b62dbb644c9f464a895e65ca5ed859f388c201"};
const KIND='individual-historical-slider-m3-repairs-source-review',SCOPE='slider_m3_repairs_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
const handlerRef={path:HANDLER,sha256:hash(image),bytes:image.length};

function sliderM3RepairsProof(row){
 assert.ok(Object.hasOwn(PATCHES,row?.sha));
 return {proof_kind:KIND,diff_sha256:PATCHES[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},
   handler:{...handlerRef},bounded_sass_compiler_cases:14,full_sass_gate_executed:false,source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}

/** Pure metadata comparison; no file reads, process execution or source cache. */
function metadataOk({entry,body,review,proof=entry?.individual_proof}){
 try{
  assert.equal(hash(JSON.stringify(body,null,2)+'\n'),REVIEW_HASH);
  assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,2);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(PATCHES));
  assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,9);assert.equal(body.original_hunks,14);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);
  assert.equal(body.fresh_bounded_sass_compiler_execution,true);assert.equal(body.tagged_reference_sass_executed,true);assert.equal(body.upstream_post16_sass_or_typescript_tests_or_workflows_executed,false);assert.equal(body.package_install_or_javascript_runtime_execution,false);assert.equal(body.full_sass_gate_executed,false);assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.ok(Object.hasOwn(PATCHES,entry.sha));
  const row=body.reviews.find(value=>value.sha===entry.sha);assert.deepEqual(review,row);
  assert.equal(row.status,'reviewed');assert.equal(row.source_review_complete,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.reason,row.decision);assert.ok(row.decision.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);
  assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,PATCHES[entry.sha]);
  assert.deepEqual(proof,sliderM3RepairsProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}

/** One fresh whole-body review; no caller-supplied source result or success cache. */
function inspectWholeBody({body,root,read}){
 const source=require('./upstream-slider-m3-repairs-source-review.mjs');
 assert.equal(resolve(root),ROOT);
 const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,handlerRef,
  ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
 const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed button token-repair admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
 assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
 const current=source.reviewSliderM3RepairsSource({root,read});
 assert.deepEqual(current.report,JSON.parse(read(SOURCE_REVIEW.path)));
 const assertCurrent=()=>{current.assertCurrent();assertBound();};assertCurrent();
 return {bound:structuredClone([...bound,...current.bound]),assertCurrent};
}
/** Actual root admission remains fresh for each individual SHA. */
function inspectSource({entry,body,review,proof,root=ROOT,read=path=>readFileSync(join(root,path))}){
 assert.equal(metadataOk({entry,body,review,proof}),true);
 inspectWholeBody({body,root,read}).assertCurrent();assert.equal(metadataOk({entry,body,review,proof}),true);return true;
}
/** The canonical owner proves both metadata rows and the whole source body once. */
function inspectCanonicalSource({entries,body,root=ROOT,read=path=>readFileSync(join(root,path))}){
 const assertMetadata=()=>{assert.deepEqual(entries.map(entry=>entry.sha),Object.keys(PATCHES));for(const entry of entries)assert.equal(metadataOk({entry,body,review:body.reviews.find(row=>row.sha===entry.sha)}),true);};
 assertMetadata();const source=inspectWholeBody({body,root,read});
 const assertCurrent=()=>{assertMetadata();source.assertCurrent();assertMetadata();};assertCurrent();
 return {bound:structuredClone(source.bound),assertCurrent};
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={SLIDER_M3_REPAIRS_REVIEW:REVIEW,SLIDER_M3_REPAIRS_REVIEW_HASH:REVIEW_HASH,SLIDER_M3_REPAIRS_SHAS:Object.freeze(Object.keys(PATCHES)),
 SLIDER_M3_REPAIRS_PROOF_KIND:KIND,SLIDER_M3_REPAIRS_SCOPE_KEY:SCOPE,sliderM3RepairsProof,metadataOk,sourceOk,inspectSource,inspectCanonicalSource};
