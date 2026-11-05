/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite source-reference metadata only; the canonical owner still owns admission. */
import assert from 'node:assert/strict';
import {browserOwnerSourceSubject} from './browser-owner-source.mjs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {readCheckerOwnerMember} from './checker-owner-source.mjs';
import {inspectBrowserReferenceSource} from './browser-reference-source.mjs';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
export const BROWSER_REFERENCE_PACKET='compatibility/rc/c04-browser-reference-proposal.json';
export const BROWSER_REFERENCE_LEDGER='compatibility/f10/disposition-ledger/ledger.json';
const SELF='scripts/browser-reference-proposal.mjs',VERIFIER='tests/browser_reference_source_probe.mjs';
const PINS={
  "main": {
    "parent": "0cda109c68d11278b2c348a34b773bf2e623b20e",
    "before": "0f3ffb5a86e4838a3fd29d7e47e10a30bc7feb39f23d79dde9706473f6337443",
    "after": "d4f65b5545915bee888a342495a13d756f926d5edc7679a529a881d3e5bc4a3d",
    "count": 18,
    "entries": 9,
    "packet": "6a5ed7a82947ac170e3a051c3f7801ee1a72797fc0d679e78f959fe483255c07"
  },
  "21.x": {
    "parent": "7378668ffa018b9cbf5498d84a5db32fa824cc26",
    "before": "8f311ad001bf2daa3152b878414bd010a621d31b76c118d19f4184e5bed0ef17",
    "after": "f0aa2808e6bf022e9901b6edc249e1b08e7be9b7af06af4f154131e4a54c9cee",
    "count": 16,
    "entries": 8,
    "packet": "52d231aca902638226f5065c6622a6f857745990cdd23ee9df211aaf5e5ee56e"
  }
};
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const encoded=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const kinds=['historical_behavior','progress_csp_behavior','media_matcher_behavior','form_field_hover_behavior','content_observer_behavior','ripple_replay_behavior'];
function original(root,commit,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:16*1024*1024});
}
function references(ledger){
 return ledger.entries.flatMap(entry=>kinds.flatMap(kind=>(entry.individual_proof?.[kind]?.source_members??[]).map((ref,index)=>
  ({sha:entry.sha,pointer:'/individual_proof/'+kind+'/source_members/'+index,reference:structuredClone(ref)}))));
}
export function deriveBrowserReferenceMetadata({before,packet,sources}={}){
 const pin=PINS[packet?.line];assert.ok(pin,'unknown browser reference line');assert.equal(hash(encoded(packet)),pin.packet,'changed browser proposal packet');
 assert.ok(Buffer.isBuffer(before));assert.equal(hash(before),pin.before);assert.equal(packet.source_parent,pin.parent);
 assert.equal(packet.metadata_reference_updates,pin.count);assert.equal(packet.selected_entries,pin.entries);
 assert.deepEqual(packet.before_ledger,{path:BROWSER_REFERENCE_LEDGER,sha256:pin.before,bytes:before.length});
 assert.ok(sources instanceof Map);assert.equal(sources.size,4);assert.equal(packet.source_transitions.length,4);
 const transitions=new Map();
 for(const row of packet.source_transitions){
  assert.ok(!transitions.has(row.path));assert.ok(sources.has(row.path));const raw=sources.get(row.path);assert.ok(Buffer.isBuffer(raw));
  assert.deepEqual(row.current,{path:row.path,sha256:hash(raw),bytes:raw.length});assert.ok(/^[0-9a-f]{64}$/.test(row.old_sha256));assert.notEqual(row.old_sha256,row.current.sha256);transitions.set(row.path,row);
 }
 const prior=JSON.parse(before),expected=structuredClone(prior),changes=[],selected=new Set();
 assert.equal(prior.entries.length,1697);assert.equal(new Set(prior.entries.map(row=>row.sha)).size,1697);assert.equal(prior.g11_claim,'not-passed');
 for(const[index,oldEntry]of prior.entries.entries())for(const kind of kinds)for(const[refIndex,ref]of (oldEntry.individual_proof?.[kind]?.source_members??[]).entries()){
  const row=transitions.get(ref.path);if(!row)continue;assert.ok([row.old_sha256,row.current.sha256].includes(ref.sha256),'unknown browser source reference');
  if(ref.sha256===row.current.sha256)continue;assert.deepEqual(Object.keys(ref).sort(),['path','sha256']);
  const next=expected.entries[index].individual_proof[kind].source_members[refIndex];next.sha256=row.current.sha256;selected.add(oldEntry.sha);
  changes.push({sha:oldEntry.sha,pointer:'/individual_proof/'+kind+'/source_members/'+refIndex,before_reference:structuredClone(ref),after_reference:structuredClone(next)});
 }
 assert.equal(changes.length,pin.count);assert.equal(selected.size,pin.entries);
 const updates=changes.map(row=>({...row,before_entry_sha256:hash(encoded(prior.entries.find(entry=>entry.sha===row.sha))),after_entry_sha256:hash(encoded(expected.entries.find(entry=>entry.sha===row.sha)))}));
 assert.deepEqual(updates,packet.updates);
 const selectedPointers=new Set(changes.map(row=>row.sha+row.pointer)),preserved=references(prior).filter(row=>!selectedPointers.has(row.sha+row.pointer));
 assert.equal(preserved.length,packet.preserved_native_reference_count);assert.equal(hash(encoded(preserved)),packet.preserved_native_references_sha256);
 assert.equal(references(prior).filter(row=>transitions.get(row.reference.path)?.current.sha256===row.reference.sha256).length,packet.already_current_browser_references_preserved);
 assert.equal(packet.already_current_browser_references_preserved,0);
 const replacements=expected.entries.filter(entry=>selected.has(entry.sha)).map(entry=>({sha:entry.sha,after_entry:entry}));
 const after=replaceHistoricalConsumerEntries(before,replacements);assert.deepEqual(JSON.parse(after),expected);assert.equal(after.length,before.length);assert.equal(hash(after),pin.after);
 assert.deepEqual(packet.after_ledger,{path:BROWSER_REFERENCE_LEDGER,sha256:pin.after,bytes:after.length});
 assert.deepEqual(expected.entries.filter(entry=>!selected.has(entry.sha)),prior.entries.filter(entry=>!selected.has(entry.sha)));
 const header=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='entries'));assert.deepEqual(header(expected),header(prior));
 assert.deepEqual(references(expected).filter(row=>!selectedPointers.has(row.sha+row.pointer)),preserved);
 for(const ref of references(expected))if(transitions.has(ref.reference.path))assert.equal(ref.reference.sha256,transitions.get(ref.reference.path).current.sha256);
 for(const key of ['canonical_dispositions_changed','source_admissions_changed','other_source_references_changed','product_changes'])assert.equal(packet[key],0);
 for(const key of ['canonical_ledger_changed','canonical_owner_integration_complete','actual_native_packed_browser_floor_or_full_audit_qualified'])assert.equal(packet[key],false);
 assert.equal(packet.g11_claim,'not-passed');
 return {before:Buffer.from(before),after,updates:structuredClone(updates),preserved:structuredClone(preserved),metadata_reference_updates:pin.count,selected_entries:pin.entries,unselected_entry_bytes_preserved:1697-pin.entries,native_or_full_audit_credit:false};
}
/** Source proof is independent of the actual owner's historical-frame gates. */
export function prepareBrowserReferenceSourceMetadata({root,read=path=>readCheckerOwnerMember(root,path)}={}){
 const tools=browserOwnerSourceSubject({root,read}),source=inspectBrowserReferenceSource({root,read}),line=source.report.line,pin=PINS[line];assert.ok(pin);
 const bound=new Map(source.bound.map(ref=>[ref.path,{...ref}])),member=ref=>{
  ref=tools.qualifyReference(ref);
  const raw=read(ref.path),physical=readCheckerOwnerMember(root,ref.path);assert.ok(Buffer.isBuffer(raw));assert.ok(raw.equals(physical),'noncurrent browser proposal source '+ref.path);
  assert.equal(hash(raw),ref.sha256,'changed browser proposal source '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);
  bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;
 };
 const packet=JSON.parse(member({path:BROWSER_REFERENCE_PACKET,sha256:pin.packet}));assert.equal(packet.source_parent,pin.parent);
 member({path:SELF,sha256:hash(image),bytes:image.length});for(const ref of packet.source_members)member(ref);
 const sources=new Map(packet.source_transitions.map(row=>[row.path,member(row.current)]));
 assert.equal(process.version,'v'+JSON.parse(read('toolchain-lock.json')).repository.node);
 const before=original(root,pin.parent,BROWSER_REFERENCE_LEDGER),result=deriveBrowserReferenceMetadata({before,packet,sources});
 const sourceInputs=JSON.parse(read(packet.qualified_source_inputs.path));
 assert.deepEqual(packet.source_transitions,sourceInputs.transitions.map(row=>({path:row.path,old_sha256:row.before.sha256,current:row.after})));
 const qualified=JSON.parse(read(packet.qualified_source.path));assert.equal(qualified.selected_references,pin.count);assert.equal(qualified.distinct_selected_shas,pin.entries);
 const artifact=member(packet.after_image);assert.ok(gunzipSync(artifact).equals(result.after),'browser proposal artifact differs from independent derivation');
 const physicalLedger=readCheckerOwnerMember(root,BROWSER_REFERENCE_LEDGER);
 const verifier=JSON.parse(execFileSync(process.execPath,[VERIFIER,'--source-metadata'],{cwd:root,encoding:'utf8',maxBuffer:2*1024*1024,timeout:180000}));
 assert.equal(verifier.result,'pass');assert.equal(verifier.line,line);assert.equal(verifier.complete_source_transitions,4);assert.equal(verifier.individually_reviewed_hunks,23);assert.equal(verifier.selected_references,pin.count);
 assert.equal(verifier.current_physical_ledger_sha256,hash(physicalLedger));assert.equal(verifier.current_physical_ledger_bytes,physicalLedger.length);
 assert.equal(verifier.analysis_node,process.version);assert.equal(verifier.analysis_typescript,JSON.parse(read('package.json')).devDependencies.typescript);
 assert.equal(verifier.source_execution_mode,'source-metadata');assert.equal(verifier.full_source_fault_lifetimes_executed,false);
 for(const key of ['cold_source_faults_rejected','late_source_faults_rejected','cold_source_fault_paths_rejected','late_source_fault_paths_rejected'])assert.equal(Object.hasOwn(verifier,key),false);
 assert.equal(verifier.title_contract_negative_controls,47);assert.equal(verifier.whole_current_dialog_probe_collaborator_runs.length,8);
 for(const key of ['canonical_frame_admission_granted','old_programs_executed','actual_native_packed_browser_floor_or_full_audit_qualified','actual_angular_DOM_browser_or_packed_execution'])assert.equal(verifier[key],false);
 assert.equal(verifier.g11_claim,'not-passed');
 const assertCurrent=()=>{tools.assertCurrent();source.assertCurrent();assert.ok(readCheckerOwnerMember(root,BROWSER_REFERENCE_LEDGER).equals(physicalLedger),'late physical canonical ledger');for(const ref of bound.values()){
  const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late browser proposal source '+ref.path);assert.equal(raw.length,ref.bytes);assert.ok(raw.equals(readCheckerOwnerMember(root,ref.path)),'late physical browser proposal source '+ref.path);
 }};
 const verifyAfter=candidate=>{assertCurrent();assert.ok(Buffer.isBuffer(candidate)&&candidate.equals(result.after),'not the exact browser-reference after-image');assertCurrent();return {metadata_only:true,canonical_frame_admission_granted:false,native_or_full_audit_credit:false};};
 const verifyInput=candidate=>{assertCurrent();assert.ok(Buffer.isBuffer(candidate)&&(candidate.equals(result.before)||candidate.equals(result.after)),'unregistered canonical browser-reference image');assertCurrent();return {current_canonical_state:candidate.equals(result.before)?'before':'after',canonical_frame_admission_granted:false};};
 assertCurrent();return {line,before:Buffer.from(result.before),after:Buffer.from(result.after),updates:structuredClone(result.updates),preserved:structuredClone(result.preserved),metadata_reference_updates:pin.count,selected_entries:pin.entries,unselected_entry_bytes_preserved:1697-pin.entries,bound:structuredClone([...bound.values()]),verifier:structuredClone(verifier),assertCurrent,verifyAfter,verifyInput,canonical_owner_integration_complete:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
/** The proposal input rule accepts only its two complete exact images. */
export function prepareBrowserReferenceMetadata({root,read=path=>readCheckerOwnerMember(root,path)}={}){
 const source=prepareBrowserReferenceSourceMetadata({root,read}),current=read(BROWSER_REFERENCE_LEDGER),state=source.verifyInput(current);
 const identity={path:BROWSER_REFERENCE_LEDGER,sha256:hash(current),bytes:current.length};
 const assertCurrent=()=>{source.assertCurrent();const raw=read(BROWSER_REFERENCE_LEDGER);assert.equal(hash(raw),identity.sha256,'late canonical browser-reference image');assert.equal(raw.length,identity.bytes);};
 const verifyAfter=candidate=>{assertCurrent();const result=source.verifyAfter(candidate);assertCurrent();return result;};
 const verifyInput=candidate=>{assertCurrent();const result=source.verifyInput(candidate);assertCurrent();return result;};
 assertCurrent();return {...source,...state,bound:structuredClone(source.bound),assertCurrent,verifyAfter,verifyInput};
}
