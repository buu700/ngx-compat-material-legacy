/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual owner epochs and CLI enforce source checks for declined registered changes. */
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {reviewMetadataComplete,individualReviewScopeOk} from '../scripts/upstream-individual-evidence-scope.mjs';
import {requiresRegisteredSourceReview} from '../scripts/upstream-registered-source-review.mjs';
import {packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {preparePackedUpstreamLedger as prepareHistoricalLedger} from '../scripts/packed-upstream-ledger-base.mjs';
import {currentCanonicalTestFrame} from './current_sass_canonical_test_scope.mjs';
import {sourceContractDefinitions} from '../scripts/upstream-source-contract-registry.mjs';
import admission from '../scripts/upstream-theme-token-root-admission.cjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),ledger='compatibility/f10/disposition-ledger/ledger.json';
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of Object.keys(env))if(key.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(key))delete env[key];
const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
 '9a915e6fe464e6bc1a83f79c0fbeb8980a8bb89d:'+ledger],{cwd:root,env,maxBuffer:8*1024*1024});
const rootBefore=execFileSync('git',['--no-replace-objects','show','d026dd06511ea9bba6def16619ae0e387a9ac074:'+ledger],{cwd:root,env,maxBuffer:8*1024*1024});
let late=null;const physicalRead=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
// The superseded old callback/raw/count assertions remain exact Git program
// DATA. No old program is imported or executed.
const oldProgram=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
 'd8ab97315b6c77b83f42c2bebcf63b2984fff255:tests/theme_token_root_admission_probe.mjs'],{cwd:root,env,maxBuffer:1024*1024});
assert.equal(createHash('sha256').update(oldProgram).digest('hex'),'8e090e028928ef1cd7bfa1e932f6eb7ad66974f64d8a0effac5fec8dc64f9e66');assert.equal(oldProgram.length,11783);
// Maintained base preparation sees current physical sources and ledger only.
const preparedHistory=prepareHistoricalLedger({root,read:physicalRead});
const counts=Object.freeze({registered:preparedHistory.testing_api_stage.individual_decisions+preparedHistory.sass_stage.individual_decisions+
 preparedHistory.rules_js_stage.individual_decisions+preparedHistory.autocomplete_landscape_stage.individual_decisions+
 preparedHistory.selection_native_stage.individual_decisions+preparedHistory.legacy_sass_entrypoint_stage.individual_decisions+
 preparedHistory.token_build_stage.individual_decisions+preparedHistory.unthemable_stage.individual_decisions,
 modern:preparedHistory.modern_control_base_stage.individual_decisions,
 theme:preparedHistory.theme_token_root_stage.individual_decisions,form:preparedHistory.form_field_tokenization_stage.individual_decisions});
