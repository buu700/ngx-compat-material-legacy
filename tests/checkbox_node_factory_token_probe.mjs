/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exercises the actual generated checkbox request predicate against identity mutations. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../scripts/packed-consumer-aot-smoke.mjs',import.meta.url),'utf8');
const old='const expected=[FocusMonitor,NgZone,ANIMATION_MODULE_TYPE,MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS];';
const current='const expected=[FocusMonitor,NgZone,LEGACY_ANIMATION_MODE,MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS,LEGACY_ANIMATIONS_TEST_OVERRIDE,MATERIAL_ANIMATIONS];';
assert.equal(source.includes(current),true);
assert.equal(source.includes(old),false);
assert.match(source,/import \{_LegacyViewport,LEGACY_ANIMATION_MODE,LEGACY_ANIMATIONS_TEST_OVERRIDE\} from '@ngx-compat\/material-legacy\/legacy-core';/);
const prefix='checkboxNodeFactoryContext=checkboxProbeInstance instanceof MatLegacyCheckbox';
const start=source.indexOf(prefix),end=source.indexOf(';\n  } catch',start);
assert.ok(start>0&&end>start);
const predicate=source.slice(start+'checkboxNodeFactoryContext='.length,end);
assert.match(predicate,/request\.token===expected\[index\]&&request\.optional===\(index>=2\)/);
assert.match(predicate,/bodyRequests\.length===emitterRequests\.length/);
assert.match(predicate,/request\.token===emitterRequests\[index\]\.token&&request\.optional===emitterRequests\[index\]\.optional/);

class MatLegacyCheckbox{tabIndex=7;}
class EventEmitter{}
const FocusMonitor={},NgZone={},LEGACY_ANIMATION_MODE={},MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS={};
const LEGACY_ANIMATIONS_TEST_OVERRIDE={},MATERIAL_ANIMATIONS={};
const ANIMATION_MODULE_TYPE={},aliasLegacyAnimationMode={description:'LEGACY_ANIMATION_MODE'};
const emitterToken={};
const emitterRequests=[{token:emitterToken,optional:true},{token:emitterToken,optional:true}];
const tokens=[FocusMonitor,NgZone,LEGACY_ANIMATION_MODE,MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS,LEGACY_ANIMATIONS_TEST_OVERRIDE,MATERIAL_ANIMATIONS];
const requests=tokens.map((token,index)=>({token,optional:index>=2})).concat(emitterRequests);
const evaluate=new Function('MatLegacyCheckbox','EventEmitter','FocusMonitor','NgZone','LEGACY_ANIMATION_MODE',
  'MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS','LEGACY_ANIMATIONS_TEST_OVERRIDE','MATERIAL_ANIMATIONS',
  'checkboxProbeInstance','emitterBaseline','nodeRequests','emitterRequests',
  `const expected=[FocusMonitor,NgZone,LEGACY_ANIMATION_MODE,MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS,LEGACY_ANIMATIONS_TEST_OVERRIDE,MATERIAL_ANIMATIONS];
   const directRequests=nodeRequests.slice(0,expected.length),bodyRequests=nodeRequests.slice(expected.length);
   return ${predicate};`);
function run(nodeRequests,instance=new MatLegacyCheckbox(),baseline=[new EventEmitter(),new EventEmitter()]){
  return evaluate(MatLegacyCheckbox,EventEmitter,FocusMonitor,NgZone,LEGACY_ANIMATION_MODE,
    MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS,LEGACY_ANIMATIONS_TEST_OVERRIDE,MATERIAL_ANIMATIONS,
    instance,baseline,nodeRequests,emitterRequests);
}
assert.equal(run(requests),true);
for(const [name,mutant] of [
  ['old upstream token',requests.map((request,index)=>index===2?{...request,token:ANIMATION_MODULE_TYPE}:request)],
  ['descriptive alias',requests.map((request,index)=>index===2?{...request,token:aliasLegacyAnimationMode}:request)],
  ['nonoptional request',requests.map((request,index)=>index===2?{...request,optional:false}:request)],
  ['extra old request',requests.slice(0,6).concat({token:ANIMATION_MODULE_TYPE,optional:true},requests.slice(6))],
  ['missing policy request',requests.filter((_,index)=>index!==4)],
  ['aliased policy request',requests.map((request,index)=>index===5?{...request,token:{description:'MATERIAL_ANIMATIONS'}}:request)],
  ['missing request',requests.filter((_,index)=>index!==2)],
])assert.equal(run(mutant),false,name);
assert.equal(run(requests,{tabIndex:7}),false,'owned class required');
assert.equal(run(requests,new MatLegacyCheckbox(),[new EventEmitter()]),false,'emitter baseline required');
console.log(JSON.stringify({positive:1,negative:9,exact_identity:true,old_token_rejected:true,
  alias_rejected:true,nonoptional_rejected:true,extra_old_request_rejected:true,
  missing_and_alias_policy_requests_rejected:true}));
