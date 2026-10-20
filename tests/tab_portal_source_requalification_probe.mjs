/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Role preparation controls. Every live ledger remains unchanged and unqualified. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareTabPortalRoleDecisions,tabPortalRequalificationPrior} from '../scripts/tab-portal-source-requalification.mjs';
import {TAB_BODY,TAB_ADAPTER} from '../scripts/tab-portal-explicit-container-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),prior=tabPortalRequalificationPrior({root}),prepared=prepareTabPortalRoleDecisions({root}),controls=[];
assert.equal(prepared.existing_roles.length,12);assert.equal(prepared.additional_routes.length,7);assert.equal(prepared.native_successor_requirements.case_ids.length,54);assert.equal(prepared.new_use_closures,0);assert.equal(prepared.actual_native_packed_or_floor_qualified,false);
for(const role of prepared.existing_roles){assert.equal(role.status,'pending-finite-integration-and-source-requalification');assert.ok(role.decision.length>80);assert.equal(role.prior_case.candidate_source_sha256,prior.original_product_source.sha256);assert.equal(role.after_occurrences.length,role.before_occurrences.length+(role.symbol==='Inject'?1:0));}
for(const role of prepared.additional_routes){assert.equal(role.status,'pending-finite-integration-and-source-requalification');assert.ok(role.decision.length>80);assert.ok(role.actual_references.length);}
const paths=prior.preimages.map(m=>m.path).concat(prepared.prior.path,TAB_BODY,TAB_ADAPTER,'compatibility/rc/tab-portal-explicit-container-source-impact.json',prepared.executed_public_evidence.path);assert.equal(new Set(paths).size,22);
for(const path of paths){const changed=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>prepareTabPortalRoleDecisions({root,read:p=>p===path?changed:read(p)}),error=>error?.code==='ERR_ASSERTION','changed task/source/evidence accepted: '+path);controls.push(path);}
for(const member of prior.preimages)assert.equal(hash(read(member.path)),member.sha256);
const report={schema_version:1,line:prepared.line,source_decisions_prepared:12,new_helper_decisions_prepared:7,native_case_ids_retained:54,corruptions_rejected:controls,all17_source_preimages_and_all_live_ledgers_unchanged:true,new_use_closures:0,current_source_history_or_native_admission:false,actual_native_packed_or_floor_qualified:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,corruptions_rejected:controls.length}));
