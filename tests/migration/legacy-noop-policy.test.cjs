/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
'use strict';
const assert=require('node:assert/strict');
const {mkdtempSync,readFileSync,writeFileSync,rmSync}=require('node:fs');
const {join,resolve}=require('node:path');
const {tmpdir}=require('node:os');
const {spawnSync}=require('node:child_process');
const {rewriteLegacyTypescriptImports:rewrite}=require('../../projects/ngx-material-legacy/schematics/migrate-legacy/ts-rewrite.js');
const {migrateLegacy}=require('../../projects/ngx-material-legacy/schematics/migrate-legacy/index.js');
const cli=resolve(process.env.MIGRATION_CLI_UNDER_TEST || 'scripts/migrate-legacy-cli.mjs');
const header=`import {NgModule as Module, ANIMATION_MODULE_TYPE as Old} from '@angular/core';
import {MatLegacySelectModule as Legacy} from '@angular/material/legacy-select';
import {NoopAnimationsModule as Noop, BrowserAnimationsModule as Browser, provideNoopAnimations as disable, provideAnimations as enable} from '@angular/platform-browser/animations';
import {LEGACY_ANIMATION_MODE as Mode} from '@ngx-compat/material-legacy/legacy-core';\n`;
const moduleOf=(imports,providers='')=>`${header}@Module({imports:[${imports}]${providers?`,providers:[${providers}]`:''}}) class App {}`;
const blocked=(s,options)=>{const r=rewrite(s,options);assert.equal(r.ok,false);assert.equal(r.changed,false);assert.equal(r.content,s);assert.match(r.diagnostics.join(' '),/legacy-noop-policy/);};
const accepted=s=>{const r=rewrite(s);assert.equal(r.ok,true,JSON.stringify(r));return r.content;};
const migrated=s=>{const result=accepted(s);assert.match(result,/provide:\s*Mode,\s*useValue:\s*'NoopAnimations'/);const again=rewrite(result);assert.equal(again.ok,true,JSON.stringify(again));assert.equal(again.changed,false);return result;};
migrated(moduleOf('Legacy, Noop'));
migrated(moduleOf('Legacy','disable()'));
migrated(moduleOf('Legacy',"{provide: Old, useValue: 'NoopAnimations'}"));
migrated(moduleOf('Legacy',"{useValue: 'NoopAnimations', provide: Old}"));
migrated(moduleOf('Legacy, Browser.withConfig({disableAnimations:true})'));
migrated(moduleOf('Legacy, Other.withConfig({disableAnimations:false}), Browser.withConfig({disableAnimations:true})'));
migrated(moduleOf('Legacy, Browser.withConfig({disableAnimations:true}), Other.withConfig({disableAnimations:false})'));
assert.doesNotMatch(accepted(moduleOf('Legacy, Other.withConfig({disableAnimations:true}), Browser.withConfig({disableAnimations:false})')),/provide:\s*Mode/);
assert.doesNotMatch(accepted(moduleOf('Legacy, Browser.withConfig({disableAnimations:false}), Other.withConfig({disableAnimations:true})')),/provide:\s*Mode/);
blocked(moduleOf('Legacy, Browser.withConfig({disableAnimations:true && flag})'));
blocked(moduleOf('Legacy, Browser.withConfig({disableAnimations:false ? true : flag})'));
blocked(moduleOf('Legacy, Browser.withConfig({disableAnimations:true, disableAnimations:false})'));
blocked(moduleOf('Legacy, Browser.withConfig({...options, disableAnimations:true})'));
blocked(moduleOf('Legacy, Browser.withConfig({disableAnimations:true, ...options})'));
blocked(moduleOf('Legacy, Browser.withConfig({disableAnimations:true, other:true})'));

