/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Seven complete source decisions; three additionally require native evidence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {CHIP_LIFECYCLE_SHAS,CHIP_LIFECYCLE_ORIGINALS,readChipLifecycleOriginals,analyzeChipLifecycleOriginals,chipLifecycleMinimumKeyManagerSources} from './upstream-chip-lifecycle-scope.mjs';
import {inspectChipFocusRepair} from './chip-focus-contract.mjs';
import {validateBrowserMatrixRun} from './upstream-browser-run-evidence.mjs';
import {chipFocusLifecycleNativeOkay} from './chip-focus-lifecycle-native-contract.mjs';
import {legacyChipBlurNativeOkay} from './legacy-chip-blur-native-contract.mjs';
import {readCurrentChipFocusInputs} from './tab-adapter-product-inventory-context.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),json=d=>JSON.stringify(d,null,2)+'\n';
const foundationPath='compatibility/rc/chip-lifecycle-scope-source-review.json';
const foundationPins={main:'d9d949b47c3a0365cdc9a54fe667af0a9cec3538b2b88821d2d0e7ce8d7527dc','21.x':'827179d966d3c982ff0c825056f090224e2b6e7a1c179644bbf6901d0ed264b8'};
const priorPath='compatibility/rc/chip-lifecycle-admission-prior.json.gz';
const priorPins={main:'07a1613a692623bb23c9f321617634c89d8701b7a93665d30a8db9d743e625be','21.x':'7be425bdd838ea050f2cf627863fab0040307b5b0e06eea222330e0e42d315fb'};
export const CHIP_LIFECYCLE_SCOPE_ROLE='C04 individual complete chip lifecycle source decisions';
export const CHIP_LIFECYCLE_SOURCE_PROOF_KIND='individual-chip-lifecycle-source-decision';
export const CHIP_LIFECYCLE_NATIVE_SHAS=Object.freeze([CHIP_LIFECYCLE_SHAS[1],CHIP_LIFECYCLE_SHAS[2],CHIP_LIFECYCLE_SHAS[4]]);
const nativeKind='historical-required-individual-behavior';
const extraMembers=[
 'scripts/upstream-chip-lifecycle-admission.mjs','scripts/upstream-chip-lifecycle-scope.mjs',
 'scripts/tab-adapter-product-inventory-context.mjs','compatibility/rc/tab-adapter-product-inventory-inputs.json','compatibility/rc/tab-adapter-product-inventory-focus-inputs.json',
 'projects/ngx-material-legacy/legacy-tabs/tab-body.ts','projects/ngx-material-legacy/legacy-tabs/internal/tab-portal-construction-context.ts',
 'scripts/chip-focus-contract.mjs','scripts/chip-focus-repair.mjs','scripts/chip-list-focus-contract.mjs',
 'scripts/upstream-browser-run-evidence.mjs','scripts/upstream-packed-run-evidence.mjs',
 'scripts/browser-matrix-acceptance.mjs','scripts/browser-matrix-roster.mjs','scripts/browser-required-cells.mjs','scripts/browser-required-probe.js',
 'scripts/browser-form-families.mjs','scripts/chip-focus-lifecycle-fixture.mjs','scripts/chip-focus-lifecycle-native-contract.mjs','scripts/legacy-chip-blur-native-contract.mjs',
 'projects/ngx-material-legacy/legacy-chips/chip.ts','projects/ngx-material-legacy/legacy-chips/chip.spec.ts',
 'projects/ngx-material-legacy/legacy-chips/chip-list.ts','projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts',
 'compatibility/rc/chip-focus-repair-inputs.json','compatibility/rc/chip-focus-repair-prior.json.gz',
 CHIP_LIFECYCLE_ORIGINALS,foundationPath,'compatibility/rc/tab-header-public-key-manager-subjects.json',
];
const lifetimeCases=[
 [34,'should restore DOM focus while an earlier blur is pending'],
 [35,'should emit one blur for repeated requests and racing stability'],
 [36,'should cancel pending blur and notify destruction before ripple cleanup'],
 [37,'should notify programmatic focus once during synchronous host reentry'],
];
/** The existing historical validator remains the sole full-suite authority. */
export function chipLifecycleHistoricalScopes(commonMembers,nativeCase){
 const members=[...new Set([...commonMembers,...extraMembers])];
 return [
  [CHIP_LIFECYCLE_NATIVE_SHAS[0],{patch:'577907fa7d9aab38742778bac3fcf1aadec1fbf46fc0da7ae6d2bf1d36fce4df',kind:'owned-chip-stability-blur-cancellation',required_disposition:'do-not-adopt',
   source_contract:'owned-chip-lifecycle-current',members,cases:lifetimeCases.map(([index,title])=>nativeCase('legacy-chips/chip.spec.ts',index,'MatChip > owned blur lifecycle > '+title))}],
  [CHIP_LIFECYCLE_NATIVE_SHAS[1],{patch:'806269f7974701a727ac4ff6a13c51f80c6d26832928aed4cf4d563d728e768a',kind:'owned-chip-blur-and-refocus-timing',required_disposition:'do-not-adopt',
   source_contract:'owned-chip-lifecycle-current',members,cases:lifetimeCases.map(([index,title])=>nativeCase('legacy-chips/chip.spec.ts',index,'MatChip > owned blur lifecycle > '+title))}],
  [CHIP_LIFECYCLE_NATIVE_SHAS[2],{patch:'26fda79c340cae54a00569f1e9e44f5acfa829190dda45c56c1c56635006f108',kind:'owned-chip-direct-DOM-macrotask-focus-escape',required_disposition:'already-adapted',
   source_contract:'owned-chip-lifecycle-current',members,cases:[
    nativeCase('legacy-chips/chip-list.spec.ts',27,'MatChipList > StandardChipList > keyboard behavior > RTL > should allow focus to escape when tabbing away'),
    nativeCase('legacy-chips/chip-list.spec.ts',28,'MatChipList > StandardChipList > keyboard behavior > RTL > should use user defined tabIndex')]}],
 ];
}
export function readChipLifecycleAdmissionPrior(read,line){const bytes=read(priorPath);assert.equal(hash(bytes),priorPins[line]);const p=JSON.parse(gunzipSync(bytes));assert.equal(p.line,line);assert.equal(hash(p.ledger_text),p.ledger_sha256);assert.deepEqual(p.entries.map(e=>e.sha),CHIP_LIFECYCLE_SHAS);for(const m of p.sources)assert.equal(hash(m.text),m.sha256);return p;}
function foundation(read,line){const bytes=read(foundationPath);assert.equal(hash(bytes),foundationPins[line],'changed lifecycle foundation');const body=JSON.parse(bytes);assert.equal(body.line,line);assert.deepEqual(body.reviews.map(r=>r.sha),CHIP_LIFECYCLE_SHAS);assert.equal(hash(read(body.source_acquisition.path)),body.source_acquisition.sha256);return body;}
/** Raw current source only. The archived foundation is a historical review,
 * never a replacement reader for current native/product/spec admission. */
