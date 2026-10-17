/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** One finite history-only successor. Runtime admission never imports this reader. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),defaultRead=p=>readFileSync(resolve(root,p));
export const CHIP_HISTORY_INPUT='compatibility/rc/chip-history-union-inputs.json';
const pins={"main":"8eaac78f9ed1d217035fe69ff8776578e612ed04ebad979e93a6c5ca550c7925","21.x":"8b9e6784e47ea448cfe6ce50dbf03670e9178e82e74560d813281f4577c0f5c1"};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),cache=new Map(),views=new WeakMap(),readers=new WeakMap();
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
export function chipHistoryUnionContext(read=defaultRead){
 if(views.has(read))return views.get(read);
 const raw=read(CHIP_HISTORY_INPUT),data=JSON.parse(raw);assert.equal(hash(raw),pins[data.line],'chip history inputs changed');
 const bytes=read(data.prior.path);assert.equal(hash(bytes),data.prior.sha256,'chip history prior changed');
 const extra=read(data.supplement.path);assert.equal(hash(extra),data.supplement.sha256,'chip history supplement changed');
 const key=data.line+':'+hash(raw);if(cache.has(key))return cache.get(key);
 const unzipped=gunzipSync(bytes);assert.equal(hash(unzipped),data.prior.raw_sha256);const before=JSON.parse(unzipped);
 assert.equal(before.line,data.line);assert.equal(before.source_parent,data.source_parent);
 const unzippedExtra=gunzipSync(extra);assert.equal(hash(unzippedExtra),data.supplement.raw_sha256);const supplemental=JSON.parse(unzippedExtra);assert.equal(supplemental.line,data.line);assert.equal(supplemental.source_parent,data.source_parent);assert.equal(supplemental.target_frame,before.target_frame);before.members.push(...supplemental.members);assert.equal(new Set(before.members.map(m=>m.path)).size,before.members.length);
 for(const member of before.members){assert.equal(hash(member.before_text),member.before_sha256);assert.equal(hash(member.prior_current_text),member.prior_current_sha256);}
 for(const stage of before.stages)for(const member of stage.members)assert.equal(hash(member.text),member.sha256);
 assert.deepEqual(before.stages.map(s=>s.name),['modern-chip-admission','classic-chip-list-contract','chip-source-requalification']);
 const ctx=freeze({data,before});cache.set(key,ctx);return ctx;
}
/** Validate the current subject before older views can stop referring to its
 * new dossier names. Earlier authenticated reader inputs remain older inputs.
 */
export function validateChipHistoryCurrent(read=defaultRead,{required=false}={}){
 const ctx=chipHistoryUnionContext(read),{data,before}=ctx,current=hash(read(data.ledger_path))===data.ledger_sha256;
 assert.ok(current||!required,'not the registered current chip-history subject');if(!current)return ctx;
 for(const member of data.current_subjects){
  const original=before.members.find(m=>m.path===member.path),allowed=new Set([member.sha256]);
  if(original)allowed.add(original.before_sha256);
  for(const sha of data.retained_source_identities[member.path]??[])allowed.add(sha);
  assert.ok(allowed.has(hash(read(member.path))),'unreviewed chip-history current member '+member.path);
 }
 return ctx;
}
export function markChipHistoryView(view,read=defaultRead){views.set(view,chipHistoryUnionContext(read));return view;}
export function chipHistoryRead(read=defaultRead){
 if(views.has(read))return read;
 const ctx=chipHistoryUnionContext(read);if(readers.has(read))return readers.get(read);
 const current=new Map(ctx.data.current_subjects.map(m=>[m.path,m.sha256])),previous=new Map(ctx.before.members.map(m=>[m.path,m]));
 const projected=p=>{const bytes=read(p),old=previous.get(p);return old&&hash(bytes)===current.get(p)?Buffer.from(old.before_text):bytes;};
 views.set(projected,ctx);readers.set(read,projected);return projected;
}
export function reverseChipHistorySource(path,text,{readMember=defaultRead}={}){
 const ctx=chipHistoryUnionContext(readMember),old=ctx.before.members.find(m=>m.path===path),current=ctx.data.current_subjects.find(m=>m.path===path);
 return old&&current&&hash(text)===current.sha256?old.before_text:text;
}
/** Explicit finite stages, never a default read adapter. Unknown subjects fail. */
export function recordedStageSubject(stage,path,read=defaultRead){
 const {data,before}=chipHistoryUnionContext(read),subject=before.stages.find(s=>s.name===stage)?.members.find(m=>m.path===path);assert.ok(subject,'unregistered chip history stage/member');
 const bytes=read(path),current=data.current_subjects.find(m=>m.path===path);assert.ok(current);
 assert.ok([current.sha256,subject.sha256].includes(hash(bytes)),'unreviewed chip history stage subject');return Buffer.from(subject.text);
}
