/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {coreViewPrior,coreViewSourceInventory,prepareCoreViewSubjects,compileCoreViewTypes} from '../scripts/core-view-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),inventory=coreViewSourceInventory(root),prior=coreViewPrior(root),loaded=prepareCoreViewSubjects(root);
const report={schema_version:1,line:inventory.line,role:'Public view type/lifecycle evidence for35 selected uses; per-caller source decisions and ledger closure remain pending',source_inventory:inventory,type_subjects:[],runtime_subjects:[],source_corruption_controls:[],fixture_development_corrections:['Use the returned detach handle; do not invent identical JavaScript wrappers as a public Core view contract. Compare context, nodes and shared lifetime.','Pass the container node injector explicitly for component creation; default component creation and declaration-template scope are different concerns.','The DOM protocol implements actual attribute and selector-list queries required by current SharedStylesHost; no empty-query stub or nonce-provider override is used.'],new_use_closures:0,source_conclusions_qualified:0,actual_legacy_component_TestBed_browser_packed_or_floor_qualified:false,g11_claim:'not-passed'};
try{
 for(const model of loaded.models){report.type_subjects.push(compileCoreViewTypes(model));const target=join(model.root,'core_view_use_subject.mjs');copyFileSync(join(root,'tests/core_view_use_subject.mjs'),target);
  for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of [false,true]){
   const child=spawnSync(process.execPath,[target,model.line,mode,String(production)],{cwd:model.root,encoding:'utf8',timeout:45000,maxBuffer:1024*1024});assert.equal(child.status,0,(child.stdout+'\n'+child.stderr).slice(0,10000));const observed=JSON.parse(child.stdout.trim().split('\n').at(-1));assert.equal(observed.cases.length,13);assert.equal(observed.behavior_faults_rejected.length,10);assert.equal(observed.actual_legacy_component_TestBed_browser_packed_or_floor_qualified,false);observed.zone_subject=model.core_view_zone;report.runtime_subjects.push(observed);
  }
 }
 const read=p=>readFileSync(join(root,p));for(const path of [...prior.candidate_preimages,...prior.ledger_preimages,...prior.protected].map(m=>m.path).concat('compatibility/rc/core-view-use-prior.json.gz')){const changed=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>coreViewPrior(root,{read:p=>p===path?changed:read(p)}),'changed source accepted: '+path);report.source_corruption_controls.push(path);}
 coreViewPrior(root);assert.equal(report.type_subjects.length,3);assert.equal(report.runtime_subjects.length,10);assert.equal(report.source_corruption_controls.length,35);
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:inventory.line,selected_uses:35,candidate_files:22,strict_type_subjects:3,negative_type_checks:36,public_runtime_subjects:10,public_lifecycle_cases:130,behavior_faults_rejected:100,source_corruption_controls:35,new_use_closures:0,source_conclusions_qualified:0,actual_legacy_component_TestBed_browser_packed_or_floor_qualified:false}));
}finally{loaded.dispose();}
