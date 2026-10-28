/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Three finite source decisions; no native, packed, floor or full Sass credit. */
'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {join,resolve}=require('node:path');
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-surface-m3-theme-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-surface-m3-theme-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='8f0d2f6ea801a2e40ef044349d7f17fb5908eddf2137e9990a87d4058ab6d84b';
const QUALIFICATION={"path":"compatibility/rc/21x-c04-surface-m3-theme-source-qualification.json","sha256":"ef71fecf31d7e0a4406113ce933fe230e8ac7da9c32bb7ae60c2a87f38c8aeee","bytes":5961};
const SOURCE_REVIEW={"path":"compatibility/rc/21x-c04-surface-m3-theme-source-review.json","sha256":"676d90777a549f651819bd40e6e244b529912cb463cae8f5f958fcca0f78269b","bytes":1559335};
const PATCHES={"545db61b41957df26c5e3c95a2959ca6c83a9190":"815a3a7aebd89e4c3ba55e153e40759b689ee59871607a292e8d8db21f058164","1930b1dacf07826750ffc72dbce551fe6653fd4f":"be178948b967b494542ddfc8734668f8c697261183d00ac40af03a6b9af00fe7","fbc7bdda93b7c261705da81cec6720bbf607c5ce":"c9ba2a5966107238abbd3891c37828ff19853eeb8c6b9cb4f549e355b30d3f93"};
const KIND='individual-historical-surface-m3-theme-source-review',SCOPE='surface_m3_theme_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
const handlerRef={path:HANDLER,sha256:hash(image),bytes:image.length};

function surfaceM3ThemeProof(row){
 assert.ok(Object.hasOwn(PATCHES,row?.sha));
 return {proof_kind:KIND,diff_sha256:PATCHES[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},
   handler:{...handlerRef},bounded_sass_compiler_cases:36,full_sass_gate_executed:false,source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}

/** Pure metadata comparison; no file reads, process execution or source cache. */
function metadataOk({entry,body,review,proof=entry?.individual_proof}){
 try{
  assert.equal(hash(JSON.stringify(body,null,2)+'\n'),REVIEW_HASH);
  assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,3);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(PATCHES));
  assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,17);assert.equal(body.original_hunks,32);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);
  assert.equal(body.fresh_bounded_sass_compiler_execution,true);assert.equal(body.tagged_reference_sass_executed,true);assert.equal(body.upstream_post16_sass_or_typescript_tests_or_workflows_executed,false);assert.equal(body.package_install_or_javascript_runtime_execution,false);assert.equal(body.full_sass_gate_executed,false);assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.ok(Object.hasOwn(PATCHES,entry.sha));
  const row=body.reviews.find(value=>value.sha===entry.sha);assert.deepEqual(review,row);
  assert.equal(row.status,'reviewed');assert.equal(row.source_review_complete,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.reason,row.decision);assert.ok(row.decision.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);
  assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,PATCHES[entry.sha]);
  assert.deepEqual(proof,surfaceM3ThemeProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}

/** One fresh whole-body review; no caller-supplied source result or success cache. */
function inspectWholeBody({body,root,read}){
 const source=require('./upstream-surface-m3-theme-source-review.mjs');
 assert.equal(resolve(root),ROOT);
 const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,handlerRef,
  ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
 const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed button token-repair admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
 assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
 const current=source.reviewSurfaceThemeSource({root,read});
 assert.deepEqual(current.report,JSON.parse(read(SOURCE_REVIEW.path)));
 const assertCurrent=()=>{current.assertCurrent();assertBound();};assertCurrent();
 return {bound:structuredClone([...bound,...current.bound]),assertCurrent};
}
/** Actual root admission remains fresh for each individual SHA. */
function inspectSource({entry,body,review,proof,root=ROOT,read=path=>readFileSync(join(root,path))}){
 assert.equal(metadataOk({entry,body,review,proof}),true);
 inspectWholeBody({body,root,read}).assertCurrent();return true;
}
/** The canonical owner proves all three metadata rows and the whole source body once. */
function inspectCanonicalSource({entries,body,root=ROOT,read=path=>readFileSync(join(root,path))}){
 assert.deepEqual(entries.map(entry=>entry.sha),Object.keys(PATCHES));
 for(const entry of entries)assert.equal(metadataOk({entry,body,review:body.reviews.find(row=>row.sha===entry.sha)}),true);
 return inspectWholeBody({body,root,read});
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={SURFACE_M3_THEME_REVIEW:REVIEW,SURFACE_M3_THEME_REVIEW_HASH:REVIEW_HASH,SURFACE_M3_THEME_SHAS:Object.freeze(Object.keys(PATCHES)),
 SURFACE_M3_THEME_PROOF_KIND:KIND,SURFACE_M3_THEME_SCOPE_KEY:SCOPE,surfaceM3ThemeProof,metadataOk,sourceOk,inspectSource,inspectCanonicalSource};
