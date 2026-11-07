/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.env.MENU_BASE_ROOT || '.'), candidate=resolve(process.env.MENU_CANDIDATE_ROOT || root);
const {authoredUseReviewEvidence, authoredUseInventory}=await import(pathToFileURL(join(root,'scripts/authored-use-inventory.mjs')).href);
const path='compatibility/f10/authored-dependency-dispositions.json', target='legacy-menu/internal/menu-trigger-base.ts', reviewPath='compatibility/f10/authored-use-reviews/menu-main-post-di-per-use-v1.json', context='compatibility/f10/authored-use-reviews/menu-main-post-di-context-v1.json',source='projects/ngx-material-legacy/'+target;
const hash=x=>createHash('sha256').update(x).digest('hex'), base=p=>readFileSync(join(root,p));
const read=p=>existsSync(join(candidate,p))?readFileSync(join(candidate,p)):base(p);
const fresh=JSON.parse(read(path)), review=JSON.parse(read(reviewPath));
const old=structuredClone(fresh);for(let i=0;i<old.symbol_uses.length;i++){const row=old.symbol_uses[i];if(row.file===target){const original=review.reviews.find(r=>r.file===row.file&&r.module===row.module&&r.symbol===row.symbol);assert.ok(original);old.symbol_uses[i]=structuredClone(original.previous_ledger_record_complete);}}
if(candidate!==root) assert.deepEqual(old,JSON.parse(base(path)));
const key=r=>JSON.stringify([r.file,r.module,r.symbol]);
assert.equal(old.symbol_uses.length,1736);assert.equal(fresh.symbol_uses.length,1736);
assert.deepEqual(fresh.symbol_uses.map(key),old.symbol_uses.map(key));
assert.deepEqual({...fresh,symbol_uses:[]},{...old,symbol_uses:[]});
const indices=old.symbol_uses.map((r,i)=>r.file===target?i:-1).filter(i=>i>=0);assert.equal(indices.length,41);
const selected=new Set(indices);assert.deepEqual(old.symbol_uses.filter((_,i)=>!selected.has(i)),fresh.symbol_uses.filter((_,i)=>!selected.has(i)));
assert.equal(review.reviews.length,41);assert.deepEqual(new Set(review.reviews.map(key)),new Set(indices.map(i=>key(old.symbol_uses[i]))));
for(const i of indices){const prior=old.symbol_uses[i],row=fresh.symbol_uses[i],r=review.reviews.find(x=>key(x)===key(prior));assert.deepEqual(r.previous_ledger_record_complete,prior);const body=JSON.parse(base(prior.source_review.path));assert.deepEqual(r.previous_review_complete,body.reviews.find(x=>key(x)===key(prior)));const clone=structuredClone(row);clone.source_review=prior.source_review;clone.source_review_history=clone.source_review_history.slice(0,-1);if(!('source_review_history' in prior))delete clone.source_review_history;assert.deepEqual(clone,prior);assert.equal(row.source_review.path,reviewPath);}
assert.equal(review.reviews.filter(r=>r.conclusion==='stable-public-peer').length,37);assert.equal(review.reviews.filter(r=>r.conclusion==='owned-replacement').length,3);assert.equal(review.reviews.filter(r=>r.conclusion==='removed-use').length,1);
const inventory=authoredUseInventory(old.symbol_uses,fresh);assert.equal(inventory.complete,true);assert.equal(inventory.open,old.symbol_uses.filter(r=>r.status!=='reviewed'||r.disposition!=='closed').length);
const observe=(ledger,line='main',overrides={})=>authoredUseReviewEvidence(ledger,line,p=>Object.hasOwn(overrides,p)?overrides[p]:read(p),hash);
const before=authoredUseReviewEvidence(old,'main',base,hash),after=observe(fresh);const idset=x=>new Set(x.insufficient_uses.map(key));const priorFail=idset(before),afterFail=idset(after),expected=new Set(indices.map(i=>key(old.symbol_uses[i])));assert.ok([...expected].every(k=>priorFail.has(k)));assert.deepEqual(afterFail,new Set([...priorFail].filter(k=>!expected.has(k))));assert.equal(after.reviewed,before.reviewed+41);assert.equal(after.insufficient,before.insufficient-41);
const selectedRows={symbol_uses:indices.map(i=>fresh.symbol_uses[i])};assert.equal(observe(selectedRows).reviewed,41);assert.equal(observe(selectedRows,'21.x').insufficient,41);assert.equal(observe(selectedRows,'main',{[source]:Buffer.from('wrong source')}).insufficient,41);assert.equal(observe(selectedRows,'main',{[context]:Buffer.from('wrong context')}).insufficient,41);assert.equal(observe(selectedRows,'main',{[reviewPath]:Buffer.from('wrong review')}).insufficient,41);
// The checker authenticates bytes and shape, not semantic truth: rebinding is accepted.
const forged=structuredClone(review);forged.reviews[0].decision='Changed semantic statement, intentionally long enough to satisfy the structural validator despite not being independently reviewed.';const forgedBytes=Buffer.from(JSON.stringify(forged));const rebound=structuredClone(selectedRows);for(const r of rebound.symbol_uses)r.source_review.sha256=hash(forgedBytes);assert.equal(observe(rebound,'main',{[reviewPath]:forgedBytes}).reviewed,41);
console.log(JSON.stringify({before:{reviewed:before.reviewed,insufficient:before.insufficient},after:{reviewed:after.reviewed,insufficient:after.insufficient},selected:41,negative_controls:['wrong line','wrong source','wrong context','wrong review'],semantic_tamper_rebound_accepted:true},null,2));
