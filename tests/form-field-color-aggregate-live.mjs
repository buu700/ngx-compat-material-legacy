/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Main-floor source probe; packed and browser qualification is separate.
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const root=process.cwd(), require=createRequire(root+'/package.json'), sass=require('sass');
if (require('@angular/material/package.json').version !== '22.1.7') throw Error('requires exact main floor');
const json=p=>JSON.parse(readFileSync(root+'/'+p));
const c=json('fixtures/sass/form-field-state-contracts.json'),d=json('tests/sass_default_aggregate_fixture.json'),dc=json('fixtures/sass/default-aggregate-contracts.json'),a=json('tests/sass_aggregate_color_theme_fixture.json'),ac=json('fixtures/sass/aggregate-color-theme-contracts.json'),argumentsCatalog=json('fixtures/sass/mixin-argument-contracts.json');
const {FORM_FIELD_STATE_AGGREGATE_CASES,insertFormFieldStateInAggregate}=await import(pathToFileURL(root+'/scripts/sass-form-field-state-contract.mjs'));
const {defaultAggregateExpectedCss}=await import(pathToFileURL(root+'/scripts/sass-default-aggregate-contract.mjs'));
const {aggregateColorThemeExpectedCss}=await import(pathToFileURL(root+'/scripts/sass-aggregate-color-theme-contract.mjs'));
const {insertSpinnerSnackIntoAggregateModel}=await import(pathToFileURL(root+'/scripts/sass-spinner-snack-aggregate-contract.mjs'));
const {insertOrdinaryCheckboxButtonIntoAggregateModel}=await import(pathToFileURL(root+'/scripts/sass-ordinary-aggregate-contract.mjs'));
const {insertCardIntoAggregateModel}=await import(pathToFileURL(root+'/scripts/current-sass-card-aggregate-contract.mjs'));
for(const [id,field] of Object.entries(FORM_FIELD_STATE_AGGREGATE_CASES)){
 const line='main',e=c.cases[field],isDefault=id.startsWith('mixin-css/'), old=isDefault?d.measurements[id+'-'+line].css:a.candidate_inputs[id+'-'+line];
 const stored=isDefault?d.peers[dc.cases[id].profile+'-'+line]:a.peers[ac.cases[id].peer_profile+'-'+line]; const peer=isDefault?{...stored,sources:dc.peer_inputs[line].sources}:stored;
 const addition='\n'+e.peers[line].css+'\n'; if(old.split(addition).length!==2) throw Error('old insertion missing');
 const base=isDefault?defaultAggregateExpectedCss(id,peer):aggregateColorThemeExpectedCss(id,{css:a.originals[id],css_sha256:createHash('sha256').update(a.originals[id]).digest('hex'),css_bytes:Buffer.byteLength(a.originals[id])},peer);
 const sp=insertSpinnerSnackIntoAggregateModel({caseId:id,css:base});const ord=insertOrdinaryCheckboxButtonIntoAggregateModel({caseId:id,css:sp});const expected=insertCardIntoAggregateModel({caseId:id,css:ord});
 const setup=isDefault?dc.default_theme:argumentsCatalog.setup, call=isDefault?dc.cases[id].call:argumentsCatalog.cases.find(p=>p.case_id===id).call;
 const program="@use '__entry__' as m;\n"+setup+'\n'+call+'\n';
 const actual=sass.compileString(program.replace("'__entry__'",JSON.stringify(pathToFileURL(root+'/projects/ngx-material-legacy/_index.scss').href)),{loadPaths:[root+'/node_modules'],style:'expanded',logger:{warn(){},debug(){}}}).css;
 if (expected && (expected.replace('--mat-form-field-filled-caret-color:', 'color: red;\n  --mat-form-field-filled-caret-color:') === actual || expected.replace('--mat-card-elevated-container-shape:', '--wrong-card-shape:') === actual)) throw Error('mutation accepted');
 console.log(id,actual===expected?'PASS':'FAIL',actual.length,expected?.length);if(actual!==expected){let i=0;while(actual[i]===expected?.[i]&&i<actual.length)i++;console.log(JSON.stringify({i,actual:actual.slice(i-40,i+100),expected:expected?.slice(i-40,i+100)}));process.exitCode=1}
}