export function inspectChipLifecycleCurrentContract({root=process.cwd(),read,line}={}){
 const currentInputs=readCurrentChipFocusInputs({root,read}),data=currentInputs.data;assert.equal(data.line,line);
 assert.equal(hash(read(data.current_raw_contract_source.path)),data.current_raw_contract_source.sha256);
 const focus=inspectChipFocusRepair({root,readMember:read});assert.equal(focus.line,line);
 // The complete source/spec/matrix bytes were independently reviewed in the
 // repair; the native registry is intentionally extended by this task.
 for(const member of data.current_members.filter(m=>m.path!=='scripts/upstream-historical-behavior-evidence.mjs'))assert.equal(hash(read(member.path)),member.sha256,'changed current lifecycle source '+member.path);
 assert.equal(data.current_full_historical_case_count,2236);assert.equal(data.current_positive_case_count,2231);assert.equal(data.old_positive_cases_preserved,2227);assert.equal(data.discovery_negatives_preserved,5);
 const keyManagers=chipLifecycleMinimumKeyManagerSources(read);
 const review=foundation(read,line);assert.equal(review.consumer_HTML_CSS_SCSS_changes,0);
 return {line,current_focus_inputs:currentInputs.ref,current_raw_focus_contract:focus,raw_spec_and_matrix_members:data.current_members.filter(m=>m.path!=='scripts/upstream-historical-behavior-evidence.mjs'),full_historical_case_count:2236,
  historical_foundation_review:{path:foundationPath,sha256:foundationPins[line],candidate_context_sha256:hash(JSON.stringify(review.candidate_context)),original_source_counterexamples_preserved:2},
  current_minimum_key_manager_sources:keyManagers,current_product_read_uses_historical_projection:false,
  only_approved_focus_and_spec_delta_from_foundation:true,required_consumer_HTML_CSS_SCSS_changes:0,source_scope_only:true,actual_native_packed_or_floor_qualified:false};
}
export function requiresChipLifecycleScope(entry,proof){return CHIP_LIFECYCLE_SHAS.includes(entry?.sha)||proof?.chip_lifecycle_source_scope!==undefined||proof?.proof_kind===CHIP_LIFECYCLE_SOURCE_PROOF_KIND;}
export function chipLifecycleSourceBody(read,root,line){
 const retained=foundation(read,line),prior=readChipLifecycleAdmissionPrior(read,line),originals=readChipLifecycleOriginals(read).subjects,analysis=analyzeChipLifecycleOriginals(read),context=inspectChipLifecycleCurrentContract({root,read,line});
 return {schema_version:1,role:CHIP_LIFECYCLE_SCOPE_ROLE,line,status:'reviewed',scope_sha_ids:[...CHIP_LIFECYCLE_SHAS],source_scope_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed',prior:{path:priorPath,sha256:priorPins[line],source_parent:prior.source_parent},foundation_review:{path:foundationPath,sha256:foundationPins[line]},candidate_context:context,
  reviews:analysis.map((subject,i)=>{const review=retained.reviews[i];assert.deepEqual(review.original_analysis,subject);assert.equal(review.whole_original_hunk_reviews.length,subject.hunks);
   return {sha:subject.sha,status:'reviewed',final_disposition:review.proposed_disposition,review_depth:'individual-compatibility',affected_branches:[line],decision:review.candidate_review,
    whole_original_hunk_reviews:review.whole_original_hunk_reviews,original_analysis:subject,patch_paths:subject.paths,diff_sha256:subject.diff_sha256,diff:originals[i].diff,
    original_sources:retained.originals,prior_entry:{ledger_path:prior.ledger_path,ledger_commit:prior.source_parent,entry_sha256:hash(json(prior.entries[i]))},
    native_admission_required:CHIP_LIFECYCLE_NATIVE_SHAS.includes(subject.sha),actual_native_packed_or_floor_qualified:false};})};
}
export function chipLifecycleSourceProof(subject,context,decision,requirement,read){
 assert.ok(CHIP_LIFECYCLE_SHAS.includes(subject.sha));const native=CHIP_LIFECYCLE_NATIVE_SHAS.includes(subject.sha);assert.equal(Boolean(requirement),native);
 const proof={proof_kind:native?nativeKind:CHIP_LIFECYCLE_SOURCE_PROOF_KIND,diff_sha256:subject.diff_sha256,review_depth:'individual-compatibility',affected_branches:[context.line],decision,
  chip_lifecycle_source_scope:{kind:'seven-complete-chip-lifecycle-source-decisions',case_id:'source/chip-lifecycle/'+subject.sha,foundation_review_sha256:foundationPins[context.line],source_context_sha256:hash(JSON.stringify(context)),original_hunks:subject.hunks,source_scope_only:true,native_admission_required:native,actual_native_packed_or_floor_qualified:false}};
 if(native){assert.equal(subject.diff_sha256,requirement.patch);proof.historical_behavior={kind:requirement.kind,case_ids:requirement.cases.map(c=>c.case_id),source_members:requirement.members.map(path=>({path,sha256:hash(read(path))}))};}
 return proof;
}
export function chipLifecycleScopeEvidenceOk(body,entry,read,root,line,requirements){
 try{assert.ok(CHIP_LIFECYCLE_SHAS.includes(entry.sha));const expected=chipLifecycleSourceBody(read,root,line);assert.deepEqual(body,expected);const row=expected.reviews.find(r=>r.sha===entry.sha);
  assert.equal(entry.final_disposition,row.final_disposition);assert.equal(entry.reason,row.decision);assert.equal(entry.diff_sha256,row.diff_sha256);assert.deepEqual(entry.files,row.patch_paths);assert.equal(entry.review_depth,row.review_depth);assert.deepEqual(entry.affected_branches,[line]);assert.equal(entry.g11_claim,'not-passed');
  assert.deepEqual(entry.individual_proof,chipLifecycleSourceProof(row.original_analysis,expected.candidate_context,row.decision,requirements(entry.sha),read));
  const bytes=read(entry.evidence_report);assert.equal(bytes.toString(),json(body));assert.deepEqual(entry.source_check,{proof_kind:CHIP_LIFECYCLE_SOURCE_PROOF_KIND,review_membership:entry.sha,evidence_report_sha256:hash(bytes)});return true;
 }catch{return false;}
}
/** Re-evaluate the retained real chips/default observations for every engine
 * and runtime. Neither a pass flag nor another packed harness is this evidence. */
