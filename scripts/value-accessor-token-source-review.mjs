/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact historical accessor provider source; this does not construct controls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
const references = [
  ['legacy-autocomplete', 'autocomplete-trigger.ts', '1eff015d7da17574535f894323a2c2fe9d36f207d90aa9e33503620cd6f10414'],
  ['legacy-checkbox', 'checkbox.ts', '072551993542bffeacc517777d2144cab604e174b0c38988811a3c94ab45b908'],
  ['legacy-list', 'selection-list.ts', 'e14d9323d58fe7c9655861a504d9c19adf11fd9eac6e202e9e085cc035f5ac1c'],
  ['legacy-radio', 'radio.ts', '9d48e8bdfd0ec947e9aaf596fef192e1fb9df0e7116b700c6a01945b3a4b84a4'],
  ['legacy-slide-toggle', 'slide-toggle.ts', 'fbca4514306e6676d6cbacfd18032b1e7753a40e001128cf8186636053f02506'],
  ['legacy-slider', 'slider.ts', 'e923bb96cd3ca35f8bd0697e3ab797f934103cfb6d8b4cae022f4183d45fd1c9'],
].map(([family, file, sha256]) => ({file: family + '/' + file,
  path: 'reference/material-16.2.14/value-accessor-token-sources/' + family + '/' + file, sha256}));
function parse(path, text) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;
}
function one(nodes, label) { assert.equal(nodes.length, 1, label); return nodes[0]; }
function namedImport(source, name, module) {
  return source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === module &&
    node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings))
    .flatMap(node => node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === name));
}

