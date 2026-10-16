/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole-original provenance, bounded metadata and current source controls. No runtime credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {NATIVE_INDIVIDUAL_INPUTS,inspectNativeIndividualSourceJudgments,reviewOriginalNativePatch,
  assertNativeIndividualMetadataState} from '../scripts/remaining-native-individual-source-judgments.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),gitHash=(kind,bytes)=>createHash('sha1').update(kind+' '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex');
const inputs=JSON.parse(read(NATIVE_INDIVIDUAL_INPUTS)),prior=JSON.parse(gunzipSync(read(inputs.prior.path))),trees=JSON.parse(gunzipSync(read(inputs.upstream_trees.path)));
const result=inspectNativeIndividualSourceJudgments({root}),cases=[];
assert.equal(result.source_judgments,3);assert.equal(result.original_hunks,4);assert.equal(result.writes.size,5);
assert.deepEqual(result.entries.map(row=>row.final_disposition),['do-not-adopt','do-not-adopt','adapt']);
assert.ok(result.proof.ripple_route.lines.every(row=>row.private_symbols_invoked===false));
assert.equal(result.actual_current_native_or_packed_or_floor_qualified,false);
for(const path of [NATIVE_INDIVIDUAL_INPUTS,inputs.prior.path,inputs.upstream_trees.path,
 ...inputs.current_sources.map(row=>row.path),...inputs.implementation_evidence.map(row=>row.path)]){
 const before=read(path),changed=Buffer.concat([before,Buffer.from(' ')]);
 assert.throws(()=>inspectNativeIndividualSourceJudgments({root,readMember:name=>name===path?changed:read(name)}),/changed/);
 cases.push({id:'changed-current-or-authenticated-input-'+path,result:'rejected'});
}
for(const original of prior.originals){
 const tree=trees.subjects.find(row=>row.sha===original.sha);
 assert.equal(reviewOriginalNativePatch(original,tree).complete_commit_tree_and_hunks_verified,true);
 const mutations=[
  ['raw-commit',value=>{value.raw_commit+='\n';value.raw_commit_sha256=hash(value.raw_commit);}],
  ['parent',value=>{value.parent='0'.repeat(40);}],
  ['second-changed-path',value=>{value.changed_files.push('src/material/unreviewed.ts');}],
  ['complete-before',value=>{value.complete_before+='\n';value.before_sha256=hash(value.complete_before);value.before_blob=gitHash('blob',value.complete_before);}],
  ['complete-after',value=>{value.complete_after+='\n';value.after_sha256=hash(value.complete_after);value.after_blob=gitHash('blob',value.complete_after);}],
  ['rehashed-patch',value=>{value.patch=value.patch.replace('@@','@@ wrong');value.patch_sha256=hash(value.patch);}],
 ];
 for(const [id,mutate]of mutations){const value=structuredClone(original);mutate(value);assert.throws(()=>reviewOriginalNativePatch(value,tree));cases.push({id:original.sha+'-'+id,result:'rejected'});}
 for(const side of ['before','after']){
  const value=structuredClone(tree);value[side].chain.at(-1).raw_base64=Buffer.from('unreviewed Git tree').toString('base64');
  assert.throws(()=>reviewOriginalNativePatch(original,value));cases.push({id:original.sha+'-'+side+'-tree-provenance',result:'rejected'});
 }
}
const prospective=path=>result.writes.get(path)||read(path),has=path=>result.writes.has(path)||result.previous.has(path);
assertNativeIndividualMetadataState({previous:result.previous,writes:result.writes,read:prospective,has});
for(const path of new Set([...result.previous.keys(),...result.writes.keys()])){
 const changed=Buffer.concat([prospective(path),Buffer.from(' ')]);
 assert.throws(()=>assertNativeIndividualMetadataState({previous:result.previous,writes:result.writes,has,read:name=>name===path?changed:prospective(name)}),/changed/);
 cases.push({id:'changed-live-metadata-'+path,result:'rejected'});
}
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json',old=JSON.parse(result.previous.get(ledgerPath)),next=JSON.parse(result.writes.get(ledgerPath));
const shas=new Set(result.entries.map(row=>row.sha));
assert.deepEqual(old.entries.filter(row=>!shas.has(row.sha)),next.entries.filter(row=>!shas.has(row.sha)));
let recovered=result.writes.get(ledgerPath).toString();
const format=value=>JSON.stringify(value,null,2).split('\n').map(line=>'    '+line).join('\n');
for(const entry of result.entries){
 const before=old.entries.find(row=>row.sha===entry.sha),review=JSON.parse(result.writes.get(entry.evidence_report));
 assert.deepEqual(review.prior_entry,before);assert.deepEqual(review.individual_proof,entry.individual_proof);
 assert.deepEqual(review.required_native_contract,inputs.runtime_requirements.find(row=>row.sha===entry.sha));
 assert.equal(review.actual_native_or_packed_or_floor_qualified,false);assert.equal(review.source_conclusion_only,true);
 assert.equal(recovered.split(format(entry)).length,2);recovered=recovered.replace(format(entry),format(before));
}
assert.equal(recovered,result.previous.get(ledgerPath).toString(),'unrelated ledger bytes changed');
const report={schema_version:1,line:inputs.line,source_judgments:3,whole_original_hunks:4,controls:cases.length,cases,
 current_source_pins:inputs.current_sources.length,implementation_evidence_pins:inputs.implementation_evidence.length,
 untouched_other_ledger_entries:1694,exact_preceding_ledger_recovered:true,source_only:true,
 inputs_sha256:hash(read(NATIVE_INDIVIDUAL_INPUTS)),helper_sha256:hash(read('scripts/remaining-native-individual-source-judgments.mjs')),
 producer_sha256:hash(read('tests/remaining_native_individual_source_probe.mjs')),actual_current_native_or_packed_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,cases:undefined}));
