/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current owner separates fourteen metadata tokens from existing source decisions. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {CHECKER_REFERENCE_LEDGER as ledger} from '../scripts/checker-reference-metadata.mjs';
import {packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {preparePackedUpstreamLedger as prepareHistoricalLedger} from '../scripts/packed-upstream-ledger-base.mjs';
import {currentCanonicalTestFrame} from './current_sass_canonical_test_scope.mjs';
import {createHash} from 'node:crypto';
const root=process.cwd(),read=path=>readFileSync(join(root,path));
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const name of Object.keys(env))if(name.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(name))delete env[name];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
// Superseded historical owner/raw/count assertions remain authenticated program
// DATA. This Git program is never imported or executed.
const oldProgram=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
 'd8ab97315b6c77b83f42c2bebcf63b2984fff255:tests/checker_reference_metadata_owner_probe.mjs'],{cwd:root,env,maxBuffer:1024*1024});
assert.equal(hash(oldProgram),'bf06ecde70f7b55a38fbd545c1b89af1eefbbfaa58325602a6602b89e0f8d27f');assert.equal(oldProgram.length,4365);
let late=null;const physicalRead=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const preparedHistory=prepareHistoricalLedger({root,read:physicalRead}),source=preparedHistory.checker_reference_metadata_stage,preflight=process.argv.includes('--preflight');
const historicalPriorAdmissions=(preparedHistory.testing_api_stage?.individual_decisions??0)+
 preparedHistory.sass_stage.individual_decisions+preparedHistory.rules_js_stage.individual_decisions+
 preparedHistory.autocomplete_landscape_stage.individual_decisions+preparedHistory.selection_native_stage.individual_decisions;
assert.equal(historicalPriorAdmissions,preparedHistory.line==='21.x'?20:13);
assert.equal(preparedHistory.historical_wrapper_metadata_stage.metadata_entries,4);
assert.equal(preparedHistory.historical_wrapper_metadata_stage.individual_decisions,0);
assert.equal(preparedHistory.historical_consumer_wrapper_metadata_stage.metadata_entries,65);
assert.equal(preparedHistory.historical_consumer_wrapper_metadata_stage.individual_decisions,0);
assert.equal(preparedHistory.current_native_packed_or_floor_qualified,false);

