/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure one-row/two-scalar proposal; complete shared-owner admission is separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
import admission from './upstream-table-local-compilation-admission.cjs';
import {tableLocalCompilationOwnerSourceSubject} from './table-local-compilation-owner-source.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
export const TABLE_LOCAL_COMPILATION_LEDGER='compatibility/f10/disposition-ledger/ledger.json';
export const TABLE_LOCAL_COMPILATION_LEDGER_BEFORE='4fd46af746fb9e2b0a27b0cd4b1341ed3b06cda873a6432eb4e6e35dbeb56ad9';
export const TABLE_LOCAL_COMPILATION_REGISTRY='scripts/upstream-source-contract-registry.mjs';
export const TABLE_LOCAL_COMPILATION_REGISTRY_BEFORE='d8435c9ff6582547a8ef3b367a9b37573a57f7bc102370c237425e3c0648d59a';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function tableLocalCompilationRegistrySuccessor(before){
 assert.ok(Buffer.isBuffer(before));assert.equal(hash(before),TABLE_LOCAL_COMPILATION_REGISTRY_BEFORE);
 const text=before.toString(),marker='];\n';assert.equal(text.split(marker).length,2);assert.ok(!text.includes(admission.TABLE_LOCAL_COMPILATION_SHA));
 const record=`  {sha:'${admission.TABLE_LOCAL_COMPILATION_SHA}',proof_kind:'${admission.TABLE_LOCAL_COMPILATION_PROOF_KIND}',\n    scope_key:'${admission.TABLE_LOCAL_COMPILATION_SCOPE_KEY}',module:'upstream-table-local-compilation-admission.cjs'},\n`;
 return Buffer.from(text.replace(marker,record+marker));
}
export function applyTableLocalCompilationCanonicalStage({before,body}={}){
 assert.ok(Buffer.isBuffer(before));assert.equal(hash(before),TABLE_LOCAL_COMPILATION_LEDGER_BEFORE,'unqualified table compilation ledger before-image');
 const data=JSON.parse(before),expected=structuredClone(data),sha=admission.TABLE_LOCAL_COMPILATION_SHA;
 assert.equal(data.entries.length,1697);assert.equal(new Set(data.entries.map(row=>row.sha)).size,1697);assert.equal(data.closed_dispositions,425);assert.equal(data.open_or_deferred,1272);
 const index=data.entries.findIndex(row=>row.sha===sha);assert.ok(index>=0);const prior=data.entries[index];assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
 const entry={...prior,final_disposition:'do-not-adopt',reason:body.decision,read_note_disposition:'owned-retained',review_depth:'individual-compatibility',evidence_report:admission.TABLE_LOCAL_COMPILATION_REVIEW,individual_proof:admission.tableLocalCompilationProof(body)};
 assert.equal(admission.metadataOk({entry,body,review:body,proof:entry.individual_proof}),true);
 expected.entries[index]=entry;expected.closed_dispositions=426;expected.open_or_deferred=1271;
 const text=replaceHistoricalConsumerEntries(before,[{sha,after_entry:entry}]).toString(),split=text.indexOf('"entries": [');assert.ok(split>=0);let header=text.slice(0,split);
 for(const[key,from,to]of [['closed_dispositions',425,426],['open_or_deferred',1272,1271]]){
  const old='  "'+key+'": '+from+',',next='  "'+key+'": '+to+',';assert.equal(header.split(old).length,2);header=header.replace(old,next);
 }
 const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
 assert.deepEqual(expected.entries.filter(row=>row.sha!==sha),data.entries.filter(row=>row.sha!==sha));
 assert.deepEqual(expected.entries.filter(row=>row.final_disposition==='security-review'),data.entries.filter(row=>row.final_disposition==='security-review'));assert.equal(expected.entries.filter(row=>row.final_disposition==='security-review').length,1);
 return {before:Buffer.from(before),after,entries:[structuredClone(entry)],individual_decisions:1,summary_scalar_tokens:2,unselected_entries_preserved:1696,canonical_admission_granted:false,current_native_packed_browser_floor_or_full_audit_qualified:false};
}


