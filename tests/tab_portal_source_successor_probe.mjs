/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current raw admission, byte-preserved prior rows and fail-closed historical readers. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectTabPortalSourceSuccessor,tabPortalSuccessorInputs} from '../scripts/tab-portal-source-successor.mjs';
import {inspectTabPortalSourceContext,tabPortalSourceParentReader,tabPortalSourcePreparationReader,TAB_PORTAL_CONTEXT_INPUTS} from '../scripts/tab-portal-source-context.mjs';
import {validateTabCompletion} from '../scripts/upstream-tab-completion-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),ts=createRequire(import.meta.url)('typescript'),key=r=>JSON.stringify([r.file,r.module,r.symbol]);
const summary=inspectTabPortalSourceSuccessor({root}),context=inspectTabPortalSourceContext({root}),input=JSON.parse(read(TAB_PORTAL_CONTEXT_INPUTS)),{prior,roles}=tabPortalSuccessorInputs({root}),controls=[];
function rows(text,name){const source=ts.parseJsonText('rows.json',text);assert.equal(source.parseDiagnostics.length,0);const array=source.statements[0].expression.properties.find(p=>p.name.text===name).initializer;return {header:text.slice(0,array.elements[0].getStart(source)),footer:text.slice(array.elements.at(-1).end),items:array.elements.map(node=>({value:JSON.parse(node.getText(source)),bytes:node.getText(source)}))};}
let untouchedFrozen=0,untouchedAdded=0,untouchedSHAs=0;
for(const name of ['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json','compatibility/f10/disposition-ledger/ledger.json']){
 const member=prior.preimages.find(m=>m.path===name),native=name.endsWith('/ledger.json'),added=name.includes('current-dispositions'),before=rows(member.text,native?'entries':'symbol_uses'),after=rows(read(name).toString(),native?'entries':'symbol_uses'),selected=native?new Set([prior.native_selection.sha]):new Set(prior.selected.map(key));
 if(!added){assert.equal(before.header,after.header);assert.equal(before.footer,after.footer);}
 assert.equal(after.items.length,before.items.length+(added?7:0));
 for(let i=0;i<before.items.length;i++){const a=before.items[i],b=after.items[i];assert.equal(native?a.value.sha:key(a.value),native?b.value.sha:key(b.value));if(added||!selected.has(native?a.value.sha:key(a.value))){assert.equal(hash(a.bytes),hash(b.bytes),'unrelated row bytes changed');if(native)untouchedSHAs++;else if(added)untouchedAdded++;else untouchedFrozen++;}}
}
assert.equal(untouchedFrozen,1724);assert.equal(untouchedAdded,308);assert.equal(untouchedSHAs,1696);
const parent=tabPortalSourceParentReader({root}),prepared=tabPortalSourcePreparationReader({root});for(const m of prior.preimages)assert.equal(hash(prepared(m.path)),m.sha256);assert.equal(hash(parent(prior.original_product_source.path)),prior.original_product_source.sha256);assert.notEqual(hash(prepared(prior.original_product_source.path)),prior.original_product_source.sha256,'preparation keeps repaired product');
const review=JSON.parse(read('compatibility/f10/authored-use-reviews/tab-portal-source-requalified-boundaries.json'));assert.equal(review.reviews.length,19);for(const role of roles.existing_roles){const actual=review.reviews.find(r=>key(r)===key(role));assert.deepEqual(actual.prior_source_context.case,role.prior_case);assert.equal(actual.conclusion,role.prior_case.conclusion);assert.equal(actual.decision,role.decision);}
const ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')),entry=ledger.entries.find(e=>e.sha===prior.native_selection.sha),oldBody=JSON.parse(prior.preimages.find(m=>m.path===prior.native_selection.evidence_report).text),body=JSON.parse(read(entry.evidence_report));for(const field of ['diff','diff_sha256','hunk_reviews','decision','final_disposition','review_depth','required_native_contract'])assert.deepEqual(body[field],oldBody[field],field+' changed');
for(const[id,mutate]of [['missing-helper',p=>p.tab_completion_behavior.source_members=p.tab_completion_behavior.source_members.filter(m=>!m.path.endsWith('tab-portal-construction-context.ts'))],['stale-body',p=>p.tab_completion_behavior.source_members.find(m=>m.path===prior.original_product_source.path).sha256=prior.original_product_source.sha256],['wrong-case',p=>p.tab_completion_behavior.case_ids.pop()],['wrong-peer',p=>p.peer_reference.version='0.0.0']]){const proof=structuredClone(entry.individual_proof);mutate(proof);const result=validateTabCompletion({root,entry,proof,request:{line:summary.line}});assert.equal(result.ok,false);assert.notEqual(result.detail,'missing coordinator run',id);controls.push('native:'+id);}
const paths=[...new Set([...input.writes,...input.current_members,...prior.preimages].map(m=>m.path).concat(TAB_PORTAL_CONTEXT_INPUTS,input.prior.path,input.context_prior.path,input.additional_context_prior.path,input.edits.path,prior.product_repair_prior.path))];
for(const path of paths){const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspectTabPortalSourceContext({root,read:p=>p===path?bytes:read(p)}),error=>error?.code==='ERR_ASSERTION','changed live/history source accepted: '+path);controls.push('context:'+path);}
for(const path of input.writes.map(m=>m.path)){const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspectTabPortalSourceSuccessor({root,read:p=>p===path?bytes:read(p)}),error=>error?.code==='ERR_ASSERTION');controls.push('raw-successor:'+path);}
// Reusing an authenticated reader never bypasses a later raw source mutation.
const changedPath=input.current_members.find(m=>m.path.endsWith('tab-portal-construction-context.ts')).path;let changed=false;const late=p=>changed&&p===changedPath?Buffer.concat([read(p),Buffer.from('\n')]):read(p);const old=tabPortalSourceParentReader({root,read:late});changed=true;assert.throws(()=>tabPortalSourceParentReader({root,read:old}),error=>error?.code==='ERR_ASSERTION');controls.push('late-mutation-after-reader-creation');
const report={...summary,context,untouched_frozen_row_bytes:untouchedFrozen,untouched_existing_additional_row_bytes:untouchedAdded,untouched_SHA_row_bytes:untouchedSHAs,current_context_corruptions_rejected:paths.length,raw_successor_corruptions_rejected:5,native_proof_corruptions_rejected:4,late_mutation_rejected:true,rejection_controls:controls.length,controls,original_native_hunks_decisions_and_cases_preserved:true,current_native_validator_reads_raw_source:true,actual_legacy_component_browser_packed_or_floor_execution:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...summary,current_context_corruptions_rejected:paths.length,rejection_controls:controls.length,untouched_frozen_row_bytes:untouchedFrozen,untouched_existing_additional_row_bytes:untouchedAdded,untouched_SHA_row_bytes:untouchedSHAs,late_mutation_rejected:true}));
