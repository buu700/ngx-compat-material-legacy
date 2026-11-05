/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current registry bytes and physical tool guards, separate from historical proofs. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {legacyRemovalRegistrySuccessor} from '../scripts/legacy-removal-canonical-stage.mjs';
import {tableLocalCompilationRegistrySuccessor} from '../scripts/table-local-compilation-canonical-stage.mjs';
import {currentSassToolReferenceSubject} from '../scripts/current-sass-tool-references.mjs';
import {readHistoricalContractRepairOwnerMember} from '../scripts/historical-contract-repair-readers.mjs';
import {sourceContractDefinitions} from '../scripts/upstream-source-contract-registry.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const REGISTRY='scripts/upstream-source-contract-registry.mjs',LEDGER='compatibility/f10/disposition-ledger/ledger.json';
const PROPOSAL='compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json';
const PROPOSAL_SHA='720a4fcd0c9d0d67afbeddd106fc9741d7ab34a0848edc1a0f2e6a25019b9881';
const SOURCE_PARENT='d8ab97315b6c77b83f42c2bebcf63b2984fff255';
const BASE_RECORD="  {sha:'55f9618b687fc0da4743a3cf27e113ceb837e151',proof_kind:'individual-historical-base-class-removal-source-review',\n    scope_key:'base_class_removal_source_scope',module:'upstream-base-class-removal-admission.cjs'},\n";
const equal=Function.call.bind(Buffer.prototype.equals);
function physical(root,path){
 let cursor=root;assert.equal(lstatSync(cursor).isSymbolicLink(),false);
 for(const part of path.split('/')){assert.ok(part&&!['.','..'].includes(part));cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false);}
 assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);
}
function gitData(root,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',SOURCE_PARENT+':'+path],{cwd:root,env,maxBuffer:8*1024*1024});
}
function boundData(root,read){
 const bound=new Map();
 const member=path=>{const bytes=physical(root,path),supplied=read(path);assert.ok(Buffer.isBuffer(supplied)&&equal(bytes,supplied),'test callback must expose current physical bytes '+path);assert.ok(equal(physical(root,path),bytes),'callback changed physical test input '+path);bound.set(path,Buffer.from(bytes));return bytes;};
 const assertPhysical=()=>{for(const[path,bytes]of bound)assert.ok(equal(physical(root,path),bytes),'changed current physical test input '+path);};
 const assertCurrent=()=>{
  for(const[path,bytes]of bound){const supplied=read(path);assert.ok(Buffer.isBuffer(supplied)&&equal(bytes,supplied),'changed current test callback '+path);}
  assertPhysical();
 };
 const raw=member(PROPOSAL);assert.equal(hash(raw),PROPOSAL_SHA);assert.equal(raw.length,3578);
 const packet=JSON.parse(raw);
 const image=ref=>{const bytes=member(ref.path);assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);return gunzipSync(bytes);};
 return {bound,member,image,packet,assertCurrent,assertPhysical};
}
/** Finite current registry identity; historical67/69 bytes never become a reader. */
export function currentCanonicalTestRegistry({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const data=boundData(root,read),{packet,image,member}=data;
 const before=image(packet.registry_before_image),after=image(packet.registry_after_image);
 assert.deepEqual({sha256:hash(before),bytes:before.length},{sha256:'be50b37d181b43960361860dd7cb3bb24d0f2d1b0a2ecfaa5a85a791e4869399',bytes:15548});
 assert.deepEqual({sha256:hash(after),bytes:after.length},{sha256:'e90d2268e862284605dd9b4f5630c0d9d84976f6014679d1aa4acbc47f38c4cc',bytes:15768});
 assert.ok(equal(gitData(root,REGISTRY),before));
 const text=before.toString();assert.equal(text.split('];\n').length,2);assert.equal(text.replace('];\n',BASE_RECORD+'];\n'),after.toString());
 const actual=member(REGISTRY);assert.ok(equal(actual,before)||equal(actual,after),'unqualified current registry');
 const count=equal(actual,before)?69:70;data.assertCurrent();
 return {actual:Buffer.from(actual),comparison69:Buffer.from(before),registered_source_contracts:count,assertCurrent:data.assertCurrent,assertPhysical:data.assertPhysical};
}
/** Exact physical426/69,426/70 precursor or427/70, with comparison DATA only. */
export function currentCanonicalTestFrame({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const registry=currentCanonicalTestRegistry({root,read}),data=boundData(root,read),{packet,image,member}=data;
 const before=image(packet.ledger_before_image),after=image(packet.ledger_after_image);
 for(const[name,bytes]of [['before',before],['after',after]]){assert.equal(hash(bytes),packet[name].sha256);assert.equal(bytes.length,packet[name].bytes);}
 assert.ok(equal(gitData(root,LEDGER),before));
 const span=bytes=>{const text=bytes.toString(),markers=[...text.matchAll(/^    \{/gm)],matches=[];
  for(let i=0;i<markers.length;i++){const start=markers[i].index+4,next=i+1<markers.length?markers[i+1].index:text.indexOf('\n  ],',start);const slice=text.slice(start,next).trimEnd().replace(/,$/,'');const row=JSON.parse(slice);if(row.sha===packet.sha)matches.push({start,end:start+slice.length,row});}
  assert.equal(markers.length,1697);assert.equal(matches.length,1);return {text,...matches[0]};};
 const old=span(before),next=span(after);let expected=old.text.slice(0,old.start)+next.text.slice(next.start,next.end)+old.text.slice(old.end);
 for(const[key,prior,current]of [['closed_dispositions',426,427],['open_or_deferred',1271,1270]]){const token=`  "${key}": ${prior},`;assert.equal(expected.split(token).length,2);expected=expected.replace(token,`  "${key}": ${current},`);}
 assert.equal(expected,after.toString()); // All1696 unselected entry bytes remain exact.
 const actual=member(LEDGER);assert.ok(equal(actual,before)||equal(actual,after),'unqualified current test ledger');assert.ok(!equal(actual,after)||registry.registered_source_contracts===70);
 const assertCurrent=()=>{registry.assertCurrent();data.assertCurrent();registry.assertPhysical();data.assertPhysical();};
 const comparison=(path,supplied)=>{assertCurrent();assert.ok([LEDGER,REGISTRY].includes(path));assert.ok(Buffer.isBuffer(supplied)&&equal(supplied,path===LEDGER?actual:registry.actual));return Buffer.from(path===LEDGER?before:registry.comparison69);};
 assertCurrent();return {comparison,assertCurrent,registered_source_contracts:registry.registered_source_contracts,individual_source_reviews:equal(actual,after)?91:90,base_class_decisions:equal(actual,after)?1:0};
}
export function assertCurrentCanonicalTestRegistry({historicalRegistry,qualified,root=process.cwd(),read=path=>readFileSync(join(root,path))}){
 assert.equal(hash(historicalRegistry),'03a18cd09e4183f4307f1ec2c17d0797eea72db0440e23530e4d015ea0dae6a8');
 const expected=tableLocalCompilationRegistrySuccessor(legacyRemovalRegistrySuccessor(historicalRegistry));
 const current=currentCanonicalTestRegistry({root,read}),path=REGISTRY,actual=read(path);
 assert.deepEqual(current.comparison69,expected,'exact two finite source successors retained as DATA');
 assert.equal(sourceContractDefinitions.length,current.registered_source_contracts);assert.equal(new Set(sourceContractDefinitions.map(row=>row.sha)).size,current.registered_source_contracts);
 assert.deepEqual(qualified.reference,{path,sha256:hash(actual),bytes:actual.length});
 const guards=new Map();
 for(const ref of qualified.bound){
  const observed={path:ref.path,sha256:ref.sha256,bytes:ref.bytes};
  assert.equal(guards.has(observed.path),false,'duplicate current canonical guard');
  const bytes=read(observed.path);assert.equal(hash(bytes),observed.sha256);assert.equal(bytes.length,observed.bytes);
  assert.equal(ref.path,observed.path);assert.equal(ref.sha256,observed.sha256);assert.equal(ref.bytes,observed.bytes);guards.set(observed.path,observed);
 }
 const tools=currentSassToolReferenceSubject({root,read});
 for(const ref of tools.bound)assert.deepEqual(guards.get(ref.path),ref,'canonical tool role omitted a current finite source input');
 qualified.assertCurrent();tools.assertCurrent();current.assertCurrent();
 // The last registry callback cannot invalidate an earlier qualified/tool input.
 // These trusted reads preserve the existing finite declared-peer read rules.
 for(const ref of guards.values()){
  const bytes=readHistoricalContractRepairOwnerMember(root,ref.path);
  assert.equal(hash(bytes),ref.sha256,'changed final physical canonical test input '+ref.path);
  assert.equal(bytes.length,ref.bytes);
 }
 return {historical_registered_source_contracts:67,registered_source_contracts:current.registered_source_contracts,
  current_registry_tool_bindings:guards.size,current_registry_tool_bindings_verified:true,
  all_current_tool_bindings_retained:true};
}
