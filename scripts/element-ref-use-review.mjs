/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public core identity, ElementRef construction/DI and exact authored contexts. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, realpathSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, join, resolve, posix} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const require = createRequire(import.meta.url), ts = require('typescript'), defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const capsuleHash = 'e08da48b91457bdf614c290fa67ca1930c71ddcc80f0ac87968b5d81aff65b20';
const pins = {original: '16.2.12', main: '22.1.7', '21.x': '21.2.23'}, moduleName = '@angular/core';
const deltaFiles = ['legacy-dialog/internal/dialog-container-base.ts', 'legacy-dialog/dialog-container.ts', 'legacy-table/cell.ts', 'legacy-table/internal/table-outlet.ts', 'legacy-menu/internal/menu-item-context.ts'];
const printer = ts.createPrinter({removeComments: true}), print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
function parse(path, text) {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;}
const stable = node => assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(tag.tagName.text)), 'unstable ElementRef declaration/export');
function resolveExport(files, path, name, kind, chain = []) {
  assert.ok(chain.length < 10); const source = files.get(path); assert.ok(source, 'missing public export closure');
  const local = source.statements.filter(n => kind(n) && n.name?.text === name);
  if (local.length) {assert.equal(local.length, 1); return {source, node: local[0], chain};}
  const links = source.statements.filter(n => (ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause)) || (ts.isImportDeclaration(n) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)));
  for (const link of links) {
    const clause = ts.isExportDeclaration(link) ? link.exportClause : link.importClause.namedBindings, item = clause.elements.find(e => e.name.text === name);
    if (!item) continue; stable(item); const targetName = (item.propertyName || item.name).text;
    if (!link.moduleSpecifier) return resolveExport(files, path, targetName, kind, [...chain, {path, name, target_name: targetName}]);
    assert.ok(link.moduleSpecifier.text.startsWith('./'));
    const target = posix.join(posix.dirname(path), path.endsWith('.d.ts') ? link.moduleSpecifier.text.replace(/\.js$/, '.d.ts') : link.moduleSpecifier.text);
    return resolveExport(files, target, targetName, kind, [...chain, {path, name, target, target_name: targetName}]);
  }
  assert.fail('missing public ElementRef binding');
}
function publicName(source, name) {return source.statements.some(n => n.name?.text === name && n.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
  || source.statements.some(n => ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause) && n.exportClause.elements.some(e => e.name.text === name));}