/** Actual current terminal stage; no historical program or public code projection. */
export function tableLocalCompilationOwnerContext({root,read=path=>readFileSync(join(root,path))}={}){
 const tools=tableLocalCompilationOwnerSourceSubject({root,read}),packet=tools.packet;
 const bound=new Map(tools.bound.map(ref=>[ref.path,{...ref}])),member=ref=>{const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed table canonical input '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;};
 const proposal=JSON.parse(member(packet.proposal)),body=JSON.parse(member(proposal.review)),before=gunzipSync(member(packet.ledger_before_image)),registryBefore=gunzipSync(member(packet.registry_before_image));
 const stage=applyTableLocalCompilationCanonicalStage({before,body}),registryAfter=tableLocalCompilationRegistrySuccessor(registryBefore);
 assert.equal(hash(stage.before),proposal.before.sha256);assert.equal(hash(stage.after),proposal.after.sha256);assert.equal(hash(registryAfter),proposal.registry_after.sha256);
 assert.ok(gunzipSync(member(packet.ledger_after_image)).equals(stage.after));assert.ok(gunzipSync(member(packet.registry_after_image)).equals(registryAfter));
 const actualLedger=read(TABLE_LOCAL_COMPILATION_LEDGER),actualRegistry=read(TABLE_LOCAL_COMPILATION_REGISTRY),registryRef=tools.qualifyReference(proposal.registry_before);
 assert.ok(actualRegistry.equals(readEvidenceMember(root,TABLE_LOCAL_COMPILATION_REGISTRY)),'nonphysical table registry');assert.equal(hash(actualRegistry),registryRef.sha256);
 const applied=actualLedger.equals(stage.after),registryApplied=actualRegistry.equals(registryAfter);if(applied)assert.ok(registryApplied,'table ledger requires exact registry successor');
 for(const[path,raw]of [[TABLE_LOCAL_COMPILATION_LEDGER,actualLedger],[TABLE_LOCAL_COMPILATION_REGISTRY,actualRegistry]])bound.set(path,{path,sha256:hash(raw),bytes:raw.length});
 const source=admission.inspectCanonicalSource({root,read,entries:stage.entries,body});for(const ref of source.bound)bound.set(ref.path,{...ref});
 const assertCurrent=()=>{tools.assertCurrent();source.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late table canonical input '+ref.path);assert.equal(raw.length,ref.bytes);}};
 const metadataRead=path=>{if(path!==TABLE_LOCAL_COMPILATION_LEDGER)return read(path);const raw=read(path);assert.ok(raw.equals(actualLedger),'late table ledger');return applied?Buffer.from(before):raw;};
 const wrapPrepared=prior=>{
  assertCurrent();assert.ok(prior.canonical_after.equals(before),'table stage does not succeed complete prior owner');const currentBound=new Map(prior.bound);for(const ref of bound.values())currentBound.set(ref.path,ref.sha256);
  const assertPrior=()=>{assertCurrent();prior.assertCurrent?.();prior.prior_metadata_assert_current?.();assertCurrent();};
  const native=prior.native_spec_source,nativeBound=native.bound.map(ref=>({...ref,sha256:currentBound.get(ref.path)??ref.sha256,bytes:read(ref.path).length}));
  assertPrior();return {...prior,canonical_after:Buffer.from(stage.after),bound:currentBound,table_local_compilation_stage:{...stage,assertCurrent:assertPrior,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},native_spec_source:{...native,bound:nativeBound,assertCurrent:()=>{assertCurrent();native.assertCurrent();assertCurrent();}},assertCurrent:assertPrior,prior_metadata_assert_current:assertPrior};
 };
 assertCurrent();return {applied,registryApplied,before:Buffer.from(before),after:Buffer.from(stage.after),registryBefore:Buffer.from(registryBefore),registryAfter:Buffer.from(registryAfter),metadataRead,wrapPrepared,bound:structuredClone([...bound.values()]),assertCurrent,source_facts:structuredClone(source.facts),source_scope_only:true,current_native_packed_browser_floor_or_full_audit_qualified:false};
}