export function chipLifecycleBrowserObservations(observation,line){
 const ids=[];for(const engine of ['chromium','firefox','webkit'])for(const runtime of ['zoneful','zoneless']){
  const id=`release/${line}/${engine}/${runtime}/chips/default`,row=observation?.cases?.find(c=>c.case_id===id);assert.ok(row&&row.result==='pass','missing native chip lifecycle '+id);
  const prefix='mat-chip-list; focus and blur ';assert.ok(typeof row.evidence==='string'&&row.evidence.startsWith(prefix),'missing raw chip lifecycle evidence '+id);
  const raw=JSON.parse(row.evidence.slice(prefix.length));assert.deepEqual(Object.keys(raw),['focus_lifecycle','blur']);assert.ok(chipFocusLifecycleNativeOkay(raw.focus_lifecycle),'failed native chip focus lifecycle '+id);assert.ok(legacyChipBlurNativeOkay(raw.blur),'failed native chip form blur '+id);ids.push(id);
 }
 assert.equal(new Set(ids).size,6);return ids;
}
export function validateChipLifecycleBrowserRun({root,request}){
 const browser=validateBrowserMatrixRun({root,request});if(!browser.ok)return browser;
 try{const ids=chipLifecycleBrowserObservations(browser.observation,request.binding.source_line);return {ok:true,detail:'Complete same-run browser matrix and all six raw chip focus/blur engine/runtime observations verified.',invocation_id:browser.invocation_id,output:browser.output,library:browser.library,required_cases:ids};}catch(error){return {ok:false,detail:error.message};}
}
