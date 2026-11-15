/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT license in LICENSE. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {currentToolMatrixSource} from '../scripts/current-tool-matrix-source.mjs';
const source=process.cwd(),matrix=currentToolMatrixSource({root:source});
const fixture=mkdtempSync(join(tmpdir(),'matrix-continuation-'));
try {
 writeFileSync(join(fixture,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:source,encoding:'utf8'}).trim()+'\n');
 for(const ref of matrix.bound){const target=join(fixture,ref.path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(resolve(source,ref.path)));}
 const result=execFileSync(process.execPath,['tests/current_tool_matrix_source_probe.mjs',fixture],{cwd:source,encoding:'utf8',maxBuffer:4*1024*1024});
 if(!JSON.parse(result).result.includes('pass'))throw Error('matrix probe did not pass');
 const packet='compatibility/rc/current-tool-matrix-inventory-ce9-source-v1.json',inventory='testing/legacy-runner/historical-inventory.json';
 const owner=currentToolMatrixSource({root:fixture}),file=join(fixture,packet),saved=readFileSync(file);
 try{writeFileSync(file,Buffer.concat([saved,Buffer.from('x')]));assert.throws(()=>owner.assertCurrent());assert.throws(()=>currentToolMatrixSource({root:fixture}));}finally{writeFileSync(file,saved);}
 owner.assertCurrent();
 const prior=execFileSync('git',['show','cd7830f9f2feeeb639ac0dd99efcd3dc610a22c2:'+inventory],{cwd:fixture,maxBuffer:2*1024*1024});
 assert.throws(()=>currentToolMatrixSource({root:fixture,read:p=>p===inventory?prior:readFileSync(join(fixture,p))}),/nonphysical/);
 owner.assertCurrent();
 console.log('PASS matrix source mutation, callback, reference, reentry and recovery controls');
} finally {rmSync(fixture,{recursive:true,force:true});}
