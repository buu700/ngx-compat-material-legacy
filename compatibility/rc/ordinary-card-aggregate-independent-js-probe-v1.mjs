/** Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARD_AGGREGATE_CASES,insertCardIntoAggregateModel} from '../../scripts/current-sass-card-aggregate-contract.mjs';
const rows=JSON.parse(readFileSync(0,'utf8')),out=[];
const ids=['mixin-css/all-component-colors','mixin-css/all-component-themes','mixin-css/all-component-typographies','mixin-argument/all-component-colors/custom-full-theme','mixin-argument/all-component-colors/raw-color-config','mixin-argument/all-component-themes/custom-full-theme','mixin-argument/all-component-themes/custom-dark-theme','mixin-argument/all-component-typographies/custom-full-theme','mixin-argument/all-component-typographies/raw-typography-config'];
assert.deepEqual(CARD_AGGREGATE_CASES,ids);
for(const row of rows){
 const {caseId,css}=row;assert.equal(insertCardIntoAggregateModel({caseId,css}),row.expected);
 assert.equal(insertCardIntoAggregateModel({caseId,css:'/* independent outside prefix */\n'+css+'\n/* independent outside suffix */'}),'/* independent outside prefix */\n'+row.expected+'\n/* independent outside suffix */');
 assert.equal(insertCardIntoAggregateModel({caseId:'unknown',css}),null);
 const mutations=Object.fromEntries(Object.entries(row.variants).map(([name,changed])=>[name,insertCardIntoAggregateModel({caseId,css:changed})===null]));
 out.push({line:row.line,case_id:caseId,mutations});
}
let calls=0;const first={caseId:rows[0].caseId,css:rows[0].css};const accessor={...first};Object.defineProperty(accessor,'css',{enumerable:true,get(){calls++;throw Error('getter');}});
assert.equal(insertCardIntoAggregateModel(accessor),null);assert.equal(insertCardIntoAggregateModel(new Proxy(first,{get(){calls++;throw Error('proxy');}})),null);
assert.equal(insertCardIntoAggregateModel({...first,extra:true}),null);assert.equal(insertCardIntoAggregateModel(Object.create(first)),null);assert.equal(calls,0);
process.stdout.write(JSON.stringify({rows:out,metadata:{accessor_proxy_extra_prototype_reject:4,getter_calls:calls}}));
