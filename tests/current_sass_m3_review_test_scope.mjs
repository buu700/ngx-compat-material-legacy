/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Independent historical populations and exact current source unions for three reviews. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {spinnerSnackC04Source} from '../scripts/sass-spinner-snack-c04-source.mjs';
const REPORTS={
 'core-tokenization':['.json.gz','ba0ce00a87e99a2b75b9ce89314dd9874878ce86682daefaad864de2e1ef6c04',2290293,642,650],
 'foundation-m3-theme':['.json.gz','796997f473b80a8fb5d4f7e78e80091330041ece6a2246d72988985b30a0450a',1791640,641,651],
 'surface-m3-theme':['.json','676d90777a549f651819bd40e6e244b529912cb463cae8f5f958fcca0f78269b',1559335,634,641],
};
const hash=b=>createHash('sha256').update(b).digest('hex');
const union=refs=>{const m=new Map();for(const r of refs){const old=m.get(r.path);if(old)assert.deepEqual(old,r);else m.set(r.path,r);}return [...m.values()].sort((a,b)=>a.path.localeCompare(b.path));};
function inputs(kind,root,read){
 assert.ok(Object.hasOwn(REPORTS,kind));const [ext,sha256,bytes,count]=REPORTS[kind],path='compatibility/rc/21x-c04-'+kind+'-source-review'+ext,raw=read(path);assert.equal(hash(raw),sha256);assert.equal(raw.length,bytes);
 const historical=JSON.parse(ext.endsWith('.gz')?gunzipSync(raw):raw);assert.equal(historical.current_source_bindings.length,count);
 const helper='scripts/current-sass-m3-review-source.mjs',body=read(helper),extra=[{path,sha256,bytes},{path:helper,sha256:hash(body),bytes:body.length}];
 const owner=spinnerSnackC04Source({root,read}),expected=union([...owner.bound,...historical.current_source_bindings.map(r=>owner.qualify(r)),...extra]);return {historical,owner,expected,count};
}
export function assertCurrentM3ReviewTestSources({kind,scope,root=process.cwd(),read=path=>readFileSync(join(root,path))}){
 const {historical,owner,expected,count}=inputs(kind,root,read);assert.deepEqual(scope.historical_report,historical);assert.deepEqual(union(scope.bound),expected);assert.deepEqual(union(scope.report.current_source_bindings),expected);assert.equal(scope.report.current_source_bindings.length,expected.length);scope.assertCurrent();owner.assertCurrent();
 return {historical_source_bindings:count,expected_source_bindings:expected.length,current_source_bindings_match_exact_successor:true};
}
export function assertCurrentM3CanonicalTestSources({kind,scope,body,root=process.cwd(),read=path=>readFileSync(join(root,path))}){
 const {historical,owner,expected}=inputs(kind,root,read),prefix='compatibility/rc/21x-c04-'+kind+'-',review=prefix+(kind==='surface-m3-theme'?'individual-review.json':'canonical-review.json'),reviewRaw=read(review);assert.deepEqual(JSON.parse(reviewRaw),body);
 const packet=JSON.parse(read(prefix+'canonical-transition.json')),oldHandler=packet.source_members.find(r=>r.path==='scripts/upstream-'+kind+'-admission.cjs');assert.ok(oldHandler);
 const metadata=[{path:review,sha256:hash(reviewRaw),bytes:reviewRaw.length},body.source_qualification,body.source_review,oldHandler,...body.reviews.map(r=>{const raw=read(r.patch_file);assert.equal(hash(raw),r.diff_sha256);return {path:r.patch_file,sha256:r.diff_sha256,bytes:raw.length};})];
 if(kind==='core-tokenization')metadata.push(body.tree_density_boundary_assessment);
 // Strip compressed-report annotations: physical bindings use path/hash/length.
 const refs=metadata.map(({path,sha256,bytes})=>({path,sha256,bytes}));
 assert.equal(union([...historical.current_source_bindings,...refs]).length,REPORTS[kind][4]);
 const current=union([...expected,...refs.map(r=>owner.qualify(r))]);assert.deepEqual(union(scope.bound),current);scope.assertCurrent();owner.assertCurrent();
 return {historical_canonical_bound_members:REPORTS[kind][4],canonical_bound_members:current.length,canonical_bound_matches_exact_current_union:true};
}
