/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,renameSync,symlinkSync,unlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {historicalRepairFocusSourceOwner as owner} from '../scripts/historical-contract-repair-source.mjs';
assert.ok(process.env.HISTORICAL_FOCUS_21_ROOT,'set HISTORICAL_FOCUS_21_ROOT to the pinned 21.x source frame');
const roots={main:resolve('.'),'21.x':resolve(process.env.HISTORICAL_FOCUS_21_ROOT)};
const temp=mkdtempSync(join(tmpdir(),'historical-focus-owner-'));
const read=(root,path)=>readFileSync(join(root,path));
const put=(root,path,bytes)=>{const p=join(root,path);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);};
const clean=r=>({path:r.path,sha256:r.sha256,bytes:r.bytes});
try{
 for(const line of ['main','21.x']){
  const root=roots[line],initial=owner({root,line}),work=join(temp,line);mkdirSync(work);
  for(const ref of initial.bound)put(work,ref.path,read(root,ref.path));
  for(const path of ['projects/ngx-material-legacy/package.json','node_modules/@angular/core/package.json'])put(work,path,read(root,path));
  writeFileSync(join(work,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim()+'\n');
  const seen=[],subject=owner({root:work,line,read:p=>{seen.push(p);return read(work,p);}});
  if(line==='21.x')assert.ok(!seen.some(p=>p.includes('focus-finite-source-v6')||p.includes('focus-sass-source-v6')));
  const transitions=subject.packet.branches[line].transitions;
  for(const row of transitions){
   const old=clean(row.before),current=subject.qualify(old);
   assert.deepEqual(subject.qualify(current),current);
   assert.deepEqual(subject.historicalReference(current),old);
   assert.throws(()=>subject.qualify({...old,sha256:'0'.repeat(64)}));
   assert.throws(()=>subject.qualify({...old,bytes:old.bytes+1}));
  }
  if(line==='main'){
   const epoch=JSON.parse(read(work,'compatibility/rc/parent-main-dialog-focus-sass-source-v6.json'));
   assert.deepEqual(subject.qualify(clean(epoch.before)),clean(epoch.after));
   assert.deepEqual(subject.qualify(clean(epoch.after)),clean(epoch.after));
   assert.deepEqual(subject.historicalReference(clean(epoch.before)),subject.historicalReference(clean(epoch.after)));
  }
  for(const ref of subject.bound){
   const target=join(work,ref.path),original=readFileSync(target),mutant=Buffer.from(original);mutant[0]^=1;writeFileSync(target,mutant);
   assert.throws(()=>subject.assertCurrent());assert.throws(()=>subject.qualify(clean(transitions[0].before)));assert.throws(()=>subject.historicalReference(clean(transitions[0].after)));writeFileSync(target,original);
  }
  for(const path of ['projects/ngx-material-legacy/package.json','node_modules/@angular/core/package.json']){
   const target=join(work,path),original=readFileSync(target),mutant=Buffer.from(original);mutant[0]^=1;writeFileSync(target,mutant);
   assert.throws(()=>subject.assertCurrent());assert.throws(()=>subject.qualify(clean(transitions[0].before)));writeFileSync(target,original);
  }
  for(const ref of subject.bound.filter(r=>r.path.startsWith('node_modules/@angular/core/types/'))){
   const target=join(work,ref.path),saved=target+'-real';renameSync(target,saved);symlinkSync(saved,target);
   assert.throws(()=>subject.assertCurrent());assert.throws(()=>subject.qualify(clean(transitions[0].before)));assert.throws(()=>owner({root:work,line}));unlinkSync(target);renameSync(saved,target);
  }
  renameSync(join(work,'scripts'),join(work,'scripts-real'));symlinkSync('scripts-real',join(work,'scripts'));
  assert.throws(()=>subject.assertCurrent());assert.throws(()=>owner({root:work,line}));unlinkSync(join(work,'scripts'));renameSync(join(work,'scripts-real'),join(work,'scripts'));subject.assertCurrent();
  assert.throws(()=>owner({root:work,line,read:p=>{const b=read(work,p);if(p===transitions[0].path)b[0]^=1;return b;}}));
  let retained,attempt=false;
  retained=owner({root:work,line,read:p=>{if(attempt){attempt=false;try{retained.assertPhysical();}catch{}}return read(work,p);}});
  attempt=true;assert.throws(()=>retained.assertCurrent(),/reentr/);assert.equal(attempt,false);retained.assertCurrent();
  const late=subject.bound.find(r=>r.path.startsWith('node_modules/@angular/core/types/')),target=join(work,late.path),original=readFileSync(target);let fired=false;
  assert.throws(()=>owner({root:work,line,read:p=>{const b=read(work,p);if(!fired){fired=true;const m=Buffer.from(original);m[0]^=1;writeFileSync(target,m);}return b;}}));assert.ok(fired);writeFileSync(target,original);subject.assertCurrent();
  console.log('PASS',line,subject.bound.length,'physical members, historical/current comparisons, mutation, callback and symlink controls');
 }
}finally{rmSync(temp,{recursive:true,force:true});}
