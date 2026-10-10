/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source ownership inventory only; it does not admit imports or qualify callers. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'projects/ngx-material-legacy/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const members = new Set(['run', 'runOutsideAngular', 'onStable', 'onMicrotaskEmpty', 'isStable']);
const additions = ['internal/testing/owned-test-events.ts',
  'legacy-autocomplete/internal/after-legacy-render.ts', 'legacy-core/internal/legacy-viewport.ts',
  'legacy-dialog/dialog-container.ts', 'legacy-dialog/internal/dialog-container-base.ts',
  'legacy-dialog/internal/dialog-initial-focus.ts', 'legacy-form-field/internal/after-form-field-render.ts',
  'legacy-select/internal/after-select-render.ts', 'legacy-tabs/internal/after-tab-header-render.ts',
  'legacy-tabs/internal/owned-header-resize.ts', 'legacy-tooltip/internal/after-tooltip-render.ts'].sort();

export function inventoryNgZoneUses({root = rootDefault, readSource} = {}) {
  const seedBytes = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seedBytes), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const seed = JSON.parse(seedBytes).symbol_uses;
  const frozen = seed.filter(row => row.module === '@angular/core' && row.symbol === 'NgZone');
  assert.equal(frozen.length, 25);
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts', '-g', '!*.spec.ts'],
    {cwd: root, encoding: 'utf8'}).trim().split('\n').sort();
  const options = {noResolve: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    experimentalDecorators: true};
  const host = ts.createCompilerHost(options), oldRead = host.readFile.bind(host);
  host.readFile = path => path.startsWith(join(root, prefix))
    ? read(prefix + path.slice(join(root, prefix).length)) : oldRead(path);
  const program = ts.createProgram(paths.map(path => join(root, path)), options, host);
  const checker = program.getTypeChecker(), cases = [], receivers = new Set(), factories = new Set();
  const locate = node => ({file: node.getSourceFile().fileName.slice(join(root, prefix).length),
    line: node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1});
  const declarations = node => checker.getSymbolAtLocation(node)?.declarations ?? [];
  const isReceiver = node => declarations(node).some(declaration => receivers.has(declaration));
  for (const path of paths) {
    const source = program.getSourceFile(join(root, path));
    assert.equal(source.parseDiagnostics.length, 0);
    const imports = source.statements.filter(ts.isImportDeclaration).filter(node =>
      node.moduleSpecifier.text === '@angular/core' && node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)).flatMap(node =>
      node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === 'NgZone'));
    if (!imports.length) continue;
    assert.equal(imports.length, 1, 'ambiguous public NgZone import');
    const binding = imports[0], symbol = checker.getSymbolAtLocation(binding.name), references = [];
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName &&
          checker.getSymbolAtLocation(node) === symbol) {
        const parent = node.parent;
        let role, context;
        if (ts.isTypeReferenceNode(parent) && parent.typeName === node && !parent.typeArguments) {
          context = parent.parent;
          while (ts.isUnionTypeNode(context)) context = context.parent;
          if (ts.isParameter(context) || ts.isPropertyDeclaration(context) || ts.isPropertySignature(context)) {
            receivers.add(context); role = 'typed-receiver:' + ts.SyntaxKind[context.kind];
          } else {
            assert.ok(ts.isFunctionDeclaration(context), 'unreviewed NgZone type context');
            factories.add(context); role = 'owned-factory-return';
          }
        } else if (ts.isCallExpression(parent) && parent.arguments[0] === node) {
          const target = declarations(parent.expression).find(ts.isImportSpecifier);
          assert.ok(target && (target.propertyName || target.name).text === 'inject' &&
            target.parent.parent.parent.moduleSpecifier.text === '@angular/core', 'nonpublic NgZone injection');
          role = 'public-inject-token'; context = parent;
        } else {
          assert.ok(ts.isExpressionWithTypeArguments(parent) && parent.expression === node &&
            path === prefix + 'internal/testing/owned-test-events.ts' &&
            parent.parent.token === ts.SyntaxKind.ExtendsKeyword, 'unreviewed runtime NgZone reference');
          role = 'historical-test-helper-parent'; context = parent;
        }
        references.push({...locate(node), role, context: context.getText(source)});
      }
      ts.forEachChild(node, visit);
    }
    visit(source); assert.ok(references.length, 'unused NgZone import');
    const file = path.slice(prefix.length);
    cases.push({file, source_sha256: hash(source.text), local_name: binding.name.text,
      frozen: frozen.some(row => row.file === file), testing_only: file.startsWith('internal/testing/'), references});
  }
  assert.deepEqual(cases.filter(row => row.frozen).map(row => row.file).sort(), frozen.map(row => row.file).sort());
  assert.deepEqual(cases.filter(row => !row.frozen).map(row => row.file).sort(), additions);
  // Follow local aliases and destructuring of the explicitly typed receiver. This
  // includes snack completion, the dialog focus options, and the tab-body factory.
  let changed = true;
  while (changed) {
    changed = false;
    for (const path of paths) {
      const source = program.getSourceFile(join(root, path));
      function visit(node) {
        let known = false;
        if ((ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)) && node.initializer) {
          known = isReceiver(node.initializer) || (ts.isCallExpression(node.initializer) &&
            declarations(node.initializer.expression).some(declaration => factories.has(declaration)));
        } else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent) &&
                   ts.isVariableDeclaration(node.parent.parent) && node.parent.parent.initializer) {
          const key = node.propertyName || node.name;
          if (ts.isIdentifier(key)) known = checker.getPropertyOfType(
            checker.getTypeAtLocation(node.parent.parent.initializer), key.text)?.declarations?.some(
              declaration => receivers.has(declaration));
        }
        if (known && !receivers.has(node)) {receivers.add(node); changed = true;}
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  const accesses = [], forwarding = [];
  for (const path of paths) {
    const source = program.getSourceFile(join(root, path));
    function visit(node) {
      if (ts.isElementAccessExpression(node) && isReceiver(node.expression)) {
        assert.fail('computed NgZone member needs explicit review');
      }
      if (ts.isPropertyAccessExpression(node) && isReceiver(node.expression)) {
        assert.ok(members.has(node.name.text), 'NgZone member outside reviewed scope: ' + node.name.text);
        accesses.push({...locate(node), member: node.name.text, expression: node.getText(source),
          source_sha256: hash(source.text), receiver_declarations: declarations(node.expression)
            .filter(declaration => receivers.has(declaration)).map(locate)});
      }
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) for (const argument of node.arguments || []) if (isReceiver(argument)) {
        forwarding.push({...locate(argument), target: node.expression.getText(source),
          kind: ts.isNewExpression(node) ? 'construct' : 'call',
          argument: argument.getText(source), source_sha256: hash(source.text)});
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.equal(accesses.length, 62, 'NgZone access roster changed; review the new contexts');
  assert.deepEqual(accesses.filter(row => row.file === 'legacy-core/ripple/ripple-renderer.ts')
    .map(({member,expression}) => ({member,expression})), Array.from({length:3}, () =>
      ({member:'runOutsideAngular',expression:'this._ngZone.runOutsideAngular'})),
    'Renderer enter/exit timer and pointer-up registration boundary changed');
  assert.equal(forwarding.length, 17, 'NgZone forwarding roster changed; review the new contexts: '+
    JSON.stringify(forwarding.filter(row=>row.kind==='construct').map(({file,target,argument})=>({file,target,argument}))));
  assert.deepEqual(forwarding.filter(row=>row.kind==='construct').map(({file,target,argument})=>({file,target,argument})),[
    {file:'legacy-chips/chip.ts',target:'RippleRenderer',argument:'_ngZone'},
    {file:'legacy-tabs/tab-nav-bar/tab-nav-bar.ts',target:'RippleRenderer',argument:'ngZone'},
  ],'constructed NgZone receiver roster changed');
  return {schema_version: 1, frozen_uses: frozen.length, current_uses: cases.length, cases,
    receiver_declarations: [...receivers].map(locate), accesses, forwarding, binding_parser: ts.version,
    source_override_used: !!readSource, new_frozen_use_closures: 0,
    limits: 'NoResolve checker records explicit receiver bindings, local aliases, owned return factories and typed option destructuring. It does not perform exhaustive escape analysis, compile the product, execute legacy callers, or establish native/packed/runtime-floor qualification.'};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inventoryNgZoneUses();
  const out = process.argv.indexOf('--report');
  if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({frozen_uses: report.frozen_uses, current_uses: report.current_uses,
    member_accesses: report.accesses.length, forwarding: report.forwarding.length,
    new_frozen_use_closures: 0}));
}
