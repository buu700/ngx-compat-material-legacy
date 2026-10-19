/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Fixed source-model cohort; these inputs never qualify current runtime. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
export const OLDER_AUDIT_HISTORY_INPUTS='compatibility/rc/older-audit-history-inputs.json';
export const OLDER_AUDIT_MODULES=Object.freeze([
  'audit_test_context','chip_audit_source_requalification','chip_batch_history','chip_edit_admission',
  'chip_history_union','chip_input_api_admission','chip_list_contract_admission','chip_modernization_admission',
  'chip_source_batch_requalification','content_observer_admission','content_observer_native',
  'inherited_execution_admission','inherited_helper_execution','media_matcher_admission','modern_chip_admission',
  'modern_chip_scope','native_date_source_context','original_patch_storage','recorded_execution_admission',
  'recorded_execution_source_context',
].map(name=>'tests.test_'+name));
const pins={main:'0a1262ad0a7f133f410445561e591b56eed9b7a8c4ea4704aca575a4d67da452',
  '21.x':'be785fb8c6fec9591a59e4fb6bee5f9a0032c560714dfa057e9adf70ff3a6647'};
const hash=b=>createHash('sha256').update(b).digest('hex');
export function olderAuditHistoryInputs({root=process.cwd(),read=p=>readFileSync(join(root,p))}={}) {
  const bytes=read(OLDER_AUDIT_HISTORY_INPUTS),data=JSON.parse(bytes);
  assert.equal(hash(bytes),pins[data.line],'changed older audit history registry');assert.equal(data.schema_version,1);
  assert.equal(data.id,'older-audit-models');assert.equal(data.module_count,20);assert.equal(data.case_count,50);
  assert.equal(data.timeout_ms,600000);assert.equal(data.actual_current_source_native_packed_or_floor_qualified,false);
  assert.equal(data.g11_claim,'not-passed');assert.deepEqual(data.entries.map(e=>e.module),OLDER_AUDIT_MODULES);
  assert.deepEqual(data.case_ids,data.entries.flatMap(e=>e.case_ids));assert.equal(new Set(data.case_ids).size,50);
  const stored=read(data.prior.path);assert.equal(hash(stored),data.prior.sha256,'changed older source preimages');
  const raw=gunzipSync(stored);assert.equal(hash(raw),data.prior.raw_sha256);const prior=JSON.parse(raw);
  assert.equal(prior.line,data.line);assert.equal(prior.source_parent,data.source_parent);assert.equal(prior.preimages.length,20);
  const environment={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete environment[name];
  for(const entry of data.entries) {
    assert.equal(entry.program,entry.module.replaceAll('.','/')+'.py');assert.ok(entry.case_ids.length>=2&&entry.case_ids.length<=5);
    assert.ok(entry.case_ids.every(id=>id.startsWith(entry.module+'.')&&/\.test_[A-Za-z0-9_]+$/.test(id)));
    const before=prior.preimages.find(m=>m.path===entry.program);assert.ok(before);assert.equal(hash(before.text),before.sha256);
    assert.equal(before.original_sha256,entry.program_sha256);assert.match(entry.wrapper_sha256,/^[a-f0-9]{64}$/);
    assert.equal(hash(read(entry.program)),entry.wrapper_sha256,'unknown older-model wrapper '+entry.program);
    const original=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',
      'show',data.frame.commit+':'+entry.program],{cwd:root,env:environment,maxBuffer:1024*1024});
    assert.equal(hash(original),entry.program_sha256,'changed original source model');
  }
  return {data,prior,sha256:hash(bytes)};
}
export function selectOlderAuditModules(data,requested=[]) {
  assert.ok(Array.isArray(requested));assert.equal(new Set(requested).size,requested.length,'duplicate historical module selector');
  assert.ok(requested.every(name=>OLDER_AUDIT_MODULES.includes(name)),'unregistered historical module selector');
  const selected=requested.length?data.entries.filter(e=>requested.includes(e.module)):data.entries;
  assert.ok(selected.length,'empty historical module selection');
  return {modules:selected.map(e=>e.module),complete:selected.length===20,
    entry:{id:data.id,frame:data.frame,case_ids:selected.flatMap(e=>e.case_ids),timeout_ms:data.timeout_ms,
      programs:selected.map(e=>({path:e.program,sha256:e.program_sha256}))}};
}
