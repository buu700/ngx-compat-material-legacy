/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual guards, physical fault controls in a disposable checkout image only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tabsFiniteSourceSuccessor} from '../scripts/tabs-finite-source-successor.mjs';
import {currentAuthoredRosterSourceSubject} from '../scripts/current-authored-roster-source.mjs';
import {readHistoricalContractRepairMember,historicalContractRepairSourceSubject} from '../scripts/historical-contract-repair-source.mjs';

const group=process.argv[2];assert.ok(['leaf','repair','roster'].includes(group));
const root=process.cwd(),physical=path=>readHistoricalContractRepairMember(root,path);
const line=JSON.parse(physical('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const source='projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts';
const helper='scripts/tabs-finite-source-successor.mjs';
const packet='compatibility/rc/parent-tabs-finite-source-successor-v1.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const identities=Object.fromEntries([helper,packet,'tests/tabs_finite_source_successor_probe.mjs','tests/tabs_finite_source_successor_runner.py','scripts/historical-contract-repair-source.mjs','scripts/current-authored-roster-source.mjs'].map(path=>[path,hash(physical(path))]));
const suffix=Buffer.from('\n// disposable tabs successor test fault\n');
let calls=0,callback=()=>{},override=(path,bytes)=>bytes;
const read=path=>{calls++;const bytes=physical(path);callback(path,bytes);return override(path,bytes);};
const reset=()=>{calls=0;callback=()=>{};override=(path,bytes)=>bytes;};
const make=()=>tabsFiniteSourceSuccessor({root,read,line});
const saved=new Map();
function fault(path){const before=physical(path);saved.set(path,before);writeFileSync(join(root,path),Buffer.concat([before,suffix]));}
function restore(){for(const [path,before] of saved){const actual=physical(path);assert.ok(actual.equals(before)||actual.equals(Buffer.concat([before,suffix])),`foreign scratch bytes preserved: ${path}`);if(!actual.equals(before))writeFileSync(join(root,path),before);}saved.clear();reset();}
const reject=fn=>assert.throws(fn);
const rejectPath=(fn,path)=>assert.throws(fn,error=>String(error?.message).includes(path),`expected failure naming ${path}`);
try{
 // Cold rejection happens before a malicious supplied reader can restore bytes.
 for(const path of [source,helper,packet]){
  let coldCalls=0;fault(path);callback=()=>{coldCalls++;};rejectPath(make,path);assert.equal(coldCalls,0,`cold callback reached for ${path}`);restore();
 }
 const leaf=make();reset();leaf.assertCurrent();reset();
 assert.ok(leaf.bound.some(ref=>ref.path===source));
 const proof=leaf.bound.find(ref=>ref.path.startsWith('compatibility/')&&ref.path!==packet)?.path;
 assert.ok(proof,'expected a distinct bound proof member');
 let coldProofCalls=0;fault(proof);callback=()=>{coldProofCalls++;};rejectPath(make,proof);assert.equal(coldProofCalls,0);restore();
 reject(()=>tabsFiniteSourceSuccessor({root,read,line:line==='main'?'21.x':'main'}));reset();
 const sourceRef=leaf.bound.find(ref=>ref.path===source);
 reject(()=>leaf.qualify({...sourceRef,sha256:'0'.repeat(64)}));
 const current=leaf.qualify(sourceRef);assert.equal(current.sha256,sourceRef.sha256);
 for(const bad of [bytes=>Buffer.concat([bytes,suffix]),()=>({not:'bytes'})]){
  let reached=false;override=(path,bytes)=>{if(path===source){reached=true;return bad(bytes);}return bytes;};
  reject(leaf.assertCurrent);assert.ok(reached);reset();leaf.assertCurrent();reset();
 }
 // A member changed while its supplied value is read must fail in the same operation.
 for(const returnNew of [false,true]){
  let reached=false;callback=path=>{if(path===source){reached=true;fault(source);}};
  override=(path,bytes)=>path===source&&returnNew?physical(path):bytes;
  reject(leaf.assertCurrent);assert.ok(reached);restore();leaf.assertCurrent();reset();
 }
 // Later callback leaves an already consumed source/proof/image changed.
 for(const target of [source,proof,helper]){
  const last=leaf.bound.at(-1).path;assert.notEqual(last,target);
  let reached=false;callback=path=>{if(path===last&&!reached){reached=true;fault(target);}};
  rejectPath(leaf.assertCurrent,target);assert.ok(reached);restore();leaf.assertCurrent();reset();
 }
 let entered=false,nestedError;callback=()=>{if(!entered){entered=true;try{leaf.assertCurrent();}catch(error){nestedError=error;}}};
 leaf.assertCurrent();assert.ok(entered);assert.match(nestedError?.message??'',/reentrant/i);reset();leaf.assertCurrent();reset();
 const sentinel=new Error('test callback sentinel');callback=()=>{throw sentinel;};
 assert.throws(leaf.assertCurrent,error=>error===sentinel);reset();make().assertCurrent();reset();
 if(group!=='leaf'){
 // Exercise both actual higher constructors, not a fabricated guard node.
 const leafPaths=new Set(leaf.bound.map(ref=>ref.path));
 for(const [name,factory] of group==='repair'?[['historical-repair',historicalContractRepairSourceSubject]]:[['current-roster',currentAuthoredRosterSourceSubject]]){
  let baselineTabs=false;callback=path=>{if(path===source)baselineTabs=true;};
  const owner=factory({root,read});assert.ok(baselineTabs,`${name} baseline did not reach a supplied tabs source read`);reset();
  let ownerColdCalls=0;fault(source);callback=()=>{ownerColdCalls++;};rejectPath(()=>factory({root,read}),source);assert.equal(ownerColdCalls,0);restore();
  let seenLeaf=false,changed=false;
  callback=path=>{if(path===source)seenLeaf=true;else if(seenLeaf&&!leafPaths.has(path)&&!changed){changed=true;fault(source);}};
  rejectPath(owner.assertCurrent,source);assert.ok(changed,`${name} later actual callback was not reached`);restore();owner.assertCurrent();reset();
 }
 }
 console.log(JSON.stringify({result:'pass',line,group,identities,actual_leaf:true,actual_composed_owner:group!=='leaf',composed_constructors:group==='leaf'?[]:[group==='repair'?'historical-repair':'current-roster'],
  cold_before_callback:true,physical_provided_physical:true,late_source_proof_loaded_image:true,
  wrong_predecessor_and_line:true,reentry_and_fresh_recovery:true,full_owner_or_native_qualification:false}));
}finally{restore();}
