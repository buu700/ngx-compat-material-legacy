/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Individual current title source admission; mandatory native gate stays separate. */
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {readFileSync,lstatSync,realpathSync}=require('node:fs');
const {join,resolve}=require('node:path');
const {isDeepStrictEqual}=require('node:util');
const ROOT=resolve(__dirname,'..'),PREFIX='compatibility/rc/21x-c04-dialog-title-replacement-';
const TITLE_SHA='642d886ef117721a34c98055391c9055fde29607';
const TITLE_DIFF='13c81abcdf9b4b4e80e864db636af1eeb31bb1ca44110d0358e43763e5bce2b6';
const TITLE_REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='794ffdc1bdfc7d2d234ee2ff46a591f74c471b38dee40343a551d9354f9cb4c3';
const TITLE_SOURCE_REPORT=PREFIX+'canonical-qualified-owner-source-measurement.json';
const TITLE_SOURCE_HASH='5911c0c1d0b72c3990a1be798132f970f65bd37aa480da5b00ab93c804d47985';
const TITLE_KIND='individual-owned-dialog-title-lifetime';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
function titleNativeRequirements(){return {kind:'owned-dialog-title-lifetime',required:true,
 case_ids:['zoneful','zoneless'].flatMap(runtime=>['chromium','firefox','webkit'].map(engine=>'release/21.x/'+engine+'/'+runtime+'/dialog/default')),
 observation_rows_per_case:42,source_contract:{path:TITLE_SOURCE_REPORT,sha256:TITLE_SOURCE_HASH}};}
