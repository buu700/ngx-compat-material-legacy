/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source binding cohort only. Native/runtime qualification still needs a coordinator. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {currentChipAuditNativeDefinitions,inspectChipAuditSourceRoles} from './chip-audit-source-requalification.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {MODERN_CHIP_SHAS,modernChipScopeEvidenceOk} from './upstream-modern-chip-scope.mjs';
import {CHIP_EDIT_SHAS,chipEditScopeEvidenceOk} from './upstream-chip-edit-scope.mjs';
import {CHIP_INPUT_API_SHAS,chipInputApiScopeEvidenceOk} from './upstream-chip-input-api-scope.mjs';
import {CHIP_MODERNIZATION_SHAS,chipModernizationScopeEvidenceOk} from './upstream-chip-modernization-scope.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';
export const CHIP_SOURCE_BATCH_PRIOR='compatibility/rc/chip-source-batch-prior.json.gz';
const pins={main:'9885bd90b6b53c881c60906397133c7ef6c0a9abfdc91d29baa846c419c64f5e','21.x':'dbce9a4b1899267120f9f2c3ad6bf77dc104ee09ae0af3ef03a282b0565f234b'};
const hash=b=>createHash('sha256').update(b).digest('hex');
export function chipSourceBatchPrior(root=process.cwd(),read=p=>readFileSync(join(root,p))){const bytes=read(CHIP_SOURCE_BATCH_PRIOR),data=JSON.parse(gunzipSync(bytes));assert.equal(hash(bytes),pins[data.line],'changed chip source batch prior');assert.equal(hash(data.ledger_text),data.ledger_sha256);assert.equal(JSON.parse(data.ledger_text).entries.length,1697);for(const m of [...data.reviews,...data.sources,...data.authored_stores,...data.authored_reviews])assert.equal(hash(m.text),m.sha256);return data;}
export const CHIP_SOURCE_BATCH_UNITS=[{unit:'modern-chip',shas:MODERN_CHIP_SHAS,validate:modernChipScopeEvidenceOk},{unit:'chip-edit',shas:CHIP_EDIT_SHAS,validate:chipEditScopeEvidenceOk},{unit:'chip-input-api',shas:CHIP_INPUT_API_SHAS,validate:chipInputApiScopeEvidenceOk},{unit:'chip-modernization',shas:CHIP_MODERNIZATION_SHAS,validate:chipModernizationScopeEvidenceOk}];
export async function inspectChipSourceBatch({root=process.cwd(),requireNoCoordinator=false}={}){
 const read=p=>readFileSync(join(root,p)),prior=chipSourceBatchPrior(root,read),entries=JSON.parse(read(prior.ledger_path)).entries,definitions=await currentChipAuditNativeDefinitions({root,checkNoCoordinator:requireNoCoordinator}),stale=[],sourceRows=[];
 for(const r of definitions){const entry=entries.find(e=>e.sha===r.sha);assert.deepEqual(entry.individual_proof[r.field].source_members.map(m=>m.path),r.definition.members);for(const m of entry.individual_proof[r.field].source_members){const actual=hash(read(m.path));if(actual!==m.sha256)stale.push({sha:r.sha,path:m.path,previous_sha256:m.sha256,current_sha256:actual});}}
 const paths=candidateProductSourcePaths(root).sort();
 for(const unit of CHIP_SOURCE_BATCH_UNITS)for(const sha of unit.shas){const e=entries.find(e=>e.sha===sha),body=JSON.parse(read(e.evidence_report));assert.equal(unit.validate(body,e,read,paths,prior.line),true,sha);sourceRows.push({unit:unit.unit,sha,evidence_report:e.evidence_report,sha256:hash(read(e.evidence_report))});}
 for(const m of [...prior.authored_stores,...prior.authored_reviews])assert.equal(hash(read(m.path)),m.sha256,'unexpected role source rewrite '+m.path);
 const frozen=JSON.parse(read(prior.authored_stores[0].path)),candidate=JSON.parse(read(prior.authored_stores[1].path)),frozenEvidence=authoredUseReviewEvidence(frozen,prior.line,read,hash),active=scanCurrentAuthoredUses({root}),currentEvidence=currentAuthoredUseAdmission({root,current:active,frozen:frozen.symbol_uses,candidate,line:prior.line,readMember:read});
 assert.equal(frozenEvidence.reviewed,1446);assert.equal(frozenEvidence.insufficient,0);assert.equal(currentEvidence.review_evidence.reviewed,178);assert.equal(currentEvidence.review_evidence.insufficient,0);assert.equal(currentEvidence.inventory.open,130);assert.equal(currentEvidence.ready,false);
 const roles=inspectChipAuditSourceRoles({root});assert.equal(roles.reviewed_roles,27);assert.equal(roles.unchanged_upstream_bindings,26);assert.equal(roles.owned_replacement_roles,1);
 const population=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','projects','testing','reference','fixtures'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean).sort();assert.deepEqual(population,prior.product_members.map(m=>m.path).sort(),'changed product/reference/fixture population');
 for(const m of prior.product_members)assert.equal(hash(read(m.path)),m.sha256,'unreviewed product change '+m.path);
 return {schema_version:1,line:prior.line,native_definitions:definitions,stale_native_bindings:stale,source_subjects:sourceRows,existing_role_evidence:{frozen_reviewed:1446,current_reviewed:178,frozen_open:290,current_open:130,insufficient:0,unchanged_authored_review_documents:prior.authored_reviews.length},chip_list_roles:roles,all_current_native_guards_refuse_missing_coordinator:requireNoCoordinator,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
