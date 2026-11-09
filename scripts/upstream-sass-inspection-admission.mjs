/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Six finite source exclusions; no native, packed, floor or full Sass credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {join,isAbsolute} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {measureCurrentSassInspectionScope,assertCurrentSassInspectionScopeSuccessor,captureCurrentSassMetadata as capture} from './current-sass-inspection-scope.mjs';
import {spinnerSnackC04Source,captureSpinnerSnackC04Metadata} from './sass-spinner-snack-c04-source.mjs';
import {sassWrapperNoticeSubject} from './sass-wrapper-notice-subject.mjs';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';

const SELF='scripts/upstream-sass-inspection-admission.mjs',image=readFileSync(new URL(import.meta.url));
// Only live-operation reentry state is shared across module instances. No
// reader, source bytes, parsed inputs, result or verdict is stored here.
const transactionKey=Symbol.for('ngx-compat-material-legacy.sass-inspection-transaction.v1');
if(!Object.hasOwn(globalThis,transactionKey)){
 const active=new Map();
 const run=(root,operation)=>{const key=realpathSync(root),prior=active.get(key);if(prior){prior.nested=true;assert.fail('reentrant Sass inspection');}const state={nested:false};active.set(key,state);
  try{const result=operation();assert.equal(state.nested,false,'caught Sass inspection reentry');return result;}finally{active.delete(key);}};
 Object.defineProperty(globalThis,transactionKey,{value:Object.freeze(run),writable:false,configurable:false});
}
const transaction=globalThis[transactionKey];assert.equal(typeof transaction,'function');assert.ok(Object.isFrozen(transaction));
const assertLoaded=root=>assert.ok(readEvidenceMember(root,SELF).equals(image),'loaded Sass inspection owner differs');
function readerDescriptor(args){assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);const d=Object.getOwnPropertyDescriptor(args,'read');assert.ok(d&&Object.hasOwn(d,'value')&&d.enumerable&&typeof d.value==='function','Sass inspection reader accessor or missing reader');return d;}

const reviewPath='compatibility/rc/upstream-sass-inspection-individual-review.json';
const pins={main:'365e3b6177017f35a8bc073ff999723fcf189bebf2dbf8bb01e521fc552df79f',
 '21.x':'702c9a3155cb63987aad40c11a81d6b571adb89caea598f8798c51a52eeadb4c'};
const patches={
 '1a85dd299b4ac38d201c3cc38c396b2f08398adc':'e691c7c73a5064dc68cec494f3dbbc934f1f4c43262840494410dd8ce5fdc037',
 'f52e97958ac8d9845017a5ead077952f3228144f':'14bfd0ac5683b1c0ef96e69415fb009d4cdd277398bca05a7e8358004e3c847f',
 'e608f5fa392e9a5cd80923ba545b66217ad01c30':'e51c5b40aaacfdb9175438572d87fd382466c7278d77f3270c43da4b6bd7e27b',
 '9906aa3443ad874c7470c94fea137c72779c9fcd':'c5af07170b7c83199db3f3dd0e7d45aa318debfaacaa2987d33d7c97889b40d7',
 '8b4b58beae8cad4c857f4952eeaaf44cfe25adfe':'fa161a62d60221bdf7cf7327e85252f5a080edb422230f5c6b67219e6e83f868',
 '685b585f70fded62813480b849832fd1bfd1bffb':'7f62c3366463ffe405f77e51a3278009715b5d81c76c8a362a3fe9152caa63da'};
