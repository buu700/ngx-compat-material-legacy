/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import '@angular/compiler';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import ts from 'typescript';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {ANIMATION_MODULE_TYPE, Injector, createEnvironmentInjector, runInInjectionContext} from '@angular/core';
import {MediaMatcher} from '@angular/cdk/layout';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
const dir=mkdtempSync(join(process.cwd(),'.legacy-animation-probe-'));
try {
 const output=join(dir,'helper.mjs');
 await build({entryPoints:['projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts'],outfile:output,bundle:true,packages:'external',platform:'node',format:'esm',logLevel:'silent'});
 const {LEGACY_ANIMATION_MODE, getLegacyAnimationsState, legacyAnimationsDisabled, resolveLegacyAnimationMode}=await import(pathToFileURL(output));
 assert.notEqual(LEGACY_ANIMATION_MODE,MATERIAL_ANIMATIONS);
 const run=(providers=[],reduced=false)=>{
  const injector=createEnvironmentInjector([{provide:MediaMatcher,useValue:{matchMedia:()=>({matches:reduced})}},...providers],Injector.NULL);
  try{return runInInjectionContext(injector,()=>({state:getLegacyAnimationsState(),disabled:legacyAnimationsDisabled(),mode:resolveLegacyAnimationMode('BrowserAnimations')}));}finally{injector.destroy();}
 };
 const config=Object.freeze({animationsDisabled:true});
 assert.deepEqual(run(),{state:'enabled',disabled:false,mode:'BrowserAnimations'});
 assert.deepEqual(run([],true),{state:'reduced-motion',disabled:true,mode:'NoopAnimations'});
 assert.deepEqual(run([{provide:MATERIAL_ANIMATIONS,useValue:config}]),{state:'di-disabled',disabled:true,mode:'NoopAnimations'});
 assert.deepEqual(run([{provide:LEGACY_ANIMATION_MODE,useValue:'NoopAnimations'}]),{state:'di-disabled',disabled:true,mode:'NoopAnimations'});
 assert.deepEqual(run([{provide:LEGACY_ANIMATION_MODE,useValue:'BrowserAnimations'},{provide:MATERIAL_ANIMATIONS,useValue:config}]),{state:'di-disabled',disabled:true,mode:'NoopAnimations'});
 assert.deepEqual(run([{provide:ANIMATION_MODULE_TYPE,useValue:'NoopAnimations'}]),{state:'enabled',disabled:false,mode:'BrowserAnimations'});
 assert.equal(resolveLegacyAnimationMode('NoopAnimations'),'NoopAnimations');
 assert.equal(resolveLegacyAnimationMode('BrowserAnimations'),'BrowserAnimations');
 assert.equal(legacyAnimationsDisabled(),false);
 // Real Angular injector precedence verifies the old-token counterfactual used
 // by the migration's conflict refusal, independent of the lexical rewriter.
 for(const [first,last] of [['NoopAnimations','BrowserAnimations'],['BrowserAnimations','NoopAnimations']]){
  const old=createEnvironmentInjector([{provide:ANIMATION_MODULE_TYPE,useValue:first},{provide:ANIMATION_MODULE_TYPE,useValue:last}],Injector.NULL);
  try{assert.equal(old.get(ANIMATION_MODULE_TYPE),last);}finally{old.destroy();}
 }
 for(const [first,last] of [[true,false],[false,true]]){
  const providers=[first,last].flatMap(disableAnimations=>BrowserAnimationsModule.withConfig({disableAnimations}).providers).filter(provider=>provider.provide===ANIMATION_MODULE_TYPE);
  assert.equal(providers.length,2);const old=createEnvironmentInjector(providers,Injector.NULL);
  try{assert.equal(old.get(ANIMATION_MODULE_TYPE),last?'NoopAnimations':'BrowserAnimations');}finally{old.destroy();}
 }
 assert.deepEqual(config,{animationsDisabled:true});
 const parent=createEnvironmentInjector([{provide:MediaMatcher,useValue:{matchMedia:()=>({matches:false})}},{provide:MATERIAL_ANIMATIONS,useValue:config}],Injector.NULL);
 const child=createEnvironmentInjector([{provide:MATERIAL_ANIMATIONS,useValue:Object.freeze({animationsDisabled:false})}],parent);
 try{assert.equal(runInInjectionContext(parent,getLegacyAnimationsState),'di-disabled');assert.equal(runInInjectionContext(child,getLegacyAnimationsState),'enabled');}finally{child.destroy();parent.destroy();}
 // Execute the owned nav-link constructor and lifecycle with a minimal base
 // protocol. This does not stand in for a rendered Angular component test.
 const source=readFileSync('projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts','utf8');
 const ast=ts.createSourceFile('tab-nav-bar-base.ts',source,ts.ScriptTarget.Latest,true);
 const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='_MatTabLinkBase');assert.ok(cls);
 const transformed=ts.transform(cls,[ctx=>node=>{const visit=n=>ts.isDecorator(n)?undefined:ts.visitEachChild(n,visit,ctx);return ts.visitNode(node,visit);}]);
 const printed=ts.createPrinter().printNode(ts.EmitHint.Unspecified,transformed.transformed[0],ast);transformed.dispose();
 const js=ts.transpileModule('let nextUniqueId=0;class _MatTabLinkMixinBase {}\n'+printed,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};new Function('exports','resolveLegacyAnimationMode',js)(exports,resolveLegacyAnimationMode);
 let monitored=0,stopped=0;const monitor={monitor(){monitored++},stopMonitoring(){stopped++}};
 const options=Object.freeze({disabled:false,animation:Object.freeze({enterDuration:11,exitDuration:12})});
 const normal=new exports._MatTabLinkBase({}, {nativeElement:{}}, options,'0',monitor,'BrowserAnimations');
 assert.equal(normal.rippleConfig,options);normal.ngAfterViewInit();normal.ngOnDestroy();assert.equal(monitored,1);assert.equal(stopped,1);
 const disabled=new exports._MatTabLinkBase({}, {nativeElement:{}}, options,'0',monitor,'NoopAnimations');
 assert.notEqual(disabled.rippleConfig,options);assert.deepEqual(disabled.rippleConfig.animation,{enterDuration:0,exitDuration:0});assert.deepEqual(options.animation,{enterDuration:11,exitDuration:12});
 const ambient=createEnvironmentInjector([{provide:MediaMatcher,useValue:{matchMedia:()=>({matches:false})}},{provide:MATERIAL_ANIMATIONS,useValue:config}],Injector.NULL);
 try{const link=runInInjectionContext(ambient,()=>new exports._MatTabLinkBase({}, {nativeElement:{}}, options,'0',monitor,'BrowserAnimations'));assert.deepEqual(link.rippleConfig.animation,{enterDuration:0,exitDuration:0});}finally{ambient.destroy();}
 console.log(JSON.stringify({result:'pass',cases:17,oldEngineHintAloneIgnored:true,distinctTokens:true,manualModes:true,navProtocolLifecycle:true,configNonmutation:true}));
} finally {rmSync(dir,{recursive:true,force:true});}
