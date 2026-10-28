/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One source decision and fourteen exact metadata tokens; no native qualification. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
import title from './upstream-dialog-title-admission.cjs';
const ts=createRequire(import.meta.url)('typescript');
export const TITLE_LEDGER_BEFORE='22f775835030f175795d8865e9b30920b0b7fea5b908cbd6a9dca7775a71d779';
export const TITLE_NATIVE_REGISTRY='scripts/upstream-historical-behavior-evidence.mjs';
export const TITLE_NATIVE_BEFORE='2e3d0d372775457655239efabd3769ca3b8bd1e0de42333bd48f9926bf1c3044';
export const TITLE_NATIVE_AFTER='8efdc7640a20c9c6b163c3e93b664d4b4384979fb0c23304b8d3f4fad02570c1';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
function property(node,key){
 assert.ok(ts.isObjectLiteralExpression(node));const found=node.properties.filter(row=>row.name?.text===key);
 assert.equal(found.length,1);return found[0].initializer;
}
export function applyDialogTitleCanonicalStage({before,body,selected}={}){
 assert.equal(hash(before),TITLE_LEDGER_BEFORE,'unqualified title ledger before-image');
 const data=JSON.parse(before),expected=structuredClone(data),text=before.toString();
 assert.equal(data.entries.length,1697);assert.equal(new Set(data.entries.map(row=>row.sha)).size,1697);
 assert.equal(data.closed_dispositions,376);assert.equal(data.open_or_deferred,1321);
 const syntax=ts.parseJsonText('title-ledger-before.json',text);assert.equal(syntax.parseDiagnostics.length,0);
 const nodes=property(syntax.statements[0].expression,'entries');assert.ok(ts.isArrayLiteralExpression(nodes));
 const actual=data.entries.flatMap(row=>(row.individual_proof?.historical_behavior?.source_members??[]).flatMap((member,index)=>
  member.path===TITLE_NATIVE_REGISTRY?[{sha:row.sha,source_member_index:index}]:[]));
 assert.equal(actual.length,14);assert.deepEqual(actual,selected,'changed native metadata selection');
 const edits=[];
 for(const row of actual){
  const i=data.entries.findIndex(entry=>entry.sha===row.sha),member=expected.entries[i].individual_proof.historical_behavior.source_members[row.source_member_index];
  assert.deepEqual(member,{path:TITLE_NATIVE_REGISTRY,sha256:TITLE_NATIVE_BEFORE});member.sha256=TITLE_NATIVE_AFTER;
  const node=property(property(property(property(nodes.elements[i],'individual_proof'),'historical_behavior'),'source_members').elements[row.source_member_index],'sha256');
  assert.equal(JSON.parse(node.getText(syntax)),TITLE_NATIVE_BEFORE);
  edits.push({start:node.getStart(syntax),end:node.end,text:JSON.stringify(TITLE_NATIVE_AFTER)});
 }
 let cursor=0;const chunks=[];
 for(const edit of edits.sort((a,b)=>a.start-b.start)){assert.ok(edit.start>=cursor);chunks.push(text.slice(cursor,edit.start),edit.text);cursor=edit.end;}
 chunks.push(text.slice(cursor));const metadataAfter=Buffer.from(chunks.join(''));assert.deepEqual(JSON.parse(metadataAfter),expected);
 const row=body.reviews.find(row=>row.sha===title.TITLE_SHA);assert.ok(row);
 const index=expected.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);
 const prior=expected.entries[index];assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
 const entry={...prior,final_disposition:'already-adapted',reason:row.decision,review_depth:'individual-compatibility',
  evidence_report:title.TITLE_REVIEW,individual_proof:title.titleProof(row)};
 assert.equal(title.metadataOk({entry,body,review:row,proof:entry.individual_proof}),true);
 expected.entries[index]=entry;expected.closed_dispositions=377;expected.open_or_deferred=1320;
 const replaced=replaceHistoricalConsumerEntries(metadataAfter,[{sha:row.sha,after_entry:entry}]).toString();
 const marker='"entries": [',split=replaced.indexOf(marker);assert.ok(split>=0);let header=replaced.slice(0,split);
 for(const [key,from,to]of [['closed_dispositions',376,377],['open_or_deferred',1321,1320]]){
  const a='  "'+key+'": '+from+',',b='  "'+key+'": '+to+',';assert.equal(header.split(a).length,2);header=header.replace(a,b);
 }
 const after=Buffer.from(header+replaced.slice(split));assert.deepEqual(JSON.parse(after),expected);
 assert.deepEqual(expected.entries.filter(row=>row.final_disposition==='security-review'),data.entries.filter(row=>row.final_disposition==='security-review'));
 assert.equal(expected.entries.filter(row=>row.final_disposition==='security-review').length,1);
 return {before,metadataAfter,after,entry,selected:structuredClone(actual),metadata_tokens:14,individual_decisions:1};
}
