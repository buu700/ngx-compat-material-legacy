/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Entire historical/owned classes, real zoneful and public-provider zoneless NgZone. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const require = createRequire(import.meta.url), ts = require('typescript'), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'projects/ngx-material-legacy/legacy-tabs/ink-bar.ts';
const originalPath = 'reference/material-16.2.14/ink-bar-zone-sources/ink-bar.ts';
const originalSharedPath = 'reference/material-16.2.14/ink-bar-zone-sources/ink-bar-shared.ts';
const ownedSharedPath = 'projects/ngx-material-legacy/legacy-tabs/internal/ink-bar-shared.ts';
const candidate = readFileSync(join(root, sourcePath), 'utf8'), original = readFileSync(join(root, originalPath), 'utf8');
assert.equal(hash(original), 'b7dfb4ce490555fcf415d2e0123ff3ce388c8843594c35688bfeaca7693af25f');
const originalShared = readFileSync(join(root, originalSharedPath), 'utf8');
assert.equal(hash(originalShared), '77bf032d56af3e7bde5de166702761203e78974f466bccb1587be0ced392ee52');
const ownedShared = readFileSync(join(root, ownedSharedPath), 'utf8');
const sharedSource = ts.createSourceFile('shared.ts', ownedShared, ts.ScriptTarget.Latest, true);
const positionerType = sharedSource.statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === '_MatInkBarPositioner');
assert.ok(positionerType);
const printer = ts.createPrinter({removeComments: true});
const parse = text => ts.createSourceFile('ink-bar.ts', text, ts.ScriptTarget.Latest, true);
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
const emit = text => ts.transpileModule(text, {compilerOptions: {module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022, experimentalDecorators: true}}).outputText;
const completeModule = text => { const source = parse(text); assert.equal(source.parseDiagnostics.length, 0);
  return emit(source.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getFullText(source)).join('\n')); };
const factory = text => { const source = parse(text), nodes = source.statements.filter(node =>
  ts.isFunctionDeclaration(node) && node.name?.text === '_MAT_INK_BAR_POSITIONER_FACTORY');
  assert.equal(nodes.length, 1); return {text: print(nodes[0], source), body: print(nodes[0].body, source)}; };
assert.equal(factory(ownedShared).body, factory(originalShared).body, 'whole historical offset positioner changed');
function parts(text) {
  const source = parse(text), classes = source.statements.filter(ts.isClassDeclaration); assert.equal(classes.length, 1);
  const cls = classes[0], constructor = cls.members.find(ts.isConstructorDeclaration);
  assert.equal(cls.name.text, 'MatLegacyInkBar'); assert.equal(constructor.parameters.length, 4);
  const metadata = ts.getDecorators(cls)[0].expression.arguments[0];
  return {constructor: print(constructor, source), selector: metadata.properties.find(node => node.name?.text === 'selector').initializer.text,
    host: print(metadata.properties.find(node => node.name?.text === 'host').initializer, source),
    show: print(cls.members.find(node => node.name?.text === 'show'), source),
    hide: print(cls.members.find(node => node.name?.text === 'hide'), source)};
}
assert.deepEqual(parts(candidate), parts(original), 'historical constructor, selector, host, show or hide changed');
const noFallback = candidate.replace(/\s*if \(this\._ngZone\.isStable\) \{\s*align\(\);\s*\} else \{\s*this\._ngZone\.onStable\.pipe\(take\(1\)\)\.subscribe\(align\);\s*\}/,
  '\n      this._ngZone.onStable.pipe(take(1)).subscribe(align);');
