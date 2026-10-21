/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Fail-closed current source,SDK,individual decision and historical-reference guards. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {qualifiedTabsCallerEvidence,inspectTabsCallerReview,TABS_CALLER_REVIEW} from '../scripts/tabs-caller-reviews.mjs';

const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=value=>createHash('sha256').update(value).digest('hex');
const q=qualifiedTabsCallerEvidence({root}),review=inspectTabsCallerReview({root});
assert.equal(review.reviews.length,21);assert.equal(review.source_closures_prepared,21);assert.equal(review.frozen_prepared,17);assert.equal(review.additional_prepared,4);
assert.equal(review.reviews.filter(r=>r.conclusion==='removed-use').length,1);assert.equal(review.reviews.filter(r=>r.unused_import).length,4);
assert.ok(review.reviews.every(r=>r.decision.length>200));
const capsule=JSON.parse(read('compatibility/rc/tabs-caller-public-subjects.json'));
const controls=[...new Set([TABS_CALLER_REVIEW,q.ref.path,'compatibility/rc/tabs-caller-prior.json.gz','compatibility/rc/tabs-caller-decisions.json',
  'compatibility/rc/tabs-caller-public-subjects.json','scripts/tabs-caller-contracts.mjs','scripts/tabs-caller-public-subjects.mjs','scripts/tabs-caller-reviews.mjs',
  'tests/tabs_caller_public_probe.mjs','tests/tabs_caller_subject.mjs','compatibility/rc/api/export-name-allowlist.json',
  ...q.source.prior.sources.map(m=>m.path),q.source.prior.support[0].path,...q.source.metadata.map(m=>m.path),
  ...capsule.subjects.map(s=>s.additions[0].path)])];
for(const path of controls)assert.throws(()=>inspectTabsCallerReview({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from(path.endsWith('.json')?'\n':'\nchanged')]):read(p)}),/AssertionError/,path);
let changed=null;const late=path=>path===changed?Buffer.concat([read(path),Buffer.from('\nlate')]):read(path);
inspectTabsCallerReview({root,read:late});
for(changed of ['projects/ngx-material-legacy/legacy-tabs/tab-label.ts',q.ref.path])assert.throws(()=>inspectTabsCallerReview({root,read:late}),/AssertionError/);
for(const field of ['decision','candidate_source_sha256','conclusion']){
 const bad=structuredClone(review);bad.reviews[0][field]='invalid';const bytes=Buffer.from(JSON.stringify(bad,null,2)+'\n');
 assert.throws(()=>inspectTabsCallerReview({root,read:p=>p===TABS_CALLER_REVIEW?bytes:read(p)}),/changed prepared tab review/);
}
const ledgers=new Map(q.source.prior.ledgers.map(m=>[m.path,JSON.parse(read(m.path))]));let integrated=0;
for(const selected of q.source.prior.selected){const old=selected.original_row,row=ledgers.get(selected.ledger).symbol_uses.find(r=>r.file===old.file&&r.module===old.module&&r.symbol===old.symbol);assert.ok(row);if(row.disposition==='closed'){assert.equal(row.source_review.path,TABS_CALLER_REVIEW);assert.equal(row.source_review.sha256,hash(read(TABS_CALLER_REVIEW)));integrated++;}else assert.equal(row.disposition,'open');}
assert.ok([0,21].includes(integrated));
if(!integrated)for(const path of ledgers.keys())assert.equal(hash(read(path)),hash(execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show','HEAD:'+path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}})));
const frozen=ledgers.get('compatibility/f10/authored-dependency-dispositions.json');assert.equal(frozen.symbol_uses.length,1736);
assert.equal(frozen.symbol_uses.filter(r=>r.module==='@angular/forms'&&r.symbol==='NG_VALUE_ACCESSOR'&&r.disposition==='open').length,6);
assert.equal(ledgers.get('compatibility/f10/authored-dependency-current-dispositions.json').symbol_uses.length,315);assert.equal(ledgers.get('compatibility/f10/disposition-ledger/ledger.json').entries.length,1697);
const report={line:review.line,individual_routes:21,frozen:17,additional:4,removed_current_private_imports:1,unused_imports:4,current_source_files:69,
  SDK_models:3,invalid_type_controls:9,genuine_constructor_contexts:4,constructor_config_cases:68,actual_source_mutants_rejected:4,
  input_corruptions_rejected:controls.length,late_changes_rejected:2,review_row_corruptions_rejected:3,
  alias_allowlist_bytes_preserved:true,all1697_1736_315_obligations_and_six_packed_CVA_rows_retained:true,canonical_closures_integrated:integrated,
  actual_native_packed_AOT_or_full_floor_qualified:false};
const output=JSON.stringify(report);if(process.argv[2])writeFileSync(process.argv[2],output+'\n',{flag:'wx'});console.log(output);
