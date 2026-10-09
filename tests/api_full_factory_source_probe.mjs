/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** All original factory classes from unchanged sources;no packed/native/floor credit. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {deriveSurface} from '../scripts/api-surface.mjs';
import {observeRuntimeDi,observePublicNodeFactory,loadRuntimeModule,runFactory} from '../scripts/api-di-observe.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';
import {createPublicFactoryContext} from '../scripts/api-public-node-context.mjs';
import {captureFactoryConstructorInputs} from '../scripts/api-factory-constructor-inputs.mjs';
import {requiredParentFactoryProfile} from '../scripts/api-required-parent-context.mjs';
import {callerConfigProfile,callerConfigObservationProblems} from '../scripts/api-caller-config-context.mjs';
import {ownedDialogFocusObservationProblems} from '../scripts/api-owned-dialog-focus-context.mjs';
import {SNACK_MOTION_SYMBOL,FORM_FIELD_MOTION_SYMBOL,MENU_MOTION_SYMBOL,TOOLTIP_MOTION_SYMBOL,DIALOG_MOTION_SYMBOL,ownedMotionProfile,ownedSelectMotionProblems} from '../scripts/api-owned-motion-context.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const arg=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:null;
const peerRoot=resolve(process.env.CLOSEOUT_DIAGNOSTIC_PEER_ROOT||root);
const originalRoot=resolve(arg('--reference-root')||join(peerRoot,'artifacts/local/ref-material-16.2.14/src/material'));
const surface=deriveSurface(originalRoot),selected=surface.symbols.filter(s=>s.di_id&&!s.shape.token);
assert.equal(selected.length,154,'Complete untouched16 factory class population changed');
assert.equal(new Set(selected.map(s=>s.symbol_id)).size,154);
const selectedIds=new Set(selected.map(s=>s.symbol_id));
const entries=[...new Set(selected.map(s=>s.family+(s.kind==='testing'?'/testing':'')))].sort();
const ts=require('typescript'),esbuild=require('esbuild'),load=spec=>import(pathToFileURL(require.resolve(spec)).href);
const cli=await load('@angular/compiler-cli'),sourceRoot=join(root,'projects/ngx-material-legacy');
const temp=mkdtempSync(join(tmpdir(),'api-full-factory-source-'));
try{
 const output=join(temp,'emitted'),runtime=join(temp,'runtime');mkdirSync(join(runtime,'fesm2022'),{recursive:true});
 symlinkSync(join(peerRoot,'node_modules'),join(temp,'node_modules'),'dir');
 const config=JSON.parse(readFileSync(join(sourceRoot,'tsconfig.lib.json'),'utf8'));
 const configured=ts.convertCompilerOptionsFromJson(config.compilerOptions,sourceRoot);
 if(configured.errors.length)throw Error(cli.formatDiagnostics(configured.errors));
 const options={...configured.options,rootDir:sourceRoot,outDir:output,declaration:false,declarationMap:false,
  sourceMap:false,inlineSources:false,paths:{'@ngx-compat/material-legacy/*':[join(sourceRoot,'*/public-api.ts')]},...config.angularCompilerOptions};
 const host=cli.createCompilerHost({options}),resources=new Set(),readFile=host.readFile.bind(host),readResource=host.readResource?.bind(host);
 host.readFile=file=>{if(file.startsWith(sourceRoot+'/')&&/\.(html|scss|css)$/.test(file))resources.add(file);return readFile(file);};
 if(readResource)host.readResource=file=>{resources.add(file);return readResource(file);};
 host.resolveModuleNames=(names,containing)=>names.map(spec=>ts.resolveModuleName(spec,
  spec.startsWith('.')||spec.startsWith('@ngx-compat/')?containing:join(peerRoot,'diagnostic-anchor.ts'),options,ts.sys).resolvedModule);
 const program=cli.createProgram({rootNames:entries.map(entry=>join(sourceRoot,entry,'public-api.ts')),options,host});
 const diagnostics=cli.defaultGatherDiagnostics(program);if(diagnostics.length)throw Error(cli.formatDiagnostics(diagnostics));
 assert.equal(program.emit().emitSkipped,false);
 const ownedFiles=program.getTsProgram().getSourceFiles().filter(file=>file.fileName.startsWith(sourceRoot+'/'));
 const files=ownedFiles.filter(file=>existsSync(file.fileName)),virtualFiles=ownedFiles.filter(file=>!existsSync(file.fileName));
 const checker=program.getTsProgram().getTypeChecker(),routes=[];
 const canonical=symbol=>symbol?.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(symbol):symbol;
 const publicExports=new Map(entries.map(entry=>{
  const file=program.getTsProgram().getSourceFile(join(sourceRoot,entry,'public-api.ts'));
  return [entry,new Map(checker.getExportsOfModule(checker.getSymbolAtLocation(file)).map(s=>[s.name,canonical(s)]))];
 }));
 for(const entry of entries){
  const file=join(output,entry,'public-api.js');assert.ok(existsSync(file),'Missing original entry '+entry);
  await esbuild.build({entryPoints:[file],outfile:join(runtime,'fesm2022',`ngx-compat-material-legacy-${entry.replaceAll('/','-')}.mjs`),
   bundle:true,format:'esm',platform:'node',target:'es2022',keepNames:false,external:['@angular/*','rxjs','rxjs/*'],
   plugins:[{name:'unchanged-owned-runtime',setup(build){
    const external=target=>({path:pathToFileURL(join(runtime,'fesm2022',`ngx-compat-material-legacy-${target.replaceAll('/','-')}.mjs`)).href,external:true});
    build.onResolve({filter:/^@ngx-compat\/material-legacy\//},args=>external(args.path.slice('@ngx-compat/material-legacy/'.length)));
    // Angular's multi-entry source compiler emits some metadata imports as
    // relative paths. Preserve secondary-entry singleton identities only when
    // every consumed binding is the identical public barrel export.
    build.onResolve({filter:/^\./},args=>{
     const target=resolve(dirname(args.importer),args.path),relative=target.slice(output.length+1);
     if(!target.startsWith(output+'/'))return;
     const other=entries.filter(e=>relative===e||relative.startsWith(e+'/')).sort((a,b)=>b.length-a.length)[0];
     if(!other||other===entry)return;
     const targetFile=existsSync(target+'.js')?target+'.js':join(target,'index.js');
     const originalFile=sourceRoot+targetFile.slice(output.length).replace(/\.js$/,'.ts');
     const original=program.getTsProgram().getSourceFile(originalFile);assert.ok(original,'Missing cross-entry source '+originalFile);
     const exports=new Map(checker.getExportsOfModule(checker.getSymbolAtLocation(original)).map(s=>[s.name,canonical(s)]));
     const importer=ts.createSourceFile(args.importer,readFileSync(args.importer,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
     const declarations=importer.statements.filter(s=>ts.isImportDeclaration(s)&&s.moduleSpecifier.text===args.path);assert.equal(declarations.length,1);
     const clause=declarations[0].importClause;assert.ok(clause?.namedBindings&&!clause.name,'Unsupported cross-entry default or side-effect import');
     const bindings=clause.namedBindings,names=new Set();
     if(ts.isNamedImports(bindings))for(const b of bindings.elements)names.add(b.propertyName?.text||b.name.text);
     else{
      const visit=n=>{if(ts.isPropertyAccessExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text===bindings.name.text)names.add(n.name.text);if(ts.isElementAccessExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text===bindings.name.text)throw Error('Computed cross-entry namespace access');ts.forEachChild(n,visit);};visit(importer);
     }
     assert.ok(names.size,'Cross-entry namespace has no identifiable public uses');
     for(const name of names)assert.ok(exports.has(name)&&exports.get(name)===publicExports.get(other).get(name),'Cross-entry binding is not the same public export: '+other+'#'+name);
     routes.push({from:entry,to:other,module:relative,bindings:[...names].sort(),same_public_export_symbols:true});return external(other);
    });
   }}]});
 }
 await load('@angular/compiler');const core=await load('@angular/core');
 const symbols=surface.symbols.map(symbol=>({...symbol,di_id:selectedIds.has(symbol.symbol_id)?symbol.di_id:null}));
 const rows=(await observeRuntimeDi(runtime,symbols,[],load)).map(row=>settleDi(row,[]));
 assert.equal(rows.length,154);assert.deepEqual(rows.map(r=>r.symbol.symbol_id).sort(),[...selectedIds].sort());
 const requiredParentControls=[];
 console.error("Required-parent controls: start");
 for(const symbol of selected.filter(s=>requiredParentFactoryProfile(s))){
  console.error("Required-parent controls: "+symbol.symbol_id);
  const profile=requiredParentFactoryProfile(symbol),row=rows.find(r=>r.symbol.symbol_id===symbol.symbol_id);
  assert.equal(row.result,'pass',row.problems.join('\n'));
  requiredParentControls.push({symbol_id:symbol.symbol_id,id:'actual-required-parent-construction-and-child-teardown',result:'pass',evidence:row.factory_required_parent_context});
  const owned=await loadRuntimeModule(runtime,symbol.family,'primary'),Type=owned[symbol.name];
  const missingHost=await createPublicFactoryContext(core,load,{providers:[core.importProvidersFrom(owned[profile.owner_module])]});
  try{
   const execution=runFactory(()=>captureFactoryConstructorInputs(Type),core.Injector,core.runInInjectionContext,{injector:missingHost.element.injector});
   assert.equal(execution.outcome,'threw');assert.ok(execution.requests.some(r=>r.unresolved));
   assert.equal(missingHost.component.hostView.destroyed,false);assert.equal(missingHost.environment.destroyed,false);
   requiredParentControls.push({symbol_id:symbol.symbol_id,id:'actual-missing-required-parent-rejected',result:'rejected',error:execution.error});
  }finally{missingHost.close();}
  for(const mutation of ['discard-constructor-type-override','replace-required-constructor-input']){
   console.error('Required-parent mutation: '+mutation);
   class Mutant extends Type{}
   Object.defineProperty(Mutant,'ɵfac',{value:Receiver=>mutation==='discard-constructor-type-override'
    ?Type.ɵfac(Mutant):Type.ɵfac(class extends Receiver{constructor(...inputs){inputs[profile.parameter_index]={};super(...inputs);}})});
   const execution=await observePublicNodeFactory(Mutant,core,runtime,symbol,symbols,load);
   assert.equal(execution.outcome,'threw','invalid constructor evidence was accepted');
   assert.equal(execution.requiredParentContext,undefined);
   requiredParentControls.push({symbol_id:symbol.symbol_id,id:mutation,result:'rejected',error:execution.error});
  }
  for(const destruction of ['destroy-borrowed-view',...(profile.owner_export==='MatLegacyChip'||profile.owner_export==='MatLegacySelectionList'?['destroy-borrowed-parent']:[])]){
   class Mutant extends Type{}
   Object.defineProperty(Mutant,'ɵfac',{value:Receiver=>{
    const detector=core.inject(core.ChangeDetectorRef),instance=Type.ɵfac(Receiver);
    instance.ngOnDestroy=()=>destruction==='destroy-borrowed-view'?detector.destroy():instance[profile.owner_export==='MatLegacyChip'?'_parentChip':'selectionList'].ngOnDestroy();
    return instance;
   }});
   const execution=await observePublicNodeFactory(Mutant,core,runtime,symbol,symbols,load);
   assert.equal(execution.outcome,'returned',execution.error);
   console.error('Required-parent lifetime: '+JSON.stringify({symbol:symbol.symbol_id,destruction,problems:execution.behaviorProblems,parent:execution.requiredParentContext.borrowed_parent_alive_after_child_teardown}));
   assert.match(execution.behaviorProblems.join('|'),/destroyed (the borrowed (fixture view|parent)|borrowed Angular node probes)/);
   assert.equal(execution.requiredParentContext.borrowed_parent_alive_after_child_teardown,false);
   requiredParentControls.push({symbol_id:symbol.symbol_id,id:destruction,result:'rejected',problems:execution.behaviorProblems});
  }
 }
 assert.equal(requiredParentControls.length,27);
 const callerConfigControls=[];
 for(const symbol of selected.filter(s=>callerConfigProfile(s))){
  console.error('Caller-config controls: '+symbol.symbol_id);
  const profile=callerConfigProfile(symbol),row=rows.find(r=>r.symbol.symbol_id===symbol.symbol_id);
  assert.equal(row.factory_outcome,'returned',row.factory_error);assert.deepEqual(callerConfigObservationProblems(row),[]);
  callerConfigControls.push({symbol_id:symbol.symbol_id,id:'actual-caller-config-construction-and-teardown',result:'pass',evidence:row.factory_caller_config_context,DI_settlement:row.result});
  const owned=await loadRuntimeModule(runtime,symbol.family,'primary'),Type=owned[symbol.name],peer=await load(profile.public_spec);
  const module=owned[symbol.family==='legacy-dialog'?'MatLegacyDialogModule':'MatLegacySnackBarModule'];
  const empty=await createPublicFactoryContext(core,load,{providers:[core.importProvidersFrom(module)]});
  try{
   const execution=runFactory(()=>captureFactoryConstructorInputs(Type),core.Injector,core.runInInjectionContext,{injector:empty.element.injector});
   const token=profile.token_export===profile.owner_export?owned[profile.owner_export]:peer[profile.public_export];
   assert.equal(execution.outcome,'threw');assert.ok(execution.requests.some(r=>r.token===token&&r.unresolved));
   callerConfigControls.push({symbol_id:symbol.symbol_id,id:'missing-required-caller-config-rejected',result:'rejected',error:execution.error});
  }finally{empty.close();}
  for(const mutation of ['discard-constructor-type-override','replace-caller-config-input','mutate-caller-config','cycle-caller-config-data']){
   class Mutant extends Type{}
   Object.defineProperty(Mutant,'ɵfac',{value:Receiver=>mutation==='discard-constructor-type-override'?Type.ɵfac(Mutant)
    :Type.ɵfac(class extends Receiver{constructor(...inputs){
     if(mutation==='replace-caller-config-input')inputs[profile.parameter_index]={};
     else if(mutation==='cycle-caller-config-data')inputs[profile.parameter_index].data=inputs[profile.element_index].nativeElement;
     else inputs[profile.parameter_index].data={case:'wrong-caller-data'};
     super(...inputs);
    }})});
   const execution=await observePublicNodeFactory(Mutant,core,runtime,symbol,symbols,load);
   assert.equal(execution.outcome,'threw','changed caller config was accepted');
   assert.ok(execution.error.length<1000,'constructor failure formatted a live Angular graph');
   callerConfigControls.push({symbol_id:symbol.symbol_id,id:mutation,result:'rejected',error:execution.error});
  }
  if(profile.overlay_index!==null){
   const constructorFactory=Receiver=>Type.ɵfac(class extends Receiver{constructor(...inputs){super(...inputs);this.ngOnDestroy=()=>inputs[profile.overlay_index].dispose();}});
   const execution=await observePublicNodeFactory(Type,core,runtime,symbol,symbols,load,{constructorFactory});
   assert.equal(execution.outcome,'returned',execution.error);
   assert.equal(execution.callerConfigContext.borrowed_overlay_alive_after_teardown,false);
   assert.ok(execution.behaviorProblems.includes('owned factory disposed the caller overlay reference'));
   callerConfigControls.push({symbol_id:symbol.symbol_id,id:'disposing-borrowed-overlay-rejected',result:'rejected',problems:execution.behaviorProblems});
  }
 }
 assert.equal(callerConfigControls.length,26);
 const dialogFocusControls=[];
 for(const name of ['MatLegacyDialogContainer','_MatLegacyDialogContainerBase']){
  const symbol=selected.find(s=>s.symbol_id==='legacy-dialog/primary/'+name),family=await loadRuntimeModule(runtime,'legacy-dialog','primary'),Type=family[name];
  const row=rows.find(r=>r.symbol.symbol_id===symbol.symbol_id);assert.equal(row.result,'pass',row.problems.join('\n'));
  assert.deepEqual(ownedDialogFocusObservationProblems(row),[]);
  dialogFocusControls.push({symbol_id:symbol.symbol_id,id:'actual-owned-focus-services-and-caller-view',result:'pass',evidence:row.factory_owned_dialog_focus_context});
  for(const mutation of ['unrelated-optional-request','different-renderer-value','fake-detector-protocol']){
   const constructorFactory=Receiver=>{
    if(mutation==='unrelated-optional-request')core.inject(core.ChangeDetectorRef,{optional:true});
    return Type.ɵfac(class extends Receiver{constructor(...inputs){super(...inputs);
     if(mutation==='different-renderer-value')this._legacyFocusRenderer={};
     if(mutation==='fake-detector-protocol')this._legacyChangeDetector={destroyed:false,destroy(){},markForCheck(){},detectChanges(){}};
    }});
   };
   const execution=await observePublicNodeFactory(Type,core,runtime,symbol,symbols,load,{constructorFactory});
   if(mutation==='unrelated-optional-request'){
    assert.equal(execution.outcome,'returned',execution.error);
    assert.equal(execution.requests.length,(name==='MatLegacyDialogContainer'?9:8)+1,'unclassified request was hidden');
    dialogFocusControls.push({symbol_id:symbol.symbol_id,id:mutation,result:'retained-unclassified-request',retained_requests:execution.requests.length});
   }else{
    assert.equal(execution.outcome,'threw','different service/detector was accepted');
    assert.match(execution.error,mutation==='different-renderer-value'?/service value differs/:/does not belong to the caller view/);
    dialogFocusControls.push({symbol_id:symbol.symbol_id,id:mutation,result:'rejected',error:execution.error});
   }
  }
 }
 assert.equal(dialogFocusControls.length,8);
 const snackSymbol=selected.find(s=>s.symbol_id===SNACK_MOTION_SYMBOL),snack=await loadRuntimeModule(runtime,'legacy-snack-bar','primary');
 const ownedCore=await loadRuntimeModule(runtime,'legacy-core','primary'),material=await load('@angular/material/core'),snackMotionControls=[];
 assert.equal(ownedCore.legacyAnimationsDisabled(),false);
 assert.throws(()=>ownedCore.getLegacyAnimationsState(),/injection context/);
 const invalidPolicy=core.Injector.create({providers:[{provide:ownedCore.LEGACY_ANIMATIONS_TEST_OVERRIDE,useFactory(){throw Error('controlled policy provider failure');}}]});
 try{assert.throws(()=>core.runInInjectionContext(invalidPolicy,ownedCore.legacyAnimationsDisabled),/controlled policy provider failure/);}finally{invalidPolicy.destroy();}
 for(const cell of [
  {id:'default-server-enabled',providers:[],enabled:true},
  {id:'override-enabled',providers:[{provide:ownedCore.LEGACY_ANIMATIONS_TEST_OVERRIDE,useValue:'enabled'}],enabled:true},
  {id:'override-disabled',providers:[{provide:ownedCore.LEGACY_ANIMATIONS_TEST_OVERRIDE,useValue:'di-disabled'}],enabled:false},
  {id:'override-reduced',providers:[{provide:ownedCore.LEGACY_ANIMATIONS_TEST_OVERRIDE,useValue:'reduced-motion'}],enabled:false},
  {id:'material-disabled',providers:[{provide:material.MATERIAL_ANIMATIONS,useValue:{animationsDisabled:true}}],enabled:false},
  {id:'noop-module',providers:[{provide:core.ANIMATION_MODULE_TYPE,useValue:'NoopAnimations'}],enabled:false},
 ]){
  const execution=await observePublicNodeFactory(snack.MatLegacySnackBarContainer,core,runtime,snackSymbol,symbols,load,{providers:cell.providers});
  assert.equal(execution.outcome,'returned',execution.error);assert.deepEqual(execution.behaviorProblems,[]);
  assert.deepEqual(ownedSelectMotionProblems(execution.ownedMotionContext,SNACK_MOTION_SYMBOL),[]);
  assert.equal(execution.value._animationsEnabled,cell.enabled);
  snackMotionControls.push({id:cell.id,result:'pass',enabled:cell.enabled,evidence:execution.ownedMotionContext});
 }
 const constructorMotionControls=[];
 const manualMotionObservations=[];
 const manualMotionLifecycle=[];
 for(const symbolId of [FORM_FIELD_MOTION_SYMBOL,MENU_MOTION_SYMBOL,TOOLTIP_MOTION_SYMBOL,DIALOG_MOTION_SYMBOL]){
  const symbol=selected.find(s=>s.symbol_id===symbolId),profile=ownedMotionProfile(symbolId),family=await loadRuntimeModule(runtime,symbol.family,'primary'),Type=family[symbol.name];
  const row=rows.find(r=>r.symbol.symbol_id===symbolId);assert.equal(row.result,'pass',row.problems.join('\n'));
  const module=family[symbol.family==='legacy-form-field'?'MatLegacyFormFieldModule':symbol.family==='legacy-menu'?'MatLegacyMenuModule':'MatLegacyTooltipModule'];
  for(const mode of symbolId===DIALOG_MOTION_SYMBOL?[]:[null,'NoopAnimations']){
   const f=await createPublicFactoryContext(core,load,{providers:[core.importProvidersFrom(module),{provide:core.ANIMATION_MODULE_TYPE,useValue:mode}]});
   let manual;
   try{
    const capture=runFactory(()=>captureFactoryConstructorInputs(Type),core.Injector,core.runInInjectionContext,{injector:f.element.injector});
    assert.equal(capture.outcome,'returned',capture.error);
    manual=new Type(...capture.value.inputs);
    const enabled=profile.enabled?manual[profile.property]:!manual[profile.property];
    assert.equal(enabled,profile.constructorAnimationIndex===undefined||mode!=='NoopAnimations');
    manualMotionObservations.push({symbol_id:symbolId,mode,outcome:'returned',enabled});
    if(symbolId===TOOLTIP_MOTION_SYMBOL){
     manual._tooltip=f.element.element;
     const hidden=[];let completed=false;const subscription=manual.afterHidden().subscribe({next:()=>hidden.push('hidden'),complete:()=>{completed=true;}});
     manual.show(0);await new Promise(resolve=>setTimeout(resolve,2));
     assert.equal(manual.isVisible(),true);assert.ok(f.element.element.nativeElement.classList.contains('mat-tooltip-show'));
     assert.equal(f.element.element.nativeElement.classList.contains('_mat-animation-noopable'),mode==='NoopAnimations');
     manual.hide(0);await new Promise(resolve=>setTimeout(resolve,2));assert.equal(manual.isVisible(),false);
     assert.equal(hidden.length,mode==='NoopAnimations'?1:0);
     manual.show(20);manual.ngOnDestroy();await new Promise(resolve=>setTimeout(resolve,25));
     assert.equal(manual.isVisible(),false);assert.equal(completed,true);subscription.unsubscribe();
     manualMotionLifecycle.push({symbol_id:symbolId,mode,show_hide_state:true,noop_class:mode==='NoopAnimations',pending_show_cancelled_on_destroy:true,completion:true});
     manual=null;
    }else if(symbolId===MENU_MOTION_SYMBOL){
     const states=[],subscription=manual._animationDone.subscribe(event=>states.push(event.toState));
     manual._startAnimation();assert.equal(manual._panelAnimationState,'enter');
     manual._onCssAnimationDone('mat-legacy-menu-enter');manual._onCssAnimationDone('mat-legacy-menu-enter');
     manual._resetAnimation();assert.equal(manual._panelAnimationState,'void');
     manual._onCssAnimationDone('mat-legacy-menu-exit');manual._onCssAnimationDone('mat-legacy-menu-exit');
     assert.deepEqual(states,['enter','void']);subscription.unsubscribe();
     manualMotionLifecycle.push({symbol_id:symbolId,mode,enter_exit_states:true,duplicate_completions_rejected:true});
    }
    capture.value.value.ngOnDestroy?.();manual?.ngOnDestroy?.();
    assert.equal(f.component.hostView.destroyed,false);assert.equal(f.environment.destroyed,false);
   }finally{f.close();}
  }
  for(const cell of [
   {id:'default-server-enabled',providers:[],enabled:true},
   {id:'override-enabled',providers:[{provide:ownedCore.LEGACY_ANIMATIONS_TEST_OVERRIDE,useValue:'enabled'}],enabled:true},
   {id:'override-disabled',providers:[{provide:ownedCore.LEGACY_ANIMATIONS_TEST_OVERRIDE,useValue:'di-disabled'}],enabled:false},
   {id:'override-reduced',providers:[{provide:ownedCore.LEGACY_ANIMATIONS_TEST_OVERRIDE,useValue:'reduced-motion'}],enabled:false},
   {id:'material-disabled',providers:[{provide:material.MATERIAL_ANIMATIONS,useValue:{animationsDisabled:true}}],enabled:false},
   {id:'noop-module',providers:[{provide:core.ANIMATION_MODULE_TYPE,useValue:'NoopAnimations'}],enabled:false},
   {id:'enabled-override-with-original-noop',providers:[{provide:ownedCore.LEGACY_ANIMATIONS_TEST_OVERRIDE,useValue:'enabled'},{provide:core.ANIMATION_MODULE_TYPE,useValue:'NoopAnimations'}],enabled:profile.constructorAnimationIndex===undefined},
  ]){
   const execution=await observePublicNodeFactory(Type,core,runtime,symbol,symbols,load,{providers:cell.providers});
   assert.equal(execution.outcome,'returned',execution.error);assert.deepEqual(execution.behaviorProblems,[]);
   assert.deepEqual(ownedSelectMotionProblems(execution.ownedMotionContext,symbolId),[]);
   assert.equal(profile.enabled?execution.value[profile.property]:!execution.value[profile.property],cell.enabled);
   constructorMotionControls.push({symbol_id:symbolId,id:cell.id,result:'pass',enabled:cell.enabled,evidence:execution.ownedMotionContext});
  }
 }
 assert.equal(constructorMotionControls.length,28);
 assert.equal(manualMotionObservations.length,6);
 assert.equal(manualMotionLifecycle.length,4);
 const ownedMenu=await loadRuntimeModule(runtime,'legacy-menu','primary'),peerMenu=await load('@angular/material/menu');
 const menuContext=await createPublicFactoryContext(core,load,{providers:[core.importProvidersFrom(ownedMenu.MatLegacyMenuModule)]});
 let menuItem;const publicParentControls=[];
 try{
  const host=menuContext.document.createElement('button');menuContext.document.body.appendChild(host);
  menuItem=core.createComponent(ownedMenu.MatLegacyMenuItem,{hostElement:host,environmentInjector:menuContext.environment});
  menuItem.changeDetectorRef.detectChanges();
  assert.ok(menuItem.instance instanceof ownedMenu.MatLegacyMenuItem&&menuItem.instance instanceof peerMenu.MatMenuItem);
  const request=runFactory(()=>core.inject(peerMenu.MatMenuItem,{self:true,optional:true}),core.Injector,core.runInInjectionContext,{injector:menuItem.injector});
  assert.equal(request.outcome,'returned',request.error);assert.equal(request.value,menuItem.instance);assert.equal(request.requests.length,1);
  assert.equal(request.requests[0].token,peerMenu.MatMenuItem);assert.equal(request.requests[0].self,true);assert.equal(request.requests[0].optional,true);
  assert.equal(menuItem.injector.get(ownedMenu.MatLegacyMenuItem),menuItem.instance);
  const twin=class MatMenuItem{};assert.equal(menuItem.injector.get(twin,null,{self:true,optional:true}),null);
  menuItem.destroy();menuItem=null;assert.equal(menuContext.component.hostView.destroyed,false);assert.equal(menuContext.environment.destroyed,false);
  publicParentControls.push({id:'actual-owned-menu-node-exposes-identical-public-parent',result:'pass',public_parent_instance:true,owned_node_provider_value_identical:true,self:true,optional:true,lookalike_token_rejected:true,borrowed_context_alive:true});
 }finally{menuItem?.destroy();menuContext.close();}
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 const caps=[...new Set([...files.map(file=>file.fileName),...resources])].sort().map(file=>({path:file.slice(root.length+1),sha256:sha(readFileSync(file))}));
 const result={schema_version:1,role:'All original154 factory class source observations;not canonical packed/native/browser/floor qualification',
  node:process.version,typescript:ts.version,runtime_peer:core.VERSION.full,entries,rows,selected_symbol_ids:[...selectedIds].sort(),emitted_public_import_routes:routes,public_parent_controls:publicParentControls,required_parent_controls:requiredParentControls,caller_config_controls:callerConfigControls,snack_motion_controls:snackMotionControls,constructor_motion_controls:constructorMotionControls,manual_motion_observations:manualMotionObservations,manual_motion_lifecycle:manualMotionLifecycle,dialog_focus_controls:dialogFocusControls,
  passed:rows.filter(row=>row.result==='pass').length,failed:rows.filter(row=>row.result!=='pass').length,
  source_files:files.length,resource_files:resources.size,source_caps:caps,virtual_typecheck_files:virtualFiles.length,
  styles:'SCSS/HTML resources read unchanged by Angular compiler;no Sass/rendered style qualification',
  product_source_or_resource_rewrites:false,actual21_execution:false,packed_execution:false,native_browser_execution:false,g02_claim:'not-passed',g11_claim:'not-passed'};
 if(arg('--out'))writeFileSync(arg('--out'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({passed:result.passed,failed:result.failed,source_files:result.source_files,resources:result.resource_files,
  failed_symbol_ids:rows.filter(row=>row.result!=='pass').map(row=>row.symbol.symbol_id)},null,2));
 if(result.failed)process.exitCode=1;
}finally{rmSync(temp,{recursive:true,force:true});}
