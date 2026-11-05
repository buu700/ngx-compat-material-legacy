/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual owner epochs and CLI enforce source checks for declined registered changes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {preparePackedUpstreamLedger as prepareHistoricalLedger} from '../scripts/packed-upstream-ledger-base.mjs';
import {currentCanonicalTestFrame} from './current_sass_canonical_test_scope.mjs';
import {sourceContractDefinitions} from '../scripts/upstream-source-contract-registry.mjs';
import admission from '../scripts/upstream-unthemable-token-admission.cjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),ledger='compatibility/f10/disposition-ledger/ledger.json';
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of Object.keys(env))if(key.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(key))delete env[key];
const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
 'e5f713f9d7eb088da729aec53835041dd6ffc521:'+ledger],{cwd:root,env,maxBuffer:8*1024*1024});
const registeredBefore=execFileSync('git',['--no-replace-objects','show','051c1e83402f38fed1073aefeb965b2115875246:'+ledger],{cwd:root,env,maxBuffer:8*1024*1024});
let late=null;const physicalRead=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
// Preserve all superseded original owner/raw/count assertions as authenticated
// program DATA; no saved program is imported or executed.
const oldProgram=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
 'd8ab97315b6c77b83f42c2bebcf63b2984fff255:tests/unthemable_token_ledger_probe.mjs'],{cwd:root,env,maxBuffer:1024*1024});
