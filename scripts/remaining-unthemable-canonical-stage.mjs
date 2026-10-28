/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exactly fourteen complete entry replacements and two derived summary scalars. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
import admission from './upstream-remaining-unthemable-admission.cjs';
export const REMAINING_UNTHEMABLE_LEDGER_BEFORE='2eadcd59193c5cde7a6dcb9f6c469adca84f46688162d1866ad579c58743bc13';
export const REMAINING_UNTHEMABLE_REGISTRY='scripts/upstream-source-contract-registry.mjs';
export const REMAINING_UNTHEMABLE_REGISTRY_BEFORE='c1d47c7662500e98aa34b37e964227961796ff16f500289019b221b4edacc841';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function remainingUnthemableRegistrySuccessor(before){
 assert.equal(hash(before),REMAINING_UNTHEMABLE_REGISTRY_BEFORE);const text=before.toString(),marker='];\n';assert.equal(text.split(marker).length,2);
 const added=admission.REMAINING_UNTHEMABLE_SHAS.map(sha=>`  {sha:'${sha}',proof_kind:'${admission.REMAINING_UNTHEMABLE_PROOF_KIND}',\n    scope_key:'${admission.REMAINING_UNTHEMABLE_SCOPE_KEY}',module:'upstream-remaining-unthemable-admission.cjs'},\n`).join('');
 return Buffer.from(text.replace(marker,added+marker));
}
export function applyRemainingUnthemableCanonicalStage({before,body}={}){
 assert.equal(hash(before),REMAINING_UNTHEMABLE_LEDGER_BEFORE,'unqualified remaining unthemable ledger before-image');
 const data=JSON.parse(before),expected=structuredClone(data),selected=new Set(admission.REMAINING_UNTHEMABLE_SHAS);
 assert.equal(data.entries.length,1697);assert.equal(new Set(data.entries.map(row=>row.sha)).size,1697);
 assert.equal(data.closed_dispositions,410);assert.equal(data.open_or_deferred,1287);
 assert.deepEqual(body.reviews.map(row=>row.sha),admission.REMAINING_UNTHEMABLE_SHAS);
 const entries=body.reviews.map(row=>{
  const index=data.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);const prior=data.entries[index];
  assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
  const entry={...prior,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',
   evidence_report:admission.REMAINING_UNTHEMABLE_REVIEW,individual_proof:admission.remainingUnthemableProof(row)};
  assert.equal(admission.metadataOk({entry,body,review:row,proof:entry.individual_proof}),true);
  expected.entries[index]=entry;return entry;
 });
 expected.closed_dispositions=424;expected.open_or_deferred=1273;
 const text=replaceHistoricalConsumerEntries(before,entries.map(entry=>({sha:entry.sha,after_entry:entry}))).toString();
 const split=text.indexOf('"entries": [');assert.ok(split>=0);let header=text.slice(0,split);
 for(const [key,from,to]of [['closed_dispositions',410,424],['open_or_deferred',1287,1273]]){
  const a='  "'+key+'": '+from+',',b='  "'+key+'": '+to+',';assert.equal(header.split(a).length,2);header=header.replace(a,b);
 }
 const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
 assert.deepEqual(expected.entries.filter(row=>!selected.has(row.sha)),data.entries.filter(row=>!selected.has(row.sha)));
 assert.deepEqual(expected.entries.filter(row=>row.final_disposition==='security-review'),data.entries.filter(row=>row.final_disposition==='security-review'));
 assert.equal(expected.entries.filter(row=>row.final_disposition==='security-review').length,1);
 return {before,after,entries,individual_decisions:14,summary_scalar_tokens:2,unselected_entries_preserved:1683};
}
