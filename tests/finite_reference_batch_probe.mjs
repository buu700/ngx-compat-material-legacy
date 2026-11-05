/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 *
 * Actual finite tool-reference fixture controls; no product-owner admission.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const [root,group]=process.argv.slice(2);
assert.ok(root&&['semantics','freshness','reentry'].includes(group));
const {currentSassToolReferenceSubject}=await import(pathToFileURL(join(process.cwd(),'scripts/current-sass-tool-references.mjs')));
const {composeCanonicalSourceGuards}=await import(pathToFileURL(join(process.cwd(),'scripts/canonical-source-guard-plan.mjs')));
const DRIFT=Buffer.from('\n// finite reference batch probe drift\n');
const disk=path=>readFileSync(join(root,path));
const sourceRows=()=>source.transitions;
let callbackCount=0,readsByPath=new Map(),overrideRead=null,onCallback=()=>{};
const read=path=>{
  callbackCount++;readsByPath.set(path,(readsByPath.get(path)||0)+1);
  const raw=disk(path),value=overrideRead?overrideRead(path,raw):raw;
  onCallback(path,value);
  return value;
};
const source=currentSassToolReferenceSubject({root,read});
const transitions=sourceRows();
assert.ok(transitions.length>=2,'fixture requires actual finite source transitions');
const [first,second]=transitions.filter((row,index,array)=>array.findIndex(other=>other.path===row.path)===index).slice(0,2);
assert.ok(first&&second&&first.path!==second.path);
const before=row=>({path:row.path,...row.before});
const after=row=>({path:row.path,...row.after});
const assertThrows=fn=>assert.throws(fn);
const rejectTarget=(fn,path)=>assert.throws(fn,error=>error?.code==='ERR_ASSERTION'&&error.message.includes(path));
const reset=()=>{callbackCount=0;readsByPath=new Map();overrideRead=null;onCallback=()=>{};};
const restore=(path,raw)=>{
  const now=disk(path);
  if(now.equals(raw))return;
  assert.ok(now.equals(Buffer.concat([raw,DRIFT])),'preserving unexpected bytes at '+path);
  writeFileSync(join(root,path),raw);
};
const freshRetry=()=>{source.assertCurrent();assert.deepEqual(source.referenceBatch([{kind:'qualify',reference:before(first)}]),[source.qualify(before(first))]);};

