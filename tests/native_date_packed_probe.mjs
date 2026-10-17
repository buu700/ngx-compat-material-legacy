/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Fixture/predicate protocol controls. Angular DI and packed execution are not simulated qualifications. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {NATIVE_DATE_CONSTRUCTOR_CASE_ID, NATIVE_DATE_PROVIDER_CASE_ID,
  packedNativeDateConstructorCase, packedNativeDateProviderCase} from '../scripts/native-date-packed-contract.mjs';
import {nativeDatePackedFixture} from '../scripts/native-date-packed-fixture.mjs';
import {nativeDatePackedSample} from './native_date_packed_sample.mjs';
import {allConsumerCaseIds, loadExportKeys} from '../scripts/packed-consumer-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read=p=>readFileSync(join(root,p)), hash=b=>createHash('sha256').update(b).digest('hex');
const ts=createRequire(import.meta.url)('typescript');
const sample=nativeDatePackedSample(), fixture=nativeDatePackedFixture();
const predicates={constructor:packedNativeDateConstructorCase,provider:packedNativeDateProviderCase};
const ids=allConsumerCaseIds(loadExportKeys());assert.equal(ids.length,106);
for(const id of [NATIVE_DATE_CONSTRUCTOR_CASE_ID,NATIVE_DATE_PROVIDER_CASE_ID])assert.equal(ids.filter(value=>value===id).length,1);
let mutations=0;
function leaves(value,path=[]){
  return value!==null&&typeof value==='object'?Object.entries(value).flatMap(([key,child])=>leaves(child,[...path,key])):[path];
}
for(const [kind,predicate] of Object.entries(predicates)){
  const expected=sample[kind];assert.equal(predicate(expected).result,'pass');assert.deepEqual(predicate(expected).observation,expected);
  for(const value of [undefined,null,true,[],{},'pass']){assert.equal(predicate(value).result,'fail');mutations++;}
  // Every required leaf is independently removed and changed. Booleans/status alone never suffice.
  for(const path of leaves(expected))for(const remove of [false,true]){
    const changed=structuredClone(expected),parent=path.slice(0,-1).reduce((o,key)=>o[key],changed),key=path.at(-1),old=parent[key];
    if(remove)delete parent[key];else parent[key]=typeof old==='boolean'?!old:typeof old==='number'?old+1:old===null?'failure':old+'-changed';
    assert.equal(predicate(changed).result,'fail',kind+' ignored '+path.join('.')+' '+remove);mutations++;
  }
}
for(const scopes of [[],sample.provider.scopes.slice(1),[...sample.provider.scopes].reverse(),[...sample.provider.scopes,sample.provider.scopes[0]]]){
  assert.equal(packedNativeDateProviderCase({...sample.provider,scopes}).result,'fail');mutations++;
}
const adapterPath='projects/ngx-material-legacy/legacy-core/internal/datetime/native-date-adapter.ts';
const modulePath='projects/ngx-material-legacy/legacy-core/internal/datetime/native-date-module.ts';
const adapterSource=read(adapterPath).toString(),moduleSource=read(modulePath).toString();
function compile(text,name,modules){
  const output=ts.transpileModule(text,{fileName:name,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}});
  assert.equal(output.diagnostics.length,0);const box={exports:{}};
  new Function('require','exports','module',output.outputText)(name=>{assert.ok(Object.hasOwn(modules,name),'Unreviewed protocol dependency '+name);return modules[name];},box.exports,box);
  return box.exports;
}
function protocol(text=fixture,fault=''){
  const events=[],metadata=new Map(),dateLocale={},dateFormats={},nativeFormats=Object.freeze({parse:Object.freeze({dateInput:null}),display:Object.freeze({dateInput:Object.freeze({year:'numeric',month:'short',day:'numeric'})})});
  // Minimal public-base and TestBed protocols measure the generated observer, not Angular's injector/factory.
  class DateAdapter{setLocale(locale){this.locale=locale;}deserialize(value){return value==null?null:this.invalid();}}
  class Platform{}
  const material={DateAdapter,MAT_DATE_LOCALE:dateLocale,MAT_DATE_FORMATS:dateFormats,MAT_NATIVE_DATE_FORMATS:nativeFormats};
  let configured=false,providers=new Map(),instances=new Map(),resets=0;
  const core={Inject:()=>()=>{},Optional:()=>()=>{},Injectable:()=>type=>type,NgModule:options=>type=>{metadata.set(type,options);return type;},
    inject:()=>{events.push('outside-context-probe');if(configured||fault==='inside-context')return 'en-US';throw Error('NG0203: outside injection context');}};
  const adapter=compile(adapterSource,'native-date-adapter.ts',{'@angular/core':core,'@angular/cdk/platform':{Platform},'@angular/material/core':material});
  const modules=compile(moduleSource,'native-date-module.ts',{'@angular/core':core,'@angular/material/core':material,'./native-date-adapter':adapter});
  const Owned=adapter.LegacyNativeDateAdapter;
  if(fault==='clone-alias')Owned.prototype.clone=function(date){return date;};
  if(fault==='wrong-weekday')Owned.prototype.getFirstDayOfWeek=()=>1;
  const TestBed={
    configureTestingModule(options){
      assert.equal(configured,false,'Scope was not reset');configured=true;events.push('configure');
      const visit=module=>{const definition=metadata.get(module);assert.ok(definition);for(const child of definition.imports||[])visit(child);for(const p of definition.providers||[])providers.set(p.provide,p);};
      for(const module of options.imports)visit(module);for(const p of options.providers)providers.set(p.provide,p);
      return TestBed;
    },
    inject(token,fallback){
      assert.equal(configured,true);events.push(token===dateLocale?'locale':token===Platform?'platform':token===dateFormats?'formats':'adapter');
      if(fault==='provider-error'&&resets===1&&token===DateAdapter)throw Error('controlled provider failure');
      if(instances.has(token)&&fault!=='non-singleton')return instances.get(token);
      const provider=providers.get(token);if(!provider){assert.equal(arguments.length,2);return fallback;}
      let value;
      if(provider.useClass){
        const locale=fault==='skip-locale'?'en-US':TestBed.inject(dateLocale);
        const platform=fault==='skip-platform'?undefined:TestBed.inject(Platform);
        value=fault==='manual-provider'?manual.direct:new provider.useClass(locale,platform);
      }else value=provider.useFactory?provider.useFactory():provider.useValue;
      if(fault==='foreign-formats'&&token===dateFormats)value={...value};
      instances.set(token,value);return value;
    },
    resetTestingModule(){configured=false;providers=new Map();instances=new Map();resets++;events.push('reset');return TestBed;},
  };
  const facade={...adapter,...modules,LegacyDateAdapter:DateAdapter,MAT_LEGACY_DATE_LOCALE:dateLocale,MAT_LEGACY_DATE_FORMATS:dateFormats,MAT_LEGACY_NATIVE_DATE_FORMATS:nativeFormats};
  const code=compile(text,'native-date-probe.ts',{'@angular/core':core,'@angular/core/testing':{TestBed},'@angular/cdk/platform':{Platform},'@angular/material/core':material,'@ngx-compat/material-legacy/legacy-core':facade});
  const manual=code.observePackedNativeDateManual();assert.equal(events[0],'outside-context-probe');assert.equal(events.length,1,'Manual observer touched providers');
  let provided,error;try{provided=code.observePackedNativeDateProviders(manual.direct);}catch(value){error=value;}
  assert.equal(configured,false,'Provider failure leaked TestBed configuration');
  return {manual:manual.observed,provided,error,resets,events};
}
const actual=protocol();assert.ifError(actual.error);assert.deepEqual(actual.manual,sample.constructor);assert.deepEqual(actual.provided,sample.provider);
assert.equal(actual.resets,3);assert.equal(actual.events.filter(value=>value==='configure').length,3);
let protocolDefects=0;
for(const [fault,kind] of [['inside-context','constructor'],['clone-alias','constructor'],['wrong-weekday','constructor'],
  ['skip-locale','provider'],['skip-platform','provider'],['non-singleton','provider'],['manual-provider','provider'],['foreign-formats','provider']]){
  const result=protocol(fixture,fault);assert.ifError(result.error);const observed=kind==='constructor'?result.manual:result.provided;
  assert.equal(predicates[kind](observed).result,'fail',fault);protocolDefects++;
}
const failure=protocol(fixture,'provider-error');assert.match(String(failure.error),/controlled provider failure/);assert.equal(failure.resets,2);protocolDefects++;
// These mutations would conceal broken provider reads or turn the observations into status-only output.
const fixtureMutants=[
  [fixture.replace('platform_reads:platformCount','platform_reads:1'),'skip-platform','provider'],
  [fixture.replace('locale_reads:localeCount','locale_reads:1'),'skip-locale','provider'],
  [fixture.replace('outside_injection_context:outside','outside_injection_context:true'),'inside-context','constructor'],
  [fixture.replace('first_weekday:direct.getFirstDayOfWeek()','first_weekday:0'),'wrong-weekday','constructor'],
];
function checkObserverRejectsFault(text,fault,kind){
  const result=protocol(text,fault);assert.ifError(result.error);
  const field=fault==='skip-platform'?'platform_reads':fault==='skip-locale'?'locale_reads':null;
  // Assert the missing read itself; an unrelated locale mismatch must not hide a fabricated counter.
  if(field)assert.ok(result.provided.scopes.every(scope=>scope[field]===0),'Observer concealed missing factory read');
  assert.equal(predicates[kind](kind==='constructor'?result.manual:result.provided).result,'fail');
}
let sourceMutants=0;
for(const [mutant,fault,kind] of fixtureMutants){
  assert.notEqual(mutant,fixture);checkObserverRejectsFault(fixture,fault,kind);
  assert.throws(()=>checkObserverRejectsFault(mutant,fault,kind));sourceMutants++;
}
const tree=ts.createSourceFile('fixture.ts',fixture,ts.ScriptTarget.Latest,true);assert.equal(tree.parseDiagnostics.length,0);
assert.deepEqual(tree.statements.filter(ts.isImportDeclaration).map(node=>node.moduleSpecifier.text),['@angular/core','@angular/core/testing','@angular/cdk/platform','@angular/material/core','@ngx-compat/material-legacy/legacy-core']);
assert.doesNotMatch(fixture,/ɵ|new Platform|createApplication|bootstrapApplication|\.useUtcForDisplay|\.\_\w+|any\s*\)\s*=>\s*true/);
const report={schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',
  predicate_corruption_controls:mutations,generated_observer_protocol_defects_detected:protocolDefects,observer_status_mutants_rejected:sourceMutants,
  existing_case_ids_unchanged:106,owned_source_sha256:hash(adapterSource),owned_module_sha256:hash(moduleSource),
  fixture_sha256:hash(fixture),protocol_uses_owned_algorithm_and_module_source:true,public_base_and_injector_are_test_protocols:true,
  packed_collector_exercised:false,actual_Angular_DI_or_artifact_factory_executed:false,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
