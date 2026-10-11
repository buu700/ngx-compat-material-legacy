/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite public context guards and two direct ambient-inject import boundaries. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scanCurrentAuthoredUses} from './authored-current-use-inventory.mjs';

const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const prefix = 'projects/ngx-material-legacy/';
const sha = raw => createHash('sha256').update(raw).digest('hex');
const printer = ts.createPrinter({removeComments: true});
const print = (node, file) => printer.printNode(ts.EmitHint.Unspecified, node, file);
const recipes = [
  {file: 'legacy-core/internal/legacy-animations.ts', name: 'legacyAnimationsDisabled', fallback: 'false', tail: "return getLegacyAnimationsState() !== 'enabled';"},
  {file: 'legacy-core/pseudo-checkbox/pseudo-checkbox.ts', name: 'MatLegacyPseudoCheckbox', kind: 'constructor', fallback: 'inContext = false;'},
  {file: 'legacy-dialog/dialog-container.ts', name: 'dialogAnimationsDisabled', fallback: 'false', tail: 'return legacyAnimationsDisabled();'},
  {file: 'legacy-dialog/internal/dialog-container-base.ts', name: 'ambientService', fallback: 'null', tail: 'return inject(token, {optional: true});'},
  {file: 'legacy-table/table.ts', name: 'MatLegacyTable', kind: 'constructor', strict: true},
  {file: 'legacy-tabs/internal/after-tab-header-render.ts', name: 'tabHeaderRenderInjector', fallback: 'null', tail: 'return inject(Injector);'},
  {file: 'legacy-tabs/internal/tab-body-base.ts', name: 'tabBodyNgZone', fallback: 'null', tail: 'return inject(NgZone, {optional: true});'},
];
const directInjectFiles = new Set(['legacy-dialog/internal/dialog-container-base.ts', 'legacy-tabs/internal/after-tab-header-render.ts']);
const normalize = text => {
  const file = ts.createSourceFile('shape.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0);
  return file.statements.map(n => print(n, file)).join('\n');
};
const stable = node => !ts.getJSDocTags(node).some(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text));

export function prepareCurrentInjectionContexts({root = rootDefault} = {}) {
  const current = scanCurrentAuthoredUses({root});
  const guardUses = current.symbol_uses.filter(r => r.module === '@angular/core' && r.symbol === 'assertInInjectionContext');
  assert.deepEqual(guardUses.map(r => r.file).sort(), recipes.map(r => r.file).sort(), 'unreviewed context guard population');
  const uses = [...guardUses, ...current.symbol_uses.filter(r => r.module === '@angular/core' && r.symbol === 'inject' && directInjectFiles.has(r.file))];
  assert.equal(uses.length, 9);
  return {uses, source_files: current.source_files, source_population_sha256: current.source_population_sha256};
}

