/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {writeFileSync} from 'node:fs';
const packageRoot=resolve(process.argv[2]),workspace=resolve(process.argv[3]);
const require=createRequire(join(workspace,'package.json')),load=s=>import(pathToFileURL(require.resolve(s)).href);
const {createPublicFactoryContext}=await import(pathToFileURL(join(workspace,'scripts/api-public-node-context.mjs')).href);
const {captureFactoryConstructorInputs}=await import(pathToFileURL(join(workspace,'scripts/api-factory-constructor-inputs.mjs')).href);
const {loadRuntimeModule,runFactory}=await import(pathToFileURL(join(workspace,'scripts/api-di-observe.mjs')).href);
await load('@angular/compiler');const core=await load('@angular/core'),{Subject}=await load('rxjs');
const family=await loadRuntimeModule(packageRoot,'legacy-form-field','primary'),Type=family.MatLegacyFormField;
const fixture=await createPublicFactoryContext(core,load,{providers:[core.importProvidersFrom(family.MatLegacyFormFieldModule)],nodeFactory:()=>captureFactoryConstructorInputs(Type)});
const results=[];
try{
 // Both hintLabel and mat-hint IDs share one DOM namespace. Exercise the
 // actual compiler-constructed field, historical seven-argument fields, and
 // manually constructed hints in a fresh packed-module process.
 {
  const seven=fixture.element.execution.inputs.slice(0,7);
  const fields=[fixture.element.execution.value];
  for(let i=0;i<8;i++)fields.push(new Type(...seven));
  try{
   const hints=Array.from({length:32},()=>new family.MatLegacyHint());
   const generated=[...fields.map(field=>field._hintLabelId),...hints.map(hint=>hint.id)];
   assert.equal(new Set(generated).size,generated.length,'generated hint IDs must be unique across field labels and projected hints');
   const labelNumbers=fields.map(field=>{
    const match=/^mat-form-field-label-(\d+)$/.exec(field._labelId);
    assert.ok(match,'historical field label ID prefix');return Number(match[1]);
   });
   for(let i=1;i<labelNumbers.length;i++)assert.equal(labelNumbers[i]-labelNumbers[i-1],2,'field label ID sequence');
   hints[0].id='consumer-authored-hint';assert.equal(hints[0].id,'consumer-authored-hint');
   results.push({crossClassGeneratedIdsUnique:true,manualSevenArguments:true,fieldLabelSequencePreserved:true,authoredHintIdPreserved:true});
  }finally{for(const field of fields.slice(1))field.ngOnDestroy();}
 }
 for(const noop of [false,true]){
  const inputs=[...fixture.element.execution.inputs.slice(0,7)];inputs[6]=noop?'NoopAnimations':'BrowserAnimations';
  const field=new Type(...inputs);assert.equal(field._injector,undefined);assert.equal(field._animationsEnabled,!noop);
  field._control={};for(const prop of ['_prefixChildren','_suffixChildren','_hintChildren','_errorChildren'])field[prop]={changes:new Subject()};
  field._processHints=()=>{};field._syncDescribedByIds=()=>{};field._platform={isBrowser:true};field._subscriptAnimationState='enter';
  let kind='hint',animations=[],queries=[];field._getDisplayedMessages=()=>kind;
  const message={style:{},animate(frames,options){const animation={frames,options,canceled:0,cancel(){this.canceled++;}};animations.push(animation);return animation;}};
  field._elementRef.nativeElement.querySelector=selector=>{queries.push(selector);return message;};field.ngAfterContentInit();
  const step=()=>field._ngZone.onStable.emit();step();assert.equal(animations.length,0);assert.equal(message.style.opacity,'1');
  kind='error';step();assert.equal(animations.length,noop?0:1);step();assert.equal(animations.length,noop?0:1);
  kind='hint';step();assert.equal(animations.length,noop?0:2);if(!noop)assert.equal(animations[0].canceled,1);
  field.ngOnDestroy();if(!noop)assert.equal(animations[1].canceled,1);const prior=queries.length;step();assert.equal(queries.length,prior);
  results.push({noop,manualSevenArguments:true,initialUnanimated:true,sameKindUnchanged:true,switches:animations.length,destroyCanceled:true,postDestroyIgnored:true});
 }

 // The old seven-argument constructor is used by subclasses in active Angular
 // node contexts, but is also called manually without any injection context.
 const seven=fixture.element.execution.inputs.slice(0,7),provided=core.Injector.create({providers:[]});
 try{
  const explicit=runFactory(()=>new Type(...seven,provided),core.Injector,core.runInInjectionContext,{injector:fixture.element.injector});
  assert.equal(explicit.outcome,'returned',explicit.error);assert.equal(explicit.value._injector,provided);assert.equal(explicit.requests.filter(r=>r.token===core.Injector).length,0);explicit.value.ngOnDestroy();
  const inherited=runFactory(()=>new Type(...seven),core.Injector,core.runInInjectionContext,{injector:fixture.element.injector});
  assert.equal(inherited.outcome,'returned',inherited.error);assert.equal(inherited.requests.filter(r=>r.token===core.Injector).length,1);
  const actual=inherited.value._injector;assert.equal(actual.get(core.ElementRef).nativeElement,fixture.element.element.nativeElement);
  assert.equal(actual.get(fixture.scopeToken,null,{self:true}),fixture.childValue);assert.equal(actual.get(fixture.scopeToken,null,{skipSelf:true}),fixture.parentValue);inherited.value.ngOnDestroy();
  const normal=runFactory(()=>captureFactoryConstructorInputs(Type),core.Injector,core.runInInjectionContext,{injector:fixture.element.injector});
  assert.equal(normal.outcome,'returned',normal.error);assert.equal(normal.requests.filter(r=>r.token===core.Injector).length,1);assert.equal(normal.value.value._injector,normal.value.inputs[7]);normal.value.value.ngOnDestroy();
  class FailingInjector extends core.Injector {get(token,notFound,flags){if(token===core.Injector)throw Error('controlled injector failure');return fixture.element.injector.get(token,notFound,flags);}}
  assert.throws(()=>core.runInInjectionContext(new FailingInjector(),()=>new Type(...seven)),/controlled injector failure/);
  const explicitNull=new Type(...seven,null);assert.equal(explicitNull._injector,null);explicitNull.ngOnDestroy();
  results.push({ambientSevenNodeScope:true,ambientSevenInjectorRequests:1,explicitEightIdentity:true,explicitEightInjectorRequests:0,compilerFactoryInjectorRequests:1,lookupErrorPropagated:true,explicitNullPreserved:true});
 }finally{provided.destroy();}
}finally{fixture.close();}
writeFileSync(join(process.env.MOTION_OUTPUT,'manual-constructor-report.json'),JSON.stringify({results,scope:'Actual packed class, public Angular node inputs and controlled stable/DOM protocols; not native browser qualification.'},null,2)+'\n');
console.log(JSON.stringify({passed:true,results}));
