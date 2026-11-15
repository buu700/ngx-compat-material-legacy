/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
const ownerRuntime=process.execPath,ownerPath=process.env.PATH;
const ownerJSONParse=JSON.parse,ownerJSONStringify=JSON.stringify,ownerBufferFrom=Buffer.from,ownerBufferToString=Buffer.prototype.toString;
function runDensityResourceOwner(root,path,initial,initialRef,read){
 for(const name of ['compatibility/rc/current-main-density-input-successor-v2.json','compatibility/rc/current-main-density-input-successor-v3.json','compatibility/rc/main-tooltip-resource-source-programs-v1.json','compatibility/rc/main-sass-graph-resource-source-programs-v2.json','compatibility/rc/main-sass-resource-contract-programs-v1.json','compatibility/rc/current-main-density-source-ae9-successor-v1.json','compatibility/rc/current-main-sass-form-field-executable-source-v1.json','compatibility/rc/current-main-form-field-source-successor-v1.json','compatibility/rc/current-main-sass-core-animation-export-v1.json','compatibility/rc/current-main-sass-protected-product-v1.json','scripts/main-density-native-owner-v2.mjs','scripts/main-density-resource-owner-v2.mjs'])read(name);
 if(JSON.parse!==ownerJSONParse||JSON.stringify!==ownerJSONStringify||Buffer.from!==ownerBufferFrom||Buffer.prototype.toString!==ownerBufferToString)throw Error('density owner operations changed');
 const raw=execFileSync(ownerRuntime,['--input-type=module','--eval',"import {readFileSync,lstatSync} from 'node:fs';import{join,resolve}from'node:path';import{createHash}from'node:crypto';const root=resolve(process.argv[1]),name=process.argv[2],pin=process.argv[3];if(process.version!=='v24.21.0'||!/^scripts\\/[a-z0-9-]+\\.mjs$/.test(name))throw Error('owner launcher');let p=root;for(const x of name.split('/')){p=join(p,x);if(lstatSync(p).isSymbolicLink())throw Error('linked owner')}const raw=readFileSync(p);if(createHash('sha256').update(raw).digest('hex')!==pin)throw Error('owner pin');process.argv=[process.argv[0],'owner',root];await import('data:text/javascript;base64,'+raw.toString('base64'));if(!readFileSync(p).equals(raw))throw Error('owner changed');",root,'scripts/main-density-resource-owner-v2.mjs',"81596241ee1584472d5407a210fd37af3937eef181edb82b562224f04a9e1a3a"],{cwd:root,env:{PATH:ownerPath,LANG:'C',LC_ALL:'C',NODE_OPTIONS:''},input:ownerJSONStringify({path,initial:ownerBufferToString.call(initial,'base64'),initialRef}),encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});const out=ownerJSONParse(raw);if(!out||typeof out.current!=='string'||!out.expected)throw Error('density owner result');return {current:ownerBufferFrom(out.current,'base64'),expected:out.expected};
}
/** Exact two-epoch source programs; historical bytes are comparison data only. */
import assert from 'node:assert/strict';