export function scanValueAccessorTokenUses({root = rootDefault, readSource} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const frozen = JSON.parse(seed).symbol_uses.filter(row => row.module === '@angular/forms' && row.symbol === 'NG_VALUE_ACCESSOR');
  assert.equal(frozen.length, 6);
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts', '-g', '!*.spec.ts'],
    {cwd: root, encoding: 'utf8'}).trim().split('\n').filter(path => namedImport(parse(path, read(path)), 'NG_VALUE_ACCESSOR', '@angular/forms').length);
  assert.equal(paths.length, 6);
  const options = {noResolve: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true};
  const host = ts.createCompilerHost(options), oldRead = host.readFile.bind(host), base = join(root, 'projects/ngx-material-legacy');
  host.readFile = path => path.startsWith(base + '/') ? read('projects/ngx-material-legacy/' + path.slice(base.length + 1)) : oldRead(path);
  const program = ts.createProgram(paths.map(path => join(root, path)), options, host), checker = program.getTypeChecker();
  const cases = [];
  for (const path of paths) {
    const source = program.getSourceFile(join(root, path)), file = path.slice('projects/ngx-material-legacy/'.length);
    assert.ok(frozen.some(row => row.file === file));
    const imported = one(namedImport(source, 'NG_VALUE_ACCESSOR', '@angular/forms'), 'ambiguous accessor-token import');
    assert.ok(!imported.isTypeOnly && !imported.parent.parent.isTypeOnly, 'runtime accessor token imported type only');
    const symbol = checker.getSymbolAtLocation(imported.name), uses = [];
    assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === imported);
    function visit(node) {
      if (ts.isIdentifier(node) && node !== imported.name && node !== imported.propertyName && checker.getSymbolAtLocation(node) === symbol) {
        assert.ok(ts.isPropertyAssignment(node.parent) && node.parent.name.text === 'provide' && node.parent.initializer === node,
          'unreviewed accessor-token role'); uses.push(node);
      }
      ts.forEachChild(node, visit);
    }
    visit(source); const use = one(uses, 'one actual accessor-token initializer');
    const object = use.parent.parent;
    assert.ok(ts.isObjectLiteralExpression(object) && ts.isVariableDeclaration(object.parent), 'accessor provider must be a named object');
    const declaration = object.parent;
    assert.deepEqual(object.properties.map(node => node.name?.text), ['provide', 'useExisting', 'multi']);
    assert.equal(object.properties[2].initializer.kind, ts.SyntaxKind.TrueKeyword, 'accessor multi flag changed');
    const call = object.properties[1].initializer;
    assert.ok(ts.isCallExpression(call) && call.arguments.length === 1, 'accessor forward reference changed');
    const forwardBinding = checker.getSymbolAtLocation(call.expression)?.declarations?.find(ts.isImportSpecifier);
    assert.ok(forwardBinding && (forwardBinding.propertyName || forwardBinding.name).text === 'forwardRef' &&
      forwardBinding.parent.parent.parent.moduleSpecifier.text === '@angular/core', 'accessor forwardRef identity changed');
    const callback = call.arguments[0];
    assert.ok(ts.isArrowFunction(callback) && callback.parameters.length === 0 && ts.isIdentifier(callback.body),
      'accessor class-reference callback changed');
    const target = checker.getSymbolAtLocation(callback.body)?.declarations?.filter(ts.isClassDeclaration);
    const cls = one(target ?? [], 'actual accessor class declaration');
    assert.ok(source.statements.includes(cls), 'accessor target escapes owned source');
    const decorators = ts.getDecorators(cls) ?? [];
    const metadata = one(decorators.filter(node => ts.isCallExpression(node.expression) &&
      ['Component', 'Directive'].includes(checker.getSymbolAtLocation(node.expression.expression)?.declarations?.find(ts.isImportSpecifier)?.name.text)),
    'actual accessor component/directive decorator').expression;
    const coreBinding = checker.getSymbolAtLocation(metadata.expression).declarations.find(ts.isImportSpecifier);
    assert.equal(coreBinding.parent.parent.parent.moduleSpecifier.text, '@angular/core');
    const config = metadata.arguments[0];
    const providers = one(config.properties.filter(node => node.name?.text === 'providers'), 'actual accessor provider attachment').initializer;
    assert.ok(ts.isArrayLiteralExpression(providers));
    const attached = providers.elements.filter(node => ts.isIdentifier(node) &&
      checker.getSymbolAtLocation(node)?.declarations?.includes(declaration));
    assert.equal(attached.length, 1, 'accessor provider detached from actual class');
    const reference = one(references.filter(ref => ref.file === file));
    const raw = readFileSync(join(root, reference.path)); assert.equal(hash(raw), reference.sha256);
    const original = parse(reference.path, raw.toString());
    const originalVariable = one(original.statements.filter(ts.isVariableStatement)
      .flatMap(node => node.declarationList.declarations).filter(node => node.name?.text === declaration.name.text), 'tagged accessor variable');
    const canonical = print(object, source).replaceAll(imported.name.text, 'NG_VALUE_ACCESSOR')
      .replaceAll(forwardBinding.name.text, 'forwardRef');
    assert.equal(canonical, print(originalVariable.initializer, original), 'actual provider object differs from tagged original');
    const originalClass = one(original.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === cls.name.text));
    const originalMetadata = ts.getDecorators(originalClass)[0].expression.arguments[0];
    const originalProviders = one(originalMetadata.properties.filter(node => node.name?.text === 'providers')).initializer;
    assert.ok(ts.isArrayLiteralExpression(originalProviders) && originalProviders.elements.some(node => node.getText(original) === declaration.name.text));
    const selector = one(config.properties.filter(node => node.name?.text === 'selector')).initializer;
    const oldSelector = one(originalMetadata.properties.filter(node => node.name?.text === 'selector')).initializer;
    assert.equal(selector.text, oldSelector.text, 'historical accessor selector changed');
    const barrel = file.slice(0, file.indexOf('/')) + '/public-api.ts';
    const barrelText = read('projects/ngx-material-legacy/' + barrel), barrelSource = parse(barrel, barrelText);
    const exports = barrelSource.statements.filter(ts.isExportDeclaration).filter(node => node.exportClause && ts.isNamedExports(node.exportClause))
      .flatMap(node => node.exportClause.elements.filter(item => (item.propertyName || item.name).text === declaration.name.text)
        .map(item => ({node, item})));
    assert.equal(exports.length, 1, 'historical public accessor provider export changed');
    assert.equal(exports[0].node.moduleSpecifier?.text, './' + file.slice(file.indexOf('/') + 1, -3),
      'public accessor provider export points to another module');
    cases.push({file, module: '@angular/forms', symbol: 'NG_VALUE_ACCESSOR', local_name: imported.name.text,
      candidate_source_sha256: hash(source.text), line: source.getLineAndCharacterOfPosition(use.getStart(source)).line + 1,
      provider_name: declaration.name.text, target_class: cls.name.text, provider_expression: print(object, source),
      actual_class_symbol_bound: true, actual_decorator_attachment: true, selector: selector.text,
      public_export: {file: barrel, source_sha256: hash(barrelText)}, reference,
      actual_class_instance_or_native_cva_executed: false});
  }
  return {schema_version: 1, frozen_uses: 6, current_uses: 6, cases,
    binding_parser: ts.version, source_override_used: !!readSource,
    limitation: 'Checker-bound exact provider/forwardRef/class/decorator/barrel source only. No construction or native CVA selection of the actual target classes.',
    g11_claim: 'not-passed'};
}
