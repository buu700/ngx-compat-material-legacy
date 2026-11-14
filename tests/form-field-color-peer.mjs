/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Main-floor source probe only; this is not packed or browser evidence.
import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const root=process.cwd(),require=createRequire(root+'/package.json'),sass=require('sass');
if (require('@angular/material/package.json').version !== '22.1.7') throw Error('requires exact main floor');
const c=JSON.parse(readFileSync(root+'/fixtures/sass/form-field-state-contracts.json')),f=JSON.parse(readFileSync(root+'/tests/form_field_state_contract_fixture.json'));
const {formFieldStateExpectedCss}=await import(pathToFileURL(root+'/scripts/sass-form-field-state-contract.mjs'));
for(const [id,e] of Object.entries(c.cases)){
 const peer={...f.peers.main[id],sources:c.peer_inputs.main};const full=formFieldStateExpectedCss(id,e.original,peer);
 const suffix=full.slice(e.color.css.length+1+peer.css.length+2,full.length-(e.original.css.length-e.color.css.length));
 const blocks=suffix.split(/\n\n?(?=[^\n]+ \{)/);
 const calls=blocks.map(block=>{const lines=block.split('\n');lines.shift();lines.pop();return '@include mat.form-field-overrides(('+lines.map(line=>line.trim().replace(/^--mat-form-field-/, '').replace(/;$/, '')).join(',')+'));';}); const program="@use '@angular/material' as mat;\n"+e.scope+' { '+calls[0]+' }\n'+e.scope+' { .mat-mdc-form-field.mat-accent {'+calls[1]+'} .mat-mdc-form-field.mat-warn {'+calls[2]+'} }';
 const actual=sass.compileString(program,{loadPaths:[root+'/node_modules'],style:'expanded',logger:{warn(){},debug(){}}}).css;
 console.log(id,actual===suffix?'PASS':'FAIL',blocks.length);if(actual!==suffix){let i=0;while(actual[i]===suffix[i])i++;console.log(JSON.stringify({actual:actual.slice(i-40,i+40),expected:suffix.slice(i-40,i+40)}));process.exitCode=1}
}
