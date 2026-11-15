/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four exact frozen forwardRef source successors, no native provider claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p),key=x=>JSON.stringify([x.file,x.module,x.symbol]);
const reviewPath='compatibility/f10/authored-use-reviews/forward-ref-current-3dd-successor.json',body=JSON.parse(read(reviewPath)),roster=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json'));
const old=JSON.parse(execFileSync('git',['--no-replace-objects','show','3dd03808bc6a5162eb7b64fef1e68ba0485f385d:compatibility/f10/authored-dependency-dispositions.json'],{maxBuffer:16*1024*1024}));
const prior=JSON.parse(read('compatibility/rc/forward-ref-minimum-source-diagnostic.json')),current=JSON.parse(read('compatibility/rc/forward-ref-current-3dd-diagnostic.json'));
const files=['legacy-checkbox/checkbox.ts','legacy-radio/radio.ts','legacy-slide-toggle/slide-toggle.ts','legacy-slider/slider.ts'];const expected=files.map(file=>key({file,module:'@angular/core',symbol:'forwardRef'})).sort(),rows=roster.symbol_uses.filter(x=>x.source_review?.path===reviewPath);assert.deepEqual(rows.map(key).sort(),expected);assert.deepEqual(body.reviews.map(key).sort(),expected);
for(const row of rows){const previous=old.symbol_uses.find(x=>key(x)===key(row));assert.ok(previous);assert.deepEqual({...row,source_review:previous.source_review},previous);const priorReview=JSON.parse(read(previous.source_review.path)).reviews.find(x=>key(x)===key(row));const before=prior.cases.find(x=>key(x)===key(row)),after=current.cases.find(x=>key(x)===key(row));assert.ok(before&&after);const norm=x=>JSON.stringify(x.references.map(({line,target_declaration_line,...rest})=>rest));assert.equal(norm(before),norm(after));assert.equal(hash(read('projects/ngx-material-legacy/'+row.file)),after.candidate_source_sha256);const transition=JSON.parse(read('compatibility/rc/framework-class-5628-transitions.json')).transitions.find(x=>x.file==='projects/ngx-material-legacy/'+row.file);assert.equal(transition.prior_sha256,priorReview.candidate_source_sha256);assert.equal(transition.current_sha256,after.candidate_source_sha256);}
assert.equal(current.cases.length,11);assert.equal(current.cases.flatMap(x=>x.references).length,12);assert.equal(current.mutations.length,19);
const run=(rs,line='main',reader=read)=>authoredUseReviewEvidence({symbol_uses:rs},line,reader,hash);assert.deepEqual(run(rows),{reviewed:4,insufficient:0,insufficient_uses:[]});assert.equal(run(rows,'21.x').insufficient,4);assert.equal(run([{...rows[0],symbol:'Wrong'}]).insufficient,1);assert.equal(run([rows[0]],'main',p=>p==='projects/ngx-material-legacy/'+rows[0].file?Buffer.from('wrong'):read(p)).insufficient,1);assert.equal(run([rows[0]],'main',p=>p==='compatibility/rc/forward-ref-current-3dd-diagnostic.json'?Buffer.from('wrong'):read(p)).insufficient,1);
console.log(JSON.stringify({selected:4,current_uses:11,callbacks:12,semantic_mutations:19,prior_roles_identical:true,source_only_result:true}));
