/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Actual generated consumer policy and engine admission; no packed/floor build credit.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {assertEngineFreeConsumer,assertEngineFreeHarnessInputs} from '../scripts/consumer-animation-engine.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const text=readFileSync(join(root,'scripts/packed-consumer-aot-smoke.mjs'),'utf8');
const file=ts.createSourceFile('consumer.mjs',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.equal(file.parseDiagnostics.length,0);
const literals=[];function visit(n){if(ts.isNoSubstitutionTemplateLiteral(n))literals.push(n.text);ts.forEachChild(n,visit);}visit(file);
const app=literals.find(t=>t.includes('class AotSmokeRoot')),harness=literals.find(t=>t.includes('class HarnessHost'));
assert.ok(app&&harness);
for(const source of [app,harness]){
 const parsed=ts.createSourceFile('consumer.ts',source,ts.ScriptTarget.Latest,true);assert.equal(parsed.parseDiagnostics.length,0);
 for(const n of parsed.statements.filter(ts.isImportDeclaration))assert.ok(!['@angular/animations','@angular/platform-browser/animations','@angular/platform-browser/animations/async'].includes(n.moduleSpecifier.text));
}
let dependencies;function findDependencies(n){if(ts.isPropertyAssignment(n)&&n.name.getText(file)==='dependencies'&&ts.isObjectLiteralExpression(n.initializer))dependencies=n.initializer;ts.forEachChild(n,findDependencies);}findDependencies(file);
assert.ok(dependencies);assert.ok(!dependencies.properties.some(n=>n.name?.text==='@angular/animations'));
const parsed=ts.createSourceFile('harness.ts',harness,ts.ScriptTarget.Latest,true);let providers,policy;
function findPolicy(n){
 if(ts.isCallExpression(n)&&n.expression.getText(parsed)==='TestBed.configureTestingModule')providers=n.arguments[0].properties.find(p=>p.name.getText(parsed)==='providers').initializer;
 if(ts.isVariableDeclaration(n)&&n.name.getText(parsed)==='engineFreeAnimationPolicy')policy=n.initializer.getText(parsed);
 ts.forEachChild(n,findPolicy);
}findPolicy(parsed);assert.ok(providers&&policy);
const selected=providers.elements.filter(n=>ts.isObjectLiteralExpression(n)&&n.properties.some(p=>p.name.getText(parsed)==='provide'&&['MATERIAL_ANIMATIONS','ANIMATION_MODULE_TYPE'].includes(p.initializer.getText(parsed))));
assert.equal(selected.length,2);
const providerSource=selected.map(n=>n.getText(parsed)).join(',');
assert.ok(harness.includes('&& engineFreeAnimationPolicy,'));
const scratch=mkdtempSync(join(tmpdir(),'consumer-engine-policy-'));let cases=0,rejected=0;
try{
 const lock=value=>writeFileSync(join(scratch,'package-lock.json'),JSON.stringify(value));
 lock({packages:{'':{},'node_modules/@angular/core':{version:'test'}}});
 assert.deepEqual(assertEngineFreeConsumer(scratch),{installed_packages:[],lock_packages:[]});cases++;
 for(const path of ['node_modules/@angular/animations','node_modules/example/node_modules/@angular/animations']){lock({packages:{[path]:{version:'test'}}});assert.throws(()=>assertEngineFreeConsumer(scratch));rejected++;}
 lock({packages:{}});mkdirSync(join(scratch,'node_modules/@angular/animations'),{recursive:true});assert.throws(()=>assertEngineFreeConsumer(scratch));rejected++;
 for(const value of [{}, {packages:null}]){lock(value);assert.throws(()=>assertEngineFreeConsumer(scratch));rejected++;}
 assert.doesNotThrow(()=>assertEngineFreeHarnessInputs([{path:'node_modules/@angular/material/fesm2022/_animation-chunk.mjs'}]));cases++;
 for(const path of ['node_modules/@angular/animations/fesm2022/animations.mjs','node_modules/example/node_modules/@angular/animations/fesm2022/animations.mjs','node_modules/@angular/platform-browser/fesm2022/animations.mjs','node_modules/@angular/platform-browser/fesm2022/async.mjs','node_modules/@angular/platform-browser/animations/browser.mjs']){assert.throws(()=>assertEngineFreeHarnessInputs([{path}]));rejected++;}
 assert.throws(()=>assertEngineFreeHarnessInputs([]));rejected++;
 const subjects=prepareMaterialPublicSubjects(root);
 try{for(const model of subjects.models.filter(m=>m.line!=='original')){
   await import(pathToFileURL(join(model.root,'node_modules/@angular/compiler/fesm2022/compiler.mjs')).href);
   const core=await import(pathToFileURL(join(model.root,'node_modules/@angular/core/fesm2022/core.mjs')).href);
   const material=await import(pathToFileURL(join(model.root,'node_modules/@angular/material/fesm2022/core.mjs')).href);
   const ownedPath=join(model.root,'legacy-animations.mjs');
   writeFileSync(ownedPath,ts.transpileModule(readFileSync(join(root,'projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
   const owned=await import(pathToFileURL(ownedPath).href);
   const make=source=>new Function('MATERIAL_ANIMATIONS','ANIMATION_MODULE_TYPE','return ['+source+'];')(material.MATERIAL_ANIMATIONS,core.ANIMATION_MODULE_TYPE);
   const observe=source=>{
     const injector=core.createEnvironmentInjector(make(source));
     try{return core.runInInjectionContext(injector,()=>({policy:new Function('TestBed','MATERIAL_ANIMATIONS','ANIMATION_MODULE_TYPE','return '+policy+';')({inject:core.inject},material.MATERIAL_ANIMATIONS,core.ANIMATION_MODULE_TYPE),state:owned.getLegacyAnimationsState()}));}
     finally{injector.destroy();}
   };
   assert.deepEqual(observe(providerSource),{policy:true,state:'di-disabled'});cases++;
   for(const mutant of [providerSource.replace('animationsDisabled: true','animationsDisabled: false'),providerSource.replace("useValue: 'NoopAnimations'","useValue: 'BrowserAnimations'")]){
     assert.equal(observe(mutant).policy,false);rejected++;
   }
 }}finally{subjects.dispose();}
}finally{rmSync(scratch,{recursive:true,force:true});}
console.log(JSON.stringify({cases,negative_controls:rejected,authenticated_lines:['main','21.x'],scope:'Actual generated policy with genuine public tokens and complete owned policy helper; synthetic install/lock/bundle controls. No packed AOT, full harness, Node/RxJS floors, native CSS or Cyph build executed.'}));
