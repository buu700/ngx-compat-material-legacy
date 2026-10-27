/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One reviewed token-build decision; metadata and fresh source checks stay separate. */
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync,lstatSync,realpathSync}=require('node:fs');
const {join,resolve}=require('node:path');
const {gunzipSync}=require('node:zlib');
const {isDeepStrictEqual}=require('node:util');
const SHA='7ed70fe4422e4324ea450604514337fa5e0ad880';
const KIND='individual-owned-mdc-token-validation';
const REVIEW='compatibility/rc/21x-c04-token-test-build-individual-review.json';
const REVIEW_HASH='75538ffd743d23a417a8e7a91f5d15acb5db6858a335078a3d264426f40a65a8';
const QUALIFICATION='compatibility/rc/21x-c04-token-test-build-source-qualification.json';
const QUALIFICATION_HASH='5c4c47bc80a1b1e6b5f52a71e9c5167be841f57c1d1bf1d15a600f1d827a442c';
const DIFF='fc9af813f253527709e843280bd5d51ca160ed5f1b37b80b95be30413d9b593d';
const ROOT=resolve(__dirname,'..'),hash=raw=>createHash('sha256').update(raw).digest('hex');
function regular(root,path){
  assert.ok(typeof path==='string'&&!path.includes('\\')&&!path.startsWith('/'));
  const parts=path.split('/');assert.ok(parts.every(part=>part&&part!=='.'&&part!=='..'));
  let file=root;assert.ok(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink());
  for(const part of parts){file=join(file,part);assert.equal(lstatSync(file).isSymbolicLink(),false);}
  assert.equal(lstatSync(file).isFile(),true);return readFileSync(file);
}
const defaultRead=path=>regular(ROOT,path),measurements=new WeakMap();
function requiresTokenBuildScope(entry,proof){
  return entry?.sha===SHA||[proof,entry?.individual_proof].some(value=>value?.proof_kind===KIND||value?.mdc_token_source_scope!==undefined);
}
function tokenBuildProof(body){
  assert.equal(body.sha,SHA);assert.equal(body.line,'21.x');
  return {proof_kind:KIND,diff_sha256:DIFF,review_depth:'individual-compatibility',affected_branches:['21.x'],decision:body.decision,
    mdc_token_source_scope:{sha:SHA,review:{path:REVIEW,sha256:REVIEW_HASH},qualification:{path:QUALIFICATION,sha256:QUALIFICATION_HASH},
      source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}
/** Pure scope/completion metadata; no filesystem reads or compiler execution. */
function tokenBuildMetadataOk({entry,body,review=body,proof}={}){
  try{
    assert.equal(entry.sha,SHA);assert.equal(body.sha,SHA);assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');
    assert.equal(body.source_review_complete,true);assert.equal(body.source_scope_only,true);
    assert.equal(body.proposed_final_disposition,'already-adapted');assert.equal(body.diff_sha256,DIFF);assert.equal(hash(body.diff),DIFF);
    assert.ok(isDeepStrictEqual(body,review));assert.equal(entry.evidence_report,REVIEW);
    assert.equal(entry.final_disposition,'already-adapted');assert.equal(entry.review_depth,'individual-compatibility');
    assert.equal(entry.reason,body.decision);assert.equal(entry.g11_claim,'not-passed');
    assert.deepEqual(entry.affected_branches,['21.x']);assert.deepEqual(entry.files,body.frozen_seed_paths);
    const expected=tokenBuildProof(body);assert.deepEqual(entry.individual_proof,expected);
    if(proof!==undefined)assert.deepEqual(proof,expected);
    assert.equal(body.g11_claim,'not-passed');assert.equal(body.g13_claim,'not-passed');return true;
  }catch{return false;}
}
function inspectTokenBuildSource({root=ROOT,read=root===ROOT?defaultRead:path=>regular(root,path)}={}){
  const bound=new Map();
  function member(ref){
    const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed token-build input '+ref.path);
    if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;
  }
  const body=JSON.parse(member({path:REVIEW,sha256:REVIEW_HASH}));
  const qualification=JSON.parse(member({path:QUALIFICATION,sha256:QUALIFICATION_HASH}));
  assert.equal(qualification.individual_review.path,REVIEW);assert.equal(qualification.individual_review.sha256,REVIEW_HASH);
  assert.equal(qualification.actual_Python_methods_passed,2);assert.equal(qualification.repeat_measurement_identical,true);
  for(const ref of qualification.code_subjects)member(ref);member(qualification.actual_Python_unit);
  const original=JSON.parse(gunzipSync(member(body.originals)));
  const commit=Buffer.from(original.raw_commit);assert.equal(createHash('sha1').update('commit '+commit.length+'\0').update(commit).digest('hex'),SHA);
  assert.equal(original.diff,body.diff);assert.equal(hash(original.diff),DIFF);
  assert.deepEqual(original.sections.map(row=>row.path),body.full_original_paths);assert.equal(original.sections.length,4);
  const hunks=original.sections.flatMap(section=>section.hunks.map(row=>({path:section.path,index:row.index,hash:row.sha256})));
  assert.equal(hunks.length,6);assert.equal(body.complete_original_hunk_reviews.length,6);
  body.complete_original_hunk_reviews.forEach((row,index)=>assert.deepEqual(
    {path:row.path,index:row.hunk_index,hash:row.hunk_sha256},hunks[index]));
  const lock=JSON.parse(member(body.lock_review));assert.equal(lock.changed_lock_record_count,50);assert.equal(lock.changed_record_dependency_edges,402);
  assert.equal(lock.all_changed_records_match_authentic_reference_environment_lock,true);member(lock.reference_lock);
  const controls=JSON.parse(member(body.actual_compiler_controls));assert.equal(controls.rejection_controls,11);
  assert.equal(controls.actual_Sass_slot_faults_rejected,4);assert.equal(controls.repeat_measurement_identical,true);
  const scopeRaw=member(body.actual_compiler_scope),scope=JSON.parse(scopeRaw);
  assert.equal(scope.reference_cases,19);assert.equal(scope.original_changed_contracts_present,2);assert.equal(scope.compiled.css_bytes,0);
  assert.equal(scope.recorded_vendor_members_matched,119);assert.equal(scope.consumer_archived_import_negative.result,'pass');
  assert.equal(scope.full_651_Sass_rendered_packed_native_floor_or_audit_qualified,false);
  for(const ref of [...scope.input_members,scope.producer])member(ref);
  const assertCurrent=()=>{for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late token-build input '+ref.path);assert.equal(raw.length,ref.bytes);}};
  assertCurrent();return {body,scope,scopeHash:hash(scopeRaw),bound:structuredClone([...bound.values()]),assertCurrent};
}
function tokenBuildSourceOk(args={}){
  try{
    assert.equal(tokenBuildMetadataOk(args),true);
    const root=args.root??ROOT,read=args.read??(root===ROOT?defaultRead:path=>regular(root,path));
    const inspected=inspectTokenBuildSource({root,read});assert.deepEqual(args.body,inspected.body);
    const prior=measurements.get(read),rootId=realpathSync(root);
    if(!prior||prior.root!==rootId||prior.scopeHash!==inspected.scopeHash){
      // Source audit runs in the pinned Node24 workspace. Lazy loading keeps
      // unrelated metadata-only fixtures independent of the Sass runtime.
      const {measureOwnedMdcTokenSlots}=require('./measure-owned-mdc-token-slots.mjs');
      assert.deepEqual(measureOwnedMdcTokenSlots({root:rootId,read}),inspected.scope,'fresh token-slot measurement differs');
      measurements.set(read,{root:rootId,scopeHash:inspected.scopeHash});
    }
    inspected.assertCurrent();return true;
  }catch{return false;}
}
module.exports={TOKEN_BUILD_SHA:SHA,TOKEN_BUILD_REVIEW:REVIEW,requiresTokenBuildScope,tokenBuildProof,tokenBuildMetadataOk,inspectTokenBuildSource,tokenBuildSourceOk,
  metadataOk:tokenBuildMetadataOk,sourceOk:tokenBuildSourceOk};