function titleProof(row){
 assert.equal(row.sha,TITLE_SHA);assert.equal(row.diff_sha256,TITLE_DIFF);
 return {proof_kind:TITLE_KIND,diff_sha256:TITLE_DIFF,review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  dialog_title_source_scope:{sha:TITLE_SHA,review:{path:TITLE_REVIEW,sha256:REVIEW_HASH},
   qualification:{path:TITLE_SOURCE_REPORT,sha256:TITLE_SOURCE_HASH},source_scope_only:true,
   actual_native_artifact_browser_floor_or_full_audit_qualified:false},historical_behavior:titleNativeRequirements()};
}
/** Completion metadata only: no filesystem, package, environment or compiler reads. */
function metadataOk({entry,body,review,proof}={}){
 try{
  assert.equal(entry.sha,TITLE_SHA);assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.source_review_complete,true);
  assert.deepEqual(body.reviews.map(row=>row.sha),[TITLE_SHA]);const row=body.reviews[0];assert.ok(isDeepStrictEqual(row,review));
  assert.equal(row.status,'reviewed');assert.equal(row.source_scope_only,true);assert.equal(row.proposed_final_disposition,'already-adapted');
  assert.equal(row.diff_sha256,TITLE_DIFF);assert.equal(hash(row.diff),TITLE_DIFF);
  assert.equal(entry.final_disposition,'already-adapted');assert.equal(entry.review_depth,'individual-compatibility');assert.equal(entry.evidence_report,TITLE_REVIEW);
  assert.deepEqual(entry.affected_branches,['21.x']);assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.reason,row.decision);
  assert.deepEqual(entry.individual_proof,titleProof(row));if(proof!==undefined)assert.deepEqual(proof,entry.individual_proof);
  for(const node of [entry,body,row])assert.equal(node.g11_claim,'not-passed');assert.equal(row.g13_claim,'not-passed');return true;
 }catch{return false;}
}
function titleRead(root,path){
 assert.ok(typeof path==='string'&&!path.includes('\\'));const parts=path.split('/');assert.ok(parts.every(p=>p&&p!=='.'&&p!=='..'));
 const peer=path.match(/^node_modules\/(@angular\/(?:core|compiler|cdk|material)|rxjs|typescript)\/(.+)$/);
 let file=peer?realpathSync(join(root,'node_modules',peer[1])):root,tail=peer?peer[2].split('/'):parts;
 assert.ok(lstatSync(file).isDirectory()&&!lstatSync(file).isSymbolicLink());
 for(const part of tail){file=join(file,part);assert.equal(lstatSync(file).isSymbolicLink(),false,'linked title source input');}
 assert.ok(lstatSync(file).isFile());return readFileSync(file);
}
function inspectTitleSource({root=ROOT,read=path=>titleRead(root,path)}={}){
 assert.equal(realpathSync(root),realpathSync(ROOT),'wrong title source owner checkout');
 const raw=read(TITLE_SOURCE_REPORT);assert.equal(hash(raw),TITLE_SOURCE_HASH,'changed title source measurement');const scope=JSON.parse(raw);
 assert.equal(scope.line,'21.x');assert.equal(scope.result,'pass');assert.equal(scope.fresh_lifecycle_executed,true);
 assert.equal(scope.graph.source_members.length,49);assert.equal(scope.original.exact_patch_replays,9);assert.equal(scope.original.original_hunks,21);
 assert.equal(scope.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(scope.g11_claim,'not-passed');
 const typeRefs=[
  {path:PREFIX+'focused-qualification.json',sha256:'6de1d76e0a0629647964d15d8aa70d8efe7aca57db168bd17afcfa007fecfd8e'},
  {path:PREFIX+'helper-types-21x.json',sha256:'ec3f6ccae420832153dd54bd5733aeace0cf61d311ae5a5d4b6815ada84060cd'},
  {path:PREFIX+'helper-types-main.json',sha256:'e9f5f5aae203fa3363d283f7939683e4c80c6e80c53599bd02c7eb334b68c2fa'},
 ];
 const types=typeRefs.map(ref=>{const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed minimum helper type receipt');return {ref:{...ref,bytes:value.length},body:JSON.parse(value)};});
 assert.deepEqual(types[0].body.strict_helper_only_type_checks,{'21.x':types[1].ref,main:types[2].ref});
 for(const [i,version,core]of [[1,'5.9.2','21.2.23'],[2,'6.0.3','22.1.7']]){
  const proof=types[i].body;assert.equal(proof.typescript,version);assert.equal(proof.peer_core,core);
  assert.equal(proof.source,'projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-state.ts');
  assert.equal(proof.strict,true);assert.equal(proof.skipLibCheck,false);assert.deepEqual(proof.diagnostics,[]);assert.equal(proof.result,'pass');
  assert.equal(proof.full_source_AOT_or_native_qualification,false);
 }
 const {titleMeasurementSourceReferences}=require('./inventory-reference-owner.mjs');
 const bound=[{path:TITLE_SOURCE_REPORT,sha256:TITLE_SOURCE_HASH,bytes:raw.length},...titleMeasurementSourceReferences({root,read,scope}),...types.map(row=>row.ref)];
 assert.equal(new Set(bound.map(row=>row.path)).size,bound.length,'duplicate title source binding');
 const assertCurrent=()=>{for(const member of bound){const value=read(member.path);assert.equal(hash(value),member.sha256,'changed title source input '+member.path);assert.equal(value.length,member.bytes);}};
 assertCurrent();
 const {inspectDialogTitleOriginalSubject}=require('./dialog-title-original-subject.mjs');
 const original=inspectDialogTitleOriginalSubject({root,read});assert.deepEqual(original.result,scope.original);
 const body=JSON.parse(read(TITLE_REVIEW));assert.equal(hash(read(TITLE_REVIEW)),REVIEW_HASH);
 assertCurrent();return {body,scope,bound:structuredClone(bound),assertCurrent};
}
function sourceOk(args={}){
 try{
  assert.equal(metadataOk(args),true);const root=args.root??ROOT,read=args.read??(path=>titleRead(root,path));
  const inspected=inspectTitleSource({root,read});assert.deepEqual(args.body,inspected.body);
  // Always execute the asynchronous diagnostic in a fresh process. No saved pass
  // or import cache substitutes for the current constructor/lifecycle behavior.
  const raw=execFileSync(process.execPath,[join(root,'scripts/dialog-title-canonical-source.mjs')],
   {cwd:root,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'}});
  const {titleMeasurementForHistoricalComparison}=require('./inventory-reference-owner.mjs');
  assert.deepEqual(titleMeasurementForHistoricalComparison({root,actual:JSON.parse(raw),expected:inspected.scope}),inspected.scope,'fresh current title source evidence differs');
  inspected.assertCurrent();return true;
 }catch{return false;}
}
module.exports={TITLE_SHA,TITLE_DIFF,TITLE_REVIEW,TITLE_SOURCE_REPORT,TITLE_SOURCE_HASH,TITLE_KIND,
 titleNativeRequirements,titleProof,metadataOk,titleRead,inspectTitleSource,sourceOk};
