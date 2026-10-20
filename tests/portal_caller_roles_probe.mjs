/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current whole-caller bindings and immutable evidence fail closed on changes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {portalRoleSourceFacts,preparePortalRoleReview,PORTAL_ROLES_RECIPE,PORTAL_ROLES_PRIOR} from '../scripts/portal-caller-roles.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),{prior,facts}=portalRoleSourceFacts({root}),typeProofPath='compatibility/rc/portal-caller-roles-public-'+(prior.line==='main'?'main':'21')+'.json',body=preparePortalRoleReview({root,read,typeProofPath}),path='compatibility/f10/authored-use-reviews/portal-caller-roles.json';
assert.equal(isDeepStrictEqual(body,JSON.parse(read(path))),true,'changed individually reviewed portal roles');assert.equal(facts.length,25);assert.equal(prior.sources.length,13);assert.equal(body.reviews.length,25);assert.equal(facts.reduce((n,r)=>n+r.source_role.occurrences.length,0),36);assert.equal(facts.reduce((n,r)=>n+r.source_role.complete_caller_members.length,0),47);for(const r of body.reviews){assert.ok(r.decision.length>160);assert.ok(r.source_role.complete_caller_members.length);assert.ok(r.independent_evidence.length>=6);}
const paths=[PORTAL_ROLES_PRIOR,PORTAL_ROLES_RECIPE,typeProofPath,...prior.sources.map(m=>m.path),...prior.evidence.map(m=>m.path)];assert.equal(new Set(paths).size,paths.length);for(const path of paths){const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>preparePortalRoleReview({root,typeProofPath,read:p=>p===path?bytes:read(p)}),e=>e?.code==='ERR_ASSERTION',path);}
let changed=false;const selected=prior.sources[0].path,late=p=>changed&&p===selected?Buffer.concat([read(p),Buffer.from('\n')]):read(p);preparePortalRoleReview({root,typeProofPath,read:late});changed=true;assert.throws(()=>preparePortalRoleReview({root,typeProofPath,read:late}),e=>e?.code==='ERR_ASSERTION');
// This task prepares one review only. Canonical metadata belongs to integration.
for(const ledger of prior.ledgers.filter(m=>m.path.includes('authored-dependency-'))){const selected=prior.selected.filter(r=>r.ledger===ledger.path);const current=JSON.parse(read(ledger.path)).symbol_uses;for(const r of selected){const actual=current.find(x=>x.file===r.original_row.file&&x.module===r.original_row.module&&x.symbol===r.original_row.symbol);assert.equal(isDeepStrictEqual(actual,r.original_row),true,'premature portal closure or roster change');}}
const report={schema_version:1,line:prior.line,individual_caller_roles:25,current_source_files:13,identifier_uses:36,complete_enclosing_members:47,strict_public_type_models:3,source_and_evidence_corruptions_rejected:paths.length,late_mutation_rejected:true,original_selected_ledger_rows_preserved:true,source_closures_prepared:25,source_closures_integrated:0,all1697_SHA_1736_frozen_315_additional_obligations_retained:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
