/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Combined live source decisions; all native execution obligations stay open. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chipSourceBatchPrior,inspectChipSourceBatch,CHIP_SOURCE_BATCH_UNITS} from '../scripts/chip-source-batch-requalification.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),json=v=>JSON.stringify(v,null,2)+'\n';
const prior=chipSourceBatchPrior(),inputs=JSON.parse(read('compatibility/rc/chip-source-batch-inputs.json')),out=JSON.parse(read('compatibility/rc/chip-source-batch-outputs.json')),line=prior.line;
assert.equal(hash(read(out.inputs.path)),out.inputs.sha256);assert.equal(hash(read(prior.ledger_path)),out.expected_ledger_sha256);
for(const member of inputs.source_subjects)assert.equal(hash(read(member.path)),member.sha256);
for(const member of [...prior.reviews,...prior.sources,...prior.authored_stores,...prior.authored_reviews])assert.equal(hash(read(member.path)),member.sha256);
const current=await inspectChipSourceBatch({requireNoCoordinator:true});assert.equal(current.stale_native_bindings.length,0);
assert.deepEqual(current.native_definitions.map(({no_run,...d})=>d),inputs.native_definitions);
assert.deepEqual(current.source_subjects,inputs.modern_source_subjects);assert.deepEqual(current.chip_list_roles,inputs.chip_list_roles);assert.deepEqual(current.existing_role_evidence,inputs.existing_role_evidence);
const entries=JSON.parse(read(prior.ledger_path)).entries,paths=candidateProductSourcePaths(process.cwd()).sort(),selected=[],controls=[];
for(const unit of CHIP_SOURCE_BATCH_UNITS){
 for(const sha of unit.shas){
  const entry=entries.find(e=>e.sha===sha),body=JSON.parse(read(entry.evidence_report));selected.push(entry);
  const forged=structuredClone(entry);forged.individual_proof.proof_kind='documentation-only';assert.equal(unit.validate(body,forged,read,paths,line),false);controls.push({sha,control:'wrong-proof-kind',result:'rejected'});
  const altered=structuredClone(body);altered.actual_native_packed_or_floor_qualified=true;const bytes=Buffer.from(json(altered)),rebound=structuredClone(entry);rebound.source_check.evidence_report_sha256=hash(bytes);
  assert.equal(unit.validate(altered,rebound,p=>p===entry.evidence_report?bytes:read(p),paths,line),false);controls.push({sha,control:'rebound-source-only-runtime-credit',result:'rejected'});
 }
 const entry=entries.find(e=>e.sha===unit.shas[0]),body=JSON.parse(read(entry.evidence_report)),source='projects/ngx-material-legacy/legacy-chips/chip.ts';
 assert.equal(unit.validate(body,entry,p=>p===source?Buffer.from("import {MatChipRow as OtherRow} from '@angular/material/chips';\n"+read(source)):read(p),paths,line),false);controls.push({unit:unit.unit,control:'new-peer-row-route',result:'rejected'});
}
const work=mkdtempSync(join(tmpdir(),'ngx-chip-source-batch-')),cli=[];
try{
 const frozen=JSON.parse(read('compatibility/f10/upstream-sha-risk-bootstrap.json'));frozen.commits=frozen.commits.filter(e=>selected.some(r=>r.sha===e.sha));assert.equal(frozen.commits.length,12);
 for(const corrupt of [false,true]){
  const rows=structuredClone(selected);if(corrupt)for(const row of rows){row.evidence_report='README.md';row.individual_proof={proof_kind:'documentation-only'};}
  const seed=join(work,'seed.json'),ledger=join(work,'ledger.json'),report=join(work,'report.json');writeFileSync(seed,json(frozen));writeFileSync(ledger,json({entries:rows}));
  const child=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--admission','--line',line,'--seed',seed,'--ledger',ledger,'--report',report],{encoding:'utf8',timeout:60000});
  assert.equal(child.error,undefined,child.stderr);assert.equal(child.status,1,child.stderr);const result=JSON.parse(readFileSync(report));assert.equal(result.g11_claim,'not-passed');assert.equal(result.disposition_admission,'incomplete');
  if(corrupt){for(const unit of CHIP_SOURCE_BATCH_UNITS)for(const sha of unit.shas)assert.ok(result.evidence_failures.some(r=>r.sha===sha&&r.reason==='invalid-'+unit.unit+'-source-scope'),sha);}
  else for(const key of ['missing_evidence','insufficient_sensitive','insufficient_behavior','insufficient_inherited','missing_branch_applicability'])assert.equal(result[key],0,key);
  cli.push({control:corrupt?'all12-SHAs-still-mandatory-after-relabel':'all12-valid-source-only',result:'overall-G11-incomplete',exit_code:child.status});
 }
}finally{rmSync(work,{recursive:true,force:true});}
const report={schema_version:1,line,native_requirements:current.native_definitions.length,refreshed_native_profiles:out.refreshed_native_profiles.length,stale_native_bindings:0,all_current_native_guards_refuse_missing_coordinator:true,real_source_subjects:12,controls,actual_checker_controls:cli,existing_role_evidence:current.existing_role_evidence,upstream_import_bindings:26,owned_replacement_roles:1,product_reference_fixture_members_preserved:prior.product_members.length,prior_review_documents_preserved:prior.reviews.length,all1697_dispositions_preserved:true,new_semantic_closures:0,combined_historical_union_pending:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],json(report),{flag:'wx'});console.log(json({...report,controls:controls.length,actual_checker_controls:cli.length}));
