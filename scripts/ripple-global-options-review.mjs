/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Six source/import boundaries. Component factories and rendered behavior are separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join, posix} from 'node:path';
const ts = createRequire(import.meta.url)('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
const prefix = 'projects/ngx-material-legacy/';
const printer = ts.createPrinter({removeComments: true});
const definitions = [
  ['legacy-chips/chip.ts', 'MatLegacyChip', 'chip'],
  ['legacy-tabs/internal/tab-nav-bar-base.ts', '_MatTabLinkBase', 'base'],
  ['legacy-tabs/tab-nav-bar/tab-nav-bar.ts', 'MatLegacyTabLink', 'link'],
];
const symbols = ['MAT_RIPPLE_GLOBAL_OPTIONS', 'RippleGlobalOptions'];
const parse = (name, text) => {
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0, 'invalid ripple options source');
  return source;
};
const owner = (source, name) => {
  const found = source.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === name);
  assert.equal(found.length, 1, 'missing/ambiguous ripple options owner');
  return found[0];
};
const constructor = node => {
  const found = node.members.filter(node => ts.isConstructorDeclaration(node) && node.body);
  assert.equal(found.length, 1);
  return found[0];
};
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
const clean = modifiers => modifiers?.filter(node => !ts.isDecorator(node));

// Tokens preserve literal content while ignoring quote style and trivia.
function tokens(node, source) {
  const transformed = ts.transform(node, [context => root => ts.visitNode(root, function visit(node) {
    return ts.isStringLiteral(node) ? ts.factory.createStringLiteral(node.text) :
      ts.visitEachChild(node, visit, context);
  })]);
  try {
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard,
      print(transformed.transformed[0], source)), result = [];
    for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
      result.push([token, scanner.getTokenText()]);
    }
    return result;
  } finally { transformed.dispose(); }
}

/** Complete field/parameter initialization and constructor, plus the consumed getter. */
function phase(node, source) {
  const selected = node.members.filter(node => ts.isPropertyDeclaration(node) ||
    (ts.isConstructorDeclaration(node) && node.body) ||
    ['rippleDisabled', '_addHostClassName'].includes(node.name?.getText(source)));
  const transformed = ts.transform(selected, [context => root => ts.visitNode(root, function visit(node) {
    return ts.isDecorator(node) ? undefined : ts.visitEachChild(node, visit, context);
  })]);
  try {
    const copy = ts.factory.updateClassDeclaration(node, undefined, node.name, undefined,
      [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword,
        [ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier('Parent'), undefined)])],
      transformed.transformed);
    const emitted = ts.transpileModule(print(copy, source), {compilerOptions: {
      target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS, removeComments: true,
    }, reportDiagnostics: true});
    assert.equal(emitted.diagnostics.length, 0);
    return emitted.outputText;
  } finally { transformed.dispose(); }
}

function originals(root) {
  const path = 'compatibility/rc/ng-zone-forwarding-original-subjects.json';
  const bytes = readFileSync(join(root, path));
  assert.equal(hash(bytes), 'a134254a08ca621a5fef6b97c8b6da028d595f1120c8558d4d56f2d0d1740b92');
  const capsule = JSON.parse(bytes);
  assert.equal(capsule.archive_sri_rehashed, true);
  assert.equal(capsule.archive_sha256, 'de41309d20b1d98a7fd6d028a7de42853ea2d453a329c7a8815aaf73ea7f365b');
  const result = {};
  for (const [key, memberName, className] of [
    ['base', 'tabs', '_MatTabLinkBase'], ['link', 'legacy-tabs', 'MatLegacyTabLink'],
  ]) {
    const member = capsule.members.find(member => member.archive_member === 'package/fesm2022/' + memberName + '.mjs');
    assert.ok(member);
    const raw = gunzipSync(Buffer.from(member.gzip_base64, 'base64'));
    assert.equal(hash(raw), member.sha256); assert.equal(raw.length, member.bytes);
    const source = parse(member.archive_member, raw.toString());
    result[key] = {source, node: owner(source, className), provenance: {path, capsule_sha256: hash(bytes),
      archive_member: member.archive_member, sha256: member.sha256}};
  }
  const chipPath = 'reference/material-16.2.14/chips-keyboard-sources/chip.ts';
  const chip = readFileSync(join(root, chipPath), 'utf8');
  assert.equal(hash(chip), 'a3809031dbb69a835b3766f2af6052073939bab62a70161fe57e39260377fe5a');
  const source = parse(chipPath, chip);
  result.chip = {source, node: owner(source, 'MatLegacyChip'),
    provenance: {path: chipPath, sha256: hash(chip)}};
  return result;
}

