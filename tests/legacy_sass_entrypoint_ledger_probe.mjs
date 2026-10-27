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
import {LEGACY_SASS_ENTRYPOINT_SHA as SHA,LEGACY_SASS_ENTRYPOINT_REVIEW as REVIEW} from '../scripts/upstream-legacy-sass-entrypoint-admission.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),ledger='compatibility/f10/disposition-ledger/ledger.json';
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
const stage={before:execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
  '518be10d4de943ebfef51854d9c013cde2afbefe:'+ledger],{cwd:root,env,maxBuffer:8*1024*1024}),after:read(ledger)};
assert.equal(createHash('sha256').update(stage.before).digest('hex'),'c444a0532332e11c1bfb4f737135a0710909a1a6f91332f8327e8ed2e0174ac3');
assert.equal(createHash('sha256').update(stage.after).digest('hex'),'fbefd5a78fd9d09694567a59636e6452cb1f08ef668f4b6596378662ab00b355');
let changedPath=null;const liveRead=path=>path===changedPath?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const current=packedUpstreamLedgerEpoch({root,read:liveRead});current.assertCurrent();
assert.equal(current.individual_decisions_applied,21);assert.equal(current.legacy_sass_entrypoint_decisions_applied,1);
assert.equal(current.raw,liveRead);assert.equal(current.read('scripts/check-upstream-audit-disposition.mjs').equals(read('scripts/check-upstream-audit-disposition.mjs')),true);
const previous=packedUpstreamLedgerEpoch({root,read:path=>path===ledger?stage.before:read(path)});previous.assertCurrent();
assert.equal(previous.individual_decisions_applied,20);assert.equal(previous.legacy_sass_entrypoint_decisions_applied,0);
for(const epoch of [current,previous]){
  assert.equal(epoch.historical_wrapper_metadata_entries_applied,4);
  assert.equal(epoch.historical_consumer_wrapper_metadata_entries_applied,65);
  assert.equal(epoch.selection_native_decisions_applied,3);
  assert.equal(epoch.current_native_packed_or_floor_or_g11_credit,false);
}
const rejected=[];
for(const [id,mutate]of [
  ['unselected-row',value=>value.entries.find(row=>row.sha!==SHA).reason+=' unreviewed mutation'],
  ['selected-row-reason',value=>value.entries.find(row=>row.sha===SHA).reason+=' forged conclusion'],
  ['selected-row-missing-scope',value=>delete value.entries.find(row=>row.sha===SHA).individual_proof.legacy_sass_entrypoint_scope],
  ['incorrect-summary',value=>value.open_or_deferred++],
]){
  const value=JSON.parse(stage.after);mutate(value);
  assert.throws(()=>packedUpstreamLedgerEpoch({root,read:path=>path===ledger?json(value):read(path)}),undefined,id);rejected.push(id);
}
for(const path of [REVIEW,'scripts/check-upstream-audit-disposition.mjs',
  'scripts/upstream-legacy-sass-entrypoint-admission.mjs','projects/ngx-material-legacy/styles/core/theming/_palette.scss']){
  changedPath=path;assert.throws(()=>current.read(ledger),undefined,'late '+path);rejected.push('late:'+path);changedPath=null;
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
const report={schema_version:1,line:'21.x',positive_current_and_previous_states:2,
  real_root_checker_positive:checkerPositive,real_root_checker_rejections:checkerNegative,
  rejection_controls:rejected.length,rejected,individual_decisions_applied:current.individual_decisions_applied,
  legacy_sass_entrypoint_decisions_applied:current.legacy_sass_entrypoint_decisions_applied,
  unchanged_other_semantic_entries:1696,current_checker_bytes_returned_raw:true,all_fixture_roots_removed:true,
  root_checker_scope:'one exact source decision; unrelated authored rosters deliberately absent and overall admission incomplete',
  actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
