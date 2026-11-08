/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Three finite program identities. Historical code is data, never a reader. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SELF='scripts/retained-validator-program-source.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const PACKET={path:'compatibility/rc/main-retained-validator-programs-v1.json',sha256:'e26a11ac20146aa41e5b2a540606cf659c627b5235ae09687a0bb3cea4b2780d',bytes:6968};
const AUTHORITY='1c4ace0fa7a0e7cc4d3e919f415e05ca5e46f3c0',INTERMEDIATE='4e6f608402e99da9fb550bb46040aa68a648440a',CURRENT='1b81670bc1390da94e7928c0fb24f361e1af08e8';
const PATHS=['scripts/upstream-build-scope-evidence.mjs','scripts/upstream-test-consolidation-evidence.mjs','scripts/upstream-bazel-build-scope.mjs'];
const sha=raw=>createHash('sha256').update(raw).digest('hex'),clean=ref=>({path:ref.path,sha256:ref.sha256,bytes:ref.bytes});
const safePath=path=>{assert.equal(typeof path,'string');assert.ok(!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));return path;};
const exact=(raw,ref)=>{assert.ok(Buffer.isBuffer(raw));assert.equal(sha(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);};
export function retainedValidatorProgramSource({root=process.cwd(),read}={}){
 root=resolve(root);read??=path=>readEvidenceMember(root,path);assert.equal(typeof read,'function');
 const physical=path=>readEvidenceMember(root,safePath(path));assert.ok(physical(SELF).equals(image));
 const packetRaw=physical(PACKET.path);exact(packetRaw,PACKET);const packet=JSON.parse(packetRaw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-main-retained-validator-program-identities');
 assert.equal(packet.authority,AUTHORITY);assert.equal(packet.intermediate_commit,INTERMEDIATE);assert.equal(packet.current_commit,CURRENT);
 for(const [key,value]of Object.entries({historical_programs_executed:false,historical_program_bytes_returned_as_current:false,original_source_pins_rewritten:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(packet[key],value,key);
 assert.deepEqual(packet.programs.map(row=>row.path),PATHS);assert.equal(packet.support.length,14);
 assert.equal(packet.source_input.path,'compatibility/rc/packed-upstream-source-inputs.json');assert.equal(packet.source_input.sha256,'971a35dd5a3f6007b419e333f7972ba676635822a833f5445021aa58445e2b27');
 const env={PATH:process.env.PATH,LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=(args,input)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,input,maxBuffer:8*1024*1024});
 for(const [before,after]of [[AUTHORITY,INTERMEDIATE],[INTERMEDIATE,CURRENT],[CURRENT,'HEAD']])git(['merge-base','--is-ancestor',before,after]);
 const verifyGit=(commit,refs)=>{
  const raw=git(['cat-file','--batch'],Buffer.from(refs.map(ref=>commit+':'+safePath(ref.path)+'\n').join('')));let offset=0;
  for(const ref of refs){const end=raw.indexOf(10,offset);assert.ok(end>=offset);const header=raw.subarray(offset,end).toString().split(' ');offset=end+1;assert.equal(header.length,3);assert.equal(header[0],ref.blob_oid);assert.equal(header[1],'blob');assert.match(header[2],/^\d+$/);const size=Number(header[2]);assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+size<raw.length);exact(raw.subarray(offset,offset+size),ref);offset+=size;assert.equal(raw[offset++],10);}
  assert.equal(offset,raw.length);
 };
 verifyGit(AUTHORITY,[packet.source_input,...packet.programs.map(row=>row.before)]);
 verifyGit(INTERMEDIATE,packet.programs.map(row=>row.intermediate));
 verifyGit(CURRENT,[...packet.programs.map(row=>row.current),...packet.support]);
 const bound=new Map(),identities=new Map();
 const add=ref=>{const normalized=clean(ref),prior=bound.get(ref.path);if(prior)assert.deepEqual(prior,normalized);else bound.set(ref.path,normalized);};
 add({path:SELF,sha256:sha(image),bytes:image.length});add(PACKET);add(packet.source_input);
 const input=JSON.parse(physical(packet.source_input.path));exact(physical(packet.source_input.path),packet.source_input);assert.equal(input.line,'main');
 for(const row of packet.programs){
  for(const role of ['before','intermediate','current'])assert.equal(row[role].path,row.path);
  const old=input.validation_code_subjects.filter(ref=>ref.path===row.path);assert.equal(old.length,1);assert.equal(old[0].sha256,row.before.sha256);
  const known=new Map();for(const ref of [row.before,row.intermediate,row.current]){const prior=known.get(ref.sha256);if(prior)assert.deepEqual(prior,clean(ref));else known.set(ref.sha256,clean(ref));}
  identities.set(row.path,{known,current:clean(row.current)});add(row.current);
 }
 for(const ref of packet.support)add(ref);
 const assertCurrent=()=>{
  for(const ref of bound.values()){
   const raw=physical(ref.path);exact(raw,ref);const supplied=read(ref.path);
   assert.ok(Buffer.isBuffer(supplied)&&raw.equals(supplied),'nonphysical retained validator program '+ref.path);
   assert.ok(raw.equals(physical(ref.path)),'retained validator input changed during callback '+ref.path);
  }
  // No callback may leave an earlier source or receipt changed at settlement.
  for(const ref of bound.values())exact(physical(ref.path),ref);
 };
 const qualifyMetadata=value=>{
  assert.ok(value&&typeof value==='object'&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype);
  const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields);assert.ok(keys.every(key=>typeof key==='string'));
  const hasBytes=Object.hasOwn(fields,'bytes');assert.deepEqual(keys.sort(),hasBytes?['bytes','path','sha256']:['path','sha256']);
  for(const field of Object.values(fields))assert.ok(Object.hasOwn(field,'value')&&field.enumerable);
  const path=safePath(fields.path.value);assert.match(fields.sha256.value,/^[a-f0-9]{64}$/);
  const row=identities.get(path);if(!row)return null;const known=row.known.get(fields.sha256.value);assert.ok(known,'unknown retained validator identity');if(hasBytes)assert.equal(fields.bytes.value,known.bytes);
  return {path:row.current.path,sha256:row.current.sha256,...(hasBytes?{bytes:row.current.bytes}:{})};
 };
 assertCurrent();return Object.freeze({
  get bound(){return structuredClone([...bound.values()]);},get transitions(){return structuredClone(packet.programs.map(row=>({path:row.path,before:clean(row.before),intermediate:clean(row.intermediate),current:clean(row.current)})));},
  // Pure metadata selection only. The consumer must guard before and after
  // actual current reads. No historical code body/read capability is exposed.
  qualifyMetadata,assertCurrent,source_judgments_changed:0,current_read_route_returned:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed',
 });
}
