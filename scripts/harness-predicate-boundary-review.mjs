/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact public predicate dependency boundary; no native harness environment. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parallelSubjects} from './harness-parallel-boundary-review.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const moduleName = '@angular/cdk/testing', symbolName = 'HarnessPredicate';
const methods = ['stringMatches', 'add', 'addOption', 'filter', 'evaluate', 'getDescription', 'getSelector'];
const helpers = ['_valueAsString', '_splitAndEscapeSelector', '_restoreSelector'];
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
function parse(path, text) {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;}
function tokens(text) {
  const wrapped = /^(function |(?:declare )?type )/.test(text) ? text
    : text.startsWith('this.') ? `function initialization() {${text}}` : `class Boundary {${text}}`;
  const source = parse('contract.ts', wrapped), out = [];
  function visit(node) {
    const children = node.getChildren(source);
    if (children.length) children.forEach(visit);
    else if (node.kind !== ts.SyntaxKind.EndOfFileToken) out.push([node.kind, node.getText(source)]);
  }
  visit(source);
  return out.filter((token, index) => !(token[0] === ts.SyntaxKind.CommaToken
    && [ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.CloseBracketToken, ts.SyntaxKind.CloseParenToken].includes(out[index + 1]?.[0])));
}

function exported(source, name) {
  return source.statements.some(node => node.name?.text === name && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
    || source.statements.some(node => ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)
      && node.exportClause.elements.some(item => item.name.text === name));
}
function unique(nodes, name, predicate) {const rows = nodes.filter(node => predicate(node) && node.name?.text === name); assert.equal(rows.length, 1, name); return rows[0];}
export async function predicateSubjects(root = defaultRoot) {
  const base = await parallelSubjects(root), models = [];
  for (const model of base.models) {
    const source = parse(model.subject.public_entry, model.sources.get(model.subject.public_entry));
    assert.ok(exported(source, symbolName));
    const cls = unique(source.statements, symbolName, ts.isClassDeclaration), bodies = {};
    for (const name of methods) bodies[name] = tokens(print(unique(cls.members, name, ts.isMethodDeclaration), source));
    for (const name of helpers) bodies[name] = tokens(print(unique(source.statements, name, ts.isFunctionDeclaration), source));
    const constructors = cls.members.filter(ts.isConstructorDeclaration); assert.equal(constructors.length, 1);
    const ctor = constructors[0], original = model.subject.line === 'original';
    assert.deepEqual(ctor.parameters.map(p => p.name.text), ['harnessType', 'options']);
    const fields = cls.members.filter(ts.isPropertyDeclaration);
    assert.deepEqual(fields.map(p => p.name.text), original ? [] : ['harnessType', '_predicates', '_descriptions', '_ancestor']);
    if (!original) {
      assert.equal(fields[0].initializer, undefined); assert.equal(fields[3].initializer, undefined);
      assert.equal(print(fields[1].initializer, source), '[]'); assert.equal(print(fields[2].initializer, source), '[]');
    }
    // Compare complete constructor statements after the explicitly inspected field initialization
    // relocation and one historical private helper inline. Do not claim arbitrary JS interposition.
    const statements = ctor.body.statements.map(node => print(node, source));
    let initialization;
    if (original) {
      assert.equal(statements.length, 4);
      assert.deepEqual(statements.slice(0, 3), ['this.harnessType = harnessType;', 'this._predicates = [];', 'this._descriptions = [];']);
      assert.equal(statements[3], 'this._addBaseOptions(options);');
      const helper = unique(cls.members, '_addBaseOptions', ts.isMethodDeclaration);
      assert.deepEqual(helper.parameters.map(p => p.name.text), ['options']);
      initialization = [statements[0], ...helper.body.statements.map(node => print(node, source))];
    } else initialization = statements;
    bodies.initialization = tokens(initialization.join('\n'));
    assert.equal(cls.members.length, methods.length + 1 + fields.length + (original ? 1 : 0));
    const declarationSources = [...model.sources].filter(([path]) => path.endsWith('.d.ts')).map(([path, text]) => parse(path, text));
    const rootTypes = declarationSources.find(s => s.fileName === model.subject.public_types); assert.ok(exported(rootTypes, symbolName));
    const owners = declarationSources.filter(s => s.statements.some(node => ts.isClassDeclaration(node) && node.name?.text === symbolName));
    assert.equal(owners.length, 1); const owner = owners[0], declaration = unique(owner.statements, symbolName, ts.isClassDeclaration);
    assert.ok(exported(owner, symbolName));
    if (owner !== rootTypes) {
      const forwarding = rootTypes.statements.filter(node => ts.isExportDeclaration(node) && node.moduleSpecifier
        && node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.some(item => item.name.text === symbolName));
      assert.equal(forwarding.length, 1);
      assert.equal(join(dirname(model.subject.public_types), forwarding[0].moduleSpecifier.text.replace(/\.js$/, '.d.ts')), owner.fileName);
    }
    assert.equal(declaration.typeParameters?.length, 1); assert.equal(print(declaration.typeParameters[0], owner), 'T extends ComponentHarness');
    assert.equal(declaration.heritageClauses, undefined);
    for (const node of [declaration, ...declaration.members]) assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'docs-private', 'breaking-change', 'experimental'].includes(tag.tagName.text)));
    const publicMembers = declaration.members.filter(node => !node.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword));
    assert.deepEqual(publicMembers.map(n => ts.isConstructorDeclaration(n) ? 'constructor' : n.name.text), ['harnessType', 'constructor', ...methods]);
    const declarations = publicMembers.map(node => tokens(print(node, owner)));
    const aliases = {};
    for (const name of ['AsyncPredicate', 'AsyncOptionPredicate']) aliases[name] = tokens(print(unique(owner.statements, name, ts.isTypeAliasDeclaration), owner).replace(/^(?:(?:export|declare) )+/, ''));
    models.push({...model, predicate_contract: {bodies, declarations, aliases}, initialization_scope: original
      ? 'Historical assignment initialization plus private base-options call.'
      : 'Four emitted data fields; two array initializers relocated before constructor body; private base-options helper inlined. No authored subclass, field redeclaration or private access admitted.'});
  }
  const original = models.find(model => model.subject.line === 'original');
  for (const model of models) assert.deepEqual(model.predicate_contract, original.predicate_contract, 'predicate source/public contract changed outside reviewed initialization relocation');
  return {...base, models};
}
const ticks = async () => {for (let i = 0; i < 12; i++) await Promise.resolve();};
const deferred = () => {let resolve, reject; const promise = new Promise((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject};};
export async function exerciseHarnessPredicate(runtime, Predicate = runtime.HarnessPredicate) {
  runtime.stopHandlingAutoChangeDetectionStatus();
  const cases = [], sentinel = new Error('predicate sentinel'), item = {id: 1};
  class Harness extends runtime.ComponentHarness {static hostSelector = ' .a, [title="b,c"] ';}
  const optionsReads = [], opts = {get ancestor() {optionsReads.push('ancestor'); return '.parent, [data-x="y,z"]';}, get selector() {optionsReads.push('selector'); return '[role="item"]';}};
  const predicate = new Predicate(Harness, opts); assert.equal(predicate.harnessType, Harness);
  assert.deepEqual(optionsReads, ['ancestor', 'selector']);
  assert.equal(predicate.getDescription(), 'has ancestor matching selector ".parent, [data-x="y,z"]", host matches selector "[role="item"]"');
  assert.equal(predicate.getSelector(), '.parent .a, .parent [title="b,c"], [data-x="y,z"] .a, [data-x="y,z"] [title="b,c"]'); cases.push('constructor-options-order-description-selector');
  const host = {matchesSelector(selector) {assert.equal(this, host); assert.equal(selector, '[role="item"]'); return true;}};
  const candidate = {async host() {assert.equal(this, candidate); return host;}};
  assert.equal(await predicate.evaluate(candidate), true); host.matchesSelector = () => false; assert.equal(await predicate.evaluate(candidate), false); cases.push('base-selector-host-receiver-result');
  candidate.host = () => Promise.reject(sentinel); await assert.rejects(predicate.evaluate(candidate), e => e === sentinel);
  candidate.host = async () => ({matchesSelector() {throw sentinel;}}); await assert.rejects(predicate.evaluate(candidate), e => e === sentinel); cases.push('base-host-and-selector-errors');
  const noAncestor = new Predicate(Harness, {ancestor: ''}); assert.equal(noAncestor.getSelector(), '.a, [title="b,c"]');
  const other = class extends Harness {static hostSelector = ' .changed ';}; noAncestor.harnessType = other; assert.equal(noAncestor.getSelector(), '.changed');
  const emptyHost = class extends Harness {static hostSelector = '';}; assert.equal(new Predicate(emptyHost, {}).getSelector(), ''); cases.push('host-selector-trim-current-type-empty');
  const quotes = class extends Harness {static hostSelector = `[a='x,y'], [b="q,r"]`;};
  assert.equal(new Predicate(quotes, {ancestor: `[c='m,n'], .p`}).getSelector(), `[c='m,n'] [a='x,y'], [c='m,n'] [b="q,r"], .p [a='x,y'], .p [b="q,r"]`); cases.push('single-double-quoted-compound-selector');
  for (const [value, pattern, expected] of [[null, null, true], ['a', null, false], [null, /a/, false], ['abc', 'abc', true], ['abc', 'ab', false], [Promise.resolve('abc'), /b/, true]]) assert.equal(await Predicate.stringMatches(value, pattern), expected);
  const regex = /a/g; assert.equal(await Predicate.stringMatches('a', regex), true); assert.equal(regex.lastIndex, 1); assert.equal(await Predicate.stringMatches('a', regex), false); assert.equal(regex.lastIndex, 0);
  await assert.rejects(Predicate.stringMatches(Promise.reject(sentinel), 'a'), e => e === sentinel); cases.push('nullable-exact-regex-await-state-error');
  const empty = new Predicate(Harness, {}); assert.equal(empty.getDescription(), ''); assert.equal(await empty.evaluate(item), true); assert.deepEqual(await empty.filter([]), []); cases.push('empty-predicates-and-input');
  let absentCalls = 0; assert.equal(empty.addOption('absent', undefined, async () => {absentCalls++; return false;}), empty); assert.equal(await empty.evaluate(item), true); assert.equal(absentCalls, 0); assert.equal(empty.getDescription(), ''); cases.push('undefined-option-skipped');
  const values = [false, 0, '', null, /a"b/i, {nested: /a/}, 1n]; const circular = {}; circular.self = circular; values.push(circular);
  const descriptions = ['false', '0', '""', 'null', '/a"b/i', '{"nested":/a/}', '{...}', '{...}'];
  for (let i = 0; i < values.length; i++) {
    const p = new Predicate(Harness, {}); let calls = 0;
    assert.equal(p.addOption('value', values[i], async (seen, option) => {assert.equal(seen, item); assert.equal(option, values[i]); calls++; return true;}), p);
    assert.equal(p.getDescription(), 'value = ' + descriptions[i]); assert.equal(await p.evaluate(item), true); assert.equal(calls, 1);
  } cases.push('falsy-null-regex-nested-circular-bigint-options');
  const ordered = new Predicate(Harness, {}), starts = [], a = deferred(), b = deferred();
  ordered.add('first', seen => {assert.equal(seen, item); starts.push('first'); return a.promise;});
  ordered.add('second', seen => {assert.equal(seen, item); starts.push('second'); return b.promise;});
  assert.equal(ordered.getDescription(), 'first, second'); let done = false; const evaluation = ordered.evaluate(item); evaluation.then(() => {done = true;}, () => {done = true;});
  await ticks(); assert.deepEqual(starts, ['first', 'second']); b.resolve(false); await ticks(); assert.equal(done, false); a.resolve(true); assert.equal(await evaluation, false); cases.push('evaluate-concurrent-no-short-circuit-and');
  for (const asyncError of [false, true]) {const p = new Predicate(Harness, {}).add('error', () => {if (asyncError) return Promise.reject(sentinel); throw sentinel;}); await assert.rejects(p.evaluate(item), e => e === sentinel);} cases.push('predicate-sync-async-errors');
  const inputs = [{id: 1}, {id: 2}, {id: 3}], gates = inputs.map(() => deferred()), started = [], filtered = new Predicate(Harness, {});
  filtered.add('gate', seen => {const index = inputs.indexOf(seen); started.push(index); return gates[index].promise;});
  let filterDone = false; const filtering = filtered.filter(inputs); filtering.then(() => {filterDone = true;}, () => {filterDone = true;});
  await ticks(); assert.deepEqual(started, [0, 1, 2]); gates[2].resolve(true); gates[1].resolve(false); await ticks(); assert.equal(filterDone, false); gates[0].resolve(true);
  const result = await filtering; assert.equal(result.length, 2); assert.equal(result[0], inputs[0]); assert.equal(result[1], inputs[2]); assert.notEqual(result, inputs); assert.deepEqual(inputs.map(x => x.id), [1, 2, 3]); cases.push('filter-concurrent-order-identity-no-input-mutation');
  await assert.rejects(new Predicate(Harness, {}).add('error', () => Promise.reject(sentinel)).filter(inputs), e => e === sentinel); cases.push('filter-error-identity');
  const statuses = []; runtime.handleAutoChangeDetectionStatus(status => {statuses.push(status.isDisabled); status.onDetectChangesNow?.();});
  try {assert.equal(await new Predicate(Harness, {}).add('true', async () => true).evaluate(item), true); assert.deepEqual(statuses, [false, true, false]);} finally {runtime.stopHandlingAutoChangeDetectionStatus();} cases.push('evaluate-public-batching-lifecycle');
  return {cases, native_environment: false};
}
export function compilePredicateTypes(models, compilerRoot) {
  const compilerPath = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript'), compiler = require(compilerPath), results = [];
  for (const model of models) {
    const virtualRoot = join(defaultRoot, '__predicate_type_diagnostic__', model.subject.line), files = new Map();
    for (const [path, text] of model.sources) if (path.endsWith('.d.ts')) files.set(join(virtualRoot, 'package', path), text);
    const code = `import {ComponentHarness,HarnessPredicate,LocatorFactory} from './package/${model.subject.public_types.replace(/\.d\.ts$/, '')}';
class Owned extends ComponentHarness {static hostSelector='.owned'; label():Promise<string>{return Promise.resolve('x');}}
declare const factory:LocatorFactory;
const owned=new Owned(factory);
const p:HarnessPredicate<Owned>=new HarnessPredicate(Owned,{ancestor:'.a',selector:'.b'});
const chained:HarnessPredicate<Owned>=p.add('label',async h=>(await h.label())==='x').addOption('value',/x/,async(h,v)=>HarnessPredicate.stringMatches(h.label(),v));
const result:Promise<boolean>=p.evaluate(owned);
const filtered:Promise<Owned[]>=p.filter([owned]);
const description:string=p.getDescription();const selector:string=p.getSelector();p.harnessType=Owned;
const match:Promise<boolean>=HarnessPredicate.stringMatches(Promise.resolve(null),null);
// @ts-expect-error Constructor requires options.
new HarnessPredicate(Owned);
// @ts-expect-error Options require string selectors.
new HarnessPredicate(Owned,{selector:1});
// @ts-expect-error Private predicate storage is not a public surface.
p._predicates;
// @ts-expect-error Static string matching does not accept numbers.
HarnessPredicate.stringMatches(1,'x');
// @ts-expect-error Predicates return promises of booleans.
p.add('sync',h=>true);
// @ts-expect-error The option callback preserves inferred option type.
p.addOption('number',1,async(h,v:string)=>true);
// @ts-expect-error Filter returns an array,not a single harness.
const single:Promise<Owned>=p.filter([owned]);
// @ts-expect-error Current emitted data fields cannot be overridden with an accessor.
class UnsupportedAccessor extends HarnessPredicate<Owned>{get harnessType(){return Owned;}set harnessType(value:typeof Owned){}}
`;
    const file = join(virtualRoot, 'consumer.ts'); files.set(file, code);
    const options = {target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
      strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']};
    const host = compiler.createCompilerHost(options), read = host.readFile.bind(host), exists = host.fileExists.bind(host);
    host.readFile = path => files.get(path) ?? read(path); host.fileExists = path => files.has(path) || exists(path);
    host.directoryExists = path => [...files.keys()].some(file => file.startsWith(path + '/')) || compiler.sys.directoryExists(path);
    const program = compiler.createProgram([file], options, host), diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => virtualRoot, getNewLine: () => '\n'}));
    results.push({line: model.subject.line, compiler: compiler.version, strict: true, skip_lib_check: false, negative_checks: 8, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)), subjects: results, scope: 'Complete testing declarations only;no full Angular/floor build.'};
}
export async function reviewHarnessPredicate({root = defaultRoot, readSource, compilerRoot, subjects, skipDiagnostics = false} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), seedHash);
  const uses = JSON.parse(seed).symbol_uses.filter(use => use.module === moduleName && use.symbol === symbolName); assert.equal(uses.length, 49);
  const {models, rxjs} = subjects ?? await predicateSubjects(root), read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const authoredRoot = join(root, 'projects/ngx-material-legacy'), options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler};
  const host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host);
  host.readFile = path => path.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + path.slice(authoredRoot.length + 1)) : originalRead(path);
  const program = ts.createProgram(uses.map(use => join(authoredRoot, use.file)), options, host), checker = program.getTypeChecker(), cases = [];
  for (const use of uses) {
    const source = program.getSourceFile(join(authoredRoot, use.file)); assert.ok(source); assert.equal(source.parseDiagnostics.length, 0);
    const imports = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === moduleName && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings))
      .flatMap(node => node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === symbolName));
    assert.equal(imports.length, 1, 'missing/ambiguous HarnessPredicate import');
    const binding = imports[0], symbol = checker.getSymbolAtLocation(binding.name), references = []; assert.ok(symbol);
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName && checker.getSymbolAtLocation(node) === symbol) {
        const parent = node.parent; let kind;
        if (ts.isTypeReferenceNode(parent) && parent.typeName === node) {assert.equal(parent.typeArguments?.length, 1); kind = 'erased-type';}
        else {
          assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly, 'predicate runtime imported as type only');
          if (ts.isNewExpression(parent) && parent.expression === node) {
            assert.equal(parent.arguments?.length, 2, 'predicate requires reviewed constructor and options');
            let expression = parent;
            while (ts.isParenthesizedExpression(expression.parent) || ts.isPropertyAccessExpression(expression.parent) && expression.parent.expression === expression) {
              if (ts.isParenthesizedExpression(expression.parent)) {expression = expression.parent; continue;}
              const member = expression.parent, call = member.parent; assert.ok(['add', 'addOption'].includes(member.name.text), 'unreviewed predicate chain member');
              assert.ok(ts.isCallExpression(call) && call.expression === member, 'unreviewed predicate method alias');
              assert.equal(call.arguments.length, member.name.text === 'add' ? 2 : 3, 'unreviewed predicate chain arguments'); expression = call;
            }
            assert.ok(ts.isReturnStatement(expression.parent), 'predicate instance escapes reviewed factory return');
            kind = 'direct-factory-construction';
          } else {
            assert.ok(ts.isPropertyAccessExpression(parent) && parent.expression === node && parent.name.text === 'stringMatches', 'unreviewed predicate runtime reference');
            assert.ok(ts.isCallExpression(parent.parent) && parent.parent.expression === parent && parent.parent.arguments.length === 2, 'unreviewed static matcher alias/arguments'); kind = 'static-string-matcher';
          }
        }
        references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, kind, expression: parent.getText(source)});
      }
      ts.forEachChild(node, visit);
    }
    visit(source); assert.ok(references.length); cases.push({...use, local_name: binding.name.text, candidate_source_sha256: hash(source.text), references});
  }
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(manifest.peerDependencies['@angular/cdk'], '^' + models.find(model => model.subject.line === line).subject.version);
  const population = cases.flatMap(row => row.references).reduce((out, row) => {out[row.kind] = (out[row.kind] ?? 0) + 1; return out;}, {});
  assert.deepEqual(population, {'erased-type': 63, 'direct-factory-construction': 45, 'static-string-matcher': 25});
  const behaviors = []; if (!skipDiagnostics) for (const model of models) behaviors.push({line: model.subject.line, ...await exerciseHarnessPredicate(model.runtime)});
  const summarizedModels = models.map(({runtime, sources, predicate_contract, batching_bodies, batching_state, public_declarations, ...model}) => ({...model,
    predicate_contract_sha256: hash(JSON.stringify(predicate_contract)), batching_closure_sha256: hash(JSON.stringify({batching_bodies, batching_state, public_declarations}))}));
  return {schema_version: 1, line, node: process.version, typescript: ts.version, uses: 49, files: 49, population, cases, behaviors, rxjs,
    type_compilation: skipDiagnostics ? null : compilePredicateTypes(models, compilerRoot), subjects: summarizedModels, source_override_used: !!readSource,
    limits: ['Exact public imported predicate boundary only;owned callback semantics/action/native rendering/upstream SHA reviews remain separate.',
      'Actual complete original/minimum testing modules with hostRxJS7.8.2 and protocol doubles;not Angular stabilization or full Node/RxJS/floor environment.',
      'Field relocation/private-helper inline compared within ordinary direct construction;no arbitrary JS subclass/accessor/private-method interposition equivalence.'], g11_claim: 'not-passed'};
}
