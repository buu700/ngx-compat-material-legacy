/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {analyzeSharedTestMove,bazelProductionCalls} from '../scripts/upstream-test-consolidation-analysis.mjs';
import {analyzeConsolidationSubjects,testConsolidationBatchOk,testConsolidationEntryOk,
  TEST_CONSOLIDATION_CAPSULE,TEST_CONSOLIDATION_CAPSULE_SHA256} from '../scripts/upstream-test-consolidation-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const read=path=>readFileSync(join(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const reportPath='compatibility/f10/disposition-ledger/evidence/closeout-test-consolidation-source-review.json';
const body=JSON.parse(read(reportPath)),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const productPaths=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim().split('\n');
assert.equal(testConsolidationBatchOk(body,read,productPaths),true);
const sourceResults=analyzeConsolidationSubjects(read(TEST_CONSOLIDATION_CAPSULE),read);
const entries=ledger.entries.filter(e=>body.scope_sha_ids.includes(e.sha));assert.equal(entries.length,32);
for(const entry of entries)assert.equal(testConsolidationEntryOk(body,entry,read,true),true);
const clone=value=>JSON.parse(JSON.stringify(value)),controls=[];
function reject(id,change,overrides={}){const changed=clone(body);change(changed);
 assert.equal(testConsolidationBatchOk(changed,path=>Object.hasOwn(overrides,path)?overrides[path]:read(path),productPaths),false,id);controls.push(id);}
reject('wrong-line',r=>{r.line=body.line==='main'?'21.x':'main';});
reject('missing-member',r=>{r.reviews.pop();});
reject('duplicate-member',r=>{r.reviews[0]=r.reviews[1];});
reject('missing-historical-context',r=>{r.historical_suite_context=[];});
reject('changed-capsule',()=>{},{[TEST_CONSOLIDATION_CAPSULE]:Buffer.from('changed original subjects')});
reject('changed-original-patch',()=>{},{[sourceResults[0].patch_file]:Buffer.from('changed original patch')});
reject('changed-current-product',()=>{},{'projects/ngx-material-legacy/legacy-menu/menu-item.html':Buffer.from('changed product')});
reject('changed-current-tooling',()=>{},{'projects/ngx-material-legacy/tsconfig.lib.json':Buffer.from('{}')});
reject('fake-exact-relocation',r=>{const row=r.reviews.find(x=>!x.source_analysis.exact_test_body_and_fixture_relocation);row.source_analysis.exact_test_body_and_fixture_relocation=true;row.final_disposition='not-applicable';});
for(const [id,change] of [['terminal-label-bypass',e=>{e.final_disposition='inherited';}],['row-hash-bypass',e=>{e.source_check.evidence_report_sha256='a'.repeat(64);}]] ){
 const entry=clone(entries[0]);change(entry);assert.equal(testConsolidationEntryOk(body,entry,read,true),false,id);controls.push(id);
}
const packet=JSON.parse(read(TEST_CONSOLIDATION_CAPSULE)),subject=packet.subjects[0];
const decode=part=>gunzipSync(Buffer.from(part.gzip_base64,'base64')).toString();
const shared=subject.members.find(m=>m.after===null),consumer=subject.members.find(m=>m.path.endsWith('.spec.ts')&&m.after!==null);
const input={sharedPath:shared.path,beforeShared:decode(shared.before),consumerPath:consumer.path,beforeConsumer:decode(consumer.before),afterConsumer:decode(consumer.after)};
assert.equal(analyzeSharedTestMove(input).equivalent,true);
for(const [id,changed] of [['changed-assertion',input.afterConsumer.replace('expect(inputs.length).toBe(5)','expect(inputs.length).toBe(6)')],
 ['changed-fixture-literal',input.afterConsumer.replace("{code: 'AL', name: 'Alabama'}","{code: 'AL', name: 'Changed'}")]]){
 assert.notEqual(changed,input.afterConsumer);assert.equal(analyzeSharedTestMove({...input,afterConsumer:changed}).equivalent,false,id);controls.push(id);
}
const build=subject.members.find(m=>m.path.endsWith('/BUILD.bazel')),after=decode(build.after),changed=after.replace('name = "testing"','name = "changed_testing"');
assert.notEqual(changed,after);assert.notDeepEqual(bazelProductionCalls(decode(build.before)),bazelProductionCalls(changed));controls.push('changed-production-target');
const scratch=mkdtempSync(join(root,'compatibility/rc/test-consolidation-fixture-'));
try{
 const baseline=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--line',body.line,'--admission','--report',join(scratch,'baseline.json')],{cwd:root,encoding:'utf8',timeout:30000});
 assert.equal(baseline.status,1,baseline.stderr);const missingBefore=JSON.parse(baseline.stdout).missing_evidence;
 for(const [id,choose,change] of [['cli-terminal-label',e=>e.sha===entries[0].sha,e=>{e.final_disposition='irrelevant';}],
  ['cli-non-json-pointer',e=>e.sha===entries[0].sha,e=>{e.evidence_report='AGENTS.md';delete e.batch_id;}],
  ['cli-pending-residual',e=>e.sha==='518ac69a7e0f787327e971c710a13bb2da6461cc',e=>{e.final_disposition='not-applicable';}]] ){
  const changed=clone(ledger),target=changed.entries.find(choose);assert.ok(target);change(target);
  const path=join(scratch,id+'.json'),report=join(scratch,id+'-report.json');writeFileSync(path,JSON.stringify(changed));
  const result=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--line',body.line,'--admission','--ledger',path,'--report',report],{cwd:root,encoding:'utf8',timeout:30000});
  assert.equal(result.status,1,result.stderr);const saved=JSON.parse(readFileSync(report));
  const summary=JSON.parse(result.stdout);assert.equal(summary.missing_evidence,missingBefore+1,id);
  assert.equal(saved.missing_evidence,missingBefore+1,id);controls.push(id);
 }
}finally{rmSync(scratch,{recursive:true,force:true});}
const result={schema_version:1,line:body.line,node:process.version,compiler:ts.version,
 subjects:32,patch_paths:sourceResults.reduce((n,r)=>n+r.patch_paths.length,0),exact_relocations:27,pending_residuals:5,
 positive_entry_bindings:entries.length,negative_controls:controls.length,controls,
 source_capsule_sha256:TEST_CONSOLIDATION_CAPSULE_SHA256,
 producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),analysis_sha256:hash(read('scripts/upstream-test-consolidation-analysis.mjs')),
 validator_sha256:hash(read('scripts/upstream-test-consolidation-evidence.mjs')),
 actual_original_tests_or_product_runtime_executed:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
