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
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-control-m3-theme-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-control-m3-theme-';
const REVIEW=PREFIX+'canonical-review.json',REVIEW_HASH='380a2bc69f906d0a060d0c4391a9a9ae32322f6ef390b53781d8cc9b04159e98';
const QUALIFICATION={"path": "compatibility/rc/21x-c04-control-m3-theme-source-qualification.json", "sha256": "84993ffcbd72a3a0c8725e136b840f91e614021c5c814af962f0705f33473ddc", "bytes": 3657};
const SOURCE_REVIEW={"path": "compatibility/rc/21x-c04-control-m3-theme-source-review.json", "sha256": "69df54b7474b863fc9e1db8f1017217d7289072f4272d20f57ea21391df51fd6", "bytes": 1852529};
const PATCHES={"6b57edb1b164909f8aa1eddac87a915c037e6905": "d5201f108ff5a5d5f38c6d13437c5768ac805c62ba673bba628c3b4ea867e3bd", "75029c273a4aad3ad4481d8c045c9a73ccceb34e": "878ba9207bc62a4440b2493dc75f1282cefaa83f7d45513e16dadecf3aeadafe", "2f958aced5757915f75e4036229d5df63f6ff414": "17f369ca7d3554694b90cfaedc86f20b09cd6a3b3cb05d28021b138ad93a4e63", "289ddd348395f0299a6c7cba2cde8662842df06d": "41c76fdf701d135c1709683cc34cd658d367331ea10c108a0e3a3682899aa7b4"};
const KIND='individual-historical-control-m3-theme-source-review',SCOPE='control_m3_theme_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
const handlerRef={path:HANDLER,sha256:'e5fbd06feda4bfe1a912bbd74229ca9f80f2c29a8a11ac7e5249aff84e2b327a',bytes:6753};
const currentHandlerRef={path:HANDLER,sha256:hash(image),bytes:image.length};

function controlM3ThemeProof(row){
 assert.ok(Object.hasOwn(PATCHES,row?.sha));
 return {proof_kind:KIND,diff_sha256:PATCHES[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},
   handler:{...handlerRef},bounded_sass_compiler_cases:56,full_sass_gate_executed:false,source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}

/** Pure metadata comparison; no file reads, process execution or source cache. */
function metadataOk({entry,body,review,proof=entry?.individual_proof}){
 try{
  assert.equal(hash(JSON.stringify(body,null,2)+'\n'),REVIEW_HASH);
  assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,4);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(PATCHES));
  assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,24);assert.equal(body.original_hunks,43);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);
  assert.equal(body.fresh_bounded_sass_compiler_execution,true);assert.equal(body.tagged_reference_sass_executed,true);assert.equal(body.upstream_post16_sass_or_typescript_tests_or_workflows_executed,false);assert.equal(body.package_install_or_javascript_runtime_execution,false);assert.equal(body.full_sass_gate_executed,false);assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.ok(Object.hasOwn(PATCHES,entry.sha));
  const row=body.reviews.find(value=>value.sha===entry.sha);assert.deepEqual(review,row);
  assert.equal(row.status,'reviewed');assert.equal(row.source_review_complete,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.reason,row.decision);assert.ok(row.decision.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);
  assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,PATCHES[entry.sha]);
  assert.deepEqual(proof,controlM3ThemeProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}

/** One fresh whole-body review; no caller-supplied source result or success cache. */
function inspectWholeBody({body,root,read}){
 const source=require('./upstream-control-m3-theme-source-review.mjs');
 assert.equal(resolve(root),ROOT);
 const {spinnerSnackC04Source}=require('./sass-spinner-snack-c04-source.mjs');
 const c04=spinnerSnackC04Source({root,read});assert.deepEqual(c04.qualify(handlerRef),currentHandlerRef);
 const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,currentHandlerRef,...c04.bound,
  ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
 const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed control theme admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
 assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
 const current=source.reviewControlM3ThemeSource({root,read});
 assert.deepEqual(current.historical_report,JSON.parse(read(SOURCE_REVIEW.path)));
 const assertCurrent=()=>{c04.assertCurrent();current.assertCurrent();assertBound();c04.assertCurrent();};assertCurrent();
 return {bound:structuredClone([...bound,...current.bound]),assertCurrent};
}
/** Actual root admission remains fresh for each individual SHA. */
function inspectSource(args){
 const {captureSpinnerSnackC04Metadata}=require('./sass-spinner-snack-c04-source.mjs');
 const capture=()=>captureSpinnerSnackC04Metadata(args,['entry','body','review','proof','root']);
 const originalMetadata=capture();
 const {entry,body,review,proof}=originalMetadata;
 const {root=ROOT,read=path=>readFileSync(join(root,path))}=args;
 assert.equal(metadataOk({entry,body,review,proof}),true);
 inspectWholeBody({body,root,read}).assertCurrent();
 assert.deepEqual(capture(),originalMetadata,'caller admission metadata changed during source inspection');
 assert.equal(metadataOk(args),true);return true;
}
/** The canonical owner proves all four metadata rows and the whole source body once. */
function inspectCanonicalSource(args){
 const {captureSpinnerSnackC04Metadata}=require('./sass-spinner-snack-c04-source.mjs');
 const capture=()=>captureSpinnerSnackC04Metadata(args,['entries','body','root']);
 const originalMetadata=capture();
 const {entries,body}=originalMetadata;
 const {root=ROOT,read=path=>readFileSync(join(root,path))}=args;
 const assertCaller=()=>assert.deepEqual(capture(),originalMetadata,'caller canonical metadata changed during source inspection');
 const assertMetadata=()=>{assert.deepEqual(entries.map(entry=>entry.sha),Object.keys(PATCHES));for(const entry of entries)assert.equal(metadataOk({entry,body,review:body.reviews.find(row=>row.sha===entry.sha)}),true);};
 assertCaller();assertMetadata();const source=inspectWholeBody({body,root,read});
 const assertCurrent=()=>{assertCaller();assertMetadata();source.assertCurrent();assertMetadata();assertCaller();};assertCurrent();
 return {bound:structuredClone(source.bound),assertCurrent};
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={CONTROL_M3_THEME_REVIEW:REVIEW,CONTROL_M3_THEME_REVIEW_HASH:REVIEW_HASH,CONTROL_M3_THEME_SHAS:Object.freeze(Object.keys(PATCHES)),
 CONTROL_M3_THEME_PROOF_KIND:KIND,CONTROL_M3_THEME_SCOPE_KEY:SCOPE,controlM3ThemeProof,metadataOk,sourceOk,inspectSource,inspectCanonicalSource};
