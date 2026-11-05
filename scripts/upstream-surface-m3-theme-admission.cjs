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
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-surface-m3-theme-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-surface-m3-theme-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='8f0d2f6ea801a2e40ef044349d7f17fb5908eddf2137e9990a87d4058ab6d84b';
const QUALIFICATION={"path":"compatibility/rc/21x-c04-surface-m3-theme-source-qualification.json","sha256":"ef71fecf31d7e0a4406113ce933fe230e8ac7da9c32bb7ae60c2a87f38c8aeee","bytes":5961};
const SOURCE_REVIEW={"path":"compatibility/rc/21x-c04-surface-m3-theme-source-review.json","sha256":"676d90777a549f651819bd40e6e244b529912cb463cae8f5f958fcca0f78269b","bytes":1559335};
const PATCHES={"545db61b41957df26c5e3c95a2959ca6c83a9190":"815a3a7aebd89e4c3ba55e153e40759b689ee59871607a292e8d8db21f058164","1930b1dacf07826750ffc72dbce551fe6653fd4f":"be178948b967b494542ddfc8734668f8c697261183d00ac40af03a6b9af00fe7","fbc7bdda93b7c261705da81cec6720bbf607c5ce":"c9ba2a5966107238abbd3891c37828ff19853eeb8c6b9cb4f549e355b30d3f93"};
const KIND='individual-historical-surface-m3-theme-source-review',SCOPE='surface_m3_theme_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
// The immutable proof uses its original handler identity; current tools qualify separately.
const handlerRef={path:HANDLER,sha256:'62dfe5af58f552c1a52e474fda2350aa78ce070ac3c19667850984c795dc8904',bytes:6364};
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
 const {spinnerSnackC04Source}=require('./sass-spinner-snack-c04-source.mjs');
 const {m3ReviewPhysicalReader,m3ReviewBindingUnion}=require('./current-sass-m3-review-source.mjs');
 assert.equal(resolve(root),ROOT);const boundary=m3ReviewPhysicalReader({root,read});read=boundary.read;
 assertLoadedFunction('scripts/sass-spinner-snack-c04-source.mjs','spinnerSnackC04Source',spinnerSnackC04Source);
 assertLoadedFunction('scripts/upstream-surface-m3-theme-source-review.mjs','reviewSurfaceThemeSource',source.reviewSurfaceThemeSource);
 const c04=spinnerSnackC04Source({root,read});assert.deepEqual(c04.qualify(handlerRef),currentHandlerRef);
 const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,currentHandlerRef,
  ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
 const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed surface-m3-theme admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);else ref.bytes=raw.length;}};
 assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
 const archived=JSON.parse(read(SOURCE_REVIEW.path));
 const current=source.reviewSurfaceThemeSource({root,read});assert.deepEqual(current.historical_report,archived);
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

module.exports={SURFACE_M3_THEME_REVIEW:REVIEW,SURFACE_M3_THEME_REVIEW_HASH:REVIEW_HASH,SURFACE_M3_THEME_SHAS:Object.freeze(Object.keys(PATCHES)),
 SURFACE_M3_THEME_PROOF_KIND:KIND,SURFACE_M3_THEME_SCOPE_KEY:SCOPE,surfaceM3ThemeProof,metadataOk,sourceOk,inspectSource,inspectCanonicalSource};
