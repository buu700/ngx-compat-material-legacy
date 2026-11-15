/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Structural source review and authentic complete source transitions. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const path='compatibility/f10/authored-use-reviews/element-ref-current-5628-refresh.json';
const read=p=>readFileSync(p), review=read(path), body=JSON.parse(review);
const roster=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json'));
const rows=roster.symbol_uses.filter(x=>x.source_review?.path===path);
assert.equal(body.reviews.length,12);assert.equal(rows.length,12);
assert.equal(new Set(rows.map(x=>JSON.stringify([x.file,x.module,x.symbol]))).size,12);
const run=(rs,line='main',reader=read)=>authoredUseReviewEvidence({symbol_uses:rs},line,reader,hash);
const baseline=run(rows);assert.deepEqual(baseline,{reviewed:12,insufficient:0,insufficient_uses:[]});
assert.equal(run(rows,'21.x').insufficient,12);
assert.equal(run([{...rows[0],symbol:'Wrong'}]).insufficient,1);
assert.equal(run([rows[0]],'main',p=>p==='projects/ngx-material-legacy/'+rows[0].file?Buffer.from('wrong'):read(p)).insufficient,1);
assert.equal(run([rows[0]],'main',p=>p==='compatibility/rc/framework-class-5628-minimum.json'?Buffer.from('wrong'):read(p)).insufficient,1);
const altered=JSON.parse(review);altered.reviews[0].decision='Falsely claims G11 and runtime pass. '.repeat(4);
const bytes=Buffer.from(JSON.stringify(altered)),changed=rows.map(row=>({...row,source_review:{path,sha256:hash(bytes)}}));
const result=run(changed,'main',p=>p===path?bytes:read(p));assert.deepEqual(result,baseline);
assert.deepEqual(Object.keys(result).sort(),['insufficient','insufficient_uses','reviewed']);
const transition=JSON.parse(read('compatibility/rc/framework-class-5628-transitions.json'));
assert.equal(transition.transitions.length,14);
const git=(...args)=>execFileSync('git',['--no-replace-objects',...args],{env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'}});
for(const x of transition.transitions){
  assert.equal(x.prior_commit,'6eae6ac87f20e85d78166be94fa49913d608cf86');
  assert.equal(x.current_commit,'5628e94b86a477d285bf706fc42c67c059387a48');
  assert.equal(hash(git('show',x.prior_commit+':'+x.file)),x.prior_sha256);
  assert.equal(hash(git('show',x.current_commit+':'+x.file)),x.current_sha256);
  assert.equal(hash(read(x.file)),x.current_sha256);
  const diff=git('diff','--no-ext-diff','--no-renames',x.prior_commit,x.current_commit,'--',x.file);
  assert.equal(hash(diff),x.full_diff_sha256);assert.equal(diff.toString(),x.full_diff);
}
console.log(JSON.stringify({selected:12,transitions:14,wrong_line:12,wrong_symbol:1,wrong_source:1,wrong_evidence:1,source_only_result:true,semantic_review_required:true}));
