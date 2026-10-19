/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current raw chip caller; never substitutes historical source for admission. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {inspectChipFocusRepair, readChipFocusRepairPrior, CHIP_FOCUS_SOURCE} from './chip-focus-contract.mjs';
const ts = createRequire(import.meta.url)('typescript'), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const printer = ts.createPrinter({removeComments: true});
const parse = (name, text) => {
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;
};
const owner = (source, name) => {
  const matches = source.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1); return matches[0];
};
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
export function emitChipZoneClass(text) {
  const source = parse('chip-zone.ts', text), node = owner(source, 'MatLegacyChip');
  const copy = ts.factory.updateClassDeclaration(node, [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier('Replay'), undefined, [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword,
      [ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier('TraitsProtocol'), undefined)])], node.members);
  const transform = ts.transform(copy, [context => root => ts.visitNode(root, function visit(node) {
    return ts.isDecorator(node) ? undefined : ts.visitEachChild(node, visit, context);
  })]);
  try {
    const output = ts.transpileModule(print(transform.transformed[0], source), {compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, removeComments: true}, reportDiagnostics: true});
    assert.equal(output.diagnostics.length, 0); return output.outputText;
  } finally { transform.dispose(); }
}
export function changeChipZoneMethod(text, name, from, to) {
  const source = parse('chip-zone.ts', text), node = owner(source, 'MatLegacyChip');
  const matches = node.members.filter(node => node.name?.getText(source) === name); assert.equal(matches.length, 1);
  const method = matches[0], body = method.getText(source); assert.equal(body.split(from).length, 2);
  const changed = text.slice(0, method.getStart(source)) + body.replace(from, to) + text.slice(method.end);
  parse('valid-zone-mutant.ts', changed); return changed;
}

