/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Metadata corruption tests only; no native run or canonical mutation. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareInventoryReferenceMetadata,INVENTORY_REFERENCE_LEDGER,INVENTORY_REFERENCE_PACKET} from '../scripts/inventory-reference-proposal.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),raw=path=>readFileSync(resolve(root,path)),hash=b=>createHash('sha256').update(b).digest('hex');
const beforeLive=raw(INVENTORY_REFERENCE_LEDGER),stageAfter=gunzipSync(raw('compatibility/rc/c04-inventory-reference-proposal-after.json.gz'));
// Validate this preserved stage on its authenticated snapshot;the terminal
// checker image belongs to the complete owner,not this narrower proposal API.
const stageRead=path=>path===INVENTORY_REFERENCE_LEDGER?Buffer.from(stageAfter):raw(path);
const subject=prepareInventoryReferenceMetadata({root,read:stageRead});
const after=Buffer.from(subject.after),data=JSON.parse(after),packet=JSON.parse(raw(INVENTORY_REFERENCE_PACKET));
assert.equal(subject.current_canonical_state,stageRead(INVENTORY_REFERENCE_LEDGER).equals(subject.before)?'before':'after');assert.equal(subject.canonical_owner_integration_complete,false);
assert.ok(after.equals(gunzipSync(raw('compatibility/rc/c04-inventory-reference-proposal-after.json.gz'))));
assert.equal(subject.verifyAfter(after).native_or_full_audit_credit,false);
const at=(entry,pointer)=>pointer.split('/').filter(Boolean).reduce((value,key)=>value[Array.isArray(value)?Number(key):key],entry);
let partial=0,historical=0,other=0;
for(const update of subject.updates){
 const mutant=structuredClone(data),entry=mutant.entries.find(row=>row.sha===update.sha);
 at(entry,update.pointer).sha256=update.before_reference.sha256;
 assert.throws(()=>subject.verifyAfter(Buffer.from(JSON.stringify(mutant,null,2)+'\n')));partial++;
}
for(const target of subject.historical){
 const mutant=structuredClone(data),entry=mutant.entries.find(row=>row.sha===target.sha);
 at(entry,target.pointer).sha256=packet.current_inventory.sha256;
 assert.throws(()=>subject.verifyAfter(Buffer.from(JSON.stringify(mutant,null,2)+'\n')));historical++;
}
for(const fault of ['disposition','reason','proof','summary','G11','other-reference','unselected-entry','extra-byte']){
 const mutant=structuredClone(data),entry=mutant.entries.find(row=>row.sha===subject.updates[0].sha);
 if(fault==='disposition')entry.final_disposition='irrelevant';
 if(fault==='reason')entry.reason+=' Unreviewed conclusion.';
 if(fault==='proof')entry.individual_proof.extra_native_credit=true;
 if(fault==='summary')mutant.closed_dispositions++;
 if(fault==='G11')mutant.g11_claim='passed';
 if(fault==='other-reference'){
  const kind=subject.updates[0].pointer.split('/')[2];
  entry.individual_proof[kind].source_members.find(row=>row.path!==packet.current_inventory.path).sha256='0'.repeat(64);
 }
 if(fault==='unselected-entry')mutant.entries.find(row=>!subject.updates.some(update=>update.sha===row.sha)).reason+=' Outside proposal.';
 const bytes=fault==='extra-byte'?Buffer.concat([after,Buffer.from(' ')]):Buffer.from(JSON.stringify(mutant,null,2)+'\n');
 assert.throws(()=>subject.verifyAfter(bytes));other++;
}
let tamper=null;
const read=path=>{const value=stageRead(path);return path===tamper?Buffer.concat([value,Buffer.from(' ')]):value;};
const live=prepareInventoryReferenceMetadata({root,read});let late=0,cold=0;
for(const ref of live.bound){tamper=ref.path;assert.throws(()=>live.assertCurrent(),undefined,'late '+tamper);late++;tamper=null;live.assertCurrent();}
for(const ref of live.bound){tamper=ref.path;assert.throws(()=>prepareInventoryReferenceMetadata({root,read}),undefined,'cold '+tamper);cold++;tamper=null;}
subject.after.fill(0);subject.bound[0].sha256='0'.repeat(64);subject.updates.length=0;subject.historical.length=0;
assert.equal(subject.verifyAfter(after).metadata_only,true);assert.ok(raw(INVENTORY_REFERENCE_LEDGER).equals(beforeLive));
console.log(JSON.stringify({schema_version:1,line:subject.line,metadata_reference_updates:partial,unselected_entries_preserved:1697-partial,
 older_historical_references_preserved:historical,partial_after_images_rejected:partial,historical_rebinding_mutants_rejected:historical,
 extra_claim_judgment_or_scope_mutants_rejected:other,cold_source_mutants_rejected:cold,late_source_mutants_rejected:late,
 bound_sources:live.bound.length,after_sha256:hash(after),after_bytes:after.length,canonical_ledger_unchanged:true,
 canonical_owner_integration_complete:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'}));
