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
import {measureCurrentSassInspectionScope} from '../scripts/current-sass-inspection-scope.mjs';

const root=process.argv[2];
assert.ok(root.includes('ngx-current-sass-source-test-'));
const result=measureCurrentSassInspectionScope({root});
assert.equal(result.result,'pass');
assert.equal(result.owned_scss_population.length,409);
assert.equal(result.boundaries.length,9);
assert.equal(result.public_override_mixins.length,21);
assert.equal(result.compile_calls,2);
assert.equal(result.current_source.source_modules.length,6);
assert.equal(result.boundaries.filter(row=>row.path==='projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss').length,1);

for(const [relative,addition] of [
 ['projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss','\n// changed bridge afterimage\n'],
 ['projects/ngx-material-legacy/styles/progress-spinner/_progress-spinner-theme.scss',"\n@use '@angular/material/private' as foreign;\n"],
]){
 const file=join(root,relative),original=readFileSync(file);
 try{writeFileSync(file,Buffer.concat([original,Buffer.from(addition)]));
  assert.throws(()=>measureCurrentSassInspectionScope({root}));
 }finally{writeFileSync(file,original);}
}
console.log(JSON.stringify({line:result.line,rows:409,boundaries:9,mixins:21,compile_calls:2,physical_mutants_rejected:2}));
