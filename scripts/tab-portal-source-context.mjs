/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite authenticated task history. Current source/native admission stays raw. */
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tabAdapterSourceContext} from './tab-adapter-product-inventory-history.mjs';
export const TAB_PORTAL_CONTEXT_INPUTS='compatibility/rc/tab-portal-source-requalification-context-inputs.json';
const pins={main:'d2a87f6ce9bd202b86df70676c17b8dd6b356f0546898b96f4d739cbe34d717c','21.x':'1d0dce3c92390ec9d68e762500b7209616be144f0fa4d71804ff6df7235ba4c7'},hash=b=>createHash('sha256').update(b).digest('hex'),branded=new WeakMap(),gitAuthenticated=new Set();
const metadataPaths=['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json','compatibility/f10/disposition-ledger/ledger.json'];
const bodyPath='projects/ngx-material-legacy/legacy-tabs/tab-body.ts';
function rawRead(root){return path=>{assert.ok(typeof path==='string'&&!path.includes('\\'));let member=root;for(const part of path.split('/')){assert.ok(part&&part!=='.'&&part!=='..');member=join(member,part);assert.equal(lstatSync(member).isSymbolicLink(),false,'symlink in task context '+path);}assert.ok(lstatSync(member).isFile());return readFileSync(member);};}
function authenticate(root,commit,m){assert.equal(hash(m.text),m.sha256);const id=JSON.stringify([root,commit,m.path,m.sha256]);if(gitAuthenticated.has(id))return;const bytes=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+m.path],{cwd:root,maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(bytes),m.sha256,'unbound historical task member '+m.path);gitAuthenticated.add(id);}
function validate({root=process.cwd(),read=rawRead(root)}={}){
 // Only immutable Git preimages are cached. Every live byte is rechecked.
 if(branded.has(read)){const previous=branded.get(read);assert.equal(previous.root,root);read=previous.raw;}
 const inventory=tabAdapterSourceContext({root,read});read=inventory.read;
 const input=read(TAB_PORTAL_CONTEXT_INPUTS),line=Object.keys(pins).find(k=>pins[k]===hash(input));assert.ok(line,'changed finite tab source context');const data=JSON.parse(input);assert.equal(data.line,line);assert.equal(data.schema_version,1);assert.equal(data.g11_claim,'not-passed');assert.equal(data.current_runtime_native_packed_or_floor_qualified,false);
 const priorRaw=read(data.prior.path),contextRaw=read(data.context_prior.path);assert.equal(hash(priorRaw),data.prior.sha256);assert.equal(hash(contextRaw),data.context_prior.sha256);const prior=JSON.parse(gunzipSync(priorRaw)),context=JSON.parse(gunzipSync(contextRaw));assert.equal(prior.line,line);assert.equal(context.line,line);assert.equal(prior.preimages.length,17);assert.equal(context.members.length,9);
 for(const m of prior.preimages)authenticate(root,prior.source_parent,m);for(const m of context.members)authenticate(root,context.source_parent,m);
 const extraRaw=read(data.additional_context_prior.path);assert.equal(hash(extraRaw),data.additional_context_prior.sha256);const extra=JSON.parse(gunzipSync(extraRaw));assert.equal(extra.line,line);assert.equal(extra.members.length,4);for(const m of extra.members)authenticate(root,extra.source_parent,m);const contextMembers=[...context.members,...extra.members];
 const editsRaw=read(data.edits.path);assert.equal(hash(editsRaw),data.edits.sha256);const edits=JSON.parse(editsRaw);assert.equal(edits.line,line);assert.equal(Object.keys(edits.substitutions).length,13);const edited=new Map();
 for(const m of contextMembers){let expected=m.text;const substitutions=edits.substitutions[m.path];assert.ok(substitutions);for(const[from,to]of substitutions){assert.equal(expected.split(from).length,2);expected=expected.replace(from,to);}edited.set(m.path,expected);assert.equal(hash(read(m.path)),hash(expected),'changed registered task edit '+m.path);}
 const writes=new Map(data.writes.map(m=>[m.path,m]));assert.equal(writes.size,5);assert.ok(metadataPaths.every(path=>writes.has(path)));
 for(const m of prior.preimages){const expected=writes.get(m.path)?.sha256??(edited.has(m.path)?hash(edited.get(m.path)):m.sha256);assert.equal(hash(read(m.path)),expected,'changed live source successor/protected member '+m.path);}
 assert.ok(data.current_members.length>=10);for(const m of [...data.writes,...data.current_members])assert.equal(hash(read(m.path)),m.sha256,'changed live tab source context member '+m.path);
 const repairRaw=read(prior.product_repair_prior.path);assert.equal(hash(repairRaw),prior.product_repair_prior.sha256);const repair=JSON.parse(gunzipSync(repairRaw));const old=prior.original_product_source;assert.equal(old.path,bodyPath);assert.equal(old.sha256,repair.preimages.find(m=>m.path===bodyPath).sha256);authenticate(root,repair.source_parent,old);
 const members=new Map([...prior.preimages.filter(m=>metadataPaths.includes(m.path)),...contextMembers,old].map(m=>[m.path,Buffer.from(m.text)]));assert.equal(members.size,17);
 const fingerprints=new Map([...metadataPaths,...contextMembers.map(m=>m.path),bodyPath].map(path=>[path,hash(inventory.raw(path))]));
 return {root,raw:read,data,line,members,old,fingerprints};
}
function reader(options,kind){const checked=validate(options),keys=kind==='repair'?new Set(['scripts/core-view-use-review.mjs','tests/test_core_view_use_review.py']):kind==='preparation'?new Set([...checked.members.keys()].filter(p=>p!==bodyPath)):new Set(checked.members.keys());const result=path=>keys.has(path)?Buffer.from(checked.members.get(path)):checked.raw(path);branded.set(result,{root:checked.root,raw:checked.raw});return result;}
/** Exact old ledger/body/task members, after checking the complete live successor. */
export function tabPortalSourceParentReader(options={}){return reader(options,'parent');}
/** Preparation keeps the actual repaired product and projects only its prior bookkeeping. */
export function tabPortalSourcePreparationReader(options={}){return reader(options,'preparation');}
/** The product repair guard retains only its original two protected view-tool members. */
export function tabPortalRepairContextReader(options={}){return reader(options,'repair');}
export function inspectTabPortalSourceContext(options={}){const c=validate(options);return {line:c.line,current_members_checked:c.data.current_members.length,current_successor_files_checked:c.data.writes.length,registered_context_edits:13,authenticated_historical_members:c.members.size,all_raw_current_bytes_checked:true,current_runtime_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){assert.ok(['--parent','--check'].includes(process.argv[2]));const options={root:process.cwd()};if(process.argv[2]==='--check')console.log(JSON.stringify(inspectTabPortalSourceContext(options)));else{const c=validate(options);console.log(JSON.stringify({line:c.line,raw_current_checked:true,scope:'Authenticated prior task members only; not current ledger/native admission',current_fingerprints:[...c.fingerprints].map(([path,sha256])=>({path,sha256})),members:[...c.members].map(([path,bytes])=>({path,sha256:hash(bytes),text:bytes.toString()}))}));}}
