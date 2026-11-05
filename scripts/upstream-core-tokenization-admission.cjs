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
const {types}=require('node:util');
const {gunzipSync}=require('node:zlib');
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-core-tokenization-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-core-tokenization-';
const REVIEW=PREFIX+'canonical-review.json',REVIEW_HASH='4bf0ae70875ddb6d8e2ac0f8f00e4f8edc3281f88273320f0558d441261ee9d3';
const QUALIFICATION={"path":"compatibility/rc/21x-c04-core-tokenization-source-qualification.json","sha256":"ea730d5798b8fd487b2872dbc98079623c4180b1cd9a0681f1b42e28d6de25cb","bytes":5649};
const SOURCE_REVIEW={"path":"compatibility/rc/21x-c04-core-tokenization-source-review.json.gz","sha256":"ba0ce00a87e99a2b75b9ce89314dd9874878ce86682daefaad864de2e1ef6c04","bytes":2290293,"encoding":"gzip","uncompressed_sha256":"ed7648f214153aed95ac9d718e07cd47a504a9331a2990ed70d0c8a66cf3d95b","uncompressed_bytes":10078017};
const PATCHES={"f2ad33442e5cba6084438278a7bafca3814ed897":"a52edf0e8456e528fbe9a9836115a830460eb10469f8014717b7bcbb7f16842f","92c701ffef53c39860f0ec0765c967d5ad6030f0":"4dc75a89ead76236de1bc52d4714f065334396fec491e7944e6ed5d6e962e303","47341ac0d6a56c7adb6dca5f89ba2d6fcfb7d572":"1077cf310f68dc9667288cb8066fcdc5f02f6e83fb768aaf4eef1ced74f06793"};
const BOUNDARY={"path":"compatibility/rc/21x-c04-core-tokenization-tree-density-boundary-assessment.json","sha256":"981cf4bbb787764066b783e2e80f2ba5b136d1551fa146d9a8a12f6fdaef209a","bytes":2625};
const KIND='individual-historical-core-tokenization-source-review',SCOPE='core_tokenization_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
// The immutable proof uses its original handler identity; current tools qualify separately.
const handlerRef={path:HANDLER,sha256:'db3373d403d45a66c597280ae8dbd3fc5935420affd02e8e9c4905facda0d669',bytes:7870};
const currentHandlerRef={path:HANDLER,sha256:hash(image),bytes:image.length};
const functionText=Function.prototype.toString;
function plain(value){
 if(value===null||['undefined','string','boolean'].includes(typeof value))return value;
 if(typeof value==='number'){assert.ok(Number.isSafeInteger(value));return value;}
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value));const array=Array.isArray(value);assert.equal(Object.getPrototypeOf(value),array?Array.prototype:Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(value),out=array?[]:{};
 for(const key of Reflect.ownKeys(descriptors)){assert.equal(typeof key,'string');if(array&&key==='length')continue;const d=descriptors[key];assert.ok(Object.hasOwn(d,'value')&&d.enumerable);if(array)assert.match(key,/^(?:0|[1-9][0-9]*)$/);Object.defineProperty(out,key,{value:plain(d.value),enumerable:true,writable:true,configurable:true});}
 if(array){assert.equal(out.length,descriptors.length.value);assert.equal(Object.keys(out).length,out.length);}return out;
}
function assertLoadedFunction(path,name,fn){
 const text=readFileSync(join(ROOT,path),'utf8'),marker='export function '+name+'(',start=text.indexOf(marker),end=text.indexOf('\n}\n',start);
 assert.ok(start>=0&&end>start&&text.indexOf(marker,start+1)===-1);assert.equal(typeof fn,'function');assert.equal(Reflect.apply(functionText,fn,[]),text.slice(start+7,end+2),'changed loaded current source producer '+name);
}

function captureArgs(args,keys){
 assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(args),selected={};
 for(const key of Reflect.ownKeys(descriptors)){assert.equal(typeof key,'string');assert.ok([...keys,'root','read'].includes(key));const d=descriptors[key];assert.ok(Object.hasOwn(d,'value')&&d.enumerable);if(keys.includes(key))Object.defineProperty(selected,key,{value:d.value,enumerable:true});}
 const snapshot=plain(selected),root=Object.hasOwn(descriptors,'root')?descriptors.root.value:ROOT,read=Object.hasOwn(descriptors,'read')?descriptors.read.value:path=>readFileSync(join(root,path));
 assert.equal(typeof root,'string');assert.equal(typeof read,'function');
 const same=()=>{assert.equal(Object.getPrototypeOf(args),Object.prototype);const after=Object.getOwnPropertyDescriptors(args),current={};assert.deepEqual(Reflect.ownKeys(after),Reflect.ownKeys(descriptors));for(const key of Reflect.ownKeys(descriptors)){const d=after[key];assert.ok(Object.hasOwn(d,'value'));assert.equal(d.value,descriptors[key].value);for(const flag of ['enumerable','writable','configurable'])assert.equal(d[flag],descriptors[key][flag]);if(keys.includes(key))Object.defineProperty(current,key,{value:d.value,enumerable:true});}assert.deepEqual(plain(current),snapshot);};
 return {value:snapshot,root,read,same};
}


