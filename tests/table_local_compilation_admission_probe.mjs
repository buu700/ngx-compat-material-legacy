/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Source contract and genuine root dispatch controls; never applies the ledger. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import admission from '../scripts/upstream-table-local-compilation-admission.cjs';
import {applyTableLocalCompilationCanonicalStage,tableLocalCompilationRegistrySuccessor,TABLE_LOCAL_COMPILATION_LEDGER as LEDGER,TABLE_LOCAL_COMPILATION_REGISTRY as REGISTRY} from '../scripts/table-local-compilation-canonical-stage.mjs';
import {currentCanonicalTestFrame} from './current_sass_canonical_test_scope.mjs';
const root=process.cwd(),read=path=>fs.readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const prefix='compatibility/rc/21x-table-local-compilation-admission-',body=JSON.parse(read(admission.TABLE_LOCAL_COMPILATION_REVIEW));
const before=gunzipSync(read(prefix+'ledger-before.json.gz')),registryBefore=gunzipSync(read(prefix+'registry-before.mjs.gz'));
const stage=applyTableLocalCompilationCanonicalStage({before,body}),registryAfter=tableLocalCompilationRegistrySuccessor(registryBefore),entry=stage.entries[0],args={root,entry,body,review:body,proof:entry.individual_proof};
const actualLedger=read(LEDGER),actualRegistry=read(REGISTRY),currentFrame=currentCanonicalTestFrame({root,read});
const physicalLedger=currentFrame.comparison(LEDGER,actualLedger),physicalRegistry=currentFrame.comparison(REGISTRY,actualRegistry);
assert.ok(physicalLedger.equals(before)||physicalLedger.equals(stage.after),'unknown current table ledger');
assert.ok(physicalRegistry.equals(registryBefore)||physicalRegistry.equals(registryAfter),'unknown current table registry');
if(physicalLedger.equals(stage.after))assert.ok(physicalRegistry.equals(registryAfter));
const phase=process.argv[3]??'contract';assert.ok(['contract','root'].includes(phase));
let metadataRejections=0,coldRejections=0,lateRejections=0,rootPositive=0,rootNegative=0,mutantDetected=false;
if(phase==='contract'){
 const saved=fs.readFileSync;fs.readFileSync=()=>{throw Error('metadata read file');};syncBuiltinESMExports();
 try{assert.equal(admission.metadataOk(args),true);}finally{fs.readFileSync=saved;syncBuiltinESMExports();}
 for(const fault of ['proof','scope','kind','sha','scope-sha','disposition','read-note','branch','seed-path','reason','review-status','review-scope','qualification','verifier','handler','complete-path','hunks','native','clearance','extra-scope']){
  const x=structuredClone({entry,body,review:body,proof:entry.individual_proof}),scope=x.proof[admission.TABLE_LOCAL_COMPILATION_SCOPE_KEY];
  if(fault==='proof')delete x.entry.individual_proof;
  if(fault==='scope')delete x.proof[admission.TABLE_LOCAL_COMPILATION_SCOPE_KEY];
  if(fault==='kind')x.proof.proof_kind='individual-unrecognized';
  if(fault==='sha')x.entry.sha='0'.repeat(40);
  if(fault==='scope-sha')scope.sha='0'.repeat(40);
  if(fault==='disposition')x.entry.final_disposition='irrelevant';
  if(fault==='read-note')x.entry.read_note_disposition='docs-only';
  if(fault==='branch')x.entry.affected_branches=['main'];
  if(fault==='seed-path')x.entry.files.pop();
  if(fault==='reason')x.entry.reason+=' changed';
  if(fault==='review-status')x.body.status='pending';
  if(fault==='review-scope')x.review.actual_extracted_row_compiler_cells=5;
  if(fault==='qualification')scope.source_qualification.sha256='0'.repeat(64);
  if(fault==='verifier')scope.source_verifier.sha256='0'.repeat(64);
  if(fault==='handler')scope.handler.sha256='0'.repeat(64);
  if(fault==='complete-path')x.body.complete_original_paths.pop();
  if(fault==='hunks')scope.original_hunks=6;
  if(fault==='native')scope.actual_native_packed_browser_floor_or_full_audit_qualified=true;
  if(fault==='clearance')x.body.g11_claim='passed';
  if(fault==='extra-scope')scope.cached_success=true;
  assert.equal(admission.metadataOk(x),false,fault);metadataRejections++;
 }
 let changed=null,reads=0;const mutable=path=>{reads++;const raw=read(path);return path===changed?Buffer.concat([raw,Buffer.from('\n')]):raw;};
 const source=admission.inspectCanonicalSource({root,entries:stage.entries,body,read:mutable}),firstReads=reads;source.assertCurrent();
 const faults=[admission.TABLE_LOCAL_COMPILATION_REVIEW,body.patch_file,body.source_qualification.path,body.source_review.path,body.source_inputs.path,body.source_verifier.path,'scripts/upstream-table-local-compilation-admission.cjs','compatibility/rc/21x-table-local-compilation-source-originals.json.gz',body.compiler_receipts[0].path,'projects/ngx-material-legacy/legacy-table/row.ts','projects/ngx-material-legacy/legacy-table/table.ts','projects/ngx-material-legacy/legacy-table/table-module.ts','node_modules/@angular/cdk/types/table.d.ts','node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js'];
 for(const path of faults){changed=path;assert.equal(admission.sourceOk({...args,read:mutable}),false,'cold '+path);coldRejections++;assert.throws(()=>source.assertCurrent(),undefined,'late '+path);lateRejections++;}
 changed=null;assert.equal(admission.sourceOk({...args,read:mutable}),true);assert.ok(reads>firstReads*2);
 const copy=structuredClone(source.bound);copy[0].sha256='0'.repeat(64);source.assertCurrent();
 assert.throws(()=>admission.inspectCanonicalSource({root,entries:[],body}));assert.throws(()=>admission.inspectCanonicalSource({root,entries:[entry,entry],body}));
 for(const value of [Buffer.concat([before,Buffer.from('\n')]),stage.after,Buffer.from('{}')])assert.throws(()=>applyTableLocalCompilationCanonicalStage({before:value,body}));
 for(const value of [Buffer.concat([registryBefore,Buffer.from('\n')]),registryAfter])assert.throws(()=>tableLocalCompilationRegistrySuccessor(value));
 assert.equal(read(LEDGER).equals(actualLedger),true);assert.equal(read(REGISTRY).equals(actualRegistry),true);currentFrame.assertCurrent();
}else{
 assert.ok(physicalRegistry.equals(registryAfter),'root test requires exact authenticated candidate registry DATA');
 const {sourceContractDefinitions}=await import('../scripts/upstream-source-contract-registry.mjs');assert.equal(sourceContractDefinitions.length,currentFrame.registered_source_contracts);
 const {requiresRegisteredSourceReview}=await import('../scripts/upstream-registered-source-review.mjs');assert.equal(requiresRegisteredSourceReview(entry),true);
 const {reviewMetadataComplete,individualReviewScopeOk}=await import('../scripts/upstream-individual-evidence-scope.mjs');assert.equal(reviewMetadataComplete(args),true);assert.equal(individualReviewScopeOk({...args,requiresIndividual:true,claimsBehavior:false}),true);
 const directory=fs.mkdtempSync(join(tmpdir(),'ngx-table-local-root-')),mutant=join(root,'scripts','.table-local-source-mutant-'+process.pid+'.mjs');
 try{
  const seed=join(directory,'seed.json'),candidate=join(directory,'candidate.json'),report=join(directory,'report.json'),missing=join(directory,'missing.json'),preload=join(directory,'fault.mjs');
  fs.writeFileSync(seed,JSON.stringify({commits:[{sha:entry.sha}]}));
  fs.writeFileSync(preload,"import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';const read=fs.readFileSync,list=fs.readdirSync;fs.readFileSync=function(path,...args){const raw=read.call(this,path,...args);return process.env.TABLE_LOCAL_FAULT==='row'&&String(path).endsWith('/projects/ngx-material-legacy/legacy-table/row.ts')?(typeof raw==='string'?raw+'\\n':Buffer.concat([raw,Buffer.from('\\n')])):raw;};fs.readdirSync=function(path,...args){const value=list.call(this,path,...args);return process.env.TABLE_LOCAL_FAULT==='population'&&String(path).endsWith('/projects/ngx-material-legacy/legacy-table')&&args[0]?.withFileTypes===true?[...value,{name:'unreviewed-extra.ts',isDirectory:()=>false,isFile:()=>true}]:value;};syncBuiltinESMExports();\n");
  const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('RC_')||key==='TABLE_LOCAL_FAULT')delete env[key];
  function inspect(candidateEntry,{fault,checker='scripts/check-upstream-audit-disposition.mjs'}={}){
   fs.writeFileSync(candidate,JSON.stringify({entries:[candidateEntry],g11_claim:'not-passed'}));fs.rmSync(report,{force:true});
   const child=spawnSync(process.execPath,[...(fault?['--import',preload]:[]),checker,'--admission','--line','21.x','--seed',seed,'--ledger',candidate,'--symbols',missing,'--current-symbols',missing,'--report',report],{cwd:root,env:{...env,...(fault?{TABLE_LOCAL_FAULT:fault}:{})},encoding:'utf8',timeout:45000,maxBuffer:4*1024*1024});
   assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.ok([0,1].includes(child.status),child.stderr);assert.ok(fs.existsSync(report),child.stderr);
   const value=JSON.parse(fs.readFileSync(report));assert.equal(value.disposition_admission,'incomplete');assert.equal(value.g11_claim,'not-passed');return value;
  }
  const good=inspect(entry);assert.equal(good.evidence_failures.length,0);assert.deepEqual(good.insufficient_review_sha_ids.sensitive,[]);assert.equal(good.unresolved_in_ledger,0);rootPositive++;
  for(const faultName of ['proof','scope','relabeled']){
   const bad=structuredClone(entry);if(faultName==='proof')delete bad.individual_proof;if(faultName==='scope')delete bad.individual_proof[admission.TABLE_LOCAL_COMPILATION_SCOPE_KEY];if(faultName==='relabeled')bad.final_disposition='irrelevant';
   const result=inspect(bad);assert.equal(result.evidence_failures.length,1);assert.equal(result.insufficient_review_sha_ids.sensitive.length,1);rootNegative++;
  }
  for(const fault of ['row','population']){
   const changed=inspect(entry,{fault});assert.equal(changed.evidence_failures.length,0);assert.equal(changed.insufficient_review_sha_ids.sensitive.length,1);rootNegative++;
  }
  const checker=read('scripts/check-upstream-audit-disposition.mjs').toString(),needle='requiresRegisteredSourceReview(entry, entry.individual_proof) || ';assert.equal(checker.split(needle).length,2);
  fs.writeFileSync(mutant,checker.replace(needle,''),{flag:'wx'});
  const bypass=inspect(entry,{fault:'row',checker:'scripts/'+mutant.split('/').at(-1)});assert.equal(bypass.evidence_failures.length,0);assert.deepEqual(bypass.insufficient_review_sha_ids.sensitive,[]);mutantDetected=true;
 }finally{fs.rmSync(mutant,{force:true});fs.rmSync(directory,{recursive:true,force:true});}
 assert.ok(read(LEDGER).equals(actualLedger));assert.ok(read(REGISTRY).equals(actualRegistry));currentFrame.assertCurrent();
}
const report={schema_version:1,result:'pass',line:'21.x',phase,metadata_positive_cases:phase==='contract'?1:0,metadata_rejections:metadataRejections,cold_source_rejections:coldRejections,late_source_rejections:lateRejections,real_root_positive_rows:rootPositive,real_root_rejected_rows:rootNegative,missing_source_requirement_mutant_detected:mutantDetected,after_sha256:hash(stage.after),registry_after_sha256:hash(registryAfter),individual_decisions_proposed:1,summary_scalar_tokens:2,unselected_entries_preserved:1696,canonical_ledger_applied:physicalLedger.equals(stage.after),full_owner_integration_qualified:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
