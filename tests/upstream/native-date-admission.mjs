/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual reader/shared prerequisite/CLI controls; all run and product observations are synthetic. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
import {readFileSync,writeFileSync,mkdirSync,renameSync,symlinkSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFixture,hash} from './artifact-behavior-fixture.mjs';
import {NATIVE_DATE_SHA,NATIVE_DATE_KIND,nativeDateRequirements,requiresNativeDate,validateNativeDate} from '../../scripts/upstream-native-date-evidence.mjs';
import {NATIVE_DATE_CONSTRUCTOR_CASE_ID,NATIVE_DATE_PROVIDER_CASE_ID,packedNativeDateConstructorCase,packedNativeDateProviderCase} from '../../scripts/native-date-packed-contract.mjs';
import {validatePackedConsumerRun,readEvidenceMember} from '../../scripts/upstream-packed-run-evidence.mjs';
import {nativeDatePackedSample} from '../native_date_packed_sample.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),read=p=>readFileSync(join(root,p));
const ts=createRequire(import.meta.url)('typescript'),sample=nativeDatePackedSample(),requirements=nativeDateRequirements(NATIVE_DATE_SHA);
assert.equal(requiresNativeDate({sha:NATIVE_DATE_SHA},{}),true);
assert.equal(requiresNativeDate({}, {proof_kind:NATIVE_DATE_KIND}),true);
assert.equal(requiresNativeDate({}, {native_date_behavior:null}),true);
assert.equal(requiresNativeDate({},{}),false);assert.equal(nativeDateRequirements('unknown'),null);
const escaped=nativeDateRequirements(NATIVE_DATE_SHA);escaped.members.length=0;assert.ok(nativeDateRequirements(NATIVE_DATE_SHA).members.length>0);
const current=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')).entries.find(row=>row.sha===NATIVE_DATE_SHA);
const entry=structuredClone(current),originalReview=JSON.parse(read('compatibility/f10/disposition-ledger/evidence/closeout-native-date-source-review.json'));
entry.evidence_report='compatibility/f10/disposition-ledger/evidence/native-date-admission-fixture.json';
entry.individual_proof={...entry.individual_proof,proof_kind:NATIVE_DATE_KIND,
 native_date_behavior:{kind:requirements.kind,case_ids:requirements.case_ids,source_members:requirements.members.map(path=>({path,sha256:hash(read(path))}))}};
// The existing fixture accepts a generic source-member shim, removed before evaluation.
// This copies the real finite native-date source population and whole checker closure.
entry.individual_proof.artifact_behavior={source_members:entry.individual_proof.native_date_behavior.source_members};
const review={...originalReview,individual_proof:structuredClone(entry.individual_proof),fixture_only:true};
const f=createFixture(root,{entry,review});delete f.entry.individual_proof.artifact_behavior;
const profiles=[['constructor',NATIVE_DATE_CONSTRUCTOR_CASE_ID,'nativeDateConstructorObservation','nativeDateConstructor',packedNativeDateConstructorCase],
 ['provider',NATIVE_DATE_PROVIDER_CASE_ID,'nativeDateProviderObservation','nativeDateProvider',packedNativeDateProviderCase]];