assert.notEqual(noFallback, candidate, 'fallback mutation did not edit source');
const inverted = candidate.replace('if (this._ngZone.isStable)', 'if (!this._ngZone.isStable)');
assert.notEqual(inverted, candidate);
const wrongWidth = candidate.replace('inkBar.style.width = positions.width', 'inkBar.style.width = positions.left');
assert.notEqual(wrongWidth, candidate);
const sourceMutations = [];
for (const [id, changed] of [
  ['selector-changed', candidate.replace("selector: 'mat-ink-bar'", "selector: 'changed-ink-bar'")],
  ['host-class-changed', candidate.replace("'class': 'mat-ink-bar'", "'class': 'changed-ink-bar'")],
  ['show-visibility-changed', candidate.replace("style.visibility = 'visible'", "style.visibility = 'hidden'")],
  ['constructor-zone-optional', candidate.replace('_ngZone: NgZone', '_ngZone?: NgZone')],
]) {
  assert.notEqual(changed, candidate); assert.throws(() => assert.deepEqual(parts(changed), parts(original)));
  sourceMutations.push({id, rejected: true});
}
const loaded = prepareMaterialPublicSubjects(root), results = [], runtimeMutations = [];
try {
  const compilerPath = process.env.CLOSEOUT_TYPESCRIPT_ROOT
    ? join(process.env.CLOSEOUT_TYPESCRIPT_ROOT, 'lib/typescript.js') : require.resolve('typescript');
  const compiler = require(compilerPath), typeSubjects = [], publicContracts = [];
  for (const model of loaded.models) {
    const withoutImports = parse(candidate).statements.filter(node => !ts.isImportDeclaration(node))
      .map(node => node.getFullText()).join('\n');
    const code = `import {Directive,ElementRef,Inject,NgZone,Optional,ANIMATION_MODULE_TYPE,InjectionToken${model.line === 'original' ? '' : ',provideZonelessChangeDetection'}} from '@angular/core';
import {take} from 'rxjs/operators';
${positionerType.getText(sharedSource)}
const _MAT_INK_BAR_POSITIONER=new InjectionToken<_MatInkBarPositioner>('typed owned positioner');
${withoutImports}
declare const zone:NgZone, element:HTMLElement;
const ink=new MatLegacyInkBar(new ElementRef(element),zone,target=>({left:'0px',width:'1px'}));
const aligned:void=ink.alignToElement(element);ink.show();ink.hide();
const stable:boolean=zone.run(()=>zone.isStable);
${model.line === 'original' ? '' : 'const zoneless=provideZonelessChangeDetection();'}
// @ts-expect-error Historical required constructor arguments remain required.
new MatLegacyInkBar();
// @ts-expect-error A partial zone protocol is not a genuine public zone type.
new MatLegacyInkBar(new ElementRef(element),{},target=>({left:'0px',width:'1px'}));
// @ts-expect-error Historical positioner returns both string positions.
new MatLegacyInkBar(new ElementRef(element),zone,target=>({left:'0px'}));
// @ts-expect-error Historical host remains an HTMLElement reference.
new MatLegacyInkBar(new ElementRef('text'),zone,target=>({left:'0px',width:'1px'}));
// @ts-expect-error Historical optional animation mode is a string.
new MatLegacyInkBar(new ElementRef(element),zone,target=>({left:'0px',width:'1px'}),1);
// @ts-expect-error Stability is a readonly public observation.
zone.isStable=true;
// @ts-expect-error Alignment still requires the historical element argument.
ink.alignToElement();
`;
    const file = join(model.root, 'ink-bar-zone-consumer.ts'); writeFileSync(file, code);
    const program = compiler.createProgram([file], {target: compiler.ScriptTarget.ES2022,
      module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
      strict: true, skipLibCheck: false, noEmit: true, experimentalDecorators: true,
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {
      getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    typeSubjects.push({line: model.line, negative_checks: 7, fixture_sha256: hash(code)});
    for (const [path, text] of model.sources) if (path.startsWith('@angular/core/') && path.endsWith('.d.ts')) {
      const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
      for (const node of source.statements) if ((ts.isClassDeclaration(node) && node.name?.text === 'NgZone') ||
          (ts.isFunctionDeclaration(node) && node.name?.text === 'provideZonelessChangeDetection')) {
        assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'internal'].includes(tag.tagName.text)));
        if (ts.isClassDeclaration(node)) {
          for (const member of node.members.filter(member => ['isStable', 'run', 'onStable'].includes(member.name?.text)))
            assert.ok(!ts.getJSDocTags(member).some(tag => ['deprecated', 'internal'].includes(tag.tagName.text)));
        }
        publicContracts.push({line: model.line, path, source_sha256: hash(text), name: node.name.text,
          tags: ts.getJSDocTags(node).map(tag => tag.tagName.text), whole: node.getText(source)});
      }
    }
  }
  assert.equal(publicContracts.filter(row => row.name === 'NgZone').length, 3);
  assert.equal(publicContracts.filter(row => row.name === 'provideZonelessChangeDetection').length, 2);
  for (const model of loaded.models) {
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'ink-bar-zone-payload.json'), JSON.stringify({original: completeModule(original),
      candidate: completeModule(candidate), factory: emit(factory(ownedShared).text),
      mutations: {noFallback: completeModule(noFallback), inverted: completeModule(inverted), wrongWidth: completeModule(wrongWidth)}}));
    const modes = model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless'];
    for (const mode of modes) for (const production of [false, true]) {
      const script = `${production ? 'globalThis.ngDevMode=false;' : ''}
import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
${mode === 'zoneful' ? "await import('zone.js/node');" : ''}
await import('@angular/compiler');const core=await import('@angular/core'),{take}=await import('rxjs/operators');
const payload=JSON.parse(readFileSync(new URL('./ink-bar-zone-payload.json',import.meta.url)));
const factoryExports={};new Function('exports',payload.factory)(factoryExports);
const positioner=factoryExports._MAT_INK_BAR_POSITIONER_FACTORY();
function load(js){const exports={};new Function('exports','Directive','ElementRef','Inject','NgZone','Optional','ANIMATION_MODULE_TYPE','_MAT_INK_BAR_POSITIONER','take',js)(exports,core.Directive,core.ElementRef,core.Inject,core.NgZone,core.Optional,core.ANIMATION_MODULE_TYPE,new core.InjectionToken('fixture-positioner'),take);return exports.MatLegacyInkBar;}
let zone,parent,env;
${mode === 'zoneful' ? 'zone=new core.NgZone({enableLongStackTrace:false});' : `assert.equal(typeof globalThis.Zone,'undefined');parent=core.Injector.create({providers:[]});env=core.createEnvironmentInjector([core.provideZonelessChangeDetection()],parent);zone=env.get(core.NgZone);`}
const drain=()=>new Promise(resolve=>setTimeout(resolve,0));
async function exercise(js,expectAligned,zoneful){
 const Type=load(js);assert.equal(Type.length,4);const style={},element={style},writes=[],states=[];let calls=0;
 const recordStyle=new Proxy(style,{set(target,key,value){writes.push({key,value});target[key]=value;return true;}});
 const ink=new Type(new core.ElementRef({style:recordStyle}),zone,target=>{calls++;return positioner(target);},'NoopAnimations');
 const first={offsetLeft:42,offsetWidth:124},second={offsetLeft:96,offsetWidth:77};
 zone.run(()=>{Promise.resolve().then(()=>{});ink.alignToElement(first);
  if(zoneful){assert.equal(calls,0,'zoneful-still-waits-for-stability');assert.deepEqual(style,{visibility:'visible'});}});
 await drain();
 if(expectAligned){assert.equal(style.left,'42px','initial-left');assert.equal(style.width,'124px','initial-width');assert.equal(calls,1);}
 else{assert.deepEqual(style,{visibility:'visible'});assert.equal(calls,0);}
 states.push({id:'initial',style:{...style},calls});
 ink.hide();assert.equal(style.visibility,'hidden');states.push({id:'hidden',style:{...style},calls});
 ink.show();assert.equal(style.visibility,'visible');states.push({id:'shown',style:{...style},calls});
 ink.alignToElement(second);await drain();
 if(expectAligned){assert.equal(style.left,'96px','second-left');assert.equal(style.width,'77px','second-width');assert.equal(calls,2);}
 else assert.equal(calls,0);
 states.push({id:'second-alignment',style:{...style},calls});
 ink.alignToElement(first);await drain();
 if(expectAligned){assert.equal(style.left,'42px','return-left');assert.equal(style.width,'124px','return-width');assert.equal(calls,3);}
 else assert.equal(calls,0);
 states.push({id:'return-first',style:{...style},calls});return{states,writes};
}
try{
 const inside=zone.run(()=>({isStable:zone.isStable,inAngularZone:core.NgZone.isInAngularZone()}));
 assert.deepEqual(inside,${mode === 'zoneful' ? '{isStable:false,inAngularZone:true}' : '{isStable:true,inAngularZone:false}'});
 let stableEvents=0;const subscription=zone.onStable.subscribe(()=>stableEvents++);
 const original=await exercise(payload.original,${mode === 'zoneful'},${mode === 'zoneful'});
 const originalEvents=stableEvents;stableEvents=0;
 const candidate=await exercise(payload.candidate,true,${mode === 'zoneful'});
 const candidateEvents=stableEvents;subscription.unsubscribe();
 ${mode === 'zoneful' ? 'assert.deepEqual(candidate,original);assert.equal(candidateEvents,originalEvents);assert.ok(candidateEvents>0);' : 'assert.equal(originalEvents,0);assert.equal(candidateEvents,0);'}
 const mutations=[];
 ${!production && model.line !== 'original' ? `
 for(const[id,changed]of Object.entries(payload.mutations)){
  const expected=id==='noFallback'?'initial-left':id==='inverted'?(${mode === 'zoneful'}?'zoneful-still-waits-for-stability':'initial-left'):'initial-width';
  if(id==='noFallback'&&${mode === 'zoneful'})continue;
  await assert.rejects(()=>exercise(changed,true,${mode === 'zoneful'}),error=>error.code==='ERR_ASSERTION'&&error.message.startsWith(expected));mutations.push({id,rejected:true});}
 ` : ''}
 console.log(JSON.stringify({inside,original,candidate,original_stable_events:originalEvents,candidate_stable_events:candidateEvents,
  zone_global:typeof globalThis.Zone,mutations,actual_whole_source_classes:true,synthetic_elements_positioner_offsets:true}));
}finally{env?.destroy();parent?.destroy();}`;
      const path = join(model.root, 'ink-bar-zone-runtime-' + mode + '-' + production + '.mjs'); writeFileSync(path, script);
      const value = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=512', path], {
        cwd: model.root, env: process.env, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024}));
      results.push({line: model.line, mode, production, zone_subject: zoneSubject, ...value});
      runtimeMutations.push(...value.mutations.map(row => ({...row, id: model.line + ':' + mode + ':' + row.id})));
    }
  }
  assert.equal(results.length, 10); assert.equal(runtimeMutations.length, 10);
  const report = {schema_version: 1,
    line: JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main',
    source: {path: sourcePath, sha256: hash(candidate)}, reference: {path: originalPath, sha256: hash(original)},
    tagged_shared_reference: {path: originalSharedPath, sha256: hash(originalShared)},
    historical_constructor_selector_host_show_hide_and_positioner_unchanged: true,
    namespace_capsule_sha256: loaded.capsule_hash, node: process.version, binding_parser: ts.version,
    public_contracts: publicContracts,
    type_compilation: {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)), subjects: typeSubjects},
    results, source_mutations: sourceMutations, runtime_mutations: runtimeMutations,
    native_packed_or_full_legacy_scheduler_qualified: false, g11_claim: 'not-passed',
    limits: ['Complete class bodies and actual public core decorators/classes/zoneful Zone.js and public zoneless provider used. Imported positioner token is a diagnostic token; element/style offsets are explicit protocols. Native measurements, AOT node DI, actual packed application and native browser route of Zone.js remain separately required.',
      'The original class in current genuine zoneless environments is an intentional negative reference: it never positions. Original Angular16 has no corresponding stable public zoneless provider and is not relabeled as that subject.',
      'Ten isolated development/production subjects; exact original zoneful method/visibility/style-write behavior retained. Runtime mutants fail at intended phase, including rejection of bypassed historical stable timing. No required consumer API/HTML/CSS/SCSS changes.']};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, runtime_subjects: 10, states_per_subject: 5,
    zoneful_original_equivalence: true, real_zoneless_provider_without_zone: true,
    source_mutations: 4, runtime_mutations: 10, compiler: compiler.version, type_negative_checks_per_subject: 7,
    native_executed: false}));
} finally { loaded.dispose(); }
