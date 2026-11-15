/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite enum wrapper successor, not component or G11 approval. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p);
const key=x=>JSON.stringify([x.file,x.module,x.symbol]);
const reviewPath='compatibility/f10/authored-use-reviews/framework-enum-wrapper-1b-successor.json';
const body=JSON.parse(read(reviewPath)), roster=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json'));
const prior=JSON.parse(execFileSync('git',['--no-replace-objects','show','1b12284da050b0e69d3fa22ce01fb527f78a3504:compatibility/f10/authored-dependency-dispositions.json'],{maxBuffer:16*1024*1024}));
const diag=JSON.parse(read('compatibility/rc/framework-enum-wrapper-1b-diagnostic.json'));
const files=['legacy-dialog/dialog-container.ts','legacy-menu/menu.ts','legacy-chips/chip-list.ts','legacy-select/select.ts','legacy-autocomplete/autocomplete.ts','legacy-snack-bar/snack-bar-container.ts','legacy-snack-bar/simple-snack-bar.ts','legacy-list/list.ts','legacy-list/selection-list.ts','legacy-tabs/tab.ts','legacy-table/table.ts','legacy-table/text-column.ts','legacy-tabs/internal/tab-base.ts','legacy-core/option/option.ts','legacy-core/option/optgroup.ts','legacy-core/option/option-base.ts','legacy-dialog/testing/dialog-opener.ts'];
const expected=files.flatMap(file=>['ChangeDetectionStrategy','ViewEncapsulation'].map(symbol=>key({file,module:'@angular/core',symbol}))).sort();
assert.equal(body.reviews.length,34);assert.deepEqual(body.reviews.map(key).sort(),expected);
const rows=roster.symbol_uses.filter(r=>r.source_review?.path===reviewPath);assert.deepEqual(rows.map(key).sort(),expected);
for(const row of rows){
  const old=prior.symbol_uses.filter(x=>key(x)===key(row));assert.equal(old.length,1);
  assert.deepEqual({...row,source_review:old[0].source_review},old[0]);
  const oldBytes=read(old[0].source_review.path);assert.equal(hash(oldBytes),old[0].source_review.sha256);
  const reviewed=JSON.parse(oldBytes).reviews.filter(x=>key(x)===key(row));assert.equal(reviewed.length,1);
  const oldReview=reviewed[0],source=read('projects/ngx-material-legacy/'+row.file);
  assert.equal(hash(source),oldReview.candidate_source_sha256);
  const stale=oldReview.independent_evidence.filter(x=>hash(read(x.path))!==x.sha256);
  assert.deepEqual(stale.map(x=>x.path),['tests/test_class_decorator_uses.py']);
  const current=diag.cases.filter(x=>key(x)===key(row));assert.equal(current.length,1);assert.equal(current[0].candidate_source_sha256,hash(source));
  if(current[0].references.length===0)assert.equal(current[0].unused_import_erasure.original_emit_sha256,current[0].unused_import_erasure.erased_emit_sha256);
  else assert.ok(current[0].references.every(x=>['OnPush','Eager','None'].includes(x.member)));
}
assert.equal(diag.cases.length,76);assert.equal(diag.mutations.length,26);
const classReport=JSON.parse(read('compatibility/rc/class-decorator-current-5628-diagnostic-v4.json'));
assert.equal(classReport.current_uses,126);assert.equal(classReport.retired_frozen_uses.length,24);assert.equal(classReport.g11_claim,'not-passed');
const run=(rs,line='main',reader=read)=>authoredUseReviewEvidence({symbol_uses:rs},line,reader,hash);
assert.deepEqual(run(rows),{reviewed:34,insufficient:0,insufficient_uses:[]});assert.equal(run(rows,'21.x').insufficient,34);
assert.equal(run([{...rows[0],symbol:'Wrong'}]).insufficient,1);
assert.equal(run([rows[0]],'main',p=>p==='projects/ngx-material-legacy/'+rows[0].file?Buffer.from('wrong'):read(p)).insufficient,1);
assert.equal(run([rows[0]],'main',p=>p==='compatibility/rc/framework-enum-wrapper-1b-diagnostic.json'?Buffer.from('wrong'):read(p)).insufficient,1);
const altered=JSON.parse(read(reviewPath));altered.reviews[0].decision='Falsely claims runtime and G11 pass. '.repeat(4);const bytes=Buffer.from(JSON.stringify(altered));const changed=rows.map(row=>({...row,source_review:{path:reviewPath,sha256:hash(bytes)}}));assert.deepEqual(run(changed,'main',p=>p===reviewPath?bytes:read(p)),run(rows));
console.log(JSON.stringify({selected:34,prior_sources_verified:34,prior_wrapper_only_stale:34,enum_uses:76,semantic_mutations:26,wrong_line:34,wrong_symbol:1,wrong_source:1,wrong_evidence:1,structural_output_only:true,semantic_review_required:true}));
