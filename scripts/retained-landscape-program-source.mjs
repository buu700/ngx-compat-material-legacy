/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Two finite landscape program identities; metadata only, no old execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import * as landscape from './autocomplete-landscape-source-judgment.mjs';

const SELF='scripts/retained-landscape-program-source.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const PACKET={path:'compatibility/rc/main-retained-landscape-program-source-v1.json',sha256:'3e0db22fc8764f8b82afeb5f99251cc6f86ebe0f7cf49a4906730041e63a3354',bytes:11763};
const BASE='62e961dd19e519ad47220a9a36c5d8c9e60fd18c';
const paths=['scripts/autocomplete-landscape-source-judgment.mjs','tests/autocomplete_landscape_probe.mjs'];
const loaded=landscape.autocompleteLandscapeSourceJudgment,toString=Function.prototype.toString;
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const clean=ref=>({path:ref.path,sha256:ref.sha256,bytes:ref.bytes});
const check=(raw,ref)=>{assert.ok(Buffer.isBuffer(raw));assert.equal(hash(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);};
const safe=path=>{assert.equal(typeof path,'string');assert.ok(!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));return path;};

export function retainedLandscapeProgramSource({root=process.cwd(),read}={}){
  root=resolve(root);read??=path=>readEvidenceMember(root,path);assert.equal(typeof read,'function');
  const physical=path=>readEvidenceMember(root,safe(path));assert.ok(physical(SELF).equals(image));
  const raw=physical(PACKET.path);check(raw,PACKET);const packet=JSON.parse(raw);
  assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-main-retained-landscape-program-source');assert.equal(packet.base_head,BASE);
  for(const[key,value]of Object.entries({source_scope_only:true,historical_programs_executed:false,historical_packets_rewritten:false,
    original_report_bodies_changed:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(packet[key],value,key);
  assert.deepEqual(packet.updates.map(row=>row.path),paths);assert.equal(packet.support.length,9);assert.equal(packet.usages.length,2);
  const env={PATH:process.env.PATH,LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
  const git=(args,input)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,input,maxBuffer:8*1024*1024});
  git(['merge-base','--is-ancestor',BASE,'HEAD']);
  const requests=new Map();
  for(const row of packet.updates){assert.match(row.before_commit,/^[a-f0-9]{40}$/);git(['merge-base','--is-ancestor',row.before_commit,BASE]);requests.set(row.before_commit+':'+safe(row.path),row.before);}
  for(const ref of packet.support)requests.set(BASE+':'+safe(ref.path),ref);
  const bodies=git(['cat-file','--batch'],Buffer.from([...requests.keys()].join('\n')+'\n')),images=new Map();let offset=0;
  for(const[key,ref]of requests){
    const end=bodies.indexOf(10,offset);assert.ok(end>=offset);const header=bodies.subarray(offset,end).toString().split(' ');offset=end+1;
    assert.equal(header.length,3);assert.equal(header[0],ref.blob_oid);assert.equal(header[1],'blob');assert.match(header[2],/^\d+$/);
    const size=Number(header[2]);assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+size<bodies.length);
    const body=Buffer.from(bodies.subarray(offset,offset+size));check(body,ref);offset+=size;assert.equal(bodies[offset++],10);images.set(key,body);
  }
  assert.equal(offset,bodies.length);
  const bound=new Map(),identities=new Map();
  const add=ref=>{const value=clean(ref),prior=bound.get(ref.path);if(prior)assert.deepEqual(prior,value);else bound.set(ref.path,value);};
  add({path:SELF,sha256:hash(image),bytes:image.length});add(PACKET);
  for(const row of packet.updates){
    assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);
    const before=images.get(row.before_commit+':'+row.path),parts=[];let cursor=0;
    for(const edit of row.edits){
      assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor&&edit.offset<=before.length);
      const old=Buffer.from(edit.before);assert.ok(before.subarray(edit.offset,edit.offset+old.length).equals(old));
      parts.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+old.length;
    }
    parts.push(before.subarray(cursor));const after=Buffer.concat(parts);check(after,row.after);assert.ok(after.equals(physical(row.path)));add(row.after);
    identities.set(row.path,{before:clean(row.before),after:clean(row.after)});
  }
  for(const ref of packet.support){check(physical(ref.path),ref);assert.ok(physical(ref.path).equals(images.get(BASE+':'+ref.path)));add(ref);}
  const readerUsage=packet.usages[0],diagnosticUsage=packet.usages[1];
  assert.equal(readerUsage.path,'compatibility/rc/autocomplete-selection-source-reader-successors.json');
  assert.equal(diagnosticUsage.path,'compatibility/rc/autocomplete-landscape-current-source-review.json');
  for(const ref of packet.usages){check(physical(ref.path),ref);add(ref);}
  const readers=JSON.parse(physical(readerUsage.path)),diagnostic=JSON.parse(physical(diagnosticUsage.path));assert.equal(readers.line,'main');assert.equal(diagnostic.line,'main');
  const hook=readers.code_subjects.find(row=>row.path===paths[0]);assert.deepEqual({path:hook.path,...hook.after},identities.get(paths[0]).before);
  assert.deepEqual(diagnostic.diagnostic_producer,identities.get(paths[1]).before);
  const assertLoaded=()=>{assert.equal(landscape.autocompleteLandscapeSourceJudgment,loaded);assert.equal(hash(toString.call(loaded)),packet.loaded_function_sha256);};
  const assertCurrent=()=>{
    assertLoaded();for(const ref of bound.values()){
      const actual=physical(ref.path);check(actual,ref);const supplied=read(ref.path);
      assert.ok(Buffer.isBuffer(supplied)&&actual.equals(supplied),'nonphysical current landscape program '+ref.path);assert.ok(actual.equals(physical(ref.path)));
    }
    for(const ref of bound.values())check(physical(ref.path),ref);assertLoaded();
  };
  const qualifyMetadata=value=>{
    assert.ok(value&&typeof value==='object'&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype);
    const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields),hasBytes=Object.hasOwn(fields,'bytes');
    assert.ok(keys.every(key=>typeof key==='string'));assert.deepEqual(keys.sort(),hasBytes?['bytes','path','sha256']:['path','sha256']);
    for(const field of Object.values(fields))assert.ok(Object.hasOwn(field,'value')&&field.enumerable);
    const path=safe(fields.path.value);assert.match(fields.sha256.value,/^[a-f0-9]{64}$/);const row=identities.get(path);if(!row)return null;
    const known=[row.before,row.after].find(ref=>ref.sha256===fields.sha256.value);assert.ok(known,'unknown landscape program identity '+path);if(hasBytes)assert.equal(fields.bytes.value,known.bytes);
    return {path,sha256:row.after.sha256,...(hasBytes?{bytes:row.after.bytes}:{})};
  };
  assertCurrent();return Object.freeze({get bound(){return structuredClone([...bound.values()]);},
    get transitions(){return structuredClone([...identities].map(([path,row])=>({path,...row})));},qualifyMetadata,assertCurrent,
    historical_code_executed_or_exposed:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'});
}
