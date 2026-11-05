/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Five finite source decisions; no native, packed, floor or full Sass credit. */
'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {join,resolve}=require('node:path');
const {types}=require('node:util');
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-button-tokenization-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-button-tokenization-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='d0ee311891176b215a62b856ade76c77713a4bc9355ec32c0d2cf381af76c160';
const QUALIFICATION={path:PREFIX+'source-qualification.json',sha256:'e2b342e2169aadd31b0cc722f4591028fab6f2aec486ba13d34084115ad42521',bytes:4062};
const SOURCE_REVIEW={path:PREFIX+'source-review.json',sha256:'4fa19472ae965a5fbc097b51ab60f344acd7791909d97221a954a25f89e9463a',bytes:870169};
const PATCHES={"48a988a448200c9ad4a0099e7879b9eff3da0a41":"fc902b3df4880b7ce3e889b964d3c03227e272649d07abb7495eed059848aabe","f2b4a04d5b6d91e2af81610fb5c95945759ad390":"f740abe765835606847e8e9f32023790c1b28a8d356ef11b2699489af727a26a","823c40192915f805132272e15a27230b621c1b77":"fbb8ba4f94fe0101c7cdc80ce54b3beaf33fc34d73f9651076a87d6fdc7d9f99","5c822977dbe77b7db92233a877e26ae7c1bdeaad":"4c8c00cf669c5e9d0c80ef2108bda29b1b075f2ed31182ba0ac877eed35973d5","592307261faf09f9603310a9fb97d1d18bc40f6e":"6fd643b7b34c41a3181c7f1bdc12d9e85d4faf2de5f41cf8f70fae1afe801f9c"};
const KIND='individual-historical-button-tokenization-source-review',SCOPE='button_tokenization_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
// Frozen canonical proof identity remains historical; current bytes qualify separately.
const handlerRef={path:HANDLER,sha256:'914515e0cef3b98721868655f15e10c057320a795cfe48f0cdb5a199ddb71ac4',bytes:5952};
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

function buttonTokenizationProof(row){
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
  assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,5);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(PATCHES));
  assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,18);assert.equal(body.original_hunks,47);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);
  assert.equal(body.fresh_bounded_sass_compiler_execution,true);assert.equal(body.tagged_reference_sass_executed,true);assert.equal(body.upstream_post16_sass_or_typescript_tests_or_workflows_executed,false);assert.equal(body.package_install_or_javascript_runtime_execution,false);assert.equal(body.full_sass_gate_executed,false);assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.ok(Object.hasOwn(PATCHES,entry.sha));
  const row=body.reviews.find(value=>value.sha===entry.sha);assert.deepEqual(review,row);
  assert.equal(row.status,'reviewed');assert.equal(row.source_review_complete,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.reason,row.decision);assert.ok(row.decision.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);
  assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,PATCHES[entry.sha]);
  assert.deepEqual(proof,buttonTokenizationProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}

/** Recompute all original/current source facts on every invocation. */
function inspectSource(args){
  assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);
  const metadata=()=>plain(Object.fromEntries(['entry','body','review','proof'].filter(key=>Object.hasOwn(args,key)).map(key=>[key,Object.getOwnPropertyDescriptor(args,key).value])));
  const descriptors=Object.getOwnPropertyDescriptors(args);
  for(const key of Reflect.ownKeys(descriptors)){assert.equal(typeof key,'string');assert.ok(['entry','body','review','proof','root','read'].includes(key));assert.ok(Object.hasOwn(descriptors[key],'value'));}
  const snapshot=metadata();const {entry,body,review,proof}=snapshot;
  const root=Object.hasOwn(descriptors,'root')?descriptors.root.value:ROOT,read=Object.hasOwn(descriptors,'read')?descriptors.read.value:path=>readFileSync(join(root,path));
  assert.equal(typeof root,'string');assert.equal(typeof read,'function');
  const sameArgs=()=>{assert.equal(Object.getPrototypeOf(args),Object.prototype);const after=Object.getOwnPropertyDescriptors(args);assert.deepEqual(Reflect.ownKeys(after),Reflect.ownKeys(descriptors));for(const key of Reflect.ownKeys(descriptors)){assert.ok(Object.hasOwn(after[key],'value'));assert.equal(after[key].value,descriptors[key].value);for(const flag of ['enumerable','writable','configurable'])assert.equal(after[key][flag],descriptors[key][flag]);}assert.deepEqual(metadata(),snapshot);};
  // Source inspection imports the current ledger owner through its candidate
  // inventory helper; defer it until the owner has finished initializing.
  const source=require('./upstream-button-tokenization-source-review.mjs');
  const {spinnerSnackC04Source}=require('./sass-spinner-snack-c04-source.mjs');
  assert.equal(resolve(root),ROOT);assert.equal(metadataOk({entry,body,review,proof}),true);
  assertLoadedFunction('scripts/sass-spinner-snack-c04-source.mjs','spinnerSnackC04Source',spinnerSnackC04Source);
  assertLoadedFunction('scripts/upstream-button-tokenization-source-review.mjs','reviewButtonTokenizationSource',source.reviewButtonTokenizationSource);
  const c04=spinnerSnackC04Source({root,read});assert.deepEqual(c04.qualify(handlerRef),currentHandlerRef);
  const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,currentHandlerRef,
   ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
  const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed button tokenization admission subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}};
  assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
  const current=source.reviewButtonTokenizationSource({root,read});
  assert.deepEqual(current.historical_report,JSON.parse(read(SOURCE_REVIEW.path)));
  current.assertCurrent();assertBound();c04.assertCurrent();sameArgs();current.assertCurrent();sameArgs();return true;
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={BUTTON_TOKENIZATION_REVIEW:REVIEW,BUTTON_TOKENIZATION_REVIEW_HASH:REVIEW_HASH,BUTTON_TOKENIZATION_SHAS:Object.freeze(Object.keys(PATCHES)),
 BUTTON_TOKENIZATION_PROOF_KIND:KIND,BUTTON_TOKENIZATION_SCOPE_KEY:SCOPE,buttonTokenizationProof,metadataOk,sourceOk,inspectSource};
