/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual opted-in legacy stage graph; no complete owner or performance credit. */
import assert from 'node:assert/strict';
import {writeFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import admission from '../scripts/upstream-legacy-removal-admission.cjs';
import tableAdmission from '../scripts/upstream-table-local-compilation-admission.cjs';
import {legacyRemovalOwnerContext} from '../scripts/legacy-removal-canonical-stage.mjs';
import {composeCanonicalSourceGuards} from '../scripts/canonical-source-guard-plan.mjs';
import {readHistoricalContractRepairOwnerMember} from '../scripts/historical-contract-repair-readers.mjs';
const root=process.cwd(),group=process.argv[2];assert.ok(['cold','consume','late'].includes(group));
const disk=path=>readHistoricalContractRepairOwnerMember(root,path),write=(path,raw)=>writeFileSync(join(root,path),raw);
const target='compatibility/rc/21x-legacy-removal-admission-source-successor.json',before=disk(target);
const population='projects/ngx-material-legacy/legacy-table/legacy-guard-population-control.spec.ts';
const drift=Buffer.from('\n// legacy graph callback drift\n'),extra=Buffer.from('// legacy graph population control\n');
let calls=0,onRead=()=>{},override=null,rejected=0;
const read=path=>{const raw=disk(path);calls++;onRead(path);return override?override(path,raw):raw;};
const reset=()=>{calls=0;onRead=()=>{};override=null;};
const reject=(fn,match=()=>true)=>{assert.throws(fn,error=>error?.code==='ERR_ASSERTION'&&match(error));rejected++;};
const context=legacyRemovalOwnerContext({root,read,composeSourceGuards:true});reset();
assert.ok(Object.isFrozen(context.guardPlan)&&Object.isFrozen(context.guardNode));
assert.equal(context.guardPlan.assertCurrent,context.assertCurrent);assert.equal(context.guardPlan.node,context.guardNode);
assert.equal(context.guardNode.dependencies.length,2);
const source=context.guardNode.dependencies[1];
const inspector=Object.getOwnPropertyDescriptor(admission,'inspectCanonicalSource');
assert.equal(Function.prototype.toString.call(inspector.value),Function.prototype.toString.call(tableAdmission.inspectCanonicalSource));
if(group==='cold'){
 source.preflight();source.final();assert.equal(calls,0);
 // The genuine direct-only CJS ref must be checked before a repair callback.
 write(target,Buffer.concat([before,drift]));
 try{onRead=()=>write(target,before);reject(source.preflight,error=>error.message.includes(target));assert.equal(calls,0);}
 finally{write(target,before);reset();}
 write(population,extra);
 try{onRead=()=>unlinkSync(join(root,population));reject(source.preflight,error=>error.message.includes('changed complete legacy product population'));assert.equal(calls,0);}
 finally{unlinkSync(join(root,population));reset();}
 for(const operation of [()=>legacyRemovalOwnerContext({root,read,composeSourceGuards:true}),source.preflight]){
  try{Object.defineProperty(admission,'inspectCanonicalSource',{...inspector,value:tableAdmission.inspectCanonicalSource});
   reject(operation,error=>error.message.includes('changed legacy canonical source inspector'));assert.equal(calls,0);
  }finally{Object.defineProperty(admission,'inspectCanonicalSource',inspector);reset();}
 }
 let getters=0;
 try{Object.defineProperty(admission,'inspectCanonicalSource',{configurable:true,get(){getters++;return inspector.value;}});
  reject(source.preflight,error=>error.message.includes('non-data'));assert.equal(calls,0);assert.equal(getters,0);
 }finally{Object.defineProperty(admission,'inspectCanonicalSource',inspector);reset();}
 source.preflight();source.final();assert.equal(calls,0);
 const original=legacyRemovalOwnerContext({root,read});assert.equal(Object.hasOwn(original,'guardPlan'),false);reset();
}else if(group==='consume'){
 for(const forged of [raw=>Buffer.concat([raw,drift]),()=>({})]){
  let reached=false;override=(path,raw)=>{if(path===target){reached=true;return forged(raw);}return raw;};
  try{reject(source.consume,error=>error.message.includes(target)&&error.message.includes('nonphysical'));assert.equal(reached,true);}finally{reset();}
 }
 for(const returned of ['old','new']){
  let changed=false,later=0;
  onRead=path=>{if(changed){later++;write(target,before);}else if(path===target){changed=true;write(target,Buffer.concat([before,drift]));}};
  override=(path,raw)=>path===target&&returned==='new'?disk(path):raw;
  try{reject(source.consume,error=>error.message.includes(target)&&/nonphysical|changed during callback/.test(error.message));assert.equal(changed,true);assert.equal(later,0);}
  finally{write(target,before);reset();}
 }
 source.consume();assert.ok(calls>0);const count=calls;reset();
 const alternate=composeCanonicalSourceGuards(Object.freeze([context.guardNode]));
 let nested=false;
 onRead=()=>{if(calls===count&&!nested){nested=true;for(const operation of [context.assertCurrent,alternate,source.preflight,source.consume,source.final]){const prior=calls;reject(operation,error=>error.message.includes('reentrant'));assert.equal(calls,prior);}}};
 try{source.consume();assert.equal(nested,true);}finally{reset();}
 const suppliedFailure=new Error('actual supplied callback failed');let reached=false;
 onRead=path=>{if(path===target){reached=true;throw suppliedFailure;}};
 try{assert.throws(source.consume,error=>error===suppliedFailure);assert.equal(reached,true);}finally{reset();}
 source.preflight();source.final();assert.equal(calls,0);source.consume();assert.equal(calls,count);reset();
}else{
 const later=operation=>composeCanonicalSourceGuards(Object.freeze([context.guardNode,Object.freeze({dependencies:Object.freeze([]),preflight:()=>{},consume:operation,final:()=>{}})]));
 let reached=false;
 try{reject(later(()=>{reached=true;write(target,Buffer.concat([before,drift]));}),error=>error.message.includes('changed legacy removal admission source '+target));assert.equal(reached,true);}
 finally{write(target,before);reset();}
 reached=false;
 try{reject(later(()=>{reached=true;write(population,extra);}),error=>error.message.includes('changed complete legacy product population'));assert.equal(reached,true);}
 finally{unlinkSync(join(root,population));reset();}
 let last=0;source.consume();last=calls;reset();let swapped=false;
 onRead=()=>{if(calls===last){swapped=true;Object.defineProperty(admission,'inspectCanonicalSource',{...inspector,value:tableAdmission.inspectCanonicalSource});}};
 try{reject(source.consume,error=>error.message.includes('changed legacy canonical source inspector'));assert.equal(swapped,true);}
 finally{Object.defineProperty(admission,'inspectCanonicalSource',inspector);reset();}
 context.assertCurrent();assert.ok(calls>0);reset();
}
assert.ok(disk(target).equals(before));
console.log(JSON.stringify({result:'pass',group,rejected_faults:rejected,actual_source_node:true,restoration_passed:true,complete_owner_success:false,compiler_or_build_executed:false}));
