/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two individually reviewed historical mixed source decisions; no product-execution credit. */
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync,lstatSync,realpathSync}=require('node:fs');
const {join,resolve,relative,isAbsolute}=require('node:path');
const {gunzipSync}=require('node:zlib');
const {isDeepStrictEqual}=require('node:util');
const ROOT=resolve(__dirname,'..'),PREFIX='compatibility/rc/21x-c04-form-field-tokenization-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='12f0ad55d65abcf545b2ddbf57668c4a08bc21e07df15b93f1711ef61a246337';
const QUALIFICATION=PREFIX+'source-qualification.json',QUALIFICATION_HASH='77124973bb6ae426a797d2d8ead90cbeaa24ff719e4a21c93b0dca794f041172';
const KIND='individual-historical-form-field-tokenization-source-review';
const DIFFS={
  "98f610d192015599d8e0ce1a0f2a455c31ced558": "d0b01dd4cbde36eecec21df4c17f6ab2c16b815952ed2d0707c33ea87a038084",
  "c0b3aa524115e9b2b2b5fabd2e7cec44111b8e0e": "9d811eb66577b7bad35de157025c538219b33b0a46d3ba0ee98d81ee72532305"
};
const DISPOSITIONS={
  "98f610d192015599d8e0ce1a0f2a455c31ced558": "do-not-adopt",
  "c0b3aa524115e9b2b2b5fabd2e7cec44111b8e0e": "already-adapted"
};
const hash=raw=>createHash('sha256').update(raw).digest('hex'),measurements=new WeakMap();
function regular(root,path){
 assert.ok(typeof path==='string'&&!path.includes('\\'));const parts=path.split('/');assert.ok(parts.every(part=>part&&part!=='.'&&part!=='..'));
 const peer=path.match(/^node_modules\/@angular\/(material|cdk)\/(.+)$/);
 let file=root,tail=parts;
 if(peer){file=realpathSync(join(root,'node_modules/@angular',peer[1]));tail=peer[2].split('/');}
 assert.ok(lstatSync(file).isDirectory()&&!lstatSync(file).isSymbolicLink());const base=file;
 for(const part of tail){file=join(file,part);assert.equal(lstatSync(file).isSymbolicLink(),false);}
 const rel=relative(base,realpathSync(file));assert.ok(rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../'));assert.ok(lstatSync(file).isFile());return readFileSync(file);
}
const defaultRead=path=>regular(ROOT,path);
function fieldProof(row){
 assert.ok(Object.hasOwn(DIFFS,row.sha));assert.equal(row.diff_sha256,DIFFS[row.sha]);
 return {proof_kind:KIND,diff_sha256:DIFFS[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  form_field_tokenization_source_scope:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},qualification:{path:QUALIFICATION,sha256:QUALIFICATION_HASH},
   source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}
/** Pure metadata: intentionally no filesystem, environment or compiler reads. */
function metadataOk({entry,body,review,proof}={}){
 try{
  assert.ok(Object.hasOwn(DIFFS,entry.sha));assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.source_review_complete,true);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(DIFFS));const row=body.reviews.find(row=>row.sha===entry.sha);assert.ok(isDeepStrictEqual(row,review));
  assert.equal(row.status,'reviewed');assert.equal(row.line,'21.x');assert.equal(row.source_scope_only,true);assert.equal(row.proposed_final_disposition,DISPOSITIONS[entry.sha]);
  assert.equal(row.diff_sha256,DIFFS[entry.sha]);assert.equal(hash(row.diff),DIFFS[entry.sha]);
  assert.equal(entry.final_disposition,DISPOSITIONS[entry.sha]);assert.equal(entry.review_depth,'individual-compatibility');assert.equal(entry.evidence_report,REVIEW);
  assert.deepEqual(entry.affected_branches,['21.x']);assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.reason,row.decision);
  assert.deepEqual(entry.individual_proof,fieldProof(row));if(proof!==undefined)assert.deepEqual(proof,entry.individual_proof);
  for(const node of [entry,body,row])assert.equal(node.g11_claim,'not-passed');assert.equal(row.g13_claim,'not-passed');return true;
 }catch{return false;}
}
function inspectFieldSource({root=ROOT,read=root===ROOT?defaultRead:path=>regular(root,path)}={}){
 const bound=new Map();
 const member=ref=>{const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed form-field-tokenization input '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;};
 const body=JSON.parse(member({path:REVIEW,sha256:REVIEW_HASH})),qualification=JSON.parse(member({path:QUALIFICATION,sha256:QUALIFICATION_HASH}));
 assert.equal(qualification.individual_review.sha256,REVIEW_HASH);assert.equal(qualification.complete_original_SHA_reviews,2);assert.equal(qualification.original_hunks,32);
 for(const ref of [...qualification.code_subjects,qualification.actual_Python_unit,qualification.retained_failed_development_unit,...qualification.actual_line_controls,...qualification.prior_existing_state_bridge_evidence])member(ref);
 const original=JSON.parse(gunzipSync(member(body.originals))),replay=JSON.parse(gunzipSync(member(body.offline_replay)));
 assert.deepEqual(original.reviews.map(row=>row.sha),Object.keys(DIFFS));assert.deepEqual(original.reviews,replay.reviews);assert.deepEqual(original.tagged_reference,replay.tagged_reference);
 assert.equal(original.tagged_reference.members.length,29);let present=0,absent=0;
 for(const [index,row]of original.reviews.entries()){
  const raw=Buffer.from(row.raw_commit);assert.equal(createHash('sha1').update('commit '+raw.length+'\0').update(raw).digest('hex'),row.sha);
  assert.equal(hash(row.diff),DIFFS[row.sha]);const review=body.reviews.find(value=>value.sha===row.sha);assert.equal(row.diff,review.diff);
  const hunks=row.sections.flatMap(section=>section.hunks.map(h=>({path:section.path,index:h.index,sha256:h.sha256})));assert.equal(hunks.length,index===0?20:12);
  assert.deepEqual(review.complete_original_hunk_reviews.map(h=>({path:h.path,index:h.hunk_index,sha256:h.hunk_sha256})),hunks);
  for(const section of row.sections)for(const value of [section.before,section.after]){
   const raw=Buffer.from(value.body);assert.equal(hash(raw),value.sha256);assert.equal(raw.length,value.bytes);
   if(value.blob==='0'.repeat(40)){assert.equal(value.absent,true);assert.equal(raw.length,0);absent++;}
   else{assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),value.blob);present++;}
  }
  for(const ref of review.owned_context)member(ref);
 }
 assert.equal(present,33);assert.equal(absent,1);
 const scopeRef=body.actual_line_scopes.find(ref=>ref.path===PREFIX+'measurement-21x.json');assert.ok(scopeRef);
 const scopeRaw=member(scopeRef),scope=JSON.parse(scopeRaw);assert.equal(scope.line,'21.x');assert.equal(scope.result,'pass');
 assert.equal(scope.exact_historical_default_CSS_cases.length,5);assert.equal(scope.existing_finite_state_contract_cases.length,6);assert.equal(scope.controlled_original_module_observations.length,4);
 assert.equal(scope.exact_original_typography_recipe_bodies_present_in16.length,4);assert.equal(scope.original_typography_after_matches_untouched16_default,true);
 for(const ref of [...scope.source_input_members,...scope.compiler_loaded_sources,scope.producer])member(ref);
 const assertCurrent=()=>{for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late form-field-tokenization input '+ref.path);assert.equal(raw.length,ref.bytes);}};
 assertCurrent();return {body,scope,scopeHash:hash(scopeRaw),bound:[...bound.values()],assertCurrent};
}
function sourceOk(args={}){
 try{
  assert.equal(metadataOk(args),true);const root=args.root??ROOT,read=args.read??(root===ROOT?defaultRead:path=>regular(root,path));
  const inspected=inspectFieldSource({root,read});assert.deepEqual(args.body,inspected.body);const rootId=realpathSync(root),previous=measurements.get(read);
  if(!previous||previous.root!==rootId||previous.scopeHash!==inspected.scopeHash){
   const {measureFormFieldTokenization}=require('./measure-form-field-tokenization-contracts.mjs');
   assert.deepEqual(measureFormFieldTokenization({root:rootId}),inspected.scope,'fresh form-field-tokenization contract differs');measurements.set(read,{root:rootId,scopeHash:inspected.scopeHash});
  }
  inspected.assertCurrent();return true;
 }catch{return false;}
}
module.exports={FIELD_SHAS:Object.keys(DIFFS),FIELD_REVIEW:REVIEW,FIELD_DISPOSITIONS:DISPOSITIONS,fieldProof,metadataOk,inspectFieldSource,sourceOk};
