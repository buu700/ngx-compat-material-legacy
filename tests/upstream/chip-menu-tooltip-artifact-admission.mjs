/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual helper/CLI with deliberately synthetic runtime inputs, never product receipts. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectChipMenuTooltipJudgments} from '../../scripts/chip-menu-tooltip-admission-source-judgments.mjs';
import {artifactBehaviorRequirements,requiresArtifactBehavior,validateArtifactBehavior} from '../../scripts/upstream-artifact-behavior-evidence.mjs';
import {chipMenuTooltipPackedSamples as samples} from '../chip_menu_tooltip_packed_samples.mjs';
import {createFixture,hash} from './artifact-behavior-fixture.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),read=p=>readFileSync(join(root,p)),json=p=>JSON.parse(read(p));
const prefix='compatibility/rc/chip-menu-tooltip-admission-',inputs=json(prefix+'inputs.json'),result=inspectChipMenuTooltipJudgments({root});
const ledger=json('compatibility/f10/disposition-ledger/ledger.json');let recovered=read('compatibility/f10/disposition-ledger/ledger.json').toString();
const block=x=>JSON.stringify(x,null,2).split('\n').map(line=>'    '+line).join('\n');
for(const row of result.decisions){const entry=ledger.entries.find(e=>e.sha===row.sha);assert.equal(hash(read(entry.evidence_report)),row.review_sha256);
 const review=json(entry.evidence_report);assert.equal(review.status,'reviewed');assert.equal(review.judgment_stage,'source-complete-runtime-required');
 assert.equal(review.semantic_pass,false);assert.equal(review.actual_packed_or_native_executed,false);assert.equal(review.runtime_qualification.required,true);
 assert.equal(recovered.split(block(entry)).length,2);recovered=recovered.replace(block(entry),block(result.prior_entries.find(e=>e.sha===row.sha)));
 for(const member of entry.individual_proof.artifact_behavior.source_members)assert.equal(hash(read(member.path)),member.sha256);
}
assert.equal(hash(recovered),inputs.ledger_before_sha256,'unrelated ledger bytes changed');
const original=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show',inputs.source_parent+':compatibility/f10/disposition-ledger/ledger.json'],{cwd:root,maxBuffer:64*1024*1024});
assert.equal(hash(original),inputs.ledger_before_sha256);
assert.equal(result.proof.originals.reduce((n,r)=>n+r.hunks.length,0),11);
assert.equal(result.proof.historical.chip_getter_setter_and_list_forwarding_equal_to_tagged16,true);
const sourceControls=[];
for(const [name,path,mutate]of [
 ['input',prefix+'inputs.json',b=>Buffer.concat([b,Buffer.from(' ')])],
 ['prior',inputs.prior.path,b=>Buffer.concat([b,Buffer.from(' ')])],
 ['guard-edits',inputs.guard_change.path,b=>Buffer.concat([b,Buffer.from(' ')])],
 ['extended-probe-edits',inputs.probe_change.path,b=>Buffer.concat([b,Buffer.from(' ')])],
 ['packed-producer','scripts/packed-consumer-aot-smoke.mjs',b=>Buffer.concat([b,Buffer.from('\n')])],
 ['product','projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts',b=>Buffer.concat([b,Buffer.from('\n')])],
 ['original-patch',result.proof.originals[0].patch_file,b=>Buffer.concat([b,Buffer.from(' ')])],
 ['tagged-reference','reference/material-16.2.14/tooltip-render-sources/tooltip.ts',b=>Buffer.concat([b,Buffer.from('\n')])],
 ['live-ledger','compatibility/f10/disposition-ledger/ledger.json',b=>{const x=JSON.parse(b);x.entries.find(e=>e.sha===inputs.sha_ids[0]).reason+=' unreviewed';return Buffer.from(JSON.stringify(x));}],
]){
 const before=read(path),after=mutate(before);assert.notDeepEqual(after,before);
 assert.throws(()=>inspectChipMenuTooltipJudgments({root,readMember:p=>p===path?after:read(p)}),name);sourceControls.push({name,rejected:true});
}
const names=['chip','menu','tooltip'],shaIds=inputs.sha_ids.slice(3),rows=[];let helperCases=0,cliCases=0,semanticControls=0;
for(const [index,name]of names.entries()){
 const sha=shaIds[index],entry=ledger.entries.find(e=>e.sha===sha),review=json(entry.evidence_report),required=artifactBehaviorRequirements(sha);
 assert.equal(requiresArtifactBehavior(entry,{}),true);assert.deepEqual(required.case_ids,entry.individual_proof.artifact_behavior.case_ids);
 const f=createFixture(root,{entry,review});
 try{
  const id=required.case_ids[0],selected=()=>f.observation.cases.find(row=>row.case_id===id);
  selected().observation=structuredClone(samples[name]);selected().legacy_harness_passed=true;
  f.observation.extra.harness[required.harness]=structuredClone(samples[name]);f.observation.extra.harness[required.legacy_field]=true;f.save();
  const objects=[f.entry,f.request,f.run,f.report,f.observation],originals=objects.map(v=>structuredClone(v));
  const reset=()=>{objects.forEach((target,i)=>{for(const k of Object.keys(target))delete target[k];Object.assign(target,structuredClone(originals[i]));});f.save();};
  const check=()=>validateArtifactBehavior({root:f.root,entry:f.entry,proof:f.entry.individual_proof,request:f.request});
  assert.equal(check().ok,true,'baseline '+name);helperCases++;
  const negative=(label,mutate,pattern)=>{reset();mutate();f.save();const result=check();assert.equal(result.ok,false,name+': '+label);if(pattern)assert.match(result.detail,pattern);helperCases++;};
  negative('unregistered proof kind',()=>f.entry.individual_proof.proof_kind='ordinary-source-review',/unregistered/);
  negative('wrong patch',()=>f.entry.individual_proof.diff_sha256='f'.repeat(64),/unregistered/);
  negative('wrong scope',()=>f.entry.individual_proof.artifact_behavior.kind='ordinary-source-review',/scope/);
  negative('missing case',()=>f.entry.individual_proof.artifact_behavior.case_ids=[],/scope/);
  negative('broadened case',()=>f.entry.individual_proof.artifact_behavior.case_ids.push('unrelated'),/scope/);
  negative('missing source',()=>f.entry.individual_proof.artifact_behavior.source_members.pop(),/source scope/);
  negative('wrong source',()=>f.entry.individual_proof.artifact_behavior.source_members[0].sha256='f'.repeat(64),/stale reviewed/);
  negative('wrong helper source',()=>f.entry.individual_proof.artifact_behavior.source_members.find(r=>r.path==='scripts/upstream-artifact-behavior-evidence.mjs').sha256='f'.repeat(64),/stale reviewed/);
  negative('missing coordinator',()=>delete f.request.binding,/coordinator/);
  negative('failed coordinator',()=>f.request.packedConsumerExecution.exit_code=9,/coordinator/);
  negative('foreign run',()=>f.request.packedConsumerExecution.run_id='foreign',/coordinator/);
  negative('incomplete full packed coverage',()=>f.report.passed_case_ids.pop(),/incomplete/);
  for(const value of [undefined,null,false,0,1,'true']){
   negative('missing/false original harness flag',()=>f.observation.extra.harness[required.legacy_field]=value,/insufficient/);
   negative('missing/false selected original flag',()=>selected().legacy_harness_passed=value,/insufficient/);
  }
  for(const value of [undefined,null,true,[],{},'pass'])negative('marker-only observation',()=>selected().observation=value,/insufficient/);
  negative('different raw observation',()=>f.observation.extra.harness[required.harness]=null,/insufficient/);
  const set=(value,path,fn)=>{let parent=value;for(const k of path.slice(0,-1))parent=parent[k];fn(parent,path.at(-1));};
  const corrupt=(label,change)=>negative(label,()=>{const bad=structuredClone(samples[name]);change(bad);selected().observation=bad;f.observation.extra.harness[required.harness]=structuredClone(bad);},/insufficient/);
  const walk=(value,path=[])=>{
   if(Array.isArray(value)){
    corrupt('array '+path.join('.'),x=>set(x,path,(p,k)=>p[k]=p[k].slice(1)));semanticControls++;
    value.forEach((v,i)=>walk(v,[...path,i]));
   }else if(value!==null&&typeof value==='object'){
    for(const [k,v]of Object.entries(value)){corrupt('missing '+[...path,k].join('.'),x=>set(x,[...path,k],(p,k)=>delete p[k]));semanticControls++;walk(v,[...path,k]);}
   }else{corrupt('changed '+path.join('.'),x=>set(x,path,(p,k)=>p[k]=typeof value==='boolean'?!value:typeof value==='number'?value+1:typeof value==='string'?'corrupt':'unknown'));semanticControls++;}
  };
  walk(samples[name]);
  const env={...process.env,NODE_PATH:dirname(dirname(dirname(createRequire(import.meta.url).resolve('typescript'))))};
  for(const key of Object.keys(env).filter(k=>k.startsWith('RC_')))delete env[key];
  const invocation='synthetic-upstream-'+name,outputDir=join(f.runDir,'evidence/upstream-audit-disposition',invocation);mkdirSync(outputDir,{recursive:true});
  const cli=(label,mutate,pass,{withoutCoordinator=false}={})=>{
   reset();mutate?.();f.save();f.runPut('seed.json',{commits:[{sha}],fixture_only:true});f.runPut('ledger.json',{g11_claim:'not-passed',entries:[f.entry],fixture_only:true});
   const reportPath=join(f.runDir,label+'.json');
   const environment=withoutCoordinator?env:{...env,RC_CHECK_ID:'upstream-audit-disposition',RC_RUN_ID:f.request.runId,RC_INVOCATION_ID:invocation,
    RC_EVIDENCE_BINDING:JSON.stringify(f.request.binding),RC_ASSERTION_OUTPUT_DIR:outputDir,RC_UPSTREAM_PACKED_CONSUMER:JSON.stringify(f.request.packedConsumerExecution)};
   const child=spawnSync(process.execPath,[join(f.root,'scripts/check-upstream-audit-disposition.mjs'),'--admission','--line',f.line,'--seed',join(f.runDir,'seed.json'),
    '--ledger',join(f.runDir,'ledger.json'),'--symbols',join(f.root,'symbols.json'),'--current-symbols',join(f.root,'current.json'),'--report',reportPath],{cwd:f.root,env:environment,encoding:'utf8',timeout:30000});
   assert.ok([0,1].includes(child.status),label+': '+child.stderr);assert.equal(child.status,pass?0:1,name+': '+label+' '+child.stderr);
   const actual=JSON.parse(readFileSync(reportPath));assert.equal(actual.disposition_admission,pass?'pass':'incomplete',name+': '+label);assert.equal(actual.g11_claim,'not-passed');cliCases++;
  };
  cli('complete',null,true);
  cli('missing-coordinator',null,false,{withoutCoordinator:true});
  cli('renamed-kind',()=>f.entry.individual_proof.proof_kind='ordinary-source-review',false);
  cli('marker-only',()=>delete selected().observation,false);
  cli('original-harness-false',()=>f.observation.extra.harness[required.legacy_field]=false,false);
  cli('rehashed-regression',()=>{const bad=structuredClone(samples[name]);
   if(name==='chip')bad.phases[2].individual_disabled=false;
   else if(name==='menu')bad.phases[6].destroyed=0;
   else bad.cycles[1].shown.same_eager_container=false;
   selected().observation=bad;f.observation.extra.harness[required.harness]=structuredClone(bad);
  },false);
  cli('raw-mismatch',()=>f.observation.extra.harness[required.harness]=null,false);
  rows.push({sha,contract:name,source_members:required.members.length,actual_product_or_packed_qualified:false});
  console.log(JSON.stringify({line:inputs.line,contract:name,helper_cases:helperCases,cli_cases:cliCases}));
 }finally{f.dispose();}
}
const output={schema_version:1,line:inputs.line,role:'Actual helper and CLI controls with synthetic clean-run/report/library/observation fixtures only',
 individual_new_source_decisions:3,preceding_source_contexts_requalified:3,complete_new_original_hunks:11,unchanged_other_ledger_rows:1691,
 helper_cases:helperCases,semantic_corruption_controls:semanticControls,actual_cli_cases:cliCases,source_corruption_controls:sourceControls,
 profiles:rows,source_checker_sha256:hash(read('scripts/chip-menu-tooltip-admission-source-judgments.mjs')),
 helper_sha256:hash(read('scripts/upstream-artifact-behavior-evidence.mjs')),producer_sha256:hash(read('tests/upstream/chip-menu-tooltip-artifact-admission.mjs')),
 common_packed_run_sha256:hash(read('scripts/upstream-packed-run-evidence.mjs')),
 actual_product_or_packed_or_native_or_floor_qualified:false,actual_runtime_or_authored_use_closures:0,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...output,source_corruption_controls:sourceControls.length}));
