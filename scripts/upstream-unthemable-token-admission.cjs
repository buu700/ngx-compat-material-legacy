/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Five individual source exclusions: pure metadata and fresh Sass remain distinct. */
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync,lstatSync,realpathSync}=require('node:fs');
const {join,resolve,relative,isAbsolute}=require('node:path');
const {gunzipSync}=require('node:zlib');
const {isDeepStrictEqual}=require('node:util');
const ROOT=resolve(__dirname,'..'),PREFIX='compatibility/rc/21x-c04-unthemable-token-placement-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='4e51698a2e4f1aec202677b21c02029f0d43aed0ad63e740f06ace522b92aaf0';
const QUALIFICATION=PREFIX+'source-qualification.json',QUALIFICATION_HASH='6c82277c010b976751a815d094e2b479ca87f6fbb2aacf195ef9f27939186b11';
const RESOLUTION=PREFIX+'tooltip-context-reconciliation.json',RESOLUTION_HASH='700edd40358724b503ded642c818b7ca2d9500fc8604b47e96678a05d5e91044';
const KIND='individual-historical-base-token-source-exclusion';
const DIFFS={
 '03a773a0237843fd1e1e600d0b9911eb924319bc':'e5bda39bf076f86110ad768df51328159044a41bff466039f7e6de2037669d9a',
 '047404067865a2452bfcb93b2374ac07aca319be':'2b19b5f042b200e5ac797241543b363865e9565f84bf727dfdfa801c2ce57c01',
 'ccd2d7fa72f4566ab2c2aeb78a5ac4b7d4149bbf':'035e338969646bbf2f155722fffac924cc034ae37d41374d7531e85c5facda6f',
 '593fc79ecbc6677f04e2d3707bff024b00a517e8':'7842e39d21f89ec17eac312b91a8ee47ceb83fc1579dba8f3c47d669d9233d02',
 '06460d17703ef28a8fc89833c389c479b1ba6bcf':'fd9ccc35586356e90e9a140d0de99369234048bede3eb2059eb0c4d6b981ca51',
};
const hash=raw=>createHash('sha256').update(raw).digest('hex'),measurements=new WeakMap();
function regular(root,path){
 if(/^node_modules\/sass\/(?:package\.json|sass\.node\.js|sass\.dart\.js)$/.test(path))return require('./historical-contract-repair-readers.mjs').readHistoricalContractRepairOwnerMember(root,path);
 assert.ok(typeof path==='string'&&!path.includes('\\'));const parts=path.split('/');assert.ok(parts.every(part=>part&&part!=='.'&&part!=='..'));
 const peer=path.match(/^node_modules\/@angular\/(material|cdk)\/(.+)$/);
 let file=root,tail=parts;
 if(peer){file=realpathSync(join(root,'node_modules/@angular',peer[1]));tail=peer[2].split('/');}
 assert.ok(lstatSync(file).isDirectory()&&!lstatSync(file).isSymbolicLink());const base=file;
 for(const part of tail){file=join(file,part);assert.equal(lstatSync(file).isSymbolicLink(),false);}
 const rel=relative(base,realpathSync(file));assert.ok(rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../'));assert.ok(lstatSync(file).isFile());return readFileSync(file);
}
const defaultRead=path=>regular(ROOT,path);
function unthemedProof(row){
 assert.ok(Object.hasOwn(DIFFS,row.sha));assert.equal(row.diff_sha256,DIFFS[row.sha]);
 return {proof_kind:KIND,diff_sha256:DIFFS[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  unthemable_token_source_scope:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},qualification:{path:QUALIFICATION,sha256:QUALIFICATION_HASH},
   tooltip_context:{path:RESOLUTION,sha256:RESOLUTION_HASH},source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}
/** No filesystem or compiler calls: this is the registered metadata contract. */
function unthemedMetadataOk({entry,body,review,proof}={}){
 try{
  assert.ok(Object.hasOwn(DIFFS,entry.sha));assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.source_review_complete,true);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(DIFFS));const row=body.reviews.find(row=>row.sha===entry.sha);assert.ok(isDeepStrictEqual(row,review));
  assert.equal(row.status,'reviewed');assert.equal(row.line,'21.x');assert.equal(row.source_scope_only,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(row.diff_sha256,DIFFS[entry.sha]);assert.equal(hash(row.diff),DIFFS[entry.sha]);
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.review_depth,'individual-compatibility');assert.equal(entry.evidence_report,REVIEW);
  assert.deepEqual(entry.affected_branches,['21.x']);assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.reason,row.decision);
  assert.deepEqual(entry.individual_proof,unthemedProof(row));if(proof!==undefined)assert.deepEqual(proof,entry.individual_proof);
  for(const node of [entry,body,row])assert.equal(node.g11_claim,'not-passed');assert.equal(row.g13_claim,'not-passed');return true;
 }catch{return false;}
}
function inspectUnthemedSource({root=ROOT,read=root===ROOT?defaultRead:path=>regular(root,path)}={}){
 const {spinnerSnackC04Source}=require('./sass-spinner-snack-c04-source.mjs');
 const c04=spinnerSnackC04Source({root,read}),bound=new Map(c04.bound.map(ref=>[ref.path,ref]));
 const member=ref=>{ref=c04.qualify(ref);const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed token-placement input '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;};
 const body=JSON.parse(member({path:REVIEW,sha256:REVIEW_HASH})),qualification=JSON.parse(member({path:QUALIFICATION,sha256:QUALIFICATION_HASH}));
 assert.equal(qualification.individual_review.sha256,REVIEW_HASH);assert.equal(qualification.complete_original_SHA_reviews,5);assert.equal(qualification.original_hunks,20);
 for(const ref of [...qualification.code_subjects,qualification.actual_Python_unit,qualification.metadata_population_followup.actual_Python_unit,qualification.actual_main_controls])member(ref);
 const original=JSON.parse(gunzipSync(member(body.originals)));assert.deepEqual(original.reviews.map(row=>row.sha),Object.keys(DIFFS));
 assert.equal(original.tagged_reference.members.length,21);
 for(const row of original.reviews){
  const raw=Buffer.from(row.raw_commit);assert.equal(createHash('sha1').update('commit '+raw.length+'\0').update(raw).digest('hex'),row.sha);
  assert.equal(hash(row.diff),DIFFS[row.sha]);const review=body.reviews.find(value=>value.sha===row.sha);assert.equal(row.diff,review.diff);
  const hunks=row.sections.flatMap(section=>section.hunks.map(h=>({path:section.path,index:h.index,sha256:h.sha256})));assert.equal(hunks.length,4);
  assert.deepEqual(review.complete_original_hunk_reviews.map(h=>({path:h.path,index:h.hunk_index,sha256:h.hunk_sha256})),hunks);
  for(const ref of review.owned_context)member(ref);
 }
 const resolution=JSON.parse(member({path:RESOLUTION,sha256:RESOLUTION_HASH}));assert.equal(resolution.five_review_source_qualification.sha256,QUALIFICATION_HASH);
 assert.equal(resolution.source_question_reconciled,true);assert.equal(resolution.actual_whole_CSS_comparisons,4);assert.equal(resolution.actual_rejection_controls,12);assert.equal(resolution.current_browser_executed,false);
 for(const ref of [resolution.observed_structural_context,resolution.prior_source_evidence,resolution.prior_isolated_browser_evidence,
  resolution.actual_current_source_evidence,resolution.actual_current_recheck_receipt,resolution.actual_staging_driver,...resolution.unchanged_test_producers])member(ref);
 const overlay=JSON.parse(read(resolution.actual_current_source_evidence.path));
 for(const observation of overlay.observations)for(const ref of observation.candidate_loaded_urls){
  const marker='/projects/ngx-material-legacy/',at=ref.path.indexOf(marker);
  if(at>=0)member({path:'projects/ngx-material-legacy/'+ref.path.slice(at+marker.length),sha256:ref.sha256});
 }
 const scopeRef=body.actual_line_scopes.find(ref=>ref.path===PREFIX+'21-scope.json');assert.ok(scopeRef);
 const scopeRaw=member(scopeRef),scope=JSON.parse(scopeRaw);assert.equal(scope.line,'21.x');assert.equal(scope.result,'pass');
 assert.equal(scope.public_legacy_default_CSS_cases.length,15);assert.equal(scope.direct_original_legacy_color_cases.length,5);assert.equal(scope.post16_base_exports_absent.length,5);
 for(const ref of [...scope.input_members,...scope.loaded_sources,scope.producer])member(ref);
 const assertCurrent=()=>{c04.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late token-placement input '+ref.path);assert.equal(raw.length,ref.bytes);}c04.assertCurrent();};
 assertCurrent();return {body,scope,scopeHash:hash(scopeRaw),currentSource:c04,bound:[...bound.values()],assertCurrent};
}
function unthemedSourceOk(args={}){
 try{
  const {captureSpinnerSnackC04Metadata}=require('./sass-spinner-snack-c04-source.mjs');
  const capture=()=>captureSpinnerSnackC04Metadata(args,['entry','body','review','proof','root']);
  const originalMetadata=capture();
  assert.equal(unthemedMetadataOk(args),true);const root=args.root??ROOT,read=args.read??(root===ROOT?defaultRead:path=>regular(root,path));
  const inspected=inspectUnthemedSource({root,read});assert.deepEqual(originalMetadata.body,inspected.body);const rootId=realpathSync(root),previous=measurements.get(read);
  if(!previous||previous.root!==rootId||previous.scopeHash!==inspected.scopeHash){
   const {measureTokenPlacementContracts}=require('./measure-unthemable-token-contracts.mjs');
   const {assertSpinnerSnackTokenPlacementSuccessor}=require('./sass-spinner-snack-c04-source.mjs');
   const current=measureTokenPlacementContracts({root:rootId});
   assertSpinnerSnackTokenPlacementSuccessor({historical:inspected.scope,current,source:inspected.currentSource});
   inspected.assertCurrent();measurements.set(read,{root:rootId,scopeHash:inspected.scopeHash});
  }
  inspected.assertCurrent();
  assert.deepEqual(capture(),originalMetadata,'caller token-placement metadata changed during source inspection');
  assert.equal(unthemedMetadataOk(args),true);return true;
 }catch{return false;}
}
module.exports={UNTHEMED_SHAS:Object.keys(DIFFS),UNTHEMED_REVIEW:REVIEW,unthemedProof,unthemedMetadataOk,inspectUnthemedSource,unthemedSourceOk,
 metadataOk:unthemedMetadataOk,sourceOk:unthemedSourceOk};
