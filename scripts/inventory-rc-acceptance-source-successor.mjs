/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current main inventory source member, reconstructed from Git data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {readCheckerOwnerMember} from './checker-owner-source.mjs';
const SELF='scripts/inventory-rc-acceptance-source-successor.mjs',PACKET='compatibility/rc/parent-inventory-rc-acceptance-finite-successor-v1.json';
const PIN='0ca5086955c42abaabbf0ba2c8ed91c12c2e62ec0694a658481d7006982b947b';
const V2='compatibility/rc/parent-inventory-rc-acceptance-finite-successor-v2.json',V2PIN='a25921136321ab375b2f2afa71c9237e615c80bf8967562c8b544a297d461db1';
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex'),equals=Buffer.prototype.equals;
const equal=(a,b)=>Buffer.isBuffer(b)&&Reflect.apply(equals,a,[b]);
function git(root,...args){const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};for(const k of Object.keys(env))if(k.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(k))delete env[k];return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:2*1024*1024});}
export function inventoryRcAcceptanceSourceSuccessor({root,read}){
 assert.equal(typeof read,'function');const physical=p=>readCheckerOwnerMember(root,p),current=p=>{const actual=physical(p),provided=read(p);assert.ok(equal(actual,provided),'nonphysical inventory rc source '+p);assert.ok(equal(actual,physical(p)),'inventory rc source changed during callback '+p);return actual;};
 assert.ok(equal(physical(SELF),image),'changed loaded inventory rc successor');const raw=physical(PACKET);assert.equal(hash(raw),PIN);const packet=JSON.parse(raw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'main-inventory-rc-acceptance-finite-successor');assert.equal(packet.line,'main');assert.equal(packet.old_programs_executed,false);assert.equal(packet.historical_packets_rewritten,false);assert.equal(packet.g11_claim,'not-passed');assert.equal(packet.actual_native_packed_browser_floor_or_full_audit_qualified,false);
 assert.equal(packet.before.path,'scripts/rc_acceptance.py');assert.equal(packet.after.path,packet.before.path);assert.equal(packet.source_member_index,11);
 const sourceRef=packet.inventory_source_packet;assert.equal(sourceRef.path,'compatibility/rc/c04-inventory-owner-inputs.json');assert.equal(sourceRef.sha256,'97db675e4fda1c6dd4a7f056159bd47e2aa963dddb9dff3da1af537ae062d15a');
 const nextRaw=physical(V2);assert.equal(hash(nextRaw),V2PIN);const next=JSON.parse(nextRaw);
 assert.equal(next.schema_version,2);assert.equal(next.role,packet.role);assert.equal(next.line,'main');
 assert.deepEqual(next.previous_epoch,{path:PACKET,sha256:PIN,bytes:raw.length});assert.deepEqual(next.before,packet.after);
 assert.equal(next.old_commit,'7870ef230c0e980d8b58eab81374358142eca065');assert.equal(next.new_commit,'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde');
 assert.equal(next.old_programs_executed,false);assert.equal(next.historical_packets_rewritten,false);assert.equal(next.g11_claim,'not-passed');
 const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PIN,bytes:raw.length},{path:V2,sha256:V2PIN,bytes:nextRaw.length},{...sourceRef},{...next.after},...next.receipts];
 const sweep=()=>{for(const ref of bound){const bytes=physical(ref.path);assert.equal(hash(bytes),ref.sha256,'changed physical inventory rc successor '+ref.path);assert.equal(bytes.length,ref.bytes);}assert.ok(equal(physical(SELF),image));};
 sweep();const source=JSON.parse(physical(sourceRef.path));assert.deepEqual(source.source_members[packet.source_member_index],packet.before);
 for(const c of [packet.old_commit,packet.new_commit])assert.match(c,/^[0-9a-f]{40}$/);
 assert.equal(git(root,'rev-parse',packet.new_commit+'^').toString().trim(),packet.old_commit);
 const before=git(root,'show',packet.old_commit+':'+packet.before.path),after=git(root,'show',packet.new_commit+':'+packet.after.path);
 for(const [bytes,ref] of [[before,packet.before],[after,packet.after]]){assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);}
 let cursor=0;const parts=[];for(const edit of packet.edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor&&edit.offset<=before.length);assert.equal(typeof edit.before,'string');assert.equal(typeof edit.after,'string');const old=Buffer.from(edit.before);assert.ok(equal(before.subarray(edit.offset,edit.offset+old.length),old));parts.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+old.length;}assert.ok(equal(Buffer.concat([...parts,before.subarray(cursor)]),after),'inventory rc literal replay differs');
 const nextBefore=git(root,'show',next.old_commit+':'+next.before.path),nextAfter=git(root,'show',next.new_commit+':'+next.after.path);
 assert.ok(equal(nextBefore,after));assert.equal(hash(nextAfter),next.after.sha256);assert.equal(nextAfter.length,next.after.bytes);
 cursor=0;const nextParts=[];for(const edit of next.edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor&&edit.offset<=nextBefore.length);assert.equal(typeof edit.before,'string');assert.equal(typeof edit.after,'string');const old=Buffer.from(edit.before);assert.ok(equal(nextBefore.subarray(edit.offset,edit.offset+old.length),old));nextParts.push(nextBefore.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+old.length;}assert.ok(equal(Buffer.concat([...nextParts,nextBefore.subarray(cursor)]),nextAfter),'inventory rc v2 literal replay differs');
 const assertCurrent=()=>{sweep();for(const ref of bound){const bytes=current(ref.path);assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);}sweep();};
 const qualify=ref=>{if(ref?.path!==packet.before.path)return null;const old=[packet.before,packet.after,next.after].find(item=>ref.sha256===item.sha256);assert.ok(old,'unknown inventory rc source reference');if(ref.bytes!==undefined)assert.equal(ref.bytes,old.bytes);return {...ref,sha256:next.after.sha256,...(ref.bytes===undefined?{}:{bytes:next.after.bytes})};};
 assertCurrent();return {bound:structuredClone(bound),qualify,assertCurrent,assertPhysical:sweep};
}
