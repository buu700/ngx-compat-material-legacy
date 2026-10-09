/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact public parallel/auto-detection boundary; not an Angular harness environment. */
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
const moduleName = '@angular/cdk/testing', symbolName = 'parallel';
const seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const closure = ['parallel', 'batchChangeDetection', 'defaultAutoChangeDetectionHandler', 'handleAutoChangeDetectionStatus', 'stopHandlingAutoChangeDetectionStatus'];
const publicNames = ['parallel', 'handleAutoChangeDetectionStatus', 'stopHandlingAutoChangeDetectionStatus'];
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
function parse(path, text) {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;}
function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text), out = [];
  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) out.push([scanner.getToken(), scanner.getTokenText()]);
  return out.filter((token, index) => !(token[0] === ts.SyntaxKind.CommaToken
    && [ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.CloseBracketToken, ts.SyntaxKind.CloseParenToken].includes(out[index + 1]?.[0])));
}
function publicExport(source, name) {
  return source.statements.some(node => node.name?.text === name && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
    || source.statements.some(node => ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)
      && node.exportClause.elements.some(item => item.name.text === name));
}
export async function parallelSubjects(root = rootDefault) {
  const base = await loadHarnessSubjects(root), models = [];
  for (const model of base.models) {
    const sources = new Map(model.subject.members.map(member => [member.archive_member.replace(/^package\//, ''), gunzipSync(readFileSync(join(root, member.path))).toString()]));
    const runtimeSource = parse(model.subject.public_entry, sources.get(model.subject.public_entry)), bodies = {};
    for (const name of closure) {
      const nodes = runtimeSource.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
      assert.equal(nodes.length, 1); bodies[name] = tokens(print(nodes[0], runtimeSource));
    }
    const state = {};
    for (const name of ['autoChangeDetectionSubject', 'autoChangeDetectionSubscription']) {
      const rows = runtimeSource.statements.filter(ts.isVariableStatement).flatMap(statement => statement.declarationList.declarations)
        .filter(node => node.name.getText(runtimeSource) === name);
      assert.equal(rows.length, 1); state[name] = tokens(print(rows[0], runtimeSource));
    }
    const types = parse(model.subject.public_types, sources.get(model.subject.public_types)), declarations = {};
    for (const name of publicNames) {
      assert.ok(publicExport(runtimeSource, name), 'missing public runtime export');
      assert.ok(publicExport(types, name), 'missing public declaration export');
      const nodes = types.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
      assert.equal(nodes.length, name === 'parallel' ? 5 : 1);
      for (const node of nodes) assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'docs-private', 'breaking-change', 'experimental'].includes(tag.tagName.text)), 'unstable parallel/public handler declaration');
      declarations[name] = nodes.map(node => tokens(print(node, types).replace(/^export /, '')));
    }
    models.push({...model, sources, batching_bodies: bodies, batching_state: state, public_declarations: declarations});
  }
  const original = models.find(model => model.subject.line === 'original');
  for (const model of models) {
    assert.deepEqual(model.batching_bodies, original.batching_bodies, 'parallel batching implementation changed');
    assert.deepEqual(model.batching_state, original.batching_state, 'parallel batching state changed');
    assert.deepEqual(model.public_declarations, original.public_declarations, 'parallel/public handler declaration changed');
  }
  return {...base, models};
}
const ticks = async (count = 12) => {for (let index = 0; index < count; index++) await Promise.resolve();};
const deferred = () => {let resolve, reject; const promise = new Promise((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject};};

/** Actual public module controls; manual acknowledgement demonstrates async boundaries. */
export async function exerciseHarnessParallel(runtime, override) {
  const parallel = override ?? runtime.parallel, receipts = [];
  runtime.stopHandlingAutoChangeDetectionStatus();
  const first = deferred(), second = deferred(), queue = [], statuses = [], a = {}, b = {};
  let factoryCalls = 0, settled = false, result;
  try {
    let registering = true;
    runtime.handleAutoChangeDetectionStatus(status => {
      statuses.push(status.isDisabled);
      // BehaviorSubject immediately replays the last completed status,whose
      // acknowledgement may still be present. Only new transitions are gated.
      if (status.onDetectChangesNow) {if (registering) status.onDetectChangesNow(); else queue.push(status.onDetectChangesNow);}
    });
    registering = false;
    result = parallel(() => {factoryCalls++; return [first.promise, second.promise];});
    assert.equal(typeof result?.then, 'function'); result.then(() => {settled = true;}, () => {settled = true;});
    await ticks(); assert.equal(factoryCalls, 0, 'factory ran before before-change acknowledgement');
    assert.deepEqual(statuses, [false, true]); assert.equal(queue.length, 1);
    queue.shift()(); await ticks(); assert.equal(factoryCalls, 1);
    second.resolve(b); await ticks(); assert.equal(settled, false, 'parallel returned before every value');
    first.resolve(a); await ticks(); assert.deepEqual(statuses, [false, true, false]); assert.equal(queue.length, 1);
    assert.equal(settled, false, 'parallel returned before after-change acknowledgement');
    queue.shift()(); const values = await result; assert.equal(values.length, 2); assert.equal(values[0], a); assert.equal(values[1], b);
    receipts.push({id: 'manual-before-after-order-and-identity', statuses, factory_calls: factoryCalls});
  } finally {
    first.resolve(a); second.resolve(b);
    for (let index = 0; index < 20; index++) {while (queue.length) queue.shift()(); await Promise.resolve();}
    runtime.stopHandlingAutoChangeDetectionStatus();
  }
  function observeAuto() {
    const flags = []; runtime.handleAutoChangeDetectionStatus(status => {flags.push(status.isDisabled); status.onDetectChangesNow?.();}); return flags;
  }
  try {
    let calls = 0; const flags = observeAuto();
    assert.deepEqual(await parallel(() => {calls++; return [];}), []); assert.equal(calls, 1); assert.deepEqual(flags, [false, true, false]);
    receipts.push({id: 'empty-factory-batches-once', statuses: flags}); runtime.stopHandlingAutoChangeDetectionStatus();
    const nestedFlags = observeAuto(); let nestedCalls = 0;
    const nested = await parallel(() => [parallel(() => {nestedCalls++; return [1, 2];}), parallel(() => {nestedCalls++; return [3];})]);
    assert.deepEqual(nested, [[1, 2], [3]]); assert.equal(nestedCalls, 2); assert.deepEqual(nestedFlags, [false, true, false]);
    receipts.push({id: 'nested-batches-no-extra-transitions', statuses: nestedFlags}); runtime.stopHandlingAutoChangeDetectionStatus();
    const thrown = new Error('factory sentinel'), throwFlags = observeAuto();
    await assert.rejects(parallel(() => {throw thrown;}), error => error === thrown); assert.deepEqual(throwFlags, [false, true, false]);
    receipts.push({id: 'factory-error-restores-detection', statuses: throwFlags}); runtime.stopHandlingAutoChangeDetectionStatus();
    const rejected = new Error('work sentinel'), rejectFlags = observeAuto();
    await assert.rejects(parallel(() => [Promise.reject(rejected)]), error => error === rejected); assert.deepEqual(rejectFlags, [false, true, false]);
    receipts.push({id: 'work-rejection-restores-detection', statuses: rejectFlags}); runtime.stopHandlingAutoChangeDetectionStatus();
    const thenFlags = observeAuto(), value = {}; let thenCalls = 0;
    const thenable = {then(resolve) {assert.equal(this, thenable); thenCalls++; resolve(value);}};
    const values = await parallel(() => [thenable, 7, undefined]);
    assert.equal(values[0], value); assert.equal(values[1], 7); assert.equal(values[2], undefined); assert.equal(thenCalls, 1); assert.deepEqual(thenFlags, [false, true, false]);
    receipts.push({id: 'promise-like-and-values', statuses: thenFlags}); runtime.stopHandlingAutoChangeDetectionStatus();
    const oldFlags = observeAuto(), newFlags = observeAuto(); assert.deepEqual(await parallel(() => [9]), [9]);
    assert.deepEqual(oldFlags, [false]); assert.deepEqual(newFlags, [false, true, false]);
    receipts.push({id: 'replaced-handler-unsubscribes-old', statuses: newFlags}); runtime.stopHandlingAutoChangeDetectionStatus();
    assert.deepEqual(await parallel(() => [10]), [10]); receipts.push({id: 'default-handler-after-stop'});
    assert.equal(receipts.length, 8); return {cases: receipts, native_angular_environment: false};
  } finally {runtime.stopHandlingAutoChangeDetectionStatus();}
}

export function compileParallelTypes(models, compilerRoot) {
  const compilerPath = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript'), compiler = require(compilerPath), results = [];
  for (const model of models) {
    const virtualRoot = join(rootDefault, '__parallel_type_diagnostic__', model.subject.line), files = new Map();
    for (const [path, text] of model.sources) if (path.endsWith('.d.ts')) files.set(join(virtualRoot, 'package', path), text);
    const code = `import {parallel,handleAutoChangeDetectionStatus,stopHandlingAutoChangeDetectionStatus} from './package/${model.subject.public_types.replace(/\.d\.ts$/, '')}';
const one: Promise<number[]> = parallel(() => [Promise.resolve(1)]);
const two: Promise<[number,string]> = parallel(() => [1,Promise.resolve('a')]);
const three: Promise<[number,string,boolean]> = parallel(() => [1,'a',Promise.resolve(true)]);
const four: Promise<[number,string,boolean,null]> = parallel(() => [1,'a',true,null]);
const five: Promise<[number,string,boolean,null,undefined]> = parallel(() => [1,'a',true,null,undefined]);
declare const array: Array<PromiseLike<number> | number>;
const many: Promise<number[]> = parallel(() => array);
const nested: Promise<[number[],string[]]> = parallel(() => [parallel(() => [1]),parallel(() => ['a'])]);
handleAutoChangeDetectionStatus(status => {const disabled:boolean=status.isDisabled;status.onDetectChangesNow?.();});
stopHandlingAutoChangeDetectionStatus();
// @ts-expect-error The public argument is a lazy values factory,not an array.
parallel([1,2]);
// @ts-expect-error The factory must produce an array,not a Promise of an array.
parallel(async () => [1]);
// @ts-expect-error The factory cannot require a parameter.
parallel((required:number) => [required]);
// @ts-expect-error Tuple element order and types are retained.
const reversed:Promise<[string,number]> = parallel(() => [1,'a']);
// @ts-expect-error Promise values are unwrapped.
const wrapped:Promise<Promise<number>[]> = parallel(() => [Promise.resolve(1)]);
// @ts-expect-error Status handlers have a boolean disabled flag.
handleAutoChangeDetectionStatus(status => {const invalid:string=status.isDisabled;});
`;
    const file = join(virtualRoot, 'consumer.ts'); files.set(file, code);
    const options = {target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
      strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']};
    const host = compiler.createCompilerHost(options), read = host.readFile.bind(host), exists = host.fileExists.bind(host);
    host.readFile = path => files.get(path) ?? read(path); host.fileExists = path => files.has(path) || exists(path);
    host.directoryExists = path => [...files.keys()].some(file => file.startsWith(path + '/')) || compiler.sys.directoryExists(path);
    const program = compiler.createProgram([file], options, host), diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => virtualRoot, getNewLine: () => '\n'}));
    results.push({line: model.subject.line, compiler: compiler.version, strict: true, skip_lib_check: false, negative_checks: 6, source_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)), compiler_root: compilerRoot ?? null, subjects: results, scope: 'Complete standalone testing declarations only;no Angular/fullfloor qualification.'};
}

