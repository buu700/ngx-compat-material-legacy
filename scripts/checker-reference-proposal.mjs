/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact checker-reference proposal;canonical integration grants no native credit. */
import assert from 'node:assert/strict';
import {checkerOwnerSourceSubject} from './checker-owner-source.mjs';
import {packedUpstreamLedgerCurrentSourceLane} from './packed-upstream-ledger-epoch.mjs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,realpathSync} from 'node:fs';
import {join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
export const CHECKER_REFERENCE_PACKET='compatibility/rc/c04-checker-reference-proposal.json';
export const CHECKER_REFERENCE_LEDGER='compatibility/f10/disposition-ledger/ledger.json';
export const CHECKER_REFERENCE_PATH='scripts/check-upstream-audit-disposition.mjs';
const SELF='scripts/checker-reference-proposal.mjs',VERIFIER='tests/checker_reference_source_probe.mjs';
const pins={
  "main": {
    "parent": "5fa99e8ab39275792114984e5cb4d6607d530b31",
    "before": "e8c57b7630bfec15b3730214c03c41cf37e6654ce236743dff3d644ff43e813e",
    "after": "0f3ffb5a86e4838a3fd29d7e47e10a30bc7feb39f23d79dde9706473f6337443",
    "oldChecker": "db1ad9e6d7a069eaeae9ce026912bd520d3a13630678f76e37f965fc25960377",
    "checker": "c47294c9947448ee832abfd98a44083ea0dcdae6ea9d20559c9282799c248488",
    "count": 13,
    "preserved": 7,
    "packet": "fe1a877f6d427b0eb598391ee11502b49c65d0242c55956f25bd5284314d71db",
    "verifier": "17fcdad5994f720ccff749a379239d99787e035ae7f0295b064e279e1a2f24d6"
  },
  "21.x": {
    "parent": "7bae903e9a1309c6e226909ed8ee1bae5ad4eccf",
    "before": "558b6891e575422cdfcdaff2f59fa7611cf53246130da3afeec68571d1c77a1b",
    "after": "8f311ad001bf2daa3152b878414bd010a621d31b76c118d19f4184e5bed0ef17",
    "oldChecker": "db1ad9e6d7a069eaeae9ce026912bd520d3a13630678f76e37f965fc25960377",
    "checker": "4a6002153caabe102887bcd8847128818c2f7025a3d1257d97cd446f34fbf106",
    "count": 5,
    "preserved": 14,
    "packet": "58af70dec579e45bd47862065ec2bb8cfcfd7cbeb9081303930508f6d07c2d7f",
    "verifier": "17fcdad5994f720ccff749a379239d99787e035ae7f0295b064e279e1a2f24d6"
  }
};
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const encoded=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const kinds=['historical_behavior','progress_csp_behavior','media_matcher_behavior','form_field_hover_behavior','content_observer_behavior','ripple_replay_behavior'];
function currentFile(root,path){
 if(['node_modules/typescript/lib/typescript.js','node_modules/typescript/package.json'].includes(path)){
  const base=realpathSync(join(root,'node_modules/typescript')),file=realpathSync(join(base,path.slice('node_modules/typescript/'.length)));
  assert.ok(file.startsWith(base+sep),'TypeScript member escaped installed package');return readFileSync(file);
 }
 return readEvidenceMember(root,path);
}
function original(root,parent,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:16*1024*1024});
}
function nativeReferences(ledger){
 return ledger.entries.flatMap(entry=>kinds.flatMap(kind=>(entry.individual_proof?.[kind]?.source_members??[]).flatMap((ref,index)=>
  ref.path===CHECKER_REFERENCE_PATH?[{sha:entry.sha,pointer:'/individual_proof/'+kind+'/source_members/'+index,reference:structuredClone(ref)}]:[])));
}
/** The immutable packet names a cohort;derivation never executes its contents. */
export function deriveCheckerReferenceMetadata({before,packet,checker}={}){
 const pin=pins[packet?.line];assert.ok(pin,'unknown checker reference line');assert.equal(hash(encoded(packet)),pin.packet,'changed proposal packet');
 assert.equal(hash(before),pin.before);assert.equal(hash(checker),pin.checker);assert.equal(packet.source_parent,pin.parent);
 assert.equal(packet.metadata_reference_updates,pin.count);assert.equal(packet.old_checker_sha256,pin.oldChecker);
 assert.deepEqual(packet.before_ledger,{path:CHECKER_REFERENCE_LEDGER,sha256:pin.before,bytes:before.length});
 assert.deepEqual(packet.current_checker,{path:CHECKER_REFERENCE_PATH,sha256:pin.checker,bytes:checker.length});
 const prior=JSON.parse(before),expected=structuredClone(prior),updates=[],replacements=[];
 assert.equal(prior.entries.length,1697);assert.equal(new Set(prior.entries.map(row=>row.sha)).size,1697);assert.equal(prior.g11_claim,'not-passed');
 for(const[index,oldEntry]of prior.entries.entries()){
  const entry=expected.entries[index];
  for(const kind of kinds)for(const[refIndex,ref]of (oldEntry.individual_proof?.[kind]?.source_members??[]).entries()){
   if(ref.path!==CHECKER_REFERENCE_PATH)continue;
   assert.ok([pin.oldChecker,pin.checker].includes(ref.sha256),'unqualified native checker reference');
   if(ref.sha256!==pin.oldChecker)continue;
   assert.deepEqual(Object.keys(ref).sort(),['path','sha256']);
   const next=entry.individual_proof[kind].source_members[refIndex];next.sha256=pin.checker;
   updates.push({sha:entry.sha,pointer:'/individual_proof/'+kind+'/source_members/'+refIndex,before_reference:structuredClone(ref),after_reference:structuredClone(next),
    before_entry_sha256:hash(encoded(oldEntry)),after_entry_sha256:hash(encoded(entry))});
   replacements.push({sha:entry.sha,after_entry:entry});
  }
 }
 assert.equal(updates.length,pin.count);assert.equal(new Set(updates.map(row=>row.sha)).size,pin.count);assert.deepEqual(updates,packet.updates);
 const existing=nativeReferences(prior).filter(row=>row.reference.sha256===pin.checker);
 assert.equal(existing.length,pin.preserved);assert.deepEqual(existing,packet.already_current_references_to_preserve);
 const after=replaceHistoricalConsumerEntries(before,replacements);assert.equal(after.length,before.length);assert.equal(hash(after),pin.after);
 assert.deepEqual(JSON.parse(after),expected);assert.deepEqual(packet.after_ledger,{path:CHECKER_REFERENCE_LEDGER,sha256:pin.after,bytes:after.length});
 assert.equal(nativeReferences(expected).filter(row=>row.reference.sha256===pin.oldChecker).length,0);
 assert.equal(nativeReferences(expected).length,pin.count+pin.preserved);
 const selected=new Set(updates.map(row=>row.sha));assert.deepEqual(expected.entries.filter(row=>!selected.has(row.sha)),prior.entries.filter(row=>!selected.has(row.sha)));
 const header=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='entries'));assert.deepEqual(header(expected),header(prior));
 for(const key of ['canonical_dispositions_changed','source_admissions_changed','other_current_source_references_changed'])assert.equal(packet[key],0);
 for(const key of ['canonical_ledger_changed','canonical_owner_integration_complete','actual_native_packed_browser_floor_or_full_audit_qualified'])assert.equal(packet[key],false);
 assert.equal(packet.g11_claim,'not-passed');
 return {before:Buffer.from(before),after,updates:structuredClone(updates),preserved:structuredClone(existing),metadata_reference_updates:pin.count,
  unselected_entry_bytes_preserved:1697-pin.count,native_or_full_audit_credit:false};
}
/** Fresh fixed source verification;no verifier/compiler/result callback or cache. */
export function prepareCheckerReferenceSourceMetadata({root,read=path=>currentFile(root,path)}={}){
 const actual=packedUpstreamLedgerCurrentSourceLane({root,read});
 const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;
 const line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);const pin=pins[line],tools=checkerOwnerSourceSubject({root,read}),bound=new Map(tools.bound.map(ref=>[ref.path,{...ref}]));
 const member=(path,digest,bytes)=>{
  const qualified=tools.qualifyReference({path,sha256:digest,...(bytes===undefined?{}:{bytes})});digest=qualified.sha256;bytes=qualified.bytes;
  const physical=currentFile(root,path),raw=read(path);assert.ok(Buffer.isBuffer(raw));
  if(digest)assert.equal(hash(raw),digest,'changed checker proposal input '+path);if(bytes!==undefined)assert.equal(raw.length,bytes);
  assert.equal(hash(raw),hash(physical),'noncurrent source supplied '+path);bound.set(path,{path,sha256:hash(raw),bytes:raw.length});return raw;
 };
 const packet=JSON.parse(member(CHECKER_REFERENCE_PACKET,pin.packet));assert.equal(packet.line,line);assert.equal(packet.source_parent,pin.parent);
 member(SELF,hash(image));for(const ref of packet.source_members)member(ref.path,ref.sha256,ref.bytes);
 member(VERIFIER,pin.verifier);const checker=member(CHECKER_REFERENCE_PATH,pin.checker);
 assert.equal(process.version,'v'+JSON.parse(read('toolchain-lock.json')).repository.node);
 const before=original(root,pin.parent,CHECKER_REFERENCE_LEDGER),result=deriveCheckerReferenceMetadata({before,packet,checker});
 const sourceInputs=JSON.parse(read(packet.qualified_source_inputs.path));
 assert.deepEqual(result.updates.map(row=>row.sha),sourceInputs.selected_references.map(row=>row.sha));
 const artifact=member(packet.after_image.path,packet.after_image.sha256,packet.after_image.bytes);assert.ok(gunzipSync(artifact).equals(result.after),'proposal artifact differs from derivation');
 const physicalLedger=currentFile(root,CHECKER_REFERENCE_LEDGER);
 const verifier=JSON.parse(execFileSync(process.execPath,[VERIFIER,'--metadata'],{cwd:root,encoding:'utf8',maxBuffer:2*1024*1024,timeout:120000}));
 assert.equal(verifier.canonical_frame_admission_granted,false);assert.equal(verifier.current_ledger_sha256,hash(physicalLedger));assert.equal(verifier.current_ledger_bytes,physicalLedger.length);
 assert.equal(verifier.result,'pass');assert.equal(verifier.line,line);assert.equal(verifier.current_checker_sha256,pin.checker);
 assert.equal(verifier.selected_references,pin.count);assert.equal(verifier.actual_guard_exclusion_checks,line==='21.x'?25:26);
 assert.equal(verifier.analysis_node,process.version);assert.equal(verifier.analysis_typescript,JSON.parse(read('package.json')).devDependencies.typescript);
 assert.equal(verifier.complete_hunks,line==='21.x'?7:6);assert.equal(verifier.root_checker_unchanged,true);assert.equal(verifier.canonical_ledger_unchanged,true);
 assert.equal(verifier.old_checker_executed,false);assert.equal(verifier.actual_complete_checker_admission_or_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(verifier.g11_claim,'not-passed');
 const assertCurrent=()=>{actual.assertCurrent();tools.assertCurrent();assert.equal(hash(currentFile(root,CHECKER_REFERENCE_LEDGER)),hash(physicalLedger),'late physical canonical source image');for(const ref of bound.values()){
  const raw=actual.read(ref.path),physical=currentFile(root,ref.path);assert.equal(hash(raw),ref.sha256,'late proposal input '+ref.path);assert.equal(raw.length,ref.bytes);assert.equal(hash(physical),ref.sha256,'late physical proposal input '+ref.path);
 }for(const ref of bound.values()){
  const raw=currentFile(root,ref.path);assert.equal(hash(raw),ref.sha256,'final physical checker proposal input '+ref.path);assert.equal(raw.length,ref.bytes);
 }};
 const verifyAfter=candidate=>{assertCurrent();assert.ok(Buffer.isBuffer(candidate)&&candidate.equals(result.after),'not the exact checker-reference after-image');assertCurrent();return {metadata_only:true,native_or_full_audit_credit:false};};
 assertCurrent();return {line,before:Buffer.from(result.before),after:Buffer.from(result.after),updates:structuredClone(result.updates),preserved:structuredClone(result.preserved),
  metadata_reference_updates:pin.count,unselected_entry_bytes_preserved:1697-pin.count,bound:structuredClone([...bound.values()]),verifier:structuredClone(verifier),assertCurrent,verifyAfter,
  canonical_owner_integration_complete:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
/** The public proposal API admits only its exact complete before/after images.
 * This is no substitute for the canonical owner's complete historical-frame gate. */
export function prepareCheckerReferenceMetadata({root,read=path=>currentFile(root,path)}={}){
 const source=prepareCheckerReferenceSourceMetadata({root,read}),current=read(CHECKER_REFERENCE_LEDGER);
 assert.ok(Buffer.isBuffer(current)&&(current.equals(source.before)||current.equals(source.after)),'unregistered current canonical checker image');
 const ref={path:CHECKER_REFERENCE_LEDGER,sha256:hash(current),bytes:current.length};
 const assertCurrent=()=>{source.assertCurrent();const raw=read(CHECKER_REFERENCE_LEDGER);assert.equal(hash(raw),ref.sha256,'late canonical checker image');assert.equal(raw.length,ref.bytes);};
 const verifyAfter=candidate=>{assertCurrent();const result=source.verifyAfter(candidate);assertCurrent();return result;};
 assertCurrent();return {...source,current_canonical_state:current.equals(source.before)?'before':'after',bound:[...source.bound,{...ref}],assertCurrent,verifyAfter};
}
