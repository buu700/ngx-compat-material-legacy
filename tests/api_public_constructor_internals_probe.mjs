/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {createPublicFactoryContext} from '../scripts/api-public-node-context.mjs';
import {runFactory} from '../scripts/api-di-observe.mjs';
import {partitionPublicConstructorRequests,publicConstructorPartitionProblems} from '../scripts/api-public-constructor-internals.mjs';
const require=createRequire(import.meta.url),load=s=>import(pathToFileURL(require.resolve(s)).href);
await load('@angular/compiler');const core=await load('@angular/core'),fixture=await createPublicFactoryContext(core,load),cases=[];
try{
 const observed=runFactory(()=>[new core.EventEmitter(),new core.EventEmitter()],core.Injector,core.runInInjectionContext,
  {injector:fixture.element.injector,captureStack:true});
 assert.equal(observed.outcome,'returned');assert.ok(observed.requests.length>0);
 const split=partitionPublicConstructorRequests(observed.requests,core,runFactory,fixture.element.injector);
 assert.equal(split.requests.length,0);assert.equal(split.observation.groups.length,2);
 assert.equal(split.observation.classified_requests,observed.requests.length);
 assert.deepEqual(publicConstructorPartitionProblems(split.observation),[]);
 cases.push({id:'actual-public-constructor-source-and-independent-object-identity-replay',result:'pass'});
 for(const [id,change]of [
  ['description-twin-token',r=>r.token=new core.InjectionToken(r.label)],
  ['wrong-option-flag',r=>r.optional=!r.optional],
  ['unresolved-actual-provider',r=>r.unresolved=true],
 ]){
  const requests=observed.requests.map(r=>({...r}));change(requests[0]);
  assert.throws(()=>partitionPublicConstructorRequests(requests,core,runFactory,fixture.element.injector),/identity\/flags\/resolution differs/);
  cases.push({id,result:'rejected'});
 }
 const missing=observed.requests.map(r=>({...r,stack:null}));
 assert.equal(partitionPublicConstructorRequests(missing,core,runFactory,fixture.element.injector).requests.length,missing.length);
 cases.push({id:'missing-public-constructor-origin-remains-unclassified',result:'rejected'});
 const direct=runFactory(()=>core.inject(core.DestroyRef,{optional:true}),core.Injector,core.runInInjectionContext,
  {injector:fixture.element.injector,captureStack:true});
 const directSplit=partitionPublicConstructorRequests(direct.requests,core,runFactory,fixture.element.injector);
 assert.equal(directSplit.observation.classified_requests,0);assert.equal(directSplit.requests.length,1);
 cases.push({id:'same-token-direct-owned-request-remains-unclassified',result:'rejected'});
 for(const [id,change]of [
  ['missing-control-evidence',r=>r.groups[0].verified=false],
  ['missing-source-hash',r=>r.groups[0].source.sha256=''],
  ['wrong-classified-coverage',r=>r.classified_requests++],
  ['stripped-group-request',r=>r.groups[0].requests.pop()],
  ['wrong-serialized-option',r=>r.groups[0].requests[0].self=true],
  ['missing-serialized-control',r=>r.groups[0].control_requests=[]],
 ]){
  const mutant=JSON.parse(JSON.stringify(split.observation));change(mutant);
  assert.ok(publicConstructorPartitionProblems(mutant).length>0);cases.push({id,result:'rejected'});
 }
 const result={schema_version:1,role:'Actual public EventEmitter constructor internal DI source/identity/control correlation; verifier mechanism, not component/native/packed/floor qualification',
  node:process.version,runtime_peer:core.VERSION.full,cases,observation:split.observation,
  private_upstream_imports:false,angular_hook_or_prototype_patch:false,g02_claim:'not-passed'};
 if(process.argv.includes('--out'))writeFileSync(process.argv[process.argv.indexOf('--out')+1],JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({cases:cases.length,runtime_peer:core.VERSION.full}));
}finally{fixture.close();}
