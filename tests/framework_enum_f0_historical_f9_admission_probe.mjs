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
const path='compatibility/f10/authored-use-reviews/framework-enum-f0-refresh.json';
const pseudo='projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox.ts';
const oldSource=execFileSync('git',['--no-replace-objects','show','072f4c859af66724ee26621ad0f97d41043f3af2:'+pseudo]);
const read=p=>p===pseudo?oldSource:readFileSync(p), review=read(path), body=JSON.parse(review);
const roster=JSON.parse(execFileSync('git',['--no-replace-objects','show','8e2c49b8e1ed39fbac29627aecf845da3ca2a9fd:compatibility/f10/authored-dependency-dispositions.json'],{maxBuffer:16*1024*1024}));
const rows=roster.symbol_uses.filter(x=>x.source_review?.path===path);
assert.equal(body.reviews.length,24);assert.equal(rows.length,24);
assert.equal(new Set(rows.map(x=>JSON.stringify([x.file,x.module,x.symbol]))).size,24);
const run=(rs,line='main',reader=read)=>authoredUseReviewEvidence({symbol_uses:rs},line,reader,hash);
const baseline=run(rows);assert.deepEqual(baseline,{reviewed:24,insufficient:0,insufficient_uses:[]});
// Historical checks below use the authentic previous source. Independently
// admit every same key through its actual live review and actual source bytes.
const currentRoster=JSON.parse(readFileSync('compatibility/f10/authored-dependency-dispositions.json'));
const k=x=>JSON.stringify([x.file,x.module,x.symbol]);
const live=rows.map(old=>{const found=currentRoster.symbol_uses.filter(x=>k(x)===k(old));assert.equal(found.length,1);return found[0]});
const physical=p=>readFileSync(p);
assert.deepEqual(run(live,'main',physical),{reviewed:24,insufficient:0,insufficient_uses:[]});
assert.equal(run(live,'21.x',physical).insufficient,24);
assert.equal(run([{...live[0],symbol:'Wrong'}],'main',physical).insufficient,1);
assert.equal(run([live[0]],'main',p=>p==='projects/ngx-material-legacy/'+live[0].file?Buffer.from('wrong'):physical(p)).insufficient,1);
assert.equal(run([live[0]],'main',p=>p===live[0].source_review.path?Buffer.from('wrong'):physical(p)).insufficient,1);

assert.equal(run(rows,'21.x').insufficient,24);
assert.equal(run([{...rows[0],symbol:'Wrong'}]).insufficient,1);
assert.equal(run([rows[0]],'main',p=>p==='projects/ngx-material-legacy/'+rows[0].file?Buffer.from('wrong'):read(p)).insufficient,1);
assert.equal(run([rows[0]],'main',p=>p==='compatibility/rc/framework-enum-f0-minimum.json'?Buffer.from('wrong'):read(p)).insufficient,1);
const altered=JSON.parse(review);altered.reviews[0].decision='Falsely claims G11 and runtime pass. '.repeat(4);
const bytes=Buffer.from(JSON.stringify(altered)),changed=rows.map(row=>({...row,source_review:{path,sha256:hash(bytes)}}));
const result=run(changed,'main',p=>p===path?bytes:read(p));assert.deepEqual(result,baseline);
assert.deepEqual(Object.keys(result).sort(),['insufficient','insufficient_uses','reviewed']);
const transition=JSON.parse(read('compatibility/rc/framework-enum-f0-transitions.json'));
assert.equal(transition.transitions.length,12);
const git=(...args)=>execFileSync('git',['--no-replace-objects',...args],{env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'}});
for(const x of transition.transitions){
  assert.equal(x.prior_commit,'6eae6ac87f20e85d78166be94fa49913d608cf86');
  assert.equal(x.current_commit,'f0c58caa7dd2e7a9615f0f06e113cae87de4befa');
  assert.equal(hash(git('show',x.prior_commit+':'+x.file)),x.prior_sha256);
  assert.equal(hash(git('show',x.current_commit+':'+x.file)),x.current_sha256);
  assert.equal(hash(read(x.file)),x.current_sha256);
  const diff=git('diff','--no-ext-diff','--no-renames',x.prior_commit,x.current_commit,'--',x.file);
  assert.equal(hash(diff),x.full_diff_sha256);assert.equal(diff.toString(),x.full_diff);
}
console.log(JSON.stringify({selected:24,transitions:12,wrong_line:24,wrong_symbol:1,wrong_source:1,wrong_evidence:1,historical_subject:true,live_reviewed:24,source_only_result:true,semantic_review_required:true}));
