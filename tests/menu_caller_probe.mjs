/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Independent source/proof/decision corruption controls; no historical cohort or native pass. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {qualifiedMenuCallerEvidence,inspectMenuCallerReview,MENU_CALLER_REVIEW} from '../scripts/menu-caller-reviews.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),q=qualifiedMenuCallerEvidence({root}),review=inspectMenuCallerReview({root});
assert.equal(review.reviews.length,17);assert.equal(review.frozen_prepared,12);assert.equal(review.additional_prepared,5);assert.equal(review.reviews.filter(r=>r.conclusion==='removed-use').length,3);assert.equal(review.reviews.filter(r=>r.unused_import).length,0);
const controls=[...new Set([MENU_CALLER_REVIEW,q.ref.path,'compatibility/rc/menu-caller-prior.json.gz','compatibility/rc/menu-caller-decisions.json','compatibility/rc/menu-caller-public-subjects.json','scripts/menu-caller-contracts.mjs','scripts/menu-caller-public-subjects.mjs','scripts/menu-caller-reviews.mjs','tests/menu_caller_public_probe.mjs','tests/menu_caller_subject.mjs','compatibility/rc/api/export-name-allowlist.json',...q.source.prior.sources.map(m=>m.path),...q.source.prior.support.map(m=>m.path)])];
for(const path of controls)assert.throws(()=>inspectMenuCallerReview({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)}),e=>e?.code==='ERR_ASSERTION',path);
let changed=null;const late=p=>p===changed?Buffer.concat([read(p),Buffer.from('\n')]):read(p);inspectMenuCallerReview({root,read:late});for(changed of ['projects/ngx-material-legacy/legacy-menu/menu-item.ts',q.ref.path])assert.throws(()=>inspectMenuCallerReview({root,read:late}),e=>e?.code==='ERR_ASSERTION');
for(const field of ['decision','candidate_source_sha256','conclusion']){const bad=structuredClone(review);bad.reviews[0][field]='invalid';const bytes=Buffer.from(JSON.stringify(bad,null,2)+'\n');assert.throws(()=>inspectMenuCallerReview({root,read:p=>p===MENU_CALLER_REVIEW?bytes:read(p)}),/changed prepared individual menu review/);}
const ledgers=new Map(q.source.prior.ledgers.map(m=>[m.path,JSON.parse(read(m.path))]));let integrated=0;
for(const selected of q.source.prior.selected){const old=selected.original_row,row=ledgers.get(selected.ledger).symbol_uses.find(r=>r.file===old.file&&r.module===old.module&&r.symbol===old.symbol);assert.ok(row);if(row.disposition==='closed'){assert.equal(row.status,'reviewed');assert.deepEqual(row.source_review,{path:MENU_CALLER_REVIEW,sha256:hash(read(MENU_CALLER_REVIEW))});integrated++;}else assert.equal(row.disposition,'open');}
assert.ok([0,17].includes(integrated),'partial menu canonical integration');
if(!integrated)for(const path of ledgers.keys())assert.equal(hash(read(path)),hash(execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show','HEAD:'+path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}})),'preparation changed canonical obligations');
const frozen=ledgers.get('compatibility/f10/authored-dependency-dispositions.json'),added=ledgers.get('compatibility/f10/authored-dependency-current-dispositions.json');assert.equal(frozen.symbol_uses.length,1736);assert.equal(added.symbol_uses.length,315);assert.equal(ledgers.get('compatibility/f10/disposition-ledger/ledger.json').entries.length,1697);assert.equal(frozen.symbol_uses.filter(r=>r.module==='@angular/forms'&&r.symbol==='NG_VALUE_ACCESSOR'&&r.disposition==='open').length,6);assert.equal(added.live_symbol_use_count,314);assert.equal(added.retained_removed_additional_uses.length,1);
const report={line:review.line,individual_routes:17,frozen:12,additional:5,removed_current_private_routes:3,SDK_models:3,invalid_type_controls:9,current_semantic_source_files:53,runtime_contexts:4,runtime_cases:52,actual_source_mutants_rejected:6,source_and_proof_corruptions_rejected:controls.length,late_changes_rejected:2,review_row_corruptions_rejected:3,canonical_closures_integrated:integrated,original1697_1736_315_and_six_packed_CVA_obligations_retained:true,test_only_decorator_reflection_is_not_generated_query_execution:true,documented_historical_content_constructor_and_unattached_detach_differences:true,actual_native_packed_AOT_or_full_floor_qualified:false,g11_claim:'not-passed'};if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
