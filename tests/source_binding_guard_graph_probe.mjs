/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Real metadata binding callback fault; no owner-completion claim. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {preparePackedUpstreamLedger} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {readHistoricalContractRepairOwnerMember} from '../scripts/historical-contract-repair-readers.mjs';
import {baseClassRemovalCanonicalFrameSubject,baseClassRemovalOwnerSourceSubject} from '../scripts/base-class-removal-owner-source.mjs';
const root=process.cwd(), ledger='compatibility/f10/disposition-ledger/ledger.json';
const target='projects/ngx-material-legacy/legacy-button/button.ts';
const physical=path=>readHistoricalContractRepairOwnerMember(root,path), original=physical(target);
const frame=baseClassRemovalCanonicalFrameSubject({root,read:physical});
const owner=baseClassRemovalOwnerSourceSubject({root,read:physical});
assert.equal(frame.bound.some(ref=>ref.path===target),false);
assert.ok(owner.source.bound.some(ref=>ref.path===target));
let reached=false,failure,narrowSeen=false;
const sentinel=new Error('binding-row supplied-reader sentinel'), retrySentinel=new Error('post-binding retry sentinel'), mode=process.argv[2]??'late';
let retrying=false,completedRetryBinding=false;
assert.ok(['late','exception'].includes(mode));
const read=path=>{
 const raw=physical(path),stack=new Error().stack;
 if(path===ledger&&stack.includes('at collect (')&&stack.includes('ledgerSubject'))narrowSeen=true;
 if(mode==='exception'&&retrying&&narrowSeen&&path===ledger&&stack.includes('at rows (')){completedRetryBinding=true;throw retrySentinel;}
 if(mode==='exception'&&!retrying&&narrowSeen&&path===ledger&&stack.includes('at collect (')&&!stack.includes('ledgerSubject')){reached=true;throw sentinel;}
 if(mode==='late'&&!reached&&path===ledger&&stack.includes('at collect (')&&stack.includes('base-class-removal-canonical-stage.mjs')){
  reached=true;writeFileSync(join(root,target),Buffer.concat([original,Buffer.from('\n// final source callback drift\n')]));
 }
 return raw;
};
try{
 try{preparePackedUpstreamLedger({root,read});}catch(error){failure=error;}
 assert.equal(reached,true,'actual base ledger binding not reached: '+(failure?.stack??'no failure'));
 if(mode==='exception'){
  assert.equal(failure,sentinel);assert.equal(narrowSeen,true);
  reached=false;narrowSeen=false;retrying=true;
  assert.throws(()=>preparePackedUpstreamLedger({root,read}),error=>error===retrySentinel);
  assert.equal(completedRetryBinding,true);assert.equal(narrowSeen,true);
 }else{
 assert.equal(failure?.code,'ERR_ASSERTION',failure?.stack);
 assert.ok(failure.message.includes(target),failure.stack);
 assert.ok(failure.message.includes('final physical sweep'),failure.stack);
 const stack=failure.stack.split('\n').slice(1),at=stack.findIndex(line=>line.includes('at physicalSweep ('));
 assert.ok(at>=0&&stack[at+1].includes('final')&&stack[at+2].includes('at invoke ('),failure.stack);
 }
}finally{
 const current=physical(target), expected=Buffer.concat([original,Buffer.from('\n// final source callback drift\n')]);
 if(current.equals(expected))writeFileSync(join(root,target),original);
 else assert.ok(current.equals(original),'foreign source bytes preserved');
}
assert.ok(physical(target).equals(original));
console.log(JSON.stringify({result:'pass',mode,actual_base_ledger_binding_reached:true,child_final_rejected_late_mutation:mode==='late',narrow_frame_executed:mode==='exception'&&narrowSeen,exception_recovered:mode==='exception'&&completedRetryBinding,restoration_passed:true,complete_owner_success:false,g11_claim:'not-passed'}));
