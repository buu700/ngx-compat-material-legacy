/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact reviewed focus delta for live source ownership guards; no projection. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CHIP_FOCUS_SOURCE,readChipFocusRepairPrior,inspectChipFocusRepair} from './chip-focus-contract.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const inputPath='compatibility/rc/chip-focus-repair-inputs.json';
const pins={main:'40ef578cc1983d119effd4a99a0dfd2c877489c957be56ae081a961ccfb4dfe4','21.x':'3b34cbb44b4989236de3cf61b3ea882877957ad6002162cf9735fd15cb74d3ba'};
export function qualifyChipFocusSourceEpoch(members,read,{root=process.cwd()}={}){
 const actual=members.map(({path,sha256})=>({path,sha256:hash(read(path)),prior_sha256:sha256})),changed=actual.filter(m=>m.sha256!==m.prior_sha256);
 if(changed.length===0)return {members:actual.map(({prior_sha256,...m})=>m)};
 // The only production ownership change admitted here is the complete focus
 // method already reviewed independently. Input/spec/resource changes are not
 // an alternate way around these guards.
 assert.equal(changed.length,1,'unreviewed chip ownership delta');assert.equal(changed[0].path,CHIP_FOCUS_SOURCE);
 const bytes=read(inputPath),data=JSON.parse(bytes);assert.equal(hash(bytes),pins[data.line],'changed approved focus inputs');
 assert.equal(hash(read(data.current_raw_contract_source.path)),data.current_raw_contract_source.sha256,'changed raw focus inspector');
 const prior=readChipFocusRepairPrior({root,readMember:read}),old=prior.sources.find(m=>m.path===CHIP_FOCUS_SOURCE),current=data.current_members.find(m=>m.path===CHIP_FOCUS_SOURCE);
 assert.equal(changed[0].prior_sha256,old.sha256,'different historical focus subject');assert.equal(changed[0].sha256,current.sha256,'unreviewed current focus subject');
 for(const m of data.current_members.filter(m=>m.path!=='scripts/upstream-historical-behavior-evidence.mjs'))assert.equal(hash(read(m.path)),m.sha256,'unreviewed current focus/spec/matrix member '+m.path);
 const raw=inspectChipFocusRepair({root,readMember:read});assert.equal(raw.line,data.line);
 return {members:actual.map(({prior_sha256,...m})=>m),approved_focus_source_epoch:{kind:'reviewed-owned-focus-method-repair',inputs:{path:inputPath,sha256:pins[data.line]},prior_owner:{path:old.path,sha256:old.sha256},current_owner:current,current_raw_focus_contract:raw,all_product_members_read_raw:true,source_scope_only:true,actual_native_packed_or_floor_qualified:false}};
}
