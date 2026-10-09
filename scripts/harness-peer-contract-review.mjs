/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Changed erased peer contracts and exact public key forwarding contexts. */
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
const moduleName = '@angular/cdk/testing', names = {HarnessLoader: 2, TestElement: 8, TestKey: 4};
const seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const originalHash = '28bb0aaeb86447b92b3da91a7e2f3a7049ad06530a7d208b5e865501776106c2';
const additions = ['getHarnessAtIndex', 'countHarnesses'];
const printer = ts.createPrinter({removeComments: true}), print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
const normalize = text => text.replace(/^(?:(?:export|declare) )+/, '');
function parse(path, text) {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;}
function exported(source, name) {return source.statements.some(node => node.name?.text === name && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
  || source.statements.some(node => ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.some(item => item.name.text === name));}
const stable = node => assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'docs-private', 'breaking-change', 'experimental'].includes(tag.tagName.text)), 'unstable peer contract');
export async function harnessPeerSubjects(root = defaultRoot) {
  const base = await loadHarnessSubjects(root), models = [];
  for (const model of base.models) {
    const sources = new Map(model.subject.members.map(member => [member.archive_member.replace(/^package\//, ''), gunzipSync(readFileSync(join(root, member.path))).toString()]));
    const declarations = [...sources].filter(([p]) => p.endsWith('.d.ts')).map(([p, text]) => parse(p, text)), entry = declarations.find(d => d.fileName === model.subject.public_types), contracts = {};
    let keyValues;
    for (const name of [...Object.keys(names), 'ModifierKeys', 'TextOptions', 'ElementDimensions', 'EventData']) {
      const owners = declarations.filter(d => d.statements.some(node => (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && node.name.text === name));
      assert.equal(owners.length, 1); const owner = owners[0], node = owner.statements.find(n => n.name?.text === name);
      stable(node); for (const member of node.members ?? []) {
        if (name === 'TestElement' && model.subject.line === 'original' && member.name.text === 'setContenteditableValue') {
          assert.deepEqual(ts.getJSDocTags(member).filter(t => ['deprecated', 'docs-private', 'breaking-change', 'experimental'].includes(t.tagName.text)).map(t => [t.tagName.text, t.comment]), [['breaking-change', '16.0.0 Will become a required method.']]);
        } else stable(member);
      }
      if (Object.hasOwn(names, name)) {
        assert.ok(exported(entry, name)); assert.ok(exported(owner, name));
        if (owner !== entry) {
          const forwards = entry.statements.filter(n => ts.isExportDeclaration(n) && n.moduleSpecifier && n.exportClause && ts.isNamedExports(n.exportClause) && n.exportClause.elements.some(item => item.name.text === name));
          assert.equal(forwards.length, 1); assert.equal(join(dirname(model.subject.public_types), forwards[0].moduleSpecifier.text.replace(/\.js$/, '.d.ts')), owner.fileName);
        }
      }
      let projected = node;
      if (name === 'HarnessLoader') {
        assert.deepEqual(node.members.filter(m => additions.includes(m.name.text)).map(m => m.name.text).sort(), model.subject.line === 'original' ? [] : [...additions].sort());
        projected = ts.factory.updateInterfaceDeclaration(node, undefined, node.name, node.typeParameters, node.heritageClauses, node.members.filter(m => !additions.includes(m.name.text)));
      }
      if (name === 'TestElement') {
        const editor = node.members.filter(m => m.name.text === 'setContenteditableValue'); assert.equal(editor.length, 1);
        assert.equal(!!editor[0].questionToken, model.subject.line === 'original');
        const members = node.members.map(m => m === editor[0] ? ts.factory.updateMethodSignature(m, m.modifiers, m.name, undefined, m.typeParameters, m.parameters, m.type) : m);
        projected = ts.factory.updateInterfaceDeclaration(node, undefined, node.name, node.typeParameters, node.heritageClauses, members);
      }
      contracts[name] = normalize(print(projected, owner));
      if (name === 'TestKey') {
        keyValues = Object.fromEntries(node.members.map(m => {assert.ok(ts.isNumericLiteral(m.initializer)); return [m.name.getText(owner), Number(m.initializer.text)];})); assert.equal(Object.keys(keyValues).length, 31);
      }
    }
    const runtimeSource = parse(model.subject.public_entry, sources.get(model.subject.public_entry)); assert.ok(exported(runtimeSource, 'TestKey'));
    const actual = model.runtime.TestKey; assert.equal(Object.keys(actual).length, 62);
    for (const [key, value] of Object.entries(keyValues)) {assert.equal(actual[key], value); assert.equal(actual[value], key);}
    const index = runtimeSource.statements.findIndex(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(runtimeSource) === 'TestKey'));
    assert.ok(index >= 0 && ts.isExpressionStatement(runtimeSource.statements[index + 1]));
    const keyInitialization = [runtimeSource.statements[index], runtimeSource.statements[index + 1]].map(n => print(n, runtimeSource)).join('\n');
    models.push({...model, sources, contracts, key_values: keyValues, key_initialization: keyInitialization,
      declaration_differences: {loader_added_required_methods: model.subject.line === 'original' ? [] : additions, contenteditable_required: model.subject.line !== 'original'}});
  }
  const original = models.find(m => m.subject.line === 'original');
  for (const model of models) {assert.deepEqual(model.contracts, original.contracts, 'peer contract changed outside enumerated differences'); assert.deepEqual(model.key_values, original.key_values); assert.equal(model.key_initialization, original.key_initialization, 'complete key initializer changed');}
  return {...base, models};
}
function execute(text, runtime) {
  const code = ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText, exports = {};
  new Function('require', 'exports', code)(specifier => {
    if (specifier === moduleName) return runtime;
    return new Proxy({}, {get() {assert.fail('dependency outside key forwarding context: ' + specifier);}});
  }, exports); return exports;
}
const contexts = [
  ['chip', 'legacy-chips/testing/chip-harness.ts', 'MatLegacyChipHarness', 'remove', 'DELETE'],
  ['input', 'legacy-chips/testing/chip-input-harness.ts', 'MatLegacyChipInputHarness', 'sendSeparatorKey', null],
  ['dialog', 'legacy-dialog/testing/dialog-harness-base.ts', '_MatDialogHarnessBase', 'close', 'ESCAPE'],
  ['menu', 'legacy-menu/testing/menu-harness-base.ts', '_MatMenuHarnessBase', 'close', 'ESCAPE'],
];
export async function keyForwardingContexts(root, models, readSource) {
  const bytes = readFileSync(join(root, 'compatibility/rc/harness-key-original-subjects.json')); assert.equal(hash(bytes), originalHash);
  const originals = new Map();
  for (const row of JSON.parse(bytes).sources) {const gzip = readFileSync(join(root, row.path)); assert.equal(hash(gzip), row.gzip_sha256); const raw = gunzipSync(gzip); assert.equal(hash(raw), row.sha256); assert.equal(raw.length, row.bytes); originals.set(row.kind, raw.toString());}
  const results = [];
  for (const model of models) for (const [kind, path, symbol, method, key] of contexts) {
    const current = readSource('projects/ngx-material-legacy/' + path), original = originals.get(kind), parsed = parse(path, current), oldParsed = parse(kind, original);
    const cls = parsed.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === symbol), old = oldParsed.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === symbol);
    assert.ok(cls && old); assert.equal(print(cls.members.find(m => m.name?.text === method), parsed), print(old.members.find(m => m.name?.text === method), oldParsed), 'owned key forwarding method differs from untouched tag');
    const observations = [];
    for (const text of [original, current]) {
      const Type = execute(text, model.runtime)[symbol], cases = [];
      const keys = key ? [model.key_values[key]] : [model.key_values.ENTER, ','];
      for (const value of keys) {
        let mode = 'ok', calls = [], release;
        const sentinel = new Error('key forwarding sentinel'), host = {getAttribute(name) {assert.equal(name, 'aria-controls'); return mode === 'closed' ? null : 'panel';}, sendKeys(...args) {
          assert.equal(this, host); assert.deepEqual(args, [value]); calls.push(args);
          if (mode === 'sync-error') throw sentinel;
          if (mode === 'async-error') return Promise.reject(sentinel);
          if (mode === 'pending') return new Promise(resolve => {release = resolve;});
          return Promise.resolve();
        }};
        const document = {locatorForOptional(selector) {assert.equal(selector, '#panel'); return async () => host;}};
        const factory = {get rootElement() {if (mode === 'host-error') throw sentinel; return host;}, documentRootLocatorFactory() {return document;}, locatorForOptional() {return async () => null;}};
        const instance = new Type(factory), invoke = () => key ? instance[method]() : instance[method](value);
        assert.equal(await invoke(), undefined); assert.equal(calls.length, 1); cases.push('exact-key-receiver-and-void:' + value);
        mode = 'pending'; let complete = false; const pending = invoke(); pending.then(() => {complete = true;}, () => {complete = true;});
        for (let i = 0; i < 12; i++) await Promise.resolve(); assert.ok(release); assert.equal(complete, false); release(); await pending; cases.push('await-key-completion:' + value);
        for (const failure of ['host-error', 'sync-error', 'async-error']) {mode = failure; await assert.rejects(invoke(), error => error === sentinel); cases.push(failure + ':' + value);}
        if (kind === 'menu') {mode = 'closed'; const before = calls.length; assert.equal(await invoke(), undefined); assert.equal(calls.length, before); cases.push('closed-menu-no-send');}
      }
      observations.push(cases);
    }
    assert.deepEqual(observations[0], observations[1]); results.push({line: model.subject.line, kind, original_source_sha256: hash(original), candidate_source_sha256: hash(current), cases: observations[1], native_execution: false});
  }
  return results;
}
export function compilePeerContracts(models, compilerRoot) {
  const compilerPath = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript'), compiler = require(compilerPath), results = [];
  for (const model of models) {
    const virtualRoot = join(defaultRoot, '__harness_peer_contracts__', model.subject.line), files = new Map();
    for (const [path, text] of model.sources) if (path.endsWith('.d.ts')) files.set(join(virtualRoot, 'package', path), text);
    const original = model.subject.line === 'original';
    const code = `import {HarnessLoader,TestElement,TestKey,ComponentHarness} from './package/${model.subject.public_types.replace(/\.d\.ts$/, '')}';
declare const loader:HarnessLoader;declare const element:TestElement;
class Owned extends ComponentHarness{static hostSelector='.owned';}
const child:Promise<HarnessLoader>=loader.getChildLoader('.child');const allChildren:Promise<HarnessLoader[]>=loader.getAllChildLoaders('.child');
const first:Promise<Owned>=loader.getHarness(Owned);const optional:Promise<Owned|null>=loader.getHarnessOrNull(Owned);
const all:Promise<Owned[]>=loader.getAllHarnesses(Owned);const has:Promise<boolean>=loader.hasHarness(Owned);
const click:Promise<void>=element.click('center',{shift:true});const keys:Promise<void>=element.sendKeys({control:true},'a',TestKey.ENTER);
const text:Promise<string>=element.text({exclude:'.skip'});const attr:Promise<string|null>=element.getAttribute('id');
const matches:Promise<boolean>=element.matchesSelector('.owned');const escaped:6=TestKey.ESCAPE;const removed:16=TestKey.DELETE;
declare const withoutEditor:Omit<TestElement,'setContenteditableValue'>;
${original ? '' : '// @ts-expect-error Current peer requires the editor method; historical optionality is not silently asserted.'}
const editorShape:TestElement=withoutEditor;
declare const withoutAdditions:Omit<HarnessLoader,'getHarnessAtIndex'|'countHarnesses'>;
${original ? '' : '// @ts-expect-error Current peer loader adds two required methods; owned code returns peer loaders rather than implementing this interface.'}
const loaderShape:HarnessLoader=withoutAdditions;
// @ts-expect-error Loader optional results retain null.
const lostNull:Promise<Owned>=loader.getHarnessOrNull(Owned);
// @ts-expect-error TestElement attribute results retain null.
const attrString:Promise<string>=element.getAttribute('id');
// @ts-expect-error Invalid click positions are rejected.
element.click('unknown');
// @ts-expect-error Element selectors are strings.
element.matchesSelector(1);
// @ts-expect-error Unenumerated numeric keys are rejected.
const invalidKey:TestKey=999;
`;
    const file = join(virtualRoot, 'consumer.ts'); files.set(file, code); const options = {target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext,
      moduleResolution: compiler.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']};
    const host = compiler.createCompilerHost(options), read = host.readFile.bind(host), exists = host.fileExists.bind(host);
    host.readFile = path => files.get(path) ?? read(path); host.fileExists = path => files.has(path) || exists(path);
    host.directoryExists = path => [...files.keys()].some(file => file.startsWith(path + '/')) || compiler.sys.directoryExists(path);
    const program = compiler.createProgram([file], options, host), diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => virtualRoot, getNewLine: () => '\n'}));
    results.push({line: model.subject.line, compiler: compiler.version, strict: true, skip_lib_check: false, negative_checks: original ? 5 : 7, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)), subjects: results, scope: 'Complete standalone testing declarations only;not Angular/native/floor qualification.'};
}
export async function reviewHarnessPeerContracts({root = defaultRoot, readSource, compilerRoot, subjects, skipDiagnostics = false} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), seedHash);
  const uses = JSON.parse(seed).symbol_uses.filter(u => u.module === moduleName && Object.hasOwn(names, u.symbol)); assert.equal(uses.length, 14);
  const {models, rxjs} = subjects ?? await harnessPeerSubjects(root), read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const authoredRoot = join(root, 'projects/ngx-material-legacy'), options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler}, host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host);
  host.readFile = path => path.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + path.slice(authoredRoot.length + 1)) : originalRead(path);
  const program = ts.createProgram([...new Set(uses.map(u => join(authoredRoot, u.file)))], options, host), checker = program.getTypeChecker(), cases = [];
  for (const use of uses) {
    const source = program.getSourceFile(join(authoredRoot, use.file)); assert.ok(source); assert.equal(source.parseDiagnostics.length, 0);
    const imports = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings))
      .flatMap(n => n.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === use.symbol));
    assert.equal(imports.length, 1, 'missing/ambiguous peer contract import'); const binding = imports[0], symbol = checker.getSymbolAtLocation(binding.name), references = []; assert.ok(symbol);
    function visit(node) {
      if ((ts.isPropertyAccessExpression(node) && [...additions, 'setContenteditableValue'].includes(node.name.text))
        || (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression) && [...additions, 'setContenteditableValue'].includes(node.argumentExpression.text))) assert.fail('new peer member requires separate review');
      if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName && checker.getSymbolAtLocation(node) === symbol) {
        const parent = node.parent; let kind, member = null;
        if (ts.isTypeReferenceNode(parent) && parent.typeName === node) {assert.equal(parent.typeArguments?.length ?? 0, 0); kind = 'erased-type';}
        else {
          assert.equal(use.symbol, 'TestKey', 'loader/element interface is implemented or used at runtime');
          assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly, 'key enum imported as type only');
          assert.ok(ts.isPropertyAccessExpression(parent) && parent.expression === node && ['ESCAPE', 'DELETE'].includes(parent.name.text), 'unreviewed key enum access'); member = parent.name.text; kind = 'key-member';
          assert.ok(ts.isCallExpression(parent.parent) && ts.isPropertyAccessExpression(parent.parent.expression) && parent.parent.expression.name.text === 'sendKeys'
            && parent.parent.arguments.length === 1 && parent.parent.arguments[0] === parent, 'key enum must be directly forwarded to sendKeys');
        }
        references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, kind, member, expression: parent.getText(source)});
      }
      ts.forEachChild(node, visit);
    }
    visit(source); assert.ok(references.length); cases.push({...use, local_name: binding.name.text, candidate_source_sha256: hash(source.text), references});
  }
  const population = cases.flatMap(c => c.references).reduce((out, r) => {out[r.kind] = (out[r.kind] ?? 0) + 1; return out;}, {});
  assert.deepEqual(population, {'erased-type': 21, 'key-member': 3});
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(manifest.peerDependencies['@angular/cdk'], '^' + models.find(m => m.subject.line === line).subject.version);
  return {schema_version: 1, line, node: process.version, typescript: ts.version, uses: 14, symbol_populations: names, population, cases, rxjs, source_override_used: !!readSource,
    key_contexts: skipDiagnostics ? [] : await keyForwardingContexts(root, models, read), type_compilation: skipDiagnostics ? null : compilePeerContracts(models, compilerRoot),
    subjects: models.map(({runtime, sources, key_initialization, contracts, ...model}) => ({...model, key_initialization_sha256: hash(key_initialization), contracts, contracts_sha256: hash(JSON.stringify(contracts))})),
    limits: ['Only imported public key values,actual forwarding methods and erased loader/element declaration boundaries are reviewed.',
      'Required peer members differ explicitly. No authored interface implementation or calls to the changed/new members are admitted;manual external TypeScript doubles may require those members.',
      'Native keyboard dispatch,public HarnessEnvironment/TestElement implementations,other owned harness actions,full Angular/Node/RxJS/floors and upstream SHA reviews remain separate.'], g11_claim: 'not-passed'};
}
