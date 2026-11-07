/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseReviewEvidence, authoredUseInventory} from '../scripts/authored-use-inventory.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fallback=process.env.AUTHORED_PROPOSAL_FALLBACK;
const read=p=>{try{return readFileSync(resolve(root,p));}catch(e){if(!fallback)throw e;return readFileSync(resolve(fallback,p));}};
const hash=b=>createHash('sha256').update(b).digest('hex');
const file='compatibility/f10/authored-dependency-dispositions.json';
const candidate=JSON.parse(read(file));
const rows=candidate.symbol_uses.filter(r=>r.file==='legacy-form-field/form-field.ts');
assert.equal(candidate.line,'main');assert.equal(candidate.symbol_uses.length,1736);assert.equal(rows.length,33);
const reviewPath='compatibility/f10/authored-use-reviews/form-field-main-8baa-per-use.json';
const contextPath='compatibility/f10/authored-use-reviews/form-field-main-8baa-context.json';
const reviewBytes=read(reviewPath),review=JSON.parse(reviewBytes),context=JSON.parse(read(contextPath));
assert.equal(review.line,'main');assert.equal(review.reviews.length,33);assert.equal(context.uses.length,33);
const hashReview=hash(reviewBytes);assert(rows.every(r=>r.source_review.path===reviewPath&&r.source_review.sha256===hashReview));
for(const row of rows){const prior=row.prior_disposition_record;assert(prior);const current={...row};delete current.prior_disposition_record;current.source_review=prior.source_review;assert.deepEqual(current,prior);const entry=review.reviews.filter(r=>r.file===row.file&&r.module===row.module&&r.symbol===row.symbol);assert.equal(entry.length,1);assert.deepEqual(entry[0].previous_review_reference,prior.source_review);const old=JSON.parse(read(prior.source_review.path));assert.deepEqual(entry[0].previous_review_record,old.reviews.find(r=>r.file===row.file&&r.module===row.module&&r.symbol===row.symbol));}
const before=structuredClone(candidate);before.symbol_uses=before.symbol_uses.map(r=>r.file==='legacy-form-field/form-field.ts'?r.prior_disposition_record:r);
const roster=before.symbol_uses.map(({file,module,symbol})=>({file,module,symbol}));assert.equal(authoredUseInventory(roster,candidate).complete,true);
const observe=(scope,line='main',override={})=>authoredUseReviewEvidence({symbol_uses:scope},line,p=>Object.hasOwn(override,p)?override[p]:read(p),hash);
const baseline=observe(before.symbol_uses),after=observe(candidate.symbol_uses);assert.equal(observe(rows).reviewed,33);assert.equal(observe(rows).insufficient,0);
assert.equal(after.insufficient,baseline.insufficient-33);assert.equal(after.reviewed,baseline.reviewed+33);
const insuffKey=x=>`${x.file}\0${x.module}\0${x.symbol}`;const beforeKeys=new Set(baseline.insufficient_uses.map(insuffKey)),afterKeys=new Set(after.insufficient_uses.map(insuffKey));assert.deepEqual([...beforeKeys].filter(k=>!afterKeys.has(k)).sort(),rows.map(insuffKey).sort());assert.deepEqual([...afterKeys].filter(k=>!beforeKeys.has(k)),[]);
const controls=[];function reject(id,scope,line,override,count=33){assert.equal(observe(scope,line,override).insufficient,count,id);controls.push(id);}
reject('wrong-line',rows,'21.x',{});reject('stale-current-source',rows,'main',{'projects/ngx-material-legacy/legacy-form-field/form-field.ts':Buffer.from('stale')});reject('altered-review',rows,'main',{[reviewPath]:Buffer.from('forged review')});reject('missing-review',rows,'main',{[reviewPath]:Buffer.alloc(0)});reject('altered-context',rows,'main',{[contextPath]:Buffer.from('forged context')});reject('missing-context',rows,'main',{[contextPath]:Buffer.alloc(0)});
const browser='compatibility/f10/authored-use-reviews/form-field-main-8baa-browser-token-noop.json';
reject('altered-focused-browser-report',rows,'main',{[browser]:Buffer.from('altered browser observation')},13);
const v4='compatibility/f10/authored-use-reviews/form-field-main-8baa-v4-browser-receipt.json';
reject('altered-v4-receipt',rows,'main',{[v4]:Buffer.from('altered v4 receipt')},13);
const changed=structuredClone(review);changed.reviews.push(changed.reviews[0]);const dup=Buffer.from(JSON.stringify(changed));const dupRows=rows.map(r=>({...r,source_review:{path:reviewPath,sha256:hash(dup)}}));reject('duplicate-matching-review',dupRows,'main',{[reviewPath]:dup},1);
const bad=structuredClone(review);bad.reviews[0].conclusion='test-only';const badBytes=Buffer.from(JSON.stringify(bad));const badRows=rows.map(r=>({...r,source_review:{path:reviewPath,sha256:hash(badBytes)}}));reject('production-cannot-be-test-only',badRows,'main',{[reviewPath]:badBytes},1);
// The existing checker is an identity/shape gate, not an immutable authorship authority.
const rewritten=structuredClone(review);rewritten.reviews[0].decision += ' A changed but structurally valid sentence.';const rewrittenBytes=Buffer.from(JSON.stringify(rewritten));const rebound=rows.map(r=>({...r,source_review:{path:reviewPath,sha256:hash(rewrittenBytes)}}));
assert.equal(observe(rebound,'main',{[reviewPath]:rewrittenBytes}).insufficient,0);
console.log(JSON.stringify({untrusted_rehash_limitation:'accepted by existing identity-only checker',line:'main',selected:rows.length,total:candidate.symbol_uses.length,baseline_insufficient:baseline.insufficient,proposed_insufficient:after.insufficient,negative_controls:controls,scope:'Source-bound review evidence admission only; no runtime, 21.x, security or G11 clearance.'}));
