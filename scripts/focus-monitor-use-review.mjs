/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const ts = createRequire(import.meta.url)('typescript');
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const module = '@angular/cdk/a11y', symbol = 'FocusMonitor';
const recipes = {
  'legacy-slide-toggle/slide-toggle.ts': [1, ['focusVia']],
  'legacy-radio/radio.ts': [1, []],
  'legacy-list/selection-list.ts': [1, ['monitor', 'stopMonitoring']],
  'legacy-checkbox/checkbox.ts': [1, ['focusVia', 'monitor', 'stopMonitoring']],
  'legacy-button/button.ts': [2, ['focusVia', 'monitor', 'stopMonitoring']],
  'legacy-slider/slider.ts': [1, ['monitor', 'stopMonitoring']],
  'legacy-tooltip/tooltip.ts': [1, []],
  'legacy-tooltip/internal/tooltip-base.ts': [1, ['monitor', 'stopMonitoring']],
  'legacy-tabs/internal/tab-nav-bar-base.ts': [1, ['monitor', 'stopMonitoring']],
  'legacy-tabs/tab-nav-bar/tab-nav-bar.ts': [1, []],
  'legacy-radio/internal/radio-base.ts': [1, ['focusVia', 'monitor', 'stopMonitoring']],
  'legacy-slide-toggle/internal/slide-toggle-base.ts': [1, ['monitor', 'stopMonitoring']],
  'legacy-menu/internal/menu-trigger-base.ts': [4, ['focusVia']],
  'legacy-dialog/dialog-container.ts': [1, []],
  'legacy-dialog/internal/dialog-container-base.ts': [1, ['focusVia']],
  'legacy-menu/internal/menu-item-base.ts': [3, ['focusVia', 'monitor', 'stopMonitoring']],
};

/** Complete current import census and constructor/service-call contexts, without native execution. */
export function reviewFocusMonitorUses({root = defaultRoot, readSource} = {}) {
  const read = path => readSource ? readSource(path) : readFileSync(resolve(root, path), 'utf8');
  const seed = JSON.parse(read('compatibility/f10/authored-dependency-inventory-seed.json'));
  const frozen = seed.symbol_uses.filter(row => row.module === module && row.symbol === symbol);
  assert.equal(frozen.length, 13);
  const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts',
    '-g', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n');
  const cases = [];
  for (const path of paths) {
    const text = read(path), source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    assert.equal(source.parseDiagnostics.length, 0);
    const imports = source.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === module
      && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings))
      .flatMap(n => n.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === symbol));
    if (!imports.length) continue;
    assert.equal(imports.length, 1);
    const binding = imports[0], relative = path.slice('projects/ngx-material-legacy/'.length);
    assert.ok(Object.hasOwn(recipes, relative), 'unreviewed focus monitor caller');
    assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly, 'DI token must remain a value import');
    const host = ts.createCompilerHost({noResolve: true, noLib: true});
    host.getSourceFile = p => p === resolve(root, path) ? source : undefined;
    const checker = ts.createProgram([resolve(root, path)], {noResolve: true, noLib: true}, host).getTypeChecker();
    const imported = checker.getSymbolAtLocation(binding.name), references = [], parameters = [], calls = [], forwarding = [];
    assert.ok(imported);
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && checker.getSymbolAtLocation(node) === imported) {
        assert.ok(ts.isTypeReferenceNode(node.parent), 'FocusMonitor used outside its constructor dependency type');
        let parameter = node.parent;
        while (parameter.parent && !ts.isParameter(parameter)) parameter = parameter.parent;
        assert.ok(ts.isParameter(parameter) && ts.isConstructorDeclaration(parameter.parent), 'new FocusMonitor role');
        assert.ok(ts.isIdentifier(parameter.name));
        const constructor = parameter.parent, cls = constructor.parent;
        references.push({role: 'constructor-dependency', class: cls.name.text,
          index: constructor.parameters.indexOf(parameter), declaration: parameter.getText(source),
          implementation: !!constructor.body});
        if (constructor.body) parameters.push({parameter, constructor, cls});
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.equal(references.length, recipes[relative][0]);
    for (const {parameter, constructor, cls} of parameters) {
      const name = parameter.name.text;
      function uses(node) {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
          && ts.isPropertyAccessExpression(node.expression.expression)
          && node.expression.expression.expression.kind === ts.SyntaxKind.ThisKeyword
          && [name, '_' + name].includes(node.expression.expression.name.text)) {
          assert.ok(['monitor', 'stopMonitoring', 'focusVia'].includes(node.expression.name.text), 'nonpublic service member');
          let member = node;
          while (member.parent !== cls) member = member.parent;
          calls.push({class: cls.name.text, member: member.name.text, method: node.expression.name.text,
            expression: node.getText(source), member_source: member.getText(source)});
        }
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.SuperKeyword) {
          node.arguments.forEach((argument, index) => {
            if (ts.isIdentifier(argument) && checker.getSymbolAtLocation(argument) === checker.getSymbolAtLocation(parameter.name)) {
              forwarding.push({class: cls.name.text, slot: index, expression: node.getText(source),
                constructor_source: constructor.getText(source)});
            }
          });
        }
        ts.forEachChild(node, uses);
      }
      uses(cls);
    }
    assert.deepEqual([...new Set(calls.map(c => c.method))].sort(), recipes[relative][1]);
    assert.ok(calls.length || forwarding.length, 'dependency has no inspected call or parent forwarding');
    cases.push({file: relative, module, symbol, frozen_use: frozen.some(row => row.file === relative),
      local_name: binding.name.text, candidate_source_sha256: hash(text), references, calls, forwarding});
  }
  assert.deepEqual(cases.map(row => row.file).sort(), Object.keys(recipes).sort());
  for (const row of frozen) assert.ok(cases.some(c => c.file === row.file));
  return {schema_version: 1, line: JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main',
    compiler: ts.version, frozen_uses: 13, current_uses: 16, delta_uses: 3, cases,
    scope: 'Public dependency tokens, complete constructor and monitor/stop/focus caller contexts. No complete component, native focus, packed/AOT or runtime-floor qualification.',
    g11_claim: 'not-passed'};
}
