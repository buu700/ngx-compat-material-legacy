/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete source bodies excluding constructors/decorators; genuine public application hooks. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = text => createHash('sha256').update(text).digest('hex');
const originalPath = 'reference/material-16.2.14/component-behavior-sources/autocomplete/autocomplete-trigger.ts';
const candidatePath = 'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts';
const helperPath = 'projects/ngx-material-legacy/legacy-autocomplete/internal/after-legacy-render.ts';
const eventPath = 'projects/ngx-material-legacy/legacy-core/option/option-base.ts';
const read = path => readFileSync(join(root, path), 'utf8');
const original = read(originalPath), candidate = read(candidatePath), helper = read(helperPath);
assert.equal(hash(original), 'b69decaf81ef29dd665a0b267f3a121837212157b31ddd02c3b617fa958844f2');
const emit = text => ts.transpileModule(text, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, removeComments: true}}).outputText;
const parse = text => { const source = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source; };
function helperProgram(text) {
  const source = parse(text); return emit(source.statements.filter(node => !ts.isImportDeclaration(node))
    .map(node => node.getFullText(source)).join('\n'));
}
function bodyProgram(text) {
  const source = parse(text), owner = source.statements.find(node => ts.isClassDeclaration(node) &&
    node.name?.text === '_MatAutocompleteTriggerBase'); assert.ok(owner);
  const cls = ts.factory.updateClassDeclaration(owner, [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier('Replay'), undefined, undefined, owner.members.filter(node => !ts.isConstructorDeclaration(node)));
  const transformed = ts.transform(cls, [context => node => {
    const visit = node => ts.isDecorator(node) ? undefined : ts.visitEachChild(node, visit, context);
    return ts.visitNode(node, visit);
  }]);
  try {
    const state = source.statements.filter(node => ts.isVariableStatement(node) &&
      node.declarationList.declarations.some(decl => decl.name.getText(source) === 'hiddenPanePointerState'));
    assert.ok(state.length <= 1, 'ambiguous owned hidden-pane pointer state');
    return emit(state.map(node => node.getText(source)).join('\n') + '\n' +
      ts.createPrinter().printNode(ts.EmitHint.Unspecified, transformed.transformed[0], source));
  }
  finally { transformed.dispose(); }
}
const eventSource = parse(read(eventPath));
const eventClass = eventSource.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'MatOptionSelectionChange');
assert.ok(eventClass);
const eventProgram = emit(eventClass.getText(eventSource));
const priorWait = candidate.replace('afterLegacyRender(this._zone, this._viewContainerRef.injector)', 'this._zone.onStable.pipe(take(1))');
assert.notEqual(priorWait, candidate);
const leakedRender = helper.replace('rendered?.destroy();', ''); assert.notEqual(leakedRender, helper);
const premature = helper.replace('if (zone.isStable)', 'if (true)'); assert.notEqual(premature, helper);
const noInitializer = candidate.replace('    this._initialized.next();\n', ''); assert.notEqual(noInitializer, candidate);
const noDestroyCancel = candidate.replace('    this._closingActionsSubscription?.unsubscribe();\n', ''); assert.notEqual(noDestroyCancel, candidate);
const noErrorCleanup = helper.replace('      stable.unsubscribe();\n      throw error;', '      throw error;'); assert.notEqual(noErrorCleanup, helper);
const noInitCompletion = candidate.replaceAll('    this._initialized.complete();\n', ''); assert.notEqual(noInitCompletion, candidate);
const noPointerState = candidate.replace('const hiddenPanePointerState = new WeakMap<OverlayRef, {value: string; priority: string}>();', ''); assert.notEqual(noPointerState, candidate);

