/** Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE. */
/** Actual JS context/inventory with modeled capsules; no Sass compile. */
import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{createOrdinaryControlGateContext,ordinaryControlGateDescriptor,ordinaryControlGateDirectMatch,ordinaryControlGateDefaultMatch,measureOrdinaryControlDefaultReferences,attachOrdinaryControlDefaultReferences,ORDINARY_CONTROL_DEFAULT_CASES}from'../scripts/sass-ordinary-control-gate.mjs';
import{compareInventory}from'../scripts/sass-api-inventory.mjs';
const input=JSON.parse(readFileSync(0,'utf8')),root=new URL('..',import.meta.url);let hook;
const context=createOrdinaryControlGateContext({root:input.root,read:path=>{if(hook){const run=hook;hook=null;run();}return readFileSync(input.root+'/'+path);}});
assert.equal(context.line,input.line);let positives=0,negatives=0;
const got=body=>({...body,css:body.actual.css,sha256:body.actual.css_sha256,actual_measurement:body.actual});
const match=body=>body.case_id.startsWith('mixin-css/')?ordinaryControlGateDefaultMatch({context,caseId:body.case_id,got:got(body)}):ordinaryControlGateDirectMatch({context,caseId:body.case_id,original:body.expected,actual:body.actual,identity:body.identity,descriptor:body.current_ordinary_controls,companion:body.current_companion??null});
assert.deepEqual(ordinaryControlGateDescriptor(context),input.bodies[0].current_ordinary_controls);for(const i of [1,7,13,22,26,28,31,44]){const body=input.bodies[i];assert.ok(match(body),body.case_id);positives++;}
for(const body of [input.bodies[1],input.bodies.at(-1)]){const bad=structuredClone(body);bad.actual.sources.pop();assert.equal(match(bad),false);negatives++;}
const body=structuredClone(input.bodies[1]);let getters=0;hook=()=>Object.defineProperty(body.identity,'catalog',{enumerable:true,get(){getters++;return 'wrong';}});assert.equal(match(body),false);assert.equal(getters,0);negatives++;
let compileCalls=0;assert.throws(()=>measureOrdinaryControlDefaultReferences({sass:{info:'foreign',compileString(){compileCalls++;throw Error('must not run');}},referenceRoot:input.root,referenceEntry:input.root+'/projects/ngx-material-legacy/_index.scss',identity:{}}));assert.equal(compileCalls,0);negatives++;
assert.throws(()=>attachOrdinaryControlDefaultReferences({context,css:{},references:{}}));negatives++;
const oracle=JSON.parse(readFileSync(new URL('compatibility/rc/oracles/material-16.2.14-sass-api.json',root))),css={};for(const[name,row]of Object.entries(oracle.members.mixins))if(row.invocation.invocable)css[name]={css:'',sha256:row.invocation.css_sha256};
for(const b of input.bodies.filter(b=>b.case_id.startsWith('mixin-css/')))css[b.case_id.slice(10)]=got(b);
const results=compareInventory(oracle,structuredClone(oracle.members),css,{ordinaryControlContext:context});for(const id of ORDINARY_CONTROL_DEFAULT_CASES)assert.equal(results.find(r=>r.case_id===id).result,'pass',id);
const absent=compareInventory(oracle,structuredClone(oracle.members),css);for(const id of ORDINARY_CONTROL_DEFAULT_CASES)assert.equal(absent.find(r=>r.case_id===id).result,'fail',id);negatives+=15;
for(const id of ORDINARY_CONTROL_DEFAULT_CASES){const row=results.find(r=>r.case_id===id);assert.ok(row.current_ordinary_controls);assert.equal(row.actual.css,row.actual_measurement.css);}
console.log(JSON.stringify({positives,negatives,getters,compiler_calls:compileCalls,ordinary_default_inventory_routes:15,api_case_ids:results.length,actual_reference_observer_compilation:false,actual_packed_runs:0}));
