/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Main current source protocols with separate authenticated historical evidence. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {tabsCallerCurrentSource} from '../scripts/tabs-caller-current-contracts.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const proofPath='compatibility/rc/tabs-caller-current-65015.json',proofPin='5fc324c9ebf48832bdb11606e2c2693b5752e754a1da1382d6ea1c585677083c';
const priorPath='compatibility/rc/tabs-caller-public-main.json',priorPin='90ac7caf3f3b54b47c424f613eb2741117fd3c472b7ad396d5b0e935be5390d9';
const reviewPath='compatibility/f10/authored-use-reviews/tabs-callers.json',reviewPin='e1e87717e7bebc4f7c8426669bca3c8f80bc6b3d455bbbeda6cee37db1b40300';
const receiptPath='compatibility/rc/tabs-caller-verification.json',receiptPin='7f8fec787706c4a862a15f0e22ed24b4be36b59ccee1f0404e5b3fbd85940832';
function verify(reader){
 const bytes=reader(proofPath);assert.equal(hash(bytes),proofPin,'changed current tabs proof');const proof=JSON.parse(bytes);
 const old=reader(priorPath),review=reader(reviewPath),receipt=reader(receiptPath);assert.equal(hash(old),priorPin);assert.equal(hash(review),reviewPin);assert.equal(hash(receipt),receiptPin);
 for(const m of proof.inputs)assert.equal(hash(reader(m.path)),m.sha256,'changed tabs proof input '+m.path);
 const historical=JSON.parse(receipt),prepared=JSON.parse(review);assert.equal(historical.guard.current_source_files,69);assert.equal(historical.guard.alias_allowlist_bytes_preserved,true);assert.equal(historical.guard.all1697_1736_315_obligations_and_six_packed_CVA_rows_retained,true);
 assert.equal(prepared.reviews.length,21);assert.equal(prepared.frozen_prepared,17);assert.equal(prepared.additional_prepared,4);assert.equal(prepared.reviews.filter(r=>r.conclusion==='removed-use').length,1);assert.equal(prepared.reviews.filter(r=>r.unused_import).length,4);assert.ok(prepared.reviews.every(r=>r.decision.length>200));
 assert.equal(proof.line,'main');assert.equal(proof.source_files.length,68);assert.equal(proof.facts.length,21);assert.equal(proof.type_subjects.length,3);assert.ok(proof.type_subjects.every(s=>s.strict&&s.invalid_type_controls===3));assert.equal(proof.runtime_subjects.length,4);assert.equal(proof.runtime_subjects.reduce((n,s)=>n+s.cases.length,0),68);assert.ok(proof.runtime_subjects.filter(s=>s.line==='main').every(s=>s.enabledFocus?.first_enabled&&s.enabledFocus?.advance_on_disable&&s.enabledFocus?.no_enabled&&s.enabledFocus?.active_identity));
 assert.equal(proof.source_mutants.length,5);assert.ok(proof.source_mutants.every(m=>m.rejected));assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified,false);return proof;
}
const proof=verify(read),source=tabsCallerCurrentSource({root});assert.equal(source.facts.length,21);assert.equal(source.facts.filter(f=>f.removed_upstream_use).length,1);assert.equal(source.facts.filter(f=>f.unused_import).length,4);
const controls=[...new Set([proofPath,priorPath,reviewPath,receiptPath,...proof.inputs.map(m=>m.path)])];for(const path of controls)assert.throws(()=>verify(p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)),e=>e?.code==='ERR_ASSERTION',path);
let changed=null;const late=p=>p===changed?Buffer.concat([read(p),Buffer.from('\nlate')]):read(p);verify(late);for(changed of ['projects/ngx-material-legacy/legacy-tabs/tab-label.ts',proofPath])assert.throws(()=>verify(late),e=>e?.code==='ERR_ASSERTION');
for(const field of ['decision','candidate_source_sha256','conclusion']){const bad=JSON.parse(read(reviewPath));bad.reviews[0][field]='invalid';const bytes=Buffer.from(JSON.stringify(bad));assert.throws(()=>verify(p=>p===reviewPath?bytes:read(p)),e=>e?.code==='ERR_ASSERTION');}
const frozenPath='compatibility/f10/authored-dependency-dispositions.json',addedPath='compatibility/f10/authored-dependency-current-dispositions.json';const frozen=JSON.parse(read(frozenPath)),added=JSON.parse(read(addedPath)),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));const oldFrozen=JSON.parse(source.prior.ledgers.find(m=>m.path===frozenPath).text),oldAdded=JSON.parse(source.prior.ledgers.find(m=>m.path===addedPath).text);
assert.equal(oldFrozen.symbol_uses.length,1736);assert.equal(oldAdded.symbol_uses.length,315);assert.equal(frozen.symbol_uses.length,1736);assert.equal(added.symbol_uses.length,336);assert.equal(ledger.entries.length,1697);const key=r=>JSON.stringify([r.file,r.module,r.symbol]);for(const [old,now] of [[oldFrozen,frozen],[oldAdded,added]]){const keys=new Set(now.symbol_uses.map(key));assert.equal(keys.size,now.symbol_uses.length);for(const row of old.symbol_uses)assert.ok(keys.has(key(row)),'removed historical obligation '+key(row));}
const oldCva=oldFrozen.symbol_uses.filter(r=>r.module==='@angular/forms'&&r.symbol==='NG_VALUE_ACCESSOR'&&r.disposition==='open');assert.equal(oldCva.length,6);const ids=new Set(oldCva.map(key)),currentCva=frozen.symbol_uses.filter(r=>ids.has(key(r)));assert.equal(currentCva.length,6);const cva=authoredUseReviewEvidence({symbol_uses:currentCva},'main',read,hash);assert.equal(cva.reviewed,6);assert.equal(cva.insufficient,0);
const selected=source.prior.selected.map(s=>{const old=s.original_row,ledger=JSON.parse(read(s.ledger));const matches=ledger.symbol_uses.filter(r=>key(r)===key(old));assert.equal(matches.length,1);return matches[0];});assert.ok(selected.every(r=>r.status==='reviewed'&&r.disposition==='closed'));const state=authoredUseReviewEvidence({symbol_uses:selected},'main',read,hash);assert.equal(state.reviewed,21);assert.equal(state.insufficient,0);
const baselineCommit='7143770af94515acc016301bb2ebce275d741d74';const historicalRows=new Map();
for(const path of [frozenPath,addedPath]){const baseline=JSON.parse(execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',baselineCommit+':'+path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}));for(const row of baseline.symbol_uses)historicalRows.set(key(row),row);}
const baselineSelected=selected.map(r=>{const old=historicalRows.get(key(r));assert.ok(old,'missing original selected role');return old;});const beforeState=authoredUseReviewEvidence({symbol_uses:baselineSelected},'main',read,hash);assert.equal(beforeState.reviewed,13);assert.equal(beforeState.insufficient,8);const recovered=new Set(beforeState.insufficient_uses.map(key));assert.equal(recovered.size,8);for(let i=0;i<selected.length;i++){const now=selected[i],old=baselineSelected[i];if(recovered.has(key(old))){assert.notDeepEqual(now.source_review,old.source_review);assert.deepEqual(now,{...old,source_review:now.source_review},'changed recovered role outside source review');}else assert.deepEqual(now,old,'previously reviewed role changed');}
const report={line:'main',individual_routes:21,removed_current_private_imports:1,unused_imports:4,current_source_files:68,historical_source_files:69,SDK_models:3,invalid_type_controls:9,constructor_config_cases:68,actual_source_mutants_rejected:4,enabled_focus_mutants_rejected:1,input_corruptions_rejected:controls.length,late_changes_rejected:2,review_row_corruptions_rejected:3,historical_alias_allowlist_bytes_preserved:true,all1697_1736_315_obligations_and_six_packed_CVA_rows_retained:true,historical_prepared:21,baseline_reviewed:beforeState.reviewed,baseline_insufficient:beforeState.insufficient,recovered_roles:recovered.size,current_reviewed:state.reviewed,current_insufficient:state.insufficient,actual_native_packed_AOT_or_full_floor_qualified:false};if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
