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
import {createSpinnerSnackGateContext,SPINNER_SNACK_DEFAULT_CASES,spinnerSnackGateDescriptor,spinnerSnackGateDirectMatch,spinnerSnackGateAggregateMatch} from '../scripts/sass-spinner-snack-gate-integration.mjs';
import {compareInventory,apiDriftNegative,apiCaseIds} from '../scripts/sass-api-inventory.mjs';
const root=new URL('..',import.meta.url),input=JSON.parse(readFileSync(0,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const candidateRoot=input.candidate_root??root.pathname;
if(input.candidate_root)assert.ok(candidateRoot.includes('ngx-current-sass-source-test-'));
let hook;const providedRead=path=>{if(hook){const run=hook;hook=null;run();}return readFileSync(new URL(path,new URL('file://'+candidateRoot.replace(/\/$/,'')+'/')));};
const context=createSpinnerSnackGateContext({root:candidateRoot,read:providedRead});assert.equal(context.line,input.line);
if(input.focused_current_context){
 const controls=[];
 const matches=body=>body.comparison==='historical-spinner-snack-css-with-positioned-public-tokens'
  ?spinnerSnackGateDirectMatch({context,caseId:body.case_id,original:body.expected,actual:body.actual,identity:body.identity,descriptor:body.current_spinner_snack_bridge})
  :spinnerSnackGateAggregateMatch({context,caseId:body.case_id,original:body.expected??null,actual:body.actual??body.actual_measurement,companion:body.current_companion,descriptor:body.current_spinner_snack_bridge});
 assert.equal(input.bodies.length,24);
 for(const body of input.bodies){assert.ok(matches(body),body.case_id);controls.push('current candidate source positive '+body.case_id);}
 for(const body of [input.bodies[0],input.bodies[15],input.bodies[18]]){
  const copy=structuredClone(body);copy.current_spinner_snack_bridge.source_modules.pop();assert.equal(matches(copy),false);controls.push('missing current module rejects '+body.case_id);
 }
 const body=structuredClone(input.bodies[0]),args={context,caseId:body.case_id,original:body.expected,actual:body.actual,identity:body.identity,descriptor:body.current_spinner_snack_bridge};
 hook=()=>args.descriptor=structuredClone(args.descriptor);assert.equal(spinnerSnackGateDirectMatch(args),false);controls.push('live outer descriptor replacement rejects');
 const live=structuredClone(body);let getters=0;hook=()=>Object.defineProperty(live.identity,'catalog',{get(){getters++;return 'wrong';},enumerable:true});assert.equal(matches(live),false);assert.equal(getters,0);controls.push('live nested getter rejects without execution');
 assert.equal(spinnerSnackGateDirectMatch({...args,context:{line:input.line,assertCurrent(){}}}),false);controls.push('fake context rejects');
 console.log(JSON.stringify({line:input.line,controls,descriptor:spinnerSnackGateDescriptor(context),candidate_fixture_only:true,actual_compiles:0,actual_packed_assertions:0,broad_inventory_dispatch_executed:false}));
 process.exit(0);
}
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
