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
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-selector-density-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-selector-density-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='ae07d2cf974c7b52b4644c868811fa47381ca76cc4d635d9eeafbf4d714375ae';
const QUALIFICATION={path:PREFIX+'source-qualification.json',sha256:'78665c894ecc8e77991c0515aa75bbb64a1a0d13536be29a6ef0eadc1c1373da',bytes:3627};
const SOURCE_REVIEW={path:PREFIX+'source-review.json',sha256:'a14eb5cd3a75a1a8ce6de86c6b8988f55112c33766813a259174a73b4d037df1',bytes:165835};
const PATCHES={"999029aa5a23e9577503775c1ea4513e5c3cb4f9":"249c9cc504ffdd33543602ea6736e3d064bb6bb7df3d994d4d41494455fadc5e","4395cdf55a4b08d76aecd2e0378f3079289ce9c0":"a46ce23442183185d6483e3747f9080c4d80b6251db87aa559126a8dbdd75c6b"};
const KIND='individual-historical-selector-density-source-review',SCOPE='selector_density_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
// Canonical proof identity is immutable; the current physical handler qualifies separately.
const handlerRef={path:HANDLER,sha256:'bab5db68548a0cab1d85e848432fb4d766487d61de33362f4cf4ac3849fc1e1f',bytes:5554};
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


function selectorDensityProof(row){
 assert.ok(Object.hasOwn(PATCHES,row?.sha));
 return {proof_kind:KIND,diff_sha256:PATCHES[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},
   handler:{...handlerRef},bounded_sass_compiler_cases:20,full_sass_gate_executed:false,source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
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
  assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,4);assert.equal(body.original_hunks,5);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);
  assert.equal(body.fresh_bounded_sass_compiler_execution,true);assert.equal(body.tagged_reference_sass_executed,true);assert.equal(body.reviewed_after_selector_mixin_sass_executed,true);assert.equal(body.upstream_typescript_tests_or_workflows_executed,false);assert.equal(body.full_sass_gate_executed,false);assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.ok(Object.hasOwn(PATCHES,entry.sha));
  const row=body.reviews.find(value=>value.sha===entry.sha);assert.deepEqual(review,row);
  assert.equal(row.status,'reviewed');assert.equal(row.source_review_complete,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.reason,row.decision);assert.ok(row.decision.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);
  assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,PATCHES[entry.sha]);
  assert.deepEqual(proof,selectorDensityProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
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
 const source=require('./upstream-selector-density-source-review.mjs');
 const {createCurrentSliderSelectorReports}=require('./current-sass-slider-selector-reports.mjs');
 assertLoadedFunction('scripts/current-sass-slider-selector-reports.mjs','createCurrentSliderSelectorReports',createCurrentSliderSelectorReports);
 assertLoadedFunction('scripts/upstream-selector-density-source-review.mjs','reviewSelectorDensitySource',source.reviewSelectorDensitySource);
 const context=createCurrentSliderSelectorReports({root,read});read=context.read;
 assert.deepEqual(context.qualify(handlerRef),currentHandlerRef);
 const bound=[...context.bound,{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,currentHandlerRef,
  ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
 const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed selector-density admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
 assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
 const current=source.reviewSelectorDensitySource({root,read});
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
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={SELECTOR_DENSITY_REVIEW:REVIEW,SELECTOR_DENSITY_REVIEW_HASH:REVIEW_HASH,SELECTOR_DENSITY_SHAS:Object.freeze(Object.keys(PATCHES)),
 SELECTOR_DENSITY_PROOF_KIND:KIND,SELECTOR_DENSITY_SCOPE_KEY:SCOPE,selectorDensityProof,metadataOk,sourceOk,inspectSource};
