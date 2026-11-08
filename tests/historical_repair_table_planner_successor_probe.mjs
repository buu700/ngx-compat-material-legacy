/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,renameSync,symlinkSync,unlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {assertHistoricalRepairPlannerSource as planner,historicalRepairTableSourceProof as table} from '../scripts/historical-contract-repair-source.mjs';
const root=resolve(process.argv[2]??'.'),scratch=mkdtempSync(join(tmpdir(),'historical-table-planner-')),fixture=join(scratch,'root');mkdirSync(fixture);
const paths=['projects/ngx-material-legacy/package.json','scripts/canonical-source-guard-plan.mjs','compatibility/rc/current-tool-planner-source-successor-v1.json','compatibility/rc/historical-repair-table-signature-source-successor-v1.json','compatibility/rc/parent-main-table-column-diagnostic-v1.json','compatibility/rc/api/signature-differences.json','scripts/historical-contract-repair-source.mjs'];
for(const path of paths){const dest=join(fixture,path);mkdirSync(dirname(dest),{recursive:true});copyFileSync(join(root,path),dest);}
const gitdir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();writeFileSync(join(fixture,'.git'),'gitdir: '+gitdir+'\n');
let controls=0;
try{
 planner(fixture);const result=table({root:fixture});assert.equal(result.before.sha256,'ab78e5d35b56a8ce552054ac36ed35aa6e136d3b58bff9534474a5020fd698d0');assert.equal(result.after.sha256,'fc44b0d7b587556a6124440c4918ed52f2bd1db35442c8d1cbe5cc9a6010fb9b');assert.deepEqual(result.qualify(result.before),result.after);assert.deepEqual(result.qualify(result.after),result.after);assert.throws(()=>result.qualify({...result.before,sha256:'0'.repeat(64)}));controls++;let getterCalls=0;const getter={...result.before};Object.defineProperty(getter,'sha256',{enumerable:true,get(){getterCalls++;throw Error('getter evaluated');}});assert.throws(()=>result.qualify(getter));assert.equal(getterCalls,0);controls++;let proxyCalls=0;assert.throws(()=>result.qualify(new Proxy(result.before,{get(){proxyCalls++;throw Error('proxy evaluated');}})));assert.equal(proxyCalls,0);controls++;assert.throws(()=>result.qualify({...result.before,extra:true}));controls++;assert.throws(()=>result.qualify({...result.before,bytes:result.before.bytes+1}));controls++;assert.throws(()=>result.qualify({...result.before,bytes:undefined}));controls++;
 for(const path of paths.slice(2,6)){const target=join(fixture,path),raw=readFileSync(target),changed=Buffer.from(raw);assert.ok(changed.length);changed[0]^=1;try{writeFileSync(target,changed);assert.throws(()=>path.includes('planner-source')?planner(fixture):table({root:fixture}));controls++;}finally{writeFileSync(target,raw);}}
 const signature=join(fixture,paths[5]),current=readFileSync(signature),prior=execFileSync('git',['show','c394ef616bfae381e0676c8f84af01e0553cad1d:'+paths[5]],{cwd:root});result.assertImage(prior,current);assert.throws(()=>result.assertImage(Buffer.concat([prior,Buffer.from(' ')]),current));controls++;assert.throws(()=>result.assertImage(prior,Buffer.concat([current,Buffer.from(' ')])));controls++;try{writeFileSync(signature,prior);assert.throws(()=>table({root:fixture}));controls++;}finally{writeFileSync(signature,current);}
 for(const mutation of [data=>data.differences.push({...data.differences[0]}),data=>{data.differences[0].historical_signature='changed';},data=>{data.differences.splice(1,1);}]){
  const data=JSON.parse(current);mutation(data);try{writeFileSync(signature,JSON.stringify(data,null,2)+'\n');assert.throws(()=>table({root:fixture}));controls++;}finally{writeFileSync(signature,current);}
 }
 const self=join(fixture,paths[6]),selfRaw=readFileSync(self);try{writeFileSync(self,Buffer.concat([selfRaw,Buffer.from(' ')]));assert.throws(()=>table({root:fixture}));controls++;}finally{writeFileSync(self,selfRaw);}
 const plannerFile=join(fixture,paths[1]),currentPlanner=readFileSync(plannerFile),oldPlanner=execFileSync('git',['show','2fbecd1b2687e26515c205cbd5c0024e9474b4b8:'+paths[1]],{cwd:root}),packageFile=join(fixture,paths[0]),packageRaw=readFileSync(packageFile);
 try{writeFileSync(plannerFile,oldPlanner);assert.throws(()=>planner(fixture));controls++;writeFileSync(packageFile,JSON.stringify({...JSON.parse(packageRaw),version:'21.0.0'}));planner(fixture);writeFileSync(plannerFile,currentPlanner);assert.throws(()=>planner(fixture));controls++;}finally{writeFileSync(packageFile,packageRaw);writeFileSync(plannerFile,currentPlanner);}
 const packet=join(fixture,paths[3]),saved=join(scratch,'saved-packet');renameSync(packet,saved);symlinkSync(saved,packet);try{assert.throws(()=>table({root:fixture}));controls++;}finally{unlinkSync(packet);renameSync(saved,packet);}
 planner(fixture);table({root:fixture});assert.equal(controls,20);console.log(JSON.stringify({result:'pass',controls,main_planner:true,legacy_planner:true,exact_table_successor:true,full_owner_qualified:false,g11_claim:'not-passed'}));
}finally{rmSync(scratch,{recursive:true,force:true});}
