/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Prepared caller review and exact evidence/ledger guards. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {coreTokenCallerFacts,qualifiedCoreTokenEvidence,inspectCoreTokenCallerReview,CORE_TOKEN_CALLER_PRIOR,CORE_TOKEN_CALLER_REVIEW} from '../scripts/core-token-caller-roles.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),{prior,facts}=coreTokenCallerFacts({root}),qualified=qualifiedCoreTokenEvidence({root}),integrated=process.argv.includes('--integrated'),id=r=>JSON.stringify([r.file,r.module,r.symbol]);
function canonical(readMember){
 const ref={path:CORE_TOKEN_CALLER_REVIEW,sha256:hash(readMember(CORE_TOKEN_CALLER_REVIEW))};
 for(const [i,m]of prior.ledgers.entries()){
  const data=JSON.parse(readMember(m.path)),rows=i===0?data.entries:data.symbol_uses;assert.equal(rows.length,[1697,1736,315][i]);
  if(!integrated)assert.equal(hash(readMember(m.path)),m.sha256,'preparation changed canonical ledger');
  if(i!==2)continue;
  for(const {original_row:before}of prior.selected){const now=rows.find(r=>id(r)===id(before)),expected=integrated?{...before,status:'reviewed',disposition:'closed',source_review:ref}:before;assert.equal(isDeepStrictEqual(now,expected),true,'unregistered Core caller canonical transition');}
 }
}
function inspect(readMember=read){const body=inspectCoreTokenCallerReview({root,read:readMember});canonical(readMember);return body;}
const body=inspect();assert.equal(body.reviews.length,5);assert.equal(facts.reduce((n,f)=>n+f.complete_context_members.length,0),11);
const subjects=JSON.parse(read('compatibility/rc/material-public-subjects.json')),coreMembers=subjects.subjects.flatMap(s=>s.members.filter(m=>m.package==='@angular/core'&&(/\.d\.ts$/.test(m.module_path)||/fesm2022\/core\.mjs$/.test(m.module_path))).map(m=>m.path));
const paths=[...new Set([CORE_TOKEN_CALLER_PRIOR,CORE_TOKEN_CALLER_REVIEW,'scripts/core-token-caller-roles.mjs',qualified.ref.path,'tests/core_token_caller_roles_public_probe.mjs','tests/core_token_caller_roles_subject.mjs',...prior.sources.map(m=>m.path),...prior.evidence.map(m=>m.path),...(integrated?[]:prior.ledgers.map(m=>m.path)),...coreMembers])];
for(const path of paths){const bad=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspect(p=>p===path?bad:read(p)),e=>e?.code==='ERR_ASSERTION',path);}
let changed=false;const path=prior.sources[0].path,bad=Buffer.concat([read(path),Buffer.from('\n')]),late=p=>changed&&p===path?bad:read(p);inspect(late);changed=true;assert.throws(()=>inspect(late),e=>e?.code==='ERR_ASSERTION');
const ledger=prior.ledgers[2],badLedger=JSON.parse(read(ledger.path));badLedger.symbol_uses.find(r=>id(r)===id(prior.selected[0].original_row)).disposition='foreign';const badBytes=Buffer.from(JSON.stringify(badLedger));assert.throws(()=>canonical(p=>p===ledger.path?badBytes:read(p)),e=>e?.code==='ERR_ASSERTION');
const report={schema_version:1,line:prior.line,individual_caller_roles:5,complete_context_members:11,strict_public_namespace_models:3,negative_type_controls:9,genuine_Core_runtime_contexts:6,finite_runtime_cases:72,runtime_fault_controls_rejected:12,renderer_protocols_each_context:6,untouched_tagged_renderer_comparisons_each_context:4,exact_existing_EventEmitter_review_reused:true,source_and_evidence_corruptions_rejected:paths.length,late_source_change_rejected:true,canonical_row_corruption_rejected:true,canonical_closures_integrated:integrated?5:0,all_canonical_ledger_bytes_preserved:!integrated,all1697_SHA_1736_frozen_315_additional_obligations_retained:true,full_Material_dialog_menu_declaration_closures_compiled:false,actual_legacy_parents_or_native_renderer_executed:false,actual_native_packed_or_full_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
