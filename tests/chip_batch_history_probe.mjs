/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current guards and historical subjects are verified separately. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {BATCH_HISTORY_INPUT,batchHistoryContext,batchHistoryRead,validateBatchHistoryCurrent,batchRecordedStageSubject,reverseBatchHistorySource} from '../scripts/chip-batch-history.mjs';
import {validateChipHistoryCurrent} from '../scripts/chip-history-union.mjs';
import {recordedSourceContext} from '../scripts/recorded-execution-source-context.mjs';
import {nativeDateSourceContext} from '../scripts/native-date-packed-source-context.mjs';
import {currentChipAuditNativeDefinitions} from '../scripts/chip-audit-source-requalification.mjs';
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{maxBuffer:32*1024*1024});
const {data,before,sourcePrior}=validateBatchHistoryCurrent(read,{required:true}),history=batchHistoryRead(read),controls=[];
assert.equal(before.mappings.length,8);assert.equal(data.current_subjects.length,data.line==='main'?485:474);assert.equal(read(data.ledger_path).toString(),sourcePrior.ledger_text);
for(const m of before.mappings){
 assert.deepEqual(Buffer.from(m.before_text),git('show',data.predecessor_frame+':'+m.path));assert.deepEqual(Buffer.from(m.parent_text),git('show',data.source_parent+':'+m.path));assert.equal(history(m.path).toString(),m.before_text);assert.equal(reverseBatchHistorySource(m.path,read(m.path).toString(),read),m.before_text);
 const unknown=Buffer.concat([read(m.path),Buffer.from('\n unreviewed batch source\n')]),changed=p=>p===m.path?unknown:read(p);
 assert.deepEqual(batchHistoryRead(changed)(m.path),unknown);assert.equal(reverseBatchHistorySource(m.path,unknown.toString(),changed),unknown.toString());assert.throws(()=>validateBatchHistoryCurrent(changed,{required:true}));assert.throws(()=>validateChipHistoryCurrent(changed,{required:true}));controls.push({control:'unknown-source-passes-through-and-strictly-rejects',path:m.path});
}
let stages=0;
for(const stage of before.stages)for(const m of stage.members){
 const exact=batchRecordedStageSubject(stage.name,m.path,read);assert.equal(hash(exact),m.sha256);assert.deepEqual(exact,git('show',stage.commit+':'+m.path));assert.deepEqual(batchRecordedStageSubject(stage.name,m.path,p=>p===m.path?exact:read(p)),exact);stages++;
 assert.throws(()=>batchRecordedStageSubject(stage.name,m.path,p=>p===m.path?Buffer.concat([read(p),Buffer.from('unreviewed')]):read(p)));controls.push({control:'unknown-stage-subject-rejected',stage:stage.name,path:m.path});
}
assert.equal(stages,17);
for(const [stage,path]of [['unknown',data.ledger_path],['chip-edit-admission','tests/audit_test_context.py'],['chip-modernization-admission','scripts/chip-batch-history.mjs']]){assert.throws(()=>batchRecordedStageSubject(stage,path,read));controls.push({control:'unregistered-stage-member-rejected',stage,path});}
const foreign=Buffer.from(before.stages[1].members[0].text);assert.notEqual(hash(foreign),before.stages[0].members[0].sha256);assert.throws(()=>batchRecordedStageSubject(before.stages[0].name,data.ledger_path,p=>p===data.ledger_path?foreign:read(p)));controls.push({control:'foreign-authentic-stage-ledger-rejected'});
for(const path of [BATCH_HISTORY_INPUT,data.prior.path,data.source_prior.path]){
 assert.throws(()=>batchHistoryContext(p=>p===path?Buffer.concat([read(p),Buffer.from('changed')]):read(p)));controls.push({control:'corrupt-live-capsule-rejected',path});
 let corrupt=false;const changing=p=>corrupt&&p===path?Buffer.from('changed'):read(p),captured=batchHistoryRead(changing);corrupt=true;assert.throws(()=>batchHistoryContext(changing));assert.equal(captured(before.mappings[0].path).toString(),before.mappings[0].before_text);controls.push({control:'direct-context-rechecks-and-captured-view-retains-authentication',path});
 for(const context of [recordedSourceContext,nativeDateSourceContext]){let changed=false;const reader=p=>changed&&p===path?Buffer.from('changed'):read(p);context(reader);changed=true;assert.throws(()=>context(reader));controls.push({control:'older-direct-context-rechecks-batch-capsule',context:context.name,path});}
}
assert.ok(Object.isFrozen(before.mappings[0]));assert.throws(()=>before.mappings[0].before_text='changed');controls.push({control:'immutable-original-facts'});
assert.ok(Object.isFrozen(data.current_subjects));assert.throws(()=>data.current_subjects.pop());controls.push({control:'immutable-current-bindings'});
for(const m of before.unchanged_data){assert.equal(hash(read(m.path)),m.sha256);assert.deepEqual(read(m.path),git('show',data.source_parent+':'+m.path));}
for(const m of sourcePrior.edited_source_preimages){assert.equal(hash(m.text),m.sha256);assert.deepEqual(Buffer.from(m.text),git('show',data.source_parent+':'+m.path));}
const frame=before.replay_registry_preimage;assert.equal(hash(frame.text),frame.sha256);assert.deepEqual(Buffer.from(frame.text),git('show',data.source_parent+':'+frame.path));
const currentRegistry=JSON.parse(read(frame.path)),oldRegistry=JSON.parse(frame.text);delete currentRegistry.current_frame;delete oldRegistry.current_frame;assert.deepEqual(currentRegistry,oldRegistry);
const native=await currentChipAuditNativeDefinitions({checkNoCoordinator:true});assert.equal(native.length,data.line==='main'?31:30);
const report={schema_version:1,line:data.line,actual_current_subjects:data.current_subjects.length,authenticated_predecessors:before.mappings.length,exact_new_stage_subjects:stages,controls,all_current_native_guards_refuse_missing_coordinator:true,native_guards:native.length,unchanged_old_datasets:before.unchanged_data.length,original_replay_programs_and_assertions_preserved:true,new_SHA_or_role_decisions:0,actual_native_packed_or_floor_qualified:false,current_frame_refresh_pending:true,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,controls:controls.length}));
