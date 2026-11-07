/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact source-only executable transitions; historical code is comparison data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const SELF='scripts/stepper-program-transition-source.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const SHA=raw=>createHash('sha256').update(raw).digest('hex');
const paths=[['compatibility/rc/current-sass-stepper-source-executables-v1.json','577ca8a935a6f431ed282769be29d84686c109a94faef9174de0091754e59d61','main-stepper-current-source-executable-successor',['scripts/current-sass-source.mjs','scripts/current_sass_source.py']],['compatibility/rc/current-sass-stepper-spinner-executables-v1.json','2b2440b6f1b870e456d8585129e99270dffd90fc03842ab0944d555908b7b760','main-stepper-spinner-source-executable-successor',['scripts/current-sass-spinner-snack-contract.mjs','scripts/current_sass_spinner_snack_admission.py']]];
export function stepperProgramTransitions({root,line,read}){
 assert.equal(typeof read,'function');if(line!=='main')return {refs:new Map(),assertCurrent:()=>{}};
 const physical=path=>{assert.equal(typeof path,'string');assert.ok(path&&!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(x=>x&&x!=='.'&&x!=='..'));let cursor=root;for(const part of path.split('/')){cursor=join(cursor,part);assert.ok(!lstatSync(cursor).isSymbolicLink());}assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);};
 const bound=new Map(),take=path=>{const actual=physical(path),bytes=read(path);assert.ok(Buffer.isBuffer(bytes)&&actual.equals(bytes)&&physical(path).equals(actual),'nonphysical Stepper program input '+path);if(bound.has(path))assert.ok(actual.equals(bound.get(path)));else bound.set(path,Buffer.from(actual));return actual;};
 assert.ok(take(SELF).equals(image),'changed loaded Stepper program authority');const refs=new Map();
 const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
 for(const [path,pin,role,members] of paths){
  const raw=take(path);assert.equal(SHA(raw),pin);const packet=JSON.parse(raw);
  assert.equal(packet.schema_version,1);assert.equal(packet.role,role);assert.equal(packet.line,'main');assert.equal(packet.source_parent,'42d02491648097656ccb3c590dbaaea066c3e603');assert.equal(packet.source_scope_only,true);assert.equal(packet.artifact_or_audit_admission_granted,false);assert.deepEqual(packet.updates.map(r=>r.path),members);
  for(const row of packet.updates){
   const old=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+row.path],{cwd:root,env});
   assert.deepEqual({path:row.path,sha256:SHA(old),bytes:old.length},row.before);let at=0;const parts=[];
   for(const edit of row.edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=at);const before=Buffer.from(edit.before),after=Buffer.from(edit.after);assert.ok(old.subarray(edit.offset,edit.offset+before.length).equals(before));parts.push(old.subarray(at,edit.offset),after);at=edit.offset+before.length;}
   const after=Buffer.concat([...parts,old.subarray(at)]);assert.deepEqual({path:row.path,sha256:SHA(after),bytes:after.length},row.after);assert.ok(take(row.path).equals(after));refs.set(row.path,row.after.sha256);
  }
 }
 const assertCurrent=()=>{for(const[path,bytes]of bound)assert.ok(take(path).equals(bytes),'changed Stepper program input '+path);for(const[path,bytes]of bound)assert.ok(physical(path).equals(bytes),'late Stepper program input '+path);};assertCurrent();return {refs,assertCurrent};
}
