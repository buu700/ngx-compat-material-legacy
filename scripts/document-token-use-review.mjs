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
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ts = createRequire(import.meta.url)('typescript');
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = text => createHash('sha256').update(text).digest('hex');
const recipes = {
  'legacy-menu/menu-content.ts': [4, false],
  'legacy-chips/chip.ts': [5, false],
  'legacy-tabs/tab-body.ts': [2, false],
  'legacy-slider/slider.ts': [6, false],
  'legacy-progress-spinner/progress-spinner.ts': [2, true],
  'legacy-tooltip/tooltip.ts': [11, false],
  'legacy-tooltip/internal/tooltip-base.ts': [11, false],
  'legacy-autocomplete/internal/autocomplete-trigger-base.ts': [8, true],
  'legacy-menu/internal/menu-content-base.ts': [4, false],
  'legacy-core/internal/common-module.ts': [2, false],
  'legacy-core/internal/legacy-viewport.ts': [2, true],
  'legacy-dialog/dialog-container.ts': [2, true],
  'legacy-dialog/internal/dialog-container-base.ts': [2, true],
  'legacy-menu/internal/menu-item-base.ts': [1, false],
};
const deltaFiles = ['legacy-core/internal/common-module.ts', 'legacy-progress-bar/internal/progress-bar-location.ts'];
const coreDeltaFiles = ['legacy-core/internal/legacy-viewport.ts', 'legacy-dialog/dialog-container.ts',
  'legacy-dialog/internal/dialog-container-base.ts', 'legacy-menu/internal/menu-item-base.ts'];

/** Review the actual token binding, constructor slots and two injection calls. */
export function reviewDocumentTokenUses({root = defaultRoot, readSource} = {}) {
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const frozen = JSON.parse(seed).symbol_uses.filter(r => r.module === '@angular/common' && r.symbol === 'DOCUMENT');
  assert.equal(frozen.length, 10);
  const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts', '-g', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n');
  const cases = [];
  for (const path of paths) {
    const text = read(path), file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    assert.equal(file.parseDiagnostics.length, 0);
    const imports = file.statements.filter(n => ts.isImportDeclaration(n) && ['@angular/common', '@angular/core'].includes(n.moduleSpecifier.text)
      && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings))
      .flatMap(n => n.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === 'DOCUMENT'));
    if (!imports.length) continue;
    assert.equal(imports.length, 1);
    const binding = imports[0], relative = path.slice('projects/ngx-material-legacy/'.length);
    const module = binding.parent.parent.parent.moduleSpecifier.text;
    const frozenUse = module === '@angular/common' && frozen.some(row => row.file === relative);
    assert.ok(frozenUse || (module === '@angular/common' ? deltaFiles : coreDeltaFiles).includes(relative),
      'new document token consumer or route needs review');
    assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly, 'runtime document token import required');
    const options = {noResolve: true, noLib: true}, host = ts.createCompilerHost(options);
    host.getSourceFile = p => p === resolve(root, path) ? file : undefined;
    const checker = ts.createProgram([resolve(root, path)], options, host).getTypeChecker();
    const symbol = checker.getSymbolAtLocation(binding.name), references = [];
    const coreBinding = (node, name) => {
      const declarations = checker.getSymbolAtLocation(node)?.declarations;
      return declarations?.length === 1 && declarations.every(d => ts.isImportSpecifier(d)
        && (d.propertyName || d.name).text === name && !d.isTypeOnly && !d.parent.parent.isTypeOnly
        && d.parent.parent.parent.moduleSpecifier.text === '@angular/core');
    };
    const visit = node => {
      if (ts.isIdentifier(node) && node.text === binding.name.text && node !== binding.name && node !== binding.propertyName) {
        assert.ok(checker.getSymbolAtLocation(node) === symbol, 'shadowed document token');
        const call = node.parent;
        assert.ok(ts.isCallExpression(call) && call.arguments.length === 1 && call.arguments[0] === node, 'unreviewed document token use');
        const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
        if (coreBinding(call.expression, 'Inject')) {
          assert.ok(ts.isDecorator(call.parent) && ts.isParameter(call.parent.parent) && ts.isConstructorDeclaration(call.parent.parent.parent));
          const parameter = call.parent.parent, ctor = parameter.parent, recipe = recipes[relative];
          const optional = !!parameter.modifiers?.some(m => ts.isDecorator(m) && ts.isCallExpression(m.expression) && coreBinding(m.expression.expression, 'Optional'));
          assert.ok(recipe); assert.equal(ctor.parameters.indexOf(parameter), recipe[0], 'document constructor position changed');
          assert.equal(optional, recipe[1], 'document optionality changed');
          references.push({role: 'constructor-token', line, expression: call.getText(file), class: ctor.parent.name.text,
            index: recipe[0], optional, declaration: parameter.getText(file), constructor_source: ctor.getText(file)});
        } else {
          assert.ok(coreBinding(call.expression, 'inject'), 'not the public Angular inject function');
          if (relative === 'legacy-snack-bar/internal/snack-bar-container-base.ts') {
            assert.ok(ts.isPropertyDeclaration(call.parent) && call.parent.name.getText(file) === '_document');
          } else {
            assert.equal(relative, 'legacy-progress-bar/internal/progress-bar-location.ts');
            assert.ok(ts.isVariableDeclaration(call.parent) && call.parent.name.getText(file) === '_document');
            let owner = call.parent;
            while (owner.parent && !ts.isFunctionDeclaration(owner)) owner = owner.parent;
            assert.ok(ts.isFunctionDeclaration(owner) && owner.name.text === 'MAT_PROGRESS_BAR_LOCATION_FACTORY');
          }
          references.push({role: 'public-inject-call', line, expression: call.getText(file), optional: false});
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file); assert.equal(references.length, 1);
    cases.push({file: relative, module, symbol: 'DOCUMENT', frozen_use: frozenUse,
      local_name: binding.name.text, candidate_source_sha256: hash(text), references});
  }
  assert.equal(cases.length, 16);
  assert.deepEqual(cases.filter(r => !r.frozen_use).map(r => [r.file, r.module]).sort(),
    [...deltaFiles.map(file => [file, '@angular/common']), ...coreDeltaFiles.map(file => [file, '@angular/core'])].sort());
  for (const use of frozen) assert.ok(cases.some(row => row.file === use.file && row.module === use.module),
    'frozen document token caller missing');
  assert.equal(cases.filter(r => r.references[0].role === 'constructor-token').length, 14);
  return {schema_version: 1, line: JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main',
    compiler: ts.version, frozen_uses: 10, current_uses: 16, delta_uses: 6, core_uses: 4, common_uses: 12, cases,
    scope: 'Finite public document token injection identities and original constructor slots; no DOM operations or complete legacy component execution claim.', g11_claim: 'not-passed'};
}
