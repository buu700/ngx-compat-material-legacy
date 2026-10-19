/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source/history boundaries only; this probe executes no historical module. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chmodSync,mkdtempSync,mkdirSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {recentHistoryInputs,validateRecentCaseReceipt,verifyRecentHistoricalGraph,
  CHIP_RECENT_HISTORY_INPUTS} from '../scripts/chip-recent-history.mjs';
import {historicalFrameMembers,inspectHistoricalReplayCurrent} from '../scripts/historical-source-replay.mjs';
const read=p=>readFileSync(p),{data,prior}=recentHistoryInputs(),controls=[];
const current=inspectHistoricalReplayCurrent();
for(const entry of data.entries)assert.equal(historicalFrameMembers(process.cwd(),entry.frame).length,entry.frame.members);
const entry=data.entries[0],receipt={tests_run:entry.case_ids.length,started:[...entry.case_ids],passed:[...entry.case_ids],
  failures:[],errors:[],skipped:[],expected_failures:[],unexpected_successes:[],successful:true};
assert.equal(validateRecentCaseReceipt(entry,receipt),true);
for(const [name,mutate]of [
  ['missing-original-case',r=>r.passed.pop()],['duplicate-case',r=>r.passed.push(r.passed[0])],
  ['wrong-case',r=>r.passed[0]='unregistered'],['case-not-started',r=>r.started.pop()],
  ['wrong-count',r=>r.tests_run--],['failure',r=>r.failures.push(r.passed[0])],
  ['error',r=>r.errors.push(r.passed[0])],['skip',r=>r.skipped.push(r.passed[0])],
  ['expected-failure',r=>r.expected_failures.push(r.passed[0])],
  ['unexpected-success',r=>r.unexpected_successes.push(r.passed[0])],
  ['unsuccessful',r=>r.successful=false],['changed-order',r=>r.passed.reverse()],
]) {
  const bad=structuredClone(receipt);mutate(bad);assert.throws(()=>validateRecentCaseReceipt(entry,bad));controls.push(name);
}
for(const path of [CHIP_RECENT_HISTORY_INPUTS,data.prior.path]) {
  assert.throws(()=>recentHistoryInputs({read:p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read}));
  controls.push('late-input-corruption-'+path);
}
for(const path of ['scripts/chip-recent-history.mjs','scripts/run-chip-recent-history.mjs',
  'tests/chip_recent_history.py',data.entries[6].program]) {
  assert.throws(()=>inspectHistoricalReplayCurrent({readMember:p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read}));
  controls.push('changed-current-subject-'+path);
}
for(const id of ['unregistered','../focus-repair']) {
  const invalid=spawnSync(process.execPath,['scripts/run-chip-recent-history.mjs',id],{encoding:'utf8'});
  assert.equal(invalid.status,1);assert.match(invalid.stderr,/unregistered recent history stage/);controls.push('unregistered-cli-'+id);
}
const temporary=mkdtempSync(join(tmpdir(),'ngx-chip-recent-graph-control-'));
try {
  mkdirSync(join(temporary,'nested'));const source=Buffer.from('original source\n'),style=Buffer.from('.original {}\n');
  const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
  const members=[{path:'source.ts',mode:'100644',blob:blob(source)},{path:'nested/style.scss',mode:'100644',blob:blob(style)}];
  writeFileSync(join(temporary,'source.ts'),source);writeFileSync(join(temporary,'nested/style.scss'),style);
  assert.equal(verifyRecentHistoricalGraph(temporary,members),source.length+style.length);
  writeFileSync(join(temporary,'source.ts'),'changed');assert.throws(()=>verifyRecentHistoricalGraph(temporary,members));controls.push('changed-historical-bytes');writeFileSync(join(temporary,'source.ts'),source);
  writeFileSync(join(temporary,'extra.ts'),'unregistered');assert.throws(()=>verifyRecentHistoricalGraph(temporary,members));controls.push('added-historical-file');rmSync(join(temporary,'extra.ts'));
  rmSync(join(temporary,'source.ts'));assert.throws(()=>verifyRecentHistoricalGraph(temporary,members));controls.push('missing-historical-file');
  symlinkSync(join(temporary,'nested/style.scss'),join(temporary,'source.ts'));assert.throws(()=>verifyRecentHistoricalGraph(temporary,members));controls.push('historical-symlink');rmSync(join(temporary,'source.ts'));writeFileSync(join(temporary,'source.ts'),source);
  chmodSync(join(temporary,'source.ts'),0o755);assert.throws(()=>verifyRecentHistoricalGraph(temporary,members));controls.push('historical-executable-mode');
} finally {rmSync(temporary,{recursive:true,force:true});}
const report={schema_version:1,line:data.line,original_modules:7,original_case_ids:19,rejection_controls:controls.length,controls,
  guarded_current_members:current.guard.guarded_current_members,protected_native_and_authored_members:prior.protected_members.length,
  actual_original_modules_executed:0,actual_current_source_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