function staticClosure(sources, pkg, start) {
  const seen = new Set(), external = new Set(), edges = [];
  function visit(path) {
    if (seen.has(path)) return; seen.add(path); assert.ok(sources.has(path), 'uncaptured runtime module');
    const source = parse(path, sources.get(path));
    for (const node of source.statements.filter(n => (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text; let target;
      if (specifier.startsWith('.')) target = posix.join(posix.dirname(path), specifier);
      else if (specifier === moduleName || specifier.startsWith(moduleName + '/')) {const route = specifier === moduleName ? '.' : './' + specifier.slice(moduleName.length + 1); target = pkg.exports[route]?.default?.replace(/^\.\//, ''); assert.ok(target, 'missing core self export');}
      else {assert.ok(['rxjs', 'rxjs/operators'].includes(specifier), 'unexpected static external runtime import'); external.add(specifier);}
      edges.push({path, specifier, target: target ?? null}); if (target) visit(target);
    }
  }
  visit(start); return {members: [...seen].sort(), external: [...external].sort(), edges};
}
export async function elementRefSubjects(root = defaultRoot) {
  const bytes = readFileSync(join(root, 'compatibility/rc/element-ref-public-subjects.json')); assert.equal(hash(bytes), capsuleHash, 'ElementRef subject capsule changed');
  const capsule = JSON.parse(bytes), models = [], temporary = [], rxjsRoot = realpathSync(dirname(require.resolve('rxjs/package.json')));
  try {
    for (const subject of capsule.subjects) {
      assert.equal(subject.version, pins[subject.line]); assert.equal(subject.archive_sri_verified, true); const sources = new Map();
      for (const member of subject.members) {
        const stored = readFileSync(join(root, member.path)); assert.equal(hash(stored), member.stored_sha256, 'stored core member changed');
        assert.ok(['none', 'gzip'].includes(member.compression)); const raw = member.compression === 'gzip' ? gunzipSync(stored) : stored;
        assert.equal(hash(raw), member.sha256, 'core source member changed'); assert.equal(raw.length, member.bytes); sources.set(member.archive_member.replace(/^package\//, ''), raw.toString());
      }
      const pkg = JSON.parse(sources.get('package.json')); assert.equal(pkg.name, moduleName); assert.equal(pkg.version, subject.version);
      assert.equal(pkg.exports['.'].default, subject.runtime_entry); assert.equal(pkg.exports['.'].types, subject.type_entry);
      const runtimePath = subject.runtime_entry.replace(/^\.\//, ''), typePath = subject.type_entry.replace(/^\.\//, '');
      const files = new Map([...sources].filter(([p]) => p.endsWith('.mjs') || p.endsWith('.d.ts')).map(([p,t]) => [p, parse(p,t)]));
      assert.ok(publicName(files.get(runtimePath), 'ElementRef')); assert.ok(publicName(files.get(typePath), 'ElementRef'));
      const runtimeBinding = resolveExport(files, runtimePath, 'ElementRef', ts.isClassDeclaration), typeBinding = resolveExport(files, typePath, 'ElementRef', ts.isClassDeclaration);
      stable(typeBinding.node); typeBinding.node.members.forEach(stable);
      const declaration = print(typeBinding.node, typeBinding.source).replace(/^(?:(?:export|declare) )+/, '');
      const cls = runtimeBinding.node, source = runtimeBinding.source, constructors = cls.members.filter(ts.isConstructorDeclaration); assert.equal(constructors.length, 1);
      const constructor = print(constructors[0], source); assert.equal(cls.heritageClauses, undefined);
      const fields = cls.members.filter(ts.isPropertyDeclaration), original = subject.line === 'original';
      assert.deepEqual(fields.map(f => f.name.text), original ? [] : ['nativeElement', '__NG_ELEMENT_ID__']);
      if (!original) {assert.equal(fields[0].initializer, undefined); assert.equal(fields[0].modifiers, undefined); assert.equal(fields[1].initializer.getText(source), 'injectElementRef'); assert.ok(fields[1].modifiers.some(m => m.kind === ts.SyntaxKind.StaticKeyword));}
      const blocks = cls.members.filter(ts.isClassStaticBlockDeclaration); assert.equal(blocks.length, original ? 1 : 0);
      if (original) assert.equal(print(blocks[0].body, source), '{\n    this.__NG_ELEMENT_ID__ = injectElementRef;\n}');
      assert.equal(cls.members.length, constructors.length + fields.length + blocks.length, 'new class behavior outside reviewed shape');
      const helpers = {};
      for (const name of ['injectElementRef', 'createElementRef', 'unwrapElementRef']) {
        const nodes = source.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name); assert.equal(nodes.length, 1); helpers[name] = print(nodes[0], source);
      }
      const closure = staticClosure(sources, pkg, runtimePath), temp = mkdtempSync(join(tmpdir(), 'closeout-elementref-core-')); temporary.push(temp);
      const packageRoot = join(temp, 'node_modules/@angular/core');
      for (const [path, text] of sources) {const target = join(packageRoot, path); mkdirSync(dirname(target), {recursive: true}); writeFileSync(target, text);}
      symlinkSync(rxjsRoot, join(temp, 'node_modules/rxjs'), 'dir');
      const consumer = join(temp, 'consumer.mjs'); writeFileSync(consumer, "export * from '@angular/core';\n");
      const runtime = await import(pathToFileURL(consumer).href), directPublicEntry = await import(pathToFileURL(join(packageRoot, runtimePath)).href);
      assert.equal(runtime.ElementRef, directPublicEntry.ElementRef, 'public entrypoint identity differs');
      assert.equal(runtime.VERSION.full, subject.version); assert.equal(typeof runtime.ElementRef, 'function');
      models.push({subject, sources, runtime, package_root: packageRoot, declaration, constructor, helpers, runtime_public_chain: runtimeBinding.chain,
        declaration_public_chain: typeBinding.chain, closure, class_field_difference: original ? 'Constructor assignment;static block registration.' : 'Uninitialized nativeElement field;static field registration.'});
    }
    const original = models.find(m => m.subject.line === 'original'); assert.equal(models.length, 3);
    for (const model of models) {assert.equal(model.declaration, original.declaration, 'ElementRef declaration changed'); assert.equal(model.constructor, original.constructor, 'ElementRef constructor body changed'); assert.deepEqual(model.helpers, original.helpers, 'ElementRef factory/unwrap body changed');}
    return {models, rxjs: {version: JSON.parse(readFileSync(join(rxjsRoot, 'package.json'))).version, root: rxjsRoot, scope: 'Borrowed host RxJS only;not RxJS/Node or full Angular floor qualification.'}, dispose() {temporary.forEach(path => rmSync(path, {recursive: true, force: true}));}};
  } catch (error) {temporary.forEach(path => rmSync(path, {recursive: true, force: true})); throw error;}
}
export function exerciseElementRef(runtime, Ref = runtime.ElementRef) {
  const cases = [], native = {}, changed = {}, sentinel = new Error('ElementRef sentinel'), ref = new Ref(native);
  assert.equal(ref.nativeElement, native); assert.equal(ref instanceof Ref, true); assert.equal(ref instanceof runtime.ElementRef, true); cases.push('native-identity-and-public-instanceof');
  ref.nativeElement = changed; assert.equal(ref.nativeElement, changed); cases.push('native-current-mutable-identity');
  assert.deepEqual(Object.getOwnPropertyDescriptor(ref, 'nativeElement'), {value: changed, writable: true, enumerable: true, configurable: true}); cases.push('own-data-property-descriptor');
  for (const value of [undefined, null, 0, '', false]) assert.equal(new Ref(value).nativeElement, value); cases.push('unrestricted-original-argument-identity');
  assert.equal({nativeElement: native} instanceof Ref, false); cases.push('structural-object-not-instance');
  const parent = runtime.Injector.create({providers: []}), environment = runtime.createEnvironmentInjector([{provide: Ref, useValue: ref}], parent);
  try {
    assert.equal(environment.get(Ref), ref); assert.equal(runtime.runInInjectionContext(environment, () => runtime.inject(Ref)), ref); cases.push('public-provider-and-injection-identity');
    assert.equal(runtime.runInInjectionContext(environment, () => runtime.inject(Ref, {optional: true})), ref); cases.push('public-optional-provided-token-identity');
    assert.throws(() => runtime.runInInjectionContext(environment, () => {throw sentinel;}), error => error === sentinel); cases.push('public-context-error-identity');
    assert.equal(runtime.runInInjectionContext(environment, () => runtime.inject(Ref)), ref); cases.push('public-context-restored-after-error');
  } finally {environment.destroy(); parent.destroy();}
  assert.throws(() => runtime.inject(Ref)); cases.push('outside-public-injection-context-rejected');
  let setters = 0; class UnsupportedAccessor extends Ref {get nativeElement() {return native;} set nativeElement(value) {setters++;}}
  new UnsupportedAccessor(native);
  return {cases, unsupported_js_accessor_setter_calls: setters, angular_element_node_di_executed: false, native_environment: false};
}
export function compileElementRefTypes(models, compilerRoot) {
  const compilerPath = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript'), compiler = require(compilerPath), results = [];
  for (const model of models) {
    const file = join(dirname(dirname(dirname(model.package_root))), 'consumer.ts');
    const code = `import {ElementRef,Injector,Provider,inject,runInInjectionContext} from '@angular/core';
const node=document.createElement('div');const ref:ElementRef<HTMLDivElement>=new ElementRef(node);
const native:HTMLDivElement=ref.nativeElement;ref.nativeElement=document.createElement('div');
const erased:ElementRef=ref;const inferred:ElementRef<HTMLDivElement>=new ElementRef(node);
const provider:Provider={provide:ElementRef,useValue:ref};declare const injector:Injector;
const injected:ElementRef=runInInjectionContext(injector,()=>inject(ElementRef));
const optional:ElementRef|null=runInInjectionContext(injector,()=>inject(ElementRef,{optional:true}));
// @ts-expect-error Explicit native element generic types are preserved.
const wrong:ElementRef<number>=new ElementRef(node);
// @ts-expect-error Explicit generic element mutations are checked.
ref.nativeElement=123;
// @ts-expect-error The historical constructor requires its native argument.
new ElementRef();
class UnsupportedAccessor extends ElementRef<HTMLDivElement>{
// @ts-expect-error A declared data property cannot become an accessor.
get nativeElement():HTMLDivElement{return node;}
}
`;
    writeFileSync(file, code); const options = {target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
      strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts','lib.dom.d.ts']};
    const program = compiler.createProgram([file], options), diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => dirname(file), getNewLine: () => '\n'}));
    results.push({line: model.subject.line, compiler: compiler.version, strict: true, skip_lib_check: false, negative_checks: 4, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)), subjects: results, scope: 'Whole genuine public core declaration root and captured closure with borrowed host RxJS;not complete consumer/floor build.'};
}
export async function reviewElementRefUses({root = defaultRoot, readSource, compilerRoot, subjects, skipDiagnostics = false} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), seedHash);
  const uses = JSON.parse(seed).symbol_uses.filter(u => u.module === moduleName && u.symbol === 'ElementRef'); assert.equal(uses.length, 67);
  const ownSubjects = !subjects, loaded = subjects ?? await elementRefSubjects(root), {models, rxjs} = loaded, read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  try {
    const authoredRoot = join(root, 'projects/ngx-material-legacy'), discovered = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts', '-g', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n');
    const actual = discovered.filter(path => parse(path, read(path)).statements.some(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)
      && n.importClause.namedBindings.elements.some(item => (item.propertyName || item.name).text === 'ElementRef')));
    assert.deepEqual(actual.map(p => p.slice('projects/ngx-material-legacy/'.length)).filter(p => !uses.some(u => u.file === p)).sort(), [...deltaFiles].sort(), 'current ElementRef delta changed');
    for (const use of uses) assert.ok(actual.includes('projects/ngx-material-legacy/' + use.file), 'missing frozen ElementRef import'); assert.equal(actual.length, 72);
    const options = {noResolve: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true}, host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host);
    host.readFile = path => path.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + path.slice(authoredRoot.length + 1)) : originalRead(path);
    const program = ts.createProgram(actual.map(p => join(root,p)), options, host), checker = program.getTypeChecker(), cases = [];
    for (const path of actual) {
      const file = path.slice('projects/ngx-material-legacy/'.length), source = program.getSourceFile(join(root,path)); assert.ok(source); assert.equal(source.parseDiagnostics.length, 0);
      const imports = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings))
        .flatMap(n => n.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === 'ElementRef'));
      assert.equal(imports.length, 1, 'missing/ambiguous ElementRef import'); const binding = imports[0], symbol = checker.getSymbolAtLocation(binding.name), references = []; assert.ok(symbol); assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === binding, 'ElementRef import shadowed or redeclared');
      function visit(node) {
        if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName && checker.getSymbolAtLocation(node) === symbol) {
          const parent = node.parent; let kind;
          if (ts.isTypeReferenceNode(parent) && parent.typeName === node) {
            assert.ok((parent.typeArguments?.length ?? 0) <= 1, 'ElementRef generic arity changed'); kind = 'type-or-constructor-annotation';
            const parameter = parent.parent, constructor = parameter.parent;
            if (ts.isParameter(parameter) && ts.isConstructorDeclaration(constructor) && ts.getDecorators(constructor.parent)?.length) {
              assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly, 'Angular ElementRef constructor token imported as type only');
            }
          }
          else {
            assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly, 'ElementRef runtime imported as type only');
            if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword && parent.right === node) {assert.equal(file, 'legacy-tooltip/internal/tooltip-base.ts'); kind = 'public-instanceof';}
            else if (ts.isPropertyAssignment(parent) && parent.name.getText(source) === 'provide' && parent.initializer === node) {assert.equal(file, 'legacy-table/cell.ts'); kind = 'public-provider-token';}
            else if (ts.isCallExpression(parent) && parent.arguments.length === 1 && parent.arguments[0] === node && ts.isIdentifier(parent.expression)) {
              assert.equal(file, 'legacy-menu/internal/menu-item-context.ts');
              const injectBindings = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings))
                .flatMap(n => n.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === 'inject'));
              assert.equal(injectBindings.length, 1); assert.ok(checker.getSymbolAtLocation(parent.expression) === checker.getSymbolAtLocation(injectBindings[0].name), 'ElementRef inject does not resolve to public imported function');
              kind = 'public-inject-token';
            }
            else if (ts.isArrayLiteralExpression(parent) && parent.elements[0] === node && parent.elements.length === 2) {assert.equal(file, 'legacy-menu/internal/menu-item-context.ts'); kind = 'token-value-map-key';}
            else assert.fail('unreviewed ElementRef runtime/subclass/alias reference');
          }
          const angularConstructorInput = ts.isTypeReferenceNode(parent) && ts.isParameter(parent.parent) && ts.isConstructorDeclaration(parent.parent.parent) && !!ts.getDecorators(parent.parent.parent.parent)?.length;
          references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, kind, angular_constructor_input: angularConstructorInput, expression: parent.getText(source)});
        }
        ts.forEachChild(node, visit);
      }
      visit(source); assert.ok(references.length); cases.push({file, module: moduleName, symbol: 'ElementRef', frozen_use: uses.some(u => u.file === file), local_name: binding.name.text, candidate_source_sha256: hash(source.text), references});
    }
    const population = cases.flatMap(c => c.references).reduce((o,r) => {o[r.kind] = (o[r.kind] ?? 0) + 1; return o;}, {});
    assert.deepEqual(population, {'type-or-constructor-annotation': 138, 'public-instanceof': 1, 'public-provider-token': 3, 'token-value-map-key': 1, 'public-inject-token': 1});
    const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main'; assert.equal(manifest.peerDependencies[moduleName], '^' + pins[line]);
    return {schema_version: 1, line, node: process.version, binding_parser: ts.version, frozen_uses: 67, current_uses: 72, current_delta_uses: 5, cases, population, rxjs, source_override_used: !!readSource,
      behaviors: skipDiagnostics ? [] : models.map(m => ({line: m.subject.line, ...exerciseElementRef(m.runtime)})), type_compilation: skipDiagnostics ? null : compileElementRefTypes(models, compilerRoot),
      subjects: models.map(({runtime, sources, package_root, ...m}) => m),
      limits: ['All67 frozen and5 supplementary current imports bound. Constructor annotations are Angular DI inputs,not silently classified as executable erasure.',
        'Whole genuine public core modules execute with borrowed RxJS7.8.2. Explicit public provider/context controls are not native Angular element-node injection or full consumer/floor qualification.',
        'Static element factory/helper operations match source;private helpers are inspected,not imported by product or invoked by these controls. No arbitrary JS accessor/interposition equivalence.'], g11_claim: 'not-passed'};
  } finally {if (ownSubjects) loaded.dispose();}
}
