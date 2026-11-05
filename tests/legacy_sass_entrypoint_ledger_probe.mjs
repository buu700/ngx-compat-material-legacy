/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current decision, earlier-state separation and the real checker guard. */
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {preparePackedUpstreamLedger as prepareHistoricalLedger} from '../scripts/packed-upstream-ledger-base.mjs';
import {currentCanonicalTestFrame} from './current_sass_canonical_test_scope.mjs';
import {LEGACY_SASS_ENTRYPOINT_SHA as SHA,LEGACY_SASS_ENTRYPOINT_REVIEW as REVIEW} from '../scripts/upstream-legacy-sass-entrypoint-admission.mjs';
const root=process.cwd(),diskRead=path=>readFileSync(join(root,path)),ledger='compatibility/f10/disposition-ledger/ledger.json';
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
// Preserve this probe's exact27-decision image; the new31-decision epoch has its own independent probe.
const registeredBefore=execFileSync('git',['--no-replace-objects','show','051c1e83402f38fed1073aefeb965b2115875246' + ':' + ledger],{cwd:root,env,maxBuffer:8*1024*1024});
const read=path=>path===ledger?registeredBefore:diskRead(path);
const stage={before:execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
  '518be10d4de943ebfef51854d9c013cde2afbefe:'+ledger],{cwd:root,env,maxBuffer:8*1024*1024}),
  after:execFileSync('python3',['-c','import sys;sys.path.insert(0,"tests");from legacy_sass_entrypoint_ledger_patch import derive_sass_entrypoint_successor;sys.stdout.buffer.write(derive_sass_entrypoint_successor()[1])'],{cwd:root,maxBuffer:8*1024*1024})};
let changedPath=null;const physicalRead=path=>path===changedPath?Buffer.concat([diskRead(path),Buffer.from('\n')]):diskRead(path);
// Preserve all superseded original owner/raw/count assertions as authenticated
// program DATA; no saved program is imported or executed.
const oldProgram=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
 'd8ab97315b6c77b83f42c2bebcf63b2984fff255:tests/legacy_sass_entrypoint_ledger_probe.mjs'],{cwd:root,env,maxBuffer:1024*1024});
