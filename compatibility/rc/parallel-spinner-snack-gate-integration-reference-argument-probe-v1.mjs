/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Negative transport controls using a cached-output dependency, never a real compiler. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root='/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy',prefix='compatibility/rc/parallel-spinner-snack-gate-integration-',hash=b=>createHash('sha256').update(b).digest('hex');
const packet=JSON.parse(readFileSync(join(root,'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json'))),preflight=JSON.parse(readFileSync(join(root,prefix+'original16-source-view-preflight-v1.json')));
const provenance=JSON.parse(readFileSync(join(root,packet.provenance.path))),lock=JSON.parse(readFileSync(join(root,packet.reference_lock.path))),rows=JSON.parse(readFileSync(join(root,packet.branches['21.x'].observation.path))).rows;
const reports=[];
for(const[line,currentRoot]of Object.entries({'21.x':root,main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'})){
 const helper=await import(pathToFileURL(join(currentRoot,'scripts/sass-spinner-snack-gate-integration.mjs')).href),results=[];
 let getterCalls=0;
 const mutations={
  outer_sass:a=>a.sass={},outer_entry:a=>a.referenceEntry='/tmp/foreign',outer_root:a=>a.referenceRoot='/tmp/foreign',outer_identity:a=>a.identity={},
  outer_extra:a=>a.foreign=true,outer_symbol:a=>a[Symbol('foreign')]=true,outer_getter:a=>Object.defineProperty(a,'referenceEntry',{get(){getterCalls++;return preflight.referenceEntry;},enumerable:true,configurable:true}),outer_flags:a=>Object.defineProperty(a,'identity',{writable:false}),
  nested_identity:a=>a.identity.material_version='21.2.14',nested_identity_symbol:a=>a.identity[Symbol('foreign')]=true,nested_identity_getter:a=>Object.defineProperty(a.identity,'material_version',{get(){getterCalls++;return '16.2.14';},enumerable:true,configurable:true}),
  compiler_function:a=>a.sass.compileString=()=>{},compiler_info:a=>a.sass.info='foreign',
  compiler_function_getter:a=>{const expected=a.sass.compileString;Object.defineProperty(a.sass,'compileString',{get(){getterCalls++;a.referenceRoot='/tmp/foreign-after-last-check';return expected;},enumerable:true,configurable:true});},
  compiler_info_getter:a=>{const expected=a.sass.info;Object.defineProperty(a.sass,'info',{get(){getterCalls++;a.referenceRoot='/tmp/foreign-after-last-check';return expected;},enumerable:true,configurable:true});},
 };
 for(const[name,mutate]of Object.entries(mutations)){
  let cachedCalls=0,args;
  const sass={info:packet.branches[line].compiler,compileString(){const id=helper.SPINNER_SNACK_DEFAULT_CASES[cachedCalls++],row=rows.find(r=>r.case_id===id);if(cachedCalls===1)mutate(args);return {css:row.historical.css,loadedUrls:[pathToFileURL(preflight.referenceEntry)]};}};
  args={sass,referenceEntry:preflight.referenceEntry,referenceRoot:preflight.referenceRoot,identity:{material_version:'16.2.14',material_manifest_sha256:provenance.isolated_environment.material_manifest_sha256,lock_sha256:packet.reference_lock.sha256,material_integrity:lock.packages['node_modules/@angular/material'].integrity,expected_source:'untouched-installed-material16',candidate_source:'packed-facade',sass_version:sass.info}};
  assert.throws(()=>helper.measureSpinnerSnackDefaultReferences(args),undefined,name);assert.equal(cachedCalls,5,name+' reached the final live guard');results.push({name,rejected:true,cached_dependency_calls:cachedCalls});
 }
 assert.equal(getterCalls,0);reports.push({line,helper_sha256:hash(readFileSync(join(currentRoot,'scripts/sass-spinner-snack-gate-integration.mjs'))),results,getter_calls:getterCalls});
}
const output=join(root,prefix+'reference-argument-controls-v2.json');assert.equal(existsSync(output),false);writeFileSync(output,JSON.stringify({schema_version:1,role:'Negative public reference-routine argument controls; cached-output test dependency only',reports,actual_compiler_calls:0,reference_measurement_acceptance_claimed:false,actual_packed_assertions:0},null,2)+'\n');console.log(JSON.stringify({output,rejections:reports.map(r=>({line:r.line,count:r.results.length})),actual_compiler_calls:0}));
