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
const {types}=require('node:util');
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-slider-m3-repairs-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-slider-m3-repairs-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='9a2a03432b03c9815fd12c8aabbcad5002e21e0d3995c81ed6d93a85f3b965a3';
const QUALIFICATION={"path":"compatibility/rc/21x-c04-slider-m3-repairs-source-qualification.json","sha256":"75afde9dfa14c1dbd3a031506146bbb96c4006b40e94f3a5a499ddb6bfef7b55","bytes":6094};
const SOURCE_REVIEW={"path":"compatibility/rc/21x-c04-slider-m3-repairs-source-review.json","sha256":"2aed7df6f65661ad75484d3ab0af7cc8d2b444c2b597d75dbbbb006965165ce7","bytes":406098};
const PATCHES={"4550637812dadb67a9af21df261899eaf3f1ae4c":"a23da920b33d5b2848939ed594a1298bcb818322f2a686652b679b20d958f6d0","90b37e5652bad1044dff3c4702aa4b73b715117a":"d12d786ece63cc1e97e30d6711b62dbb644c9f464a895e65ca5ed859f388c201"};
const KIND='individual-historical-slider-m3-repairs-source-review',SCOPE='slider_m3_repairs_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
// Canonical proof identity is immutable; the current physical handler qualifies separately.
const handlerRef={path:HANDLER,sha256:'32bf5b5be5d3c3beb6f1f07f781b0f26368274791b543d5e3e70dfeb14743274',bytes:6532};
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
 assert.ok(start>=0&&end>start&&text.indexOf(marker,start+1)===-1);assert.equal(typeof fn,'function');assert.equal(Reflect.apply(functionText,fn,[]),text.slice(start+7,end+2),'changed loaded button source producer '+name);
}


function sliderM3RepairsProof(row){
 assert.ok(Object.hasOwn(PATCHES,row?.sha));
 return {proof_kind:KIND,diff_sha256:PATCHES[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},
   handler:{...handlerRef},bounded_sass_compiler_cases:14,full_sass_gate_executed:false,source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}

/** Pure metadata comparison; no file reads, process execution or source cache. */
function metadataOk(args){
 try{
  assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);
  const descriptors=Object.getOwnPropertyDescriptors(args),selected={};
  for(const key of ['entry','body','review','proof'])if(Object.hasOwn(descriptors,key)){const d=descriptors[key];assert.ok(Object.hasOwn(d,'value')&&d.enumerable);Object.defineProperty(selected,key,{value:d.value,enumerable:true});}
  const value=plain(selected),{entry,body,review}=value,proof=value.proof===undefined?entry?.individual_proof:value.proof;

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

/** Retain private descriptor snapshots across every supplied source callback. */
function captureArgs(args,fields){
 assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(args),allowed=[...fields,'root','read'];
 for(const key of Reflect.ownKeys(descriptors)){assert.equal(typeof key,'string');assert.ok(allowed.includes(key));assert.ok(Object.hasOwn(descriptors[key],'value')&&descriptors[key].enumerable);}
 const metadata=()=>plain(Object.fromEntries(fields.filter(key=>Object.hasOwn(args,key)).map(key=>[key,Object.getOwnPropertyDescriptor(args,key).value]))),snapshot=metadata();
 const root=Object.hasOwn(descriptors,'root')?descriptors.root.value:ROOT,read=Object.hasOwn(descriptors,'read')?descriptors.read.value:path=>readFileSync(join(root,path));
 assert.equal(typeof root,'string');assert.equal(typeof read,'function');
 const same=()=>{assert.equal(Object.getPrototypeOf(args),Object.prototype);const after=Object.getOwnPropertyDescriptors(args);assert.deepEqual(Reflect.ownKeys(after),Reflect.ownKeys(descriptors));for(const key of Reflect.ownKeys(descriptors)){assert.ok(Object.hasOwn(after[key],'value'));assert.equal(after[key].value,descriptors[key].value);for(const flag of ['enumerable','writable','configurable'])assert.equal(after[key][flag],descriptors[key][flag]);}assert.deepEqual(metadata(),snapshot);};
 return {snapshot,root,read,same};
}
/** One fresh strict whole-report review; no historical source projection/cache. */
function inspectWholeBody({body,root,read}){
 assert.equal(resolve(root),ROOT);
 const source=require('./upstream-slider-m3-repairs-source-review.mjs');
 const {createCurrentSliderSelectorReports}=require('./current-sass-slider-selector-reports.mjs');
 assertLoadedFunction('scripts/current-sass-slider-selector-reports.mjs','createCurrentSliderSelectorReports',createCurrentSliderSelectorReports);
 assertLoadedFunction('scripts/upstream-slider-m3-repairs-source-review.mjs','reviewSliderM3RepairsSource',source.reviewSliderM3RepairsSource);
 const context=createCurrentSliderSelectorReports({root,read});read=context.read;
 assert.deepEqual(context.qualify(handlerRef),currentHandlerRef);
 const bound=[...context.bound,{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,currentHandlerRef,
  ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
 const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed slider-m3-repairs admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
 assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
 const current=source.reviewSliderM3RepairsSource({root,read});
 assert.deepEqual(current.historical_report,JSON.parse(read(SOURCE_REVIEW.path)));
 const assertCurrent=()=>{current.assertCurrent();assertBound();context.assertCurrent();};assertCurrent();
 const refs=[...new Map([...bound,...current.bound].map(ref=>[ref.path,ref])).values()].sort((a,b)=>a.path.localeCompare(b.path));
 return {bound:refs,assertCurrent};
}
function inspectSource(args){
 const {snapshot,root,read,same}=captureArgs(args,['entry','body','review','proof']);
 assert.equal(metadataOk(snapshot),true);
 const source=inspectWholeBody({body:snapshot.body,root,read});source.assertCurrent();same();assert.equal(metadataOk(snapshot),true);return true;
}
/** The canonical owner checks both rows and the fresh source body once. */
function inspectCanonicalSource(args){
 const {snapshot,root,read,same}=captureArgs(args,['entries','body']),{entries,body}=snapshot;
 const assertMetadata=()=>{same();assert.deepEqual(entries.map(entry=>entry.sha),Object.keys(PATCHES));for(const entry of entries)assert.equal(metadataOk({entry,body,review:body.reviews.find(row=>row.sha===entry.sha)}),true);};
 assertMetadata();const source=inspectWholeBody({body,root,read});
 const assertCurrent=()=>{source.assertCurrent();assertMetadata();};assertCurrent();return {bound:structuredClone(source.bound),assertCurrent};
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={SLIDER_M3_REPAIRS_REVIEW:REVIEW,SLIDER_M3_REPAIRS_REVIEW_HASH:REVIEW_HASH,SLIDER_M3_REPAIRS_SHAS:Object.freeze(Object.keys(PATCHES)),
 SLIDER_M3_REPAIRS_PROOF_KIND:KIND,SLIDER_M3_REPAIRS_SCOPE_KEY:SCOPE,sliderM3RepairsProof,metadataOk,sourceOk,inspectSource,inspectCanonicalSource};
