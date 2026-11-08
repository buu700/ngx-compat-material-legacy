/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Four exact launcher flag removals. Historical source is comparison data. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readCheckerOwnerMember} from './checker-owner-source.mjs';
const SELF='scripts/browser-sandbox-source-successor.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const refs=Object.freeze([
 ['scripts/browser-dialog-escape.mjs','34a443affc280dcc7500cfb08fd56755f1ee0d1305bf32d4fa62f01f6f3c9c13',26696,'010e55e5e7c80fe8b318d9d7a1fa801ce3303b4be9c7b88b567c89d122d87eb2',26678],
 ['scripts/browser-overlay-families.mjs','0ac1732c4ed2806aaaef6b3e50a3909ab5e9fbefc127e3673a4892db83b1de62',26782,'b75000a988b9c4bbb0256012e6da99a6779adc5b4ab3e2d9bce43509ee1e226f',26764],
 ['scripts/browser-form-families.mjs','fee6a1636db401f07f5402db9f60b9caf27cbb78b7649e3104fb484169d55a17',21585,'afee71948187d5aebcd2a42fa3f1bb16e0e2241edbce8aaa3421c3110c874a04',21567],
 ['scripts/browser-control-families.mjs','5fe2efe7ba7da0bdb8e884b09209b4dffcfc192c1247606fb346386946334049',23752,'42048392a84833409d4dc100354c931f0d493181accc0d882d78375548d54a6a',23734],
]);
export function browserSandboxSourceSuccessor({root,read,line}){
 assert.equal(line,'main');assert.equal(typeof read,'function');
 const physical=path=>readCheckerOwnerMember(root,path),env={PATH:process.env.PATH,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
 const parent='fdcdadee28c4552e3500b5099de9f42e456adb5c',commit='8e9e7316806fe9266373865b0784e9917659e5e8';
 assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',commit],{cwd:root,env,encoding:'utf8'}).trim(),commit+' '+parent);
 execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',commit,'HEAD'],{cwd:root,env});
 const bound=[{path:SELF,sha256:hash(image),bytes:image.length}],images=new Map();
 assert.ok(physical(SELF).equals(image));
 for(const [path,beforeHash,beforeLength,afterHash,afterLength] of refs){
  const before=execFileSync('git',['--no-replace-objects','show',parent+':'+path],{cwd:root,env,maxBuffer:2*1024*1024}),after=execFileSync('git',['--no-replace-objects','show',commit+':'+path],{cwd:root,env,maxBuffer:2*1024*1024});
  assert.equal(hash(before),beforeHash);assert.equal(before.length,beforeLength);assert.equal(hash(after),afterHash);assert.equal(after.length,afterLength);
  const text=before.toString('utf8'),needle="  '--no-sandbox',\n";assert.equal(text.split(needle).length,2);assert.ok(Buffer.from(text.replace(needle,'')).equals(after));
  images.set(path,{before,after});bound.push({path,sha256:afterHash,bytes:afterLength});
 }
 const assertCurrent=()=>{assert.ok(physical(SELF).equals(image));for(const ref of bound){const before=physical(ref.path),supplied=read(ref.path);assert.ok(Buffer.isBuffer(supplied)&&before.equals(supplied),'nonphysical sandbox source '+ref.path);assert.ok(before.equals(physical(ref.path)));assert.equal(hash(before),ref.sha256);assert.equal(before.length,ref.bytes);}assert.ok(physical(SELF).equals(image));};
 const qualify=ref=>{const row=refs.find(r=>r[0]===ref?.path);assert.ok(row,'unknown sandbox source');assert.ok(ref.sha256===row[1]||ref.sha256===row[3],'unknown sandbox predecessor');if(ref.bytes!==undefined)assert.equal(ref.bytes,ref.sha256===row[1]?row[2]:row[4]);assertCurrent();return {...ref,sha256:row[3],...(ref.bytes===undefined?{}:{bytes:row[4]})};};
 const comparisonBytes=ref=>{qualify(ref);const row=refs.find(r=>r[0]===ref.path);return Buffer.from(images.get(ref.path)[ref.sha256===row[1]?'before':'after']);};
 assertCurrent();return {bound:structuredClone(bound),qualify,comparisonBytes,assertCurrent};
}
