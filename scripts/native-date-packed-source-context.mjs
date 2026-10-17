/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite exact historical projection. Never a current runtime admission reader. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const NATIVE_DATE_CONTEXT_INPUT='compatibility/rc/native-date-context-inputs.json';
export const NATIVE_DATE_CONTEXT_OUTPUT='compatibility/rc/native-date-context-outputs.json';
const inputPins={main:'454c1b7b78cf9fa0444e206c7ab45638ef118922270a2a34619e29992f5df521','21.x':'ad9b34e36a2083a9cd08e8a730c7b766b928370e8eff8bd5a28ea6ddf9d483f2'};
const outputPins={main:'bb603329c639354f6350a009a36600ce2e9470cf5ff1793f4be06effd09170c1','21.x':'33fc7db1da33cde995e89a6e4a0b22938ae4162cd29b3d8611c80a22e5f2975b'};
const hash=value=>createHash('sha256').update(value).digest('hex'),cache=new Map(),historicalContextViews=new WeakMap();
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
export function nativeDateSourceContext(readMember=path=>readFileSync(resolve(root,path))){
 // An explicit history view retains the immutable context authenticated at creation.
 // Ordinary readers below still rehash all live input/archive identities.
 if(historicalContextViews.has(readMember))return historicalContextViews.get(readMember);
 const raw=readMember(NATIVE_DATE_CONTEXT_INPUT),rawHash=hash(raw);
 const previous=[...cache.values()].find(value=>value.output.inputs.sha256===rawHash);
 const data=previous?.data||JSON.parse(raw),line=data.line;
 assert.equal(rawHash,inputPins[line],'native date context inputs changed');
 const outputRaw=readMember(NATIVE_DATE_CONTEXT_OUTPUT);assert.equal(hash(outputRaw),outputPins[line],'native date context outputs changed');
 const output=previous?.output||JSON.parse(outputRaw);assert.equal(output.line,line);assert.equal(output.inputs.sha256,rawHash);
 const stored=readMember(data.prior.path);assert.equal(hash(stored),data.prior.sha256,'native date preceding archive changed');
 const finalStored=readMember(output.expected.path);assert.equal(hash(finalStored),output.expected.sha256,'native date expected transition archive changed');
 if(cache.has(line))return cache.get(line); // All four pinned byte identities were checked again.
 const beforeRaw=gunzipSync(stored);assert.equal(hash(beforeRaw),data.prior.raw_sha256);const before=JSON.parse(beforeRaw);
 const afterRaw=gunzipSync(finalStored);assert.equal(hash(afterRaw),output.expected.raw_sha256);const after=JSON.parse(afterRaw);
 assert.equal(before.line,line);assert.equal(before.baseline,data.baseline);assert.equal(after.line,line);
 for(const member of [...before.sources,...before.reviews,...before.authored_stores,...before.authored_reviews])assert.equal(hash(member.text),member.sha256);
 assert.equal(hash(before.ledger_text),before.ledger_sha256);
 assert.equal(hash(before.matrix_history.text),before.matrix_history.sha256);
 for(const member of after.members)assert.equal(hash(member.text),member.sha256);
 const result=freeze({data,before,after,output});cache.set(line,result);return result;
}
export function reverseNativeDatePackedSource(path,text,options={}){
 const {data,before}=nativeDateSourceContext(options.readMember);
 if(path===before.matrix_history.path){assert.ok([before.matrix_history.current_sha256,before.matrix_history.sha256].includes(hash(text)),'unreviewed retained-matrix history change');return before.matrix_history.text;}
 const original=before.sources.find(row=>row.path===path);
 if(!original)return text;
 if(hash(text)===original.sha256)return text; // A composed reader may already have recovered this exact predecessor.
 const change=data.changes.find(row=>row.path===path);assert.ok(change,'unregistered native date source path');
 assert.equal(hash(text),change.current_sha256,'unreviewed native date source change');
 for(const edit of [...change.edits].reverse()){
  assert.equal(text.slice(edit.start,edit.end),edit.after,'inexact native date source edit');
  text=text.slice(0,edit.start)+edit.before+text.slice(edit.end);
 }
 assert.equal(text,original.text,'complete preceding native date source not recovered');return text;
}
export function readNativeDatePackedBefore(path,readMember){
 const {before,after}=nativeDateSourceContext(readMember),source=before.sources.find(row=>row.path===path);
 if(path===before.matrix_history.path)return Buffer.from(reverseNativeDatePackedSource(path,readMember(path).toString(),{readMember}));
 if(source)return Buffer.from(reverseNativeDatePackedSource(path,readMember(path).toString(),{readMember}));
 const previous=path==='compatibility/f10/disposition-ledger/ledger.json'?{text:before.ledger_text,sha256:before.ledger_sha256}:before.authored_stores.find(row=>row.path===path);
 if(!previous)return readMember(path);
 const expected=after.members.find(row=>row.path===path);assert.ok(expected);
 assert.ok([previous.sha256,expected.sha256].includes(hash(readMember(path))),'unreviewed native date subject change');return Buffer.from(previous.text);
}
export function nativeDateRequirementsBefore(sha,current,line,options={}){
 const {data}=nativeDateSourceContext(options.readMember);assert.equal(data.line,line,'wrong native date requirement line');
 const previous=data.before_requirements.find(row=>row.sha===sha);if(!previous)return current;
 const expected=data.after_requirements.find(row=>row.sha===sha);assert.ok(expected);
 if(JSON.stringify(current)===JSON.stringify(previous.definition))return structuredClone(previous.definition);
 assert.deepEqual(current,expected.definition,'unreviewed native date requirement change');return structuredClone(previous.definition);
}

