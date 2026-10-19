/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {fixtureLifecycleRequalificationPrior,inspectFixtureLifecycleRequalification,fixtureLifecycleParentReader} from '../scripts/fixture-lifecycle-requalification.mjs';
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),key=r=>JSON.stringify([r.file,r.module,r.symbol]);
const prior=fixtureLifecycleRequalificationPrior(),good=inspectFixtureLifecycleRequalification(),parent=fixtureLifecycleParentReader(),controls=[];
const inputs=JSON.parse(read('compatibility/rc/fixture-lifecycle-requalification-inputs.json'));
for(const m of [...prior.ledger_preimages,...prior.context_preimages])assert.equal(parent(m.path).toString(),m.text);
for(const m of inputs.producer_deltas)assert.equal(parent(m.path).equals(read(m.path)),true,'runtime producer bytes must stay current');
const selectedKeys=new Set(prior.selected.map(key)),all=prior.ledger_preimages.flatMap(m=>JSON.parse(read(m.path)).symbol_uses),selected={symbol_uses:all.filter(r=>selectedKeys.has(key(r)))};
assert.deepEqual(authoredUseReviewEvidence(selected,prior.line,read,hash),{reviewed:167,insufficient:0,insufficient_uses:[]});
function rejected(id,path,bytes){const altered=p=>p===path?bytes:read(p);assert.throws(()=>inspectFixtureLifecycleRequalification({read:altered}),id);controls.push(id);}
const frozen=prior.ledger_preimages[0].path,additional=prior.ledger_preimages[1].path;
for(const [id,path,mutate]of [
 ['old-frozen-review-pointer',frozen,b=>b.symbol_uses.find(r=>selectedKeys.has(key(r))).source_review={path:prior.review_preimage.path,sha256:prior.review_preimage.sha256}],
 ['wrong-source-review-seal',frozen,b=>b.symbol_uses.find(r=>selectedKeys.has(key(r))).source_review.sha256='0'.repeat(64)],
 ['reopen-reviewed-use',frozen,b=>b.symbol_uses.find(r=>selectedKeys.has(key(r))).disposition='open'],
 ['unrelated-row-change',frozen,b=>b.symbol_uses.find(r=>!selectedKeys.has(key(r))).symbol+='_changed'],
 ['wrong-reviewed-count',frozen,b=>b.reviewed_uses++],
 ['missing-frozen-row',frozen,b=>b.symbol_uses.pop()],
 ['old-added-review-pointer',additional,b=>b.symbol_uses.find(r=>selectedKeys.has(key(r))).source_review={path:prior.review_preimage.path,sha256:prior.review_preimage.sha256}],
 ['wrong-added-count',additional,b=>b.open_uses--],
 ['changed-original-conclusion',inputs.new_review.path,b=>b.reviews[0].conclusion='test-only'],
 ['changed-original-decision',inputs.new_review.path,b=>b.reviews[0].decision+=' grant native qualification'],
 ['changed-candidate-source',inputs.new_review.path,b=>b.reviews[0].candidate_source_sha256='0'.repeat(64)],
 ['missing-independent-evidence',inputs.new_review.path,b=>b.reviews[0].independent_evidence.pop()],
 ['wrong-review-line',inputs.new_review.path,b=>b.line=b.line==='main'?'21.x':'main'],
 ['fabricated-execution',inputs.qualification.path,b=>b.fresh_execution_claimed=true],
]){const body=JSON.parse(read(path));mutate(body);rejected(id,path,Buffer.from(JSON.stringify(body,null,2)+'\n'));}
for(const path of [...inputs.producer_deltas.map(m=>m.path),...inputs.context_edits.map(m=>m.path),
 prior.review_preimage.path,'compatibility/rc/fixture-lifecycle-requalification-inputs.json',
 'compatibility/rc/fixture-lifecycle-requalification-prior.json.gz','compatibility/rc/fixture-lifecycle-public-types.json',
 inputs.common_evidence[1].path,'projects/ngx-material-legacy/'+prior.selected[0].file,
 'compatibility/f10/disposition-ledger/ledger.json'])rejected('changed-bound-member:'+path,path,Buffer.concat([read(path),Buffer.from('\n')]));
assert.equal(controls.length,34);
const result={...good,current_selected_canonical_reviewed:167,current_selected_canonical_insufficient:0,rejection_controls:controls.length,controls,historical_parent_preserves_new_runtime_producer_bytes:true,all_original_conclusions_and_decisions_preserved:true,actual_legacy_packed_native_or_floor_qualified:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:prior.line,requalified:167,new_closures:0,rejection_controls:controls.length,canonical_insufficient:0,actual_legacy_packed_native_or_floor_qualified:false}));
