/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {validateCdkPureMainReview} from '../scripts/authored-cdk-pure-main-review-validator.mjs';
import {composeCdkPureMainReview} from '../scripts/apply-authored-cdk-pure-main-review.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),sha=b=>createHash('sha256').update(b).digest('hex'),ledger=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json'));
const reportPath='compatibility/f10/authored-use-reviews/cdk-coercion-keycodes-main-5628-v1.json',report=JSON.parse(read(reportPath)),key=r=>JSON.stringify([r.file,r.module,r.symbol]);
const selected=new Set(report.reviews.map(key)),rows=ledger.symbol_uses.filter(r=>selected.has(key(r)));assert.equal(rows.length,70);
assert.deepEqual(validateCdkPureMainReview({root,read}),{line:'main',rows:70,source_files:14,g11_claim:'not-passed'});
assert.deepEqual(authoredUseReviewEvidence({symbol_uses:rows},'main',read,sha),{reviewed:70,insufficient:0,insufficient_uses:[]});
assert.equal(authoredUseReviewEvidence({symbol_uses:rows},'21.x',read,sha).insufficient,70);
for(const [id,path] of [
 ['report',reportPath],
 ['prior-review',report.reviews[0].previous_source_review.path],
 ['current-source','projects/ngx-material-legacy/'+report.reviews[0].file],
 ['before-gzip',report.reviews[0].source_transition.before_gzip],
 ['source-transition',report.reviews[0].source_transition.transition],
 ['producer-evidence',report.reviews[0].independent_evidence[2].path],
 ['installed-peer','node_modules/@angular/cdk/fesm2022/coercion.mjs'],
]){
 const modified=p=>p===path?Buffer.concat([read(p),Buffer.from('mutation')]):read(p);
 assert.throws(()=>validateCdkPureMainReview({root,read:modified}),undefined,id+' was not rejected');
}
for(const bad of [
 {...rows[0],source_review:{...rows[0].source_review,sha256:'0'.repeat(64)}},
 {...rows[0],source_review:{...rows[0].source_review,path:'compatibility/f10/authored-use-reviews/missing.json'}},
 {...rows[0],symbol:'nonexistent'},
])assert.equal(authoredUseReviewEvidence({symbol_uses:[bad]},'main',p=>{try{return read(p)}catch{return null}},sha).insufficient,1);
// A compact packet cannot alter other frozen entries and retains each entire replaced row.
const previous=JSON.parse((await import('node:child_process')).execFileSync('git',['show','5628e94b86a477d285bf706fc42c67c059387a48:compatibility/f10/authored-dependency-dispositions.json'],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}));
assert.equal(ledger.symbol_uses.length,1736);const prior=new Map(previous.symbol_uses.map(r=>[key(r),r]));
// Compare every output against the actual composition input, not an older roster.
// The optional path lets the owner test its real current committed ledger.
const actualInput=process.env.CDK_COMPOSE_LEDGER ? JSON.parse(readFileSync(process.env.CDK_COMPOSE_LEDGER)) : ledger;
const composed=composeCdkPureMainReview({root,ledger:actualInput,read});
assert.deepEqual(Object.keys(composed),Object.keys(actualInput));
for(const field of Object.keys(actualInput))if(field!=='symbol_uses')assert.deepEqual(composed[field],actualInput[field]);
assert.deepEqual(composed.symbol_uses.map(key),actualInput.symbol_uses.map(key));
for(let i=0;i<composed.symbol_uses.length;i++){
 const row=composed.symbol_uses[i],input=actualInput.symbol_uses[i];
 if(selected.has(key(row))){
  const rr=report.reviews.find(v=>key(v)===key(row));assert.deepEqual(rr.preserved_prior_row,prior.get(key(row)));
  const expected=structuredClone(input);expected.source_review=row.source_review;assert.deepEqual(row,expected);
 }else assert.deepEqual(row,input);
}
assert.deepEqual(composeCdkPureMainReview({root,ledger:composed,read}),composed);
for(const input of [previous,composed]){
 const conflicting=structuredClone(input);conflicting.symbol_uses.find(r=>selected.has(key(r))).disposition='open';assert.throws(()=>composeCdkPureMainReview({root,ledger:conflicting,read}),/selected use changed since review/);
}
console.log(JSON.stringify({rows:70,other_frozen_rows_preserved:1666,actual_ledger_supplied:Boolean(process.env.CDK_COMPOSE_LEDGER),main_positive:true,wrong_line_rejected:true,selected_mutation_controls:2,mutation_controls:11,g11_claim:'not-passed'}));
