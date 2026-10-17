/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {MODERN_CHIP_SHAS,modernChipScopeEvidenceOk,modernChipSourceProof,readModernChipPrior} from '../scripts/upstream-modern-chip-scope.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),json=v=>JSON.stringify(v,null,2)+'\n',read=p=>readFileSync(p),paths=candidateProductSourcePaths(process.cwd()).sort();
const task=JSON.parse(read('compatibility/rc/modern-chip-admission-worksheet.json')),line=task.line,prior=readModernChipPrior(read,line),migration=JSON.parse(read('compatibility/rc/modern-chip-admission-entry-migration.json'));
const bodyPath=migration.current_review.path,body=JSON.parse(read(bodyPath)),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')),entries=MODERN_CHIP_SHAS.map(sha=>ledger.entries.find(r=>r.sha===sha));
for(const entry of entries)assert.equal(modernChipScopeEvidenceOk(body,entry,read,paths,line),true,entry.sha);
const controls=[];
const variants=[
 ['foreign-role',b=>b.role='borrowed source review'],['foreign-line',b=>b.line=line==='main'?'21.x':'main'],['unfinished-body',b=>b.status='pending'],
 ['missing-scope-member',b=>b.scope_sha_ids.pop()],['broadened-scope',b=>b.scope_sha_ids.push('0'.repeat(40))],['missing-review',b=>b.reviews.pop()],
 ['runtime-credit',b=>b.actual_native_packed_or_floor_qualified=true],['missing-source-scope',b=>b.source_scope_only=false],
 ['stale-candidate-member',b=>b.candidate_context.production_and_test_typescript_members[0].sha256='0'.repeat(64)],
 ['omitted-candidate-member',b=>b.candidate_context.production_and_test_typescript_members.pop()],
 ['foreign-candidate-line',b=>b.candidate_context.line='foreign'],['unfinished-row',b=>b.reviews[0].status='awaiting'],
 ['borrowed-row-branch',b=>b.reviews[0].affected_branches=['main','21.x']],['runtime-row-credit',b=>b.reviews[0].actual_native_packed_or_floor_qualified=true],
 ['forged-prior-entry',b=>b.reviews[0].prior_entry.entry_sha256='0'.repeat(64)],['changed-patch',b=>b.reviews[0].diff+='\n'],
 ['redacted-original-path',b=>b.reviews[1].patch_paths.pop()],['forged-original-hunks',b=>b.reviews[0].original_analysis.hunks++],
 ['changed-prior-pin',b=>b.prior.sha256='0'.repeat(64)],
];
for(const [id,mutate]of variants){
 const altered=structuredClone(body),entry=structuredClone(entries[0]);mutate(altered);
 // Rebind the entry seal and proof to the altered document, so the semantic
 // rejection is not merely an unchanged outer hash or proof digest.
 const row=altered.reviews.find(r=>r.sha===entry.sha);if(row){entry.reason=row.decision;if(['main','21.x'].includes(altered.candidate_context.line))entry.individual_proof=modernChipSourceProof(row.original_analysis,altered.candidate_context,row.decision);}
 const bytes=Buffer.from(json(altered));entry.source_check.evidence_report_sha256=hash(bytes);
 assert.equal(modernChipScopeEvidenceOk(altered,entry,p=>p===bodyPath?bytes:read(p),paths,line),false,id);controls.push({id,result:'rejected'});
}
const entryMutations=[['missing-proof',e=>delete e.individual_proof],['relabel-proof',e=>e.individual_proof.proof_kind='documentation-only'],['wrong-entry-branch',e=>e.affected_branches=['foreign']],['missing-entry-path',e=>e.files.pop()],['wrong-disposition',e=>e.final_disposition='already-adapted'],['wrong-source-seal',e=>e.source_check.evidence_report_sha256='0'.repeat(64)],['foreign-subject',e=>e.sha='0'.repeat(40)]];
for(const [id,mutate]of entryMutations){const entry=structuredClone(entries[0]);mutate(entry);assert.equal(modernChipScopeEvidenceOk(body,entry,read,paths,line),false,id);controls.push({id,result:'rejected'});}
for(const path of [task.prior.path,'compatibility/rc/modern-chip-scope-subjects.json.gz',...prior.reviews.map(r=>r.path)]){
 assert.equal(modernChipScopeEvidenceOk(body,entries[0],p=>p===path?Buffer.concat([read(p),Buffer.from('changed')]):read(p),paths,line),false,path);controls.push({id:'changed-original-'+path,result:'rejected'});
}
const source='projects/ngx-material-legacy/legacy-chips/chip.ts',foreign=Buffer.from("import {MatChipOption} from '@angular/material/chips';\n"+read(source));
assert.equal(modernChipScopeEvidenceOk(body,entries[0],p=>p===source?foreign:read(p),paths,line),false);controls.push({id:'current-peer-chip-import',result:'rejected'});
// The real checker must dispatch by SHA even after a proof is removed or its
// evidence is relabeled to a non-JSON source file. Overall G11 stays incomplete.
const work=mkdtempSync(join(tmpdir(),'ngx-modern-chip-admission-'));const cli=[];
try{
 const frozen=JSON.parse(read('compatibility/f10/upstream-sha-risk-bootstrap.json'));frozen.commits=frozen.commits.filter(r=>MODERN_CHIP_SHAS.includes(r.sha));const seed=join(work,'seed.json');writeFileSync(seed,json(frozen));
 for(const [id,mutate]of [['complete-source-scope',()=>{}],['missing-proof',rows=>delete rows[0].individual_proof],['relabel-evidence',rows=>rows[0].evidence_report='README.md'],['foreign-review',rows=>rows[0].evidence_report='compatibility/rc/modern-chip-scope-source-review.json'],['foreign-proof-kind',rows=>{rows[0].sha='0'.repeat(40);rows[0].evidence_report='README.md';}]]){
  const rows=structuredClone(entries);mutate(rows);const selectedSeed=structuredClone(frozen);if(rows[0].sha!==MODERN_CHIP_SHAS[0])selectedSeed.commits.find(r=>r.sha===MODERN_CHIP_SHAS[0]).sha=rows[0].sha;writeFileSync(seed,json(selectedSeed));const input=join(work,id+'.json'),report=join(work,id+'-report.json');writeFileSync(input,json({entries:rows}));
  const child=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--admission','--line',line,'--seed',seed,'--ledger',input,'--report',report],{encoding:'utf8',timeout:60000});
  assert.equal(child.error,undefined,id);assert.notEqual(child.status,null,id);const result=JSON.parse(readFileSync(report));
  assert.equal(result.g11_claim,'not-passed');assert.equal(result.disposition_admission,'incomplete');
  if(id==='complete-source-scope'){
   assert.equal(result.missing_evidence,0);assert.equal(result.insufficient_sensitive,0);assert.equal(result.insufficient_behavior,0);assert.equal(result.insufficient_inherited,0);assert.equal(result.missing_branch_applicability,0);
  }else assert.ok(result.evidence_failures.some(r=>r.sha===rows[0].sha&&r.reason==='invalid-modern-chip-source-scope'),id+': '+JSON.stringify(result.evidence_failures));
  cli.push({id,result:id==='complete-source-scope'?'source-only-scopes-valid;overall-G11-incomplete':'rejected',exit_code:child.status});
 }
}finally{rmSync(work,{recursive:true,force:true});}
const report={schema_version:1,line,real_source_subjects:3,semantic_doc_and_entry_controls:variants.length+entryMutations.length,original_integrity_controls:2+prior.reviews.length,current_source_route_controls:1,actual_checker_controls:cli.length,controls,cli,
 prior_review_files_preserved:prior.reviews.length,all_overall_admissions_incomplete:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],json(report),{flag:'wx'});console.log(JSON.stringify(report));
