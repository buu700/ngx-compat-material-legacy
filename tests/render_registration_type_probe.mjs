/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Twenty render-helper imports: actual declarations and retained runtime evidence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {renderInjectorRecipes, reviewRenderInjectorUses} from '../scripts/injector-render-use-review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const read = path => readFileSync(join(root, path), 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
const parse = (path, text) => {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  return source;
};

function helperImports(recipe, text) {
  const source = parse(recipe.file, text), symbols = ['AfterRenderRef', 'ApplicationRef', 'NgZone', recipe.render];
  const declarations = source.statements.filter(ts.isImportDeclaration)
    .filter(n => n.moduleSpecifier.text === '@angular/core');
  const imports = declarations.flatMap(n => n.importClause.namedBindings.elements);
  const rendered = [];
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'rendered') rendered.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(rendered.length, 1);
  assert.equal(rendered[0].type.getText(source), 'AfterRenderRef | null');
  assert.equal(rendered[0].initializer.getText(source), 'null');
  const emitted = parse(recipe.file + '.mjs', ts.transpileModule(text,
    {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText);
  const runtimeImports = emitted.statements.filter(ts.isImportDeclaration)
    .filter(n => n.moduleSpecifier.text === '@angular/core')
    .flatMap(n => n.importClause.namedBindings.elements.map(e => (e.propertyName || e.name).text));
  return symbols.map(symbol => {
    const matches = imports.filter(n => (n.propertyName || n.name).text === symbol);
    assert.equal(matches.length, 1); assert.equal(matches[0].name.text, symbol);
    const typeOnly = ['AfterRenderRef', 'NgZone'].includes(symbol);
    assert.equal(Boolean(matches[0].isTypeOnly || matches[0].parent.parent.isTypeOnly), typeOnly);
    assert.equal(runtimeImports.includes(symbol), !typeOnly);
    return {file: recipe.file, module: '@angular/core', symbol, type_only: typeOnly,
      candidate_source_sha256: hash(text), family: recipe.family};
  });
}

function receiptBinding(recipe, body) {
  assert.equal(body.line, line); assert.equal(body.g11_claim, 'not-passed');
  assert.equal(body.sources.filter(s => s.path === 'projects/ngx-material-legacy/' + recipe.file).length, 1);
  for (const source of body.sources) assert.equal(hash(read(source.path)), source.sha256);
  const current = body.results.filter(r => r.line !== 'original');
  assert.equal(body.results.length, 10); assert.equal(current.length, 8);
  assert.deepEqual([...new Set(current.map(r => r.line))].sort(), ['21.x', 'main']);
  for (const result of current) {
    assert.equal(result.genuine_public_application, true);
    assert.equal(result.native_executed, false);
  }
  return {family: recipe.family, path: 'compatibility/rc/injector-render-' + recipe.family + '-current-diagnostic.json',
    source_bound: true, retained_contexts: body.results.length,
    retained_current_application_contexts: current.length,
    retained_mutants: body.results.reduce((n, r) => n + r.mutations.length, 0),
    runtime_rerun_in_this_probe: false};
}

reviewRenderInjectorUses({root});
const uses = [], receipts = [];
let controls = 0;
for (const recipe of renderInjectorRecipes) {
  const text = read('projects/ngx-material-legacy/' + recipe.file);
  uses.push(...helperImports(recipe, text));
  assert.throws(() => helperImports(recipe, text.replace('rendered: AfterRenderRef | null', 'rendered: any'))); controls++;
  assert.throws(() => helperImports(recipe, text.replace('type AfterRenderRef', 'AfterRenderRef'))); controls++;
  const receiptPath = 'compatibility/rc/injector-render-' + recipe.family + '-current-diagnostic.json';
  const body = JSON.parse(read(receiptPath));
  receipts.push({...receiptBinding(recipe, body), sha256: hash(read(receiptPath))});
  const changed = structuredClone(body);
  changed.results.find(r => r.line !== 'original').genuine_public_application = false;
  assert.throws(() => receiptBinding(recipe, changed)); controls++;
}
assert.equal(uses.length, 20);
const loaded = prepareMaterialPublicSubjects(root), types = [];
try {
  for (const receipt of receipts) assert.equal(JSON.parse(read(receipt.path)).namespace_capsule_sha256, loaded.capsule_hash);
  for (const model of loaded.models.filter(m => m.line !== 'original')) {
    const directory = join(model.root, 'render-registration-types'); mkdirSync(directory);
    const paths = renderInjectorRecipes.map((recipe, index) => {
      const path = join(directory, 'helper-' + index + '.ts');
      writeFileSync(path, read('projects/ngx-material-legacy/' + recipe.file)); return path;
    });
    const fixture = join(directory, 'consumer.ts');
    writeFileSync(fixture, `import {AfterRenderRef, ApplicationRef, NgZone} from '@angular/core';
declare const ref: AfterRenderRef, zone: NgZone, application: ApplicationRef;
const stable: boolean = zone.isStable;
zone.onStable.subscribe(() => {}); zone.onMicrotaskEmpty.subscribe(() => {});
ref.destroy(); const token: typeof ApplicationRef = ApplicationRef;
// @ts-expect-error Render cancellation has no argument protocol.
ref.destroy('cancel');
// @ts-expect-error A registration cannot supply the full application protocol.
const wrong: ApplicationRef = ref;
// @ts-expect-error Zone stability is a boolean, not a readiness function.
zone.isStable();
`);
    const program = ts.createProgram([...paths, fixture], {target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true, noEmit: true, skipLibCheck: false, types: [], lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics,
      {getCanonicalFileName: p => p, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    const checker = program.getTypeChecker(), declarations = [], calls = [];
    const stable = symbol => {
      assert.ok(symbol); assert.ok(!symbol.getJsDocTags(checker).some(t => ['deprecated', 'experimental', 'internal'].includes(t.name)));
    };
    for (const [index, path] of paths.entries()) {
      const source = program.getSourceFile(path), recipe = renderInjectorRecipes[index];
      const imports = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === '@angular/core')
        .flatMap(n => n.importClause.namedBindings.elements);
      for (const binding of imports.filter(n => uses.some(u => u.file === recipe.file && u.symbol === n.name.text))) {
        const symbol = checker.getAliasedSymbol(checker.getSymbolAtLocation(binding.name)); stable(symbol);
        const definitions = symbol.getDeclarations(); assert.ok(definitions.length);
        for (const declaration of definitions) {
          const modulePath = relative(join(model.root, 'node_modules'), declaration.getSourceFile().fileName);
          assert.ok(modulePath.startsWith('@angular/core/'));
          assert.equal(hash(declaration.getSourceFile().text), hash(model.sources.get(modulePath)));
          declarations.push({helper: recipe.file, symbol: binding.name.text, path: modulePath,
            source_sha256: hash(declaration.getSourceFile().text), tags: symbol.getJsDocTags(checker).map(t => t.name),
            declaration: declaration.getText(declaration.getSourceFile())});
        }
      }
      const visit = node => {
        if (ts.isCallExpression(node) && (node.expression.getText(source) === recipe.render ||
            node.expression.getText(source) === 'rendered?.destroy')) {
          const signature = checker.getResolvedSignature(node); assert.ok(signature);
          assert.ok(!signature.getJsDocTags().some(t => t.name === 'deprecated'));
          const declaration = signature.getDeclaration(); assert.ok(declaration);
          calls.push({helper: recipe.file, call: node.expression.getText(source),
            signature: declaration.getText(declaration.getSourceFile()),
            declaration_sha256: hash(declaration.getSourceFile().text)});
        }
        if (ts.isPropertyAccessExpression(node) && node.expression.getText(source) === 'zone') stable(checker.getSymbolAtLocation(node.name));
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    assert.equal(calls.length, 10);
    const unique = new Map();
    for (const {helper, ...definition} of declarations) {
      const key = JSON.stringify(definition);
      if (!unique.has(key)) unique.set(key, {...definition, helpers: []});
      if (!unique.get(key).helpers.includes(helper)) unique.get(key).helpers.push(helper);
    }
    types.push({line: model.line, core_version: model.packages.get('@angular/core').version,
      strict: true, skipLibCheck: false, diagnostics: 0, negative_types: 3,
      declarations: [...unique.values()], calls});
  }
  const report = {schema_version: 1, line, node: process.version, compiler: ts.version,
    uses, source_and_receipt_negative_controls: controls, types, retained_runtime_receipts: receipts,
    namespace_capsule_sha256: loaded.capsule_hash, producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))),
    limits: ['Twenty dependency judgments on five unchanged helper modules. Whole authenticated current Core declarations and exact resolved calls are checked with borrowed compiler/RxJS/tslib.',
      'Prior source-bound runtime receipts retain their original execution provenance. Their protocol geometry/parents, replayed members and genuine current applications do not qualify actual legacy Angular instances/node DI, native paint, packed/AOT or complete consumer floors. No runtime replay is rerun or restamped by this probe.'],
    g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({uses: uses.length, source_and_receipt_negative_controls: controls,
    strict_current_declaration_subjects: types.length, stable_resolved_calls: types.reduce((n, t) => n + t.calls.length, 0),
    retained_runtime_contexts: receipts.reduce((n, r) => n + r.retained_contexts, 0),
    retained_runtime_mutants: receipts.reduce((n, r) => n + r.retained_mutants, 0), runtime_rerun: false, g11_claim: 'not-passed'}));
} finally { loaded.dispose(); }
