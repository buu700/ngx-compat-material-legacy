/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Focused unchanged-source constructor execution; not packed/style/native/floor qualification. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {deriveSurface} from '../scripts/api-surface.mjs';
import {observeRuntimeDi,loadRuntimeModule,runtimeTokenIdentity,runFactory} from '../scripts/api-di-observe.mjs';
import {partitionOwnedSelectMotion} from '../scripts/api-owned-motion-context.mjs';
import {createPublicFactoryContext} from '../scripts/api-public-node-context.mjs';
import {captureFactoryConstructorInputs} from '../scripts/api-factory-constructor-inputs.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const arg=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:null;
const selected={
 'legacy-checkbox':['MatLegacyCheckbox'],
 'legacy-radio':['MatLegacyRadioButton'],
 'legacy-slide-toggle':['MatLegacySlideToggle'],
 'legacy-slider':['MatLegacySlider'],
 'legacy-chips':['MatLegacyChip'],
 'legacy-select':['MatLegacySelect'],
 'legacy-tabs':['MatLegacyTabLink','_MatLegacyTabLinkBase'],
};
const family=arg('--family');
const families=family==='legacy-controls'?['legacy-checkbox','legacy-radio','legacy-slide-toggle','legacy-slider']:[family];
const peerRoot=resolve(process.env.CLOSEOUT_DIAGNOSTIC_PEER_ROOT||root);
const originalRoot=resolve(arg('--reference-root')||join(peerRoot,'artifacts/local/ref-material-16.2.14/src/material'));
const surface=deriveSurface(originalRoot),allClasses=process.argv.includes('--all-family-classes');
const ids=new Set(allClasses?surface.symbols.filter(symbol=>families.includes(symbol.family)&&symbol.kind==='primary'
 &&symbol.di_id&&!symbol.shape.token).map(symbol=>symbol.symbol_id)
 :families.flatMap(name=>(selected[name]||[]).map(symbol=>name+'/primary/'+symbol)));
