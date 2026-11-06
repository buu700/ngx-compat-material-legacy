/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned source, Angular injection and a fake CDK dialog; not native rendering. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),ts=require('typescript');
const url=name=>pathToFileURL(require.resolve(name)).href;
await import(url('@angular/compiler'));
const core=await import(url('@angular/core'));
const {Dialog}=await import(url('@angular/cdk/dialog'));
const {MediaMatcher}=await import(url('@angular/cdk/layout'));
const {MATERIAL_ANIMATIONS}=await import(url('@angular/material/core'));
const {Subject}=await import(url('rxjs'));
const basePath=resolve(root,'projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts');
const helperPath=resolve(root,'projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts');
const original=readFileSync(basePath,'utf8'),helper=readFileSync(helperPath,'utf8');
function emit(raw){return ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText.replace(/(['"])(@angular\/[^'"]+|rxjs(?:\/operators)?)\1/g,(_,q,name)=>JSON.stringify(url(name)));}
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const helperUrl=data(emit(helper));
async function load(source){const js=emit(source).replaceAll("'@ngx-compat/material-legacy/legacy-core'",JSON.stringify(helperUrl));return (await import(data(js)))._MatDialogBase;}
function fixture(Base,{manual=false,animationMode,rootProviders=[]}={}){
 const options=[],refs=[],reduced={value:false};let dialogCalls=0;
 class Ref {constructor(_cdk,config){this.id=config.id;this.closed=new Subject();refs.push(this);}updatePosition(){}afterClosed(){return this.closed;}close(){this.closed.next();this.closed.complete();}}
 const dialog={open(_component,config){dialogCalls++;options.push(config);config.providers({},config,{});return {componentInstance:{}};}};
 const matcher={matchMedia(query){return {matches:query==='(prefers-reduced-motion)'&&reduced.value};}};
 const injector=core.Injector.create({providers:[{provide:Dialog,useValue:dialog},{provide:MediaMatcher,useValue:matcher},...rootProviders]});
 const overlay={position(){return {global(){return {centerHorizontally(){return this;},centerVertically(){return this;}}}}}};
 const args=[overlay,injector,{},undefined,{},()=>({}),Ref,class Container{},new core.InjectionToken('data'),animationMode];
 const service=manual?new Base(...args):core.runInInjectionContext(injector,()=>new Base(...args));
 return {service,injector,reduced,options,refs,get dialogCalls(){return dialogCalls;},destroy(){service.ngOnDestroy();injector.destroy();}};
}
const child=(parent,value)=>core.Injector.create({parent,providers:[{provide:MATERIAL_ANIMATIONS,useValue:{animationsDisabled:value}}]});
function check(Base){
 let f=fixture(Base);try{
  let count=0, allClosed=0;f.service.afterOpened.subscribe(()=>count++);f.service.afterAllClosed.subscribe(()=>allClosed++);
  for(const [flag,expect] of [[false,undefined],[true,true],[false,undefined]]){f.reduced.value=flag;let ref=f.service.open(class{});assert.equal(f.options.at(-1).disableAnimations,expect);assert.equal(f.service.openDialogs.length,1);ref.close();assert.equal(f.service.openDialogs.length,0);}
  assert.equal(count,3);assert.equal(f.dialogCalls,3);assert.equal(allClosed,4);
  const enabledConfig={disableAnimations:true};let explicit=f.service.open(class{},enabledConfig);assert.equal(f.options.at(-1).disableAnimations,true);assert.deepEqual(enabledConfig,{disableAnimations:true});explicit.close();
  f.reduced.value=true;const disabledConfig={disableAnimations:false};explicit=f.service.open(class{},disabledConfig);assert.equal(f.options.at(-1).disableAnimations,true);assert.deepEqual(disabledConfig,{disableAnimations:false});explicit.close();f.reduced.value=false;
  let off=child(f.injector,true),on=child(f.injector,false);
  try{for(const [config,expected] of [[{viewContainerRef:{injector:off}},true],[{viewContainerRef:{injector:on}},undefined],[{viewContainerRef:{injector:off},injector:on},undefined],[{viewContainerRef:{injector:on},injector:off},true],[{},undefined]]){let ref=f.service.open(class{},config);assert.equal(f.options.at(-1).disableAnimations,expected);ref.close();}}finally{off.destroy();on.destroy();}
  const failure=Error('policy-provider-exploded');let bad=core.Injector.create({parent:f.injector,providers:[{provide:MATERIAL_ANIMATIONS,useFactory(){throw failure;}}]});
  try{let n=f.dialogCalls;assert.throws(()=>f.service.open(class{},{injector:bad}),e=>e===failure);assert.equal(f.dialogCalls,n);assert.equal(f.service.openDialogs.length,0);}finally{bad.destroy();}
 }finally{f.destroy();}
 for(const rootDisabled of [true,false]){f=fixture(Base,{rootProviders:[{provide:MATERIAL_ANIMATIONS,useValue:{animationsDisabled:rootDisabled}}]});try{let ref=f.service.open(class{});assert.equal(f.options.at(-1).disableAnimations,rootDisabled?true:undefined);ref.close();let opposite=child(f.injector,!rootDisabled);try{ref=f.service.open(class{},{viewContainerRef:{injector:opposite}});assert.equal(f.options.at(-1).disableAnimations,rootDisabled?undefined:true);ref.close();}finally{opposite.destroy();}}finally{f.destroy();}}
 f=fixture(Base,{rootProviders:[{provide:core.ANIMATION_MODULE_TYPE,useValue:'NoopAnimations'},{provide:MATERIAL_ANIMATIONS,useValue:{animationsDisabled:false}}]});try{let ref=f.service.open(class{});assert.equal(f.options.at(-1).disableAnimations,true);ref.close();}finally{f.destroy();}
 for(const [mode,expected] of [['NoopAnimations',true],['BrowserAnimations',undefined]]){f=fixture(Base,{manual:true,animationMode:mode});try{let ref=f.service.open(class{});assert.equal(f.options.at(-1).disableAnimations,expected);ref.close();}finally{f.destroy();}}
}
check(await load(original));
const mutants=[
 ['missing propagation',s=>s.replace("      ...(this._animationsDisabled(config) ? {disableAnimations: true} : {}),\n",'')],
 ['config can override disabled policy',s=>s.replace("      ...config,\n      ...(this._animationsDisabled(config) ? {disableAnimations: true} : {}),","      ...(this._animationsDisabled(config) ? {disableAnimations: true} : {}),\n      ...config,")],
 ['frozen media',s=>s.replace('runInInjectionContext(injector, legacyAnimationsDisabled)','false')],
 ['service injector only',s=>s.replace('config.injector || config.viewContainerRef?.injector || this._injector','this._injector')],
 ['explicit noop removed',s=>s.replace("this._animationMode === 'NoopAnimations'",'false')],
 ['provider error swallowed',s=>s.replace('return runInInjectionContext(injector, legacyAnimationsDisabled);','try { return runInInjectionContext(injector, legacyAnimationsDisabled); } catch { return false; }')],
];
for(const [name,mutate] of mutants){let changed=mutate(original);assert.notEqual(changed,original,`${name} mutant did not apply`);let rejected=false;try{check(await load(changed));}catch{rejected=true;}assert.ok(rejected,`${name} mutant survived`);}
console.log(JSON.stringify({result:'pass',scope:'owned-source policy, fake CDK lifecycle, not browser',mutants:mutants.map(x=>x[0])}));
