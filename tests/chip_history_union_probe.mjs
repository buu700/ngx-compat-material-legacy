/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current subjects and finite historical views are independently checked. No product execution. */
import assert from 'node:assert/strict';
import {batchHistoryRead} from '../scripts/chip-batch-history.mjs';
import {nativeDateSourceContext} from '../scripts/native-date-packed-source-context.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CHIP_HISTORY_INPUT,chipHistoryUnionContext,chipHistoryRead,validateChipHistoryCurrent,recordedStageSubject} from '../scripts/chip-history-union.mjs';
import {recordedImplementationSubject} from '../scripts/recorded-execution-source-context.mjs';
import {currentChipAuditNativeDefinitions} from '../scripts/chip-audit-source-requalification.mjs';
const read=batchHistoryRead(p=>readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const {data,before}=validateChipHistoryCurrent(read,{required:true}),history=chipHistoryRead(read),controls=[];
const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{maxBuffer:32*1024*1024});
assert.equal(before.members.length,30);
for(const member of data.current_subjects)assert.equal(hash(read(member.path)),member.sha256,'not a current source identity');
for(const member of before.members){
 assert.equal(git('show',before.target_frame+':'+member.path).toString(),member.before_text);assert.equal(history(member.path).toString(),member.before_text);
 const unknown=Buffer.concat([read(member.path),Buffer.from('\n unreviewed history input\n')]),altered=p=>p===member.path?unknown:read(p);
 // A reader never labels unknown bytes as its predecessor. The explicit strict
 // boundary rejects them, including an unknown ledger which cannot select a view.
 assert.deepEqual(chipHistoryRead(altered)(member.path),unknown);
 assert.throws(()=>validateChipHistoryCurrent(altered,{required:true}),undefined,member.path);controls.push({kind:'unknown-source-passed-through-and-rejected',path:member.path});
 if(member.path===data.ledger_path)assert.throws(()=>recordedImplementationSubject(member.path,altered));
}
let stages=0;
for(const stage of before.stages)for(const member of stage.members){
 const selected=recordedStageSubject(stage.name,member.path,read);assert.equal(hash(selected),member.sha256);assert.deepEqual(selected,git('show',stage.commit+':'+member.path));stages++;
 assert.deepEqual(recordedStageSubject(stage.name,member.path,p=>p===member.path?selected:read(p)),selected);
 assert.throws(()=>recordedStageSubject(stage.name,member.path,p=>p===member.path?Buffer.concat([read(p),Buffer.from('unreviewed')]):read(p)));controls.push({kind:'unknown-stage-subject-rejected',stage:stage.name,path:member.path});
}
assert.equal(stages,4);
for(const [stage,path]of [['unknown',data.ledger_path],['modern-chip-admission','tests/audit_test_context.py'],['classic-chip-list-contract','tests/test_audit_test_context.py']]){assert.throws(()=>recordedStageSubject(stage,path,read));controls.push({kind:'unregistered-stage-member-rejected',stage,path});}
const classic=before.stages.find(s=>s.name==='classic-chip-list-contract').members[0];assert.throws(()=>recordedStageSubject('modern-chip-admission',data.ledger_path,p=>p===data.ledger_path?Buffer.from(classic.text):read(p)));controls.push({kind:'foreign-authentic-stage-ledger-rejected'});
for(const path of [CHIP_HISTORY_INPUT,data.prior.path,data.supplement.path]){
 assert.throws(()=>chipHistoryUnionContext(p=>p===path?Buffer.concat([read(p),Buffer.from('unreviewed')]):read(p)));controls.push({kind:'corrupt-live-capsule-rejected',path});
 let corrupt=false;const changing=p=>corrupt&&p===path?Buffer.from('unreviewed'):read(p),captured=chipHistoryRead(changing);corrupt=true;assert.throws(()=>chipHistoryUnionContext(changing));assert.equal(captured(before.members[0].path).toString(),before.members[0].before_text);controls.push({kind:'direct-recheck-and-immutable-view',path});
}
for(const path of [CHIP_HISTORY_INPUT,data.prior.path,data.supplement.path]){let corrupt=false;const changing=p=>corrupt&&p===path?Buffer.from('unreviewed'):read(p);nativeDateSourceContext(changing);corrupt=true;assert.throws(()=>nativeDateSourceContext(changing));controls.push({kind:'older-direct-context-rechecks-successor-capsule',path});}
for(const member of before.unchanged_recorded_datasets){assert.equal(read(member.path).toString(),member.text);assert.deepEqual(read(member.path),git('show',before.source_parent+':'+member.path));}
const native=await currentChipAuditNativeDefinitions({checkNoCoordinator:true});assert.equal(native.length,data.current_native_guards);
for(const stage of before.stages)assert.ok(!stage.members.some(m=>m.path.startsWith('projects/')),'product is not a stage bypass');
assert.equal(hash(read(data.ledger_path)),data.ledger_sha256);assert.deepEqual(read(data.ledger_path),git('show',before.source_parent+':'+data.ledger_path));
const report={schema_version:1,line:data.line,current_live_subjects:data.current_subjects.length,historical_predecessors:before.members.length,source_unknown_controls:30,exact_stage_subjects:stages,stage_rejection_controls:8,capsule_and_snapshot_controls:6,older_context_recheck_controls:3,current_native_guards:native.length,all_current_guards_refuse_missing_coordinator:true,original_recorded_datasets_unchanged:2,all1697_decisions_unchanged:true,controls,new_SHA_or_role_decisions:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,controls:undefined}));
