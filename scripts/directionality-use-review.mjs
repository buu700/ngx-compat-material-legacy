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
const ts = createRequire(import.meta.url)('typescript');
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = text => createHash('sha256').update(text).digest('hex');
const recipes = {
  'legacy-form-field/form-field.ts': [2, ['change', 'value']],
  'legacy-chips/chip-list.ts': [2, ['value', 'change']],
  'legacy-tabs/tab-header.ts': [3, [], 3],
  'legacy-tabs/tab-body.ts': [1, [], 1],
  'legacy-slider/slider.ts': [3, ['value', 'change']],
  'legacy-tooltip/tooltip.ts': [9, [], 9],
  'legacy-tooltip/internal/tooltip-base.ts': [9, ['change', 'value', 'value', 'value']],
  'legacy-tabs/internal/paginated-tab-header.ts': [3, ['change', 'value']],
  'legacy-tabs/internal/tab-body-base.ts': [1, ['change', 'value']],
  'legacy-tabs/internal/tab-nav-bar-base.ts': [1, [], 3],
  'legacy-tabs/internal/tab-header-base.ts': [3, [], 3],
  'legacy-tabs/tab-nav-bar/tab-nav-bar.ts': [1, [], 1],
  'legacy-autocomplete/internal/autocomplete-trigger-base.ts': [6, []],
  'legacy-select/internal/select-base.ts': [5, ['value']],
  'legacy-menu/internal/menu-trigger-base.ts': [6, ['value']],
};

