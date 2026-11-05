/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Real registered-roster epoch row negative; never a complete-owner pass. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {packedUpstreamLedgerEpoch,packedUpstreamLedgerCurrentSourceLane} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {currentAuthoredRosterSourceSubject,currentAuthoredRosterRawRead} from '../scripts/current-authored-roster-source.mjs';
import {readHistoricalContractRepairOwnerMember} from '../scripts/historical-contract-repair-readers.mjs';
import {baseClassRemovalOwnerSourceSubject} from '../scripts/base-class-removal-owner-source.mjs';
const root=process.cwd(),ledger='compatibility/f10/disposition-ledger/ledger.json';
const target='compatibility/rc/current-roster-source-epoch-inputs.json';
const physical=path=>readHistoricalContractRepairOwnerMember(root,path),original=physical(target);
const drift=Buffer.from('\n// roster row final drift\n');
let reachedRow=false,failure;
const read=path=>{
 const raw=physical(path);
 if(!reachedRow&&path===ledger&&new Error().stack.includes('at rows (')){
  reachedRow=true;writeFileSync(join(root,target),Buffer.concat([original,drift]));
 }
 return raw;
};
const roster=currentAuthoredRosterSourceSubject({root,read});
assert.equal(currentAuthoredRosterRawRead({root,read:roster.metadataRead}),read);
const publicLane=packedUpstreamLedgerCurrentSourceLane({root,read:roster.metadataRead});
assert.equal(publicLane.registered_frames,0);assert.equal(publicLane.read,roster.metadataRead);
assert.ok(roster.bound.some(ref=>ref.path===target));
const selected=baseClassRemovalOwnerSourceSubject({root,read:physical});
assert.equal(selected.bound.some(ref=>ref.path===target),false,'control must be outside whole selected base scope');
try{
 try{packedUpstreamLedgerEpoch({root,read:roster.metadataRead});}catch(error){failure=error;}
 assert.equal(reachedRow,true,'real registered-roster epoch row not reached: '+(failure?.stack??'no failure'));
 assert.equal(failure?.code,'ERR_ASSERTION',failure?.stack);
 assert.ok(failure.message.includes('physical current roster input '+target),failure.stack);
 const frames=failure.stack.split('\n').slice(1),sweep=frames.findIndex(line=>line.includes('at sweep (')&&line.includes('current-authored-roster-source.mjs'));
 assert.ok(sweep>=0,failure.stack);
 assert.ok(frames[sweep+1].includes('final')&&frames[sweep+1].includes('current-authored-roster-source.mjs'),failure.stack);
 assert.ok(frames[sweep+2].includes('at invoke (')&&frames[sweep+2].includes('canonical-source-guard-plan.mjs'),failure.stack);
}finally{
 const now=physical(target);
 assert.ok(now.equals(original)||now.equals(Buffer.concat([original,drift])),'foreign production roster input bytes preserved');
 if(!now.equals(original))writeFileSync(join(root,target),original);
}
assert.ok(physical(target).equals(original));
console.log(JSON.stringify({result:'pass',actual_registered_roster_epoch_route:true,actual_private_source_row_reached:true,
 roster_only_fault_rejected_by_scheduler_final:true,outside_selected_base_scope:true,public_roster_has_no_ledger_metadata_grant:true,
 restoration_passed:true,complete_owner_success:false,compiler_or_build_executed:false,g11_claim:'not-passed'}));