if(!ids.size||families.some(name=>allClasses?!surface.symbols.some(symbol=>symbol.family===name):!Object.hasOwn(selected,name))){
 console.error('An exact supported --family with a nonempty original class selection is required.');process.exit(2);
}
const ts=require('typescript'),esbuild=require('esbuild'),url=spec=>pathToFileURL(require.resolve(spec)).href;
const load=spec=>import(url(spec));
const cli=await load('@angular/compiler-cli');
const sourceRoot=join(root,'projects/ngx-material-legacy');
const temp=mkdtempSync(join(tmpdir(),'api-attribute-family-'));
try{
 const output=join(temp,'emitted'),runtime=join(temp,'runtime');
 mkdirSync(join(runtime,'fesm2022'),{recursive:true});
 symlinkSync(join(peerRoot,'node_modules'),join(temp,'node_modules'),'dir');
 const config=JSON.parse(readFileSync(join(sourceRoot,'tsconfig.lib.json'),'utf8'));
 const configured=ts.convertCompilerOptionsFromJson(config.compilerOptions,sourceRoot);
 if(configured.errors.length)throw Error(cli.formatDiagnostics(configured.errors));
 const options={...configured.options,rootDir:sourceRoot,outDir:output,declaration:false,declarationMap:false,
  sourceMap:false,inlineSources:false,
  paths:{'@ngx-compat/material-legacy/*':[join(sourceRoot,'*/public-api.ts')]},...config.angularCompilerOptions};
 const host=cli.createCompilerHost({options}),resources=new Set();
 const readFile=host.readFile.bind(host);
 host.readFile=file=>{if(file.startsWith(sourceRoot+'/')&&/\.(html|scss|css)$/.test(file))resources.add(file);return readFile(file);};
 const readResource=host.readResource?.bind(host);
 if(readResource)host.readResource=file=>{resources.add(file);return readResource(file);};
 host.resolveModuleNames=(names,containing)=>names.map(spec=>ts.resolveModuleName(spec,
  spec.startsWith('.')||spec.startsWith('@ngx-compat/')?containing:join(peerRoot,'diagnostic-anchor.ts'),options,ts.sys).resolvedModule);
 const program=cli.createProgram({rootNames:families.map(name=>join(sourceRoot,name,'public-api.ts')),options,host});
 const diagnostics=cli.defaultGatherDiagnostics(program);
 if(diagnostics.length)throw Error(cli.formatDiagnostics(diagnostics));
 assert.equal(program.emit().emitSkipped,false);
 const ownedFiles=program.getTsProgram().getSourceFiles().filter(file=>file.fileName.startsWith(sourceRoot+'/'));
 const files=ownedFiles.filter(file=>existsSync(file.fileName));
 const virtualFiles=ownedFiles.filter(file=>!existsSync(file.fileName));
 const emittedFamilies=new Set(files.map(file=>file.fileName.slice(sourceRoot.length+1).split('/')[0]));
 for(const ownedFamily of emittedFamilies){
  const entry=join(output,ownedFamily,'public-api.js');if(!existsSync(entry))continue;
  await esbuild.build({entryPoints:[entry],outfile:join(runtime,'fesm2022',`ngx-compat-material-legacy-${ownedFamily}.mjs`),
   bundle:true,format:'esm',platform:'node',target:'es2022',keepNames:false,
   external:['@angular/*','rxjs','rxjs/*'],plugins:[{name:'unchanged-owned-family-runtime',setup(build){
    build.onResolve({filter:/^@ngx-compat\/material-legacy\//},args=>({
     path:pathToFileURL(join(runtime,'fesm2022',`ngx-compat-material-legacy-${args.path.split('/').at(-1)}.mjs`)).href,external:true,
    }));
   }}]});
 }
 await load('@angular/compiler');const core=await load('@angular/core');
 if(arg('--source-out'))writeFileSync(arg('--source-out'),readFileSync(join(runtime,'fesm2022',`ngx-compat-material-legacy-${family}.mjs`)));
 const symbols=surface.symbols.map(symbol=>({...symbol,di_id:ids.has(symbol.symbol_id)?symbol.di_id:null}));
 assert.equal(symbols.filter(symbol=>symbol.di_id).length,ids.size,'Original selection incomplete');
 const rows=(await observeRuntimeDi(runtime,symbols,[],load)).map(row=>settleDi(row,[]));
 const configurationCases=[];
 if(families.includes('legacy-core')){
  const owned=await loadRuntimeModule(runtime,'legacy-core','primary'),Type=owned.MatLegacyPseudoCheckbox;
  for(const [mode,disabled]of [[undefined,false],['BrowserAnimations',false],['NoopAnimations',true]]){
   const manual=new Type(mode);assert.equal(manual._animationMode,mode);assert.equal(manual._animationsDisabled,disabled);
   manual._animationMode=mode==='NoopAnimations'?'BrowserAnimations':'NoopAnimations';
   assert.equal(manual._animationsDisabled,!disabled);
   configurationCases.push({id:'pseudo-manual-constructor-and-mutable-mode/'+(mode??'absent'),result:'pass'});
  }
  for(const mode of ['BrowserAnimations','NoopAnimations']){
   const context=await createPublicFactoryContext(core,load,{providers:[{provide:core.ANIMATION_MODULE_TYPE,useValue:mode}]});
   try{
    const observed=runFactory(Type.ɵfac,core.Injector,core.runInInjectionContext,{injector:context.element.injector});
    assert.equal(observed.outcome,'returned',observed.error);assert.ok(observed.value instanceof Type);
    assert.equal(observed.value._animationMode,mode);assert.equal(observed.value._animationsDisabled,mode==='NoopAnimations');
    configurationCases.push({id:'pseudo-actual-factory-injected-mode/'+mode,result:'pass'});
    const element=context.document.createElement('mat-pseudo-checkbox');context.document.body.appendChild(element);
    const component=core.createComponent(Type,{hostElement:element,environmentInjector:context.environment});
    try{
     component.setInput('state','checked');component.setInput('disabled',true);component.changeDetectorRef.detectChanges();
     assert.ok(element.classList.contains('mat-pseudo-checkbox'));
     assert.ok(element.classList.contains('mat-pseudo-checkbox-checked'));
     assert.ok(element.classList.contains('mat-pseudo-checkbox-disabled'));
     assert.equal(element.classList.contains('_mat-animation-noopable'),mode==='NoopAnimations');
     component.setInput('state','indeterminate');component.setInput('disabled',false);component.setInput('appearance','minimal');component.changeDetectorRef.detectChanges();
     assert.ok(element.classList.contains('mat-pseudo-checkbox-indeterminate'));
     assert.ok(element.classList.contains('mat-pseudo-checkbox-minimal'));
     assert.equal(element.classList.contains('mat-pseudo-checkbox-checked'),false);
     assert.equal(element.classList.contains('mat-pseudo-checkbox-disabled'),false);
     configurationCases.push({id:'pseudo-actual-component-host-state-and-owned-view-lifecycle/'+mode,result:'pass'});
    }finally{component.destroy();}
    assert.equal(context.component.hostView.destroyed,false);assert.equal(context.environment.destroyed,false);
   }finally{context.close();}
  }
 }
 for(const row of rows.filter(row=>['legacy-tabs/primary/MatLegacyTabLink','legacy-tabs/primary/_MatLegacyTabLinkBase'].includes(row.symbol.symbol_id))){
  if(row.result!=='pass')continue;
  for(const [id,change]of [
   ['missing-parent',r=>r.factory_parent_construction=null],
   ['wrong-parent-instance',r=>r.factory_parent_construction.returned_owned_instance=false],
   ['wrong-parent-node',r=>r.factory_parent_construction.parent_node='child element'],
   ['unverified-parent-input',r=>r.factory_parent_construction.constructor_evidence[0].input_verified=false],
   ['wrong-parent-injection-flag',r=>r.factory_parent_construction.compiler_observation.parameters[0].skipSelf=true],
  ]){
   const mutant=JSON.parse(JSON.stringify(row));mutant.problems=[];change(mutant);
   assert.equal(settleDi(mutant,[]).result,'fail',row.symbol.symbol_id+' '+id+' admitted');
   configurationCases.push({id:row.symbol.symbol_id+'/'+id,result:'rejected'});
  }
 }
 if(families.includes('legacy-select')){
  const owned=await loadRuntimeModule(runtime,'legacy-select','primary'),peer=await load('@angular/material/select');
  const field=await loadRuntimeModule(runtime,'legacy-form-field','primary'),modernField=await load('@angular/material/form-field');
  const original={ident:'MAT_FORM_FIELD',imported:'MAT_FORM_FIELD',spec:'@angular/material/form-field'};
  assert.equal(await runtimeTokenIdentity('legacy-select',original,{}, {},field.MAT_LEGACY_FORM_FIELD,load,runtime),true);
  for(const [id,token,packageRoot]of [
   ['modern-form-field-token',modernField.MAT_FORM_FIELD,runtime],
   ['description-twin-form-field-token',new core.InjectionToken('MatFormField'),runtime],
   ['missing-owned-form-field-package',field.MAT_LEGACY_FORM_FIELD,null],
  ]){
   assert.equal(await runtimeTokenIdentity('legacy-select',original,{}, {},token,load,packageRoot),false);
   configurationCases.push({id,result:'rejected'});
  }
  const select=rows.find(row=>row.symbol.symbol_id==='legacy-select/primary/MatLegacySelect');
  if(select.result==='pass')for(const [id,change]of [
   ['missing-motion-evidence',r=>r.factory_owned_motion_context=null],
   ['missing-motion-caller-source',r=>r.factory_owned_motion_context.sources.caller.sha256=''],
   ['wrong-component-motion-state',r=>r.factory_owned_motion_context.component_enabled=!r.factory_owned_motion_context.component_enabled],
   ['wrong-motion-token-identity',r=>r.factory_owned_motion_context.requests[0].identity_matched=false],
   ['wrong-motion-option',r=>r.factory_owned_motion_context.control_requests[0].self=true],
   ['missing-motion-state-branch',r=>r.factory_owned_motion_context.cases.pop()],
   ['wrong-motion-media-query',r=>r.factory_owned_motion_context.cases[5].queries[0]='screen'],
   ['wrong-motion-disabled-result',r=>r.factory_owned_motion_context.cases[3].disabled=false],
   ['missing-motion-disabled-requests',r=>r.factory_owned_motion_context.cases[3].disabled_requests=[]],
  ]){
   const mutant=JSON.parse(JSON.stringify(select));mutant.problems=[];change(mutant);
   assert.equal(settleDi(mutant,[]).result,'fail',id+' admitted');
   configurationCases.push({id,result:'rejected'});
  }
  assert.ok(owned.MAT_LEGACY_SELECT_SCROLL_STRATEGY!==peer.MAT_SELECT_SCROLL_STRATEGY,'Legacy strategy token still aliases modern token');
  assert.ok(owned.MAT_LEGACY_SELECT_SCROLL_STRATEGY_PROVIDER.provide===owned.MAT_LEGACY_SELECT_SCROLL_STRATEGY,'Public strategy and module provider disagree');
  const {Overlay}=await load('@angular/cdk/overlay');let calls=0,captured,traced;
  const context=await createPublicFactoryContext(core,load,{providers:[core.importProvidersFrom(owned.MatLegacySelectModule),
   {provide:owned.MAT_LEGACY_SELECT_SCROLL_STRATEGY,useFactory:overlay=>()=>{calls++;return overlay.scrollStrategies.noop();},deps:[Overlay]}],
   nodeFactory:node=>{traced=runFactory(()=>captureFactoryConstructorInputs(owned.MatLegacySelect),core.Injector,core.runInInjectionContext,
    {injector:node.injector,captureStack:true});assert.equal(traced.outcome,'returned',traced.error);captured=traced.value;return captured.value;}});
  try{
   assert.equal(calls,1,'Public custom scroll strategy was not consumed exactly once');
   assert.ok(captured.inputs[11]===context.element.injector.get(owned.MAT_LEGACY_SELECT_SCROLL_STRATEGY),'Wrong public strategy provider value reached constructor');
   const motion=await loadRuntimeModule(runtime,'legacy-core','primary'),layout=await load('@angular/cdk/layout'),material=await load('@angular/material/core');
   const split=requests=>partitionOwnedSelectMotion(requests,core,motion,layout,material,owned.MatLegacySelect,
    {core:join(runtime,'fesm2022/ngx-compat-material-legacy-legacy-core.mjs'),caller:join(runtime,'fesm2022/ngx-compat-material-legacy-legacy-select.mjs')},
    runFactory,context.element.injector,captured.value);
   const actual=split(traced.requests);
   assert.equal(actual.observation.classified_requests,4);
   for(const [id,change]of [
    ['motion-description-twin-request',r=>r.token=new core.InjectionToken('LEGACY_ANIMATIONS_TEST_OVERRIDE')],
    ['motion-wrong-request-option',r=>r.optional=false],
    ['motion-unresolved-actual-request',r=>r.unresolved=true],
    ['motion-missing-source-origin',r=>r.stack=null],
   ]){
    const requests=traced.requests.map(r=>({...r}));change(requests.find(r=>r.token===motion.LEGACY_ANIMATIONS_TEST_OVERRIDE));
    assert.throws(()=>split(requests),/owned motion request/);
    configurationCases.push({id,result:'rejected'});
   }
   const direct=runFactory(()=>core.inject(motion.LEGACY_ANIMATIONS_TEST_OVERRIDE,{optional:true}),core.Injector,core.runInInjectionContext,
    {injector:context.element.injector,captureStack:true});
   const extra=split([...traced.requests,...direct.requests]);
   assert.equal(extra.requests.length,actual.requests.length+1);
   assert.ok(extra.requests.at(-1)===direct.requests[0]);
   configurationCases.push({id:'same-owned-motion-token-direct-request-remains-unclassified',result:'rejected'});
   captured.value.ngOnDestroy();
   configurationCases.push({id:'legacy-public-strategy-identity-and-real-overlay-custom-provider',result:'pass'});
  }finally{context.close();}
 }
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 const caps=[...new Set([...files.map(file=>file.fileName),...resources])].sort().map(file=>({path:file.startsWith(root+'/')?file.slice(root.length+1):file,sha256:sha(readFileSync(file))}));
 const result={schema_version:1,role:'Unchanged owned source partial compilation and family constructor API observation; not canonical packed/style/native/floor qualification',
  family,families,node:process.version,typescript:ts.version,runtime_peer:core.VERSION.full,rows,configuration_cases:configurationCases,
  selection:allClasses?'all authenticated original primary factory classes in the exact family':'finite historical attribute constructor selection',
  source_files:files.length,resource_files:resources.size,source_caps:caps,virtual_typecheck_files:virtualFiles.length,
  styles:'Original SCSS resources are read unchanged by the Angular compiler. No Sass transform/rendered/style compatibility is claimed.',
  product_source_or_resource_rewrites:false,actual21_execution:false,packed_execution:false,native_browser_execution:false,g02_claim:'not-passed'};
 if(arg('--out'))writeFileSync(arg('--out'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({family,source_files:files.length,resources:resources.size,results:rows.map(row=>({symbol:row.symbol.symbol_id,result:row.result,problems:row.problems}))},null,2));
 if(rows.some(row=>row.result!=='pass'))process.exitCode=1;
}finally{rmSync(temp,{recursive:true,force:true});}
