/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current source bindings for existing decisions; no execution qualification. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {inspectChipFocusRepair} from './chip-focus-contract.mjs';
import {inspectChipListFocusContract} from './chip-list-focus-contract.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {buildScopeEvidenceOk} from './upstream-build-scope-evidence.mjs';
import {reviewSliderInputScope,sliderInputScopeEvidenceOk} from './upstream-slider-input-scope.mjs';
import {reviewSliderRangeScope,sliderRangeEvidenceOk} from './upstream-slider-range-followups.mjs';
import {reviewSliderThumbDestroyScope,sliderThumbDestroyEvidenceOk} from './upstream-slider-thumb-destroy-scope.mjs';
import {reviewBazelBuildContext,bazelBuildEvidenceOk} from './upstream-bazel-build-scope.mjs';
import {testConsolidationBatchOk,testConsolidationEntryOk} from './upstream-test-consolidation-evidence.mjs';
import {testImportOwnershipContext,testImportBatchOk,testImportEntryOk} from './upstream-test-import-cleanup-evidence.mjs';

export const SOURCE_SCOPE_PREFIX='compatibility/rc/chip-source-scope-requalification-';
const hash=b=>createHash('sha256').update(b).digest('hex');
const json=v=>JSON.stringify(v,null,2)+'\n';
const pins={main:'9ab8c1f5fedb758593af3303f8c1cfaa30512c94238781a6faec7a34b7a3626e',
  '21.x':'094357c0475e269bed7083286a98f5b31d41a259d5723cef3359004cd3b82281'};
