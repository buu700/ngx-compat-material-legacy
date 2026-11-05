/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
// This lower-leaf module must not import historical-contract-repair readers or owners.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SELF='scripts/tabs-finite-source-successor.mjs',PACKET='compatibility/rc/parent-tabs-finite-source-successor-v1.json';
const PACKET_SHA256='4d4f79f238c802df6be6c34c8503f4e0e04b04e1c3e148b5c82bbfefcaa05938';
const hash=x=>createHash('sha256').update(x).digest('hex'),equals=Buffer.prototype.equals,apply=Reflect.apply;
const same=(a,b)=>Buffer.isBuffer(b)&&apply(equals,a,[b]);
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const image=readFileSync(fileURLToPath(import.meta.url));
export const tabsFiniteSourceLoadedImage=Object.freeze({path:SELF,sha256:hash(image),bytes:image.length});
function git(root,commit,path){
 assert.match(commit,/^[0-9a-f]{40}$/);const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
 for(const key of Object.keys(env))if(key.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(key))delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:2*1024*1024});
}
export function tabsFiniteSourceSuccessor({root,read,line}){
 assert.ok(/^[0-9a-f]{64}$/.test(PACKET_SHA256),'final reviewed tabs evidence packet not installed');
 assert.ok(line==='21.x'||line==='main');assert.equal(typeof read,'function');
 const physical=path=>readEvidenceMember(root,path);
 const version=JSON.parse(physical('projects/ngx-material-legacy/package.json')).version;
 const actualLine=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.equal(line,actualLine,'wrong tabs successor line');
 assert.ok(same(physical(SELF),image),'changed loaded tabs successor '+SELF);
 const raw=physical(PACKET);assert.equal(hash(raw),PACKET_SHA256,'changed tabs successor packet '+PACKET);const packet=JSON.parse(raw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-tabs-current-source-successor');
 assert.equal(packet.evidence_reviewed,true);assert.equal(packet.old_programs_executed,false);
 assert.equal(packet.full_owner_or_native_qualification,false);assert.equal(packet.g11_claim,'not-passed');
 const branch=packet.branches[line];assert.ok(branch);const rows=branch.transitions;
 const allowed=['projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts','projects/ngx-material-legacy/legacy-tabs/internal/tab-group-base.ts'];
 assert.deepEqual(rows.map(row=>row.path),allowed);const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PACKET_SHA256,bytes:raw.length},...rows.map(row=>({...row.after})),...branch.evidence.map(ref=>({...ref}))];
 assert.equal(new Set(bound.map(ref=>ref.path)).size,bound.length,'duplicate tabs source binding');
 const sweep=()=>{for(const ref of bound){const actual=physical(ref.path);assert.equal(hash(actual),ref.sha256,'changed physical tabs successor '+ref.path);assert.equal(actual.length,ref.bytes);}assert.ok(same(physical(SELF),image),'changed loaded tabs successor '+SELF);};
 sweep();
 for(const row of rows){
  assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);
  const before=git(root,row.source_parent,row.path);assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
  assert.equal(createHash('sha1').update('blob '+before.length+'\0').update(before).digest('hex'),row.before.git_blob);
  let cursor=0;const parts=[];for(const edit of row.edits){assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor);const old=Buffer.from(edit.before);assert.ok(same(before.subarray(edit.offset,edit.offset+old.length),old));parts.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+old.length;}parts.push(before.subarray(cursor));
  const derived=Buffer.concat(parts);assert.equal(hash(derived),row.after.sha256);assert.equal(derived.length,row.after.bytes);
 }
 let active=false;const idle=()=>assert.equal(active,false,'reentrant tabs successor consumption');
 const assertCurrent=()=>{idle();active=true;try{sweep();for(const ref of bound){const before=physical(ref.path);assert.equal(hash(before),ref.sha256,'changed consumed tabs successor '+ref.path);assert.equal(before.length,ref.bytes);const supplied=read(ref.path);assert.ok(same(before,supplied),'nonphysical tabs successor '+ref.path);assert.ok(same(before,physical(ref.path)),'tabs successor changed during callback '+ref.path);}sweep();}finally{active=false;}};
 // Expected selector only; callers must immediately perform fresh physical/input/physical validation.
 const qualify=ref=>{const row=rows.find(item=>item.path===ref?.path);if(!row)return null;assert.ok(ref.sha256===row.before.sha256||ref.sha256===row.after.sha256,'unknown tabs predecessor');const source=ref.sha256===row.before.sha256?row.before:row.after;if(ref.bytes!==undefined)assert.equal(ref.bytes,source.bytes);return {...ref,sha256:row.after.sha256,...(ref.bytes===undefined?{}:{bytes:row.after.bytes})};};
 const facts=freeze({scan_path:branch.scan_path,review_path:branch.review_path,old_population_sha256:branch.old_population_sha256,current_population_sha256:branch.current_population_sha256,review_rows:structuredClone(branch.review_rows)});
 assertCurrent();return {bound:structuredClone(bound),facts,assertCurrent,assertPhysical:sweep,qualify};
}
