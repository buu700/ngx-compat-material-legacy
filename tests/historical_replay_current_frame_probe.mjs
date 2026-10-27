/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current-frame transition controls alongside the unchanged original 97 cases. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {inspectHistoricalReplayCurrent,verifyHistoricalCurrentSubjects} from '../scripts/historical-source-replay.mjs';

const root=process.cwd(),read=path=>readFileSync(join(root,path));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const {data,members,guard}=inspectHistoricalReplayCurrent({root});
const inventory=JSON.parse(read('compatibility/rc/historical-replay-current-frame-inventory.json'));
assert.equal(guard.authenticated_current_wrapper_successors,2);
assert.equal(guard.authenticated_consumer_wrapper_transitions,1);
assert.equal(guard.current_product_members,1142);
assert.equal(guard.current_source_qualification,false);
assert.equal(guard.current_native_or_packed_qualification,false);
assert.equal(hash(read('tests/historical_source_replay_probe.mjs')),inventory.original97_control_program_sha256);
assert.equal(data.entries.length,26);assert.equal(data.wrapper_edits.length,23);
assert.equal(data.current_head_tooling_paths.length,6);assert.equal(data.mutable_progress_paths.length,2);
const cache=new Map(members.filter(row=>!data.mutable_progress_paths.includes(row.path)).map(row=>[row.path,read(row.path)]));
const cached=path=>cache.get(path)??read(path);
const productPaths=members.filter(row=>row.path.startsWith('projects/ngx-material-legacy/')).map(row=>row.path).sort();
const verify=readMember=>verifyHistoricalCurrentSubjects({root,data,members,readMember,productPaths});
assert.deepEqual(verify(cached),guard);
const rejected=[];
for(const path of [
  'compatibility/rc/historical-consumer-wrapper-successor.json',
  'compatibility/rc/historical-consumer-wrapper-ledger-successor.json',
  'scripts/historical-consumer-wrapper-metadata.mjs',
  'scripts/packed-upstream-ledger-epoch.mjs',
  'scripts/snack-dom-source-context.mjs',
  'tests/test_spec_wide_fixture_adapter.py',
]){
  const changed=Buffer.concat([cached(path),Buffer.from('\n// unreviewed frame change\n')]);
  assert.throws(()=>verify(name=>name===path?changed:cached(name)));rejected.push(path);
}
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:16*1024*1024});
git('merge-base','--is-ancestor',inventory.qualified_frame.commit,data.current_frame.commit);
assert.equal(git('diff','--name-only',inventory.qualified_frame.commit,data.current_frame.commit,'--',
  'projects/ngx-material-legacy','compatibility/f10').toString(),'','source-qualified product or ledger changed while sealing replay tooling');
for(const path of ['compatibility/f10/disposition-ledger/ledger.json',
  'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts']){
  const before=git('show',inventory.prior_frame.commit+':'+path);assert.notDeepEqual(before,cached(path));
  assert.throws(()=>verify(name=>name===path?before:cached(name)));rejected.push('old-current-frame:'+path);
}
const wrapper=data.wrapper_edits.find(row=>row.path==='tests/test_spec_wide_fixture_adapter.py');
const original=git('show',(wrapper.reference_commit??data.wrapper_reference_commit)+':'+wrapper.path);
let routed=original.toString();for(const edit of wrapper.edits)routed=routed.replace(edit.before,edit.after);
for(const value of [original,Buffer.from(routed),cached(wrapper.path)]){
  assert.deepEqual(verify(name=>name===wrapper.path?value:cached(name)),guard);
}
const changedMembers=structuredClone(members),member=changedMembers.find(row=>row.path===wrapper.path);member.blob='0'.repeat(40);
assert.throws(()=>verifyHistoricalCurrentSubjects({root,data,members:changedMembers,readMember:cached,productPaths}));rejected.push('altered-adapter-frame-blob');
const report={schema_version:1,line:data.line,current_frame:data.current_frame,
  classified_changed_members:inventory.changed_members.length,classified_added_members:inventory.added_members.length,
  prior97_control_program_unchanged:true,registered_original_programs_preserved:26,
  original_adapter_wrapper_forms_and_qualified_transport_passed:3,rejections:rejected.length,rejected,
  guarded_current_members:guard.guarded_current_members,current_product_members:1142,
  actual_native_artifact_browser_floor_or_audit_qualified:false,g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
