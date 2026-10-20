/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact prior bookkeeping after validating the current35-caller transition. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
export const CORE_ROLE_CONTEXT_INPUTS='compatibility/rc/core-view-use-current-roles-context-inputs.json';
const pins={main:'d7b3400fd186d4002dd9308c7c78f0bc5f938ab5ad8ea9227d4b97c973cd582f','21.x':'e05dc3314036d781d759bfe0f592957a7cee018145066b891a60175ec9dc613a'},hash=b=>createHash('sha256').update(b).digest('hex');
const branded=new WeakMap(),decoded=new Map(),authenticated=new Set(),rawRead=root=>p=>readFileSync(join(root,p));
function original(root,commit,m){assert.equal(hash(m.text),m.sha256);const key=JSON.stringify([root,commit,m.path,m.sha256]);if(authenticated.has(key))return;const raw=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+m.path],{cwd:root,maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(raw),m.sha256);authenticated.add(key);}
function validate({root=process.cwd(),read=rawRead(root)}={}){
 if(branded.has(read)){const previous=branded.get(read);assert.equal(previous.root,root);read=previous.raw;}
 const input=read(CORE_ROLE_CONTEXT_INPUTS),line=Object.keys(pins).find(k=>hash(input)===pins[k]);assert.ok(line,'changed exact Core role context registry');const data=JSON.parse(input);assert.equal(data.line,line);assert.equal(data.source_closures,35);assert.equal(data.current_product_projection,false);assert.equal(data.actual_native_packed_or_floor_qualified,false);assert.equal(data.g11_claim,'not-passed');
 const bytes=read(data.prior.path);assert.equal(hash(bytes),data.prior.sha256);let prior=decoded.get(data.prior.sha256);if(!prior){prior=JSON.parse(gunzipSync(bytes));decoded.set(data.prior.sha256,prior);}assert.equal(prior.line,line);assert.equal(prior.selected.length,35);assert.equal(prior.sources.length,22);
 for(const m of [...prior.ledgers,...prior.sources,...prior.reports,...prior.tooling_preimages,...prior.protected])original(root,prior.source_parent,m);
 for(const m of [...prior.sources,...prior.reports,...prior.protected])assert.equal(hash(read(m.path)),m.sha256,'changed current Core caller authority '+m.path);
 const shaLedger=prior.ledgers.find(m=>m.path.includes('disposition-ledger/'));assert.equal(hash(read(shaLedger.path)),shaLedger.sha256,'unrelated SHA ledger changed');
 const editsRaw=read(data.edits.path);assert.equal(hash(editsRaw),data.edits.sha256);const edits=JSON.parse(editsRaw);assert.equal(edits.line,line);assert.equal(Object.keys(edits.substitutions).length,3);
 const changedCode=[];for(const[path,substitutions]of Object.entries(edits.substitutions)){const before=prior.tooling_preimages.find(m=>m.path===path);assert.ok(before);let expected=before.text;for(const[from,to]of substitutions){assert.equal(expected.split(from).length,2);expected=expected.replace(from,to);}assert.equal(hash(read(path)),hash(expected),'unregistered prior-task adapter '+path);changedCode.push(before);}
 assert.equal(data.writes.length,3);for(const m of [...data.writes,...data.current_members])assert.equal(hash(read(m.path)),m.sha256,'changed raw current Core role successor '+m.path);
 const members=new Map([...prior.ledgers.filter(m=>m.path.includes('authored-dependency-')),...changedCode].map(m=>[m.path,Buffer.from(m.text)]));assert.equal(members.size,5);
 return {root,raw:read,data,line,members};
}
export function coreViewRoleSourceContext(options={}){const c=validate(options),read=p=>c.members.has(p)?Buffer.from(c.members.get(p)):c.raw(p);branded.set(read,{root:c.root,raw:c.raw});return {read,raw:c.raw};}
export function coreViewRolePreviousReader(options={}){return coreViewRoleSourceContext(options).read;}
export function inspectCoreViewRoleContext(options={}){const c=validate(options);return {line:c.line,current_source_closures_checked:35,current_successor_files_checked:3,authenticated_prior_bookkeeping_and_code_members:5,current_product_projection:false,raw_current_fingerprints_preserved:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};}
