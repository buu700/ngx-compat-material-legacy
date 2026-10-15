/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source-context requalification only. The OnPush SHA remains pending actual packed execution. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {reverseTableOnPushPackedSource,TABLE_ONPUSH_SOURCE_PREIMAGES} from './table-onpush-packed-source-requalification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path)),json=path=>JSON.parse(read(path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const write=(path,body)=>{assert.ok(!existsSync(join(root,path)));writeFileSync(join(root,path),JSON.stringify(body,null,2)+'\n');};
const git=args=>execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root});
const worksheetPath='compatibility/rc/table-onpush-packed-worksheet.json',worksheet=json(worksheetPath),line=worksheet.line;
assert.equal(worksheet.source_parent,TABLE_ONPUSH_SOURCE_PREIMAGES[line].commit);
const proofPath='compatibility/rc/table-onpush-packed-source-proof.json',diagnosticPath='compatibility/rc/table-onpush-packed-admission-diagnostic.json';
const diagnostic=json(diagnosticPath);assert.equal(diagnostic.line,line);assert.equal(diagnostic.negative_cases,58);
assert.equal(diagnostic.source_reversal_negative_controls,14);assert.equal(diagnostic.derived_cases,102);
assert.equal(diagnostic.actual_packed_table_executed,false);assert.equal(diagnostic.native_browser_executed,false);
const changed=worksheet.subjects.slice(0,3).map(row=>{
  const before=git(['show',worksheet.source_parent+':'+row.path]);assert.equal(hash(before),row.before_sha256);
  const candidate=read(row.path);assert.equal(reverseTableOnPushPackedSource(row.path,candidate.toString(),line),before.toString());
  return {...row,candidate_sha256:hash(candidate),exact_reversal_to_authenticated_parent:true};
});
const productPaths=git(['ls-tree','-r','--name-only',worksheet.source_parent,'projects/ngx-material-legacy']).toString().trim().split('\n');
assert.deepEqual(productPaths,git(['ls-files','projects/ngx-material-legacy']).toString().trim().split('\n'));
assert.equal(git(['diff','--no-ext-diff','--no-renames',worksheet.source_parent,'--','projects/ngx-material-legacy']).length,0);
const productMembers=productPaths.map(path=>({path,sha256:hash(read(path)),bytes:read(path).length}));
const cyph='/home/parallels/cyph',cyphHead=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','rev-parse','HEAD'],{cwd:cyph,encoding:'utf8'}).trim();
const consumerPaths=execFileSync('rg',['-l','MatLegacyTable|MatTable|matNoDataRow','shared/js','-g','*.ts','-g','*.html'],{cwd:cyph,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const consumerSources=consumerPaths.map(path=>({path,sha256:hash(readFileSync(join(cyph,path)))}));
const sourceProof={schema_version:1,line,source_parent:worksheet.source_parent,changed,product_members:productMembers,
  unchanged_product_files:productMembers.length,unchanged_styles:productMembers.filter(r=>/\.(?:css|scss)$/.test(r.path)).length,
  unchanged_templates:productMembers.filter(r=>r.path.endsWith('.html')).length,
  cyph:{head:cyphHead,read_only:true,sources:consumerSources},required_consumer_HTML_CSS_SCSS_changes:false,
  prior_original_oracle_and_npm_guard_preimages_unchanged:true,previous_runtime_receipts_reexecuted:false,
  runtime_execution:'not-executed; final packed Actions obligation',diagnostic:{path:diagnosticPath,sha256:hash(read(diagnosticPath))},
  producer_sha256:hash(read('scripts/record-table-onpush-packed-review.mjs')),g11_claim:'not-passed'};
write(proofPath,sourceProof);
const frozenPath='compatibility/f10/authored-dependency-dispositions.json',currentPath='compatibility/f10/authored-dependency-current-dispositions.json';
const frozen=json(frozenPath),current=json(currentPath),all=[...frozen.symbol_uses,...current.symbol_uses];
const failures=[...authoredUseReviewEvidence(frozen,line,read,hash).insufficient_uses,...authoredUseReviewEvidence(current,line,read,hash).insufficient_uses];
assert.equal(failures.length,8);
const key=row=>JSON.stringify([row.file,row.module,row.symbol]),priorContexts=[],reviews=[];
const evidence=[worksheetPath,proofPath,diagnosticPath,'scripts/table-onpush-packed-fixture.mjs',
  'scripts/table-onpush-packed-contract.mjs','scripts/table-onpush-packed-source-requalification.mjs',
  'tests/table_onpush_packed_contract_probe.mjs'].map(path=>({path,sha256:hash(read(path))}));
for(const failed of failures) {
  const row=all.find(r=>key(r)===key(failed)),bytes=read(row.source_review.path);assert.equal(hash(bytes),row.source_review.sha256);
  const prior=JSON.parse(bytes).reviews.find(r=>key(r)===key(row));assert.ok(prior);
  assert.equal(hash(read('projects/ngx-material-legacy/'+row.file)),prior.candidate_source_sha256);
  const refs=prior.independent_evidence.map(ref=>{
    const actual=hash(read(ref.path));if(actual===ref.sha256)return ref;
    assert.equal(ref.path,'scripts/packed-consumer-aot-smoke.mjs');
    assert.equal(ref.sha256,changed[0].before_sha256);return {...ref,sha256:actual};
  });
  priorContexts.push({file:row.file,module:row.module,symbol:row.symbol,prior_source_review:row.source_review,prior_review:prior});
  reviews.push({...prior,prior_source_review:row.source_review,
    decision:prior.decision+' Scoped additive OnPush packed-consumer requalification: the complete old producer is recovered byte-for-byte by nine finite reversals to the authenticated parent. Existing viewport/provider/constructor code, product imports and production source are unchanged. Only a separate standalone OnPush table fixture, its mandatory observation admission and the packed roster are added. The complete 101 old IDs remain required. Previous runtime observations keep their original subject and scope; the new table fixture has not executed and adds no native, compiler-floor or whole packed credit.',
    independent_evidence:[...refs,...evidence]});
}
const priorPath='compatibility/rc/table-onpush-packed-prior-source-contexts.json';
write(priorPath,{schema_version:1,line,source_parent:worksheet.source_parent,contexts:priorContexts,runtime_receipts_not_reexecuted:true});
const reviewPath='compatibility/f10/authored-use-reviews/table-onpush-packed-producer-requalification.json';
write(reviewPath,{schema_version:1,line,status:'reviewed',reviews,prior_contexts:{path:priorPath,sha256:hash(read(priorPath))},g11_claim:'not-passed'});
for(const review of reviews) {
  const row=all.find(r=>key(r)===key(review));row.source_review_history=[...(row.source_review_history||[]),{
    prior_source_review:row.source_review,reason:'Exact additive packed OnPush regression; previous runtime scope retained.'}];
  row.source_review={path:reviewPath,sha256:hash(read(reviewPath))};
}
const counts=authoredUseReviewEvidence(frozen,line,read,hash),more=authoredUseReviewEvidence(current,line,read,hash);
assert.equal(counts.insufficient+more.insufficient,0);assert.equal(counts.reviewed,1431);assert.equal(more.reviewed,156);
writeFileSync(join(root,frozenPath),JSON.stringify(frozen,null,2)+'\n');
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json',ledgerRaw=read(ledgerPath).toString(),ledger=JSON.parse(ledgerRaw),sha=worksheet.upstream_sha;
const row=ledger.entries.find(r=>r.sha===sha);assert.ok(row);const priorEntry=structuredClone(row);
const shaReportPath='compatibility/f10/disposition-ledger/evidence/closeout-table-onpush-packed-pending.json';
write(shaReportPath,{schema_version:1,line,status:'pending-packed-execution',sha,upstream_sha:sha,
  original_patch:{path:'compatibility/rc/table-onpush-original.patch',sha256:hash(read('compatibility/rc/table-onpush-original.patch'))},
  prior_entry:priorEntry,evidence,analysis:'The complete original patch has one runtime addition: markForCheck after the no-data visibility state changes. Four outlet constructor edits are formatting. The new upstream Angular test uses an OnPush child, a stable data-source input and an evaluated colspan binding. Earlier complete-renderer-method replay supplies an explicit markForCheck protocol and cannot prove actual Angular child checking. The owned table delegates rendering to public CdkTable; owned no-data configuration preserves original row/cell classes. A matching packed standalone regression is now mandatory but has not executed. Ancestry, a mark-call spy and a static row are insufficient for inheritance closure.',
  required_execution:'Actual extracted-artifact Angular TestBed case on this line; native/browser/compiler floors remain separate.',
  actual_packed_table_executed:false,semantic_pass:false,g11_claim:'not-passed'});
Object.assign(row,{final_disposition:'needs-individual-review',reason:'Original hunk and complete packed OnPush regression reviewed/prepared. Existing protocol replay does not establish actual Angular bound-row rendering. This SHA remains pending the mandatory extracted-artifact execution; no inheritance or G11 pass is claimed.',
  evidence_report:shaReportPath,g11_claim:'not-passed'});
delete row.batch_id;
// Preserve every unrelated ledger byte, including historical Unicode escaping.
const marker='      "sha": "'+sha+'"';assert.equal(ledgerRaw.split(marker).length-1,1);
const offset=ledgerRaw.indexOf(marker),start=ledgerRaw.lastIndexOf('    {\n',offset);
const end=ledgerRaw.indexOf('\n    }',offset)+6;assert.ok(start>=0&&end>offset);
assert.deepEqual(JSON.parse(ledgerRaw.slice(start,end)),priorEntry);
const replacement=JSON.stringify(row,null,2).split('\n').map(part=>'    '+part).join('\n');
writeFileSync(join(root,ledgerPath),ledgerRaw.slice(0,start)+replacement+ledgerRaw.slice(end));
console.log(JSON.stringify({line,requalified_roles:reviews.length,new_use_closures:0,new_SHA_closures:0,
  pending_upstream_sha:sha,unchanged_product_files:productMembers.length,unchanged_styles:sourceProof.unchanged_styles,
  unchanged_templates:sourceProof.unchanged_templates,frozen_reviewed:counts.reviewed,frozen_open:1736-counts.reviewed,
  additional_reviewed:more.reviewed,additional_open:301-more.reviewed,invalid_closed:0}));