export const SASS_INSPECTION_SHAS=Object.freeze(Object.keys(patches));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const objectHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const measurements=new WeakMap();
export function requiresSassInspectionScope(entry){
 return SASS_INSPECTION_SHAS.includes(entry?.sha)||entry?.individual_proof?.sass_inspection!==undefined;
}
export function sassInspectionProof(row,line){
 assert.ok(Object.hasOwn(patches,row.sha));assert.ok(Object.hasOwn(pins,line));
 return {proof_kind:'individual-historical-sass-api-exclusion',diff_sha256:patches[row.sha],
  review_depth:'individual-compatibility',affected_branches:[line],decision:row.decision,
  sass_inspection:{sha:row.sha,review:{path:reviewPath,sha256:pins[line]},source_scope_only:true,
   actual_native_packed_or_floor_qualified:false}};
}
function member(root,read,ref,c04,bound){ref=c04?c04.qualify(ref):ref;const actual=readEvidenceMember(root,ref.path);assert.equal(hash(actual),ref.sha256,'changed physical Sass review input '+ref.path);const raw=read(ref.path);assert.ok(Buffer.isBuffer(raw)&&actual.equals(raw),'nonphysical Sass review input '+ref.path);assert.ok(readEvidenceMember(root,ref.path).equals(actual),'Sass review input changed during supplied read');bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:actual.length});return raw;}
function safe(path){assert.equal(typeof path,'string');assert.ok(path&&!isAbsolute(path)&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));}
function inspect({root,read,line},finish=true){
 assert.ok(Object.hasOwn(pins,line));const c04=spinnerSnackC04Source({root,read}),inputs=new Map(),memberRead=ref=>member(root,read,ref,c04,inputs);
 const notices=sassWrapperNoticeSubject({root,read,line});
 assert.equal(JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',line);
 const body=JSON.parse(memberRead({path:reviewPath,sha256:pins[line]}));
 assert.equal(body.line,line);assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,6);
 assert.equal(body.original_hunks_reviewed,49);assert.equal(body.original_file_occurrences,17);
 assert.equal(body.source_scope_only,true);assert.equal(body.actual_native_packed_or_floor_qualified,false);
 assert.equal(body.canonical_decisions_changed,0);assert.equal(body.g11_claim,'not-passed');
 const original=JSON.parse(gunzipSync(memberRead(body.upstream_originals)));
 const census=JSON.parse(gunzipSync(memberRead(body.source_census)));assert.equal(census.line,line);assert.equal(census.commits.length,1697);
 assert.deepEqual(body.reviews.map(row=>row.sha),SASS_INSPECTION_SHAS);
 let count=0;
 for(const row of body.reviews){
  const subject=original.subjects.find(item=>item.sha===row.sha),full=census.commits.find(item=>item.sha===row.sha);assert.ok(subject&&full);
  assert.equal(objectHash('commit',subject.raw_commit),row.sha);assert.equal(subject.raw_commit,full.raw_commit);
  assert.deepEqual(subject.complete_changed_files,full.complete_changed_files);
  assert.equal(hash(subject.diff),patches[row.sha]);assert.equal(row.diff,subject.diff);assert.equal(row.diff_sha256,patches[row.sha]);
  assert.deepEqual(row.complete_original_paths,subject.members.map(item=>item.path));
  assert.equal(row.status,'reviewed');assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.deepEqual(row.affected_branches,[line]);assert.equal(row.review_depth,'individual-compatibility');
  assert.ok(row.decision.length>80);assert.equal(row.source_review_complete,true);
  const hunks=subject.diff.split('diff --git ').slice(1).flatMap(part=>{
   const lines=part.split(/(?<=\n)/),path=lines[0].trim().split(' b/')[1],starts=lines.flatMap((text,index)=>text.startsWith('@@')?[index]:[]);
   return starts.map((start,index)=>({path,hunk_index:index+1,header:lines[start].trim(),hunk_sha256:hash(lines.slice(start,starts[index+1]??lines.length).join(''))}));});
  assert.equal(hunks.length,row.whole_original_hunk_reviews.length);count+=hunks.length;
  row.whole_original_hunk_reviews.forEach((review,index)=>{for(const key of Object.keys(hunks[index]))assert.equal(review[key],hunks[index][key]);
   assert.ok(review.decision.length>80);assert.equal(review.upstream_original_suite_executed,false);});
 }
 assert.equal(count,49);
 const packetBytes=memberRead(body.current_compiler_scope),packet=JSON.parse(gunzipSync(packetBytes)),scope=notices.qualifySassScope(packet.actual);
 assert.equal(packet.summary.line,line);assert.equal(packet.summary.result,'pass');assert.equal(packet.summary.positive.length,5);assert.equal(packet.summary.rejected.length,10);
 assert.equal(scope.line,line);assert.equal(scope.result,'pass');assert.equal(scope.entry_override_used,false);
 assert.equal(scope.candidate_entry,'projects/ngx-material-legacy/_index.scss');memberRead(scope.producer);
 memberRead(scope.oracle);assert.equal(scope.owned_scss_population.length,409);
 const paths=candidateProductSourcePaths(root).filter(path=>path.endsWith('.scss')).sort();
 assert.deepEqual(paths,scope.owned_scss_population.map(item=>item.path).sort());
 const currentOwned=[];
 for(const ref of scope.owned_scss_population){safe(ref.path);const current=c04.qualify(ref);assert.equal(memberRead(current).length,current.bytes);currentOwned.push({...current});}
 const material=realpathSync(join(root,'node_modules/@angular/material')),cdk=realpathSync(join(root,'node_modules/@angular/cdk'));
 const manifest=readFileSync(join(material,'package.json'));assert.equal(hash(manifest),scope.peer.package_json_sha256);
 assert.equal(JSON.parse(manifest).version,line==='21.x'?'21.2.14':'22.1.7');
 const currentScope=structuredClone(scope);currentScope.owned_scss_population=currentOwned;currentScope.owned_population_sha256=hash(JSON.stringify(currentOwned));const loaded=new Map();
 for(const [program,roots]of [[scope.candidate,[realpathSync(join(root,'projects/ngx-material-legacy')),material,cdk]],[scope.current,[material,cdk]]]){
  const currentLoaded=[];
  for(const ref of program.loaded_sources){safe(ref.path);assert.ok(Number.isInteger(ref.root)&&ref.root>=0&&ref.root<roots.length);
   const qualified=program===scope.candidate&&ref.root===0?c04.qualify({...ref,path:'projects/ngx-material-legacy/'+ref.path}):ref;
   const path=join(roots[ref.root],ref.path),raw=readFileSync(path);assert.equal(hash(raw),qualified.sha256,'changed loaded Sass input '+ref.path);assert.equal(raw.length,qualified.bytes);const current={sha256:qualified.sha256,bytes:qualified.bytes};if(loaded.has(path))assert.deepEqual(loaded.get(path),current);loaded.set(path,current);currentLoaded.push({...ref,sha256:qualified.sha256,bytes:qualified.bytes});}
  currentScope[program===scope.candidate?'candidate':'current'].loaded_sources=currentLoaded;
 }
 const assertPhysicalScope=()=>{assert.deepEqual([realpathSync(join(root,'node_modules/@angular/material')),realpathSync(join(root,'node_modules/@angular/cdk'))],[material,cdk],'Sass peer resolution changed');assert.equal(hash(readFileSync(join(material,'package.json'))),scope.peer.package_json_sha256);
  for(const ref of currentOwned){const raw=readEvidenceMember(root,ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
  for(const[path,ref]of loaded){const raw=readFileSync(path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}};
 const assertInputPhysical=()=>{for(const ref of inputs.values()){const raw=readEvidenceMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'late physical Sass review input '+ref.path);assert.equal(raw.length,ref.bytes);}};
 const assertInputs=()=>{assertInputPhysical();for(const ref of [...inputs.values()])member(root,read,ref,null,inputs);assertInputPhysical();};
 if(finish){assertInputs();notices.assertCurrent();c04.assertCurrent();assertPhysicalScope();assertInputPhysical();}
 return {body,scope,currentScope,c04,notices,assertInputs,assertInputPhysical,assertPhysicalScope,scopeHash:hash(packetBytes)};
}
function validateMetadata(entry,body,line,reviewed){
 const row=reviewed.reviews.find(item=>item.sha===entry.sha);assert.ok(row);
 assert.deepEqual(body,reviewed);assert.equal(entry.evidence_report,reviewPath);
 assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.reason,row.decision);
 assert.equal(entry.review_depth,row.review_depth);assert.deepEqual(entry.affected_branches,[line]);
 assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.g11_claim,'not-passed');
 if(Object.hasOwn(entry,'patch_sha256'))assert.equal(entry.patch_sha256,row.diff_sha256);
 assert.deepEqual(entry.individual_proof,sassInspectionProof(row,line));
}
// Reject invalid metadata before invoking a supplied reader. This is a local
// precondition only: every positive still constructs the complete actual
// inspection below and closes all of its current source guards.
function precheckMetadata(root,line,body,entries){
 assert.ok(Object.hasOwn(pins,line));const raw=readEvidenceMember(root,reviewPath);assert.equal(hash(raw),pins[line]);const reviewed=JSON.parse(raw);
 for(const entry of entries)validateMetadata(entry,body,line,reviewed);
 for(const ref of [reviewed.upstream_originals,reviewed.source_census,reviewed.current_compiler_scope])assert.equal(hash(readEvidenceMember(root,ref.path)),ref.sha256,'changed physical Sass review input '+ref.path);
}
function validateEntry(args,fresh){
 try{
  const metadata=()=>captureSpinnerSnackC04Metadata(args,['entry','body','line','root']),snapshot=metadata();
  const descriptor=readerDescriptor(args),{root,line,entry,body}=snapshot,read=descriptor.value;
  return transaction(root,()=>{
  assertLoaded(root);precheckMetadata(root,line,body,[entry]);const inspected=inspect({root,read,line});validateMetadata(entry,body,line,inspected.body);
  if(fresh){
   const previous=measurements.get(read),rootId=realpathSync(root),{scope,scopeHash}=inspected;
   if(!previous||previous.root!==rootId||previous.scopeHash!==scopeHash){
    assertCurrentSassInspectionScopeSuccessor({root:rootId,historical:scope,current:measureCurrentSassInspectionScope({root:rootId})});
    measurements.set(read,{root:rootId,scopeHash});
   }
  }
  inspected.assertInputs();inspected.notices.assertCurrent();inspected.c04.assertCurrent();inspected.assertPhysicalScope();inspected.assertInputPhysical();assert.deepEqual(metadata(),snapshot);assert.deepEqual(readerDescriptor(args),descriptor);assertLoaded(root);return true;
  });
 }catch{return false;}
}

