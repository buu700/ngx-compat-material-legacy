/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current metadata classification and sensitivity; no native execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {preparePackedUpstreamLedger as prepareHistoricalLedger} from '../scripts/packed-upstream-ledger-base.mjs';
import {currentCanonicalTestFrame} from './current_sass_canonical_test_scope.mjs';

import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {historicalConsumerWrapperMetadata,CONSUMER_WRAPPER_LEDGER,CONSUMER_WRAPPER_PACKET,CONSUMER_WRAPPER_TRANSPORT,CONSUMER_WRAPPER_QUALIFICATION} from '../scripts/historical-consumer-wrapper-metadata.mjs';
import {preparePackedUpstreamLedger,packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path));
const hash=raw=>createHash('sha256').update(raw).digest('hex'),json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const name of Object.keys(env))if(name.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(name))delete env[name];
// Superseded historical owner/raw/count assertions remain authenticated program
// DATA. This Git program is never imported or executed.
const oldProgram=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
 'd8ab97315b6c77b83f42c2bebcf63b2984fff255:tests/historical_consumer_wrapper_metadata_probe.mjs'],{cwd:root,env,maxBuffer:1024*1024});
assert.equal(hash(oldProgram),'ec923b7044a110032405acfb37a0c8276017d9a2907708d0b51e33d5ed1631f0');assert.equal(oldProgram.length,5012);
const physicalRead=read;
const preparedHistory=prepareHistoricalLedger({root,read:physicalRead});
const historicalPriorAdmissions=(preparedHistory.testing_api_stage?.individual_decisions??0)+
 preparedHistory.sass_stage.individual_decisions+preparedHistory.rules_js_stage.individual_decisions+
 preparedHistory.autocomplete_landscape_stage.individual_decisions+preparedHistory.selection_native_stage.individual_decisions;
