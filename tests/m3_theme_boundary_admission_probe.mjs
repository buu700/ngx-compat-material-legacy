/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual owner epochs and CLI enforce source checks for declined registered changes. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {reviewMetadataComplete,individualReviewScopeOk} from '../scripts/upstream-individual-evidence-scope.mjs';
import {requiresRegisteredSourceReview} from '../scripts/upstream-registered-source-review.mjs';
import {packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {packedUpstreamLedgerEpoch as maintainedBaseEpoch} from '../scripts/packed-upstream-ledger-base.mjs';
import {historicalM3EpochData} from './m3_theme_boundary_historical_epoch_data.mjs';
import {sourceContractDefinitions} from '../scripts/upstream-source-contract-registry.mjs';
import admission from '../scripts/upstream-m3-theme-boundary-admission.cjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),ledger='compatibility/f10/disposition-ledger/ledger.json';
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of Object.keys(env))if(key.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(key))delete env[key];
const {before,report:historicalData}=historicalM3EpochData({root,env});
let late=null;const actual=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const historicalRead=path=>path===ledger?before:read(path);
// The public terminal owner accepts physical current inputs, not this old JSON view.
assert.throws(()=>packedUpstreamLedgerEpoch({root,read:historicalRead}),
 error=>error?.code==='ERR_ASSERTION'&&error.message.includes('nonphysical canonical input '+ledger));
