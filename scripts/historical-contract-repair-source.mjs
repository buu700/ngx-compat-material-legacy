/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One finite current source-reference owner; original evidence stays historical. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {composeCanonicalSourceGuards} from './canonical-source-guard-plan.mjs';
const SELF='scripts/historical-contract-repair-source.mjs',INPUTS='compatibility/rc/historical-contract-repair-source-inputs.json';
const PINS={'21.x':'c1d7a8762cad7913a5d4ad60863afb506c56c61d27a78c17a3f5372c51cc9303',main:'cee92383ce1cb2c82b135e2e3b8be0131a46b114d60a521f7e11e4d0bb017191'};
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex'),originals=new Map();
export const historicalContractRepairLoadedImage=Object.freeze({path:SELF,sha256:hash(image),bytes:image.length});
const SOURCE_PATHS=Object.freeze([
 'projects/ngx-material-legacy/legacy-form-field/testing/error-harness.ts',
 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts',
 'projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts',
 'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts',
 'compatibility/rc/api/signature-differences.json',
]);
const key=row=>JSON.stringify([row.file,row.module,row.symbol]);
/** Only pinned package roots can be linked. Source and descendants remain regular files. */
export function readHistoricalContractRepairMember(root,path){
 const cyph=['../../../../cyph/shared/js/cyph/services/material-dialog.service.ts','../../../../cyph/shared/js/cyph/modules/cyph-web.module.ts'];
 if(cyph.includes(path)){const suffix=path.slice('../../../../cyph/'.length);assert.equal(resolve(root,path),resolve('/home/parallels/cyph',suffix));return readEvidenceMember('/home/parallels/cyph',suffix);}
 const match=path.match(/^node_modules\/(@angular\/(?:material|cdk|core|compiler)|typescript|rxjs)\/(.+)$/);
 if(!match)return readEvidenceMember(root,path);
 let cursor=realpathSync(join(root,'node_modules',match[1]));
 for(const part of match[2].split('/')){assert.ok(part&&part!=='.'&&part!=='..');cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false);}
 assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);
}
function original(root,parent,path){
 assert.match(parent,/^[0-9a-f]{40}$/);const id=JSON.stringify([root,parent,path]);
 if(!originals.has(id)){
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
  originals.set(id,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:8*1024*1024}));
 }return Buffer.from(originals.get(id));
}
const reference=(path,raw)=>({path,sha256:hash(raw),bytes:raw.length});
const planner=composeCanonicalSourceGuards, functionToString=Function.prototype.toString;
const equals=Buffer.prototype.equals,apply=Reflect.apply;
const equal=(a,b)=>Buffer.isBuffer(b)&&apply(equals,a,[b]);
const PLANNER=Object.freeze({path:'scripts/canonical-source-guard-plan.mjs',sha256:'4f632a3fe97975804edf5b89c1cc5abadc002ef78fe16c3a40edbadde460fc9f',bytes:4609});
function assertPlanner(root){
 assert.equal(composeCanonicalSourceGuards,planner,'changed historical repair guard planner');
 assert.equal(hash(functionToString.call(planner)),'fecc474c121931506ce1f0f97e176886957f1504da46e74a085a068910ff9947','unauthenticated historical repair guard planner');
 const raw=readEvidenceMember(root,PLANNER.path);assert.equal(hash(raw),PLANNER.sha256,'changed physical historical repair guard planner');assert.equal(raw.length,PLANNER.bytes);
}

