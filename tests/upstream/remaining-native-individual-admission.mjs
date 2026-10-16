/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real three source judgments through the actual root CLI with synthetic runtime I/O. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFixture,hash} from './artifact-behavior-fixture.mjs';
import {writeSyntheticBrowserRun} from './browser-run-fixture.mjs';
import {writeSyntheticNativeMotionRun} from './native-motion-run-fixture.mjs';
import {writeSyntheticRippleBrowserRun} from './ripple-replay-fixture.mjs';
import {formFieldHoverSample} from '../form_field_hover_sample.mjs';
import {tabCompletionMotionSample} from '../tab_completion_sample.mjs';
import {samplePass} from '../../scripts/native-motion-roster.mjs';
import {inspectNativeIndividualSourceJudgments} from '../../scripts/remaining-native-individual-source-judgments.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),read=path=>readFileSync(join(root,path));
const source=inspectNativeIndividualSourceJudgments({root}),line=source.line,cases=[];
const environment=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('RC_')));
for(const [index,entry]of source.entries.entries()){
 const subject=['hover','tabs','ripple'][index],field=['form_field_hover_behavior','tab_completion_behavior','ripple_replay_behavior'][index];
 const review=JSON.parse(source.writes.get(entry.evidence_report)),adapter=structuredClone(entry);
 adapter.individual_proof.artifact_behavior={source_members:entry.individual_proof[field].source_members};
 const f=createFixture(root,{entry:adapter,review});delete f.entry.individual_proof.artifact_behavior;
 assert.deepEqual(f.entry,entry,'runtime fixture changed real source decision or proof');
 assert.deepEqual(JSON.parse(readFileSync(join(f.root,entry.evidence_report))),review);
 try{
  const native=subject==='tabs'?await writeSyntheticNativeMotionRun(root,f,id=>{
   const parts=id.split('/');return parts[5]==='tabs'&&parts[4]!=='interruption-destruction'?tabCompletionMotionSample(parts.at(-1)):samplePass(id);
  }):subject==='hover'?await writeSyntheticBrowserRun(root,f,()=>({peer_form_hover:formFieldHoverSample(),progress_csp:{compiled_css_sha256:'c'.repeat(64)}})):
   await writeSyntheticRippleBrowserRun(root,f);
  const targets=[f.entry,f.request,f.run,f.report,f.observation,native.report,native.observation],originals=targets.map(row=>structuredClone(row));
  const output=join(f.runDir,'evidence/upstream-audit-disposition/synthetic-individual');mkdirSync(output,{recursive:true});
  const capture=subject==='tabs'?'nativeMotionExecution':'browserExecution';
  function cli(name,mutate,expected){
   for(const [n,target]of targets.entries()){for(const key of Object.keys(target))delete target[key];Object.assign(target,structuredClone(originals[n]));}
   mutate?.();native.save();f.runPut('seed.json',{commits:[{sha:entry.sha}],fixture_only:true});
   f.runPut('ledger.json',{entries:[f.entry],fixture_only:true,g11_claim:'not-passed'});
   const reportPath=join(f.runDir,name+'.json');
   const child=spawnSync(process.execPath,[join(f.root,'scripts/check-upstream-audit-disposition.mjs'),'--admission','--line',line,
    '--seed',join(f.runDir,'seed.json'),'--ledger',join(f.runDir,'ledger.json'),'--symbols',join(f.root,'symbols.json'),
    '--current-symbols',join(f.root,'current.json'),'--report',reportPath],{cwd:f.root,encoding:'utf8',timeout:30000,
    env:{...environment,RC_CHECK_ID:'upstream-audit-disposition',RC_RUN_ID:f.request.runId,RC_INVOCATION_ID:'synthetic-individual',
     RC_EVIDENCE_BINDING:JSON.stringify(f.request.binding),RC_ASSERTION_OUTPUT_DIR:output,
     RC_UPSTREAM_PACKED_CONSUMER:JSON.stringify(f.request.packedConsumerExecution??null),
     RC_UPSTREAM_BROWSER_MATRIX:JSON.stringify(f.request.browserExecution??null),RC_UPSTREAM_NATIVE_MOTION:JSON.stringify(f.request.nativeMotionExecution??null)}});
   assert.ok([0,1].includes(child.status),subject+'/'+name+child.stderr+String(child.error||''));
   const observed=JSON.parse(readFileSync(reportPath));
   assert.equal(child.status===0,expected,subject+'/'+name+child.stderr+JSON.stringify(observed.artifact_behavior_evidence));
   assert.equal(observed.g11_claim,'not-passed');assert.equal(observed.authored_use_review_evidence.insufficient,0);
   const evidence=observed.artifact_behavior_evidence.find(row=>row.sha===entry.sha);assert.ok(evidence);
   assert.equal(evidence.ok,expected,subject+'/'+name+JSON.stringify(evidence));
   cases.push({sha:entry.sha,subject,name,result:'pass',expected_admission:expected,detail:evidence.detail,synthetic_runtime_only:true});
  }
  cli('complete-bound-synthetic-runtime',null,true);
  cli('source-judgment-alone',()=>{delete f.request[capture];},false);
  cli('missing-packed',()=>{delete f.request.packedConsumerExecution;},false);
  cli('stale-reviewed-source',()=>{f.entry.individual_proof[field].source_members[0].sha256='0'.repeat(64);},false);
  cli('renamed-proof',()=>{f.entry.individual_proof.proof_kind='ordinary-source-review';},false);
  cli('rehashed-raw-native-failure',()=>{
   if(subject==='hover')native.observation.closeout_diagnostics.zoneful.observation.peer_form_hover.state_token_scenarios[0].hint.opacity='0';
   else if(subject==='tabs')for(const row of native.observation.cases){if(row.case_id.includes('/tabs/')&&row.case_id.endsWith('/enabled'))row.observation.native_transition.trusted_events=[];}
   else native.observation.hydration_replay.results[0].public_peer_replay.replayed.creations.push({phase:'replay'});
  },false);
  if(subject==='ripple'&&line==='21.x')cli('false-inherited-peer-fix',()=>{f.entry.final_disposition='inherited';},false);
 }finally{f.dispose();}
}
const report={schema_version:1,line,actual_root_cli_controls:cases.length,cases,real_source_judgments_preserved:true,
 scope:'Actual root CLI and real current source judgments; every runtime/packed/advisory input is synthetic and admits no product or floor.',
 source_proof_sha256:hash(source.writes.get('compatibility/rc/remaining-native-admission-individual-source-proof.json')),
 root_sha256:hash(read('scripts/check-upstream-audit-disposition.mjs')),producer_sha256:hash(read('tests/upstream/remaining-native-individual-admission.mjs')),
 actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,cases:undefined}));
