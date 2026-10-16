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
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectPackedToolingEvidence} from '../scripts/chip-menu-tooltip-packed-evidence-requalification.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(resolve(root,p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const result=inspectPackedToolingEvidence({root});assert.equal(result.proof.unchanged_role_judgments.length,167);
assert.equal(result.reviewed,1446);assert.equal(result.current_reviewed,178);assert.equal(result.proof.new_role_or_SHA_closures,0);
const input='compatibility/rc/chip-menu-tooltip-packed-dependency-inputs.json',inputs=JSON.parse(read(input));
const controls=[];
for(const [id,path,change,expected]of [
 ['inputs',input,b=>Buffer.concat([b,Buffer.from(' ')]),/dependency input changed/],
 ['prior-reviews',inputs.prior.path,b=>Buffer.concat([b,Buffer.from(' ')]),/prior dependency archive changed/],
 ['focused-controls',inputs.evidence[1].path,b=>Buffer.concat([b,Buffer.from(' ')]),/focused tooling evidence changed/],
 ['changed-reviewed-probe','tests/generated_identity_packed_contract_probe.mjs',b=>Buffer.concat([b,Buffer.from('\n')]),/tooling source changed/],
 ['changed-product','projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts',b=>Buffer.concat([b,Buffer.from('\n')]),/product changed beyond tooling/],
 ['foreign-role-closure','compatibility/f10/authored-dependency-dispositions.json',b=>{const x=JSON.parse(b);x.symbol_uses.find(r=>r.disposition!=='closed').disposition='closed';return Buffer.from(JSON.stringify(x));},/live disposition drift/],
]){
 const original=read(path),bad=change(original);assert.notDeepEqual(bad,original);
 assert.throws(()=>inspectPackedToolingEvidence({root,readMember:p=>p===path?bad:read(p)}),expected,id);controls.push({id,rejected:true});
}
const reviewPath='compatibility/f10/authored-use-reviews/chip-menu-tooltip-packed-producer-requalified-boundaries.json';
const body=JSON.parse(result.writes.get(reviewPath));
for(const [id,mutate]of [
 ['missing-role',x=>x.reviews.pop()],['ambiguous-role',x=>x.reviews.push(x.reviews[0])],
 ['stale-product',x=>x.reviews[0].candidate_source_sha256='0'.repeat(64)],
 ['stale-tooling',x=>x.reviews[0].independent_evidence[0].sha256='0'.repeat(64)],
]){
 const doc=structuredClone(body);mutate(doc);const bytes=Buffer.from(JSON.stringify(doc));
 const candidate={symbol_uses:body.reviews.map(row=>({file:row.file,module:row.module,symbol:row.symbol,disposition:'closed',status:'reviewed',source_review:{path:reviewPath,sha256:hash(bytes)}}))};
 const evidence=authoredUseReviewEvidence(candidate,result.proof.line,p=>p===reviewPath?bytes:result.writes.get(p)||read(p),hash);
 assert.ok(evidence.insufficient>0,id);controls.push({id,rejected:true});
}
const report={schema_version:1,line:result.proof.line,existing_roles_requalified:167,unchanged_product_members:1141,
 negative_controls:controls,producer_sha256:hash(read('tests/chip_menu_tooltip_packed_evidence_probe.mjs')),
 source_checker_sha256:hash(read('scripts/chip-menu-tooltip-packed-evidence-requalification.mjs')),
 new_role_or_SHA_closures:0,actual_packed_or_native_or_floor_executed:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:result.proof.line,roles:167,negative_controls:controls.length,new_closures:0}));
