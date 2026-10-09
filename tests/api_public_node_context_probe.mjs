/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real source-factory emission and public Angular nodes; not packed/native/floor qualification. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,readdirSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createPublicFactoryContext} from '../scripts/api-public-node-context.mjs';
import {observeRuntimeDi,runFactory} from '../scripts/api-di-observe.mjs';
import {originalFactoryContract} from '../scripts/api-surface.mjs';
import {originalCompilerFactoryContext} from '../scripts/api-original-factory-contexts.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const ts=require('typescript'),url=spec=>pathToFileURL(require.resolve(spec)).href,load=spec=>import(url(spec));
await load('@angular/compiler');const core=await load('@angular/core');
const cases=[];
const fixture=await createPublicFactoryContext(core,load);
try{
 const element=fixture.element.injector.get(core.ElementRef);
 assert.ok(element instanceof core.ElementRef,'not an Angular ElementRef');
 assert.ok(element.nativeElement===fixture.element.element.nativeElement,'wrong Angular node');
 assert.ok(fixture.element.injector.get(fixture.scopeToken)===fixture.childValue,'wrong child provider');
 assert.ok(fixture.element.injector.get(fixture.scopeToken,undefined,{self:true})===fixture.childValue,'self escaped child');
 assert.ok(fixture.element.injector.get(fixture.scopeToken,undefined,{skipSelf:true})===fixture.parentValue,'skipSelf did not reach parent');
 cases.push({id:'actual-node-self-and-parent-provider-scopes',result:'pass'});
 const template=fixture.template.injector.get(core.TemplateRef);
 assert.ok(template instanceof core.TemplateRef,'not an Angular TemplateRef');
 assert.ok(template.elementRef.nativeElement===fixture.template.template.elementRef.nativeElement,'wrong template node');
 const view=fixture.element.container.createEmbeddedView(template,{});
 assert.ok(Array.isArray(view.rootNodes)&&typeof view.detectChanges==='function','embedded view contract missing');
 assert.equal(view.destroyed,false);assert.equal(fixture.element.container.length,1);
 view.destroy();assert.equal(view.destroyed,true);
 cases.push({id:'actual-template-and-container-create-and-destroy-view',result:'pass'});
 class RootService {document=core.inject(core.DOCUMENT);}
 core.Injectable({providedIn:'root'})(RootService);
 const service=fixture.element.injector.get(RootService);
 assert.ok(service instanceof RootService,'root service did not execute');assert.ok(service.document===fixture.document,'wrong root document');
 cases.push({id:'real-public-application-root-service-resolution',result:'pass'});
 const common=await load('@angular/common'),testing=await load('@angular/common/testing');
 assert.ok(fixture.platformLocation instanceof testing.MockPlatformLocation);
 assert.ok(fixture.element.injector.get(common.PlatformLocation)===fixture.platformLocation);
 const location=fixture.element.injector.get(common.Location);
 assert.ok(location instanceof common.Location);
 const changes=[],unsubscribe=location.onUrlChange((url,state)=>changes.push({url,state}));
 location.go('/caller','mode=one',{case:'public-url-provider'});
 assert.equal(location.path(),'/caller?mode=one');assert.equal(changes.length,1);
 assert.deepEqual(changes[0],{url:'/caller?mode=one',state:{case:'public-url-provider'}});
 unsubscribe();location.go('/after-unsubscribe');assert.equal(changes.length,1);
 cases.push({id:'actual-public-Location-with-public-testing-URL-backend',result:'pass'});
 const overlay=await load('@angular/cdk/overlay'),reference=fixture.element.injector.get(overlay.Overlay).create();
 let disposed=false;const subscription=reference.attachments().subscribe({complete:()=>{disposed=true;}});
 assert.ok(reference instanceof overlay.OverlayRef);assert.equal(reference.hasAttached(),false);
 assert.ok(reference.hostElement.parentNode);assert.ok(reference.overlayElement.parentNode===reference.hostElement);
 assert.equal(disposed,false);reference.dispose();assert.equal(disposed,true);subscription.unsubscribe();
 assert.equal(fixture.component.hostView.destroyed,false);assert.equal(fixture.environment.destroyed,false);
 cases.push({id:'genuine-public-overlay-reference-and-caller-disposal',result:'pass'});
 const unknown=new core.InjectionToken('Unknown required API fixture service');
 const missing=runFactory(()=>core.inject(unknown),core.Injector,core.runInInjectionContext,{injector:fixture.element.injector});
 assert.equal(missing.outcome,'threw');assert.equal(missing.requests.length,1);assert.ok(missing.requests[0].token===unknown,'wrong unresolved token');
 assert.equal(missing.requests[0].unresolved,true);assert.equal(fixture.component.hostView.destroyed,false);
 cases.push({id:'unknown-required-provider-propagates-with-live-borrowed-view',result:'pass'});
}finally{fixture.close();fixture.close();}
assert.equal(fixture.component.hostView.destroyed,true);assert.equal(fixture.environment.destroyed,true);
cases.push({id:'caller-view-and-environment-cleanup-is-idempotent',result:'pass'});

