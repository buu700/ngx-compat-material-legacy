/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Main-floor source probe only; this is not packed or browser evidence.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),require=createRequire(root+'/package.json'),sass=require('sass');
if (require('@angular/material/package.json').version !== '22.1.7') throw Error('requires exact main floor');
const c=JSON.parse(readFileSync(root+'/fixtures/sass/form-field-state-contracts.json'));
const o=JSON.parse(readFileSync(root+'/compatibility/rc/oracles/material-16.2.14-sass-api.json'));
const a=JSON.parse(readFileSync(root+'/fixtures/sass/mixin-argument-contracts.json'));
const f=JSON.parse(readFileSync(root+'/tests/form_field_state_contract_fixture.json'));
const {formFieldStateExpectedCss}=await import(pathToFileURL(root+'/scripts/sass-form-field-state-contract.mjs'));
for(const [id,e] of Object.entries(c.cases)) {
 const setup=e.kind==='default'?o.standard_theme:a.setup;
 const program="@use '__entry__' as m;\n"+setup+'\n'+e.call+'\n';
 const actual=sass.compileString(program.replace("'__entry__'",JSON.stringify(pathToFileURL(root+'/projects/ngx-material-legacy/_index.scss').href)),{loadPaths:[root+'/node_modules'],style:'expanded',logger:{warn(){},debug(){}}}).css;
 const peer={...f.peers.main[id],sources:c.peer_inputs.main};
 const expected=formFieldStateExpectedCss(id,e.original,peer);
 console.log(id,actual===expected?'PASS':'FAIL',actual.length,expected?.length);
 if(actual!==expected){let i=0;while(actual[i]===expected[i])i++;console.log(JSON.stringify({i,actual:actual.slice(i-30,i+40),expected:expected.slice(i-30,i+40)}));}
 if(actual!==expected) process.exitCode=1;
}
