/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Raw current qualification of two independent tab construction members. */
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {qualifyIndependentSnackProductDelta,readSnackCurrentFocusInputs} from './snack-dom-source-context.mjs';
export const TAB_ADAPTER_INVENTORY_INPUTS='compatibility/rc/tab-adapter-product-inventory-inputs.json';
export const CURRENT_CHIP_FOCUS_INPUTS='compatibility/rc/tab-adapter-product-inventory-focus-inputs.json';
const pins={main:'effc6e56f3e85f7a214e9ff5cd8487c9c919e565b6ec2d92bf9da6c9995328ac','21.x':'bed96c448dca6fa0f28e9e55e6c7348090c41cb62ae171081307146056b3d603'},hash=b=>createHash('sha256').update(b).digest('hex'),authenticated=new Set();
const defaultRead=root=>p=>{let member=root;for(const part of p.split('/')){assert.ok(part&&part!=='.'&&part!=='..');member=join(member,part);assert.equal(lstatSync(member).isSymbolicLink(),false,'symlink in current product qualification');}assert.ok(lstatSync(member).isFile());return readFileSync(member);};
function gitMember(root,commit,path,sha256){const key=JSON.stringify([root,commit,path,sha256]);if(authenticated.has(key))return;const raw=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,maxBuffer:4*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(raw),sha256);authenticated.add(key);}
export function qualifyIndependentTabProductDelta({root=process.cwd(),read=defaultRead(root)}={}){
 const raw=read(TAB_ADAPTER_INVENTORY_INPUTS),fingerprint=hash(raw),line=Object.keys(pins).find(k=>pins[k]===fingerprint);assert.ok(line,'changed independent tab product qualification');const data=JSON.parse(raw);assert.equal(data.line,line);assert.equal(data.schema_version,1);assert.equal(data.g11_claim,'not-passed');assert.equal(data.actual_native_packed_or_floor_qualified,false);assert.equal(data.delta.length,2);
 assert.deepEqual(data.delta.map(m=>m.path),['projects/ngx-material-legacy/legacy-tabs/tab-body.ts','projects/ngx-material-legacy/legacy-tabs/internal/tab-portal-construction-context.ts']);assert.equal(data.delta[0].kind,'qualified-existing-member');assert.equal(data.delta[1].kind,'qualified-added-member');
 for(const m of data.delta){assert.equal(hash(read(m.path)),m.sha256,'changed qualified independent tab source '+m.path);assert.equal(read(m.path).length,m.bytes);gitMember(root,data.qualification.source_parent,m.path,m.sha256);}
 const proof=read(data.qualification.path);assert.equal(hash(proof),data.qualification.sha256);gitMember(root,data.qualification.source_parent,data.qualification.path,data.qualification.sha256);const report=JSON.parse(proof);assert.equal(report.source.line,line);assert.equal(report.type_subjects.length,3);assert.equal(report.runtime_subjects.length,10);assert.equal(report.runtime_subjects.reduce((n,s)=>n+s.cases.length,0),78);assert.equal(report.runtime_subjects.reduce((n,s)=>n+s.behavior_reversions_rejected.length,0),80);assert.equal(report.actual_full_legacy_parent_native_packed_or_floor_qualified,false);assert.deepEqual(report.source.source_members,data.delta.map(({path,sha256})=>({path,sha256})));
 if(data.current_code_members.some(m=>hash(read(m.path))!==m.sha256))qualifyIndependentSnackProductDelta({root,read});
 return {line,delta:data.delta,inputs:{path:TAB_ADAPTER_INVENTORY_INPUTS,sha256:fingerprint},qualification:data.qualification,source_scope_only:true,actual_native_packed_or_floor_qualified:false};
}
export function readCurrentChipFocusInputs({root=process.cwd(),read=defaultRead(root)}={}){
 const qualified=qualifyIndependentTabProductDelta({root,read});const input=JSON.parse(read(TAB_ADAPTER_INVENTORY_INPUTS));if(input.current_code_members.some(m=>hash(read(m.path))!==m.sha256)){const current=readSnackCurrentFocusInputs({root,read});assert.deepEqual(current.data.independent_product_delta,qualified.delta);assert.equal(hash(read(current.data.prior_inputs.path)),current.data.prior_inputs.sha256);return current;}const raw=read(CURRENT_CHIP_FOCUS_INPUTS);assert.equal(hash(raw),input.focus_inputs.sha256);assert.equal(input.focus_inputs.path,CURRENT_CHIP_FOCUS_INPUTS);const data=JSON.parse(raw);assert.equal(data.line,qualified.line);assert.deepEqual(data.independent_product_delta,qualified.delta);assert.equal(hash(read(data.prior_inputs.path)),data.prior_inputs.sha256);assert.equal(data.source_before_reader_used_by_runtime_or_native_admission,false);assert.equal(data.actual_native_packed_or_floor_qualified,false);assert.equal(data.g11_claim,'not-passed');assert.equal(hash(read(data.current_raw_contract_source.path)),data.current_raw_contract_source.sha256);
 return {data,bytes:raw,ref:{path:CURRENT_CHIP_FOCUS_INPUTS,sha256:hash(raw)},qualified};
}

/** Exact reviewed source population, including the independently qualified adapter. */
export function assertQualifiedProductSourcePopulation(paths,options={}){
 const root=options.root??process.cwd(),read=options.read??defaultRead(root);qualifyIndependentTabProductDelta({root,read});const input=JSON.parse(read(TAB_ADAPTER_INVENTORY_INPUTS));assert.equal(new Set(paths).size,paths.length);assert.deepEqual(paths,input.source_population.paths,'unreviewed product source membership');assert.equal(hash(paths.join('\n')+'\n'),input.source_population.sha256);assert.ok(paths.every(p=>p.startsWith('projects/ngx-material-legacy/')&&/\.(ts|scss|css|html)$/.test(p)));return true;
}
