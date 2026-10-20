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
import {routePrior,reviewRouteSource,prepareSnackDomSubjects,compileRouteTypes,writeRouteRuntime,reviewSnackDomCrossPeer} from '../scripts/snack-portal-route-recovery.mjs';
import {snackDomPrior} from '../scripts/snack-dom-public-dispatch.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),prior=snackDomPrior(root),immediate=routePrior(root),source=reviewRouteSource(root),loaded=prepareSnackDomSubjects(root);
const report={schema_version:1,line:prior.line,source,reference:prior.reference_authority,immediate_prior:{source_parent:immediate.source_parent,source_sha256:immediate.source_sha256},type_subjects:[],runtime_subjects:[],g11_claim:'not-passed',new_source_or_SHA_closures:0,actual_legacy_component_native_packed_or_floor_qualified:false};
try {
 for(const model of loaded.models){report.type_subjects.push(compileRouteTypes(root,model));const prepared=writeRouteRuntime(root,model);
  for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of [false,true]){
   const child=spawnSync(process.execPath,[join(model.root,'snack-dom-subject.mjs'),model.line,mode,String(production)],{cwd:model.root,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});assert.equal(child.status,0,(child.stdout+'\n'+child.stderr).slice(-14000));const row=JSON.parse(child.stdout.trim().split('\n').at(-1));assert.equal(row.genuine_Core_and_CDK_outlets,true);assert.equal(row.cases.length,production?11:12);assert.equal(row.behavior_faults_rejected.length,production?3:5);report.runtime_subjects.push({...row,prepared});
  }
 }
 assert.equal(report.runtime_subjects.length,10);
 report.case_count=report.runtime_subjects.reduce((n,s)=>n+s.cases.length,0);report.rejected_behavior_faults=report.runtime_subjects.reduce((n,s)=>n+s.behavior_faults_rejected.length,0);
 report.generic_only_candidate_failure_states=report.runtime_subjects.map(s=>({line:s.line,mode:s.mode,production:s.production,counterexamples:s.generic_only_counterexamples}));
 assert.equal(report.case_count,115);assert.equal(report.rejected_behavior_faults,40);
 report.actual_reference_peer_contract=reviewSnackDomCrossPeer(report);
 report.scope='Complete selected actual caller methods and genuine Core/CDK outlets with explicit receiver/DOM/renderer protocols. No actual complete snack-bar constructor/component, native browser, packed artifact or peer/compiler/Node/Rx floor qualification.';
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:prior.line,strict_type_models:report.type_subjects.length,runtime_subjects:report.runtime_subjects.length,lifecycle_cases:report.case_count,behavior_faults_rejected:report.rejected_behavior_faults,generic_only_failure_regression_reproduced:true,prior_repair_still_current:source.current_sha256===source.immediate_prior_sha256,new_source_or_SHA_closures:0,actual_legacy_component_native_packed_or_floor_qualified:false}));
} finally {loaded.dispose();}