const producerIdentityTransitions=Object.freeze([{"path":"scripts/upstream-base-class-removal-source.mjs","after":{"path":"scripts/upstream-base-class-removal-source.mjs","sha256":"2a225cd654fe4940aec34987c7b46453fa624b70743ae5fa63d73ce2341358e2","bytes":12610},"edits":[{"offset":1382,"before":"","after":"export const baseClassRemovalOriginalLoadedImage=Object.freeze({path:SELF,sha256:hash(image),bytes:image.length});\n"}],"before":{"path":"scripts/upstream-base-class-removal-source.mjs","sha256":"1c127473aac8050d206b38c531eb8386492bbc4114acabd7d4a42dd80c30b17b","bytes":12495,"git_blob":"ef9a77b0941e2c257ae8f9c89709b6f3907c39d0"}},{"path":"compatibility/rc/21x-base-class-removal-source-final-review.mjs","after":{"path":"compatibility/rc/21x-base-class-removal-source-final-review.mjs","sha256":"9fb47887c2389e0e40a8ba1fa4e2086e844d96940d82387d8b69c12b739839f0","bytes":22459},"edits":[{"offset":1023,"before":"","after":"export const baseClassRemovalReviewLoadedImage = Object.freeze({path: SELF, sha256: hash(image), bytes: image.length});\n"}],"before":{"path":"compatibility/rc/21x-base-class-removal-source-final-review.mjs","sha256":"67fbedb4ac7310218123d4248f8f93519a9d9c7a03d5ecfccae398f78543084b","bytes":22339,"git_blob":"d9491b9a8cecc5b85ecb23bff81a4887193f3e5e"}}]);
function currentProducerReference(root,line,ref){
 if(line!=='21.x')return ref;
 const row=producerIdentityTransitions.find(row=>row.path===ref.path);if(!row)return ref;
 const before={path:row.path,sha256:row.before.sha256,bytes:row.before.bytes};
 assert.deepEqual(ref,before,'unknown historical-repair producer predecessor');
 const old=original(root,'d8ab97315b6c77b83f42c2bebcf63b2984fff255',row.path);
 assert.equal(hash(old),before.sha256);assert.equal(old.length,before.bytes);
 const edit=row.edits[0],literal=Buffer.from(edit.before);
 assert.ok(equal(old.subarray(edit.offset,edit.offset+literal.length),literal));
 const after=Buffer.concat([old.subarray(0,edit.offset),Buffer.from(edit.after),old.subarray(edit.offset+literal.length)]);
 assert.equal(hash(after),row.after.sha256);assert.equal(after.length,row.after.bytes);
 return row.after;
}