export function reviewRippleGlobalOptionSources({root = process.cwd(), readSource} = {}) {
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const options = {noResolve: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    experimentalDecorators: true};
  const host = ts.createCompilerHost(options), oldRead = host.readFile.bind(host);
  const paths = definitions.map(([file]) => join(root, prefix + file));
  host.readFile = path => paths.includes(path) ? read(prefix + path.slice(join(root, prefix).length)) : oldRead(path);
  const program = ts.createProgram(paths, options, host), checker = program.getTypeChecker();
  const historical = originals(root), cases = [], payload = [];
  for (const [file, name, family] of definitions) {
    const source = program.getSourceFile(join(root, prefix + file)), node = owner(source, name);
    assert.equal(source.parseDiagnostics.length, 0);
    const ctor = constructor(node), old = historical[family];
    const parameter = ctor.parameters.find(parameter => parameter.name.getText(source) === 'globalRippleOptions');
    assert.ok(parameter); assert.equal(print(parameter.type, source), 'RippleGlobalOptions | null');
    const decorators = ts.getDecorators(parameter) || [];
    assert.deepEqual(decorators.map(decorator => print(decorator, source)),
      ['@Optional()', '@Inject(MAT_RIPPLE_GLOBAL_OPTIONS)']);
    for (const symbol of symbols) {
      const bindings = source.statements.filter(ts.isImportDeclaration).filter(node =>
        node.moduleSpecifier.text === '@angular/material/core' && node.importClause?.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings)).flatMap(node =>
        node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === symbol));
      assert.equal(bindings.length, 1, 'missing/ambiguous public ripple options import');
      const binding = bindings[0], bound = checker.getSymbolAtLocation(binding.name), references = [];
      assert.deepEqual(bound.declarations, [binding]);
      function visit(current) {
        if (ts.isIdentifier(current) && current !== binding.name && current !== binding.propertyName &&
            checker.getSymbolAtLocation(current) === bound) {
          const parent = current.parent;
          if (symbol === symbols[0]) {
            assert.ok(ts.isCallExpression(parent) && parent.arguments.length === 1 &&
              parent.arguments[0] === current && parent.expression.getText(source) === 'Inject' &&
              ts.isDecorator(parent.parent) && parent.parent.parent === parameter,
              'ripple token escapes the exact constructor decorator');
            assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly);
          } else {
            assert.ok(ts.isTypeReferenceNode(parent) && parent.typeName === current && !parent.typeArguments,
              'ripple option type escapes an erased type reference');
            const context = parent.parent;
            assert.ok((ts.isUnionTypeNode(context) && context === parameter.type) ||
              (ts.isIntersectionTypeNode(context) && ts.isPropertyDeclaration(context.parent) &&
                context.parent.name.getText(source) === 'rippleConfig' && context.parent.parent === node),
              'new ripple option type context');
          }
          references.push({kind: ts.SyntaxKind[parent.kind], expression: print(parent, source)});
        }
        ts.forEachChild(current, visit);
      }
      visit(source);
      assert.equal(references.length, symbol === symbols[0] || family === 'link' ? 1 : 2);
      // Reexports are additional authored roles, never silently covered by this import review.
      assert.ok(!source.statements.some(item => ts.isExportDeclaration(item) &&
        item.exportClause && ts.isNamedExports(item.exportClause) && item.exportClause.elements.some(
          item => symbols.includes((item.propertyName || item.name).text))), 'new options reexport');
      let erased;
      if (symbol === symbols[1]) {
        const declaration = binding.parent.parent.parent;
        const copy = ts.factory.updateImportDeclaration(declaration, declaration.modifiers,
          ts.factory.updateImportClause(declaration.importClause, declaration.importClause.isTypeOnly,
            declaration.importClause.name, ts.factory.updateNamedImports(binding.parent,
              binding.parent.elements.filter(item => item !== binding))), declaration.moduleSpecifier,
          declaration.attributes);
        const replaced = source.text.slice(0, declaration.getStart(source)) + print(copy, source) +
          source.text.slice(declaration.end);
        const emit = text => ts.transpileModule(text, {compilerOptions: options}).outputText;
        assert.equal(emit(source.text), emit(replaced), 'options interface has an executable role');
        erased = hash(emit(source.text));
      }
      cases.push({file, module: '@angular/material/core', symbol, class_name: name, family,
        candidate_source_sha256: hash(source.text), references, emitted_js_type_import_erased_sha256: erased});
    }
    const currentPhase = phase(node, source), originalPhase = family === 'chip' ? phase(old.node, old.source) :
      'class ' + name + ' extends Parent {' + constructor(old.node).getText(old.source) +
        (old.node.members.find(item => item.name?.getText(old.source) === 'rippleDisabled')?.getText(old.source) || '') + '}';
    if (family === 'chip') {
      assert.deepEqual(tokens(ctor, source), tokens(constructor(old.node), old.source),
        'complete chip constructor differs from untouched source');
      const helper = node.members.find(item => item.name?.getText(source) === '_addHostClassName');
      const oldHelper = old.node.members.find(item => item.name?.getText(old.source) === '_addHostClassName');
      assert.deepEqual(tokens(helper, source), tokens(oldHelper, old.source));
    } else {
      const emitted = parse('phase.js', currentPhase), currentCtor = constructor(owner(emitted, name));
      if (family === 'base') {
        const id = currentCtor.body.statements.filter(statement => ts.isExpressionStatement(statement) &&
          ts.isBinaryExpression(statement.expression) && statement.expression.left.getText(emitted) === 'this.id');
        assert.equal(id.length, 1);
        assert.equal(id[0].getText(emitted), 'this.id = `mat-tab-link-${nextUniqueId++}-legacy`;');
        const restored = currentPhase.slice(0, id[0].getStart(emitted)) +
          'this.id = `mat-tab-link-${nextUniqueId++}`;' + currentPhase.slice(id[0].end);
        const restoredSource = parse('original-id-only.js', restored);
        assert.deepEqual(tokens(constructor(owner(restoredSource, name)), restoredSource),
          tokens(constructor(old.node), old.source), 'complete tab base construction differs beyond owned id suffix');
      } else {
        assert.deepEqual(tokens(currentCtor, emitted), tokens(constructor(old.node), old.source),
          'complete tab link constructor differs from untouched source');
      }
    }
    if (family !== 'link') {
      const getter = node.members.find(item => item.name?.getText(source) === 'rippleDisabled');
      const oldGetter = old.node.members.find(item => item.name?.getText(old.source) === 'rippleDisabled');
      const emit = (getter, source) => {
        const s = parse('getter.js', ts.transpileModule('class R {' + print(getter, source) + '}',
          {compilerOptions: {target: ts.ScriptTarget.ES2015}}).outputText);
        return tokens(owner(s, 'R').members[0], s);
      };
      assert.deepEqual(emit(getter, source), emit(oldGetter, old.source), 'historical disabled getter changed');
    }
    payload.push({file, name, family, current: currentPhase, original: originalPhase,
      original_provenance: old.provenance, full_construction_comparison: family === 'base' ?
        'exact except independently enumerated owned id suffix' : 'exact constructor',
      global_options_parameter_index: ctor.parameters.indexOf(parameter)});
  }
  return {schema_version: 1, cases, payload, source_override_used: !!readSource,
    limits: 'Six exact imports across three classes. Whole construction phases execute with explicit base/ripple/DOM protocols; original constructors and consumed getters are independent oracles. This is not Angular component factories, native DOM, renderer lifecycle, packed output or full runtime/compiler/RxJS floor qualification.'};
}

