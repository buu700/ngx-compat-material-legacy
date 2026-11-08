/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Finite historical/current native-source metadata; no old source reader. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import * as judgments from './autocomplete-selection-source-judgment.mjs';

const SELF='scripts/retained-selection-metadata-context.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const PACKET={path:'compatibility/rc/main-retained-selection-metadata-context-v1.json',
  sha256:'a34a3706be3bc0ef6a8a6ac79d3e74da4df1a7526b70a537717a6552f4cdab0d',bytes:25013};
const BASE='92ee0d1cd06a939ed21d790d542fdfeae808c746';
const loaded=judgments.autocompleteSelectionSourceJudgments,toString=Function.prototype.toString;
const FUNCTION_SHA='d6022fba2f9b729749efa3b61fdacd31c8134defae074f0ec3964009b2d23292';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const clean=ref=>({path:ref.path,sha256:ref.sha256,bytes:ref.bytes});
const check=(raw,ref)=>{assert.ok(Buffer.isBuffer(raw));assert.equal(hash(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);};
const safe=path=>{assert.equal(typeof path,'string');assert.ok(!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));return path;};

export function retainedSelectionMetadataContext({root=process.cwd(),read}={}){
  root=resolve(root);read??=path=>readEvidenceMember(root,path);assert.equal(typeof read,'function');
  const physical=path=>readEvidenceMember(root,safe(path));
  assert.ok(physical(SELF).equals(image));const raw=physical(PACKET.path);check(raw,PACKET);const packet=JSON.parse(raw);
  assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-main-retained-selection-metadata-context');assert.equal(packet.base_head,BASE);
  for(const[key,value]of Object.entries({source_scope_only:true,historical_programs_executed:false,historical_bodies_returned_as_current:false,
    original_reports_rewritten:false,source_judgments_changed:0,runtime_artifact_floor_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(packet[key],value,key);
  assert.equal(packet.before_members.length,34);assert.equal(packet.current_source_members.length,40);assert.equal(packet.support.length,3);
  const usageRaw=physical(packet.usage.path);check(usageRaw,packet.usage);const usage=JSON.parse(usageRaw);assert.equal(usage.line,'main');
  assert.equal(packet.usage.path,'compatibility/rc/autocomplete-selection-ledger-successor.json');
  assert.deepEqual(usage.qualification_members,packet.before_members.map(clean));
  const env={PATH:process.env.PATH,LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
  const git=(args,input)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,input,maxBuffer:16*1024*1024});
  git(['merge-base','--is-ancestor',BASE,'HEAD']);
  const requests=new Map(),commits=new Set();
  for(const ref of [...packet.before_members,...packet.current_source_members,...packet.support]){
    assert.match(ref.commit,/^[a-f0-9]{40}$/);safe(ref.path);commits.add(ref.commit);
    const key=ref.commit+':'+ref.path,prior=requests.get(key);if(prior)assert.deepEqual(prior,ref);else requests.set(key,ref);
  }
  for(const commit of commits)git(['merge-base','--is-ancestor',commit,BASE]);
  const bodies=git(['cat-file','--batch'],Buffer.from([...requests.keys()].join('\n')+'\n'));let offset=0;
  // Git bodies are authenticated data only and stay private to this factory.
  // They are never imported, executed, or returned through a source reader.
  for(const ref of requests.values()){
    const end=bodies.indexOf(10,offset);assert.ok(end>=offset);const fields=bodies.subarray(offset,end).toString().split(' ');offset=end+1;
    assert.equal(fields.length,3);assert.equal(fields[0],ref.blob_oid);assert.equal(fields[1],'blob');assert.match(fields[2],/^\d+$/);
    const size=Number(fields[2]);assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+size<bodies.length);
    check(bodies.subarray(offset,offset+size),ref);offset+=size;assert.equal(bodies[offset++],10);
  }
  assert.equal(offset,bodies.length);
  const before=new Map(),current=new Map(),known=new Map(),bound=new Map();
  const add=ref=>{const value=clean(ref),prior=bound.get(ref.path);if(prior)assert.deepEqual(prior,value);else bound.set(ref.path,value);};
  const identity=ref=>{const values=known.get(ref.path)??new Map(),prior=values.get(ref.sha256);if(prior)assert.deepEqual(prior,clean(ref));else values.set(ref.sha256,clean(ref));known.set(ref.path,values);};
  add({path:SELF,sha256:hash(image),bytes:image.length});add(PACKET);add(packet.usage);
  for(const ref of packet.before_members){assert.ok(!before.has(ref.path));before.set(ref.path,clean(ref));identity(ref);}
  for(const ref of packet.current_source_members){assert.equal(ref.commit,BASE);assert.ok(!current.has(ref.path));current.set(ref.path,clean(ref));identity(ref);add(ref);}
  for(const path of before.keys())assert.ok(current.has(path),'missing current native metadata member '+path);
  assert.deepEqual([...current.keys()].filter(path=>!before.has(path)),packet.added_current_support_paths);
  assert.deepEqual(packet.added_current_support_paths,[
    'scripts/autocomplete-current-spec-source-successor.mjs','compatibility/rc/main-autocomplete-current-spec-source-successor-v1.json',
    'scripts/selection-native-registry-source-successor.mjs','compatibility/rc/parent-main-historical-pointer-epoch-review-v1.json',
    'projects/ngx-material-legacy/package.json','scripts/autocomplete-selection-native-subject.mjs',
  ]);
  for(const ref of packet.support){assert.equal(ref.commit,BASE);add(ref);}
  const assertLoaded=()=>{assert.equal(judgments.autocompleteSelectionSourceJudgments,loaded);assert.equal(hash(toString.call(loaded)),FUNCTION_SHA);};
  const assertCurrent=()=>{
    assertLoaded();
    for(const ref of bound.values()){
      const actual=physical(ref.path);check(actual,ref);const supplied=read(ref.path);
      assert.ok(Buffer.isBuffer(supplied)&&actual.equals(supplied),'nonphysical retained native metadata '+ref.path);
      assert.ok(actual.equals(physical(ref.path)));
    }
    for(const ref of bound.values())check(physical(ref.path),ref);assertLoaded();
  };
  const select=value=>{
    assert.ok(value&&typeof value==='object'&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype);
    const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields),hasBytes=Object.hasOwn(fields,'bytes');
    assert.ok(keys.every(key=>typeof key==='string'));assert.deepEqual(keys.sort(),hasBytes?['bytes','path','sha256']:['path','sha256']);
    for(const field of Object.values(fields))assert.ok(Object.hasOwn(field,'value')&&field.enumerable);
    const path=safe(fields.path.value);assert.match(fields.sha256.value,/^[a-f0-9]{64}$/);const values=known.get(path);if(!values)return null;
    const ref=values.get(fields.sha256.value);assert.ok(ref,'unknown retained native metadata identity '+path);if(hasBytes)assert.equal(fields.bytes.value,ref.bytes);
    return {path,hasBytes};
  };
  const project=(value,which)=>{const selected=select(value);if(!selected)return null;const ref=which.get(selected.path);if(!ref)return null;
    return {path:ref.path,sha256:ref.sha256,...(selected.hasBytes?{bytes:ref.bytes}:{})};};
  assertCurrent();
  return Object.freeze({get bound(){return structuredClone([...bound.values()]);},get currentMembers(){return structuredClone([...current.values()]);},
    get historicalMembers(){return structuredClone([...before.values()]);},
    // These pure selectors provide descriptors only. Callers must bracket
    // actual current consumption with assertCurrent and their own scope guard.
    qualifyMetadata:value=>project(value,current),historicalMetadata:value=>project(value,before),assertCurrent,
    historical_code_executed_or_exposed:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'});
}