assert.equal(counts.registered,27);assert.equal(counts.modern,4);assert.equal(counts.theme,2);assert.equal(counts.form,2);
assert.equal(before.equals(preparedHistory.theme_token_root_stage.before),true);assert.equal(rootBefore.equals(preparedHistory.theme_token_root_stage.after),true);
assert.equal(preparedHistory.modern_control_base_stage.before.equals(preparedHistory.registered_checker_metadata_stage.after),true);
assert.equal(preparedHistory.theme_token_root_stage.before.equals(preparedHistory.modern_control_base_stage.after),true);
assert.equal(preparedHistory.form_field_tokenization_stage.before.equals(preparedHistory.theme_token_root_stage.after),true);
assert.equal(preparedHistory.unthemable_stage.individual_decisions,5);
assert.equal(preparedHistory.registered_checker_metadata_stage.metadata_tokens,14);
assert.equal(preparedHistory.token_build_stage.individual_decisions,1);
assert.equal(preparedHistory.checker_reference_metadata_stage.checker_digest_tokens,14);
assert.equal(preparedHistory.current_native_packed_or_floor_qualified,false);
// Both exact historical before/after frames precede/follow only this source stage.
assert.equal(JSON.parse(before).entries.filter(row=>admission.ROOT_SHAS.includes(row.sha)&&row.individual_proof?.theme_token_root_source_scope!==undefined).length,0);
const physicalFrame=currentCanonicalTestFrame({root,read}),physicalOwner=packedUpstreamLedgerEpoch({root,read:physicalRead});
assert.equal(physicalOwner.individual_decisions_applied,physicalFrame.individual_source_reviews);
assert.equal(physicalOwner.base_class_removal_source_decisions_applied,physicalFrame.base_class_decisions);
assert.equal(physicalOwner.raw,physicalRead);assert.equal(physicalOwner.current_native_packed_or_floor_or_g11_credit,false);
assert.equal(physicalOwner.read('scripts/check-upstream-audit-disposition.mjs').equals(read('scripts/check-upstream-audit-disposition.mjs')),true);
physicalOwner.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();
assert.equal(counts.registered+counts.modern+counts.theme,33);assert.equal(counts.registered+counts.modern,31);
const rejected=[];
for(const path of ['scripts/upstream-theme-token-root-admission.cjs','scripts/upstream-registered-source-review.mjs',
 'scripts/registered-source-checker-transition.mjs','scripts/check-upstream-audit-disposition.mjs','scripts/upstream-source-contract-registry.mjs']){
 late=path;assert.throws(()=>preparedHistory.assertCurrent(),undefined,'base physical '+path);assert.throws(()=>physicalOwner.assertCurrent(),undefined,'physical '+path);late=null;rejected.push('late:'+path);
}
preparedHistory.assertCurrent();
const registry='scripts/upstream-source-contract-registry.mjs';
const missing=Buffer.from('export const sourceContractDefinitions='+JSON.stringify(sourceContractDefinitions.filter(row=>row.sha!==admission.ROOT_SHAS[0]))+';\n');
assert.throws(()=>packedUpstreamLedgerEpoch({root,read:path=>path===registry?missing:read(path)}));rejected.push('missing-registration');
const body=JSON.parse(read(admission.ROOT_REVIEW)),selected=JSON.parse(read(ledger)).entries.filter(row=>admission.ROOT_SHAS.includes(row.sha));
const marker=selected[0].individual_proof.theme_token_root_source_scope;
const pure=runInNewContext('const rootProof=('+admission.rootProof.toString()+');('+admission.metadataOk.toString()+')',{
 assert:{equal:assert.equal,ok:assert.ok,deepEqual:(a,b)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)))},
 DIFFS:Object.fromEntries(body.reviews.map(row=>[row.sha,row.diff_sha256])),KIND:selected[0].individual_proof.proof_kind,
 REVIEW:admission.ROOT_REVIEW,REVIEW_HASH:marker.review.sha256,QUALIFICATION:marker.qualification.path,QUALIFICATION_HASH:marker.qualification.sha256,
 hash:raw=>createHash('sha256').update(raw).digest('hex'),isDeepStrictEqual,
});
let metadataCases=0,metadataRejections=0;
for(const entry of selected){
 const review=body.reviews.find(row=>row.sha===entry.sha),args={entry,body,review,proof:entry.individual_proof};
 assert.equal(pure(args),true);assert.equal(reviewMetadataComplete(args),true);assert.equal(individualReviewScopeOk({...args,requiresIndividual:true,claimsBehavior:false}),true);metadataCases++;
 assert.equal(requiresRegisteredSourceReview({...entry,individual_proof:undefined}),true);
 for(const change of [value=>delete value.individual_proof.theme_token_root_source_scope,value=>value.individual_proof.proof_kind='individual-semantic',
  value=>value.final_disposition='not-applicable',value=>value.affected_branches=['main'],
  value=>value.individual_proof.theme_token_root_source_scope.qualification.sha256='0'.repeat(64),
  value=>value.individual_proof.theme_token_root_source_scope.actual_native_artifact_browser_floor_or_full_audit_qualified=true]){
  const changed=structuredClone(entry);change(changed);assert.equal(reviewMetadataComplete({...args,entry:changed,proof:changed.individual_proof}),false);metadataRejections++;
 }
}
const first=selected[0],args={root,entry:first,body,review:body.reviews.find(row=>row.sha===first.sha),proof:first.individual_proof};
const source=admission.inspectRootSource({root,read});assert.ok(source.bound.length>400);
let sourceRejections=0;
for(const target of [admission.ROOT_REVIEW,marker.qualification.path,'scripts/measure-theme-token-root-contracts.mjs',
 'projects/ngx-material-legacy/styles/legacy-tooltip/_tooltip-theme.scss','projects/ngx-material-legacy/styles/core/style/_sass-utils.scss']){
 assert.equal(admission.sourceOk({...args,read:path=>path===target?Buffer.concat([read(path),Buffer.from('\n')]):read(path)}),false);sourceRejections++;
}
let lateSource=null;const sourceRead=path=>path===lateSource?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
assert.equal(admission.sourceOk({...args,read:sourceRead}),true);lateSource='compatibility/rc/21x-c04-unthemable-token-placement-originals.json.gz';
assert.equal(admission.sourceOk({...args,read:sourceRead}),false);sourceRejections++;
const dir=mkdtempSync(join(tmpdir(),'ngx-unthemable-checker-')),mutant=join(root,'scripts','unthemable-guard-mutant-'+basename(dir)+'.mjs');
let positive=0,negative=0,mutantCaught=false;
try{
 const seed=join(dir,'seed.json'),candidate=join(dir,'ledger.json'),report=join(dir,'report.json'),missingRosters=join(dir,'unprovided-authored-rosters.json');
 const entries=JSON.parse(read(ledger)).entries.filter(row=>admission.ROOT_SHAS.includes(row.sha));assert.equal(entries.length,2);
 writeFileSync(seed,JSON.stringify({commits:entries.map(row=>({sha:row.sha}))}));
 const fault=join(dir,'fault.mjs'),target=join(root,'projects/ngx-material-legacy/styles/legacy-tooltip/_tooltip-theme.scss');
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
 const good=inspect(entries);assert.equal(good.unresolved_in_ledger,0);assert.equal(good.evidence_failures.length,0);assert.deepEqual(good.insufficient_review_sha_ids.sensitive,[]);positive+=2;
 const stripped=structuredClone(entries);for(const entry of stripped)delete entry.individual_proof.theme_token_root_source_scope;
 const bad=inspect(stripped);assert.equal(bad.evidence_failures.length,2);assert.equal(bad.insufficient_review_sha_ids.sensitive.length,2);negative+=2;rejected.push('real-checker:four-missing-markers');
 const wrong=structuredClone(entries);wrong[0].individual_proof.theme_token_root_source_scope.qualification.sha256='0'.repeat(64);
 const forged=inspect(wrong);assert.equal(forged.evidence_failures.length,1);assert.deepEqual(forged.insufficient_review_sha_ids.sensitive,[wrong[0].sha]);negative++;rejected.push('real-checker:forged-qualification');
 const sourceFault=inspect(entries,{inject:true});assert.equal(sourceFault.evidence_failures.length,0,'completion metadata must still be valid');
 assert.equal(sourceFault.insufficient_review_sha_ids.sensitive.length,2,'registered declined changes must validate actual source');negative+=2;rejected.push('real-checker:valid-metadata-with-source-fault');
 const checker=read('scripts/check-upstream-audit-disposition.mjs').toString(),needle='requiresRegisteredSourceReview(entry, entry.individual_proof) || ';
 assert.equal(checker.split(needle).length,2);writeFileSync(mutant,checker.replace(needle,''),{flag:'wx'});
 const bypass=inspect(entries,{checker:'scripts/'+basename(mutant),inject:true});assert.equal(bypass.evidence_failures.length,0);assert.deepEqual(bypass.insufficient_review_sha_ids.sensitive,[]);
 mutantCaught=true;rejected.push('actual-CLI-mutant:missing-registered-source-requirement');
}finally{rmSync(mutant,{force:true});rmSync(dir,{recursive:true,force:true});}
assert.equal(existsSync(mutant),false);assert.equal(existsSync(dir),false);
physicalOwner.assertCurrent();preparedHistory.assertCurrent();physicalFrame.assertCurrent();
const report={schema_version:1,line:'21.x',historical_json_comparison_only:true,original_program_authenticated_as_DATA:true,original_program_executed:false,current_physical_source_admissions:physicalOwner.individual_decisions_applied,current_physical_base_class_decisions:physicalOwner.base_class_removal_source_decisions_applied,current_physical_owner_guarded:true,current_source_admissions:33,previous_source_admissions:31,
 pure_metadata_cases:metadataCases,pure_metadata_without_filesystem_or_compiler_bindings:true,metadata_rejections:metadataRejections,source_rejections:sourceRejections,bound_source_members:source.bound.length,
 real_root_checker_positive_rows:positive,real_root_checker_rejected_rows:negative,missing_source_requirement_mutant_detected:mutantCaught,
 rejection_controls:rejected.length,rejected,raw_current_checker_preserved:true,all_temporary_checker_files_removed:true,
 metadata_valid_source_fault_rejected:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
