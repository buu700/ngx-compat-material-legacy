/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual static table constructor path; no full owner or product admission. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tableLocalCompilationOwnerSourceSubject} from '../scripts/table-local-compilation-owner-source.mjs';
import {readHistoricalContractRepairOwnerMember} from '../scripts/historical-contract-repair-readers.mjs';
const root=process.cwd(),mode=process.argv[2];assert.ok(['positive','batch','member'].includes(mode));
Error.stackTraceLimit=25;
const target='scripts/legacy-removal-owner-source.mjs',drift=Buffer.from('\n// final source callback drift\n');
const disk=path=>readHistoricalContractRepairOwnerMember(root,path),original=disk(target);
const packet=JSON.parse(disk('compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json'));
assert.ok(packet.code_transitions.some(row=>row.after.path===target),'target is not an actual static transition');
let calls=0,armed=false,returned='old',mutated=false,faultCalls=null,batchSeen=0,memberSeen=0,rejected=0;
const read=path=>{
 const raw=disk(path);calls++;
 if(path!==target)return raw;
 const stack=new Error().stack;
 const batch=/at referenceBatch \(/.test(stack);
 const member=/at staticMember \(/.test(stack)&&/table-local-compilation-owner-source\.mjs:/.test(stack);
 if(batch)batchSeen++;if(member)memberSeen++;
 if(armed&&!mutated&&(mode==='batch'?batch:member)){
  mutated=true;faultCalls=calls;writeFileSync(join(root,target),Buffer.concat([original,drift]));
  return returned==='old'?raw:disk(target);
 }
 return raw;
};
const restore=()=>{
 const now=disk(target);assert.ok(now.equals(original)||now.equals(Buffer.concat([original,drift])),'foreign table probe bytes preserved');
 if(!now.equals(original))writeFileSync(join(root,target),original);
};
if(mode!=='positive')for(const value of ['old','new']){
 returned=value;mutated=false;faultCalls=null;armed=true;
 try{
  assert.throws(()=>tableLocalCompilationOwnerSourceSubject({root,read}),error=>error?.code==='ERR_ASSERTION'&&error.message.includes(target)&&/nonphysical|changed during callback/.test(error.message));
  assert.equal(mutated,true,'actual targeted constructor callback was not reached');
  assert.equal(calls,faultCalls,'a later supplied callback ran after the physical fault');rejected++;
 }finally{armed=false;restore();}
}
const subject=tableLocalCompilationOwnerSourceSubject({root,read});
assert.ok(subject.guardNode&&subject.guardPlan);assert.equal(subject.guardPlan.assertCurrent,subject.assertCurrent);
assert.ok(subject.bound.some(ref=>ref.path===target));assert.ok(batchSeen>0,'actual static batch callbacks were not observed');
assert.ok(memberSeen>0,'actual static members were not observed');subject.assertCurrent();assert.ok(disk(target).equals(original));
console.log(JSON.stringify({result:'pass',mode,actual_static_table_constructor:true,static_metadata_batch_observed:true,
 same_callback_mutations_rejected:rejected,restoration_passed:true,complete_owner_success:false,compiler_or_build_executed:false,g11_claim:'not-passed'}));