const final=execFileSync('python3',['-c','import sys;sys.path.insert(0,"tests");from unthemable_ledger_patch import derive_unthemable_successor;sys.stdout.buffer.write(derive_unthemable_successor()[1])'],{cwd:root,maxBuffer:8*1024*1024});
// Keep this probe at its authenticated27-decision checkpoint; the successor has a separate probe.
const registeredBefore=execFileSync('git',['--no-replace-objects','show','051c1e83402f38fed1073aefeb965b2115875246:'+ledger],{cwd:root,env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'},maxBuffer:8*1024*1024});
assert.equal(registeredBefore.equals(final),true);
assert.equal(registeredBefore.equals(preparedHistory.registered_checker_metadata_stage.after),true);
assert.equal(source.before.equals(preparedHistory.legacy_sass_entrypoint_stage.after),true);
assert.equal(source.after.equals(preparedHistory.token_build_stage.before),true);
assert.equal(preparedHistory.token_build_stage.after.equals(preparedHistory.unthemable_stage.before),true);
assert.equal(preparedHistory.unthemable_stage.after.equals(preparedHistory.registered_checker_metadata_stage.before),true);
assert.equal(source.checker_digest_tokens,14);assert.equal(source.individual_decisions,0);
const checkerReview=JSON.parse(read('compatibility/rc/checker-reference-metadata-review.json'));
const checkerBeforeEntries=JSON.parse(source.before).entries,checkerAfterEntries=JSON.parse(source.after).entries;
let previousCheckerTokens=0,currentCheckerTokens=0;
for(const change of checkerReview.selected_entries){
 const beforeRef=checkerBeforeEntries.find(entry=>entry.sha===change.sha).individual_proof.historical_behavior.source_members[change.source_member_index];
 const afterRef=checkerAfterEntries.find(entry=>entry.sha===change.sha).individual_proof.historical_behavior.source_members[change.source_member_index];
 assert.equal(beforeRef.sha256,change.before_sha256);assert.equal(afterRef.sha256,change.after_sha256);
 assert.equal(beforeRef.path,checkerReview.checker.path);assert.equal(afterRef.path,checkerReview.checker.path);
 previousCheckerTokens+=Number(beforeRef.sha256===checkerReview.checker.current_sha256);currentCheckerTokens+=Number(afterRef.sha256===checkerReview.checker.current_sha256);
}
assert.equal(previousCheckerTokens,0);assert.equal(currentCheckerTokens,14);assert.equal(source.unselected_entries_preserved,1683);
assert.equal(source.before.equals(source.after),false);
const historicalPreviousAdmissions=historicalPriorAdmissions+preparedHistory.legacy_sass_entrypoint_stage.individual_decisions;
const historicalCurrentAdmissions=historicalPreviousAdmissions+(preflight?0:preparedHistory.token_build_stage.individual_decisions+preparedHistory.unthemable_stage.individual_decisions);
assert.equal(historicalPreviousAdmissions,21);assert.equal(historicalCurrentAdmissions,preflight?21:27);
assert.equal(preparedHistory.token_build_stage.individual_decisions,1);assert.equal(preparedHistory.legacy_sass_entrypoint_stage.individual_decisions,1);
assert.equal(preparedHistory.selection_native_stage.individual_decisions,3);
const physicalFrame=currentCanonicalTestFrame({root,read}),physicalOwner=packedUpstreamLedgerEpoch({root,read:physicalRead});
assert.equal(physicalOwner.individual_decisions_applied,physicalFrame.individual_source_reviews);
assert.equal(physicalOwner.base_class_removal_source_decisions_applied,physicalFrame.base_class_decisions);
assert.equal(physicalOwner.raw,physicalRead);assert.equal(physicalOwner.raw(ledger).equals(read(ledger)),true);
assert.equal(physicalOwner.current_native_packed_or_floor_or_g11_credit,false);
physicalOwner.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();
assert.equal(physicalOwner.read('scripts/check-upstream-audit-disposition.mjs').equals(read('scripts/check-upstream-audit-disposition.mjs')),true);
// Baseline-positive exact DATA precedes each partial-reference payload check.
function assertCheckerDATA(raw,mode='after'){
 assert.ok(Buffer.isBuffer(raw));assert.ok(['before','after'].includes(mode));const prior=JSON.parse(source.before),candidate=JSON.parse(raw);
 assert.equal(prior.entries.length,1697);assert.equal(candidate.entries.length,1697);assert.equal(checkerReview.selected_entries.length,14);
 const selected=new Map(checkerReview.selected_entries.map(row=>[row.sha,row]));assert.equal(selected.size,14);
 const withoutEntries=ledger=>{const copy=structuredClone(ledger);delete copy.entries;return copy;};
 assert.deepEqual(withoutEntries(candidate),withoutEntries(prior),'checker header/decision counts changed');
 let priorTokens=0,currentTokens=0,untouched=0;
 for(let i=0;i<prior.entries.length;i++){
  const old=prior.entries[i],actual=candidate.entries[i];assert.equal(actual.sha,old.sha);const change=selected.get(old.sha);
  if(!change){assert.deepEqual(actual,old,'checker unselected entry changed');untouched++;continue;}
  const oldRefs=old.individual_proof.historical_behavior.source_members,actualRefs=actual.individual_proof.historical_behavior.source_members,index=change.source_member_index;
  assert.deepEqual(oldRefs[index],{path:checkerReview.checker.path,sha256:change.before_sha256});assert.equal(change.after_sha256,checkerReview.checker.current_sha256);
  assert.deepEqual(actualRefs[index],{path:checkerReview.checker.path,sha256:mode==='after'?change.after_sha256:change.before_sha256},'selected checker digest transition');
  const expected=structuredClone(old);if(mode==='after')expected.individual_proof.historical_behavior.source_members[index].sha256=change.after_sha256;
  assert.deepEqual(actual,expected,'checker decision, hunk or other reference changed');
  priorTokens+=Number(oldRefs[index].sha256===checkerReview.checker.current_sha256);currentTokens+=Number(actualRefs[index].sha256===checkerReview.checker.current_sha256);
 }
 assert.equal(untouched,1683);assert.equal(priorTokens,0);assert.equal(currentTokens,mode==='after'?14:0);
}
assertCheckerDATA(source.before,'before');assertCheckerDATA(source.after);

let currentNonphysicalLedgerRejections=0;
const rejectHistoricalReader=bytes=>{assert.throws(()=>packedUpstreamLedgerEpoch({root,read:path=>path===ledger?bytes:read(path)}),error=>error?.code==='ERR_ASSERTION'&&error.message.includes('nonphysical canonical input '+ledger));currentNonphysicalLedgerRejections++;};
rejectHistoricalReader(preflight?source.after:final);rejectHistoricalReader(source.before);
const rejected=[];
for(const path of ['scripts/checker-reference-metadata.mjs','scripts/check-upstream-audit-disposition.mjs',
  'compatibility/rc/checker-reference-metadata-review.json']){
  late=path;assert.throws(()=>physicalOwner.read(ledger),undefined,path);assert.throws(()=>preparedHistory.assertCurrent(),undefined,'base physical '+path);late=null;rejected.push('late:'+path);
}
physicalOwner.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();
const partial=JSON.parse(source.after),row=partial.entries.find(entry=>entry.sha==='77ffdf98ba71c11d908b29e02b516dddf487ae0b');
row.individual_proof.historical_behavior.source_members.find(ref=>ref.path==='scripts/check-upstream-audit-disposition.mjs').sha256='db1ad9e6d7a069eaeae9ce026912bd520d3a13630678f76e37f965fc25960377';
const partialBytes=Buffer.from(JSON.stringify(partial,null,2)+'\n');
assertCheckerDATA(source.after);assert.throws(()=>assertCheckerDATA(partialBytes),/selected checker digest transition/);rejectHistoricalReader(partialBytes);
rejected.push('partial-fourteen-reference-update');
physicalOwner.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();
const report={schema_version:1,historical_json_comparison_only:true,original_program_authenticated_as_DATA:true,original_program_executed:false,current_physical_source_admissions:physicalOwner.individual_decisions_applied,current_physical_base_class_decisions:physicalOwner.base_class_removal_source_decisions_applied,current_physical_owner_guarded:true,current_nonphysical_ledger_rejections:currentNonphysicalLedgerRejections,line:'21.x',preflight_only:preflight,positive_current_and_previous_states:2,
  metadata_tokens_applied:currentCheckerTokens,previous_metadata_tokens_applied:previousCheckerTokens,individual_decisions_applied:historicalCurrentAdmissions,
  raw_checker_bytes_preserved:true,rejection_controls:rejected.length,rejected,
  actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
const output=process.argv.slice(2).find(value=>value!=='--preflight');if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
