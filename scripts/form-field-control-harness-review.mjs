/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** The empty public marker base, two owned import roles and one retained public alias. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SourceTextModule, SyntheticModule} from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {inputHarnessPublicSubjects} from './input-harness-public-subjects.mjs';
import {exerciseHarnessBase} from './component-harness-boundary-review.mjs';
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url), ts = require('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const moduleName = '@angular/material/form-field/testing/control', symbolName = 'MatFormFieldControlHarness';
const selectFile = 'legacy-select/testing/select-harness-base.ts', formFile = 'legacy-form-field/testing/form-field-harness-base.ts', apiFile = 'legacy-form-field/testing/public-api.ts';
const printer = ts.createPrinter({removeComments: true});
const parse = (path, text) => {const s = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(s.parseDiagnostics.length, 0); return s;};
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();

function historicalPublicAlias(root) {
  const bytes = readFileSync(join(root, 'compatibility/rc/harness-filter-reexport-subjects.json'));
  assert.equal(hash(bytes), '6e7205b69715544f50b1bc50f6d567922437d0d3490555810d017a387b32f290');
  const subject = JSON.parse(bytes).subjects.find(s => s.line === 'original');
  const member = subject.members.find(m => m.archive_member === 'package/legacy-form-field/testing/index.d.ts');
  assert.ok(member); const compressed = readFileSync(join(root, member.path)); assert.equal(hash(compressed), member.gzip_sha256);
  const raw = gunzipSync(compressed); assert.equal(hash(raw), member.sha256); assert.equal(raw.length, member.bytes);
  const source = parse(member.archive_member, raw.toString());
  const bindings = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName)
    .flatMap(n => n.importClause?.namedBindings?.elements ?? []).filter(n => n.propertyName?.text === symbolName);
  assert.equal(bindings.length, 1); assert.equal(bindings[0].name.text, 'MatLegacyFormFieldControlHarness');
  assert.ok(source.statements.some(n => ts.isExportDeclaration(n) && n.exportClause?.elements?.some(e => e.name.text === bindings[0].name.text)));
  return {archive_member: member.archive_member, source_sha256: member.sha256, alias: bindings[0].name.text, module: moduleName};
}

