/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const {createRequire}=require('node:module');
const {spawnSync}=require('node:child_process');
(async()=>{
 const tarball=process.argv[2];if(!tarball)throw Error('Expected packed library tarball');
 const dir=fs.mkdtempSync(join(tmpdir(),'noop-packed-schematic-'));
 try{
  const unpack=spawnSync('tar',['-xzf',resolve(tarball),'-C',dir],{encoding:'utf8'});assert.equal(unpack.status,0,unpack.stderr);
  const pnpm=resolve('node_modules/.pnpm'), name=fs.readdirSync(pnpm).find(name=>name.startsWith('@angular-devkit+schematics@22.1.8_'));assert.ok(name);
  const req=createRequire(join(pnpm,name,'node_modules/@angular-devkit/schematics/package.json'));
  const {SchematicTestRunner}=req('@angular-devkit/schematics/testing'),{HostTree}=req('@angular-devkit/schematics');
  const runner=new SchematicTestRunner('packaged',join(dir,'package/schematics/collection.json'));
  const feature="import {MatLegacyButtonModule} from '@angular/material/legacy-button';\n";
  const app="import {bootstrapApplication} from '@angular/platform-browser';\nimport {provideNoopAnimations} from '@angular/platform-browser/animations';\nbootstrapApplication(App,{providers:[provideNoopAnimations()]});\n";
  const tree=new HostTree();tree.create('/feature.ts',feature);tree.create('/app.ts',app);
  const updated=await runner.runSchematic('migrate-legacy',{},tree);assert.match(updated.readContent('/app.ts'),/provide: LEGACY_ANIMATION_MODE/);assert.match(updated.readContent('/app.ts'),/provideNoopAnimations\(\)/);
  const again=await runner.runSchematic('migrate-legacy',{},updated);assert.equal(again.readContent('/app.ts'),updated.readContent('/app.ts'));
  const bad=new HostTree();bad.create('/feature.ts',feature);bad.create('/app.ts',app.replace('[provideNoopAnimations()]','[provideNoopAnimations(), ...dynamicProviders]'));
  await assert.rejects(()=>runner.runSchematic('migrate-legacy',{},bad),/legacy-noop-policy/);assert.equal(bad.read('/feature.ts').toString('utf8'),feature);
  const testbed=new HostTree();testbed.create('/feature.ts',feature);
  testbed.create('/spec.ts',"import {TestBed as TB} from '@angular/core/testing';\nimport {NoopAnimationsModule as Noop} from '@angular/platform-browser/animations';\ndescribe('x',()=>{TB.configureTestingModule({imports:[Noop]});});");
  const migratedTestbed=await runner.runSchematic('migrate-legacy',{},testbed);assert.match(migratedTestbed.readContent('/spec.ts'),/provide: LEGACY_ANIMATION_MODE/);
  const override=new HostTree();override.create('/feature.ts',feature);override.create('/spec.ts',"import {TestBed} from '@angular/core/testing';\nimport {ANIMATION_MODULE_TYPE as Old} from '@angular/core';\nTestBed.overrideProvider(Old,{useValue:'NoopAnimations'});");
  await assert.rejects(()=>runner.runSchematic('migrate-legacy',{},override),/overrideProvider/);assert.equal(override.read('/feature.ts').toString('utf8'),feature);
  for(const body of [
   "function configure(){TestBed.configureTestingModule({providers:[disable()]});{const disable=()=>[];}}",
   "function configure(){{const disable=()=>[];} TestBed.configureTestingModule({providers:[disable()]});}",
   "beforeEach(()=>{TestBed.configureTestingModule({providers:[disable()]});{const disable=()=>[];}});",
   "beforeEach(()=>{{const disable=()=>[];} TestBed.configureTestingModule({providers:[disable()]});});",
  ]){
   const t=new HostTree();t.create('/feature.ts',feature);const src="import {TestBed} from '@angular/core/testing'; import {provideNoopAnimations as disable} from '@angular/platform-browser/animations'; "+body;t.create('/spec.ts',src);
   await assert.rejects(()=>runner.runSchematic('migrate-legacy',{},t),/ambiguous scoped animation binding/);assert.equal(t.read('/feature.ts').toString('utf8'),feature);assert.equal(t.read('/spec.ts').toString('utf8'),src);
  }
  for(const body of [
   "function configure({disable}:any){TestBed.configureTestingModule({providers:[disable()]});}",
   "function configure({factory:disable}:any){TestBed.configureTestingModule({providers:[disable()]});}",
   "function configure(){const {disable}=obj; TestBed.configureTestingModule({providers:[disable()]});}",
   "function configure([disable]:any){TestBed.configureTestingModule({providers:[disable()]});}",
   "class X {configure(disable:any){TestBed.configureTestingModule({providers:[disable()]});}}",
   "try{}catch(disable){TestBed.configureTestingModule({providers:[disable()]});}",
   "const configure=({disable}:any)=>{TestBed.configureTestingModule({providers:[disable()]});};",
  ]){
   const t=new HostTree();t.create('/feature.ts',feature);const src="import {TestBed} from '@angular/core/testing'; import {provideNoopAnimations as disable} from '@angular/platform-browser/animations'; "+body;t.create('/spec.ts',src);
   await assert.rejects(()=>runner.runSchematic('migrate-legacy',{},t),/ambiguous scoped animation binding/);assert.equal(t.read('/feature.ts').toString('utf8'),feature);assert.equal(t.read('/spec.ts').toString('utf8'),src);
  }
  const declarations=['const disable=()=>[];','const {disable}=obj;','const [disable]=items;','const {factory:disable}=obj;'];
  const scopeBodies=[body=>`function configure(){${body}}`,body=>`beforeEach(()=>{${body}});`,body=>`class X {configure(){${body}}}`,body=>`try{}catch(error){${body}}`];
  const parameters=['disable','{disable}','[disable]','{factory:disable}'];
  const scopeParams=[p=>`function configure(${p}){TestBed.configureTestingModule({providers:[disable()]});}`,
   p=>`beforeEach((${p})=>{TestBed.configureTestingModule({providers:[disable()]});});`,
   p=>`class X {configure(${p}){TestBed.configureTestingModule({providers:[disable()]});}}`,
   p=>`try{}catch(${p}){TestBed.configureTestingModule({providers:[disable()]});}`];
  const cross=[...scopeBodies.flatMap(wrap=>declarations.map(declaration=>wrap(declaration+'TestBed.configureTestingModule({providers:[disable()]});'))),...scopeParams.flatMap(wrap=>parameters.map(wrap))];
  for(const body of cross){
   const t=new HostTree();t.create('/feature.ts',feature);const src="import {TestBed} from '@angular/core/testing'; import {provideNoopAnimations as disable} from '@angular/platform-browser/animations'; "+body;t.create('/spec.ts',src);
   await assert.rejects(()=>runner.runSchematic('migrate-legacy',{},t),/ambiguous scoped animation binding/);assert.equal(t.read('/feature.ts').toString('utf8'),feature);assert.equal(t.read('/spec.ts').toString('utf8'),src);
  }
  for(const body of [
   "{const disable=()=>[];TestBed.configureTestingModule({providers:[disable()]});}",
   "{const {disable}=obj;TestBed.configureTestingModule({providers:[disable()]});}",
   "class X {['configure'](){const disable=()=>[];TestBed.configureTestingModule({providers:[disable()]});}}",
   "if(flag){TestBed.configureTestingModule({providers:[disable()]});}",
   "try{TestBed.configureTestingModule({providers:[disable()]});}finally{}",
  ]){
   const t=new HostTree();t.create('/feature.ts',feature);const src="import {TestBed} from '@angular/core/testing'; import {provideNoopAnimations as disable} from '@angular/platform-browser/animations'; "+body;t.create('/spec.ts',src);
   await assert.rejects(()=>runner.runSchematic('migrate-legacy',{},t),/unsupported lexical scope/);assert.equal(t.read('/feature.ts').toString('utf8'),feature);assert.equal(t.read('/spec.ts').toString('utf8'),src);
  }
  const shadow=new HostTree();shadow.create('/feature.ts',feature);shadow.create('/spec.ts',"import {TestBed} from '@angular/core/testing'; import {provideNoopAnimations as disable} from '@angular/platform-browser/animations'; function configure(disable: any){TestBed.configureTestingModule({providers:[other()]});}");
  const shadowResult=await runner.runSchematic('migrate-legacy',{},shadow);assert.doesNotMatch(shadowResult.readContent('/spec.ts'),/LEGACY_ANIMATION_MODE/);
  for(const metadata of ['{providers:[disable(),wrap(disable())]}','{providers:[disable(),wrap(enable())]}','{imports:[Noop,wrap(Noop)]}','{imports:[Noop,wrap(Browser)]}','{...config,imports:[Noop]}','{imports:[Noop],...config}']){
   const t=new HostTree();t.create('/feature.ts',feature);t.create('/app.ts',"import {NgModule} from '@angular/core'; import {NoopAnimationsModule as Noop,BrowserAnimationsModule as Browser,provideNoopAnimations as disable,provideAnimations as enable} from '@angular/platform-browser/animations'; @NgModule("+metadata+") class App {}");
   await assert.rejects(()=>runner.runSchematic('migrate-legacy',{},t),/legacy-noop-policy/);assert.equal(t.read('/feature.ts').toString('utf8'),feature);
  }
  for(const expression of [
   "import {NgModule} from '@angular/core'; import {BrowserAnimationsModule as Browser} from '@angular/platform-browser/animations'; @NgModule({imports: makeImports(Browser.withConfig({disableAnimations:true}))}) class App {}",
   "import {TestBed} from '@angular/core/testing'; import {provideNoopAnimations} from '@angular/platform-browser/animations'; TestBed.configureTestingModule({providers:makeProviders(provideNoopAnimations())});",
   "import type {ApplicationConfig} from '@angular/core'; import {provideNoopAnimations} from '@angular/platform-browser/animations'; const config:ApplicationConfig={providers:makeProviders(provideNoopAnimations())};",
  ]){
   const t=new HostTree();t.create('/feature.ts',feature);t.create('/app.ts',expression);
   await assert.rejects(()=>runner.runSchematic('migrate-legacy',{},t),/legacy-noop-policy/);assert.equal(t.read('/feature.ts').toString('utf8'),feature);assert.equal(t.read('/app.ts').toString('utf8'),expression);
  }
  const opaque=new HostTree();opaque.create('/feature.ts',feature);
  opaque.create('/app.ts',"import {provideNoopAnimations} from '@angular/platform-browser/animations';\nexport const config = {providers:[provideNoopAnimations()]};");
  await assert.rejects(()=>runner.runSchematic('migrate-legacy',{},opaque),/unrecognized configuration/);assert.equal(opaque.read('/feature.ts').toString('utf8'),feature);
  const decoy=new HostTree();decoy.create('/feature.ts',feature);decoy.create('/app.ts',"import {NgModule} from '@angular/core'; import {BrowserAnimationsModule as Browser} from '@angular/platform-browser/animations'; @NgModule({imports:[Other.withConfig({disableAnimations:false}),Browser.withConfig({disableAnimations:true})]}) class App {}");
  const migratedDecoy=await runner.runSchematic('migrate-legacy',{},decoy);assert.match(migratedDecoy.readContent('/app.ts'),/provide: LEGACY_ANIMATION_MODE/);
  for(const expression of ['true && flag','false ? true : flag','true, disableAnimations:false','...options, disableAnimations:true','true, ...options']){
   const property=expression.startsWith('...')?expression:'disableAnimations:'+expression;
   const t=new HostTree();t.create('/feature.ts',feature);t.create('/app.ts',"import {NgModule} from '@angular/core'; import {BrowserAnimationsModule as Browser} from '@angular/platform-browser/animations'; @NgModule({imports:[Browser.withConfig({"+property+"})]}) class App {}");
   await assert.rejects(()=>runner.runSchematic('migrate-legacy',{},t),/ambiguous BrowserAnimationsModule/);assert.equal(t.read('/feature.ts').toString('utf8'),feature);
  }
  for(const values of [['true','false'],['false','true'],['unknown','true']]){
   const t=new HostTree();t.create('/feature.ts',feature);
   const cfg=values.map(value=>'Browser.withConfig('+(value==='unknown'?'config':'{disableAnimations:'+value+'}')+')').join(',');
   t.create('/app.ts',"import {NgModule} from '@angular/core';\nimport {BrowserAnimationsModule as Browser} from '@angular/platform-browser/animations';\n@NgModule({imports:["+cfg+"]}) class App {}");
   await assert.rejects(()=>runner.runSchematic('migrate-legacy',{},t),/multiple BrowserAnimationsModule/);assert.equal(t.read('/feature.ts').toString('utf8'),feature);
  }
  for(const values of [["NoopAnimations","BrowserAnimations"],["BrowserAnimations","NoopAnimations"]]){
   const t=new HostTree();t.create('/feature.ts',feature);
   t.create('/app.ts',"import {NgModule, ANIMATION_MODULE_TYPE as Old} from '@angular/core';\n@NgModule({providers:[{provide:Old,useValue:'"+values[0]+"'},{provide:Old,useValue:'"+values[1]+"'}]}) class App {}");
   await assert.rejects(()=>runner.runSchematic('migrate-legacy',{},t),/conflicting or opaque/);assert.equal(t.read('/feature.ts').toString('utf8'),feature);
  }

  console.log('packed schematic noop migration controls passed');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
