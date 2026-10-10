/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

/** Review only the frozen BidiModule metadata reexports, not Directionality callers. */
export function reviewBidiModuleUses({root = rootDefault, readSource} = {}) {
  const read = path => readSource ? readSource(path) : readFileSync(resolve(root, path), 'utf8');
  const seedBytes = readFileSync(resolve(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seedBytes), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const uses = JSON.parse(seedBytes).symbol_uses.filter(row => row.module === '@angular/cdk/bidi' && row.symbol === 'BidiModule');
  assert.equal(uses.length, 25);
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  const cases = [];
  for (const use of uses) {
    const path = 'projects/ngx-material-legacy/' + use.file;
    const text = read(path), file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    assert.equal(file.parseDiagnostics.length, 0);
    const imports = file.statements.filter(ts.isImportDeclaration);
    const bindings = imports.filter(n => n.moduleSpecifier.text === use.module && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings))
      .flatMap(n => n.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === use.symbol));
    assert.equal(bindings.length, 1, 'missing or ambiguous BidiModule import');
    const binding = bindings[0];
    assert.equal(binding.isTypeOnly || binding.parent.parent.isTypeOnly, false, 'BidiModule must be a runtime import');
    const options = {noResolve: true, noLib: true};
    const host = ts.createCompilerHost(options);
    host.getSourceFile = filename => filename === resolve(root, path) ? file : undefined;
    const checker = ts.createProgram([resolve(root, path)], options, host).getTypeChecker();
    const symbol = checker.getSymbolAtLocation(binding.name);
    assert.ok(symbol);
    const refs = [];
    const visit = node => {
      if (ts.isIdentifier(node) && node.text === binding.name.text && node !== binding.name && node !== binding.propertyName) {
        assert.ok(checker.getSymbolAtLocation(node) === symbol, 'shadowed BidiModule binding');
        const array = node.parent, property = array.parent, object = property.parent, call = object.parent;
        assert.ok(ts.isArrayLiteralExpression(array) && ts.isPropertyAssignment(property) && ts.isObjectLiteralExpression(object)
          && ts.isCallExpression(call) && ts.isIdentifier(call.expression) && call.expression.text === 'NgModule'
          && ts.isDecorator(call.parent), 'unsupported BidiModule use outside NgModule metadata');
        const ngImport = imports.filter(n => n.moduleSpecifier.text === '@angular/core' && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings))
          .flatMap(n => n.importClause.namedBindings.elements.filter(e => e.name.text === 'NgModule' && (e.propertyName || e.name).text === 'NgModule'));
        assert.equal(ngImport.length, 1);
        assert.ok(checker.getSymbolAtLocation(call.expression) === checker.getSymbolAtLocation(ngImport[0].name), 'shadowed NgModule decorator');
        const role = property.name.getText(file);
        assert.ok(['imports', 'exports'].includes(role));
        assert.ok(!array.elements.some(ts.isSpreadElement), 'dynamic module membership');
        refs.push({line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, role});
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    assert.deepEqual(refs.map(r => r.role).sort(), ['exports', 'imports']);
    cases.push({...use, candidate_source_sha256: hash(text), local_name: binding.name.text,
      import_line: file.getLineAndCharacterOfPosition(binding.getStart(file)).line + 1, references: refs});
  }
  return {schema_version: 1, line, compiler: ts.version, cases, g11_claim: 'not-passed',
    scope: 'Exactly 25 frozen module imports and reexports; no Directionality component caller, MatCommonModule parity, native rendering, packed AOT or complete floor execution credit.'};
}
