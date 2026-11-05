/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Independent JS replay of Python-built pure-model controls; no compilation. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ORDINARY_AGGREGATE_CASES,insertOrdinaryCheckboxButtonIntoAggregateModel,ordinaryAggregateResultsMatch} from '../scripts/sass-ordinary-aggregate-contract.mjs';
const input=JSON.parse(readFileSync(0,'utf8')),controls=[];
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const vector of input.expected){
 const result=insertOrdinaryCheckboxButtonIntoAggregateModel({caseId:vector.caseId,css:vector.css});
 if(vector.sha256===null)assert.equal(result,null,vector.label);
 else{assert.equal(typeof result,'string',vector.label);assert.equal(hash(result),vector.sha256,vector.label);assert.equal(Buffer.byteLength(result),vector.bytes,vector.label);}
 controls.push(vector.label);
}
for(const vector of input.matches){assert.equal(ordinaryAggregateResultsMatch(vector.args),vector.accept,vector.label);controls.push(vector.label);}
let getterCalls=0;
const trap={caseId:ORDINARY_AGGREGATE_CASES[0]};Object.defineProperty(trap,'css',{enumerable:true,get(){getterCalls++;return '';}});
assert.equal(insertOrdinaryCheckboxButtonIntoAggregateModel(trap),null);controls.push('required CSS getter rejected without invocation');
const inherited=Object.create({caseId:ORDINARY_AGGREGATE_CASES[0],css:input.expected[0].css});
assert.equal(insertOrdinaryCheckboxButtonIntoAggregateModel(inherited),null);controls.push('nonplain argument object rejects');
const resultArgs=structuredClone(input.matches[0].args);Object.defineProperty(resultArgs.actual,'css',{enumerable:true,get(){getterCalls++;return '';}});
assert.equal(ordinaryAggregateResultsMatch(resultArgs),false);controls.push('measurement getter rejected without invocation');
assert.equal(getterCalls,0);
process.stdout.write(JSON.stringify({case_roster:ORDINARY_AGGREGATE_CASES,controls,getter_calls:getterCalls,compiles:0,source_or_artifact_authority:false})+'\n');
