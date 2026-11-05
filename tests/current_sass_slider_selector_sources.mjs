/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Independent test union. Immutable reports/proofs remain historical data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {spinnerSnackC04Source} from '../scripts/sass-spinner-snack-c04-source.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const REPORTS={
 'selector-density':['a14eb5cd3a75a1a8ce6de86c6b8988f55112c33766813a259174a73b4d037df1',165835,619],
 'slider-m3-repairs':['2aed7df6f65661ad75484d3ab0af7cc8d2b444c2b597d75dbbbb006965165ce7',406098,638],
};
const SHARED={path:'compatibility/rc/21x-c04-inspection-compatibility-source-review.json',sha256:'852cf937178ada91b0c604d349cf214cd810266af6118122c19e0dd534c55118',bytes:135386};
const HELPER={"path":"scripts/current-sass-slider-selector-reports.mjs","sha256":"aabc3425e12c038aa483730bf13abf23962693b465ab87e8cefdae35036e36a3","bytes":9342};
const union=refs=>[...new Map(refs.map(ref=>[ref.path,ref])).values()].sort((a,b)=>a.path.localeCompare(b.path));
/** Actual tool owner independently qualifies the exact archived reference list. */
export function currentSliderSelectorTestBindings({kind,root=process.cwd(),read=path=>readFileSync(join(root,path))}){
 assert.ok(Object.hasOwn(REPORTS,kind));
 const pinned=ref=>{const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);return raw;};
 const reports=Object.fromEntries(Object.entries(REPORTS).map(([family,[sha256,bytes]])=>[family,{path:'compatibility/rc/21x-c04-'+family+'-source-review.json',sha256,bytes}]));
 const historical=JSON.parse(pinned(reports[kind]));assert.equal(historical.current_source_bindings.length,REPORTS[kind][2]);
 for(const ref of [HELPER,SHARED,...Object.values(reports)])pinned(ref);
 const owner=spinnerSnackC04Source({root,read});
 const expected=union([...owner.bound,...historical.current_source_bindings.map(ref=>owner.qualify(ref)),HELPER,SHARED,...Object.values(reports)]);
 owner.assertCurrent();return {historical,expected,owner};
}
export function assertCurrentSliderSelectorTestSources({kind,scope,root=process.cwd(),read=path=>readFileSync(join(root,path))}){
 const {historical,expected,owner}=currentSliderSelectorTestBindings({kind,root,read});
 assert.deepEqual(scope.historical_report,historical);
 assert.deepEqual(union(scope.bound),expected);assert.equal(scope.bound.length,expected.length);
 assert.deepEqual(scope.report.current_source_bindings,expected);
 assert.equal(scope.report.public_override_boundaries,9);assert.equal(scope.report.historical_public_override_boundaries,4);
 scope.assertCurrent();owner.assertCurrent();
 return {historical_source_bindings:REPORTS[kind][2],expected_source_bindings:expected.length,current_source_bindings_match_exact_successor:true,
  historical_public_override_boundaries:4,public_override_boundaries:9};
}
export function assertCurrentSliderSelectorCanonicalBindings({kind,bound,body,root=process.cwd(),read=path=>readFileSync(join(root,path))}){
 const {expected,owner}=currentSliderSelectorTestBindings({kind,root,read}),prefix='compatibility/rc/21x-c04-'+kind+'-';
 const reviewPath=prefix+'individual-review.json',review=read(reviewPath),handlerPath='scripts/upstream-'+kind+'-admission.cjs',handler=read(handlerPath);
 assert.deepEqual(JSON.parse(review),body);
 const all=union([...expected,{path:reviewPath,sha256:hash(review)},body.source_qualification,body.source_review,
  {path:handlerPath,sha256:hash(handler),bytes:handler.length},...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))]);
 assert.deepEqual(union(bound),all);assert.equal(bound.length,all.length);owner.assertCurrent();
 return {historical_canonical_bound_members:644,expected_canonical_bound_members:all.length,current_canonical_bound_members_match_exact_successor:true};
}
