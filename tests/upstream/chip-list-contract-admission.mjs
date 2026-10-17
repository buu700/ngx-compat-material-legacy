/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic assertion files exercise real admission; they are never product execution evidence. */
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {deriveHistoricalRoster,rejectionReasons,discoveryNegativeResults,isRunnerControl} from '../../scripts/historical-case-roster.mjs';
import {HISTORICAL_BEHAVIOR_KIND,historicalBehaviorRequirements,requiresHistoricalBehavior,validateHistoricalBehavior} from '../../scripts/upstream-historical-behavior-evidence.mjs';
import {CHIP_LIST_SHAS,CHIP_LIST_SOURCE,readChipListPrior} from '../../scripts/chip-list-focus-contract.mjs';
import {createFixture,hash} from './artifact-behavior-fixture.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),read=p=>fs.readFileSync(path.join(root,p));
const ts=createRequire(import.meta.url)('typescript'),prior=readChipListPrior(root),line=prior.line,roster=deriveHistoricalRoster(root);
assert.equal(roster.ids.length+roster.discovery_negative_ids.length,2232);
const producer=read('scripts/rc-test-legacy-family.mjs').toString(),sf=ts.createSourceFile('writer.mjs',producer,ts.ScriptTarget.Latest,true);
const writerBody=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='writeAcceptance').getText(sf);
const reviewBody=JSON.parse(read('compatibility/f10/disposition-ledger/evidence/closeout-chip-list-contract-review.json'));
let helpers=0,cliCount=0;const observations=[];
for(const [subjectIndex,sha]of CHIP_LIST_SHAS.entries()){
 const definition=historicalBehaviorRequirements(sha),review=reviewBody.reviews.find(r=>r.sha===sha),members=definition.members.map(p=>({path:p,sha256:hash(read(p))}));
 assert.ok(requiresHistoricalBehavior({sha},{}));assert.equal(definition.required_disposition,subjectIndex===2?'already-adapted':'do-not-adopt');
 for(const expected of definition.cases){const selected=roster.cases.find(r=>r.case_id===expected.case_id);for(const [key,value]of Object.entries(expected))assert.equal(selected?.[key],value);}
 const reviewPath='compatibility/rc/synthetic-classic-chip-review.json',note='Synthetic admission fixture only, with synthetic passing assertion records. No actual source decision, product execution, packed artifact, browser, peer minimum or release gate is qualified.';
 const f=createFixture(root,{review:{sha,status:'reviewed',final_disposition:definition.required_disposition,patch_file:review.patch_file,diff_sha256:definition.patch,fixture_only:true},
  entry:{sha,subject:'Synthetic classic chip-list behavior subject',bucket:'behavior-semantic',final_disposition:definition.required_disposition,evidence_report:reviewPath,fixture_only:true,
   individual_proof:{proof_kind:HISTORICAL_BEHAVIOR_KIND,diff_sha256:definition.patch,review_depth:'individual-compatibility',affected_branches:[line],decision:note,artifact_behavior:{source_members:members}}}});
 delete f.proof.artifact_behavior;
 f.proof.historical_behavior={kind:definition.kind,case_ids:definition.cases.map(r=>r.case_id),source_members:members};
 f.request.historicalExecution={run_id:f.run.run_id,invocation_id:'synthetic-classic-chip',exit_code:0};
 const relative='evidence/historical-legacy-artifact/synthetic-classic-chip/historical-observations.json',outputDir=path.join(f.runDir,path.dirname(relative));fs.mkdirSync(outputDir,{recursive:true});
 const writer=new Function('fs','path','root','runPath','rejectionReasons','discoveryNegativeResults','isRunnerControl','cryptoSha','console',writerBody+';return writeAcceptance;')(fs,path,f.root,path.join(f.runDir,'run.json'),rejectionReasons,discoveryNegativeResults,isRunnerControl,hash,{log(){},error(){}});
 assert.equal(writer({...f.request,invocation:'synthetic-classic-chip',outputDir},roster,{subject_mode:'artifact',artifact_sha256:f.library.sha256,totals:{executed:roster.cases.filter(r=>r.kind!=='shared-export').length},mapped_specs:roster.paths.map(historical_path=>({historical_path})),specs:roster.cases.filter(r=>r.kind!=='shared-export').map(r=>({full_name:r.full_name,success:true,skipped:false}))},f.library),true);
 const report=JSON.parse(fs.readFileSync(path.join(f.runDir,'reports/historical-legacy-artifact.json'))),native=JSON.parse(fs.readFileSync(path.join(f.runDir,relative)));
 const targets=[f.entry,f.request,f.run,f.report,f.observation,report,native],originals=targets.map(x=>structuredClone(x));
 function save(){f.save();f.runPut(relative,native);const bytes=fs.readFileSync(path.join(f.runDir,relative));report.outputs=[{path:relative,sha256:hash(bytes),bytes:bytes.length}];f.runPut('reports/historical-legacy-artifact.json',report);}
 function reset(){for(const [i,target]of targets.entries()){for(const key of Object.keys(target))delete target[key];Object.assign(target,structuredClone(originals[i]));}save();}
 const check=()=>validateHistoricalBehavior({root:f.root,entry:f.entry,proof:f.entry.individual_proof,request:f.request});
 const selected=()=>native.cases.find(r=>r.case_id===definition.cases[0].case_id);
 function reject(name,mutate,pattern){reset();assert.equal(check().ok,true,'baseline '+name);mutate();save();const result=check();assert.equal(result.ok,false,name);assert.match(result.detail,pattern,name);helpers++;observations.push({sha,name,detail:result.detail,fixture_only:true});}
 try{
  reset();assert.equal(check().ok,true);helpers++;
  reject('foreign-proof-kind',()=>f.entry.individual_proof.proof_kind='source-reviewed',/unregistered/);
  reject('relabeled-disposition',()=>f.entry.final_disposition='irrelevant',/disposition/);
  reject('missing-named-case',()=>f.entry.individual_proof.historical_behavior.case_ids.pop(),/scope/);
  reject('wrong-executed-name',()=>selected().executed_full_name='different passing assertion',/test identity/);
  reject('wrong-native-candidate',()=>selected().candidate='projects/foreign.spec.ts',/test identity/);
  reject('missing-native',()=>delete f.request.historicalExecution,/coordinator-observed historical/);
  reject('failed-native',()=>f.request.historicalExecution.exit_code=1,/coordinator-observed historical/);
  reject('partial-native',()=>report.coverage='slice',/historical result/);
  reject('missing-full-roster-case',()=>report.passed_case_ids.pop(),/incomplete historical/);
  reject('incomplete-packed-prerequisite',()=>f.report.passed_case_ids.pop(),/incomplete/);
  reject('stale-source-member',()=>f.entry.individual_proof.historical_behavior.source_members[0].sha256='0'.repeat(64),/stale historical source/);
  if(subjectIndex===0){
   reset();const own=fs.readFileSync(path.join(f.root,CHIP_LIST_SOURCE));
   const wrong=own.toString().replace('this._keyManager.setFirstItemActive();','this._keyManager.activeItem?.focus();');assert.notEqual(wrong,own.toString());
   f.repoPut(CHIP_LIST_SOURCE,wrong);f.entry.individual_proof.historical_behavior.source_members.find(r=>r.path===CHIP_LIST_SOURCE).sha256=hash(wrong);
   assert.match(check().detail,/classic focus differs/);helpers++;observations.push({sha,name:'rehashed-active-retention-source',fixture_only:true});f.repoPut(CHIP_LIST_SOURCE,own);
  }
  function cli(name,mutate,expectedSensitive){
   reset();mutate?.();save();f.runPut('seed.json',{commits:[{sha}],fixture_only:true});f.runPut('ledger.json',{g11_claim:'not-passed',entries:[f.entry],fixture_only:true});
   const reportPath=path.join(f.runDir,'cli-'+name+'.json'),invocation='synthetic-classic-upstream',assertionDir=path.join(f.runDir,'evidence/upstream-audit-disposition',invocation);fs.mkdirSync(assertionDir,{recursive:true});
   const env={...process.env};for(const key of Object.keys(env).filter(k=>k.startsWith('RC_')))delete env[key];Object.assign(env,{RC_CHECK_ID:'upstream-audit-disposition',RC_RUN_ID:f.request.runId,RC_INVOCATION_ID:invocation,RC_EVIDENCE_BINDING:JSON.stringify(f.request.binding),RC_ASSERTION_OUTPUT_DIR:assertionDir,RC_UPSTREAM_PACKED_CONSUMER:JSON.stringify(f.request.packedConsumerExecution),RC_UPSTREAM_HISTORICAL:JSON.stringify(f.request.historicalExecution??null)});
   const child=spawnSync(process.execPath,[path.join(f.root,'scripts/check-upstream-audit-disposition.mjs'),'--admission','--line',line,'--seed',path.join(f.runDir,'seed.json'),'--ledger',path.join(f.runDir,'ledger.json'),'--symbols',path.join(f.root,'symbols.json'),'--current-symbols',path.join(f.root,'current.json'),'--report',reportPath],{cwd:f.root,env,encoding:'utf8',timeout:30000});
   assert.equal(child.error,undefined,name+': '+child.stderr);assert.ok([0,1].includes(child.status),name+': '+child.stderr);
   const result=JSON.parse(fs.readFileSync(reportPath));assert.equal(result.g11_claim,'not-passed');assert.equal(result.insufficient_sensitive,expectedSensitive,name+': '+JSON.stringify(result));
   assert.equal(result.disposition_admission,expectedSensitive===0?'pass':'incomplete');cliCount++;observations.push({sha,name,actual_cli:true,fixture_only:true,exit_code:child.status});
  }
  cli('complete-synthetic-runtime',null,0);
  if(subjectIndex===0){
   cli('relabel-and-drop-proof',()=>{f.entry.final_disposition='irrelevant';delete f.entry.individual_proof;},1);
   cli('relabel-and-foreign-kind',()=>{f.entry.final_disposition='do-not-adopt';f.entry.individual_proof.proof_kind='documentation-only';},1);
   cli('relabel-and-non-JSON-evidence',()=>{f.entry.final_disposition='irrelevant';f.entry.evidence_report='scripts/chip-list-focus-contract.mjs';},1);
   cli('source-presence-cannot-substitute',()=>{f.entry.final_disposition='do-not-adopt';f.entry.individual_proof.proof_kind='diff-read';},1);
  }
 }finally{f.dispose();}
}
const output={schema_version:1,line,subjects:3,full_historical_roster:2232,helper_controls:helpers,actual_CLI_controls:cliCount,observations,actual_native_browser_library_or_floor_execution:false,g11_claim:'not-passed'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...output,observations:undefined}));
