/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One exact current role, with independent evidence and historic wrapper preserved. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root=process.cwd(),overlay=process.env.SELECT_INJECTOR_PROOF_OVERLAY;
const physical=p=>readFileSync(join(root,p));
const read=p=>overlay&&existsSync(join(overlay,p))?readFileSync(join(overlay,p)):physical(p);
const hash=x=>createHash('sha256').update(x).digest('hex');
const git=(commit,p)=>execFileSync('git',['--no-replace-objects','show',commit+':'+p],{cwd:root,env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'},maxBuffer:16*1024*1024});
const ledgerPath='compatibility/f10/authored-dependency-current-dispositions.json',oldPath='compatibility/f10/authored-use-reviews/current-select-render-replay-source-v1.json',wrapper='tests/test_select_render_runtime.py',archive='compatibility/rc/current-select-injector-prior-wrapper-v1.txt';
const key=r=>r.file==='legacy-select/internal/after-select-render.ts'&&r.module==='@angular/core'&&r.symbol==='Injector';
const ledger=JSON.parse(read(ledgerPath)), rows=ledger.symbol_uses.filter(key);assert.equal(rows.length,1);const row=rows[0];
const original=git('3be4d6b7aa54e97ee6622bc869d564313f1f7743',ledgerPath),prior=JSON.parse(original),oldRows=prior.symbol_uses.filter(key);assert.equal(oldRows.length,1);
assert.deepEqual(row.prior_select_injector_wrapper_successor_row,oldRows[0]);
const restored=structuredClone(ledger);restored.symbol_uses[restored.symbol_uses.findIndex(key)]=oldRows[0];assert.equal(JSON.stringify(restored,null,2)+'\n',original.toString(),'unselected rows or ledger metadata changed');
assert.ok(read(archive).equals(git('5b36c449ea6d950ba7317cd0696cd3da1632f44d',wrapper)));
assert.ok(read(wrapper).equals(git('04daa4f8c0617be2ea1a93cbfca06cedf30da3ab',wrapper)));
assert.equal(hash(read(archive)),'ffa4cb27f5c41371cd46c239cb742ece200bc3cda8715e7d547b0fb39e9eaeeb');assert.equal(hash(read(wrapper)),'c5a95f8cd6f5490a893fdd20a2252524518445fcc60d57a1669af5561c448f08');
const review=JSON.parse(read(row.source_review.path)),record=review.reviews[0];assert.deepEqual(record.prior_review_record,JSON.parse(read(oldPath)).reviews.find(key));assert.equal(record.prior_source_review.sha256,hash(read(oldPath)));
const observe=(reader,line='main',value=row)=>authoredUseReviewEvidence({symbol_uses:[value]},line,reader,hash);
assert.deepEqual(observe(read),{reviewed:1,insufficient:0,insufficient_uses:[]});
const paths=new Set([row.source_review.path,'projects/ngx-material-legacy/'+row.file,...record.independent_evidence.map(e=>e.path)]);for(const path of paths){const result=observe(p=>p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p));assert.equal(result.insufficient,1,'tamper accepted '+path);}
assert.equal(observe(read,'21.x').insufficient,1);
assert.equal(authoredUseReviewEvidence({symbol_uses:ledger.symbol_uses},'main',read,hash).insufficient,0);
console.log(JSON.stringify({role:'select Injector',positive:1,unique_evidence_mutations_rejected:paths.size,wrong_line_rejected:true,other_rows_and_metadata_byte_preserved:true,prior_review_and_wrapper_preserved:true,admission_or_g11_claim:false}));
