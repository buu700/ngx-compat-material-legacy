/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** One exact slider service boundary and independent untouched16 construction proof. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {emitFormMenuZoneClass, formMenuZonePublicDeclarations} from './form-menu-zone-use-review.mjs';
export {formMenuZonePublicDeclarations as sliderZonePublicDeclarations};
const ts = createRequire(import.meta.url)('typescript'), hash = value => createHash('sha256').update(value).digest('hex');
export const SLIDER_ZONE_SOURCE = 'projects/ngx-material-legacy/legacy-slider/slider.ts';
const originalPath = 'reference/material-16.2.14/value-accessor-token-sources/legacy-slider/slider.ts';
const printer = ts.createPrinter({removeComments: true}), print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
const parse = raw => {const source = ts.createSourceFile('slider-zone.ts', raw, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;};
const owner = (source, name) => {const matches = source.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === name); assert.equal(matches.length, 1); return matches[0];};
const ctor = cls => {const matches = cls.members.filter(ts.isConstructorDeclaration); assert.equal(matches.length, 1); return matches[0];};
const helperNames = ['isSafeNumber', 'isTouchEvent', 'getPointerPositionOnPage', 'findMatchingTouch', 'getTouchIdForSlider'];
const emit = raw => ts.transpileModule(raw, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText;
export function emitSliderZoneClass(raw) {
  const source = parse(raw), helperNodes = source.statements.filter(node => ts.isFunctionDeclaration(node) && helperNames.includes(node.name?.text));
  assert.equal(helperNodes.length, 5); const change = owner(source, 'MatLegacySliderChange');
  return emit(helperNodes.map(node => print(node, source)).join('\n') + '\n' + print(change, source)) + '\n' + emitFormMenuZoneClass(raw, 'MatLegacySlider', 'TraitsProtocol');
}
export function changeSliderZoneMember(raw, name, from, to) {
  const source = parse(raw), cls = owner(source, 'MatLegacySlider');
  const matches = cls.members.filter(node => name === 'constructor' ? ts.isConstructorDeclaration(node) : node.name?.getText(source) === name);
  assert.equal(matches.length, 1); const node = matches[0], text = node.getText(source); assert.equal(text.split(from).length, 2);
  return raw.slice(0, node.getStart(source)) + text.replace(from, to) + raw.slice(node.end);
}
function tokens(raw) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, raw), values = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) values.push([token, token === ts.SyntaxKind.StringLiteral ? scanner.getTokenValue() : scanner.getTokenText()]);
  return values;
}
export function reviewSliderZoneUse({root = process.cwd(), readMember = path => readFileSync(join(root, path))} = {}) {
  const raw = readMember(SLIDER_ZONE_SOURCE).toString(), original = readMember(originalPath).toString();
  assert.equal(hash(original), 'e923bb96cd3ca35f8bd0697e3ab797f934103cfb6d8b4cae022f4183d45fd1c9');
  const options = {noResolve: true, noLib: true, experimentalDecorators: true, target: ts.ScriptTarget.ES2022};
  const host = ts.createCompilerHost(options), oldRead = host.readFile.bind(host), absolute = join(root, SLIDER_ZONE_SOURCE);
  host.readFile = path => path === absolute ? raw : oldRead(path);
  const program = ts.createProgram([absolute], options, host), source = program.getSourceFile(absolute), checker = program.getTypeChecker();
  const cls = owner(source, 'MatLegacySlider'), constructor = ctor(cls), parameter = constructor.parameters[5];
  assert.equal(constructor.parameters.length, 8); assert.equal(parameter.name.getText(source), '_ngZone'); assert.equal(parameter.type.getText(source), 'NgZone');
  assert.equal(Boolean(parameter.questionToken), false); assert.equal(Boolean(parameter.initializer), false); assert.ok(parameter.modifiers.some(node => node.kind === ts.SyntaxKind.PrivateKeyword));
  const bindings = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === '@angular/core')
    .flatMap(node => node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) ? node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === 'NgZone') : []);
  assert.equal(bindings.length, 1); const binding = bindings[0], imported = checker.getSymbolAtLocation(binding.name);
  assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly); assert.deepEqual(imported.declarations, [binding]);
  const references = [], accesses = [];
  function visit(node) {
    if (ts.isIdentifier(node) && node !== binding.name && checker.getSymbolAtLocation(node) === imported) {
      assert.equal(node.parent === parameter.type, true); references.push({role: 'required-constructor-type', expression: print(parameter, source)});
    }
    if (ts.isIdentifier(node) && node !== parameter.name && checker.getSymbolAtLocation(node)?.declarations?.includes(parameter)) {
      const receiver = ts.isPropertyAccessExpression(node.parent) && node.parent.name === node ? node.parent : node, access = receiver.parent;
      assert.ok(ts.isPropertyAccessExpression(access) && access.expression === receiver);
      assert.ok(ts.isCallExpression(access.parent) && access.parent.expression === access); assert.equal(access.parent.arguments.length, 1);
      assert.ok(ts.isArrowFunction(access.parent.arguments[0])); accesses.push({member: access.name.text, expression: access.getText(source)});
    }
    ts.forEachChild(node, visit);
  }
  visit(source); assert.equal(references.length, 1); assert.deepEqual(accesses.map(row => row.member), ['runOutsideAngular', 'run']);
  const oldSource = parse(original), oldClass = owner(oldSource, 'MatLegacySlider');
  assert.equal(print(constructor, source), print(ctor(oldClass), oldSource), 'complete authored constructor differs from untouched16');
  for (const name of ['_pointerDown', '_pointerMove', '_pointerUp', '_emitInputEvent', '_emitChangeEvent', 'ngOnDestroy', ...helperNames]) {
    const selected = !helperNames.includes(name);
    const now = selected ? cls.members.find(node => node.name?.getText(source) === name) : source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    const before = selected ? oldClass.members.find(node => node.name?.getText(oldSource) === name) : oldSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.equal(print(now, source), print(before, oldSource), 'historical zone-path member/helper differs: ' + name);
  }
  const capsulePath = 'compatibility/rc/passive-listener-tagged-subjects.json', capsuleBytes = readMember(capsulePath);
  assert.equal(hash(capsuleBytes), '8b4c2214a65b18a43b0157efddb679682e8e95588e533e70b63c1d97d9f11c5e');
  const member = JSON.parse(capsuleBytes).members.find(row => row.archive_member === 'package/fesm2022/legacy-slider.mjs');
  const compressed = readMember(member.path); assert.equal(hash(compressed), member.gzip_sha256);
  const published = gunzipSync(compressed).toString(); assert.equal(hash(published), member.sha256);
  const currentJS = parse(emitFormMenuZoneClass(raw, 'MatLegacySlider', 'TraitsProtocol')), publishedJS = parse(published);
  assert.deepEqual(tokens(print(ctor(owner(currentJS, 'Replay')), currentJS)), tokens(print(ctor(owner(publishedJS, 'MatLegacySlider')), publishedJS)), 'complete emitted constructor differs from published16');
  const helperText = source.statements.filter(node => ts.isFunctionDeclaration(node) && helperNames.includes(node.name?.text)).map(node => print(node, source)).join('\n');
  return {raw, payload: {candidate: emitSliderZoneClass(raw), original: emitSliderZoneClass(original)},
    case: {file: 'legacy-slider/slider.ts', module: '@angular/core', symbol: 'NgZone', candidate_source_sha256: hash(raw), required_parameter_index: 5,
      references, member_accesses: accesses, service_forwarding_or_escapes: 0, original_complete_authored_and_published_emitted_constructors_unchanged: true,
      original_pointer_teardown_and_five_helpers_unchanged: true},
    typed: {helpers: helperText, pointerDown: print(cls.members.find(node => node.name?.text === '_pointerDown'), source)},
    sources: [{path: SLIDER_ZONE_SOURCE, sha256: hash(raw)}], originals: [{path: originalPath, sha256: hash(original)},
      {path: capsulePath, sha256: hash(capsuleBytes)}, {path: member.path, sha256: hash(compressed), decompressed_sha256: member.sha256}],
    limits: 'Whole original/current class definitions and constructors, actual pointer helpers and input/change events; Angular decorators/compiled metadata omitted. Trait, focus monitor/CDR, host/document/window/listener and geometry are explicit protocols. Genuine public zones/providers and actual patched Node EventEmitter capture do not qualify native DOM pointer/touch delivery/CSS/geometry, actual component node DI, packed/AOT/consumer or complete advertised floors.'};
}
