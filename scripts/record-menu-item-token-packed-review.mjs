/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Additive producer requalification; actual nested menu execution stays pending. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseInventory,authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {reverseMenuItemTokenPackedSource,MENU_ITEM_TOKEN_PACKED_PREIMAGES} from './menu-item-token-packed-source-requalification.mjs';
import {reverseSelectDetachPackedSource} from './select-detach-packed-source-requalification.mjs';
import {reverseGeneratedIdentityPackedSource} from './generated-identity-packed-source-requalification.mjs';
import {reverseRadioIdentityPackedSource} from './radio-identity-packed-source-requalification.mjs';
import {reverseTableOnPushPackedSource} from './table-onpush-packed-source-requalification.mjs';
import {menuItemTokenPackedFixture} from './menu-item-token-packed-fixture.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path)),json=path=>JSON.parse(read(path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const write=(path,body)=>{assert.equal(existsSync(join(root,path)),false);writeFileSync(join(root,path),JSON.stringify(body,null,2)+'\n');};
const git=args=>execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root});
const worksheetPath='compatibility/rc/menu-item-token-packed-worksheet.json',worksheet=json(worksheetPath),line=worksheet.line;
assert.equal(worksheet.source_parent,MENU_ITEM_TOKEN_PACKED_PREIMAGES[line].commit);
const proofPath='compatibility/rc/menu-item-token-packed-source-proof.json',diagnosticPath='compatibility/rc/menu-item-token-packed-admission-diagnostic.json',diagnostic=json(diagnosticPath);
assert.equal(diagnostic.line,line);
for(const [field,value]of Object.entries({derived_cases:106,retained_previous_cases:105,negative_cases:830,source_reversal_negative_controls:67,collector_mutants:3,writer_cases:3,actual_packed_menu_or_components_executed:false,native_browser_executed:false}))assert.equal(diagnostic[field],value);
assert.equal(hash(read('scripts/menu-item-token-packed-contract.mjs')),diagnostic.contract_sha256);
for(const [field,path]of [['producer_sha256','tests/menu_item_token_packed_contract_probe.mjs'],['source_guard_sha256','scripts/menu-item-token-packed-source-requalification.mjs'],['packed_producer_sha256','scripts/packed-consumer-aot-smoke.mjs'],['packed_evidence_sha256','scripts/packed-consumer-evidence.mjs']])assert.equal(diagnostic[field],hash(read(path)));
assert.equal(diagnostic.fixture_sha256,hash(menuItemTokenPackedFixture()));
const changed=worksheet.subjects.map(row=>{const before=git(['show',worksheet.source_parent+':'+row.path]);assert.equal(hash(before),row.before_sha256);const candidate=read(row.path);assert.equal(reverseMenuItemTokenPackedSource(row.path,candidate.toString(),line),before.toString());return {...row,candidate_sha256:hash(candidate),exact_reversal_to_authenticated_parent:true};});
for(const path of ['scripts/packed-consumer-aot-smoke.mjs','scripts/packed-consumer-evidence.mjs','compatibility/rc/matrices/full-verify.json'])assert.ok(reverseTableOnPushPackedSource(path,reverseRadioIdentityPackedSource(path,reverseGeneratedIdentityPackedSource(path,reverseSelectDetachPackedSource(path,reverseMenuItemTokenPackedSource(path,read(path).toString(),line),line),line),line),line));
const productPaths=git(['ls-tree','-r','--name-only',worksheet.source_parent,'projects/ngx-material-legacy']).toString().trim().split('\n');assert.deepEqual(productPaths,git(['ls-files','projects/ngx-material-legacy']).toString().trim().split('\n'));assert.equal(git(['diff','--no-ext-diff','--no-renames',worksheet.source_parent,'--','projects/ngx-material-legacy']).length,0);assert.equal(git(['status','--porcelain','--','projects/ngx-material-legacy']).length,0);
const members=productPaths.map(path=>({path,sha256:hash(read(path)),bytes:read(path).length}));assert.equal(members.length,1140);
const cyph='/home/parallels/cyph',consumer=json('compatibility/rc/menu-item-token-source-scope.json').cyph_read_only;
write(proofPath,{schema_version:1,line,source_parent:worksheet.source_parent,changed,product_population_sha256:hash(JSON.stringify(members)),unchanged_product_files:members.length,unchanged_styles:members.filter(r=>/\.(?:css|scss)$/.test(r.path)).length,unchanged_templates:members.filter(r=>r.path.endsWith('.html')).length,
 product_identity_proof:'Exact tracked product population equals parent and git diff/status contain no product change; digest covers every current path/byte digest/length.',
 cyph:{read_only:true,menu_item_templates:consumer.menu_item_templates.map(ref=>({path:ref.path,sha256:hash(readFileSync(join(cyph,ref.path)))})),item_submenu_templates:consumer.templates_with_item_submenu_trigger},
 required_consumer_HTML_CSS_SCSS_changes:false,prior_select_identity_radio_OnPush_and_npm_guard_preimages_unchanged:true,earlier_receipts_reexecuted_or_reattributed:false,
 actual_packed_menu_execution:'not-executed; final plausible candidate Actions obligation',diagnostic:{path:diagnosticPath,sha256:hash(read(diagnosticPath))},producer_sha256:hash(read('scripts/record-menu-item-token-packed-review.mjs')),g11_claim:'not-passed'});
