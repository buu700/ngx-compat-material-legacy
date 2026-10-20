/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** A distinct public CdkPortalOutlet caller path; no legacy snack-bar claim. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareTabPortalSubjects,writeTabPortalRuntime,TAB_BODY,TAB_ADAPTER} from '../scripts/tab-portal-explicit-container-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=b=>createHash('sha256').update(b).digest('hex');
const subjectPath='tests/core_view_use_current_roles_subject.mjs',subject=readFileSync(join(root,subjectPath),'utf8');
const sourcePaths=[TAB_BODY,TAB_ADAPTER,'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts',
 'tests/core_view_use_subject.mjs','tests/tab_portal_explicit_container_subject.mjs',subjectPath];
const sourceMembers=sourcePaths.map(path=>({path,sha256:hash(readFileSync(join(root,path)))}));
const snack=readFileSync(join(root,sourcePaths[2]),'utf8');assert.ok(snack.includes('new TemplatePortal(content, null!, {'));
const loaded=prepareTabPortalSubjects(root),report={schema_version:1,role:'Historical null-declaration-container TemplatePortal consumed by genuine public CdkPortalOutlet',source_members:sourceMembers,runtime_subjects:[],generated_subjects:[],
 original_existing_public_type_evidence:'compatibility/rc/core-view-use-public-main.json',
 actual_snack_bar_component_native_packed_or_floor_qualified:false,new_use_closures:0,g11_claim:'not-passed'};
try {
 for(const model of loaded.models){
  writeTabPortalRuntime(root,model);
  const file=join(model.root,'tab-portal-subject.mjs'),before=readFileSync(file,'utf8'),marker="try{\n run('explicit-container-lifecycle'";
  assert.equal(before.split(marker).length,2,'unrecognized original lab boundary');
  const current=before.slice(0,before.indexOf(marker))+subject;writeFileSync(file,current);
  report.generated_subjects.push({line:model.line,original_lab_sha256:hash(before),caller_subject_sha256:hash(current)});
  for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of [false,true]){
   const child=spawnSync(process.execPath,[file,model.line,mode,String(production)],{cwd:model.root,encoding:'utf8',timeout:45000,maxBuffer:1024*1024});
   assert.equal(child.status,0,(child.stdout+'\n'+child.stderr).slice(-9000));
   const row=JSON.parse(child.stdout.trim().split('\n').at(-1));assert.equal(row.cases.length,2);assert.equal(row.behavior_faults_rejected.length,2);report.runtime_subjects.push(row);
  }
 }
 assert.equal(report.runtime_subjects.length,10);
 assert.equal(report.runtime_subjects.reduce((n,s)=>n+s.cases.length,0),20);
 assert.equal(report.runtime_subjects.reduce((n,s)=>n+s.behavior_faults_rejected.length,0),20);
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({genuine_public_peer_models:3,runtime_subjects:10,caller_lifecycle_cases:20,behavior_faults_rejected:20,new_use_closures:0,actual_snack_bar_component_native_packed_or_floor_qualified:false}));
} finally {loaded.dispose();}
