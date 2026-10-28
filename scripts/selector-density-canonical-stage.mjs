/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exactly two complete entry replacements and two derived summary scalars. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
import admission from './upstream-selector-density-admission.cjs';
export const SELECTOR_DENSITY_LEDGER_BEFORE='84ea529d6f2f72925507300e88f9f825d48ae83ea1733191136663d1c8034c17';
export const SELECTOR_DENSITY_REGISTRY='scripts/upstream-source-contract-registry.mjs';
export const SELECTOR_DENSITY_REGISTRY_BEFORE='c01bd5192355a497485fc9f85cdda04760af0ac0287a4f2d01b93df34ab83ffc';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function selectorDensityRegistrySuccessor(before){
 assert.equal(hash(before),SELECTOR_DENSITY_REGISTRY_BEFORE);const text=before.toString(),marker='];\n';assert.equal(text.split(marker).length,2);
 const added=admission.SELECTOR_DENSITY_SHAS.map(sha=>`  {sha:'${sha}',proof_kind:'${admission.SELECTOR_DENSITY_PROOF_KIND}',\n    scope_key:'${admission.SELECTOR_DENSITY_SCOPE_KEY}',module:'upstream-selector-density-admission.cjs'},\n`).join('');
 return Buffer.from(text.replace(marker,added+marker));
}
export function applySelectorDensityCanonicalStage({before,body}={}){
 assert.equal(hash(before),SELECTOR_DENSITY_LEDGER_BEFORE,'unqualified selector/density ledger before-image');
 const data=JSON.parse(before),expected=structuredClone(data),selected=new Set(admission.SELECTOR_DENSITY_SHAS);
 assert.equal(data.entries.length,1697);assert.equal(new Set(data.entries.map(row=>row.sha)).size,1697);
 assert.equal(data.closed_dispositions,383);assert.equal(data.open_or_deferred,1314);
 assert.deepEqual(body.reviews.map(row=>row.sha),admission.SELECTOR_DENSITY_SHAS);
 const entries=body.reviews.map(row=>{
  const index=data.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);const prior=data.entries[index];
  assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
  const entry={...prior,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',
   evidence_report:admission.SELECTOR_DENSITY_REVIEW,individual_proof:admission.selectorDensityProof(row)};
  assert.equal(admission.metadataOk({entry,body,review:row,proof:entry.individual_proof}),true);
  expected.entries[index]=entry;return entry;
 });
 expected.closed_dispositions=385;expected.open_or_deferred=1312;
 const text=replaceHistoricalConsumerEntries(before,entries.map(entry=>({sha:entry.sha,after_entry:entry}))).toString();
 const split=text.indexOf('"entries": [');assert.ok(split>=0);let header=text.slice(0,split);
 for(const [key,from,to]of [['closed_dispositions',383,385],['open_or_deferred',1314,1312]]){
  const a='  "'+key+'": '+from+',',b='  "'+key+'": '+to+',';assert.equal(header.split(a).length,2);header=header.replace(a,b);
 }
 const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
 assert.deepEqual(expected.entries.filter(row=>!selected.has(row.sha)),data.entries.filter(row=>!selected.has(row.sha)));
 assert.deepEqual(expected.entries.filter(row=>row.final_disposition==='security-review'),data.entries.filter(row=>row.final_disposition==='security-review'));
 assert.equal(expected.entries.filter(row=>row.final_disposition==='security-review').length,1);
 return {before,after,entries,individual_decisions:2,summary_scalar_tokens:2,unselected_entries_preserved:1695};
}
