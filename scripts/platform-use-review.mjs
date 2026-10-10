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
  'legacy-form-field/form-field.ts': [[4], ['isBrowser'], []],
  'legacy-chips/chip.ts': [[2], [], [['owned-new', 3]]],
  'legacy-tabs/tab-header.ts': [[5], [], [['super', 5]]],
  'legacy-progress-spinner/progress-spinner.ts': [[1], ['isBrowser', 'SAFARI'], []],
  'legacy-tooltip/tooltip.ts': [[5], [], [['super', 5]]],
  'legacy-tooltip/internal/tooltip-base.ts': [[5], ['IOS', 'ANDROID'], []],
  'legacy-tabs/internal/paginated-tab-header.ts': [[5], ['TRIDENT', 'EDGE'], []],
  'legacy-tabs/internal/tab-nav-bar-base.ts': [[5], [], [['super', 5]]],
  'legacy-tabs/internal/tab-header-base.ts': [[5], [], [['super', 5]]],
  'legacy-tabs/tab-nav-bar/tab-nav-bar.ts': [[5, 3], [], [['super', 5], ['owned-new', 3]]],
  'legacy-core/ripple/ripple-renderer.ts': [[3], ['isBrowser', 'isBrowser'], []],
  'legacy-snack-bar/internal/snack-bar-container-base.ts': [[3], ['FIREFOX', 'isBrowser'], []],
  'legacy-autocomplete/internal/autocomplete-base.ts': [[3], ['SAFARI'], []],
};