blocked(moduleOf('Legacy, Browser.withConfig({disableAnimations:flag})'));
blocked(moduleOf('Legacy, Browser.withConfig(dynamicConfig)'));
blocked(`${header}@Module({imports: makeImports(Browser.withConfig({disableAnimations:true}))}) class App {}`,{legacyAnimationWorkspace:true});
blocked(`${header}@Module({imports:[Legacy], providers: makeProviders(disable())}) class App {}`);
blocked(`${header}@Module({imports:[Legacy, Browser.withConfig({disableAnimations:false})], providers: makeProviders(disable())}) class App {}`);
blocked(`${header}@Module({imports:makeImports(Browser.withConfig({disableAnimations:false})), providers:[disable()]}) class App {}`,{legacyAnimationWorkspace:true});
blocked(`${header}@Module({imports:makeImports(Browser.withConfig({disableAnimations:true})), providers:[disable()]}) class App {}`,{legacyAnimationWorkspace:true});
blocked(`${header}@Module({imports:[Legacy], providers: makeProviders({provide:Old,useValue:'NoopAnimations'})}) class App {}`);
blocked(`${header}import {TestBed as TB} from '@angular/core/testing'; describe('x',()=>{TB.configureTestingModule({imports: makeImports(Noop)});});`);
blocked(`${header}import {TestBed as TB} from '@angular/core/testing'; describe('x',()=>{TB.configureTestingModule({providers: makeProviders(disable())});});`);
blocked(`${header}import type {ApplicationConfig} from '@angular/core'; const config:ApplicationConfig = {providers:makeProviders(disable())};`);

blocked(moduleOf('Legacy, Browser.withConfig({disableAnimations:true}), Browser.withConfig({disableAnimations:false})'));
blocked(moduleOf('Legacy, Browser.withConfig({disableAnimations:false}), Browser.withConfig({disableAnimations:true})'));
blocked(moduleOf('Legacy, Browser.withConfig(dynamicConfig), Browser.withConfig({disableAnimations:true})'));
blocked(moduleOf('Legacy, Browser.withConfig({disableAnimations:true}), Browser.withConfig(dynamicConfig)'));
blocked(moduleOf('Legacy, Noop','...providers'));
blocked(moduleOf('Legacy, ...otherModules, Noop'));
blocked(moduleOf('Legacy, Noop, ...otherModules'));

blocked(moduleOf('Legacy','{provide: Other,useFactory: () => disable()}'));
blocked(moduleOf('Legacy, wrap(Noop)'));
blocked(moduleOf('Legacy','{provide: Old,useValue: dynamicMode}'));
blocked(moduleOf('Legacy',"{provide:Old,useValue:'NoopAnimations'},{provide:Old,useValue:'BrowserAnimations'}"));
blocked(moduleOf('Legacy',"{provide:Old,useValue:'BrowserAnimations'},{provide:Old,useValue:'NoopAnimations'}"));
blocked(moduleOf('Legacy, Noop',"{provide:Old,useValue:'BrowserAnimations'}"));
blocked(moduleOf('Legacy, Noop, Browser'));
blocked(moduleOf('Legacy, Browser, Noop'));
blocked(moduleOf('Legacy','disable(), enable()'));
blocked(moduleOf('Legacy','enable(), disable()'));
blocked(moduleOf('Legacy','disable(), wrap(disable())'));
blocked(moduleOf('Legacy','wrap(disable()), disable()'));
blocked(moduleOf('Legacy','disable(), wrap(enable())'));
blocked(moduleOf('Legacy','wrap(enable()), disable()'));
blocked(moduleOf('Legacy, Noop, wrap(Noop)'));
blocked(moduleOf('Legacy, wrap(Noop), Noop'));
blocked(moduleOf('Legacy, Noop, wrap(Browser)'));
blocked(moduleOf('Legacy, wrap(Browser), Noop'));
blocked(`${header}@Module({...cfg,imports:[Legacy, Noop]}) class App {}`);
blocked(`${header}@Module({imports:[Legacy, Noop],...cfg}) class App {}`);
blocked(`${header}@Module({imports:[Legacy, Noop],imports:[Legacy]}) class App {}`);
blocked(`${header}@Module({imports:[Legacy],providers:[disable()],providers:[]}) class App {}`);
blocked(`${header}@Module({providers:[disable()],...cfg}) class App {}`,{legacyAnimationWorkspace:true});

