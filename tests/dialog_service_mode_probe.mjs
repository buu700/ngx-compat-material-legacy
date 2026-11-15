/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
import {deriveSurface} from '../scripts/api-surface.mjs';import {createPublicFactoryContext} from '../scripts/api-public-node-context.mjs';import {captureFactoryConstructorInputs} from '../scripts/api-factory-constructor-inputs.mjs';import {loadRuntimeModule,runFactory} from '../scripts/api-di-observe.mjs';
import {DIALOG_SERVICE_MODE_SYMBOL,observeDialogServiceMode,challengeDialogServiceMode,dialogServiceModeProblems} from '../scripts/api-dialog-service-mode-context.mjs';
const arg=n=>process.argv[process.argv.indexOf(n)+1];const root=resolve(arg('--package-root')),ref=resolve(arg('--reference-root')),artifact={tarball:resolve(arg('--tarball'))};
const require=createRequire(import.meta.url),load=s=>import(pathToFileURL(require.resolve(s)).href);await load('@angular/compiler');const core=await load('@angular/core'),material=await load('@angular/material/core'),owned={core:await loadRuntimeModule(root,'legacy-core','primary'),dialog:await loadRuntimeModule(root,'legacy-dialog','primary')};
const symbol=deriveSurface(ref).symbols.find(s=>s.symbol_id===DIALOG_SERVICE_MODE_SYMBOL),Type=owned.dialog.MatLegacyDialog;
let cases=0,negative=0;
for(const [id,providers,want] of [['default',[],null],['noop',[{provide:owned.core.LEGACY_ANIMATION_MODE,useValue:'NoopAnimations'}],'NoopAnimations'],['browser',[{provide:owned.core.LEGACY_ANIMATION_MODE,useValue:'BrowserAnimations'}],'BrowserAnimations'],['old-only',[{provide:core.ANIMATION_MODULE_TYPE,useValue:'NoopAnimations'}],null]]){
 const fixture=await createPublicFactoryContext(core,load,{providers:[core.importProvidersFrom(owned.dialog.MatLegacyDialogModule),...providers]});let result;
 try{
  result=runFactory(()=>captureFactoryConstructorInputs(Type),core.Injector,core.runInInjectionContext,{injector:fixture.element.injector,captureStack:true});assert.equal(result.outcome,'returned',result.error);
  const evidence=observeDialogServiceMode(symbol,Type,owned,core,material,result.value,result.requests,fixture,root,artifact);assert.equal(evidence.raw_mode,want);challengeDialogServiceMode(evidence,result.value.value,Type,result.value,fixture,core,owned);cases++;
  assert.throws(()=>observeDialogServiceMode(symbol,Type,owned,core,material,result.value,result.requests,fixture,root,{tarball:resolve(root,'package.json')}));negative++;
  for(const mutate of [r=>r.requests.find(q=>q.token===owned.core.LEGACY_ANIMATION_MODE).token=core.ANIMATION_MODULE_TYPE,r=>r.requests.find(q=>q.token===owned.core.LEGACY_ANIMATION_MODE).optional=false,r=>r.capture.inputs[7]='forged',r=>r.capture.value._animationMode='forged']){
   const copy={requests:result.requests.map(q=>({...q})),capture:{...result.value,inputs:[...result.value.inputs],value:result.value.value}};const saved=copy.capture.value._animationMode;mutate(copy);assert.throws(()=>observeDialogServiceMode(symbol,Type,owned,core,material,copy.capture,copy.requests,fixture,root,artifact));copy.capture.value._animationMode=saved;negative++;
  }
  for(const mutant of [()=>false,()=>true,config=>result.value.value._animationMode==='NoopAnimations']){const prior=result.value.value._animationsDisabled;result.value.value._animationsDisabled=mutant;try{assert.throws(()=>challengeDialogServiceMode(structuredClone(evidence),result.value.value,Type,result.value,fixture,core,owned));negative++;}finally{result.value.value._animationsDisabled=prior;}}
  if(id==='noop'){class Content{}core.Component({standalone:true,selector:'dialog-service-mode-probe',template:'<p>mode probe</p>'})(Content);const ref=result.value.value.open(Content,{autoFocus:false,restoreFocus:false,hasBackdrop:false,scrollStrategy:{attach(){},enable(){},disable(){}},enterAnimationDuration:0,exitAnimationDuration:0});assert.ok(ref instanceof owned.dialog.MatLegacyDialogRef);assert.ok(result.value.value.openDialogs.includes(ref));ref.close();await Promise.resolve();await Promise.resolve();assert.equal(result.value.value.openDialogs.includes(ref),false);assert.equal(fixture.component.hostView.destroyed,false);}
  const bad=structuredClone(evidence);bad.behavior.cases.pop();const row={symbol,factory_outcome:'returned',factory_dialog_service_mode_context:bad,runtime_requests:[]};assert.ok(dialogServiceModeProblems(row,artifact).length);negative++;
  result.value.value.ngOnDestroy();assert.equal(fixture.component.hostView.destroyed,false);assert.equal(fixture.environment.destroyed,false);
 }finally{fixture.close();}
}
console.log(JSON.stringify({cases,negative,public_open_cdk_boundary:true,actual_browser:false}));
