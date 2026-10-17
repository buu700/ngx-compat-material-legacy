/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Re-evaluate current source guards and all native no-run refusals; never emulate runtime success. */
import assert from 'node:assert/strict';
import {recordedStageSubject} from '../scripts/chip-history-union.mjs';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {chipAuditSourcePrior,inspectChipAuditSourceRoles,currentChipAuditNativeDefinitions} from '../scripts/chip-audit-source-requalification.mjs';
import {modernChipScopeEvidenceOk} from '../scripts/upstream-modern-chip-scope.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from '../scripts/authored-current-use-inventory.mjs';
const root=process.cwd(),read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),json=x=>JSON.stringify(x,null,2)+'\n';
const before=chipAuditSourcePrior(),w=JSON.parse(read('compatibility/rc/chip-audit-source-requalification-worksheet.json')),inputs=JSON.parse(read('compatibility/rc/chip-audit-source-requalification-inputs.json')),out=JSON.parse(read('compatibility/rc/chip-audit-source-requalification-outputs.json')),line=before.line;
const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{maxBuffer:32*1024*1024});
assert.equal(inputs.source_parent,before.source_parent);assert.equal(hash(read(out.inputs.path)),out.inputs.sha256);assert.equal(hash(read(before.ledger_path)),out.expected_ledger_sha256);
for(const member of inputs.source_subjects){const bytes=['tests/audit_test_context.py','tests/test_audit_test_context.py'].includes(member.path)?recordedStageSubject('chip-source-requalification',member.path,read):read(member.path);assert.equal(hash(bytes),member.sha256);}
for(const member of [...before.reviews,...before.authored_reviews]){assert.equal(hash(read(member.path)),member.sha256);assert.equal(git('show',before.source_parent+':'+member.path).toString(),member.text);}
for(const member of before.sources.filter(m=>m.path.startsWith('projects/')))assert.equal(hash(read(member.path)),member.sha256,'source qualification changed product bytes');
const roles=inspectChipAuditSourceRoles();assert.deepEqual(roles,JSON.parse(read(inputs.role_proof.path)));assert.equal(hash(read(inputs.role_proof.path)),inputs.role_proof.sha256);assert.equal(roles.roles.length,27);assert.equal(roles.unchanged_upstream_bindings,26);assert.equal(roles.owned_replacement_roles,1);
const defs=await currentChipAuditNativeDefinitions({checkNoCoordinator:true});assert.deepEqual(defs.map(({no_run,...d})=>d),inputs.native_definitions);
const entries=JSON.parse(read(before.ledger_path)).entries,priorEntries=JSON.parse(before.ledger_text).entries,bySHA=new Map(entries.map(e=>[e.sha,e]));assert.equal(entries.length,1697);
const updated=new Set(out.updated_entry_shas),nativeChanges=new Map(out.refreshed_native_profiles.map(r=>[r.sha,r]));let labels=0;
for(const old of priorEntries){
 const actual=bySHA.get(old.sha);assert.equal(actual.final_disposition,old.final_disposition);labels++;
 if(!updated.has(old.sha)){assert.deepEqual(actual,old);continue;}
 if(nativeChanges.has(old.sha)){
  const row=nativeChanges.get(old.sha),expected=structuredClone(old);expected.individual_proof[row.field].source_members=actual.individual_proof[row.field].source_members;expected.evidence_report=row.path;if(expected.source_check&&typeof expected.source_check.evidence_report_sha256==='string')expected.source_check.evidence_report_sha256=hash(read(row.path));assert.deepEqual(actual,expected);
  const body=JSON.parse(read(row.path));assert.deepEqual(body.individual_proof,actual.individual_proof);assert.equal(body.recorded_source_context.prior_review.path,old.evidence_report);assert.equal(body.recorded_source_context.prior_review.sha256,hash(read(old.evidence_report)));assert.equal(body.recorded_source_context.prior_entry.entry_sha256,hash(json(old)));
 }
}
for(const row of defs){const entry=bySHA.get(row.sha),scope=entry.individual_proof[row.field];assert.deepEqual(scope.source_members,row.definition.members.map(path=>({path,sha256:hash(read(path))})));if(entry.source_check?.evidence_report_sha256)assert.equal(entry.source_check.evidence_report_sha256,hash(read(entry.evidence_report)),'stale native evidence document seal');}
assert.equal(out.repaired_preexisting_stale_document_seals.length,21);
const modernBody=JSON.parse(read(out.modern_review.path)),paths=candidateProductSourcePaths(root).sort();assert.equal(hash(read(out.modern_review.path)),out.modern_review.sha256);
for(const sha of w.modern_source_scopes){const entry=bySHA.get(sha),prior=priorEntries.find(e=>e.sha===sha);assert.equal(modernChipScopeEvidenceOk(modernBody,entry,read,paths,line),true);assert.equal(entry.reason,prior.reason);assert.deepEqual(modernBody.reviews.find(r=>r.sha===sha),JSON.parse(read(prior.evidence_report)).reviews.find(r=>r.sha===sha));}
const foreign=structuredClone(modernBody);foreign.candidate_context=JSON.parse(read(modernBody.source_requalification.prior_review.path)).candidate_context;
assert.equal(modernChipScopeEvidenceOk(foreign,bySHA.get(w.modern_source_scopes[0]),read,paths,line),false,'preceding candidate source context cannot qualify new product');
const frozen=JSON.parse(read(before.authored_stores[0].path)),candidate=JSON.parse(read(before.authored_stores[1].path)),frozenOld=JSON.parse(before.authored_stores[0].text),candidateOld=JSON.parse(before.authored_stores[1].text);
assert.deepEqual(candidate.symbol_uses,candidateOld.symbol_uses);assert.equal(frozen.symbol_uses.length,frozenOld.symbol_uses.length);let roleRefs=0;
for(const [i,row]of frozen.symbol_uses.entries()){
 const old=frozenOld.symbol_uses[i];if(row.file!=='legacy-chips/chip-list.ts'){assert.deepEqual(row,old);continue;}
 const expected=structuredClone(old);expected.source_review=row.source_review;expected.source_review_history=[...(old.source_review_history??[]),row.source_review_history.at(-1)];assert.deepEqual(row,expected);assert.deepEqual(row.source_review,out.role_review);assert.deepEqual(row.source_review_history.at(-1).prior_source_review,old.source_review);roleRefs++;
}
assert.equal(roleRefs,27);const roleBody=JSON.parse(read(out.role_review.path));assert.equal(roleBody.reviews.length,27);
for(const row of roleBody.reviews){const ref=row.chip_audit_source_requalification.prior_source_review,oldBody=JSON.parse(read(ref.path)),old=oldBody.reviews.find(r=>r.file===row.file&&r.module===row.module&&r.symbol===row.symbol);assert.equal(hash(read(ref.path)),ref.sha256);assert.equal(row.conclusion,old.conclusion);assert.equal(row.candidate_source_sha256,roles.candidate_source_sha256);assert.equal(row.chip_audit_source_requalification.prior_decision,old.decision);assert.deepEqual(row.independent_evidence.slice(0,-1),old.independent_evidence);assert.deepEqual(row.independent_evidence.at(-1),inputs.role_proof);}
const frozenEvidence=authoredUseReviewEvidence(frozen,line,read,hash),active=scanCurrentAuthoredUses({root}),currentEvidence=currentAuthoredUseAdmission({current:active,frozen:frozen.symbol_uses,candidate,line,readMember:read});
assert.equal(frozenEvidence.reviewed,1446);assert.equal(frozenEvidence.insufficient,0);assert.equal(currentEvidence.review_evidence.reviewed,178);assert.equal(currentEvidence.review_evidence.insufficient,0);assert.equal(currentEvidence.inventory.open,130);assert.equal(currentEvidence.ready,false);
const work=mkdtempSync(join(tmpdir(),'ngx-chip-audit-source-'));let cli=0;
try{
 const seed=JSON.parse(read('compatibility/f10/upstream-sha-risk-bootstrap.json'));seed.commits=seed.commits.filter(e=>w.modern_source_scopes.includes(e.sha));writeFileSync(join(work,'seed.json'),json(seed));
 for(const corrupt of [false,true]){
  const rows=w.modern_source_scopes.map(s=>structuredClone(bySHA.get(s)));if(corrupt)rows[0].individual_proof.proof_kind='documentation-only';writeFileSync(join(work,'ledger.json'),json({entries:rows}));
  const report=join(work,'report.json'),child=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--admission','--line',line,'--seed',join(work,'seed.json'),'--ledger',join(work,'ledger.json'),'--report',report],{encoding:'utf8',timeout:60000});assert.equal(child.error,undefined,child.stderr);assert.notEqual(child.status,null);const result=JSON.parse(readFileSync(report));assert.equal(result.g11_claim,'not-passed');assert.equal(result.disposition_admission,'incomplete');
  if(corrupt)assert.ok(result.evidence_failures.some(e=>e.sha===rows[0].sha&&e.reason==='invalid-modern-chip-source-scope'));else{assert.equal(result.missing_evidence,0);assert.equal(result.insufficient_sensitive,0);assert.equal(result.insufficient_behavior,0);}
  cli++;
 }
}finally{rmSync(work,{recursive:true,force:true});}
const report={schema_version:1,line,current_native_guards:defs.length,all_current_guards_refuse_missing_coordinator:true,refreshed_native_profiles:nativeChanges.size,current_modern_source_scopes:3,preexisting_stale_document_seals_repaired:21,modern_source_context_rejection_controls:1,actual_CLI_controls:cli,all1697_dispositions_preserved:labels===1697,updated_existing_role_references:roleRefs,upstream_import_bindings:26,owned_replacement_roles:1,prior_authored_documents_preserved:before.authored_reviews.length,prior_SHA_review_documents_preserved:before.reviews.length,frozen_reviewed:frozenEvidence.reviewed,current_reviewed:currentEvidence.review_evidence.reviewed,current_open:currentEvidence.inventory.open,new_semantic_closures:0,combined_historical_union_pending:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],json(report),{flag:'wx'});console.log(JSON.stringify(report));
