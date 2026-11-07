/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,renameSync,rmSync,symlinkSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {fileURLToPath} from 'node:url';
import {selectDialogFiniteSuccessor} from '../scripts/select-dialog-finite-source-v6.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),clone=mkdtempSync(join(tmpdir(),'select-v6-'));
const packet='compatibility/rc/parent-select-dialog-menu-reviewed-repair-source-v6.json', helper='scripts/select-dialog-finite-source-v6.mjs',old='scripts/select-dialog-finite-source-successor.mjs';
const data=JSON.parse(readFileSync(join(root,packet))); const paths=data.repairs.map(r=>r.path);
const mutate=(path,value)=>{const p=join(clone,path),t=p+'.isolated';writeFileSync(t,value);renameSync(t,p);};
try {
 execFileSync('cp',['-a','-l',root+'/.',clone]);
 const read=p=>readFileSync(join(clone,p));const x=selectDialogFiniteSuccessor({root:clone,line:'main',read});x.assertCurrent();
 assert.throws(()=>selectDialogFiniteSuccessor({root:clone,line:'21.x',read}),/main-only/);
 for(const r of data.repairs){for(const side of ['before','after']){const result=x.qualify({path:r.path,sha256:r[side].sha256,bytes:r[side].bytes});assert.deepEqual(result,{path:r.path,sha256:r.after.sha256,bytes:r.after.bytes});}assert.throws(()=>x.qualify({path:r.path,sha256:'0'.repeat(64)}),/unknown select predecessor/);}
 let count=0;const object={path:paths[0],sha256:data.repairs[0].before.sha256};Object.defineProperty(object,'sha256',{get(){count++;throw Error('getter');}});assert.throws(()=>x.qualify(object),/data properties/);assert.equal(count,0);
 assert.throws(()=>selectDialogFiniteSuccessor({root:clone,line:'main',read:p=>p===paths[0]?Buffer.from('forged'):read(p)}),/nonphysical/);
 for(const path of [...paths,packet,helper,old]){const bytes=read(path);try{mutate(path,Buffer.concat([bytes,Buffer.from('\n')]));assert.throws(()=>x.assertCurrent(),/changed|source|successor|deep-equal/i);assert.throws(()=>selectDialogFiniteSuccessor({root:clone,line:'main',read}));}finally{mutate(path,bytes);}}
 let armed=false,target;const callback=p=>{if(armed){armed=false;const bytes=read(target);mutate(target,Buffer.concat([bytes,Buffer.from('\n')]));}return read(p);};const y=selectDialogFiniteSuccessor({root:clone,line:'main',read:callback});
 for(const path of [paths[0],paths[1],packet,old]){const bytes=read(path);try{target=path;armed=true;assert.throws(()=>y.assertCurrent(),/changed|source|successor|deep-equal/i);}finally{armed=false;mutate(path,bytes);}}
 y.assertCurrent(); console.log('PASS exact prior/current images, cold/late source and helper mutations, forged callback and callback side effects');
} finally {rmSync(clone,{recursive:true,force:true});}
