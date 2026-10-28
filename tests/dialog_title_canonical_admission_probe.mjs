/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Fresh title source execution and native-gate controls; no native execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {isDeepStrictEqual} from 'node:util';
import owner from '../scripts/upstream-dialog-title-admission.cjs';
import {dialogTitleBrowserObservedOkay,validateDialogTitleNative} from '../scripts/upstream-dialog-title-native-evidence.mjs';
import {requiresHistoricalBehavior,validateHistoricalBehavior} from '../scripts/upstream-historical-behavior-evidence.mjs';
import {readEvidenceMember} from '../scripts/upstream-packed-run-evidence.mjs';
import {inspectSnackCurrentDialogContracts} from '../scripts/snack-dom-source-context.mjs';
const root=process.cwd(),require=createRequire(import.meta.url),hash=raw=>createHash('sha256').update(raw).digest('hex');
const disk=path=>owner.titleRead(root,path),body=JSON.parse(disk(owner.TITLE_REVIEW)),review=body.reviews[0];
const ledger=JSON.parse(disk('compatibility/f10/disposition-ledger/ledger.json'));
const before=ledger.entries.find(row=>row.sha===owner.TITLE_SHA);assert.ok(before);
const entry={...before,final_disposition:'already-adapted',review_depth:'individual-compatibility',
 affected_branches:['21.x'],evidence_report:owner.TITLE_REVIEW,reason:review.decision,individual_proof:owner.titleProof(review)};
const args={entry,body,review,proof:entry.individual_proof};
assert.equal(owner.metadataOk(args),true);
assert.equal(requiresHistoricalBehavior(entry,entry.individual_proof),true,'native requirement must route through the root checker');
assert.equal(validateHistoricalBehavior({root,...args}).ok,false,'source proof is not native admission');
let io=0;
const pure={exports:{}};
runInNewContext(readFileSync(join(root,'scripts/upstream-dialog-title-admission.cjs'),'utf8'),{
 module:pure,__dirname:join(root,'scripts'),require:specifier=>{
  if(specifier==='node:fs')return Object.fromEntries(['readFileSync','lstatSync','realpathSync'].map(name=>[name,()=>{io++;throw new Error('metadata I/O');}]));
  if(specifier==='node:child_process')return {execFileSync:()=>{io++;throw new Error('metadata execution');}};
  if(specifier==='node:assert/strict')return {...assert,deepEqual:(a,b,...rest)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),...rest)};
  return require(specifier);
 },Buffer,process:new Proxy({},{get(){throw new Error('metadata environment access');}}),structuredClone,
});
assert.equal(pure.exports.metadataOk(args),true);assert.equal(io,0);
const metadataFaults=[];
for(const [id,edit]of [
 ['wrong-sha',v=>v.sha='0'.repeat(40)],['wrong-final-state',v=>v.final_disposition='inherited'],
 ['wrong-branch',v=>v.affected_branches=['main']],['changed-decision',v=>v.reason+=' altered'],
 ['broadened-seed',v=>v.files=[...v.files,'src/cdk/dialog/dialog-container.ts']],
 ['wrong-kind',v=>v.individual_proof.proof_kind='individual-semantic'],
 ['missing-native',v=>delete v.individual_proof.historical_behavior],
 ['optional-native',v=>v.individual_proof.historical_behavior.required=false],
 ['missing-engine',v=>v.individual_proof.historical_behavior.case_ids.pop()],
 ['duplicate-engine',v=>v.individual_proof.historical_behavior.case_ids[1]=v.individual_proof.historical_behavior.case_ids[0]],
 ['truncated-native-rows',v=>v.individual_proof.historical_behavior.observation_rows_per_case=41],
 ['wrong-qualification',v=>v.individual_proof.dialog_title_source_scope.qualification.sha256='0'.repeat(64)],
 ['claimed-native',v=>v.individual_proof.dialog_title_source_scope.actual_native_artifact_browser_floor_or_full_audit_qualified=true],
]){
 const changed=structuredClone(entry);edit(changed);
 for(const candidate of [owner,pure.exports])assert.equal(candidate.metadataOk({...args,entry:changed,proof:changed.individual_proof}),false,id);
 metadataFaults.push(id);
}
assert.equal(io,0);
const inspected=owner.inspectTitleSource({root,read:disk});inspected.assertCurrent();
const current=inspectSnackCurrentDialogContracts({root});
assert.deepEqual(inspected.scope.graph.source_members,[...current.proposed_sources].map(([path,text])=>({path,sha256:hash(text),bytes:Buffer.byteLength(text)})));
assert.deepEqual(inspected.scope.graph.routes,[...current.routes]);
assert.equal(owner.sourceOk({...args,root,read:disk}),true,'actual fresh child lifecycle execution');
const sourceFaults=[];
for(const path of [owner.TITLE_SOURCE_REPORT,
 'projects/ngx-material-legacy/legacy-dialog/dialog-content-directives.ts',
 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-state.ts',
 'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts',
 'projects/ngx-material-legacy/legacy-dialog/dialog-container.html',
 'tests/dialog_initial_focus_runtime_probe.mjs','scripts/dialog-title-canonical-source.mjs',
 'scripts/upstream-dialog-title-native-evidence.mjs','node_modules/@angular/core/package.json',
 'node_modules/typescript/lib/typescript.js',
]){
 const read=p=>p===path?Buffer.concat([disk(p),Buffer.from('\n')]):disk(p);
 assert.throws(()=>owner.inspectTitleSource({root,read}),undefined,path);
 assert.equal(owner.sourceOk({...args,root,read}),false,'post-success source fault '+path);sourceFaults.push(path);
}
let late=null;const mutable=path=>path===late?Buffer.concat([disk(path),Buffer.from('\n')]):disk(path);
const lateSubject=owner.inspectTitleSource({root,read:mutable});
for(const ref of lateSubject.bound){late=ref.path;assert.throws(()=>lateSubject.assertCurrent(),undefined,ref.path);}late=null;lateSubject.assertCurrent();