blocked(moduleOf('Legacy','disable(), importProvidersFrom(Browser)').replace('NgModule as Module,','NgModule as Module, importProvidersFrom,'));
blocked(moduleOf('Legacy',"disable(),{provide:Old,useValue:'BrowserAnimations'}"));
blocked(moduleOf('Legacy',"{provide:Old,useValue:'NoopAnimations',multi:true}"));
blocked(moduleOf('Legacy',"{provide:Old,useFactory:()=> 'NoopAnimations'}"));
blocked(moduleOf('Legacy',"{provide:Old,useExisting:Other}"));
blocked(moduleOf('Legacy',"{provide:Old,useValue:'NoopAnimations'},...dynamicProviders"));
const ownedOld=moduleOf('Legacy',"{provide:Old,useValue:'NoopAnimations'},{provide:Mode,useValue:'NoopAnimations'}");
const ownedResult=accepted(ownedOld);assert.equal(rewrite(ownedResult).changed,false);
const oldNamespace=`import * as core from '@angular/core';\nimport {MatLegacySelectModule as Legacy} from '@angular/material/legacy-select';\n@core.NgModule({imports:[Legacy],providers:[{provide:core.ANIMATION_MODULE_TYPE,useValue:'NoopAnimations'},{provide:core.ANIMATION_MODULE_TYPE,useValue:'BrowserAnimations'}]}) class App {}`;
blocked(oldNamespace);

accepted(moduleOf('Legacy, Browser')+'\n// @Module({imports:[Legacy, Noop]})');
accepted(moduleOf('Legacy, Browser.withConfig({disableAnimations:false})'));
const resolved=moduleOf('Legacy, Noop',"{provide: Mode,useValue:'NoopAnimations'}");
const once=accepted(resolved);const twice=rewrite(once);assert.equal(twice.ok,true);assert.equal(twice.changed,false);assert.match(once,/NoopAnimationsModule as Noop/);
accepted(moduleOf('Legacy',"disable(), {provide:Mode,useValue:'NoopAnimations'}"));
blocked(moduleOf('Legacy',"{provide:Mode,useValue:'NoopAnimations'}, disable()"));
accepted(moduleOf('Legacy',"{provide: Old, useValue:'BrowserAnimations'}, {provide: Other, useValue:'NoopAnimations'}"));
accepted(moduleOf('Legacy, Browser')+'\n// Noop\nconst text = "Noop";');
accepted(moduleOf('Legacy')+'\nfunction unrelated(Noop: unknown) { return Noop; }');
accepted(`${header}@Module({imports:[Noop]}) class Unrelated {}\n@Module({imports:[Legacy]}) class LegacyFeature {}`);
accepted(`${header}function local(Noop: unknown) { @Module({imports:[Legacy, Noop]}) class Nested {} }`);
accepted(`${header}function use(disable: () => void) { return disable(); }`);
accepted(`${header}function localArray(Noop: unknown) { return [Noop]; }`);
accepted(`${header}const fn = (disable: () => void) => disable();`);
accepted(`${header}const fn = Noop => [Noop];`);
accepted(`${header}const x = inject(Old);`);
accepted(`${header}const x = {disable: other, Noop: false, Old: other};`);
blocked(`${header}const x = {disable};`);
blocked(`${header}const x = {Noop};`);
accepted(`${header}const alias = Old; console.log(alias);`);
blocked(`${header}const alias = Old; const providers = [{provide:alias,useValue:'NoopAnimations'}];`);
const tbHeader=header+"import {TestBed as TB} from '@angular/core/testing';\n";
const tb=tbHeader+"describe('legacy', () => { TB.configureTestingModule({imports:[Noop]}); });";
const tbResult=accepted(tb);assert.match(tbResult,/providers: \[\{provide: Mode, useValue: 'NoopAnimations'\}\]/);assert.equal(rewrite(tbResult).changed,false);assert.match(tbResult,/imports:\[Noop\]/);
const tbNs=header+"import * as testing from '@angular/core/testing';\ndescribe('x',()=>{testing.TestBed.configureTestingModule({imports:[Noop]});});";
assert.match(accepted(tbNs),/provide: Mode/);
blocked(tbHeader+"describe('x',()=>{TB.overrideProvider(Old,{useValue:'NoopAnimations'});});");
blocked(tbHeader+"describe('x',()=>{TB.configureTestingModule({imports:[Noop]}).overrideProvider(Old,{useValue:'BrowserAnimations'});});");
accepted(tbHeader+"function helper(TB: any) { TB.configureTestingModule({imports:[Noop]}); }");
blocked(tbHeader+"function configure(disable: () => any) { TB.configureTestingModule({providers:[disable()]}); }");
blocked(tbHeader+"function configure(Noop: any) { TB.configureTestingModule({imports:[Noop]}); }");
const tbShadow=header+"import * as testing from '@angular/core/testing'; import * as anim from '@angular/platform-browser/animations'; function configure(anim: any){testing.TestBed.configureTestingModule({imports:[anim.NoopAnimationsModule]});}";
blocked(tbShadow);
const declarations=['const disable=()=>[];','const {disable}=obj;','const [disable]=items;','const {factory:disable}=obj;'];
const scopeBodies=[body=>`function configure(){${body}}`,body=>`beforeEach(()=>{${body}});`,body=>`class X {configure(){${body}}}`,body=>`try{}catch(error){${body}}`];
const crossScope=scopeBodies.flatMap(wrap=>declarations.map(declaration=>tbHeader+wrap(declaration+'TB.configureTestingModule({providers:[disable()]});')));
const parameters=['disable','{disable}','[disable]','{factory:disable}'];
const scopeParams=[p=>`function configure(${p}){TB.configureTestingModule({providers:[disable()]});}`,
 p=>`beforeEach((${p})=>{TB.configureTestingModule({providers:[disable()]});});`,
 p=>`class X {configure(${p}){TB.configureTestingModule({providers:[disable()]});}}`,
 p=>`try{}catch(${p}){TB.configureTestingModule({providers:[disable()]});}`];
