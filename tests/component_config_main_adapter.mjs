/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Main current-epoch equivalent of the historical contracts probe.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {inspectComponentConfigCurrentReview,inspectComponentConfigHistoricalReceipt,COMPONENT_CONFIG_CURRENT_REVIEW,COMPONENT_CONFIG_REVIEW} from '../scripts/component-config-current-reviews.mjs';
import {qualifiedComponentConfigOwned} from '../scripts/component-config-current-owned-evidence.mjs';
import {inspectComponentConfigOwnedHelpers,compareComponentConfigHelpers} from '../scripts/component-config-current-owned-helpers.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const legacyTests=['tests/component_config_caller_owned_runtime_probe.mjs','tests/component_config_caller_owned_runtime_subject.mjs',
 'tests/component_config_caller_owned_subjects.mjs','tests/component_config_caller_constructor_cases.mjs','tests/component_config_caller_tagged_runtime_subject.mjs'];
const legacyProof='compatibility/rc/component-config-caller-owned-main.json';
function verify(reader){
 const historic=inspectComponentConfigHistoricalReceipt({root,read:reader}),current=inspectComponentConfigCurrentReview({root,read:reader});
 const inputs=JSON.parse(reader(legacyProof)).inputs;
 for(const path of legacyTests){const matches=inputs.filter(m=>m.path===path);assert.equal(matches.length,1,'missing historical runtime input');assert.equal(hash(reader(path)),matches[0].sha256,'changed historical runtime input '+path);}
 return {historic,current};
}
const {historic,current}=verify(read),q=qualifiedComponentConfigOwned({root});
for(const review of [historic,current]){
 assert.equal(review.reviews.length,73);assert.equal(review.frozen_prepared,44);assert.equal(review.additional_prepared,29);
 assert.equal(review.reviews.filter(r=>r.conclusion==='stable-public-peer').length,68);
 assert.equal(review.reviews.filter(r=>r.conclusion==='owned-replacement').length,5);
 assert.equal(review.reviews.filter(r=>r.unused_header_binding).length,3);
}
assert.equal(current.current_source_epoch,'fdef9be37d516b922efc5301c8f16d0e456f4d48');
const controls=[...new Set([COMPONENT_CONFIG_REVIEW,COMPONENT_CONFIG_CURRENT_REVIEW,
 ...historic.reviews[0].independent_evidence.map(m=>m.path),...current.reviews[0].independent_evidence.map(m=>m.path),
 ...legacyTests,'compatibility/rc/api/export-name-allowlist.json',...q.source.prior.sources.map(m=>m.path)])];
