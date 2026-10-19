/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Metadata/boundary controls only; no source cohort executes here. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {OLDER_AUDIT_HISTORY_INPUTS,olderAuditHistoryInputs,selectOlderAuditModules} from '../scripts/older-audit-history-inputs.mjs';
import {inspectHistoricalReplayCurrent} from '../scripts/historical-source-replay.mjs';
import {validateRecentCaseReceipt} from '../scripts/chip-recent-history.mjs';
const read=p=>readFileSync(p),{data,prior}=olderAuditHistoryInputs(),controls=[];
const current=inspectHistoricalReplayCurrent(),full=selectOlderAuditModules(data);
assert.equal(full.complete,true);assert.equal(full.modules.length,20);assert.equal(full.entry.case_ids.length,50);
const subset=selectOlderAuditModules(data,['tests.test_audit_test_context','tests.test_chip_batch_history']);
assert.equal(subset.complete,false);assert.equal(subset.entry.case_ids.length,8);
for(const values of [['unregistered'],['tests.test_chip_batch_history.Class.test_method'],
  ['tests.test_chip_batch_history','tests.test_chip_batch_history'],['../outside']]) {
  assert.throws(()=>selectOlderAuditModules(data,values));controls.push('invalid-selection-'+JSON.stringify(values));
}
for(const path of [OLDER_AUDIT_HISTORY_INPUTS,data.prior.path,data.entries[0].program,data.entries[2].program]) {
  assert.throws(()=>olderAuditHistoryInputs({read:p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read}));
  controls.push('late-registry-preimage-or-wrapper-corruption-'+path);
}
const good={tests_run:50,started:[...data.case_ids],passed:[...data.case_ids],failures:[],errors:[],
  skipped:[],expected_failures:[],unexpected_successes:[],successful:true};
assert.equal(validateRecentCaseReceipt(full.entry,good),true);
for(const [name,mutate]of [['missing-case',r=>r.passed.pop()],['duplicate-case',r=>r.started.push(r.started[0])],
  ['wrong-count',r=>r.tests_run=49],['skipped-case',r=>r.skipped.push(r.passed[0])],
  ['failed-case',r=>r.failures.push(r.passed[0])],['errored-case',r=>r.errors.push(r.passed[0])],
  ['expected-failure',r=>r.expected_failures.push(r.passed[0])],['unexpected-success',r=>r.unexpected_successes.push(r.passed[0])]]) {
  const bad=structuredClone(good);mutate(bad);assert.throws(()=>validateRecentCaseReceipt(full.entry,bad));controls.push(name);
}
for(const path of ['scripts/older-audit-history-inputs.mjs','tests/older_audit_history.py','tests/test_audit_test_context.py']) {
  assert.throws(()=>inspectHistoricalReplayCurrent({readMember:p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read}));
  controls.push('unreviewed-current-cohort-subject-'+path);
}
const cli=spawnSync(process.execPath,['scripts/run-older-audit-history.mjs','--module','unregistered'],{encoding:'utf8'});
assert.equal(cli.status,1);assert.match(cli.stderr,/unregistered historical module selector/);controls.push('actual-cli-unknown-selector');
const report={schema_version:1,line:data.line,registered_modules:20,registered_original_cases:50,diagnostic_cases:8,
  rejection_controls:controls.length,controls,current_guarded_members:current.guard.guarded_current_members,
  current_live_native_helper_protected:prior.protected.some(m=>m.path==='tests/audit_test_context.py'),
  actual_original_cases_executed:0,actual_native_or_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
