/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
/** Compose this finite review into an output copy only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateCdkPositionMainReview} from './authored-cdk-position-main-review-validator.mjs';
const path='compatibility/f10/authored-use-reviews/cdk-position-type-main-38ee-v1.json',key=r=>JSON.stringify([r.file,r.module,r.symbol]);
export function composeCdkPositionMainReview({root,ledger,read=p=>readFileSync(join(root,p))}){
 validateCdkPositionMainReview({root,read});const bytes=readFileSync(join(root,path)),report=JSON.parse(bytes),digest=createHash('sha256').update(bytes).digest('hex'),out=structuredClone(ledger);assert.equal(digest,'a710d34be32e80221d8f5194692dde2c9545ee0a06c7242fabb57051e48e0e29');assert.equal(out.line,'main');assert.equal(out.symbol_uses.length,1736);const rows=new Map();for(const r of out.symbol_uses){assert.ok(!rows.has(key(r)));rows.set(key(r),r)}
 for(const review of report.reviews){const row=rows.get(key(review));assert.ok(row,'selected row missing');const expected=structuredClone(review.preserved_prior_row);expected.source_review={path,sha256:digest};if(row.source_review?.path===path&&row.source_review.sha256===digest){assert.deepEqual(row,expected,'already-applied selected row changed');continue}assert.deepEqual(row,review.preserved_prior_row,'selected row changed');row.source_review={path,sha256:digest};}
 // Finish with a second full physical transaction; no callback runs afterward.
 validateCdkPositionMainReview({root,read});return out;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const a=process.argv.slice(2);assert.equal(a.length,4);assert.equal(a[0],'--ledger');assert.equal(a[2],'--out');const root=resolve(fileURLToPath(new URL('..',import.meta.url))),input=resolve(a[1]),out=resolve(a[3]);assert.notEqual(input,out);writeFileSync(out,JSON.stringify(composeCdkPositionMainReview({root,ledger:JSON.parse(readFileSync(input))}),null,2)+'\n',{flag:'wx'});}