/** Apply only this transition's exact current subjects before an older strict
 * reader. Earlier subjects and its negative controls remain byte-for-byte input
 * to that reader; this function never labels unknown bytes as accepted. */
const historicalReaderSnapshots=new WeakMap();
export function nativeDateCurrentRead(readMember){
 if(historicalReaderSnapshots.has(readMember))return historicalReaderSnapshots.get(readMember);
 // This history-only reader captures an authenticated immutable input snapshot.
 // Source bytes are still read on every call and unknown bytes are not projected.
 // The direct context API independently rechecks live archive identities.
 const snapshot=nativeDateSourceContext(readMember),{data,before,after}=snapshot;
 const projected=path=>{
  const bytes=readMember(path);
  if(!path.startsWith('scripts/')&&!path.startsWith('tests/')&&!['compatibility/f10/disposition-ledger/ledger.json','compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json','compatibility/rc/matrices/full-verify.json'].includes(path))return bytes;
  const fingerprint=hash(bytes);
  const source=data.changes.find(row=>row.path===path),subject=after.members.find(row=>row.path===path);
  if(source&&fingerprint===source.current_sha256){
   const previous=before.sources.find(row=>row.path===path);assert.ok(previous);
   return Buffer.from(previous.text);
  }
  if(path===before.matrix_history.path&&fingerprint===before.matrix_history.current_sha256)return Buffer.from(before.matrix_history.text);
  if((path==='compatibility/f10/disposition-ledger/ledger.json'||before.authored_stores.some(row=>row.path===path))&&subject&&fingerprint===subject.sha256){const previous=path==='compatibility/f10/disposition-ledger/ledger.json'?before.ledger_text:before.authored_stores.find(row=>row.path===path).text;return Buffer.from(previous);}
  return bytes;
 };
 historicalContextViews.set(projected,snapshot);
 historicalReaderSnapshots.set(readMember,projected);return projected;
}

/** Exact product frame for the old source-only generator's declared parent.
 * Unknown bytes pass unchanged to its original hash assertions. Current
 * product/runtime qualification never uses this historical reader. */
export function nativeDateHistoricalProductRead(parent,readMember){
 const snapshot=nativeDateSourceContext(readMember),{before}=snapshot,context=before.historical_products.find(row=>row.source_parent===parent);
 assert.ok(context,'unregistered historical native-context product parent');
 const projected=path=>{const bytes=readMember(path),member=context.changed_members.find(row=>row.path===path);
  if(member&&hash(bytes)===member.current_baseline_sha256){assert.equal(hash(member.text),member.sha256);return Buffer.from(member.text);}
  return bytes;
 };
 historicalContextViews.set(projected,snapshot);return projected;
}
