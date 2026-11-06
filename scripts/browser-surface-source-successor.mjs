/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two exact reviewed browser-surface inputs; historical images are DATA only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {readCheckerOwnerMember} from './checker-owner-source.mjs';
const SELF='scripts/browser-surface-source-successor.mjs';
const PACKET='compatibility/rc/parent-browser-surface-finite-successor-v1.json';
const PACKET_SHA='e4f5c029f3c2b88359920ac3aad5d344e86e163fcc323b407d413e7e35d08e4e';
const image=readFileSync(fileURLToPath(import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const equals=Buffer.prototype.equals;
const equal=(a,b)=>Buffer.isBuffer(b)&&Reflect.apply(equals,a,[b]);
function git(root,commit,path){
 assert.match(commit,/^[0-9a-f]{40}$/);const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
 for(const key of Object.keys(env))if(key.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(key))delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:2*1024*1024});
}
function replay(before,edits){
 let cursor=0;const parts=[];
 for(const edit of edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor&&edit.offset<=before.length);assert.equal(typeof edit.before,'string');assert.equal(typeof edit.after,'string');const old=Buffer.from(edit.before);assert.ok(equal(before.subarray(edit.offset,edit.offset+old.length),old));parts.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+old.length;}
 return Buffer.concat([...parts,before.subarray(cursor)]);
}
export function browserSurfaceSourceSuccessor({root,read,line}){
 assert.ok(line==='21.x'||line==='main');assert.equal(typeof read,'function');
 const physical=path=>readCheckerOwnerMember(root,path),current=path=>{const before=physical(path),provided=read(path);assert.ok(equal(before,provided),'nonphysical browser surface source '+path);assert.ok(equal(before,physical(path)),'browser surface source changed during callback '+path);return before;};
 assert.ok(equal(physical(SELF),image),'loaded browser surface successor changed');
 const raw=physical(PACKET);assert.equal(hash(raw),PACKET_SHA);const packet=JSON.parse(raw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-browser-surface-source-successor');assert.equal(packet.old_programs_executed,false);assert.equal(packet.historical_packets_rewritten,false);assert.equal(packet.source_scope_only,true);assert.equal(packet.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const branch=packet.branches[line],rows=branch.transitions;
 assert.deepEqual(rows.map(row=>row.path),['scripts/browser-surface-families.mjs','scripts/legacy-core-high-contrast-contract.mjs']);
 const review=packet.independent_fixture_review;assert.equal(review.path,'compatibility/rc/c02-a11y-independent-review-v1.json');assert.equal(review.sha256,'040856754eda748cd02e9c31744116bc993b04b7f7ba9779f3936ee5b15c943f');
 const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PACKET_SHA,bytes:raw.length},{...review},...rows.map(row=>({...row.after}))];
 assert.equal(new Set(bound.map(ref=>ref.path)).size,bound.length);
 const sweep=()=>{for(const ref of bound){const now=physical(ref.path);assert.equal(hash(now),ref.sha256,'changed physical browser surface successor '+ref.path);assert.equal(now.length,ref.bytes);}assert.ok(equal(physical(SELF),image),'changed loaded browser surface successor');};
 sweep();
 for(const row of rows){
  assert.equal(row.before.path,row.path);assert.equal(row.intermediate.path,row.path);assert.equal(row.after.path,row.path);
  const before=git(root,branch.source_parent,row.path),middle=git(root,branch.intermediate_commit,row.path);
  assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);assert.equal(hash(middle),row.intermediate.sha256);assert.equal(middle.length,row.intermediate.bytes);
  assert.ok(equal(replay(before,row.before_to_intermediate),middle),'browser surface intermediate differs');
  const after=replay(middle,row.intermediate_to_after);assert.equal(hash(after),row.after.sha256);assert.equal(after.length,row.after.bytes);assert.ok(equal(after,physical(row.path)),'browser surface current differs');
 }
 const assertCurrent=()=>{sweep();for(const ref of bound){const now=current(ref.path);assert.equal(hash(now),ref.sha256,'changed browser surface successor '+ref.path);assert.equal(now.length,ref.bytes);}sweep();};
 // Expected selector only: callers immediately perform fresh physical/input/physical checks.
 const qualify=ref=>{const row=rows.find(item=>item.path===ref?.path);if(!row)return null;const found=ref.sha256===row.before.sha256?row.before:ref.sha256===row.after.sha256?row.after:null;assert.ok(found,'unknown browser surface predecessor '+ref.path);if(ref.bytes!==undefined)assert.equal(ref.bytes,found.bytes);return {...ref,sha256:row.after.sha256,...(ref.bytes===undefined?{}:{bytes:row.after.bytes})};};
 assertCurrent();return {before:{...rows[0].before},after:{...rows[0].after},bound:structuredClone(bound),qualify,assertCurrent,assertPhysical:sweep};
}
