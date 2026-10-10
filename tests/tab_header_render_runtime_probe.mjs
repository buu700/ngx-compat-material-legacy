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
const originalPath = 'reference/material-16.2.14/tab-header-render-sources/paginated-tab-header.ts';
const candidatePath = 'projects/ngx-material-legacy/legacy-tabs/internal/paginated-tab-header.ts';
const helperPath = 'projects/ngx-material-legacy/legacy-tabs/internal/after-tab-header-render.ts';
const read = path => readFileSync(join(root, path), 'utf8');
const original = read(originalPath), candidate = read(candidatePath), helper = read(helperPath);
assert.equal(hash(original), 'aede756f20cc661b3a35aa3afadea8436892a76f4ac015b340a9b55a9a4140a6');
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
    node.name?.text === 'MatPaginatedTabHeader'); assert.ok(cls); return {source, cls};
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
  '14604924c:' + candidatePath], {cwd: root, encoding: 'utf8'});
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
// Authenticate the constructor and constants supplied to the full class replay.
const constructorText = text => {const {source, cls}=owner(text);return printer.printNode(
  ts.EmitHint.Unspecified,cls.members.find(ts.isConstructorDeclaration),source);};
assert.equal(constructorText(candidate),constructorText(original));
for (const name of ['passiveEventListenerOptions','HEADER_SCROLL_DELAY','HEADER_SCROLL_INTERVAL']) {
  const declaration = text => {const source=parse(text);const node=source.statements.filter(ts.isVariableStatement)
    .flatMap(statement=>[...statement.declarationList.declarations]).find(node=>node.name.getText(source)===name);
    assert.ok(node);return printer.printNode(ts.EmitHint.Unspecified,node,source);};
  assert.equal(declaration(candidate),declaration(original));
}
const changed = (text, from, to) => {const value = text.replace(from, to); assert.notEqual(value, text); return value;};
const mutations = {
  priorWait: bodyProgram(changed(candidate, 'afterTabHeaderRender(this._ngZone, this._renderInjector)', 'this._ngZone.onStable.pipe(take(1))')),
  noCapture: bodyProgram(changed(candidate, '_renderInjector = tabHeaderRenderInjector();', '_renderInjector = null;')),
  noDestroy: bodyProgram(changed(candidate, '.pipe(takeUntil(this._destroyed)).subscribe(realign)', '.subscribe(realign)')),
  leakedRender: helperProgram(changed(helper, '      rendered?.destroy();', '')),
  premature: helperProgram(changed(helper, 'if (zone.isStable)', 'if (true)')),
  noOnce: helperProgram(changed(helper, '  }).pipe(take(1));', '  });')),
  noErrorCleanup: helperProgram(changed(helper, '      stable.unsubscribe();\n      throw error;', '      throw error;')),
};
const loaded = prepareMaterialPublicSubjects(root), results = [];
try {
  const compilerPath = process.env.CLOSEOUT_TYPESCRIPT_ROOT ? join(process.env.CLOSEOUT_TYPESCRIPT_ROOT, 'lib/typescript.js') : require.resolve('typescript');
  const compiler = require(compilerPath), types = [], contracts = [];
  for (const model of loaded.models.filter(model => model.line !== 'original')) {
    const fixture = helper + `\nimport {Injector as PublicInjector,NgZone as PublicZone} from '@angular/core';
declare const zone:PublicZone,injector:PublicInjector;
const result:Observable<void>=afterTabHeaderRender(zone,injector);
result.subscribe(value=>{const nothing:void=value;});
// @ts-expect-error A genuine public zone type is required.
afterTabHeaderRender({},injector);
// @ts-expect-error A genuine public injector type is required.
afterTabHeaderRender(zone,{});
// @ts-expect-error The render stream does not emit booleans.
const flags:Observable<boolean>=afterTabHeaderRender(zone,injector);
const captured:PublicInjector|null=tabHeaderRenderInjector();
// @ts-expect-error A captured injector can be absent outside DI.
const alwaysPresent:PublicInjector=tabHeaderRenderInjector();
// @ts-expect-error Historical public stability observation is readonly.
zone.isStable=true;
`;
    const path = join(model.root, 'tab-header-render-helper-consumer.ts'); writeFileSync(path, fixture);
    const program = compiler.createProgram([path], {target: compiler.ScriptTarget.ES2022,
      module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
      strict: true, noEmit: true, skipLibCheck: false, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {
      getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    types.push({line: model.line, fixture_sha256: hash(fixture), negative_checks: 5});
    for (const [path, text] of model.sources) if (path.startsWith('@angular/core/') && path.endsWith('.d.ts')) {
      const source = parse(text);
      for (const node of source.statements) if ((ts.isFunctionDeclaration(node) || ts.isInterfaceDeclaration(node) ||
          ts.isClassDeclaration(node)) && ['afterNextRender','AfterRenderRef','assertInInjectionContext',
          'inject','Injector','ApplicationRef'].includes(node.name?.text)) {
        assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'internal', 'developerPreview', 'experimental'].includes(tag.tagName.text)));
        contracts.push({line: model.line, path, source_sha256: hash(text), name: node.name.text, whole: node.getText(source)});
      }
    }
  }
  assert.equal(contracts.filter(row => row.name === 'afterNextRender').length, 4);
  assert.equal(contracts.filter(row => row.name === 'AfterRenderRef').length, 2);
  for (const name of ['assertInInjectionContext','inject','Injector','ApplicationRef'])
    for (const line of ['main','21.x']) assert.ok(contracts.some(row=>row.line===line&&row.name===name),name+' '+line);
  const subjectPath='tests/tab_header_render_subject.mjs',subjectScript=read(subjectPath);
  for (const model of loaded.models) {
    const zoneSubject=installNgZonePublicSubject(model,root);
    writeFileSync(join(model.root,'tab-header-render-payload.json'),JSON.stringify({
      original:bodyProgram(original),candidate:bodyProgram(candidate),helper:helperProgram(helper),mutations}));
    const path=join(model.root,'tab-header-render-subject.mjs');writeFileSync(path,subjectScript);
    for (const mode of model.line==='original'?['zoneful']:['zoneful','zoneless']) for (const production of [false,true]) {
      const value=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512',path,model.line,mode,String(production)],{
        cwd:model.root,env:process.env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));
      results.push({line:model.line,mode,production,zone_subject:zoneSubject,...value});
    }
  }
  const report={schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',
    sources:[candidatePath,helperPath,subjectPath].map(path=>({path,sha256:hash(read(path))})),
    reference:{path:originalPath,sha256:hash(original)},node:process.version,binding_parser:ts.version,
    namespace_capsule_sha256:loaded.capsule_hash,results,public_contracts:contracts,
    existing_constructor_and_public_declarations_unchanged:true,
    type_compilation:{compiler:compiler.version,compiler_source_sha256:hash(readFileSync(compilerPath)),subjects:types},
    scope:'Whole original and owned header constructors and members replayed without Angular decorators. Genuine public NgZone, QueryList, FocusKeyManager and current application/render callbacks. Host/item geometry, ink bar, change detector, viewport, directionality and platform are explicit protocols. ResizeObserver absent to isolate initial alignment; real browsers can also realign from resize. No actual legacy directive/node DI, native paint, packed/AOT geometry, consumer build or Rx/Node floor qualification.',
    native_or_actual_legacy_instances_qualified:false,g11_claim:'not-passed'};
  assert.equal(results.length,10);
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({line:report.line,subjects:10,mutation_rejections:results.flatMap(row=>row.mutations).length,
    compiler:compiler.version,native_executed:false,actual_legacy_instances_qualified:false}));
}finally{loaded.dispose();}
