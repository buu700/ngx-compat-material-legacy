/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {currentSassToolReferenceSubject} from '../scripts/current-sass-tool-references.mjs';
import {historicalContractRepairReaderSubject} from '../scripts/historical-contract-repair-readers.mjs';
const root=process.argv[2],checks=[];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const check=(name,operation)=>{operation();checks.push(name);};
const packet=JSON.parse(readFileSync(join(root,'compatibility/rc/current-sass-tool-reference-inputs-v2.json')));
const previous=JSON.parse(readFileSync(join(root,packet.previous_epoch.path)));
const source=currentSassToolReferenceSubject({root}),branch=packet.branches[source.line];
check('V2 current maintained dispatch',()=>{
 assert.equal(source.epoch,2);assert.deepEqual(historicalContractRepairReaderSubject({root}).transitions,source.transitions);
});
check('all original and latest identities qualify with exact comparison bytes',()=>{
 for(const row of source.transitions){
  const before={path:row.path,...row.before},after={path:row.path,...row.after};
  assert.deepEqual(source.qualify(before),after);assert.deepEqual(source.qualify(after),after);
  assert.deepEqual(source.predecessorReference(after),before);
  assert.equal(hash(source.comparisonBytes(before)),before.sha256);
  assert.equal(hash(source.comparisonBytes(after)),after.sha256);
 }
});
check('all original 45/17 BEFORE and AFTER identities remain comparison data',()=>{
 const historical=JSON.parse(readFileSync(join(root,branch.historical_registry.path)));assert.equal(historical.tool_transitions.length,source.line==='21.x'?45:17);
 for(const old of historical.tool_transitions){
  const latest=source.transitions.find(r=>r.path===old.path);for(const side of ['before','after']){const value={path:old.path,...old[side]};assert.deepEqual(source.qualify(value),{path:old.path,...latest.after});assert.equal(hash(source.comparisonBytes(value)),value.sha256);}
 }
});
check('all committed V1 current identities registered after latest rows',()=>{
 for(const old of previous.branches[source.line].updates){
  const latest=source.transitions.find(r=>r.path===old.path);assert.ok(latest);
  assert.deepEqual(source.qualify(old.after),{path:latest.path,...latest.after});
  assert.equal(hash(source.comparisonBytes(old.after)),old.after.sha256);
 }
});
check('checkpoint-parent tools and unchanged recipes are finite',()=>{
 const selected=branch.updates.filter(r=>r.source_parent===branch.previous_epoch_source_parent);assert.ok(selected.length);
 for(const row of selected){assert.equal(source.ownsReference(row.before),true);assert.equal(source.ownsReference(row.after),true);}
 const first=selected[0],latest=source.transitions.find(r=>r.path===first.path);
 assert.deepEqual(source.qualify(first.before),{path:first.path,...latest.after});
});
const first=source.transitions[0],ref={path:first.path,...first.before};
check('unknown hash and byte length rejected',()=>{
 assert.equal(source.qualify({...ref,sha256:'0'.repeat(64)}),null);
 assert.throws(()=>source.qualify({...ref,bytes:ref.bytes+1}));
 assert.equal(source.ownsReference({...ref,bytes:ref.bytes+1}),false);
 assert.equal(source.qualify({path:'unowned-file.mjs',sha256:'0'.repeat(64)}),null);
 assert.deepEqual(source.qualify({path:ref.path,sha256:ref.sha256,role:{value:'retained'}}),{path:first.path,sha256:first.after.sha256,role:{value:'retained'}});
});
check('public metadata cannot alter authority',()=>{
 const transitions=source.transitions,bound=source.bound;transitions[0].after.sha256='0'.repeat(64);bound[0].sha256='0'.repeat(64);
 assert.notEqual(source.transitions[0].after.sha256,transitions[0].after.sha256);source.assertCurrent();assert.deepEqual(source.qualify(ref),{path:first.path,...first.after});
});
check('no accessor or proxy evaluation',()=>{
 let calls=0;for(const nested of [false,true]){const value={...ref};const target=nested?(value.extra={}):value;Object.defineProperty(target,'getter',{enumerable:true,get(){calls++;throw Error('getter');}});assert.throws(()=>source.qualify(value));}
 assert.throws(()=>source.qualify(new Proxy(ref,{get(){calls++;throw Error('proxy');}})));assert.equal(calls,0);
});
check('nonphysical callback rejected',()=>assert.throws(()=>currentSassToolReferenceSubject({root,read:()=>Buffer.from('wrong')})));
check('caller-owned equals is never invoked',()=>{
 let calls=0;const live=currentSassToolReferenceSubject({root,read:path=>{const bytes=readFileSync(join(root,path));Object.defineProperty(bytes,'equals',{get(){calls++;throw Error('equals');}});return bytes;}});
 live.assertCurrent();assert.equal(calls,0);
});
check('late physical mutation rejected and restored',()=>{
 const path=join(root,first.path),raw=readFileSync(path);
 try{writeFileSync(path,Buffer.concat([raw,Buffer.from('\n// changed\n')]));assert.throws(()=>source.assertCurrent());}
 finally{writeFileSync(path,raw);}
 source.assertCurrent();
});
check('last callback cannot change earlier bound file',()=>{
 const path=join(root,'scripts/current-sass-tool-references.mjs'),raw=readFileSync(path),last=source.bound.at(-1).path;let armed=false;
 const live=currentSassToolReferenceSubject({root,read:path=>{
  const bytes=readFileSync(join(root,path));if(armed&&path===last){armed=false;writeFileSync(join(root,'scripts/current-sass-tool-references.mjs'),Buffer.concat([raw,Buffer.from('\n// changed\n')]));}return bytes;
 }});
 try{armed=true;assert.throws(()=>live.assertCurrent());}finally{writeFileSync(path,raw);}
 live.assertCurrent();
});
check('callback cannot mutate incoming metadata',()=>{
 let armed=false;const incoming={...ref,extra:{value:'before'}};
 const live=currentSassToolReferenceSubject({root,read:path=>{const bytes=readFileSync(join(root,path));if(armed){armed=false;incoming.extra.value='after';}return bytes;}});
 armed=true;assert.throws(()=>live.qualify(incoming));incoming.extra.value='before';assert.deepEqual(live.qualify(incoming),{path:first.path,...first.after,extra:{value:'before'}});
});
check('V1 comparison packet cannot change cold or late',()=>{
 const path=join(root,packet.previous_epoch.path),raw=readFileSync(path);
 try{writeFileSync(path,Buffer.concat([raw,Buffer.from('\n')]));assert.throws(()=>source.assertCurrent());assert.throws(()=>currentSassToolReferenceSubject({root}));}finally{writeFileSync(path,raw);}
 source.assertCurrent();
});
check('V1-only data never selects current maintained factory',()=>{
 const path=join(root,'compatibility/rc/current-sass-tool-reference-inputs-v2.json'),raw=readFileSync(path),visited=[];const sentinel=new Error('stop frozen reader before evaluation');
 try{unlinkSync(path);assert.throws(()=>historicalContractRepairReaderSubject({root,read:name=>{visited.push(name);throw sentinel;}}),error=>error===sentinel);assert.deepEqual(visited,['projects/ngx-material-legacy/package.json']);assert.throws(()=>currentSassToolReferenceSubject({root}));}finally{writeFileSync(path,raw);}
 source.assertCurrent();
});
console.log(JSON.stringify({line:source.line,epoch:source.epoch,transitions:source.transitions.length,transition_rows:source.transitions,bound:source.bound.length,v1_current_identities:previous.branches[source.line].updates.length,checkpoint_parent_updates:branch.updates.filter(r=>r.source_parent).length,checks,compiler_calls:0,old_constructor_executed:false,frozen_dispatch_stopped_before_evaluation:true,historical_programs_executed:false,artifact_or_audit_admission_granted:false}));
