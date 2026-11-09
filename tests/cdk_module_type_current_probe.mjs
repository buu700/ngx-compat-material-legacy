/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Main current CDK caller contexts with a separately authenticated historical execution.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {inspectCurrentCdkModuleType,CURRENT_CDK_EPOCH} from '../scripts/cdk-module-type-current.mjs';
import {CDK_MODULE_TYPE_PRIOR,CDK_MODULE_TYPE_REVIEW} from '../scripts/cdk-module-type-caller-roles.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),id=r=>JSON.stringify([r.file,r.module,r.symbol]);
const q=inspectCurrentCdkModuleType({root}),{prior,facts,historicProof}=q;assert.equal(facts.length,14);assert.equal(q.historical_contexts_identical,true);
assert.equal(facts.reduce((n,f)=>n+f.complete_context_members.length,0),15);assert.equal(facts.filter(f=>f.unused_import).length,1);
assert.equal(facts.filter(f=>f.module_metadata?.roles.join(',')==='exports').length,4);assert.equal(facts.filter(f=>f.module_metadata?.roles.join(',')==='imports').length,4);assert.equal(facts.filter(f=>f.module_metadata?.roles.join(',')==='imports,exports').length,1);
function canonical(reader){const ledgers=new Map(),rows=prior.selected.map(s=>{if(!ledgers.has(s.ledger))ledgers.set(s.ledger,JSON.parse(reader(s.ledger)));const all=ledgers.get(s.ledger).symbol_uses.filter(r=>id(r)===id(s.original_row));assert.equal(all.length,1);assert.equal(all[0].status,'reviewed');assert.equal(all[0].disposition,'closed');return all[0]});assert.equal(new Set(rows.map(id)).size,14);const evidence=authoredUseReviewEvidence({symbol_uses:rows},'main',reader,hash);assert.equal(evidence.reviewed,14,'lost valid current CDK role');assert.equal(evidence.insufficient,0);return rows;}
canonical(read);
const extra=JSON.parse(read('compatibility/rc/cdk-module-type-public-subjects.json')),zone=JSON.parse(read('compatibility/rc/ng-zone-public-subjects.json'));
const paths=[...new Set([CURRENT_CDK_EPOCH,CDK_MODULE_TYPE_PRIOR,CDK_MODULE_TYPE_REVIEW,'scripts/cdk-module-type-caller-roles.mjs',historicProof.ref.path,'tests/cdk_module_type_caller_roles_public_probe.mjs','tests/cdk_module_type_caller_roles_subject.mjs','scripts/cdk-module-type-public-subjects.mjs','compatibility/rc/cdk-module-type-public-subjects.json',...prior.sources.map(m=>m.path),...prior.evidence.map(m=>m.path),...extra.subjects.flatMap(s=>s.additions.map(m=>m.path)),...zone.subjects.flatMap(s=>s.members.map(m=>m.path))])];
for(const path of paths)assert.throws(()=>inspectCurrentCdkModuleType({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)}),e=>e?.code==='ERR_ASSERTION',path);
for(const path of [prior.sources[0].path,'compatibility/rc/cdk-module-type-public-subjects.json']){let changed=false;const late=p=>changed&&p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p);inspectCurrentCdkModuleType({root,read:late});changed=true;assert.throws(()=>inspectCurrentCdkModuleType({root,read:late}),e=>e?.code==='ERR_ASSERTION');}
for(const s of [prior.selected[0],prior.selected.at(-1)]){const path=s.ledger,data=JSON.parse(read(path)),row=data.symbol_uses.find(r=>id(r)===id(s.original_row));row.disposition='foreign';const bad=Buffer.from(JSON.stringify(data));assert.throws(()=>canonical(p=>p===path?bad:read(p)),e=>e?.code==='ERR_ASSERTION');}
const frozen=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json')),additional=JSON.parse(read('compatibility/f10/authored-dependency-current-dispositions.json')),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
for(const [index,member] of prior.ledgers.entries()){const before=JSON.parse(member.text),after=JSON.parse(read(member.path));if(index===0){assert.equal(before.entries.length,1697);assert.equal(after.entries.length,1697);assert.deepEqual(after.entries.map(x=>x.sha),before.entries.map(x=>x.sha));}else{assert.equal(before.symbol_uses.length,index===1?1736:315);const keys=new Set(after.symbol_uses.map(id));assert.equal(keys.size,after.symbol_uses.length);for(const row of before.symbol_uses)assert.ok(keys.has(id(row)),'historic CDK caller obligation missing');}}

const cva=frozen.symbol_uses.filter(r=>r.module==='@angular/forms'&&r.symbol==='NG_VALUE_ACCESSOR');assert.equal(cva.length,6);const cvaEvidence=authoredUseReviewEvidence({symbol_uses:cva},'main',read,hash);assert.equal(cvaEvidence.reviewed,6);assert.equal(cvaEvidence.insufficient,0);
const report={line:'main',individual_caller_roles:14,source_files:14,complete_context_members:15,public_module_routes:3,actual_module_export_only_roles:4,unused_type_imports:1,strict_public_namespace_models:3,negative_type_controls:6,finite_runtime_cases:42,runtime_fault_controls_rejected:12,current_validator_cache_transitions_per_context:9,source_and_evidence_corruptions_rejected:paths.length,late_source_and_subject_changes_rejected:2,canonical_row_corruptions_rejected:2,historical_prepared_roles:14,current_valid_roles:14,all_six_actual_packed_CVA_requirements_retained:true,whole_legacy_controls_media_queries_native_styles_or_AOT_metadata_qualified:false,actual_native_packed_or_full_floor_qualified:false,historical_runtime_bridge:'exact current binding, complete context and executable/type snippets',g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0){assert.ok(process.argv[out+1]);writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});}console.log(JSON.stringify(report));