const crossParams=scopeParams.flatMap(wrap=>parameters.map(param=>tbHeader+wrap(param)));
for(const expression of [...crossScope,...crossParams])blocked(expression);
const unsupportedScopes=[
 tbHeader+"{const disable=()=>[];TB.configureTestingModule({providers:[disable()]});}",
 tbHeader+"{const {disable}=obj;TB.configureTestingModule({providers:[disable()]});}",
 tbHeader+"class X {['configure'](){const disable=()=>[];TB.configureTestingModule({providers:[disable()]});}}",
 tbHeader+"if(flag){TB.configureTestingModule({providers:[disable()]});}",
 tbHeader+"try {TB.configureTestingModule({providers:[disable()]});} finally {}",
 tbHeader+"const holder={run:()=>{TB.configureTestingModule({providers:[disable()]});}};",
];
for(const expression of unsupportedScopes)blocked(expression);
assert.match(accepted(tbHeader+"beforeEach(()=>{TB.configureTestingModule({providers:[disable()]});});"),/provide:\s*Mode/);
accepted(tbHeader+"if(flag){TB.configureTestingModule({providers:[other()]});}");
const nestedAfter=tbHeader+"function configure(){TB.configureTestingModule({providers:[disable()]}); {const disable=()=>[];}}";
const nestedBefore=tbHeader+"function configure(){{const disable=()=>[];} TB.configureTestingModule({providers:[disable()]});}";
blocked(nestedAfter);blocked(nestedBefore);
const destructuredParameter=tbHeader+"function configure({disable}: any){TB.configureTestingModule({providers:[disable()]});}";
const destructuredAlias=tbHeader+"function configure({factory:disable}: any){TB.configureTestingModule({providers:[disable()]});}";
const destructuredLocal=tbHeader+"function configure(){const {disable}=obj; TB.configureTestingModule({providers:[disable()]});}";
const destructuredArray=tbHeader+"function configure([disable]: any){TB.configureTestingModule({providers:[disable()]});}";
const methodParameter=tbHeader+"class X {configure(disable:any){TB.configureTestingModule({providers:[disable()]});}}";
const catchBinding=tbHeader+"try{}catch(disable){TB.configureTestingModule({providers:[disable()]});}";
const arrowDestructure=tbHeader+"const configure=({disable}:any)=>{TB.configureTestingModule({providers:[disable()]});};";
for(const expression of [destructuredParameter,destructuredAlias,destructuredLocal,destructuredArray,methodParameter,catchBinding,arrowDestructure])blocked(expression);
assert.match(accepted(tbHeader+"function configure({disable:other}:any){TB.configureTestingModule({providers:[disable()]});}"),/provide:\s*Mode/);
accepted(tbHeader+"function configure(){const {disable}=obj;TB.configureTestingModule({providers:[other()]});}");

