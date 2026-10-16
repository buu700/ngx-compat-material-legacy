/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual writer/validators with synthetic observations; no browser or package execution. */
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {deriveHistoricalRoster,rejectionReasons,discoveryNegativeResults,isRunnerControl} from '../scripts/historical-case-roster.mjs';
import {HISTORICAL_BEHAVIOR_KIND,HISTORICAL_BEHAVIOR_SHAS,historicalBehaviorRequirements,historicalRegressionRequirements,validateHistoricalBehavior} from '../scripts/upstream-historical-behavior-evidence.mjs';
import {inspectHistoricalRosterReconciliation,REQUIRED_REGRESSIONS} from '../scripts/historical-roster-reconciliation.mjs';
import {createFixture,hash} from './upstream/artifact-behavior-fixture.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=member=>fs.readFileSync(path.join(root,member));
const ts=createRequire(import.meta.url)('typescript'),model=inspectHistoricalRosterReconciliation({root}),controls=[];
assert.deepEqual(historicalRegressionRequirements(),REQUIRED_REGRESSIONS);
const detached=historicalRegressionRequirements();detached[0].case_id='unreviewed';assert.deepEqual(historicalRegressionRequirements(),REQUIRED_REGRESSIONS);
const producer=read('scripts/rc-test-legacy-family.mjs').toString(),source=ts.createSourceFile('writer.mjs',producer,ts.ScriptTarget.Latest,true);
const writerBody=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='writeAcceptance').getText(source),roster=deriveHistoricalRoster(root);
assert.equal(roster.ids.length+roster.discovery_negative_ids.length,2228);
let positives=0;
for(const sha of HISTORICAL_BEHAVIOR_SHAS){
 const definition=historicalBehaviorRequirements(sha),registration=model.prior.selected.find(n=>n.sha===sha),members=definition.members.map(member=>({path:member,sha256:hash(read(member))}));
 const original=JSON.parse(read('compatibility/rc/historical-behavior-admission-inputs.json')).original_patches.find(n=>n.sha===sha);
 const reviewPath='compatibility/rc/synthetic-roster-review.json',note='Synthetic current-protocol fixture only; no original source judgment, actual product/browser/native artifact, peer floor or release admission.';
 const f=createFixture(root,{review:{sha,status:'reviewed',final_disposition:'already-adapted',patch_file:original.path,diff_sha256:definition.patch,fixture_only:true},
  entry:{sha,subject:'Synthetic historical roster contract',bucket:'behavior-semantic',final_disposition:'already-adapted',evidence_report:reviewPath,fixture_only:true,
   individual_proof:{proof_kind:HISTORICAL_BEHAVIOR_KIND,diff_sha256:definition.patch,review_depth:'individual-compatibility',affected_branches:[model.line],decision:note,artifact_behavior:{source_members:members}}}});
 delete f.proof.artifact_behavior;f.proof.historical_behavior={kind:definition.kind,case_ids:definition.cases.map(n=>n.case_id),source_members:members};
 f.request.historicalExecution={run_id:f.run.run_id,invocation_id:'synthetic-roster',exit_code:0};
 const relative='evidence/historical-legacy-artifact/synthetic-roster/historical-observations.json',outputDir=path.join(f.runDir,'evidence/historical-legacy-artifact/synthetic-roster');fs.mkdirSync(outputDir,{recursive:true});
 const writer=new Function('fs','path','root','runPath','rejectionReasons','discoveryNegativeResults','isRunnerControl','cryptoSha','console',writerBody+';return writeAcceptance;')(fs,path,f.root,path.join(f.runDir,'run.json'),rejectionReasons,discoveryNegativeResults,isRunnerControl,hash,{log(){},error(){}});
 assert.equal(writer({...f.request,invocation:'synthetic-roster',outputDir},roster,{subject_mode:'artifact',artifact_sha256:f.library.sha256,
  totals:{executed:roster.cases.filter(n=>n.kind!=='shared-export').length},mapped_specs:roster.paths.map(historical_path=>({historical_path})),
  specs:roster.cases.filter(n=>n.kind!=='shared-export').map(n=>({full_name:n.full_name,success:true,skipped:false}))},f.library),true);
 const report=JSON.parse(fs.readFileSync(path.join(f.runDir,'reports/historical-legacy-artifact.json'))),native=JSON.parse(fs.readFileSync(path.join(f.runDir,relative)));
 const targets=[f.request,f.report,f.observation,report,native],originals=targets.map(n=>structuredClone(n));
 const save=()=>{f.save();f.runPut(relative,native);const bytes=fs.readFileSync(path.join(f.runDir,relative));report.outputs=[{path:relative,sha256:hash(bytes),bytes:bytes.length}];f.runPut('reports/historical-legacy-artifact.json',report);};
 const reset=()=>{for(const[i,target]of targets.entries()){for(const key of Object.keys(target))delete target[key];Object.assign(target,structuredClone(originals[i]));}save();};
 const check=()=>validateHistoricalBehavior({root:f.root,entry:f.entry,proof:f.proof,request:f.request});
 const negative=(id,mutate,pattern)=>{reset();assert.equal(check().ok,true,'baseline '+id);mutate();save();const result=check();assert.equal(result.ok,false,id);assert.match(result.detail,pattern);controls.push({sha,id,detail:result.detail,fixture_only:true});};
 try{
  reset();const accepted=check();assert.equal(accepted.ok,true);assert.deepEqual(accepted.required_cases,registration.definition.cases.map(n=>n.case_id));assert.deepEqual(accepted.retained_regression_cases,REQUIRED_REGRESSIONS.map(n=>n.case_id));positives++;
  negative('original-named-requirement-retained',()=>{native.cases.find(n=>n.case_id===definition.cases[0].case_id).executed_full_name='unrelated';},/test identity/);
  for(const required of REQUIRED_REGRESSIONS){
   for(const field of ['full_name','executed_full_name','candidate','historical_path'])negative(required.case_id+'-'+field,()=>{native.cases.find(n=>n.case_id===required.case_id)[field]='unrelated';},/test identity/);
   negative(required.case_id+'-missing-observation',()=>{native.cases=native.cases.filter(n=>n.case_id!==required.case_id);},/observed cases/);
  }
  for(const field of ['expected_case_ids','discovered_case_ids','executed_case_ids','passed_case_ids'])negative('new-required-id-'+field,()=>{report[field]=report[field].filter(id=>id!==REQUIRED_REGRESSIONS[0].case_id);},/incomplete/);
  negative('self-consistent-obsolete2225-report-rejected',()=>{
   const additions=new Set(REQUIRED_REGRESSIONS.map(n=>n.case_id));for(const field of ['expected_case_ids','discovered_case_ids','executed_case_ids','passed_case_ids'])report[field]=report[field].filter(id=>!additions.has(id));
   report.case_results=report.case_results.filter(n=>!additions.has(n.case_id));report.passed=2225;native.cases=native.cases.filter(n=>!additions.has(n.case_id));
  },/incomplete/);
  negative('native-coordinator-required',()=>{delete f.request.historicalExecution;},/coordinator-observed historical/);
  negative('packed-coordinator-required',()=>{f.request.packedConsumerExecution.exit_code=8;},/coordinator-observed packed/);
 }finally{f.dispose();}
}
const scopes=[];
for(const[id,member,mutate]of [
 ['old-matrix','compatibility/rc/matrices/full-verify.json',()=>Buffer.from(model.prior.captured_members.find(n=>n.path.endsWith('full-verify.json')).text)],
 ['old-validator','scripts/upstream-historical-behavior-evidence.mjs',()=>Buffer.from(model.prior.captured_members.find(n=>n.path==='scripts/upstream-historical-behavior-evidence.mjs').text)],
 ['weakened-native-count','scripts/upstream-historical-behavior-evidence.mjs',bytes=>Buffer.from(bytes.toString().replace('requiredCaseCount = 2228','requiredCaseCount = 2225'))],
 ['unrelated-gate-change','compatibility/rc/matrices/full-verify.json',bytes=>{const matrix=JSON.parse(bytes);matrix.checks[0].check_id+='-unreviewed';return Buffer.from(JSON.stringify(matrix));}],
 ['changed-regression-source',REQUIRED_REGRESSIONS[0].candidate,bytes=>Buffer.concat([bytes,Buffer.from('\n')])],
 ['changed-original-evidence',model.prior.selected[0].review.path,bytes=>Buffer.concat([bytes,Buffer.from('\n')])],
 ['changed-owned-verdict','compatibility/f10/disposition-ledger/ledger.json',bytes=>{const ledger=JSON.parse(bytes);ledger.entries.find(n=>n.sha===model.prior.selected[0].sha).final_disposition='unreviewed-native-verdict';return Buffer.from(JSON.stringify(ledger));}],
]){
 assert.throws(()=>inspectHistoricalRosterReconciliation({root,readMember:path=>path===member?mutate(read(path)):read(path)}),undefined,id);scopes.push({id,result:'rejected'});
}
const result={schema_version:1,line:model.line,positive_current_writer_validator_controls:positives,native_protocol_rejection_controls:controls.length,source_scope_rejection_controls:scopes.length,
 required_full_historical_ids:2228,original_component_ids_preserved:2220,discovery_controls_preserved:5,original_named_native_cases_preserved:7,new_required_regression_cases:3,
 native20_original_definitions_preserved:true,all20_proposed_bindings_missing_coordinator_run:true,owned_product_members:1141,current_owned_case_bodies:2223,required_consumer_CSS_SCSS_changes:0,
 controls,source_controls:scopes,fixture_only:true,producer_sha256:hash(read('tests/historical_roster_reconciliation_probe.mjs')),actual_native_browser_library_or_floor_execution:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)fs.writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,controls:undefined,source_controls:undefined}));
