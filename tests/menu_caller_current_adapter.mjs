/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Main physical current menu evidence and immutable historical receipt. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {menuCallerCurrentSource} from '../scripts/menu-caller-current-contracts.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const proofPath='compatibility/rc/menu-caller-current-65015.json',proofPin='4ebb2fb2a7deb53ff18729e34c52a7ec98d44392b423f789f03bc7c3b9dd10b5';
const receiptPath='compatibility/rc/menu-caller-verification.json',receiptPin='7b2f73c4f5ac47f4d99a06c1c7730595e3984820d0d643ae3e9cb1b2874295cd';
const historicPath='compatibility/rc/menu-caller-public-main.json',historicPin='5598ed25ea2867d2c998c5f4828410a6abf29981d6b8fdd075c30a8d8a748d78';
const reviewPath='compatibility/f10/authored-use-reviews/menu-callers.json',reviewPin='8814656a57c954f78fbd2f9aea4b11bd14183a53380ce3bd4951d0a184694912';
function verify(reader){
 const bytes=reader(proofPath);assert.equal(hash(bytes),proofPin,'changed current proof');
 const proof=JSON.parse(bytes),old=reader(historicPath),review=reader(reviewPath),receipt=reader(receiptPath);assert.equal(hash(receipt),receiptPin,'changed historical receipt');const historical=JSON.parse(receipt);assert.equal(historical.official_counts_unchanged.original_additional_obligations,315);assert.equal(historical.official_counts_unchanged.live_additional,314);assert.equal(historical.checks.main.original1697_1736_315_and_six_packed_CVA_obligations_retained,true);
 assert.equal(hash(old),historicPin,'changed historic proof');assert.equal(hash(review),reviewPin,'changed historic review');
 for(const m of proof.inputs)assert.equal(hash(reader(m.path)),m.sha256,'changed current menu proof input '+m.path);
 assert.equal(proof.line,'main');assert.equal(proof.type_subjects.length,3);assert.equal(proof.runtime_subjects.length,4);
 assert.equal(proof.runtime_subjects.reduce((n,s)=>n+s.cases.length,0),52);
 assert.equal(proof.source_mutants.length,6);assert.ok(proof.source_mutants.every(m=>m.rejected));
 assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified,false);
 const prior=JSON.parse(review);assert.equal(prior.reviews.length,17);assert.equal(prior.frozen_prepared,12);assert.equal(prior.additional_prepared,5);assert.equal(prior.reviews.filter(r=>r.conclusion==='removed-use').length,3);assert.equal(prior.reviews.filter(r=>r.unused_import).length,0);return proof;
}
const proof=verify(read),source=menuCallerCurrentSource({root});assert.equal(source.facts.length,17);assert.equal(source.facts.filter(f=>f.removed_upstream_use).length,4);
const controls=[...new Set([proofPath,historicPath,receiptPath,reviewPath,...proof.inputs.map(m=>m.path)])];
for(const path of controls)assert.throws(()=>verify(p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)),e=>e?.code==='ERR_ASSERTION',path);
let changed=null;const late=p=>p===changed?Buffer.concat([read(p),Buffer.from('\nlate')]):read(p);verify(late);
for(changed of ['projects/ngx-material-legacy/legacy-menu/menu-item.ts',proofPath])assert.throws(()=>verify(late),e=>e?.code==='ERR_ASSERTION');
for(const field of ['decision','candidate_source_sha256','conclusion']){const bad=JSON.parse(read(reviewPath));bad.reviews[0][field]='invalid';const bytes=Buffer.from(JSON.stringify(bad));assert.throws(()=>verify(p=>p===reviewPath?bytes:read(p)),e=>e?.code==='ERR_ASSERTION');}
const rows=source.prior.selected.map(s=>{const old=s.original_row,ledger=JSON.parse(read(s.ledger));const matches=ledger.symbol_uses.filter(r=>r.file===old.file&&r.module===old.module&&r.symbol===old.symbol);assert.equal(matches.length,1);return matches[0];});
assert.ok(rows.every(r=>r.status==='reviewed'&&r.disposition==='closed'));const state=authoredUseReviewEvidence({symbol_uses:rows},'main',read,hash);assert.equal(state.reviewed,17);assert.equal(state.insufficient,0);
const frozenPath='compatibility/f10/authored-dependency-dispositions.json',addedPath='compatibility/f10/authored-dependency-current-dispositions.json';
const frozen=JSON.parse(read(frozenPath)),added=JSON.parse(read(addedPath)),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const oldFrozen=JSON.parse(source.prior.ledgers.find(m=>m.path===frozenPath).text),oldAdded=JSON.parse(source.prior.ledgers.find(m=>m.path===addedPath).text);
assert.equal(oldFrozen.symbol_uses.length,1736);assert.equal(oldAdded.symbol_uses.length,315);assert.equal(frozen.symbol_uses.length,1736);assert.equal(added.symbol_uses.length,336);assert.equal(ledger.entries.length,1697);
const key=r=>JSON.stringify([r.file,r.module,r.symbol]);for(const [old,now] of [[oldFrozen,frozen],[oldAdded,added]]){const keys=new Set(now.symbol_uses.map(key));assert.equal(keys.size,now.symbol_uses.length);for(const row of old.symbol_uses)assert.ok(keys.has(key(row)),'removed historical obligation '+key(row));}
const oldCva=oldFrozen.symbol_uses.filter(r=>r.module==='@angular/forms'&&r.symbol==='NG_VALUE_ACCESSOR'&&r.disposition==='open');assert.equal(oldCva.length,6);const ids=new Set(oldCva.map(key)),currentCva=frozen.symbol_uses.filter(r=>ids.has(key(r)));assert.equal(currentCva.length,6);const cva=authoredUseReviewEvidence({symbol_uses:currentCva},'main',read,hash);assert.equal(cva.reviewed,6);assert.equal(cva.insufficient,0);
assert.equal(added.live_symbol_use_count,333);assert.equal(added.retained_removed_additional_uses.length,3);assert.ok(added.retained_removed_additional_uses.some(r=>r.file==='legacy-menu/internal/menu-panel.ts'&&r.module==='@angular/material/menu'&&r.symbol==='MatMenuContent'));

const report={line:'main',individual_routes:17,removed_current_private_routes:4,historical_removed_private_routes:3,runtime_cases:52,actual_source_mutants_rejected:6,source_and_proof_corruptions_rejected:controls.length,late_changes_rejected:2,review_row_corruptions_rejected:3,historical_prepared:17,current_reviewed:state.reviewed,current_insufficient:state.insufficient,actual_native_packed_AOT_or_full_floor_qualified:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
