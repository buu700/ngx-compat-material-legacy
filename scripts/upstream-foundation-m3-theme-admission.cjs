/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Six finite source decisions; no native, packed, floor or full Sass credit. */
'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {join,resolve}=require('node:path');
const {gunzipSync}=require('node:zlib');
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-foundation-m3-theme-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-foundation-m3-theme-';
const REVIEW=PREFIX+'canonical-review.json',REVIEW_HASH='1681f605639e5de2240eb47684026fc24a25b46a433fb06ad4d6c19d70db9289';
const QUALIFICATION={"path":"compatibility/rc/21x-c04-foundation-m3-theme-source-qualification.json","sha256":"529ad38835dba99ba07e87c9fafe1a0c0ff6c510db87f7fb606b77ef51333194","bytes":5346};
const SOURCE_REVIEW={"path":"compatibility/rc/21x-c04-foundation-m3-theme-source-review.json.gz","sha256":"796997f473b80a8fb5d4f7e78e80091330041ece6a2246d72988985b30a0450a","bytes":1791640,"uncompressed_sha256":"26855f29c717a6cd156bc79b636926860de758e5f1dd46a99754e0214d819021","uncompressed_bytes":9441235,"encoding":"gzip"};
const PATCHES={"76cda4202c3c10192f386b03b583774725fa0451":"45e80630237e5ba5de4455a5587a9f638fbd922868f31fc1977465fa6c66442e","eca41177fc8b6c19a389c6911cac566460596f13":"73087b6989ace1bbe8ef3636805774dd84064fe05b130de5e386cd090ba7b8c2","7a7434a772320f17f082208297f7d19d470ceee3":"10275e219e5a8c5dcb397f552578fc395fcdae6a500012cadb3cab16e7f58b3f","d7b454315ac739eae0318f8de7dce99d6f7996fe":"54be7288d18391cee5e04ede5a80184610c33ead7260292fa9adc246e607b0ef","f67c8711883eec6ee7334aac45a40b3786dc6170":"4c14fc5e72bf33ef85f3b2d2e13df3f755c2e1121823ffa2d7e7ddaaefe241e7","4d50c38579f5a3a8d85b3f192ca6567bbcdcf8de":"89d9d66d948a820488bcab8e1fcbf0e6e86ae8dc4bbe182cf6f3a10e902b2b48"};
const KIND='individual-historical-foundation-m3-theme-source-review',SCOPE='foundation_m3_theme_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
const handlerRef={path:HANDLER,sha256:hash(image),bytes:image.length};

function foundationM3ThemeProof(row){
 assert.ok(Object.hasOwn(PATCHES,row?.sha));
 return {proof_kind:KIND,diff_sha256:PATCHES[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},
   handler:{...handlerRef},bounded_sass_compiler_cases:136,full_sass_gate_executed:false,source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}

/** Pure metadata comparison; no file reads, process execution or source cache. */
function metadataOk({entry,body,review,proof=entry?.individual_proof}){
 try{
  assert.equal(hash(JSON.stringify(body,null,2)+'\n'),REVIEW_HASH);
  assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,6);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(PATCHES));
  assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,40);assert.equal(body.original_hunks,81);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);
  assert.equal(body.fresh_bounded_sass_compiler_execution,true);assert.equal(body.tagged_reference_sass_executed,true);assert.equal(body.upstream_post16_sass_or_typescript_tests_or_workflows_executed,false);assert.equal(body.package_install_or_javascript_runtime_execution,false);assert.equal(body.full_sass_gate_executed,false);assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.ok(Object.hasOwn(PATCHES,entry.sha));
  const row=body.reviews.find(value=>value.sha===entry.sha);assert.deepEqual(review,row);
  assert.equal(row.status,'reviewed');assert.equal(row.source_review_complete,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.reason,row.decision);assert.ok(row.decision.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);
  assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,PATCHES[entry.sha]);
  assert.deepEqual(proof,foundationM3ThemeProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}

/** One fresh whole-body review; no caller-supplied source result or success cache. */
function inspectWholeBody({body,root,read}){
 const source=require('./upstream-foundation-m3-theme-source-review.mjs');
 assert.equal(resolve(root),ROOT);
 const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,handlerRef,
  ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
 const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed control theme admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
 assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
 const current=source.reviewFoundationM3ThemeSource({root,read});
 const archived=gunzipSync(read(SOURCE_REVIEW.path));assert.equal(hash(archived),SOURCE_REVIEW.uncompressed_sha256);assert.equal(archived.length,SOURCE_REVIEW.uncompressed_bytes);
 assert.deepEqual(current.report,JSON.parse(archived));
 const assertCurrent=()=>{current.assertCurrent();assertBound();};assertCurrent();
 return {bound:structuredClone([...bound,...current.bound]),assertCurrent};
}
/** Actual root admission remains fresh for each individual SHA. */
function inspectSource({entry,body,review,proof,root=ROOT,read=path=>readFileSync(join(root,path))}){
 assert.equal(metadataOk({entry,body,review,proof}),true);
 inspectWholeBody({body,root,read}).assertCurrent();assert.equal(metadataOk({entry,body,review,proof}),true);return true;
}
/** The canonical owner proves all six metadata rows and the whole source body once. */
function inspectCanonicalSource({entries,body,root=ROOT,read=path=>readFileSync(join(root,path))}){
 const assertMetadata=()=>{assert.deepEqual(entries.map(entry=>entry.sha),Object.keys(PATCHES));for(const entry of entries)assert.equal(metadataOk({entry,body,review:body.reviews.find(row=>row.sha===entry.sha)}),true);};
 assertMetadata();const source=inspectWholeBody({body,root,read});
 const assertCurrent=()=>{assertMetadata();source.assertCurrent();assertMetadata();};assertCurrent();
 return {bound:structuredClone(source.bound),assertCurrent};
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={FOUNDATION_M3_THEME_REVIEW:REVIEW,FOUNDATION_M3_THEME_REVIEW_HASH:REVIEW_HASH,FOUNDATION_M3_THEME_SHAS:Object.freeze(Object.keys(PATCHES)),
 FOUNDATION_M3_THEME_PROOF_KIND:KIND,FOUNDATION_M3_THEME_SCOPE_KEY:SCOPE,foundationM3ThemeProof,metadataOk,sourceOk,inspectSource,inspectCanonicalSource};
