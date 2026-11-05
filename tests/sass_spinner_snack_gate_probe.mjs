/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual inventory dispatcher, modeled capsules, retained source observations, no compiler. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createSpinnerSnackGateContext,SPINNER_SNACK_DEFAULT_CASES} from '../scripts/sass-spinner-snack-gate-integration.mjs';
import {compareInventory,apiDriftNegative,apiCaseIds} from '../scripts/sass-api-inventory.mjs';
const root=new URL('..',import.meta.url),input=JSON.parse(readFileSync(0,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const context=createSpinnerSnackGateContext({root:root.pathname});assert.equal(context.line,input.line);
const oracle=JSON.parse(readFileSync(new URL('compatibility/rc/oracles/material-16.2.14-sass-api.json',root))),candidate=structuredClone(oracle.members),css={};
for(const[name,entry]of Object.entries(oracle.members.mixins))if(entry.invocation.invocable)css[name]={css:'',sha256:entry.invocation.css_sha256};
for(const body of input.bodies.filter(b=>b.case_id.startsWith('mixin-css/'))){const actual=body.actual_measurement??body.actual;css[body.case_id.slice(10)]={...structuredClone(body),css:actual.css,sha256:actual.css_sha256,actual_measurement:structuredClone(actual)};}
const compare=value=>compareInventory(oracle,candidate,value,{spinnerSnackContext:context}),baseline=compare(css),ids=apiCaseIds(oracle),notInvoked=ids.filter(id=>id.startsWith('mixin-css/')&&!oracle.members.mixins[id.slice(10)].invocation.invocable);
assert.equal(ids.length,651);assert.deepEqual(baseline.map(r=>r.case_id),ids);assert.deepEqual(baseline.filter(r=>r.result!=='pass').map(r=>r.case_id),notInvoked);
const controls=['actual all651 case IDs preserved','eight selected current capsules pass; only original not-invoked cases fail'];
for(const name of ['all-component-colors','all-component-themes','all-component-typographies'])for(const field of ['css','sha256']){
 const changed=structuredClone(css);changed[name][field]=field==='css'?changed[name].css+'\n.foreign { color: red; }\n':'0'.repeat(64);
 const failures=compare(changed).filter(r=>r.result!=='pass').map(r=>r.case_id);assert.deepEqual(failures.sort(),[...notInvoked,'mixin-css/'+name].sort());controls.push('independent aggregate outer '+name+'/'+field);
}
const absent=compareInventory(oracle,candidate,css),missing=absent.filter(r=>r.result!=='pass'&&!notInvoked.includes(r.case_id)).map(r=>r.case_id).sort();
assert.deepEqual(missing,[...SPINNER_SNACK_DEFAULT_CASES,...['colors','themes','typographies'].map(kind=>'mixin-css/all-component-'+kind)].sort());controls.push('exact eight reject absent private context');
const drift=apiDriftNegative(oracle,candidate,css,{spinnerSnackContext:context});assert.equal(drift.detected,true);assert.ok(drift.mutated.includes('mixin-css/all-component-colors'));assert.ok(drift.newly_failed.includes('mixin-css/all-component-colors'));controls.push('actual apiDriftNegative detects first aggregate outer digest');
console.log(JSON.stringify({line:input.line,controls,api_case_ids:ids.length,api_module_sha256:hash(readFileSync(new URL('scripts/sass-api-inventory.mjs',root))),source_only:true,actual_compiles:0,actual_packed_assertions:0}));