/** Complete frozen Platform annotations, immutable flag reads and supplied-instance routes. */
export function reviewPlatformUses({root = defaultRoot, readSource} = {}) {
  const read = path => readSource ? readSource(path) : readFileSync(resolve(root, path), 'utf8');
  const seed = readFileSync(resolve(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const uses = JSON.parse(seed).symbol_uses.filter(r => r.module === '@angular/cdk/platform' && r.symbol === 'Platform');
  assert.equal(uses.length, 13);
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
        assert.ok(checker.getSymbolAtLocation(node) === imported, 'shadowed Platform import');
        assert.ok(ts.isTypeReferenceNode(node.parent) && node.parent.typeName === node, 'new runtime Platform use');
        let type = node.parent;
        if (ts.isUnionTypeNode(type.parent)) type = type.parent;
        assert.ok(ts.isParameter(type.parent) && ts.isConstructorDeclaration(type.parent.parent), 'unreviewed Platform type use');
        parameters.push(type.parent); note(type.parent);
      }
      ts.forEachChild(node, find);
    };
    find(file);
    const recipe = recipes[use.file];
    assert.ok(recipe, 'unreviewed platform service source');
    assert.deepEqual(parameters.map(p => p.parent.parameters.indexOf(p)), recipe[0], 'constructor token position changed');
    const parameterProperties = parameters.map(p => (p.modifiers || []).some(m => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.PublicKeyword].includes(m.kind)));
    for (const implementation of parameters.filter(p => p.parent.body)) {
    assert.ok(implementation && ts.isIdentifier(implementation.name));
    const name = implementation.name.text, parameterSymbol = checker.getSymbolAtLocation(implementation.name);
    assert.ok(['platform', '_platform'].includes(name));
    const isReceiver = node => ts.isIdentifier(node) && node.text === name
      && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)
      || ts.isPropertyAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword && node.name.text === name;
    const scan = node => {
      if (ts.isElementAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword)
        assert.ok(!ts.isStringLiteral(node.argumentExpression) || node.argumentExpression.text !== name, 'dynamic platform service receiver');
      if (isReceiver(node) && node !== implementation.name && !parameters.some(p => p.name === node)) {
        const symbol = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(node) ? node.name : node);
        // TypeScript can give a protected parameter property distinct local/field symbols.
        assert.ok(symbol === parameterSymbol || symbol?.declarations?.includes(implementation),
          `${path}:${node.getText(file)} shadowed platform service receiver`);
        const parent = node.parent;
        if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
          assert.ok(['isBrowser','EDGE','TRIDENT','BLINK','WEBKIT','IOS','FIREFOX','ANDROID','SAFARI'].includes(parent.name.text), 'unreviewed platform service member');
          assert.ok(!(ts.isCallExpression(parent.parent) && parent.parent.expression === parent), 'platform flags must remain plain booleans');
          assert.ok(!(ts.isBinaryExpression(parent.parent) && parent.parent.left === parent
            && parent.parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
            && parent.parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment), 'platform member write');
          assert.ok(!ts.isPostfixUnaryExpression(parent.parent)
            && !(ts.isPrefixUnaryExpression(parent.parent) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(parent.parent.operator))
            && !ts.isDeleteExpression(parent.parent), 'platform member mutation');
          members.push({member: parent.name.text, line: file.getLineAndCharacterOfPosition(parent.getStart(file)).line + 1});
        } else {
          assert.ok(!ts.isElementAccessExpression(parent), 'dynamic platform service member');
          if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
            let kind = 'super';
            if (ts.isNewExpression(parent)) {
              assert.ok(['legacy-chips/chip.ts', 'legacy-tabs/tab-nav-bar/tab-nav-bar.ts'].includes(use.file));
              assert.equal(parent.expression.getText(file), 'RippleRenderer');
              const renderer = file.statements.filter(ts.isImportDeclaration).find(n => n.moduleSpecifier.text === '@ngx-compat/material-legacy/legacy-core'
                && n.importClause?.namedBindings?.elements?.some(e => e.name.text === 'RippleRenderer' && (e.propertyName || e.name).text === 'LegacyRippleRenderer'));
              assert.ok(renderer, 'unreviewed owned renderer route'); kind = 'owned-new';
            } else assert.equal(parent.expression.kind, ts.SyntaxKind.SuperKeyword, 'unreviewed platform service call');
            forwards.push({kind, argument_index: parent.arguments.indexOf(node), arguments: parent.arguments.map(a => a.getText(file))});
          } else if (ts.isPropertyAssignment(parent)) {
            assert.fail('unreviewed platform service escape');
          } else {
            assert.ok(ts.isConditionalExpression(parent) && parent.condition === node
              || ts.isBinaryExpression(parent) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.QuestionQuestionToken].includes(parent.operatorToken.kind)
              || ts.isIfStatement(parent) && parent.expression === node
              || ts.isPrefixUnaryExpression(parent) && parent.operator === ts.SyntaxKind.ExclamationToken,
            'unreviewed platform service receiver use');
          }
        }
        note(node);
      }
      ts.forEachChild(node, scan);
    };
    scan(implementation.parent.parent);
    }
    assert.equal(forwards.length, recipe[2].length);
    assert.deepEqual(members.map(m => m.member), recipe[1], 'platform flag consumption changed');
    assert.deepEqual(forwards.map(f => [f.kind, f.argument_index]), recipe[2], 'supplied platform forwarding position changed');
    cases.push({...use, candidate_source_sha256: hash(text), constructor_parameters: parameters.map(p => ({
      index: p.parent.parameters.indexOf(p), declaration: p.getText(file), implementation: !!p.parent.body})),
      parameter_properties: parameterProperties, members, forwards, contexts: [...contexts.values()]});
  }
  const deltaPath = 'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts';
  const delta = read(deltaPath);
  assert.equal(hash(delta), '522d8dfc0362b7ed01b6dc9155a10d7f36f67aef4152249f56db1f631ad935b0', 'unreviewed viewport Platform delta');
  return {schema_version: 1, line: JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main',
    compiler: ts.version, cases,
    delta_sources: [{path: deltaPath, sha256: hash(delta), scope: 'Already-owned supplied Platform retained in WeakMap state; isBrowser reads only. Prior genuine-provider viewport execution remains separate.'}],
    scope: 'All13 frozen Platform dependencies and1 authenticated owned-viewport delta: public DI annotations, non-mutating boolean flag reads and supplied-instance forwarding;12 still-open uses plus the previously reviewed owned-ripple boundary. No service construction, compatibility constructor arguments, private members, complete component/native/packed execution or full floor qualification.', g11_claim: 'not-passed'};
}
