/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact owned historical error factories, local bindings and export aliases. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SourceTextModule} from 'node:vm';

const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const sha = b => createHash('sha256').update(b).digest('hex');
const printer = ts.createPrinter({removeComments: true});
const print = (n, s) => printer.printNode(ts.EmitHint.Unspecified, n, s);
const parse = (p, t) => {const s = ts.createSourceFile(p, t, ts.ScriptTarget.Latest, true); assert.equal(s.parseDiagnostics.length, 0); return s;};
const recipes = [
  ['legacy-form-field', 'form-field-errors.ts', '43dcfdbc17bb67ef20bdf2ee7f4372c4d889b90c53abcfd58accb68082cc625c',
    'form-field.ts', './owned-errors', [1, 2, 1]],
  ['legacy-tooltip', 'tooltip-invalid-position.ts', '5c335f133dee4ef738ff1a5bc8b644d4afa1773aceef74ea8fe47728cfacf99f',
    'internal/tooltip-base.ts', '../owned-errors', [2]],
  ['legacy-input', 'input-errors.ts', 'f90b89bc25105ebd22a73ccd5d3f9799d86a967c0ef68fa37dcb40f0cc9bf10d', null, null, []],
  ['legacy-autocomplete', 'autocomplete-missing-panel.ts', '58c47b8ca51fd119246c4c1fb4ce3b25c8c099af10dce48b86934b9786a27cca',
    'internal/autocomplete-trigger-base.ts', '../owned-errors', [1]],
];

export async function reviewOwnedErrorHelperUses({root = rootDefault, readSource} = {}) {
  const read = p => readSource ? readSource(p) : readFileSync(join(root, p), 'utf8');
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(sha(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const frozen = JSON.parse(seed).symbol_uses.filter(u => u.symbol.startsWith('getMat'));
  assert.equal(frozen.length, 5);
  const factories = [], cases = [];
  for (const [family, filename, digest, caller, route, counts] of recipes) {
    const referencePath = 'reference/material-16.2.14/error-helper-sources/' + filename;
    const originalText = read(referencePath); assert.equal(sha(originalText), digest);
    const original = parse(referencePath, originalText), path = 'projects/ngx-material-legacy/' + family + '/owned-errors.ts';
    const ownedText = read(path), owned = parse(path, ownedText);
    assert.ok(owned.statements.every(ts.isFunctionDeclaration) && original.statements.every(ts.isFunctionDeclaration));
    assert.equal(owned.statements.length, original.statements.length);
    const publicPath = 'projects/ngx-material-legacy/' + family + '/public-api.ts', publicText = read(publicPath), api = parse(publicPath, publicText);
    const output = ts.transpileModule(ownedText, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText;
    const module = new SourceTextModule(output); await module.link(() => assert.fail('pure error factories acquired an external dependency')); await module.evaluate();
    for (const [index, fn] of original.statements.entries()) {
      const name = fn.name.text, candidate = owned.statements[index]; assert.equal(print(candidate, owned), print(fn, original));
      const alias = name.replace('getMat', 'getMatLegacy');
      const exports = api.statements.filter(ts.isExportDeclaration).filter(n => n.moduleSpecifier?.text === './owned-errors')
        .flatMap(n => n.exportClause?.elements?.filter(e => e.name.text === alias && e.propertyName?.text === name) || []);
      assert.equal(exports.length, 1); assert.ok(!exports[0].isTypeOnly && !exports[0].parent.parent.isTypeOnly);
      const values = fn.parameters.length ? ['start', 'end', '', '"<>\n', 'unexpected'] : [undefined], observations = [];
      for (const value of values) {
        const first = module.namespace[name](value), second = module.namespace[name](value);
        assert.ok(first instanceof Error); assert.notEqual(first, second); assert.equal(first.name, 'Error');
        assert.equal(first.message, second.message); assert.deepEqual(Object.keys(first), []);
        observations.push({argument: value ?? null, name: first.name, message: first.message, fresh_instance: true});
      }
      factories.push({family, symbol: name, owned_path: path, owned_source_sha256: sha(ownedText),
        original_path: referencePath, original_sha256: digest, complete_function_source: fn.getText(original),
        complete_function_sha256: sha(fn.getText(original)), public_path: publicPath, public_sha256: sha(publicText),
        historical_alias: alias, observations, pure_complete_owned_module_executed: true});
      if (!caller) continue;
      const use = frozen.find(u => u.file === family + '/' + caller && u.symbol === name); assert.ok(use);
      const callerPath = 'projects/ngx-material-legacy/' + use.file, text = read(callerPath), source = parse(callerPath, text);
      const absolute = join(root, callerPath), options = {noResolve: true, noLib: true}, host = ts.createCompilerHost(options);
      host.getSourceFile = p => p === absolute ? source : undefined;
      const checker = ts.createProgram([absolute], options, host).getTypeChecker();
      const imports = source.statements.filter(ts.isImportDeclaration).flatMap(n =>
        n.importClause?.namedBindings?.elements?.filter(e => (e.propertyName || e.name).text === name).map(binding => ({node: n, binding})) || []);
      assert.equal(imports.length, 1); const {node, binding} = imports[0]; assert.equal(node.moduleSpecifier.text, route);
      assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly);
      const symbol = checker.getSymbolAtLocation(binding.name); assert.deepEqual(symbol?.declarations, [binding]);
      const references = [];
      function visit(n) {
        if (ts.isIdentifier(n) && n !== binding.name && n !== binding.propertyName && checker.getSymbolAtLocation(n) === symbol) {
          const call = n.parent; assert.ok(ts.isCallExpression(call) && call.expression === n && ts.isThrowStatement(call.parent));
          assert.equal(call.arguments.length, fn.parameters.length);
          references.push({line: source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1, throw_expression: call.parent.getText(source)});
        }
        ts.forEachChild(n, visit);
      }
      visit(source); assert.equal(references.length, counts[index]);
      cases.push({...use, candidate_source_sha256: sha(text), local_name: binding.name.text,
        replacement_route: route, complete_owned_factory_sha256: sha(ownedText), references});
    }
  }
  assert.equal(factories.length, 6); assert.equal(cases.length, 5);
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  return {schema_version: 1, line: manifest.version.startsWith('21.') ? '21.x' : 'main', node: process.version,
    compiler: ts.version, factories, cases, source_override_used: !!readSource,
    limits: ['Six complete owned pure error modules/functions match immutable original bodies; the original factory implementation supplies message/value behavior.',
      'Five exact source-local imports/throw expressions and six historical barrel aliases are inspected. No complete component validation/lifecycle, full barrel import, native view, packed API or runtime-floor execution.'],
    g11_claim: 'not-passed'};
}
