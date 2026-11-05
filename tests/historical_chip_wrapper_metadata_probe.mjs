/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Transport metadata stays finite and cannot waive original/native checks. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {preparePackedUpstreamLedger as prepareHistoricalLedger} from '../scripts/packed-upstream-ledger-base.mjs';
import {currentCanonicalTestFrame} from './current_sass_canonical_test_scope.mjs';

import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {historicalChipWrapperMetadata,HISTORICAL_WRAPPER_PACKET,HISTORICAL_WRAPPER_LEDGER,HISTORICAL_WRAPPER_TRANSPORT} from '../scripts/historical-chip-wrapper-metadata.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const name of Object.keys(env))if(name.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(name))delete env[name];
// Superseded historical owner/raw/count assertions remain authenticated program
// DATA. This Git program is never imported or executed.
const oldProgram=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
 'd8ab97315b6c77b83f42c2bebcf63b2984fff255:tests/historical_chip_wrapper_metadata_probe.mjs'],{cwd:root,env,maxBuffer:1024*1024});
assert.equal(hash(oldProgram),'0d9c6b02e9a81f45e1dcb850a9de42d75789c36c73a784759fdf00243dd81ad7');assert.equal(oldProgram.length,6029);
let ownerLate=null;const physicalRead=p=>ownerLate===p?Buffer.concat([read(p),Buffer.from(' ')]):read(p);
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
const source=historicalChipWrapperMetadata({root,read}),packet=JSON.parse(read(HISTORICAL_WRAPPER_PACKET)),positive=[],rejected=[];
assert.equal(source.metadata_entries,4);assert.equal(source.original_hunks_preserved,198);assert.equal(source.original_dispositions_or_hunk_judgments_changed,0);
positive.push('four-wrapper-references-preserve-198-original-hunk-judgments-and-dispositions');
// Reconstruct this exact metadata-only checkpoint before later source decisions.
let fixture=source.before.toString();const fixtureRows=JSON.parse(source.before).entries;
for(const change of source.entries){
  const prior=fixtureRows.find(row=>row.sha===change.sha),from=JSON.stringify(prior,null,2).replace(/\n/g,'\n    '),to=JSON.stringify(change.after_entry,null,2).replace(/\n/g,'\n    ');
  assert.equal(fixture.split(from).length,2);fixture=fixture.replace(from,to);
}
const checkpoint=Buffer.from(fixture);assert.equal(hash(checkpoint),packet.after_sha256);assert.equal(checkpoint.length,packet.after_bytes);
assert.equal(source.before.equals(preparedHistory.historical_wrapper_metadata_stage.before),true);
assert.equal(checkpoint.equals(preparedHistory.historical_wrapper_metadata_stage.after),true);
assert.equal(source.before.equals(preparedHistory.selection_native_stage.after),true);
const physicalFrame=currentCanonicalTestFrame({root,read}),physicalOwner=packedUpstreamLedgerEpoch({root,read:physicalRead});
assert.equal(physicalOwner.individual_decisions_applied,physicalFrame.individual_source_reviews);
assert.equal(physicalOwner.base_class_removal_source_decisions_applied,physicalFrame.base_class_decisions);
assert.equal(physicalOwner.raw,physicalRead);assert.equal(physicalOwner.raw(HISTORICAL_WRAPPER_LEDGER).equals(read(HISTORICAL_WRAPPER_LEDGER)),true);
assert.equal(physicalOwner.current_native_packed_or_floor_or_g11_credit,false);
physicalOwner.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();
assert.equal(preparedHistory.historical_wrapper_metadata_stage.source_reference_updates,4);
assert.equal(preparedHistory.historical_wrapper_metadata_stage.original_hunks_preserved,198);
assert.equal(preparedHistory.current_native_packed_or_floor_qualified,false);
positive.push('metadata-stage-adds-no-upstream-decision-or-native-credit');
for(const ref of [packet.code_subject,source.reports[0].ref])assert.equal(physicalOwner.read(ref.path).equals(read(ref.path)),true);
positive.push('current-code-and-receipts-remain-raw-through-historical-ledger-reader');
// Previous complete DATA is the exact native stage, before the four metadata replacements.
assert.equal(preparedHistory.selection_native_stage.individual_decisions,3);
assert.equal(preparedHistory.historical_wrapper_metadata_stage.individual_decisions,0);
assert.equal(JSON.parse(source.before).entries.length,1697);
positive.push('earlier-metadata-stage-cannot-claim-wrapper-reference-successors');
const transport=JSON.parse(read(HISTORICAL_WRAPPER_TRANSPORT));
function assertWrapperIndependentEvidence(body,proof){assert.deepEqual(body.independent_source_evidence,proof.source_evidence,'wrapper independent source evidence');}
function assertWrapperDATA(raw,mode='after'){
 assert.ok(Buffer.isBuffer(raw));assert.ok(['before','after'].includes(mode));const prior=JSON.parse(source.before),candidate=JSON.parse(raw),rows=transport.canonical_reference_refresh_required;
 assert.equal(prior.entries.length,1697);assert.equal(candidate.entries.length,1697);assert.equal(rows.length,4);assert.equal(source.entries.length,4);assert.equal(source.reports.length,4);
 const selected=new Map(rows.map(row=>[row.sha,row]));assert.equal(selected.size,4);
 const withoutEntries=ledger=>{const copy=structuredClone(ledger);delete copy.entries;return copy;};assert.deepEqual(withoutEntries(candidate),withoutEntries(prior),'wrapper header or decision counts changed');
 let untouched=0,hunks=0,refreshes=0,reports=0;
 for(let i=0;i<prior.entries.length;i++){
  const old=prior.entries[i],actual=candidate.entries[i];assert.equal(actual.sha,old.sha);const row=selected.get(old.sha);
  if(!row){assert.deepEqual(actual,old,'wrapper unselected entry changed');untouched++;continue;}
  const result=source.entries.find(item=>item.sha===row.sha),report=source.reports.find(item=>item.sha===row.sha);assert.ok(result&&report);
  assert.equal(hash(Buffer.from(JSON.stringify(old,null,2)+'\n')),row.before_entry_sha256);assert.deepEqual(old.individual_proof.source_evidence[row.reference_index],row.before_reference);
  assert.deepEqual(result.after_entry.individual_proof.source_evidence[row.reference_index],row.after_reference);
  const expected=structuredClone(old);
  if(mode==='after'){
   expected.individual_proof.source_evidence[row.reference_index]=structuredClone(row.after_reference);
   expected.individual_proof.historical_source_wrapper_successor=structuredClone(result.after_entry.individual_proof.historical_source_wrapper_successor);
   expected.evidence_report=result.current_review.path;expected.source_check.evidence_report_sha256=result.current_review.sha256;
  }
  assert.deepEqual(actual.individual_proof.source_evidence[row.reference_index],mode==='after'?row.after_reference:row.before_reference,'wrapper selected source reference');
  assert.equal(actual.final_disposition,old.final_disposition,'wrapper disposition changed');assert.equal(actual.reason,old.reason);assert.equal(actual.individual_proof.proof_kind,old.individual_proof.proof_kind);
  assert.deepEqual(actual,expected,'wrapper decision, hunk, other source reference or report changed');
  assert.equal(hash(report.raw),result.current_review.sha256);assert.equal(report.raw.length,result.current_review.bytes);assert.equal(report.path,result.current_review.path);
  assert.deepEqual(report.body.individual_proof,result.after_entry.individual_proof);assertWrapperIndependentEvidence(report.body,result.after_entry.individual_proof);
  const oldReportRaw=read(result.prior_review.path);assert.equal(hash(oldReportRaw),result.prior_review.sha256);assert.equal(oldReportRaw.length,result.prior_review.bytes);const oldReport=JSON.parse(oldReportRaw);assert.deepEqual(report.body.hunk_reviews,oldReport.hunk_reviews);assert.equal(report.body.original_hunks,oldReport.original_hunks);assert.equal(report.body.hunk_reviews.length,report.body.original_hunks);hunks+=report.body.original_hunks;refreshes+=Number(mode==='after');reports+=Number(mode==='after');
 }
 assert.equal(untouched,1693);assert.equal(hunks,198);assert.equal(refreshes,mode==='after'?4:0);assert.equal(reports,mode==='after'?4:0);
}
assertWrapperDATA(source.before,'before');assertWrapperDATA(checkpoint);

