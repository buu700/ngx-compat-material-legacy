/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, renameSync, symlinkSync, unlinkSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {historicalRepairSelectSourceOwner} from '../scripts/historical-contract-repair-source.mjs';
const root=resolve('.'), temp=mkdtempSync(join(tmpdir(),'historical-select-owner-'));
const read=(base,path)=>readFileSync(join(base,path));
const put=(base,path,bytes)=>{const p=join(base,path);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const clean=r=>({path:r.path,sha256:r.sha256,bytes:r.bytes});
try {
 const receipt=JSON.parse(read(root,'compatibility/rc/proposed-main-select-v8-caller-source-continuations-v1.json'));
 assert.equal(receipt.source_parent,'e819975bc28c4d3a7d05beb81f2eb1202448384f');
 assert.deepEqual(receipt.transitions.map(r=>r.path),['scripts/historical-contract-repair-source.mjs','scripts/inventory-reference-proposal.mjs']);
 for(const row of receipt.transitions){
  const before=execFileSync('git',['show',receipt.source_parent+':'+row.path],{cwd:root,maxBuffer:2*1024*1024});
  assert.deepEqual({path:row.path,sha256:hash(before),bytes:before.length},row.before);
  let cursor=0;const parts=[];for(const edit of row.edits){const old=Buffer.from(edit.before);assert.ok(edit.offset>=cursor);assert.deepEqual(before.subarray(edit.offset,edit.offset+old.length),old);parts.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+old.length;}parts.push(before.subarray(cursor));
  const after=Buffer.concat(parts);assert.deepEqual({path:row.path,sha256:hash(after),bytes:after.length},row.after);
  const committed=execFileSync('git',['show','5959376779dd1fcce209c6077c0afb3b7e466865:'+row.path],{cwd:root,maxBuffer:2*1024*1024});assert.deepEqual(after,committed);
  if(row.path==='scripts/inventory-reference-proposal.mjs'){
   const parent='13801025c266396ff0129fe90a751bea7848ab98',commit='ecbb2126f24aab9eed97ba9082085c9c494787e9';
   assert.equal(execFileSync('git',['rev-list','--parents','-n','1',commit],{cwd:root,encoding:'utf8'}).trim(),commit+' '+parent);
   assert.deepEqual(committed,execFileSync('git',['show',parent+':'+row.path],{cwd:root,maxBuffer:2*1024*1024}));
   assert.deepEqual(read(root,row.path),execFileSync('git',['show',commit+':'+row.path],{cwd:root,maxBuffer:2*1024*1024}));
  }else assert.deepEqual(after,read(root,row.path));
 }
 const main=historicalRepairSelectSourceOwner({root,line:'main'});
 assert.equal(main.bound.length,27);
 const packet=JSON.parse(read(root,'compatibility/rc/parent-main-select-menu-sass-source-v7.json'));
 for(const row of packet.repairs){
   assert.deepEqual(main.qualify(clean(row.before)),main.qualify(clean(row.after)));
   assert.deepEqual(main.historicalReference(clean(row.before)),main.historicalReference(clean(row.after)));
   assert.throws(()=>main.qualify({...clean(row.after),sha256:'0'.repeat(64)}));
   assert.throws(()=>main.qualify({...clean(row.after),bytes:row.after.bytes+1}));
 }
 const current=join(temp,'main');mkdirSync(current);for(const r of main.bound)put(current,r.path,read(root,r.path));
 const gitdir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();
 writeFileSync(join(current,'.git'),'gitdir: '+gitdir+'\n');
 const local=historicalRepairSelectSourceOwner({root:current,line:'main'});
 for(const packetName of ['compatibility/rc/parent-main-select-escape-lifecycle-source-v8.json','compatibility/rc/parent-main-menu-animation-mode-source-v8.json']){
  const row=JSON.parse(read(current,packetName)).repair;
  assert.deepEqual(local.qualify(clean(row.before)),clean(row.after));
  assert.deepEqual(local.qualify(clean(row.after)),clean(row.after));
 }
 const oldOwner='scripts/select-dialog-finite-source-v7.mjs', oldBytes=read(current,oldOwner);
 try{put(current,oldOwner,Buffer.concat([oldBytes,Buffer.from('x')]));assert.throws(()=>local.assertCurrent());assert.throws(()=>historicalRepairSelectSourceOwner({root:current,line:'main'}));}finally{put(current,oldOwner,oldBytes);}
 for(const path of ['scripts/select-dialog-finite-source-v8.mjs','compatibility/rc/parent-main-select-escape-lifecycle-source-v8.json','compatibility/rc/parent-main-menu-animation-mode-source-v8.json']){
  const saved=read(current,path);try{put(current,path,Buffer.concat([saved,Buffer.from('x')]));assert.throws(()=>local.assertCurrent());assert.throws(()=>historicalRepairSelectSourceOwner({root:current,line:'main'}));}finally{put(current,path,saved);}
 }
 let armed=false;
 const changing=historicalRepairSelectSourceOwner({root:current,line:'main',read:p=>{const bytes=read(current,p);if(armed && p.endsWith('select.spec.ts'))put(current,oldOwner,Buffer.concat([oldBytes,Buffer.from('x')]));return bytes;}});
 try{armed=true;assert.throws(()=>changing.assertCurrent());}finally{put(current,oldOwner,oldBytes);}
 let active=false, reentrant;reentrant=historicalRepairSelectSourceOwner({root:current,line:'main',read:p=>{if(active){try{reentrant.assertCurrent();}catch{}}return read(current,p);}});active=true;assert.throws(()=>reentrant.assertCurrent(),/reentrant/);
 let changed=false;const target=JSON.parse(read(current,'compatibility/rc/parent-main-select-escape-lifecycle-source-v8.json')).repair.before;const ref=clean(target);
 const mutation=historicalRepairSelectSourceOwner({root:current,line:'main',read:p=>{if(changed)ref.bytes=1;return read(current,p);}});changed=true;assert.throws(()=>mutation.qualify(ref),/mutated/);

 for(const row of packet.repairs){const p=join(current,row.path),original=readFileSync(p),bad=Buffer.from(original);bad[0]^=1;writeFileSync(p,bad);assert.throws(()=>local.assertCurrent());assert.throws(()=>historicalRepairSelectSourceOwner({root:current,line:'main'}));writeFileSync(p,original);}
 renameSync(join(current,'scripts'),join(current,'scripts-real'));symlinkSync('scripts-real',join(current,'scripts'));assert.throws(()=>local.assertCurrent());assert.throws(()=>historicalRepairSelectSourceOwner({root:current,line:'main'}));unlinkSync(join(current,'scripts'));renameSync(join(current,'scripts-real'),join(current,'scripts'));local.assertCurrent();
 assert.throws(()=>historicalRepairSelectSourceOwner({root:current,line:'main',read:p=>{const b=read(current,p);if(p===packet.repairs[0].path)b[0]^=1;return b;}}));
 assert.throws(()=>historicalRepairSelectSourceOwner({root,line:'21.x'}));
 const old=join(temp,'old');mkdirSync(old);writeFileSync(join(old,'.git'),'gitdir: '+gitdir+'\n');
 const names=['scripts/select-dialog-finite-source-successor.mjs','compatibility/rc/parent-select-dialog-finite-source-v1.json','compatibility/rc/parent-select-dialog-menu-finite-source-v2.json','compatibility/rc/parent-select-dialog-menu-snack-finite-source-v3.json','compatibility/rc/parent-select-dialog-menu-snack-d61-menu-finite-source-v4.json'];
 for(const path of names)put(old,path,read(root,path));
 const packagePath='projects/ngx-material-legacy/package.json',pkg=JSON.parse(read(root,packagePath));pkg.version='21.0.0';put(old,packagePath,JSON.stringify(pkg));
 const branch=JSON.parse(read(root,names[4])).branches['21.x'];
 for(const row of [...branch.transitions,...branch.d61_menu_transitions]){
   const before=execFileSync('git',['show',row.source_parent+':'+row.path],{cwd:root,maxBuffer:2*1024*1024});
   assert.equal(hash(before),row.before.sha256);let cursor=0,chunks=[];
   for(const edit of row.edits){const b=Buffer.from(edit.before);assert.deepEqual(before.subarray(edit.offset,edit.offset+b.length),b);chunks.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+b.length;}
   chunks.push(before.subarray(cursor));const after=Buffer.concat(chunks);assert.equal(hash(after),row.after.sha256);put(old,row.path,after);
 }
 const seen=[],legacy=historicalRepairSelectSourceOwner({root:old,line:'21.x',read:p=>{seen.push(p);return read(old,p);}});
 assert.ok(legacy.bound.length>0);assert.ok(!seen.some(p=>p.includes('source-v7')||p.includes('sass-source-v7')));
 const row=branch.transitions[0];assert.deepEqual(legacy.qualify(clean(row.before)),clean(row.after));
 console.log('PASS: main v8 transitions, mutation and reentry controls; 21.x historical V4 source-owner route');
} finally {rmSync(temp,{recursive:true,force:true});}
