/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {dialogPortalPrior,reviewDialogPortalSource,prepareSnackDomSubjects,compileDialogPortalTypes,writeDialogPortalRuntime} from '../scripts/dialog-portal-failure-recovery.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),prior=dialogPortalPrior(root),source=reviewDialogPortalSource(root),loaded=prepareSnackDomSubjects(root),report={schema_version:1,line:prior.line,source,reference:prior.reference_authority,type_subjects:[],runtime_subjects:[],new_source_or_SHA_closures:0,g11_claim:'not-passed',actual_full_dialog_focus_component_native_packed_or_floor_qualified:false};
try{
 for(const model of loaded.models){report.type_subjects.push(compileDialogPortalTypes(root,model));const prepared=writeDialogPortalRuntime(root,model);for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of [false,true]){const child=spawnSync(process.execPath,[join(model.root,'dialog-portal-subject.mjs'),model.line,mode,String(production)],{cwd:model.root,encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024});assert.equal(child.status,0,(child.stdout+'\n'+child.stderr).slice(-18000));const row=JSON.parse(child.stdout.trim().split('\n').at(-1));assert.equal(row.cases.length,16);assert.equal(row.behavior_faults_rejected.length,production?6:7);report.runtime_subjects.push({...row,prepared});}}
 assert.equal(report.runtime_subjects.length,10);report.case_count=report.runtime_subjects.reduce((n,s)=>n+s.cases.length,0);report.rejected_behavior_faults=report.runtime_subjects.reduce((n,s)=>n+s.behavior_faults_rejected.length,0);assert.equal(report.case_count,160);assert.equal(report.rejected_behavior_faults,65);
 const shared=rows=>rows.map(({dispatch,...row})=>({...row,steps:row.steps.map(({wrapper_attached,...step})=>step)}));report.actual_reference_peer_comparisons=[];for(const row of report.runtime_subjects){const reference=report.runtime_subjects.find(s=>s.line==='original'&&s.production===row.production);assert.ok(reference);assert.deepEqual(shared(row.observations.repaired),shared(reference.observations.reference),'changed callback differs from actual reference-peer execution');report.actual_reference_peer_comparisons.push({line:row.line,mode:row.mode,production:row.production,changed_callback_observables_match_actual_reference_peer:true});}
 report.scope='Actual selected attachment/guard and unchanged owner portal methods with genuine public Core/CDK; explicit receiver,focus-hook,renderer and DOM protocols. Shared changed-callback outputs,errors,base/child/portal states,returns,hooks,view lifetimes and ownership match the actual tag. The unchanged owned hasAttached aggregate is separately asserted and recorded; whole inherited API equivalence,real focus lifecycle,constructor,native,packed and floors remain unqualified.';
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:prior.line,strict_type_models:3,runtime_subjects:10,caller_cases:160,behavior_faults_rejected:65,actual_prior_regressions_reproduced:true,other_class_members_preserved:source.other_class_members_unchanged,new_semantic_closures:0,actual_native_packed_or_floor_qualified:false}));
}finally{loaded.dispose();}
