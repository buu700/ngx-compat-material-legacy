/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
/** Compose the finite review into an output copy, never into the input ledger. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateCdkPureMainReview} from './authored-cdk-pure-main-review-validator.mjs';
const reportPath='compatibility/f10/authored-use-reviews/cdk-coercion-keycodes-main-5628-v1.json';
const key=r=>JSON.stringify([r.file,r.module,r.symbol]);
export function composeCdkPureMainReview({root,ledger,read=p=>readFileSync(join(root,p))}){
 validateCdkPureMainReview({root,read});const report=JSON.parse(read(reportPath)),digest=createHash('sha256').update(read(reportPath)).digest('hex');
 const result=structuredClone(ledger);assert.equal(result.line,'main');assert.equal(result.symbol_uses.length,1736);
 const entries=new Map();for(const row of result.symbol_uses){assert.ok(!entries.has(key(row)),'duplicate frozen use');entries.set(key(row),row);}
 for(const reviewed of report.reviews){const row=entries.get(key(reviewed));assert.ok(row,'selected use missing');
  if(row.source_review?.path===reportPath&&row.source_review.sha256===digest){
   const expected={...reviewed.preserved_prior_row,source_review:{path:reportPath,sha256:digest}};
   assert.deepEqual(row,expected,'selected use changed since review');continue;
  }
  assert.deepEqual(row,reviewed.preserved_prior_row,'selected use changed since review');row.source_review={path:reportPath,sha256:digest};
 }
 return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);assert.equal(args.length,4);assert.equal(args[0],'--ledger');assert.equal(args[2],'--out');
 const root=resolve(fileURLToPath(new URL('..',import.meta.url))),input=resolve(args[1]),output=resolve(args[3]);assert.notEqual(input,output);
 const ledger=JSON.parse(readFileSync(input));const result=composeCdkPureMainReview({root,ledger});writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
}