const loaded = prepareMaterialPublicSubjects(root), results = [];
try {
  const compilerPath = process.env.CLOSEOUT_TYPESCRIPT_ROOT ? join(process.env.CLOSEOUT_TYPESCRIPT_ROOT, 'lib/typescript.js') : require.resolve('typescript');
  const compiler = require(compilerPath), types = [], contracts = [];
  for (const model of loaded.models.filter(model => model.line !== 'original')) {
    const fixture = helper + `\nimport {Injector as PublicInjector,NgZone as PublicZone} from '@angular/core';
declare const zone:PublicZone,injector:PublicInjector;
const result:Observable<void>=afterLegacyRender(zone,injector);
result.subscribe(value=>{const nothing:void=value;});
// @ts-expect-error A real public zone is required.
afterLegacyRender({},injector);
// @ts-expect-error A real public injector is required.
afterLegacyRender(zone,{});
// @ts-expect-error The callback stream is not a boolean stream.
const flags:Observable<boolean>=afterLegacyRender(zone,injector);
// @ts-expect-error Historical stable observation is readonly.
zone.isStable=true;
`;
    const path = join(model.root, 'autocomplete-render-helper-consumer.ts'); writeFileSync(path, fixture);
    const program = compiler.createProgram([path], {target: compiler.ScriptTarget.ES2022,
      module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
      strict: true, noEmit: true, skipLibCheck: false, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {
      getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    types.push({line: model.line, fixture_sha256: hash(fixture), negative_checks: 4});
    for (const [path, text] of model.sources) if (path.startsWith('@angular/core/') && path.endsWith('.d.ts')) {
      const source = parse(text);
      for (const node of source.statements) if ((ts.isFunctionDeclaration(node) && node.name?.text === 'afterNextRender') ||
          (ts.isInterfaceDeclaration(node) && node.name.text === 'AfterRenderRef')) {
        assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'internal', 'developerPreview', 'experimental'].includes(tag.tagName.text)));
        contracts.push({line: model.line, path, source_sha256: hash(text), name: node.name.text,
          tags: ts.getJSDocTags(node).map(tag => tag.tagName.text), whole: node.getText(source)});
      }
    }
  }
  for (const model of loaded.models) {
    const zoneSubject = installNgZonePublicSubject(model, root);
    const payload = {original: bodyProgram(original), candidate: bodyProgram(candidate), helper: helperProgram(helper), event: eventProgram,
      mutations: {priorWait: bodyProgram(priorWait), noInitializer: bodyProgram(noInitializer),
        noDestroyCancel: bodyProgram(noDestroyCancel), noPointerState: bodyProgram(noPointerState), leakedRender: helperProgram(leakedRender),
        premature: helperProgram(premature), noErrorCleanup: helperProgram(noErrorCleanup), noInitCompletion: bodyProgram(noInitCompletion)}};
    writeFileSync(join(model.root, 'autocomplete-render-payload.json'), JSON.stringify(payload));
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const script = `${production ? 'globalThis.ngDevMode=false;' : ''}
import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
${mode === 'zoneful' ? "await import('zone.js/node');" : ''}
await import('@angular/compiler');const core=await import('@angular/core'),rx=await import('rxjs'),ops=await import('rxjs/operators'),forms=await import('@angular/forms');
const payload=JSON.parse(readFileSync(new URL('./autocomplete-render-payload.json',import.meta.url))),events={};new Function('exports',payload.event)(events);
const MatOptionSelectionChange=events.MatOptionSelectionChange;
let app,zone,manual;
${model.line === 'original' ? `zone=new core.NgZone({enableLongStackTrace:false});manual=core.Injector.create({providers:[]});` : `
const common=await import('@angular/common'),browser=await import('@angular/platform-browser');
app=await browser.createApplication({providers:[core.${mode === 'zoneful' ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'}(),
 {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
 {provide:core.DOCUMENT,useValue:{head:{children:[]}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}}]});
zone=app.injector.get(core.NgZone);${mode === 'zoneless' ? "assert.equal(typeof globalThis.Zone,'undefined');" : ''}
`}
let renders=0,registrations=0;const trackedAfterNextRender=(callback,options)=>{registrations++;return core.afterNextRender(()=>{renders++;callback();},options);};
function helper(js){const exports={};new Function('exports','afterNextRender','ApplicationRef','Observable','take',js)(exports,trackedAfterNextRender,core.ApplicationRef,rx.Observable,ops.take);return exports.afterLegacyRender;}
function replay(js,renderHelper,omitShare=false){const exports={};const values={defer:rx.defer,fromEvent:rx.fromEvent,merge:rx.merge,
 Observable:rx.Observable,observableOf:rx.of,Subject:rx.Subject,Subscription:rx.Subscription,
 delay:ops.delay,filter:ops.filter,map:ops.map,share:ops.share,switchMap:ops.switchMap,take:ops.take,tap:ops.tap,startWith:ops.startWith,
 MatOptionSelectionChange,afterLegacyRender:renderHelper,
 legacyGetEventTarget:event=>event.target,_getEventTarget:event=>event.target,focusedElementPierceShadowDom:()=>null,
 coerceBooleanProperty:value=>value!=null&&String(value)!=='false'};
if(omitShare)delete values.share;new Function('exports',...Object.keys(values),js)(exports,...Object.values(values));return exports.Replay;}
const drain=()=>new Promise(resolve=>setTimeout(resolve,10));
function fixture(Type){
 const instance=new Type(),query=new core.QueryList(),selected=[],models=[],keys=new rx.Subject(),pointer=new rx.Subject(),detachments=new rx.Subject();
 const option=value=>({value,selected:false,disabled:false,onSelectionChange:new rx.Subject(),deselect(){this.selected=false;}});
 const first=option('alpha'),second=option('beta');query.reset([first]);
 const control=new forms.FormControl('initial'),document=new EventTarget(),blur=new EventTarget();document.defaultView=blur;document.activeElement=null;
 let attached=true,detects=0,positions=0,disposed=0,focused=0,active=-2,reapplied=0;
 const native={value:'initial',focus(){focused++;},contains:()=>false};
 const panel={options:query,showPanel:true,autoActiveFirstOption:false,requireSelection:false,displayWith:null,
  _keyManager:{tabOut:new rx.Subject(),setActiveItem(value){active=value;}},
  opened:new core.EventEmitter(),closed:new core.EventEmitter(),_isOpen:true,_latestOpeningTrigger:instance,
  _setVisibility(){this.showPanel=this.options.length>0;},_emitSelectEvent(option){selected.push(option.value);}};
 const pointerProperties=new Map(),style={getPropertyValue:name=>pointerProperties.get(name)?.value??'',getPropertyPriority:name=>pointerProperties.get(name)?.priority??'',
  setProperty(name,value,priority=''){pointerProperties.set(name,{value,priority});},removeProperty(name){pointerProperties.delete(name);}};
 const overlay={hasAttached:()=>attached,detach(){attached=false;detachments.next();},dispose(){disposed++;attached=false;},
  updatePosition(){positions++;},keydownEvents:()=>keys,outsidePointerEvents:()=>pointer,detachments:()=>detachments,
  overlayElement:{contains:()=>false,style}};
 Object.assign(instance,{autocomplete:panel,_zone:zone,_viewContainerRef:{injector:app?.injector??manual},
  _element:new core.ElementRef(native),_document:document,_formField:null,_overlayAttached:true,_overlayRef:overlay,
  _pendingAutoselectedOption:null,_trackedModal:null,_componentDestroyed:false,
  _changeDetectorRef:{detectChanges(){detects++;}},_positionStrategy:{reapplyLastPosition(){reapplied++;}}});
 control.valueChanges.subscribe(value=>models.push(value));instance.registerOnChange(value=>control.setValue(value));
 return{instance,panel,first,second,query,control,native,document,selected,models,style,
  counts:()=>({detects,positions,disposed,focused,active,reapplied}),snapshot:()=>({value:control.value,input:native.value,models:[...models],selected:[...selected],open:instance.panelOpen,attached,focused,active,reapplied})};
}
function start(f){zone.run(()=>{f.instance._closingActionsSubscription=f.instance._subscribeToClosingActions();
 ${mode === 'zoneful' ? `app?.tick();assert.equal(f.counts().positions,0,'zoneful-render-cannot-preempt-stability');` : ''}
});}
function render(){app?.tick();}
async function selected(js,helperJs=payload.helper){const f=fixture(replay(js,helper(helperJs)));start(f);render();
 f.first.selected=true;f.first.onSelectionChange.next(new MatOptionSelectionChange(f.first,true));
 f.second.onSelectionChange.next(new MatOptionSelectionChange(f.second,true));
 const result=f.snapshot();f.instance.ngOnDestroy();return result;}
async function changedOptions(js){const f=fixture(replay(js,helper(payload.helper)));start(f);render();
 zone.run(()=>{f.query.reset([f.second]);f.query.notifyOnChanges();});await drain();
 f.first.onSelectionChange.next(new MatOptionSelectionChange(f.first,true));assert.equal(f.control.value,'initial','stale-options-unsubscribed');
 f.second.selected=true;f.second.onSelectionChange.next(new MatOptionSelectionChange(f.second,true));const result=f.snapshot();f.instance.ngOnDestroy();return result;}
async function initialize(js,expectReady){const f=fixture(replay(js,helper(payload.helper)));
 f.instance._overlayAttached=false;f.instance._overlayRef=null;f.instance.autocomplete=undefined;
 const seen=[];let completed=false;const sub=f.instance.optionSelections.subscribe({next:event=>seen.push(event.source.value),complete:()=>completed=true});
 f.instance.autocomplete=f.panel;zone.run(()=>f.instance.ngAfterViewInit());render();
 f.first.onSelectionChange.next(new MatOptionSelectionChange(f.first,true));
 assert.deepEqual(seen,expectReady?['alpha']:[],'initialized-option-stream');sub.unsubscribe();f.instance.ngOnDestroy();return{seen,completed};}
async function cancellation(js,helperJs=payload.helper,destroy=false){const f=fixture(replay(js,helper(helperJs)));start(f);const before=renders;
 if(destroy){f.instance._overlayAttached=false;f.instance._overlayRef.detach();f.instance.ngOnDestroy();}
 else f.instance.closePanel();render();
 assert.equal(renders,before,'canceled-render-hook-must-be-destroyed');assert.equal(f.counts().positions,${mode === 'zoneless' ? '0' : '1'},'canceled-no-position-work');
 const result=f.snapshot();if(!destroy)f.instance.ngOnDestroy();return result;}
async function destroyBeforeInitialization(js){const f=fixture(replay(js,helper(payload.helper)));
 f.instance._overlayAttached=false;f.instance._overlayRef=null;f.instance.autocomplete=undefined;
 let completed=false;const sub=f.instance.optionSelections.subscribe({complete:()=>completed=true});
 f.instance.ngOnDestroy();assert.equal(completed,true,'destroy-before-init-completes-option-stream');
 assert.equal(sub.closed,true);return{completed};}
async function errorCleanup(helperJs){const stable=zone.onStable,subscribe=stable.subscribe;let held=0;
 stable.subscribe=function(...args){const sub=subscribe.apply(this,args);held++;const unsubscribe=sub.unsubscribe.bind(sub);let live=true;sub.unsubscribe=()=>{if(live){live=false;held--;}unsubscribe();};return sub;};
 const injector=core.Injector.create({providers:[{provide:core.ApplicationRef,useFactory:()=>{throw Error('diagnostic application lookup failure');}}]});
 try{let error;const sub=helper(helperJs)(zone,injector).subscribe({error:value=>error=value});assert.equal(sub.closed,true);assert.match(error.message,/diagnostic application lookup failure/);assert.equal(held,0,'application-lookup-error-cleans-stable-subscription');}
 finally{stable.subscribe=subscribe;injector.destroy();}}
function pointerState(js){const f=fixture(replay(js,helper(payload.helper)));f.instance._closingActionsSubscription=new rx.Subscription();try{
 f.style.setProperty('pointer-events','auto','important');f.query.reset([]);f.instance._updatePanelState();
 assert.equal(f.style.getPropertyValue('pointer-events'),'none','owned-hidden-pane-pointer');
 f.query.reset([f.first]);f.instance._updatePanelState();assert.equal(f.style.getPropertyValue('pointer-events'),'auto','owned-pointer-restore');
 assert.equal(f.style.getPropertyPriority('pointer-events'),'important','owned-pointer-priority');return true;
 }finally{f.instance.ngOnDestroy();}}
try{
 const pointerStateRestored=pointerState(payload.candidate);
 assert.throws(()=>pointerState(payload.mutations.noPointerState),error=>error instanceof ReferenceError&&String(error.message).includes('hiddenPanePointerState'));
 assert.throws(()=>fixture(replay(payload.candidate,helper(payload.helper),true)),error=>error instanceof ReferenceError&&String(error.message).includes('share'));
 const candidate=await selected(payload.candidate),original=await selected(payload.original);
 assert.equal(candidate.value,'alpha','selection-is-wired');assert.deepEqual(candidate.models,['alpha']);assert.equal(candidate.open,false);assert.equal(candidate.focused,1);
 ${mode === 'zoneful' ? 'assert.deepEqual(candidate,original);' : "assert.equal(original.value,'initial');assert.equal(original.open,true);"}
 const changed=await changedOptions(payload.candidate);assert.equal(changed.value,'beta');assert.equal(changed.reapplied,1);
 ${mode === 'zoneful' ? 'assert.deepEqual(changed,await changedOptions(payload.original));' : ''}
 const initialized=await initialize(payload.candidate,true),originalInitialized=await initialize(payload.original,${mode === 'zoneful'});
 const canceled=await cancellation(payload.candidate),destroyed=await cancellation(payload.candidate,payload.helper,true);await errorCleanup(payload.helper);
 const destroyedBeforeInit=await destroyBeforeInitialization(payload.candidate);
 const mutations=[];
 ${!production && model.line !== 'original' ? `
 if(${mode === 'zoneless'}){
  await assert.rejects(async()=>{const result=await selected(payload.mutations.priorWait);assert.equal(result.value,'alpha','selection-is-wired');},error=>error.code==='ERR_ASSERTION'&&error.message.startsWith('selection-is-wired'));mutations.push({id:'prior-zone-only-wait',rejected:true});
  await assert.rejects(()=>initialize(payload.mutations.noInitializer,true),error=>error.code==='ERR_ASSERTION'&&error.message.startsWith('initialized-option-stream'));mutations.push({id:'missing-view-initialization',rejected:true});
  await assert.rejects(()=>cancellation(payload.candidate,payload.mutations.leakedRender),error=>error.code==='ERR_ASSERTION'&&error.message.startsWith('canceled-render-hook'));mutations.push({id:'retained-render-handle',rejected:true});
  await assert.rejects(()=>cancellation(payload.mutations.noDestroyCancel,payload.helper,true),error=>error.code==='ERR_ASSERTION'&&error.message.startsWith('canceled-render-hook'));mutations.push({id:'destroy-without-cancel',rejected:true});
  await assert.rejects(()=>destroyBeforeInitialization(payload.mutations.noInitCompletion),error=>error.code==='ERR_ASSERTION'&&error.message.startsWith('destroy-before-init'));mutations.push({id:'destroy-retains-initialization-stream',rejected:true});
 }else{
  await assert.rejects(()=>selected(payload.candidate,payload.mutations.premature),error=>error.code==='ERR_ASSERTION'&&error.message.startsWith('zoneful-render-cannot-preempt-stability'));mutations.push({id:'zoneful-stability-guard-removed',rejected:true});
 }
 await assert.rejects(()=>errorCleanup(payload.mutations.noErrorCleanup),error=>error.code==='ERR_ASSERTION'&&error.message.startsWith('application-lookup-error'));mutations.push({id:'lookup-failure-leaks-stable-subscription',rejected:true});
 ` : ''}
 console.log(JSON.stringify({candidate,original,changed,initialized,originalInitialized,canceled,destroyed,destroyedBeforeInit,pointerStateRestored,missingShareRejected:true,missingPointerStateRejected:true,registrations,renders,mutations,
 genuine_public_application:!!app,genuine_public_zone:true,legacy_constructor_and_decorators_executed:false,native_executed:false}));
}finally{app?.destroy();manual?.destroy();core.destroyPlatform();}
`;
      const path = join(model.root, 'autocomplete-render-runtime-' + mode + '-' + production + '.mjs'); writeFileSync(path, script);
      const value = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=512', path], {
        cwd: model.root, env: process.env, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024}));
      results.push({line: model.line, mode, production, zone_subject: zoneSubject, ...value});
    }
  }
  const report = {schema_version: 1, line: JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main',
    sources: [candidatePath, helperPath, eventPath].map(path => ({path, sha256: hash(read(path))})),
    reference: {path: originalPath, sha256: hash(original)}, node: process.version, binding_parser: ts.version,
    namespace_capsule_sha256: loaded.capsule_hash, results, public_contracts: contracts,
    type_compilation: {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)), subjects: types},
    scope: 'All trigger source members replayed except original constructor/decorators/heritage, with actual field initializers and the owned hidden-pane WeakMap. Public RxJS share is supplied; omission of share or the WeakMap is rejected, and the pointer state uses a style protocol. Genuine public core QueryList/EventEmitter/FormControl/NgZone and current public application/render-hook APIs. Input/options/overlay/document/position/change-detector/view-injector containers are protocols; no actual legacy class node DI, packed/AOT/native view or Rx/Node floor qualification.',
    native_or_actual_legacy_instances_qualified: false, g11_claim: 'not-passed'};
  assert.equal(results.length, 10);
  assert.ok(results.every(row => row.pointerStateRestored && row.missingShareRejected && row.missingPointerStateRejected));
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, subjects: 10, mutation_rejections: results.flatMap(row => row.mutations).length,
    compiler: compiler.version, native_executed: false, actual_legacy_instances_qualified: false}));
} finally { loaded.dispose(); }
