/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole constructors/members, excluding Angular decorators; genuine hooks, explicit protocols. */
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
const originalPath = 'reference/material-16.2.14/tooltip-render-sources/tooltip.ts';
const candidatePath = 'projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts';
const helperPath = 'projects/ngx-material-legacy/legacy-tooltip/internal/after-tooltip-render.ts';
const read = path => readFileSync(join(root, path), 'utf8');
const original = read(originalPath), candidate = read(candidatePath), helper = read(helperPath);
assert.equal(hash(original), '14d7821fe83cdfdc8ac9d6f2f8e095a24178ad286a8f9d4eea4245e879d5501c');
const emit = text => ts.transpileModule(text, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, removeComments: true}}).outputText;
const parse = text => {const source = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;};
const printer = ts.createPrinter({removeComments: true});
function helperProgram(text) {
  const source = parse(text); return emit(source.statements.filter(node => !ts.isImportDeclaration(node))
    .map(node => node.getFullText(source)).join('\n'));
}
function owner(text) {
  const source = parse(text), cls = source.statements.find(node => ts.isClassDeclaration(node) &&
    node.name?.text === '_MatTooltipBase'); assert.ok(cls); return {source, cls};
}
function bodyProgram(text) {
  const {source, cls} = owner(text);
  const replay = ts.factory.updateClassDeclaration(cls, [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier('Replay'), undefined, undefined, cls.members);
  const transformed = ts.transform(replay, [context => node => {
    const visit = node => ts.isDecorator(node) ? undefined : ts.visitEachChild(node, visit, context);
    return ts.visitNode(node, visit);
  }]);
  try {return emit(printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], source));}
  finally {transformed.dispose();}
}
// The existing constructor and public declarations are unaffected by the repair.
const baseline = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show',
  'f7153623c:' + candidatePath], {cwd: root, encoding: 'utf8'});
