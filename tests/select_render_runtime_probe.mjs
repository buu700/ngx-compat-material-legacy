/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole constructors/members/field initializers; the mixed trait parent and services are protocols. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=text=>createHash('sha256').update(text).digest('hex');
const paths={base:'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
 select:'projects/ngx-material-legacy/legacy-select/select.ts',helper:'projects/ngx-material-legacy/legacy-select/internal/after-select-render.ts',
 optionHelper:'projects/ngx-material-legacy/legacy-core/option/option-helpers.ts',event:'projects/ngx-material-legacy/legacy-core/option/option-base.ts'};
const originalPaths={base:'reference/material-16.2.14/select-render-sources/select-base.ts',select:'reference/material-16.2.14/select-render-sources/select.ts',option:'reference/material-16.2.14/select-render-sources/option.ts'};
const read=path=>readFileSync(join(root,path),'utf8'),candidate=Object.fromEntries(Object.entries(paths).map(([key,path])=>[key,read(path)]));
const original=Object.fromEntries(Object.entries(originalPaths).map(([key,path])=>[key,read(path)]));
assert.equal(hash(original.base),'ba939bcc724eab50cc71c628c3977ddd68f052bfb265a77de8793ec09562cd73');
assert.equal(hash(original.select),'f75594460cc49d590a74643ce2888990f498262d83c63d907966d5095ee0098d');
assert.equal(hash(original.option),'7f6125fb21fb2aa555155648ab357d3813c96a6588cdc8b85b216d13deee2fb1');
const parse=text=>{const source=ts.createSourceFile('subject.ts',text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);return source;};
const printer=ts.createPrinter({removeComments:true});
const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,removeComments:true}}).outputText;
function declaration(text,name){const source=parse(text),node=source.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text===name);assert.ok(node);return{source,node};}
function program(text,name,base=false){
 const{source,node}=declaration(text,name);
 const cls=ts.factory.updateClassDeclaration(node,[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],node.name,
  undefined,node.heritageClauses,node.members);
 const stripped=ts.transform(cls,[context=>node=>{const visit=node=>ts.isDecorator(node)?undefined:ts.visitEachChild(node,visit,context);return ts.visitNode(node,visit);}]);
 try{
  const reactive=base?source.statements.filter(node=>ts.isVariableStatement(node)&&
   node.declarationList.declarations.some(decl=>decl.name.text==='_MatSelectReactiveMixinBase')):[];
  assert.ok(reactive.length<=1,'ambiguous owned reactive select base');
  const constants=base?'let nextUniqueId=0;\n'+reactive.map(node=>node.getText(source)).join('\n'):source.statements.filter(node=>ts.isVariableStatement(node)&&
   node.declarationList.declarations.some(decl=>decl.name.text?.startsWith('SELECT_'))).map(node=>node.getText(source)).join('\n');
  return emit(constants+'\n'+printer.printNode(ts.EmitHint.Unspecified,stripped.transformed[0],source));
 }finally{stripped.dispose();}
}
const helperProgram=text=>{const source=parse(text);return emit(source.statements.filter(node=>!ts.isImportDeclaration(node)).map(node=>node.getFullText(source)).join('\n'));};
const ctor=text=>{const{source,node}=declaration(text,'_MatSelectBase');return{source,node:node.members.find(ts.isConstructorDeclaration)};};
const oldBase=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show','94cabb125:'+paths.base],{cwd:root,encoding:'utf8'});
const before=ctor(oldBase),after=ctor(candidate.base),print=(node,source)=>printer.printNode(ts.EmitHint.Unspecified,node,source);
assert.equal(before.node.parameters.length,14);assert.equal(after.node.parameters.length,15);
assert.deepEqual(after.node.parameters.slice(0,14).map(node=>print(node,after.source)),before.node.parameters.map(node=>print(node,before.source)));
assert.equal(print(after.node.body,after.source),print(before.node.body,before.source));
const added=after.node.parameters[14];assert.equal(added.name.text,'_injector');assert.equal(added.type.getText(after.source),'Injector');assert.ok(added.questionToken);
assert.equal(ts.getDecorators(added),undefined);
const helperSource=parse(candidate.optionHelper),group=helperSource.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='_countGroupLabelsBeforeOption');assert.ok(group);
const event=declaration(candidate.event,'MatOptionSelectionChange');
const originalOption=parse(original.option),originalGroup=originalOption.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='_countGroupLabelsBeforeOption');assert.ok(originalGroup);
assert.equal(print(group.body,helperSource),print(originalGroup.body,originalOption),'whole option-group helper must match the tagged reference');
const originalEvent=declaration(original.option,'MatOptionSelectionChange');
assert.equal(print(event.node,event.source),print(originalEvent.node,originalEvent.source),'whole selection-event class must match the tagged reference');
const selectChange=declaration(candidate.select,'MatLegacySelectChange');
const originalSelectChange=declaration(original.select,'MatLegacySelectChange');
assert.equal(print(selectChange.node,selectChange.source),print(originalSelectChange.node,originalSelectChange.source),'whole select-change class must match the tagged reference');
const changed=(text,from,to)=>{const value=text.replace(from,to);assert.notEqual(value,text);return value;};
const mutations={
 priorWait:program(changed(candidate.select,'afterSelectRender(this._ngZone, this._injector)','this._ngZone.onStable.pipe(take(1))'),'MatLegacySelect'),
 earlyPriorWait:program(changed(candidate.base,'    this._initialized.next();\n',''),'_MatSelectBase',true),
 prematureContent:program(changed(candidate.base,'filter(() => this._ngZone.isStable)','filter(() => true)'),'_MatSelectBase',true),
 noEarlyDestroy:program(changed(candidate.base,'      takeUntil(this._destroy),\n      switchMap(() => this.optionSelectionChanges),','      switchMap(() => this.optionSelectionChanges),'),'_MatSelectBase',true),
 noDestroy:program(changed(candidate.select,'        .pipe(takeUntil(this._destroy)).subscribe(() => {','        .subscribe(() => {'),'MatLegacySelect'),
 leakedRender:helperProgram(changed(candidate.helper,'      rendered?.destroy();','')),
 premature:helperProgram(changed(candidate.helper,'if (zone.isStable)','if (true)')),
 noOnce:helperProgram(changed(candidate.helper,'  }).pipe(take(1));','  });')),
 noErrorCleanup:helperProgram(changed(candidate.helper,'      stable.unsubscribe();\n      throw error;','      throw error;')),
 badRippleCoercion:program(changed(candidate.base,'this._selectDisableRipple.set(coerceBooleanProperty(value))','this._selectDisableRipple.set(!!value)'),'_MatSelectBase',true),
};
const loaded=prepareMaterialPublicSubjects(root),results=[];
try{
 const compilerPath=process.env.CLOSEOUT_TYPESCRIPT_ROOT?join(process.env.CLOSEOUT_TYPESCRIPT_ROOT,'lib/typescript.js'):require.resolve('typescript');
 const compiler=require(compilerPath),types=[],contracts=[];
 for(const model of loaded.models.filter(model=>model.line!=='original')){
  const fixture=candidate.helper+`\nimport {Injector as PublicInjector,NgZone as PublicZone} from '@angular/core';
declare const zone:PublicZone,injector:PublicInjector;
const result:Observable<void>=afterSelectRender(zone,injector);
afterSelectRender(zone);afterSelectRender(zone,null);
class TrailingInjector {
 constructor(first:string, protected _injector?:PublicInjector){}
}
new TrailingInjector('old call');new TrailingInjector('new call',injector);
// @ts-expect-error Historical required arguments remain required.
new TrailingInjector();
// @ts-expect-error The new trailing parameter has the genuine public Injector type.
new TrailingInjector('value',{});
// @ts-expect-error A real public zone type is required.
afterSelectRender({},injector);
// @ts-expect-error A real public injector type is required.
afterSelectRender(zone,{});
// @ts-expect-error The render callback stream is not boolean.
const flags:Observable<boolean>=afterSelectRender(zone,injector);
// @ts-expect-error Stability observation remains readonly.
zone.isStable=true;
`;
  const path=join(model.root,'select-render-helper-consumer.ts');writeFileSync(path,fixture);
  const p=compiler.createProgram([path],{target:compiler.ScriptTarget.ES2022,module:compiler.ModuleKind.ESNext,
   moduleResolution:compiler.ModuleResolutionKind.Bundler,experimentalDecorators:true,strict:true,noEmit:true,skipLibCheck:false,lib:['lib.es2022.d.ts','lib.dom.d.ts']});
  const diagnostics=compiler.getPreEmitDiagnostics(p);assert.equal(diagnostics.length,0,compiler.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  types.push({line:model.line,fixture_sha256:hash(fixture),negative_checks:6,actual_legacy_constructor_compiled:false});
  for(const[path,text]of model.sources)if(path.startsWith('@angular/core/')&&path.endsWith('.d.ts')){
   const source=parse(text);
   for(const node of source.statements)if((ts.isFunctionDeclaration(node)&&node.name?.text==='afterNextRender')||
    (ts.isInterfaceDeclaration(node)&&node.name.text==='AfterRenderRef')||(ts.isClassDeclaration(node)&&node.name?.text==='Injector')){
    assert.ok(!ts.getJSDocTags(node).some(tag=>['deprecated','internal','experimental','developerPreview'].includes(tag.tagName.text)));
    contracts.push({line:model.line,path,source_sha256:hash(text),name:node.name.text,whole:node.getText(source)});
   }
  }
 }
 for(const model of loaded.models){
  const zoneSubject=installNgZonePublicSubject(model,root);
  writeFileSync(join(model.root,'select-render-payload.json'),JSON.stringify({original:{base:program(original.base,'_MatSelectBase',true),select:program(original.select,'MatLegacySelect')},
   candidate:{base:program(candidate.base,'_MatSelectBase',true),select:program(candidate.select,'MatLegacySelect')},helper:helperProgram(candidate.helper),
   group:emit(originalGroup.getText(originalOption)),event:emit(originalEvent.node.getText(originalEvent.source)),selectChange:emit(selectChange.node.getText(selectChange.source)),mutations}));
  for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of[false,true]){
   const script=`${production?'globalThis.ngDevMode=false;':''}
import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
${mode==='zoneful'?"await import('zone.js/node');":''}
await import('@angular/compiler');const core=await import('@angular/core'),rx=await import('rxjs'),ops=await import('rxjs/operators'),forms=await import('@angular/forms'),coercion=await import('@angular/cdk/coercion');
const payload=JSON.parse(readFileSync(new URL('./select-render-payload.json',import.meta.url))),group={},events={},selectEvents={};
new Function('exports',payload.group)(group);new Function('exports',payload.event)(events);new Function('exports',payload.selectChange)(selectEvents);
let app,zone,manual;
${model.line==='original'?`zone=new core.NgZone({enableLongStackTrace:false});manual=core.Injector.create({providers:[]});`:`
const common=await import('@angular/common'),browser=await import('@angular/platform-browser');
app=await browser.createApplication({providers:[core.${mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection'}(),
 {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
 {provide:core.DOCUMENT,useValue:{head:{children:[]}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}}]});
zone=app.injector.get(core.NgZone);${mode==='zoneless'?"assert.equal(typeof globalThis.Zone,'undefined');":''}
`}
let renders=0;const trackedRender=(callback,options)=>core.afterNextRender(()=>{renders++;callback();},options);
function helper(js){const exports={};new Function('exports','afterNextRender','ApplicationRef','Observable','take',js)(exports,trackedRender,core.ApplicationRef,rx.Observable,ops.take);return exports.afterSelectRender;}
function replay(sources,helperJs){const base={},select={},common={Subject:rx.Subject,Observable:rx.Observable,defer:rx.defer,merge:rx.merge,
 afterSelectRender:helper(helperJs),
 EventEmitter:core.EventEmitter,signal:core.signal,coerceBooleanProperty:coercion.coerceBooleanProperty,filter:ops.filter,map:ops.map,startWith:ops.startWith,switchMap:ops.switchMap,take:ops.take,takeUntil:ops.takeUntil,distinctUntilChanged:ops.distinctUntilChanged};
 class ProtocolTraits{constructor(element,matcher,parent,group,ngControl){this._elementRef=element;this.ngControl=ngControl;this.stateChanges=new rx.Subject();this.disabled=false;}}
 new Function('exports','_MatSelectMixinBase',...Object.keys(common),sources.base)(base,ProtocolTraits,...Object.values(common));
 new Function('exports','_MatSelectBase','take','takeUntil','afterSelectRender','getComputedStyle','_countGroupLabelsBeforeLegacyOption','legacyAnimationsDisabled','MatLegacySelectChange',sources.select)
 (select,base._MatSelectBase,ops.take,ops.takeUntil,helper(helperJs),()=>({fontSize:'20px'}),group._countGroupLabelsBeforeOption,()=>true,selectEvents.MatLegacySelectChange);
 return select.MatLegacySelect;}
function fixture(sources=payload.candidate,helperJs=payload.helper,injector=app?.injector??manual){
 const Type=replay(sources,helperJs),options=new core.QueryList(),groups=new core.QueryList(),control=new forms.FormControl('alpha');
 const option=value=>({value,selected:false,disabled:false,group:null,onSelectionChange:new rx.Subject(),_stateChanges:new rx.Subject(),
 select(){this.selected=true;},deselect(){this.selected=false;},setInactiveStyles(){}});
 const first=option('alpha'),second=option('beta');options.reset([first,second]);groups.reset([]);
 const selection={selected:[],changed:new rx.Subject(),isEmpty(){return this.selected.length===0;},isSelected(o){return this.selected.includes(o);},
  clear(){this.selected=[];},select(o){if(!this.isSelected(o))this.selected.push(o);},deselect(o){this.selected=this.selected.filter(item=>item!==o);}};
 let fontWrites=0,font=null,measurements=0,marks=0,focused=0;const style={};Object.defineProperty(style,'fontSize',{set(value){fontWrites++;font=value;}});
 const key={activeItem:null,activeItemIndex:-1,withHorizontalOrientation(){return this;},setActiveItem(value){this.updateActiveItem(value);},
  updateActiveItem(value){this.activeItem=typeof value==='number'?options.get(value)??null:value;this.activeItemIndex=options.toArray().indexOf(this.activeItem);},destroy(){}};
 const native={focus(){focused++;},closest:()=>null,getBoundingClientRect(){measurements++;return{left:200,right:320,top:150,bottom:174,width:120,height:24};}};
 const viewport={getViewportSize:()=>({width:800,height:600})},cdr={markForCheck(){marks++;},detectChanges(){}},element=new core.ElementRef(native),dir={value:'ltr'},ngControl={get value(){return control.value;}};
 const args=[viewport,cdr,zone,{},element,dir,null,null,null,ngControl,'0',()=>({}),{},undefined];
 if(injector!=null)args.push(injector);
 const instance=new Type(...args);assert.equal(ngControl.valueAccessor,instance,'historical-manual-value-accessor-registration');
 if(sources.base===payload.candidate.base||sources.base===payload.mutations.badRippleCoercion){assert.equal(instance._injector,injector??undefined,'optional-injector-parameter-property');
  assert.equal(core.isSignal(instance._selectDisableRipple),true,'owned-reactive-ripple-signal');
  for(const [input,expected] of [[true,true],['',true],['false',false],[null,false]]){instance.disableRipple=input;assert.equal(instance.disableRipple,expected,'owned-reactive-ripple-coercion');}}

 Object.assign(instance,{_selectionModel:selection,_keyManager:key,_initKeyManager(){},trigger:element,options,optionGroups:groups,
  _overlayDir:{overlayRef:{overlayElement:{style}},positionChange:new rx.Subject()}});
 instance.registerOnChange(value=>control.setValue(value));const emitted=[];instance.selectionChange.subscribe(event=>emitted.push(event.value));
 return{instance,options,first,second,control,emitted,counts:()=>({fontWrites,font,measurements,marks,focused}),
  snapshot:()=>({font,geometry:{offsetY:instance._offsetY,scrollTop:instance._scrollTop,origin:instance._transformOrigin},control:control.value,emitted:[...emitted]})};
}
const drain=()=>new Promise(resolve=>setTimeout(resolve,0));function render(){app?.tick();}
async function opened(sources=payload.candidate,helperJs=payload.helper,injector=app?.injector??manual,expectedFont=true){const f=fixture(sources,helperJs,injector);
 try{
 zone.run(()=>{f.instance.ngAfterContentInit();});await drain();
 zone.run(()=>{f.instance.open();${mode==='zoneful'?"render();assert.equal(f.counts().fontWrites,0,'zoneful-render-cannot-preempt-stability');":''}});render();await drain();
 if(expectedFont)assert.equal(f.counts().font,'20px','panel-inherits-trigger-font');else assert.equal(f.counts().font,null,'historical-zoneless-font-stays-pending');
 const before=f.counts().fontWrites;zone.run(()=>{});await drain();assert.equal(f.counts().fontWrites,before,'font-copied-once');
 return f.snapshot();}finally{f.instance.ngOnDestroy();}}
async function initialized(sources=payload.candidate,expected=true){const f=fixture(sources);f.instance.options=undefined;const seen=[];
 const subscription=f.instance.optionSelectionChanges.subscribe(event=>seen.push(event.source.value));f.instance.options=f.options;
 zone.run(()=>{f.instance.ngAfterContentInit();${mode==='zoneful'?"f.second.selected=true;f.second.onSelectionChange.next(new events.MatOptionSelectionChange(f.second,false));assert.deepEqual(seen,[],'zoneful-query-stream-awaits-stability');":''}});render();await drain();f.second.selected=true;f.second.onSelectionChange.next(new events.MatOptionSelectionChange(f.second,false));
 assert.deepEqual(seen,expected?['beta']:[],'initialized-option-stream');const result={seen,control:f.control.value,emitted:f.emitted};
 subscription.unsubscribe();f.instance.ngOnDestroy();return result;}
async function destroyBeforeInit(sources=payload.candidate){const f=fixture(sources);f.instance.options=undefined;let complete=false;
 const sub=f.instance.optionSelectionChanges.subscribe({complete:()=>complete=true});try{f.instance.ngOnDestroy();assert.equal(complete,true,'destroy-completes-early-stream');}finally{sub.unsubscribe();}}
async function manualBeforeContent(sources){const f=fixture(sources,payload.helper,null);f.instance.options=undefined;const seen=[];
 const sub=f.instance.optionSelectionChanges.subscribe(event=>seen.push(event.source.value));
 try{zone.run(()=>{});await drain();assert.deepEqual(seen,[]);f.instance.options=f.options;zone.run(()=>{});await drain();
  f.second.onSelectionChange.next(new events.MatOptionSelectionChange(f.second,false));assert.deepEqual(seen,['beta'],'manual-zone-stream-without-content-hook');return seen;
 }finally{sub.unsubscribe();f.instance.ngOnDestroy();}}
async function canceled(sources=payload.candidate,helperJs=payload.helper,close=false){const f=fixture(sources,helperJs),before=renders;
 zone.run(()=>{f.instance.open();if(close)f.instance.close();else f.instance.ngOnDestroy();});render();await drain();
 assert.equal(f.counts().fontWrites,0,'no-font-work-after-close-or-destroy');if(!close)assert.equal(renders,before,'canceled-render-hook');if(close)f.instance.ngOnDestroy();}
async function errorCleanup(helperJs){let active=0;const emitter=zone.onStable,subscribe=emitter.subscribe;
 emitter.subscribe=function(...args){const sub=subscribe.apply(this,args);active++;sub.add(()=>active--);return sub;};
 const bad=core.Injector.create({providers:[{provide:core.ApplicationRef,useFactory:()=>{throw new Error('expected-lookup-error');}}]});
 try{let error;helper(helperJs)(zone,bad).subscribe({error:value=>error=value});assert.equal(error?.message,'expected-lookup-error');assert.equal(active,0,'lookup-error-cleans-zone-subscription');}
 finally{emitter.subscribe=subscribe;bad.destroy();}}
try{
 const old=await opened(payload.original,payload.helper,app?.injector??manual,${mode==='zoneful'}),candidate=await opened();
 ${mode==='zoneful'?'assert.deepEqual(candidate,old);':''}
 const originalInitialized=await initialized(payload.original,${mode==='zoneful'}),ready=await initialized();
 await destroyBeforeInit();await canceled();await canceled(payload.candidate,payload.helper,true);await errorCleanup(payload.helper);
 let manualResult=null,manualEarly=null;${mode==='zoneful'?"manualResult=await opened(payload.candidate,payload.helper,null);manualEarly=await manualBeforeContent(payload.candidate);assert.deepEqual(manualEarly,await manualBeforeContent(payload.original));":''}
 const mutations=[];
 ${model.line!=='original'?`
 const reject=async(id,op,message)=>{await assert.rejects(op,error=>error.code==='ERR_ASSERTION'&&error.message.startsWith(message));mutations.push({id,rejected:true});};
 await reject('wrong-ripple-coercion',()=>opened({...payload.candidate,base:payload.mutations.badRippleCoercion}),'owned-reactive-ripple-coercion');
 if(${mode==='zoneless'}){
  await reject('prior-zone-only-font-wait',()=>opened({...payload.candidate,select:payload.mutations.priorWait}),'panel-inherits-trigger-font');
  await reject('missing-zoneless-content-readiness',()=>initialized({...payload.candidate,base:payload.mutations.earlyPriorWait}),'initialized-option-stream');
  await reject('destroy-retains-early-stream',()=>destroyBeforeInit({...payload.candidate,base:payload.mutations.noEarlyDestroy}),'destroy-completes-early-stream');
  await reject('destroy-retains-render-subscription',()=>canceled({...payload.candidate,select:payload.mutations.noDestroy}),'canceled-render-hook');
  await reject('retained-render-handle',()=>canceled(payload.candidate,payload.mutations.leakedRender),'canceled-render-hook');
 }else{
  await reject('removed-stability-guard',()=>opened(payload.candidate,payload.mutations.premature),'zoneful-render-cannot-preempt-stability');
  await reject('content-readiness-preempts-zone-stability',()=>initialized({...payload.candidate,base:payload.mutations.prematureContent}),'zoneful-query-stream-awaits-stability');
  await reject('removed-once-only-completion',()=>opened(payload.candidate,payload.mutations.noOnce),'font-copied-once');
 }
 await reject('lookup-error-leaks-zone-subscription',()=>errorCleanup(payload.mutations.noErrorCleanup),'lookup-error-cleans-zone-subscription');
 `:''}
 console.log(JSON.stringify({old,candidate,originalInitialized,ready,manualResult,manualEarly,ownedReactiveRippleVerified:true,renders,mutations,genuine_public_application:!!app,
  whole_source_constructors_replayed:true,angular_decorators_traits_or_node_DI_executed:false,native_executed:false}));
}finally{app?.destroy();manual?.destroy();core.destroyPlatform();}
`;
   const path=join(model.root,'select-render-runtime-'+mode+'-'+production+'.mjs');writeFileSync(path,script);
   const value=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512',path],{cwd:model.root,env:process.env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));
   results.push({line:model.line,mode,production,zone_subject:zoneSubject,...value});
  }
 }
 const report={schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',
  sources:Object.entries(paths).map(([role,path])=>({role,path,sha256:hash(read(path))})),reference:Object.entries(originalPaths).map(([role,path])=>({role,path,sha256:hash(read(path))})),
  node:process.version,binding_parser:ts.version,namespace_capsule_sha256:loaded.capsule_hash,results,public_contracts:contracts,
  constructor_change:{historical_parameters:14,current_parameters:15,historical_14_parameters_and_authored_body_identical:true,new_optional_trailing_public_Injector:true,whole_source_constructor_bodies_replayed_with_protocol_trait_parent:true,actual_legacy_traits_or_node_DI_executed:false},
  type_compilation:{compiler:compiler.version,compiler_source_sha256:hash(readFileSync(compilerPath)),subjects:types},
  scope:'Complete original/owned select-base and derived constructors, members and field initializers with derived inheritance, including the exact owned reactive mixin declaration and genuine public signal/coercion functions. The mixed trait parent is a protocol and Angular decorators are removed. Genuine public NgZone, QueryList, EventEmitter, FormControl and current public application/render hooks. Old 14-argument construction and new 15th injector assignment execute. Option/selection model/key manager, DOM geometry/styles, view/overlay/change-detector/direction/viewport services are protocols; _initKeyManager and disabled-motion policy are protocols. Actual legacy traits/node DI/AOT/packed/native geometry, consumer builds and Rx/Node floors remain unqualified.',
  native_or_actual_legacy_instances_qualified:false,g11_claim:'not-passed'};
 assert.equal(results.length,10);assert.ok(results.every(row=>row.ownedReactiveRippleVerified));if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:report.line,subjects:10,mutation_rejections:results.flatMap(row=>row.mutations).length,compiler:compiler.version,native_executed:false,actual_legacy_instances_qualified:false}));
}finally{loaded.dispose();}