export function inspectControlMarker(model, {runtimeSource, typeSource} = {}) {
  const find = extension => {
    const found = [];
    for (const [path, text] of model.sources) if (path.startsWith('@angular/material/') && path.endsWith(extension)) {
      const source = parse(path, extension === '.mjs' ? runtimeSource ?? text : typeSource ?? text);
      const node = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === symbolName);
      if (node) found.push({path, source, node});
    }
    assert.equal(found.length, 1, 'missing or ambiguous marker declaration'); return found[0];
  };
  const runtime = find('.mjs'), types = find('.d.ts');
  for (const {node, source} of [runtime, types]) {
    assert.equal(node.members.length, 0, 'marker acquired owned state or behavior');
    assert.equal(node.heritageClauses?.length, 1);
    assert.equal(node.heritageClauses[0].token, ts.SyntaxKind.ExtendsKeyword);
    assert.equal(node.heritageClauses[0].types[0].getText(source), 'ComponentHarness');
    assert.ok(!ts.getJSDocTags(node).some(t => ['deprecated', 'docs-private', 'breaking-change', 'experimental'].includes(t.tagName.text)));
    assert.ok(source.statements.some(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === '@angular/cdk/testing' && n.importClause?.namedBindings?.elements?.some(e => (e.propertyName || e.name).text === 'ComponentHarness')));
    assert.ok(source.statements.some(n => ts.isExportDeclaration(n) && n.exportClause?.elements?.some(e => e.name.text === symbolName)) || node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword));
  }
  assert.ok(types.node.modifiers?.some(m => m.kind === ts.SyntaxKind.AbstractKeyword), 'public abstract type contract changed');
  const marker = [Object.getPrototypeOf(model.runtime.MatInputHarness.prototype)?.constructor,
    Object.getPrototypeOf(Object.getPrototypeOf(model.runtime.MatInputHarness.prototype))?.constructor]
    .find(constructor => constructor?.name === symbolName);
  assert.equal(typeof marker, 'function');
  assert.equal(Object.getPrototypeOf(marker.prototype), model.testing.ComponentHarness.prototype, 'public marker no longer directly extends genuine CDK base');
  assert.deepEqual(Object.getOwnPropertyNames(marker.prototype), ['constructor']);
  const expectedRuntime = print(runtime.node, runtime.source);
  const loadedSource = parse('loaded-marker.mjs', marker.toString());
  assert.equal(loadedSource.statements.length, 1);
  assert.equal(print(loadedSource.statements[0], loadedSource), expectedRuntime,
    'loaded public class differs from authenticated class body');
  const pkg = model.packages.get('@angular/material');
  const entry = pkg.exports['./form-field/testing/control']; assert.ok(entry?.default && entry?.types);
  assert.ok(model.complete_runtime_modules.some(m => m.path === '@angular/material/' + entry.default.replace(/^\.\//, '')));
  return {marker, runtime_path: runtime.path, runtime_class_sha256: hash(expectedRuntime),
    declaration_path: types.path, declaration_sha256: hash(print(types.node, types.source).replace(/^(?:(?:export|declare) )+/, ''))};
}

export function inspectControlMarkerCallers(root = rootDefault, readSource) {
  const read = file => readSource ? readSource(file) : readFileSync(join(root, 'projects/ngx-material-legacy', file), 'utf8');
  const files = [selectFile, formFile], authoredRoot = join(root, 'projects/ngx-material-legacy'), options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext};
  const host = ts.createCompilerHost(options), fallback = host.readFile.bind(host);
  host.readFile = path => path.startsWith(authoredRoot + '/') ? read(path.slice(authoredRoot.length + 1)) : fallback(path);
  const program = ts.createProgram(files.map(file => join(authoredRoot, file)), options, host), checker = program.getTypeChecker(), cases = [];
  for (const file of files) {
    const source = program.getSourceFile(join(authoredRoot, file)); assert.ok(source); assert.equal(source.parseDiagnostics.length, 0);
    const imports = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName)
      .flatMap(n => n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) ? n.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === symbolName) : []);
    assert.equal(imports.length, 1); const binding = imports[0], symbol = checker.getSymbolAtLocation(binding.name), references = []; assert.ok(symbol);
    const visit = node => {
      if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName && checker.getSymbolAtLocation(node) === symbol) {
        const parent = node.parent; let role;
        if (ts.isTypeReferenceNode(parent)) {assert.equal(file, formFile); role = 'erased-type-bound';}
        else if (ts.isExpressionWithTypeArguments(parent) && ts.isHeritageClause(parent.parent) && ts.isClassDeclaration(parent.parent.parent) && parent.parent.token === ts.SyntaxKind.ExtendsKeyword) {
          assert.equal(file, selectFile); assert.ok(!parent.typeArguments?.length && !binding.isTypeOnly && !binding.parent.parent.isTypeOnly);
          const owner = parent.parent.parent; assert.equal(owner.name.text, '_MatSelectHarnessBase');
          assert.ok(!owner.members.some(ts.isConstructorDeclaration), 'new inherited constructor boundary');
          assert.ok(!owner.members.some(n => n.name?.getText(source) === 'locatorFactory'), 'new inherited property interposition');
          role = 'runtime-base-inheritance';
        } else assert.fail('unreviewed marker value use: ' + parent.getText(source));
        references.push({role, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression: parent.getText(source)});
      }
      ts.forEachChild(node, visit);
    };
    visit(source); assert.equal(references.length, file === selectFile ? 1 : 4);
    cases.push({file, module: moduleName, symbol: symbolName, candidate_source_sha256: hash(source.text), references});
  }
  const api = parse(apiFile, read(apiFile));
  const reexports = api.statements.filter(ts.isExportDeclaration).filter(n => n.moduleSpecifier?.text === moduleName)
    .flatMap(n => n.exportClause && ts.isNamedExports(n.exportClause) ? n.exportClause.elements : []);
  assert.equal(reexports.length, 1); assert.equal(reexports[0].propertyName?.text, symbolName); assert.equal(reexports[0].name.text, 'MatLegacyFormFieldControlHarness');
  assert.ok(!reexports[0].isTypeOnly && !reexports[0].parent.parent.isTypeOnly);
  cases.push({file: apiFile, module: moduleName, symbol: symbolName, candidate_source_sha256: hash(api.text), references: [{role: 'public-marker-reexport', alias: 'MatLegacyFormFieldControlHarness'}]});
  return {cases, sources: Object.fromEntries([...files, apiFile].map(file => [file, read(file)]))};
}

