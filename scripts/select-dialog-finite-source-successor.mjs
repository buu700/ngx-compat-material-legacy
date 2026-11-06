/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SELF='scripts/select-dialog-finite-source-successor.mjs', PACKET='compatibility/rc/parent-select-dialog-menu-snack-d61-menu-finite-source-v4.json';
const PIN='f8f9423c7dff2ffd5ee72fa812f137bb5db8e59a4b88b7c1868086e3bdb28777';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),eq=Buffer.prototype.equals,apply=Reflect.apply;
const same=(a,b)=>Buffer.isBuffer(b)&&apply(eq,a,[b]);
const image=readFileSync(fileURLToPath(import.meta.url));
export const selectDialogFiniteLoadedImage=Object.freeze({path:SELF,sha256:hash(image),bytes:image.length});
function historical(root,commit,path){
 assert.match(commit,/^[0-9a-f]{40}$/);const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
 for(const key of Object.keys(env))if(key.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(key))delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:2*1024*1024});
}
export function selectDialogFiniteSuccessor({root,read,line}){
 assert.ok(line==='21.x'||line==='main');assert.equal(typeof read,'function');const physical=p=>readEvidenceMember(root,p);
 const version=JSON.parse(physical('projects/ngx-material-legacy/package.json')).version;
 assert.equal(line,version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null,'wrong select line');
 assert.ok(same(physical(SELF),image),'changed loaded select successor');const raw=physical(PACKET);assert.equal(hash(raw),PIN,'changed select successor packet');
 const packet=JSON.parse(raw);assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-select-dialog-menu-snack-d61-menu-current-source-successor');assert.equal(packet.source_scope_only,true);assert.equal(packet.historical_programs_executed,false);assert.equal(packet.canonical_admission_granted,false);assert.equal(packet.g11_claim,'not-passed');
 const preceding={path:'compatibility/rc/parent-select-dialog-menu-snack-finite-source-v3.json',sha256:'bb2be03706f10cc22029facdb916d3527bf40cef120f0746d4ddd8794371159d',bytes:49370};assert.deepEqual(packet.previous_packet,preceding);const precedingRaw=physical(preceding.path);assert.equal(hash(precedingRaw),preceding.sha256);assert.equal(precedingRaw.length,preceding.bytes);const precedingPacket=JSON.parse(precedingRaw);
 const previous={path:'compatibility/rc/parent-select-dialog-menu-finite-source-v2.json',sha256:'67f279d9631a48a4cf69ef41c3ae4c3ab3446bca457d023b7e22e323506c6d88',bytes:34319};assert.deepEqual(precedingPacket.previous_packet,previous);const previousRaw=physical(previous.path);assert.equal(hash(previousRaw),previous.sha256);assert.equal(previousRaw.length,previous.bytes);const old=JSON.parse(previousRaw);const older={path:'compatibility/rc/parent-select-dialog-finite-source-v1.json',sha256:'fe029afba0dbf7b1d9ecf51661cdc98240b6b0c2ee70a352dfdf99fd48ce27a6',bytes:17132};assert.deepEqual(old.previous_packet,older);const olderRaw=physical(older.path);assert.equal(hash(olderRaw),older.sha256);assert.equal(olderRaw.length,older.bytes);assert.deepEqual(old.branches[line].transitions.slice(0,3),JSON.parse(olderRaw).branches[line].transitions);
 const rows=packet.branches[line].transitions;assert.deepEqual(rows.slice(0,5),old.branches[line].transitions);assert.deepEqual(rows.map(x=>x.path),['projects/ngx-material-legacy/legacy-select/select.html','projects/ngx-material-legacy/legacy-select/select.spec.ts','projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts','projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts','projects/ngx-material-legacy/legacy-menu/menu.spec.ts','projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.ts','projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts','projects/ngx-material-legacy/legacy-snack-bar/snack-bar.spec.ts']);
 assert.deepEqual(rows,precedingPacket.branches[line].transitions);const latest=packet.branches[line].d61_menu_transitions;assert.deepEqual(latest.map(x=>x.path),['projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts','projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts','projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts','projects/ngx-material-legacy/legacy-menu/menu.spec.ts']);for(const next of latest){const prior=rows.find(row=>row.path===next.path);if(prior)assert.deepEqual(next.before,prior.after);}const effective=rows.map(row=>{const next=latest.find(item=>item.path===row.path);return next?{...row,after:next.after}:row;}).concat(latest.filter(next=>!rows.some(row=>row.path===next.path)));
 const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PIN,bytes:raw.length},preceding,previous,older,...effective.map(x=>({path:x.after.path,sha256:x.after.sha256,bytes:x.after.bytes}))];
 assert.equal(new Set(bound.map(x=>x.path)).size,bound.length);
 const sweep=()=>{for(const ref of bound){const value=physical(ref.path);assert.equal(hash(value),ref.sha256,'changed physical select successor '+ref.path);assert.equal(value.length,ref.bytes);}assert.ok(same(physical(SELF),image),'changed loaded select successor');};
 sweep();for(const row of [...rows,...latest]){
  assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);const before=historical(root,row.source_parent,row.path);assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);assert.equal(createHash('sha1').update('blob '+before.length+'\0').update(before).digest('hex'),row.before.git_blob);
  let cursor=0;const chunks=[];for(const edit of row.edits){assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor);const old=Buffer.from(edit.before);assert.ok(same(before.subarray(edit.offset,edit.offset+old.length),old));chunks.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+old.length;}chunks.push(before.subarray(cursor));const next=Buffer.concat(chunks);assert.equal(hash(next),row.after.sha256);assert.equal(next.length,row.after.bytes);assert.equal(createHash('sha1').update('blob '+next.length+'\0').update(next).digest('hex'),row.after.git_blob);
 }
 let active=false;const idle=()=>assert.equal(active,false,'reentrant select successor consumption');
 const assertCurrent=()=>{idle();active=true;try{sweep();for(const ref of bound){const before=physical(ref.path);assert.equal(hash(before),ref.sha256);assert.equal(before.length,ref.bytes);assert.ok(same(before,read(ref.path)),'nonphysical select successor '+ref.path);assert.ok(same(before,physical(ref.path)),'select successor changed during callback '+ref.path);}sweep();}finally{active=false;}};
 const select=(ref,side)=>{const row=effective.find(x=>x.path===ref?.path);if(!row)return null;const intermediate=latest.find(x=>x.path===ref.path)?.before;const expected=[row.before,intermediate,row.after].find(candidate=>candidate?.sha256===ref.sha256);assert.ok(expected,'unknown select predecessor');if(ref.bytes!==undefined)assert.equal(ref.bytes,expected.bytes);return {...ref,sha256:row[side].sha256,...(ref.bytes===undefined?{}:{bytes:row[side].bytes})};};
 const qualify=ref=>select(ref,'after'),historicalReference=ref=>select(ref,'before');
 assertCurrent();return {bound:structuredClone(bound),qualify,historicalReference,assertCurrent,assertPhysical:sweep};
}
