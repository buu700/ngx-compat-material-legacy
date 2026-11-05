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
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {legacyRemovalOwnerSourceSubject} from '../scripts/legacy-removal-owner-source.mjs';
import admission from '../scripts/upstream-legacy-removal-admission.cjs';
import {historicalContractRepairReaderSubject} from '../scripts/historical-contract-repair-readers.mjs';
import {applyLegacyRemovalCanonicalStage,legacyRemovalRegistrySuccessor,LEGACY_REMOVAL_LEDGER as LEDGER,LEGACY_REMOVAL_REGISTRY as REGISTRY} from '../scripts/legacy-removal-canonical-stage.mjs';
import {currentCanonicalTestFrame} from './current_sass_canonical_test_scope.mjs';
const root=process.cwd(),read=path=>fs.readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const prefix='compatibility/rc/21x-legacy-removal-admission-',worksheet=JSON.parse(read(prefix+'worksheet.json')),body=JSON.parse(read(admission.LEGACY_REMOVAL_REVIEW));
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of Object.keys(env))if(key.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(key))delete env[key];
const original=path=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',worksheet.source_parent+':'+path],{cwd:root,env,maxBuffer:8*1024*1024});
const before=original(LEDGER),registryBefore=original(REGISTRY),stage=applyLegacyRemovalCanonicalStage({before,body}),registryAfter=legacyRemovalRegistrySuccessor(registryBefore),entry=stage.entries[0],args={root,entry,body,review:body,proof:entry.individual_proof};
const iterationTools=legacyRemovalOwnerSourceSubject({root,read});
const currentFrame=currentCanonicalTestFrame({root,read});
const iterationLedger=before,currentLedger=read(LEDGER),currentRegistry=read(REGISTRY),physicalLedger=iterationTools.predecessorData(LEDGER,currentFrame.comparison(LEDGER,currentLedger)),physicalRegistry=iterationTools.predecessorData(REGISTRY,currentFrame.comparison(REGISTRY,currentRegistry));
assert.ok(physicalLedger.equals(before)||physicalLedger.equals(stage.after),'unknown current iteration ledger');
assert.ok(physicalRegistry.equals(registryBefore)||physicalRegistry.equals(registryAfter),'unknown current iteration registry');
if(physicalLedger.equals(stage.after))assert.ok(physicalRegistry.equals(registryAfter));
const phase=process.argv[3]??'contract';assert.ok(['contract','root'].includes(phase));
let metadataRejections=0,coldRejections=0,lateRejections=0,rootPositive=0,rootNegative=0,mutantDetected=false;
if(phase==='contract'){
 const executable=read('scripts/upstream-legacy-removal-source.mjs').toString(),toolSubject=historicalContractRepairReaderSubject({root,read});
 // Retain the original static-body assertions as explicit historical metadata.
 const current=toolSubject.comparisonBytes(body.current_source_verifier).toString(),prior=gunzipSync(read(prefix+'source-before.mjs.gz')).toString();
 toolSubject.assertCurrent();
 const imports="import {createRequire} from 'node:module';\nimport {dirname,join,resolve,relative,sep} from 'node:path';\nimport {lstatSync,readdirSync,realpathSync} from 'node:fs';\n";
 assert.equal(current.split(imports).length,2);assert.ok(current.replace(imports,'').startsWith(prior),'prior original authenticator changed');
 const successor=JSON.parse(read(prefix+'source-successor.json'));
 assert.equal(hash(prior),successor.before_source.sha256);assert.equal(Buffer.byteLength(prior),successor.before_source.bytes);
 assert.equal(hash(current),successor.after_source.sha256);assert.equal(Buffer.byteLength(current),successor.after_source.bytes);
 const diagnostic=read(successor.qualified_diagnostic_body.path).toString();assert.equal(hash(diagnostic),successor.qualified_diagnostic_body.sha256);
 let boundaryBody=diagnostic.slice(diagnostic.indexOf('const tag=new Map('),diagnostic.indexOf('\nif(process.argv[2])'));
 assert.equal(hash(boundaryBody),successor.qualified_diagnostic_body.selected_body_sha256);
 for(const edit of successor.finite_body_edits){assert.equal(boundaryBody.split(edit.before).length,2);boundaryBody=boundaryBody.replace(edit.before,edit.after);}
 assert.equal(hash(boundaryBody),successor.current_module_body_sha256);assert.equal(current.split(boundaryBody).length,2,'qualified static boundary logic changed');
 const qualification=JSON.parse(read(body.source_qualification.path));assert.deepEqual(qualification.immutable_inputs.find(row=>row.path===successor.before_source.path),successor.before_source);
 assert.ok(!current.includes("from '../../scripts/upstream-legacy-removal-source.mjs'"));
 const sourceFunction=executable.slice(executable.indexOf('export function inspectLegacyRemovalSourceReview'));
 assert.ok(!sourceFunction.includes('writeFileSync'));assert.ok(!sourceFunction.includes('execFileSync'));assert.ok(!sourceFunction.includes('process.argv'));
 const saved=fs.readFileSync;fs.readFileSync=()=>{throw Error('metadata file read');};syncBuiltinESMExports();
 try{assert.equal(admission.metadataOk(args),true);}finally{fs.readFileSync=saved;syncBuiltinESMExports();}
 for(const fault of ['proof','scope','kind','sha','scope-sha','disposition','read-note','branch','seed-path','reason','review-status','review-scope','qualification','verifier','handler','complete-path','hunks','native','clearance','extra-scope']){
  const x=structuredClone({entry,body,review:body,proof:entry.individual_proof}),scope=x.proof[admission.LEGACY_REMOVAL_SCOPE_KEY];
  if(fault==='proof')delete x.entry.individual_proof;
  if(fault==='scope')delete x.proof[admission.LEGACY_REMOVAL_SCOPE_KEY];
  if(fault==='kind')x.proof.proof_kind='individual-unrecognized';
  if(fault==='sha')x.entry.sha='0'.repeat(40);
  if(fault==='scope-sha')scope.sha='0'.repeat(40);
  if(fault==='disposition')x.entry.final_disposition='irrelevant';
  if(fault==='read-note')x.entry.read_note_disposition='docs-only';
  if(fault==='branch')x.entry.affected_branches=['main'];
  if(fault==='seed-path')x.entry.files.pop();
  if(fault==='reason')x.entry.reason+=' changed';
  if(fault==='review-status')x.body.status='pending';
  if(fault==='review-scope')x.review.complete_deleted_paths=701;
  if(fault==='qualification')scope.source_qualification.sha256='0'.repeat(64);
  if(fault==='verifier')scope.source_verifier.sha256='0'.repeat(64);
  if(fault==='handler')scope.handler.sha256='0'.repeat(64);
  if(fault==='complete-path')x.body.complete_original_paths.pop();
  if(fault==='hunks')scope.individual_nondeletion_hunks=96;
  if(fault==='native')scope.actual_native_packed_browser_floor_or_full_audit_qualified=true;
  if(fault==='clearance')x.body.g11_claim='passed';
  if(fault==='extra-scope')scope.cached_success=true;
  assert.equal(admission.metadataOk(x),false,fault);metadataRejections++;
 }
 let changed=null,reads=0;const mutable=path=>{reads++;const raw=read(path);return path===changed?Buffer.concat([raw,Buffer.from('\n')]):raw;};
 const source=admission.inspectCanonicalSource({root,entries:stage.entries,body,read:mutable});const firstReads=reads;source.assertCurrent();
 const faults=[admission.LEGACY_REMOVAL_REVIEW,body.patch_file,body.source_qualification.path,body.source_review.path,body.source_boundary.path,body.current_source_verifier.path,'scripts/upstream-legacy-removal-admission.cjs','compatibility/rc/21x-legacy-removal-source-originals.json.gz','projects/ngx-material-legacy/legacy-core/public-api.ts','projects/ngx-material-legacy/_index.scss','projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts','node_modules/typescript/lib/typescript.js'];
 for(const path of faults){changed=path;assert.equal(admission.sourceOk({...args,read:mutable}),false,'cold '+path);coldRejections++;assert.throws(()=>source.assertCurrent(),undefined,'late '+path);lateRejections++;}
 changed=null;assert.equal(admission.sourceOk({...args,read:mutable}),true);assert.ok(reads>firstReads*2);
 const copy=structuredClone(source.bound);copy[0].sha256='0'.repeat(64);source.assertCurrent();
 const oldReaddir=fs.readdirSync,oldStat=fs.lstatSync,extra=join(root,'projects/ngx-material-legacy','unreviewed-extra.ts');
 fs.readdirSync=function(path,...rest){const values=oldReaddir.call(this,path,...rest);return String(path)===join(root,'projects/ngx-material-legacy')?[...values,'unreviewed-extra.ts']:values;};
 fs.lstatSync=function(path,...rest){return oldStat.call(this,String(path)===extra?join(root,'projects/ngx-material-legacy/legacy-core/public-api.ts'):path,...rest);};syncBuiltinESMExports();
 try{assert.equal(admission.sourceOk(args),false,'untracked current product file population');coldRejections++;}finally{fs.readdirSync=oldReaddir;fs.lstatSync=oldStat;syncBuiltinESMExports();}
 assert.throws(()=>admission.inspectCanonicalSource({root,entries:[],body}));assert.throws(()=>admission.inspectCanonicalSource({root,entries:[entry,entry],body}));
 for(const value of [Buffer.concat([before,Buffer.from('\n')]),stage.after,Buffer.from('{}')])assert.throws(()=>applyLegacyRemovalCanonicalStage({before:value,body}));
 for(const value of [Buffer.concat([registryBefore,Buffer.from('\n')]),registryAfter])assert.throws(()=>legacyRemovalRegistrySuccessor(value));
 assert.equal(iterationLedger.equals(before),true);assert.equal(gunzipSync(read(prefix+'registry-before.mjs.gz')).equals(registryBefore),true);
 iterationTools.assertCurrent();currentFrame.assertCurrent();assert.ok(read(LEDGER).equals(currentLedger));assert.ok(read(REGISTRY).equals(currentRegistry));
}else{
 // Run only while the exact proposed registry is installed by the bounded
 // reversible driver. Root checker and every source read remain real.
 assert.equal(physicalRegistry.equals(registryAfter),true);currentFrame.assertCurrent();
 const {sourceContractDefinitions}=await import('../scripts/upstream-source-contract-registry.mjs');assert.equal(sourceContractDefinitions.length-(currentFrame.registered_source_contracts-68),68);
 const {requiresRegisteredSourceReview}=await import('../scripts/upstream-registered-source-review.mjs');assert.equal(requiresRegisteredSourceReview(entry),true);
 const {reviewMetadataComplete,individualReviewScopeOk}=await import('../scripts/upstream-individual-evidence-scope.mjs');assert.equal(reviewMetadataComplete(args),true);assert.equal(individualReviewScopeOk({...args,requiresIndividual:true,claimsBehavior:false}),true);
 const directory=fs.mkdtempSync(join(tmpdir(),'ngx-legacy-removal-root-')),mutant=join(root,'scripts','.legacy-removal-source-mutant-'+process.pid+'.mjs');
 try{
  const seed=join(directory,'seed.json'),candidate=join(directory,'candidate.json'),report=join(directory,'report.json'),missing=join(directory,'missing.json'),fault=join(directory,'fault.mjs');
  fs.writeFileSync(seed,JSON.stringify({commits:[{sha:entry.sha}]}));
  fs.writeFileSync(fault,"import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';const read=fs.readFileSync;fs.readFileSync=function(path,...args){const raw=read.call(this,path,...args);return String(path).endsWith('/projects/ngx-material-legacy/_index.scss')?(typeof raw==='string'?raw+'\\n':Buffer.concat([raw,Buffer.from('\\n')])):raw;};syncBuiltinESMExports();\n");
  function inspect(candidateEntry,{inject=false,checker='scripts/check-upstream-audit-disposition.mjs'}={}){
   fs.writeFileSync(candidate,JSON.stringify({entries:[candidateEntry],g11_claim:'not-passed'}));fs.rmSync(report,{force:true});
   const child=spawnSync(process.execPath,[...(inject?['--import',fault]:[]),checker,'--admission','--line','21.x','--seed',seed,'--ledger',candidate,'--symbols',missing,'--current-symbols',missing,'--report',report],{cwd:root,env,encoding:'utf8',timeout:30000});
   assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.ok([0,1].includes(child.status),child.stderr);assert.ok(fs.existsSync(report),child.stderr);
   const value=JSON.parse(fs.readFileSync(report));assert.equal(value.disposition_admission,'incomplete');assert.equal(value.g11_claim,'not-passed');return value;
  }
  const good=inspect(entry);assert.equal(good.evidence_failures.length,0);assert.deepEqual(good.insufficient_review_sha_ids.sensitive,[]);assert.equal(good.unresolved_in_ledger,0);rootPositive++;
  for(const faultName of ['proof','scope','relabeled']){
   const bad=structuredClone(entry);if(faultName==='proof')delete bad.individual_proof;if(faultName==='scope')delete bad.individual_proof[admission.LEGACY_REMOVAL_SCOPE_KEY];if(faultName==='relabeled')bad.final_disposition='irrelevant';
   const result=inspect(bad);assert.equal(result.evidence_failures.length,1);assert.equal(result.insufficient_review_sha_ids.sensitive.length,1);rootNegative++;
  }
  const changed=inspect(entry,{inject:true});assert.equal(changed.evidence_failures.length,0);assert.equal(changed.insufficient_review_sha_ids.sensitive.length,1);rootNegative++;
  const checker=read('scripts/check-upstream-audit-disposition.mjs').toString(),needle='requiresRegisteredSourceReview(entry, entry.individual_proof) || ';assert.equal(checker.split(needle).length,2);
  fs.writeFileSync(mutant,checker.replace(needle,''),{flag:'wx'});
  const bypass=inspect(entry,{inject:true,checker:'scripts/'+mutant.split('/').at(-1)});assert.equal(bypass.evidence_failures.length,0);assert.deepEqual(bypass.insufficient_review_sha_ids.sensitive,[]);mutantDetected=true;
 }finally{fs.rmSync(mutant,{force:true});fs.rmSync(directory,{recursive:true,force:true});}
 assert.equal(iterationLedger.equals(before),true);assert.ok(read(LEDGER).equals(currentLedger));assert.ok(read(REGISTRY).equals(currentRegistry));currentFrame.assertCurrent();
}
const report={schema_version:1,result:'pass',line:'21.x',phase,metadata_positive_cases:phase==='contract'?1:0,metadata_rejections:metadataRejections,cold_source_rejections:coldRejections,late_source_rejections:lateRejections,real_root_positive_rows:rootPositive,real_root_rejected_rows:rootNegative,missing_source_requirement_mutant_detected:mutantDetected,after_sha256:hash(stage.after),registry_after_sha256:hash(registryAfter),individual_decisions_proposed:1,summary_scalar_tokens:2,unselected_entries_preserved:1696,canonical_ledger_applied:physicalLedger.equals(stage.after),full_owner_integration_qualified:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
