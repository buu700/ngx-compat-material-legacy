/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Historical 5628 identity followed by exact f9 source-only successor. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p),git=(...a)=>execFileSync('git',['--no-replace-objects',...a],{env:{...process.env,GIT_NO_LAZY_FETCH:'1'},maxBuffer:16*1024*1024}),key=x=>JSON.stringify([x.file,x.module,x.symbol]);
const file='projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox.ts',prior=JSON.parse(git('show','8e2c49b8e1ed39fbac29627aecf845da3ca2a9fd:compatibility/f10/authored-dependency-dispositions.json')),now=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json')),path='compatibility/f10/authored-use-reviews/pseudo-property-f9-successor.json',body=JSON.parse(read(path)),oldPath='compatibility/f10/authored-use-reviews/property-decorator-current-5628-refresh.json';
const run=(rs,line='main',reader=read)=>authoredUseReviewEvidence({symbol_uses:rs},line,reader,hash),oldRows=prior.symbol_uses.filter(x=>x.source_review?.path===oldPath),historical=git('show','5628e94b86a477d285bf706fc42c67c059387a48:'+file);assert.equal(oldRows.length,19);assert.deepEqual(run(oldRows,'main',p=>p===file?historical:read(p)),{reviewed:19,insufficient:0,insufficient_uses:[]});
const historicalRead=p=>p===file?historical:read(p);
assert.equal(run(oldRows,'21.x',historicalRead).insufficient,19);
assert.equal(run([{...oldRows[0],symbol:'Wrong'}],'main',historicalRead).insufficient,1);
assert.equal(run([oldRows[0]],'main',p=>p==='projects/ngx-material-legacy/'+oldRows[0].file?Buffer.from('wrong'):historicalRead(p)).insufficient,1);
assert.equal(run([oldRows[0]],'main',p=>p==='compatibility/rc/framework-class-5628-minimum.json'?Buffer.from('wrong'):historicalRead(p)).insufficient,1);
const historicReview=JSON.parse(read(oldPath));historicReview.reviews[0].decision='Falsely claims G11 and runtime pass. '.repeat(4);const hb=Buffer.from(JSON.stringify(historicReview));const hr=oldRows.map(row=>({...row,source_review:{path:oldPath,sha256:hash(hb)}}));assert.deepEqual(run(hr,'main',p=>p===oldPath?hb:historicalRead(p)),run(oldRows,'main',historicalRead));
const liveOld=oldRows.map(old=>{const x=now.symbol_uses.filter(y=>key(old)===key(y));assert.equal(x.length,1);return x[0]});
assert.deepEqual(run(liveOld),{reviewed:19,insufficient:0,insufficient_uses:[]});assert.equal(run(liveOld,'21.x').insufficient,19);
assert.equal(run([{...liveOld[0],symbol:'Wrong'}]).insufficient,1);assert.equal(run([liveOld[0]],'main',p=>p==='projects/ngx-material-legacy/'+liveOld[0].file?Buffer.from('wrong'):read(p)).insufficient,1);
assert.equal(run([liveOld[0]],'main',p=>p===liveOld[0].source_review.path?Buffer.from('wrong'):read(p)).insufficient,1);

const oldTransitions=JSON.parse(read('compatibility/rc/framework-class-5628-transitions.json'));assert.equal(oldTransitions.transitions.length,14);for(const t of oldTransitions.transitions){assert.equal(hash(git('show',t.prior_commit+':'+t.file)),t.prior_sha256);assert.equal(hash(git('show',t.current_commit+':'+t.file)),t.current_sha256);assert.equal(hash(t.file===file?historical:read(t.file)),t.current_sha256);const diff=git('diff','--no-ext-diff','--no-renames',t.prior_commit,t.current_commit,'--',t.file);assert.equal(hash(diff),t.full_diff_sha256);assert.equal(diff.toString(),t.full_diff)}
const names=['ChangeDetectionStrategy','Component','Input','ViewEncapsulation'],selected=body.reviews.map(key);assert.equal(selected.length,4);assert.equal(new Set(selected).size,4);
const expected=names.map(symbol=>key({file:file.slice('projects/ngx-material-legacy/'.length),module:'@angular/core',symbol})).sort();assert.deepEqual([...selected].sort(),expected);
function exactSelected(current){for(const k of selected){const a=prior.symbol_uses.filter(x=>key(x)===k),b=current.symbol_uses.filter(x=>key(x)===k);assert.equal(a.length,1);assert.equal(b.length,1);assert.deepEqual({...b[0],source_review:a[0].source_review},a[0]);assert.equal(b[0].source_review.sha256,hash(read(path)));assert.deepEqual(body.reviews.find(x=>key(x)===k).prior_source_review,a[0].source_review)}}
exactSelected(now);const unrelated=structuredClone(now);const other=unrelated.symbol_uses.find(x=>!selected.includes(key(x)));other.disposition='independent-authorized-change';exactSelected(unrelated);
const ts=JSON.parse(read('compatibility/rc/pseudo-property-f9-transitions.json'));assert.equal(ts.transitions.length,4);assert.deepEqual(ts.transitions.map(x=>x.symbol).sort(),names.sort());for(const t of ts.transitions){assert.equal(hash(git('show',t.prior_commit+':'+file)),t.prior_sha256);assert.equal(hash(git('show',t.current_commit+':'+file)),t.current_sha256);assert.equal(hash(read(file)),t.current_sha256);const d=git('diff','--no-ext-diff','--no-renames',t.prior_commit,t.current_commit,'--',file);assert.equal(hash(d),t.full_diff_sha256);assert.equal(d.toString(),t.full_diff)}
const rows=now.symbol_uses.filter(x=>selected.includes(key(x)));assert.deepEqual(run(rows),{reviewed:4,insufficient:0,insufficient_uses:[]});assert.equal(run(rows,'21.x').insufficient,4);assert.equal(run([{...rows[0],symbol:'Wrong'}]).insufficient,1);assert.equal(run([rows[0]],'main',p=>p===file?Buffer.from('wrong'):read(p)).insufficient,1);assert.equal(run([rows[0]],'main',p=>p==='compatibility/rc/property-decorators-f9-diagnostic.json'?Buffer.from('wrong'):read(p)).insufficient,1);
const altered=JSON.parse(read(path));altered.reviews[0].decision='Unsupported runtime and G11 claim. '.repeat(4);const bytes=Buffer.from(JSON.stringify(altered)),rewritten=rows.map(r=>({...r,source_review:{path,sha256:hash(bytes)}}));assert.deepEqual(run(rewritten,'main',p=>p===path?bytes:read(p)),run(rows));console.log(JSON.stringify({selected:4,transitions:14,historical_reviewed:19,live_reviewed:19,independent_change_accepted:true,wrong_line:4,wrong_symbol:1,wrong_source:1,wrong_evidence:1,source_only_result:true,semantic_review_required:true}));
