/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exactly three complete entry replacements and two derived summary scalars. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
import admission from './upstream-core-tokenization-admission.cjs';
export const CORE_TOKENIZATION_LEDGER_BEFORE='d7d3eab23b0f89f6d366d8e6df1ee7ff659cb26c77edbb517e99b30f757302b0';
export const CORE_TOKENIZATION_REGISTRY='scripts/upstream-source-contract-registry.mjs';
export const CORE_TOKENIZATION_REGISTRY_BEFORE='99236700a066edfa8ab5dd2fbc08c92de86334839bad161467e246e4a91a3895';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function coreTokenizationRegistrySuccessor(before){
 assert.equal(hash(before),CORE_TOKENIZATION_REGISTRY_BEFORE);const text=before.toString(),marker='];\n';assert.equal(text.split(marker).length,2);
 const added=admission.CORE_TOKENIZATION_SHAS.map(sha=>`  {sha:'${sha}',proof_kind:'${admission.CORE_TOKENIZATION_PROOF_KIND}',\n    scope_key:'${admission.CORE_TOKENIZATION_SCOPE_KEY}',module:'upstream-core-tokenization-admission.cjs'},\n`).join('');
 return Buffer.from(text.replace(marker,added+marker));
}
export function applyCoreTokenizationCanonicalStage({before,body}={}){
 assert.equal(hash(before),CORE_TOKENIZATION_LEDGER_BEFORE,'unqualified core tokenization ledger before-image');
 const data=JSON.parse(before),expected=structuredClone(data),selected=new Set(admission.CORE_TOKENIZATION_SHAS);
 assert.equal(data.entries.length,1697);assert.equal(new Set(data.entries.map(row=>row.sha)).size,1697);
 assert.equal(data.closed_dispositions,407);assert.equal(data.open_or_deferred,1290);
 assert.deepEqual(body.reviews.map(row=>row.sha),admission.CORE_TOKENIZATION_SHAS);
 const entries=body.reviews.map(row=>{
  const index=data.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);const prior=data.entries[index];
  assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
  const entry={...prior,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',
   evidence_report:admission.CORE_TOKENIZATION_REVIEW,individual_proof:admission.coreTokenizationProof(row)};
  assert.equal(admission.metadataOk({entry,body,review:row,proof:entry.individual_proof}),true);
  expected.entries[index]=entry;return entry;
 });
 expected.closed_dispositions=410;expected.open_or_deferred=1287;
 const text=replaceHistoricalConsumerEntries(before,entries.map(entry=>({sha:entry.sha,after_entry:entry}))).toString();
 const split=text.indexOf('"entries": [');assert.ok(split>=0);let header=text.slice(0,split);
 for(const [key,from,to]of [['closed_dispositions',407,410],['open_or_deferred',1290,1287]]){
  const a='  "'+key+'": '+from+',',b='  "'+key+'": '+to+',';assert.equal(header.split(a).length,2);header=header.replace(a,b);
 }
 const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
 assert.deepEqual(expected.entries.filter(row=>!selected.has(row.sha)),data.entries.filter(row=>!selected.has(row.sha)));
 assert.deepEqual(expected.entries.filter(row=>row.final_disposition==='security-review'),data.entries.filter(row=>row.final_disposition==='security-review'));
 assert.equal(expected.entries.filter(row=>row.final_disposition==='security-review').length,1);
 return {before,after,entries,individual_decisions:3,summary_scalar_tokens:2,unselected_entries_preserved:1694};
}
