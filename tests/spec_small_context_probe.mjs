/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual before/proposed readers plus source, semantic and metadata corruption controls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SPEC_CONTEXT_INPUTS,SPEC_CONTEXT_SCOPE_PATHS,inspectSpecContextRequalification,
 assertSpecContextMetadataState,reviewSpecInventoryDelta,validateSpecContextScopes} from '../scripts/spec-small-context-requalification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const result=inspectSpecContextRequalification({root}),cases=[];
assert.equal(result.source_scope_rows,83);assert.equal(result.native_source_bindings,20);assert.equal(result.writes.size,28);assert.equal(result.updates.size,103);
assert.equal(result.frozenEvidence.reviewed,1446);assert.equal(result.frozenEvidence.insufficient,0);assert.equal(result.currentAdmission.source_snapshot_valid,true);assert.equal(result.currentAdmission.review_evidence.reviewed,178);assert.equal(result.currentAdmission.review_evidence.insufficient,0);
for(const path of ['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json'])assert.equal(result.writes.has(path),false);
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json',inventoryPath='testing/legacy-runner/historical-inventory.json';
const proposed=path=>result.writes.get(path)||read(path);
let metadataControls=0;
for(const state of ['before','proposed']){
 const map=new Map([...new Set([...result.previous.keys(),...result.writes.keys()])].map(path=>[path,state==='before'?(result.previous.get(path)||result.writes.get(path)):(result.writes.get(path)||result.previous.get(path))]));
 const activeRead=path=>map.get(path)||read(path),has=path=>state==='before'?result.previous.has(path):map.has(path);
 assertSpecContextMetadataState({previous:result.previous,writes:result.writes,read:activeRead,has});
 for(const [path,value]of map){if(!has(path))continue;const corrupted=Buffer.concat([value,Buffer.from(' ')]);
  assert.throws(()=>assertSpecContextMetadataState({previous:result.previous,writes:result.writes,read:name=>name===path?corrupted:activeRead(name),has}),/metadata changed/,state+'/'+path);
  cases.push({id:state+'-live-metadata-'+path,result:'rejected'});metadataControls++;
 }
}
assert.equal(metadataControls,75);
const beforeInventory=JSON.parse(result.previous.has(inventoryPath)?result.previous.get(inventoryPath):read(inventoryPath));
// Recover only the known old candidate snapshot from the actual committed new
// inventory for pure delta controls; the real inspector authenticated the exact
// old Git bytes and ran the full before/proposed scope validators above.
const actualInventory=JSON.parse(read(inventoryPath)),oldInventory=structuredClone(actualInventory),fixturePath=result.inputs.reviewed_delta[0].path;
const oldRow=oldInventory.rows.find(row=>row.candidate===fixturePath),currentRow=actualInventory.rows.find(row=>row.candidate===fixturePath);
oldRow.candidate_sha256=result.inputs.reviewed_delta[0].before_sha256;oldRow.prior_candidate_snapshots.pop();oldInventory.candidate_snapshot.member_refreshes.pop();
const options={previousSourceSha:result.inputs.reviewed_delta[0].before_sha256,currentSourceSha:result.inputs.reviewed_delta[0].current_sha256,
 controls:{path:'compatibility/rc/spec-small-source-controls.json',sha256:hash(read('compatibility/rc/spec-small-source-controls.json'))},parent:result.inputs.before_frame.commit};
