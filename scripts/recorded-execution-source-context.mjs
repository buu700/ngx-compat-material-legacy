/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite historical views only. Actual runtime admission always reads live files. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),defaultRead=path=>readFileSync(resolve(root,path));
export const RECORDED_CONTEXT_INPUT='compatibility/rc/recorded-source-context-inputs.json';
export const RECORDED_CONTEXT_OUTPUT='compatibility/rc/recorded-source-context-outputs.json';
const inputPins={main:'e1ac134a7018bd36d49d2e8f6f000cc0d714b82be318cb880d51380900c8acb5','21.x':'941bf45036d3f1a3ecab1680d7a75fcf50db96c5956c151937b4bc211bdbf996'},outputPins={main:'a05dcd9ca107f66882b1ae4b8169178a4bb54a2c9059424e3da43f4a3be1db2d','21.x':'85d1724a5c9cce63a6c1cda5e05c87ad3931c61c8b082c55f05cd57c6aa8f5dc'};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),cache=new Map(),views=new WeakMap(),readers=new WeakMap();
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
export function recordedSourceContext(readMember=defaultRead){
 if(views.has(readMember))return views.get(readMember);
 const raw=readMember(RECORDED_CONTEXT_INPUT),fingerprint=hash(raw),cached=[...cache.values()].find(ctx=>ctx.input_sha256===fingerprint),data=cached?.data||JSON.parse(raw),line=data.line;
 assert.equal(fingerprint,inputPins[line],'recorded source inputs changed');
 const outputRaw=readMember(RECORDED_CONTEXT_OUTPUT);assert.equal(hash(outputRaw),outputPins[line],'recorded source outputs changed');
 const output=cached?.output||JSON.parse(outputRaw);assert.equal(output.line,line);assert.equal(output.inputs.sha256,fingerprint);
 const stored=readMember(data.prior.path),final=readMember(output.expected.path);
 assert.equal(hash(stored),data.prior.sha256,'recorded prior archive changed');assert.equal(hash(final),output.expected.sha256,'recorded expected archive changed');
 if(cached)return cached;
 const priorRaw=gunzipSync(stored),afterRaw=gunzipSync(final);assert.equal(hash(priorRaw),data.prior.raw_sha256);assert.equal(hash(afterRaw),output.expected.raw_sha256);
 const before=JSON.parse(priorRaw),after=JSON.parse(afterRaw);assert.equal(before.line,line);assert.equal(after.line,line);assert.equal(before.baseline,data.baseline);
 for(const member of [...before.sources,...before.frame_tooling_before,...before.reviews,...before.authored_stores,...before.authored_reviews,...after.members])assert.equal(hash(member.text),member.sha256);
 assert.equal(hash(before.ledger_text),before.ledger_sha256);assert.equal(hash(before.implementation_ledger_text),before.implementation_ledger_sha256);
 const ctx=freeze({data,before,after,output,input_sha256:fingerprint});cache.set(line,ctx);return ctx;
}
function projectedBytes(path,bytes,ctx,implementation=false){
 const {data,before,after}=ctx,fingerprint=hash(bytes),source=before.sources.find(row=>row.path===path),change=data.changes.find(row=>row.path===path);
 if(source&&change&&fingerprint===change.current_sha256)return Buffer.from(source.text);
 const previous=path===before.ledger_path?{text:implementation?before.implementation_ledger_text:before.ledger_text,sha256:implementation?before.implementation_ledger_sha256:before.ledger_sha256}:before.authored_stores.find(row=>row.path===path);
 const current=after.members.find(row=>row.path===path);
 if(previous&&current&&fingerprint===current.sha256)return Buffer.from(previous.text);
 return bytes; // Earlier exact views and their corruptions reach the old strict reader unchanged.
}
export function recordedHistoricalRead(readMember=defaultRead){
 if(views.has(readMember))return readMember;
 if(readers.has(readMember))return readers.get(readMember);
 const ctx=recordedSourceContext(readMember),projected=path=>projectedBytes(path,readMember(path),ctx);
 views.set(projected,ctx);readers.set(readMember,projected);return projected;
}
export function reverseRecordedSource(path,text,{readMember=defaultRead,strict=false}={}){
 const ctx=recordedSourceContext(readMember),before=ctx.before.sources.find(row=>row.path===path);if(!before)return text;
 const change=ctx.data.changes.find(row=>row.path===path);assert.ok(change);
 if(hash(text)===before.sha256)return text;
 if(hash(text)!==change.current_sha256){assert.equal(strict,false,'unreviewed recorded source change');return text;}
 for(const edit of [...change.edits].reverse()){assert.equal(text.slice(edit.start,edit.end),edit.after);text=text.slice(0,edit.start)+edit.before+text.slice(edit.end);}
 assert.equal(text,before.text,'complete recorded predecessor not recovered');return text;
}
export function recordedImplementationSubject(path,readMember=defaultRead){
 const ctx=recordedSourceContext(readMember);assert.equal(path,ctx.before.ledger_path,'unregistered implementation subject');
 const bytes=readMember(path),current=ctx.after.members.find(row=>row.path===path);assert.ok(current);
 assert.ok([current.sha256,ctx.before.implementation_ledger_sha256].includes(hash(bytes)),'unreviewed implementation subject');
 return Buffer.from(ctx.before.implementation_ledger_text);
}
