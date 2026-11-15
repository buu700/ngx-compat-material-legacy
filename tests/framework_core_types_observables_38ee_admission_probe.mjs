/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite source dependencies only, not hook or caller behavior admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p),key=x=>JSON.stringify([x.file,x.module,x.symbol]);
const reviewPath='compatibility/f10/authored-use-reviews/framework-core-types-observables-38ee-successor.json',body=JSON.parse(read(reviewPath)),roster=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json'));
const prior=JSON.parse(execFileSync('git',['--no-replace-objects','show','38ee8359c688c039c6ae1db858f11282241d53ff:compatibility/f10/authored-dependency-dispositions.json'],{maxBuffer:16*1024*1024}));
const life=JSON.parse(read('compatibility/rc/framework-lifecycle-38ee-roles-v2.json')),obs=JSON.parse(read('compatibility/rc/framework-observable-38ee-roles-v2.json'));
const held={file:'legacy-tabs/internal/tab-nav-bar-base.ts',module:'@angular/core',symbol:'QueryList'};
assert.equal(body.held.length,1);assert.equal(key(body.held[0]),key(held));
const expected=[...life.results,...obs.results].filter(x=>key(x)!==key(held)).map(key).sort();assert.equal(expected.length,58);assert.equal(new Set(expected).size,58);
const rows=roster.symbol_uses.filter(x=>x.source_review?.path===reviewPath);assert.deepEqual(rows.map(key).sort(),expected);assert.deepEqual(body.reviews.map(key).sort(),expected);
assert.deepEqual(roster.symbol_uses.find(x=>key(x)===key(held)),prior.symbol_uses.find(x=>key(x)===key(held)));
for(const row of rows){const previous=prior.symbol_uses.filter(x=>key(x)===key(row));assert.equal(previous.length,1);assert.deepEqual({...row,source_review:previous[0].source_review},previous[0]);const oldBytes=read(previous[0].source_review.path);assert.equal(hash(oldBytes),previous[0].source_review.sha256);const old=JSON.parse(oldBytes).reviews.find(x=>key(x)===key(row)),current=body.reviews.find(x=>key(x)===key(row));assert.ok(old);assert.equal(hash(read('projects/ngx-material-legacy/'+row.file)),current.candidate_source_sha256);assert.deepEqual(current.prior_source_review,previous[0].source_review);const historical=(old.independent_evidence??[]).filter(x=>x.path!=='projects/ngx-material-legacy/'+row.file&&(!existsSync(x.path)||hash(read(x.path))!==x.sha256));assert.deepEqual(current.historical_evidence_not_current,historical);const valid=(old.independent_evidence??[]).filter(x=>x.path!=='projects/ngx-material-legacy/'+row.file&&existsSync(x.path)&&hash(read(x.path))===x.sha256);assert.ok(valid.every(x=>current.independent_evidence.some(y=>y.path===x.path&&y.sha256===x.sha256)));}
assert.deepEqual([life.results.length,life.changed.length,life.mutations.length],[41,0,4]);assert.deepEqual([obs.results.length,obs.changed.length,obs.mutations.length],[18,0,6]);
const lifeFull=JSON.parse(read('compatibility/rc/framework-lifecycle-38ee-diagnostic.json')),min=JSON.parse(read('compatibility/rc/framework-lifecycle-38ee-minimum.json')),event=JSON.parse(read('compatibility/rc/event-emitter-38ee-diagnostic.json')),query=JSON.parse(read('compatibility/rc/query-list-38ee-diagnostic.json'));
assert.deepEqual([lifeFull.cases.length,lifeFull.mutations.length,min.names.length,min.mutations.length],[96,18,10,7]);assert.deepEqual([event.cases.length,event.mutations.length,query.cases.length,query.mutations.length],[21,18,21,22]);
assert.deepEqual(event.behaviors.map(x=>x.signal_listener_reads_tracked),[true,false,false]);assert.equal(event.cases.find(x=>x.file==='legacy-tabs/internal/tab-group-base.ts').references.find(x=>x.member==='selectedTabChange').async,true);
const run=(rs,line='main',reader=read)=>authoredUseReviewEvidence({symbol_uses:rs},line,reader,hash);assert.deepEqual(run(rows),{reviewed:58,insufficient:0,insufficient_uses:[]});assert.equal(run(rows,'21.x').insufficient,58);assert.equal(run([{...rows[0],symbol:'Wrong'}]).insufficient,1);assert.equal(run([rows[0]],'main',p=>p==='projects/ngx-material-legacy/'+rows[0].file?Buffer.from('wrong'):read(p)).insufficient,1);assert.equal(run([rows[0]],'main',p=>p==='compatibility/rc/framework-lifecycle-38ee-minimum.json'?Buffer.from('wrong'):read(p)).insufficient,1);
const altered=JSON.parse(read(reviewPath));altered.reviews[0].decision='Falsely claims native, runtime and G11 pass. '.repeat(4);const bytes=Buffer.from(JSON.stringify(altered)),changed=rows.map(row=>({...row,source_review:{path:reviewPath,sha256:hash(bytes)}}));assert.deepEqual(run(changed,'main',p=>p===reviewPath?bytes:read(p)),run(rows));
console.log(JSON.stringify({selected:58,lifecycle:41,event:8,query:9,held:1,prior_records_preserved:58,source_only_result:true,semantic_review_required:true}));