assert.equal(historicalPriorAdmissions,preparedHistory.line==='21.x'?20:13);
assert.equal(preparedHistory.historical_wrapper_metadata_stage.metadata_entries,4);
assert.equal(preparedHistory.historical_wrapper_metadata_stage.individual_decisions,0);
assert.equal(preparedHistory.historical_consumer_wrapper_metadata_stage.metadata_entries,65);
assert.equal(preparedHistory.historical_consumer_wrapper_metadata_stage.individual_decisions,0);
assert.equal(preparedHistory.current_native_packed_or_floor_qualified,false);
const transport=JSON.parse(read(CONSUMER_WRAPPER_TRANSPORT)),packet=JSON.parse(read(CONSUMER_WRAPPER_PACKET));
const source=historicalConsumerWrapperMetadata({root}),prepared=preparePackedUpstreamLedger({root});
assert.equal(source.after.equals(prepared.historical_consumer_wrapper_metadata_stage.after),true);
assert.equal(source.before.equals(preparedHistory.historical_consumer_wrapper_metadata_stage.before),true);
assert.equal(source.after.equals(preparedHistory.historical_consumer_wrapper_metadata_stage.after),true);
assert.equal(source.before.equals(preparedHistory.historical_wrapper_metadata_stage.after),true);
assert.equal(prepared.canonical_after.equals(prepared.base_class_removal_stage.after),true);
assert.equal(read(CONSUMER_WRAPPER_LEDGER).equals(prepared.base_class_removal_stage.physically_applied?prepared.base_class_removal_stage.after:prepared.base_class_removal_stage.before),true);
assert.equal(source.metadata_entries,65);assert.equal(source.individual_decisions,0);source.assertCurrent();
const controls=[];
function reject(id,member,change){
  const original=read(member),changed=change(original);assert.equal(original.equals(changed),false);
  assert.throws(()=>historicalConsumerWrapperMetadata({root,read:path=>path===member?changed:read(path)}),undefined,id);
  controls.push({id,result:'rejected'});
}
const append=raw=>Buffer.concat([raw,Buffer.from('\n')]);
reject('changed-transport',CONSUMER_WRAPPER_TRANSPORT,append);
for(const row of transport.wrappers.slice(0,3))reject('changed-wrapper:'+row.path,row.path,append);
reject('changed-original-probe',transport.wrappers[0].probe,append);
reject('failed-integration',CONSUMER_WRAPPER_QUALIFICATION,raw=>{const value=JSON.parse(raw);value.transport_methods_failed=1;return json(value);});
reject('changed-qualified-code',JSON.parse(read(CONSUMER_WRAPPER_QUALIFICATION)).bound_inputs.find(row=>row.path==='scripts/historical-consumer-child.mjs').path,append);
reject('changed-original-review',transport.canonical_reference_refresh_required[0].prior_review.path,append);
const delegated=transport.canonical_reference_refresh_required.find(row=>row.prior_review.path.includes('bootstrap-stability-'));
reject('changed-delegated-hunk-review',delegated.original_hunk_review_subject.path,append);
const prior=JSON.parse(read(transport.canonical_reference_refresh_required[0].prior_review.path));reject('changed-original-patch',prior.patch_file,append);
let late=false;const lateSource=historicalConsumerWrapperMetadata({root,read:path=>late&&path===transport.wrappers[0].path?append(read(path)):read(path)});
late=true;assert.throws(()=>lateSource.assertCurrent(),/late historical consumer metadata input/);controls.push({id:'late-wrapper-drift',result:'rejected'});
// Historical counters come from genuine physically prepared complete stage DATA.
const checkpoint=source.line==='21.x'?preparedHistory.registered_checker_metadata_stage.after:preparedHistory.canonical_after;
const historicalAdmissions=historicalPriorAdmissions+(source.line==='21.x'?preparedHistory.legacy_sass_entrypoint_stage.individual_decisions+preparedHistory.token_build_stage.individual_decisions+preparedHistory.unthemable_stage.individual_decisions:0);
assert.equal(historicalAdmissions,source.line==='main'?13:27);
assert.equal(preparedHistory.historical_consumer_wrapper_metadata_stage.metadata_entries,65);
assert.equal(preparedHistory.historical_wrapper_metadata_stage.metadata_entries,4);
if(source.line==='21.x'){
 assert.equal(preparedHistory.token_build_stage.individual_decisions,1);assert.equal(preparedHistory.legacy_sass_entrypoint_stage.individual_decisions,1);
 assert.equal(preparedHistory.registered_checker_metadata_stage.before.equals(preparedHistory.unthemable_stage.after),true);
}
const physicalFrame=currentCanonicalTestFrame({root,read}),physicalOwner=packedUpstreamLedgerEpoch({root,read:physicalRead});
assert.equal(physicalOwner.individual_decisions_applied,physicalFrame.individual_source_reviews);
assert.equal(physicalOwner.base_class_removal_source_decisions_applied,physicalFrame.base_class_decisions);
assert.equal(prepared.base_class_removal_stage.physically_applied,physicalFrame.base_class_decisions===1);
assert.equal(physicalOwner.raw,physicalRead);assert.equal(physicalOwner.raw(CONSUMER_WRAPPER_LEDGER).equals(read(CONSUMER_WRAPPER_LEDGER)),true);
assert.equal(physicalOwner.current_native_packed_or_floor_or_g11_credit,false);
physicalOwner.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();
let currentNonphysicalLedgerRejections=0;
const rejectHistoricalReader=bytes=>{assert.throws(()=>packedUpstreamLedgerEpoch({root,read:path=>path===CONSUMER_WRAPPER_LEDGER?bytes:read(path)}),error=>error?.code==='ERR_ASSERTION'&&error.message.includes('nonphysical canonical input '+CONSUMER_WRAPPER_LEDGER));currentNonphysicalLedgerRejections++;};
rejectHistoricalReader(checkpoint);
function assertConsumerIndependentEvidence(body,proof){assert.deepEqual(body.independent_source_evidence,proof.source_evidence,'consumer independent source evidence');}
function assertConsumerStageDATA(raw,mode='after'){
 assert.ok(Buffer.isBuffer(raw));assert.ok(['before','after'].includes(mode));const prior=JSON.parse(source.before),candidate=JSON.parse(raw),rows=transport.canonical_reference_refresh_required;
 assert.equal(prior.entries.length,1697);assert.equal(candidate.entries.length,1697);assert.equal(rows.length,65);assert.equal(source.entries.length,65);assert.equal(source.reports.length,65);
 const selected=new Map(rows.map(row=>[row.sha,row]));assert.equal(selected.size,65);
 const withoutEntries=ledger=>{const copy=structuredClone(ledger);delete copy.entries;return copy;};assert.deepEqual(withoutEntries(candidate),withoutEntries(prior),'consumer header or decision counts changed');
 let untouched=0,hunks=0,refreshes=0,reports=0;
 for(let i=0;i<prior.entries.length;i++){
  const old=prior.entries[i],actual=candidate.entries[i];assert.equal(actual.sha,old.sha);const row=selected.get(old.sha);
  if(!row){assert.deepEqual(actual,old,'consumer unselected entry changed');untouched++;continue;}
  const result=source.entries.find(item=>item.sha===row.sha),report=source.reports.find(item=>item.sha===row.sha);assert.ok(result&&report);
  assert.equal(hash(json(old)),row.before_entry_sha256);assert.equal(row.source_reference_changes.length,1);const change=row.source_reference_changes[0],index=change.index;
  assert.deepEqual(old.individual_proof.source_evidence[index],change.before);assert.deepEqual(result.after_entry.individual_proof.source_evidence[index],change.after);
  const expected=structuredClone(old);
  if(mode==='after'){
   expected.individual_proof.source_evidence[index]=structuredClone(change.after);
   expected.individual_proof.historical_consumer_wrapper_successor=structuredClone(result.after_entry.individual_proof.historical_consumer_wrapper_successor);
   expected.evidence_report=result.current_review.path;expected.source_check.evidence_report_sha256=result.current_review.sha256;
  }
  assert.deepEqual(actual.individual_proof.source_evidence[index],mode==='after'?change.after:change.before,'consumer selected source reference');
  assert.equal(actual.final_disposition,old.final_disposition,'consumer disposition changed');assert.equal(actual.reason,old.reason);assert.equal(actual.individual_proof.proof_kind,old.individual_proof.proof_kind);
  assert.deepEqual(actual,expected,'consumer decision, hunk, other source reference or report changed');
  assert.equal(hash(report.raw),result.current_review.sha256);assert.equal(report.raw.length,result.current_review.bytes);assert.equal(report.path,result.current_review.path);
  assert.deepEqual(report.body.individual_proof,result.after_entry.individual_proof);assertConsumerIndependentEvidence(report.body,result.after_entry.individual_proof);
  const hunkRaw=read(row.original_hunk_review_subject.path);assert.equal(hash(hunkRaw),row.original_hunk_review_subject.sha256);if(row.original_hunk_review_subject.bytes!==undefined)assert.equal(hunkRaw.length,row.original_hunk_review_subject.bytes);
  const hunkData=JSON.parse(hunkRaw);assert.equal(hunkData.hunk_reviews.length,row.original_hunks);if(report.body.hunk_reviews)assert.deepEqual(report.body.hunk_reviews,hunkData.hunk_reviews);else assert.deepEqual(report.body.historical_source_review,hunkData);hunks+=row.original_hunks;refreshes+=Number(mode==='after');reports+=Number(mode==='after');
 }
 assert.equal(untouched,1632);assert.equal(hunks,7770);assert.equal(refreshes,mode==='after'?65:0);assert.equal(reports,mode==='after'?65:0);
}
assertConsumerStageDATA(source.before,'before');assertConsumerStageDATA(source.after);
const stageValid=JSON.parse(source.after),firstTransition=transport.canonical_reference_refresh_required[0],firstIndex=stageValid.entries.findIndex(row=>row.sha===firstTransition.sha);assert.ok(firstIndex>=0);
const sourceReversion=structuredClone(stageValid);sourceReversion.entries[firstIndex].individual_proof.source_evidence[firstTransition.source_reference_changes[0].index]=structuredClone(firstTransition.source_reference_changes[0].before);
assert.throws(()=>assertConsumerStageDATA(json(sourceReversion)),/consumer selected source reference/);
const changedDecision=structuredClone(stageValid);changedDecision.entries[firstIndex].final_disposition=changedDecision.entries[firstIndex].final_disposition==='adapt'?'do-not-adopt':'adapt';
assert.throws(()=>assertConsumerStageDATA(json(changedDecision)),/consumer disposition changed/);
const consumerEvidenceRow=transport.canonical_reference_refresh_required.find(row=>source.reports.find(report=>report.sha===row.sha).body.independent_source_evidence.length>1),consumerEvidenceReport=source.reports.find(report=>report.sha===consumerEvidenceRow.sha),consumerEvidenceEntry=source.entries.find(entry=>entry.sha===consumerEvidenceRow.sha),consumerEvidenceIndex=consumerEvidenceReport.body.independent_source_evidence.findIndex((ref,i)=>i!==consumerEvidenceRow.source_reference_changes[0].index);assert.ok(consumerEvidenceIndex>=0);
const consumerEvidenceMutant=structuredClone(consumerEvidenceReport.body);assert.notEqual(consumerEvidenceMutant.independent_source_evidence[consumerEvidenceIndex].sha256,'0'.repeat(64));consumerEvidenceMutant.independent_source_evidence[consumerEvidenceIndex].sha256='0'.repeat(64);assertConsumerIndependentEvidence(consumerEvidenceReport.body,consumerEvidenceEntry.after_entry.individual_proof);assert.throws(()=>assertConsumerIndependentEvidence(consumerEvidenceMutant,consumerEvidenceEntry.after_entry.individual_proof),/consumer independent source evidence/);
// The original malformed-byte control remains a byte-integrity check.
const assertConsumerDATA=bytes=>{assert.ok(Buffer.isBuffer(bytes));assert.deepEqual(bytes,checkpoint,'not exact complete consumer checkpoint DATA');};
assertConsumerDATA(checkpoint);
const altered=Buffer.from(checkpoint);altered[0]=32;
assert.notEqual(hash(altered),packet.after_sha256);
assert.throws(()=>assertConsumerDATA(altered),/not exact complete consumer checkpoint DATA/);rejectHistoricalReader(altered);
controls.push({id:'unapproved-canonical-ledger-bytes',result:'rejected'});
physicalOwner.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();prepared.assertCurrent();source.assertCurrent();
const report={schema_version:1,historical_json_comparison_only:true,original_program_authenticated_as_DATA:true,original_program_executed:false,current_physical_source_admissions:physicalOwner.individual_decisions_applied,current_physical_base_class_decisions:physicalOwner.base_class_removal_source_decisions_applied,current_physical_owner_guarded:true,current_nonphysical_ledger_rejections:currentNonphysicalLedgerRejections,line:source.line,metadata_positive_cases:3,rejection_controls:controls.length,controls,
  metadata_entries:65,original_hunks_preserved:7770,original_decisions_changed:0,individual_decisions_applied:historicalAdmissions,
  legacy_four_entry_successor_still_classified:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
