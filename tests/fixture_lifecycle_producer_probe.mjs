/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {prepareFixtureLifecycleSubjects} from '../scripts/fixture-lifecycle-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
import {collectFixtureLifecycleExpressions,compileFixtureLifecycleExpressions,fixtureLifecyclePrior} from '../scripts/fixture-lifecycle-producer-review.mjs';
import {inspectFixtureLifecycleDelta} from '../scripts/fixture-lifecycle-requalification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),loaded=prepareFixtureLifecycleSubjects(root),rows=await collectFixtureLifecycleExpressions(root);
const report={schema_version:1,role:'Actual producer lifecycle expressions with complete public fixture/view declarations and genuine Core component/view lifetimes; renderer and Fixture handles are explicit protocols',type_subjects:[],runtime_subjects:[],source_controls_rejected:[],actual_TestBed_ComponentFixture_or_legacy_control_executed:false,native_browser_or_packed_qualified:false,g11_claim:'not-passed'};
try{
 for(const model of loaded.models){report.type_subjects.push(compileFixtureLifecycleExpressions(model,rows));
  const zone=installNgZonePublicSubject(model,root);copyFileSync(join(root,'tests/fixture_lifecycle_producer_subject.mjs'),join(model.root,'fixture_lifecycle_producer_subject.mjs'));
  writeFileSync(join(model.root,'fixture-lifecycle-payload.json'),JSON.stringify(rows));
  for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of [false,true]){
   const child=spawnSync(process.execPath,[join(model.root,'fixture_lifecycle_producer_subject.mjs'),model.line,mode,String(production)],{cwd:model.root,encoding:'utf8',timeout:45000,maxBuffer:1024*1024});
   assert.equal(child.status,0,(child.stdout+'\n'+child.stderr).slice(-8000));const observed=JSON.parse(child.stdout.trim().split('\n').at(-1));observed.zone_subject=zone;report.runtime_subjects.push(observed);
  }
 }
 const delta=inspectFixtureLifecycleDelta(root);Object.assign(report,delta);
 const prior=fixtureLifecyclePrior(root),read=p=>readFileSync(join(root,p),'utf8');
 for(const member of prior.preimages){for(const [id,mutate]of [['foreign-producer-byte',s=>s+'\n'],['old-unsupported-field',s=>s.replace('fixture.componentRef.hostView.destroyed','fixture.destroyed')]]){
  const changed=mutate(read(member.path));assert.notEqual(changed,read(member.path));assert.throws(()=>inspectFixtureLifecycleDelta(root,{readSource:p=>p===member.path?changed:read(p)}));report.source_controls_rejected.push(member.path+':'+id);
 }}
 assert.equal(report.type_subjects.length,3);assert.equal(report.runtime_subjects.length,10);assert.equal(report.source_controls_rejected.length,14);
 const cases=report.runtime_subjects.reduce((n,s)=>n+s.results.reduce((v,r)=>v+r.cases.length,0),0),faults=report.runtime_subjects.reduce((n,s)=>n+s.behavior_faults_rejected,0);
 assert.equal(cases,260);assert.equal(faults,280);
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:report.line,producer_files:7,state_and_cleanup_expressions:14,type_subjects:3,negative_type_checks:12,original_missing_property_errors:42,public_runtime_subjects:10,protocol_cases:cases,behavior_faults_rejected:faults,source_controls_rejected:14,actual_TestBed_ComponentFixture_or_legacy_control_executed:false,native_browser_or_packed_qualified:false}));
}finally{loaded.dispose();}
