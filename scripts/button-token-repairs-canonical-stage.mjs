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
import admission from './upstream-button-token-repairs-admission.cjs';
export const BUTTON_TOKEN_REPAIRS_LEDGER_BEFORE='485ff845dec1d5e57e16a26cc064b4070ea3e5fe020e9858fab02120fadcb6f7';
export const BUTTON_TOKEN_REPAIRS_REGISTRY='scripts/upstream-source-contract-registry.mjs';
export const BUTTON_TOKEN_REPAIRS_REGISTRY_BEFORE='e2cd8a53b9c35020d1484ac553e7f69917658f55f5ade75dd0c6bf12f2e6634e';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function buttonTokenRepairsRegistrySuccessor(before){
 assert.equal(hash(before),BUTTON_TOKEN_REPAIRS_REGISTRY_BEFORE);const text=before.toString(),marker='];\n';assert.equal(text.split(marker).length,2);
 const added=admission.BUTTON_TOKEN_REPAIRS_SHAS.map(sha=>`  {sha:'${sha}',proof_kind:'${admission.BUTTON_TOKEN_REPAIRS_PROOF_KIND}',\n    scope_key:'${admission.BUTTON_TOKEN_REPAIRS_SCOPE_KEY}',module:'upstream-button-token-repairs-admission.cjs'},\n`).join('');
 return Buffer.from(text.replace(marker,added+marker));
}
export function applyButtonTokenRepairsCanonicalStage({before,body}={}){
 assert.equal(hash(before),BUTTON_TOKEN_REPAIRS_LEDGER_BEFORE,'unqualified button token repairs ledger before-image');
 const data=JSON.parse(before),expected=structuredClone(data),selected=new Set(admission.BUTTON_TOKEN_REPAIRS_SHAS);
 assert.equal(data.entries.length,1697);assert.equal(new Set(data.entries.map(row=>row.sha)).size,1697);
 assert.equal(data.closed_dispositions,390);assert.equal(data.open_or_deferred,1307);
 assert.deepEqual(body.reviews.map(row=>row.sha),admission.BUTTON_TOKEN_REPAIRS_SHAS);
 const entries=body.reviews.map(row=>{
  const index=data.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);const prior=data.entries[index];
  assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
  const entry={...prior,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',
   evidence_report:admission.BUTTON_TOKEN_REPAIRS_REVIEW,individual_proof:admission.buttonTokenRepairsProof(row)};
  assert.equal(admission.metadataOk({entry,body,review:row,proof:entry.individual_proof}),true);
  expected.entries[index]=entry;return entry;
 });
 expected.closed_dispositions=392;expected.open_or_deferred=1305;
 const text=replaceHistoricalConsumerEntries(before,entries.map(entry=>({sha:entry.sha,after_entry:entry}))).toString();
 const split=text.indexOf('"entries": [');assert.ok(split>=0);let header=text.slice(0,split);
 for(const [key,from,to]of [['closed_dispositions',390,392],['open_or_deferred',1307,1305]]){
  const a='  "'+key+'": '+from+',',b='  "'+key+'": '+to+',';assert.equal(header.split(a).length,2);header=header.replace(a,b);
 }
 const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
 assert.deepEqual(expected.entries.filter(row=>!selected.has(row.sha)),data.entries.filter(row=>!selected.has(row.sha)));
 assert.deepEqual(expected.entries.filter(row=>row.final_disposition==='security-review'),data.entries.filter(row=>row.final_disposition==='security-review'));
 assert.equal(expected.entries.filter(row=>row.final_disposition==='security-review').length,1);
 return {before,after,entries,individual_decisions:2,summary_scalar_tokens:2,unselected_entries_preserved:1695};
}
