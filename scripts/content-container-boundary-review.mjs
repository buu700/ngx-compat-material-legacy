/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Historical loader delegation and exact owned override contexts; no native selector claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {loadHarnessSubjects} from './component-harness-boundary-review.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const originalHash = '9334a2966b5f02523cca1420b52da1dd75b690ad850b094b6da499f70d9ad2fb';
const name = 'ContentContainerComponentHarness', moduleName = '@angular/cdk/testing';
export const CONTENT_METHODS = ['getChildLoader', 'getAllChildLoaders', 'getHarness', 'getHarnessOrNull', 'getAllHarnesses', 'hasHarness', 'getRootHarnessLoader'];
const additions = ['getHarnessAtIndex', 'countHarnesses'];
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
function parse(path, text) {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;}
function classOf(source, symbol) {
  const classes = source.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === symbol);
  assert.equal(classes.length, 1, 'missing/ambiguous ' + symbol); return classes[0];
}
function publicExport(source, symbol) {
  return source.statements.some(node => node.name?.text === symbol && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
    || source.statements.some(node => ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)
      && node.exportClause.elements.some(item => item.name.text === symbol));
}
function stable(node) {assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'docs-private', 'breaking-change', 'experimental'].includes(tag.tagName.text)), 'unstable content public declaration');}

