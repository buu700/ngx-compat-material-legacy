/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** The source-review validator is structural; semantic review is separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const path='compatibility/f10/authored-use-reviews/framework-lifecycle-4903-refresh.json';
const read=p=>readFileSync(p), review=read(path), body=JSON.parse(review);
const roster=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json'));
const rows=roster.symbol_uses.filter(x=>x.source_review?.path===path);
assert.equal(body.reviews.length,10);assert.equal(rows.length,10);
assert.equal(new Set(rows.map(x=>JSON.stringify([x.file,x.module,x.symbol]))).size,10);
const run=(rs,line='main',reader=read)=>authoredUseReviewEvidence({symbol_uses:rs},line,reader,hash);
const baseline=run(rows);assert.deepEqual(baseline,{reviewed:10,insufficient:0,insufficient_uses:[]});
assert.equal(run(rows,'21.x').insufficient,10);
assert.equal(run([{...rows[0],symbol:'Wrong'}]).insufficient,1);
assert.equal(run([rows[0]],'main',p=>p==='projects/ngx-material-legacy/'+rows[0].file?Buffer.from('wrong'):read(p)).insufficient,1);
assert.equal(run([rows[0]],'main',p=>p==='compatibility/rc/framework-lifecycle-4903-minimum.json'?Buffer.from('wrong'):read(p)).insufficient,1);
// Rehashed prose can pass structural identity. This must never be mistaken for
// runtime or G11 approval: this API emits only the three structural fields.
const altered=JSON.parse(review);altered.reviews[0].decision='Falsely claims G11 and runtime pass. '.repeat(4);
const bytes=Buffer.from(JSON.stringify(altered));
const changed=rows.map(row=>({...row,source_review:{path,sha256:hash(bytes)}}));
const result=run(changed,'main',p=>p===path?bytes:read(p));
assert.deepEqual(result,baseline);
assert.deepEqual(Object.keys(result).sort(),['insufficient','insufficient_uses','reviewed']);
console.log(JSON.stringify({selected:10,wrong_line:10,wrong_symbol:1,wrong_source:1,wrong_evidence:1,source_only_result:true,semantic_review_required:true}));