async function exerciseOwnedSelect(model, marker, source) {
  const code = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true}}).outputText;
  const module = new SourceTextModule(code), bridges = new Map();
  for (const [specifier, namespace] of [['@angular/cdk/testing', model.testing], [moduleName, {[symbolName]: marker}]])
    bridges.set(specifier, new SyntheticModule(Object.keys(namespace), function () {for (const name of Object.keys(namespace)) this.setExport(name, namespace[name]);}));
  await module.link(specifier => {assert.ok(bridges.has(specifier)); return bridges.get(specifier);}); await module.evaluate();
  const Base = module.namespace._MatSelectHarnessBase; assert.equal(Object.getPrototypeOf(Base.prototype), marker.prototype);
  class OwnedSelect extends Base {static hostSelector = '.mat-select'; _prefix = 'mat';}
  const rootElement = {}, calls = [], locator = async () => rootElement;
  const document = {locatorFor(selector) {calls.push(selector); return locator;}};
  const factory = {rootElement, documentRootLocatorFactory() {return document;}};
  const owned = new OwnedSelect(factory); assert.equal(await owned.host(), rootElement); assert.ok(owned instanceof marker); assert.deepEqual(calls, ['.cdk-overlay-backdrop']);
  assert.equal(owned.documentRootLocatorFactory(), document);
  return {actual_owned_select_module_executed: true, inherited_host_identity: true, marker_instance_identity: true, initialization_locator: calls[0], emitted_js_sha256: hash(code), native_execution: false};
}

function compileControlMarkerConsumers(models, sources, root) {
  const results = [];
  for (const model of models) {
    const virtual = join(root, '__form_field_control_types__', model.subject.line), files = new Map(), pkg = model.packages.get('@angular/material');
    for (const [path, text] of model.sources) if (path.endsWith('.d.ts')) files.set(join(virtual, 'node_modules', path), text);
    for (const [path, text] of model.testingSources) if (path.endsWith('.d.ts')) files.set(join(virtual, 'node_modules/@angular/cdk', path), text);
    files.set(join(virtual, 'owned-select.ts'), sources[selectFile]);
    const code = `import {ComponentHarness,BaseHarnessFilters,HarnessPredicate,LocatorFactory,TestElement,ComponentHarnessConstructor,HarnessQuery} from '@angular/cdk/testing';
import {MatFormFieldControlHarness} from '${moduleName}';import {_MatSelectHarnessBase} from './owned-select';
export {MatFormFieldControlHarness as MatLegacyFormFieldControlHarness} from '${moduleName}';
class OwnedOption extends ComponentHarness {static hostSelector='.option';static with(options:BaseHarnessFilters={}){return new HarnessPredicate(OwnedOption,options);}async click():Promise<void>{}}
class OwnedSelect extends _MatSelectHarnessBase<typeof OwnedOption,OwnedOption,BaseHarnessFilters,typeof OwnedOption,OwnedOption,BaseHarnessFilters>{static hostSelector='.mat-select';protected _prefix='mat';protected _optionClass=OwnedOption;protected _optionGroupClass=OwnedOption;}
class OwnedControl extends MatFormFieldControlHarness {static hostSelector='.owned';readHost():Promise<TestElement>{return this.host();}}
class GenericField<Control extends MatFormFieldControlHarness>{getControl():Promise<Control|null>;getControl<X extends MatFormFieldControlHarness>(type:ComponentHarnessConstructor<X>):Promise<X|null>;getControl<X extends MatFormFieldControlHarness>(type:HarnessPredicate<X>):Promise<X|null>;getControl<X extends MatFormFieldControlHarness>(type?:HarnessQuery<X>):Promise<X|null>{return Promise.resolve(null);}}
declare const factory:LocatorFactory;const control=new OwnedControl(factory);const marker:MatFormFieldControlHarness=control;const selectMarker:MatFormFieldControlHarness=new OwnedSelect(factory);
const field=new GenericField<OwnedControl>();const direct:Promise<OwnedControl|null>=field.getControl();const typed:Promise<OwnedControl|null>=field.getControl(OwnedControl);const predicate:Promise<OwnedControl|null>=field.getControl(new HarnessPredicate(OwnedControl,{}));
// @ts-expect-error The public marker remains abstract.
new MatFormFieldControlHarness(factory);
// @ts-expect-error The inherited constructor needs a LocatorFactory.
new OwnedControl('invalid');
// @ts-expect-error Generic controls inherit actual harness structure.
const invalid=new GenericField<{arbitrary:true}>();
// @ts-expect-error Optional control lookup remains nullable.
const lostNull:Promise<OwnedControl>=field.getControl(OwnedControl);
class UnsupportedAccessor extends MatFormFieldControlHarness{
// @ts-expect-error The inherited readonly data property cannot become an accessor.
get locatorFactory():LocatorFactory{return factory;}}
`;
    const entry = join(virtual, 'consumer.ts'); files.set(entry, code);
    const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: false, noEmit: true,
      paths: {'@angular/cdk/testing': [join(virtual, 'node_modules/@angular/cdk', model.testingSubject.public_types)], [moduleName]: [join(virtual, 'node_modules/@angular/material', pkg.exports['./form-field/testing/control'].types.replace(/^\.\//, ''))]}};
    const host = ts.createCompilerHost(options), read = host.readFile.bind(host), exists = host.fileExists.bind(host);
    host.readFile = path => files.get(path) ?? read(path); host.fileExists = path => files.has(path) || exists(path);
    host.directoryExists = path => [...files.keys()].some(p => p.startsWith(path + '/')) || ts.sys.directoryExists(path);
    const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([entry], options, host));
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => virtual, getNewLine: () => '\n'}));
    results.push({line: model.subject.line, strict: true, skip_lib_check: false, compiler: ts.version, negative_controls: 5, fixture_sha256: hash(code), actual_owned_select_source_compiled: true,
      scope: 'Complete authentic control/CDK testing declarations and actual owned select base; form-field generic overload boundary fixture only, not complete form-field class or packed/AOT/floor consumer'});
  }
  return results;
}

