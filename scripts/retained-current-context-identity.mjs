/**
 * @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT.
 */
/** Finite old/current source identities. This is preparation data, not admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';

const SELF='scripts/retained-current-context-identity.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const PACKET={path:'compatibility/rc/main-retained-current-context-v1.json',sha256:'d47e05229546ccceec4e84d6cdffc5a430a2db2a0b019094b491878a8645af60',bytes:1351942};
const BASE='4e6f608402e99da9fb550bb46040aa68a648440a';
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const clean=ref=>({path:ref.path,sha256:ref.sha256,bytes:ref.bytes});
function safePath(path){assert.equal(typeof path,'string');assert.ok(!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));return path;}
function exact(raw,ref){assert.ok(Buffer.isBuffer(raw));assert.equal(sha(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);}
function descriptor(value){
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype);
 const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields);assert.ok(keys.every(key=>typeof key==='string'));
 assert.deepEqual(keys.sort(),Object.hasOwn(fields,'bytes')?['bytes','path','sha256']:['path','sha256']);for(const field of Object.values(fields))assert.ok(Object.hasOwn(field,'value')&&field.enumerable);
 const ref={path:safePath(fields.path.value),sha256:fields.sha256.value,...(fields.bytes?{bytes:fields.bytes.value}:{})};assert.match(ref.sha256,/^[a-f0-9]{64}$/);if(fields.bytes)assert.ok(Number.isSafeInteger(ref.bytes)&&ref.bytes>=0);return ref;
}

export function retainedCurrentContextIdentity({root=process.cwd(),read}={}){
 root=resolve(root);read??=path=>readEvidenceMember(root,path);assert.equal(typeof read,'function');
 const physical=path=>readEvidenceMember(root,safePath(path));assert.ok(physical(SELF).equals(image));
 const packetBytes=physical(PACKET.path);exact(packetBytes,PACKET);const packet=JSON.parse(packetBytes);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-main-retained-current-context-identity');assert.equal(packet.base_head,BASE);
 for(const [key,value]of Object.entries({source_scope_only:true,historical_reports_rewritten:false,historical_programs_executed:false,source_judgments_requalified:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(packet[key],value,key);
 assert.equal(packet.current.commit,BASE);assert.equal(packet.before_contexts.length,3);assert.equal(packet.current.products.length,1120);assert.equal(packet.current.inputs.length,68);
 assert.deepEqual(packet.before_contexts.map(profile=>profile.report.path),['compatibility/rc/packed-upstream-source-build.json','compatibility/rc/packed-upstream-source-build-main-e184.json','compatibility/rc/packed-upstream-source-bazel.json']);
 assert.match(JSON.parse(physical('projects/ngx-material-legacy/package.json')).version,/^22\./);
 const env={PATH:process.env.PATH,LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=(args,input)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,input,maxBuffer:128*1024*1024});
 git(['merge-base','--is-ancestor',BASE,'HEAD']);assert.equal(git(['rev-parse',BASE+'^{tree}']).toString().trim(),packet.current.tree);
 const bound=new Map(),identities=new Map(),current=new Map(),retired=new Set();
 const add=ref=>{safePath(ref.path);const normalized=clean(ref),prior=bound.get(ref.path);if(prior)assert.deepEqual(prior,normalized);else bound.set(ref.path,normalized);};
 const identity=ref=>{const normalized=clean(ref),rows=identities.get(ref.path)??new Map(),prior=rows.get(ref.sha256);if(prior)assert.deepEqual(prior,normalized);else rows.set(ref.sha256,normalized);identities.set(ref.path,rows);};
 const member=ref=>{const raw=physical(ref.path);exact(raw,ref);const supplied=read(ref.path);assert.ok(Buffer.isBuffer(supplied)&&raw.equals(supplied),'nonphysical retained context '+ref.path);assert.ok(raw.equals(physical(ref.path)),'retained context changed during callback '+ref.path);return raw;};
 add({path:SELF,sha256:sha(image),bytes:image.length});add(PACKET);
 // Git bodies below are authenticated as data only. No before-image program is
 // imported, evaluated, written into the checkout, or exposed as a current read.
 const verifyGit=(commit,refs)=>{
  assert.match(commit,/^[a-f0-9]{40}$/);git(['merge-base','--is-ancestor',commit,BASE]);
  const raw=git(['cat-file','--batch'],Buffer.from(refs.map(ref=>commit+':'+safePath(ref.path)+'\n').join('')));let offset=0;
  for(const ref of refs){const end=raw.indexOf(10,offset);assert.ok(end>=offset);const header=raw.subarray(offset,end).toString().split(' ');offset=end+1;assert.equal(header.length,3);assert.equal(header[0],ref.blob_oid);assert.equal(header[1],'blob');assert.match(header[2],/^\d+$/);const size=Number(header[2]);assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+size<raw.length);const body=raw.subarray(offset,offset+size);exact(body,ref);offset+=size;assert.equal(raw[offset++],10);}
  assert.equal(offset,raw.length);
 };
 const productPaths=packet.current.products.map(ref=>ref.path);assert.deepEqual(productPaths,[...new Set(productPaths)].sort());assert.ok(productPaths.every(path=>path.startsWith('projects/ngx-material-legacy/')));
 assert.deepEqual(git(['ls-tree','-r','--name-only',BASE,'--','projects/ngx-material-legacy']).toString().trim().split('\n'),productPaths);
 for(const ref of [...packet.current.products,...packet.current.inputs]){assert.ok(!current.has(ref.path));current.set(ref.path,clean(ref));identity(ref);add(ref);}
 verifyGit(BASE,[...packet.current.products,...packet.current.inputs]);
 for(const profile of packet.before_contexts){
  add(profile.report);const report=JSON.parse(member(profile.report)),context=report.candidate_context;
  assert.equal(sha(JSON.stringify(context)),profile.context_sha256);assert.deepEqual(context.product_members,profile.products.map(clean));
  assert.deepEqual([...context.files,...(report.additional_graph_context?.files??[])],profile.inputs.map(clean));
  verifyGit(profile.product_commit,profile.products);verifyGit(profile.input_commit,profile.inputs);
  for(const ref of [...profile.products,...profile.inputs])identity(ref);
  const old=profile.products.map(ref=>ref.path),missing=old.filter(path=>!current.has(path)).sort(),added=productPaths.filter(path=>!old.includes(path));
  assert.deepEqual(missing,profile.retired_paths);assert.equal(missing.length,23);assert.ok(missing.every(path=>path.endsWith('/internal/common-module.ts')));missing.forEach(path=>retired.add(path));
  assert.deepEqual(added,profile.added_paths);assert.ok(added.length===0||added.length===1&&added[0]==='projects/ngx-material-legacy/legacy-tabs/tab-body-reversal.spec.ts');
 }
 const assertMembership=()=>{
  const paths=git(['ls-files','--cached','--others','--exclude-standard','--','projects/ngx-material-legacy']).toString().trim().split('\n').sort();assert.deepEqual(paths,productPaths,'changed current product membership');
  for(const path of retired){let exists=true;try{lstatSync(resolve(root,path));}catch(error){if(error.code==='ENOENT')exists=false;else throw error;}assert.equal(exists,false,'retired source reintroduced '+path);}
 };
 const assertCurrent=()=>{
  assert.ok(physical(SELF).equals(image));assertMembership();
  for(const ref of bound.values())member(ref);
  // The last callback can change an earlier member. Close the observation with
  // a complete physical sweep that invokes no caller-provided code.
  for(const ref of bound.values())exact(physical(ref.path),ref);
  assertMembership();assert.ok(physical(SELF).equals(image));
 };
 const resolveReference=value=>{
  const ref=descriptor(value),rows=identities.get(ref.path);if(!rows)return null;const known=rows.get(ref.sha256);assert.ok(known,'unknown retained context identity '+ref.path);if(ref.bytes!==undefined)assert.equal(ref.bytes,known.bytes);
  const selected=current.get(ref.path);return selected?{kind:'current',reference:{...selected}}:{kind:'retired',historical:{...known}};
 };
 assertCurrent();
 return Object.freeze({
  get bound(){return structuredClone([...bound.values()]);},
  get products(){return structuredClone(packet.current.products.map(clean));},
  get inputs(){return structuredClone(packet.current.inputs.map(clean));},
  get beforeContexts(){return structuredClone(packet.before_contexts.map(profile=>({report:profile.report,products:profile.products.map(clean),inputs:profile.inputs.map(clean),retired_paths:profile.retired_paths,added_paths:profile.added_paths})));},
  // Pure finite descriptor lookup. A caller must bracket consumption with the
  // physical guard and compare fresh reads. This returns no read capability.
  resolveReference,assertCurrent,current_source_admission_granted:false,source_judgments_requalified:false,current_source_reader_returned:false,g11_claim:'not-passed',
 });
}
