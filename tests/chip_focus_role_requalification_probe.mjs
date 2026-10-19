/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Role/source receipts only, never a runtime or new-use closure. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildChipFocusRoleRequalification,inspectChipFocusRoleRequalification,chipFocusRolePrior,CHIP_FOCUS_ROLE_PRIOR,CHIP_FOCUS_ROLE_REVIEW,CHIP_FOCUS_ROLE_WITNESS} from '../scripts/chip-focus-role-requalification.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {currentAuthoredUseAdmission} from '../scripts/authored-current-use-inventory.mjs';
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),prior=chipFocusRolePrior(),built=buildChipFocusRoleRequalification(),current=inspectChipFocusRoleRequalification(),controls=[];
const selected=built.frozen.symbol_uses.filter(r=>r.file==='legacy-chips/chip.ts'&&r.disposition==='closed');assert.equal(selected.length,21);
for(const [id,mutate]of [
 ['stale-candidate-source',b=>b.reviews[0].candidate_source_sha256=prior.before_source.sha256],
 ['ambiguous-role',b=>b.reviews.push(structuredClone(b.reviews[0]))],
 ['self-evidence',b=>b.reviews[0].independent_evidence=[{path:CHIP_FOCUS_ROLE_REVIEW,sha256:'0'.repeat(64)}]],
]){const body=structuredClone(built.review);mutate(body);const bytes=Buffer.from(JSON.stringify(body)),rows=structuredClone(selected);for(const r of rows)r.source_review.sha256=hash(bytes);const result=authoredUseReviewEvidence({symbol_uses:rows},prior.line,p=>p===CHIP_FOCUS_ROLE_REVIEW?bytes:read(p),hash);assert.equal(result.insufficient,1,id);assert.equal(result.reviewed,20);controls.push({id,result:'rebound receipt still rejected'});}
for(const [field,value]of [['current_source_population_sha256','0'.repeat(64)],['current_uses',1957],['current_source_files',532],['symbol_use_count',309]]){const candidate=structuredClone(built.candidate);candidate[field]=value;const r=currentAuthoredUseAdmission({current:built.discovered,frozen:built.frozen.symbol_uses,candidate,line:prior.line,readMember:read});assert.equal(r.source_snapshot_valid,false);assert.equal(r.ready,false);controls.push({id:'wrong-snapshot-'+field,result:'rejected'});}
for(const path of [CHIP_FOCUS_ROLE_PRIOR,prior.current_source.path,prior.independent_evidence[0].path]){assert.throws(()=>buildChipFocusRoleRequalification({read:p=>p===path?Buffer.concat([read(p),Buffer.from(' changed')]):read(p)}));controls.push({id:'changed-authenticated-subject-'+path,result:'rejected'});}
const wrong=JSON.parse(read(CHIP_FOCUS_ROLE_WITNESS));wrong.all24_chip_role_shapes_identical=false;assert.throws(()=>inspectChipFocusRoleRequalification({read:p=>p===CHIP_FOCUS_ROLE_WITNESS?Buffer.from(JSON.stringify(wrong)):read(p)}));controls.push({id:'forged-role-witness',result:'rejected'});
const frozen=structuredClone(built.frozen),open=frozen.symbol_uses.find(r=>r.file==='legacy-chips/chip.ts'&&r.disposition!=='closed');assert.ok(open);open.disposition='closed';open.status='reviewed';assert.throws(()=>inspectChipFocusRoleRequalification({read:p=>p===prior.stores[0].path?Buffer.from(JSON.stringify(frozen)):read(p)}));controls.push({id:'unreviewed-open-role-closure',result:'rejected'});
assert.ok(Object.isFrozen(prior.selected_rows[0]));assert.throws(()=>prior.selected_rows[0].disposition='open');controls.push({id:'immutable-prior',result:'rejected'});
const report={...current,controls,original_source_judgments_and_independent_receipts_preserved:true,original_scope_row_count:1736,current_scope_row_count:308,actual_native_browser_or_floor_execution:false};if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,controls:controls.length}));
