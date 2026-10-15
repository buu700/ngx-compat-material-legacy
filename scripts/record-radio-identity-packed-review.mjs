/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Additive source requalification only. Actual extracted-artifact radio execution is pending. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {reverseRadioIdentityPackedSource,RADIO_IDENTITY_PACKED_PREIMAGES} from './radio-identity-packed-source-requalification.mjs';
import {reverseTableOnPushPackedSource} from './table-onpush-packed-source-requalification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path)),json=path=>JSON.parse(read(path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const write=(path,body)=>{assert.equal(existsSync(join(root,path)),false);writeFileSync(join(root,path),JSON.stringify(body,null,2)+'\n');};
const git=args=>execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root});
const worksheetPath='compatibility/rc/radio-identity-packed-worksheet.json',worksheet=json(worksheetPath),line=worksheet.line;
assert.equal(worksheet.source_parent,RADIO_IDENTITY_PACKED_PREIMAGES[line].commit);
const proofPath='compatibility/rc/radio-identity-packed-source-proof.json',diagnosticPath='compatibility/rc/radio-identity-packed-admission-diagnostic.json',diagnostic=json(diagnosticPath);
assert.equal(diagnostic.line,line);assert.equal(diagnostic.derived_cases,103);assert.equal(diagnostic.retained_previous_cases,102);assert.equal(diagnostic.negative_cases,105);assert.equal(diagnostic.source_reversal_negative_controls,38);assert.equal(diagnostic.collector_mutants,3);assert.equal(diagnostic.writer_cases,3);assert.equal(diagnostic.actual_packed_radio_executed,false);assert.equal(diagnostic.native_browser_executed,false);
assert.equal(hash(read('scripts/radio-identity-packed-contract.mjs')),diagnostic.contract_sha256);
const changed=worksheet.subjects.map(row=>{const before=git(['show',worksheet.source_parent+':'+row.path]);assert.equal(hash(before),row.before_sha256);const candidate=read(row.path);assert.equal(reverseRadioIdentityPackedSource(row.path,candidate.toString(),line),before.toString());return {...row,candidate_sha256:hash(candidate),exact_reversal_to_authenticated_parent:true};});
for(const path of ['scripts/packed-consumer-aot-smoke.mjs','scripts/packed-consumer-evidence.mjs','compatibility/rc/matrices/full-verify.json'])assert.ok(reverseTableOnPushPackedSource(path,reverseRadioIdentityPackedSource(path,read(path).toString(),line),line));
const productPaths=git(['ls-tree','-r','--name-only',worksheet.source_parent,'projects/ngx-material-legacy']).toString().trim().split('\n');assert.deepEqual(productPaths,git(['ls-files','projects/ngx-material-legacy']).toString().trim().split('\n'));assert.equal(git(['diff','--no-ext-diff','--no-renames',worksheet.source_parent,'--','projects/ngx-material-legacy']).length,0);
const members=productPaths.map(path=>({path,sha256:hash(read(path)),bytes:read(path).length}));assert.equal(members.length,1140);
const cyph='/home/parallels/cyph',consumerPaths=['shared/js/cyph/components/dynamic-form/dynamic-form.component.html','shared/js/cyph/components/dynamic-form/dynamic-form.component.scss','shared/js/cyph/components/dynamic-form/dynamic-form.component.ts'];
write(proofPath,{schema_version:1,line,source_parent:worksheet.source_parent,changed,product_members:members,unchanged_product_files:members.length,unchanged_styles:members.filter(r=>/\.(?:css|scss)$/.test(r.path)).length,unchanged_templates:members.filter(r=>r.path.endsWith('.html')).length,cyph:{read_only:true,sources:consumerPaths.map(path=>({path,sha256:hash(readFileSync(join(cyph,path)))}))},required_consumer_HTML_CSS_SCSS_changes:false,prior_OnPush_and_npm_guard_preimages_unchanged:true,earlier_receipts_reexecuted_or_reattributed:false,runtime_execution:'not-executed; final packed Actions obligation',diagnostic:{path:diagnosticPath,sha256:hash(read(diagnosticPath))},producer_sha256:hash(read('scripts/record-radio-identity-packed-review.mjs')),g11_claim:'not-passed'});
const frozenPath='compatibility/f10/authored-dependency-dispositions.json',currentPath='compatibility/f10/authored-dependency-current-dispositions.json',frozen=json(frozenPath),current=json(currentPath),rows=[...frozen.symbol_uses,...current.symbol_uses],key=r=>JSON.stringify([r.file,r.module,r.symbol]);
const failures=[...authoredUseReviewEvidence(frozen,line,read,hash).insufficient_uses,...authoredUseReviewEvidence(current,line,read,hash).insufficient_uses];assert.equal(failures.length,8);
const priorContexts=[],reviews=[],changes=new Map(changed.map(r=>[r.path,r]));
const evidence=[worksheetPath,proofPath,diagnosticPath,'scripts/radio-identity-packed-fixture.mjs','scripts/radio-identity-packed-contract.mjs','scripts/radio-identity-packed-source-requalification.mjs','tests/radio_identity_packed_contract_probe.mjs'].map(path=>({path,sha256:hash(read(path))}));
for(const failed of failures){const row=rows.find(r=>key(r)===key(failed)),bytes=read(row.source_review.path);assert.equal(hash(bytes),row.source_review.sha256);const prior=JSON.parse(bytes).reviews.find(r=>key(r)===key(row));assert.ok(prior);assert.equal(hash(read('projects/ngx-material-legacy/'+row.file)),prior.candidate_source_sha256);
 const refs=prior.independent_evidence.map(ref=>{const actual=hash(read(ref.path));if(actual===ref.sha256)return ref;const change=changes.get(ref.path);assert.ok(change,'unrelated prior evidence changed '+ref.path);assert.equal(ref.sha256,change.before_sha256);return {...ref,sha256:actual};});
 priorContexts.push({file:row.file,module:row.module,symbol:row.symbol,prior_source_review:row.source_review,prior_review:prior});
 reviews.push({...prior,prior_source_review:row.source_review,decision:prior.decision+' Scoped additive packed radio requalification: exact finite reversals recover the entire prior producer, evidence roster, matrix and all six adapted existing test files at authenticated before hashes. The earlier OnPush and npm original preimages remain unchanged, and composition recovers those same historical programs. All 102 existing packed cases remain mandatory. The new independent fixture owns separate standalone legacy/current radio scopes, real DOM input clicks, generated identity/label and explicit input behavior, shared public dispatcher identity, and Angular fixture destruction. The fixture executes before the preexisting first harness fixture to exercise fresh independently generated namespaces. Synthetic actual collector/writer tests reject 105 observation mutants, three collector mutants and 38 exact-source controls; these are admission tests, not radio component execution. Every product byte, viewport/provider/constructor path and old finite API judgment is unchanged. Prior runtime observations retain their exact original subject/scope. Actual extracted-artifact Angular radio, native browser/AOT and canonical Node/compiler/RxJS-floor qualification remain final Actions/full-audit obligations.',independent_evidence:[...refs,...evidence]});
}
const priorPath='compatibility/rc/radio-identity-packed-prior-source-contexts.json';write(priorPath,{schema_version:1,line,source_parent:worksheet.source_parent,contexts:priorContexts,runtime_receipts_not_reexecuted:true});
const reviewPath='compatibility/f10/authored-use-reviews/radio-identity-packed-producer-requalification.json';write(reviewPath,{schema_version:1,line,status:'reviewed',reviews,prior_contexts:{path:priorPath,sha256:hash(read(priorPath))},g11_claim:'not-passed'});
for(const review of reviews){const row=rows.find(r=>key(r)===key(review));row.source_review_history=[...(row.source_review_history||[]),{prior_source_review:row.source_review,reason:'Exact additive packed radio regression; original runtime subjects and scope retained.'}];row.source_review={path:reviewPath,sha256:hash(read(reviewPath))};}
const counts=authoredUseReviewEvidence(frozen,line,read,hash),more=authoredUseReviewEvidence(current,line,read,hash);assert.equal(counts.insufficient+more.insufficient,0);assert.equal(counts.reviewed,1444);assert.equal(more.reviewed,167);writeFileSync(join(root,frozenPath),JSON.stringify(frozen,null,2)+'\n');
console.log(JSON.stringify({line,requalified_roles:8,new_use_or_SHA_closures:0,unchanged_product_files:members.length,frozen_reviewed:counts.reviewed,frozen_open:1736-counts.reviewed,additional_reviewed:more.reviewed,additional_open:301-more.reviewed,invalid_closed:0,actual_packed_radio_executed:false}));
