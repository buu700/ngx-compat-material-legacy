/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact proposal derivation plus partial/scope/claim/current-source controls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {deriveCheckerReferenceMetadata,prepareCheckerReferenceMetadata,CHECKER_REFERENCE_PACKET as PACKET,CHECKER_REFERENCE_LEDGER as LEDGER,CHECKER_REFERENCE_PATH as CHECKER} from '../scripts/checker-reference-proposal.mjs';
import {replaceHistoricalConsumerEntries} from '../scripts/historical-consumer-wrapper-metadata.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),disk=path=>readFileSync(join(root,path));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const beforeLive=disk(LEDGER),stageLedger=gunzipSync(disk('compatibility/rc/c04-checker-reference-proposal-after.json.gz'));
const stageRead=path=>path===LEDGER?Buffer.from(stageLedger):disk(path);
const subject=prepareCheckerReferenceMetadata({root,read:stageRead}),packet=JSON.parse(disk(PACKET));
const after=Buffer.from(subject.after),data=JSON.parse(after),sourceBefore=Buffer.from(subject.before);
assert.equal(subject.current_canonical_state,stageRead(LEDGER).equals(subject.before)?'before':'after');assert.equal(subject.canonical_owner_integration_complete,false);
assert.ok(after.equals(gunzipSync(disk('compatibility/rc/c04-checker-reference-proposal-after.json.gz'))));
assert.equal(subject.verifyAfter(after).native_or_full_audit_credit,false);assert.equal(subject.metadata_reference_updates,packet.updates.length);
const at=(entry,pointer)=>pointer.split('/').filter(Boolean).reduce((value,key)=>value[Number.isInteger(Number(key))?Number(key):key],entry);
let partial=0,preserved=0,claims=0,scope=0,cold=0,late=0;
for(const update of packet.updates){
 const entry=structuredClone(data.entries.find(row=>row.sha===update.sha));at(entry,update.pointer).sha256=packet.old_checker_sha256;
 assert.throws(()=>subject.verifyAfter(replaceHistoricalConsumerEntries(after,[{sha:entry.sha,after_entry:entry}])));partial++;
}
for(const prior of packet.already_current_references_to_preserve){
 const entry=structuredClone(data.entries.find(row=>row.sha===prior.sha));at(entry,prior.pointer).sha256='0'.repeat(64);
 assert.throws(()=>subject.verifyAfter(replaceHistoricalConsumerEntries(after,[{sha:entry.sha,after_entry:entry}])));preserved++;
}
const first=packet.updates[0];
for(const mutate of [value=>value.g11_claim='passed',value=>value.closed_dispositions++,value=>value.open_or_deferred++,
 value=>value.entries.find(row=>row.sha===first.sha).reason+=' unreviewed',
 value=>value.entries.find(row=>row.sha===first.sha).final_disposition='inherited',
 value=>value.entries.find(row=>row.sha===first.sha).individual_proof.proof_kind='individual-semantic',
 value=>value.entries.find(row=>row.sha===first.sha).individual_proof[first.pointer.split('/')[2]].runtimes.pop(),
 value=>value.entries.find(row=>row.sha===first.sha).individual_proof.actual_native_packed_browser_floor_or_full_audit_qualified=true]){
 const altered=structuredClone(data);mutate(altered);assert.throws(()=>subject.verifyAfter(Buffer.from(JSON.stringify(altered,null,2)+'\n')));claims++;
}
for(const mutate of [value=>value.updates.pop(),value=>value.updates.push({...value.updates[0]}),value=>value.metadata_reference_updates++,
 value=>value.updates[0].sha='0'.repeat(40),value=>value.updates[0].before_reference.sha256='0'.repeat(64),
 value=>value.current_checker.sha256='0'.repeat(64),value=>value.already_current_references_to_preserve.pop(),
 value=>value.canonical_dispositions_changed=1,value=>value.canonical_owner_integration_complete=true,
 value=>value.actual_native_packed_browser_floor_or_full_audit_qualified=true,value=>value.g11_claim='passed']){
 const changed=structuredClone(packet);mutate(changed);assert.throws(()=>deriveCheckerReferenceMetadata({before:sourceBefore,packet:changed,checker:disk(CHECKER)}));scope++;
}
let tamper=null;const read=path=>{const raw=stageRead(path);return path===tamper?Buffer.concat([raw,Buffer.from(' ')]):raw;};
const current=prepareCheckerReferenceMetadata({root,read});
for(const ref of current.bound){tamper=ref.path;assert.throws(()=>current.assertCurrent(),undefined,'late '+ref.path);assert.throws(()=>current.verifyAfter(after),undefined,'late verify '+ref.path);late++;tamper=null;}
for(const ref of current.bound){tamper=ref.path;assert.throws(()=>prepareCheckerReferenceMetadata({root,read}),undefined,'cold '+ref.path);cold++;tamper=null;}
current.assertCurrent();current.verifyAfter(after);
// Public snapshots never mutate private success/identity predicates.
for(const ref of current.bound)ref.sha256='0'.repeat(64);current.bound.length=0;current.before.fill(0);current.after.fill(0);current.updates.length=0;current.preserved.length=0;
current.assertCurrent();assert.equal(current.verifyAfter(after).native_or_full_audit_credit,false);assert.ok(disk(LEDGER).equals(beforeLive));
const report={schema_version:1,line:subject.line,result:'pass',after_sha256:hash(after),metadata_reference_updates:packet.updates.length,
 already_current_checker_references_preserved:packet.already_current_references_to_preserve.length,unselected_entry_bytes_preserved:subject.unselected_entry_bytes_preserved,
 partial_updates_rejected:partial,preserved_reference_mutants_rejected:preserved,changed_claim_mutants_rejected:claims,changed_scope_mutants_rejected:scope,
 cold_source_mutants_rejected:cold,late_source_mutants_rejected:late,bound_current_paths:subject.bound.length,
 fresh_actual_source_verifier:subject.verifier.result==='pass',canonical_ledger_unchanged:true,public_snapshot_mutations_do_not_change_private_guards:true,
 canonical_owner_integration_complete:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
