/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Seven individual public dependency decisions; canonical writes have one owner. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {materialRemainingCallerSource} from './material-remaining-caller-contracts.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const pins={
  "main": {
    "compatibility/rc/material-remaining-caller-source-verification.json": "50c634866e22e850892a6d8a5b2b86bded00e877168919f2755f4b938ea3d80e",
    "compatibility/rc/material-remaining-caller-type-verification.json": "c492f57749bc5c991266b2809d7b4698fec4cf175b8d5338c71c4877e6aa04aa",
    "compatibility/rc/material-remaining-caller-harness-verification.json": "7a25750b19f0e634844f75b82f07c4635818e0d6402ff6563845bc34db9e30cb",
    "compatibility/rc/material-remaining-caller-input-verification.json": "db7e4e806238850c6d39adb41329b7eb09384141f442ef1de6150375b4200392",
    "compatibility/rc/input-public-parent-source-proof.json": "d3c8211ecbe5e545a888dabe88da46ec2210c252d743070c7930fffa0b26892c",
    "compatibility/rc/api/input-construction-consumer-decision.json": "040a15b9c0b1b6c60c0350f6590b35ff225c068538dd0145a1197c1e25e0eea4"
  },
  "21.x": {
    "compatibility/rc/material-remaining-caller-source-verification.json": "7a87cfd4bba7c8796f5d925a8b66e5a76c22cd37a643fe48816e2e433ae53c57",
    "compatibility/rc/material-remaining-caller-type-verification.json": "a765eee8fecee950f2d32f2cd90653a1bae086e3b349d9fcf6a0fd61452b89cf",
    "compatibility/rc/material-remaining-caller-harness-verification.json": "7a25750b19f0e634844f75b82f07c4635818e0d6402ff6563845bc34db9e30cb",
    "compatibility/rc/material-remaining-caller-input-verification.json": "db7e4e806238850c6d39adb41329b7eb09384141f442ef1de6150375b4200392",
    "compatibility/rc/input-public-parent-source-proof.json": "dc2aafa4ea36ccd63b2b65ad2154e04601f357f8a17f835709c5103a09b4b45a",
    "compatibility/rc/api/input-construction-consumer-decision.json": "040a15b9c0b1b6c60c0350f6590b35ff225c068538dd0145a1197c1e25e0eea4"
  }
};
export const MATERIAL_REMAINING_REVIEW='compatibility/f10/authored-use-reviews/material-remaining-callers.json';
const reasons=new Map([
 ['legacy-input/input.ts:MatInput','The existing owned directive extends the exact public MatInput constructor. Its three consumed inherited extension points have unmarked accessible declarations at both minima;the readonly placeholder read is independently public through MatFormFieldControl<any> and Angular input metadata without deleting the implementation docs-private annotation. Actual tagged/current placeholder promotion and native inline-select receiver protocols match. The approved explicit zero-argument Angular constructor remains a finite intentional API difference;its historical ten-argument signature is not claimed equivalent. Earlier real Angular22 node,forms,field and lifetime execution is retained within that epoch;actual21 node execution is unqualified.'],
 ['legacy-input/public-api.ts:MAT_INPUT_VALUE_ACCESSOR','The finite historical MAT_LEGACY_INPUT_VALUE_ACCESSOR export is already an alias of the shared public MAT_INPUT_VALUE_ACCESSOR in the untouched16 package. Both genuine current SDKs preserve exact object identity and InjectionToken identity through the owned source entry. No distinct historical token is collapsed or invented;this does not authorize aliasing unrelated legacy form-field or control tokens.'],
 ['legacy-list/list-module.ts:MatDividerModule','The unchanged legacy NgModule exports the exact stable public MatDividerModule imported from the public divider namespace. The checker-bound occurrence is the exports array and the complete91-source strict program retains its public Type contract. This is a finite upstream module forwarding role with no owned divider implementation or modern export enumeration. Packed NgModule scope and actual DOM/style coexistence remain independent requirements.'],
 ['legacy-list/testing/list-harness-base.ts:DividerHarnessFilters','The real public filter type remains the argument domain of the divider branch and its overloads. The full actual-SDK program preserves positive selector queries and rejects invalid selector values. A real public divider predicate applies a selected selector and omits unrelated dividers in actual generic list algorithms. The generic item and TestElement/LocatorFactory are explicit fixtures;concrete list item DOM behavior is not inferred.'],
 ['legacy-list/testing/list-harness-base.ts:MatDividerHarness','The actual public class is the predicate constructor and instanceof discriminator in the unchanged generic list harness. Tagged/current protocols preserve ordered mixed rows,empty/edge/adjacent divider groups,subheader grouping and selector filtering with genuine divider instances. Six emitted control/grouping faults are rejected by the combined harness comparison. No private harness fields,substitute divider class or native geometry assumption is used.'],
 ['legacy-form-field/testing/form-field-harness.ts:MatDatepickerInputHarness','The unchanged composed legacy form-field harness returns the genuine public datepicker class with its historical selector. Explicit constructor and predicate queries,value/selector misses,date-range priority and absence match tagged16. Five disabled cases still read the native property,including disabled=false and ARIA-only state;the general input harness attribute-policy change does not apply to this actual class. Complete strict source-entry types preserve nullable query results.'],
 ['legacy-form-field/testing/form-field-harness.ts:MatDateRangeInputHarness','The unchanged composed legacy form-field harness returns the genuine public range class and actual start/end harnesses. Tagged/current selectors,constructor/predicate queries,all four disabled combinations,combined values with empty endpoints,separator,required and calendar-open flags match. Both real child harnesses read native disabled properties. Public query types and nullable results retain positive/negative strict controls;calendar browser geometry and native input binding remain separate.'],
]);
export function inspectMaterialRemainingCallerReview({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const source=materialRemainingCallerSource({root,read}),line=source.prior.line,evidence=new Map();
 function checked(ref){const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'changed remaining caller evidence '+ref.path);evidence.set(ref.path,ref);return JSON.parse(bytes);}
 const packets=Object.fromEntries(Object.entries(pins[line]).map(([path,sha256])=>[path,checked({path,sha256})]));
 for(const ref of packets['compatibility/rc/material-remaining-caller-source-verification.json'].programs)checkedProgram(ref);
 const typePacket=packets['compatibility/rc/material-remaining-caller-type-verification.json'],types=checked(typePacket.report);
 assert.equal(types.line,line);assert.equal(types.owned_source_files,91);assert.equal(types.diagnostics,0);assert.equal(types.negative_type_controls,10);assert.deepEqual(types.source,source.ref);
 checked(typePacket.SDK_context_verification);for(const ref of typePacket.programs)checkedProgram(ref);
 function checkedProgram(ref){assert.equal(hash(read(ref.path)),ref.sha256,'changed executed caller program '+ref.path);evidence.set(ref.path,ref);}
 for(const name of ['harness','input']){
  const packet=packets['compatibility/rc/material-remaining-caller-'+name+'-verification.json'];
  checkedProgram(packet.producer);checkedProgram(packet.wrapper);const oracle=checked(packet.tagged_observations),sdk=checked(packet.SDK);
  for(const subject of sdk.subjects)for(const member of subject.additions){const raw=read(member.path);assert.equal(hash(raw),member.stored_sha256);const text=gunzipSync(raw);assert.equal(hash(text),member.sha256);assert.equal(text.length,member.bytes);}
  const current=checked(packet.reports[line==='main'?'main':'21']),original=checked(packet.reports.tagged16);
  assert.equal(current.subject,line);assert.deepEqual(current.source,source.ref);assert.deepEqual(current.SDK,packet.SDK);
  assert.deepEqual(current.observations,oracle.observations);assert.deepEqual(original.observations,oracle.observations);
  assert.equal(current.observations.length,name==='harness'?30:14);assert.equal(current.behavior_faults.length,name==='harness'?6:4);
  assert.ok(current.behavior_faults.every(fault=>fault.rejected===true));assert.equal(current.canonical_ledgers_unchanged,true);assert.equal(current.product_changes,0);assert.equal(current.source_closures,0);
  if(name==='input'){const cyph=checked(packet.cyph);assert.equal(cyph.consumer_modified,false);assert.deepEqual(cyph.direct_MatInput_or_MatLegacyInput_constructor_or_subclass_hits,[]);assert.equal(current.actual_Angular_node,false);}
 }
 const oldInput=packets['compatibility/rc/input-public-parent-source-proof.json'];
 const inputSource=oldInput.source_caps.find(member=>member.path==='projects/ngx-material-legacy/legacy-input/input.ts');assert.ok(inputSource);assert.equal(hash(read(inputSource.path)),inputSource.sha256);
 assert.equal(oldInput.source_diagnostic.runtime_peer,'22.1.7');assert.equal(oldInput.actual_Angular21_runtime_or_compiler,false);
 evidence.set('scripts/material-remaining-caller-reviews.mjs',{path:'scripts/material-remaining-caller-reviews.mjs',sha256:hash(read('scripts/material-remaining-caller-reviews.mjs'))});
 const reviews=source.prior.selected.map(item=>{
  const row=item.original_row,fact=source.facts.find(fact=>fact.file===row.file&&fact.module===row.module&&fact.symbol===row.symbol);assert.ok(fact);
  const decision=reasons.get(row.file+':'+row.symbol);assert.ok(decision);
  if(row.symbol==='MatDividerModule'){assert.equal(fact.occurrences.length,1);assert.ok(fact.occurrences[0].expression.includes('MatDividerModule'));}
  return {file:row.file,module:row.module,symbol:row.symbol,candidate_source_sha256:fact.candidate_source_sha256,
   conclusion:'stable-public-peer',reviewer:'Codex primary implementer;individual remaining Material dependency review',
   decision:decision+' Only this finite dependency/type/consumed public protocol boundary is closed. Actual compiled leaf factories,HTML/CSS rendering,SSR,native geometry,AOT,packed consumers and complete Node/compiler/peer/RxJS floors remain required. All SHA and packed CVA obligations remain separate;G11 is not passed.',
   original_obligation:{ledger:item.ledger,row},current_source_role:fact,independent_evidence:[...evidence.values()],actual_native_packed_AOT_or_full_floor_qualified:false};
 });
 assert.equal(reviews.length,7);assert.equal(new Set(reviews.map(row=>JSON.stringify([row.file,row.module,row.symbol]))).size,7);
 return {line,source,rows:source.prior.selected,review:{schema_version:1,line,status:'reviewed',criteria:'Seven individual original Material caller roles against authenticated unchanged91-source graph,genuine minimum public SDKs,strict types,tagged harness/input protocols and explicit prior Angular22-only runtime limits.',reviews,source_closures_prepared:7,canonical_writes_performed:0,actual_native_packed_AOT_or_full_floor_qualified:false,g11_claim:'not-passed'}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){assert.equal(process.argv[2],'--prepare');const q=inspectMaterialRemainingCallerReview();writeFileSync(MATERIAL_REMAINING_REVIEW,JSON.stringify(q.review,null,2)+'\n');console.log(JSON.stringify({line:q.line,prepared:7,canonical_writes:0}));}