/** Follow the actual public types route, including named imports/reexports. */
export function resolveRipplePublicType(model, name) {
  const manifest = model.packages.get('@angular/material');
  const pick = value => typeof value === 'string' ? value : value?.types && pick(value.types);
  const route = pick(manifest.exports['./core']); assert.equal(typeof route, 'string');
  const seen = new Set();
  function resolve(path, binding) {
    const key = '@angular/material/' + path, identity = key + '#' + binding;
    assert.equal(seen.has(identity), false, 'ripple declaration cycle'); seen.add(identity);
    const text = model.sources.get(key); assert.equal(typeof text, 'string');
    const source = parse(key, text);
    for (const statement of source.statements) {
      if (ts.isInterfaceDeclaration(statement) && statement.name.text === binding) {
        return {source, node: statement, statement, chain: [identity]};
      }
      if (ts.isVariableStatement(statement)) {
        const node = statement.declarationList.declarations.find(node => node.name.getText(source) === binding);
        if (node) return {source, node, statement, chain: [identity]};
      }
    }
    for (const statement of source.statements) {
      const clause = ts.isExportDeclaration(statement) ? statement.exportClause :
        ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings : undefined;
      if (!clause || (!ts.isNamedExports(clause) && !ts.isNamedImports(clause))) continue;
      const item = clause.elements.find(item => item.name.text === binding); if (!item) continue;
      const spec = statement.moduleSpecifier?.text;
      assert.ok(!spec || spec.startsWith('./'), 'unreviewed options declaration route');
      const next = spec ? posix.normalize(posix.join(posix.dirname(path), spec.replace(/\.js$/, '.d.ts'))) : path;
      const found = resolve(next, (item.propertyName || item.name).text); found.chain.unshift(identity); return found;
    }
    assert.fail('public ripple declaration missing: ' + binding);
  }
  return resolve(route.replace(/^\.\//, ''), name);
}

export function reviewRipplePublicTypes(model) {
  const result = {}, stable = node => assert.ok(!ts.getJSDocTags(node).some(tag =>
    ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(tag.tagName.text)),
  'unstable public options API');
  for (const name of [...symbols, 'RippleAnimationConfig']) {
    const resolved = resolveRipplePublicType(model, name); stable(resolved.statement);
    if (name === symbols[0]) assert.equal(print(resolved.node.type, resolved.source), 'InjectionToken<RippleGlobalOptions>');
    else {
      assert.equal(resolved.node.heritageClauses, undefined);
      const members = resolved.node.members.map(member => {
        stable(member); assert.ok(ts.isPropertySignature(member) && member.questionToken && !member.modifiers?.length);
        return [member.name.getText(resolved.source), print(member.type, resolved.source)];
      });
      const expected = name === 'RippleAnimationConfig' ? [['enterDuration', 'number'], ['exitDuration', 'number']] :
        [['disabled', 'boolean'], ['animation', 'RippleAnimationConfig'], ['terminateOnPointerUp', 'boolean'],
          ...(model.line === 'original' ? [] : [['namespace', 'string']])];
      assert.deepEqual(members, expected, 'public options contract changed');
      result[name] = members;
    }
    result[name + '_declaration'] = {chain: resolved.chain, source_sha256: hash(resolved.source.text),
      declaration: print(resolved.statement, resolved.source)};
  }
  return {line: model.line, material_version: manifestVersion(model), ...result,
    historical_fields_identical: true, namespace_is_current_optional_extension: model.line !== 'original'};
}
function manifestVersion(model) { return model.packages.get('@angular/material').version; }
