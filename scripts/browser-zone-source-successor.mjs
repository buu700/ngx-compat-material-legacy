/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact reviewed current browser helper successor; old bytes remain Git data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {readCheckerOwnerMember} from './checker-owner-source.mjs';
const SELF='scripts/browser-zone-source-successor.mjs';
const PACKET='compatibility/rc/parent-zone-binder-finite-transition-v1.json';
const PACKET_HASH='4ab8f480bd816ef901133e5e3e397ccda61e6add95859e696a660447103afe0c';
const image=readFileSync(fileURLToPath(import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const equals=Buffer.prototype.equals;
const equal=(a,b)=>Buffer.isBuffer(b)&&Reflect.apply(equals,a,[b]);
function git(root,commit,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
 for(const key of Object.keys(env))if(key.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(key))delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:2*1024*1024});
}
export function browserZoneSourceSuccessor({root,read,line}){
 assert.ok(line==='21.x'||line==='main');assert.equal(typeof read,'function');
 const physical=path=>readCheckerOwnerMember(root,path),current=path=>{
  const before=physical(path),supplied=read(path);assert.ok(equal(before,supplied),'nonphysical browser zone source '+path);
  assert.ok(equal(before,physical(path)),'browser zone source changed during callback '+path);return before;
 };
 // Compare the loaded helper image before the first supplied callback.
 assert.ok(equal(physical(SELF),image),'loaded browser zone successor changed');
 const packetRaw=physical(PACKET);assert.equal(hash(packetRaw),PACKET_HASH);const packet=JSON.parse(packetRaw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'proposed-exact-browser-zone-and-source-binding-successor');
 assert.equal(packet.historical_packets_rewritten,false);assert.equal(packet.old_programs_executed,false);assert.equal(packet.native_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const row=packet.browser[line],path='scripts/browser-required-cells.mjs';assert.equal(row.path,path);assert.equal(row.before.path,path);assert.equal(row.after.path,path);
 // The later main launcher fix removes exactly one sandbox-disabling flag.
 // Retain the zone transition as historical data and authenticate its successor.
 let terminal={...row.after};
 if(line==='main'){
  const parent='fdcdadee28c4552e3500b5099de9f42e456adb5c',commit='8e9e7316806fe9266373865b0784e9917659e5e8';
  const env={PATH:process.env.PATH,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
  assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',commit],{cwd:root,env,encoding:'utf8'}).trim(),commit+' '+parent);
  execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',commit,'HEAD'],{cwd:root,env});
  const prior=git(root,parent,path),next=git(root,commit,path);
  assert.equal(hash(prior),row.after.sha256);assert.equal(prior.length,row.after.bytes);
  const text=prior.toString('utf8'),needle="    '--no-sandbox',\n";
  assert.equal(text.split(needle).length,2);assert.ok(equal(Buffer.from(text.replace(needle,'')),next));
  assert.equal(hash(next),'1ff46b8442f8b66fa92d3b8340c0169950007e8e9a19bfc5630bc36bf806e0b2');assert.equal(next.length,64913);
  terminal={path,sha256:hash(next),bytes:next.length};
 }
 const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PACKET_HASH,bytes:packetRaw.length},terminal];
 const physicalSweep=()=>{for(const ref of bound){const raw=physical(ref.path);assert.equal(hash(raw),ref.sha256,'changed physical browser zone successor '+ref.path);assert.equal(raw.length,ref.bytes);}assert.ok(equal(physical(SELF),image),'changed loaded browser zone successor');};
 physicalSweep();
 const before=git(root,row.old_commit,path),committed=git(root,row.new_commit,path);
 assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
 assert.equal(hash(committed),row.after.sha256);assert.equal(committed.length,row.after.bytes);
 let cursor=0;const parts=[];
 for(const edit of row.edits){const offset=edit.offset,old=Buffer.from(edit.before),replacement=Buffer.from(edit.after);assert.ok(Number.isSafeInteger(offset)&&offset>=cursor);assert.ok(equal(before.subarray(offset,offset+old.length),old));parts.push(before.subarray(cursor,offset),replacement);cursor=offset+old.length;}
 parts.push(before.subarray(cursor));assert.ok(equal(Buffer.concat(parts),committed),'browser zone literal successor differs');
 const assertCurrent=()=>{physicalSweep();for(const ref of bound){const raw=current(ref.path);assert.equal(hash(raw),ref.sha256,'changed browser zone successor '+ref.path);assert.equal(raw.length,ref.bytes);}physicalSweep();};
 assertCurrent();return {before:{...row.before},after:{...terminal},bound:structuredClone(bound),assertCurrent,assertPhysical:physicalSweep};
}
