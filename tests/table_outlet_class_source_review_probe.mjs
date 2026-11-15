/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact six-row generic evidence checks, not physical-owner or runtime qualification. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {authoredUseInventory,authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(resolve(root,p));
const rosterPath='compatibility/f10/authored-dependency-dispositions.json',reviewPath='compatibility/f10/authored-use-reviews/table-outlet-class-source-v1.json';
const roster=JSON.parse(read(rosterPath)),review=JSON.parse(read(reviewPath)),old=JSON.parse(execFileSync('git',['--no-replace-objects','show','38ee8359c688c039c6ae1db858f11282241d53ff:'+rosterPath],{cwd:root,maxBuffer:16*1024*1024}));
const pairs=[['@angular/cdk/table','HeaderRowOutlet'],['@angular/cdk/table','DataRowOutlet'],['@angular/cdk/table','NoDataRowOutlet'],['@angular/cdk/table','FooterRowOutlet'],['@angular/core','Component'],['@angular/core','Directive']];
const key=r=>JSON.stringify([r.file,r.module,r.symbol]),expected=pairs.map(([module,symbol])=>({file:'legacy-table/table.ts',module,symbol})),ids=new Set(expected.map(key));
assert.equal(ids.size,6);assert.deepEqual(review.reviews.map(key).sort(),[...ids].sort());
const selected=roster.symbol_uses.filter(r=>ids.has(key(r)));assert.equal(selected.length,6);
let changed=0;
for(const after of selected){
 const found=old.symbol_uses.filter(r=>key(r)===key(after));assert.equal(found.length,1);const before=found[0];
 changed++;const {source_review:br,source_review_history:bh,...beforeOther}=before,{source_review:ar,source_review_history:ah,...afterOther}=after;
 assert.deepEqual(afterOther,beforeOther);assert.deepEqual(ah.slice(0,-1),bh??[]);assert.deepEqual(ah.at(-1).prior_source_review,br);
 assert.equal(ar.path,reviewPath);assert.equal(ar.sha256,hash(read(reviewPath)));assert.equal(ar.bytes,read(reviewPath).length);
 const prior=review.reviews.find(r=>key(r)===key(before));assert.deepEqual(prior.prior_complete_case,JSON.parse(read(br.path)).reviews.find(r=>key(r)===key(before)));assert.deepEqual(prior.prior_review,br);
}
assert.equal(changed,6);assert.ok(authoredUseInventory(expected,{symbol_uses:selected}).complete);
const run=(rows=selected,reader=read)=>authoredUseReviewEvidence({symbol_uses:rows},'main',reader,hash);
assert.equal(run().reviewed,6);assert.equal(run().insufficient,0);
for(const p of ['projects/ngx-material-legacy/legacy-table/table.ts','tests/test_class_decorator_uses.py','compatibility/rc/class-decorator-current-5628-diagnostic-v4.json','compatibility/f10/authored-use-reviews/metadata-current-profile-requalified-boundaries.json']){
 const altered=Buffer.concat([read(p),Buffer.from('\nfixture mutation\n')]);assert.equal(run(selected,n=>n===p?altered:read(n)).insufficient,6,p);assert.equal(run().insufficient,0);
}
const modified=structuredClone(review);modified.reviews.push(structuredClone(modified.reviews[0]));const bytes=Buffer.from(JSON.stringify(modified));const rows=structuredClone(selected);for(const row of rows)row.source_review.sha256=hash(bytes);
const duplicate=run(rows,n=>n===reviewPath?bytes:read(n));assert.equal(duplicate.insufficient,1);assert.equal(duplicate.insufficient_uses[0].symbol,review.reviews[0].symbol);
assert.equal(authoredUseInventory(expected,{symbol_uses:[...selected,selected[0]]}).complete,false);
assert.equal(authoredUseInventory(expected,{symbol_uses:selected.slice(1)}).complete,false);
const foreign=structuredClone(selected);foreign[0].symbol='not-a-reviewed-outlet';assert.equal(authoredUseInventory(expected,{symbol_uses:foreign}).complete,false);
console.log(JSON.stringify({rows:6,source_only:true,positive:true,mutation_targets:4,duplicate_review_rejected:true,duplicate_missing_foreign_roster_rejected:true,physical_owner_exercised:false,runtime_or_g11_claim:false}));
