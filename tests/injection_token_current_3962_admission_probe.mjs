/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite token source successor; public Injector protocol, no native claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p),key=x=>JSON.stringify([x.file,x.module,x.symbol]);
const reviewPath='compatibility/f10/authored-use-reviews/injection-token-current-3962-successor.json',body=JSON.parse(read(reviewPath)),roster=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json'));
const prior=JSON.parse(execFileSync('git',['--no-replace-objects','show','3962f7d302f63666b14ffab9d8c3b854eff776ce:compatibility/f10/authored-dependency-dispositions.json'],{maxBuffer:16*1024*1024}));
const files=['legacy-dialog/dialog.ts','legacy-core/internal/legacy-animations.ts'],expected=files.map(file=>key({file,module:'@angular/core',symbol:'InjectionToken'})).sort(),rows=roster.symbol_uses.filter(x=>x.source_review?.path===reviewPath);assert.deepEqual(rows.map(key).sort(),expected);assert.deepEqual(body.reviews.map(key).sort(),expected);
const transitions=JSON.parse(read('compatibility/rc/injection-token-current-3dd-transitions.json'));assert.equal(transitions.transitions.length,2);
for(const row of rows){const old=prior.symbol_uses.find(x=>key(x)===key(row));assert.ok(old);assert.deepEqual({...row,source_review:old.source_review},old);const previous=JSON.parse(read(old.source_review.path)).reviews.find(x=>key(x)===key(row)),t=transitions.transitions.find(x=>x.file==='projects/ngx-material-legacy/'+row.file);assert.equal(t.prior_sha256,previous.candidate_source_sha256);const git=(...args)=>execFileSync('git',['--no-replace-objects',...args],{env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(git('show',t.prior_commit+':'+t.file)),t.prior_sha256);assert.equal(hash(git('show',t.current_commit+':'+t.file)),t.current_sha256);assert.equal(hash(read(t.file)),t.current_sha256);const diff=git('diff','--no-ext-diff','--no-renames',t.prior_commit,t.current_commit,'--',t.file);assert.equal(hash(diff),t.full_diff_sha256);assert.equal(diff.toString(),t.full_diff);}
const diag=JSON.parse(read('compatibility/rc/injection-token-current-3962-diagnostic.json')),identity=JSON.parse(read('compatibility/rc/progress-token-identity-proof-3962.json'));assert.equal(diag.cases.length,25);assert.equal(diag.prior_token_roles_reconciled,true);assert.deepEqual(diag.authored_tokens.map(x=>x.distinct_identity_count),[27,27,27]);assert.equal(identity.current_legacy_alias_equals_public_peer,true);assert.equal(identity.legacy_animation_mode_distinct,true);assert.equal(identity.mutations.length,8);assert.equal(identity.g11_claim,'not-passed');
const run=(rs,line='main',reader=read)=>authoredUseReviewEvidence({symbol_uses:rs},line,reader,hash);assert.deepEqual(run(rows),{reviewed:2,insufficient:0,insufficient_uses:[]});assert.equal(run(rows,'21.x').insufficient,2);assert.equal(run([{...rows[0],symbol:'Wrong'}]).insufficient,1);assert.equal(run([rows[0]],'main',p=>p==='projects/ngx-material-legacy/'+rows[0].file?Buffer.from('wrong'):read(p)).insufficient,1);assert.equal(run([rows[0]],'main',p=>p==='compatibility/rc/progress-token-identity-proof-3962.json'?Buffer.from('wrong'):read(p)).insufficient,1);
console.log(JSON.stringify({selected:2,source_transitions:2,owned_tokens:27,original_shared_token:true,distinct_animation_token:true,source_only_result:true}));
