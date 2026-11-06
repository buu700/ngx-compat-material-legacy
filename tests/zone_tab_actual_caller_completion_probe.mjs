/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Historical product-reader fixture for the actual caller boundary; run on a disposable copy. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {inspectTabLifecycleRepair} from '../scripts/remaining-native-tab-lifecycle-review.mjs';
const root=process.cwd();
const line=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main';
const parent=line==='21.x'?'9d7f09cc55d85979272f0e42aaad564ad3ec1fd6':'960d98d87aeac3a24b312cf9112abc6d6383a7fd';
assert.equal(process.env.C03_PARENT,parent,'historical membership fixture line');
const tab='projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts';
const target='scripts/native-motion-consumer.ts';
const last='scripts/remaining-native-tab-lifecycle-review.mjs';
const gitEnv={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
for(const key of Object.keys(gitEnv))if(key.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(key))delete gitEnv[key];
const historical=new Map();
function git(rev,path){const key=rev+':'+path;if(!historical.has(key))historical.set(key,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',key],{cwd:root,env:gitEnv}));return historical.get(key);}
const physical=path=>readFileSync(join(root,path));
let trigger,poison=false,triggered=false;
const readMember=path=>{
 if(path===last&&trigger&&!triggered){triggered=true;trigger();}
 if(poison&&path===target)return Buffer.concat([physical(path),Buffer.from(' ')]);
 if(path===tab)return git('f1615ad0cbdfbc122e696421b4afd47ddb55c68f',path);
 if(path==='scripts/upstream-tab-completion-evidence.mjs')return git('fd212e1d7b7a48854544391b1963ef44b74b6385',path);
 if(path==='scripts/check-upstream-audit-disposition.mjs')return git('3ac4d4a8342fbe669550c4581e519f7163fb5d9d',path);
 if(path.startsWith('projects/ngx-material-legacy/')&&path!=='projects/ngx-material-legacy/package.json'&&path!=='projects/ngx-material-legacy/legacy-tabs/tab-body.html')return git(parent,path);
 return physical(path);
};
const positive=inspectTabLifecycleRepair({root,readMember});
assert.equal(positive.g11_claim,'not-passed');assert.equal(positive.zone_tab_producer_source.length,6);
const original=physical(target);
if(process.argv[2]==='--expect-gap'){
 try{trigger=()=>writeFileSync(join(root,target),Buffer.concat([original,Buffer.from(' ')]));triggered=false;
  assert.doesNotThrow(()=>inspectTabLifecycleRepair({root,readMember}));assert.equal(triggered,true);
 }finally{trigger=undefined;writeFileSync(join(root,target),original);}
 console.log(JSON.stringify({line,old_gap_reproduced:true,actual_caller:true,historical_product_reader_fixture:true}));process.exit(0);
}
try{
 trigger=()=>writeFileSync(join(root,target),Buffer.concat([original,Buffer.from(' ')]));triggered=false;
 assert.throws(()=>inspectTabLifecycleRepair({root,readMember}),'actual caller final physical mutation');assert.equal(triggered,true);
}finally{trigger=undefined;writeFileSync(join(root,target),original);}
try{
 trigger=()=>{poison=true;};triggered=false;
 assert.throws(()=>inspectTabLifecycleRepair({root,readMember}),'actual caller final callback mutation');assert.equal(triggered,true);
}finally{trigger=undefined;poison=false;}
inspectTabLifecycleRepair({root,readMember});
console.log(JSON.stringify({line,actual_caller:true,historical_product_reader_fixture:true,current_product_positive:false,positive:true,final_physical_mutation_rejected:true,final_callback_mutation_rejected:true,native_executed:false,g11_claim:'not-passed'}));