const publicOldProjectionRejected=true;
const current=packedUpstreamLedgerEpoch({root,read:actual}),previous=maintainedBaseEpoch({root,read:historicalRead});
current.assertCurrent();previous.assertCurrent();
const proposalRaw=read('compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json');
assert.equal(createHash('sha256').update(proposalRaw).digest('hex'),'720a4fcd0c9d0d67afbeddd106fc9741d7ab34a0848edc1a0f2e6a25019b9881');
const proposal=JSON.parse(proposalRaw),physicalLedger=read(ledger),physicalHash=createHash('sha256').update(physicalLedger).digest('hex');
assert.ok([proposal.before.sha256,proposal.after.sha256].includes(physicalHash));
const expectedBase=Number(physicalHash===proposal.after.sha256);
assert.equal(physicalLedger.length,(expectedBase?proposal.after:proposal.before).bytes);
assert.equal(current.legacy_removal_source_decisions_applied,1);assert.equal(current.table_local_compilation_source_decisions_applied,1);
assert.equal(current.base_class_removal_source_decisions_applied,expectedBase);
assert.equal(current.individual_decisions_applied,90+expectedBase);
const preTerminal=current.individual_decisions_applied-current.legacy_removal_source_decisions_applied-current.table_local_compilation_source_decisions_applied-current.base_class_removal_source_decisions_applied;
assert.equal(preTerminal,88);assert.equal(historicalData.historical_pre_terminal_source_admissions,88);
assert.equal(current.remaining_unthemable_source_decisions_applied,14);
assert.equal(current.core_tokenization_source_decisions_applied,3);
assert.equal(current.foundation_m3_theme_source_decisions_applied,6);
assert.equal(current.control_m3_theme_source_decisions_applied,4);
assert.equal(current.title_source_decisions_applied,1);assert.equal(current.title_native_registry_metadata_tokens_applied,14);
assert.equal(current.theming_source_decisions_applied,2);assert.equal(historicalData.historical_theming_metadata_admissions,0);
assert.equal(historicalData.historical_title_metadata_admissions,0);assert.equal(historicalData.historical_title_native_after_references,0);assert.equal(current.unthemable_source_decisions_applied,5);assert.equal(current.registered_checker_metadata_tokens_applied,14);
assert.equal(previous.individual_decisions_applied,35);assert.equal(previous.unthemable_source_decisions_applied,5);assert.equal(previous.registered_checker_metadata_tokens_applied,14);
assert.equal(current.form_field_tokenization_decisions_applied,2);assert.equal(previous.form_field_tokenization_decisions_applied,2);
assert.equal(current.m3_theme_boundary_decisions_applied,5);assert.equal(previous.m3_theme_boundary_decisions_applied,0);
assert.equal(current.theme_token_root_decisions_applied,2);assert.equal(previous.theme_token_root_decisions_applied,2);
assert.equal(current.modern_control_base_decisions_applied,4);assert.equal(previous.modern_control_base_decisions_applied,4);
for(const state of [current,previous]){assert.equal(state.token_build_decisions_applied,1);assert.equal(state.checker_reference_metadata_tokens_applied,14);assert.equal(state.current_native_packed_or_floor_or_g11_credit,false);}
assert.equal(current.raw,actual);assert.equal(current.read('scripts/check-upstream-audit-disposition.mjs').equals(read('scripts/check-upstream-audit-disposition.mjs')),true);
const rejected=[];
for(const path of ['scripts/upstream-m3-theme-boundary-admission.cjs','scripts/upstream-registered-source-review.mjs',
 'scripts/registered-source-checker-transition.mjs','scripts/check-upstream-audit-disposition.mjs','scripts/upstream-source-contract-registry.mjs']){
 late=path;assert.throws(()=>current.read(ledger),undefined,path);late=null;rejected.push('late:'+path);
}
current.assertCurrent();
const registry='scripts/upstream-source-contract-registry.mjs';
const missing=Buffer.from('export const sourceContractDefinitions='+JSON.stringify(sourceContractDefinitions.filter(row=>row.sha!==admission.BOUNDARY_SHAS[0]))+';\n');
assert.throws(()=>packedUpstreamLedgerEpoch({root,read:path=>path===registry?missing:read(path)}));rejected.push('missing-registration');
const body=JSON.parse(read(admission.BOUNDARY_REVIEW)),selected=JSON.parse(read(ledger)).entries.filter(row=>admission.BOUNDARY_SHAS.includes(row.sha));
const marker=selected[0].individual_proof.m3_theme_boundary_source_scope;
const pure=runInNewContext('const boundaryProof=('+admission.boundaryProof.toString()+');('+admission.metadataOk.toString()+')',{
 assert:{equal:assert.equal,ok:assert.ok,deepEqual:(a,b)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)))},
 DIFFS:Object.fromEntries(body.reviews.map(row=>[row.sha,row.diff_sha256])),KIND:selected[0].individual_proof.proof_kind,
 REVIEW:admission.BOUNDARY_REVIEW,REVIEW_HASH:marker.review.sha256,QUALIFICATION:marker.qualification.path,QUALIFICATION_HASH:marker.qualification.sha256,
 hash:raw=>createHash('sha256').update(raw).digest('hex'),isDeepStrictEqual,
});
let metadataCases=0,metadataRejections=0;
for(const entry of selected){
 const review=body.reviews.find(row=>row.sha===entry.sha),args={entry,body,review,proof:entry.individual_proof};
 assert.equal(pure(args),true);assert.equal(reviewMetadataComplete(args),true);assert.equal(individualReviewScopeOk({...args,requiresIndividual:true,claimsBehavior:entry.final_disposition==='already-adapted'}),true);metadataCases++;
 assert.equal(requiresRegisteredSourceReview({...entry,individual_proof:undefined}),true);
 for(const change of [value=>delete value.individual_proof.m3_theme_boundary_source_scope,value=>value.individual_proof.proof_kind='individual-semantic',
  value=>value.final_disposition='not-applicable',value=>value.final_disposition=value.final_disposition==='do-not-adopt'?'already-adapted':'do-not-adopt',value=>value.affected_branches=['main'],
  value=>value.individual_proof.m3_theme_boundary_source_scope.qualification.sha256='0'.repeat(64),
  value=>value.individual_proof.m3_theme_boundary_source_scope.actual_native_artifact_browser_floor_or_full_audit_qualified=true]){
  const changed=structuredClone(entry);change(changed);assert.equal(reviewMetadataComplete({...args,entry:changed,proof:changed.individual_proof}),false);metadataRejections++;
 }
}
const first=selected[0],args={root,entry:first,body,review:body.reviews.find(row=>row.sha===first.sha),proof:first.individual_proof};
const source=admission.inspectBoundarySource({root,read});
assert.equal(new Set(source.bound.map(ref=>ref.path)).size,source.bound.length);
for(const ref of source.bound){const raw=read(ref.path);assert.equal(createHash('sha256').update(raw).digest('hex'),ref.sha256);assert.equal(raw.length,ref.bytes);}
source.assertCurrent();source.assertPhysical();
let sourceRejections=0;
for(const target of [admission.BOUNDARY_REVIEW,marker.qualification.path,'scripts/measure-m3-theme-boundary-contracts.mjs',
 'projects/ngx-material-legacy/styles/core/theming/_theming.scss','projects/ngx-material-legacy/styles/_token-theming.scss']){
 assert.equal(admission.sourceOk({...args,read:path=>path===target?Buffer.concat([read(path),Buffer.from('\n')]):read(path)}),false);sourceRejections++;
}
let lateSource=null;const sourceRead=path=>path===lateSource?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
assert.equal(admission.sourceOk({...args,read:sourceRead}),true);lateSource='projects/ngx-material-legacy/styles/legacy-checkbox/_checkbox-theme.scss';
assert.equal(admission.sourceOk({...args,read:sourceRead}),false);sourceRejections++;
const dir=mkdtempSync(join(tmpdir(),'ngx-unthemable-checker-')),mutant=join(root,'scripts','unthemable-guard-mutant-'+basename(dir)+'.mjs');
let positive=0,negative=0,mutantCaught=false;
try{
 const seed=join(dir,'seed.json'),candidate=join(dir,'ledger.json'),report=join(dir,'report.json'),missingRosters=join(dir,'unprovided-authored-rosters.json');
 const entries=JSON.parse(read(ledger)).entries.filter(row=>admission.BOUNDARY_SHAS.includes(row.sha));assert.equal(entries.length,5);
 writeFileSync(seed,JSON.stringify({commits:entries.map(row=>({sha:row.sha}))}));
 const fault=join(dir,'fault.mjs'),target=join(root,'projects/ngx-material-legacy/styles/core/theming/_theming.scss');
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
 assert.ok(entries.every(entry=>entry.final_disposition==='do-not-adopt'));
 const good=inspect(entries);assert.deepEqual(good.insufficient_review_sha_ids.behavior,[]);assert.equal(good.unresolved_in_ledger,0);assert.equal(good.evidence_failures.length,0);assert.deepEqual(good.insufficient_review_sha_ids.sensitive,[]);positive+=5;
 const stripped=structuredClone(entries);for(const entry of stripped)delete entry.individual_proof.m3_theme_boundary_source_scope;
 const bad=inspect(stripped);assert.equal(bad.evidence_failures.length,5);assert.equal(bad.insufficient_review_sha_ids.sensitive.length,5);negative+=5;rejected.push('real-checker:five-missing-markers');
 const wrong=structuredClone(entries);wrong[0].individual_proof.m3_theme_boundary_source_scope.qualification.sha256='0'.repeat(64);
 const forged=inspect(wrong);assert.equal(forged.evidence_failures.length,1);assert.deepEqual(forged.insufficient_review_sha_ids.sensitive,[wrong[0].sha]);negative++;rejected.push('real-checker:forged-qualification');
 const sourceFault=inspect(entries,{inject:true});assert.equal(sourceFault.evidence_failures.length,0,'completion metadata must still be valid');
 assert.deepEqual(sourceFault.insufficient_review_sha_ids.behavior,[]);
 assert.equal(sourceFault.insufficient_review_sha_ids.sensitive.length,5,'registered declined changes must validate actual source');negative+=5;rejected.push('real-checker:valid-metadata-with-source-fault');
 const checker=read('scripts/check-upstream-audit-disposition.mjs').toString(),needle='requiresRegisteredSourceReview(entry, entry.individual_proof) || ';
 assert.equal(checker.split(needle).length,2);writeFileSync(mutant,checker.replace(needle,''),{flag:'wx'});
 const bypass=inspect(entries,{checker:'scripts/'+basename(mutant),inject:true});assert.equal(bypass.evidence_failures.length,0);assert.deepEqual(bypass.insufficient_review_sha_ids.sensitive,[]);assert.deepEqual(bypass.insufficient_review_sha_ids.behavior,[]);
 mutantCaught=true;rejected.push('actual-CLI-mutant:missing-registered-source-requirement');
}finally{rmSync(mutant,{force:true});rmSync(dir,{recursive:true,force:true});}
assert.equal(existsSync(mutant),false);assert.equal(existsSync(dir),false);
const report={schema_version:1,line:'21.x',...historicalData,
 current_epoch_scope:'public physical terminal owner',previous_epoch_scope:'maintained base historical35 JSON view',
 public_old_projection_rejected:publicOldProjectionRejected,preserved_pre_terminal_source_admissions:preTerminal,
 legacy_removal_source_admissions:current.legacy_removal_source_decisions_applied,table_local_compilation_source_admissions:current.table_local_compilation_source_decisions_applied,
 base_class_removal_source_admissions:current.base_class_removal_source_decisions_applied,current_source_admissions:current.individual_decisions_applied,previous_source_admissions:previous.individual_decisions_applied,
 title_source_admissions:current.title_source_decisions_applied,title_native_metadata_tokens:current.title_native_registry_metadata_tokens_applied,
 theming_source_admissions:current.theming_source_decisions_applied,inspection_source_admissions:current.inspection_source_decisions_applied,selector_density_source_admissions:current.selector_density_source_decisions_applied,button_tokenization_source_admissions:current.button_tokenization_source_decisions_applied,button_token_repairs_source_admissions:current.button_token_repairs_source_decisions_applied,surface_m3_theme_source_admissions:current.surface_m3_theme_source_decisions_applied,slider_m3_repairs_source_admissions:current.slider_m3_repairs_source_decisions_applied,control_m3_theme_source_admissions:current.control_m3_theme_source_decisions_applied,foundation_m3_theme_source_admissions:current.foundation_m3_theme_source_decisions_applied,core_tokenization_source_admissions:current.core_tokenization_source_decisions_applied,remaining_unthemable_source_admissions:current.remaining_unthemable_source_decisions_applied,
 pure_metadata_cases:metadataCases,pure_metadata_without_filesystem_or_compiler_bindings:true,metadata_rejections:metadataRejections,source_rejections:sourceRejections,bound_source_members:source.bound.length,all_exact_current_source_members_physically_verified:true,
 real_root_checker_positive_rows:positive,real_root_checker_rejected_rows:negative,missing_source_requirement_mutant_detected:mutantCaught,
 rejection_controls:rejected.length,rejected,raw_current_checker_preserved:true,all_temporary_checker_files_removed:true,
 five_declined_decisions_individually_enforced:true,declined_source_fault_cannot_bypass:true,metadata_valid_source_fault_rejected:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
