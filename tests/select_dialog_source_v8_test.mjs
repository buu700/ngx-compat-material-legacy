/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT license in LICENSE. */
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {selectDialogFiniteSuccessor} from '../scripts/select-dialog-finite-source-v8.mjs';
const sourceRoot=process.cwd();
const sourceRead=p=>readFileSync(resolve(sourceRoot,p));
const source=selectDialogFiniteSuccessor({root:sourceRoot,line:'main',read:sourceRead});
const gitDir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:sourceRoot,encoding:'utf8'}).trim();
const root=mkdtempSync(join(tmpdir(),'select-dialog-v8-'));
try {
  writeFileSync(join(root,'.git'),'gitdir: '+gitDir+'\n');
  for(const row of source.bound) {
    const target=resolve(root,row.path);
    mkdirSync(dirname(target),{recursive:true});
    writeFileSync(target,sourceRead(row.path));
  }
const physical=p=>readFileSync(resolve(root,p));
const write=(p,bytes)=>writeFileSync(resolve(root,p),bytes);
const spec='projects/ngx-material-legacy/legacy-select/select.spec.ts';
const menu='projects/ngx-material-legacy/legacy-menu/menu.spec.ts';
const packet='compatibility/rc/parent-main-select-escape-lifecycle-source-v8.json';
const create=read=>selectDialogFiniteSuccessor({root,line:'main',read});
const initial=create(physical);
const old={path:spec,sha256:'0026c159543c040dc5e8c85baf25f37ec12130cab91841ff651eb96c797940fc',bytes:233115};
const current={path:spec,sha256:'b5d7beb6119249251920eb98e9503b9b86cc35ef9349ac82bb290c38e804ac0a',bytes:238826};
assert.deepEqual(initial.qualify(old),current);assert.deepEqual(initial.historicalReference(current).path,spec);
assert.deepEqual(initial.qualify({path:menu,sha256:'1f6c9025f1b04dc994e5e77247399546a2464c2281a01a46adeb50c828322321',bytes:144721}),{path:menu,sha256:'1618f102fbd28b4d8c8eeb1b2d71e10e409f2ad103ebf8082e2b0d27517d6d65',bytes:144775});
assert.throws(()=>initial.qualify({...old,sha256:'0'.repeat(64)}),/unknown select predecessor/);
assert.throws(()=>initial.qualify({...old,bytes:1}));
for(const path of [spec,menu,packet]) {const saved=physical(path);try{write(path,Buffer.concat([saved,Buffer.from('x')]));assert.throws(()=>initial.assertPhysical(),/changed physical/);assert.throws(()=>create(physical));}finally{write(path,saved);}}
assert.throws(()=>create(p=>p===spec?Buffer.from('substitute'):physical(p)),/nonphysical/);
let owner, trigger=false;
owner=create(p=>{if(trigger){try{owner.assertCurrent();}catch{}}return physical(p)});
trigger=true;assert.throws(()=>owner.assertCurrent(),/reentrant/);
let target, mutate=false;target={...old};
owner=create(p=>{if(mutate && p===spec)target.bytes=1;return physical(p)});mutate=true;
assert.throws(()=>owner.qualify(target),/reference mutated/);
let swap=false;owner=create(p=>{const b=physical(p);if(swap && p===spec)write(p,Buffer.concat([b,Buffer.from('x')]));return b});
const saved=physical(spec);try{swap=true;assert.throws(()=>owner.assertCurrent(),/changed during callback/);}finally{write(spec,saved);}
let cross=false;owner=create(p=>{const b=physical(p);if(cross && p===menu)write(spec,Buffer.concat([saved,Buffer.from('x')]));return b});
try{cross=true;assert.throws(()=>owner.assertCurrent(),/changed physical/);}finally{write(spec,saved);}
initial.assertCurrent();console.log('select/dialog v8: positive and negative controls passed');

} finally { rmSync(root,{recursive:true,force:true}); }
