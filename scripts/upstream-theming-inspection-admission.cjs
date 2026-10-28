/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two finite source exclusions; no native, packed, floor or full Sass credit. */
'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {join,resolve}=require('node:path');
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-theming-inspection-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-theming-inspection-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='6511bbe44548be85398ffb0e2f86885a79fc714d17ad3aeb2cdb605963410bd4';
const QUALIFICATION={path:PREFIX+'source-qualification.json',sha256:'2f795b64d9fbf9d399af724e7702a6174225395f990db7cd06461d6fedb1c4b5',bytes:2560};
const SOURCE_REVIEW={path:PREFIX+'source-review.json',sha256:'55d2533ffe204f9e589cc82fd78d66dd286d31f89769573d71cbb1d8425687d2',bytes:133530};
const PATCHES={a7dbf08148467ce7b2f132eba32f9517e39e336f:'9ec928921c615a0e24cba91977d1c9107f28f43a55d6cde7624e2da4d2437f93',
 b6e50c631b8f8131f494d57b0b806777da8d4efd:'826acc540b82cce67fe5e5d6a76865198997e512a354535ffb2fbe2f78a80667'};
const KIND='individual-historical-theming-inspection-source-exclusion',SCOPE='theming_inspection_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
const handlerRef={path:HANDLER,sha256:hash(image),bytes:image.length};

function themingProof(row){
 assert.ok(Object.hasOwn(PATCHES,row?.sha));
 return {proof_kind:KIND,diff_sha256:PATCHES[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},
   handler:{...handlerRef},source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}

/** Pure metadata comparison; no file reads, process execution or source cache. */
function metadataOk({entry,body,review,proof=entry?.individual_proof}){
 try{
  assert.equal(hash(JSON.stringify(body,null,2)+'\n'),REVIEW_HASH);
  assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,2);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(PATCHES));
  assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,11);assert.equal(body.original_hunks,16);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);
  assert.equal(body.fresh_compiler_execution_this_review,false);assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.ok(Object.hasOwn(PATCHES,entry.sha));
  const row=body.reviews.find(value=>value.sha===entry.sha);assert.deepEqual(review,row);
  assert.equal(row.status,'reviewed');assert.equal(row.source_review_complete,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.reason,row.decision);assert.ok(row.decision.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);
  assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,PATCHES[entry.sha]);
  assert.deepEqual(proof,themingProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}

/** Recompute all original/current source facts on every invocation. */
function inspectSource({entry,body,review,proof,root=ROOT,read=path=>readFileSync(join(root,path))}){
  // Source inspection imports the current ledger owner through its candidate
  // inventory helper; defer it until the owner has finished initializing.
  const source=require('./upstream-theming-inspection-source-review.mjs');
  assert.equal(resolve(root),ROOT);assert.equal(metadataOk({entry,body,review,proof}),true);
  const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,handlerRef,
   ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
  const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed theming admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
  assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
  const current=source.reviewThemingInspectionSource({root,read});
  assert.deepEqual(current.report,JSON.parse(read(SOURCE_REVIEW.path)));
  current.assertCurrent();assertBound();return true;
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={THEMING_REVIEW:REVIEW,THEMING_REVIEW_HASH:REVIEW_HASH,THEMING_SHAS:Object.freeze(Object.keys(PATCHES)),
 THEMING_PROOF_KIND:KIND,THEMING_SCOPE_KEY:SCOPE,themingProof,metadataOk,sourceOk,inspectSource};
