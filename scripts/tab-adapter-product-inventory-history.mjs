/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite prior audit subjects after exact raw-current successor validation. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {qualifyIndependentTabProductDelta} from './tab-adapter-product-inventory-context.mjs';
export const TAB_ADAPTER_HISTORY_INPUTS='compatibility/rc/tab-adapter-product-inventory-history-inputs.json';
const pins={main:'4da40064e4c7e0e05ca1cdbd2a61a80d1b732c9568e527e9e6bf478d98d4a5ee','21.x':'8c050809c8b848b0f794bf5da826e9859b547eaa60fe6dcac9a5eca588d78275'},hash=b=>createHash('sha256').update(b).digest('hex'),branded=new WeakMap(),authenticated=new Set();
const rawRead=root=>p=>readFileSync(join(root,p));
function original(root,commit,m){assert.equal(hash(m.text),m.sha256);const id=JSON.stringify([root,commit,m.path,m.sha256]);if(authenticated.has(id))return;const raw=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+m.path],{cwd:root,maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(raw),m.sha256);authenticated.add(id);}
function capsule(root,read,ref){const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'changed independent inventory preimages');return JSON.parse(gunzipSync(bytes));}
function validate({root=process.cwd(),read=rawRead(root)}={}){
 if(branded.has(read)){const old=branded.get(read);assert.equal(old.root,root);read=old.raw;}
 const raw=read(TAB_ADAPTER_HISTORY_INPUTS),line=Object.keys(pins).find(k=>hash(raw)===pins[k]);assert.ok(line,'changed finite inventory history registry');const data=JSON.parse(raw);assert.equal(data.line,line);assert.equal(data.schema_version,1);assert.equal(data.actual_native_packed_or_floor_qualified,false);assert.equal(data.g11_claim,'not-passed');
 qualifyIndependentTabProductDelta({root,read});const prior=capsule(root,read,data.prior),authored=capsule(root,read,data.authored_prior),history=capsule(root,read,data.history_prior);assert.equal(prior.selected.length,75);assert.equal(prior.reports.length,11);assert.equal(prior.code_preimages.length,6);assert.equal(history.members.length,2);
 for(const [commit,members]of [[prior.source_parent,[prior.ledger,...prior.reports,...prior.code_preimages]],[authored.source_parent,[authored.ledger,authored.report]],[history.source_parent,history.members]])for(const m of members)original(root,commit,m);
 for(const m of [...prior.reports,authored.report])assert.equal(hash(read(m.path)),m.sha256,'original source review mutated '+m.path);
 const editsRaw=read(data.edits.path);assert.equal(hash(editsRaw),data.edits.sha256);const edits=JSON.parse(editsRaw);assert.equal(edits.line,line);assert.equal(Object.keys(edits.substitutions).length,8);
 const code=[...prior.code_preimages,...history.members];assert.equal(new Set(code.map(m=>m.path)).size,8);for(const m of code){let text=m.text;for(const[from,to]of edits.substitutions[m.path]??[]){assert.equal(text.split(from).length,2);text=text.replace(from,to);}assert.equal(hash(read(m.path)),hash(text),'unregistered inventory adapter edit '+m.path);}
 assert.equal(data.writes.length,14);for(const m of [...data.writes,...data.current_members])assert.equal(hash(read(m.path)),m.sha256,'changed raw-current inventory successor '+m.path);
 const members=new Map([prior.ledger,authored.ledger,...code].map(m=>[m.path,Buffer.from(m.text)]));assert.equal(members.size,10);return {root,raw:read,data,line,members};
}
/** Historical bookkeeping only; this reader never supplies current product/native admission. */
export function tabAdapterSourceContext(options={}){const c=validate(options),reader=path=>c.members.has(path)?Buffer.from(c.members.get(path)):c.raw(path);branded.set(reader,{root:c.root,raw:c.raw});return {read:reader,raw:c.raw};}
export function tabAdapterPreviousSourceReader(options={}){return tabAdapterSourceContext(options).read;}
export function inspectTabAdapterHistory(options={}){const c=validate(options);return {line:c.line,raw_current_successors_checked:c.data.writes.length,registered_code_adapters:8,authenticated_prior_members:c.members.size,all_current_bytes_rechecked_before_prior_reads:true,current_product_projection:false,actual_native_packed_or_floor_qualified:false};}