assert.equal(createHash('sha256').update(oldProgram).digest('hex'),'8f8746f5e03ba708e6def740511271d1200b778c89e4b567f1405e30d329eac3');assert.equal(oldProgram.length,8605);
// Historical frames are DATA from maintained preparation on physical sources.
// Never pass an unbranded old-ledger callback to either current owner.
const preparedHistory=prepareHistoricalLedger({root,read:physicalRead});
const counts=Object.freeze({
 consumer:preparedHistory.testing_api_stage.individual_decisions+preparedHistory.sass_stage.individual_decisions+
  preparedHistory.rules_js_stage.individual_decisions+preparedHistory.autocomplete_landscape_stage.individual_decisions+
  preparedHistory.selection_native_stage.individual_decisions,
 entrypoint:preparedHistory.legacy_sass_entrypoint_stage.individual_decisions,
 token:preparedHistory.token_build_stage.individual_decisions,unthemable:preparedHistory.unthemable_stage.individual_decisions,
});
assert.equal(counts.consumer,20);assert.equal(counts.entrypoint,1);assert.equal(counts.token,1);assert.equal(counts.unthemable,5);
const historicalCurrentAdmissions=counts.consumer+counts.entrypoint+counts.token+counts.unthemable;
assert.equal(registeredBefore.equals(preparedHistory.registered_checker_metadata_stage.after),true);
assert.equal(preparedHistory.legacy_sass_entrypoint_stage.before.equals(preparedHistory.historical_consumer_wrapper_metadata_stage.after),true);
assert.equal(preparedHistory.checker_reference_metadata_stage.before.equals(preparedHistory.legacy_sass_entrypoint_stage.after),true);
assert.equal(preparedHistory.token_build_stage.before.equals(preparedHistory.checker_reference_metadata_stage.after),true);
assert.equal(preparedHistory.unthemable_stage.before.equals(preparedHistory.token_build_stage.after),true);
assert.equal(preparedHistory.registered_checker_metadata_stage.before.equals(preparedHistory.unthemable_stage.after),true);
const physicalFrame=currentCanonicalTestFrame({root,read:diskRead}),current=packedUpstreamLedgerEpoch({root,read:physicalRead});
assert.equal(current.individual_decisions_applied,physicalFrame.individual_source_reviews);
assert.equal(current.base_class_removal_source_decisions_applied,physicalFrame.base_class_decisions);
assert.equal(current.raw,physicalRead);assert.equal(current.current_native_packed_or_floor_or_g11_credit,false);
current.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();
const checkerMetadata=preparedHistory.checker_reference_metadata_stage;
const final=execFileSync('python3',['-c','import sys;sys.path.insert(0,"tests");from unthemable_ledger_patch import derive_unthemable_successor;sys.stdout.buffer.write(derive_unthemable_successor()[1])'],{cwd:root,maxBuffer:8*1024*1024});
assert.equal(checkerMetadata.before.equals(stage.after),true);assert.equal(final.equals(read(ledger)),true);
assert.equal(createHash('sha256').update(checkerMetadata.after).digest('hex'),'d015c3d9cca4b9ea489da7028ab5a8bcd675adf428db3000ed60c0b2380f0e27');
assert.equal(createHash('sha256').update(stage.before).digest('hex'),'c444a0532332e11c1bfb4f737135a0710909a1a6f91332f8327e8ed2e0174ac3');
assert.equal(createHash('sha256').update(stage.after).digest('hex'),'fbefd5a78fd9d09694567a59636e6452cb1f08ef668f4b6596378662ab00b355');
assert.equal(stage.before.equals(preparedHistory.legacy_sass_entrypoint_stage.before),true);
assert.equal(stage.after.equals(preparedHistory.legacy_sass_entrypoint_stage.after),true);
assert.equal(historicalCurrentAdmissions,27);assert.equal(counts.consumer,20);
assert.equal(preparedHistory.legacy_sass_entrypoint_stage.individual_decisions,1);
assert.equal(JSON.parse(stage.before).entries.find(row=>row.sha===SHA).individual_proof?.legacy_sass_entrypoint_scope,undefined);
assert.equal(preparedHistory.token_build_stage.individual_decisions,1);
assert.equal(preparedHistory.checker_reference_metadata_stage.checker_digest_tokens,14);
assert.equal(preparedHistory.historical_wrapper_metadata_stage.metadata_entries,4);
assert.equal(preparedHistory.historical_consumer_wrapper_metadata_stage.metadata_entries,65);
assert.equal(preparedHistory.selection_native_stage.individual_decisions,3);
assert.equal(preparedHistory.current_native_packed_or_floor_qualified,false);
assert.equal(current.read('scripts/check-upstream-audit-disposition.mjs').equals(diskRead('scripts/check-upstream-audit-disposition.mjs')),true);
const historicalFrames=[preparedHistory.before,preparedHistory.after,...['testing_api_stage','sass_stage','rules_js_stage','summary_stage','autocomplete_landscape_stage','native_spec_metadata_stage','selection_native_stage','historical_wrapper_metadata_stage','historical_consumer_wrapper_metadata_stage','legacy_sass_entrypoint_stage','checker_reference_metadata_stage','token_build_stage','unthemable_stage','registered_checker_metadata_stage','modern_control_base_stage','theme_token_root_stage','form_field_tokenization_stage','m3_theme_boundary_stage'].map(name=>preparedHistory[name].after)];
const rejected=[];
for(const [id,mutate]of [
  ['unselected-row',value=>value.entries.find(row=>row.sha!==SHA).reason+=' unreviewed mutation'],
  ['selected-row-reason',value=>value.entries.find(row=>row.sha===SHA).reason+=' forged conclusion'],
  ['selected-row-missing-scope',value=>delete value.entries.find(row=>row.sha===SHA).individual_proof.legacy_sass_entrypoint_scope],
  ['incorrect-summary',value=>value.open_or_deferred++],
]){
  const value=JSON.parse(read(ledger));mutate(value);
  const candidate=json(value);assert.equal(historicalFrames.some(frame=>candidate.equals(frame)),false,'historical DATA '+id);
  assert.throws(()=>packedUpstreamLedgerEpoch({root,read:path=>path===ledger?candidate:diskRead(path)}),error=>error?.code==='ERR_ASSERTION'&&error.message.includes('nonphysical canonical input '+ledger),id);rejected.push(id);
}
for(const path of [REVIEW,'scripts/check-upstream-audit-disposition.mjs',
  'scripts/upstream-legacy-sass-entrypoint-admission.mjs','projects/ngx-material-legacy/styles/core/theming/_palette.scss']){
  changedPath=path;assert.throws(()=>current.read(ledger),undefined,'late '+path);assert.throws(()=>preparedHistory.assertCurrent(),undefined,'base physical '+path);rejected.push('late:'+path);changedPath=null;
}
current.assertCurrent();
const dir=mkdtempSync(join(tmpdir(),'ngx-entrypoint-root-checker-'));
let checkerPositive=0,checkerNegative=0;
try{
  const entry=JSON.parse(stage.after).entries.find(row=>row.sha===SHA);
  const seed=join(dir,'seed.json'),candidate=join(dir,'ledger.json'),report=join(dir,'report.json');
  // The real source guard is the subject. Missing unrelated authored rosters
  // must keep overall admission incomplete rather than running their audits.
  const missingSymbols=join(dir,'unprovided-authored-symbols.json');
  writeFileSync(seed,json({commits:[{sha:SHA}]}));
  const childEnv={...env};for(const key of Object.keys(childEnv))if(key.startsWith('RC_'))delete childEnv[key];
  function inspect(value){
    writeFileSync(candidate,json({entries:[value],g11_claim:'not-passed'}));
    const child=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--admission','--line','21.x',
      '--seed',seed,'--ledger',candidate,'--symbols',missingSymbols,'--current-symbols',missingSymbols,
      '--report',report],{cwd:root,env:childEnv,encoding:'utf8',timeout:30000});
    assert.equal(child.error,undefined);assert.equal(child.signal,null);
    assert.ok([0,1].includes(child.status),child.stderr);return JSON.parse(readFileSync(report));
  }
  const positive=inspect(entry);
  assert.equal(positive.seed_rows,1);assert.equal(positive.ledger_rows,1);assert.equal(positive.unresolved_in_ledger,0);
  assert.equal(positive.evidence_failures.some(row=>row.sha===SHA),false);
  assert.equal(positive.insufficient_review_sha_ids.sensitive.includes(SHA),false);
  assert.equal(positive.disposition_admission,'incomplete');assert.equal(positive.authored_use_inventory.complete,false);
  assert.equal(positive.g11_claim,'not-passed');assert.equal(positive.security_clearance,'not-passed');checkerPositive++;
  for(const [id,mutate]of [
    ['stripped-marker',value=>delete value.individual_proof.legacy_sass_entrypoint_scope],
    ['borrowed-report',value=>value.evidence_report='compatibility/rc/upstream-testing-api-21x-review.json'],
    ['non-json-report',value=>value.evidence_report='docs/03-sass-contract.md'],
  ]){
    const bad=structuredClone(entry);mutate(bad);const observed=inspect(bad);
    assert.deepEqual(observed.evidence_failures,[{sha:SHA,reason:'invalid-legacy-sass-entrypoint-scope',evidence_report:bad.evidence_report}]);
    checkerNegative++;rejected.push('real-root-checker:'+id);
  }
}finally{rmSync(dir,{recursive:true,force:true});}
current.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();
const report={schema_version:1,historical_json_comparison_only:true,current_physical_source_admissions:current.individual_decisions_applied,current_physical_base_class_decisions:current.base_class_removal_source_decisions_applied,current_physical_owner_guarded:true,original_program_authenticated_as_DATA:true,original_program_executed:false,line:'21.x',positive_current_and_previous_states:2,
  real_root_checker_positive:checkerPositive,real_root_checker_rejections:checkerNegative,
  rejection_controls:rejected.length,rejected,individual_decisions_applied:historicalCurrentAdmissions,
  legacy_sass_entrypoint_decisions_applied:preparedHistory.legacy_sass_entrypoint_stage.individual_decisions,
  unchanged_other_semantic_entries:1696,current_checker_bytes_returned_raw:true,all_fixture_roots_removed:true,
  root_checker_scope:'one exact source decision; unrelated authored rosters deliberately absent and overall admission incomplete',
  actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
