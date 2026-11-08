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
const root=process.argv[2],checks=[],roster=[],cohort=process.argv[3]??'all';
assert.ok(['all','0','1','2','3','4','5','6'].includes(cohort),'unknown tool probe cohort');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const check=(name,operation)=>{const index=roster.length;roster.push(name);if(cohort!=='all'&&index%7!==Number(cohort))return;operation();checks.push(name);};
const verifyCurrentReferences=items=>{
 for(let start=0;start<items.length;start+=16){const group=items.slice(start,start+16),requests=[];
  for(const item of group)requests.push({kind:'qualify',reference:item.reference},{kind:'comparison',reference:item.reference});
  const results=source.referenceBatch(requests);assert.equal(results.length,requests.length);
  group.forEach((item,index)=>{assert.deepEqual(results[index*2],item.expected);assert.equal(hash(results[index*2+1]),item.reference.sha256);});
 }
};
const successorPath='compatibility/rc/parent-base-class-tool-successor-inputs-v3.json';
const successor=JSON.parse(readFileSync(join(root,successorPath)));
const packet=JSON.parse(readFileSync(join(root,successor.previous_epoch.path)));
const previous=JSON.parse(readFileSync(join(root,packet.previous_epoch.path)));
const source=currentSassToolReferenceSubject({root}),branch=packet.branches[source.line];
check('V3 current maintained dispatch',()=>{
 assert.equal(source.epoch,source.line==='main'?7:3);assert.deepEqual(historicalContractRepairReaderSubject({root}).transitions,source.transitions);
});
check('all original and latest identities qualify with exact comparison bytes',()=>{
 // Exercise every identity and output; group finite requests to share only
 // the enclosing physical sweep. Other checks below retain direct entrypoints.
 const rows=source.transitions;
 for(let start=0;start<rows.length;start+=12){
  const group=rows.slice(start,start+12),requests=[];
  for(const row of group){const before={path:row.path,...row.before},after={path:row.path,...row.after};requests.push(
   {kind:'qualify',reference:before},{kind:'qualify',reference:after},
   {kind:'predecessor',reference:after},{kind:'comparison',reference:before},{kind:'comparison',reference:after});}
  const results=source.referenceBatch(requests);assert.equal(results.length,requests.length);
  group.forEach((row,index)=>{const before={path:row.path,...row.before},after={path:row.path,...row.after},offset=index*5;
   assert.deepEqual(results[offset],after);assert.deepEqual(results[offset+1],after);assert.deepEqual(results[offset+2],before);
   assert.equal(hash(results[offset+3]),before.sha256);assert.equal(hash(results[offset+4]),after.sha256);
  });
 }
});
check('all original 45/17 BEFORE and AFTER identities remain comparison data',()=>{
 const historical=JSON.parse(readFileSync(join(root,branch.historical_registry.path)));assert.equal(historical.tool_transitions.length,source.line==='21.x'?45:17);
 const items=[];for(const old of historical.tool_transitions){
  const latest=source.transitions.find(r=>r.path===old.path);for(const side of ['before','after'])items.push({reference:{path:old.path,...old[side]},expected:{path:old.path,...latest.after}});
 }verifyCurrentReferences(items);
});
check('all committed V1 current identities registered after latest rows',()=>{
 const items=[];for(const old of previous.branches[source.line].updates){
  const latest=source.transitions.find(r=>r.path===old.path);assert.ok(latest);
  items.push({reference:old.after,expected:{path:latest.path,...latest.after}});
 }verifyCurrentReferences(items);
});
check('checkpoint-parent tools and unchanged recipes are finite',()=>{
 const selected=branch.updates.filter(r=>r.source_parent===branch.previous_epoch_source_parent);assert.ok(selected.length);
 for(const row of selected){assert.equal(source.ownsReference(row.before),true);assert.equal(source.ownsReference(row.after),true);}
 const first=selected[0],latest=source.transitions.find(r=>r.path===first.path);
 assert.deepEqual(source.qualify(first.before),{path:first.path,...latest.after});
});
check('all V2 current identities remain exact comparison data',()=>{
 const items=[];for(const old of branch.updates){
  const latest=source.transitions.find(r=>r.path===old.path);assert.ok(latest);
  items.push({reference:old.after,expected:{path:latest.path,...latest.after}});
 }verifyCurrentReferences(items);
});
const nextBranch=successor.branches[source.line];
check('each V3 predecessor and literal successor is exact',()=>{
 const items=[];for(const row of nextBranch.updates){
  const latest=source.transitions.find(r=>r.path===row.path);assert.ok(latest);
  items.push({reference:row.before,expected:{path:row.path,...latest.after}},{reference:row.after,expected:{path:row.path,...latest.after}});
  assert.equal(source.ownsReference({...row.before,bytes:row.before.bytes+1}),false);
  assert.throws(()=>source.qualify({...row.before,bytes:row.before.bytes+1}));
  assert.equal(source.qualify({...row.before,sha256:'0'.repeat(64)}),null);
 }verifyCurrentReferences(items);
});
check('floor data successor stays exact and physically guarded',()=>{
 const path='compatibility/rc/consumer-floor-plan.json', row=nextBranch.updates.find(r=>r.path===path);assert.ok(row);
 const before=source.comparisonBytes(row.before), after=source.comparisonBytes(row.after);
 assert.deepEqual(source.qualify(row.before),row.after);assert.deepEqual(source.qualify(row.after),row.after);
 const old=JSON.parse(before), latest=JSON.parse(after), profiles=latest.node_sources_by_platform;delete latest.node_sources_by_platform;
 assert.deepEqual(latest,old);assert.deepEqual(profiles['linux-x64'],old.node_sources);assert.ok(profiles['linux-arm64']);
 assert.equal(source.qualify({...row.before,sha256:'0'.repeat(64)}),null);assert.equal(source.qualify({path:'compatibility/rc/not-the-floor.json',sha256:row.before.sha256}),null);
 assert.throws(()=>currentSassToolReferenceSubject({root,read:p=>p===path?before:readFileSync(join(root,p))}));
 const physical=join(root,path), saved=readFileSync(physical);
 try{writeFileSync(physical,before);assert.throws(()=>source.assertCurrent());assert.throws(()=>currentSassToolReferenceSubject({root}));}finally{writeFileSync(physical,saved);}
 try{writeFileSync(physical,Buffer.concat([saved,Buffer.from(' ')]));assert.throws(()=>source.assertCurrent());assert.throws(()=>currentSassToolReferenceSubject({root}));}finally{writeFileSync(physical,saved);}
 let armed=false;const last=source.bound.at(-1).path,live=currentSassToolReferenceSubject({root,read:p=>{const raw=readFileSync(join(root,p));if(armed&&p===last){armed=false;writeFileSync(physical,before);}return raw;}});
 try{armed=true;assert.throws(()=>live.assertCurrent());}finally{writeFileSync(physical,saved);}live.assertCurrent();
});
check('floor roster predecessor remains data with physical guards',()=>{
 const path='scripts/consumer-floor-roster.mjs',row=nextBranch.updates.find(r=>r.path===path);assert.ok(row);
 const before=source.comparisonBytes(row.before),after=source.comparisonBytes(row.after);
 assert.deepEqual(source.qualify(row.before),row.after);assert.deepEqual(source.qualify(row.after),row.after);
 assert.equal(hash(before),row.before.sha256);assert.equal(hash(after),row.after.sha256);
 assert.equal(source.qualify({...row.before,sha256:'0'.repeat(64)}),null);
 assert.throws(()=>currentSassToolReferenceSubject({root,read:p=>p===path?before:readFileSync(join(root,p))}));
 const physical=join(root,path),saved=readFileSync(physical);
 for(const altered of [before,Buffer.concat([saved,Buffer.from(' ')])])try{writeFileSync(physical,altered);assert.throws(()=>source.assertCurrent());assert.throws(()=>currentSassToolReferenceSubject({root}));}finally{writeFileSync(physical,saved);}
 let armed=false;const last=source.bound.at(-1).path,live=currentSassToolReferenceSubject({root,read:p=>{const raw=readFileSync(join(root,p));if(armed&&p===last){armed=false;writeFileSync(physical,before);}return raw;}});
 try{armed=true;assert.throws(()=>live.assertCurrent());}finally{writeFileSync(physical,saved);}live.assertCurrent();
});
check('new table stage predecessor is the frozen owner packet identity',()=>{
 const row=nextBranch.updates.find(r=>r.path==='scripts/table-local-compilation-canonical-stage.mjs');
 if(source.line==='21.x'){
  assert.ok(row);assert.deepEqual(row.before,{path:row.path,sha256:'bdb3137f6db42ed2611ac3a41e400478defed7f0076d203061d1e12d03f63b7c',bytes:8231});
  assert.deepEqual(source.qualify(row.before),row.after);
 }else assert.equal(row,undefined);
});
check('historical callback cannot stand in for physical overlay source',()=>{
 const row=nextBranch.updates[0];if(!row)return;
 const old=source.comparisonBytes(row.before);assert.notEqual(row.before.sha256,row.after.sha256);
 assert.throws(()=>currentSassToolReferenceSubject({root,read:path=>path===row.path?old:readFileSync(join(root,path))}));
 source.assertCurrent();
});
check('new support bytes reject cold and late physical change',()=>{
 const ref=nextBranch.additional_inputs[0];assert.ok(ref);const path=join(root,ref.path),raw=readFileSync(path);
 try{writeFileSync(path,Buffer.concat([raw,Buffer.from('\n')]));assert.throws(()=>source.assertCurrent());assert.throws(()=>currentSassToolReferenceSubject({root}));}finally{writeFileSync(path,raw);}
 source.assertCurrent();
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
check('V2 comparison packet cannot change cold or late',()=>{
 const path=join(root,successor.previous_epoch.path),raw=readFileSync(path);
 try{writeFileSync(path,Buffer.concat([raw,Buffer.from('\n')]));assert.throws(()=>source.assertCurrent());assert.throws(()=>currentSassToolReferenceSubject({root}));}finally{writeFileSync(path,raw);}
 source.assertCurrent();
});
check('installed V3 cannot downgrade when V2 predecessor is absent',()=>{
 const path=join(root,successor.previous_epoch.path),raw=readFileSync(path);
 try{unlinkSync(path);assert.throws(()=>historicalContractRepairReaderSubject({root}));assert.throws(()=>currentSassToolReferenceSubject({root}));}finally{writeFileSync(path,raw);}
 source.assertCurrent();
});
check('V1-only data never selects current maintained factory',()=>{
 const paths=[successorPath,successor.previous_epoch.path],saved=paths.map(path=>readFileSync(join(root,path))),visited=[];const sentinel=new Error('stop frozen reader before evaluation');
 try{for(const path of paths)unlinkSync(join(root,path));assert.throws(()=>historicalContractRepairReaderSubject({root,read:name=>{visited.push(name);throw sentinel;}}),error=>error===sentinel);assert.deepEqual(visited,['projects/ngx-material-legacy/package.json']);assert.throws(()=>currentSassToolReferenceSubject({root}));}finally{paths.forEach((path,index)=>writeFileSync(join(root,path),saved[index]));}
 source.assertCurrent();
});
console.log(JSON.stringify({line:source.line,epoch:source.epoch,transitions:source.transitions.length,transition_rows:source.transitions,bound:source.bound.length,v1_current_identities:previous.branches[source.line].updates.length,v2_current_identities:branch.updates.length,v3_overlay_count:nextBranch.updates.length,checkpoint_parent_updates:branch.updates.filter(r=>r.source_parent).length,cohort,roster,checks,compiler_calls:0,old_constructor_executed:false,frozen_dispatch_stopped_before_evaluation:checks.includes('V1-only data never selects current maintained factory'),historical_programs_executed:false,artifact_or_audit_admission_granted:false}));
