/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current tool successors;old program images are comparison data only. */
import assert from 'node:assert/strict';
import {browserOwnerSourceSubject} from './browser-owner-source.mjs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,realpathSync} from 'node:fs';
import {join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {types} from 'node:util';
const PATH='scripts/checker-owner-source.mjs',INPUTS='compatibility/rc/c04-checker-owner-inputs.json';
const PINS={"main":"f909f0a47fa49c1c3ba9e84718ad7ba461216cb7da12b61b972be87aa3ba7afc","21.x":"3ae63a5b436eab901a7ff22cb8ecc9043a5aea8d2fb89ebd9e7f396ea3105bf3"};
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const bufferEquals=Buffer.prototype.equals,equalBytes=(actual,supplied)=>Buffer.isBuffer(supplied)&&Reflect.apply(bufferEquals,actual,[supplied]);
export function readCheckerOwnerMember(root,path){
 if(['node_modules/typescript/lib/typescript.js','node_modules/typescript/package.json'].includes(path)){
  const base=realpathSync(join(root,'node_modules/typescript')),file=realpathSync(join(base,path.slice('node_modules/typescript/'.length)));
  assert.ok(file.startsWith(base+sep));return readFileSync(file);
 }
 return readEvidenceMember(root,path);
}
function original(root,parent,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:8*1024*1024});
}
export function checkerOwnerSourceSubject({root,read=path=>readCheckerOwnerMember(root,path)}={}){
 const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const tools=browserOwnerSourceSubject({root,read});
 const bound=new Map(tools.bound.map(ref=>[ref.path,{...ref}])),member=(ref)=>{
  ref=tools.qualifyReference(ref);
  const raw=read(ref.path),physical=readCheckerOwnerMember(root,ref.path);assert.ok(Buffer.isBuffer(raw));assert.equal(hash(raw),ref.sha256,'changed checker owner tool '+ref.path);
  if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);assert.ok(raw.equals(physical),'noncurrent checker owner tool '+ref.path);
  bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;
 };
 const input=member({path:INPUTS,sha256:PINS[line]}),packet=JSON.parse(input);assert.equal(packet.line,line);assert.equal(packet.schema_version,1);
 for(const key of ['canonical_dispositions_changed','source_admissions_changed','product_changes'])assert.equal(packet[key],0);
 assert.equal(packet.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 member({path:PATH,sha256:hash(image),bytes:image.length});
 const transitions=new Map();
 for(const row of packet.code_transitions){
  assert.equal(row.before.path,row.after.path);assert.ok(!transitions.has(row.after.path));
  const before=original(root,packet.source_parent,row.before.path);assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
  let expected=before.toString();for(const edit of row.literal_edits){assert.equal(expected.split(edit.before).length,2,'ambiguous checker tool edit '+row.after.path);expected=expected.replace(edit.before,edit.after);}
  assert.equal(hash(expected),row.after.sha256);assert.equal(Buffer.byteLength(expected),row.after.bytes);assert.equal(tools.comparisonBytes(row.after).toString(),expected);
  transitions.set(row.after.path,{before:{...row.before},after:{...row.after}});
 }
 assert.equal(transitions.size,4);
 for(const ref of packet.source_members)member(ref);
 const qualifyReference=ref=>{
  const row=transitions.get(ref.path);if(!row)return tools.qualifyReference(ref);
  const current=tools.qualifyReference(row.after);if(ref.sha256===current.sha256){if(ref.bytes!==undefined)assert.equal(ref.bytes,current.bytes);return {...ref,sha256:current.sha256,bytes:current.bytes};}
  const prior=ref.sha256===row.before.sha256?row.before:ref.sha256===row.after.sha256?row.after:null;
  assert.ok(prior,'unqualified tool reference '+ref.path);if(ref.bytes!==undefined)assert.equal(ref.bytes,prior.bytes);
  return tools.qualifyReference({...ref,sha256:row.after.sha256,bytes:row.after.bytes});
 };
 const physicalMember=ref=>{const raw=readCheckerOwnerMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'physical checker owner tool '+ref.path);assert.equal(raw.length,ref.bytes);return raw;};
 const assertPhysical=()=>{for(const ref of bound.values())physicalMember(ref);};
 const assertCurrent=()=>{assertPhysical();tools.assertCurrent();for(const ref of bound.values()){
  const physical=physicalMember(ref),raw=read(ref.path);assert.ok(equalBytes(physical,raw),'nonphysical checker owner tool '+ref.path);assert.ok(equalBytes(physical,readCheckerOwnerMember(root,ref.path)),'checker owner tool changed during callback '+ref.path);
 }assertPhysical();};
 // This is the one checker image already authenticated by this actual owner's
 // packet. The actual private browser subject supplies its comparison data;
 // callers cannot provide another subject or acquire a source reader here.
 const checkerReferences=packet.source_members.filter(ref=>ref.path==='scripts/check-upstream-audit-disposition.mjs');assert.equal(checkerReferences.length,1);const checkerReference={...checkerReferences[0]};
 const captureReference=ref=>{
  assert.ok(ref&&typeof ref==='object'&&!types.isProxy(ref));assert.equal(Object.getPrototypeOf(ref),Object.prototype);
  const descriptors=Object.getOwnPropertyDescriptors(ref);assert.deepEqual(Reflect.ownKeys(descriptors).sort(),Object.hasOwn(descriptors,'bytes')?['bytes','path','sha256']:['path','sha256']);
  for(const d of Object.values(descriptors))assert.ok(Object.hasOwn(d,'value')&&d.enumerable,'checker comparison reference accessor');
  const value=Object.fromEntries(Object.entries(descriptors).map(([key,d])=>[key,d.value]));assert.equal(value.path,checkerReference.path);assert.equal(value.sha256,checkerReference.sha256);if(Object.hasOwn(value,'bytes'))assert.equal(value.bytes,checkerReference.bytes);
  return {value,descriptors};
 };
 let comparing=false,nestedComparison=false;
 const historicalCheckerBytes=ref=>{
  if(comparing){nestedComparison=true;assert.fail('reentrant checker comparison');}
  const snapshot=captureReference(ref);comparing=true;nestedComparison=false;
  try{assertCurrent();const result=tools.comparisonBytes(Object.freeze({...snapshot.value}));assert.ok(Buffer.isBuffer(result));assert.equal(hash(result),checkerReference.sha256);assert.equal(result.length,checkerReference.bytes);
   assertCurrent();assert.deepEqual(captureReference(ref),snapshot,'checker comparison reference changed');assert.equal(nestedComparison,false,'caught checker comparison reentry');return Buffer.from(result);
  }finally{comparing=false;}
 };
 assertCurrent();return {line,packet:structuredClone(packet),bound:structuredClone([...bound.values()]),qualifyReference,assertCurrent,historicalCheckerBytes,
  old_program_executed:false,current_native_or_full_audit_credit:false};
}
