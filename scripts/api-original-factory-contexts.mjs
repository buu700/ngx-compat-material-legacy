/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const FACTORY_CONTEXT_REFERENCE='reference/material-16.2.14/compiler-factory-contexts.json';
const digest='a619e7ba3f1fc75a243839a2bfc4d45badd506ab83ab8585a3b9d7d364ab7f61';
const sha=b=>createHash('sha256').update(b).digest('hex');
let cached;
function reference(read=p=>readFileSync(resolve(root,p))){
 const bytes=read(FACTORY_CONTEXT_REFERENCE);assert.equal(sha(bytes),digest,'original compiler context identity changed');
 const data=JSON.parse(bytes);assert.equal(data.schema_version,1);assert.equal(Object.keys(data.contexts).length,544);
 assert.equal(data.lock_sha256,sha(read('reference/material-16.2.14/environment-package-lock.json')));
 return data;
}
function load(){return cached ||= reference();}
/** Authenticate context against the unchanged compiler metadata, including previously finite ancestors. */
export function originalCompilerFactoryContext(factory,read){
 if(!factory)return null;
 const data=read?reference(read):load();const key='@angular/material:'+factory.source+'#'+factory.name;
 const context=data.contexts[key];assert.ok(context,'original compiler factory context missing');
 const {inherited_factory,...own}=factory;assert.deepEqual(own,context.compiler_factory,'original factory metadata differs from archive context');
 if(inherited_factory){const ancestor=data.contexts[context.parameter_factory_key];assert.ok(ancestor);
  assert.deepEqual(inherited_factory,ancestor.compiler_factory,'original inherited factory metadata differs from context');}
 return context;
}
/** Public testing helper JIT metadata lives in its exact published testing module. */
export function originalPublishedJitFactory(file,name,read){
 const match=file.split('\\').join('/').match(/\/material\/([^/]+)\/testing\//);if(!match)return null;
 const data=read?reference(read):load(),key='@angular/material:fesm2022/'+match[1]+'/testing.mjs#'+name;
 const row=data.contexts[key]?.compiler_factory;
 return row?.declaration_kind==='published-jit-decorators'?row:null;
}
/** Original parameter order/flags and direct initialization injection, never candidate-derived expectations. */
export function originalContextDi(shape,runtimeContext={}){
 if(!shape.originalFactoryContext)return null;
 const context=originalCompilerFactoryContext(shape.originalFactory);
 assert.deepEqual(shape.originalFactoryContext,context,'original factory context changed');
 assert.ok(context.effective_factory_kind,'unresolved original factory ancestry');
 if(context.effective_factory_kind==='invalid')return [];
 assert.ok(Array.isArray(context.factory_parameters),'original parameters unavailable');
 const params=context.factory_parameters.filter(p=>!p.attribute).map(({index,local_name,...p})=>p);
 for(const ancestor of [...context.ancestry].reverse())for(const injection of ancestor.body_injections){
  if(injection.conditions.length){
   assert.equal(shape.originalFactory.name,'MatCommonModule','unreviewed conditional original body injection');
   assert.equal(shape.originalFactory.source_sha256,'38b761eb8e9b43297942f6e1412469437bc3ee0291342a766b001f715061d175');
   assert.deepEqual(injection.conditions,['!this._hasDoneGlobalChecks',"typeof ngDevMode === 'undefined' || ngDevMode"]);
   assert.equal(typeof runtimeContext.devMode,'boolean','missing original dev-mode context');
   if(!runtimeContext.devMode)continue;
  }
  assert.ok(!injection.unresolved_expression,'unresolved original body injection expression');
  const {conditions,expression,offset,local_name,...param}=injection;params.push(param);
 }
 return params;
}