/** Finite public-token constructor annotations and value/change consumption. */
export function reviewDirectionalityUses({root = defaultRoot, readSource} = {}) {
  const read = path => readSource ? readSource(path) : readFileSync(resolve(root, path), 'utf8');
  const seed = readFileSync(resolve(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const uses = JSON.parse(seed).symbol_uses.filter(r => r.module === '@angular/cdk/bidi' && r.symbol === 'Directionality');
  assert.equal(uses.length, 15);
  const cases = [];
  for (const use of uses) {
    const path = 'projects/ngx-material-legacy/' + use.file, text = read(path);
    const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    assert.equal(file.parseDiagnostics.length, 0);
    const imports = file.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === use.module
      && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings))
      .flatMap(n => n.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === use.symbol));
    assert.equal(imports.length, 1);
    const binding = imports[0];
    assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly, 'runtime DI token import required');
    const options = {noResolve: true, noLib: true}, host = ts.createCompilerHost(options);
    host.getSourceFile = p => p === resolve(root, path) ? file : undefined;
    const checker = ts.createProgram([resolve(root, path)], options, host).getTypeChecker();
    const imported = checker.getSymbolAtLocation(binding.name), parameters = [], members = [], forwards = [], contexts = new Map();
    const note = node => {
      let owner = node;
      while (owner.parent && !ts.isConstructorDeclaration(owner) && !ts.isMethodDeclaration(owner)
        && !ts.isGetAccessorDeclaration(owner)) owner = owner.parent;
      contexts.set(owner.getStart(file), {line: file.getLineAndCharacterOfPosition(owner.getStart(file)).line + 1,
        source: owner.getText(file)});
    };
    const find = node => {
      if (ts.isIdentifier(node) && node.text === binding.name.text && node !== binding.name && node !== binding.propertyName) {
        assert.ok(checker.getSymbolAtLocation(node) === imported, 'shadowed Directionality import');
        assert.ok(ts.isTypeReferenceNode(node.parent) && node.parent.typeName === node, 'new runtime Directionality use');
        let type = node.parent;
        if (ts.isUnionTypeNode(type.parent)) type = type.parent;
        assert.ok(ts.isParameter(type.parent) && ts.isConstructorDeclaration(type.parent.parent), 'unreviewed Directionality type use');
        parameters.push(type.parent); note(type.parent);
      }
      ts.forEachChild(node, find);
    };
    find(file);
    const recipe = recipes[use.file];
    assert.ok(recipe, 'unreviewed direction service source');
    assert.equal(parameters.length, use.file.includes('menu-trigger-base') ? 4 : 1);
    assert.ok(parameters.every(p => p.parent.parameters.indexOf(p) === recipe[0]), 'constructor token position changed');
    const implementation = parameters.find(p => p.parent.body);
    assert.ok(implementation && ts.isIdentifier(implementation.name));
    const name = implementation.name.text, parameterSymbol = checker.getSymbolAtLocation(implementation.name);
    const parameterProperty = (implementation.modifiers || []).some(m => [ts.SyntaxKind.PrivateKeyword,
      ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.PublicKeyword].includes(m.kind));
    assert.ok(name === (parameterProperty ? '_dir' : 'dir'));
    const isReceiver = node => ts.isIdentifier(node) && node.text === name
      && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)
      || ts.isPropertyAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword && node.name.text === name;
    const scan = node => {
      if (ts.isElementAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword)
        assert.ok(!ts.isStringLiteral(node.argumentExpression) || node.argumentExpression.text !== name, 'dynamic direction service receiver');
      if (isReceiver(node) && node !== implementation.name && !parameters.some(p => p.name === node)) {
        const symbol = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(node) ? node.name : node);
        // TypeScript can give a protected parameter property distinct local/field symbols.
        assert.ok(symbol === parameterSymbol || symbol?.declarations?.includes(implementation),
          `${path}:${node.getText(file)} shadowed direction service receiver`);
        const parent = node.parent;
        if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
          assert.ok(['value', 'change'].includes(parent.name.text), 'unreviewed direction service member');
          assert.ok(!(ts.isBinaryExpression(parent.parent) && parent.parent.left === parent
            && parent.parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
            && parent.parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment), 'direction member write');
          members.push({member: parent.name.text, line: file.getLineAndCharacterOfPosition(parent.getStart(file)).line + 1});
        } else {
          assert.ok(!ts.isElementAccessExpression(parent), 'dynamic direction service member');
          if (ts.isCallExpression(parent)) {
            assert.equal(parent.expression.kind, ts.SyntaxKind.SuperKeyword, 'unreviewed direction service call');
            forwards.push({argument_index: parent.arguments.indexOf(node), arguments: parent.arguments.map(a => a.getText(file))});
          } else if (ts.isPropertyAssignment(parent)) {
            assert.equal(parent.name.getText(file), 'direction', 'unreviewed direction service escape');
          } else {
            assert.ok(ts.isConditionalExpression(parent) && parent.condition === node
              || ts.isBinaryExpression(parent) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.QuestionQuestionToken].includes(parent.operatorToken.kind)
              || ts.isIfStatement(parent) && parent.expression === node
              || ts.isPrefixUnaryExpression(parent) && parent.operator === ts.SyntaxKind.ExclamationToken,
            'unreviewed direction service receiver use');
          }
        }
        note(node);
      }
      ts.forEachChild(node, scan);
    };
    scan(file);
    assert.equal(forwards.length, parameterProperty ? 0 : 1);
    assert.deepEqual(members.map(m => m.member), recipe[1], 'direction value/change consumption changed');
    if (forwards.length) assert.equal(forwards[0].argument_index, recipe[2], 'constructor direction forwarding position changed');
    cases.push({...use, candidate_source_sha256: hash(text), constructor_parameters: parameters.map(p => ({
      index: p.parent.parameters.indexOf(p), declaration: p.getText(file), implementation: !!p.parent.body})),
      parameter_property: parameterProperty, members, forwards, contexts: [...contexts.values()]});
  }
  return {schema_version: 1, line: JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main',
    compiler: ts.version, cases, scope: 'Exactly 15 frozen Directionality dependencies; constructor annotations, public value/change reads and forwarding only. No complete legacy component, native or packed execution claim.', g11_claim: 'not-passed'};
}
