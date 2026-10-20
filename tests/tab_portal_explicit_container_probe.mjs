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
import {tabPortalPrior,tabPortalSourceReview,prepareTabPortalSubjects,writeTabPortalRuntime,compileTabPortalTypes,TAB_BODY,TAB_ADAPTER} from '../scripts/tab-portal-explicit-container-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),source=tabPortalSourceReview(root),prior=tabPortalPrior(root),loaded=prepareTabPortalSubjects(root),report={schema_version:1,source,type_subjects:[],runtime_subjects:[],source_corruptions:[],new_use_closures:0,actual_full_legacy_parent_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
try{
 for(const model of loaded.models){report.type_subjects.push(compileTabPortalTypes(root,model));writeTabPortalRuntime(root,model);
  for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of [false,true]){
   const child=spawnSync(process.execPath,[join(model.root,'tab-portal-subject.mjs'),model.line,mode,String(production)],{cwd:model.root,encoding:'utf8',timeout:45000,maxBuffer:1024*1024});assert.equal(child.status,0,(child.stdout+'\n'+child.stderr).slice(0,10000));const observed=JSON.parse(child.stdout.trim().split('\n').at(-1));assert.equal(observed.cases.length,model.line==='original'?7:8);assert.equal(observed.behavior_reversions_rejected.length,model.line==='original'?0:10);report.runtime_subjects.push(observed);
  }
 }
 const read=p=>readFileSync(join(root,p));for(const path of prior.preimages.filter(m=>m.path!==TAB_BODY).map(m=>m.path).concat('compatibility/rc/tab-portal-explicit-container-prior.json.gz')){assert.throws(()=>tabPortalSourceReview(root,{read:p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)}));report.source_corruptions.push(path);}
 const sourceFaults=[['tab-nonportal-change',TAB_BODY,read(TAB_BODY).toString().replace("'class': 'mat-tab-body'","'class': 'changed'")],['tab-lifecycle-change',TAB_BODY,read(TAB_BODY).toString().replace('this.detach();','void 0;')],['adapter-loses-parent',TAB_ADAPTER,read(TAB_ADAPTER).toString().replace('return this.parent.get(token, notFoundValue, options);','return null;')]];
 for(const[id,path,text]of sourceFaults){assert.notEqual(text,read(path).toString());assert.throws(()=>tabPortalSourceReview(root,{read:p=>p===path?Buffer.from(text):read(p)}));report.source_corruptions.push(id);}
 tabPortalSourceReview(root);if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:source.line,strict_type_subjects:3,runtime_subjects:report.runtime_subjects.length,lifecycle_cases:report.runtime_subjects.reduce((n,s)=>n+s.cases.length,0),behavior_reversions_rejected:report.runtime_subjects.reduce((n,s)=>n+s.behavior_reversions_rejected.length,0),source_corruptions:report.source_corruptions.length,new_use_closures:0,actual_full_legacy_parent_native_packed_or_floor_qualified:false}));
}finally{loaded.dispose();}
