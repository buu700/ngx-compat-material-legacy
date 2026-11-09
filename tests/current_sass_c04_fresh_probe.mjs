/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Fresh current compiler scope and physical source mutation controls. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {measureCurrentSassInspectionScope,assertCurrentSassInspectionScopeSuccessor} from '../scripts/current-sass-inspection-scope.mjs';

const root=process.argv[2];
assert.ok(root.includes('ngx-current-sass-source-test-'));
const result=measureCurrentSassInspectionScope({root});
assert.equal(result.result,'pass');
assert.equal(result.owned_scss_population.length,409);
assert.equal(result.boundaries.length,result.line==='main'?10:9);
assert.equal(result.public_override_mixins.length,21);
assert.equal(result.compile_calls,2);
assert.equal(result.current_source.source_modules.length,result.line==='main'?7:6);
if(result.line==='main')assert.deepEqual(result.public_companion_mixins,['strong-focus-indicators']);
const historical=JSON.parse(gunzipSync(readFileSync(join(root,'compatibility/rc/upstream-sass-inspection-current-scope.json.gz')))).actual;
const comparison=assertCurrentSassInspectionScopeSuccessor({root,historical,current:result});
assert.equal(comparison.current_boundaries,result.boundaries.length);
assert.equal(result.boundaries.filter(row=>row.path==='projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss').length,1);

for(const [relative,addition] of [
 ['projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss','\n// changed bridge afterimage\n'],
 ['projects/ngx-material-legacy/styles/progress-spinner/_progress-spinner-theme.scss',"\n@use '@angular/material/private' as foreign;\n"],
 ['projects/ngx-material-legacy/styles/core/focus-indicators/_focus-indicators.scss',"\n@include mat.unowned-overrides(());\n"],
]){
 const file=join(root,relative),original=readFileSync(file);
 try{writeFileSync(file,Buffer.concat([original,Buffer.from(addition)]));
  assert.throws(()=>measureCurrentSassInspectionScope({root}));
 }finally{writeFileSync(file,original);}
}
console.log(JSON.stringify({line:result.line,rows:409,boundaries:result.boundaries.length,mixins:21,companion_mixins:result.public_companion_mixins??[],compile_calls:2,actual_measurement_compared_to_model:true,physical_mutants_rejected:3}));