export function reviewCurrentInjectionContexts({root = rootDefault, model, readSource} = {}) {
  model ||= prepareCurrentInjectionContexts({root});
  const read = p => readSource ? readSource(p) : readFileSync(resolve(root, p), 'utf8');
  const selected = new Set(recipes.map(r => prefix + r.file));
  const paths = execFileSync('rg', ['--files', '--hidden', '--no-ignore', prefix.slice(0, -1), '--glob', '*.ts', '--glob', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n').sort();
  assert.deepEqual(paths, model.source_files.map(r => r.path).sort(), 'changed whole authored source population');
  for (const cap of model.source_files) if (!selected.has(cap.path))
    assert.equal(sha(read(cap.path)), cap.sha256, 'changed source outside reviewed context callers');
  const cases = [], snippets = {};
  for (const recipe of recipes) {
    const path = prefix + recipe.file, raw = read(path), file = ts.createSourceFile(path, raw, ts.ScriptTarget.Latest, true);
    assert.equal(file.parseDiagnostics.length, 0);
    const imports = file.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === '@angular/core');
    const bindings = imports.flatMap(n => n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) ? n.importClause.namedBindings.elements : []);
    const guardBindings = bindings.filter(n => (n.propertyName || n.name).text === 'assertInInjectionContext');
    assert.equal(guardBindings.length, 1); const binding = guardBindings[0];
    assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly);
    const options = {noResolve: true, noLib: true}, absolute = resolve(root, path), host = ts.createCompilerHost(options);
    host.getSourceFile = p => p === absolute ? file : undefined;
    const checker = ts.createProgram([absolute], options, host).getTypeChecker(), imported = checker.getSymbolAtLocation(binding.name);
    const calls = [];
    const walk = n => {
      if (ts.isIdentifier(n) && n.text === binding.name.text && n !== binding.name && n !== binding.propertyName) {
        assert.ok(checker.getSymbolAtLocation(n) === imported, 'shadowed context guard');
        assert.ok(ts.isCallExpression(n.parent) && n.parent.expression === n && n.parent.arguments.length === 1, 'escaped or malformed context guard');
        assert.equal(n.parent.arguments[0].getText(file), recipe.name); calls.push(n.parent);
      }
      ts.forEachChild(n, walk);
    }; walk(file); assert.equal(calls.length, 1, 'missing or additional context guard');
    const owner = recipe.kind === 'constructor'
      ? file.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === recipe.name)?.members.find(ts.isConstructorDeclaration)
      : file.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === recipe.name);
    assert.ok(owner?.body); assert.ok(stable(owner));
    const statements = [...owner.body.statements];
    const guardName = binding.name.text;
    if (recipe.strict) {
      assert.equal(statements.length, 3);
      const condition = statements[0]; assert.ok(ts.isIfStatement(condition));
      assert.equal(condition.expression.getText(file), 'arguments.length');
      const rejection = ts.isBlock(condition.thenStatement) ? condition.thenStatement.statements : [condition.thenStatement];
      assert.equal(rejection.length, 1); assert.ok(ts.isThrowStatement(rejection[0]));
      assert.ok(ts.isNewExpression(rejection[0].expression) && rejection[0].expression.expression.getText(file) === 'Error');
      assert.ok(ts.isStringLiteral(rejection[0].expression.arguments[0]));
      assert.equal(normalize(print(statements[1], file)), normalize(`${guardName}(${recipe.name});`));
      const tail = 'super();';
      assert.equal(normalize(print(statements[2], file)), normalize(tail));
    } else {
      const at = recipe.kind === 'constructor' ? 1 : 0;
      assert.equal(statements.length, recipe.kind === 'constructor' ? 3 : 2);
      if (at) assert.equal(normalize(print(statements[0], file)), normalize('let inContext = true;'));
      const guarded = statements[at]; assert.ok(ts.isTryStatement(guarded)); assert.equal(guarded.finallyBlock, undefined);
      assert.equal(guarded.tryBlock.statements.length, 1);
      assert.equal(normalize(print(guarded.tryBlock.statements[0], file)), normalize(`${guardName}(${recipe.name});`));
      assert.ok(guarded.catchClause && !guarded.catchClause.variableDeclaration);
      assert.equal(guarded.catchClause.block.statements.length, 1);
      const fallback = at ? recipe.fallback : `return ${recipe.fallback};`;
      assert.equal(normalize(print(guarded.catchClause.block.statements[0], file)), normalize(fallback));
      const tail = at ? 'this._diAnimationsDisabled = inContext ? legacyAnimationsDisabled() : false;' : recipe.tail;
      const actual = print(statements.at(-1), file).replaceAll(guardName, 'assertInInjectionContext');
      assert.equal(normalize(actual), normalize(tail), 'ambient lookup or fallback boundary changed');
    }
    const injectCalls = [];
    const ib = bindings.find(n => (n.propertyName || n.name).text === 'inject');
    if (directInjectFiles.has(recipe.file)) {
      assert.ok(ib && !ib.isTypeOnly && !ib.parent.parent.isTypeOnly);
      const symbol = checker.getSymbolAtLocation(ib.name);
      const visit = n => {
        if (ts.isIdentifier(n) && n.text === ib.name.text && n !== ib.name && n !== ib.propertyName) {
          assert.ok(checker.getSymbolAtLocation(n) === symbol, 'shadowed ambient inject');
          assert.ok(ts.isCallExpression(n.parent) && n.parent.expression === n);
          injectCalls.push({line: file.getLineAndCharacterOfPosition(n.getStart(file)).line + 1, expression: n.parent.getText(file)});
        }
        ts.forEachChild(n, visit);
      }; visit(file); assert.equal(injectCalls.length, 1);
    }
    const scope = print(owner, file);
    snippets[recipe.name] = recipe.kind === 'constructor'
      ? `class ${recipe.name}${recipe.strict ? ' extends ContextParent' : ''} {${scope}}`
      : scope.replace(/^export /, '');
    const reference = {line: file.getLineAndCharacterOfPosition(calls[0].getStart(file)).line + 1, kind: 'context-guard-call', expression: calls[0].getText(file), owner: recipe.name, scope};
    cases.push({file: recipe.file, module: '@angular/core', symbol: 'assertInInjectionContext', candidate_source_sha256: sha(raw), references: [reference], manual_fallback: recipe.strict ? 'strict DI-only boundary' : recipe.fallback});
    if (directInjectFiles.has(recipe.file)) cases.push({file: recipe.file, module: '@angular/core', symbol: 'inject', candidate_source_sha256: sha(raw), references: injectCalls, owner: recipe.name});
    if (recipe.name === 'legacyAnimationsDisabled') {
      const policy = file.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'getLegacyAnimationsState'); assert.ok(policy);
      snippets.getLegacyAnimationsState = print(policy, file).replace(/^export /, '');
    }
  }
  assert.equal(cases.length, 9);
  const line = JSON.parse(read(prefix + 'package.json')).version.startsWith('21.') ? '21.x' : 'main';
  return {schema_version: 1, line, cases, snippets,
    source_population_sha256: model.source_population_sha256,
    source_files: model.source_files.length,
    scope: 'Seven actual guard scopes and two direct ambient-inject imports. Constructor/helper bodies execute separately with explicit dependency protocols; full components and their peer parent graphs, styles, motion lifecycle, automatic node/root DI, packed/AOT/native and complete consumer floors remain independent.', g11_claim: 'not-passed'};
}
