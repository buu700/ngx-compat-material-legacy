/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact successor identities for the historical 41 downstream source references. Source only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {resolve,parse,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';

const SELF='scripts/current-native-tab-downstream-source.mjs';
const loadedImage=readFileSync(fileURLToPath(import.meta.url));
const V1='compatibility/rc/current-native-tab-downstream-source-epochs-v1.json';
const V2='compatibility/rc/current-native-tab-downstream-source-epochs-v2.json';
const V3='compatibility/rc/current-native-tab-downstream-source-epochs-v3.json';
const V4='compatibility/rc/current-native-tab-downstream-source-epochs-v4.json';
const V5='compatibility/rc/current-native-tab-downstream-source-epochs-v5.json';
const V1_SHA='ec6359421bcc2c4638e13bdcfdf9743c3ad5f7ad59d5d51b59c744ce843bccaa';
const V2_SHA='c814f18b33bd5fc99060bddacc26123b180119f77c64ce838281a4ac9e955c73';
const V3_SHA='0fb93cd9a5f3b6618e296a14c01c8098cbccc9610115e78c4bdddc564b1562b5';
const V4_SHA='6af0e27ebe658249e80a4bf047f0f7ce862fdddea11f07de16e4512953bea442';
const V5_SHA='dcaafd6cbaf736ff085b18fea39a1ba49ac075bee8d49b289785ef42c27f7d33';
const V5_PARENT='c72d88c74944463d1fea960ae718fb30944818c9',V5_COMMIT='5b09618cde44725b8723fe4f6c63c3a4c35ad7e5';
const INPUTS='compatibility/rc/remaining-native-admission-tab-repair-source-inputs.json';
const INPUT_SHA='92a1e6c683bf36815471b90674b949f8972f1fbdc7c1d736c60ec79de7d1ce0e';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const ref=(path,bytes)=>({path,sha256:sha(bytes),bytes:bytes.length});
const equals=Buffer.prototype.equals,apply=Reflect.apply;
const same=(a,b)=>Buffer.isBuffer(b)&&apply(equals,a,[b]);
function git(root,parent,path){
 assert.match(parent,/^[0-9a-f]{40}$/);
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
 Object.assign(env,{GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'});
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:4*1024*1024});
}
function replay(before,edits){
 let cursor=0;const parts=[];
 for(const edit of edits){
  assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);
  assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor&&edit.offset<=before.length);
  assert.equal(typeof edit.before,'string');assert.equal(typeof edit.after,'string');
  const old=Buffer.from(edit.before),next=Buffer.from(edit.after);
  assert.ok(same(before.subarray(edit.offset,edit.offset+old.length),old),'downstream literal predecessor mismatch');
  parts.push(before.subarray(cursor,edit.offset),next);cursor=edit.offset+old.length;
 }
 parts.push(before.subarray(cursor));return Buffer.concat(parts);
}
/** Main-line finite source check. The 21.x branch remains in the frozen v1/v2 packets. */
export function createCurrentNativeTabDownstreamSource({root=process.cwd(),line,read}={}){
 root=resolve(root);assert.equal(line,'main','T03 v4 is main-only');
 const physical=path=>{
  const base=parse(root).root;let cursor=base;
  assert.ok(lstatSync(cursor).isDirectory(),'invalid T03 root');
  for(const part of root.slice(base.length).split(sep).filter(Boolean)){
   cursor=join(cursor,part);const stat=lstatSync(cursor);
   assert.ok(stat.isDirectory()&&!stat.isSymbolicLink(),'linked T03 root ancestor');
  }
  return readEvidenceMember(root,path);
 };
 assert.ok(read===undefined||typeof read==='function');
 const supplied=read??physical;
 const images=[[V1,V1_SHA],[V2,V2_SHA],[V3,V3_SHA],[V4,V4_SHA],[V5,V5_SHA]].map(([path,expected])=>{
  const bytes=physical(path);assert.equal(sha(bytes),expected,'changed T03 packet '+path);
  return {path,bytes,packet:JSON.parse(bytes)};
 });
 const [v1,v2,v3,v4,v5]=images.map(item=>item.packet);
 assert.equal(v1.schema_version,1);assert.equal(v2.schema_version,2);assert.equal(v3.schema_version,3);
 assert.equal(v2.predecessor_packet_sha256,V1_SHA);
 assert.deepEqual(v3.previous_packet,{path:V2,sha256:V2_SHA,bytes:images[1].bytes.length});
 assert.equal(v3.role,'finite-current-native-tab-downstream-source');
 assert.equal(v3.source_scope_only,true);assert.equal(v3.actual_native_packed_browser_floor_qualified,false);assert.equal(v3.g11_claim,'not-passed');
 assert.deepEqual(Object.keys(v3.lines),['main']);
 assert.equal(v4.schema_version,4);
 assert.deepEqual(v4.previous_packet,{path:V3,sha256:V3_SHA,bytes:images[2].bytes.length});
 assert.equal(v4.role,v3.role);assert.equal(v4.source_scope_only,true);assert.equal(v4.actual_native_packed_browser_floor_qualified,false);assert.equal(v4.g11_claim,'not-passed');
 assert.deepEqual(Object.keys(v4.lines),['main']);
 assert.equal(v5.schema_version,5);assert.equal(v5.role,v3.role);assert.deepEqual(v5.previous_packet,{path:V4,sha256:V4_SHA,bytes:images[3].bytes.length});
 assert.equal(v5.source_parent,V5_PARENT);assert.equal(v5.source_commit,V5_COMMIT);assert.equal(v5.source_scope_only,true);assert.equal(v5.actual_native_packed_browser_floor_qualified,false);assert.equal(v5.g11_claim,'not-passed');
 const transition=v5.update;assert.equal(transition.path,'scripts/rc-verify.py');assert.equal(transition.before.path,transition.path);assert.equal(transition.after.path,transition.path);
 assert.equal(v5.additional_inputs.length,1);assert.equal(v5.additional_inputs[0].path,'compatibility/rc/fixed-report-catalog.json');
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
 Object.assign(env,{GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null'});
 const ancestry=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','rev-list','--parents','-n','1',V5_COMMIT],{cwd:root,env,encoding:'utf8'}).trim();
 assert.equal(ancestry,V5_COMMIT+' '+V5_PARENT,'T03 V5 source parent mismatch');
 const predecessor=git(root,V5_PARENT,transition.path),postimage=git(root,V5_COMMIT,transition.path);
 assert.deepEqual(ref(transition.path,predecessor),transition.before);assert.deepEqual(ref(transition.path,postimage),transition.after);
 assert.ok(same(replay(predecessor,transition.edits),postimage),'T03 V5 replay mismatch');
 const catalog=v5.additional_inputs[0],catalogGit=git(root,V5_COMMIT,catalog.path);assert.deepEqual(ref(catalog.path,catalogGit),catalog);
 const closure=v5.closure_update;assert.equal(closure.path,'tests/test_rc_run_writer_and_sealer.py');assert.equal(closure.before.path,closure.path);assert.equal(closure.after.path,closure.path);
 const closureBefore=git(root,V5_PARENT,closure.path),closureAfter=git(root,V5_COMMIT,closure.path);
 assert.deepEqual(ref(closure.path,closureBefore),closure.before);assert.deepEqual(ref(closure.path,closureAfter),closure.after);
 assert.ok(same(replay(closureBefore,closure.edits),closureAfter),'T03 V5 closure replay mismatch');

 const branch=v4.lines.main,prior=v3.lines.main,earliest=v2.lines.main;
 assert.equal(branch.source_parent,prior.source_parent);
 assert.equal(branch.current_product_changed,55);assert.equal(branch.current_resource_changed,15);
 assert.equal(prior.current_product_changed,52);assert.equal(prior.current_resource_changed,15);
 assert.equal(branch.predecessor_inspector_sha256,prior.changed.find(row=>row.path==='scripts/remaining-native-tab-lifecycle-review.mjs').current_sha256);
 assert.equal(prior.predecessor_inspector_sha256,earliest.changed.find(row=>row.path==='scripts/remaining-native-tab-lifecycle-review.mjs').current_sha256);
 assert.equal(branch.changed.length,prior.changed.length);
 const inspector='scripts/remaining-native-tab-lifecycle-review.mjs';
 for(let i=0;i<branch.changed.length;i++){
  const now=branch.changed[i],old=prior.changed[i];
  if(branch.v3_changed_paths.includes(now.path)){assert.equal(now.index,old.index);assert.equal(now.before_sha256,old.before_sha256);assert.equal(now.before_bytes,old.before_bytes);}
  else assert.deepEqual(now,old,'unreviewed T03 v3 changed row '+now.path);
 }
 assert.deepEqual(branch.v3_changed_paths,['scripts/check-upstream-audit-disposition.mjs','scripts/rc-verify.py',inspector]);
 let active=false,nestedAttempt=false;
 const idle=()=>{if(active){nestedAttempt=true;assert.fail('reentrant T03 source review');}};
 const checkImages=()=>{
  assert.ok(same(physical(SELF),loadedImage),'changed loaded T03 helper');
  for(const item of images)assert.ok(same(physical(item.path),item.bytes),'changed T03 packet during review '+item.path);
 };
 const checked=path=>{
  const bytes=physical(path),callback=supplied(path);
  assert.ok(same(bytes,callback),'nonphysical T03 source '+path);
  assert.ok(same(bytes,physical(path)),'T03 source changed during callback '+path);
  checkImages();return bytes;
 };
 checkImages();
 const inputBytes=checked(INPUTS);assert.equal(sha(inputBytes),INPUT_SHA);
 assert.deepEqual(branch.historical_inputs,ref(INPUTS,inputBytes));
 const inputs=JSON.parse(inputBytes);assert.equal(inputs.line,line);assert.equal(inputs.source_parent,branch.source_parent);
 const old=inputs.current_sources;assert.equal(old.length,41);
 const paths=old.map(row=>row.path);assert.equal(new Set(paths).size,41);
 assert.equal(branch.changed.length,18);
 const changes=new Map(branch.changed.map(row=>[row.path,row]));assert.equal(changes.size,branch.changed.length);
 const bound=[],beforeBound=[];
 for(let i=0;i<old.length;i++){
  const priorRef=old[i],before=git(root,branch.source_parent,priorRef.path),current=checked(priorRef.path),changed=changes.get(priorRef.path);
  assert.equal(sha(before),priorRef.sha256,'historical downstream source mismatch '+priorRef.path);
  beforeBound.push(ref(priorRef.path,before));
  if(changed){
   assert.equal(changed.index,i);assert.equal(changed.before_sha256,priorRef.sha256);assert.equal(changed.before_bytes,before.length);
   assert.ok(changed.authority&&changed.review,'missing individual source judgment '+priorRef.path);
   assert.ok(Array.isArray(changed.edits)&&changed.edits.length);
   if(branch.v3_changed_paths.includes(priorRef.path)){
    const oldRow=prior.changed.find(row=>row.path===priorRef.path);
    const previous=replay(before,oldRow.edits);
    assert.equal(sha(previous),oldRow.current_sha256);assert.equal(previous.length,oldRow.current_bytes);
    if(priorRef.path===inspector)assert.equal(sha(previous),branch.predecessor_inspector_sha256);
   }
   const historicalCurrent=replay(before,changed.edits);
   assert.equal(changed.current_sha256,sha(historicalCurrent));assert.equal(changed.current_bytes,historicalCurrent.length);
   if(priorRef.path===transition.path){assert.ok(same(historicalCurrent,predecessor),'T03 V5 does not follow V4');assert.ok(same(current,postimage),'unreviewed T03 V5 source');}
   else assert.ok(same(historicalCurrent,current),'unreviewed downstream delta '+priorRef.path);
  }else assert.ok(same(before,current),'unreviewed downstream source change '+priorRef.path);
  bound.push(ref(priorRef.path,current));
 }
 for(const path of changes.keys())assert.ok(paths.includes(path),'extra T03 changed member '+path);
 const historicalControls=[];
 for(const [name,priorRef]of Object.entries(branch.historical_controls)){
  const bytes=checked(priorRef.path);assert.deepEqual(ref(priorRef.path,bytes),priorRef,'changed historical '+name);
  historicalControls.push({...priorRef,name,status:'historical-only'});
 }
 assert.equal(historicalControls.length,3);
 const catalogBytes=checked(catalog.path);assert.deepEqual(ref(catalog.path,catalogBytes),catalog);assert.ok(same(catalogBytes,catalogGit));
 bound.push(catalog,ref(INPUTS,inputBytes),...historicalControls.map(({path,sha256,bytes})=>({path,sha256,bytes})),ref(SELF,loadedImage),...images.map(({path,bytes})=>ref(path,bytes)));
 const receiptBytes=checked(branch.typeahead_receipt.path);assert.deepEqual(ref(branch.typeahead_receipt.path,receiptBytes),branch.typeahead_receipt);
 const receipt=JSON.parse(receiptBytes);assert.equal(receipt.source_parent,'7e1b3f7d463c6d0955540c770009383735834507');
 assert.deepEqual(receipt.sources,branch.typeahead_sources);assert.deepEqual(receipt.archive,branch.typeahead_archive);assert.equal(receipt.sources.length,24);
 for(const item of [branch.typeahead_receipt,...branch.typeahead_sources,branch.typeahead_archive]){
  const bytes=checked(item.path);let currentRef=item;
  if(item.path===transition.path){assert.deepEqual(item,transition.before,'unknown typeahead predecessor');assert.ok(same(bytes,postimage));currentRef=transition.after;}
  else if(item.path===closure.path){assert.deepEqual(item,closure.before,'unknown typeahead test predecessor');assert.ok(same(bytes,closureAfter));currentRef=closure.after;}
  else assert.deepEqual(ref(item.path,bytes),item,'changed typeahead closure '+item.path);
  const existing=bound.find(row=>row.path===item.path);if(existing)assert.deepEqual(existing,currentRef);else bound.push(currentRef);
 }
 const map=new Map(bound.map(row=>[row.path,row]));assert.equal(map.size,bound.length);
 const sweep=()=>{checkImages();for(const item of bound)assert.deepEqual(ref(item.path,physical(item.path)),item,'changed physical T03 source '+item.path);checkImages();};
 const assertCurrent=()=>{
  idle();active=true;nestedAttempt=false;
  try{
   sweep();
   for(const item of bound){const bytes=checked(item.path);assert.deepEqual(ref(item.path,bytes),item,'late T03 source change '+item.path);}
   assert.equal(nestedAttempt,false,'reentrant T03 source review');
   sweep();
  }finally{active=false;}
 };
 const qualify=incoming=>{
  idle();
  if(incoming===null||typeof incoming!=='object')return null;
  assert.equal(types.isProxy(incoming),false,'T03 reference must not be a proxy');
  const descriptors=Object.getOwnPropertyDescriptors(incoming);
  if(!Object.hasOwn(descriptors,'path'))return null;
  assert.ok(Object.hasOwn(descriptors.path,'value'),'T03 reference path must be data');
  const path=descriptors.path.value;
  if(typeof path!=='string'||!map.has(path))return null;
  for(const descriptor of Object.values(descriptors))assert.ok(Object.hasOwn(descriptor,'value'),'T03 reference must contain data properties');
  const keys=Reflect.ownKeys(descriptors);assert.ok(keys.every(key=>typeof key==='string'),'T03 reference symbol key');
  const value=Object.fromEntries(Object.entries(descriptors).map(([key,descriptor])=>[key,descriptor.value]));
  active=true;nestedAttempt=false;
  try{
   sweep();
   assert.deepEqual(keys.sort(),value.bytes===undefined?['path','sha256']:['bytes','path','sha256']);
   assert.equal(typeof value.sha256,'string');
   const priorRef=beforeBound.find(item=>item.path===path),current=map.get(path);
   const epoch=value.sha256===priorRef?.sha256?priorRef:value.path===transition.path&&value.sha256===transition.before.sha256?transition.before:value.path===closure.path&&value.sha256===closure.before.sha256?closure.before:value.sha256===current.sha256?current:null;
   assert.ok(epoch,'unknown T03 source epoch '+path);
   if(value.bytes!==undefined){assert.ok(Number.isSafeInteger(value.bytes));assert.equal(value.bytes,epoch.bytes);}
   const result={path,sha256:current.sha256,...(value.bytes===undefined?{}:{bytes:current.bytes})};
   assert.equal(nestedAttempt,false,'reentrant T03 source review');
   sweep();return result;
  }finally{active=false;}
 };
 assertCurrent();
 return {line,bound:structuredClone(bound),old_bound:structuredClone(beforeBound),changed:branch.changed.map(({path,before_sha256,current_sha256,authority})=>({path,before_sha256,current_sha256:path===transition.path?transition.after.sha256:current_sha256,authority:path===transition.path?'fixed-report-capture-v5-source-transition':authority})),historical_controls:historicalControls,current_product_changed:branch.current_product_changed,current_resource_changed:branch.current_resource_changed,qualify,assertCurrent,assertPhysical:()=>{idle();sweep();},source_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
