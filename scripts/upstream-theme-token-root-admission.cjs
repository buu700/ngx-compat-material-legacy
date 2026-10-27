/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two individually reviewed historical source exclusions; no product-execution credit. */
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync,lstatSync,realpathSync}=require('node:fs');
const {join,resolve,relative,isAbsolute}=require('node:path');
const {gunzipSync}=require('node:zlib');
const {isDeepStrictEqual}=require('node:util');
const ROOT=resolve(__dirname,'..'),PREFIX='compatibility/rc/21x-c04-theme-token-root-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='317e9beb6f0897c89e791de0f5730a29424d577c0c028d480d753060242351cb';
const QUALIFICATION=PREFIX+'source-qualification.json',QUALIFICATION_HASH='7bff7dcf9e9ce6caeb104371d69bd9bef5e42dc1560cd5daa9a1cdc08a2d6008';
const KIND='individual-historical-token-root-source-exclusion';
const DIFFS={
  "408c0b492f5d7edd6571b2287bb06aa89d582758": "8e0c5e9bd21cdcd2381bd2d24919338657d1d24b6ecb7e2107cc974f47466c64",
  "6cc6cf21f292d78c930cbda79c1f337bd6b82bfe": "bf1d28e044178d52352071e2ea88d7bfcaeaeaa4407f96ea34570adacdd29d94"
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
function rootProof(row){
 assert.ok(Object.hasOwn(DIFFS,row.sha));assert.equal(row.diff_sha256,DIFFS[row.sha]);
 return {proof_kind:KIND,diff_sha256:DIFFS[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  theme_token_root_source_scope:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},qualification:{path:QUALIFICATION,sha256:QUALIFICATION_HASH},
   source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}
/** Pure metadata: intentionally no filesystem, environment or compiler reads. */
function metadataOk({entry,body,review,proof}={}){
 try{
  assert.ok(Object.hasOwn(DIFFS,entry.sha));assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.source_review_complete,true);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(DIFFS));const row=body.reviews.find(row=>row.sha===entry.sha);assert.ok(isDeepStrictEqual(row,review));
  assert.equal(row.status,'reviewed');assert.equal(row.line,'21.x');assert.equal(row.source_scope_only,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(row.diff_sha256,DIFFS[entry.sha]);assert.equal(hash(row.diff),DIFFS[entry.sha]);
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.review_depth,'individual-compatibility');assert.equal(entry.evidence_report,REVIEW);
  assert.deepEqual(entry.affected_branches,['21.x']);assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.reason,row.decision);
  assert.deepEqual(entry.individual_proof,rootProof(row));if(proof!==undefined)assert.deepEqual(proof,entry.individual_proof);
  for(const node of [entry,body,row])assert.equal(node.g11_claim,'not-passed');assert.equal(row.g13_claim,'not-passed');return true;
 }catch{return false;}
}
function inspectRootSource({root=ROOT,read=root===ROOT?defaultRead:path=>regular(root,path)}={}){
 const bound=new Map();
 const member=ref=>{const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed token-root input '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;};
 const body=JSON.parse(member({path:REVIEW,sha256:REVIEW_HASH})),qualification=JSON.parse(member({path:QUALIFICATION,sha256:QUALIFICATION_HASH}));
 assert.equal(qualification.individual_review.sha256,REVIEW_HASH);assert.equal(qualification.complete_original_SHA_reviews,2);assert.equal(qualification.original_hunks,8);
 for(const ref of [...qualification.code_subjects,qualification.actual_Python_unit,...qualification.actual_line_controls,qualification.existing_tooltip_context])member(ref);
 const original=JSON.parse(gunzipSync(member(body.originals)));assert.deepEqual(original.reviews.map(row=>row.sha),Object.keys(DIFFS));
 assert.equal(original.tagged_reference.members.length,9);
 for(const [index,row]of original.reviews.entries()){
  const raw=Buffer.from(row.raw_commit);assert.equal(createHash('sha1').update('commit '+raw.length+'\0').update(raw).digest('hex'),row.sha);
  assert.equal(hash(row.diff),DIFFS[row.sha]);const review=body.reviews.find(value=>value.sha===row.sha);assert.equal(row.diff,review.diff);
  const hunks=row.sections.flatMap(section=>section.hunks.map(h=>({path:section.path,index:h.index,sha256:h.sha256})));assert.equal(hunks.length,index===0?5:3);
  assert.deepEqual(review.complete_original_hunk_reviews.map(h=>({path:h.path,index:h.hunk_index,sha256:h.hunk_sha256})),hunks);
  for(const ref of review.owned_context)member(ref);
 }
 const context=JSON.parse(member(body.helper_context));assert.equal(context.contexts.length,5);
 for(const value of context.contexts){const raw=Buffer.from(value.body);assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),value.blob);assert.equal(hash(raw),value.sha256);}
 member(context.producer);
 const scopeRef=body.actual_line_scopes.find(ref=>ref.path===PREFIX+'measurement-21x.json');assert.ok(scopeRef);
 const scopeRaw=member(scopeRef),scope=JSON.parse(scopeRaw);assert.equal(scope.line,'21.x');assert.equal(scope.result,'pass');
 assert.equal(scope.original_module_selector_observations.length,21);assert.equal(scope.original_module_selector_observations.filter(row=>row.observable_token_emission).length,15);
 assert.equal(scope.pre_patch_modern_calls_equal_untouched16_source.length,18);assert.equal(scope.shared_historical_legacy_measurement.public_legacy_default_CSS_cases.length,15);
 const legacy=scope.shared_historical_legacy_measurement;
 for(const ref of [legacy.authentic_reference,legacy.oracle,scope.original,scope.helper_context])member(ref);
 for(const ref of [...scope.source_input_members,...scope.loaded_original_module_dependencies,scope.producer,...legacy.input_members,...legacy.loaded_sources,legacy.producer])member(ref);
 const assertCurrent=()=>{for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late token-root input '+ref.path);assert.equal(raw.length,ref.bytes);}};
 assertCurrent();return {body,scope,scopeHash:hash(scopeRaw),bound:[...bound.values()],assertCurrent};
}
function sourceOk(args={}){
 try{
  assert.equal(metadataOk(args),true);const root=args.root??ROOT,read=args.read??(root===ROOT?defaultRead:path=>regular(root,path));
  const inspected=inspectRootSource({root,read});assert.deepEqual(args.body,inspected.body);const rootId=realpathSync(root),previous=measurements.get(read);
  if(!previous||previous.root!==rootId||previous.scopeHash!==inspected.scopeHash){
   const {measureThemeTokenRoots}=require('./measure-theme-token-root-contracts.mjs');
   assert.deepEqual(measureThemeTokenRoots({root:rootId}),inspected.scope,'fresh token-root contract differs');measurements.set(read,{root:rootId,scopeHash:inspected.scopeHash});
  }
  inspected.assertCurrent();return true;
 }catch{return false;}
}
module.exports={ROOT_SHAS:Object.keys(DIFFS),ROOT_REVIEW:REVIEW,rootProof,metadataOk,inspectRootSource,sourceOk};
