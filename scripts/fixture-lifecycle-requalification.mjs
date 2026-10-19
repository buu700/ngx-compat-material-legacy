/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact167-source evidence successor. Historical views never admit runtime or current source. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {inspectFixtureLifecycleDelta as inspectProducerEpoch} from './fixture-lifecycle-producer-review.mjs';
import {ngZoneIntegrationPrior as ngPrior,inspectNgZoneUseIntegration as inspectNgEpoch,
 ngZoneIntegrationParentReader as ngParent,historicalRippleAuthoredReader as rippleParent} from './ng-zone-use-integration.mjs';
const PRIOR='compatibility/rc/fixture-lifecycle-requalification-prior.json.gz';
const INPUTS='compatibility/rc/fixture-lifecycle-requalification-inputs.json';
const priorPins={main:'ca8fe1e3a0afca1e117f7c8700e48c96242748257e9a089c307bab73855987b3','21.x':'ae7fe8eb3aed09c9dfc2b2d185598191addf5f25772998557448d5c1a16dee57'};
const inputPins={main:'96f1d8d493ce932978dd1c7d68eb359ed8712e1318667a2a324b36226e9719b3','21.x':'697264f8683e8dc910c507bee16b1a9bcfff00d2ce91cba6eb9cdffd48abb012'};
const hash=b=>createHash('sha256').update(b).digest('hex'),json=v=>JSON.stringify(v,null,2)+'\n';
const key=r=>JSON.stringify([r.file,r.module,r.symbol]);
const ref=m=>({path:m.path,sha256:m.sha256});
const defaultRead=root=>p=>readFileSync(join(root,p));
const git=(root,commit,path)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});
export function fixtureLifecycleRequalificationPrior({root=process.cwd(),read=defaultRead(root)}={}){
 const packed=read(PRIOR),prior=JSON.parse(gunzipSync(packed));assert.equal(hash(packed),priorPins[prior.line],'unknown exact source requalification preimages');assert.equal(prior.schema_version,1);
 assert.equal(prior.selected.length,167);assert.equal(new Set(prior.selected.map(key)).size,167);
 for(const m of [...prior.ledger_preimages,prior.review_preimage,...prior.context_preimages]){
  assert.equal(hash(m.text),m.sha256);assert.equal(hash(git(root,prior.source_parent,m.path)),m.sha256,'preimage differs from its immutable source commit: '+m.path);
 }
 return prior;
}
function parentProjection(prior,read){const members=new Map([...prior.ledger_preimages,...prior.context_preimages].map(m=>[m.path,Buffer.from(m.text)]));return p=>members.has(p)?Buffer.from(members.get(p)):read(p);}
function expectedReview(prior,inputs,read){const body=JSON.parse(prior.review_preimage.text),oldRef=ref(prior.review_preimage),producers=new Map(inputs.producer_deltas.map(m=>[m.path,m]));
 assert.equal(body.line,prior.line);assert.equal(body.reviews.length,167);assert.deepEqual(body.reviews.map(key).sort(),prior.selected.map(key).sort());
 for(const row of body.reviews){let changed=0;
  assert.equal(hash(read('projects/ngx-material-legacy/'+row.file)),row.candidate_source_sha256,'candidate product bytes changed');
  for(const evidence of row.independent_evidence)if(producers.has(evidence.path)){const p=producers.get(evidence.path);assert.equal(evidence.sha256,p.before_sha256);evidence.sha256=p.sha256;if(Object.hasOwn(evidence,'bytes'))evidence.bytes=read(evidence.path).length;changed++;}
  assert.ok(changed>0,'unaffected source role in finite requalification');
  row.independent_evidence.push(...inputs.common_evidence.filter(e=>!row.independent_evidence.some(old=>old.path===e.path)));
  row.producer_source_requalification={qualification:inputs.qualification,original_review:oldRef,changed_producer_evidence_members:changed,original_source_conclusion_decision_candidate_bytes_preserved:true,actual_legacy_packed_or_native_qualified:false};
 }
 body.source_producer_requalification={qualification:inputs.qualification,original_review:oldRef,source_uses:167,new_use_closures:0,all_original_decisions_preserved:true,g11_claim:'not-passed'};
 return Buffer.from(json(body));
}
export function expectedFixtureLifecycleLedgers(prior,review){return prior.ledger_preimages.map(m=>{
 const body=JSON.parse(m.text);assert.equal(json(body),m.text);
 const wanted=new Set(prior.selected.filter(r=>r.ledger===m.path).map(key));let count=0;
 for(const row of body.symbol_uses)if(wanted.has(key(row))){assert.equal(row.status,'reviewed');assert.equal(row.disposition,'closed');assert.deepEqual(row.source_review,ref(prior.review_preimage));row.source_review={...review};count++;}
 assert.equal(count,m.path.includes('current-dispositions')?1:166);
 return {path:m.path,bytes:Buffer.from(json(body)),changed:count};
 });}