class ProjectingOwner{destroyed=false;ngOnDestroy(){this.destroyed=true;}}
core.Component({selector:'api-projecting-owner',standalone:true,template:'<article><ng-content></ng-content></article>'})(ProjectingOwner);
const projected=await createPublicFactoryContext(core,load,{parentHost:{tag:'api-projecting-owner',imports:[ProjectingOwner],token:ProjectingOwner}});
try{
 assert.ok(projected.parentNode.owner instanceof ProjectingOwner);
 assert.equal(projected.parentNode.injector.get(ProjectingOwner,undefined,{self:true}),projected.parentNode.owner);
 assert.equal(projected.element.injector.get(ProjectingOwner),projected.parentNode.owner);
 assert.equal(projected.element.injector.get(ProjectingOwner,null,{self:true,optional:true}),null);
 assert.notEqual(projected.parentNode.element.nativeElement,projected.element.element.nativeElement);
 assert.equal(projected.element.element.nativeElement.parentElement.nodeName,'ARTICLE');
 const view=projected.element.container.createEmbeddedView(projected.template.template,{});
 assert.equal(view.destroyed,false);view.destroy();
 assert.equal(projected.parentNode.owner.destroyed,false);
 cases.push({id:'actual-parent-component-projection-and-container-anchor',result:'pass'});
}finally{projected.close();}
assert.equal(projected.parentNode.owner.destroyed,true);
cases.push({id:'actual-parent-destroyed-only-by-caller-cleanup',result:'pass'});