export async function contentSubjects(root = rootDefault) {
  const base = await loadHarnessSubjects(root), models = [];
  for (const model of base.models) {
    const sources = new Map(model.subject.members.map(member => [member.archive_member.replace(/^package\//, ''), gunzipSync(readFileSync(join(root, member.path))).toString()]));
    const runtimeSource = parse(model.subject.public_entry, sources.get(model.subject.public_entry)), runtimeClass = classOf(runtimeSource, name);
    assert.ok(publicExport(runtimeSource, name));
    assert.equal(runtimeClass.heritageClauses.length, 1);
    assert.equal(runtimeClass.heritageClauses[0].types[0].expression.getText(runtimeSource), 'ComponentHarness');
    assert.ok(runtimeClass.members.every(ts.isMethodDeclaration), 'unexpected content constructor/field');
    const expected = model.subject.line === 'original' ? CONTENT_METHODS : [...CONTENT_METHODS, ...additions];
    assert.deepEqual(runtimeClass.members.map(member => member.name.text).sort(), [...expected].sort());
    const bodies = Object.fromEntries(runtimeClass.members.filter(member => CONTENT_METHODS.includes(member.name.text)).map(member => [member.name.text, print(member, runtimeSource)]));
    const types = parse(model.subject.public_types, sources.get(model.subject.public_types)); assert.ok(publicExport(types, name));
    let owner = types;
    const forwarding = types.statements.find(node => ts.isExportDeclaration(node) && node.moduleSpecifier && node.exportClause
      && ts.isNamedExports(node.exportClause) && node.exportClause.elements.some(item => item.name.text === name));
    if (forwarding) {
      const path = join(dirname(model.subject.public_types), forwarding.moduleSpecifier.text.replace(/\.js$/, '.d.ts'));
      assert.ok(sources.has(path)); owner = parse(path, sources.get(path)); assert.ok(publicExport(owner, name));
    }
    const declaration = classOf(owner, name); stable(declaration); declaration.members.forEach(stable);
    assert.deepEqual(declaration.members.map(member => member.name.text).sort(), [...expected].sort());
    const historicalDeclaration = ts.factory.updateClassDeclaration(declaration, declaration.modifiers?.filter(modifier => modifier.kind !== ts.SyntaxKind.ExportKeyword),
      declaration.name, declaration.typeParameters, declaration.heritageClauses, declaration.members.filter(member => CONTENT_METHODS.includes(member.name.text)));
    models.push({...model, sources, historicalBodies: bodies, historicalDeclaration: print(historicalDeclaration, owner), peer_additions: model.subject.line === 'original' ? [] : additions});
  }
  const original = models.find(model => model.subject.line === 'original');
  for (const model of models) {
    assert.deepEqual(model.historicalBodies, original.historicalBodies, 'historical content method body changed');
    assert.equal(model.historicalDeclaration, original.historicalDeclaration, 'historical content declaration changed');
  }
  return {...base, models};
}

export async function exerciseContentContainer(Base) {
  class Fixture extends Base {static hostSelector = '.owned-fixture';}
  const cases = [], sentinel = new Error('loader sentinel'), factory = {}, loader = {}, root = new Fixture(factory);
  factory.rootHarnessLoader = function (...args) {assert.equal(this, factory); assert.equal(args.length, 0); return loader;};
  assert.equal(await root.getRootHarnessLoader(), loader); cases.push('root-factory-identity-and-receiver');
  for (const method of CONTENT_METHODS.filter(method => method !== 'getRootHarnessLoader')) {
    class Query extends Base {static hostSelector = '.owned-query';}
    const input = method.includes('ChildLoader') ? '.owned section' : Query, instance = new Query(factory);
    const result = method === 'getAllChildLoaders' ? [loader] : method === 'getAllHarnesses' ? [instance]
      : method === 'getHarnessOrNull' ? null : method === 'hasHarness' ? false : method === 'getHarness' ? instance : loader;
    loader[method] = function (...args) {assert.equal(this, loader); assert.equal(args.length, 1); assert.equal(args[0], input); return result;};
    assert.equal(await root[method](input), result); cases.push(method + '-argument-receiver-result');
    let release, called = false;
    const pending = new Promise(resolve => {release = resolve;});
    class Scoped extends Base {getRootHarnessLoader() {return pending;}}
    const scoped = new Scoped(factory);
    loader[method] = function (query) {called = true; assert.equal(query, input); return result;};
    const completion = scoped[method](input); await Promise.resolve();
    assert.equal(called, false, 'query executed before root loader resolved');
    release(loader); assert.equal(await completion, result); assert.equal(called, true); cases.push(method + '-awaits-virtual-root');
    class FailedRoot extends Base {getRootHarnessLoader() {return Promise.reject(sentinel);}}
    await assert.rejects(new FailedRoot(factory)[method](input), error => error === sentinel); cases.push(method + '-root-rejection');
    loader[method] = () => {throw sentinel;};
    await assert.rejects(root[method](input), error => error === sentinel); cases.push(method + '-loader-synchronous-error');
    loader[method] = () => Promise.reject(sentinel);
    await assert.rejects(root[method](input), error => error === sentinel); cases.push(method + '-loader-asynchronous-error');
  }
  class Present extends Base {static hostSelector = '.present';}
  const present = new Present(factory);
  loader.getHarnessOrNull = query => {assert.equal(query, Present); return present;};
  assert.equal(await root.getHarnessOrNull(Present), present); cases.push('optional-present-harness-identity');
  loader.hasHarness = query => {assert.equal(query, Present); return true;};
  assert.equal(await root.hasHarness(Present), true); cases.push('has-harness-true');
  factory.rootHarnessLoader = () => {throw sentinel;};
  await assert.rejects(root.getRootHarnessLoader(), error => error === sentinel); cases.push('root-factory-synchronous-error');
  assert.equal(cases.length, 34); return {cases, loader_is_protocol_double: true, native_execution: false};
}

function executeOwnedModule(text, runtime) {
  const code = ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText;
  const exports = {};
  new Function('require', 'exports', code)(specifier => {
    if (specifier === moduleName) return runtime;
    if (specifier === '@angular/cdk/coercion') return {coerceBooleanProperty() {assert.fail('coercion is outside this loader-context probe');}};
    assert.fail('unexpected owned runtime dependency: ' + specifier);
  }, exports);
  return exports;
}

/** Whole genuine original/owned classes; only root-loader paths are exercised. */
export async function ownedContentContexts(root, models, readSource) {
  const capsuleBytes = readFileSync(join(root, 'compatibility/rc/content-container-original-subjects.json'));
  assert.equal(hash(capsuleBytes), originalHash, 'original context capsule changed');
  const originals = new Map();
  for (const source of JSON.parse(capsuleBytes).sources) {
    const gzip = readFileSync(join(root, source.path)); assert.equal(hash(gzip), source.gzip_sha256);
    const raw = gunzipSync(gzip); assert.equal(hash(raw), source.sha256); assert.equal(raw.length, source.bytes);
    originals.set(source.upstream_path, raw.toString());
  }
  const contexts = [];
  for (const model of models) for (const [kind, current, historical, symbol, idMethod] of [
    ['menu', 'legacy-menu/testing/menu-harness-base.ts', 'src/material/menu/testing/menu-harness.ts', '_MatMenuHarnessBase', '_getPanelId'],
    ['tabs', 'legacy-tabs/testing/tab-harness.ts', 'src/material/legacy-tabs/testing/tab-harness.ts', 'MatLegacyTabHarness', '_getContentId'],
  ]) {
    const candidate = readSource('projects/ngx-material-legacy/' + current), authentic = originals.get(historical);
    const actualSource = parse(current, candidate), originalSource = parse(historical, authentic);
    const actualClass = classOf(actualSource, symbol), originalClass = classOf(originalSource, symbol);
    for (const method of ['getRootHarnessLoader', idMethod]) {
      const actual = actualClass.members.find(member => member.name?.text === method), original = originalClass.members.find(member => member.name?.text === method);
      assert.ok(actual && original); assert.equal(print(actual, actualSource), print(original, originalSource), 'owned root context method differs from untouched tag');
    }
    const oldType = executeOwnedModule(authentic, model.runtime)[symbol], currentType = executeOwnedModule(candidate, model.runtime)[symbol];
    const observations = [];
    for (const Type of [oldType, currentType]) {
      let controlledId = 'owned-panel-1', release, calls = [], mode = 'success';
      const sentinel = new Error('context sentinel'), answer = {}, query = {};
      const documentFactory = {harnessLoaderFor(selector) {
        assert.equal(this, documentFactory); calls.push(selector);
        if (mode === 'failure') return Promise.reject(sentinel);
        return {getHarness(input) {assert.equal(input, query); return answer;}};
      }};
      const host = {getAttribute(attribute) {assert.equal(attribute, 'aria-controls');
        return mode === 'pending' ? new Promise(resolve => {release = resolve;}) : controlledId;}};
      const factory = {rootElement: host, documentRootLocatorFactory() {assert.equal(this, factory); return documentFactory;},
        rootHarnessLoader() {assert.fail('owned override incorrectly queried the host root');}};
      const harness = new Type(factory);
      assert.equal(await harness.getHarness(query), answer);
      controlledId = 'owned-panel-2'; assert.equal(await harness.getHarness(query), answer);
      mode = 'pending'; const pending = harness.getHarness(query); await Promise.resolve(); await Promise.resolve();
      assert.equal(calls.length, 2, 'owned query skipped waiting for aria-controls');
      release('owned-panel-3'); mode = 'success'; assert.equal(await pending, answer);
      mode = 'failure'; await assert.rejects(harness.getHarness(query), error => error === sentinel);
      assert.deepEqual(calls, ['#owned-panel-1', '#owned-panel-2', '#owned-panel-3', '#owned-panel-2']);
      observations.push({selectors: calls, pending_attribute_waited: true, query_and_result_identity: true, loader_error_preserved: true});
    }
    assert.deepEqual(observations[0], observations[1]);
    contexts.push({line: model.subject.line, kind, candidate_source_sha256: hash(candidate), original_source_sha256: hash(authentic), observations: observations[1], native_execution: false});
  }
  return contexts;
}

export function compileContentTypes(models, compilerRoot) {
  const compilerPath = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript'), compiler = require(compilerPath), results = [];
  for (const model of models) {
    const virtualRoot = join(rootDefault, '__content_type_diagnostic__', model.subject.line), files = new Map();
    for (const [path, text] of model.sources) if (path.endsWith('.d.ts')) files.set(join(virtualRoot, 'package', path), text);
    const code = `import {ContentContainerComponentHarness, ComponentHarness, HarnessQuery, HarnessLoader, LocatorFactory} from './package/${model.subject.public_types.replace(/\.d\.ts$/, '')}';
class Owned extends ContentContainerComponentHarness<'left' | 'right'> { static hostSelector = '.owned'; exposeRoot(): Promise<HarnessLoader> {return this.getRootHarnessLoader();} }
declare const factory: LocatorFactory;
const harness = new Owned(factory);
const child: Promise<HarnessLoader> = harness.getChildLoader('left');
const children: Promise<HarnessLoader[]> = harness.getAllChildLoaders('right');
const first: Promise<Owned> = harness.getHarness(Owned);
const optional: Promise<Owned | null> = harness.getHarnessOrNull(Owned);
const all: Promise<Owned[]> = harness.getAllHarnesses(Owned);
const has: Promise<boolean> = harness.hasHarness(Owned);
const root: Promise<HarnessLoader> = harness.exposeRoot();
class Scoped extends Owned {protected override async getRootHarnessLoader(): Promise<HarnessLoader> {return await super.getRootHarnessLoader();}}
// @ts-expect-error Section selectors retain their string-literal generic constraint.
harness.getChildLoader('unknown');
// @ts-expect-error Child loader selectors are not optional.
harness.getAllChildLoaders();
// @ts-expect-error Numeric queries are outside the historical query contract.
harness.getHarness(123);
// @ts-expect-error Arbitrary objects are not harness predicates.
harness.getHarnessOrNull({wrong: true});
// @ts-expect-error Optional results retain null.
const lostNull: Promise<Owned> = harness.getHarnessOrNull(Owned);
// @ts-expect-error The all query retains its array result.
const lostArray: Promise<Owned> = harness.getAllHarnesses(Owned);
// @ts-expect-error Root loader override stays protected.
harness.getRootHarnessLoader();
`;
    const file = join(virtualRoot, 'consumer.ts'); files.set(file, code);
    const options = {target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
      strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']};
    const host = compiler.createCompilerHost(options), read = host.readFile.bind(host), exists = host.fileExists.bind(host);
    host.readFile = path => files.get(path) ?? read(path); host.fileExists = path => files.has(path) || exists(path);
    host.directoryExists = path => [...files.keys()].some(file => file.startsWith(path + '/')) || compiler.sys.directoryExists(path);
    const program = compiler.createProgram([file], options, host), diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => virtualRoot, getNewLine: () => '\n'}));
    results.push({line: model.subject.line, compiler: compiler.version, strict: true, skip_lib_check: false, negative_checks: 7, source_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)), compiler_root: compilerRoot ?? null, subjects: results, scope: 'Standalone complete testing declarations only;no Angular/native/fullfloor qualification.'};
}

export async function reviewContentBoundary({root = rootDefault, readSource, compilerRoot} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), seedHash);
  const uses = JSON.parse(seed).symbol_uses.filter(use => use.module === moduleName && use.symbol === name); assert.equal(uses.length, 11);
  const {models, rxjs} = await contentSubjects(root), read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const ownedRoot = join(root, 'projects/ngx-material-legacy'), options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler};
  const host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host);
  host.readFile = path => path.startsWith(ownedRoot + '/') ? read('projects/ngx-material-legacy/' + path.slice(ownedRoot.length + 1)) : originalRead(path);
  const program = ts.createProgram(uses.map(use => join(ownedRoot, use.file)), options, host), checker = program.getTypeChecker(), cases = [];
  for (const use of uses) {
    const source = program.getSourceFile(join(ownedRoot, use.file)); assert.ok(source); assert.equal(source.parseDiagnostics.length, 0);
    const imports = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === moduleName
      && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings))
      .flatMap(node => node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === name));
    assert.equal(imports.length, 1, 'missing/ambiguous content import');
    const binding = imports[0], symbol = checker.getSymbolAtLocation(binding.name), references = []; assert.ok(symbol);
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName && checker.getSymbolAtLocation(node) === symbol) {
        const parent = node.parent;
        assert.ok(ts.isExpressionWithTypeArguments(parent) && ts.isHeritageClause(parent.parent) && ts.isClassDeclaration(parent.parent.parent)
          && parent.parent.token === ts.SyntaxKind.ExtendsKeyword, 'unsupported content base reference');
        assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly, 'content runtime base imported as type only');
        const owner = parent.parent.parent; assert.ok(!owner.members.some(ts.isConstructorDeclaration), 'content constructor needs separate review');
        assert.ok(!owner.members.some(member => member.name?.getText(source) === 'locatorFactory'), 'content locatorFactory redeclaration needs separate review');
        references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression: parent.getText(source), class: owner.name.text,
          owns_root_override: owner.members.some(member => member.name?.getText(source) === 'getRootHarnessLoader')});
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) assert.ok(!additions.includes(node.expression.name.text), 'new peer method outside historical content contract');
      if (ts.isCallExpression(node) && ts.isElementAccessExpression(node.expression) && ts.isStringLiteral(node.expression.argumentExpression))
        assert.ok(!additions.includes(node.expression.argumentExpression.text), 'new peer method outside historical content contract');
      ts.forEachChild(node, visit);
    }
    visit(source); assert.ok(references.length); cases.push({...use, local_name: binding.name.text, candidate_source_sha256: hash(source.text), references});
  }
  assert.equal(cases.flatMap(row => row.references).length, 12); assert.equal(cases.flatMap(row => row.references).filter(row => row.owns_root_override).length, 2);
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(manifest.peerDependencies['@angular/cdk'], '^' + models.find(model => model.subject.line === line).subject.version);
  const behaviors = []; for (const model of models) behaviors.push({line: model.subject.line, ...await exerciseContentContainer(model.runtime.ContentContainerComponentHarness)});
  return {schema_version: 1, line, node: process.version, typescript: ts.version, uses: 11, files: 11, cases, behaviors, rxjs,
    contexts: await ownedContentContexts(root, models, read), type_compilation: compileContentTypes(models, compilerRoot), source_override_used: !!readSource,
    subjects: models.map(({runtime, sources, ...model}) => model),
    limits: ['Seven historical methods/public declarations and exact11authored content-container base imports only;current two passive additions remain peer-owned and unused.',
      'Genuine complete original/owned menu/tab classes run against actual peer bases with controlled host/document loaders;only root-loader paths are exercised.',
      'No native selectors,Angular stabilization,owned actions/filters/othermethods,packed/full Node/RxJS/floor or upstream SHA closure.'], g11_claim: 'not-passed'};
}