for(const path of controls)assert.throws(()=>verify(p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)),e=>e?.code==='ERR_ASSERTION',path);
let changed=null;const late=p=>p===changed?Buffer.concat([read(p),Buffer.from('\n')]):read(p);verify(late);
for(changed of ['projects/ngx-material-legacy/legacy-progress-bar/progress-bar.ts',q.ref.path])assert.throws(()=>verify(late),e=>e?.code==='ERR_ASSERTION');
for(const [path,review] of [[COMPONENT_CONFIG_REVIEW,historic],[COMPONENT_CONFIG_CURRENT_REVIEW,current]])for(const field of ['decision','candidate_source_sha256','conclusion']){
 const bad=structuredClone(review);bad.reviews[0][field]='invalid';const bytes=Buffer.from(JSON.stringify(bad,null,2)+'\n');
 assert.throws(()=>verify(p=>p===path?bytes:read(p)),e=>e?.code==='ERR_ASSERTION');
}
const helpers=inspectComponentConfigOwnedHelpers({qualified:q,read});
const semanticControls=[
 ['ownedState','  Checked,','  Checked = 3,'],
 ['ownedLocation','_location.pathname + _location.search','_location.pathname'],
 ['ownedLocation',"'mat-progress-bar-location'","'wrong-location-token'"],
 ['ownedDefaults','mode?: ProgressBarMode','mode?: string'],
 ['ownedDefaults','InjectionToken<MatProgressBarDefaultOptions>','InjectionToken<any>'],
 ['ownedLocation','MAT_PROGRESS_BAR_LOCATION_FACTORY(): MatProgressBarLocation','MAT_PROGRESS_BAR_LOCATION_FACTORY(): any'],
];
for(const [field,from,to] of semanticControls){const input=structuredClone(helpers.inputs);assert.equal(input[field].split(from).length,2);input[field]=input[field].replace(from,to);assert.throws(()=>compareComponentConfigHelpers(input),e=>e?.code==='ERR_ASSERTION',field+':'+from);}
const child=spawnSync(process.execPath,['tests/component_config_current_probe.mjs'],{cwd:root,encoding:'utf8',timeout:100000,maxBuffer:2*1024*1024});
assert.equal(child.status,0,(child.stdout+'\n'+child.stderr).slice(-6000));const currentControls=JSON.parse(child.stdout.trim().split('\n').at(-1));
assert.equal(currentControls.historical_receipt,73);assert.equal(currentControls.current_reviews,73);assert.equal(currentControls.current_source_files,189);
assert.equal(currentControls.previously_valid_lost,0);assert.equal(currentControls.recovered_role_fault_rejected,true);assert.equal(currentControls.baseline_role_fault_rejected,true);
const historicalCommit='280c1e8016725e234c7c272154a863fa0e96681f',git=path=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',historicalCommit+':'+path],{cwd:root,maxBuffer:32*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}),load=p=>JSON.parse(read(p));
const frozenPath='compatibility/f10/authored-dependency-dispositions.json',addedPath='compatibility/f10/authored-dependency-current-dispositions.json',ledgerPath='compatibility/f10/disposition-ledger/ledger.json';
const frozen=load(frozenPath),added=load(addedPath),oldFrozen=JSON.parse(git(frozenPath)),oldAdded=JSON.parse(git(addedPath));
assert.equal(oldFrozen.symbol_uses.length,1736);assert.equal(oldAdded.symbol_uses.length,315);assert.equal(frozen.symbol_uses.length,1736);
const historicLedger=JSON.parse(git(ledgerPath)),actualLedger=load(ledgerPath);assert.equal(historicLedger.entries.length,1697);assert.equal(actualLedger.entries.length,1697);assert.deepEqual(actualLedger.entries.map(r=>r.sha),historicLedger.entries.map(r=>r.sha),'historic SHA roster changed');assert.equal(new Set(actualLedger.entries.map(r=>r.sha)).size,1697);
const key=r=>JSON.stringify([r.file,r.module,r.symbol]);
for(const [old,now] of [[oldFrozen,frozen],[oldAdded,added]]){const keys=now.symbol_uses.map(key),set=new Set(keys);assert.equal(set.size,keys.length);for(const row of old.symbol_uses)assert.ok(set.has(key(row)),'historic obligation removed '+key(row));}
const oldCva=oldFrozen.symbol_uses.filter(r=>r.module==='@angular/forms'&&r.symbol==='NG_VALUE_ACCESSOR');assert.equal(oldCva.length,6);
const cvaKeys=new Set(oldCva.map(key)),cva=frozen.symbol_uses.filter(r=>cvaKeys.has(key(r)));assert.equal(cva.length,6);
const cvaEvidence=authoredUseReviewEvidence({symbol_uses:cva},'main',read,hash);assert.equal(cvaEvidence.reviewed,6);assert.equal(cvaEvidence.insufficient,0);
for(const old of oldAdded.retained_removed_additional_uses||[])assert.ok((added.retained_removed_additional_uses||[]).some(r=>key(r)===key(old)),'historically retained removed obligation lost');
const report={line:'main',individual_routes:73,frozen:44,additional:29,public_runtime_cases:q.publicBoundary.cases,owned_runtime_cases:q.cases,
 actual_source_mutants_rejected:q.proof.source_faults.length,helper_semantic_controls_rejected:semanticControls.length,
 source_and_proof_corruptions_rejected:controls.length,late_changes_rejected:2,review_row_corruptions_rejected:6,
 historical_prepared_roles:historic.reviews.length,current_reviewed:currentControls.reviewed,current_insufficient:currentControls.insufficient,
 original1697_1736_315_and_six_packed_CVA_obligations_retained:true,actual_native_packed_AOT_or_full_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
