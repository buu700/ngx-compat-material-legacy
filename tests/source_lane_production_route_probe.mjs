/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Negative production-route control; never a complete-owner success result. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {preparePackedUpstreamLedger} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {readHistoricalContractRepairOwnerMember} from '../scripts/historical-contract-repair-readers.mjs';
import {baseClassRemovalCanonicalFrameSubject,baseClassRemovalOwnerSourceSubject} from '../scripts/base-class-removal-owner-source.mjs';

const root=process.cwd(),ledger='compatibility/f10/disposition-ledger/ledger.json';
const target='projects/ngx-material-legacy/legacy-button/button.ts';
const original=readHistoricalContractRepairOwnerMember(root,target);
const physical=path=>readHistoricalContractRepairOwnerMember(root,path);
const frame=baseClassRemovalCanonicalFrameSubject({root,read:physical});
const source=baseClassRemovalOwnerSourceSubject({root,read:physical});
assert.equal(frame.bound.some(ref=>ref.path===target),false,'control must be outside narrow frame scope');
assert.ok(source.source.bound.some(ref=>ref.path===target),'control must belong to actual source scope');
let reachedRow=false,failure;
const read=path=>{
 const raw=readHistoricalContractRepairOwnerMember(root,path);
 // Observe an actual supplied-reader stack, without registering a reader or
 // changing any owner. The table projection creates this real private row.
 if(!reachedRow&&path===ledger&&new Error().stack.includes('at rows (')){
  reachedRow=true;writeFileSync(join(root,target),Buffer.concat([original,Buffer.from('\n// final source callback drift\n')]));
 }
 return raw;
};
try{
 try{preparePackedUpstreamLedger({root,read});}catch(error){failure=error;}
 assert.equal(reachedRow,true,'genuine private source-lane row was not reached: '+(failure?.stack??'no failure'));
 assert.equal(failure?.code,'ERR_ASSERTION',failure?.stack);
 assert.ok(failure.message.includes(target),failure.stack);
 assert.ok(failure.message.includes('final physical sweep'),failure.stack);
 const stack=failure.stack.split('\n').slice(1),sweep=stack.findIndex(line=>line.includes('at physicalSweep ('));
 assert.ok(sweep>=0,failure.stack);
 assert.ok(stack[sweep+1].includes('final')&&stack[sweep+1].includes('base-class-removal-owner-source.mjs'),failure.stack);
 assert.ok(stack[sweep+2].includes('at invoke (')&&stack[sweep+2].includes('canonical-source-guard-plan.mjs'),failure.stack);
}finally{writeFileSync(join(root,target),original);}
assert.ok(readHistoricalContractRepairOwnerMember(root,target).equals(original));
console.log(JSON.stringify({result:'pass',actual_private_production_row_reached:true,
 earlier_base_source_fault_rejected_by_outer_final:true,restoration_passed:true,
 source_only_control_excludes_narrow_frame:true,final_directly_invoked_by_scheduler:true,
 complete_owner_success:false,compiler_or_build_executed:false,g11_claim:'not-passed'}));
