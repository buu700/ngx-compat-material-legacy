/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** One exact owned checkbox NgZone caller; current component qualification is separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
const ts = createRequire(import.meta.url)('typescript'), hash = value => createHash('sha256').update(value).digest('hex');
const printer = ts.createPrinter({removeComments: true});
export const CHECKBOX_ZONE_BASE = 'projects/ngx-material-legacy/legacy-checkbox/internal/checkbox-base.ts';
export const CHECKBOX_ZONE_LEAF = 'projects/ngx-material-legacy/legacy-checkbox/checkbox.ts';
const parse = (name, text) => {
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;
};
const owner = (source, name) => {
  const matches = source.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1); return matches[0];
};
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);

export function emitCheckboxZoneClass(raw, name, parent, target = ts.ScriptTarget.ES2022) {
  const source = parse('checkbox-zone.ts', raw), node = owner(source, name);
  const replay = ts.factory.updateClassDeclaration(node, [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier('Replay'), undefined, [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword,
      [ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(parent), undefined)])],
    node.members.filter(member => {
      if (ts.isClassStaticBlockDeclaration(member)) {
        assert.ok(member.body.statements.every(statement => ts.isExpressionStatement(statement) &&
          ts.isBinaryExpression(statement.expression) && ts.isPropertyAccessExpression(statement.expression.left) &&
          ['ɵfac', 'ɵdir', 'ɵcmp'].includes(statement.expression.left.name.text)));
        return false;
      }
      return !(member.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword) &&
        ['ɵfac', 'ɵdir', 'ɵcmp'].includes(member.name?.getText(source)));
    }));
  const transformed = ts.transform(replay, [context => root => ts.visitNode(root, function visit(node) {
    return ts.isDecorator(node) ? undefined : ts.visitEachChild(node, visit, context);
  })]);
  try {
    const emitted = ts.transpileModule(print(transformed.transformed[0], source), {compilerOptions: {
      target, module: ts.ModuleKind.CommonJS}, reportDiagnostics: true});
    assert.equal(emitted.diagnostics.length, 0); return emitted.outputText;
  } finally { transformed.dispose(); }
}
function tokens(node, source) {
  const transformed = ts.transform(node, [context => root => ts.visitNode(root, function visit(node) {
    return ts.isStringLiteral(node) ? ts.factory.createStringLiteral(node.text) : ts.visitEachChild(node, visit, context);
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
const ctor = node => {
  const matches = node.members.filter(node => ts.isConstructorDeclaration(node) && node.body);
  assert.equal(matches.length, 1); return matches[0];
};

export function reviewCheckboxZoneUse({root = process.cwd(), readMember = path => readFileSync(join(root, path))} = {}) {
  const raw = readMember(CHECKBOX_ZONE_BASE).toString(), leaf = readMember(CHECKBOX_ZONE_LEAF).toString();
  const capsulePath = 'compatibility/rc/checkbox-timer-original-subject.json', bytes = readMember(capsulePath);
  assert.equal(hash(bytes), '5fd4014ac0c41c451308fef651a536131ae4bacd114548a4ef14e4e8824b9054');
  const capsule = JSON.parse(bytes); assert.equal(capsule.version, '16.2.14');
  assert.equal(capsule.archive_sha256, 'de41309d20b1d98a7fd6d028a7de42853ea2d453a329c7a8815aaf73ea7f365b');
  const original = gunzipSync(Buffer.from(capsule.gzip_base64, 'base64')).toString(); assert.equal(hash(original), capsule.sha256);
  const leafCapsulePath = 'compatibility/rc/ng-zone-forwarding-original-subjects.json', leafBytes = readMember(leafCapsulePath);
  assert.equal(hash(leafBytes), 'a134254a08ca621a5fef6b97c8b6da028d595f1120c8558d4d56f2d0d1740b92');
  const leafMember = JSON.parse(leafBytes).members.find(member => member.archive_member === 'package/fesm2022/legacy-checkbox.mjs');
  const originalLeaf = gunzipSync(Buffer.from(leafMember.gzip_base64, 'base64')).toString(); assert.equal(hash(originalLeaf), leafMember.sha256);
  const enumPath = 'projects/ngx-material-legacy/legacy-checkbox/owned-transition-state.ts';
  const enumReferencePath = 'reference/material-16.2.14/error-helper-sources/checkbox-transition-state.ts';
  const enumText = readMember(enumPath).toString(), enumReference = readMember(enumReferencePath).toString();
  assert.equal(hash(enumReference), 'edcbda55c944e8949b947b518619128be911acc620f2accdb8d6e70d0d6deddd');
  const enumSource = parse(enumPath, enumText), oldEnumSource = parse(enumReferencePath, enumReference);
  const enumNode = enumSource.statements.find(ts.isEnumDeclaration), oldEnum = oldEnumSource.statements.find(ts.isEnumDeclaration);
  assert.ok(enumNode && oldEnum); assert.deepEqual(tokens(enumNode, enumSource), tokens(oldEnum, oldEnumSource));
  assert.deepEqual(enumNode.members.map(member => member.name.getText(enumSource)), ['Init', 'Checked', 'Unchecked', 'Indeterminate']);
  assert.ok(enumNode.members.every(member => !member.initializer));
  const enumExports = {};
  new Function('exports', ts.transpileModule(enumText, {compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText)(enumExports);
  const enumValues = enumExports.TransitionCheckState;
  assert.deepEqual(['Init', 'Checked', 'Unchecked', 'Indeterminate'].map(name => enumValues[name]), [0, 1, 2, 3]);
  const options = {noResolve: true, noLib: true, target: ts.ScriptTarget.ES2022};
  const host = ts.createCompilerHost(options), oldRead = host.readFile.bind(host), absolute = join(root, CHECKBOX_ZONE_BASE);
  host.readFile = path => path === absolute ? raw : oldRead(path);
  const program = ts.createProgram([absolute], options, host), source = program.getSourceFile(absolute), checker = program.getTypeChecker();
  const cls = owner(source, '_MatCheckboxBase'), constructor = ctor(cls), parameter = constructor.parameters[3];
  const stateImport = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === '../owned-transition-state');
  assert.equal(stateImport.length, 1);
  assert.equal(stateImport[0].importClause.namedBindings.getText(source), '{TransitionCheckState}');
  assert.equal(constructor.parameters.length, 7); assert.equal(parameter.name.getText(source), '_ngZone');
  assert.equal(parameter.type.getText(source), 'NgZone'); assert.equal(Boolean(parameter.questionToken), false, 'required public zone parameter');
  assert.equal(Boolean(parameter.initializer), false, 'no implicit zone default'); assert.ok(parameter.modifiers.some(node => node.kind === ts.SyntaxKind.ProtectedKeyword));
  const bindings = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === '@angular/core')
    .flatMap(node => node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) ?
      node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === 'NgZone') : []);
  assert.equal(bindings.length, 1); const binding = bindings[0], symbol = checker.getSymbolAtLocation(binding.name);
  assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly); assert.deepEqual(symbol.declarations, [binding]);
  const references = [], accesses = [];
  function visit(node) {
    if (ts.isIdentifier(node) && node !== binding.name && checker.getSymbolAtLocation(node) === symbol) {
      assert.equal(node.parent === parameter.type, true, 'zone class escapes its required constructor type'); references.push({role: 'required-constructor-type', expression: print(parameter, source).trim()});
    }
    if (ts.isIdentifier(node) && node !== parameter.name && checker.getSymbolAtLocation(node)?.declarations?.includes(parameter)) {
      assert.ok(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node);
      const access = node.parent.parent;
      assert.ok(ts.isPropertyAccessExpression(access) && access.expression === node.parent);
      assert.equal(access.name.text, 'runOutsideAngular');
      assert.ok(ts.isCallExpression(access.parent) && access.parent.expression === access);
      assert.equal(access.parent.arguments.length, 1); assert.ok(ts.isArrowFunction(access.parent.arguments[0]));
      accesses.push({member: access.name.text, expression: access.getText(source)});
    }
    ts.forEachChild(node, visit);
  }
  visit(source); assert.equal(references.length, 1); assert.equal(accesses.length, 1);
  const comparisons = [];
  for (const [text, name, oldText, parent] of [[raw, '_MatCheckboxBase', original, 'TraitProtocol'],
    [leaf, 'MatLegacyCheckbox', originalLeaf, 'Base']]) {
    let phase = emitCheckboxZoneClass(text, name, parent, ts.ScriptTarget.ES2015);
    let current = parse('construction.js', phase), currentCtor = ctor(owner(current, 'Replay'));
    if (name === '_MatCheckboxBase') {
      const initializers = currentCtor.body.statements.filter(statement => ts.isExpressionStatement(statement) &&
        ts.isBinaryExpression(statement.expression) && ['this.ariaExpanded', 'this.ariaControls', 'this.ariaOwns',
          'this._checkboxDestroyed', 'this._animationCleanups'].includes(statement.expression.left.getText(current)));
      assert.deepEqual(initializers.map(statement => statement.getText(current)),
        ['this.ariaExpanded = null;', 'this.ariaControls = null;', 'this.ariaOwns = null;',
          'this._checkboxDestroyed = false;', 'this._animationCleanups = new Set();']);
      for (const statement of [...initializers].reverse()) phase = phase.slice(0, statement.getStart(current)) + phase.slice(statement.end);
      assert.equal(phase.split('this._currentCheckState = TransitionCheckState.Init;').length, 2);
      phase = phase.replace('this._currentCheckState = TransitionCheckState.Init;', 'this._currentCheckState = 0;');
      current = parse('historical-initialization.js', phase); currentCtor = ctor(owner(current, 'Replay'));
    }
    const historical = parse('untouched16.js', oldText), historicalCtor = ctor(owner(historical, name));
    assert.deepEqual(tokens(currentCtor, current), tokens(historicalCtor, historical), 'constructor differs beyond the enumerated existing defaults/enum compilation: ' + name);
    comparisons.push({class_name: name, complete_constructor_equal_after_enumerated_differences: true,
      separately_owned_lifetime_initializers: name === '_MatCheckboxBase' ? ['_checkboxDestroyed=false', '_animationCleanups=new Set()'] : [],
      separate_existing_ARIA_defaults: name === '_MatCheckboxBase' ? ['ariaExpanded=null', 'ariaControls=null', 'ariaOwns=null'] : [],
      ARIA_feature_SHA: name === '_MatCheckboxBase' ? '9122335b25b28a5532159ab87c36aab3be9c3716' : null,
      ARIA_behavior_qualified_by_this_review: false,
      authenticated_const_enum_Init_compilation: name === '_MatCheckboxBase' ? 'TransitionCheckState.Init equals original inlined0' : null,
      original_constructor_sha256: hash(historicalCtor.getText(historical))});
  }
  const fields = ['_checkboxDestroyed', '_animationCleanups', '_currentCheckState', '_currentAnimationClass', '_transitionCheckState', 'ngOnDestroy'];
  const selected = cls.members.filter(member => fields.includes(member.name?.getText(source))); assert.equal(selected.length, fields.length);
  return {case: {file: 'legacy-checkbox/internal/checkbox-base.ts', module: '@angular/core', symbol: 'NgZone',
    candidate_source_sha256: hash(raw), required_parameter_index: 3, references, member_accesses: accesses,
    zone_forwarding_or_escapes: 0, constructor_comparisons: comparisons},
    raw, leaf, typed_members: selected.map(member => print(member, source)).join('\n'),
    payload: {original: emitCheckboxZoneClass(original, '_MatCheckboxBase', 'TraitProtocol'),
      originalLeaf: emitCheckboxZoneClass(originalLeaf, 'MatLegacyCheckbox', 'Base'),
      base: emitCheckboxZoneClass(raw, '_MatCheckboxBase', 'TraitProtocol'), leaf: emitCheckboxZoneClass(leaf, 'MatLegacyCheckbox', 'Base'), enumValues},
    sources: [{path: CHECKBOX_ZONE_BASE, sha256: hash(raw)}, {path: CHECKBOX_ZONE_LEAF, sha256: hash(leaf)}],
    originals: [{path: capsulePath, sha256: hash(bytes)}, {path: leafCapsulePath, sha256: hash(leafBytes)},
      {path: enumReferencePath, sha256: hash(enumReference)}],
    owned_enum: {path: enumPath, sha256: hash(enumText), values: [0, 1, 2, 3]},
    limits: 'Whole class definitions and constructors; input/transition/destroy execution only. Angular decorators and compiled fac/dir/cmp metadata are omitted. Trait, host/classList/input/focus-monitor/CDR and timer protocols remain explicit. This is not actual component node DI, native CSS/geometry/1000ms timing, packed/AOT/consumer or full runtime/compiler/RxJS floors.'};
}

export function checkboxZonePublicDeclarations(model) {
  const matches = [], stable = node => assert.ok(!ts.getJSDocTags(node).some(tag =>
    ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(tag.tagName.text)));
  for (const [path, text] of model.sources) if (path.startsWith('@angular/core/') && path.endsWith('.d.ts')) {
    const source = parse(path, text);
    for (const node of source.statements) if (ts.isClassDeclaration(node) && node.name?.text === 'NgZone') {
      stable(node); const method = node.members.filter(member => member.name?.getText(source) === 'runOutsideAngular');
      assert.equal(method.length, 1); stable(method[0]); assert.ok(ts.isMethodDeclaration(method[0]));
      assert.equal(method[0].parameters.length, 1); assert.ok(ts.isFunctionTypeNode(method[0].parameters[0].type));
      assert.equal(method[0].type.getText(source), 'T');
      matches.push({line: model.line, path, source_sha256: hash(text), declaration: method[0].getText(source)});
    }
  }
  assert.equal(matches.length, 1); return matches[0];
}