/** One complete six-decision source operation on the actual inspected subjects.
 * Returned metadata remains guarded by those subjects; it is no reader grant,
 * independently supplied context, fresh compiler result or cached verdict. */
export function sassInspectionSourceBatch(args){
 const descriptor=readerDescriptor(args),metadata=()=>captureSpinnerSnackC04Metadata(args,['entries','body','line','root']),snapshot=metadata();
 const {root,line,entries,body}=snapshot,read=descriptor.value;
 assert.ok(Array.isArray(entries));assert.equal(entries.length,SASS_INSPECTION_SHAS.length);
 assert.deepEqual(entries.map(row=>row.sha).sort(),[...SASS_INSPECTION_SHAS].sort());
 return transaction(root,()=>{
  assertLoaded(root);precheckMetadata(root,line,body,entries);const inspected=inspect({root,read,line},false);
  for(const entry of entries)validateMetadata(entry,body,line,inspected.body);
  const scopeSnapshot=capture(inspected.currentScope),scope=structuredClone(scopeSnapshot);
  const guard=()=>{assertLoaded(root);inspected.assertInputs();inspected.notices.assertCurrent();inspected.c04.assertCurrent();inspected.assertPhysicalScope();inspected.assertInputPhysical();
   assert.deepEqual(metadata(),snapshot,'Sass batch arguments changed');assert.deepEqual(readerDescriptor(args),descriptor,'Sass batch reader changed');
   assert.deepEqual(capture(scope),scopeSnapshot,'Sass batch scope changed');assertLoaded(root);};
  guard();return Object.freeze({line,scope,assertCurrent:()=>transaction(root,guard),
   validated_shas:Object.freeze(entries.map(row=>row.sha)),source_scope_only:true,
   fresh_compiler_execution:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'});
 });
}

/** Historical metadata projection checks all current source bytes without
 * claiming a fresh product gate. The real root checker always uses the fresh
 * entry point below; this choice never comes from a report or ledger field. */
export function sassInspectionEntrySourceOk(args){return validateEntry(args,false);}
export function sassInspectionEntryEvidenceOk(args){return validateEntry(args,true);}
