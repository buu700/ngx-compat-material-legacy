/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from'node:assert/strict';import{createRequire}from'node:module';import{pathToFileURL,fileURLToPath}from'node:url';
import{mkdtempSync,readFileSync,writeFileSync,mkdirSync,readdirSync,rmSync,symlinkSync}from'node:fs';import{dirname,join,resolve}from'node:path';import{tmpdir}from'node:os';
import {observeRuntimeDi} from '../scripts/api-di-observe.mjs';
import {originalFactoryContract} from '../scripts/api-surface.mjs';
import {originalCompilerFactoryContext} from '../scripts/api-original-factory-contexts.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const req=createRequire(import.meta.url),ts=req('typescript'),url=s=>pathToFileURL(req.resolve(s)).href;
const cli=await import(url('@angular/compiler-cli'));
const temp=mkdtempSync(join(tmpdir(),'origin-aot-source-'));
try{
 const files=['legacy-form-field/error.ts','legacy-form-field/owned-tokens.ts'];
 for(const f of files){const p=join(temp,'src',f);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,readFileSync(join(root,'projects/ngx-material-legacy',f)));}
 // A separately compiled fixture challenges fresh ChangeDetectorRef wrappers.
 // Its handwritten expectations test the verifier mechanism, not product equivalence.
 const detectorFile='detector-fixture.ts';
 writeFileSync(join(temp,'src',detectorFile),`import {Directive,Attribute,ElementRef,ChangeDetectorRef} from '@angular/core';
 @Directive({selector:'[attributeDetectorFixture]',standalone:true})
 export class AttributeDetectorFixture {constructor(@Attribute('role') role:string,element:ElementRef,detector:ChangeDetectorRef){}}`);
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,moduleResolution:ts.ModuleResolutionKind.Bundler,
  experimentalDecorators:true,skipLibCheck:true,strict:true,rootDir:join(temp,'src'),outDir:join(temp,'out'),
  paths:{'@angular/core':[resolve(dirname(req.resolve('@angular/core')),'../types/core.d.ts')],'@angular/material/form-field':[resolve(dirname(req.resolve('@angular/material/form-field')),'../types/form-field.d.ts')]},compilationMode:'partial'};
 const host=cli.createCompilerHost({options});const program=cli.createProgram({rootNames:[...files,detectorFile].map(f=>join(temp,'src',f)),options,host});
 const diagnostics=cli.defaultGatherDiagnostics(program);if(diagnostics.length)throw Error(cli.formatDiagnostics(diagnostics));
 const emitted=program.emit();assert.equal(emitted.emitSkipped,false);const cases=[];
 const {compilerConstructorContract}=await import(pathToFileURL(join(root,'scripts/api-compiler-constructor-contract.mjs')).href);
 const compilerSource=readFileSync(join(temp,'out/legacy-form-field/error.js'),'utf8');
 const detectorSource=readFileSync(join(temp,'out/detector-fixture.js'),'utf8');
 const compilerContract=compilerConstructorContract(compilerSource,'MatLegacyError');
 assert.equal(compilerContract.parameters.length,2);assert.equal(compilerContract.parameters[0].attribute,'aria-live');
 function patch(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const p=join(dir,item.name);if(item.isDirectory()){patch(p);continue;}if(item.name.endsWith('.js')){
 const s=readFileSync(p,'utf8').replace(/(['"])(@angular\/[^'"]+)\1/g,(_,q,s)=>JSON.stringify(url(s))).replace(/(['"])(\.\.?\/[^'"]+)\1/g,(_,q,s)=>JSON.stringify(s.endsWith('.js')?s:s+'.js'));writeFileSync(p,s);}}}
 patch(join(temp,'out'));writeFileSync(join(temp,'out/package.json'),'{"type":"module"}');
 symlinkSync(process.env.NODE_PATH?.split(':')[0]||join(root,'node_modules'),join(temp,'node_modules'),'dir');
 await import(url('@angular/compiler'));const c=await import(url('@angular/core'));
 const {MatLegacyError}=await import(pathToFileURL(join(temp,'out/legacy-form-field/error.js')).href);
 const {createPublicFactoryContext}=await import(pathToFileURL(join(root,'scripts/api-public-node-context.mjs')).href);
 const {captureFactoryConstructorInputs}=await import(pathToFileURL(join(root,'scripts/api-factory-constructor-inputs.mjs')).href);
 const metadata=MatLegacyError.ctorParameters();
 assert.ok(metadata[0].decorators[0].type===c.Attribute,'actual Attribute decorator identity changed');
 assert.deepEqual(metadata[0].decorators[0].args,['aria-live']);assert.ok(metadata[1].type===c.ElementRef,'actual ElementRef metadata identity changed');
 const original=readFileSync(join(root,'reference/material-16.2.14/error-helper-sources/legacy-error.ts'),'utf8');
 const current=readFileSync(join(root,'projects/ngx-material-legacy/legacy-form-field/error.ts'),'utf8');
 assert.equal(current.replace(' * Copyright (c) 2026 Ryan Lester.\n','').replace('@Directive({\n  standalone: false,','@Directive({').replace("import {MAT_LEGACY_ERROR as MAT_ERROR} from './owned-tokens';","import {MAT_ERROR} from '@angular/material/form-field';"),original.replace(' * @deprecated Use `MatError` from `@angular/material/form-field` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.\n','').replace(' * @breaking-change 17.0.0\n',''));
 for(const ariaLive of [null,'','assertive','polite',' ','<&"']){
 let captured;
 const f=await createPublicFactoryContext(c,s=>import(url(s)),{attributes:ariaLive===null?{}:{'aria-live':ariaLive},nodeFactory:()=>{captured=captureFactoryConstructorInputs(MatLegacyError);return captured.value;}});
 try{const inputs=captured.inputs;assert.ok(f.element.execution instanceof captured.receiver,'factory ignored probe constructor');assert.equal(inputs[0],ariaLive);assert.ok(inputs[1] instanceof c.ElementRef,'wrong ElementRef');assert.ok(inputs[1].nativeElement===f.element.element.nativeElement,'wrong node');assert.equal(inputs[1].nativeElement.getAttribute('aria-live'),ariaLive||'polite');cases.push({id:'literal-'+JSON.stringify(ariaLive),result:'pass',captured:inputs[0],live:inputs[1].nativeElement.getAttribute('aria-live')});}finally{f.close();}
 }
 const f=await createPublicFactoryContext(c,s=>import(url(s)));
 try{
 const fakeFactory=()=>new MatLegacyError(null,f.element.element);
 assert.throws(()=>captureFactoryConstructorInputs(MatLegacyError,fakeFactory),/constructor-type override/);
 cases.push({id:'factory-ignoring-constructor-type-override',result:'rejected'});
 }finally{f.close();}
 const originalFactory=originalFactoryContract('/original/src/material/legacy-form-field/error.ts','MatLegacyError');
 const symbol={symbol_id:'legacy-form-field/primary/MatLegacyError',family:'legacy-form-field',kind:'primary',
  name:'MatLegacyError',di_id:'actual-error-source-factory',shape:{diParams:[],originalFactory,
   originalFactoryContext:originalCompilerFactoryContext(originalFactory)}};
 async function observe(id,change=s=>s){
  const dir=join(temp,id);mkdirSync(join(dir,'fesm2022'),{recursive:true});
  const source=compilerSource.replace(/(['"])(\.\.?\/owned-tokens)\1/g,
   ()=>JSON.stringify(pathToFileURL(join(temp,'out/legacy-form-field/owned-tokens.js')).href));
  writeFileSync(join(dir,'fesm2022/ngx-compat-material-legacy-legacy-form-field.mjs'),change(source));
  const [row]=await observeRuntimeDi(dir,[symbol],[],s=>import(url(s)));return settleDi(row,[]);
 }
 const admitted=await observe('actual-api-producer');
 assert.equal(admitted.result,'pass',admitted.problems.join('\n'));
 assert.equal(admitted.factory_outcome,'returned');assert.deepEqual(admitted.observed,['ElementRef']);
 assert.deepEqual(admitted.factory_constructor_evidence.map(p=>p.input_verified),[true,true]);
 assert.equal(admitted.factory_constructor_evidence[0].value,null);
 assert.equal(admitted.runtime_requests[0].identity_matched,true);
 cases.push({id:'unchanged-error-full-api-producer-and-settlement',result:'pass'});
 for(const [id,change] of [
  ['settlement-missing-constructor-evidence',r=>r.factory_constructor_evidence=[]],
  ['settlement-missing-compiler-correlation',r=>r.factory_compiler_observation=null],
  ['settlement-unverified-input',r=>r.factory_constructor_evidence[1].input_verified=false],
  ['settlement-wrong-attribute-name',r=>r.factory_constructor_evidence[0].attribute='role'],
  ['settlement-wrong-attribute-value',r=>r.factory_constructor_evidence[0].value='assertive'],
  ['settlement-wrong-compiler-flag',r=>r.factory_compiler_observation.parameters[1].skipSelf=true],
 ]){
  const row=JSON.parse(JSON.stringify(admitted));row.problems=[];change(row);
  assert.equal(settleDi(row,[]).result,'fail',id+' admitted');cases.push({id,result:'rejected'});
 }
 const mutants=[
  ['wrong-factory-token',s=>s.replace('token: i0.ElementRef','token: i0.Injector')],
  ['wrong-attribute-in-both-observations',s=>s.replaceAll('aria-live','role')],
  ['runtime-token-twin',s=>s+'\nMatLegacyError.ctorParameters=()=>[{type:undefined,decorators:[{type:i0.Attribute,args:["aria-live"]}]},{type:class ElementRef{}}];'],
  ['runtime-foreign-attribute-decorator',s=>s+'\nMatLegacyError.ctorParameters=()=>[{type:undefined,decorators:[{type:class Attribute{},args:["aria-live"]}]},{type:i0.ElementRef}];'],
  ['manual-factory-override',s=>s+'\nMatLegacyError.ɵfac=()=>({});'],
  ['runtime-metadata-removed',s=>s+'\ndelete MatLegacyError.ctorParameters;'],
 ];
 for(const [id,change]of mutants){
  assert.notEqual(change(compilerSource),compilerSource,id+' mutant did not mutate');
  const rejected=await observe(id,change);assert.equal(rejected.result,'fail',id+' admitted');
  cases.push({id,result:'rejected'});
 }
 const {attributeFactoryContract,executeAttributeFactory,challengeAttributeDetectorScopes}=
  await import(pathToFileURL(join(root,'scripts/api-attribute-factory.mjs')).href);
 const {runFactory}=await import(pathToFileURL(join(root,'scripts/api-di-observe.mjs')).href);
 const {AttributeDetectorFixture}=await import(pathToFileURL(join(temp,'out/detector-fixture.js')).href);
 const detectorParameters=[{attribute:'role'},{ident:'ElementRef'},{ident:'ChangeDetectorRef'}];
 const detectorContract=await attributeFactoryContract(AttributeDetectorFixture,c,detectorSource,detectorParameters,
  (p,token)=>token===c[p.ident]);
 const detectorFixture=await createPublicFactoryContext(c,s=>import(url(s)),{nodeFactory:node=>
  executeAttributeFactory(AttributeDetectorFixture,c,detectorContract,node,runFactory)});
 try{
  const execution=detectorFixture.element.execution;
  assert.equal(execution.outcome,'returned');assert.equal(detectorFixture.element.destroyed,false);
  challengeAttributeDetectorScopes(execution,detectorFixture);
  assert.equal(execution.constructorEvidence[2].scope_challenge,'public-view-destruction-verified');
  cases.push({id:'compiled-helper-detector-actual-public-view-scope',result:'pass'});
 }finally{detectorFixture.close();}
 const foreign=await createPublicFactoryContext(c,s=>import(url(s)));
 const actualFactory=AttributeDetectorFixture.ɵfac;
 try{
  let wrongFixture;
  wrongFixture=await createPublicFactoryContext(c,s=>import(url(s)),{nodeFactory:node=>{
   Object.defineProperty(AttributeDetectorFixture,'ɵfac',{value:Receiver=>new Receiver(null,node.element,foreign.component.changeDetectorRef),configurable:true});
   return executeAttributeFactory(AttributeDetectorFixture,c,detectorContract,node,runFactory);
  }});
  try{
   assert.equal(wrongFixture.element.execution.outcome,'returned');
   assert.throws(()=>challengeAttributeDetectorScopes(wrongFixture.element.execution,wrongFixture),/different view/);
   cases.push({id:'foreign-public-detector-view-rejected',result:'rejected'});
  }finally{wrongFixture.close();}
 }finally{Object.defineProperty(AttributeDetectorFixture,'ɵfac',{value:actualFactory,configurable:true});foreign.close();}
 for(const [id,inputs] of [
  ['wrong-actual-attribute-input',node=>['wrong-role',node.element,node.injector.get(c.ChangeDetectorRef)]],
  ['foreign-actual-element-input',node=>[null,new c.ElementRef({}),node.injector.get(c.ChangeDetectorRef)]],
 ]){
  try{
   await assert.rejects(createPublicFactoryContext(c,s=>import(url(s)),{nodeFactory:node=>{
    Object.defineProperty(AttributeDetectorFixture,'ɵfac',{value:Receiver=>new Receiver(...inputs(node)),configurable:true});
    return executeAttributeFactory(AttributeDetectorFixture,c,detectorContract,node,runFactory);
   }}),/actual (attribute input|constructor provider value) differs/);
   cases.push({id,result:'rejected'});
  }finally{Object.defineProperty(AttributeDetectorFixture,'ɵfac',{value:actualFactory,configurable:true});}
 }
 const result={schema_version:1,role:'Unchanged emitted error factory full API producer and strict attribute constructor observations; not complete nine-class or packed/native/minimum qualification',node:process.version,typescript:ts.version,runtime_peer:c.VERSION.full,cases,
 api_constructor_evidence:admitted.factory_constructor_evidence,api_runtime_requests:admitted.runtime_requests,
 compiler_observation_contract:compilerContract,
 original_directive_unchanged_except_owned_token_standalone_copyright_and_retired_migration_notices:true,actual_attribute_and_elementref_metadata_identity:true,handcrafted_dependency_metadata:false,current_private_imports:false,library_typescript_templates_styles_changed:false,g02_claim:'not-passed'};
 if(process.argv.includes('--out'))writeFileSync(process.argv[process.argv.indexOf('--out')+1],JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({cases:cases.length,runtime_peer:c.VERSION.full}));
}finally{rmSync(temp,{recursive:true,force:true});}
