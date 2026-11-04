/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Four finite source decisions; no native, packed, floor or full Sass credit. */
'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {join,resolve}=require('node:path');
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-inspection-compatibility-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-inspection-compatibility-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='0a1fcebcd0cd1c30881c072a57b044eb32f9820b5dd24271a81ea0c2f977ca3a';
const QUALIFICATION={path:PREFIX+'source-qualification.json',sha256:'a37c92ec2df52921ec4aa9f237d0f90494d2ca7f6728a2a1782d59bb54727e52',bytes:2992};
const SOURCE_REVIEW={path:PREFIX+'source-review.json',sha256:'852cf937178ada91b0c604d349cf214cd810266af6118122c19e0dd534c55118',bytes:135386};
const PATCHES={"eeb0cf2666a2346ee99bb023c833da7255720654":"e576846f91a8e961418aa17089ac1f82e3c8d956fadde7bf71d883cc33ee4208","5d65f1dc4a719fd673b4d77f2f5bdba61d7ac523":"7425e82ef12006a04904dbbfa8a36d793d4e3b89980c89ab19818c400a1a4374","f6949e3e57fe25406968eeaea90ba662343c3e79":"d791af4c9299cba50bd3c02eab558a4372f358ab6c883fc019a0d829f42c079e","456741a61a8e85e597e82503941ccab97777bc97":"93fbaf24ad1a15053e4e168bcef18c0071c709e6482699d468d3fcc9db0944d8"};
const KIND='individual-historical-inspection-compatibility-source-review',SCOPE='inspection_compatibility_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
const handlerRef={path:HANDLER,sha256:'1ce1cdff28bc80ec7cf94f741d3abbd0c5add0454d5d0571e1e6098f08f0e1de',bytes:5534};
const currentHandlerRef={path:HANDLER,sha256:hash(image),bytes:image.length};

function inspectionProof(row){
 assert.ok(Object.hasOwn(PATCHES,row?.sha));
 return {proof_kind:KIND,diff_sha256:PATCHES[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},
   handler:{...handlerRef},source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}

/** Pure metadata comparison; no file reads, process execution or source cache. */
function metadataOk({entry,body,review,proof=entry?.individual_proof}){
 try{
  assert.equal(hash(JSON.stringify(body,null,2)+'\n'),REVIEW_HASH);
  assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,4);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(PATCHES));
  assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,7);assert.equal(body.original_hunks,14);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);
  assert.equal(body.fresh_compiler_execution_this_review,false);assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.ok(Object.hasOwn(PATCHES,entry.sha));
  const row=body.reviews.find(value=>value.sha===entry.sha);assert.deepEqual(review,row);
  assert.equal(row.status,'reviewed');assert.equal(row.source_review_complete,true);assert.equal(row.proposed_final_disposition,row.sha===Object.keys(PATCHES)[0]?'do-not-adopt':'not-applicable');
  assert.equal(entry.final_disposition,row.proposed_final_disposition);assert.equal(entry.reason,row.decision);assert.ok(row.decision.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);
  assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,PATCHES[entry.sha]);
  assert.deepEqual(proof,inspectionProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}

/** Recompute all original/current source facts on every invocation. */
function inspectSource(args){
  const {captureSpinnerSnackC04Metadata}=require('./sass-spinner-snack-c04-source.mjs');
  const capture=()=>captureSpinnerSnackC04Metadata(args,['entry','body','review','proof','root']);
  const originalMetadata=capture();
  const {entry,body,review,proof}=originalMetadata;
 const {root=ROOT,read=path=>readFileSync(join(root,path))}=args;
  // Source inspection imports the current ledger owner through its candidate
  // inventory helper; defer it until the owner has finished initializing.
  const source=require('./upstream-inspection-compatibility-source-review.mjs');
  assert.equal(resolve(root),ROOT);assert.equal(metadataOk({entry,body,review,proof}),true);
  const {spinnerSnackC04Source}=require('./sass-spinner-snack-c04-source.mjs');
  const c04=spinnerSnackC04Source({root,read});assert.deepEqual(c04.qualify(handlerRef),currentHandlerRef);
  const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,currentHandlerRef,...c04.bound,
   ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
  const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed inspection admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
  assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
  const current=source.reviewInspectionCompatibilitySource({root,read});
  assert.deepEqual(current.historical_report,JSON.parse(read(SOURCE_REVIEW.path)));
  c04.assertCurrent();current.assertCurrent();assertBound();c04.assertCurrent();
  assert.deepEqual(capture(),originalMetadata,'caller admission metadata changed during source inspection');
  assert.equal(metadataOk(args),true);return true;
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={INSPECTION_REVIEW:REVIEW,INSPECTION_REVIEW_HASH:REVIEW_HASH,INSPECTION_SHAS:Object.freeze(Object.keys(PATCHES)),
 INSPECTION_PROOF_KIND:KIND,INSPECTION_SCOPE_KEY:SCOPE,inspectionProof,metadataOk,sourceOk,inspectSource};
