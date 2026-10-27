/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual current source admission and negative controls; no native execution. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {autocompleteSelectionNativeSubject,SELECTION_NATIVE_PACKET,SELECTION_NATIVE_REGISTRY,SELECTION_NATIVE_SHAS} from '../scripts/autocomplete-selection-native-subject.mjs';
import {autocompleteSelectionSourceJudgments} from '../scripts/autocomplete-selection-source-judgment.mjs';
import {individualReviewScopeOk} from '../scripts/upstream-individual-evidence-scope.mjs';
import {candidateSourceEvidenceOk} from '../scripts/upstream-candidate-source-evidence.mjs';
import {requiresHistoricalBehavior,validateHistoricalBehavior} from '../scripts/upstream-historical-behavior-evidence.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const source=autocompleteSelectionSourceJudgments({root,read}),native=autocompleteSelectionNativeSubject({root,read}),rejected=[];
const ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
assert.equal(ledger.entries.length,1697);assert.equal(ledger.g11_claim,'not-passed');
for(const row of source.reports){
  const body=JSON.parse(read(row.path)),entry=ledger.entries.find(entry=>entry.sha===row.sha);
  assert.deepEqual(body,row.body);assert.equal(entry.evidence_report,row.path);assert.deepEqual(entry.individual_proof,row.proof);
  assert.equal(entry.final_disposition,'already-adapted');
  assert.equal(individualReviewScopeOk({entry,proof:row.proof,body,review:body,requiresIndividual:true,claimsBehavior:true}),true);
  assert.equal(candidateSourceEvidenceOk(row.proof,read,()=>[]),true);
  assert.equal(requiresHistoricalBehavior({sha:row.sha},{}),true);
  const missing=validateHistoricalBehavior({root,entry,proof:row.proof,request:{}});
  assert.equal(missing.ok,false);assert.equal(missing.detail,'missing coordinator run');
  const fault=(id,change,pattern)=>{const proof=structuredClone(row.proof);change(proof);
    const result=validateHistoricalBehavior({root,entry,proof,request:{}});assert.equal(result.ok,false,id);assert.match(result.detail,pattern,id);rejected.push(row.sha+'/'+id);};
  fault('stripped-proof-kind',proof=>delete proof.proof_kind,/unregistered/);
  fault('stripped-historical-scope',proof=>delete proof.historical_behavior,/scope/);
  fault('wrong-original-patch',proof=>proof.diff_sha256='0'.repeat(64),/unregistered/);
  fault('omitted-required-native-case',proof=>proof.historical_behavior.case_ids.pop(),/scope/);
  fault('stale-current-source',proof=>proof.historical_behavior.source_members[0].sha256='0'.repeat(64),/stale historical source/);
  assert.equal(body.actual_native_browser_artifact_or_floor_executed,false);
}
const reject=(id,change)=>{assert.throws(()=>autocompleteSelectionNativeSubject({root,read:change}));rejected.push(id);};
reject('changed-native-proposal',p=>p===SELECTION_NATIVE_PACKET?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
reject('unrelated-native-registry-code',p=>p===SELECTION_NATIVE_REGISTRY?Buffer.concat([read(p),Buffer.from('\n// changed\n')]):read(p));
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
const registryBefore=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',native.packet.source_parent+':'+SELECTION_NATIVE_REGISTRY],{cwd:root,env,maxBuffer:1024*1024});
reject('unapplied-three-scope-registry',p=>p===SELECTION_NATIVE_REGISTRY?registryBefore:read(p));
const scopeModule=native.packet.scope_module.path,product=native.packet.current_product_subjects[0].path;
reject('changed-native-scope-module',p=>p===scopeModule?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
reject('changed-current-trigger',p=>p===product?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
const controls='compatibility/rc/autocomplete-selection-native-contract-controls.json';
const failedControls=JSON.parse(read(controls));failedControls.subjects[0].complete_synthetic_admission_passed=false;
reject('failed-native-admission-controls',p=>p===controls?Buffer.from(JSON.stringify(failedControls)):read(p));
reject('changed-original-source-proposal',p=>p===native.packet.source_proposals.path?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
const harnessPacket='compatibility/rc/autocomplete-selection-native-harness-successor.json';
reject('changed-exact-fixture-harness-successor',p=>p===harnessPacket?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
assert.throws(()=>autocompleteSelectionNativeSubject({root,read,line:source.line==='main'?'21.x':'main'}));rejected.push('wrong-native-source-line');
assert.throws(()=>native.qualify({path:SELECTION_NATIVE_REGISTRY,sha256:'0'.repeat(64)}));rejected.push('unknown-earlier-registry-reference');
assert.throws(()=>native.qualify({path:SELECTION_NATIVE_REGISTRY,sha256:native.before.sha256,bytes:native.before.bytes+1}));rejected.push('wrong-earlier-registry-byte-count');
const targets=[SELECTION_NATIVE_REGISTRY,SELECTION_NATIVE_PACKET,scopeModule,native.packet.original_subjects.path,native.packet.source_proposals.path,controls,product,
  harnessPacket,'tests/autocomplete_selection_native_contract_probe.mjs'];
for(const target of targets){
  let late=false;const live=autocompleteSelectionNativeSubject({root,read:p=>late&&p===target?Buffer.concat([read(p),Buffer.from(' ')]):read(p)});
  const reference={path:SELECTION_NATIVE_REGISTRY,...live.before},expected={path:SELECTION_NATIVE_REGISTRY,...live.after};
  live.bound.length=0;live.packet.literal_edits.length=0;live.requirements[0][1].cases.length=0;
  live.before.sha256='0'.repeat(64);live.after.sha256='0'.repeat(64);
  assert.deepEqual(live.qualify(reference),expected);late=true;assert.throws(()=>live.assertCurrent());rejected.push('late-native-input-'+target);
}
source.assertCurrent();assert.deepEqual(source.reports.map(row=>row.sha),SELECTION_NATIVE_SHAS);assert.equal(rejected.length,35);
const report={schema_version:1,line:source.line,current_individual_source_proofs:3,original_hunks:10,
  registered_required_native_case_occurrences:9,unique_required_native_cases:6,exact_source_members_per_proof:23,
  missing_coordinator_run_rejected_per_subject:true,production_registry_activated:true,rejected,
  producer_sha256:hash(read('tests/autocomplete_selection_source_admission_probe.mjs')),
  actual_native_browser_artifact_or_floor_executed:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:source.line,current_individual_source_proofs:3,original_hunks:10,
  exact_native_cases:9,exact_source_members_per_proof:23,missing_coordinator_run_rejected:true,rejections:rejected.length,
  actual_native_browser_artifact_or_floor_executed:false}));