// Inject only the child transport to show no successful-result cache survives.
let childCalls=0,childOutput=JSON.stringify(inspected.scope);
const controlled={exports:{}};
runInNewContext(readFileSync(join(root,'scripts/upstream-dialog-title-admission.cjs'),'utf8'),{
 module:controlled,__dirname:join(root,'scripts'),require:specifier=>{
  if(specifier==='node:child_process')return {execFileSync:()=>{childCalls++;return childOutput;}};
  if(specifier==='node:assert/strict')return {...assert,deepEqual:(a,b,...rest)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),...rest)};
  return require(specifier.startsWith('.')?join(root,'scripts',specifier):specifier);
 },Buffer,process,structuredClone,
});
assert.equal(controlled.exports.sourceOk({...args,root,read:disk}),true);
const changed=structuredClone(inspected.scope);changed.lifecycle.observations[3].cases[2].names=['stale-title'];childOutput=JSON.stringify(changed);
assert.equal(controlled.exports.sourceOk({...args,root,read:disk}),false);assert.equal(childCalls,2);

const steps=['initial','first-removed','all-removed','second-returned','first-appended','second-removed','empty-again'];
const first=['legacy-title-lifetime-first',null,null,null,'legacy-title-lifetime-first','legacy-title-lifetime-first',null];
const second=['mat-dialog-title-1','mat-dialog-title-1',null,'mat-dialog-title-2','mat-dialog-title-2',null,null];
const active=['first','second',null,'second','second','first',null];
const witness={scenarios:['component','template'].flatMap(mode=>['titles','labelledby','label'].map(priority=>({mode,priority,
 steps:steps.map((step,i)=>({step,first:first[i],second:second[i],
  labelledby:priority==='label'?null:priority==='labelledby'?'legacy-title-configured':active[i]==='first'?first[i]:active[i]==='second'?second[i]:null,
  label:priority==='label'?'Explicit title label':null})),
})))};
const nativeScope=owner.titleNativeRequirements(),marker='mat-dialog-container; rendered component/template OnPush title lifetimes ';
const observation={cases:nativeScope.case_ids.map(case_id=>({case_id,result:'pass',evidence:marker+JSON.stringify(witness)}))};
assert.equal(dialogTitleBrowserObservedOkay(observation,nativeScope.case_ids),true);
const nativeFaults=[];
for(const [id,edit]of [
 ['missing-cell',v=>v.cases.pop()],['duplicate-cell',v=>v.cases[1]=v.cases[0]],
 ['wrong-runtime',v=>v.cases[0].case_id=v.cases[0].case_id.replace('zoneful','unknown')],
 ['failed-cell',v=>v.cases[0].result='fail'],['pass-label-only',v=>v.cases[0].evidence='pass'],
 ['missing-scenario',v=>{const w=structuredClone(witness);w.scenarios.pop();v.cases[0].evidence=marker+JSON.stringify(w);}],
 ['stale-title-label',v=>{const w=structuredClone(witness);w.scenarios[0].steps[1].labelledby='legacy-title-lifetime-first';v.cases[0].evidence=marker+JSON.stringify(w);}],
 ['missing-native-row',v=>{const w=structuredClone(witness);w.scenarios[0].steps.pop();v.cases[0].evidence=marker+JSON.stringify(w);}],
 ['malformed-native-json',v=>v.cases[0].evidence=marker+'{'],
]){const value=structuredClone(observation);edit(value);assert.equal(dialogTitleBrowserObservedOkay(value,nativeScope.case_ids),false,id);nativeFaults.push(id);}
const request={line:'21.x'};
assert.equal(validateDialogTitleNative({root,...args,request}).ok,false,'missing real same-run coordinator may not pass');
const demand=(v,message)=>{if(!v)throw new Error(message);};let prerequisite=true;
const controlledNative=runInNewContext('('+validateDialogTitleNative.toString()+')',{
 require:()=>owner,hash,demand,isDeepStrictEqual:(a,b)=>isDeepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b))),readEvidenceMember,dialogTitleBrowserObservedOkay,
 validateBrowserMatrixRun:()=>prerequisite?{ok:true,observation,invocation_id:'controlled',output:{},library:{},packed_consumer:{}}:{ok:false,detail:'controlled missing prerequisite'},
});
const controlledPass=controlledNative({root,...args,request});assert.equal(controlledPass.ok,true,controlledPass.detail);
prerequisite=false;assert.equal(controlledNative({root,...args,request}).ok,false);
prerequisite=true;assert.equal(controlledNative({root,...args,request:{line:'main'}}).ok,false);
const noNative=structuredClone(entry.individual_proof);delete noNative.historical_behavior;
assert.equal(controlledNative({root,...args,request,proof:noNative}).ok,false);
inspected.assertCurrent();
const report={schema_version:1,result:'pass',node:process.version,current_raw_graph_members:49,
 original_exact_patch_replays:9,actual_fresh_lifecycle_execution:true,
 metadata_faults_rejected:metadataFaults,source_faults_rejected:sourceFaults,
 late_source_faults_rejected:lateSubject.bound.length,uncached_child_calls:childCalls,
 native_observation_faults_rejected:nativeFaults,controlled_native_prerequisite_checks:4,
 actual_native_artifact_browser_floor_or_full_audit_qualified:false,canonical_decisions_changed:0,g11_claim:'not-passed',
 source_report:{path:owner.TITLE_SOURCE_REPORT,sha256:owner.TITLE_SOURCE_HASH}};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
