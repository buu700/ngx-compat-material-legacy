/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {historicalContractRepairSourceSubject,readHistoricalContractRepairMember} from '../scripts/historical-contract-repair-source.mjs';
import {composeCanonicalSourceGuards} from '../scripts/canonical-source-guard-plan.mjs';
const root=process.cwd(),target='compatibility/rc/historical-contract-repair-source-inputs.json';
const disk=path=>readHistoricalContractRepairMember(root,path),original=disk(target),drift=Buffer.from('\n// historical repair guard test drift\n');
let calls=0,onRead=()=>{},override=(path,raw)=>raw;
const read=path=>{const raw=disk(path);calls++;onRead(path);return override(path,raw);};
const reset=()=>{calls=0;onRead=()=>{};override=(path,raw)=>raw;};
const restoreBytes=()=>{const raw=disk(target);assert.ok(raw.equals(original)||raw.equals(Buffer.concat([original,drift])),'preserving unexpected target bytes');if(!raw.equals(original))writeFileSync(join(root,target),original);};
const restore=()=>{try{restoreBytes();}finally{reset();}};
const subject=historicalContractRepairSourceSubject({root,read});reset();
assert.equal(subject.guardPlan.assertCurrent,subject.assertCurrent);assert.equal(subject.guardPlan.node,subject.guardNode);
writeFileSync(join(root,target),Buffer.concat([original,drift]));onRead=()=>restoreBytes();
try{assert.throws(subject.assertCurrent,e=>e?.code==='ERR_ASSERTION'&&e.message.includes(target));assert.equal(calls,0);}finally{restore();}
subject.assertCurrent();reset();
for(const returned of ['old','new']){
 let reached=false,faultCalls=0;onRead=path=>{if(path===target&&!reached){reached=true;faultCalls=calls;writeFileSync(join(root,target),Buffer.concat([original,drift]));}};
 override=(path,raw)=>path===target&&returned==='new'?disk(path):raw;
 try{assert.throws(subject.assertCurrent,e=>e?.code==='ERR_ASSERTION'&&e.message.includes(target));assert.equal(reached,true);assert.equal(calls,faultCalls);}finally{restore();}
 subject.assertCurrent();reset();
}
let injected=false;const later=Object.freeze({dependencies:Object.freeze([]),preflight:()=>{},consume:()=>{injected=true;writeFileSync(join(root,target),Buffer.concat([original,drift]));},final:()=>{}});
try{assert.throws(composeCanonicalSourceGuards(Object.freeze([subject.guardNode,later])),e=>e?.code==='ERR_ASSERTION'&&e.message.includes(target));assert.equal(injected,true);}finally{restore();}
subject.assertCurrent();reset();
const row=subject.images[0],ref={path:row.path,...row.before},alternate=composeCanonicalSourceGuards(Object.freeze([subject.guardNode]));
let reached=false,errors=[],delta=-1;onRead=path=>{if(path!==target||reached)return;reached=true;const before=calls;for(const operation of [subject.assertCurrent,alternate,()=>subject.qualify(ref),()=>subject.historicalReference(ref)])try{operation();errors.push(null);}catch(e){errors.push(e);}delta=calls-before;};
subject.assertCurrent();assert.equal(reached,true);assert.equal(errors.length,4);assert.ok(errors.every(e=>e?.message.includes('reentrant historical repair')));assert.equal(delta,0);reset();
const sentinel=new Error('historical repair reader sentinel');let entered=false;onRead=path=>{if(path===target){entered=true;throw sentinel;}};
assert.throws(subject.assertCurrent,e=>e===sentinel);assert.equal(entered,true);reset();subject.assertCurrent();
console.log(JSON.stringify({result:'pass',line:subject.line,cold:true,same_callback_old_new:2,late_final:true,direct_alternate_side_reentry:4,exception_recovery:true,g11_claim:'not-passed'}));
