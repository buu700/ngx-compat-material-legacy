/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Real source verification plus complete-image,scope and late-source controls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {deriveBrowserReferenceMetadata,prepareBrowserReferenceMetadata,BROWSER_REFERENCE_PACKET as PACKET,BROWSER_REFERENCE_LEDGER as LEDGER} from '../scripts/browser-reference-proposal.mjs';
import {readCheckerOwnerMember} from '../scripts/checker-owner-source.mjs';
import {replaceHistoricalConsumerEntries} from '../scripts/historical-consumer-wrapper-metadata.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),disk=path=>readCheckerOwnerMember(root,path),hash=raw=>createHash('sha256').update(raw).digest('hex');
const beforeLive=disk(LEDGER),subject=prepareBrowserReferenceMetadata({root}),packet=JSON.parse(disk(PACKET));
const after=Buffer.from(subject.after),data=JSON.parse(after),before=Buffer.from(subject.before),sources=new Map(packet.source_transitions.map(row=>[row.path,disk(row.path)]));
assert.ok(after.equals(gunzipSync(disk('compatibility/rc/c04-browser-reference-proposal-after.json.gz'))));
assert.equal(subject.verifyAfter(after).native_or_full_audit_credit,false);assert.equal(subject.verifyInput(before).current_canonical_state,'before');assert.equal(subject.verifyInput(after).current_canonical_state,'after');
const at=(entry,pointer)=>pointer.split('/').filter(Boolean).reduce((value,key)=>value[key],entry);
let partial=0,preserved=0,claims=0,scope=0,cold=0,late=0;
for(const update of packet.updates){
 const entry=structuredClone(data.entries.find(row=>row.sha===update.sha));at(entry,update.pointer).sha256=update.before_reference.sha256;
 const candidate=replaceHistoricalConsumerEntries(after,[{sha:entry.sha,after_entry:entry}]);assert.throws(()=>subject.verifyAfter(candidate));assert.throws(()=>subject.verifyInput(candidate));partial++;
}
for(const ref of packet.preserved_reference_controls){
 const entry=structuredClone(data.entries.find(row=>row.sha===ref.sha));at(entry,ref.pointer).sha256='0'.repeat(64);
 const candidate=replaceHistoricalConsumerEntries(after,[{sha:entry.sha,after_entry:entry}]);assert.throws(()=>subject.verifyAfter(candidate));assert.throws(()=>subject.verifyInput(candidate));preserved++;
}
const first=packet.updates[0],selected=value=>value.entries.find(row=>row.sha===first.sha);
for(const mutate of [value=>value.g11_claim='passed',value=>value.closed_dispositions++,value=>value.open_or_deferred++,value=>selected(value).reason+=' unreviewed',value=>selected(value).final_disposition='inherited',value=>selected(value).individual_proof.proof_kind='individual-semantic',value=>value.entries.find(row=>row.individual_proof?.historical_behavior?.case_ids?.length).individual_proof.historical_behavior.case_ids.pop(),value=>value.entries.find(row=>row.sha==='231f94f5557bb58afc0070585688b3014d541eb2').final_disposition='security-cleared',value=>selected(value).individual_proof.actual_native_packed_browser_floor_or_full_audit_qualified=true]){
 const changed=structuredClone(data);mutate(changed);const candidate=Buffer.from(JSON.stringify(changed,null,2)+'\n');assert.throws(()=>subject.verifyAfter(candidate));assert.throws(()=>subject.verifyInput(candidate));claims++;
}
for(const mutate of [value=>value.updates.pop(),value=>value.updates.push({...value.updates[0]}),value=>value.metadata_reference_updates++,value=>value.selected_entries++,value=>value.updates[0].sha='0'.repeat(40),value=>value.updates[0].before_reference.sha256='0'.repeat(64),value=>value.source_transitions[0].current.sha256='0'.repeat(64),value=>value.preserved_native_reference_count--,value=>value.canonical_dispositions_changed=1,value=>value.canonical_owner_integration_complete=true,value=>value.actual_native_packed_browser_floor_or_full_audit_qualified=true,value=>value.g11_claim='passed']){
 const changed=structuredClone(packet);mutate(changed);assert.throws(()=>deriveBrowserReferenceMetadata({before,packet:changed,sources}));scope++;
}
assert.throws(()=>subject.verifyInput(Buffer.concat([before,Buffer.from(' ')])));assert.throws(()=>subject.verifyInput(Buffer.alloc(before.length)));
let tamper=null;const read=path=>{const raw=disk(path);return path===tamper?Buffer.concat([raw,Buffer.from(' ')]):raw;};
const current=prepareBrowserReferenceMetadata({root,read});
for(const ref of current.bound){tamper=ref.path;assert.throws(()=>current.assertCurrent(),undefined,'late '+ref.path);assert.throws(()=>current.verifyAfter(after),undefined,'late verify '+ref.path);late++;tamper=null;}
for(const ref of current.bound){tamper=ref.path;assert.throws(()=>prepareBrowserReferenceMetadata({root,read}),undefined,'cold '+ref.path);cold++;tamper=null;}
current.assertCurrent();current.verifyAfter(after);
for(const ref of current.bound)ref.sha256='0'.repeat(64);current.bound.length=0;current.before.fill(0);current.after.fill(0);current.updates.length=0;current.preserved.length=0;current.verifier.result='spoofed';
current.assertCurrent();assert.equal(current.verifyAfter(after).native_or_full_audit_credit,false);assert.equal(current.verifyInput(before).current_canonical_state,'before');assert.equal(current.verifyInput(after).current_canonical_state,'after');assert.ok(disk(LEDGER).equals(beforeLive));
const report={schema_version:1,line:subject.line,result:'pass',after_sha256:hash(after),metadata_reference_updates:packet.updates.length,selected_entries:subject.selected_entries,unselected_entry_bytes_preserved:subject.unselected_entry_bytes_preserved,preserved_native_reference_count:subject.preserved.length,already_current_browser_references_preserved:packet.already_current_browser_references_preserved,partial_updates_rejected:partial,preserved_reference_mutants_rejected:preserved,changed_claim_mutants_rejected:claims,changed_scope_mutants_rejected:scope,unknown_complete_images_rejected:2,cold_source_mutants_rejected:cold,late_source_mutants_rejected:late,bound_current_paths:subject.bound.length,fresh_actual_source_verifier:subject.verifier.result==='pass',public_snapshot_mutations_do_not_change_private_guards:true,canonical_ledger_unchanged:true,canonical_frame_admission_granted:false,canonical_owner_integration_complete:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
