/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exactly one source decision and two derived scalars; actual owner admission is separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
import admission from './upstream-legacy-removal-admission.cjs';
export const LEGACY_REMOVAL_LEDGER='compatibility/f10/disposition-ledger/ledger.json';
export const LEGACY_REMOVAL_LEDGER_BEFORE='f0aa2808e6bf022e9901b6edc249e1b08e7be9b7af06af4f154131e4a54c9cee';
export const LEGACY_REMOVAL_REGISTRY='scripts/upstream-source-contract-registry.mjs';
export const LEGACY_REMOVAL_REGISTRY_BEFORE='03a18cd09e4183f4307f1ec2c17d0797eea72db0440e23530e4d015ea0dae6a8';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function legacyRemovalRegistrySuccessor(before){
 assert.ok(Buffer.isBuffer(before));assert.equal(hash(before),LEGACY_REMOVAL_REGISTRY_BEFORE);
 const text=before.toString(),marker='];\n';assert.equal(text.split(marker).length,2);
 const record=`  {sha:'${admission.LEGACY_REMOVAL_SHA}',proof_kind:'${admission.LEGACY_REMOVAL_PROOF_KIND}',\n    scope_key:'${admission.LEGACY_REMOVAL_SCOPE_KEY}',module:'upstream-legacy-removal-admission.cjs'},\n`;
 assert.ok(!text.includes(admission.LEGACY_REMOVAL_SHA));return Buffer.from(text.replace(marker,record+marker));
}
export function applyLegacyRemovalCanonicalStage({before,body}={}){
 assert.ok(Buffer.isBuffer(before));assert.equal(hash(before),LEGACY_REMOVAL_LEDGER_BEFORE,'unqualified legacy removal ledger before-image');
 const data=JSON.parse(before),expected=structuredClone(data),sha=admission.LEGACY_REMOVAL_SHA;
 assert.equal(data.entries.length,1697);assert.equal(new Set(data.entries.map(row=>row.sha)).size,1697);
 assert.equal(data.closed_dispositions,424);assert.equal(data.open_or_deferred,1273);
 const index=data.entries.findIndex(row=>row.sha===sha);assert.ok(index>=0);const prior=data.entries[index];
 assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
 const entry={...prior,final_disposition:'not-applicable',reason:body.decision,read_note_disposition:'owned-retained',review_depth:'individual-compatibility',evidence_report:admission.LEGACY_REMOVAL_REVIEW,individual_proof:admission.legacyRemovalProof(body)};
 assert.equal(admission.metadataOk({entry,body,review:body,proof:entry.individual_proof}),true);
 expected.entries[index]=entry;expected.closed_dispositions=425;expected.open_or_deferred=1272;
 const text=replaceHistoricalConsumerEntries(before,[{sha,after_entry:entry}]).toString(),split=text.indexOf('"entries": [');assert.ok(split>=0);
 let header=text.slice(0,split);
 for(const[key,from,to]of [['closed_dispositions',424,425],['open_or_deferred',1273,1272]]){
  const old='  "'+key+'": '+from+',',next='  "'+key+'": '+to+',';assert.equal(header.split(old).length,2);header=header.replace(old,next);
 }
 const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
 assert.deepEqual(expected.entries.filter(row=>row.sha!==sha),data.entries.filter(row=>row.sha!==sha));
 assert.deepEqual(expected.entries.filter(row=>row.final_disposition==='security-review'),data.entries.filter(row=>row.final_disposition==='security-review'));
 assert.equal(expected.entries.filter(row=>row.final_disposition==='security-review').length,1);
 return {before:Buffer.from(before),after,entries:[structuredClone(entry)],individual_decisions:1,summary_scalar_tokens:2,unselected_entries_preserved:1696,canonical_admission_granted:false,current_native_packed_browser_floor_or_full_audit_qualified:false};
}