function validate({root=process.cwd(),read=defaultRead(root)}={}){
 const prior=fixtureLifecycleRequalificationPrior({root,read}),raw=read(INPUTS);assert.equal(hash(raw),inputPins[prior.line],'unknown source requalification inputs');const inputs=JSON.parse(raw);
 assert.equal(inputs.line,prior.line);assert.deepEqual(inputs.prior,{path:PRIOR,sha256:priorPins[prior.line]});
 assert.equal(inputs.context_edits.length,6);assert.equal(inputs.producer_deltas.length,7);
 for(const m of prior.protected)assert.equal(hash(read(m.path)),m.sha256,'changed original guard/review: '+m.path);
 for(const output of expectedFixtureLifecycleLedgers(prior,inputs.new_review))assert.equal(read(output.path).equals(output.bytes),true,'ledger differs beyond exact167 source-review pointers');
 assert.equal(read(inputs.new_review.path).equals(expectedReview(prior,inputs,read)),true,'source conclusion, decision or evidence delta is not the exact reviewed successor');
 assert.equal(hash(read(inputs.new_review.path)),inputs.new_review.sha256);
 for(const m of inputs.bound_members){const bytes=read(m.path);assert.equal(hash(bytes),m.sha256,'changed current bound member: '+m.path);if(Object.hasOwn(m,'bytes'))assert.equal(bytes.length,m.bytes);}
 for(const edit of inputs.context_edits){const before=prior.context_preimages.find(m=>m.path===edit.path);assert.ok(before);let after=before.text;
  for(const [from,to]of edit.substitutions){assert.equal(after.split(from).length,2,'ambiguous task context substitution');after=after.replace(from,to);}
  assert.equal(hash(after),edit.after_sha256);assert.equal(read(edit.path).toString(),after,'unknown task context bytes: '+edit.path);
 }
 const parent=parentProjection(prior,read),producer=inspectProducerEpoch(root,{readSource:p=>parent(p).toString()});
 return {prior,inputs,parent,producer,summary:{schema_version:1,line:prior.line,frozen_source_review_pointers_requalified:166,additional_source_review_pointers_requalified:1,new_use_closures:0,frozen_uses:1736,frozen_reviewed_labels:1464,frozen_open:272,additional_uses:308,additional_reviewed_labels:178,additional_open:130,unrelated_frozen_rows_preserved:1570,unrelated_additional_rows_preserved:307,source_conclusions_decisions_and_candidate_bytes_preserved:167,current_bound_members_rechecked:inputs.bound_members.length,finite_context_substitutions:6,producer_state_repairs_verified:14,old_review_guard_or_oracle_changes:0,current_source_or_native_admission_reader_substitutions:0,actual_legacy_packed_native_or_floor_qualified:false,g11_claim:'not-passed'}};
}
export function inspectFixtureLifecycleRequalification(options={}){return validate(options).summary;}
/** Only authenticated old task-preservation callers receive pre167 ledger/test bytes. */
export function fixtureLifecycleParentReader(options={}){return validate(options).parent;}
/** These adapters preserve the original twelve/six-role task subjects. Current validators stay raw. */
export function ngZoneIntegrationParentReader({root=process.cwd(),read=defaultRead(root)}={}){return ngParent({root,read:fixtureLifecycleParentReader({root,read})});}
export function historicalRippleAuthoredReader({root=process.cwd(),read=defaultRead(root)}={}){return rippleParent({root,read:fixtureLifecycleParentReader({root,read})});}
/** Original fourteen-repair preservation assertions keep their explicit pre-requalification ledgers. */
export function inspectFixtureLifecycleDelta(root,{readSource}={}){
 // Legacy producer overrides are UTF-8 text; compressed authenticated capsules
 // must retain their raw bytes. Current-source validators use their own raw API.
 const read=p=>!readSource||p.endsWith('.gz')?readFileSync(join(root,p)):Buffer.from(readSource(p));
 return validate({root,read}).producer;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const mode=process.argv[2];assert.equal(process.argv.length,3);assert.ok(['--validated-parent','--qualification-parent'].includes(mode));
 const state=validate();
 if(mode==='--qualification-parent')process.stdout.write(JSON.stringify({ledger_preimages:state.prior.ledger_preimages,context_preimages:state.prior.context_preimages}));
 else{inspectNgEpoch({read:state.parent});const prior=ngPrior({read:state.parent});process.stdout.write(JSON.stringify({line:prior.line,ledger:prior.ledger,test_context_edits:prior.test_context_edits,prior_sha256:hash(state.parent('compatibility/rc/ng-zone-use-integration-prior.json.gz'))}));}
}
