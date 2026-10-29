/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite source-reference controls only; no product or native test execution. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {historicalContractRepairSourceSubject,readHistoricalContractRepairMember} from '../../scripts/historical-contract-repair-source.mjs';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex'),mutations=new Map();
const read=p=>mutations.get(p)??readHistoricalContractRepairMember(root,p),started=performance.now();
const subject=historicalContractRepairSourceSubject({root,read}),controls=[];
function rejects(name,action,pattern){assert.throws(action,pattern);controls.push({name,rejected:true});}
for(const image of subject.images){
 const before={path:image.path,...image.before,annotation:'preserved metadata'},after={path:image.path,...image.after,annotation:'preserved metadata'};
 assert.deepEqual(subject.qualify(before),after);assert.deepEqual(subject.qualify(after),after);
 assert.deepEqual(subject.historicalReference(after),before);
 const noBytes=subject.qualify({path:image.path,sha256:image.before.sha256,annotation:'size omitted'});assert.equal(Object.hasOwn(noBytes,'bytes'),false);assert.equal(noBytes.annotation,'size omitted');
 rejects('unknown source reference '+image.path,()=>subject.qualify({...before,sha256:'0'.repeat(64)}),/unreviewed historical-repair source reference/);
 rejects('wrong source size '+image.path,()=>subject.qualify({...before,bytes:image.before.bytes+1}),/Expected values to be strictly equal/);
}
assert.equal(subject.qualify({path:'projects/ngx-material-legacy/unrelated.ts',sha256:'0'.repeat(64)}),null);
controls.push({name:'five before/after references size omission and unowned-path boundaries',passed:true});
const historical={schema_version:1,current_members:[...subject.images.slice(0,4).map(image=>({path:image.path,...image.before})),...Array.from({length:1000},(_,i)=>({path:`projects/ngx-material-legacy/unrelated-${i}.scss`,sha256:'a'.repeat(64),bytes:17}))],unchanged_behavior_field:'historical'};
const current=structuredClone(historical);current.current_members=current.current_members.map(ref=>subject.qualify(ref)??ref);
const comparison=subject.compareSourceReport(current,historical);assert.deepEqual(comparison.current_metadata,current);assert.deepEqual(comparison.historical_comparison,historical);assert.equal(comparison.changed_source_references,4);
const badStyle=structuredClone(current);badStyle.current_members[4].sha256='b'.repeat(64);rejects('unrelated style expectation cannot advance',()=>subject.compareSourceReport(badStyle,historical),/fresh source facts differ/);
const badBehavior=structuredClone(current);badBehavior.unchanged_behavior_field='candidate';rejects('unrelated behavior facts cannot advance',()=>subject.compareSourceReport(badBehavior,historical),/fresh source facts differ/);
const missing=structuredClone(historical);missing.current_members.shift();const missingCurrent=structuredClone(missing);missingCurrent.current_members=missingCurrent.current_members.map(ref=>subject.qualify(ref)??ref);rejects('incomplete selected source comparison',()=>subject.compareSourceReport(missingCurrent,missing),/source boundary must contain all four/);
if(subject.line==='21.x'){
 const old=JSON.parse(read('compatibility/rc/21x-legacy-removal-source-boundary-reviewed.json')),next=structuredClone(old);next.current_members=next.current_members.map(ref=>subject.qualify(ref)??ref);
 const exact=subject.compareSourceReport(next,old);assert.equal(exact.changed_source_references,4);controls.push({name:'immutable actual1147-member legacy boundary reference comparison',passed:true});
}
for(const path of [subject.images[0].path,'compatibility/rc/historical-contract-repair-source-inputs.json']){
 mutations.set(path,Buffer.concat([readHistoricalContractRepairMember(root,path),Buffer.from('\n/* changed supplied bytes */\n')]));
 rejects('cold nonphysical '+path,()=>historicalContractRepairSourceSubject({root,read}),/nonphysical current historical-repair input/);mutations.clear();
}
const publicInput=subject.bound.find(ref=>ref.path==='node_modules/@angular/material/types/snack-bar.d.ts');assert.ok(publicInput);
for(const path of [subject.images[3].path,publicInput.path,'scripts/historical-contract-repair-source.mjs']){
 mutations.set(path,Buffer.concat([readHistoricalContractRepairMember(root,path),Buffer.from('\n/* late supplied mutation */\n')]));
 rejects('late current input '+path,()=>subject.assertCurrent(),/late nonphysical historical-repair input/);mutations.clear();
}
mutations.set(subject.images[0].path,Buffer.from('historical before source'));
rejects('reference qualifier cannot hide a supplied historical source',()=>subject.qualify({path:subject.images[0].path,...subject.images[0].before}),/nonphysical historical-repair source reference/);mutations.clear();subject.assertCurrent();
const canonical=['compatibility/f10/disposition-ledger/ledger.json','scripts/upstream-source-contract-registry.mjs','compatibility/rc/21x-remaining-disposition-worksheet.json'];
if(subject.line==='21.x'){
 for(const path of canonical){assert.equal(subject.bound.some(ref=>ref.path===path),false);mutations.set(path,Buffer.from('predecessor audit-state metadata'));}
 subject.assertCurrent();assert.equal(subject.current_use_historical_canonical_context_inputs,3);assert.equal(subject.canonical_context_admission_granted,false);mutations.clear();
 controls.push({name:'three exact historical snapshots cannot grant current canonical admission',passed:true});
}else assert.equal(subject.current_use_historical_canonical_context_inputs,0);
const producer='compatibility/rc/historical-contract-repair-source-v2-verify.mjs',module='scripts/historical-contract-repair-source.mjs';
const result={schema_version:1,line:subject.line,status:'finite current source/API reference subject qualified; shared reader integration pending',node:process.version,source_references:subject.images.map(row=>({path:row.path,before:row.before,after:row.after})),current_use_reviews:95,current_use_current_input_bindings:subject.current_use_current_input_bindings,current_use_historical_roster_metadata_inputs:2,current_use_historical_canonical_context_inputs:subject.current_use_historical_canonical_context_inputs,canonical_context_admission_granted:false,
 current_input_bindings:subject.bound.length,current_binding_list_sha256:hash(JSON.stringify(subject.bound)),controls,controls_rejected:controls.filter(row=>row.rejected).length,
 source_subject:{path:module,sha256:hash(readFileSync(join(root,module)))},source_inputs:{path:'compatibility/rc/historical-contract-repair-source-inputs.json',sha256:hash(readFileSync(join(root,'compatibility/rc/historical-contract-repair-source-inputs.json')))},
 execution:{producer,sha256:hash(readFileSync(join(root,producer))),seconds:(performance.now()-started)/1000,prior_compiler_runtime_native_or_product_tests_reexecuted:false},
 shared_source_reader_integration_complete:false,authored_roster_integration_complete:false,canonical_admission_ready:false,product_changes:0,canonical_dispositions_changed:0,old_product_or_tool_bytes_exposed_as_current:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
const out='compatibility/rc/historical-contract-repair-source-v2-qualified.json';assert.equal(existsSync(join(root,out)),false);writeFileSync(join(root,out),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({line:result.line,references:result.source_references.length,reviews:result.current_use_reviews,bound:result.current_input_bindings,rejected:result.controls_rejected,seconds:result.execution.seconds,shared_reader_integration:false}));
