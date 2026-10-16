/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual original scope readers and exact metadata, inventory and current-caller rejection controls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CONTROL_CONTEXT_INPUTS,CONTROL_CONTEXT_SCOPE_PATHS,inspectControlContextRequalification,reviewControlInventoryDelta} from '../scripts/spec-control-context-requalification.mjs';
import {assertSpecContextMetadataState,validateSpecContextScopes} from '../scripts/spec-small-context-requalification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const result=inspectControlContextRequalification({root}),cases=[];assert.equal(result.writes.size,38);assert.equal(result.updates.size,113);assert.equal(result.previous.size,37);assert.equal(result.source_scope_rows,83);assert.equal(result.native_source_bindings,20);assert.equal(result.generic_source_records,10);assert.equal(result.frozenEvidence.reviewed,1446);assert.equal(result.frozenEvidence.insufficient,0);assert.equal(result.currentAdmission.source_snapshot_valid,true);assert.equal(result.currentAdmission.review_evidence.reviewed,178);assert.equal(result.currentAdmission.review_evidence.insufficient,0);
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json',inventoryPath='testing/legacy-runner/historical-inventory.json',proposed=path=>result.writes.get(path)||read(path);
for(const path of ['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json',inventoryPath,...result.repair.rows.map(row=>row.path)])assert.equal(result.writes.has(path),false);
let metadataControls=0;
for(const state of ['before','proposed']){
 const map=new Map([...new Set([...result.previous.keys(),...result.writes.keys()])].map(path=>[path,state==='before'?(result.previous.get(path)||result.writes.get(path)):(result.writes.get(path)||result.previous.get(path))]));const activeRead=path=>map.get(path)||read(path),has=path=>state==='before'?result.previous.has(path):map.has(path);assertSpecContextMetadataState({previous:result.previous,writes:result.writes,read:activeRead,has});
 for(const [path,bytes]of map){if(!has(path))continue;const bad=Buffer.concat([bytes,Buffer.from(' ')]);assert.throws(()=>assertSpecContextMetadataState({previous:result.previous,writes:result.writes,read:name=>name===path?bad:activeRead(name),has}),/metadata changed/,state+'/'+path);cases.push({id:state+'-metadata-'+path,result:'rejected'});metadataControls++;}
}
assert.equal(metadataControls,105);
const oldInventory=JSON.parse(result.beforeInventory),currentInventory=JSON.parse(result.currentInventory),inventoryOptions={rows:result.repair.rows,parent:result.inputs.before_frame.commit,sourceProof:result.sourceProofRef};assert.equal(reviewControlInventoryDelta(result.beforeInventory,result.currentInventory,inventoryOptions).candidate_source_bindings_changed,2);
const first=result.repair.rows[0].path,second=result.repair.rows[1].path,row=(value,path)=>value.rows.find(row=>row.candidate===path);
const inventoryMutations=[
 value=>{row(value,first).candidate_sha256='0'.repeat(64);},value=>{row(value,second).candidate_sha256='0'.repeat(64);},
 value=>{row(value,first).historical_sha256='0'.repeat(64);},value=>{row(value,second).historical_sha256='0'.repeat(64);},
 value=>{row(value,first).execution.bound_to_current_head=true;},value=>{row(value,second).execution.state='passed';},
 value=>{row(value,first).prior_candidate_snapshots.pop();},value=>{row(value,second).prior_candidate_snapshots.at(-1).execution.state='passed';},
 value=>{value.candidate_snapshot.member_refreshes.at(-1).source_proof.sha256='0'.repeat(64);},value=>{value.counts.adapted--;},
 value=>{value.rows.find(row=>![first,second].includes(row.candidate)).family='foreign';},
 value=>{row(value,first).prior_candidate_snapshots.at(-1).actual_Angular_qualified=true;},
];
for(const [index,mutate]of inventoryMutations.entries()){const changed=structuredClone(currentInventory);mutate(changed);assert.throws(()=>reviewControlInventoryDelta(json(oldInventory),json(changed),inventoryOptions));cases.push({id:'inventory-delta-'+index,result:'rejected'});}
const currentEntries=[...result.updates.values()].filter(row=>CONTROL_CONTEXT_SCOPE_PATHS.includes(row.evidence_report)),documents=CONTROL_CONTEXT_SCOPE_PATHS.map(path=>JSON.parse(result.writes.get(path)));
const semanticMutations=[value=>{value.candidate_context.product_members.pop();},value=>{value.historical_suite_context.pop();},value=>{value.source_scope.retained_contexts[0].candidate_member_sha256='0'.repeat(64);},value=>{value.source_scope.retained_architecture.product_source_population_sha256='0'.repeat(64);},value=>{value.candidate_context.library_builder='unreviewed builder';},value=>{value.ownership_context.historical_selection=56;}];
for(const [index,mutate]of semanticMutations.entries()){
 const changed=structuredClone(documents);mutate(changed[index]);assert.notDeepEqual(changed[index],documents[index]);const path=CONTROL_CONTEXT_SCOPE_PATHS[index],bytes=json(changed[index]),entries=structuredClone(currentEntries);for(const entry of entries)if(entry.evidence_report===path&&entry.source_check)entry.source_check.evidence_report_sha256=hash(bytes);
 assert.throws(()=>validateSpecContextScopes({documents:changed,entries,read:name=>name===path?bytes:proposed(name),productPaths:result.productPaths,line:result.line}));cases.push({id:'rehashed-original-scope-semantics-'+index,result:'rejected'});
}
const autoPath=result.repair.rows[1].path,prior=JSON.parse(result.beforeInventory);
const callerMutations=[
 [CONTROL_CONTEXT_INPUTS,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/control context input changed/],
 ['projects/ngx-material-legacy/legacy-select/select.scss',bytes=>Buffer.concat([bytes,Buffer.from('\n/* unreviewed */')]),/unreviewed current context source/],
 [inventoryPath,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/unreviewed current context source/],
 [autoPath,()=>{const current=read(autoPath).toString(),source=result.repair.rows[1];return Buffer.from(current.slice(0,source.insertion_offset)+current.slice(source.insertion_offset+source.inserted_text.length));},/unreviewed current context source/],
 [ledgerPath,bytes=>{const changed=JSON.parse(bytes);changed.entries.find(row=>!result.updates.has(row.sha)).reason+=' unreviewed caller data';return json(changed);},/live context metadata changed/],
];
for(const [path,mutate,pattern]of callerMutations){const changed=mutate(read(path));assert.notDeepEqual(changed,read(path));assert.throws(()=>inspectControlContextRequalification({root,readMember:name=>name===path?changed:read(name)}),pattern,path);cases.push({id:'actual-current-caller-'+path,result:'rejected'});}
let changedNativeSets=0;
for(const registered of result.inputs.runtime_requirements){
 const before=result.beforeLedger.entries.find(row=>row.sha===registered.sha),after=result.updates.get(registered.sha),oldScope=before.individual_proof[registered.field],newScope=after.individual_proof[registered.field];assert.deepEqual({...newScope,source_members:[]},{...oldScope,source_members:[]});let changed=false;
 for(const [index,member]of newScope.source_members.entries()){const old=oldScope.source_members[index];assert.equal(member.path,old.path);assert.equal(member.sha256,hash(proposed(member.path)));if(member.sha256!==old.sha256){changed=true;assert.ok(result.inputs.reviewed_delta.some(row=>row.path===member.path));}}
 if(changed)changedNativeSets++;
 const oldReview=JSON.parse(result.previous.get(before.evidence_report)),newReview=JSON.parse(result.writes.get(after.evidence_report)),restored=structuredClone(newReview);for(const field of ['individual_proof','reviewed_source_members','independent_evidence']){if(Object.hasOwn(oldReview,field))restored[field]=oldReview[field];else delete restored[field];}delete restored.control_case_context_requalification;assert.deepEqual(restored,oldReview,'original native judgment changed');assert.equal(newReview.control_case_context_requalification.actual_native_packed_or_floor_qualified,false);
 const restoredEntry={...after,individual_proof:before.individual_proof,evidence_report:before.evidence_report};assert.deepEqual(restoredEntry,before);
}
assert.equal(changedNativeSets,7);
for(const sha of result.inputs.generic_source_shas){
 const before=result.beforeLedger.entries.find(row=>row.sha===sha),after=result.updates.get(sha),oldReview=JSON.parse(result.previous.get(before.evidence_report)),newReview=JSON.parse(result.writes.get(after.evidence_report)),restored=structuredClone(newReview);restored.individual_proof=oldReview.individual_proof;restored.independent_source_evidence=oldReview.independent_source_evidence;delete restored.control_case_context_requalification;assert.deepEqual(restored,oldReview,'original generic source judgment changed');assert.equal(newReview.control_case_context_requalification.actual_native_packed_or_floor_qualified,false);assert.deepEqual({...after,individual_proof:before.individual_proof,evidence_report:before.evidence_report},before);for(const ref of after.individual_proof.source_evidence)assert.equal(ref.sha256,hash(proposed(ref.path)));
}
const afterLedger=JSON.parse(result.writes.get(ledgerPath));assert.deepEqual(afterLedger.entries.map(row=>[row.sha,row.final_disposition]),result.beforeLedger.entries.map(row=>[row.sha,row.final_disposition]));assert.equal(result.beforeLedger.entries.filter(row=>!result.updates.has(row.sha)).length,1584);
const report={schema_version:1,line:result.line,scope:'All83 original before/proposed validators,20 unchanged native definitions and ten preserved source verdicts after two appended cases. No actual Angular/native/packed/floor admission.',source_scope_rows:83,native_source_bindings:20,changed_native_source_sets:changedNativeSets,generic_source_records:10,qualified_entries:113,proposed_writes:38,metadata_corruption_controls:metadataControls,inventory_delta_controls:inventoryMutations.length,actual_scope_semantic_controls:semanticMutations.length,actual_current_caller_controls:callerMutations.length,controls:cases.length,cases,original_cases_preserved:2220,additional_cases:2,current_case_cells:2227,untouched_other_ledger_entries:1584,all1697_dispositions_and_authored_statuses_preserved:true,frozen_reviewed:1446,frozen_insufficient:0,delta_reviewed:178,delta_insufficient:0,producer_sha256:hash(read('tests/spec_control_context_probe.mjs')),helper_sha256:hash(read('scripts/spec-control-context-requalification.mjs')),inputs_sha256:hash(read(CONTROL_CONTEXT_INPUTS)),actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
assert.equal(cases.length,128);const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,cases:undefined}));
