/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from'node:assert/strict';import{createRequire}from'node:module';import{pathToFileURL,fileURLToPath}from'node:url';
import{mkdtempSync,readFileSync,writeFileSync,mkdirSync,readdirSync,rmSync}from'node:fs';import{dirname,join,resolve}from'node:path';import{tmpdir}from'node:os';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const req=createRequire(import.meta.url),ts=req('typescript'),url=s=>pathToFileURL(req.resolve(s)).href;
const cli=await import(url('@angular/compiler-cli'));
const temp=mkdtempSync(join(tmpdir(),'origin-aot-source-'));
try{
 const files=['legacy-form-field/error.ts','legacy-form-field/owned-tokens.ts'];
 for(const f of files){const p=join(temp,'src',f);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,readFileSync(join(root,'projects/ngx-material-legacy',f)));}
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,moduleResolution:ts.ModuleResolutionKind.Bundler,
  experimentalDecorators:true,skipLibCheck:true,strict:true,rootDir:join(temp,'src'),outDir:join(temp,'out'),
  paths:{'@angular/core':[resolve(dirname(req.resolve('@angular/core')),'../types/core.d.ts')],'@angular/material/form-field':[resolve(dirname(req.resolve('@angular/material/form-field')),'../types/form-field.d.ts')]},compilationMode:'partial'};
 const host=cli.createCompilerHost({options});const program=cli.createProgram({rootNames:files.map(f=>join(temp,'src',f)),options,host});
 const diagnostics=cli.defaultGatherDiagnostics(program);if(diagnostics.length)throw Error(cli.formatDiagnostics(diagnostics));
 const emitted=program.emit();assert.equal(emitted.emitSkipped,false);const cases=[];
 const {compilerConstructorContract}=await import(pathToFileURL(join(root,'scripts/api-compiler-constructor-contract.mjs')).href);
 const compilerSource=readFileSync(join(temp,'out/legacy-form-field/error.js'),'utf8');
 const compilerContract=compilerConstructorContract(compilerSource,'MatLegacyError');
 assert.equal(compilerContract.parameters.length,2);assert.equal(compilerContract.parameters[0].attribute,'aria-live');
 function patch(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const p=join(dir,item.name);if(item.isDirectory()){patch(p);continue;}if(item.name.endsWith('.js')){
 const s=readFileSync(p,'utf8').replace(/(['"])(@angular\/[^'"]+)\1/g,(_,q,s)=>JSON.stringify(url(s))).replace(/(['"])(\.\.?\/[^'"]+)\1/g,(_,q,s)=>JSON.stringify(s.endsWith('.js')?s:s+'.js'));writeFileSync(p,s);}}}
 patch(join(temp,'out'));writeFileSync(join(temp,'out/package.json'),'{"type":"module"}');
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
 const result={schema_version:1,role:'Node-local actual emitted attribute factory and captured constructor inputs; not generic API admission or packed/native/minimum qualification',node:process.version,typescript:ts.version,runtime_peer:c.VERSION.full,cases,
 compiler_observation_contract:compilerContract,
 original_directive_unchanged_except_owned_token_standalone_copyright_and_retired_migration_notices:true,actual_attribute_and_elementref_metadata_identity:true,handcrafted_dependency_metadata:false,current_private_imports:false,library_typescript_templates_styles_changed:false,g02_claim:'not-passed'};
 if(process.argv.includes('--out'))writeFileSync(process.argv[process.argv.indexOf('--out')+1],JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({cases:cases.length,runtime_peer:c.VERSION.full}));
}finally{rmSync(temp,{recursive:true,force:true});}
