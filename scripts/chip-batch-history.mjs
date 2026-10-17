/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite history-only composition. Native admission always reads actual files. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),defaultRead=p=>readFileSync(resolve(root,p));
export const BATCH_HISTORY_INPUT='compatibility/rc/chip-batch-history-inputs.json';
export const BATCH_HISTORY_STAGES=['chip-edit-admission','chip-input-api-admission','chip-modernization-admission','chip-audit-source-requalification','chip-source-batch-requalification'];
const pins={"main": "6c0d45e439b635b5a20c0a45358020783ad246a96f8bfceb3125f3c1c7afa1f1", "21.x": "1c6aef4b435491aea12ad5cd8a91955dbedcc654250c66ef95e97443096c6c35"},hash=b=>createHash('sha256').update(b).digest('hex'),cache=new Map(),views=new WeakMap(),readers=new WeakMap();
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
export function batchHistoryContext(read=defaultRead){
 if(views.has(read))return views.get(read);
 const raw=read(BATCH_HISTORY_INPUT),data=JSON.parse(raw);assert.equal(hash(raw),pins[data.line],'changed batch history inputs');
 const stored=read(data.prior.path),sourceStored=read(data.source_prior.path);assert.equal(hash(stored),data.prior.sha256,'changed batch history prior');assert.equal(hash(sourceStored),data.source_prior.sha256,'changed batch source prior');
 // Authenticate live capsules before any cached immutable facts are returned.
 const key=data.line+':'+hash(raw);if(cache.has(key))return cache.get(key);
 const unpacked=gunzipSync(stored),sourceRaw=gunzipSync(sourceStored);assert.equal(hash(unpacked),data.prior.raw_sha256);assert.equal(hash(sourceRaw),data.source_prior.raw_sha256);
 const before=JSON.parse(unpacked),sourcePrior=JSON.parse(sourceRaw);assert.equal(before.line,data.line);assert.equal(sourcePrior.line,data.line);assert.equal(before.source_parent,data.source_parent);assert.equal(sourcePrior.source_parent,data.source_parent);assert.equal(before.predecessor_frame,data.predecessor_frame);
 assert.equal(hash(sourcePrior.ledger_text),data.ledger_sha256);assert.equal(new Set(data.current_subjects.map(m=>m.path)).size,data.current_subjects.length);
 assert.equal(before.mappings.length,data.mapping_count);assert.equal(new Set(before.mappings.map(m=>m.path)).size,before.mappings.length);
 for(const m of before.mappings){assert.equal(hash(m.before_text),m.before_sha256);assert.equal(hash(m.parent_text),m.parent_sha256);assert.ok(data.current_subjects.some(s=>s.path===m.path));}
 assert.deepEqual(before.stages.map(s=>s.name),BATCH_HISTORY_STAGES);assert.deepEqual(data.stages,before.stages.map(s=>({name:s.name,commit:s.commit,paths:s.members.map(m=>m.path)})));
 for(const stage of before.stages)for(const m of stage.members){assert.equal(hash(m.text),m.sha256);assert.ok(data.current_subjects.some(s=>s.path===m.path));assert.ok(!m.path.startsWith('projects/'),'product is not a stage bypass');}
 const ctx=freeze({data,before,sourcePrior});cache.set(key,ctx);return ctx;
}
export function validateBatchHistoryCurrent(read=defaultRead,{required=false}={}){
 const ctx=batchHistoryContext(read),current=hash(read(ctx.data.ledger_path))===ctx.data.ledger_sha256;assert.ok(current||!required,'unknown current batch ledger');
 if(current)for(const m of ctx.data.current_subjects)assert.equal(hash(read(m.path)),m.sha256,'unreviewed current batch subject '+m.path);
 return ctx;
}
export function batchHistoryRead(read=defaultRead){
 if(views.has(read))return read;
 const ctx=batchHistoryContext(read);if(readers.has(read))return readers.get(read);
 const current=new Map(ctx.data.current_subjects.map(m=>[m.path,m.sha256])),before=new Map(ctx.before.mappings.map(m=>[m.path,m]));
 const projected=p=>{const raw=read(p),old=before.get(p);return old&&hash(raw)===current.get(p)?Buffer.from(old.before_text):raw;};
 views.set(projected,ctx);readers.set(read,projected);return projected;
}
export function reverseBatchHistorySource(path,text,read=defaultRead){
 const {data,before}=batchHistoryContext(read),m=before.mappings.find(r=>r.path===path),current=data.current_subjects.find(r=>r.path===path);
 return m&&current&&hash(text)===current.sha256?m.before_text:text;
}
export function batchRecordedStageSubject(stage,path,read=defaultRead){
 const {data,before}=batchHistoryContext(read),selected=before.stages.find(s=>s.name===stage)?.members.find(m=>m.path===path);assert.ok(selected,'unregistered batch history stage/member');
 const current=data.current_subjects.find(m=>m.path===path);assert.ok(current);assert.ok([current.sha256,selected.sha256].includes(hash(read(path))),'unreviewed batch stage subject');return Buffer.from(selected.text);
}
