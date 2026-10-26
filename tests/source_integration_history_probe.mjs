/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact source-history routing; this guard does not execute the old programs. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {SOURCE_INTEGRATION_HISTORY_INPUTS,sourceIntegrationHistoryInputs,
  sourceIntegrationWrapperHash,historicalFrameMembers} from '../scripts/historical-source-replay.mjs';
import {dialogCallerHistoryInputs} from '../scripts/dialog-caller-history-inputs.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],
  {cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});
const q=sourceIntegrationHistoryInputs({root}),data=q.data,line=data.line;
const baseline=data.wrapper_edits[0].reference_commit;
const replayPath='compatibility/rc/historical-source-replay-inputs.json';
const previous=JSON.parse(git('show',baseline+':'+replayPath)),current=JSON.parse(read(replayPath));
delete previous.current_frame;delete current.current_frame;assert.deepEqual(current,previous,'the original replay roster/policies changed');
assert.equal(current.entries.length,26);assert.equal(current.wrapper_edits.length,23);
assert.equal(current.current_wrapper_successors.length,2);assert.equal(current.mutable_progress_paths.length,2);
const pythonCases=[],frames=new Set();
for(const [index,entry]of data.entries.entries()){
  const members=historicalFrameMembers(root,entry.frame);assert.ok(members.some(member=>member.path===entry.probe));
  assert.equal(hash(git('show',entry.frame.commit+':'+entry.probe)),entry.probe_sha256);
  const inputs=JSON.parse(git('show',entry.frame.commit+':compatibility/rc/snack-dom-source-context-inputs.json'));
  assert.equal(inputs.line,line);assert.equal(inputs.new_semantic_closures,336);assert.equal(inputs.writes.length,entry.historical_successors);
  frames.add(entry.frame.commit);
  const wrapper=data.wrapper_edits[index],before=git('show',wrapper.reference_commit+':'+wrapper.path).toString();
  const after=read(wrapper.path).toString();pythonCases.push({before,after});
  assert.equal(sourceIntegrationWrapperHash({root,path:wrapper.path,expectedSha:wrapper.before_sha256}),wrapper.after_sha256);
  assert.throws(()=>sourceIntegrationWrapperHash({root,path:wrapper.path,expectedSha:'0'.repeat(64)}),/unknown source integration wrapper reference/);
}
assert.equal(frames.size,4);
const astProgram=`import ast,json,sys
cases=json.load(sys.stdin)
for case in cases:
 def fields(text):
  tree=ast.parse(text)
  assertions=[ast.dump(node,include_attributes=False) for node in ast.walk(tree) if isinstance(node,ast.Call) and isinstance(node.func,ast.Attribute) and node.func.attr.startswith('assert')]
  timeouts=[ast.dump(node.value,include_attributes=False) for node in ast.walk(tree) if isinstance(node,ast.keyword) and node.arg=='timeout']
  return assertions,timeouts
 before,after=fields(case['before']),fields(case['after'])
 assert before[0]==after[0] and before[0] and len(before[1])==len(after[1])==1
 before_tree,after_tree=ast.parse(case['before']),ast.parse(case['after'])
 original=[node.value for node in ast.walk(before_tree) if isinstance(node,ast.keyword) and node.arg=='timeout'][0]
 current=[node.value for node in ast.walk(after_tree) if isinstance(node,ast.keyword) and node.arg=='timeout'][0]
 expected=ast.BinOp(left=original,op=ast.Add(),right=ast.Constant(value=180))
 assert ast.dump(current,include_attributes=False)==ast.dump(expected,include_attributes=False)
print(json.dumps({'assertion_sets_unchanged':len(cases),'exact_outer_orchestration_budgets':len(cases)}))`;
const ast=JSON.parse(execFileSync('python3',['-c',astProgram],{input:JSON.stringify(pythonCases),encoding:'utf8'}));
assert.deepEqual(ast,{assertion_sets_unchanged:8,exact_outer_orchestration_budgets:8});
const controls=[SOURCE_INTEGRATION_HISTORY_INPUTS,...data.wrapper_edits.map(row=>row.path),data.entries[0].probe];
for(const changed of controls)assert.throws(()=>sourceIntegrationHistoryInputs({root,readMember:path=>
  path===changed?Buffer.concat([read(path),Buffer.from('\n')]):read(path)}),error=>error?.code==='ERR_ASSERTION');
let changed;const late=path=>path===changed?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
sourceIntegrationHistoryInputs({root,readMember:late});
for(changed of [data.wrapper_edits[5].path,data.entries[7].probe])
  assert.throws(()=>sourceIntegrationHistoryInputs({root,readMember:late}),error=>error?.code==='ERR_ASSERTION');
assert.equal(sourceIntegrationWrapperHash({root,path:'projects/ngx-material-legacy/legacy-input/input.ts',expectedSha:'unmodified'}),'unmodified');
assert.equal(dialogCallerHistoryInputs({root}).data.case_count,3);
const cli='scripts/run-historical-source-probe.mjs';
for(const [args,message]of [[['unregistered-source-integration'],/unregistered historical probe/],
  [['menu-exit-context','--original-report','/tmp/not-written.json'],/restricted to the eight integration programs/],
  [[data.entries[0].id,'--report','/tmp/equal.json','--original-report','/tmp/./equal.json'],/destinations must differ/]]){
  const child=spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8',timeout:15000});
  assert.notEqual(child.status,0);assert.match(child.stderr,message);assert.equal(child.stdout,'');
}
const temporary=mkdtempSync(join(tmpdir(),'source-history-output-'));
try{
  const existing=join(temporary,'kept.json');writeFileSync(existing,'existing original report');
  const child=spawnSync(process.execPath,[cli,data.entries[0].id,'--original-report',existing],{cwd:root,encoding:'utf8',timeout:15000});
  assert.notEqual(child.status,0);assert.match(child.stderr,/original report destination already exists/);
  assert.equal(readFileSync(existing,'utf8'),'existing original report');
}finally{rmSync(temporary,{recursive:true,force:true});}
assert.equal(git('diff','--name-only',baseline,'--','projects/ngx-material-legacy').toString().trim(),'');
for(const path of ['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json','compatibility/f10/disposition-ledger/ledger.json'])
  assert.equal(hash(read(path)),hash(git('show',baseline+':'+path)),'history routing changed a source disposition');
const f=authoredUseReviewEvidence(JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json')),line,read,hash);
const a=authoredUseReviewEvidence(JSON.parse(read('compatibility/f10/authored-dependency-current-dispositions.json')),line,read,hash);
assert.deepEqual([f.reviewed,f.insufficient,a.reviewed,a.insufficient],[1730,0,315,0]);
const report={schema_version:1,line,source_integration_programs:8,immutable_frames:4,
  original_replay_entries_unchanged:26,original_wrapper_records_unchanged:23,
  original_wrapper_successors_unchanged:2,mutable_progress_paths_unchanged:2,
  original_programs_and_Python_assertions_unchanged:true,original_child_timeouts_unchanged:true,
  wrapper_orchestration_overhead_seconds:180,exact_Python_orchestration_budgets:ast.exact_outer_orchestration_budgets,
  corruptions_rejected:controls.length,late_changes_rejected:2,invalid_CLI_requests_rejected:4,
  source_disposition_bytes_unchanged:true,frozen_valid:1730,additional_valid:315,source_insufficient:0,
  new_source_closures:0,old_programs_executed_by_this_guard:false,current_frame_guard_executed:false,
  actual_current_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