const arrowAfter=tbHeader+"beforeEach(()=>{TB.configureTestingModule({providers:[disable()]}); {const disable=()=>[];}});";
const arrowBefore=tbHeader+"beforeEach(()=>{{const disable=()=>[];} TB.configureTestingModule({providers:[disable()]});});";
blocked(arrowAfter);blocked(arrowBefore);
blocked(tbHeader+"beforeEach(()=>{const disable=()=>[];TB.configureTestingModule({providers:[disable()]});});");
blocked(tbHeader+"function configure(){{const disable=()=>[]; TB.configureTestingModule({providers:[disable()]});}}");
accepted(tbHeader+"function configure(){TB.configureTestingModule({providers:[other()]}); {const disable=()=>[];}}");
const nestedNamespace=header+"import * as testing from '@angular/core/testing'; import * as anim from '@angular/platform-browser/animations'; function configure(){testing.TestBed.configureTestingModule({providers:[anim.provideNoopAnimations()]}); {const anim:any={};}}";
blocked(nestedNamespace);


blocked(`${header}const options = {providers:[disable()]};`);
const bareProducer="import {provideNoopAnimations as noop} from '@angular/platform-browser/animations';\nexport const config = {providers:[noop()]};";
const bareResult=rewrite(bareProducer,{legacyAnimationWorkspace:true});assert.equal(bareResult.ok,false);assert.match(bareResult.diagnostics.join(' '),/unrecognized configuration/);
blocked(`${header}const factory = disable;`);
blocked(`${header}const fn = (disable: () => void) => disable(); const providers = [disable()];`);
accepted(`${header}import * as anim from '@angular/platform-browser/animations'; function helper(anim: any) { return [anim.NoopAnimationsModule]; }`);
blocked(`${header}const options = {providers:[disable()]} satisfies ApplicationConfig;`);
blocked(`${header}const providers = [{provide: Old,useValue:'NoopAnimations'}];`);
blocked(`${header}const imports = [Noop];`);
blocked(`${header}const providers = [importProvidersFrom(Noop)];`);
blocked(`${header}const alias = Noop;`);
blocked(`${header}const options = {imports:[Noop as any]};`);
blocked(`${header}const options = {providers:[{provide: Old,useFactory: () => 'NoopAnimations'}]};`);

