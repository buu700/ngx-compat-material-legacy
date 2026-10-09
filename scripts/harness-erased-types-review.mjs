/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Three stable erased testing contracts and six removed deprecated factory aliases. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {loadHarnessSubjects} from './component-harness-boundary-review.mjs';
const require = createRequire(import.meta.url), ts = require('typescript'), defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const names = {BaseHarnessFilters: 14, AsyncFactoryFn: 6, ComponentHarnessConstructor: 12, HarnessQuery: 1};
const moduleName = '@angular/cdk/testing', seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const printer = ts.createPrinter({removeComments: true}), print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
function parse(path, text) {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;}
function exported(source, name) {return source.statements.some(node => node.name?.text === name && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
  || source.statements.some(node => ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.some(item => item.name.text === name));}
export async function harnessTypeSubjects(root = defaultRoot) {
  const base = await loadHarnessSubjects(root), models = [];
  for (const model of base.models) {
    const sources = new Map(model.subject.members.map(member => [member.archive_member.replace(/^package\//, ''), gunzipSync(readFileSync(join(root, member.path))).toString()]));
    const declarations = [...sources].filter(([path]) => path.endsWith('.d.ts')).map(([path, text]) => parse(path, text)), entry = declarations.find(d => d.fileName === model.subject.public_types), contracts = {}, annotations = {};
    for (const name of Object.keys(names)) {
      assert.ok(exported(entry, name), 'missing public erased type export');
      const owners = declarations.filter(d => d.statements.some(node => (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name.text === name));
      assert.equal(owners.length, 1); const owner = owners[0], node = owner.statements.find(n => n.name?.text === name); assert.ok(exported(owner, name));
      if (owner !== entry) {
        const forwards = entry.statements.filter(node => ts.isExportDeclaration(node) && node.moduleSpecifier && node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.some(item => item.name.text === name));
        assert.equal(forwards.length, 1); assert.equal(join(dirname(model.subject.public_types), forwards[0].moduleSpecifier.text.replace(/\.js$/, '.d.ts')), owner.fileName);
      }
      annotations[name] = ts.getJSDocTags(node).map(tag => ({tag: tag.tagName.text, comment: tag.comment ?? null}));
      for (const part of [node, ...(node.members ?? [])]) {
        const unstable = ts.getJSDocTags(part).filter(tag => ['deprecated', 'docs-private', 'breaking-change', 'experimental'].includes(tag.tagName.text));
        if (name === 'AsyncFactoryFn' && model.subject.line !== 'original') {
          assert.deepEqual(unstable.map(tag => tag.tagName.text), ['deprecated', 'breaking-change', 'docs-private']);
        } else assert.equal(unstable.length, 0, 'unstable retained erased type declaration');
      }
      contracts[name] = print(node, owner).replace(/^(?:(?:export|declare) )+/, '');
    }
    assert.equal(contracts.AsyncFactoryFn, 'type AsyncFactoryFn<T> = () => Promise<T>;');
    models.push({...model, sources, contracts, annotations});
  }
  const original = models.find(m => m.subject.line === 'original'); for (const model of models) assert.deepEqual(model.contracts, original.contracts, 'erased testing declaration changed');
  return {...base, models};
}
export function compileHarnessTypeContracts(models, compilerRoot) {
  const compilerPath = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript'), compiler = require(compilerPath), results = [];
  for (const model of models) {
    const virtualRoot = join(defaultRoot, '__harness_erased_types__', model.subject.line), files = new Map();
    for (const [path, text] of model.sources) if (path.endsWith('.d.ts')) files.set(join(virtualRoot, 'package', path), text);
    const code = `import {ComponentHarness,BaseHarnessFilters,ComponentHarnessConstructor,HarnessQuery,HarnessPredicate,TestElement,LocatorFactory} from './package/${model.subject.public_types.replace(/\.d\.ts$/, '')}';
${model.subject.line === 'original' ? `import {AsyncFactoryFn} from './package/${model.subject.public_types.replace(/\.d\.ts$/, '')}';\ntype ReviewedFactory<T>=AsyncFactoryFn<T>;` : 'type ReviewedFactory<T>=()=>Promise<T>;'}
interface OwnedFilters extends BaseHarnessFilters {label?:string|RegExp;}
const absent:OwnedFilters={};const filters:OwnedFilters={ancestor:'.a',selector:'.b',label:/x/};
class Owned extends ComponentHarness {static hostSelector='.owned';}
declare const factory:LocatorFactory;const ctor:ComponentHarnessConstructor<Owned>=Owned;const h:Owned=new ctor(factory);
const constructorQuery:HarnessQuery<Owned>=Owned;const predicateQuery:HarnessQuery<Owned>=new HarnessPredicate(Owned,filters);
declare const base:ReviewedFactory<TestElement|null>;declare const expanded:()=>Promise<TestElement|null>;
const forwards:()=>Promise<TestElement|null>=base;const backwards:ReviewedFactory<TestElement|null>=expanded;
// @ts-expect-error Base filter selectors are strings.
const wrongSelector:BaseHarnessFilters={selector:1};
// @ts-expect-error Base filter ancestors are strings.
const wrongAncestor:BaseHarnessFilters={ancestor:false};
// @ts-expect-error A harness constructor requires its static host selector.
const missingSelector:ComponentHarnessConstructor<Owned>=class {};
// @ts-expect-error A factory cannot require parameters.
const required:ReviewedFactory<TestElement>=(x:number)=>Promise.resolve(null as unknown as TestElement);
// @ts-expect-error A factory resolves through Promise,not a synchronous value.
const synchronous:ReviewedFactory<number>=()=>1;
// @ts-expect-error The optional element result retains null.
const nonnullable:ReviewedFactory<TestElement>=expanded;
// @ts-expect-error Arbitrary objects are not public harness queries.
const arbitrary:HarnessQuery<Owned>={arbitrary:true};
`;
    const file = join(virtualRoot, 'consumer.ts'); files.set(file, code);
    const options = {target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
      strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']};
    const host = compiler.createCompilerHost(options), read = host.readFile.bind(host), exists = host.fileExists.bind(host);
    host.readFile = path => files.get(path) ?? read(path); host.fileExists = path => files.has(path) || exists(path);
    host.directoryExists = path => [...files.keys()].some(file => file.startsWith(path + '/')) || compiler.sys.directoryExists(path);
    const program = compiler.createProgram([file], options, host), diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => virtualRoot, getNewLine: () => '\n'}));
    results.push({line: model.subject.line, compiler: compiler.version, strict: true, skip_lib_check: false, negative_checks: 7, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)), subjects: results, scope: 'Complete standalone testing declarations only;no Angular/native/floor build.'};
}
export async function reviewHarnessErasedTypes({root = defaultRoot, readSource, compilerRoot, subjects, skipDiagnostics = false} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), seedHash);
  const uses = JSON.parse(seed).symbol_uses.filter(use => use.module === moduleName && Object.hasOwn(names, use.symbol)); assert.equal(uses.length, 33);
  for (const [name, count] of Object.entries(names)) assert.equal(uses.filter(u => u.symbol === name).length, count);
  const {models} = subjects ?? await harnessTypeSubjects(root), read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const authoredRoot = join(root, 'projects/ngx-material-legacy'), options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler};
  const host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host);
  host.readFile = path => path.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + path.slice(authoredRoot.length + 1)) : originalRead(path);
  const program = ts.createProgram([...new Set(uses.map(use => join(authoredRoot, use.file)))], options, host), checker = program.getTypeChecker(), cases = [];
  for (const use of uses) {
    const source = program.getSourceFile(join(authoredRoot, use.file)); assert.ok(source); assert.equal(source.parseDiagnostics.length, 0);
    const imports = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === moduleName && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings))
      .flatMap(node => node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === use.symbol));
    if (use.symbol === 'AsyncFactoryFn') {
      assert.equal(imports.length, 0, 'removed AsyncFactoryFn import reintroduced'); const members = [];
      function visit(node) {
        assert.ok(!(ts.isIdentifier(node) && node.text === 'AsyncFactoryFn'), 'removed AsyncFactoryFn reference reintroduced');
        if (ts.isPropertyDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.AbstractKeyword) && node.modifiers.some(m => m.kind === ts.SyntaxKind.ProtectedKeyword)
          && ts.isFunctionTypeNode(node.type)) {
          assert.equal(node.type.parameters.length, 0, 'expanded factory requires no parameters');
          assert.ok(ts.isTypeReferenceNode(node.type.type) && node.type.type.typeName.getText(source) === 'Promise' && node.type.type.typeArguments?.length === 1, 'expanded factory must return Promise<T>');
          members.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, name: node.name.getText(source), type: print(node.type, source), result_type: print(node.type.type.typeArguments[0], source)});
        }
        ts.forEachChild(node, visit);
      }
      visit(source); assert.ok(members.length); cases.push({...use, candidate_source_sha256: hash(source.text), conclusion: 'removed-use', expanded_factory_members: members}); continue;
    }
    assert.equal(imports.length, 1, 'missing/ambiguous erased type import'); const binding = imports[0], symbol = checker.getSymbolAtLocation(binding.name), references = []; assert.ok(symbol);
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName && checker.getSymbolAtLocation(node) === symbol) {
        const parent = node.parent; let kind;
        if (ts.isTypeReferenceNode(parent) && parent.typeName === node) kind = 'erased-type-reference';
        else {assert.ok(ts.isExpressionWithTypeArguments(parent) && parent.expression === node && ts.isHeritageClause(parent.parent)
          && ts.isInterfaceDeclaration(parent.parent.parent), 'testing type used outside erased interface/type position'); kind = 'erased-interface-inheritance';}
        assert.equal(parent.typeArguments?.length ?? 0, use.symbol === 'BaseHarnessFilters' ? 0 : 1, 'erased type generic arity changed');
        references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, kind, expression: parent.getText(source)});
      }
      ts.forEachChild(node, visit);
    }
    visit(source); assert.ok(references.length); cases.push({...use, local_name: binding.name.text, candidate_source_sha256: hash(source.text), conclusion: 'stable-public-peer', references});
  }
  const members = cases.flatMap(row => row.expanded_factory_members ?? []); assert.equal(members.length, 21, 'expanded factory member population changed');
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(manifest.peerDependencies['@angular/cdk'], '^' + models.find(model => model.subject.line === line).subject.version);
  return {schema_version: 1, line, node: process.version, typescript: ts.version, uses: 33, symbol_populations: names,
    files: new Set(cases.map(row => row.file)).size, cases, expanded_factory_members: 21, source_override_used: !!readSource,
    type_compilation: skipDiagnostics ? null : compileHarnessTypeContracts(models, compilerRoot),
    subjects: models.map(({runtime, sources, ...model}) => model),
    limits: ['Twenty-seven exact retained erased imports and six removed factory-alias imports only;21current explicit factory declarations checked against the independently authenticated alias shape.',
      'Historical whole owned class/member signature,callback/runtime/native behavior,loader/TestElement declaration differences and full Angular/Node/RxJS/floor builds remain separate.'], g11_claim: 'not-passed'};
}
