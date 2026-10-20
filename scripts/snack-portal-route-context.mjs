/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** One exact prior caller subject, after authenticating the repaired current product. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {qualifyIndependentDialogProductDelta} from './snack-dom-source-context.mjs';
import {dialogPortalPrior,DIALOG_PORTAL_SOURCE} from './dialog-portal-failure-recovery.mjs';
import {routePrior,reviewRouteSource} from './snack-portal-route-recovery.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),branded=new WeakMap(),authenticated=new Set(),sourcePath='projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts',probePath='tests/snack_dom_public_dispatch_probe.mjs';
const qualifications={main:{commit:'c43069ada0ed2acf19a86e1789413b5f9ca4e077',path:'compatibility/rc/snack-portal-route-recovery-public-main.json',sha256:'d33c4929bcf7d4449d5e4d690376267a1e36fccd88b8ac5d2952f4de23ec8718'},'21.x':{commit:'9826ce8357877c29ec52d7b2cd24d7430da29ae7',path:'compatibility/rc/snack-portal-route-recovery-public-21.json',sha256:'1bba00f53ad1fe35088bfb6e8e1666c920be5a39ea63564050f8f14ee502363d'}};
function original(root,commit,path,sha256){const key=JSON.stringify([root,commit,path,sha256]);if(authenticated.has(key))return;const bytes=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,maxBuffer:4*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(bytes),sha256);authenticated.add(key);}
export function priorSnackProbeProgram(before){const edits=[["import {snackDomPrior,reviewSnackDomSource", "import {routePreviousTaskReader} from '../scripts/snack-portal-route-context.mjs';\nimport {snackDomPrior,reviewSnackDomSource"],['source=reviewSnackDomSource(root,{allowBefore:true})','source=reviewSnackDomSource(root,{read:routePreviousTaskReader({root}),allowBefore:true})']];let text=before;for(const[from,to]of edits){assert.equal(text.split(from).length,2);text=text.replace(from,to);}return text;}
function qualifiedRouteContext(root,read){
 if(branded.has(read)){const old=branded.get(read);assert.equal(old.root,root);read=old.raw;}
 qualifyIndependentDialogProductDelta({root,read});const dialog=dialogPortalPrior(root,read),priorRead=p=>p===DIALOG_PORTAL_SOURCE?Buffer.from(dialog.product.text):read(p);
 const prior=routePrior(root,read),current=reviewRouteSource(root,priorRead),q=qualifications[prior.line];assert.equal(current.current_sha256,'1b673f43bacbcf47ea0e504ff3f191d84289e7c7337b20b93e8b5b98e833eb08');const bytes=read(q.path);assert.equal(hash(bytes),q.sha256);original(root,q.commit,q.path,q.sha256);original(root,q.commit,sourcePath,current.current_sha256);const helper='scripts/snack-portal-route-recovery.mjs';original(root,q.commit,helper,hash(read(helper)));
 const proof=JSON.parse(bytes);assert.equal(proof.line,prior.line);assert.equal(proof.source.current_sha256,current.current_sha256);assert.equal(proof.source.immediate_prior_sha256,prior.source_sha256);assert.equal(proof.type_subjects.length,3);assert.equal(proof.runtime_subjects.length,10);assert.equal(proof.case_count,115);assert.equal(proof.rejected_behavior_faults,40);assert.equal(proof.actual_legacy_component_native_packed_or_floor_qualified,false);assert.equal(proof.g11_claim,'not-passed');
 return {root,read,prior,priorRead,current,q};
}
export function priorRouteProbeProgram(before){
 const edits=[["import {routePrior,reviewRouteSource", "import {routeCurrentTaskReader} from '../scripts/snack-portal-route-context.mjs';\nimport {routePrior,reviewRouteSource"],['source=reviewRouteSource(root)','source=reviewRouteSource(root,routeCurrentTaskReader({root}))']];
 let text=before;for(const[from,to]of edits){assert.equal(text.split(from).length,2);text=text.replace(from,to);}return text;
}
/** Earlier115-case controller keeps every assertion; only its prior dialog subject changes. */
export function routeCurrentTaskContext({root=process.cwd(),read=p=>readFileSync(join(root,p))}={}){
 const base=qualifiedRouteContext(root,read);({read}=base);const path='tests/snack_portal_route_recovery_probe.mjs',originalProgram=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',base.q.commit+':'+path],{cwd:root,encoding:'utf8',maxBuffer:1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});
 assert.equal(hash(read(path)),hash(priorRouteProbeProgram(originalProgram)),'unregistered original115 probe adapter');
 const reader=p=>base.priorRead(p);branded.set(reader,{root,raw:read});return {read:reader,raw:read,line:base.prior.line,historical_product_members:1,qualified_current_cases:115,qualified_current_faults:40,original115_assertions_preserved:true,actual_native_packed_or_floor_qualified:false};
}
export function routeCurrentTaskReader(options={}){return routeCurrentTaskContext(options).read;}
export function routePreviousTaskContext({root=process.cwd(),read=p=>readFileSync(join(root,p))}={}){
 const base=qualifiedRouteContext(root,read);({read}=base);const {prior,priorRead,current}=base;
 const old=prior.members.find(m=>m.path===sourcePath),program=prior.members.find(m=>m.path===probePath);assert.ok(old&&program);assert.equal(hash(read(probePath)),hash(priorSnackProbeProgram(program.text)),'unregistered original105 probe adapter');
 const reader=p=>p===sourcePath?Buffer.from(old.text):priorRead(p);branded.set(reader,{root,raw:read});return {read:reader,raw:read,line:prior.line,prior_source_sha256:old.sha256,current_source_sha256:current.current_sha256,qualified_current_cases:115,qualified_current_faults:40,historical_product_members:2,original105_assertions_preserved:true,actual_native_packed_or_floor_qualified:false};
}
export function routePreviousTaskReader(options={}){return routePreviousTaskContext(options).read;}
