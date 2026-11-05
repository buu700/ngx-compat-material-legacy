/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual compiler visibility controls, plus bounded source-reader negatives. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {inspectOwnedMaterialBoundary} from '../scripts/measure-sass-inspection-scope.mjs';
import {measureCurrentSassInspectionScope,assertCurrentSassInspectionScopeSuccessor} from '../scripts/current-sass-inspection-scope.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const historicalPath='compatibility/rc/upstream-sass-inspection-current-scope.json.gz',historicalBytes=read(historicalPath);
const historical=JSON.parse(gunzipSync(historicalBytes)).actual;
const actual=measureCurrentSassInspectionScope({root}),positive=['actual-current-compiler-facade-and-public-peer'];
const comparison=assertCurrentSassInspectionScopeSuccessor({root,historical,current:actual});
positive.push('exact-current-scope-successor-of-authenticated-historical-receipt');
assert.equal(actual.result,'pass');assert.equal(actual.historical_physical_constructor_executed,false);
assert.equal(actual.css_or_artifact_admission_granted,false);assert.equal(actual.g11_claim,'not-passed');
assert.equal(actual.owned_scss_population.length,409);assert.equal(actual.candidate.functions.length,25);
assert.equal(actual.public_override_mixins.length,20);assert.equal(actual.boundaries.length,8);
assert.equal(actual.compile_calls,2);assert.equal(historical.entry_override_used,false);
assert.equal(historical.owned_scss_population.length,409);assert.equal(historical.boundaries.length,4);
assert.equal(historical.public_override_mixins.length,16);assert.equal(historical.candidate.functions.length,25);
assert.ok(actual.current.loaded_sources.some(row=>row.root===0&&row.path==='core/theming/_inspection.scss'));
assert.ok(actual.candidate.loaded_sources.some(row=>row.root===1&&row.path==='core/theming/_inspection.scss'));
for(const boundary of actual.boundaries){
 assert.deepEqual(inspectOwnedMaterialBoundary(boundary.path,read(boundary.path)),boundary);
 positive.push('actual-owned-boundary/'+boundary.path);
}
const rejected=[];
const first=actual.boundaries[0],source=read(first.path).toString();
for(const [id,text]of [
 ['wildcard-peer-forward',"@forward '@angular/material';"],
 ['private-peer-subpath',source.replace("'@angular/material'","'@angular/material/core/theming/inspection'")],
 ['unreviewed-alias',source.replace('as mat;','as peer;')],
 ['direct-inspection-call',source+'\n@debug mat.get-theme-density(());'],
 ['private-inspection-definition','@function private-get-theme-color($theme){@return null;}'],
 ['compatibility-only-peer-mixin',source+'\n@include mat.m2-foo-overrides(());'],
 ['dynamic-peer-lookup',source+'\n$fn: meta.get-function("x", $module: "mat");'],
 ['extra-peer-import',source+"\n@use '@angular/material' as extra;"],
]){assert.throws(()=>inspectOwnedMaterialBoundary(first.path,Buffer.from(text)),undefined,id);rejected.push(id);}
const temporary=mkdtempSync(join(tmpdir(),'legacy-sass-inspection-'));
const entry=join(temporary,'_index.scss'),original=pathToFileURL(join(root,'projects/ngx-material-legacy/_index.scss')).href;
try{
 for(const [id,extra]of [
  ['compiler-public-inspection-forward',"@forward '@angular/material' show get-theme-color;"],
  ['compiler-private-inspection-forward',"@forward '@angular/material' as private-* show private-get-theme-density;"],
 ]){
  writeFileSync(entry,`@forward '${original}';\n${extra}\n`);
  assert.throws(()=>measureCurrentSassInspectionScope({root,entryOverride:pathToFileURL(entry).href}),
   /entryOverride is not supported/,id);rejected.push('unsupported-entry/'+id);
 }
}finally{try{unlinkSync(entry);}catch(error){if(error.code!=='ENOENT')throw error;}rmdirSync(temporary);}
for(const [id,name]of [['public-inspection-export','get-theme-color'],['private-inspection-export','private-get-theme-density']]){
 const current=structuredClone(actual);current.candidate.functions.push(name);current.candidate.functions.sort();
 assert.throws(()=>assertCurrentSassInspectionScopeSuccessor({root,historical,current}),
  /current inspection differs beyond/,id);rejected.push('compiler-observation/'+id);
}
assert.ok(read(historicalPath).equals(historicalBytes),'historical receipt changed');
const summary={line:actual.line,result:'pass',positive,rejected,owned_scss_members:409,historical_functions:25,
 public_override_mixins:20,direct_peer_boundaries:8,compiler_observation_mutants_rejected:2,
 unsupported_entry_overrides_rejected:2,compiler_mutants_executed:0,actual_compiler_calls:actual.compile_calls,
 historical_receipt_sha256:hash(historicalBytes),historical_receipt_unchanged:true,
 historical_owned_scss_members:409,historical_peer_boundaries:4,historical_public_override_mixins:16,comparison,
 source_reader_corruptions_rejected:8,peer_inspection_loaded_through_public_index:true,
 old_physical_constructor_executed:false,css_or_artifact_admission_granted:false,g11_claim:'not-passed',
 full_sass_or_native_or_floor_or_G11_qualified:false,producer_sha256:hash(read('tests/sass_inspection_scope_probe.mjs'))};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify({summary,actual},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(summary));