const ns=`import {NgModule} from '@angular/core';\nimport * as legacy from '@angular/material/legacy-select';\nimport * as anim from '@angular/platform-browser/animations';\n@NgModule({imports:[legacy.MatLegacySelectModule, anim.NoopAnimationsModule]}) class A {}`;
assert.match(accepted(ns),/provide: LEGACY_ANIMATION_MODE/);
const standalone=`import {bootstrapApplication as boot} from '@angular/platform-browser';\nimport {provideNoopAnimations as noop} from '@angular/platform-browser/animations';\nboot(App,{providers:[noop()]});`;
const standaloneResult=rewrite(standalone,{legacyAnimationWorkspace:true});assert.equal(standaloneResult.ok,true);assert.match(standaloneResult.content,/noop\(\), \{provide: LEGACY_ANIMATION_MODE/);assert.equal(rewrite(standaloneResult.content,{legacyAnimationWorkspace:true}).changed,false);
const unrelated=rewrite(standalone);assert.equal(unrelated.changed,false);
const noImports="import {NgModule} from '@angular/core';\nimport {provideNoopAnimations} from '@angular/platform-browser/animations';\n@NgModule({providers:[provideNoopAnimations()]}) class App {}";
const crossModule=rewrite(noImports,{legacyAnimationWorkspace:true});assert.equal(crossModule.ok,true);assert.match(crossModule.content,/provide: LEGACY_ANIMATION_MODE/);
const noTarget=rewrite(noImports);assert.equal(noTarget.changed,false);
const appConfig="import type {ApplicationConfig as AppCfg} from '@angular/core';\nimport {provideNoopAnimations as noop} from '@angular/platform-browser/animations';\nexport const config: AppCfg = {providers:[noop()]};";
const configResult=rewrite(appConfig,{legacyAnimationWorkspace:true});assert.equal(configResult.ok,true);assert.match(configResult.content,/provide: LEGACY_ANIMATION_MODE/);assert.equal(rewrite(configResult.content,{legacyAnimationWorkspace:true}).changed,false);
// Exercise the actual schematic rule and its tree-wide planning with a minimal tree.
const contents=new Map([['/feature.ts',"import {MatLegacyButtonModule} from '@angular/material/legacy-button';"],['/app.ts',standalone]]);
const tree={getDir(path){assert.equal(path,'/');return {subfiles:[...contents.keys()].map(k=>k.slice(1)),subdirs:[]}},read(path){return Buffer.from(contents.get(path))},overwrite(path,text){contents.set(path,text)}};
migrateLegacy({})(tree,{logger:{warn(){},info(){}}});assert.match(contents.get('/app.ts'),/provide: LEGACY_ANIMATION_MODE/);
const stable=new Map(contents);migrateLegacy({})(tree,{logger:{warn(){},info(){}}});assert.deepEqual(contents,stable);
const dir=mkdtempSync(join(tmpdir(),'noop-migration-'));
try{
 const feature=join(dir,'feature.ts'),app=join(dir,'app.ts');writeFileSync(feature,"import {MatLegacyButtonModule} from '@angular/material/legacy-button';\n");writeFileSync(app,standalone);
 let child=spawnSync(process.execPath,[cli,dir,'--apply','--json'],{encoding:'utf8'});
 assert.equal(child.status,0,child.stdout+child.stderr);assert.match(readFileSync(app,'utf8'),/provide: LEGACY_ANIMATION_MODE/);assert.match(readFileSync(app,'utf8'),/noop\(\)/);
 child=spawnSync(process.execPath,[cli,dir,'--apply','--json'],{encoding:'utf8'});assert.equal(child.status,0,child.stdout+child.stderr);assert.equal(JSON.parse(child.stdout).safe_edits,0);
 writeFileSync(feature,"import {MatLegacyButtonModule} from '@angular/material/legacy-button';\n");writeFileSync(app,moduleOf('Legacy, Noop','...providers'));
 const beforeGood=readFileSync(feature,'utf8'),beforeBad=readFileSync(app,'utf8');
 child=spawnSync(process.execPath,[cli,dir,'--apply','--json'],{encoding:'utf8'});
 assert.notEqual(child.status,0,child.stdout+child.stderr);assert.equal(readFileSync(feature,'utf8'),beforeGood);assert.equal(readFileSync(app,'utf8'),beforeBad);assert.match(child.stdout,/legacy-noop-policy/);
 for(const values of [['NoopAnimations','BrowserAnimations'],['BrowserAnimations','NoopAnimations']]){
  writeFileSync(app,moduleOf('Legacy',`{provide:Old,useValue:'${values[0]}'},{provide:Old,useValue:'${values[1]}'}`));
  const conflict=readFileSync(app,'utf8');child=spawnSync(process.execPath,[cli,dir,'--apply','--json'],{encoding:'utf8'});
  assert.notEqual(child.status,0,child.stdout+child.stderr);assert.equal(readFileSync(feature,'utf8'),beforeGood);assert.equal(readFileSync(app,'utf8'),conflict);assert.match(child.stdout,/conflicting or opaque/);
 }
 for(const expression of [nestedAfter,nestedBefore,nestedNamespace,arrowAfter,arrowBefore,destructuredParameter,destructuredAlias,destructuredLocal,destructuredArray,methodParameter,catchBinding,arrowDestructure,...crossScope,...crossParams,...unsupportedScopes]){
  writeFileSync(app,expression);child=spawnSync(process.execPath,[cli,dir,'--apply','--json'],{encoding:'utf8'});
  assert.notEqual(child.status,0,child.stdout+child.stderr);assert.equal(readFileSync(feature,'utf8'),beforeGood);assert.equal(readFileSync(app,'utf8'),expression);assert.match(child.stdout,/animation binding.*ambiguous|ambiguous.*animation binding|unsupported lexical scope/);
 }
 for(const expression of [moduleOf('Legacy','disable(), wrap(disable())'),moduleOf('Legacy','disable(), wrap(enable())'),moduleOf('Legacy, Noop, wrap(Noop)'),moduleOf('Legacy, Noop, wrap(Browser)'),`${header}@Module({...cfg,imports:[Legacy, Noop]}) class App {}`]){
  writeFileSync(app,expression);child=spawnSync(process.execPath,[cli,dir,'--apply','--json'],{encoding:'utf8'});
  assert.notEqual(child.status,0,child.stdout+child.stderr);assert.equal(readFileSync(feature,'utf8'),beforeGood);assert.equal(readFileSync(app,'utf8'),expression);assert.match(child.stdout,/legacy-noop-policy/);
 }
 for(const expression of ['true && flag','false ? true : flag','true, disableAnimations:false','...options, disableAnimations:true','true, ...options']){
  const property=expression.startsWith('...') ? expression : 'disableAnimations:'+expression;
  writeFileSync(app,moduleOf('Legacy, Browser.withConfig({'+property+'})'));const before=readFileSync(app,'utf8');
  child=spawnSync(process.execPath,[cli,dir,'--apply','--json'],{encoding:'utf8'});
  assert.notEqual(child.status,0,child.stdout+child.stderr);assert.equal(readFileSync(feature,'utf8'),beforeGood);assert.equal(readFileSync(app,'utf8'),before);assert.match(child.stdout,/ambiguous BrowserAnimationsModule/);
 }
 for(const values of [['true','false'],['false','true'],['dynamicConfig','{disableAnimations:true}']]){
  const config=values.map(value=>value.startsWith('{') || value==='dynamicConfig' ? value : `{disableAnimations:${value}}`).map(value=>`Browser.withConfig(${value})`).join(',');
  writeFileSync(app,moduleOf('Legacy, '+config));const before=readFileSync(app,'utf8');
  child=spawnSync(process.execPath,[cli,dir,'--apply','--json'],{encoding:'utf8'});
  assert.notEqual(child.status,0,child.stdout+child.stderr);assert.equal(readFileSync(feature,'utf8'),beforeGood);assert.equal(readFileSync(app,'utf8'),before);assert.match(child.stdout,/multiple BrowserAnimationsModule/);
 }
 for(const expression of [
  `${header}@Module({imports:makeImports(Browser.withConfig({disableAnimations:true}))}) class App {}`,
  `${header}import {TestBed as TB} from '@angular/core/testing'; describe('x',()=>{TB.configureTestingModule({providers:makeProviders(disable())});});`,
  `${header}import type {ApplicationConfig} from '@angular/core'; const config:ApplicationConfig={providers:makeProviders(disable())};`,
 ]){
  writeFileSync(app,expression);child=spawnSync(process.execPath,[cli,dir,'--apply','--json'],{encoding:'utf8'});
  assert.notEqual(child.status,0,child.stdout+child.stderr);assert.equal(readFileSync(feature,'utf8'),beforeGood);assert.equal(readFileSync(app,'utf8'),expression);assert.match(child.stdout,/legacy-noop-policy/);
 }
 writeFileSync(app,`${header}const providers = [disable()];`);const opaque=readFileSync(app,'utf8');
 child=spawnSync(process.execPath,[cli,dir,'--apply','--json'],{encoding:'utf8'});
 assert.notEqual(child.status,0,child.stdout+child.stderr);assert.equal(readFileSync(feature,'utf8'),beforeGood);assert.equal(readFileSync(app,'utf8'),opaque);assert.match(child.stdout,/unrecognized configuration/);
 writeFileSync(app,tbHeader+"describe('x',()=>{TB.overrideProvider(Old,{useValue:'NoopAnimations'});});");const override=readFileSync(app,'utf8');
 child=spawnSync(process.execPath,[cli,dir,'--apply','--json'],{encoding:'utf8'});
 assert.notEqual(child.status,0,child.stdout+child.stderr);assert.equal(readFileSync(feature,'utf8'),beforeGood);assert.equal(readFileSync(app,'utf8'),override);assert.match(child.stdout,/overrideProvider/);


}finally{rmSync(dir,{recursive:true,force:true});}
console.log('legacy-noop-policy migration controls passed');