if(group==='semantics'){
  // Stable results agree positionally with the existing public operations.
  const extraRef={...before(first),extra:{label:'retained'}};
  const requests=[
    {kind:'qualify',reference:extraRef},
    {kind:'predecessor',reference:{...after(first),bytes:undefined,extra:{keep:true}}},
    {kind:'comparison',reference:before(first)},
    {kind:'comparison',reference:after(second)},
  ];
  delete requests[1].reference.bytes;
  const expected=[
    source.qualify(extraRef),
    source.predecessorReference(requests[1].reference),
    source.comparisonBytes(before(first)),
    source.comparisonBytes(after(second)),
  ];
  assert.deepEqual(source.referenceBatch(requests),expected);
  assert.equal(source.referenceBatch([{kind:'qualify',reference:{path:'tests/unknown.mjs',sha256:'0'.repeat(64)}}])[0],null);
  assert.throws(()=>source.referenceBatch([{kind:'comparison',reference:{path:'tests/unknown.mjs',sha256:'0'.repeat(64)}}]));

  // Each duplicate request performs its own fresh member callback.
  const duplicate={kind:'comparison',reference:before(first)};
  reset();
  assert.deepEqual(source.referenceBatch([duplicate,duplicate]),[
    source.comparisonBytes(before(first)),source.comparisonBytes(before(first)),
  ]);
  const targetReads=callbackCount; // batch plus two independent comparison baselines
  assert.equal(targetReads,4);
  reset();
  const duplicateResults=source.referenceBatch([duplicate,duplicate]);
  assert.equal(readsByPath.get(first.path),2,'duplicate targets were served from a prior batch cache');
  assert.ok(Buffer.isBuffer(duplicateResults[0])&&Buffer.isBuffer(duplicateResults[1]));
  assert.notStrictEqual(duplicateResults[0],duplicateResults[1],'comparison results must be fresh Buffers');

  // The full request array is validated before any reader callback.
  reset();
  assertThrows(()=>source.referenceBatch([
    {kind:'comparison',reference:before(first)},
    {kind:'comparison',reference:before(second),extra:true},
  ]));
  assert.equal(callbackCount,0,'invalid later request allowed an earlier callback');
  assertThrows(()=>source.referenceBatch([]));
  assertThrows(()=>source.referenceBatch([,]));
  assertThrows(()=>source.referenceBatch([{kind:'unknown',reference:before(first)}]));
  assert.equal(callbackCount,0,'invalid batch shape emitted a callback');
  assertThrows(()=>source.referenceBatch([
    {kind:'qualify',reference:before(first)},
    {kind:'comparison',reference:{...before(second),bytes:second.before.bytes+1}},
  ]));
  assert.equal(callbackCount,0,'invalid later owned size allowed an earlier callback');
  let getters=0;
  const accessor={kind:'comparison',get reference(){getters++;return before(first);}};
  assertThrows(()=>source.referenceBatch([accessor]));assert.equal(getters,0);
  const proxy=new Proxy(before(first),{get(){throw Error('proxy getter ran');}});
  assertThrows(()=>source.referenceBatch([{kind:'qualify',reference:proxy}]));
  assert.equal(callbackCount,0,'accessor or proxy input emitted a callback');
  const unknownIdentity={...before(first),sha256:'0'.repeat(64)};
  assert.deepEqual(source.referenceBatch([{kind:'qualify',reference:unknownIdentity},{kind:'predecessor',reference:unknownIdentity}]),[null,null]);
  assertThrows(()=>source.referenceBatch([{kind:'comparison',reference:unknownIdentity}]));
  source.assertCurrent();
  console.log(JSON.stringify({result:'pass',group,actual_tool_reference_subject:true,positionwise_existing_operation_conformance:true,
    unknown_side_null:true,unknown_comparison_throws:true,duplicate_target_fresh_reads:2,all_inputs_validated_before_callbacks:true,
    product_owner_or_admission_claim:false,g11_claim:'not-passed'}));
}else if(group==='freshness'){
  // A pre-existing cold fault is rejected before the first supplied callback.
  const coldPath=source.bound[0].path,coldRaw=disk(coldPath);
  reset();writeFileSync(join(root,coldPath),Buffer.concat([coldRaw,DRIFT]));
  onCallback=()=>restore(coldPath,coldRaw);
  try{rejectTarget(()=>source.referenceBatch([{kind:'comparison',reference:before(first)}]),coldPath);assert.equal(callbackCount,0,'cold batch fault reached callback');}
  finally{restore(coldPath,coldRaw);reset();}
  freshRetry();reset();

  // A forged supplied Buffer is rejected on the real target path.
  let forgedReached=0;
  overrideRead=(path,raw)=>{if(path===first.path){forgedReached++;return Buffer.concat([raw,DRIFT]);}return raw;};
  rejectTarget(()=>source.referenceBatch([{kind:'comparison',reference:before(first)}]),first.path);
  assert.ok(forgedReached>0);reset();source.assertCurrent();reset();

  let nonbufferReached=0;
  overrideRead=(path,raw)=>{if(path===first.path){nonbufferReached++;return {forged:true};}return raw;};
  rejectTarget(()=>source.referenceBatch([{kind:'comparison',reference:before(first)}]),first.path);
  assert.ok(nonbufferReached>0);reset();source.assertCurrent();reset();

  // A callback that returns the correct bytes but mutates its own physical file
  // must be caught by the real physical post-callback policy.
  const targetRaw=disk(first.path);let sameCallbackReached=0;
  onCallback=(path,raw)=>{if(path===first.path){sameCallbackReached++;writeFileSync(join(root,path),Buffer.concat([raw,DRIFT]));}};
  try{rejectTarget(()=>source.referenceBatch([{kind:'comparison',reference:before(first)}]),first.path);assert.ok(sameCallbackReached>0);}
  finally{restore(first.path,targetRaw);reset();}
  source.assertCurrent();reset();

  // The last request callback changes an earlier target; the batch's post-last
  // input/physical pass must reject the entire result.
  const earlierRaw=disk(first.path);let laterReached=0;
  onCallback=(path)=>{if(path===second.path){laterReached++;writeFileSync(join(root,first.path),Buffer.concat([earlierRaw,DRIFT]));}};
  try{
    rejectTarget(()=>source.referenceBatch([
      {kind:'comparison',reference:before(first)},
      {kind:'comparison',reference:before(second)},
    ]),first.path);
    assert.ok(laterReached>0,'later request callback was not reached');
  }finally{restore(first.path,earlierRaw);reset();}
  source.assertCurrent();

  console.log(JSON.stringify({result:'pass',group,actual_tool_reference_subject:true,cold_rejected_before_callback:true,
    forged_provided_bytes_rejected:true,nonbuffer_provided_value_rejected:true,same_callback_physical_mutation_rejected:true,
    late_earlier_target_mutation_rejected_after_later_request:true,clean_retry:true,
    product_owner_or_admission_claim:false,g11_claim:'not-passed'}));
}else{
  // Mutating caller input from the final target callback must be detected after
  // that callback; no assertion is performed inside the callback.
  const inputs=[
    {kind:'comparison',reference:{...before(first),extra:{value:'before'}}},
    {kind:'comparison',reference:before(second)},
  ];
  let lastReached=0;
  onCallback=path=>{if(path===second.path){lastReached++;inputs[0].reference.extra.value='after';}};
  assert.throws(()=>source.referenceBatch(inputs),error=>error?.code==='ERR_ASSERTION'&&error.message.includes('changed reference batch input'));
  assert.ok(lastReached>0,'last request callback was not reached');
  inputs[0].reference.extra.value='before';reset();source.assertCurrent();reset();

  // Both batch reentry and reentry into the same actual whole guard fail before
  // nested callbacks. The outer batch then succeeds and releases its lock.
  const req=[{kind:'comparison',reference:before(first)}];
  const alternate=composeCanonicalSourceGuards(Object.freeze([source.guardNode]));
  const nestedErrors=[];let ownsInsideBatch=false,nestedDelta=null,inside=false,entered=false;
  onCallback=path=>{
    if(path===first.path&&!inside){
      entered=true;inside=true;const beforeCalls=callbackCount;
      const incoming=before(first);
      for(const operation of [
        ()=>source.referenceBatch(req),
        ()=>source.qualify(incoming),
        ()=>source.predecessorReference(after(first)),
        ()=>source.comparisonBytes(incoming),
        ()=>source.assertCurrent(),
        ()=>alternate(),
      ])try{operation();nestedErrors.push(null);}catch(error){nestedErrors.push(error);}
      ownsInsideBatch=source.ownsReference(incoming);
      nestedDelta=callbackCount-beforeCalls;inside=false;
    }
  };
  source.referenceBatch(req);
  assert.ok(entered);assert.equal(nestedErrors.length,6);
  assert.ok(nestedErrors.every(Boolean),'a public entry or alternate whole guard escaped the batch lock');
  assert.ok(nestedErrors[0].message.includes('reentrant current tool reference batch'));
  assert.ok(nestedErrors[1].message.includes('reentrant current tool reference batch'));
  assert.ok(nestedErrors[2].message.includes('reentrant current tool reference batch'));
  assert.ok(nestedErrors[3].message.includes('reentrant current tool reference batch'));
  assert.equal(nestedDelta,0,'nested work invoked another supplied callback');
  assert.equal(ownsInsideBatch,true,'pure ownsReference should remain available during a batch');
  reset();source.assertCurrent();assert.deepEqual(source.referenceBatch(req),[source.comparisonBytes(before(first))]);

  // A provided reader exception retains identity; finally clears the batch lock.
  const sentinel=new Error('reference batch reader sentinel');let exceptionReached=false;
  overrideRead=(path,raw)=>{if(path===first.path){exceptionReached=true;throw sentinel;}return raw;};
  assert.throws(()=>source.referenceBatch(req),error=>error===sentinel);
  assert.ok(exceptionReached);reset();source.assertCurrent();
  assert.deepEqual(source.referenceBatch(req),[source.comparisonBytes(before(first))]);
  console.log(JSON.stringify({result:'pass',group,actual_tool_reference_subject:true,
    input_mutation_rechecked_after_last_callback:true,batch_and_public_operation_reentry_before_nested_callbacks:6,
    pure_owns_reference_available_during_batch:true,provided_exception_identity_and_clean_retry:true,
    product_owner_or_admission_claim:false,g11_claim:'not-passed'}));
}
