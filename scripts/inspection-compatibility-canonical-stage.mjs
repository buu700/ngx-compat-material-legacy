/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exactly four complete entry replacements and two derived summary scalars. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
import admission from './upstream-inspection-compatibility-admission.cjs';
export const INSPECTION_LEDGER_BEFORE='9810524e12e3096e7d971ea80a1424614dedecc4818f80c8e31adf86f2aeec37';
export const INSPECTION_REGISTRY='scripts/upstream-source-contract-registry.mjs';
export const INSPECTION_REGISTRY_BEFORE='bdb3e27464f61f790f1428dca1e1bd3476acdda6c24bf0301929b059686084be';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function inspectionRegistrySuccessor(before){
 assert.equal(hash(before),INSPECTION_REGISTRY_BEFORE);const text=before.toString(),marker='];\n';assert.equal(text.split(marker).length,2);
 const added=admission.INSPECTION_SHAS.map(sha=>`  {sha:'${sha}',proof_kind:'${admission.INSPECTION_PROOF_KIND}',\n    scope_key:'${admission.INSPECTION_SCOPE_KEY}',module:'upstream-inspection-compatibility-admission.cjs'},\n`).join('');
 return Buffer.from(text.replace(marker,added+marker));
}
export function applyInspectionCompatibilityCanonicalStage({before,body}={}){
 assert.equal(hash(before),INSPECTION_LEDGER_BEFORE,'unqualified inspection ledger before-image');
 const data=JSON.parse(before),expected=structuredClone(data),selected=new Set(admission.INSPECTION_SHAS);
 assert.equal(data.entries.length,1697);assert.equal(new Set(data.entries.map(row=>row.sha)).size,1697);
 assert.equal(data.closed_dispositions,379);assert.equal(data.open_or_deferred,1318);
 assert.deepEqual(body.reviews.map(row=>row.sha),admission.INSPECTION_SHAS);
 const entries=body.reviews.map(row=>{
  const index=data.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);const prior=data.entries[index];
  assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
  const entry={...prior,final_disposition:row.proposed_final_disposition,reason:row.decision,review_depth:'individual-compatibility',
   evidence_report:admission.INSPECTION_REVIEW,individual_proof:admission.inspectionProof(row)};
  assert.equal(admission.metadataOk({entry,body,review:row,proof:entry.individual_proof}),true);
  expected.entries[index]=entry;return entry;
 });
 expected.closed_dispositions=383;expected.open_or_deferred=1314;
 const text=replaceHistoricalConsumerEntries(before,entries.map(entry=>({sha:entry.sha,after_entry:entry}))).toString();
 const split=text.indexOf('"entries": [');assert.ok(split>=0);let header=text.slice(0,split);
 for(const [key,from,to]of [['closed_dispositions',379,383],['open_or_deferred',1318,1314]]){
  const a='  "'+key+'": '+from+',',b='  "'+key+'": '+to+',';assert.equal(header.split(a).length,2);header=header.replace(a,b);
 }
 const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
 assert.deepEqual(expected.entries.filter(row=>!selected.has(row.sha)),data.entries.filter(row=>!selected.has(row.sha)));
 assert.deepEqual(expected.entries.filter(row=>row.final_disposition==='security-review'),data.entries.filter(row=>row.final_disposition==='security-review'));
 assert.equal(expected.entries.filter(row=>row.final_disposition==='security-review').length,1);
 return {before,after,entries,individual_decisions:4,summary_scalar_tokens:2,unselected_entries_preserved:1693};
}
