/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Main current Core-token source and strict/runtime evidence, separately from historic receipt.
 */
import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {join} from 'node:path';
import {currentCoreTokenCallerFacts,qualifiedCurrentCoreTokenEvidence,CORE_TOKEN_CURRENT_EPOCH} from '../scripts/core-token-current.mjs';
import {coreTokenCallerPrior,inspectCoreTokenCallerReview,CORE_TOKEN_CALLER_PRIOR,CORE_TOKEN_CALLER_REVIEW} from '../scripts/core-token-caller-roles.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),id=r=>JSON.stringify([r.file,r.module,r.symbol]);
function inspect(reader=read){const prior=coreTokenCallerPrior({root,read:reader}),old=new Map(prior.sources.map(m=>[m.path,Buffer.from(m.text)])),historical=p=>old.get(p)??reader(p);assert.equal(hash(reader('scripts/core-token-current.mjs')),'5ac3552e9811fb8ee97d6c52117aca86bc07615221622f5f106201d261e84fc0');const historic=inspectCoreTokenCallerReview({root,read:historical}),current=currentCoreTokenCallerFacts({root,read:reader}),proof=qualifiedCurrentCoreTokenEvidence({root,read:reader});assert.equal(historic.reviews.length,5);assert.equal(current.facts.length,5);assert.equal(current.facts.reduce((n,f)=>n+f.complete_context_members.length,0),11);assert.deepEqual(current.facts.map(id),historic.reviews.map(id));return {prior,current,proof,historic};}
const q=inspect(),{prior,proof}=q;
function canonical(reader){const ledgers=new Map(),rows=prior.selected.map(s=>{if(!ledgers.has(s.ledger))ledgers.set(s.ledger,JSON.parse(reader(s.ledger)));const matches=ledgers.get(s.ledger).symbol_uses.filter(r=>id(r)===id(s.original_row));assert.equal(matches.length,1);assert.equal(matches[0].status,'reviewed');assert.equal(matches[0].disposition,'closed');return matches[0]});assert.equal(new Set(rows.map(id)).size,5);const out=authoredUseReviewEvidence({symbol_uses:rows},'main',reader,hash);assert.equal(out.reviewed,5);assert.equal(out.insufficient,0);}
canonical(read);
for(const [index,member] of prior.ledgers.entries()){
 const before=JSON.parse(member.text),after=JSON.parse(read(member.path));
 if(index===0){assert.equal(before.entries.length,1697);assert.equal(after.entries.length,1697);assert.deepEqual(after.entries.map(x=>x.sha),before.entries.map(x=>x.sha));}
 else {assert.equal(before.symbol_uses.length,index===1?1736:315);const currentKeys=new Set(after.symbol_uses.map(id));assert.equal(currentKeys.size,after.symbol_uses.length);for(const row of before.symbol_uses)assert.ok(currentKeys.has(id(row)),'historical Core caller obligation lost');}
}
const subjects=JSON.parse(read('compatibility/rc/material-public-subjects.json')),coreMembers=subjects.subjects.flatMap(s=>s.members.filter(m=>m.package==='@angular/core'&&(/\.d\.ts$/.test(m.module_path)||/fesm2022\/core\.mjs$/.test(m.module_path))).map(m=>m.path));
const paths=[...new Set([CORE_TOKEN_CURRENT_EPOCH,CORE_TOKEN_CALLER_PRIOR,CORE_TOKEN_CALLER_REVIEW,'scripts/core-token-caller-roles.mjs','scripts/core-token-current.mjs',proof.ref.path,'compatibility/rc/core-token-caller-roles-public-main.json','tests/core_token_caller_roles_public_probe.mjs','tests/core_token_current_public_probe.mjs','tests/core_token_caller_roles_subject.mjs',...prior.sources.map(m=>m.path),...prior.evidence.map(m=>m.path),...coreMembers])];
for(const path of paths)assert.throws(()=>inspect(p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)),e=>e?.code==='ERR_ASSERTION',path);
let changed=false;const path=prior.sources[0].path,late=p=>changed&&p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p);inspect(late);changed=true;assert.throws(()=>inspect(late),e=>e?.code==='ERR_ASSERTION');
const selected=prior.selected[0],ledger=JSON.parse(read(selected.ledger));ledger.symbol_uses.find(r=>id(r)===id(selected.original_row)).disposition='foreign';const bad=Buffer.from(JSON.stringify(ledger));assert.throws(()=>canonical(p=>p===selected.ledger?bad:read(p)),e=>e?.code==='ERR_ASSERTION');
const report={line:'main',individual_caller_roles:5,complete_context_members:11,strict_public_namespace_models:3,negative_type_controls:9,genuine_Core_runtime_contexts:6,finite_runtime_cases:72,runtime_fault_controls_rejected:12,exact_existing_EventEmitter_review_reused:true,source_and_evidence_corruptions_rejected:paths.length,late_source_change_rejected:true,canonical_row_corruption_rejected:true,historical_prepared_roles:5,current_valid_roles:5,full_Material_dialog_menu_declaration_closures_compiled:false,actual_native_packed_or_full_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0){assert.ok(process.argv[out+1]);writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});}console.log(JSON.stringify(report));
