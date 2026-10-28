/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {join,basename} from 'node:path';
import {tmpdir} from 'node:os';
import admission from '../scripts/upstream-selector-density-admission.cjs';
import {applySelectorDensityCanonicalStage,selectorDensityRegistrySuccessor} from '../scripts/selector-density-canonical-stage.mjs';
import {buttonTokenizationRegistrySuccessor} from '../scripts/button-tokenization-canonical-stage.mjs';
import {buttonTokenRepairsRegistrySuccessor} from '../scripts/button-token-repairs-canonical-stage.mjs';
import {surfaceM3ThemeRegistrySuccessor} from '../scripts/surface-m3-theme-canonical-stage.mjs';
import {sliderM3RepairsRegistrySuccessor} from '../scripts/slider-m3-repairs-canonical-stage.mjs';
import {controlM3ThemeRegistrySuccessor} from '../scripts/control-m3-theme-canonical-stage.mjs';
import {qualifyCanonicalToolReference} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {requiresRegisteredSourceReview} from '../scripts/upstream-registered-source-review.mjs';
import {sourceContractDefinitions} from '../scripts/upstream-source-contract-registry.mjs';
import {reviewMetadataComplete,individualReviewScopeOk} from '../scripts/upstream-individual-evidence-scope.mjs';
const root=process.cwd(),read=path=>fs.readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const ledger='compatibility/f10/disposition-ledger/ledger.json',packetPath='compatibility/rc/21x-c04-selector-density-canonical-transition.json';
const packet=JSON.parse(read(packetPath)),body=JSON.parse(read(admission.SELECTOR_DENSITY_REVIEW)),env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of Object.keys(env))if(key.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(key))delete env[key];
const before=execFileSync('git',['--no-replace-objects','show',packet.source_parent+':'+ledger],{cwd:root,env,maxBuffer:8*1024*1024});
const stage=applySelectorDensityCanonicalStage({before,body});assert.equal(hash(stage.after),packet.after.sha256);
const registryBefore=execFileSync('git',['--no-replace-objects','show',packet.source_parent+':'+packet.registry_before.path],{cwd:root,env});
assert.equal(read(packet.registry_after.path).equals(controlM3ThemeRegistrySuccessor(sliderM3RepairsRegistrySuccessor(surfaceM3ThemeRegistrySuccessor(buttonTokenRepairsRegistrySuccessor(buttonTokenizationRegistrySuccessor(selectorDensityRegistrySuccessor(registryBefore))))))),true);assert.equal(sourceContractDefinitions.length,44);
const qualified=qualifyCanonicalToolReference({root,read,prior:packet.registry_before});assert.deepEqual(qualified.reference,JSON.parse(read('compatibility/rc/21x-c04-control-m3-theme-canonical-transition.json')).registry_after);
let metadataCases=0,metadataRejections=0,sourceRejections=0;const rejected=[];
for(const row of body.reviews){
 let patchChanged=false;const patchPath=row.patch_file;
 const patchScope=qualifyCanonicalToolReference({root,read:path=>patchChanged&&path===patchPath?Buffer.concat([read(path),Buffer.from('\n')]):read(path),prior:packet.registry_before});
 patchChanged=true;assert.throws(()=>patchScope.assertCurrent());rejected.push('tool-role/late-original-patch-change/'+row.sha);
}
for(const entry of stage.entries){
 const review=body.reviews.find(row=>row.sha===entry.sha),args={entry,body,review,proof:entry.individual_proof};
 const saved=fs.readFileSync;fs.readFileSync=()=>{throw new Error('metadata must not read files');};syncBuiltinESMExports();
 try{assert.equal(admission.metadataOk(args),true);metadataCases++;}finally{fs.readFileSync=saved;syncBuiltinESMExports();}
 assert.equal(requiresRegisteredSourceReview(entry,undefined),true);assert.equal(reviewMetadataComplete(args),true);
 for(const fault of ['missing-scope','kind','sha','scope-sha','review','qualification','source-review','handler','disposition','branch','files','review-status','clearance','native-claim','extra-scope-key','patch','full-sass-claim','bounded-cases']){
  const x=structuredClone(args),scope=x.proof[admission.SELECTOR_DENSITY_SCOPE_KEY];
  if(fault==='missing-scope')delete x.proof[admission.SELECTOR_DENSITY_SCOPE_KEY];
  if(fault==='kind')x.proof.proof_kind='individual-unrecognized';
  if(fault==='sha')x.entry.sha='0'.repeat(40);
  if(fault==='scope-sha')scope.sha='0'.repeat(40);
  if(fault==='review')scope.review.sha256='0'.repeat(64);
  if(fault==='qualification')scope.source_qualification.sha256='0'.repeat(64);
  if(fault==='source-review')scope.source_review.sha256='0'.repeat(64);
  if(fault==='handler')scope.handler.sha256='0'.repeat(64);
  if(fault==='disposition')x.entry.final_disposition='irrelevant';
  if(fault==='branch')x.entry.affected_branches=['main'];
  if(fault==='files')x.entry.files.pop();
  if(fault==='review-status')x.review.status='pending';
  if(fault==='clearance')x.body.g11_claim='passed';
  if(fault==='native-claim')scope.actual_native_artifact_browser_floor_or_full_audit_qualified=true;
  if(fault==='extra-scope-key')scope.unreviewed=true;
  if(fault==='patch')x.proof.diff_sha256='0'.repeat(64);
  if(fault==='full-sass-claim')scope.full_sass_gate_executed=true;
  if(fault==='bounded-cases')scope.bounded_sass_compiler_cases=19;
  assert.equal(admission.metadataOk(x),false,fault);metadataRejections++;rejected.push(entry.sha+'/metadata/'+fault);
 }
 let late=null,reads=0;const mutable=path=>{reads++;return late===path?Buffer.concat([read(path),Buffer.from('\n')]):read(path);};
 assert.equal(admission.sourceOk({...args,root,read:mutable}),true);const firstReads=reads;
 for(const path of [admission.SELECTOR_DENSITY_REVIEW,review.patch_file,'scripts/upstream-selector-density-admission.cjs',
  'scripts/upstream-selector-density-source-review.mjs','compatibility/rc/21x-c04-selector-density-source-qualification.json',
  'compatibility/rc/upstream-sass-inspection-current-scope.json.gz','projects/ngx-material-legacy/_index.scss','node_modules/@angular/material/core/theming/_inspection.scss','node_modules/sass/sass.node.js','node_modules/sass/sass.dart.js']){
  late=path;assert.equal(admission.sourceOk({...args,root,read:mutable}),false,path);sourceRejections++;rejected.push(entry.sha+'/source/'+path);
 }
 late=null;assert.equal(admission.sourceOk({...args,root,read:mutable}),true);assert.ok(reads>2*firstReads);
 assert.equal(individualReviewScopeOk({...args,requiresIndividual:true,claimsBehavior:false}),true);
}
const directory=fs.mkdtempSync(join(tmpdir(),'ngx-selector-density-admission-')),mutant=join(root,'scripts','.selector-density-source-requirement-mutant-'+process.pid+'.mjs');
let rootPositive=0,rootNegative=0,mutantDetected=false;
try{
 const seed=join(directory,'seed.json'),candidate=join(directory,'candidate.json'),report=join(directory,'report.json'),missing=join(directory,'missing.json'),fault=join(directory,'fault.mjs');
 fs.writeFileSync(seed,JSON.stringify({commits:stage.entries.map(({sha})=>({sha}))}));
 fs.writeFileSync(fault,"import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';const original=fs.readFileSync;fs.readFileSync=function(file,...args){const raw=original.call(this,file,...args);if(String(file).endsWith('/projects/ngx-material-legacy/_index.scss'))return typeof raw==='string'?raw+'\\n':Buffer.concat([raw,Buffer.from('\\n')]);return raw;};syncBuiltinESMExports();\n");
 function inspect(entries,{inject=false,checker='scripts/check-upstream-audit-disposition.mjs'}={}){
  fs.writeFileSync(candidate,JSON.stringify({entries,g11_claim:'not-passed'}));fs.rmSync(report,{force:true});
  const child=spawnSync(process.execPath,[...(inject?['--import',fault]:[]),checker,'--admission','--line','21.x','--seed',seed,'--ledger',candidate,'--symbols',missing,'--current-symbols',missing,'--report',report],{cwd:root,env,encoding:'utf8',timeout:30000});
  assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.ok([0,1].includes(child.status),child.stderr);assert.ok(fs.existsSync(report),child.stderr);
  const value=JSON.parse(fs.readFileSync(report));assert.equal(value.disposition_admission,'incomplete');assert.equal(value.g11_claim,'not-passed');return value;
 }
 const good=inspect(stage.entries);assert.equal(good.evidence_failures.length,0);assert.deepEqual(good.insufficient_review_sha_ids.sensitive,[]);assert.equal(good.unresolved_in_ledger,0);rootPositive+=2;
 for(const faultName of ['missing-proof','missing-scope','relabeled']){
  const changed=structuredClone(stage.entries);for(const entry of changed){if(faultName==='missing-proof')delete entry.individual_proof;if(faultName==='missing-scope')delete entry.individual_proof[admission.SELECTOR_DENSITY_SCOPE_KEY];if(faultName==='relabeled')entry.final_disposition='irrelevant';}
  const bad=inspect(changed);assert.equal(bad.evidence_failures.length,2);assert.equal(bad.insufficient_review_sha_ids.sensitive.length,2);rootNegative+=2;rejected.push('root/'+faultName);
 }
 const sourceFault=inspect(stage.entries,{inject:true});assert.equal(sourceFault.evidence_failures.length,0);assert.equal(sourceFault.insufficient_review_sha_ids.sensitive.length,2);rootNegative+=2;rejected.push('root/metadata-valid-source-fault');
 const original=read('scripts/check-upstream-audit-disposition.mjs').toString(),needle='requiresRegisteredSourceReview(entry, entry.individual_proof) || ';
 assert.equal(original.split(needle).length,2);fs.writeFileSync(mutant,original.replace(needle,''),{flag:'wx'});
 const bypass=inspect(stage.entries,{inject:true,checker:'scripts/'+basename(mutant)});assert.equal(bypass.evidence_failures.length,0);assert.deepEqual(bypass.insufficient_review_sha_ids.sensitive,[]);mutantDetected=true;rejected.push('root/missing-source-requirement-mutant');
}finally{fs.rmSync(mutant,{force:true});fs.rmSync(directory,{recursive:true,force:true});}
const report={schema_version:1,result:'pass',pure_metadata_cases:metadataCases,metadata_rejections:metadataRejections,source_rejections:sourceRejections,
 registered_source_contracts:44,prior_registry_records_preserved:26,current_registry_tool_bindings:qualified.bound.length,real_root_positive_rows:rootPositive,real_root_rejected_rows:rootNegative,missing_source_requirement_mutant_detected:mutantDetected,
 late_original_patch_in_tool_role_rejected:true,
 after_sha256:hash(stage.after),individual_decisions:2,summary_scalar_tokens:2,unselected_entries_preserved:1695,rejected,canonical_ledger_applied:false,
 actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