export function reviewChipZoneUse({root = process.cwd(), readMember = path => readFileSync(join(root, path))} = {}) {
  const readSource = path => readMember(path).toString();
  const current = readSource(CHIP_FOCUS_SOURCE), originalPath = 'reference/material-16.2.14/chips-keyboard-sources/chip.ts';
  const original = readSource(originalPath); assert.equal(hash(original), 'a3809031dbb69a835b3766f2af6052073939bab62a70161fe57e39260377fe5a');
  const focus = inspectChipFocusRepair({root, readMember});
  const options = {noResolve: true, noLib: true, target: ts.ScriptTarget.ES2022, experimentalDecorators: true};
  const host = ts.createCompilerHost(options), path = join(root, CHIP_FOCUS_SOURCE), oldRead = host.readFile.bind(host);
  host.readFile = name => name === path ? current : oldRead(name);
  const program = ts.createProgram([path], options, host), source = program.getSourceFile(path), checker = program.getTypeChecker();
  const cls = owner(source, 'MatLegacyChip'), ctor = cls.members.find(ts.isConstructorDeclaration);
  const imports = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === '@angular/core')
    .flatMap(node => node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) ?
      node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === 'NgZone') : []);
  assert.equal(imports.length, 1); const binding = imports[0], imported = checker.getSymbolAtLocation(binding.name);
  assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly);
  assert.deepEqual(imported.declarations, [binding]);
  const parameter = ctor.parameters[1]; assert.equal(parameter.name.getText(source), '_ngZone');
  assert.equal(parameter.type.getText(source), 'NgZone'); assert.equal(parameter.questionToken, undefined);
  assert.equal(parameter.initializer, undefined); assert.ok(parameter.modifiers.some(node => node.kind === ts.SyntaxKind.PrivateKeyword));
  const references = [], members = [], forwarding = [];
  function visit(node) {
    if (ts.isIdentifier(node) && node !== binding.name && checker.getSymbolAtLocation(node) === imported) {
      assert.equal(node.parent, parameter.type); references.push({role: 'required-constructor-type', expression: print(parameter, source).trim()});
    }
    if (ts.isIdentifier(node) && node !== parameter.name && checker.getSymbolAtLocation(node)?.declarations?.includes(parameter)) {
      const receiver = ts.isPropertyAccessExpression(node.parent) && node.parent.name === node ? node.parent : node;
      if (ts.isPropertyAccessExpression(receiver.parent) && receiver.parent.expression === receiver) {
        members.push({member: receiver.parent.name.text, expression: receiver.parent.getText(source)});
      } else {
        assert.ok(ts.isNewExpression(node.parent) && node.parent.expression.getText(source) === 'RippleRenderer');
        assert.equal(node.parent.arguments[1], node); forwarding.push({target: 'RippleRenderer', argument_index: 1, argument: node.getText(source)});
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source); assert.equal(references.length, 1);
  assert.deepEqual(members.map(row => row.member), ['run', 'onStable', 'isStable']);
  assert.deepEqual(forwarding, [{target: 'RippleRenderer', argument_index: 1, argument: '_ngZone'}]);
  const oldSource = parse(originalPath, original), oldCtor = owner(oldSource, 'MatLegacyChip').members.find(ts.isConstructorDeclaration);
  assert.equal(print(ctor, source), print(oldCtor, oldSource), 'complete original constructor changed');
  const listPath = 'projects/ngx-material-legacy/legacy-chips/chip-list.ts';
  const oldListPath = 'reference/material-16.2.14/chip-blur-sources/chip-list.ts';
  const list = readSource(listPath), originalList = readSource(oldListPath);
  assert.equal(hash(originalList), '83c17cd61f9ecb8cc4dcc7947a493a78a93a6b880d3c69f9284eb39106662414');
  const names = ['focused', 'chipFocusChanges', 'chipBlurChanges', '_listenToChipsFocus', '_hasFocusedChip', '_blur', '_markAsTouched', '_isValidIndex'];
  function emitList(text) {
    const file = parse('list.ts', text), cls = owner(file, 'MatLegacyChipList');
    const selected = cls.members.filter(member => names.includes(member.name?.getText(file))); assert.equal(selected.length, 8);
    const copy = ts.factory.updateClassDeclaration(cls, [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier('ListReplay'), undefined, undefined, selected);
    return ts.transpileModule(print(copy, file), {compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText;
  }
  assert.equal(emitList(list), emitList(originalList));
  const prior = readChipFocusRepairPrior({root, readMember}), beforeFocus = prior.sources.find(member => member.path === CHIP_FOCUS_SOURCE);
  const blur = cls.members.find(member => member.name?.getText(source) === '_blur');
  return {case: {file: 'legacy-chips/chip.ts', module: '@angular/core', symbol: 'NgZone',
    candidate_source_sha256: hash(current), references, member_accesses: members, forwarding,
    original_constructor_unchanged: true, complete_current_class_members: cls.members.length},
    sources: [{path: CHIP_FOCUS_SOURCE, sha256: hash(current)}, {path: listPath, sha256: hash(list)}],
    originals: [{path: originalPath, sha256: hash(original)}, {path: oldListPath, sha256: hash(originalList)}],
    payload: {original: emitChipZoneClass(original), candidate: emitChipZoneClass(current),
      priorFocus: emitChipZoneClass(beforeFocus.text), list: emitList(list), originalList: emitList(originalList)},
    current, blur_method: print(blur, source), focus,
    limits: 'Complete chip class constructors/members with Angular decorators removed; eight exact complete list members only. Traits, ripple, DOM, CDR and platform are protocols. Public zone/forms/queries/key manager execution is separate; no component factories, native rendering, packed output or full compiler/runtime/RxJS floors.'};
}

export function chipZonePublicDeclarations(model) {
  const matches = [], stable = node => assert.ok(!ts.getJSDocTags(node).some(tag =>
    ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(tag.tagName.text)));
  for (const [path, text] of model.sources) if (path.startsWith('@angular/core/') && path.endsWith('.d.ts')) {
    const source = parse(path, text);
    for (const node of source.statements) if (ts.isClassDeclaration(node) && node.name?.text === 'NgZone') {
      stable(node); const members = node.members.filter(member => ['run', 'onStable', 'isStable'].includes(member.name?.getText(source)));
      assert.equal(members.length, 3); members.forEach(stable);
      const stableField = members.find(member => member.name.getText(source) === 'isStable');
      assert.equal(stableField.type.kind, ts.SyntaxKind.BooleanKeyword);
      assert.ok(stableField.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword));
      const event = members.find(member => member.name.getText(source) === 'onStable');
      assert.equal(event.type.getText(source), 'EventEmitter<any>');
      assert.ok(event.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword));
      const run = members.find(member => member.name.getText(source) === 'run');
      assert.ok(ts.isMethodDeclaration(run)); assert.equal(run.type.getText(source), 'T');
      assert.equal(run.typeParameters.length, 1); assert.equal(run.typeParameters[0].name.text, 'T');
      assert.equal(run.parameters.length, 3); assert.ok(ts.isFunctionTypeNode(run.parameters[0].type));
      assert.deepEqual(run.parameters.map(parameter => !!parameter.questionToken), [false, true, true]);
      matches.push({line: model.line, path, source_sha256: hash(text), members: members.map(member => member.getText(source))});
    }
  }
  assert.equal(matches.length, 1); return matches[0];
}
