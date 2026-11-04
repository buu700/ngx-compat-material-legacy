/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Four individually reviewed historical source exclusions; no product-execution credit. */
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync,lstatSync,realpathSync}=require('node:fs');
const {join,resolve,relative,isAbsolute}=require('node:path');
const {gunzipSync}=require('node:zlib');
const {isDeepStrictEqual}=require('node:util');
const ROOT=resolve(__dirname,'..'),PREFIX='compatibility/rc/21x-c04-modern-control-base-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='dd9e250915aa5ccdc39f493c403613e9b6f05448799ca0a737f0508375a49aab';
const QUALIFICATION=PREFIX+'source-qualification.json',QUALIFICATION_HASH='37fd4c07bf0fe076897a55fd8e4544fa5e12039c924464380896de79e9aa4547';
const KIND='individual-historical-modern-control-base-source-exclusion';
const DIFFS={
  "68096ec9d34aae793a7b3037c39e6ae7d1700933": "16e3ff75df342311656648326f9e5aa4f9fc19d8391d460c40f9b580d672f642",
  "c572dc4bf4d48448699288aeac2be14db0186a86": "813420724a45abd5cc3982d4db07391af9fd558a3cbf7a532db2528a4bf5d86a",
  "65c97170d2b3d239fda25bd049ec417e0098fe12": "65d3250f016b9e35873727332da675223792e1899c074472a7d8732c0be5b521",
  "7c16cc8b659133167f1b875dcfe77ca806bfe876": "0139f239b65589c13942129a1d46bfc82be32c5ea036732ffb870208051e0ff0"
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
function controlProof(row){
 assert.ok(Object.hasOwn(DIFFS,row.sha));assert.equal(row.diff_sha256,DIFFS[row.sha]);
 return {proof_kind:KIND,diff_sha256:DIFFS[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  modern_control_base_source_scope:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},qualification:{path:QUALIFICATION,sha256:QUALIFICATION_HASH},
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
  assert.deepEqual(entry.individual_proof,controlProof(row));if(proof!==undefined)assert.deepEqual(proof,entry.individual_proof);
  for(const node of [entry,body,row])assert.equal(node.g11_claim,'not-passed');assert.equal(row.g13_claim,'not-passed');return true;
 }catch{return false;}
}
function inspectControlSource({root=ROOT,read=root===ROOT?defaultRead:path=>regular(root,path)}={}){
 const {spinnerSnackC04Source}=require('./sass-spinner-snack-c04-source.mjs');
 const c04=spinnerSnackC04Source({root,read}),bound=new Map(c04.bound.map(ref=>[ref.path,ref]));
 const member=incoming=>{const ref=c04.qualify(incoming),raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed modern-control input '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;};
 const body=JSON.parse(member({path:REVIEW,sha256:REVIEW_HASH})),qualification=JSON.parse(member({path:QUALIFICATION,sha256:QUALIFICATION_HASH}));
 assert.equal(qualification.individual_review.sha256,REVIEW_HASH);assert.equal(qualification.complete_original_SHA_reviews,4);assert.equal(qualification.original_hunks,17);
 for(const ref of [...qualification.code_subjects,qualification.actual_Python_unit,...qualification.actual_line_controls,qualification.original_acquisition])member(ref);
 const original=JSON.parse(gunzipSync(member(body.originals)));assert.deepEqual(original.reviews.map(row=>row.sha),Object.keys(DIFFS));
 assert.equal(original.tagged_reference.members.length,17);
 for(const [index,row]of original.reviews.entries()){
  const raw=Buffer.from(row.raw_commit);assert.equal(createHash('sha1').update('commit '+raw.length+'\0').update(raw).digest('hex'),row.sha);
  assert.equal(hash(row.diff),DIFFS[row.sha]);const review=body.reviews.find(value=>value.sha===row.sha);assert.equal(row.diff,review.diff);
  const hunks=row.sections.flatMap(section=>section.hunks.map(h=>({path:section.path,index:h.index,sha256:h.sha256})));assert.equal(hunks.length,index===3?5:4);
  assert.deepEqual(review.complete_original_hunk_reviews.map(h=>({path:h.path,index:h.hunk_index,sha256:h.hunk_sha256})),hunks);
  for(const ref of review.owned_context)member(ref);
 }
 const scopeRef=body.actual_line_scopes.find(ref=>ref.path===PREFIX+'measurement-21x.json');assert.ok(scopeRef);
 const scopeRaw=member(scopeRef),scope=JSON.parse(scopeRaw);assert.equal(scope.line,'21.x');assert.equal(scope.result,'pass');
 assert.equal(scope.public_legacy_default_CSS_cases.length,12);assert.equal(scope.direct_original_legacy_color_cases.length,4);assert.equal(scope.post16_base_exports_absent.length,4);
 for(const ref of [...scope.input_members,...scope.loaded_sources,scope.producer])member(ref);
 const assertCurrent=()=>{c04.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late modern-control input '+ref.path);assert.equal(raw.length,ref.bytes);}};
 assertCurrent();return {body,scope,scopeHash:hash(scopeRaw),c04,bound:[...bound.values()],assertCurrent};
}
function sourceOk(args={}){
 try{
  const {captureSpinnerSnackC04Metadata}=require('./sass-spinner-snack-c04-source.mjs');
  const metadata=()=>captureSpinnerSnackC04Metadata(args,['entry','body','review','proof','root']),snapshot=metadata();
  assert.equal(metadataOk(args),true);const root=args.root??ROOT,read=args.read??(root===ROOT?defaultRead:path=>regular(root,path));
  const inspected=inspectControlSource({root,read});assert.deepEqual(snapshot.body,inspected.body);const rootId=realpathSync(root),previous=measurements.get(read);
  if(!previous||previous.root!==rootId||previous.scopeHash!==inspected.scopeHash){
   const {measureLegacyThemeRetention}=require('./measure-legacy-theme-retention.mjs');
   const {assertSpinnerSnackRetentionSuccessor}=require('./sass-spinner-snack-c04-source.mjs');
   assertSpinnerSnackRetentionSuccessor({historical:inspected.scope,current:measureLegacyThemeRetention({root:rootId}),source:inspected.c04});measurements.set(read,{root:rootId,scopeHash:inspected.scopeHash});
  }
  inspected.assertCurrent();assert.deepEqual(metadata(),snapshot);assert.equal(metadataOk(args),true);assert.deepEqual(args.body,inspected.body);assert.deepEqual(metadata(),snapshot);return true;
 }catch{return false;}
}
module.exports={CONTROL_SHAS:Object.keys(DIFFS),CONTROL_REVIEW:REVIEW,controlProof,metadataOk,inspectControlSource,sourceOk};
