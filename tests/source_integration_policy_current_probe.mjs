/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Live policy and raw-source acceptance beside the unchanged snapshot controls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {snackDomSourceContext} from '../scripts/snack-dom-source-context.mjs';
import {historicalReplayInputs,historicalFrameMembers,sourceIntegrationPolicyHistoryInputs,
  SOURCE_INTEGRATION_HISTORY_INPUTS,SOURCE_INTEGRATION_POLICY_HISTORY_ID} from '../scripts/historical-source-replay.mjs';
const root=process.cwd(),hash=raw=>createHash('sha256').update(raw).digest('hex'),observed=new Map();
const read=path=>{const raw=readFileSync(join(root,path));observed.set(path,hash(raw));return raw;};
const owner=snackDomSourceContext({root,read});assert.equal(owner.raw,read);
const policy=sourceIntegrationPolicyHistoryInputs({root,readMember:read}),registry=historicalReplayInputs({root,readMember:read});
assert.equal(policy.data.line,owner.line);assert.equal(policy.data.current_integration_programs,8);
assert.equal(registry.entries.length,26);assert.equal(registry.wrapper_edits.length,23);
assert.equal(registry.current_wrapper_successors.length,2);assert.equal(registry.current_head_tooling_paths.length,6);
assert.equal(registry.mutable_progress_paths.length,2);
const entry=policy.data.entries[0];assert.equal(entry.id,SOURCE_INTEGRATION_POLICY_HISTORY_ID);
historicalFrameMembers(root,entry.frame);
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:16*1024*1024});
const product=git('ls-files','--cached','--others','--exclude-standard','--','projects/ngx-material-legacy').toString().trim().split('\n');
assert.equal(product.length,1142);assert.equal(new Set(product).size,1142);
const before=git('show',entry.frame.commit+':'+policy.data.wrapper.path).toString(),after=read(policy.data.wrapper.path).toString();
const astProgram=`import ast,copy,json,sys
case=json.load(sys.stdin);before=ast.parse(case['before']);after=ast.parse(case['after'])
def commands(tree):
 return [n for n in ast.walk(tree) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=='run' and isinstance(n.func.value,ast.Name) and n.func.value.id=='subprocess']
original=commands(before);current=commands(after);assert len(original)==len(current)==1
assert ast.literal_eval(current[0].args[0])==['node','scripts/run-historical-source-probe.mjs','source-integration-history-controls']
current[0].args[0]=copy.deepcopy(original[0].args[0])
assert ast.dump(before,include_attributes=False)==ast.dump(after,include_attributes=False)
assertions=[n for n in ast.walk(before) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr.startswith('assert')]
assert assertions
print(json.dumps({'normalized_complete_AST_equal':True,'assertion_calls_preserved':len(assertions),'timeout_changed':False}))`;
const ast=JSON.parse(execFileSync('python3',['-c',astProgram],{cwd:root,env,input:JSON.stringify({before,after}),encoding:'utf8'}));
const rejected=[];
const actualIntegration=JSON.parse(read(SOURCE_INTEGRATION_HISTORY_INPUTS));
for(const path of [SOURCE_INTEGRATION_HISTORY_INPUTS,policy.data.wrapper.path,entry.probe,actualIntegration.wrapper_edits[0].path]){
  assert.throws(()=>sourceIntegrationPolicyHistoryInputs({root,readMember:name=>name===path?Buffer.concat([read(name),Buffer.from('\n')]):read(name)}));
  rejected.push(path);
}
const registryPath='compatibility/rc/historical-source-replay-inputs.json';
assert.throws(()=>historicalReplayInputs({root,readMember:path=>path===registryPath?Buffer.concat([read(path),Buffer.from(' ')]):read(path)}));rejected.push(registryPath);
const invalid=spawnSync(process.execPath,['scripts/run-historical-source-probe.mjs',SOURCE_INTEGRATION_POLICY_HISTORY_ID,'--original-report','/tmp/source-policy-original-output-not-used.json'],{cwd:root,env,encoding:'utf8',timeout:10000});
assert.equal(invalid.status,1);assert.match(invalid.stderr,/restricted to the eight integration programs/);assert.equal(invalid.stdout,'');rejected.push('policy-control-cannot-export-an-integration-original-report');
const frame=structuredClone(entry.frame);entry.frame.commit='0'.repeat(40);
assert.deepEqual(sourceIntegrationPolicyHistoryInputs({root,readMember:read}).data.entries[0].frame,frame);
for(const [path,digest]of observed)assert.equal(hash(readFileSync(join(root,path))),digest,'late actual current policy input '+path);
const report={schema_version:1,line:owner.line,current_integration_programs:8,original_replay_programs:26,
  original_wrapper_records:23,existing_wrapper_successors:2,current_HEAD_tooling_paths:6,mutable_progress_paths:2,
  actual_current_product_members:product.length,shared_current_source_owner_used:true,raw_reader_identity_preserved:true,
  historical_bytes_supplied_as_current:false,original_wrapper_AST:ast,rejections:rejected.length,rejected,
  private_frame_copy_preserved:true,all_observed_current_bytes_rechecked:true,
  actual_native_artifact_browser_floor_or_audit_qualified:false,g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
