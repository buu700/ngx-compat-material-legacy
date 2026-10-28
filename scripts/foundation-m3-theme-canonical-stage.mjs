/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exactly six complete entry replacements and two derived summary scalars. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
import admission from './upstream-foundation-m3-theme-admission.cjs';
export const FOUNDATION_M3_THEME_LEDGER_BEFORE='5e4badf5f49969c776d83d6d04d658f8f2082150c29358f88d3f445b216c6a27';
export const FOUNDATION_M3_THEME_REGISTRY='scripts/upstream-source-contract-registry.mjs';
export const FOUNDATION_M3_THEME_REGISTRY_BEFORE='ae4d9e85741a782bdd2f9be8e7686bab3b3d4cb0e645224eab8207fb0e376340';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function foundationM3ThemeRegistrySuccessor(before){
 assert.equal(hash(before),FOUNDATION_M3_THEME_REGISTRY_BEFORE);const text=before.toString(),marker='];\n';assert.equal(text.split(marker).length,2);
 const added=admission.FOUNDATION_M3_THEME_SHAS.map(sha=>`  {sha:'${sha}',proof_kind:'${admission.FOUNDATION_M3_THEME_PROOF_KIND}',\n    scope_key:'${admission.FOUNDATION_M3_THEME_SCOPE_KEY}',module:'upstream-foundation-m3-theme-admission.cjs'},\n`).join('');
 return Buffer.from(text.replace(marker,added+marker));
}
export function applyFoundationM3ThemeCanonicalStage({before,body}={}){
 assert.equal(hash(before),FOUNDATION_M3_THEME_LEDGER_BEFORE,'unqualified control theme ledger before-image');
 const data=JSON.parse(before),expected=structuredClone(data),selected=new Set(admission.FOUNDATION_M3_THEME_SHAS);
 assert.equal(data.entries.length,1697);assert.equal(new Set(data.entries.map(row=>row.sha)).size,1697);
 assert.equal(data.closed_dispositions,401);assert.equal(data.open_or_deferred,1296);
 assert.deepEqual(body.reviews.map(row=>row.sha),admission.FOUNDATION_M3_THEME_SHAS);
 const entries=body.reviews.map(row=>{
  const index=data.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);const prior=data.entries[index];
  assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
  const entry={...prior,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',
   evidence_report:admission.FOUNDATION_M3_THEME_REVIEW,individual_proof:admission.foundationM3ThemeProof(row)};
  assert.equal(admission.metadataOk({entry,body,review:row,proof:entry.individual_proof}),true);
  expected.entries[index]=entry;return entry;
 });
 expected.closed_dispositions=407;expected.open_or_deferred=1290;
 const text=replaceHistoricalConsumerEntries(before,entries.map(entry=>({sha:entry.sha,after_entry:entry}))).toString();
 const split=text.indexOf('"entries": [');assert.ok(split>=0);let header=text.slice(0,split);
 for(const [key,from,to]of [['closed_dispositions',401,407],['open_or_deferred',1296,1290]]){
  const a='  "'+key+'": '+from+',',b='  "'+key+'": '+to+',';assert.equal(header.split(a).length,2);header=header.replace(a,b);
 }
 const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
 assert.deepEqual(expected.entries.filter(row=>!selected.has(row.sha)),data.entries.filter(row=>!selected.has(row.sha)));
 assert.deepEqual(expected.entries.filter(row=>row.final_disposition==='security-review'),data.entries.filter(row=>row.final_disposition==='security-review'));
 assert.equal(expected.entries.filter(row=>row.final_disposition==='security-review').length,1);
 return {before,after,entries,individual_decisions:6,summary_scalar_tokens:2,unselected_entries_preserved:1691};
}
