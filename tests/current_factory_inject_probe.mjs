/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Two actual contextual constructor/factory scopes; complete module graphs are separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync, spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const read = p => readFileSync(join(root, p), 'utf8'), sha = raw => createHash('sha256').update(raw).digest('hex');
const printer = ts.createPrinter({removeComments: true}), print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
const parse = (path, raw) => {const file = ts.createSourceFile(path, raw, ts.ScriptTarget.Latest, true); assert.equal(file.parseDiagnostics.length, 0); return file;};
const commonPath = 'projects/ngx-material-legacy/legacy-core/internal/common-module.ts';
const locationPath = 'projects/ngx-material-legacy/legacy-progress-bar/internal/progress-bar-location.ts';
const referencePath = 'reference/material-16.2.14/error-helper-sources/progress-bar-location.ts';
const original = read(referencePath); assert.equal(sha(original), '5019507c69b86e1076ddfdbc4f3b332ae883a945a40486592419e10f3a3b3b48');
const originalFile = parse(referencePath, original);
const originalFactory = originalFile.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'MAT_PROGRESS_BAR_LOCATION_FACTORY'); assert.ok(originalFactory);
function inspect(path, raw) {
  const source = parse(path, raw), imports = source.statements.filter(n => ts.isImportDeclaration(n));
  const named = (module, name) => imports.filter(n => n.moduleSpecifier.text === module).flatMap(n => n.importClause?.namedBindings?.elements || []).filter(n => (n.propertyName || n.name).text === name);
  const binding = named('@angular/core', 'inject'); assert.equal(binding.length, 1); assert.ok(!binding[0].isTypeOnly && !binding[0].parent.parent.isTypeOnly);
  const options = {noResolve: true, noLib: true}, absolute = join(root, path), host = ts.createCompilerHost(options); host.getSourceFile = p => p === absolute ? source : undefined;
  const checker = ts.createProgram([absolute], options, host).getTypeChecker(), symbol = checker.getSymbolAtLocation(binding[0].name), calls = [];
  const visit = n => {
    if (ts.isIdentifier(n) && n.text === binding[0].name.text && n !== binding[0].name && n !== binding[0].propertyName) {
      assert.ok(checker.getSymbolAtLocation(n) === symbol, 'shadowed public inject');
      assert.ok(ts.isCallExpression(n.parent) && n.parent.expression === n, 'escaped public inject'); calls.push(n.parent);
    }
    ts.forEachChild(n, visit);
  }; visit(source); assert.equal(calls.length, 1);
  const call = calls[0], location = path === locationPath;
  const targetName = location ? 'DOCUMENT' : 'Platform', targetModule = location ? '@angular/common' : '@angular/cdk/platform';
  const token = named(targetModule, targetName); assert.equal(token.length, 1); assert.ok(!token[0].isTypeOnly && !token[0].parent.parent.isTypeOnly);
  assert.ok(checker.getSymbolAtLocation(call.arguments[0]) === checker.getSymbolAtLocation(token[0].name), 'foreign or shadowed injection token');
  assert.equal(call.arguments.length, location ? 1 : 2);
  if (!location) {
    assert.ok(ts.isObjectLiteralExpression(call.arguments[1]));
    assert.equal(call.arguments[1].properties.length, 1);
    const property = call.arguments[1].properties[0]; assert.ok(ts.isPropertyAssignment(property));
    assert.equal(property.name.getText(source), 'optional'); assert.equal(property.initializer.kind, ts.SyntaxKind.TrueKeyword);
  }
  let scope;
  if (location) {
    scope = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'MAT_PROGRESS_BAR_LOCATION_FACTORY');
    assert.ok(scope); assert.equal(print(scope.body, source), print(originalFactory.body, originalFile), 'authentic dynamic-location factory changed');
  } else {
    const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'MatCommonModule'); assert.ok(cls);
    scope = cls.members.find(ts.isConstructorDeclaration); assert.ok(scope);
    let owner = call; while (owner.parent && !ts.isIfStatement(owner)) owner = owner.parent;
    assert.ok(ts.isIfStatement(owner)); assert.equal(owner.expression.getText(source), 'isDevMode()');
    assert.equal(named('@angular/core', 'isDevMode').length, 1);
  }
  let parent = call; while (parent.parent && parent !== scope) parent = parent.parent; assert.ok(parent === scope);
  return {source, scope, calls, case: {file: path.replace('projects/ngx-material-legacy/', ''), module: '@angular/core', symbol: 'inject', candidate_source_sha256: sha(raw), references: [{kind: 'contextual-public-inject-call', line: source.getLineAndCharacterOfPosition(call.getStart(source)).line + 1, expression: call.getText(source), token: targetName, scope: print(scope, source)}]}};
}
const commonRaw = read(commonPath), locationRaw = read(locationPath), common = inspect(commonPath, commonRaw), location = inspect(locationPath, locationRaw);
const sourceControls = [];
for (const [id, path, before, after] of [
  ['wrong-core-import', commonPath, commonRaw, commonRaw.replace("from '@angular/core'", "from 'foreign-core'")],
  ['required-platform', commonPath, commonRaw, commonRaw.replace('inject(Platform, {optional: true})', 'inject(Platform)')],
  ['numeric-platform-flags', commonPath, commonRaw, commonRaw.replace('inject(Platform, {optional: true})', 'inject(Platform, 8)')],
  ['wrong-platform-token', commonPath, commonRaw, commonRaw.replace('inject(Platform, {optional: true})', 'inject(DOCUMENT, {optional: true})')],
  ['platform-outside-development-guard', commonPath, commonRaw, commonRaw.replace('if (isDevMode())', 'if (true)')],
  ['escaped-inject', commonPath, commonRaw, commonRaw + '\nexport const escapedInject = inject;\n'],
  ['optional-document', locationPath, locationRaw, locationRaw.replace('inject(DOCUMENT)', 'inject(DOCUMENT, {optional: true})')],
  ['cached-location', locationPath, locationRaw, locationRaw.replace("getPathname: () => (_location ? _location.pathname + _location.search : '')", "getPathname: (() => {const path = _location ? _location.pathname + _location.search : ''; return () => path;})()")],
  ['hash-instead-of-search', locationPath, locationRaw, locationRaw.replace('_location.search', '_location.hash')],
  ['document-alias-not-bound', locationPath, locationRaw, locationRaw.replace('import {DOCUMENT}', 'import {DOCUMENT as OtherDocument}')],
]) {
  assert.notEqual(after, before, id + ': unapplied mutation'); assert.throws(() => inspect(path, after), undefined, id); sourceControls.push({id, rejected: true});
}
const commonClass = common.source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'MatCommonModule');
const plainClass = ts.factory.updateClassDeclaration(commonClass, commonClass.modifiers?.filter(n => n.kind !== ts.SyntaxKind.Decorator), commonClass.name, commonClass.typeParameters, commonClass.heritageClauses, commonClass.members);
const helpers = common.source.statements.filter(ts.isFunctionDeclaration).map(n => print(n, common.source)).join('\n');
const environmentSource = parse('test-environment.ts', read('projects/ngx-material-legacy/legacy-core/internal/test-environment.ts'));
const environment = environmentSource.statements.filter(ts.isFunctionDeclaration).map(n => print(n, environmentSource)).join('\n');
const code = `import * as core from '@angular/core';import {DOCUMENT} from '@angular/common';import {Platform} from '@angular/cdk/platform';
const {inject,isDevMode,Inject,Optional}=core;
const MATERIAL_SANITY_CHECKS=new core.InjectionToken('sanity-protocol');
const VERSION={full:'protocol-matched'},CDK_VERSION={full:'protocol-matched'};
${environment}\n${print(plainClass, common.source)}\n${helpers}\n${print(location.scope, location.source)}
export {DOCUMENT,Platform};
`;
const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true}}).outputText;
const worker = `import assert from 'node:assert/strict';import '@angular/compiler';import * as core from '@angular/core';
const [line,mode]=process.argv.slice(2);if(mode==='production')core.enableProdMode();const scopes=await import('./factory-scopes.mjs');
const cases=[],check=(id,run)=>{run();cases.push(id);};const doc={doctype:{},location:{pathname:'/first(path)',search:'?q=1',hash:'#ignored'}};
let platformRequests=0;const context=core.Injector.create({providers:[{provide:scopes.Platform,useFactory(){platformRequests++;return {isBrowser:false};}},{provide:scopes.DOCUMENT,useValue:doc}]});
try {
 check('public-document-alias-identity',()=>{if(line!=='original')assert.equal(scopes.DOCUMENT,core.DOCUMENT);});
 check('actual-common-constructor-development-only-platform',()=>{core.runInInjectionContext(context,()=>new scopes.MatCommonModule({},false,doc));assert.equal(platformRequests,mode==='production'?0:1);});
 check('actual-common-optional-platform',()=>{const empty=core.Injector.create({providers:[]});try{core.runInInjectionContext(empty,()=>new scopes.MatCommonModule({},false,doc));}finally{empty.destroy();}});
 check('actual-common-does-not-swallow-development-provider-error',()=>{const error=new Error('controlled platform failure');let called=0;const bad=core.Injector.create({providers:[{provide:scopes.Platform,useFactory(){called++;throw error;}}]});try{if(mode==='production')core.runInInjectionContext(bad,()=>new scopes.MatCommonModule({},false,doc));else assert.throws(()=>core.runInInjectionContext(bad,()=>new scopes.MatCommonModule({},false,doc)),e=>e===error);assert.equal(called,mode==='production'?0:1);}finally{bad.destroy();}});
 check('common-outside-context-matches-development-only-injection',()=>{if(mode==='production')new scopes.MatCommonModule({},false,doc);else assert.throws(()=>new scopes.MatCommonModule({},false,doc),/NG0203|injection context/);});
 check('actual-location-required-document-and-context',()=>{assert.throws(()=>scopes.MAT_PROGRESS_BAR_LOCATION_FACTORY(),/NG0203|injection context/);const empty=core.Injector.create({providers:[]});try{assert.throws(()=>core.runInInjectionContext(empty,scopes.MAT_PROGRESS_BAR_LOCATION_FACTORY),/NG0201|NullInjectorError|No provider/);}finally{empty.destroy();}});
 check('actual-location-dynamic-path-search-and-captured-location',()=>{const result=core.runInInjectionContext(context,scopes.MAT_PROGRESS_BAR_LOCATION_FACTORY);assert.equal(result.getPathname(),'/first(path)?q=1');const retained=doc.location;retained.pathname='/changed';retained.search='?changed=2';assert.equal(result.getPathname(),'/changed?changed=2');doc.location={pathname:'/replacement',search:'?new=1'};assert.equal(result.getPathname(),'/changed?changed=2');doc.location=retained;});
 check('actual-location-null-document-and-missing-location',()=>{for(const value of [null,undefined,{location:null},{location:undefined}]){const supplied=core.Injector.create({providers:[{provide:scopes.DOCUMENT,useValue:value}]});try{assert.equal(core.runInInjectionContext(supplied,scopes.MAT_PROGRESS_BAR_LOCATION_FACTORY).getPathname(),'');}finally{supplied.destroy();}}});
 check('actual-location-provider-error-propagates',()=>{const error=new Error('controlled document failure'),bad=core.Injector.create({providers:[{provide:scopes.DOCUMENT,useFactory(){throw error;}}]});try{assert.throws(()=>core.runInInjectionContext(bad,scopes.MAT_PROGRESS_BAR_LOCATION_FACTORY),e=>e===error);}finally{bad.destroy();}});
 console.log(JSON.stringify({line,mode,framework:core.VERSION.full,cases,whole_public_core_executed:true,common_constructor_and_location_factory_are_actual_scopes:true,document_services_and_version_values_are_protocols:true,complete_modules_or_automatic_application_root_graphs_qualified:false}));
}finally{context.destroy();}
`;
const loaded = prepareMaterialPublicSubjects(root), results = [], runtimeControls = [];
try {
  for (const subject of loaded.models) {
    const bundle = join(subject.root, 'factory-scopes.mjs'), workerPath = join(subject.root, 'factory-worker.mjs');
    writeFileSync(bundle, emit(code)); writeFileSync(workerPath, worker);
    for (const mode of ['development', 'production']) {
      const stdout = execFileSync(process.execPath, [workerPath, subject.line, mode], {cwd: subject.root, encoding: 'utf8', timeout: 10000});
      results.push({...JSON.parse(stdout.trim().split('\n').at(-1)), borrowed: subject.borrowed});
    }
    for (const [id, mutant] of [
      ['platform-required', code.replace('inject(Platform, { optional: true })', 'inject(Platform)')],
      ['platform-always-injected', code.replace('if (isDevMode())', 'if (true)')],
      ['document-optional', code.replace('inject(DOCUMENT)', 'inject(DOCUMENT,{optional:true})')],
      ['location-hash-used', code.replace('_location.search', '_location.hash')],
    ]) {
      assert.notEqual(mutant, code, id + ': unapplied runtime mutation'); writeFileSync(bundle, emit(mutant));
      const result = spawnSync(process.execPath, [workerPath, subject.line, id === 'platform-always-injected' ? 'production' : 'development'], {cwd: subject.root, encoding: 'utf8', timeout: 10000});
      assert.notEqual(result.status, 0, id + ': runtime mutation escaped'); assert.match(result.stderr, /AssertionError|NG0201|NullInjectorError|No provider|injection context/);
      runtimeControls.push({line: subject.line, id, rejected: true});
    }
  }
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const report = {schema_version: 1, line, role: 'Two current public inject call boundaries using actual constructor/factory scopes and genuine original/minimum namespaces', node: process.version, compiler: ts.version,
    cases: [common.case, location.case], source_controls: sourceControls, runtime_controls: runtimeControls, results,
    public_namespace_capsule_sha256: loaded.capsule_hash, producer_sha256: sha(readFileSync(fileURLToPath(import.meta.url))), worker_sha256: sha(worker), scope_emit_sha256: sha(emit(code)),
    original_location_source: {path: referencePath, sha256: sha(original)},
    limits: ['Actual common class members/constructor and original-identical location factory execute. Common module decorators/import initialization and automatic default token/application roots are not executed. DOCUMENT/services/versions are explicit protocols; genuine public DOCUMENT, Platform and Core identities execute.',
      'Public inject overload/type stability is separately bound to current-injection-context-source-proof; this runtime probe does not claim whole-class strict compilation, packed/AOT/native, Cyph build, full runtime/RxJS/compiler floors or complete G11.'], g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({current_uses: 2, namespaces: 3, development_production_contexts: results.length, cases: results.reduce((n, r) => n + r.cases.length, 0), source_controls: sourceControls.length, runtime_mutations_rejected: runtimeControls.length, complete_product_qualified: false}));
} finally {loaded.dispose();}
