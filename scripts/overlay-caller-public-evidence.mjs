/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bounded overlay declaration evidence; this is not whole-caller type checking. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const ts = createRequire(import.meta.url)('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
const unstable = new Set(['deprecated', 'docs-private', 'experimental', 'developerPreview', 'breaking-change']);

export const overlayFactorySubjects = [
  ['dialog', 'legacy-dialog/dialog.ts', 'MAT_LEGACY_DIALOG_SCROLL_STRATEGY_PROVIDER_FACTORY', 'MAT_DIALOG_SCROLL_STRATEGY_PROVIDER_FACTORY'],
  ['autocomplete', 'legacy-autocomplete/internal/autocomplete-trigger-base.ts', 'MAT_AUTOCOMPLETE_SCROLL_STRATEGY_FACTORY', 'MAT_AUTOCOMPLETE_SCROLL_STRATEGY_FACTORY'],
  ['menu', 'legacy-menu/internal/menu-trigger-base.ts', 'MAT_MENU_SCROLL_STRATEGY_FACTORY', 'MAT_MENU_SCROLL_STRATEGY_FACTORY'],
  ['select', 'legacy-select/internal/select-base.ts', 'MAT_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY', 'MAT_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY'],
  ['tooltip', 'legacy-tooltip/internal/tooltip-base.ts', 'MAT_TOOLTIP_SCROLL_STRATEGY_FACTORY', 'MAT_TOOLTIP_SCROLL_STRATEGY_FACTORY'],
];

export function overlayFactorySource(root, references) {
  const functions = [], provenance = [];
  for (const [family, file, name, taggedName] of overlayFactorySubjects) {
    const path = 'projects/ngx-material-legacy/' + file;
    const text = readFileSync(join(root, path), 'utf8');
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    const declaration = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.ok(declaration?.body, 'missing complete owned factory ' + name);
    const tagged = references.subjects.find(s => s.family === family);
    assert.equal(tagged.name, taggedName);
    const original = ts.createSourceFile('tagged.ts', tagged.declaration, ts.ScriptTarget.Latest, true);
    assert.equal(original.parseDiagnostics.length, 0);
    const reference = original.statements.find(ts.isFunctionDeclaration);
    assert.equal(reference.name.text, taggedName);
    assert.equal(declaration.body.getText(source), reference.body.getText(original), 'owned factory differs from untouched tagged body');
    const currentText = declaration.getText(source);
    const referenceText = reference.getText(original);
    functions.push(currentText.replace(name, 'current_' + family));
    functions.push(referenceText.replace(taggedName, 'tagged_' + family));
    provenance.push({family, path, name, tagged_name: taggedName, source_sha256: hash(text),
      complete_declaration_sha256: hash(currentText), body_sha256: hash(declaration.body.getText(source)),
      tagged_declaration_sha256: hash(referenceText), bodies_identical: true});
  }
  return {source: "import {Overlay,ScrollStrategy} from '@angular/cdk/overlay';\n" +
    'const SCROLL_THROTTLE_MS = 20; // Explicit numeric protocol; the Material tooltip constant has a separate open obligation.\n' +
    functions.join('\n'), provenance};
}

export function inspectOverlayCallerPublicMembers({root, model, facts, factorySource}) {
  const path = join(model.root, 'public-overlay.ts');
  writeFileSync(path, "import * as peer from '@angular/cdk/overlay';\n" + factorySource);
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: false, noEmit: true, types: []};
  const program = ts.createProgram([path], options), diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics,
    {getCanonicalFileName: p => p, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
  const checker = program.getTypeChecker(), source = program.getSourceFile(path);
  const namespace = checker.getSymbolAtLocation(source.statements[0].moduleSpecifier);
  const exports = new Map(checker.getExportsOfModule(namespace).map(s => [s.name, s]));
  const symbols = [], members = [], gaps = [];
  function stable(symbol, expression) {
    const tags = symbol.getJsDocTags(checker).map(t => t.name);
    assert.ok(tags.every(t => !unstable.has(t)), 'unstable public overlay surface ' + expression + ':' + tags.join(','));
    const declarations = symbol.getDeclarations() ?? [];
    assert.ok(declarations.length);
    for (const d of declarations) assert.ok(!d.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword), 'inaccessible overlay member ' + expression);
    return {tags, declarations: declarations.map(d => ({sha256: hash(d.getText(d.getSourceFile()))}))};
  }
  for (const name of [...new Set([...facts.map(f => f.symbol), 'BlockScrollStrategy', 'RepositionScrollStrategy'])].sort()) {
    let symbol = exports.get(name);
    assert.ok(symbol, 'missing public overlay export ' + name);
    if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    symbols.push({name, ...stable(symbol, name)});
  }
  for (const fact of facts) {
    let symbol = exports.get(fact.symbol);
    if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const start = checker.getDeclaredTypeOfSymbol(symbol);
    const file = 'projects/ngx-material-legacy/' + fact.file;
    const text = readFileSync(join(root, file), 'utf8');
    assert.equal(hash(text), fact.candidate_source_sha256);
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const localOptions = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, noResolve: true, noLib: true, types: []};
    const host = ts.createCompilerHost(localOptions);
    host.getSourceFile = p => p.endsWith(file) ? sf : undefined;
    const locals = ts.createProgram([file], localOptions, host).getTypeChecker();
    const binding = sf.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === fact.module)
      .flatMap(n => n.importClause?.namedBindings?.elements ?? []).find(n => (n.propertyName ?? n.name).text === fact.symbol);
    assert.ok(binding);
    const importSymbol = locals.getSymbolAtLocation(binding.name), roots = new Set(), aliases = new Map(), seen = new Set();
    const importedTypes = new Map();
    for (const declaration of sf.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === fact.module)) {
      for (const imported of declaration.importClause?.namedBindings?.elements ?? []) {
        let target = exports.get((imported.propertyName ?? imported.name).text);
        if (!target) continue;
        if (target.flags & ts.SymbolFlags.Alias) target = checker.getAliasedSymbol(target);
        importedTypes.set(locals.getSymbolAtLocation(imported.name), checker.getDeclaredTypeOfSymbol(target));
      }
    }
    function visit(n, callback) { callback(n); ts.forEachChild(n, child => visit(child, callback)); }
    visit(sf, n => {
      if (!ts.isIdentifier(n) || n === binding.name || locals.getSymbolAtLocation(n) !== importSymbol) return;
      let d = n;
      while (d && !ts.isParameter(d) && !ts.isPropertyDeclaration(d) && !ts.isVariableDeclaration(d) && !ts.isSourceFile(d)) d = d.parent;
      if (d?.name && ts.isIdentifier(d.name)) roots.add(locals.getSymbolAtLocation(d.name));
    });
    roots.delete(undefined);
    for (const rootSymbol of roots) aliases.set(rootSymbol, start);
    function resolve(n, record = false) {
      if (ts.isNonNullExpression(n) || ts.isParenthesizedExpression(n)) return resolve(n.expression, record);
      if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) {
        const input = resolve(n.expression, record);
        if (!input) return;
        if (ts.isTypeReferenceNode(n.type) && ts.isIdentifier(n.type.typeName)) {
          const asserted = importedTypes.get(locals.getSymbolAtLocation(n.type.typeName));
          if (asserted) return asserted;
        }
        return input;
      }
      if (ts.isIdentifier(n)) return aliases.get(locals.getSymbolAtLocation(n));
      if (ts.isPropertyAccessExpression(n) && n.expression.kind === ts.SyntaxKind.ThisKeyword) return aliases.get(locals.getSymbolAtLocation(n.name));
      if (ts.isCallExpression(n)) {
        const type = resolve(n.expression, record);
        if (!type) return;
        const signatures = checker.getSignaturesOfType(checker.getNonNullableType(type), ts.SignatureKind.Call);
        // This deliberately does not resolve argument-dependent overloads.
        if (signatures.length === 1) return checker.getReturnTypeOfSignature(signatures[0]);
        return;
      }
      if (!ts.isPropertyAccessExpression(n)) return;
      const parent = resolve(n.expression, record);
      if (!parent) return;
      const type = checker.getNonNullableType(parent), property = type.getProperty(n.name.text);
      if (!property) {
        if (record && !seen.has('gap:' + n.getText(sf))) {gaps.push({file, symbol: fact.symbol, expression: n.getText(sf), type: checker.typeToString(type)}); seen.add('gap:' + n.getText(sf));}
        return;
      }
      const declaration = property.getDeclarations()?.[0];
      if (!declaration?.getSourceFile().fileName.includes('/@angular/')) return;
      const key = n.name.text + ':' + declaration.getText(declaration.getSourceFile());
      if (record && !seen.has(key)) {
        members.push({file, symbol: fact.symbol, expression: n.getText(sf), property: n.name.text, ...stable(property, n.getText(sf))});
        seen.add(key);
      }
      return checker.getTypeOfSymbolAtLocation(property, declaration);
    }
    // Follow only lexical variable aliases whose Angular type can be obtained
    // without choosing between overloads or manufacturing an owned class type.
    let changed = true;
    while (changed) {
      changed = false;
      visit(sf, n => {
        if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || !n.initializer) return;
        const alias = locals.getSymbolAtLocation(n.name);
        if (aliases.has(alias)) return;
        const type = resolve(n.initializer);
        if (type && alias) {aliases.set(alias, type); changed = true;}
      });
    }
    visit(sf, n => {if (ts.isPropertyAccessExpression(n)) resolve(n, true);});
  }
  assert.deepEqual(gaps, [], 'unresolved traced public overlay member');
  const negative = join(model.root, 'invalid-overlay.ts');
  writeFileSync(negative, "import {OverlayRef,OriginConnectionPosition,Overlay} from '@angular/cdk/overlay';\n" +
    'declare const ref:OverlayRef;ref.updateSize({width:false});\n' +
    "const origin:OriginConnectionPosition={originX:'diagonal',originY:'center'};\n" +
    "declare const service:Overlay;service.scrollStrategies.reposition({scrollThrottle:'invalid'});\n");
  const bad = ts.getPreEmitDiagnostics(ts.createProgram([negative], options));
  assert.equal(bad.length, 3, bad.map(d => d.code + ':' + ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  assert.ok(bad.every(d => d.file?.fileName === negative && [2322,2345,2769].includes(d.code)));
  return {line: model.line, Core: model.packages.get('@angular/core').version,
    CDK: model.packages.get('@angular/cdk').version, strict: true, skipLibCheck: false, diagnostics: 0,
    factory_declarations_compiled: 10, negative_type_controls: bad.map(d => d.code), symbols, members, gaps,
    argument_dependent_overloads_qualified: false, whole_current_caller_source_compiled: false,
    scope: 'Export declarations, checker-bound annotated receivers,explicit public-overlay casts and finite lexical variable aliases only. Single-signature returns are followed. Cast correctness,calls and overload arguments outside the five complete factories,implicit method returns,template bindings and wider owned classes remain unqualified.'};
}
