/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current owner state and the actual checker path for the token-build SHA. */
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {sourceContractDefinitions} from '../scripts/upstream-source-contract-registry.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),ledger='compatibility/f10/disposition-ledger/ledger.json';
const SHA='7ed70fe4422e4324ea450604514337fa5e0ad880';
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const name of Object.keys(env))if(name.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(name))delete env[name];
const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show','0860e78b3ba8172c0997819469e9a077b6f6b37e:'+ledger],{cwd:root,env,maxBuffer:8*1024*1024});
let late=null;const actual=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const current=packedUpstreamLedgerEpoch({root,read:actual}),previous=packedUpstreamLedgerEpoch({root,read:path=>path===ledger?before:read(path)});
current.assertCurrent();previous.assertCurrent();
assert.equal(current.individual_decisions_applied,22);assert.equal(current.token_build_decisions_applied,1);
assert.equal(previous.individual_decisions_applied,21);assert.equal(previous.token_build_decisions_applied,0);
for(const state of [current,previous]){
  assert.equal(state.checker_reference_metadata_tokens_applied,14);assert.equal(state.legacy_sass_entrypoint_decisions_applied,1);
  assert.equal(state.historical_consumer_wrapper_metadata_entries_applied,65);assert.equal(state.current_native_packed_or_floor_or_g11_credit,false);
}
assert.equal(current.raw,actual);assert.equal(current.read('scripts/check-upstream-audit-disposition.mjs').equals(read('scripts/check-upstream-audit-disposition.mjs')),true);
const rejected=[];
for(const path of ['scripts/upstream-token-build-admission.cjs','scripts/upstream-individual-evidence-scope.mjs','scripts/upstream-source-contract-registry.mjs']){
  late=path;assert.throws(()=>current.read(ledger),undefined,path);late=null;rejected.push('late:'+path);
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
const report={schema_version:1,line:'21.x',positive_current_and_previous_states:2,
  current_source_admissions:22,previous_source_admissions:21,new_token_build_decisions:1,
  real_root_checker_positive:positive,real_root_checker_rejections:3,rejection_controls:rejected.length,rejected,
  current_raw_reader_identity_preserved:true,root_checker_overall_admission:'incomplete; unrelated authored rosters deliberately absent',
  actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