export async function reviewHarnessParallel({root = rootDefault, readSource, compilerRoot} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), seedHash);
  const uses = JSON.parse(seed).symbol_uses.filter(use => use.module === moduleName && use.symbol === symbolName); assert.equal(uses.length, 14);
  const {models, rxjs} = await parallelSubjects(root), read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const authoredRoot = join(root, 'projects/ngx-material-legacy'), options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler};
  const host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host);
  host.readFile = path => path.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + path.slice(authoredRoot.length + 1)) : originalRead(path);
  const program = ts.createProgram(uses.map(use => join(authoredRoot, use.file)), options, host), checker = program.getTypeChecker(), cases = [];
  for (const use of uses) {
    const source = program.getSourceFile(join(authoredRoot, use.file)); assert.ok(source); assert.equal(source.parseDiagnostics.length, 0);
    const imports = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === moduleName && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings))
      .flatMap(node => node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === symbolName));
    assert.equal(imports.length, 1, 'missing/ambiguous parallel import');
    const binding = imports[0], symbol = checker.getSymbolAtLocation(binding.name), references = []; assert.ok(symbol);
    assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly, 'parallel runtime binding imported as type only');
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName && checker.getSymbolAtLocation(node) === symbol) {
        const call = node.parent; assert.ok(ts.isCallExpression(call) && call.expression === node, 'non-call parallel reference');
        assert.equal(call.arguments.length, 1, 'parallel requires one reviewed values factory');
        const factory = call.arguments[0]; assert.ok(ts.isArrowFunction(factory) || ts.isFunctionExpression(factory), 'parallel factory must be inline for this review');
        assert.equal(factory.parameters.length, 0, 'parallel factory requires parameters');
        assert.ok(!factory.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword), 'async factory produces unsupported array promise');
        let value = factory.body;
        if (ts.isBlock(value)) {assert.equal(value.statements.length, 1, 'complex parallel factory needs separate review'); assert.ok(ts.isReturnStatement(value.statements[0])); value = value.statements[0].expression;}
        const shape = ts.isArrayLiteralExpression(value) ? 'array-literal' : ts.isCallExpression(value) && ts.isPropertyAccessExpression(value.expression)
          && value.expression.name.text === 'map' ? 'array-map' : null;
        assert.ok(shape, 'parallel factory array production needs separate review');
        references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, shape, expression: call.getText(source)});
      }
      ts.forEachChild(node, visit);
    }
    visit(source); assert.ok(references.length); cases.push({...use, local_name: binding.name.text, candidate_source_sha256: hash(source.text), references});
  }
  assert.equal(cases.flatMap(row => row.references).length, 30);
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(manifest.peerDependencies['@angular/cdk'], '^' + models.find(model => model.subject.line === line).subject.version);
  const behaviors = []; for (const model of models) behaviors.push({line: model.subject.line, ...await exerciseHarnessParallel(model.runtime)});
  return {schema_version: 1, line, node: process.version, typescript: ts.version, uses: 14, files: 14, cases, behaviors, rxjs,
    type_compilation: compileParallelTypes(models, compilerRoot), source_override_used: !!readSource,
    subjects: models.map(({runtime, sources, ...model}) => model),
    limits: ['Exact14public parallel import bindings/30inline array factories and complete batching source/public declarations only.',
      'Actual original/minimum modules run with borrowed hostRxJS7.8.2 and controlled public status handlers;not Angular stabilization/native/full Node/RxJS environments.',
      'The non-before/after internal branch is source-inspected,not exercised by these public parallel callers. Owned actions/filtering/rendering and upstream SHA reviews remain separate.'], g11_claim: 'not-passed'};
}
