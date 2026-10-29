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
import {legacyRemovalOwnerSourceSubject} from './legacy-removal-owner-source.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
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

/** Real terminal source stage; prior complete-frame gates still own admission. */
export function legacyRemovalOwnerContext({root,read=path=>readFileSync(join(root,path))}={}){
 const tools=legacyRemovalOwnerSourceSubject({root,read}),packet=tools.packet;
 const bound=new Map(tools.bound.map(ref=>[ref.path,{...ref}]));
 const member=ref=>{const raw=read(ref.path);assert.ok(Buffer.isBuffer(raw));assert.equal(hash(raw),ref.sha256,'changed legacy owner input '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;};
 const proposal=JSON.parse(member(packet.proposal)),body=JSON.parse(member(proposal.review));
 const before=gunzipSync(member(packet.ledger_before_image)),registryBefore=gunzipSync(member(packet.registry_before_image));
 const stage=applyLegacyRemovalCanonicalStage({before,body}),registryAfter=legacyRemovalRegistrySuccessor(registryBefore);
 assert.equal(hash(stage.before),proposal.before.sha256);assert.equal(hash(stage.after),proposal.after.sha256);assert.equal(hash(registryAfter),proposal.registry_after.sha256);
 assert.ok(gunzipSync(member(packet.ledger_after_image)).equals(stage.after));assert.ok(gunzipSync(member(packet.registry_after_image)).equals(registryAfter));
 const actualLedger=read(LEGACY_REMOVAL_LEDGER),actualRegistry=read(LEGACY_REMOVAL_REGISTRY);
 assert.ok(actualRegistry.equals(readEvidenceMember(root,LEGACY_REMOVAL_REGISTRY)),'nonphysical legacy source registry');
 const comparisonRegistry=tools.predecessorData(LEGACY_REMOVAL_REGISTRY,actualRegistry);
 assert.ok(comparisonRegistry.equals(registryBefore)||comparisonRegistry.equals(registryAfter),'unqualified legacy source registry');
 const applied=actualLedger.equals(stage.after),registryApplied=comparisonRegistry.equals(registryAfter);if(applied)assert.ok(registryApplied,'legacy ledger successor requires its exact source registry successor');
 for(const[path,raw]of [[LEGACY_REMOVAL_LEDGER,actualLedger],[LEGACY_REMOVAL_REGISTRY,actualRegistry]])bound.set(path,{path,sha256:hash(raw),bytes:raw.length});
 const source=admission.inspectCanonicalSource({root,read,entries:stage.entries,body});for(const ref of source.bound)bound.set(ref.path,{...ref,bytes:ref.bytes??read(ref.path).length});
 const assertCurrent=()=>{tools.assertCurrent();source.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late legacy canonical input '+ref.path);assert.equal(raw.length,ref.bytes);}};
 // This private metadata view only maps the two independently derived exact
 // successors. The old actual compiled functions still reject unknown frames.
 const metadataRead=path=>{
  if(path===LEGACY_REMOVAL_LEDGER){const raw=read(path);assert.ok(raw.equals(actualLedger),'late legacy ledger');return applied?Buffer.from(before):raw;}
  return read(path);
 };
 const wrapPrepared=prior=>{
  assertCurrent();assert.ok(prior.canonical_after.equals(before),'legacy stage does not succeed the complete browser metadata after-image');
  const currentBound=new Map(prior.bound);for(const ref of bound.values())currentBound.set(ref.path,ref.sha256);
  const assertPrior=()=>{assertCurrent();prior.assertCurrent?.();prior.prior_metadata_assert_current?.();assertCurrent();};
  const native=prior.native_spec_source,nativeBound=native.bound.map(ref=>({...ref,sha256:currentBound.get(ref.path)??ref.sha256,bytes:read(ref.path).length}));
  assertPrior();return {...prior,canonical_after:Buffer.from(stage.after),bound:currentBound,
   legacy_removal_stage:{...stage,assertCurrent:assertPrior,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
   native_spec_source:{...native,bound:nativeBound,assertCurrent:()=>{assertCurrent();native.assertCurrent();assertCurrent();}},
   assertCurrent:assertPrior,prior_metadata_assert_current:assertPrior};
 };
 assertCurrent();return {applied,registryApplied,before:Buffer.from(before),after:Buffer.from(stage.after),registryBefore:Buffer.from(registryBefore),registryAfter:Buffer.from(registryAfter),metadataRead,wrapPrepared,bound:structuredClone([...bound.values()]),assertCurrent,source_facts:structuredClone(source.facts),source_scope_only:true,current_native_packed_browser_floor_or_full_audit_qualified:false};
}
