/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Fourteen finite source decisions; no native, packed, floor or full Sass credit. */
'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {join,resolve}=require('node:path');
const {gunzipSync}=require('node:zlib');
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-remaining-unthemable-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-remaining-unthemable-';
const REVIEW=PREFIX+'canonical-review.json',REVIEW_HASH='d4efab772a0eb08822d798bec529b86013bd5a0d916f24d8ed3c3ff442d7fbdd';
const QUALIFICATION={"path":"compatibility/rc/21x-c04-remaining-unthemable-source-qualification.json","sha256":"a57c4411207d03b086869262b7a414b138684ad6e6efcc457d780f2b064adb69","bytes":7352};
const SOURCE_REVIEW={"path":"compatibility/rc/21x-c04-remaining-unthemable-source-review.json.gz","sha256":"c25b0a59e7bbe5e63eebc3068a84eb010e9e558d021770de22b81d669380e31b","bytes":1824722,"encoding":"gzip","uncompressed_sha256":"7f0b8913e7af8a67f028ea4348c6e700e3835e59c08d05471cb0b92ee935d0d1","uncompressed_bytes":9992323};
const PATCHES={"dfba0edfbec52614e42e6fe0f9409a1fa0346669":"8c69e619f62040da6fffa493b03e283a82307e495710e5f49ce2b21d82c9f7e1","943b5dabf3fc14cf0dee80174a6891fef8a588c8":"8cdf6fca17031bfa25f43d5e2418c975a96033819c7af2edb25ebba6a0913add","c77ffa0cc22b5e7ed08923d97bb049ce74d71888":"29ba58a441aa76b3f87c6eb086bf321164f76bc79e4b85d14e196799fea34da1","7cd71b69799fa0cf4825ac2515fc29d26e2ecd47":"9db335d8097083e60e3b5f34bf6eb7b30df9e53d9b34f6def8de88d9d444c480","af1840209f81dcf8011e88b7d98101ff72f0ad1c":"8c9ee035aef7fe92050a6e7a5a433adadf0f702a508deb39d4f1451b43cac08e","c6bc738cd1d7ca3c5d468f91252cfb8619a17b01":"81fd0d1fda2fdb68bfe18bde84805a0e7a8e445b5b56461554af1e96eeaa9e1f","f823c2a52a4eed29d2a71c8d94790107231cc139":"94322c928c54560b17517a016218b8a9cb52a3eb1065862844aaa28a4a6d346f","59351724dfef12961e2fdbbe12bf141af065e3a8":"a9d0106d7964d60d18afa8494012fdece5981220c0c8397acbb6e419caf3ea26","bcbdf910b11c0d828faab2ff99d12f92970b636d":"2171bb25a5fb68438cd1d6ffc6f06ae6f30cf7e0ee3eb5769a65d382dafd885e","eed75ddfc794d36617008c7b3ebe4fcba4bef2ff":"1259f81664887e640db3beeca5e0d352c3bd3665d033d0968b3e4d5a7ba97fa1","52c85e55cd15d22abd02b4ff52b67c3752b2a27c":"f247022fb2d6cc6ab0551cb36d4203d3d8d2a10d581212b82178e7855ee6f6e3","9535454a9063f76aba3b21e69cda7337f829b224":"9fcc1fc65360bac2ffbd40e3b3c550eda1d374f8b8904e5a4f240a4a9211b829","3430c4d7ef986476eb3b15751f822c5d4593f0d8":"5e0d9c4db515cffead209938de1ee1557f8baa6c3108fc598516e7632845aa7c","556eeb19c8d53e8675df12670f5ccaa6148d2532":"78725152dbaf6569ae83d2200974881dbb0a3d3f079e935553174ee7326563c0"};
const KIND='individual-historical-remaining-unthemable-source-review',SCOPE='remaining_unthemable_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
const handlerRef={path:HANDLER,sha256:hash(image),bytes:image.length};