function coreTokenizationProof(row){
 assert.ok(Object.hasOwn(PATCHES,row?.sha));
 return {proof_kind:KIND,diff_sha256:PATCHES[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},
   handler:{...handlerRef},bounded_sass_compiler_cases:32,supplemental_tree_density_boundary_cases:11,ordinary_peer_boundary:{...BOUNDARY},golden_or_finite_contract_changes:0,full_sass_gate_executed:false,source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}

/** Pure metadata comparison; no file reads, process execution or source cache. */
function metadataOk({entry,body,review,proof=entry?.individual_proof}){
 try{
  assert.equal(hash(JSON.stringify(body,null,2)+'\n'),REVIEW_HASH);
  assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,3);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(PATCHES));
  assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,12);assert.equal(body.original_hunks,17);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);
  assert.equal(body.fresh_bounded_sass_compiler_execution,true);assert.equal(body.tagged_reference_Sass_executed,true);assert.equal(body.approved_installed_minimum_peer_public_Sass_executed,true);assert.equal(body.captured_post16_patch_Sass_TypeScript_tests_or_workflows_executed,false);assert.equal(body.captured_post16_patch_package_JavaScript_or_installer_executed,false);assert.equal(body.full_Sass_gate_executed,false);assert.equal(body.supplemental_tree_density_boundary_cases,11);assert.deepEqual(body.tree_density_boundary_assessment,BOUNDARY);assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.ok(Object.hasOwn(PATCHES,entry.sha));
  const row=body.reviews.find(value=>value.sha===entry.sha);assert.deepEqual(review,row);
  assert.equal(row.status,'reviewed');assert.equal(row.source_review_complete,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.reason,row.decision);assert.ok(row.decision.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);
  assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,PATCHES[entry.sha]);
  assert.deepEqual(proof,coreTokenizationProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}

/** One fresh whole-body review; no caller-supplied source result or success cache. */
function inspectWholeBody({body,root,read}){
 const source=require('./upstream-core-tokenization-source-review.mjs');
 const {spinnerSnackC04Source}=require('./sass-spinner-snack-c04-source.mjs');
 const {m3ReviewPhysicalReader,m3ReviewBindingUnion}=require('./current-sass-m3-review-source.mjs');
 assert.equal(resolve(root),ROOT);const boundary=m3ReviewPhysicalReader({root,read});read=boundary.read;
 assertLoadedFunction('scripts/sass-spinner-snack-c04-source.mjs','spinnerSnackC04Source',spinnerSnackC04Source);
 assertLoadedFunction('scripts/upstream-core-tokenization-source-review.mjs','reviewCoreTokenizationSource',source.reviewCoreTokenizationSource);
 const c04=spinnerSnackC04Source({root,read});assert.deepEqual(c04.qualify(handlerRef),currentHandlerRef);
 const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,BOUNDARY,currentHandlerRef,
  ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
 const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed core-tokenization admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);else ref.bytes=raw.length;}};
 assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
 const archivedBytes=gunzipSync(read(SOURCE_REVIEW.path));assert.equal(hash(archivedBytes),SOURCE_REVIEW.uncompressed_sha256);assert.equal(archivedBytes.length,SOURCE_REVIEW.uncompressed_bytes);const archived=JSON.parse(archivedBytes);
 assert.equal(archived.current_source_bindings.length,642);bound.push(...archived.current_source_bindings.map(ref=>c04.qualify(ref)));assertBound();
 const current=source.reviewCoreTokenizationSource({root,read});assert.deepEqual(current.historical_report,archived);
 const assertCurrent=()=>{current.assertCurrent();assertBound();c04.assertCurrent();boundary.assertPhysical();};assertCurrent();
 return {bound:m3ReviewBindingUnion(bound,current.bound,c04.bound),assertCurrent,assertPhysical:boundary.assertPhysical};
}
/** Actual root admission remains fresh for each individual SHA. */
function inspectSource(args){
 const live=captureArgs(args,['entry','body','review','proof']),{entry,body,review,proof}=live.value;
 assert.equal(metadataOk({entry,body,review,proof}),true);
 const source=inspectWholeBody({body,root:live.root,read:live.read});source.assertCurrent();live.same();assert.equal(metadataOk({entry,body,review,proof}),true);source.assertPhysical();return true;
}
/** The canonical owner proves all metadata rows and the whole source body once. */
function inspectCanonicalSource(args){
 const live=captureArgs(args,['entries','body']),{entries,body}=live.value;
 const assertMetadata=()=>{live.same();assert.deepEqual(entries.map(entry=>entry.sha),Object.keys(PATCHES));for(const entry of entries)assert.equal(metadataOk({entry,body,review:body.reviews.find(row=>row.sha===entry.sha)}),true);};
 assertMetadata();const source=inspectWholeBody({body,root:live.root,read:live.read});
 const assertCurrent=()=>{assertMetadata();source.assertCurrent();assertMetadata();source.assertPhysical();};assertCurrent();
 return {bound:structuredClone(source.bound),assertCurrent};
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={CORE_TOKENIZATION_REVIEW:REVIEW,CORE_TOKENIZATION_REVIEW_HASH:REVIEW_HASH,CORE_TOKENIZATION_SHAS:Object.freeze(Object.keys(PATCHES)),
 CORE_TOKENIZATION_PROOF_KIND:KIND,CORE_TOKENIZATION_SCOPE_KEY:SCOPE,coreTokenizationProof,metadataOk,sourceOk,inspectSource,inspectCanonicalSource};
