/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current owner separates fourteen metadata tokens from existing source decisions. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {checkerReferenceMetadata,CHECKER_REFERENCE_LEDGER as ledger} from '../scripts/checker-reference-metadata.mjs';
import {packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {registeredSourceCheckerTransition} from '../scripts/registered-source-checker-transition.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path));
const source=checkerReferenceMetadata({root,read:registeredSourceCheckerTransition({root,read}).beforeRead}),preflight=process.argv.includes('--preflight');
const final=execFileSync('python3',['-c','import sys;sys.path.insert(0,"tests");from unthemable_ledger_patch import derive_unthemable_successor;sys.stdout.buffer.write(derive_unthemable_successor()[1])'],{cwd:root,maxBuffer:8*1024*1024});
assert.equal(read(ledger).equals(preflight?source.before:final),true);
let late=null;const actual=path=>{
  const raw=preflight&&path===ledger?source.after:read(path);
  return path===late?Buffer.concat([raw,Buffer.from('\n')]):raw;
};
const current=packedUpstreamLedgerEpoch({root,read:actual}),previous=packedUpstreamLedgerEpoch({root,read:path=>path===ledger?source.before:read(path)});
assert.equal(current.checker_reference_metadata_tokens_applied,14);assert.equal(previous.checker_reference_metadata_tokens_applied,0);
for(const state of [current,previous]){
  state.assertCurrent();assert.equal(state.individual_decisions_applied,state===current&&!preflight?27:21);
  assert.equal(state.token_build_decisions_applied,state===current&&!preflight?1:0);
  assert.equal(state.legacy_sass_entrypoint_decisions_applied,1);assert.equal(state.selection_native_decisions_applied,3);
  assert.equal(state.historical_consumer_wrapper_metadata_entries_applied,65);
  assert.equal(state.historical_wrapper_metadata_entries_applied,4);assert.equal(state.current_native_packed_or_floor_or_g11_credit,false);
}
assert.equal(current.raw,actual);assert.equal(current.raw(ledger).equals(preflight?source.after:final),true);
assert.equal(current.read('scripts/check-upstream-audit-disposition.mjs').equals(read('scripts/check-upstream-audit-disposition.mjs')),true);
const rejected=[];
for(const path of ['scripts/checker-reference-metadata.mjs','scripts/check-upstream-audit-disposition.mjs',
  'compatibility/rc/checker-reference-metadata-review.json']){
  late=path;assert.throws(()=>current.read(ledger),undefined,path);late=null;rejected.push('late:'+path);
}
current.assertCurrent();
const partial=JSON.parse(source.after),row=partial.entries.find(entry=>entry.sha==='77ffdf98ba71c11d908b29e02b516dddf487ae0b');
row.individual_proof.historical_behavior.source_members.find(ref=>ref.path==='scripts/check-upstream-audit-disposition.mjs').sha256='db1ad9e6d7a069eaeae9ce026912bd520d3a13630678f76e37f965fc25960377';
assert.throws(()=>packedUpstreamLedgerEpoch({root,read:path=>path===ledger?Buffer.from(JSON.stringify(partial,null,2)+'\n'):read(path)}));
rejected.push('partial-fourteen-reference-update');
const report={schema_version:1,line:'21.x',preflight_only:preflight,positive_current_and_previous_states:2,
  metadata_tokens_applied:14,previous_metadata_tokens_applied:0,individual_decisions_applied:current.individual_decisions_applied,
  raw_checker_bytes_preserved:true,rejection_controls:rejected.length,rejected,
  actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
const output=process.argv.slice(2).find(value=>value!=='--preflight');if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