assert.equal(reviewSpecInventoryDelta(json(oldInventory),json(actualInventory),options).candidate_source_bindings_changed,1);
const inventoryMutations=[
 value=>{value.rows.find(row=>row.candidate===fixturePath).candidate_sha256='0'.repeat(64);},
 value=>{value.rows.find(row=>row.candidate===fixturePath).historical_sha256='0'.repeat(64);},
 value=>{value.rows.find(row=>row.candidate===fixturePath).execution.bound_to_current_head=true;},
 value=>{value.rows.find(row=>row.candidate===fixturePath).prior_candidate_snapshots.pop();},
 value=>{value.rows.find(row=>row.candidate===fixturePath).prior_candidate_snapshots.at(-1).execution.state='passed';},
 value=>{value.counts.adapted--;},value=>{value.rows[1].family='foreign';},
 value=>{value.candidate_snapshot.member_refreshes.at(-1).source_controls.sha256='0'.repeat(64);},
];
for(const [index,mutate]of inventoryMutations.entries()){const value=structuredClone(actualInventory);mutate(value);assert.throws(()=>reviewSpecInventoryDelta(json(oldInventory),json(value),options));cases.push({id:'inventory-delta-'+index,result:'rejected'});}
const currentEntries=[...result.updates.values()].filter(row=>SPEC_CONTEXT_SCOPE_PATHS.includes(row.evidence_report));
const documents=SPEC_CONTEXT_SCOPE_PATHS.map(path=>JSON.parse(result.writes.get(path)));
const semanticMutations=[
 value=>{value.candidate_context.product_members.pop();},
 value=>{value.historical_suite_context.pop();},
 value=>{value.source_scope.retained_contexts[0].candidate_member_sha256='0'.repeat(64);},
 value=>{value.source_scope.retained_architecture.product_source_population_sha256='0'.repeat(64);},
 value=>{value.candidate_context.library_builder='unreviewed builder';},
 value=>{value.ownership_context.historical_selection=56;},
];
for(const [index,mutate]of semanticMutations.entries()){
 const bad=structuredClone(documents);mutate(bad[index]);assert.notDeepEqual(bad[index],documents[index]);const path=SPEC_CONTEXT_SCOPE_PATHS[index],bytes=json(bad[index]);
 const entries=structuredClone(currentEntries);for(const row of entries)if(row.evidence_report===path&&row.source_check)row.source_check.evidence_report_sha256=hash(bytes);
 assert.throws(()=>validateSpecContextScopes({documents:bad,entries,read:name=>name===path?bytes:proposed(name),productPaths:result.productPaths,line:result.line}));
 cases.push({id:'rehashed-actual-scope-reader-'+index,result:'rejected'});
}
const mutations=[
 [SPEC_CONTEXT_INPUTS,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/context input changed/],
 ['projects/ngx-material-legacy/legacy-select/select.scss',bytes=>Buffer.concat([bytes,Buffer.from('\n/* unreviewed */')]),/unreviewed current context source/],
 [inventoryPath,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/unreviewed current context source/],
 [ledgerPath,bytes=>{const value=JSON.parse(bytes),row=value.entries.find(row=>!result.updates.has(row.sha));row.reason+=' unreviewed caller modification';return json(value);},/live context metadata changed/],
];
for(const [path,mutate,pattern]of mutations){const bytes=mutate(read(path));assert.throws(()=>inspectSpecContextRequalification({root,readMember:name=>name===path?bytes:read(name)}),pattern,path);cases.push({id:'actual-inspector-caller-'+path,result:'rejected'});}
let changedNativeEntries=0;
for(const registered of result.inputs.runtime_requirements){
 const before=result.beforeLedger.entries.find(row=>row.sha===registered.sha),after=result.updates.get(registered.sha);
 const oldScope=before.individual_proof[registered.field],newScope=after.individual_proof[registered.field];
 assert.deepEqual({...newScope,source_members:[]},{...oldScope,source_members:[]});
 let changed=false;for(const [index,member]of newScope.source_members.entries()){
  const prior=oldScope.source_members[index];assert.equal(member.path,prior.path);assert.equal(member.sha256,hash(proposed(member.path)));
  if(member.sha256!==prior.sha256){changed=true;assert.ok(result.inputs.reviewed_delta.some(row=>row.path===member.path));}
 }if(changed)changedNativeEntries++;
 const oldReview=JSON.parse(result.previous.get(before.evidence_report)),review=JSON.parse(result.writes.get(after.evidence_report)),restored=structuredClone(review);
 for(const name of ['individual_proof','reviewed_source_members','independent_evidence']){if(Object.hasOwn(oldReview,name))restored[name]=oldReview[name];else delete restored[name];}
 delete restored.spec_fixture_context_requalification;assert.deepEqual(restored,oldReview,'original native judgment changed');
 assert.equal(review.g11_claim,'not-passed');assert.equal(review.spec_fixture_context_requalification.actual_native_packed_or_floor_qualified,false);
}
const nextLedger=JSON.parse(result.writes.get(ledgerPath));assert.deepEqual(nextLedger.entries.map(row=>[row.sha,row.final_disposition]),result.beforeLedger.entries.map(row=>[row.sha,row.final_disposition]));
const report={schema_version:1,line:result.line,scope:'Actual full83 before/proposed source readers and20 unchanged runtime definitions, with metadata, inventory, semantic and live caller corruption controls. No product/native/floor admission.',
 source_scope_rows:83,native_source_bindings:20,changed_native_source_sets:changedNativeEntries,proposed_writes:28,metadata_corruption_controls:metadataControls,inventory_delta_controls:inventoryMutations.length,actual_scope_semantic_controls:semanticMutations.length,actual_inspector_controls:mutations.length,controls:cases.length,cases,
 all1697_dispositions_and_all_authored_statuses_preserved:true,other1594_entries_unchanged:true,frozen_reviewed:1446,frozen_insufficient:0,delta_reviewed:178,delta_insufficient:0,
 producer_sha256:hash(read('tests/spec_small_context_probe.mjs')),helper_sha256:hash(read('scripts/spec-small-context-requalification.mjs')),inputs_sha256:hash(read(SPEC_CONTEXT_INPUTS)),
 actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,cases:undefined}));
