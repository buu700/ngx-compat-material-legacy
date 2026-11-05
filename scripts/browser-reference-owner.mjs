/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact terminal browser metadata stage; all earlier owner stages still run. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {browserOwnerSourceSubject,readBrowserOwnerMember} from './browser-owner-source.mjs';
import {prepareBrowserReferenceSourceMetadata,BROWSER_REFERENCE_LEDGER as LEDGER} from './browser-reference-proposal.mjs';
import {browserZoneSourceSuccessor} from './browser-zone-source-successor.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function browserReferenceOwnerContext({root,read=path=>readBrowserOwnerMember(root,path)}={}){
 const version=JSON.parse(readBrowserOwnerMember(root,'projects/ngx-material-legacy/package.json')).version;
 const line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const zone=browserZoneSourceSuccessor({root,read,line});
 const tools=browserOwnerSourceSubject({root,read});
 // Source qualification always sees the real physical ledger. The caller's
 // complete image is captured separately and is never projected if unknown.
 const sourceRead=path=>path===LEDGER?readBrowserOwnerMember(root,path):read(path);
 const source=prepareBrowserReferenceSourceMetadata({root,read:sourceRead});
 assert.equal(source.line,tools.line);assert.equal(hash(source.before),tools.packet.before_ledger.sha256);assert.equal(hash(source.after),tools.packet.after_ledger.sha256);
 const raw=read(LEDGER),current={path:LEDGER,sha256:hash(raw),bytes:raw.length},applied=raw.equals(source.after);
 assert.equal(source.line,line);
 const bound=new Map([...tools.bound,...source.bound,...zone.bound,current].map(ref=>[ref.path,{...ref}]));
 const assertCurrent=()=>{zone.assertCurrent();tools.assertCurrent();source.assertCurrent();for(const ref of bound.values()){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'late browser metadata input '+ref.path);assert.equal(value.length,ref.bytes);}zone.assertPhysical();};
 const wrapPrepared=prior=>{
  assertCurrent();assert.ok(prior.canonical_after.equals(source.before),'browser stage does not succeed exact checker after-image');
  const currentBound=new Map(prior.bound);for(const ref of bound.values())currentBound.set(ref.path,ref.sha256);
  const assertPrior=()=>{assertCurrent();prior.assertCurrent?.();prior.prior_metadata_assert_current?.();assertCurrent();};
  const stage={before:Buffer.from(source.before),after:Buffer.from(source.after),metadata_entries:source.metadata_reference_updates,selected_entries:source.selected_entries,source_reference_updates:source.metadata_reference_updates,individual_decisions:0,assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false};
  assertPrior();return {...prior,canonical_after:Buffer.from(source.after),bound:currentBound,browser_reference_stage:stage,assertCurrent:assertPrior,prior_metadata_assert_current:assertPrior};
 };
 assertCurrent();return {line:source.line,before:Buffer.from(source.before),after:Buffer.from(source.after),applied,metadata_entries:source.metadata_reference_updates,selected_entries:source.selected_entries,bound:structuredClone([...bound.values()]),assertCurrent,wrapPrepared,canonical_frame_admission_granted:false,current_native_packed_or_floor_or_g11_credit:false};
}
