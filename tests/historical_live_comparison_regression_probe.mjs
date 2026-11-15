/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT license in LICENSE. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {currentAuthoredTabSourceSuccessor as make} from '../scripts/current-authored-tab-source-successor.mjs';
import {assertHistoricalLiveSupportComparison,qualifyHistoricalLiveAuthored} from '../scripts/historical-repair-live-source-successor.mjs';
const source=process.cwd(),base=make({root:source}),fixture=mkdtempSync(join(tmpdir(),'historical-live-comparison-'));
const clean=x=>({path:x.path,sha256:x.sha256,bytes:x.bytes});
const hash=x=>createHash('sha256').update(x).digest('hex');
try {
 writeFileSync(join(fixture,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:source,encoding:'utf8'}).trim()+'\n');
 for(const row of [...base.bound,{path:'projects/ngx-material-legacy/package.json'}]){const dest=join(fixture,row.path);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,readFileSync(resolve(source,row.path)));}
 const physical=p=>readFileSync(join(fixture,p)),owner=make({root:fixture,read:physical});
 const packet=JSON.parse(readFileSync('compatibility/rc/historical-repair-live-physical-continuation-v1.json'));
 const group=packet.groups.find(g=>g.path==='compatibility/rc/api/export-name-allowlist.json'),step=group.steps[0];
 const historical=execFileSync('git',['show',step.parent+':'+step.path],{cwd:source}),current=execFileSync('git',['show',step.commit+':'+step.path],{cwd:source});
 assert.equal(hash(historical),step.before.sha256);assert.equal(hash(current),step.after.sha256);assert.deepEqual(current,readFileSync(step.path));
 const allowlist=join(fixture,step.path);mkdirSync(dirname(allowlist),{recursive:true});writeFileSync(allowlist,current);
 const compare=ref=>{assert.deepEqual(ref,step.before);assert.equal(hash(readFileSync(allowlist)),step.after.sha256);return historical;};
 assertHistoricalLiveSupportComparison(historical,step.before,compare);
 assert.throws(()=>assertHistoricalLiveSupportComparison(historical,step.before,()=>current),/historical live support comparison mismatch/);
 try{writeFileSync(allowlist,Buffer.concat([current,Buffer.from('x')]));assert.throws(()=>assertHistoricalLiveSupportComparison(historical,step.before,compare));}finally{writeFileSync(allowlist,current);}
 assertHistoricalLiveSupportComparison(historical,step.before,compare);
 const epoch=JSON.parse(readFileSync('compatibility/rc/historical-repair-current-authored-epoch-v2.json')),oldest=epoch.transitions[1].before;
 const data=JSON.parse(physical('compatibility/rc/current-authored-tab-dispositions-continuation-v1.json'));
 const beforeA796=clean(owner.before),afterA796=clean(data.transitions[0].before);
 for(const ref of [oldest,beforeA796,afterA796,...data.transitions.map(row=>row.after)]){
  let sweeps=0;assert.deepEqual(qualifyHistoricalLiveAuthored(clean(ref),owner,oldest,()=>{sweeps++;owner.assertCurrent()}),owner.after);assert.equal(sweeps,1);
  const noBytes={path:ref.path,sha256:ref.sha256};assert.deepEqual(qualifyHistoricalLiveAuthored(noBytes,owner,oldest,()=>owner.assertCurrent()),{path:owner.after.path,sha256:owner.after.sha256});
 }
 assert.throws(()=>qualifyHistoricalLiveAuthored({...afterA796,sha256:'0'.repeat(64)},owner,oldest,()=>{}));
 assert.throws(()=>qualifyHistoricalLiveAuthored({...afterA796,bytes:1},owner,oldest,()=>{}));
 const mutate=clean(afterA796);assert.throws(()=>qualifyHistoricalLiveAuthored(mutate,owner,oldest,()=>{mutate.bytes=1}),/reference changed/);
 let armed=false,watched;watched=make({root:fixture,read:p=>{if(armed){try{watched.assertCurrent()}catch{}}return physical(p)}});armed=true;assert.throws(()=>qualifyHistoricalLiveAuthored(clean(afterA796),watched,oldest,()=>{}),/reentrant/);armed=false;watched.assertCurrent();
 console.log('PASS historical allowlist comparison and authored identity delegation controls');
} finally {rmSync(fixture,{recursive:true,force:true});}
