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
 const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PACKET_HASH,bytes:packetRaw.length},{...row.after}];
 const physicalSweep=()=>{for(const ref of bound){const raw=physical(ref.path);assert.equal(hash(raw),ref.sha256,'changed physical browser zone successor '+ref.path);assert.equal(raw.length,ref.bytes);}assert.ok(equal(physical(SELF),image),'changed loaded browser zone successor');};
 physicalSweep();
 const before=git(root,row.old_commit,path),committed=git(root,row.new_commit,path);
 assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
 assert.equal(hash(committed),row.after.sha256);assert.equal(committed.length,row.after.bytes);
 let cursor=0;const parts=[];
 for(const edit of row.edits){const offset=edit.offset,old=Buffer.from(edit.before),replacement=Buffer.from(edit.after);assert.ok(Number.isSafeInteger(offset)&&offset>=cursor);assert.ok(equal(before.subarray(offset,offset+old.length),old));parts.push(before.subarray(cursor,offset),replacement);cursor=offset+old.length;}
 parts.push(before.subarray(cursor));assert.ok(equal(Buffer.concat(parts),committed),'browser zone literal successor differs');
 const assertCurrent=()=>{physicalSweep();for(const ref of bound){const raw=current(ref.path);assert.equal(hash(raw),ref.sha256,'changed browser zone successor '+ref.path);assert.equal(raw.length,ref.bytes);}physicalSweep();};
 assertCurrent();return {before:{...row.before},after:{...row.after},bound:structuredClone(bound),assertCurrent,assertPhysical:physicalSweep};
}