export function historicalContractRepairSourceSubject({root=process.cwd(),read:providedRead}={}){
 root=resolve(root);assertPlanner(root);const physical=path=>readHistoricalContractRepairMember(root,path),bound=new Map();
 const read=path=>{
  const actual=physical(path);
  if(providedRead){const provided=providedRead(path);assert.ok(equal(actual,provided),'nonphysical current historical-repair input '+path);}
  assert.ok(equal(actual,physical(path)),'historical-repair input changed during callback '+path);
  const ref=reference(path,actual),previous=bound.get(path);if(previous)assert.deepEqual(ref,previous,'input changed during historical-repair qualification '+path);else bound.set(path,ref);return actual;
 };
 const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const raw=read(INPUTS);assert.equal(hash(raw),PINS[line],'changed finite historical-repair input registry');const data=JSON.parse(raw);assert.equal(data.line,line);assert.equal(data.schema_version,1);
 assert.equal(data.source_scope_only,true);assert.equal(data.canonical_decisions_changed,0);assert.equal(data.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(data.g11_claim,'not-passed');
 assert.equal(process.versions.node,JSON.parse(read('toolchain-lock.json')).repository.node);assert.ok(read(SELF).equals(image),'loaded historical-repair source owner differs from current file');
 const member=ref=>{const expected=currentProducerReference(root,line,ref);const bytes=read(ref.path);assert.equal(hash(bytes),expected.sha256,'changed historical-repair evidence '+ref.path);if(expected.bytes!==undefined)assert.equal(bytes.length,expected.bytes);return bytes;};
 const implementation=JSON.parse(member(data.implementation)),useQualified=JSON.parse(member(data.current_use_qualification)),useProof=JSON.parse(member(data.current_use_source_proof)),review=JSON.parse(member(data.current_use_review));
 for(const record of [implementation,useQualified,useProof,review])assert.equal(record.line,line,'cross-line historical-repair evidence');
 assert.equal(implementation.g11_claim,'not-passed');assert.equal(implementation.canonical_admission_ready,false);assert.equal(implementation.actual_native_packed_browser_floor_or_full_audit_qualified,false);
 assert.equal(useQualified.independent_review_record_check.reviewed,95);assert.equal(useQualified.independent_review_record_check.insufficient,0);assert.equal(useQualified.controls_rejected,10);
 assert.equal(useProof.existing_reviewed_uses,93);assert.equal(useProof.new_uses,2);assert.equal(useProof.identical_lexical_use_rows,90);assert.equal(useProof.explicit_historical_helper_extraction_rows,3);
 assert.deepEqual(useProof.actual_repair_qualification,data.implementation);assert.equal(review.status,'reviewed');assert.equal(review.reviews.length,95);
 const images=new Map();assert.deepEqual(data.images.map(row=>row.path),SOURCE_PATHS);
 for(const row of data.images){
  const before=original(root,data.repair_baseline_commit,row.path);assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
  let expected=before.toString();
  if(row.path===SOURCE_PATHS[4]){
   assert.deepEqual(row.literal_edits,[]);const parsed=JSON.parse(before);assert.equal(parsed.differences.length,114);
   const matching=parsed.differences.filter(item=>JSON.stringify(item)===JSON.stringify(row.removed_api_exception));assert.equal(matching.length,1);
   const removed=matching[0];assert.equal(removed.symbol_id,'legacy-form-field/testing/MatLegacyErrorHarness');assert.equal(removed.owned_signature,null);assert.ok(removed.historical_signature.includes('_getErrorPredicate'));
   parsed.differences=parsed.differences.filter(item=>item!==removed);assert.equal(parsed.differences.length,113);expected=JSON.stringify(parsed,null,2)+'\n';
  }else{
   assert.ok(row.literal_edits.length>0);for(const edit of row.literal_edits){assert.equal(expected.split(edit.before).length,2,'ambiguous historical product repair '+row.path);expected=expected.replace(edit.before,edit.after);}
   const applied=implementation.applied.filter(item=>item.path===row.path);assert.equal(applied.length,1);assert.equal(applied[0].before_sha256,row.before.sha256);assert.equal(applied[0].after_sha256,row.after.sha256);
  }
  assert.equal(hash(expected),row.after.sha256);assert.equal(Buffer.byteLength(expected),row.after.bytes);const current=member({path:row.path,...row.after});assert.equal(current.toString(),expected,'current historical repair exceeds its exact reviewed delta');
  images.set(row.path,{...structuredClone(row)});
 }
 // These two inputs described the original choice of prior caller reviews.
 // They remain authenticated historical metadata, independent of the current
 // roster's later integration. Every product/peer/evidence input stays current.
 const historicalMetadata=new Map();assert.equal(data.historical_roster_context.members.length,2);
 for(const ref of data.historical_roster_context.members){
  assert.ok(['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json'].includes(ref.path));
  const before=original(root,data.historical_roster_context.source_parent,ref.path);assert.equal(hash(before),ref.sha256);assert.equal(before.length,ref.bytes);historicalMetadata.set(ref.path,{...ref});
 }
 // Three acquisition-time audit snapshots describe the recorded review state.
 // The canonical owner validates current state; these are not runtime inputs.
 const canonicalPaths=['compatibility/f10/disposition-ledger/ledger.json','scripts/upstream-source-contract-registry.mjs','compatibility/rc/21x-remaining-disposition-worksheet.json'],canonicalHistory=new Map();
 assert.ok(implementation.source_bindings.length>300);
 for(const ref of implementation.source_bindings){
  if(!canonicalPaths.includes(ref.path)){member(ref);continue;}
  const before=original(root,data.source_parent,ref.path);assert.equal(hash(before),ref.sha256);assert.equal(before.length,ref.bytes);canonicalHistory.set(ref.path,{...ref});
 }
 assert.equal(canonicalHistory.size,line==='21.x'?3:1);
 let currentBindings=0,historicalBindings=0,historicalCanonicalBindings=0;
 for(const ref of useProof.source_bindings){
  const prior=historicalMetadata.get(ref.path);
  if(prior){assert.deepEqual(ref,prior);historicalBindings++;}
  else if(canonicalHistory.has(ref.path)){assert.deepEqual(ref,canonicalHistory.get(ref.path));historicalCanonicalBindings++;}
  else{member(ref);currentBindings++;}
 }
 assert.equal(historicalBindings,2);assert.equal(historicalCanonicalBindings,line==='21.x'?3:1);assert.equal(currentBindings,line==='21.x'?1102:724);
 const known=new Set();
 for(const row of review.reviews){assert.equal(known.has(key(row)),false);known.add(key(row));const source=images.get('projects/ngx-material-legacy/'+row.file);assert.ok(source);assert.equal(row.candidate_source_sha256,source.after.sha256);}
 const reviewed=authoredUseReviewEvidence({symbol_uses:review.reviews.map(row=>({file:row.file,module:row.module,symbol:row.symbol,status:'reviewed',disposition:'closed',source_review:data.current_use_review}))},line,read,hash);
 assert.equal(reviewed.reviewed,95);assert.equal(reviewed.insufficient,0);
 let active=false;
 const idle=()=>assert.equal(active,false,'reentrant historical repair source operation');
 const selectedReferenceCore=(ref,side)=>{
  const row=images.get(ref.path);if(!row)return null;
  const previous=ref.sha256===row.before.sha256?row.before:ref.sha256===row.after.sha256?row.after:null;assert.ok(previous,'unreviewed historical-repair source reference '+ref.path);
  if(ref.bytes!==undefined)assert.equal(ref.bytes,previous.bytes);
  const actual=physical(ref.path);assert.equal(hash(actual),row.after.sha256,'late actual historical-repair source '+ref.path);assert.equal(actual.length,row.after.bytes);
  if(providedRead)assert.ok(equal(actual,Buffer.from(providedRead(ref.path))),'nonphysical historical-repair source reference '+ref.path);
  assert.ok(equal(actual,physical(ref.path)),'historical-repair source reference changed during callback '+ref.path);
  return {...ref,sha256:row[side].sha256,...(ref.bytes===undefined?{}:{bytes:row[side].bytes})};
 };
 const selectedReference=(ref,side)=>{
  if(!images.has(ref.path))return null;
  idle();active=true;try{return selectedReferenceCore(ref,side);}finally{active=false;}
 };
 const qualify=ref=>selectedReference(ref,'after'),historicalReference=ref=>selectedReference(ref,'before');
 const compareSourceReport=(current,historical)=>{idle();active=true;try{
  assert.ok(Array.isArray(historical.current_members)&&historical.current_members.length>1000,'expected complete immutable source boundary');
  const derived=structuredClone(historical);let changed=0;
  derived.current_members=derived.current_members.map(ref=>{const selected=selectedReferenceCore(ref,'after');if(!selected)return ref;if(selected.sha256!==ref.sha256)changed++;return selected;});
  assert.equal(changed,4,'source boundary must contain all four repair preimages');assert.deepEqual(current,derived,'fresh source facts differ beyond the four qualified reference successors');
  return {current_metadata:derived,historical_comparison:structuredClone(historical),changed_source_references:changed,metadata_comparison_only:true,old_product_bytes_exposed:false};
 }finally{active=false;}};
 const sweep=()=>{for(const ref of bound.values()){const actual=physical(ref.path);assert.equal(hash(actual),ref.sha256,'late historical-repair subject input '+ref.path);assert.equal(actual.length,ref.bytes);}};
 const guardNode=Object.freeze({dependencies:Object.freeze([]),
  preflight:()=>{idle();assertPlanner(root);sweep();},
  consume:()=>{idle();active=true;try{for(const ref of bound.values()){
   const actual=physical(ref.path);assert.equal(hash(actual),ref.sha256,'late historical-repair subject input '+ref.path);assert.equal(actual.length,ref.bytes);
   if(providedRead)assert.ok(equal(actual,Buffer.from(providedRead(ref.path))),'late nonphysical historical-repair input '+ref.path);
   assert.ok(equal(actual,physical(ref.path)),'historical-repair input changed during callback '+ref.path);
  }}finally{active=false;}},
  final:()=>{idle();sweep();assertPlanner(root);},
 });
 const composed=planner(Object.freeze([guardNode])),assertCurrent=()=>{idle();composed();};
 const guardPlan=Object.freeze({assertCurrent,node:guardNode});
 assertCurrent();return {line,guardNode,guardPlan,images:structuredClone([...images.values()]),bound:structuredClone([...bound.values()]),qualify,historicalReference,compareSourceReport,assertCurrent,
  current_use_reviews:95,current_use_current_input_bindings:currentBindings,current_use_historical_roster_metadata_inputs:historicalBindings,current_use_historical_canonical_context_inputs:historicalCanonicalBindings,canonical_context_admission_granted:false,
  old_product_bytes_exposed:false,current_read_route_returned:false,canonical_rosters_or_dispositions_changed:false,
  current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
