/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Finite late-stage program identities; no historical reader or admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {gunzipSync} from 'node:zlib';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import * as candidate from './upstream-candidate-source-evidence.mjs';
import * as spec from './autocomplete-selection-spec-subject.mjs';
import * as native from './autocomplete-selection-native-subject.mjs';
const SELF='scripts/retained-later-stage-program-source.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const PACKET={path:'compatibility/rc/main-retained-later-stage-programs-v1.json',sha256:'364c06bcc14b5b5128b4d6cb7a88fb375f13aad4acbac10e75be08c46c503777',bytes:26250};
const BASE='44bff3e976968eb2316a26a9735e217107864785';
const modules=new Map([['scripts/upstream-candidate-source-evidence.mjs',candidate],['scripts/autocomplete-selection-spec-subject.mjs',spec],['scripts/autocomplete-selection-native-subject.mjs',native]]);
const symbols=['candidateSourceEvidenceOk','autocompleteSelectionReaderSubject','autocompleteSelectionNativeSubject'];
const loaded=new Map([...modules].map(([path,module],index)=>[path,module[symbols[index]]])),toString=Function.prototype.toString;
const sha=raw=>createHash('sha256').update(raw).digest('hex'),clean=ref=>({path:ref.path,sha256:ref.sha256,bytes:ref.bytes});
const safe=path=>{assert.equal(typeof path,'string');assert.ok(!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));return path;};
const exact=(raw,ref)=>{assert.ok(Buffer.isBuffer(raw));assert.equal(sha(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);};
export function retainedLaterStageProgramSource({root=process.cwd(),read}={}){
 root=resolve(root);read??=path=>readEvidenceMember(root,path);assert.equal(typeof read,'function');const physical=path=>readEvidenceMember(root,safe(path));
 assert.ok(physical(SELF).equals(image));const raw=physical(PACKET.path);exact(raw,PACKET);const packet=JSON.parse(raw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-main-retained-later-stage-programs');assert.equal(packet.base_head,BASE);
 for(const[key,value]of Object.entries({historical_programs_executed:false,historical_program_bytes_returned_as_current:false,original_usage_packets_rewritten:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(packet[key],value,key);
 assert.deepEqual(packet.programs.map(row=>row.path),[...modules.keys()]);assert.equal(packet.support.length,12);
 const env={PATH:process.env.PATH,LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=(args,input)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,input,maxBuffer:8*1024*1024});
 git(['merge-base','--is-ancestor',BASE,'HEAD']);
 const requests=new Map();for(const row of packet.programs)for(const step of row.steps)for(const[commit,ref]of [[step.parent,step.before],[step.commit,step.after]])requests.set(commit+':'+ref.path,{commit,ref});
 for(const ref of packet.support)requests.set(BASE+':'+ref.path,{commit:BASE,ref});
 const bodies=git(['cat-file','--batch'],Buffer.from([...requests.keys()].join('\n')+'\n')),images=new Map();let cursor=0;
 for(const[key,{commit,ref}]of requests){
  assert.match(commit,/^[a-f0-9]{40}$/);safe(ref.path);const end=bodies.indexOf(10,cursor);assert.ok(end>=cursor);const header=bodies.subarray(cursor,end).toString().split(' ');cursor=end+1;
  assert.equal(header.length,3);assert.equal(header[0],ref.blob_oid);assert.equal(header[1],'blob');assert.match(header[2],/^\d+$/);const size=Number(header[2]);assert.ok(Number.isSafeInteger(size)&&size>=0&&cursor+size<bodies.length);
  const body=Buffer.from(bodies.subarray(cursor,cursor+size));exact(body,ref);cursor+=size;assert.equal(bodies[cursor++],10);images.set(key,body);
 }
 assert.equal(cursor,bodies.length);
 const bound=new Map(),identities=new Map();
 const add=ref=>{const value=clean(ref),prior=bound.get(ref.path);if(prior)assert.deepEqual(prior,value);else bound.set(ref.path,value);};
 add({path:SELF,sha256:sha(image),bytes:image.length});add(PACKET);
 for(const[index,row]of packet.programs.entries()){
  assert.equal(row.loaded_symbol,symbols[index]);assert.ok(row.steps.length>0);let previous;
  assert.deepEqual(git(['log','--format=%H',row.steps[0].parent+'..'+BASE,'--',row.path]).toString().trim().split('\n'),row.steps.map(step=>step.commit).reverse());
  const known=new Map();
  for(const step of row.steps){
   assert.equal(git(['rev-list','--parents','-n','1',step.commit]).toString().trim(),step.commit+' '+step.parent);assert.equal(step.before.path,row.path);assert.equal(step.after.path,row.path);
   const before=images.get(step.parent+':'+row.path),after=images.get(step.commit+':'+row.path);if(previous)assert.ok(previous.equals(before),'noncontiguous program history');
   let offset=0;const parts=[];for(const edit of step.edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=offset&&edit.offset<=before.length);const old=Buffer.from(edit.before);assert.ok(before.subarray(edit.offset,edit.offset+old.length).equals(old));parts.push(before.subarray(offset,edit.offset),Buffer.from(edit.after));offset=edit.offset+old.length;}
   parts.push(before.subarray(offset));assert.ok(Buffer.concat(parts).equals(after));previous=after;
   for(const ref of [step.before,step.after]){const prior=known.get(ref.sha256);if(prior)assert.deepEqual(prior,clean(ref));else known.set(ref.sha256,clean(ref));}
  }
  const current=clean(row.steps.at(-1).after);assert.ok(previous.equals(physical(row.path)));add(current);add(row.usage);
  const usageRaw=physical(row.usage.path);exact(usageRaw,row.usage);let usage=JSON.parse(row.usage.path.endsWith('.gz')?gunzipSync(usageRaw):usageRaw);assert.equal(usage.line,'main');
  for(const field of row.usage_pointer)usage=usage[field];assert.equal(usage.path,row.path);assert.equal(usage.sha256,row.steps[0].before.sha256);if(usage.bytes!==undefined)assert.equal(usage.bytes,row.steps[0].before.bytes);
  identities.set(row.path,{known,current});
 }
 for(const ref of packet.support){exact(physical(ref.path),ref);assert.ok(physical(ref.path).equals(images.get(BASE+':'+ref.path)));add(ref);}
 const assertLoaded=()=>{for(const row of packet.programs){const fn=modules.get(row.path)[row.loaded_symbol];assert.equal(fn,loaded.get(row.path));assert.equal(sha(toString.call(fn)),row.loaded_function_sha256,'changed loaded late-stage function '+row.path);}};
 const assertCurrent=()=>{
  assertLoaded();for(const ref of bound.values()){const raw=physical(ref.path);exact(raw,ref);const supplied=read(ref.path);assert.ok(Buffer.isBuffer(supplied)&&raw.equals(supplied),'nonphysical late-stage program '+ref.path);assert.ok(raw.equals(physical(ref.path)));}
  for(const ref of bound.values())exact(physical(ref.path),ref);assertLoaded();
 };
 const qualifyMetadata=value=>{
  assert.ok(value&&typeof value==='object'&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype);const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields),hasBytes=Object.hasOwn(fields,'bytes');assert.ok(keys.every(key=>typeof key==='string'));assert.deepEqual(keys.sort(),hasBytes?['bytes','path','sha256']:['path','sha256']);for(const field of Object.values(fields))assert.ok(Object.hasOwn(field,'value')&&field.enumerable);
  const path=safe(fields.path.value);assert.match(fields.sha256.value,/^[a-f0-9]{64}$/);const row=identities.get(path);if(!row)return null;const prior=row.known.get(fields.sha256.value);assert.ok(prior,'unknown late-stage program identity');if(hasBytes)assert.equal(fields.bytes.value,prior.bytes);
  return {path,sha256:row.current.sha256,...(hasBytes?{bytes:row.current.bytes}:{})};
 };
 assertCurrent();return Object.freeze({get bound(){return structuredClone([...bound.values()]);},get transitions(){return structuredClone(packet.programs.map(row=>({path:row.path,before:clean(row.steps[0].before),current:clean(row.steps.at(-1).after)})));},
  // Descriptor selection is preparation data. Consumers must bracket actual
  // source consumption; no before-image program/read capability is exposed.
  qualifyMetadata,assertCurrent,historical_code_executed_or_exposed:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'});
}