function remainingUnthemableProof(row){
 assert.ok(Object.hasOwn(PATCHES,row?.sha));
 return {proof_kind:KIND,diff_sha256:PATCHES[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},
   handler:{...handlerRef},bounded_sass_compiler_cases:160,golden_or_finite_contract_changes:0,full_sass_gate_executed:false,source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}

/** Pure metadata comparison; no file reads, process execution or source cache. */
function metadataOk({entry,body,review,proof=entry?.individual_proof}){
 try{
  assert.equal(hash(JSON.stringify(body,null,2)+'\n'),REVIEW_HASH);
  assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,14);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(PATCHES));
  assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,38);assert.equal(body.original_hunks,54);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);
  assert.equal(body.fresh_bounded_sass_compiler_execution,true);assert.equal(body.tagged_reference_Sass_executed,true);assert.equal(body.approved_installed_minimum_peer_public_Sass_executed,true);assert.equal(body.captured_post16_patch_Sass_TypeScript_tests_or_workflows_executed,false);assert.equal(body.captured_post16_patch_package_JavaScript_or_installer_executed,false);assert.equal(body.full_Sass_gate_executed,false);assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.ok(Object.hasOwn(PATCHES,entry.sha));
  const row=body.reviews.find(value=>value.sha===entry.sha);assert.deepEqual(review,row);
  assert.equal(row.status,'reviewed');assert.equal(row.source_review_complete,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.reason,row.decision);assert.ok(row.decision.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);
  assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,PATCHES[entry.sha]);
  assert.deepEqual(proof,remainingUnthemableProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}

/** One fresh whole-body review; no caller-supplied source result or success cache. */
function inspectWholeBody({body,root,read}){
 const source=require('./upstream-remaining-unthemable-source-review.mjs');
 assert.equal(resolve(root),ROOT);
 const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,handlerRef,
  ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
 const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed remaining unthemable admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
 assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
 const archivedBytes=gunzipSync(read(SOURCE_REVIEW.path));assert.equal(hash(archivedBytes),SOURCE_REVIEW.uncompressed_sha256);assert.equal(archivedBytes.length,SOURCE_REVIEW.uncompressed_bytes);
 const archived=JSON.parse(archivedBytes);
 // Authenticate expected input identities before expensive compilation. This is
 // an integrity precondition, never a stored-success or CSS-result shortcut.
 assert.equal(archived.current_source_bindings.length,642);bound.push(...archived.current_source_bindings);assertBound();
 const current=source.reviewRemainingUnthemableSource({root,read});
 assert.deepEqual(current.report,archived);
 const assertCurrent=()=>{current.assertCurrent();assertBound();};assertCurrent();
 return {bound:structuredClone([...bound,...current.bound]),assertCurrent};
}
/** Actual root admission remains fresh for each individual SHA. */
function inspectSource({entry,body,review,proof,root=ROOT,read=path=>readFileSync(join(root,path))}){
 assert.equal(metadataOk({entry,body,review,proof}),true);
 inspectWholeBody({body,root,read}).assertCurrent();assert.equal(metadataOk({entry,body,review,proof}),true);return true;
}
/** The canonical owner proves all fourteen metadata rows and the whole source body once. */
function inspectCanonicalSource({entries,body,root=ROOT,read=path=>readFileSync(join(root,path))}){
 const assertMetadata=()=>{assert.deepEqual(entries.map(entry=>entry.sha),Object.keys(PATCHES));for(const entry of entries)assert.equal(metadataOk({entry,body,review:body.reviews.find(row=>row.sha===entry.sha)}),true);};
 assertMetadata();const source=inspectWholeBody({body,root,read});
 const assertCurrent=()=>{assertMetadata();source.assertCurrent();assertMetadata();};assertCurrent();
 return {bound:structuredClone(source.bound),assertCurrent};
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={REMAINING_UNTHEMABLE_REVIEW:REVIEW,REMAINING_UNTHEMABLE_REVIEW_HASH:REVIEW_HASH,REMAINING_UNTHEMABLE_SHAS:Object.freeze(Object.keys(PATCHES)),
 REMAINING_UNTHEMABLE_PROOF_KIND:KIND,REMAINING_UNTHEMABLE_SCOPE_KEY:SCOPE,remainingUnthemableProof,metadataOk,sourceOk,inspectSource,inspectCanonicalSource};
