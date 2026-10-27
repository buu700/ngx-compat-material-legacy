/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Fixture strings must not create dependencies; real unresolved imports still fail. */
import assert from 'node:assert/strict';
import {historicalConsumerModuleGraph} from '../scripts/historical-consumer-module-graph.mjs';
const files=new Map([
  ['tests/probe.mjs',`import {x} from './dep.mjs';
export {y} from './export.mjs';
const dynamic = import('./dynamic.cjs');
const source = "import {Component} from './component';";
const template = \`import {Missing} from './missing-template';\`;
// An original source example: from './comment-fixture'
const data = 'compatibility/rc/direct.json';
const prefix = 'compatibility/rc/example-source-';`],
  ['tests/dep.mjs','export const x=1;'],['tests/export.mjs','export const y=2;'],
  ['tests/dynamic.cjs','module.exports={};'],['compatibility/rc/direct.json','{}'],
  ['compatibility/rc/example-source-subjects.json.gz','opaque test data'],
]);
const calls=[],graph=historicalConsumerModuleGraph({probe:'tests/probe.mjs',paths:[...files.keys()],load:path=>{calls.push(path);return files.get(path);}});
assert.deepEqual(graph.modules,['tests/dep.mjs','tests/dynamic.cjs','tests/export.mjs','tests/probe.mjs']);
assert.deepEqual(new Set(calls),new Set(graph.modules));
for(const path of ['compatibility/rc/direct.json','compatibility/rc/example-source-subjects.json.gz'])assert.ok(graph.inputs.includes(path));
const cases=[];
for(const [id,code]of [
  ['real-import',"import {Missing} from './missing.mjs';"],
  ['real-reexport',"export {Missing} from './missing.mjs';"],
  ['real-dynamic-import',"const module = import('./missing.mjs');"],
  ['real-require',"const module = require('./missing.cjs');"],
  ['invalid-module','const = ;'],
]){
  assert.throws(()=>historicalConsumerModuleGraph({probe:'tests/probe.mjs',paths:[...files.keys()],load:()=>code}),
    id==='invalid-module'?/invalid historical module/:/missing actual historical local module/,id);
  cases.push({id,result:'rejected'});
}
assert.throws(()=>historicalConsumerModuleGraph({probe:'tests/missing.mjs',paths:[...files.keys()],load:()=>''}));
cases.push({id:'missing-probe',result:'rejected'});
console.log(JSON.stringify({schema_version:1,actual_modules:graph.modules.length,quoted_fixture_imports_excluded:3,
  exact_data_inputs_preserved:2,negative_controls:cases.length,cases,actual_historical_programs_executed:false,
  current_source_or_native_or_floor_qualified:false}));