const sourceFiles=['legacy-autocomplete/autocomplete-origin.ts','legacy-autocomplete/internal/autocomplete-origin-base.ts'];
const temporary=mkdtempSync(join(tmpdir(),'api-real-source-node-'));
try{
 for(const file of sourceFiles){const target=join(temporary,'src',file);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(join(root,'projects/ngx-material-legacy',file)));}
 const cli=await load('@angular/compiler-cli');
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,moduleResolution:ts.ModuleResolutionKind.Bundler,
  experimentalDecorators:true,skipLibCheck:true,strict:true,rootDir:join(temporary,'src'),outDir:join(temporary,'out'),
  paths:{'@angular/core':[resolve(dirname(require.resolve('@angular/core')),'../types/core.d.ts')]},compilationMode:'partial'};
 const program=cli.createProgram({rootNames:sourceFiles.map(file=>join(temporary,'src',file)),options,host:cli.createCompilerHost({options})});
 const diagnostics=cli.defaultGatherDiagnostics(program);
 assert.equal(diagnostics.length,0,diagnostics.length?cli.formatDiagnostics(diagnostics):'');
 assert.equal(program.emit().emitSkipped,false);
 // Relocate emitted files to the diagnostic runtime. Constructor/factory code
 // remains exactly the compiler output; no dependency metadata is handcrafted.
 function relocate(directory){for(const entry of readdirSync(directory,{withFileTypes:true})){
  const file=join(directory,entry.name);if(entry.isDirectory()){relocate(file);continue;}
  if(entry.name.endsWith('.js'))writeFileSync(file,readFileSync(file,'utf8')
   .replace(/(['"])(@angular\/[^'"]+)\1/g,(_q,_quote,spec)=>JSON.stringify(url(spec)))
   .replace(/(['"])(\.\.?\/[^'"]+)\1/g,(_q,_quote,spec)=>JSON.stringify(spec.endsWith('.js')?spec:spec+'.js')));
 }}
 relocate(join(temporary,'out'));writeFileSync(join(temporary,'out/package.json'),'{"type":"module"}');
 const leaf=join(temporary,'out/legacy-autocomplete/autocomplete-origin.js');
 const originalFactory=originalFactoryContract('/original/src/material/legacy-autocomplete/autocomplete-origin.ts','MatLegacyAutocompleteOrigin');
 const symbol={symbol_id:'legacy-autocomplete/primary/MatLegacyAutocompleteOrigin',family:'legacy-autocomplete',kind:'primary',
  name:'MatLegacyAutocompleteOrigin',di_id:'source-node-fixture',shape:{diParams:[],originalFactory,
   originalFactoryContext:originalCompilerFactoryContext(originalFactory)}};
 async function observe(id,footer=''){
  const directory=join(temporary,id);mkdirSync(join(directory,'fesm2022'),{recursive:true});
  writeFileSync(join(directory,'fesm2022/ngx-compat-material-legacy-legacy-autocomplete.mjs'),
   'import {MatLegacyAutocompleteOrigin} from '+JSON.stringify(pathToFileURL(leaf).href)+';\n'
   +'import * as core from '+JSON.stringify(url('@angular/core'))+';\nexport {MatLegacyAutocompleteOrigin};\n'+footer);
  const [row]=await observeRuntimeDi(directory,[symbol],[],load);return settleDi(row,[]);
 }
 const good=await observe('actual-source');assert.equal(good.result,'pass',good.problems.join('\n'));
 assert.equal(good.factory_outcome,'returned');assert.deepEqual(good.observed,['ElementRef']);
 assert.ok(good.factory_context.startsWith('actual Angular'),'empty diagnostic context remained');
 assert.equal(good.factory_returned_owned_instance,true);
 assert.equal(good.factory_node_kind,'element');assert.equal(good.runtime_requests.length,1);
 assert.equal(good.runtime_requests[0].identity_matched,true);assert.equal(good.runtime_requests[0].skipSelf,false);
 cases.push({id:'real-emitted-maintained-factory-full-api-producer-and-settlement',result:'pass',context:good.factory_context});
 const moduleFactory=originalFactoryContract('/original/src/material/legacy-autocomplete/autocomplete-module.ts','MatLegacyAutocompleteModule');
 const owner={family:symbol.family,kind:'primary',name:'MatLegacyAutocompleteModule',
  symbol_id:'legacy-autocomplete/primary/MatLegacyAutocompleteModule',shape:{originalFactory:moduleFactory}};
 const directory=join(temporary,'missing-caller-module');mkdirSync(join(directory,'fesm2022'),{recursive:true});
 writeFileSync(join(directory,'fesm2022/ngx-compat-material-legacy-legacy-autocomplete.mjs'),
  'export {MatLegacyAutocompleteOrigin} from '+JSON.stringify(pathToFileURL(leaf).href)+';');
 const [missingModule]=await observeRuntimeDi(directory,[symbol,owner],[],load);
 assert.ok(missingModule.problems.length>0,'missing authentic caller module was accepted');
 assert.ok(missingModule.factory_error.includes('missing caller module '+owner.symbol_id),'missing module failure lost');
 cases.push({id:'missing-original-caller-module-rejected',result:'rejected'});
 const wrongScope=await observe('wrong-scope',
  'Object.defineProperty(MatLegacyAutocompleteOrigin,"ɵfac",{value:()=>new MatLegacyAutocompleteOrigin(core.inject(core.ElementRef,{skipSelf:true})),configurable:true});');
 assert.equal(wrongScope.result,'fail');assert.ok(wrongScope.problems.some(p=>p.includes('skipSelf differs')));
 cases.push({id:'same-public-token-with-wrong-scope-flag-rejected',result:'rejected'});
 const empty=await observe('empty-factory','Object.defineProperty(MatLegacyAutocompleteOrigin,"ɵfac",{value:()=>({}),configurable:true});');
 assert.equal(empty.result,'fail');assert.ok(empty.problems.some(p=>p.includes('did not return the owned class instance')));
 cases.push({id:'empty-returning-factory-rejected',result:'rejected'});
 const destroysBorrowed=await observe('destroys-borrowed',
  'Object.defineProperty(MatLegacyAutocompleteOrigin,"ɵfac",{value:()=>{const value=new MatLegacyAutocompleteOrigin(core.inject(core.ElementRef));const borrowed=core.inject(core.Injector).get(core.ChangeDetectorRef);value.ngOnDestroy=()=>borrowed.destroy();return value;},configurable:true});');
 assert.equal(destroysBorrowed.result,'fail');
 assert.ok(destroysBorrowed.problems.some(p=>p.includes('destroyed borrowed Angular node probes')),'borrowed node destruction was not detected');
 cases.push({id:'owned-teardown-destroying-borrowed-angular-nodes-rejected',result:'rejected'});
}finally{rmSync(temporary,{recursive:true,force:true});}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const paths=[...sourceFiles.map(file=>'projects/ngx-material-legacy/'+file),'scripts/api-public-node-context.mjs',
 'scripts/api-di-observe.mjs','scripts/api-completeness.mjs','tests/api_public_node_context_probe.mjs'];
const result={schema_version:1,role:'public Angular node/application context and actual two-file source emission; not packed/native/floor qualification',
 node:process.version,typescript:ts.version,runtime_peer:core.VERSION.full,cases,
 source_caps:paths.map(path=>({path,sha256:sha(readFileSync(join(root,path)))})),
 original_factory_dependencies:1,handcrafted_dependency_metadata:false,current_private_imports:false,
 library_templates_styles_modified:false,actual21_execution:false,packed_execution:false,native_browser_execution:false,g02_claim:'not-passed'};
if(process.argv.includes('--out'))writeFileSync(process.argv[process.argv.indexOf('--out')+1],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,failed:cases.filter(c=>!['pass','rejected'].includes(c.result)).length,runtime_peer:core.VERSION.full}));
