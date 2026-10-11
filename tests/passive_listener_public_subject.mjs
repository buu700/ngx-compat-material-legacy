/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
const [line,mode]=process.argv.slice(2);let probes=0;
function installWindow(supported,throws=false){globalThis.window={addEventListener(name,listener,options){assert.equal(name,'test');assert.equal(listener,null);probes++;if(throws)throw Error('host-probe-error');if(supported)void options.passive;}};}
if(mode!=='ssr')installWindow(mode==='supported',mode==='throwing');
await import('@angular/compiler');
const platform=await import('@angular/cdk/platform'),normalize=platform.normalizePassiveListenerOptions;
if(mode==='throwing'){assert.throws(()=>normalize({passive:true}),/host-probe-error/);assert.equal(probes,1);}
const fixture=await import('./passive_listener_options.mjs');
const snapshots=fixture.options.map(options=>({kind:typeof options,value:options}));
assert.deepEqual(snapshots,mode==='supported'?[{kind:'object',value:{passive:false}},{kind:'object',value:{passive:true}},{kind:'object',value:{passive:true}},{kind:'object',value:{passive:true}}]:Array.from({length:4},()=>({kind:'boolean',value:false})));
for(const options of [{},{passive:false},{passive:true},{passive:true,capture:false},{passive:false,capture:true}]){
 const frozen=Object.freeze(options),before=JSON.stringify(frozen),result=normalize(frozen);
 if(mode==='supported')assert.equal(result,frozen,'supported options lost object identity');else assert.equal(result,!!frozen.capture,'unsupported options lost boolean capture');
 assert.equal(JSON.stringify(frozen),before,'normalizer mutated the input');
}
if(mode==='ssr'){assert.equal(probes,0);installWindow(true);const input=Object.freeze({passive:true,capture:true});assert.equal(normalize(input),input,'SSR poisoned later browser detection');assert.equal(probes,1);}
else {assert.equal(probes,1,'passive feature detection was not cached');installWindow(mode!=='supported');normalize({passive:true});assert.equal(probes,1,'cached support changed after host replacement');}
console.log(JSON.stringify({line,mode,snapshots,probe_calls:probes,input_mutation:false,public_function_source:normalize.toString(),native_execution:false}));
