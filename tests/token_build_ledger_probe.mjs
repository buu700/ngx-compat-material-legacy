/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current owner state and the actual checker path for the token-build SHA. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {preparePackedUpstreamLedger as prepareHistoricalLedger} from '../scripts/packed-upstream-ledger-base.mjs';
import {currentCanonicalTestFrame} from './current_sass_canonical_test_scope.mjs';
import {sourceContractDefinitions} from '../scripts/upstream-source-contract-registry.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),ledger='compatibility/f10/disposition-ledger/ledger.json';
const SHA='7ed70fe4422e4324ea450604514337fa5e0ad880';
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const name of Object.keys(env))if(name.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(name))delete env[name];
const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show','0860e78b3ba8172c0997819469e9a077b6f6b37e:'+ledger],{cwd:root,env,maxBuffer:8*1024*1024});
const registeredBefore=execFileSync('git',['--no-replace-objects','show','051c1e83402f38fed1073aefeb965b2115875246' + ':' + ledger],{cwd:root,env,maxBuffer:8*1024*1024});
let late=null;const physicalRead=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
// Preserve all superseded original owner/raw/count assertions as authenticated
// program DATA; no saved program is imported or executed.
const oldProgram=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
 'd8ab97315b6c77b83f42c2bebcf63b2984fff255:tests/token_build_ledger_probe.mjs'],{cwd:root,env,maxBuffer:1024*1024});
assert.equal(createHash('sha256').update(oldProgram).digest('hex'),'13c722c77ce1b3bce5ebd549d985ad0034e7740a07e63a23f548fdf51dcd449c');assert.equal(oldProgram.length,6177);
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
const physicalFrame=currentCanonicalTestFrame({root,read:read}),current=packedUpstreamLedgerEpoch({root,read:physicalRead});
assert.equal(current.individual_decisions_applied,physicalFrame.individual_source_reviews);
assert.equal(current.base_class_removal_source_decisions_applied,physicalFrame.base_class_decisions);
assert.equal(current.raw,physicalRead);assert.equal(current.current_native_packed_or_floor_or_g11_credit,false);
current.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();
assert.equal(before.equals(preparedHistory.token_build_stage.before),true);
assert.equal(historicalCurrentAdmissions,27);assert.equal(counts.consumer+counts.entrypoint,21);
assert.equal(preparedHistory.token_build_stage.individual_decisions,1);
assert.equal(JSON.parse(before).entries.find(row=>row.sha===SHA).individual_proof?.mdc_token_source_scope,undefined);
assert.equal(preparedHistory.unthemable_stage.individual_decisions,5);
assert.equal(preparedHistory.registered_checker_metadata_stage.metadata_tokens,14);
assert.equal(preparedHistory.checker_reference_metadata_stage.checker_digest_tokens,14);
assert.equal(preparedHistory.legacy_sass_entrypoint_stage.individual_decisions,1);
assert.equal(preparedHistory.historical_consumer_wrapper_metadata_stage.metadata_entries,65);
assert.equal(preparedHistory.current_native_packed_or_floor_qualified,false);
assert.equal(current.read('scripts/check-upstream-audit-disposition.mjs').equals(read('scripts/check-upstream-audit-disposition.mjs')),true);
const rejected=[];
for(const path of ['scripts/upstream-token-build-admission.cjs','scripts/upstream-individual-evidence-scope.mjs','scripts/upstream-source-contract-registry.mjs']){
  late=path;assert.throws(()=>current.read(ledger),undefined,path);assert.throws(()=>preparedHistory.assertCurrent(),undefined,'base physical '+path);late=null;rejected.push('late:'+path);
}
current.assertCurrent();
const registryPath='scripts/upstream-source-contract-registry.mjs';
for(const [id,raw]of [
  ['duplicate-registration',Buffer.from('export const sourceContractDefinitions='+JSON.stringify([...sourceContractDefinitions,sourceContractDefinitions[0]])+';\n')],
  ['executable-registry-extension',Buffer.concat([read(registryPath),Buffer.from('\nexport const unreviewedExtension = 1;\n')])],
]){
  assert.throws(()=>packedUpstreamLedgerEpoch({root,read:path=>path===registryPath?raw:read(path)}),undefined,id);rejected.push(id);
}
const dir=mkdtempSync(join(tmpdir(),'ngx-token-build-checker-'));let positive=0;
try{
  const seed=join(dir,'seed.json'),candidate=join(dir,'ledger.json'),report=join(dir,'report.json'),missing=join(dir,'unprovided-authored-rosters.json');
  const entry=JSON.parse(read(ledger)).entries.find(row=>row.sha===SHA);writeFileSync(seed,JSON.stringify({commits:[{sha:SHA}]}));
  function inspect(value){
    writeFileSync(candidate,JSON.stringify({entries:[value],g11_claim:'not-passed'}));
    const child=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--admission','--line','21.x',
      '--seed',seed,'--ledger',candidate,'--symbols',missing,'--current-symbols',missing,'--report',report],{cwd:root,env,encoding:'utf8',timeout:30000});
    assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.ok([0,1].includes(child.status),child.stderr);
    return JSON.parse(readFileSync(report));
  }
  const good=inspect(entry);assert.equal(good.unresolved_in_ledger,0);assert.equal(good.evidence_failures.some(row=>row.sha===SHA),false);
  assert.equal(good.insufficient_review_sha_ids.behavior.includes(SHA),false);assert.equal(good.disposition_admission,'incomplete');
  assert.equal(good.authored_use_inventory.complete,false);assert.equal(good.g11_claim,'not-passed');positive++;
  for(const [id,change]of [
    ['stripped-source-marker',value=>delete value.individual_proof.mdc_token_source_scope],
    ['forged-qualification',value=>value.individual_proof.mdc_token_source_scope.qualification.sha256='0'.repeat(64)],
    ['borrowed-source-kind',value=>value.individual_proof.proof_kind='individual-semantic'],
  ]){
    const bad=structuredClone(entry);change(bad);const observed=inspect(bad);
    assert.equal(observed.evidence_failures.some(row=>row.sha===SHA),true,id);
    assert.equal(observed.insufficient_review_sha_ids.behavior.includes(SHA),true,id);rejected.push('real-checker:'+id);
  }
}finally{rmSync(dir,{recursive:true,force:true});}
current.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();
const report={schema_version:1,historical_json_comparison_only:true,current_physical_source_admissions:current.individual_decisions_applied,current_physical_base_class_decisions:current.base_class_removal_source_decisions_applied,current_physical_owner_guarded:true,original_program_authenticated_as_DATA:true,original_program_executed:false,line:'21.x',positive_current_and_previous_states:2,
  current_source_admissions:27,previous_source_admissions:21,new_token_build_decisions:1,
  real_root_checker_positive:positive,real_root_checker_rejections:3,rejection_controls:rejected.length,rejected,
  current_raw_reader_identity_preserved:true,root_checker_overall_admission:'incomplete; unrelated authored rosters deliberately absent',
  actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
