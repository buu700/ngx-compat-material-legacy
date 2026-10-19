/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {packedCollectorHistoryInputs,validatePackedCollectorReceipt} from '../scripts/packed-collector-history.mjs';
import {inspectFixtureLifecycleRequalification} from '../scripts/fixture-lifecycle-requalification.mjs';
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex');
const {data}=packedCollectorHistoryInputs(),controls=[];
for(const path of [...data.current_identical_subjects.map(m=>m.path),...data.protected.map(m=>m.path),...data.entries.map(e=>e.program),data.matrix.path,'compatibility/rc/packed-collector-history-inputs.json',data.prior.path]){
 const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>packedCollectorHistoryInputs({read:p=>p===path?bytes:read(p)}),'unknown source accepted: '+path);controls.push('changed-current-or-original:'+path);
}
assert.equal(controls.length,43);
const good={tests_run:10,started:[...data.case_ids],passed:[...data.case_ids],failures:[],errors:[],skipped:[],expected_failures:[],unexpected_successes:[],successful:true,node_observations:data.entries.map(e=>{
 const summary={line:data.line,derived_cases:106,actual_packed_or_native_executed:false},stdout=JSON.stringify(summary)+'\n';return {probe:e.probe,exit_code:0,summary,stdout,stdout_sha256:hash(stdout)};
})};
// This is a receipt-schema fixture, never execution or source qualification.
assert.equal(validatePackedCollectorReceipt(data,good),true);
for(const [id,mutate]of [
 ['wrong-count',r=>r.tests_run=9],['missing-start',r=>r.started.pop()],['missing-pass',r=>r.passed.pop()],
 ['wrong-order',r=>r.passed.reverse()],['failure',r=>r.failures.push(data.case_ids[0])],['error',r=>r.errors.push(data.case_ids[0])],
 ['skip',r=>r.skipped.push(data.case_ids[0])],['expected-failure',r=>r.expected_failures.push(data.case_ids[0])],
 ['unexpected-success',r=>r.unexpected_successes.push(data.case_ids[0])],['unsuccessful',r=>r.successful=false],
 ['missing-node',r=>r.node_observations.pop()],['duplicate-node',r=>r.node_observations[1]=r.node_observations[0]],
 ['foreign-node',r=>r.node_observations[0].probe='foreign.mjs'],['failed-node',r=>r.node_observations[0].exit_code=1],
 ['wrong-summary-line',r=>r.node_observations[0].summary.line='foreign'],['missing-packed-case',r=>r.node_observations[0].summary.derived_cases=105],
 ['wrong-stdout-seal',r=>r.node_observations[0].stdout_sha256='0'.repeat(64)],
 ['changed-stdout-body',r=>{const o=r.node_observations[0];o.stdout=JSON.stringify({...o.summary,unexpected:true});o.stdout_sha256=hash(o.stdout);}],
 ['fabricated-native',r=>{const o=r.node_observations[0];o.summary.actual_packed_or_native_executed=true;o.stdout=JSON.stringify(o.summary);o.stdout_sha256=hash(o.stdout);}],
]){const changed=structuredClone(good);mutate(changed);assert.throws(()=>validatePackedCollectorReceipt(data,changed),id);controls.push('receipt:'+id);}
assert.equal(controls.length,62);
const source=inspectFixtureLifecycleRequalification();assert.equal(source.producer_state_repairs_verified,14);assert.equal(source.source_conclusions_decisions_and_candidate_bytes_preserved,167);
const result={schema_version:1,line:data.line,input_corruption_controls:43,receipt_corruption_controls:19,rejection_controls:controls.length,controls,original_programs:6,original_methods:10,current_collector_writer_probe_and_contract_identity_count:14,current_public_lifecycle_repair_assertions_preserved:14,current167_source_review_assertions_preserved:true,actual_packed_native_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
