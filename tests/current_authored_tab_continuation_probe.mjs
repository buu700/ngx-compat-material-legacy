/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT license in LICENSE. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {currentAuthoredTabSourceSuccessor as make} from '../scripts/current-authored-tab-source-successor.mjs';
const source=process.cwd(),base=make({root:source}),fixture=mkdtempSync(join(tmpdir(),'authored-tab-continuation-'));
try {
 writeFileSync(join(fixture,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:source,encoding:'utf8'}).trim()+'\n');
 for(const row of [...base.bound,{path:'projects/ngx-material-legacy/package.json'}]){const target=join(fixture,row.path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(resolve(source,row.path)));}
 const physical=p=>readFileSync(join(fixture,p)),owner=make({root:fixture,read:physical});
 assert.deepEqual(owner.qualify(owner.before),owner.after);assert.deepEqual(owner.qualify(owner.after),owner.after);
 const data=JSON.parse(physical('compatibility/rc/current-authored-tab-dispositions-continuation-v1.json'));
 for(const row of data.transitions)assert.deepEqual(owner.qualify(row.after),owner.after);
 assert.throws(()=>owner.qualify({...owner.before,sha256:'0'.repeat(64)}));assert.throws(()=>owner.qualify({...owner.before,bytes:1}));
 for(const p of [data.transitions[0].path,'compatibility/rc/current-authored-tab-dispositions-continuation-v1.json']){const path=join(fixture,p),raw=physical(p);try{writeFileSync(path,Buffer.concat([raw,Buffer.from('x')]));assert.throws(owner.assertCurrent);assert.throws(()=>make({root:fixture}));}finally{writeFileSync(path,raw);}owner.assertCurrent();}
 assert.throws(()=>make({root:fixture,read:p=>p===data.transitions[0].path?Buffer.from('bad'):physical(p)}));
 let armed=false,watch;watch=make({root:fixture,read:p=>{if(armed){try{watch.assertCurrent();}catch{}}return physical(p)}});armed=true;assert.throws(watch.assertCurrent,/reentrant/);armed=false;watch.assertCurrent();
 let mutate=false,ref={...owner.before};const changes=make({root:fixture,read:p=>{if(mutate)ref.bytes=1;return physical(p)}});mutate=true;assert.throws(()=>changes.qualify(ref),/reference changed/);mutate=false;owner.assertCurrent();
 console.log('PASS authored tab finite chain, mutation, callback, reentry and recovery controls');
} finally {rmSync(fixture,{recursive:true,force:true});}