const frozenPath='compatibility/f10/authored-dependency-dispositions.json',currentPath='compatibility/f10/authored-dependency-current-dispositions.json',frozen=json(frozenPath),current=json(currentPath),rows=[...frozen.symbol_uses,...current.symbol_uses],key=r=>JSON.stringify([r.file,r.module,r.symbol]);
assert.equal(authoredUseInventory(json('compatibility/f10/authored-dependency-inventory-seed.json').symbol_uses,frozen).complete,true);
const tokenUses=frozen.symbol_uses.filter(row=>row.module==='@angular/material/menu'&&row.symbol==='MatMenuItem');assert.equal(tokenUses.length,3);assert.ok(tokenUses.every(row=>row.disposition==='open'&&row.status!=='reviewed'));
const failures=[...authoredUseReviewEvidence(frozen,line,read,hash).insufficient_uses,...authoredUseReviewEvidence(current,line,read,hash).insufficient_uses];assert.equal(failures.length,167);
const priorContexts=[],reviews=[],changes=new Map(changed.map(row=>[row.path,row]));
const evidence=[worksheetPath,proofPath,diagnosticPath,'scripts/menu-item-token-packed-fixture.mjs','scripts/menu-item-token-packed-contract.mjs','scripts/menu-item-token-packed-source-requalification.mjs','tests/menu_item_token_packed_contract_probe.mjs','compatibility/rc/menu-item-token-source-scope.json','compatibility/rc/owned-menu-item-implementation-decision.json'].map(path=>({path,sha256:hash(read(path))}));
for(const failed of failures){const row=rows.find(r=>key(r)===key(failed)),bytes=read(row.source_review.path);assert.equal(hash(bytes),row.source_review.sha256);const prior=JSON.parse(bytes).reviews.find(r=>key(r)===key(row));assert.ok(prior);assert.equal(hash(read('projects/ngx-material-legacy/'+row.file)),prior.candidate_source_sha256);
 const refs=prior.independent_evidence.map(ref=>{const actual=hash(read(ref.path));if(actual===ref.sha256)return ref;const change=changes.get(ref.path);assert.ok(change,'unrelated prior evidence changed '+ref.path);assert.equal(ref.sha256,change.before_sha256);return {...ref,sha256:actual};});
 priorContexts.push({file:row.file,module:row.module,symbol:row.symbol,prior_source_review:row.source_review,prior_review:prior});
 reviews.push({...prior,prior_source_review:row.source_review,decision:prior.decision+' Scoped additive nested-menu token producer requalification: fifteen complete prior producer/evidence/matrix/test sources recover their exact parent bytes. This new guard composes before unchanged select/identity/radio/OnPush/npm guards. All105 earlier case identities remain mandatory; one new nested menu case makes106. Separate legacy/current fixture scopes use the actual public MatMenuItem provider/query identity and an ancestor token decoy to expose missing Optional+Self lookup. Real nested/descendant/shallow queries, item-parent filtering and sibling isolation are observed on actual nodes. Public open/close APIs and native ArrowDown/Right/Left keyboard events exercise focus and actual panel/ARIA targets. Two remove/recreate rounds observe fresh item instances, closed hover/focus subjects and removal of open panels/nodes/triggers. Legacy structure assertions retain historical panel/content/item classes and absence of MDC item classes; nominal current-parent inheritance is deliberately absent under the existing explicit historical implementation authority. This finite producer scope does not close any of the three still-live current MatMenuItem token dependencies. The actual collector/writer rejects830 synthetic corruptions, three collector mutations and67 source corruptions. Those are syntax/admission controls only. All1140 product files,409 styles and30 templates and every old runtime receipt keep their original subjects and scope. Actual packed Angular/CDK menu/node/query execution, native browser/AOT and canonical runtime/compiler/RxJS floors and final G11 remain pending.',independent_evidence:[...refs,...evidence]});
}
const priorPath='compatibility/rc/menu-item-token-packed-prior-source-contexts.json';write(priorPath,{schema_version:1,line,source_parent:worksheet.source_parent,contexts:priorContexts,runtime_receipts_not_reexecuted:true});
const reviewPath='compatibility/f10/authored-use-reviews/menu-item-token-packed-producer-requalification.json';write(reviewPath,{schema_version:1,line,status:'reviewed',reviews,prior_contexts:{path:priorPath,sha256:hash(read(priorPath))},g11_claim:'not-passed'});
for(const review of reviews){const row=rows.find(r=>key(r)===key(review));row.source_review_history=[...(row.source_review_history||[]),{prior_source_review:row.source_review,reason:'Exact additive packed nested menu token regression; original runtime subjects and scope retained.'}];row.source_review={path:reviewPath,sha256:hash(read(reviewPath))};}
const counts=authoredUseReviewEvidence(frozen,line,read,hash),more=authoredUseReviewEvidence(current,line,read,hash);assert.equal(counts.insufficient+more.insufficient,0);assert.equal(counts.reviewed,1444);assert.equal(more.reviewed,167);for(const [path,body]of [[frozenPath,frozen],[currentPath,current]])writeFileSync(join(root,path),JSON.stringify(body,null,2)+'\n');
console.log(JSON.stringify({line,requalified_roles:167,new_use_or_SHA_closures:0,unchanged_product_files:members.length,frozen_reviewed:counts.reviewed,frozen_open:1736-counts.reviewed,additional_reviewed:more.reviewed,additional_open:301-more.reviewed,invalid_closed:0,actual_packed_menu_or_components_executed:false}));
