/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current preparation is admitted separately; immutable historical byte checks remain strict. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectHarnessPreparation,qualifiedCurrentConsolidationSources,HARNESS_PREPARATION_INPUTS,HARNESS_PREPARATION_QUALIFICATION} from '../scripts/harness-animation-preparation-evidence.mjs';
import {retainedConsolidationSources,HISTORICAL_CONSOLIDATION_CAPSULE,individualConsolidationScope} from '../scripts/upstream-test-consolidation-historical.mjs';
import {testConsolidationBatchOk,testConsolidationEntryOk} from '../scripts/upstream-test-consolidation-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(resolve(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),report=inspectHarnessPreparation(read),controls=[];
const reference={path:HARNESS_PREPARATION_QUALIFICATION,sha256:hash(read(HARNESS_PREPARATION_QUALIFICATION))};
assert.deepEqual(qualifiedCurrentConsolidationSources(read,reference),report.current_facts);
function reject(id,action){assert.throws(action,id);controls.push({id,result:'rejected'});}
reject('original-tag-validator-still-rejects-current-preparation',()=>retainedConsolidationSources(read(HISTORICAL_CONSOLIDATION_CAPSULE),read));
for(const row of report.source_rows)reject('changed-current-fixture-'+row.path,()=>qualifiedCurrentConsolidationSources(p=>p===row.path?Buffer.concat([read(p),Buffer.from('\nunreviewedOperation();\n')]):read(p),reference));
for(const [id,change]of[
 ['wrong-line',n=>{n.line=n.line==='main'?'21.x':'main';}],
 ['wrong-count',n=>{n.case_callbacks_unchanged--;}],
 ['missing-fixture',n=>{n.source_rows.pop();}],
 ['unknown-fixture',n=>{n.source_rows[0].path='testing/unreviewed.spec.ts';}],
 ['old-bytes-claimed-as-current',n=>{const f=n.current_facts.find(n=>n.historical_candidate_sha256);f.candidate_sha256=f.historical_candidate_sha256;}],
 ['historical-view-claimed-as-current',n=>{n.historical_origin.view='Current live bytes';}],
 ['native-admission-forgery',n=>{n.actual_browser_native_renderer_focus_lifetime_or_floor_qualified=true;}],
 ['unknown-claim-field',n=>{n.unreviewed_exception=true;}],
 ['producer-hash',n=>{n.producer.sha256='0'.repeat(64);}],
]){const changed=structuredClone(report);change(changed);const bytes=Buffer.from(JSON.stringify(changed));reject('self-rehashed-qualification-'+id,()=>qualifiedCurrentConsolidationSources(p=>p===reference.path?bytes:read(p),{...reference,sha256:hash(bytes)}));}
for(const path of [HARNESS_PREPARATION_INPUTS,report.before.path,report.producer.path,'projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts','testing/legacy-runner/adapt-spec.mjs',HISTORICAL_CONSOLIDATION_CAPSULE])reject('changed-pinned-input-'+path,()=>qualifiedCurrentConsolidationSources(p=>p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p),reference));
for(const [path,before,after]of[
 ['testing/legacy-runner/shims/harness/core/option-shared.spec.ts','MAT_LEGACY_OPTION_PARENT_COMPONENT as MAT_OPTION_PARENT_COMPONENT','MAT_OPTION_PARENT_COMPONENT'],
 ['testing/legacy-runner/shims/harness/checkbox/shared.spec.ts','        First','        Changed'],
]){const original=read(path).toString(),changed=Buffer.from(original.replace(before,after));assert.notEqual(changed.toString(),original);reject('unchanged-tagged-member-'+path,()=>qualifiedCurrentConsolidationSources(p=>p===path?changed:read(p),reference));}
const path='compatibility/f10/disposition-ledger/evidence/harness-animation-preparation-test-consolidation.json',body=JSON.parse(read(path)),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const productPaths=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim().split('\n');assert.equal(testConsolidationBatchOk(body,read,productPaths),true);
const entries=ledger.entries.filter(n=>n.evidence_report===path);assert.equal(entries.length,32);for(const entry of entries)assert.equal(testConsolidationEntryOk(body,entry,read,true),true);
for(const [id,change]of[
 ['missing-qualification',n=>{delete n.current_harness_preparation;}],
 ['foreign-qualification-path',n=>{n.current_harness_preparation={path:'AGENTS.md',sha256:hash(read('AGENTS.md'))};}],
 ['historical-facts-used-as-current',n=>{for(const row of n.reviews)if(row.individual_source_review)row.individual_source_review=individualConsolidationScope(row.sha,report.historical_origin.facts);}],
 ['wrong-original-scope',n=>{n.reviews.pop();}],
 ['wrong-current-line',n=>{n.line=n.line==='main'?'21.x':'main';}],
]){const changed=structuredClone(body);change(changed);assert.equal(testConsolidationBatchOk(changed,read,productPaths),false,id);controls.push({id,result:'rejected'});}
for(const [id,change]of [['row-rehash-bypass',n=>{n.source_check.evidence_report_sha256='0'.repeat(64);}],['terminal-label-bypass',n=>{n.final_disposition='inherited';}]]){const changed=structuredClone(entries[0]);change(changed);assert.equal(testConsolidationEntryOk(body,changed,read,true),false,id);controls.push({id,result:'rejected'});}
const result={schema_version:1,line:report.line,files:12,configurations:13,unchanged_case_callbacks:165,unchanged_fixture_classes:15,positive_current_entry_bindings:32,explicit_current_tagged_members:report.current_facts.filter(n=>n.current_preparation_inputs).length,original_tagged_validator_unchanged:true,controls:controls.length,cases:controls,current_qualification:reference,producer_sha256:hash(read('tests/harness_animation_preparation_qualification_probe.mjs')),validator_sha256:hash(read('scripts/harness-animation-preparation-evidence.mjs')),actual_browser_native_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,cases:undefined}));
