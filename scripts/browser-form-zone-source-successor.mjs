/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite reviewed browser form source transition; historical bytes are data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {readCheckerOwnerMember} from './checker-owner-source.mjs';
const SELF='scripts/browser-form-zone-source-successor.mjs';
const PACKET='compatibility/rc/parent-zone-form-successor-v1.json';
const PACKET_HASH='a900cfaad6fd64bbb77b2fa5ab2326d99191de8af9dd4e410d4ba22f28c9e63f';
const image=readFileSync(fileURLToPath(import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>Buffer.isBuffer(a)&&Buffer.isBuffer(b)&&a.equals(b);
function original(root,commit,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
 for(const key of Object.keys(env))if(key.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(key))delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:2*1024*1024});
}
export function browserFormZoneSourceSuccessor({root,read,line}){
 assert.ok(line==='21.x'||line==='main');assert.equal(typeof read,'function');
 const physical=path=>readCheckerOwnerMember(root,path);
 const current=path=>{const first=physical(path),value=read(path);assert.ok(same(first,value),'nonphysical browser form zone source '+path);assert.ok(same(first,physical(path)),'browser form zone source changed during callback '+path);return first;};
 assert.ok(same(physical(SELF),image),'loaded browser form zone source changed');
 const packetRaw=physical(PACKET);assert.equal(hash(packetRaw),PACKET_HASH);const packet=JSON.parse(packetRaw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-browser-form-zone-runtime-successor');assert.equal(packet.historical_packets_rewritten,false);assert.equal(packet.old_programs_executed,false);assert.equal(packet.native_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const row=packet.lines[line];assert.equal(row.path,'scripts/browser-form-families.mjs');assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);
 const packagePath='projects/ngx-material-legacy/package.json',packageRaw=physical(packagePath),version=JSON.parse(packageRaw).version;assert.equal(version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null,line,'browser form package line mismatch');assert.equal(hash(packageRaw),line==='21.x'?'757aa562a156f04ff55ef86bc2d886049a1fc78da2ead2c0f82112ca58d9c43d':'ba8ba4b6094c4b57b5a0bb322deb1fd01c43421690cbd4e686297d0550096c2c','browser form package identity changed');
 const oldPacket=physical(row.reference_packet.path);assert.equal(hash(oldPacket),row.reference_packet.sha256);const prior=JSON.parse(oldPacket);assert.equal(prior.line,line);assert.deepEqual(prior.transitions[row.reference_packet.transition_index].after,row.before);
 const old=original(root,row.before_commit,row.path);assert.equal(hash(old),row.before.sha256);assert.equal(old.length,row.before.bytes);
 const bound=[{path:packagePath,sha256:hash(packageRaw),bytes:packageRaw.length},{path:SELF,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PACKET_HASH,bytes:packetRaw.length},{path:row.reference_packet.path,sha256:row.reference_packet.sha256,bytes:oldPacket.length},{...row.after}];
 const physicalSweep=()=>{for(const ref of bound){const raw=physical(ref.path);assert.equal(hash(raw),ref.sha256,'changed physical browser form zone successor '+ref.path);assert.equal(raw.length,ref.bytes);}assert.ok(same(physical(SELF),image),'changed loaded browser form zone successor');};
 physicalSweep();let cursor=0;const parts=[];for(const edit of row.edits){const before=Buffer.from(edit.before),after=Buffer.from(edit.after);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor&&edit.offset<=old.length);assert.ok(same(old.subarray(edit.offset,edit.offset+before.length),before));parts.push(old.subarray(cursor,edit.offset),after);cursor=edit.offset+before.length;}parts.push(old.subarray(cursor));assert.ok(same(Buffer.concat(parts),physical(row.path)),'browser form literal successor differs');
 const assertCurrent=()=>{physicalSweep();for(const ref of bound){const raw=current(ref.path);assert.equal(hash(raw),ref.sha256,'changed browser form zone successor '+ref.path);assert.equal(raw.length,ref.bytes);}physicalSweep();};
 const qualify=ref=>ref?.path===row.before.path&&ref?.sha256===row.before.sha256&&ref?.bytes===row.before.bytes?{...row.after}:null;
 assertCurrent();return {before:{...row.before},after:{...row.after},bound:structuredClone(bound),qualify,assertCurrent,assertPhysical:physicalSweep};
}