const families={
  'invalid-build-scope':['build',14],
  'invalid-slider-input-scope':['slider-input',3],
  'invalid-slider-range-followup-scope':['slider-range',4],
  'invalid-slider-thumb-destroy-scope':['slider-destroy',1],
  'invalid-test-consolidation-scope':['test-consolidation',32],
  'invalid-test-import-cleanup-scope':['test-import',31],
  'invalid-bazel-build-only-scope':['bazel',2],
};
export function sourceScopePrior(read=p=>readFileSync(p)) {
  const bytes=read(SOURCE_SCOPE_PREFIX+'prior.json.gz'),p=JSON.parse(gunzipSync(bytes));
  assert.equal(hash(bytes),pins[p.line],'changed source scope prior');
  assert.equal(hash(p.ledger_text),p.ledger_sha256);assert.equal(p.selected.length,87);
  assert.equal(p.reports.length,7);assert.equal(p.approved_product_delta.length,4);
  return p;
}
function paths(root) {
  return execFileSync('git',['ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim().split('\n');
}
function changeOnly(before,after,fields) {
  const expected=structuredClone(before);
  for(const field of fields)expected[field]=after[field];
  assert.deepEqual(after,expected,'source review changed beyond its bounded population binding');
}
/** All original decisions and analyses are copied unchanged. Only independently
 * computed population bindings, the inventory receipt and build pointer move. */
export function sourceScopeWrites({root=process.cwd(),read=p=>readFileSync(join(root,p))}={}) {
  const prior=sourceScopePrior(read),line=prior.line,all=paths(root),source=()=>candidateProductSourcePaths(root).sort();
  for(const m of [...prior.reports,...prior.product_members,...prior.authored_members])
    assert.equal(hash(read(m.path)),m.sha256,'unexpected source/review change '+m.path);
  const focus=inspectChipFocusRepair({root,readMember:read});
  const list=inspectChipListFocusContract({root,readSource:p=>read(p).toString()});
  const ledger=JSON.parse(prior.ledger_text),writes=new Map(),entries=new Map(),contexts=[];
  const buildPath=SOURCE_SCOPE_PREFIX+'build.json';
  for(const [reason,[family,count]]of Object.entries(families)) {
    const subjects=prior.selected.filter(f=>f.reason===reason);assert.equal(subjects.length,count);
    const originals=[...new Set(subjects.map(s=>s.evidence_report))];assert.equal(originals.length,1);
    const path=originals[0],ref=prior.reports.find(r=>r.path===path),body=JSON.parse(read(path));
    if(family==='build') {
      const c=body.candidate_context;assert.deepEqual(c.tracked_product_paths,all);
      let changed=0;
      c.product_members=c.product_members.map(m=>{
        const actual=hash(read(m.path));if(actual===m.sha256)return m;
        const approved=prior.approved_product_delta.find(a=>a.path===m.path);assert.ok(approved);
        assert.equal(m.sha256,approved.sha256);assert.equal(actual,approved.current_sha256);
        changed++;return {...m,sha256:actual,bytes:read(m.path).length};
      });assert.equal(changed,4);
      for(const m of c.files)assert.equal(hash(read(m.path)),m.sha256);
    } else if(family==='slider-input'||family==='slider-range') {
      const fn=family==='slider-input'?reviewSliderInputScope:reviewSliderRangeScope;
      const actual=fn(read,source,line);changeOnly(body.source_scope,actual,['product_source_population_sha256']);
      body.source_scope=actual;
    } else if(family==='slider-destroy') {
      const actual=reviewSliderThumbDestroyScope(read,source,line),expected=structuredClone(body.source_scope);
      expected.retained_architecture.product_source_population_sha256=actual.retained_architecture.product_source_population_sha256;
      assert.deepEqual(actual,expected);body.source_scope=actual;
    } else if(family==='bazel') {
      const actual=reviewBazelBuildContext(read,()=>all,line);
      changeOnly(body.candidate_context,actual,['product_members','product_population_sha256']);body.candidate_context=actual;
    } else if(family==='test-import') {
      const actual=testImportOwnershipContext(read,line);changeOnly(body.ownership_context,actual,['inputs']);
      const changed=body.ownership_context.inputs.filter((m,i)=>m.sha256!==actual.inputs[i].sha256);
      assert.deepEqual(changed.map(m=>m.path),['testing/legacy-runner/historical-inventory.json']);body.ownership_context=actual;
    } else {
      assert.equal(body.candidate_context.path,prior.selected.find(s=>s.reason==='invalid-build-scope').evidence_report);
      body.candidate_context={path:buildPath,sha256:hash(writes.get(buildPath))};
      const changed=body.historical_suite_context.filter(m=>hash(read(m.path))!==m.sha256);
      assert.deepEqual(changed.map(m=>m.path),['testing/legacy-runner/historical-inventory.json']);
      body.historical_suite_context=body.historical_suite_context.map(m=>({...m,sha256:hash(read(m.path))}));
    }
    body.chip_source_scope_requalification={prior_review:ref,source_parent:prior.source_parent,
      approved_product_delta:prior.approved_product_delta,source_scope_only:true,
      original_review_and_individual_judgments_preserved:true,
      note:'Current source snapshot only. Original source_commit/tree fields and previous receipts retain their historical meaning. All source analyses run against raw current members; no native,packed,floor,rendered or independent-audit credit.',
      actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
    const output=SOURCE_SCOPE_PREFIX+family+'.json',bytes=Buffer.from(json(body));writes.set(output,bytes);
    for(const subject of subjects) {
      const previous=ledger.entries.find(e=>e.sha===subject.sha),entry=structuredClone(previous);
      assert.equal(previous.evidence_report,path);entry.evidence_report=output;
      if(entry.source_check?.evidence_report_sha256)entry.source_check.evidence_report_sha256=hash(bytes);
      entries.set(entry.sha,entry);
    }
    contexts.push({family,subjects:subjects.length,previous:ref,current:{path:output,sha256:hash(bytes)}});
  }
  return {prior,entries,writes,contexts,focus,list};
}

/** Canonical current guards, including complete shared-batch predicates. No
 * source projection, historical adapter or saved success field participates. */
export function validateSourceScopes({root=process.cwd(),read=p=>readFileSync(join(root,p)),entries,selected}={}) {
  const prior=sourceScopePrior(read);entries??=JSON.parse(read(prior.ledger_path)).entries;selected??=prior.selected;
  const all=paths(root),source=()=>candidateProductSourcePaths(root).sort(),cache=new Map(),results=[];
  for(const subject of selected) {
    const entry=entries.find(e=>e.sha===subject.sha);assert.ok(entry);const body=JSON.parse(read(entry.evidence_report));
    let ok=false;
    switch(subject.reason) {
      case 'invalid-build-scope':ok=buildScopeEvidenceOk(body,entry,read,all);break;
      case 'invalid-slider-input-scope':ok=sliderInputScopeEvidenceOk(body,entry,read,source,prior.line);break;
      case 'invalid-slider-range-followup-scope':ok=sliderRangeEvidenceOk(body,entry,read,source,prior.line);break;
      case 'invalid-slider-thumb-destroy-scope':ok=sliderThumbDestroyEvidenceOk(body,entry,read,source,prior.line);break;
      case 'invalid-bazel-build-only-scope':ok=bazelBuildEvidenceOk(body,entry,read,()=>all,prior.line);break;
      case 'invalid-test-consolidation-scope':
        if(!cache.has(entry.evidence_report))cache.set(entry.evidence_report,testConsolidationBatchOk(body,read,all));
        ok=testConsolidationEntryOk(body,entry,read,cache.get(entry.evidence_report));break;
      case 'invalid-test-import-cleanup-scope':
        if(!cache.has(entry.evidence_report))cache.set(entry.evidence_report,testImportBatchOk(body,read,prior.line));
        ok=testImportEntryOk(body,entry,read,cache.get(entry.evidence_report));break;
      default:assert.fail('unknown source family');
    }
    results.push({sha:entry.sha,family:families[subject.reason][0],ok});
  }
  return results;
}
export function inspectSourceScopeRequalification({root=process.cwd(),read=p=>readFileSync(join(root,p))}={}) {
  const built=sourceScopeWrites({root,read}),{prior}=built,ledger=JSON.parse(read(prior.ledger_path));
  const original=JSON.parse(prior.ledger_text),restored=structuredClone(ledger);
  for(const [sha,entry]of built.entries) {
    assert.deepEqual(ledger.entries.find(e=>e.sha===sha),entry);
    restored.entries[restored.entries.findIndex(e=>e.sha===sha)]=original.entries.find(e=>e.sha===sha);
  }
  assert.deepEqual(restored,original,'unrelated ledger entry or envelope changed');
  for(const [path,bytes]of built.writes)assert.deepEqual(read(path),bytes,'different source report '+path);
  const results=validateSourceScopes({root,read});assert.equal(results.length,87);assert.ok(results.every(r=>r.ok));
  return {schema_version:1,line:prior.line,source_subjects:results,report_copies:built.contexts,
    all1697_dispositions_and_judgments_preserved:true,unrelated_ledger_rows_preserved:1610,
    original_reports_preserved:7,approved_product_deltas:4,product_reference_fixture_members_preserved:1625,
    authored_members_preserved:prior.authored_members.length,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
