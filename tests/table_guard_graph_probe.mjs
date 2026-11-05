/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual table/source graphs and population; no full composed-owner credit. */
import assert from 'node:assert/strict';
import {writeFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import admission from '../scripts/upstream-table-local-compilation-admission.cjs';
import {tableLocalCompilationOwnerSourceSubject} from '../scripts/table-local-compilation-owner-source.mjs';
import {tableLocalCompilationOwnerContext} from '../scripts/table-local-compilation-canonical-stage.mjs';
import {legacyRemovalOwnerSourceSubject} from '../scripts/legacy-removal-owner-source.mjs';
import {readHistoricalContractRepairOwnerMember} from '../scripts/historical-contract-repair-readers.mjs';
import {composeCanonicalSourceGuards} from '../scripts/canonical-source-guard-plan.mjs';

const root=process.cwd(),disk=path=>readHistoricalContractRepairOwnerMember(root,path);
const write=(path,bytes)=>writeFileSync(join(root,path),bytes);
const stage='scripts/base-class-removal-canonical-stage.mjs',stageBefore=disk(stage);
const row='projects/ngx-material-legacy/legacy-table/row.ts',rowBefore=disk(row);
const drift=Buffer.from('\n// final source callback drift\n');
const population='projects/ngx-material-legacy/legacy-table/guard-plan-population-control.tmp';
const ignored='projects/ngx-material-legacy/legacy-table/guard-plan-population-control.spec.ts';
const extra=Buffer.from('// guard graph population control\n');
let calls=0,onRead=()=>{},override=null,rejected=0;
const read=path=>{const raw=disk(path);calls++;onRead(path);return override?override(path,raw):raw;};
const reset=()=>{calls=0;onRead=()=>{};override=null;};
const reject=(fn,match=()=>true)=>{assert.throws(fn,error=>error?.code==='ERR_ASSERTION'&&match(error));rejected++;};
const tools=tableLocalCompilationOwnerSourceSubject({root,read});
const context=tableLocalCompilationOwnerContext({root,read});
const legacy=legacyRemovalOwnerSourceSubject({root,read});reset();
for(const subject of [tools,context,legacy]){
 assert.ok(Object.isFrozen(subject.guardNode)&&Object.isFrozen(subject.guardPlan));
 assert.equal(subject.guardPlan.node,subject.guardNode);assert.equal(subject.guardPlan.assertCurrent,subject.assertCurrent);
 write(stage,Buffer.concat([stageBefore,drift]));
 try{onRead=()=>write(stage,stageBefore);reject(subject.assertCurrent);assert.equal(calls,0);}
 finally{write(stage,stageBefore);reset();}
 subject.assertCurrent();reset();
 for(const forged of [raw=>Buffer.concat([raw,drift]),()=>({})]){
  let reached=false;
  override=(path,raw)=>{if(path===stage){reached=true;return forged(raw);}return raw;};
  try{reject(subject.assertCurrent,error=>error.message.includes(stage)&&error.message.includes('nonphysical'));assert.equal(reached,true);}finally{reset();}
  subject.assertCurrent();reset();
 }
 subject.assertCurrent();const last=calls;reset();let changed=false;
 onRead=()=>{if(calls===last){changed=true;write(stage,Buffer.concat([stageBefore,drift]));}};
 try{reject(subject.assertCurrent);assert.equal(changed,true);}
 finally{write(stage,stageBefore);reset();}
 subject.assertCurrent();reset();
 const alternate=composeCanonicalSourceGuards(Object.freeze([subject.guardNode]));
 for(const [outer,inner]of [[subject.assertCurrent,alternate],[alternate,subject.assertCurrent]]){
  let nested=false;
  onRead=()=>{if(calls===last&&!nested){nested=true;const before=calls;reject(inner);assert.equal(calls,before);}};
  try{outer();assert.equal(nested,true);}finally{reset();}
  subject.assertCurrent();reset();
 }
}
for(const returned of ['old','new']){
 let changed=false,restoredLater=false,callbacksAfterMutation=0;
 onRead=path=>{
  if(changed){callbacksAfterMutation++;if(path!==row){restoredLater=true;write(row,rowBefore);}}
  else if(path===row){changed=true;write(row,Buffer.concat([rowBefore,drift]));}
 };
 override=(path,raw)=>path===row&&returned==='new'?disk(path):raw;
 try{reject(context.assertCurrent,error=>error.message.includes(row)&&/nonphysical|changed during callback/.test(error.message));assert.equal(changed,true);assert.equal(restoredLater,false);assert.equal(callbacksAfterMutation,0);}
 finally{write(row,rowBefore);reset();}
 context.assertCurrent();reset();
}
write(population,extra);
try{onRead=()=>unlinkSync(join(root,population));reject(context.assertCurrent);assert.equal(calls,0);}
finally{unlinkSync(join(root,population));reset();}
context.assertCurrent();const last=calls;reset();let added=false;
onRead=()=>{if(calls===last){added=true;write(population,extra);}};
try{reject(context.assertCurrent);assert.equal(added,true);}
finally{unlinkSync(join(root,population));reset();}
context.assertCurrent();reset();
// The original table population deliberately excludes specs. Preserve that
// exact scope; the distinct complete-product population belongs elsewhere.
write(ignored,extra);
try{context.assertCurrent();}finally{unlinkSync(join(root,ignored));reset();}
const ledger='compatibility/f10/disposition-ledger/ledger.json';
assert.ok(context.metadataRead(ledger).equals(context.applied?context.before:disk(ledger)));reset();
const wrong=context.applied?context.before:context.after;
let ledgerReached=false;
override=(path,raw)=>{if(path===ledger){ledgerReached=true;return wrong;}return raw;};
try{reject(context.assertCurrent,error=>error.message.includes(ledger)&&error.message.includes('nonphysical'));assert.equal(ledgerReached,true);}finally{reset();}
context.assertCurrent();reset();
const inspector=Object.getOwnPropertyDescriptor(admission,'inspectCanonicalSource');let getters=0;
for(const operation of [()=>tableLocalCompilationOwnerContext({root,read}),context.assertCurrent]){
 try{
  Object.defineProperty(admission,'inspectCanonicalSource',{configurable:true,get(){getters++;return inspector.value;}});
  onRead=()=>Object.defineProperty(admission,'inspectCanonicalSource',inspector);
  reject(operation);assert.equal(calls,0);assert.equal(getters,0);
 }finally{Object.defineProperty(admission,'inspectCanonicalSource',inspector);reset();}
}
context.assertCurrent();const poisonLast=calls;reset();let poisoned=false,poisonCalls=0;
onRead=()=>{if(calls===poisonLast){poisoned=true;Object.defineProperty(admission,'inspectCanonicalSource',
 {...inspector,value(){poisonCalls++;}});}};
try{reject(context.assertCurrent);assert.equal(poisoned,true);assert.equal(poisonCalls,0);}
finally{Object.defineProperty(admission,'inspectCanonicalSource',inspector);reset();}
context.assertCurrent();reset();
assert.equal(rejected,26);assert.ok(disk(stage).equals(stageBefore));assert.ok(disk(row).equals(rowBefore));
console.log(JSON.stringify({result:'pass',actual_table_source_stage_and_legacy_tool_nodes:3,rejected_faults:rejected,
 alternate_scheduler_reentry_controls:6,table_population_cold_late_controls:2,ignored_spec_population_preserved:true,
 same_consumed_source_mutation_controls:2,projected_ledger_preserved:true,source_inspector_controls:3,
 restoration_passed:true,full_composed_owner_executed:false,compiler_or_build_executed:false,g11_claim:'not-passed'}));
