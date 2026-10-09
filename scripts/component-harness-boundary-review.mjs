/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Public base-class forwarding boundary only; not a native harness environment. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';

const require = createRequire(import.meta.url), ts = require('typescript');
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const subjectHash = '4379f0c1121a731ea7024b2c24af0c0b2f54d1a900d424162f34c4870d1889ff';
const moduleName = '@angular/cdk/testing', symbolName = 'ComponentHarness';
const pins = {original: '16.2.14', main: '22.1.7', '21.x': '21.2.14'};
const methods = ['host', 'documentRootLocatorFactory', 'locatorFor', 'locatorForOptional',
  'locatorForAll', 'forceStabilize', 'waitForTasksOutsideAngular'];
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
function parse(path, text) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0, path); return source;
}
function named(source, name, predicate) {
  const rows = source.statements.filter(node => predicate(node) && node.name?.text === name);
  assert.equal(rows.length, 1, 'missing/ambiguous ' + name); return rows[0];
}
function publiclyExported(source, name) {
  return source.statements.some(node => node.name?.text === name
    && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
    || source.statements.some(node => ts.isExportDeclaration(node) && node.exportClause
      && ts.isNamedExports(node.exportClause) && node.exportClause.elements.some(item => item.name.text === name));
}
function stable(node) {
  for (const tag of ts.getJSDocTags(node)) assert.ok(!['deprecated', 'docs-private', 'breaking-change', 'experimental'].includes(tag.tagName.text), 'unstable public base declaration');
}

/** Execute the whole authenticated public testing module with one qualified host RxJS import. */
export async function loadHarnessSubjects(root = defaultRoot) {
  const bytes = readFileSync(join(root, 'compatibility/rc/component-harness-public-subjects.json'));
  assert.equal(hash(bytes), subjectHash, 'testing subject capsule changed');
  const capsule = JSON.parse(bytes), rxjsPath = require.resolve('rxjs');
  const models = [];
  for (const subject of capsule.subjects) {
    assert.equal(subject.version, pins[subject.line]);
    const sources = new Map();
    for (const member of subject.members) {
      const gzip = readFileSync(join(root, member.path)); assert.equal(hash(gzip), member.gzip_sha256, 'public testing gzip changed');
      const raw = gunzipSync(gzip); assert.equal(hash(raw), member.sha256, 'public testing member changed'); assert.equal(raw.length, member.bytes);
      sources.set(member.archive_member.replace(/^package\//, ''), raw.toString());
    }
    const pkg = JSON.parse(sources.get('package.json'));
    assert.equal(pkg.name, '@angular/cdk'); assert.equal(pkg.version, subject.version);
    assert.equal(pkg.exports['./testing'].default, './' + subject.public_entry);
    assert.equal(pkg.exports['./testing'].types, './' + subject.public_types);
    const runtimeSource = parse(subject.public_entry, sources.get(subject.public_entry));
    const runtimeClass = named(runtimeSource, symbolName, ts.isClassDeclaration);
    assert.ok(publiclyExported(runtimeSource, symbolName), 'missing public runtime export');
    const imports = runtimeSource.statements.filter(ts.isImportDeclaration);
    assert.equal(imports.length, 1); assert.equal(imports[0].moduleSpecifier.text, 'rxjs');
    assert.equal(imports[0].importClause.namedBindings.elements[0].name.text, 'BehaviorSubject');
    assert.equal(imports[0].importClause.namedBindings.elements.length, 1);
    const members = runtimeClass.members.filter(node => ts.isConstructorDeclaration(node) || ts.isMethodDeclaration(node));
    assert.equal(members.length, 8);
    const runtimeBodies = Object.fromEntries(members.map(node => [ts.isConstructorDeclaration(node) ? 'constructor' : node.name.text, print(node, runtimeSource)]));
    assert.deepEqual(Object.keys(runtimeBodies), ['constructor', ...methods]);
    const fields = runtimeClass.members.filter(ts.isPropertyDeclaration);
    assert.equal(runtimeClass.members.length, members.length + fields.length, 'unexpected class initialization');
    assert.equal(fields.length, subject.line === 'original' ? 0 : 1);
    if (fields.length) {assert.equal(fields[0].name.text, 'locatorFactory'); assert.equal(fields[0].initializer, undefined);}

    const types = parse(subject.public_types, sources.get(subject.public_types));
    assert.ok(publiclyExported(types, symbolName), 'missing public type export');
    let declarationSource = types;
    const forwarding = types.statements.find(node => ts.isExportDeclaration(node) && node.moduleSpecifier
      && node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.some(item => item.name.text === symbolName));
    if (forwarding) {
      const relative = forwarding.moduleSpecifier.text.replace(/\.js$/, '.d.ts');
      const owner = join(dirname(subject.public_types), relative);
      assert.ok(sources.has(owner), 'missing complete declaration export closure');
      declarationSource = parse(owner, sources.get(owner));
      assert.ok(publiclyExported(declarationSource, symbolName), 'chunk does not export public base');
    }
    const declaration = named(declarationSource, symbolName, ts.isClassDeclaration);
    stable(declaration); for (const member of declaration.members) stable(member);
    const alias = named(declarationSource, 'AsyncFactoryFn', ts.isTypeAliasDeclaration);
    assert.equal(alias.typeParameters.length, 1);
    assert.equal(alias.typeParameters[0].name.text, 'T');
    assert.equal(print(alias.type, declarationSource), '() => Promise<T>');
    const normalize = text => text.replace(/^export /, '').replace(/AsyncFactoryFn<LocatorFnResult<T>( \| null)?(\[\])?>/g, (_, nullable = '', array = '') => `() => Promise<LocatorFnResult<T>${nullable}${array}>`);
    const declarationContract = normalize(print(declaration, declarationSource));
    const rawRuntime = sources.get(subject.public_entry), specifier = imports[0].moduleSpecifier;
    const rewritten = rawRuntime.slice(0, specifier.getStart(runtimeSource))
      + JSON.stringify(pathToFileURL(rxjsPath).href) + rawRuntime.slice(specifier.getEnd());
    const runtime = await import('data:text/javascript;base64,' + Buffer.from(rewritten).toString('base64'));
    models.push({subject, runtime, runtimeBodies, declarationContract, raw_runtime_sha256: hash(rawRuntime),
      declaration_sha256: hash(sources.get(declarationSource.fileName)), alias_expansion: 'AsyncFactoryFn<T> = () => Promise<T>'});
  }
  const original = models.find(model => model.subject.line === 'original');
  assert.equal(models.length, 3);
  for (const model of models) {
    assert.deepEqual(model.runtimeBodies, original.runtimeBodies, 'public base runtime body changed');
    assert.equal(model.declarationContract, original.declarationContract, 'public base type contract changed');
  }
  return {models, rxjs: {version: require('rxjs/package.json').version, entry: rxjsPath,
    entry_sha256: hash(readFileSync(rxjsPath)), scope: 'Borrowed host module import only; not RxJS/Node floor execution.'}};
}

/** Independent LocatorFactory protocol observations, using each actual public class. */
export async function exerciseHarnessBase(Base) {
  const cases = [], calls = [], root = {}, secondRoot = {}, documentFactory = {}, sentinel = new Error('factory sentinel');
  const factory = {rootElement: root};
  const harness = new Base(factory); assert.equal(harness.locatorFactory, factory); cases.push('constructor-factory-identity');
  assert.equal(await harness.host(), root); factory.rootElement = secondRoot;
  assert.equal(await harness.host(), secondRoot); cases.push('host-current-root-identity');
  Object.defineProperty(factory, 'rootElement', {get() {throw sentinel;}, configurable: true});
  await assert.rejects(harness.host(), error => error === sentinel); cases.push('host-getter-rejection');
  factory.documentRootLocatorFactory = function (...args) {assert.equal(this, factory); assert.equal(args.length, 0); return documentFactory;};
  assert.equal(harness.documentRootLocatorFactory(), documentFactory); cases.push('document-root-factory-identity');
  factory.documentRootLocatorFactory = () => {throw sentinel;};
  assert.throws(() => harness.documentRootLocatorFactory(), error => error === sentinel); cases.push('document-root-synchronous-error');
  for (const name of ['locatorFor', 'locatorForOptional', 'locatorForAll']) {
    for (const queries of [[], ['.owned'], ['.owned', Base, {predicate: 'identity'}]]) {
      const locator = async () => root;
      factory[name] = function (...args) {assert.equal(this, factory); assert.equal(args.length, queries.length);
        args.forEach((arg, index) => assert.equal(arg, queries[index])); calls.push([name, args.length]); return locator;};
      assert.equal(harness[name](...queries), locator); cases.push(name + '-arguments-' + queries.length);
    }
    factory[name] = () => {throw sentinel;};
    assert.throws(() => harness[name]('.owned'), error => error === sentinel); cases.push(name + '-synchronous-error');
  }
  for (const name of ['forceStabilize', 'waitForTasksOutsideAngular']) {
    let release, settled = false;
    const pending = new Promise(resolve => {release = resolve;});
    factory[name] = function (...args) {assert.equal(this, factory); assert.equal(args.length, 0); return pending;};
    const result = harness[name](); assert.equal(typeof result?.then, 'function');
    result.then(() => {settled = true;}); await Promise.resolve(); await Promise.resolve();
    assert.equal(settled, false, 'base returned before factory stabilization');
    release(); assert.equal(await result, undefined); cases.push(name + '-pending-and-void');
    factory[name] = () => {throw sentinel;};
    await assert.rejects(harness[name](), error => error === sentinel); cases.push(name + '-synchronous-factory-error');
    factory[name] = () => Promise.reject(sentinel);
    await assert.rejects(harness[name](), error => error === sentinel); cases.push(name + '-asynchronous-factory-error');
  }
  assert.equal(cases.length, 23);
  return {cases, query_calls: calls, locator_factory_is_protocol_double: true, native_environment: false};
}

/** Strict declarations using the complete public root/chunk; no Angular build. */
export function compileHarnessBaseTypes(models, compilerRoot) {
  const compilerPath = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript');
  const compiler = require(compilerPath), results = [];
  for (const model of models) {
    const virtualRoot = join(defaultRoot, '__harness_type_diagnostic__', model.subject.line), files = new Map();
    for (const member of model.subject.members.filter(member => member.archive_member.endsWith('.d.ts'))) {
      files.set(join(virtualRoot, member.archive_member), gunzipSync(readFileSync(join(defaultRoot, member.path))).toString());
    }
    const subjectEntry = './package/' + model.subject.public_types.replace(/\.d\.ts$/, '');
    const code = `import {ComponentHarness, HarnessQuery, LocatorFnResult, LocatorFactory, TestElement, AsyncFactoryFn} from '${subjectEntry}';
class OwnedHarness extends ComponentHarness {
  static hostSelector = '.owned';
  rootHost(): Promise<TestElement> { return this.host(); }
  rootFactory(): LocatorFactory { return this.documentRootLocatorFactory(); }
  first<T extends (HarnessQuery<any> | string)[]>(...queries: T): AsyncFactoryFn<LocatorFnResult<T>> { return this.locatorFor(...queries); }
  optional<T extends (HarnessQuery<any> | string)[]>(...queries: T): AsyncFactoryFn<LocatorFnResult<T> | null> { return this.locatorForOptional(...queries); }
  all<T extends (HarnessQuery<any> | string)[]>(...queries: T): AsyncFactoryFn<LocatorFnResult<T>[]> { return this.locatorForAll(...queries); }
  stabilize(): Promise<void> { return this.forceStabilize(); }
  outside(): Promise<void> { return this.waitForTasksOutsideAngular(); }
}
declare const factory: LocatorFactory;
const harness = new OwnedHarness(factory);
const host: Promise<TestElement> = harness.first('.owned')();
const optional: Promise<TestElement | null> = harness.optional('.owned')();
const all: Promise<TestElement[]> = harness.all('.owned')();
const queried: Promise<OwnedHarness> = harness.first(OwnedHarness)();
const mixed: Promise<TestElement | OwnedHarness> = harness.first('.owned', OwnedHarness)();
// @ts-expect-error The public constructor requires its actual LocatorFactory contract.
new OwnedHarness('invalid');
// @ts-expect-error Queries must be selectors, public harness constructors or predicates.
harness.first(123);
// @ts-expect-error An undefined query does not satisfy the historical query contract.
harness.optional(undefined);
// @ts-expect-error Arbitrary objects are not harness predicates.
harness.all({arbitrary: true});
// @ts-expect-error The optional query result includes null.
const lostNull: Promise<TestElement> = harness.optional('.owned')();
// @ts-expect-error The all query returns an array.
const lostArray: Promise<TestElement> = harness.all('.owned')();
`;
    const file = join(virtualRoot, 'consumer.ts'); files.set(file, code);
    const options = {target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext,
      moduleResolution: compiler.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: false,
      noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']};
    const host = compiler.createCompilerHost(options), read = host.readFile.bind(host), exists = host.fileExists.bind(host);
    host.readFile = path => files.get(path) ?? read(path); host.fileExists = path => files.has(path) || exists(path);
    host.directoryExists = path => [...files.keys()].some(file => file.startsWith(path + '/')) || compiler.sys.directoryExists(path);
    const program = compiler.createProgram([file], options, host), diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnosticsWithColorAndContext(diagnostics,
      {getCanonicalFileName: name => name, getCurrentDirectory: () => virtualRoot, getNewLine: () => '\n'}));
    results.push({line: model.subject.line, compiler: compiler.version, strict: true, skip_lib_check: false,
      positive_checks: 13, negative_checks: 6, source_sha256: hash(code), declarations: files.size - 1});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)), compiler_root: compilerRoot ?? null,
    subjects: results, scope: 'Complete actual standalone testing declarations only;no Angular templates/native/packed/floor environment.'};
}

export async function reviewComponentHarnessBoundary({root = defaultRoot, readSource} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seed), seedHash);
  const uses = JSON.parse(seed).symbol_uses.filter(use => use.module === moduleName && use.symbol === symbolName);
  assert.equal(uses.length, 26);
  const {models, rxjs} = await loadHarnessSubjects(root);
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const files = [...new Set(uses.map(use => use.file))], authoredRoot = join(root, 'projects/ngx-material-legacy');
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler};
  const host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host);
  host.readFile = path => path.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + path.slice(authoredRoot.length + 1)) : originalRead(path);
  const program = ts.createProgram(files.map(file => join(authoredRoot, file)), options, host), checker = program.getTypeChecker(), cases = [];
  for (const use of uses) {
    const source = program.getSourceFile(join(authoredRoot, use.file)); assert.ok(source);
    assert.equal(source.parseDiagnostics.length, 0);
    const imports = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === moduleName
      && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings))
      .flatMap(node => node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === symbolName));
    assert.equal(imports.length, 1, 'missing/ambiguous base import');
    const binding = imports[0], symbol = checker.getSymbolAtLocation(binding.name); assert.ok(symbol);
    const references = [];
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName && checker.getSymbolAtLocation(node) === symbol) {
        const parent = node.parent;
        let role;
        if (ts.isTypeReferenceNode(parent)) role = 'erased-type-reference';
        else if (ts.isExpressionWithTypeArguments(parent) && ts.isHeritageClause(parent.parent)
          && ts.isClassDeclaration(parent.parent.parent) && parent.parent.token === ts.SyntaxKind.ExtendsKeyword) {
          assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly, 'runtime base imported as type only');
          assert.ok(!parent.typeArguments?.length, 'non-generic public base received type arguments');
          role = 'runtime-base-inheritance';
        }
        else if (ts.isExpressionWithTypeArguments(parent) && ts.isHeritageClause(parent.parent)
          && ts.isInterfaceDeclaration(parent.parent.parent)) role = 'erased-interface-inheritance';
        else assert.fail('unsupported ComponentHarness reference: ' + parent.getText(source));
        references.push({role, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression: parent.getText(source)});
      }
      ts.forEachChild(node, visit);
    }
    visit(source); assert.ok(references.length, 'unused base import');
    cases.push({...use, candidate_source_sha256: hash(source.text), local_name: binding.name.text, references});
  }
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(manifest.peerDependencies['@angular/cdk'], '^' + pins[line]);
  const behaviors = [];
  for (const model of models) behaviors.push({line: model.subject.line, ...await exerciseHarnessBase(model.runtime.ComponentHarness)});
  return {schema_version: 1, line, node: process.version, typescript: ts.version, seed_sha256: seedHash,
    uses: uses.length, files: files.length, cases, behaviors, rxjs, source_override_used: !!readSource,
    subjects: models.map(({runtime, ...model}) => model),
    limits: ['Complete authenticated public base class/declarations and exact26authored binding roles only.',
      'All actual peer public modules loaded with borrowed hostRxJS; LocatorFactory protocol doubles exercise identity/order/pending/error forwarding.',
      'Native selector matching,owned harness methods,Angular stabilization/full Node/RxJS/minimum environments,packed/AOT and upstream SHA review remain separate.'],
    g11_claim: 'not-passed'};
}
