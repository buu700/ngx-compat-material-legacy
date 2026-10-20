/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Preparation guards retain all canonical bytes and distinguish historical inventories. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {remainingCoreFacts,qualifiedRemainingCoreEvidence,inspectRemainingCoreReview,REMAINING_CORE_PRIOR,REMAINING_CORE_REVIEW} from '../scripts/remaining-core-caller-roles.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),id=r=>JSON.stringify([r.file,r.module,r.symbol]),{prior,facts,historical_inventory,reused_NgZone_public_behavior}=remainingCoreFacts({root}),qualified=qualifiedRemainingCoreEvidence({root}),integrated=process.argv.includes('--integrated');
function canonical(readMember){
 const ref={path:REMAINING_CORE_REVIEW,sha256:hash(readMember(REMAINING_CORE_REVIEW))};
 for(const [index,m]of prior.ledgers.entries()){
  const actual=JSON.parse(readMember(m.path)),rows=index===0?actual.entries:actual.symbol_uses;assert.equal(rows.length,[1697,1736,315][index]);if(!integrated)assert.equal(hash(readMember(m.path)),m.sha256,'preparation changed canonical bytes');
  for(const selected of prior.selected.filter(s=>s.ledger===m.path)){const before=selected.original_row,now=rows.find(r=>id(r)===id(before)),expected=integrated?{...before,status:'reviewed',disposition:'closed',source_review:ref}:before;assert.equal(isDeepStrictEqual(now,expected),true,'unregistered remaining Core canonical transition');}
 }
}
function inspect(readMember=read){const body=inspectRemainingCoreReview({root,read:readMember});canonical(readMember);return body;}
const body=inspect();assert.equal(body.reviews.length,16);assert.equal(facts.reduce((n,f)=>n+f.complete_context_members.length,0),28);assert.equal(body.reviews.filter(r=>r.conclusion==='test-only').length,2);assert.equal(historical_inventory.length,1);assert.equal(historical_inventory[0].historical_inventory_counts_admitted,false);
const material=JSON.parse(read('compatibility/rc/material-public-subjects.json')),zone=JSON.parse(read('compatibility/rc/ng-zone-public-subjects.json'));
const paths=[...new Set([REMAINING_CORE_PRIOR,REMAINING_CORE_REVIEW,'scripts/remaining-core-caller-roles.mjs',qualified.ref.path,'tests/remaining_core_caller_roles_public_probe.mjs','tests/remaining_core_caller_roles_subject.mjs',...prior.sources.map(m=>m.path),...prior.evidence.map(m=>m.path),...reused_NgZone_public_behavior.sources.map(m=>m.path),...(integrated?[]:prior.ledgers.map(m=>m.path)),...material.subjects.flatMap(s=>s.members.filter(m=>m.package==='@angular/core'&&m.module_path.endsWith('.d.ts')).slice(0,1).map(m=>m.path)),...zone.subjects.flatMap(s=>s.members.map(m=>m.path))])];
for(const path of paths){const bad=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspect(p=>p===path?bad:read(p)),e=>e?.code==='ERR_ASSERTION',path);}
for(const path of [prior.sources[0].path,historical_inventory[0].path]){let changed=false;const bad=Buffer.concat([read(path),Buffer.from('\n')]),late=p=>changed&&p===path?bad:read(p);inspect(late);changed=true;assert.throws(()=>inspect(late),e=>e?.code==='ERR_ASSERTION');}
for(const selected of [prior.selected[0],prior.selected.at(-1)]){const path=selected.ledger,data=JSON.parse(read(path));data.symbol_uses.find(r=>id(r)===id(selected.original_row)).disposition='foreign';const bad=Buffer.from(JSON.stringify(data));assert.throws(()=>canonical(p=>p===path?bad:read(p)),e=>e?.code==='ERR_ASSERTION');}
const report={schema_version:1,line:prior.line,individual_caller_roles:16,frozen_reviews_prepared:9,additional_reviews_prepared:7,source_files:14,complete_context_members:28,actual_inject_expressions:9,strict_public_namespace_models:3,negative_type_controls:6,genuine_Core_Node_Zone_contexts:6,finite_runtime_cases:162,genuine_boolean_cases_each_context:21,runtime_fault_controls_rejected:15,existing_exact_test_only_EventEmitter_review_reused:true,prior_public_NgZone_runtime_contexts_reused:10,prior_whole_inventory_counts_admitted:false,current_test_only_reviews:2,source_and_evidence_corruptions_rejected:paths.length,late_source_and_inventory_changes_rejected:2,canonical_row_corruptions_rejected:2,canonical_closures_integrated:integrated?16:0,all_canonical_ledger_bytes_preserved:!integrated,all1697_SHA_1736_frozen_315_additional_obligations_retained:true,default_nonce_root_factory_or_CSP_security_qualified:false,complete_legacy_node_graphs_or_native_frames_qualified:false,actual_native_packed_or_full_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