import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const SELF='scripts/select-program-transition-source-v2.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const SHA=raw=>createHash('sha256').update(raw).digest('hex');
const ref=(path,raw)=>({path,sha256:SHA(raw),bytes:raw.length});
const packets=[
 ['compatibility/rc/current-sass-stepper-source-executables-v1.json','577ca8a935a6f431ed282769be29d84686c109a94faef9174de0091754e59d61','main-stepper-current-source-executable-successor','compatibility/rc/current-sass-select-source-executables-v2.json','ca173498329ead35221ef603bcb751699dd18e041cc002eca97c644f87e980a0','main-select-current-source-executable-successor',['scripts/current-sass-source.mjs','scripts/current_sass_source.py']],
 ['compatibility/rc/current-sass-stepper-spinner-executables-v1.json','2b2440b6f1b870e456d8585129e99270dffd90fc03842ab0944d555908b7b760','main-stepper-spinner-source-executable-successor','compatibility/rc/current-sass-select-spinner-executables-v2.json','76216b309c092dcf68f90c29f37450fe656638524add4cd305894ef3a08860a3','main-select-spinner-source-executable-successor',['scripts/current-sass-spinner-snack-contract.mjs','scripts/current_sass_spinner_snack_admission.py']],
];
function replay(before,edits){let cursor=0;const parts=[];for(const e of edits){assert.deepEqual(Object.keys(e).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(e.offset)&&e.offset>=cursor);const old=Buffer.from(e.before),next=Buffer.from(e.after);assert.ok(before.subarray(e.offset,e.offset+old.length).equals(old));parts.push(before.subarray(cursor,e.offset),next);cursor=e.offset+old.length;}return Buffer.concat([...parts,before.subarray(cursor)]);}
export function selectProgramTransitions({root,line,read}){
 assert.equal(typeof read,'function');if(line!=='main')return {refs:new Map(),assertCurrent:()=>{}};
 const physical=path=>{assert.equal(typeof path,'string');assert.ok(path&&!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(x=>x&&x!=='.'&&x!=='..'));let cursor=root;for(const part of path.split('/')){cursor=join(cursor,part);assert.ok(!lstatSync(cursor).isSymbolicLink());}assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);};
 const bound=new Map(),take=path=>{const actual=physical(path),value=read(path);assert.ok(Buffer.isBuffer(value)&&actual.equals(value)&&physical(path).equals(actual));if(bound.has(path))assert.ok(actual.equals(bound.get(path)));else bound.set(path,Buffer.from(actual));return actual;};
 assert.ok(take(SELF).equals(image));assert.equal(SHA(take('scripts/main-sass-resource-continuation.mjs')),'e023340b48171bd0a865899969eacc35f6489a4a2c0b820dc4dce082b6f39c7c');assert.equal(SHA(take('scripts/stepper-program-transition-source.mjs')),'150b6b8bcf2fd09d32e5ee56e0736386245bb47c30378d48f3e8ba20e781b514');const refs=new Map();
 const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
 for(const [path,pin,role,nextPath,nextPin,nextRole,members] of packets){
  const raw=take(path);assert.equal(SHA(raw),pin);const p=JSON.parse(raw);assert.equal(p.schema_version,1);assert.equal(p.role,role);assert.equal(p.line,'main');assert.equal(p.source_parent,'42d02491648097656ccb3c590dbaaea066c3e603');assert.equal(p.source_scope_only,true);assert.equal(p.artifact_or_audit_admission_granted,false);assert.deepEqual(p.updates.map(r=>r.path),members);
  const nextRaw=take(nextPath);assert.equal(SHA(nextRaw),nextPin);const next=JSON.parse(nextRaw);assert.equal(next.schema_version,2);assert.equal(next.role,nextRole);assert.equal(next.line,'main');assert.deepEqual(next.previous_packet,ref(path,raw));assert.equal(next.source_scope_only,true);assert.equal(next.artifact_or_audit_admission_granted,false);assert.deepEqual(next.updates.map(r=>r.path),members);
  for(const item of next.authored_support??[])assert.deepEqual(ref(item.path,take(item.path)),item);
  for(const row of p.updates){
   const old=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',p.source_parent+':'+row.path],{cwd:root,env});assert.deepEqual(ref(row.path,old),row.before);
   const mid=replay(old,row.edits);assert.deepEqual(ref(row.path,mid),row.after);const update=next.updates.find(r=>r.path===row.path);assert.deepEqual(update.before,row.after);
   const after=replay(mid,update.edits);assert.deepEqual(ref(row.path,after),update.after);const git=(commit,path)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env});for(const commit of ['19ee6343365c391deb97362caec413b113665e1b','8fe95564c981a9dd73605d27beaa0496824e8444','ecc1051cfb829f0b67ba9cb50e4b733d6684ebff','b94f169d4fe57d571e6a7c3f911a9395f6a60c4d'])execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',commit,'HEAD'],{cwd:root,env});const current=runDensityResourceOwner(root,row.path,after,update.after,take);assert.ok(take(row.path).equals(current.current));refs.set(row.path,current.expected.sha256);
  }
 }
 let active=false,nested=false;const assertCurrent=()=>{if(active){nested=true;assert.fail('reentrant select program source');}active=true;nested=false;try{for(const[path,bytes]of bound)assert.ok(take(path).equals(bytes));assert.equal(nested,false,'nested select program source attempt');for(const[path,bytes]of bound)assert.ok(physical(path).equals(bytes));}finally{active=false;}};assertCurrent();return {refs,assertCurrent};
}