assert.equal(createHash('sha256').update(oldProgram).digest('hex'),'0956e0511162c4c0a04cb9250a753d5de9b6da528be6971b2f664f493d22f638');assert.equal(oldProgram.length,8026);
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
assert.equal(before.equals(preparedHistory.unthemable_stage.before),true);
assert.equal(historicalCurrentAdmissions,27);assert.equal(counts.consumer+counts.entrypoint+counts.token,22);
assert.equal(preparedHistory.unthemable_stage.individual_decisions,5);
assert.equal(JSON.parse(before).entries.filter(row=>admission.UNTHEMED_SHAS.includes(row.sha)&&row.individual_proof?.unthemable_token_source_scope!==undefined).length,0);
assert.equal(preparedHistory.registered_checker_metadata_stage.metadata_tokens,14);
// The exact22 frame precedes the registered metadata stage, so it claims zero.
assert.equal(before.equals(preparedHistory.registered_checker_metadata_stage.after),false);
// Count the exact fourteen metadata references as JSON DATA, using the real
// prepared stage's selected SHA/index cohort and the physical current checker.
const registeredStage=preparedHistory.registered_checker_metadata_stage;
const registeredBeforeData=JSON.parse(registeredStage.before),registeredAfterData=JSON.parse(registeredStage.after),oldBeforeData=JSON.parse(before);
const registeredSelected=registeredStage.selected,currentCheckerDigest=createHash('sha256').update(physicalRead('scripts/check-upstream-audit-disposition.mjs')).digest('hex');
assert.equal(registeredSelected.length,14);assert.equal(new Set(registeredSelected.map(({sha,index})=>sha+':'+index)).size,14);
const dataRef=(data,sha,index)=>{const rows=data.entries.filter(row=>row.sha===sha);assert.equal(rows.length,1);return rows[0].individual_proof.historical_behavior.source_members[index];};
let oldRegisteredDigestOccurrences=0,currentRegisteredDigestOccurrences=0;
for(const {sha,index}of registeredSelected){
 const oldRef=dataRef(oldBeforeData,sha,index),stageBeforeRef=dataRef(registeredBeforeData,sha,index),stageAfterRef=dataRef(registeredAfterData,sha,index);
 assert.deepEqual(oldRef,stageBeforeRef);assert.equal(stageBeforeRef.path,'scripts/check-upstream-audit-disposition.mjs');
 assert.deepEqual({...stageAfterRef,sha256:stageBeforeRef.sha256},stageBeforeRef);assert.notEqual(stageBeforeRef.sha256,currentCheckerDigest);
 assert.equal(stageAfterRef.sha256,currentCheckerDigest);
 oldRegisteredDigestOccurrences+=Number(oldRef.sha256===currentCheckerDigest);currentRegisteredDigestOccurrences+=Number(stageAfterRef.sha256===currentCheckerDigest);
}
assert.equal(oldRegisteredDigestOccurrences,0);assert.equal(currentRegisteredDigestOccurrences,14);
assert.equal(preparedHistory.token_build_stage.individual_decisions,1);
assert.equal(preparedHistory.checker_reference_metadata_stage.checker_digest_tokens,14);
assert.equal(preparedHistory.current_native_packed_or_floor_qualified,false);
assert.equal(current.read('scripts/check-upstream-audit-disposition.mjs').equals(read('scripts/check-upstream-audit-disposition.mjs')),true);
const rejected=[];
for(const path of ['scripts/upstream-unthemable-token-admission.cjs','scripts/upstream-registered-source-review.mjs',
 'scripts/registered-source-checker-transition.mjs','scripts/check-upstream-audit-disposition.mjs','scripts/upstream-source-contract-registry.mjs']){
 late=path;assert.throws(()=>current.read(ledger),undefined,path);assert.throws(()=>preparedHistory.assertCurrent(),undefined,'base physical '+path);late=null;rejected.push('late:'+path);
}
current.assertCurrent();
const registry='scripts/upstream-source-contract-registry.mjs';
const missing=Buffer.from('export const sourceContractDefinitions='+JSON.stringify(sourceContractDefinitions.filter(row=>row.sha!==admission.UNTHEMED_SHAS[0]))+';\n');
assert.throws(()=>packedUpstreamLedgerEpoch({root,read:path=>path===registry?missing:read(path)}));rejected.push('missing-registration');
const dir=mkdtempSync(join(tmpdir(),'ngx-unthemable-checker-')),mutant=join(root,'scripts','unthemable-guard-mutant-'+basename(dir)+'.mjs');
let positive=0,negative=0,mutantCaught=false;
try{
 const seed=join(dir,'seed.json'),candidate=join(dir,'ledger.json'),report=join(dir,'report.json'),missingRosters=join(dir,'unprovided-authored-rosters.json');
 const entries=JSON.parse(read(ledger)).entries.filter(row=>admission.UNTHEMED_SHAS.includes(row.sha));assert.equal(entries.length,5);
 writeFileSync(seed,JSON.stringify({commits:entries.map(row=>({sha:row.sha}))}));
 const fault=join(dir,'fault.mjs'),target=join(root,'projects/ngx-material-legacy/styles/legacy-card/_card-theme.scss');
 writeFileSync(fault,"import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';import {fileURLToPath} from 'node:url';\nconst original=fs.readFileSync,target="+JSON.stringify(target)+";fs.readFileSync=function(path,...args){const value=original.call(this,path,...args),name=path instanceof URL?fileURLToPath(path):String(path);return name===target?(typeof value==='string'?value+'\\n':Buffer.concat([value,Buffer.from('\\n')])):value;};syncBuiltinESMExports();\n");
 function inspect(values,{checker='scripts/check-upstream-audit-disposition.mjs',inject=false}={}){
  writeFileSync(candidate,JSON.stringify({entries:values,g11_claim:'not-passed'}));
  rmSync(report,{force:true});
  const child=spawnSync(process.execPath,[...(inject?['--import',fault]:[]),join(root,checker),'--admission','--line','21.x',
    '--seed',seed,'--ledger',candidate,'--symbols',missingRosters,'--current-symbols',missingRosters,'--report',report],
    {cwd:root,env,encoding:'utf8',timeout:30000});
  assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.ok([0,1].includes(child.status),child.stderr);assert.ok(existsSync(report),child.stderr);
  const value=JSON.parse(readFileSync(report));assert.equal(value.disposition_admission,'incomplete');assert.equal(value.g11_claim,'not-passed');return value;
 }
 const good=inspect(entries);assert.equal(good.unresolved_in_ledger,0);assert.equal(good.evidence_failures.length,0);assert.deepEqual(good.insufficient_review_sha_ids.sensitive,[]);positive+=5;
 const stripped=structuredClone(entries);for(const entry of stripped)delete entry.individual_proof.unthemable_token_source_scope;
 const bad=inspect(stripped);assert.equal(bad.evidence_failures.length,5);assert.equal(bad.insufficient_review_sha_ids.sensitive.length,5);negative+=5;rejected.push('real-checker:five-missing-markers');
 const wrong=structuredClone(entries);wrong[0].individual_proof.unthemable_token_source_scope.qualification.sha256='0'.repeat(64);
 const forged=inspect(wrong);assert.equal(forged.evidence_failures.length,1);assert.deepEqual(forged.insufficient_review_sha_ids.sensitive,[wrong[0].sha]);negative++;rejected.push('real-checker:forged-qualification');
 const sourceFault=inspect(entries,{inject:true});assert.equal(sourceFault.evidence_failures.length,0,'completion metadata must still be valid');
 assert.equal(sourceFault.insufficient_review_sha_ids.sensitive.length,5,'registered declined changes must validate actual source');negative+=5;rejected.push('real-checker:valid-metadata-with-source-fault');
 const checker=read('scripts/check-upstream-audit-disposition.mjs').toString(),needle='requiresRegisteredSourceReview(entry, entry.individual_proof) || ';
 assert.equal(checker.split(needle).length,2);writeFileSync(mutant,checker.replace(needle,''),{flag:'wx'});
 const bypass=inspect(entries,{checker:'scripts/'+basename(mutant),inject:true});assert.equal(bypass.evidence_failures.length,0);assert.deepEqual(bypass.insufficient_review_sha_ids.sensitive,[]);
 mutantCaught=true;rejected.push('actual-CLI-mutant:missing-registered-source-requirement');
}finally{rmSync(mutant,{force:true});rmSync(dir,{recursive:true,force:true});}
assert.equal(existsSync(mutant),false);assert.equal(existsSync(dir),false);
current.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();
const report={schema_version:1,historical_json_comparison_only:true,current_physical_source_admissions:current.individual_decisions_applied,current_physical_base_class_decisions:current.base_class_removal_source_decisions_applied,current_physical_owner_guarded:true,original_program_authenticated_as_DATA:true,original_program_executed:false,line:'21.x',current_source_admissions:27,previous_source_admissions:22,
 real_root_checker_positive_rows:positive,real_root_checker_rejected_rows:negative,missing_source_requirement_mutant_detected:mutantCaught,
 rejection_controls:rejected.length,rejected,raw_current_checker_preserved:true,all_temporary_checker_files_removed:true,
 metadata_valid_source_fault_rejected:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
