/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Four finite current routing images; before-images are comparison data only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SELF='scripts/current-inventory-source-subject.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const PACKET={path:'compatibility/rc/main-current-inventory-source-routing-v2.json',sha256:'3815beb1e21779e54deaee5da2bf7bb316732e98a3dc9938ef6d2fdf18707280',bytes:24306};
const paths=['scripts/packed-upstream-ledger-epoch.mjs','scripts/inventory-reference-owner.mjs','scripts/inventory-finite-tool-successor.mjs','scripts/historical-repair-live-source-successor.mjs'];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function currentInventorySourceSubject({root,read=p=>readEvidenceMember(root,p)}){
 const physical=p=>readEvidenceMember(root,p),check=(raw,ref)=>{assert.equal(hash(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);};
 assert.equal(typeof read,'function');assert.ok(physical(SELF).equals(image));assert.ok(JSON.parse(physical('projects/ngx-material-legacy/package.json')).version.startsWith('22.'));
 const raw=physical(PACKET.path);check(raw,PACKET);const packet=JSON.parse(raw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'main-current-inventory-source-routing');assert.equal(packet.base_head,'54aa9b85bdd38c1ebb93ce2eeaeee34f39161cc0');assert.equal(packet.source_scope_only,true);assert.equal(packet.historical_programs_executed,false);assert.equal(packet.historical_packets_rewritten,false);assert.equal(packet.artifact_or_audit_admission_granted,false);assert.equal(packet.g11_claim,'not-passed');assert.deepEqual(packet.updates.map(row=>row.path),paths);
 const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=args=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:2*1024*1024});git(['merge-base','--is-ancestor',packet.base_head,'HEAD']);
 const rows=new Map();
 for(const row of packet.updates){
  assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);const before=git(['show',packet.base_head+':'+row.path]);check(before,row.before);
  let cursor=0;const parts=[];assert.ok(Array.isArray(row.edits)&&row.edits.length>0);
  for(const edit of row.edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor&&edit.offset<=before.length);assert.equal(typeof edit.before,'string');assert.equal(typeof edit.after,'string');assert.notEqual(edit.before,edit.after);const prior=Buffer.from(edit.before);assert.ok(before.subarray(edit.offset,edit.offset+prior.length).equals(prior));parts.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+prior.length;}
  parts.push(before.subarray(cursor));const current=Buffer.concat(parts);check(current,row.after);assert.ok(current.equals(physical(row.path)));rows.set(row.path,{before:{...row.before},after:{...row.after},beforeBytes:Buffer.from(before),currentBytes:Buffer.from(current)});
 }
 const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{...PACKET},...packet.updates.map(row=>({...row.after}))];
 const assertCurrent=()=>{assert.ok(physical(SELF).equals(image));for(const ref of bound){const before=physical(ref.path),provided=read(ref.path);check(before,ref);assert.ok(Buffer.isBuffer(provided)&&before.equals(provided),'nonphysical current inventory source '+ref.path);assert.ok(before.equals(physical(ref.path)));}assert.ok(physical(SELF).equals(image));};
 const select=ref=>{
  assert.ok(ref&&typeof ref==='object'&&!types.isProxy(ref)&&Object.getPrototypeOf(ref)===Object.prototype);const fields=Object.getOwnPropertyDescriptors(ref),keys=Reflect.ownKeys(fields);assert.ok(keys.every(key=>typeof key==='string'));assert.deepEqual(keys.sort(),Object.hasOwn(fields,'bytes')?['bytes','path','sha256']:['path','sha256']);for(const field of Object.values(fields))assert.ok(Object.hasOwn(field,'value')&&field.enumerable);
  const row=rows.get(fields.path.value);if(!row)return null;const prior=[row.before,row.after].find(value=>value.sha256===fields.sha256.value);assert.ok(prior,'unknown inventory routing source identity');if(fields.bytes)assert.equal(fields.bytes.value,prior.bytes);assertCurrent();return {row,prior,hasBytes:Object.hasOwn(fields,'bytes')};
 };
 const qualify=ref=>{const selected=select(ref);if(!selected)return null;return {path:selected.row.after.path,sha256:selected.row.after.sha256,...(selected.hasBytes?{bytes:selected.row.after.bytes}:{})};};
 const comparisonBytes=ref=>{const selected=select(ref);assert.ok(selected,'unknown inventory routing comparison path');return Buffer.from(selected.prior.sha256===selected.row.before.sha256?selected.row.beforeBytes:selected.row.currentBytes);};
 assertCurrent();return {bound:structuredClone(bound),transitions:[...rows.values()].map(({before,after})=>({path:before.path,before:{...before},after:{...after}})),qualify,comparisonBytes,assertCurrent,historical_programs_executed:false,current_read_route_returned:false,g11_claim:'not-passed'};
}
