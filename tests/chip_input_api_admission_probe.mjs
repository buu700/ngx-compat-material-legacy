/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CHIP_INPUT_API_SHAS,chipInputApiScopeEvidenceOk,chipInputApiSourceProof,readChipInputApiPrior} from '../scripts/upstream-chip-input-api-scope.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),json=v=>JSON.stringify(v,null,2)+'\n',paths=candidateProductSourcePaths(process.cwd()).sort();
const task=JSON.parse(read('compatibility/rc/chip-input-api-admission-worksheet.json')),line=task.line,prior=readChipInputApiPrior(read,line),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const entries=CHIP_INPUT_API_SHAS.map(sha=>ledger.entries.find(r=>r.sha===sha)),bodyPath=entries[0].evidence_report,body=JSON.parse(read(bodyPath));
for(const entry of entries)assert.equal(chipInputApiScopeEvidenceOk(body,entry,read,paths,line),true,entry.sha);
const controls=[],variants=[
 ['foreign-role',b=>b.role='borrowed review'],['foreign-line',b=>b.line=line==='main'?'21.x':'main'],['unfinished-body',b=>b.status='pending'],
 ['missing-scope-member',b=>b.scope_sha_ids.pop()],['broadened-scope',b=>b.scope_sha_ids.push('0'.repeat(40))],['reordered-scope',b=>b.scope_sha_ids.reverse()],
 ['runtime-credit',b=>b.actual_native_packed_or_floor_qualified=true],['G11-credit',b=>b.g11_claim='passed'],['missing-source-scope',b=>b.source_scope_only=false],
 ['forged-foundation-pin',b=>b.foundation_review.sha256='0'.repeat(64)],['forged-prior-pin',b=>b.prior.sha256='0'.repeat(64)],
 ['omitted-resource',b=>b.candidate_context.current_legacy_owner_boundary.authored_TS_and_resource_members.pop()],['omitted-TS',b=>b.candidate_context.current_legacy_owner_boundary.modern_type_boundary.production_and_test_typescript_members.pop()],
 ['omitted-historical-MDC-style',b=>b.candidate_context.current_legacy_owner_boundary.historical_Material16_MDC_style_members.pop()],['Sass-namespace-change',b=>b.candidate_context.current_legacy_owner_boundary.preserved_Sass_namespace_bindings[0]='changed'],
 ['forged-hunk-count',b=>b.reviews[1].original_analysis.hunks--],['omitted-reviewed-hunk',b=>b.reviews[1].whole_original_hunk_reviews.pop()],
 ['rewritten-hunk-decision',b=>b.reviews[1].whole_original_hunk_reviews[0].review='Only a demo field changes.'],['rewritten-candidate-decision',b=>b.reviews[0].decision='Claim actual screen reader runtime verified despite source only context.'],
 ['forged-prior-entry',b=>b.reviews[0].prior_entry.entry_sha256='0'.repeat(64)],['foreign-row-branch',b=>b.reviews[0].affected_branches=['main','21.x']],
 ['unfinished-row',b=>b.reviews[0].status='awaiting'],['row-runtime-credit',b=>b.reviews[0].actual_native_packed_or_floor_qualified=true],
 ['changed-complete-patch',b=>b.reviews[1].diff+='\n'],['omitted-patch-path',b=>b.reviews[1].patch_paths.pop()],
 ['forged-original-summary',b=>b.reviews[2].original_analysis.detail.input_and_defaults_types_broadened=false],['borrowed-native-proof',b=>b.individual_proof={proof_kind:'native-behavior'}],['unscoped-extra-SHA',b=>b.sha='0'.repeat(40)],
];
for(const [id,mutate]of variants){
 const altered=structuredClone(body),entry=structuredClone(entries[0]);mutate(altered);const row=altered.reviews[0];
 // Rebind the outer document seal, decision and source proof. Semantic rejection
 // must survive re-signing the tampered source record with its current hash.
 entry.reason=row.decision;entry.individual_proof=chipInputApiSourceProof(row.original_analysis,altered.candidate_context,row.decision);
 const bytes=Buffer.from(json(altered));entry.source_check.evidence_report_sha256=hash(bytes);
 assert.equal(chipInputApiScopeEvidenceOk(altered,entry,p=>p===bodyPath?bytes:read(p),paths,line),false,id);controls.push({id,result:'rejected'});
}
const entryVariants=[
 ['missing-proof',e=>delete e.individual_proof],['wrong-proof-kind',e=>e.individual_proof.proof_kind='documentation-only'],['wrong-entry-branch',e=>e.affected_branches=['foreign']],
 ['missing-entry-path',e=>e.files.pop()],['wrong-disposition',e=>e.final_disposition='already-adapted'],['wrong-source-seal',e=>e.source_check.evidence_report_sha256='0'.repeat(64)],
 ['wrong-entry-diff',e=>e.diff_sha256='0'.repeat(64)],['foreign-subject',e=>e.sha='0'.repeat(40)],['borrowed-row-membership',e=>e.source_check.review_membership=CHIP_INPUT_API_SHAS[1]],['runtime-proof-credit',e=>e.individual_proof.chip_input_api_source_scope.actual_native_packed_or_floor_qualified=true],
];
for(const [id,mutate]of entryVariants){const entry=structuredClone(entries[0]);mutate(entry);assert.equal(chipInputApiScopeEvidenceOk(body,entry,read,paths,line),false,id);controls.push({id,result:'rejected'});}
const integrity=[task.prior.path,'compatibility/rc/chip-input-api-scope-originals.json.gz',task.foundation_review.path,...body.candidate_context.tagged_references.map(m=>m.path),...prior.reviews.map(r=>r.path)];
for(const path of integrity){assert.equal(chipInputApiScopeEvidenceOk(body,entries[0],p=>p===path?Buffer.concat([read(p),Buffer.from('changed')]):read(p),paths,line),false,path);controls.push({id:'changed-retained-source-'+path,result:'rejected'});}
const source='projects/ngx-material-legacy/legacy-chips/chip.ts';
assert.equal(chipInputApiScopeEvidenceOk(body,entries[0],p=>p===source?Buffer.from("import {MatChipRow as OtherRow} from '@angular/material/chips';\n"+read(source)):read(p),paths,line),false);controls.push({id:'new-aliased-peer-row',result:'rejected'});
const addition='projects/ngx-material-legacy/legacy-chips/added-api.ts';
assert.equal(chipInputApiScopeEvidenceOk(body,entries[0],p=>p===addition?Buffer.from('<button matChipInputApi></button>'):read(p),[...paths,addition].sort(),line),false);controls.push({id:'added-separator-type',result:'rejected'});
const unrelated='projects/ngx-material-legacy/internal/common-behaviors/color.ts';
assert.equal(chipInputApiScopeEvidenceOk(body,entries[0],p=>p===unrelated?Buffer.concat([read(p),Buffer.from('\n// new reviewed source epoch required\n')]):read(p),paths,line),false);controls.push({id:'stale-valid-source-identity',result:'rejected'});
const work=mkdtempSync(join(tmpdir(),'ngx-chip-input-api-admission-')),cli=[];
try{
 const frozen=JSON.parse(read('compatibility/f10/upstream-sha-risk-bootstrap.json'));frozen.commits=frozen.commits.filter(r=>CHIP_INPUT_API_SHAS.includes(r.sha));
 for(const [id,mutate]of [['valid-source-only',()=>{}],['missing-proof',rows=>delete rows[0].individual_proof],['relabel-nonJSON',rows=>rows[0].evidence_report='README.md'],['borrowed-foundation',rows=>rows[0].evidence_report=task.foundation_review.path],['foreign-SHA-with-proof',rows=>rows[0].sha='0'.repeat(40)]]){
  const rows=structuredClone(entries);mutate(rows);const seedBody=structuredClone(frozen);if(rows[0].sha!==CHIP_INPUT_API_SHAS[0])seedBody.commits.find(r=>r.sha===CHIP_INPUT_API_SHAS[0]).sha=rows[0].sha;
  const seed=join(work,id+'-seed.json'),input=join(work,id+'-ledger.json'),output=join(work,id+'-report.json');writeFileSync(seed,json(seedBody));writeFileSync(input,json({entries:rows}));
  const child=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--admission','--line',line,'--seed',seed,'--ledger',input,'--report',output],{encoding:'utf8',timeout:60000});
  assert.equal(child.error,undefined,id);assert.notEqual(child.status,null,id);assert.notEqual(child.status,0,id);const result=JSON.parse(readFileSync(output));
  assert.equal(result.g11_claim,'not-passed');assert.equal(result.disposition_admission,'incomplete');
  if(id==='valid-source-only'){for(const key of ['missing_evidence','insufficient_sensitive','insufficient_behavior','insufficient_inherited','missing_branch_applicability'])assert.equal(result[key],0,key);}
  else assert.ok(result.evidence_failures.some(r=>r.sha===rows[0].sha&&r.reason==='invalid-chip-input-api-source-scope'),id+': '+JSON.stringify(result.evidence_failures));
  cli.push({id,result:id==='valid-source-only'?'three-source-scopes-valid;overall-G11-incomplete':'rejected',exit_code:child.status});
 }
}finally{rmSync(work,{recursive:true,force:true});}
const report={schema_version:1,line,real_source_subjects:3,semantic_doc_and_entry_controls:variants.length+entryVariants.length,original_integrity_controls:integrity.length,prior_review_files_preserved:prior.reviews.length,current_source_controls:3,actual_checker_controls:cli.length,controls,cli,all_overall_admissions_incomplete:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],json(report),{flag:'wx'});
console.log(JSON.stringify({line,real_source_subjects:3,semantic_doc_and_entry_controls:report.semantic_doc_and_entry_controls,original_integrity_controls:integrity.length,prior_review_files_preserved:prior.reviews.length,current_source_controls:3,actual_checker_controls:cli.length,all_overall_admissions_incomplete:true,actual_native_packed_or_floor_qualified:false}));
