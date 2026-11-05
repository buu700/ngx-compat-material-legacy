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
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-button-token-repairs-admission.cjs';
const PREFIX='compatibility/rc/21x-c04-button-token-repairs-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='981a9a1cf22c7be0c35aa8fc6b4045ddbdca96e5dc60173074f6cfdf2f1050eb';
const QUALIFICATION={path:PREFIX+'source-qualification.json',sha256:'7c6719c97a31001ba91af1305d73dba2665ba2f188de6c0cefe06b96b7366209',bytes:4523};
const SOURCE_REVIEW={path:PREFIX+'source-review.json',sha256:'cf2ec51ab6fd7cf98e718909940cb75ca6aaad2687bcc0544bd544dadc9ce38f',bytes:853841};
const PATCHES={"1de6a3aa37118e4153fb995a8c8f4daecdf6d0b5":"3d64bbeb9cb7f65c9f8c7d8b3ee460795678a078ffcd07cbe06234d33b121415","702ccbe01446502f43e6e7cb365a587ee7558504":"4874b274861e134e506402a41163219e02a3a673967479bc0655e4ec15d2df0b"};
const KIND='individual-historical-button-token-repairs-source-review',SCOPE='button_token_repairs_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename);
// Canonical proofs continue to identify the frozen historical handler.
const handlerRef={path:HANDLER,sha256:'f37a4d04ad26be0a761a9815acf3de1d08fc32c90a057becb0745577ad49a437',bytes:6221};
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
function request(args,keys){
 assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(args),allowed=[...keys,'root','read'];
 for(const key of Reflect.ownKeys(descriptors)){assert.equal(typeof key,'string');assert.ok(allowed.includes(key));assert.ok(Object.hasOwn(descriptors[key],'value')&&descriptors[key].enumerable);}
 const metadata=()=>{const out={};for(const key of keys)if(Object.hasOwn(args,key)){const d=Object.getOwnPropertyDescriptor(args,key);assert.ok(Object.hasOwn(d,'value'));Object.defineProperty(out,key,{value:d.value,enumerable:true});}return plain(out);};
 const snapshot=metadata(),root=Object.hasOwn(descriptors,'root')?descriptors.root.value:ROOT,read=Object.hasOwn(descriptors,'read')?descriptors.read.value:path=>readFileSync(join(root,path));
 assert.equal(typeof root,'string');assert.equal(typeof read,'function');
 const same=()=>{assert.equal(Object.getPrototypeOf(args),Object.prototype);const after=Object.getOwnPropertyDescriptors(args);assert.deepEqual(Reflect.ownKeys(after),Reflect.ownKeys(descriptors));for(const key of Reflect.ownKeys(descriptors)){assert.ok(Object.hasOwn(after[key],'value'));assert.equal(after[key].value,descriptors[key].value);for(const flag of ['enumerable','writable','configurable'])assert.equal(after[key][flag],descriptors[key][flag]);}assert.deepEqual(metadata(),snapshot);};
 return {snapshot,root,read,same};
}
function assertLoadedFunction(path,name,fn){
 const text=readFileSync(join(ROOT,path),'utf8'),marker='export function '+name+'(',start=text.indexOf(marker),end=text.indexOf('\n}\n',start);
 assert.ok(start>=0&&end>start&&text.indexOf(marker,start+1)===-1);assert.equal(typeof fn,'function');assert.equal(Reflect.apply(functionText,fn,[]),text.slice(start+7,end+2),'changed loaded button repair producer '+name);
}

function buttonTokenRepairsProof(row){
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
  assert.deepEqual(proof,buttonTokenRepairsProof(row));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}

/** One fresh whole-body review; no caller-supplied source result or success cache. */
function inspectWholeBody({body,root,read}){
 const source=require('./upstream-button-token-repairs-source-review.mjs');
 const {spinnerSnackC04Source}=require('./sass-spinner-snack-c04-source.mjs');
 assert.equal(resolve(root),ROOT);
 assertLoadedFunction('scripts/sass-spinner-snack-c04-source.mjs','spinnerSnackC04Source',spinnerSnackC04Source);
 assertLoadedFunction('scripts/upstream-button-token-repairs-source-review.mjs','reviewButtonTokenRepairsSource',source.reviewButtonTokenRepairsSource);
 const c04=spinnerSnackC04Source({root,read});assert.deepEqual(c04.qualify(handlerRef),currentHandlerRef);
 const bound=[{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,currentHandlerRef,
  ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))];
 const assertBound=()=>{for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed button token-repair admission subject '+ref.path);if(ref.bytes===undefined)ref.bytes=raw.length;else assert.equal(raw.length,ref.bytes);}};
 assertBound();assert.deepEqual(JSON.parse(read(REVIEW)),body);
 const current=source.reviewButtonTokenRepairsSource({root,read});
 assert.deepEqual(current.historical_report,JSON.parse(read(SOURCE_REVIEW.path)));
 const assertCurrent=()=>{current.assertCurrent();assertBound();c04.assertCurrent();current.assertCurrent();};assertCurrent();
 const union=new Map();for(const ref of [...bound,...current.bound]){if(union.has(ref.path))assert.deepEqual(union.get(ref.path),ref);else union.set(ref.path,ref);}
 return {bound:structuredClone([...union.values()].sort((a,b)=>a.path.localeCompare(b.path))),assertCurrent};
}
/** Actual root admission remains fresh for each individual SHA. */
function inspectSource(args){
 const captured=request(args,['entry','body','review','proof']),{entry,body,review,proof}=captured.snapshot,{root,read}=captured;
 assert.equal(metadataOk({entry,body,review,proof}),true);
 const source=inspectWholeBody({body,root,read});source.assertCurrent();captured.same();source.assertCurrent();captured.same();return true;
}
/** The canonical owner proves both metadata rows and the whole source body once. */
function inspectCanonicalSource(args){
 const captured=request(args,['entries','body']),{entries,body}=captured.snapshot,{root,read}=captured;
 assert.deepEqual(entries.map(entry=>entry.sha),Object.keys(PATCHES));
 for(const entry of entries)assert.equal(metadataOk({entry,body,review:body.reviews.find(row=>row.sha===entry.sha)}),true);
 const source=inspectWholeBody({body,root,read});
 const assertCurrent=()=>{captured.same();source.assertCurrent();captured.same();source.assertCurrent();captured.same();};assertCurrent();
 return {bound:structuredClone(source.bound),assertCurrent};
}
function sourceOk(args){try{return inspectSource(args)===true;}catch{return false;}}

module.exports={BUTTON_TOKEN_REPAIRS_REVIEW:REVIEW,BUTTON_TOKEN_REPAIRS_REVIEW_HASH:REVIEW_HASH,BUTTON_TOKEN_REPAIRS_SHAS:Object.freeze(Object.keys(PATCHES)),
 BUTTON_TOKEN_REPAIRS_PROOF_KIND:KIND,BUTTON_TOKEN_REPAIRS_SCOPE_KEY:SCOPE,buttonTokenRepairsProof,metadataOk,sourceOk,inspectSource,inspectCanonicalSource};
