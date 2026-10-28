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
import admission from './upstream-slider-m3-repairs-admission.cjs';
export const SLIDER_M3_REPAIRS_LEDGER_BEFORE='3f229d913d93503ace3270b04d268ec8132e63cd97019a05a08c62ac4a0e67fa';
export const SLIDER_M3_REPAIRS_REGISTRY='scripts/upstream-source-contract-registry.mjs';
export const SLIDER_M3_REPAIRS_REGISTRY_BEFORE='856dffd6cd50d5ced52e9ea978761b18dbd13079cda15d01c25bbea6ad1764d8';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function sliderM3RepairsRegistrySuccessor(before){
 assert.equal(hash(before),SLIDER_M3_REPAIRS_REGISTRY_BEFORE);const text=before.toString(),marker='];\n';assert.equal(text.split(marker).length,2);
 const added=admission.SLIDER_M3_REPAIRS_SHAS.map(sha=>`  {sha:'${sha}',proof_kind:'${admission.SLIDER_M3_REPAIRS_PROOF_KIND}',\n    scope_key:'${admission.SLIDER_M3_REPAIRS_SCOPE_KEY}',module:'upstream-slider-m3-repairs-admission.cjs'},\n`).join('');
 return Buffer.from(text.replace(marker,added+marker));
}
export function applySliderM3RepairsCanonicalStage({before,body}={}){
 assert.equal(hash(before),SLIDER_M3_REPAIRS_LEDGER_BEFORE,'unqualified button token repairs ledger before-image');
 const data=JSON.parse(before),expected=structuredClone(data),selected=new Set(admission.SLIDER_M3_REPAIRS_SHAS);
 assert.equal(data.entries.length,1697);assert.equal(new Set(data.entries.map(row=>row.sha)).size,1697);
 assert.equal(data.closed_dispositions,395);assert.equal(data.open_or_deferred,1302);
 assert.deepEqual(body.reviews.map(row=>row.sha),admission.SLIDER_M3_REPAIRS_SHAS);
 const entries=body.reviews.map(row=>{
  const index=data.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);const prior=data.entries[index];
  assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
  const entry={...prior,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',
   evidence_report:admission.SLIDER_M3_REPAIRS_REVIEW,individual_proof:admission.sliderM3RepairsProof(row)};
  assert.equal(admission.metadataOk({entry,body,review:row,proof:entry.individual_proof}),true);
  expected.entries[index]=entry;return entry;
 });
 expected.closed_dispositions=397;expected.open_or_deferred=1300;
 const text=replaceHistoricalConsumerEntries(before,entries.map(entry=>({sha:entry.sha,after_entry:entry}))).toString();
 const split=text.indexOf('"entries": [');assert.ok(split>=0);let header=text.slice(0,split);
 for(const [key,from,to]of [['closed_dispositions',395,397],['open_or_deferred',1302,1300]]){
  const a='  "'+key+'": '+from+',',b='  "'+key+'": '+to+',';assert.equal(header.split(a).length,2);header=header.replace(a,b);
 }
 const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
 assert.deepEqual(expected.entries.filter(row=>!selected.has(row.sha)),data.entries.filter(row=>!selected.has(row.sha)));
 assert.deepEqual(expected.entries.filter(row=>row.final_disposition==='security-review'),data.entries.filter(row=>row.final_disposition==='security-review'));
 assert.equal(expected.entries.filter(row=>row.final_disposition==='security-review').length,1);
 return {before,after,entries,individual_decisions:2,summary_scalar_tokens:2,unselected_entries_preserved:1695};
}
