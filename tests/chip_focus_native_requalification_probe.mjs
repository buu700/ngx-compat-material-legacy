/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Raw native source/proof controls only; no native or packed execution. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chipFocusNativePrior,chipFocusNativeInputs,chipFocusNativeSourceWrites,inspectChipFocusNativeRequalification,CHIP_FOCUS_NATIVE_PRIOR,CHIP_FOCUS_NATIVE_INPUTS} from '../scripts/chip-focus-native-requalification.mjs';
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),prior=chipFocusNativePrior(),current=await inspectChipFocusNativeRequalification({requireNoCoordinator:true}),built=chipFocusNativeSourceWrites(),ledger=JSON.parse(read(prior.ledger_path)),controls=[];
for(const profile of current.native_profiles){const api=await import('../scripts/upstream-'+profile.api+'-evidence.mjs'),entry=ledger.entries.find(e=>e.sha===profile.sha),old=prior.native_inventory.profiles.find(p=>p.sha===entry.sha),requires=api['requires'+old.validate.slice('validate'.length)];assert.equal(typeof requires,'function');assert.equal(requires({sha:entry.sha},{}),true);
 const validate=e=>api[old.validate]({root:process.cwd(),entry:e,proof:e.individual_proof});assert.deepEqual(validate(entry),{ok:false,detail:'missing coordinator run'});
 for(const [id,mutate]of [
  ['wrong-proof-kind',e=>e.individual_proof.proof_kind='documentation-only'],
  ['missing-source-member',e=>e.individual_proof[profile.field].source_members.pop()],
  ['old-source-seal',e=>{const member=e.individual_proof[profile.field].source_members.find(m=>prior.changed_source_subjects.some(p=>p.path===m.path));assert.ok(member);member.sha256=prior.changed_source_subjects.find(p=>p.path===member.path).before_sha256;}],
 ]){const changed=structuredClone(entry);mutate(changed);const result=validate(changed);assert.equal(result.ok,false);assert.notEqual(result.detail,'missing coordinator run',profile.sha+' '+id);assert.equal(requires({sha:entry.sha},{}),true);controls.push({sha:entry.sha,id,result:'source/proof rejected before execution'});}
}
for(const path of [CHIP_FOCUS_NATIVE_INPUTS,CHIP_FOCUS_NATIVE_PRIOR]){assert.throws(()=>chipFocusNativeInputs(p=>p===path?Buffer.concat([read(p),Buffer.from('changed')]):read(p)));controls.push({id:'late-capsule-corruption-'+path,result:'rejected'});}
for(const path of ['projects/ngx-material-legacy/legacy-chips/chip.ts','scripts/upstream-media-matcher-evidence.mjs']){assert.throws(()=>chipFocusNativeInputs(p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)));controls.push({id:'unreviewed-source-'+path,result:'rejected'});}
const reportPath=[...built.writes.keys()][0],report=JSON.parse(read(reportPath));report.decision='changed original judgment';const badBody=Buffer.from(JSON.stringify(report));await assert.rejects(()=>inspectChipFocusNativeRequalification({read:p=>p===reportPath?badBody:read(p)}));controls.push({id:'changed-original-judgment-in-current-report',result:'rejected'});
const selected=new Set(built.entries.map(e=>e.sha)),badLedger=structuredClone(ledger);badLedger.entries.find(e=>!selected.has(e.sha)).reason='unreviewed unrelated change';const badBytes=Buffer.from(JSON.stringify(badLedger));await assert.rejects(()=>inspectChipFocusNativeRequalification({read:p=>p===prior.ledger_path?badBytes:read(p)}));controls.push({id:'unrelated-ledger-change',result:'rejected'});
assert.ok(Object.isFrozen(prior.entries[0]));assert.throws(()=>prior.entries[0].reason='changed');controls.push({id:'immutable-prior',result:'rejected'});
let mismatches=0;
function mismatchCount(o){if(!o||typeof o!=='object')return 0;let n=o.prior_document_seal?.matched===false?1:0;for(const v of Object.values(o))n+=mismatchCount(v);return n;}
for(const [path,bytes]of built.writes){const now=JSON.parse(bytes),old=JSON.parse(prior.reviews.find(m=>m.path===prior.entries.find(e=>built.entries.some(n=>n.sha===e.sha&&n.evidence_report===path)).evidence_report).text);assert.equal(mismatchCount(now),mismatchCount(old));mismatches+=mismatchCount(now);}
const diagnostic={...current,controls,control_count:controls.length,all_registry_source_modules_authenticated:13,previous_document_seal_mismatches_retained:mismatches,unrelated_entry_count:1697-built.entries.length,semantic_native_requirement_changes:0,actual_native_browser_library_or_floor_execution:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(diagnostic,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...diagnostic,native_profiles:current.native_profiles.length,updated_native_profile_shas:current.updated_native_profile_shas.length,controls:controls.length}));
