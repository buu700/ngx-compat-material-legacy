/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Test-only pre-admission subjects. Current native admission never imports this. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
export const CHIP_LIFECYCLE_ADMISSION_INPUTS='compatibility/rc/chip-lifecycle-admission-inputs.json';
const pins={main:'b71d71af00ddd8737515f1279e009e34e447ae23991908706782ef1742b2be1f','21.x':'a315aed37bffbf7961cd0e3b6da36509fb40b38412af2e76e3a4e78eefc58db6'},hash=b=>createHash('sha256').update(b).digest('hex');
function freeze(o){if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;}
const cache=new Map();
export function chipLifecycleAdmissionContext(read=p=>readFileSync(p)){
 const raw=read(CHIP_LIFECYCLE_ADMISSION_INPUTS),data=JSON.parse(raw);assert.equal(hash(raw),pins[data.line],'changed lifecycle admission inputs');const stored=read(data.prior.path);assert.equal(hash(stored),data.prior.sha256,'changed lifecycle admission prior');
 if(!cache.has(data.line)){const unpacked=gunzipSync(stored);assert.equal(hash(unpacked),data.prior.raw_sha256);const prior=JSON.parse(unpacked);assert.equal(prior.line,data.line);assert.equal(prior.source_parent,data.source_parent);assert.equal(hash(prior.ledger_text),prior.ledger_sha256);for(const m of prior.sources)assert.equal(hash(m.text),m.sha256);cache.set(data.line,freeze({data,prior}));}return cache.get(data.line);
}
export function chipLifecycleAdmissionBeforeRead(read=p=>readFileSync(p)){
 const {data,prior}=chipLifecycleAdmissionContext(read),current=new Map(data.current_members.map(m=>[m.path,m.sha256])),old=new Map(prior.sources.map(m=>[m.path,m.text]));old.set(prior.ledger_path,prior.ledger_text);
 return p=>{const bytes=read(p);return current.get(p)===hash(bytes)?Buffer.from(old.get(p)):bytes;};
}