let currentNonphysicalLedgerRejections=0;
const rejectHistoricalReader=bytes=>{assert.throws(()=>packedUpstreamLedgerEpoch({root,read:p=>p===HISTORICAL_WRAPPER_LEDGER?bytes:read(p)}),error=>error?.code==='ERR_ASSERTION'&&error.message.includes('nonphysical canonical input '+HISTORICAL_WRAPPER_LEDGER));currentNonphysicalLedgerRejections++;};
rejectHistoricalReader(checkpoint);rejectHistoricalReader(source.before);
function rejectWrapperDATA(id,bytes){assertWrapperDATA(checkpoint);assert.throws(()=>assertWrapperDATA(bytes),undefined,id);rejectHistoricalReader(bytes);rejected.push(id);}
function ownerReject(id,corrupt){assert.throws(()=>packedUpstreamLedgerEpoch({root,read:corrupt}),undefined,id);rejected.push(id);}
for(const [id,path]of [['changed-ledger-packet',HISTORICAL_WRAPPER_PACKET],['changed-metadata-code',packet.code_subject.path],['changed-current-review',source.reports[0].path]])
  ownerReject(id,p=>p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
const ledger=JSON.parse(checkpoint),before=JSON.parse(source.before),index=ledger.entries.findIndex(row=>row.sha===source.entries[0].sha);
const partial=structuredClone(ledger);partial.entries[index]=before.entries[index];
rejectWrapperDATA('partial-wrapper-metadata',Buffer.from(JSON.stringify(partial)));
const disposition=structuredClone(ledger);disposition.entries[index].final_disposition='already-adapted';
rejectWrapperDATA('new-decision-hidden-in-metadata',Buffer.from(JSON.stringify(disposition)));
const singleReference=structuredClone(ledger);singleReference.entries[index].individual_proof.source_evidence[transport.canonical_reference_refresh_required[0].reference_index]=structuredClone(transport.canonical_reference_refresh_required[0].before_reference);
assertWrapperDATA(checkpoint);assert.throws(()=>assertWrapperDATA(Buffer.from(JSON.stringify(singleReference))),/wrapper selected source reference/);
const wrapperEvidenceRow=transport.canonical_reference_refresh_required.find(row=>source.reports.find(report=>report.sha===row.sha).body.independent_source_evidence.length>1),wrapperEvidenceReport=source.reports.find(report=>report.sha===wrapperEvidenceRow.sha),wrapperEvidenceEntry=source.entries.find(entry=>entry.sha===wrapperEvidenceRow.sha),wrapperEvidenceIndex=wrapperEvidenceReport.body.independent_source_evidence.findIndex((ref,i)=>i!==wrapperEvidenceRow.reference_index);assert.ok(wrapperEvidenceIndex>=0);
const wrapperEvidenceMutant=structuredClone(wrapperEvidenceReport.body);assert.notEqual(wrapperEvidenceMutant.independent_source_evidence[wrapperEvidenceIndex].sha256,'0'.repeat(64));wrapperEvidenceMutant.independent_source_evidence[wrapperEvidenceIndex].sha256='0'.repeat(64);assertWrapperIndependentEvidence(wrapperEvidenceReport.body,wrapperEvidenceEntry.after_entry.individual_proof);assert.throws(()=>assertWrapperIndependentEvidence(wrapperEvidenceMutant,wrapperEvidenceEntry.after_entry.individual_proof),/wrapper independent source evidence/);
for(const path of [...transport.wrappers.map(row=>row.path),source.entries[0].prior_review.path,
  'compatibility/rc/historical-chip-navigation-source-replay.json','compatibility/rc/historical-chip-current-source-qualification.json',
  HISTORICAL_WRAPPER_TRANSPORT,JSON.parse(read(source.entries[0].prior_review.path)).patch_file]){
  assert.throws(()=>historicalChipWrapperMetadata({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p)}));
  rejected.push('changed-authenticated-subject/'+path);
}
{
  let late=false;const path=source.reports[0].path,live=packedUpstreamLedgerEpoch({root,read:p=>late&&p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p)});
  live.historical_wrapper_metadata_entries_applied=0;late=true;assert.throws(()=>live.read(HISTORICAL_WRAPPER_LEDGER));rejected.push('late-current-wrapper-review');
}
{
  let late=false;const path=transport.wrappers[2].path,live=historicalChipWrapperMetadata({root,read:p=>late&&p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p)});
  live.bound.length=0;late=true;assert.throws(()=>live.assertCurrent());rejected.push('late-wrapper-source-with-mutated-public-metadata');
}
assert.equal(positive.length,4);assert.equal(rejected.length,15);
physicalOwner.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();source.assertCurrent();
const report={schema_version:1,historical_json_comparison_only:true,original_program_authenticated_as_DATA:true,original_program_executed:false,current_physical_source_admissions:physicalOwner.individual_decisions_applied,current_physical_base_class_decisions:physicalOwner.base_class_removal_source_decisions_applied,current_physical_owner_guarded:true,current_nonphysical_ledger_rejections:currentNonphysicalLedgerRejections,line:source.line,positive,rejected,metadata_entries:4,source_reference_updates:4,original_hunks_preserved:198,new_upstream_SHA_decisions:0,
  packet:{path:HISTORICAL_WRAPPER_PACKET,sha256:hash(read(HISTORICAL_WRAPPER_PACKET))},
  coordinator:{path:'scripts/packed-upstream-ledger-epoch.mjs',sha256:hash(read('scripts/packed-upstream-ledger-epoch.mjs'))},
  producer:{path:'tests/historical_chip_wrapper_metadata_probe.mjs',sha256:hash(read('tests/historical_chip_wrapper_metadata_probe.mjs'))},
  actual_native_artifact_floor_or_G11_qualified:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({historical_json_comparison_only:true,original_program_authenticated_as_DATA:true,original_program_executed:false,current_physical_source_admissions:physicalOwner.individual_decisions_applied,current_physical_base_class_decisions:physicalOwner.base_class_removal_source_decisions_applied,current_physical_owner_guarded:true,current_nonphysical_ledger_rejections:currentNonphysicalLedgerRejections,line:source.line,positive:positive.length,rejected:rejected.length,metadata_entries:4,original_hunks_preserved:198,native_or_G11_qualified:false}));