export async function reviewFormFieldControlHarness({root = rootDefault} = {}) {
  const subjects = await inputHarnessPublicSubjects(root);
  try {
    const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
    assert.equal(hash(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
    assert.deepEqual(JSON.parse(seed).symbol_uses.filter(r => r.module === moduleName && r.symbol === symbolName).map(r => r.file).sort(), [selectFile, formFile].sort());
    const historicalAlias = historicalPublicAlias(root), callers = inspectControlMarkerCallers(root), observations = [];
    for (const model of subjects.models) {
      const {marker, ...declarations} = inspectControlMarker(model);
      observations.push({line: model.subject.line, ...declarations, public_base: await exerciseHarnessBase(marker), owned_select: await exerciseOwnedSelect(model, marker, callers.sources[selectFile])});
    }
    assert.equal(new Set(observations.map(o => o.declaration_sha256)).size, 1);
    assert.equal(new Set(observations.map(o => o.runtime_class_sha256)).size, 1);
    // The erased form-field import must not become a runtime dependency.
    const formCode = ts.transpileModule(callers.sources[formFile], {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true}}).outputText;
    assert.ok(!formCode.includes(moduleName) && !formCode.includes(symbolName));
    const manifest = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json')));
    return {schema_version: 1, line: manifest.version.startsWith('21.') ? '21.x' : 'main', historical_alias: historicalAlias, cases: callers.cases, observations,
      strict_types: compileControlMarkerConsumers(subjects.models, callers.sources, root), erased_form_field_marker_import: true, node: process.version, rxjs: subjects.rxjs,
      subject_capsule_sha256: subjects.capsule_sha256, limits: ['Only the marker inheritance/type/reexport boundary is reviewed; owned method behavior, actual Angular/native locator execution, full consumer/floor/packed builds and upstream SHA audit remain separate.',
        'The existing CDK base proof measures a class-field accessor-interposition difference. The exact owned select has no constructor or locatorFactory redeclaration; strict declarations reject subclass accessors. No arbitrary JavaScript/proxy subclass equivalence is claimed.'], g11_claim: 'not-passed'};
  } finally {subjects.dispose();}
}