function abi(text) {
  const {source, cls} = owner(text);
  return cls.members.filter(node => ts.isConstructorDeclaration(node) ||
    !node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword))
    .map(node => ts.isConstructorDeclaration(node) ? printer.printNode(ts.EmitHint.Unspecified, node, source) :
      [node.kind, node.name?.getText(source), node.type?.getText(source),
        node.parameters?.map(param => [param.name.getText(source), param.type?.getText(source), !!param.questionToken,
          param.initializer?.getText(source)])]);
}
assert.deepEqual(abi(candidate), abi(baseline));
const changed = (text, from, to) => {const value = text.replace(from, to); assert.notEqual(value, text); return value;};
const mutations = {
  priorWait: bodyProgram(changed(candidate,
    'afterTooltipRender(this._ngZone, this._viewContainerRef.injector)', 'this._ngZone.onMicrotaskEmpty.pipe(take(1))')),
  noDestroy: bodyProgram(changed(candidate, '        .pipe(takeUntil(this._destroyed)).subscribe(() => {', '        .subscribe(() => {')),
  leakedRender: helperProgram(changed(helper, '      rendered?.destroy();', '')),
  premature: helperProgram(changed(helper, 'if (zone.isStable)', 'if (true)')),
  noOnce: helperProgram(changed(helper, '  }).pipe(take(1));', '  });')),
  noErrorCleanup: helperProgram(changed(helper, '      empty.unsubscribe();\n      throw error;', '      throw error;')),
};
const loaded = prepareMaterialPublicSubjects(root), results = [];
try {
  const compilerPath = process.env.CLOSEOUT_TYPESCRIPT_ROOT ? join(process.env.CLOSEOUT_TYPESCRIPT_ROOT, 'lib/typescript.js') : require.resolve('typescript');
  const compiler = require(compilerPath), types = [], contracts = [];
  for (const model of loaded.models.filter(model => model.line !== 'original')) {
    const fixture = helper + `\nimport {Injector as PublicInjector,NgZone as PublicZone} from '@angular/core';
declare const zone:PublicZone,injector:PublicInjector;
const result:Observable<void>=afterTooltipRender(zone,injector);
result.subscribe(value=>{const nothing:void=value;});
// @ts-expect-error A genuine public zone type is required.
afterTooltipRender({},injector);
// @ts-expect-error A genuine public injector type is required.
afterTooltipRender(zone,{});
// @ts-expect-error The render stream does not emit booleans.
const flags:Observable<boolean>=afterTooltipRender(zone,injector);
// @ts-expect-error Historical public stability observation is readonly.
zone.isStable=true;
`;
    const path = join(model.root, 'tooltip-render-helper-consumer.ts'); writeFileSync(path, fixture);
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
        contracts.push({line: model.line, path, source_sha256: hash(text), name: node.name.text, whole: node.getText(source)});
      }
    }
  }
  assert.equal(contracts.filter(row => row.name === 'afterNextRender').length, 4);
  assert.equal(contracts.filter(row => row.name === 'AfterRenderRef').length, 2);
  for (const model of loaded.models) {
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'tooltip-render-payload.json'), JSON.stringify({
      original: bodyProgram(original), candidate: bodyProgram(candidate), helper: helperProgram(helper), mutations}));
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const script = `${production ? 'globalThis.ngDevMode=false;' : ''}
import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
${mode === 'zoneful' ? "await import('zone.js/node');" : ''}
await import('@angular/compiler');const core=await import('@angular/core'),rx=await import('rxjs'),ops=await import('rxjs/operators');
const payload=JSON.parse(readFileSync(new URL('./tooltip-render-payload.json',import.meta.url)));
let app,zone,manual;
${model.line === 'original' ? `zone=new core.NgZone({enableLongStackTrace:false});manual=core.Injector.create({providers:[]});` : `
const common=await import('@angular/common'),browser=await import('@angular/platform-browser');
app=await browser.createApplication({providers:[core.${mode === 'zoneful' ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'}(),
 {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
 {provide:core.DOCUMENT,useValue:{head:{children:[]}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}}]});
zone=app.injector.get(core.NgZone);${mode === 'zoneless' ? "assert.equal(typeof globalThis.Zone,'undefined');" : ''}
`}
let renders=0,registrations=0;const trackedRender=(callback,options)=>{registrations++;return core.afterNextRender(()=>{renders++;callback();},options);};
function helper(js){const exports={};new Function('exports','afterNextRender','ApplicationRef','Observable','take',js)(exports,trackedRender,core.ApplicationRef,rx.Observable,ops.take);return exports.afterTooltipRender;}
function replay(js,renderHelper){const exports={};new Function('exports','Subject','Observable','take','takeUntil','afterTooltipRender','passiveListenerOptions',js)
 (exports,rx.Subject,rx.Observable,ops.take,ops.takeUntil,renderHelper,{});return exports.Replay;}
function fixture(js,helperJs=payload.helper,injector=app?.injector??manual){
 const Type=replay(js,helper(helperJs));assert.equal(Type.length,12,'historical-constructor-arity');
 const changes=[],aria=[],native={removeEventListener(){}};
 const instance=new Type({},new core.ElementRef(native),{},{injector},zone,{},
  {removeDescription(...args){aria.push(['remove',args[1]]);},describe(...args){aria.push(['describe',args[1]]);}},
  {stopMonitoring(){}},()=>({}),{change:new rx.Subject(),value:'ltr'},null,{});
 let marks=0,disposed=0;const tooltip={message:'',isVisible:()=>true,_markForCheck(){marks++;}};
 instance._tooltipInstance=tooltip;instance._overlayRef={updatePosition(){changes.push(tooltip.message);},dispose(){disposed++;}};
 return{instance,tooltip,changes,aria,counts:()=>({marks,disposed})};
}
const drain=()=>new Promise(resolve=>setTimeout(resolve,0));
function render(){app?.tick();}
async function update(js,helperJs=payload.helper,injector=app?.injector??manual,expected=true){
 const f=fixture(js,helperJs,injector),states=[];
 for(const text of [' First message ','A longer replacement message']){
  zone.run(()=>{f.instance.message=text;assert.equal(f.tooltip.message,text.trim(),'message-assigned');
   const before=f.changes.length;
   ${mode === 'zoneful' ? "render();assert.equal(f.changes.length,before,'zoneful-render-cannot-preempt-microtask-empty');" : ''}
  });render();await drain();
  states.push({message:f.tooltip.message,positions:[...f.changes],marks:f.counts().marks});
 }
 if(expected){assert.deepEqual(f.changes,['First message','A longer replacement message'],'rendered-message-positioned');}
 else assert.equal(f.changes.length,0,'historical-zoneless-wait-stays-pending');
 const before=f.changes.length;zone.run(()=>{});await drain();assert.equal(f.changes.length,before,'once-only-positioning');
 f.instance.ngOnDestroy();return{states,disposed:f.counts().disposed};
}
async function cancel(js,helperJs=payload.helper,detach=false){const f=fixture(js,helperJs),before=renders;
 zone.run(()=>{f.instance.message='Pending';if(detach){f.instance._tooltipInstance=null;f.instance._overlayRef=null;}else f.instance.ngOnDestroy();});
 render();await drain();assert.equal(f.changes.length,0,'no-position-after-detach-or-destroy');
 if(!detach)assert.equal(renders,before,'canceled-render-hook');
 if(detach)f.instance.ngOnDestroy();return{positions:f.changes.length,canceled:!detach};}
async function errorCleanup(helperJs){let active=0;const emitter=zone.onMicrotaskEmpty,originalSubscribe=emitter.subscribe;
 emitter.subscribe=function(...args){const sub=originalSubscribe.apply(this,args);active++;sub.add(()=>active--);return sub;};
 const failing=core.Injector.create({providers:[{provide:core.ApplicationRef,useFactory:()=>{throw new Error('expected-lookup-failure');}}]});
 try{let error;helper(helperJs)(zone,failing).subscribe({error:value=>error=value});assert.equal(error?.message,'expected-lookup-failure');
  assert.equal(active,0,'lookup-error-cleans-zone-subscription');}
 finally{emitter.subscribe=originalSubscribe;failing.destroy();}}
try{
 const old=await update(payload.original,payload.helper,app?.injector??manual,${mode === 'zoneful'});
 const candidate=await update(payload.candidate);
 ${mode === 'zoneful' ? 'assert.deepEqual(candidate,old);' : ''}
 const canceled=await cancel(payload.candidate),detached=await cancel(payload.candidate,payload.helper,true);
 let manualResult=null;
 ${mode === 'zoneful' ? `const bare=core.Injector.create({providers:[]});try{manualResult=await update(payload.candidate,payload.helper,bare);}finally{bare.destroy();}` : ''}
 await errorCleanup(payload.helper);
 const mutations=[];
 ${model.line !== 'original' ? `
 const reject=async(id,operation,message)=>{await assert.rejects(operation,error=>error.code==='ERR_ASSERTION'&&error.message.startsWith(message));mutations.push({id,rejected:true});};
 if(${mode === 'zoneless'}){
  await reject('prior-zone-only-wait',()=>update(payload.mutations.priorWait),'rendered-message-positioned');
  await reject('destroy-without-cancel',()=>cancel(payload.mutations.noDestroy),'canceled-render-hook');
  await reject('retained-render-handle',()=>cancel(payload.candidate,payload.mutations.leakedRender),'canceled-render-hook');
 }else{
  await reject('removed-stability-guard',()=>update(payload.candidate,payload.mutations.premature),'zoneful-render-cannot-preempt-microtask-empty');
  await reject('removed-once-only-completion',()=>update(payload.candidate,payload.mutations.noOnce),'rendered-message-positioned');
 }
 await reject('lookup-error-leaks-subscription',()=>errorCleanup(payload.mutations.noErrorCleanup),'lookup-error-cleans-zone-subscription');
 ` : ''}
 console.log(JSON.stringify({old,candidate,canceled,detached,manualResult,registrations,renders,mutations,
  genuine_public_application:!!app,genuine_public_zone:true,whole_constructor_executed:true,
  angular_decorators_or_node_DI_executed:false,native_executed:false}));
}finally{app?.destroy();manual?.destroy();core.destroyPlatform();}
`;
      const path = join(model.root, 'tooltip-render-runtime-' + mode + '-' + production + '.mjs'); writeFileSync(path, script);
      const value = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=512', path], {
        cwd: model.root, env: process.env, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024}));
      results.push({line: model.line, mode, production, zone_subject: zoneSubject, ...value});
    }
  }
  const report = {schema_version: 1, line: JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main',
    sources: [candidatePath,helperPath].map(path => ({path,sha256:hash(read(path))})),
    reference: {path:originalPath,sha256:hash(original)}, node:process.version,binding_parser:ts.version,
    namespace_capsule_sha256:loaded.capsule_hash,results,public_contracts:contracts,
    existing_constructor_and_public_declarations_unchanged:true,
    type_compilation:{compiler:compiler.version,compiler_source_sha256:hash(readFileSync(compilerPath)),subjects:types},
    scope:'Whole tooltip-base constructor and members replayed without Angular decorators. Genuine public NgZone and current public application/render callbacks. Element host, overlay, tooltip instance, change detector, directionality, focus/ARIA services and view container are explicit protocols. No actual legacy directive/node DI, DOM paint, packed/AOT/native geometry, consumer build or Rx/Node floor qualification.',
    native_or_actual_legacy_instances_qualified:false,g11_claim:'not-passed'};
  assert.equal(results.length,10);
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({line:report.line,subjects:10,mutation_rejections:results.flatMap(row=>row.mutations).length,
    compiler:compiler.version,native_executed:false,actual_legacy_instances_qualified:false}));
}finally{loaded.dispose();}