const selected=id=>f.observation.cases.find(row=>row.case_id===id);
function assign(kind,value){const profile=profiles.find(row=>row[0]===kind);Object.assign(selected(profile[1]),profile[4](value),{result:'pass',legacy_harness_passed:true});f.observation.extra.harness[profile[2]]=structuredClone(value);}
f.observation.extra.harness.ok=true;
for(const [kind,,field,legacy]of profiles){assign(kind,sample[kind]);f.observation.extra.harness[legacy]=true;}
f.save();
const targets=[f.entry,f.request,f.run,f.report,f.observation],originals=targets.map(value=>structuredClone(value));
function reset(write=true){for(const [index,target]of targets.entries()){for(const key of Object.keys(target))delete target[key];Object.assign(target,structuredClone(originals[index]));}if(write)f.save();}
const check=()=>validateNativeDate({root:f.root,entry:f.entry,proof:f.entry.individual_proof,request:f.request});
let helpers=0,semantics=0,cliCases=0,sourceCases=0;
function negative(name,mutate,pattern=/./,save=true){reset();mutate();if(save)f.save();const result=check();assert.equal(result.ok,false,name);assert.match(result.detail,pattern,name);helpers++;}
try{
 assert.equal(check().ok,true,JSON.stringify(check()));helpers++;
 const prerequisite=validatePackedConsumerRun({root:f.root,request:f.request});assert.equal(prerequisite.ok,true);
 const source=ts.createSourceFile('guard.mjs',read('scripts/upstream-native-date-evidence.mjs').toString(),ts.ScriptTarget.Latest,true);
 assert.equal(source.parseDiagnostics.length,0);
 const executable=source.statements.filter(node=>!ts.isImportDeclaration(node)).map(node=>node.getText(source).replace(/^export /,'')).join('\n');
 const cache=new Map(requirements.members.map(path=>[path,readEvidenceMember(f.root,path)]));
 // Reuse the checked full packed prerequisite while changing only its observations.
 // The complete real run/path/hash validator is exercised separately below and by CLI.
 const cached=new Function('createHash','isDeepStrictEqual','readEvidenceMember','validatePackedConsumerRun',
  'NATIVE_DATE_CONSTRUCTOR_CASE_ID','NATIVE_DATE_PROVIDER_CASE_ID','packedNativeDateConstructorCase','packedNativeDateProviderCase',
  executable+'\nreturn validateNativeDate;')(createHash,isDeepStrictEqual,(_root,path)=>{assert.ok(cache.has(path));return cache.get(path);},
  ()=>({...prerequisite,observation:f.observation}),NATIVE_DATE_CONSTRUCTOR_CASE_ID,NATIVE_DATE_PROVIDER_CASE_ID,packedNativeDateConstructorCase,packedNativeDateProviderCase);
 const cachedCheck=()=>cached({root:f.root,entry:f.entry,proof:f.entry.individual_proof,request:f.request});
 assert.equal(cachedCheck().ok,true);
 function leaves(value,path=[]){return value!==null&&typeof value==='object'?Object.entries(value).flatMap(([key,child])=>leaves(child,[...path,key])):[path];}
 for(const [kind,id,field,legacy]of profiles){
  for(const value of [undefined,null,true,[],{},'pass']){reset(false);assign(kind,value);assert.equal(cachedCheck().ok,false);semantics++;}
  for(const leaf of leaves(sample[kind]))for(const remove of [false,true]){
   reset(false);const value=structuredClone(sample[kind]),parent=leaf.slice(0,-1).reduce((o,key)=>o[key],value),key=leaf.at(-1),old=parent[key];
   if(remove)delete parent[key];else parent[key]=typeof old==='boolean'?!old:typeof old==='number'?old+1:old===null?'failure':old+'-changed';
   assign(kind,value);assert.equal(selected(id).result,'pass');assert.equal(cachedCheck().ok,false,kind+':'+leaf.join('.'));semantics++;
  }
  for(const bad of [false,undefined,0,1,'true']){
   reset(false);f.observation.extra.harness[legacy]=bad;assert.equal(cachedCheck().ok,false);semantics++;
   reset(false);selected(id).legacy_harness_passed=bad;assert.equal(cachedCheck().ok,false);semantics++;
  }
 }
 for(const scopes of [[],sample.provider.scopes.slice(1),[...sample.provider.scopes].reverse(),[...sample.provider.scopes,sample.provider.scopes[0]]]){
  reset(false);assign('provider',{...sample.provider,scopes});assert.equal(cachedCheck().ok,false);semantics++;
 }
 negative('raw-constructor-mismatch',()=>{f.observation.extra.harness.nativeDateConstructorObservation.direct.small_year[0]=8;},/constructor\/provider/);
 negative('raw-provider-mismatch',()=>{f.observation.extra.harness.nativeDateProviderObservation.scopes.reverse();},/constructor\/provider/);
 negative('harness-not-successful',()=>{f.observation.extra.harness.ok=false;},/successful native date/);
 negative('partial-packed',()=>{f.report.coverage='slice';},/packed result/);
 negative('failed-child',()=>{f.request.packedConsumerExecution.exit_code=7;},/packed invocation/);
 negative('missing-child',()=>{delete f.request.packedConsumerExecution;},/packed invocation/);
 negative('foreign-child',()=>{f.request.packedConsumerExecution.invocation_id='foreign';},/report subject/);
 negative('missing-case',()=>{f.observation.cases=f.observation.cases.filter(row=>row.case_id!==NATIVE_DATE_PROVIDER_CASE_ID);},/observed cases/);
 negative('failed-case',()=>{selected(NATIVE_DATE_CONSTRUCTOR_CASE_ID).result='fail';},/observed cases/);
 negative('marker-only',()=>{assign('constructor',null);},/constructor\/provider/);
 negative('renamed-kind',()=>{f.entry.individual_proof.proof_kind='ordinary-review';},/unregistered/);
 negative('legacy-job-only',()=>{f.entry.individual_proof.proof_kind='source-and-executed-packed-constructor-provider';delete f.entry.individual_proof.native_date_behavior;},/unregistered/);
 negative('relabel',()=>{f.entry.final_disposition='irrelevant';},/unregistered/);
 negative('wrong-patch',()=>{f.entry.individual_proof.diff_sha256='0'.repeat(64);},/unregistered/);
 negative('foreign-sha',()=>{f.entry.sha='a'.repeat(40);},/unregistered/);
 negative('wrong-branch',()=>{f.entry.individual_proof.affected_branches=[f.line==='main'?'21.x':'main'];},/source branch/);
 negative('both-branches',()=>{f.entry.individual_proof.affected_branches=['main','21.x'];},/source branch/);
 negative('wrong-scope',()=>{f.entry.individual_proof.native_date_behavior.kind='unrelated';},/scope/);
 negative('wrong-cases',()=>{f.entry.individual_proof.native_date_behavior.case_ids.reverse();},/scope/);
 negative('missing-source',()=>{f.entry.individual_proof.native_date_behavior.source_members.pop();},/source scope/);
 negative('duplicate-source',()=>{f.entry.individual_proof.native_date_behavior.source_members[0]=f.entry.individual_proof.native_date_behavior.source_members[1];},/source scope/);
 negative('stale-source',()=>{f.entry.individual_proof.native_date_behavior.source_members[0].sha256='0'.repeat(64);},/stale native date/);
 negative('foreign-run',()=>{f.request.runId='foreign';},/run binding/);
 negative('foreign-library',()=>{f.report.artifacts.library.sha256='0'.repeat(64);},/packed result/);
 negative('tampered-output',()=>{f.runPut(f.relative,'{}');},/bytes\/hash/,false);
 reset();assert.equal(validateNativeDate({root:f.root,entry:f.entry,proof:f.entry.individual_proof}).ok,false);helpers++;
 for(const [path,pattern]of [
  ['projects/ngx-material-legacy/legacy-core/internal/datetime/native-date-adapter.ts',/algorithm or constructor/],
  ['reference/material-16.2.14/datetime/native-date-adapter.ts',/changed original native date source/],
 ]){
  reset();const file=join(f.root,path),before=readFileSync(file),changed=Buffer.concat([before,Buffer.from('\n')]);
  try{writeFileSync(file,changed);f.entry.individual_proof.native_date_behavior.source_members.find(row=>row.path===path).sha256=hash(changed);
   const result=check();assert.equal(result.ok,false);assert.match(result.detail,pattern);sourceCases++;
  }finally{writeFileSync(file,before);}
 }
 reset();const output=join(f.runDir,f.relative);renameSync(output,output+'.saved');symlinkSync(output+'.saved',output);
 try{assert.match(check().detail,/symlink/);helpers++;}finally{unlinkSync(output);renameSync(output+'.saved',output);}
 reset();const owned=join(f.root,'projects/ngx-material-legacy/legacy-core/internal/datetime/native-date-adapter.ts');renameSync(owned,owned+'.saved');symlinkSync(owned+'.saved',owned);
 try{assert.match(check().detail,/symlink/);sourceCases++;}finally{unlinkSync(owned);renameSync(owned+'.saved',owned);}
 const out=join(f.runDir,'evidence/upstream-audit-disposition/synthetic-upstream');mkdirSync(out,{recursive:true});
 const environment=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('RC_')));
 const cliResults=[];
 function cli(name,mutate,expected){
  reset();mutate?.();f.save();f.runPut('seed.json',{commits:[{sha:NATIVE_DATE_SHA}],fixture_only:true});f.runPut('ledger.json',{entries:[f.entry],g11_claim:'not-passed',fixture_only:true});
  const reportPath=join(f.runDir,name+'.json'),env={...environment,RC_CHECK_ID:'upstream-audit-disposition',RC_RUN_ID:f.request.runId,RC_INVOCATION_ID:'synthetic-upstream',
   RC_EVIDENCE_BINDING:JSON.stringify(f.request.binding),RC_ASSERTION_OUTPUT_DIR:out,RC_UPSTREAM_PACKED_CONSUMER:JSON.stringify(f.request.packedConsumerExecution??null)};
  const child=spawnSync(process.execPath,[join(f.root,'scripts/check-upstream-audit-disposition.mjs'),'--admission','--line',f.line,'--seed',join(f.runDir,'seed.json'),'--ledger',join(f.runDir,'ledger.json'),
   '--symbols',join(f.root,'symbols.json'),'--current-symbols',join(f.root,'current.json'),'--report',reportPath],{cwd:f.root,env,encoding:'utf8',timeout:30000});
  assert.ok([0,1].includes(child.status),child.stderr);const result=JSON.parse(readFileSync(reportPath));
  assert.equal(child.status===0,expected,name+':'+child.stderr+JSON.stringify(result.artifact_behavior_evidence));
  assert.equal(result.g11_claim,'not-passed');assert.equal(result.authored_use_review_evidence.insufficient,0);
  if(expected){assert.equal(result.artifact_behavior_evidence.length,1);assert.equal(result.artifact_behavior_evidence[0].sha,NATIVE_DATE_SHA);assert.equal(result.artifact_behavior_evidence[0].ok,true);
   const saved=JSON.parse(readFileSync(join(out,'disposition-observations.json')));assert.deepEqual(saved.artifact_behavior_evidence,result.artifact_behavior_evidence);}
  else assert.ok(result.insufficient_review_sha_ids.sensitive.includes(NATIVE_DATE_SHA),name);
  cliResults.push({name,admitted:expected});cliCases++;
 }
 cli('complete',null,true);
 cli('failed-child',()=>{f.request.packedConsumerExecution.exit_code=8;},false);
 cli('missing-child',()=>{delete f.request.packedConsumerExecution;},false);
 cli('renamed-kind',()=>{f.entry.individual_proof.proof_kind='ordinary-review';},false);
 cli('legacy-job-only',()=>{f.entry.individual_proof.proof_kind='source-and-executed-packed-constructor-provider';delete f.entry.individual_proof.native_date_behavior;},false);
 cli('relabeled-irrelevant',()=>{f.entry.final_disposition='irrelevant';f.entry.bucket='docs-only';f.entry.subject='Synthetic documentation';f.entry.individual_proof.proof_kind='ordinary-review';delete f.entry.individual_proof.native_date_behavior;},false);
 cli('coherent-constructor-defect',()=>{const value=structuredClone(sample.constructor);value.direct.deserialized_utc[2]=28;assign('constructor',value);},false);
 cli('coherent-provider-defect',()=>{const value=structuredClone(sample.provider);value.scopes[1].formats='foreign';assign('provider',value);},false);
 cli('raw-selected-mismatch',()=>{f.observation.extra.harness.nativeDateProviderObservation.scopes.reverse();},false);
 cli('original-boolean-false',()=>{f.observation.extra.harness.nativeDateConstructor=false;},false);
 cli('legacy-case-flag-false',()=>{selected(NATIVE_DATE_PROVIDER_CASE_ID).legacy_harness_passed=false;},false);
 cli('full-marker',()=>{assign('constructor',null);assign('provider',null);},false);
 cli('missing-case',()=>{f.observation.cases=f.observation.cases.filter(row=>row.case_id!==NATIVE_DATE_PROVIDER_CASE_ID);},false);
 cli('foreign-library',()=>{f.report.artifacts.library.sha256='0'.repeat(64);},false);
 cli('missing-source',()=>{f.entry.individual_proof.native_date_behavior.source_members.pop();},false);
 cli('foreign-branch',()=>{f.entry.individual_proof.affected_branches=[f.line==='main'?'21.x':'main'];},false);
 const report={schema_version:1,line:f.line,subjects:1,full_packed_roster:106,helper_controls:helpers,cached_actual_reader_semantic_controls:semantics,
  current_original_source_or_path_corruptions_rejected:sourceCases,actual_CLI_controls:cliCases,CLI_cases:cliResults,
  registered_SHA_cannot_be_relabelled_away:true,source_or_runtime_dispositions_changed:false,prerequisite_and_runtime_results_synthetic:true,
  actual_Angular_DI_or_artifact_factory_executed:false,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(report));
}finally{f.dispose();}
