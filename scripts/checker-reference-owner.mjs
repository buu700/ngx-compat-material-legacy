/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One terminal metadata stage;all earlier owner functions remain in use. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {checkerOwnerSourceSubject,readCheckerOwnerMember} from './checker-owner-source.mjs';
import {prepareCheckerReferenceSourceMetadata,CHECKER_REFERENCE_LEDGER as LEDGER} from './checker-reference-proposal.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function checkerReferenceOwnerContext({root,read=path=>readCheckerOwnerMember(root,path)}={}){
 const tools=checkerOwnerSourceSubject({root,read}),source=prepareCheckerReferenceSourceMetadata({root,read});
 assert.equal(tools.line,source.line);assert.equal(hash(source.before),tools.packet.before_ledger.sha256);assert.equal(hash(source.after),tools.packet.after_ledger.sha256);
 const raw=read(LEDGER),current={path:LEDGER,sha256:hash(raw),bytes:raw.length};
 const bound=new Map([...tools.bound,...source.bound,current].map(ref=>[ref.path,{...ref}]));
 const applied=raw.equals(source.after);
 const assertCurrent=()=>{tools.assertCurrent();source.assertCurrent();for(const ref of bound.values()){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'late checker metadata input '+ref.path);assert.equal(value.length,ref.bytes);}};
 const wrapPrepared=prior=>{
  assertCurrent();assert.ok(prior.canonical_after.equals(source.before),'checker stage does not succeed the exact inventory after-image');
  const currentBound=new Map(prior.bound);for(const ref of bound.values())currentBound.set(ref.path,ref.sha256);
  const assertPrior=()=>{assertCurrent();prior.assertCurrent?.();prior.prior_metadata_assert_current?.();assertCurrent();};
  const stage={before:Buffer.from(source.before),after:Buffer.from(source.after),metadata_entries:source.metadata_reference_updates,
   source_reference_updates:source.metadata_reference_updates,individual_decisions:0,assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false};
  assertPrior();return {...prior,canonical_after:Buffer.from(source.after),bound:currentBound,checker_reference_stage:stage,
   assertCurrent:assertPrior,prior_metadata_assert_current:assertPrior};
 };
 assertCurrent();return {line:source.line,before:Buffer.from(source.before),after:Buffer.from(source.after),applied,
  metadata_entries:source.metadata_reference_updates,bound:structuredClone([...bound.values()]),assertCurrent,wrapPrepared,
  canonical_frame_admission_granted:false,current_native_packed_or_floor_or_g11_credit:false};
}
