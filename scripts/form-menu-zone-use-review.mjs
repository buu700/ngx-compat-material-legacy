/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Two exact public zone callers; reused observations retain their original execution identity. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const printer = ts.createPrinter({removeComments: true});
export const FIELD = 'projects/ngx-material-legacy/legacy-form-field/form-field.ts';
export const MENU = 'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts';
export const HELPER = 'projects/ngx-material-legacy/legacy-form-field/internal/after-form-field-render.ts';
const parse = text => {
  const source = ts.createSourceFile('zone-caller.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;
};
const owner = (source, name) => {
  const matches = source.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1); return matches[0];
};
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
const ctor = node => {
  const matches = node.members.filter(node => ts.isConstructorDeclaration(node) && node.body);
  assert.equal(matches.length, 1); return matches[0];
};
function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text), result = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    const value = token === ts.SyntaxKind.StringLiteral ? scanner.getTokenValue() : scanner.getTokenText();
    result.push([token, value]);
  }
  return result;
}
export function emitFormMenuZoneClass(raw, name, parent) {
  const source = parse(raw), node = owner(source, name);
  const copy = ts.factory.updateClassDeclaration(node, [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier('Replay'), undefined, parent ? [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword,
      [ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(parent), undefined)])] : undefined,
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
  const transformed = ts.transform(copy, [context => root => ts.visitNode(root, function visit(node) {
    return ts.isDecorator(node) ? undefined : ts.visitEachChild(node, visit, context);
  })]);
  try {
    const output = ts.transpileModule(print(transformed.transformed[0], source), {compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, useDefineForClassFields: false}, reportDiagnostics: true});
    assert.equal(output.diagnostics.length, 0); return output.outputText;
  } finally { transformed.dispose(); }
}
export function changeFormMenuZoneMethod(raw, className, methodName, from, to) {
  const source = parse(raw), node = owner(source, className);
  const matches = node.members.filter(member => member.name?.getText(source) === methodName);
  assert.equal(matches.length, 1); const member = matches[0], body = member.getText(source);
  assert.equal(body.split(from).length, 2); const changed = body.replace(from, to);
  return raw.slice(0, member.getStart(source)) + changed + raw.slice(member.end);
}
function boundUse(root, path, raw, name, index) {
  const options = {noResolve: true, noLib: true, experimentalDecorators: true, target: ts.ScriptTarget.ES2022};
  const host = ts.createCompilerHost(options), oldRead = host.readFile.bind(host), absolute = join(root, path);
  host.readFile = value => value === absolute ? raw : oldRead(value);
  const program = ts.createProgram([absolute], options, host), source = program.getSourceFile(absolute), checker = program.getTypeChecker();
  const cls = owner(source, name), implementation = ctor(cls), parameter = implementation.parameters[index];
  assert.equal(parameter.name.getText(source), '_ngZone'); assert.equal(parameter.type.getText(source), 'NgZone');
  assert.equal(Boolean(parameter.questionToken), path === MENU); assert.equal(Boolean(parameter.initializer), false);
  assert.ok(parameter.modifiers.some(node => node.kind === ts.SyntaxKind.PrivateKeyword));
  assert.equal(implementation.parameters.length, path === FIELD ? 8 : 9);
  const bindings = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === '@angular/core')
    .flatMap(node => node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) ?
      node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === 'NgZone') : []);
  assert.equal(bindings.length, 1); const binding = bindings[0], imported = checker.getSymbolAtLocation(binding.name);
  assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly); assert.deepEqual(imported.declarations, [binding]);
  const references = [], accesses = [], forwarding = [], guards = [];
  function visit(node) {
    if (ts.isIdentifier(node) && node !== binding.name && checker.getSymbolAtLocation(node) === imported) {
      assert.ok(ts.isTypeReferenceNode(node.parent) && ts.isParameter(node.parent.parent));
      const ref = node.parent.parent;
      assert.equal(ref.parent.parent === cls, true); assert.ok(ts.isConstructorDeclaration(ref.parent));
      assert.equal(ref.parent.parameters.indexOf(ref), index);
      assert.equal(Boolean(ref.questionToken), path === MENU && Boolean(ref.parent.body));
      references.push({role: ref.parent.body ? 'implementation-constructor-type' : 'historical-overload-type', expression: print(ref, source).trim()});
    }
    if (ts.isIdentifier(node) && node !== parameter.name && checker.getSymbolAtLocation(node)?.declarations?.includes(parameter)) {
      assert.ok(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node);
      const receiver = node.parent, usage = receiver.parent;
      if (ts.isPropertyAccessExpression(usage) && usage.expression === receiver) {
        assert.ok(ts.isCallExpression(usage.parent) && usage.parent.expression === usage);
        assert.equal(usage.name.text, path === FIELD ? 'runOutsideAngular' : 'run');
        assert.equal(usage.parent.arguments.length, 1); assert.ok(ts.isArrowFunction(usage.parent.arguments[0]));
        accesses.push({member: usage.name.text, expression: usage.getText(source)});
      } else if (path === FIELD) {
        assert.ok(ts.isCallExpression(usage)); assert.equal(usage.expression.getText(source), 'afterFormFieldRender');
        assert.equal(usage.arguments[0] === receiver, true); assert.equal(usage.arguments[1].getText(source), 'this._injector');
        forwarding.push({target: 'afterFormFieldRender', argument_index: 0, expression: receiver.getText(source)});
      } else {
        assert.ok(ts.isIfStatement(usage)); assert.equal(usage.expression === receiver, true);
        guards.push({role: 'optional-service-guard', expression: receiver.getText(source)});
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source); assert.equal(references.length, path === FIELD ? 1 : 2);
  assert.equal(accesses.length, path === FIELD ? 2 : 1); assert.equal(forwarding.length, path === FIELD ? 1 : 0);
  assert.equal(guards.length, path === FIELD ? 0 : 1);
  return {source, cls, implementation, case: {file: path.replace('projects/ngx-material-legacy/', ''), module: '@angular/core', symbol: 'NgZone',
    candidate_source_sha256: hash(raw), required_parameter_index: path === FIELD ? index : null,
    optional_parameter_index: path === MENU ? index : null, references, member_accesses: accesses, forwarding, guards}};
}
function reusedFieldEvidence(root, readMember, line) {
  const path = 'compatibility/rc/form-field-state-frame-runtime-diagnostic.json';
  const producer = 'tests/form_field_render_runtime_probe.mjs', producerHash = 'ffa7240e0fb75376ccf60cf21609a8edd6ddb23c9d3c20ea34533443b921fba7';
  const [commit, digest] = line === 'main' ? ['6797cbeeaf49eb4c799adf6d1f407134c495e000', '7320ff512782113dd11dff3cd3ef606a69169d206076c028ed0ebacd36f9c87a'] :
    ['9f1a84f5a8297b0b62159070f2515443111813f0', '2a6827bfb0af87effc786eef493dd6ea608028d8bee352db3bc9c7e17b6bc3c1'];
  const raw = readMember(path); assert.equal(hash(raw), digest); assert.equal(hash(readMember(producer)), producerHash);
  const gitRead = member => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', commit + ':' + member], {cwd: root, maxBuffer: 1024 * 1024});
  assert.equal(hash(gitRead(path)), digest); assert.equal(hash(gitRead(producer)), producerHash);
  const report = JSON.parse(raw); assert.equal(report.line, line); assert.equal(report.results.length, 10);
  assert.equal(report.namespace_capsule_sha256, hash(readMember('compatibility/rc/material-public-subjects.json')));
  assert.equal(report.results.flatMap(row => row.mutations).length, 120);
  assert.deepEqual(report.sources.map(row => row.path), [FIELD, HELPER]);
  for (const row of report.sources) {
    assert.equal(hash(readMember(row.path)), row.sha256); assert.equal(hash(gitRead(row.path)), row.sha256);
  }
  return {path, sha256: digest, execution_commit: commit, producer: {path: producer, sha256: producerHash},
    authentic_existing_subjects: 10, authentic_existing_behavioral_faults: 120,
    source_and_helper_equal_execution_commit: true, public_namespace_unchanged: true, rerun_claimed: false,
    scope: report.scope, actual_legacy_view_native_or_packed_qualified: false};
}
export function reviewFormMenuZoneUses({root = process.cwd(), readMember = path => readFileSync(join(root, path))} = {}) {
  const line = JSON.parse(readMember('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const fieldRaw = readMember(FIELD).toString(), menuRaw = readMember(MENU).toString();
  const field = boundUse(root, FIELD, fieldRaw, 'MatLegacyFormField', 5), menu = boundUse(root, MENU, menuRaw, '_MatMenuTriggerBase', 8);
  const reused = reusedFieldEvidence(root, readMember, line);
  const oldFieldPath = 'reference/material-16.2.14/control-forwarding-sources/form-field.ts';
  const oldFieldRaw = readMember(oldFieldPath).toString(); assert.equal(hash(oldFieldRaw), 'c32e86f1be87568387a09abcd7e6c47e6cb33fd63ea0cff8b224e98073dd1726');
  const oldField = parse(oldFieldRaw), oldFieldCtor = ctor(owner(oldField, 'MatLegacyFormField'));
  assert.deepEqual(tokens(print(field.implementation.parameters[5], field.source)), tokens(print(oldFieldCtor.parameters[5], oldField)));
  assert.equal(oldFieldCtor.parameters.length, 7); assert.equal(Boolean(oldFieldCtor.parameters[5].questionToken), false);
  const capsulePath = 'compatibility/rc/key-manager-tagged-construction-subjects.json', capsuleRaw = readMember(capsulePath);
  assert.equal(hash(capsuleRaw), '50e7f14e8460bef4eab432c53de985b502678d5c1f0257b1dbcc4a2e30e1aad2');
  const capsule = JSON.parse(capsuleRaw); assert.equal(capsule.version, '16.2.14');
  assert.equal(capsule.archive_sha256, 'de41309d20b1d98a7fd6d028a7de42853ea2d453a329c7a8815aaf73ea7f365b');
  const member = capsule.members.find(row => row.archive_member === 'package/fesm2022/menu.mjs');
  const compressed = readMember(member.path); assert.equal(hash(compressed), member.gzip_sha256);
  const originalMenu = gunzipSync(compressed).toString(); assert.equal(hash(originalMenu), member.sha256);
  const oldMenu = parse(originalMenu), oldMenuClass = owner(oldMenu, '_MatMenuTriggerBase');
  const menuJS = emitFormMenuZoneClass(menuRaw, '_MatMenuTriggerBase'), menuEmitted = parse(menuJS), emittedCtor = ctor(owner(menuEmitted, 'Replay'));
  const extraFields = ['this._pendingRemoval = Subscription.EMPTY;', 'this._keydownSubscription = Subscription.EMPTY;',
    'this._attachedMenu = null;', 'this._menuGeneration = 0;', 'this._destroyed = false;', 'this._closedMenus = new WeakSet();'];
  const extras = emittedCtor.body.statements.filter(statement => extraFields.includes(print(statement, menuEmitted)));
  assert.deepEqual(extras.map(node => print(node, menuEmitted)), extraFields);
  const normalizedCtor = ts.factory.updateConstructorDeclaration(emittedCtor, emittedCtor.modifiers, emittedCtor.parameters,
    ts.factory.updateBlock(emittedCtor.body, emittedCtor.body.statements.filter(statement => !extras.includes(statement))));
  assert.deepEqual(tokens(print(normalizedCtor, menuEmitted)), tokens(print(ctor(oldMenuClass), oldMenu)), 'complete menu constructor changed beyond its enumerated existing lifetime fields');
  const currentMethod = owner(menuEmitted, 'Replay').members.find(node => node.name?.text === '_subscribeToPositions');
  const oldMethod = oldMenuClass.members.find(node => node.name?.text === '_subscribeToPositions');
  assert.deepEqual(tokens(print(currentMethod, menuEmitted)), tokens(print(oldMethod, oldMenu)), 'whole position method differs from untouched16');
  return {line, cases: [field.case, {...menu.case, original_complete_position_method_unchanged: true,
    original_complete_constructor_equal_after_existing_lifetime_defaults: true, existing_lifetime_defaults: extraFields}],
    sources: [FIELD, MENU, HELPER].map(path => ({path, sha256: hash(readMember(path))})), reused,
    originals: [{path: oldFieldPath, sha256: hash(oldFieldRaw)}, {path: capsulePath, sha256: hash(capsuleRaw)},
      {path: member.path, sha256: hash(compressed), decompressed_sha256: member.sha256}],
    fieldRaw, menuRaw, payload: {field: emitFormMenuZoneClass(fieldRaw, 'MatLegacyFormField', 'ColorProtocol'), menu: menuJS,
      originalMenu: emitFormMenuZoneClass(originalMenu, '_MatMenuTriggerBase')},
    fieldMethod: print(field.cls.members.find(node => node.name?.text === 'ngAfterContentInit'), field.source),
    menuMethod: print(menu.cls.members.find(node => node.name?.text === '_subscribeToPositions'), menu.source),
    limits: 'Fresh supplement executes complete field/trigger constructors and scoped content-init/direction/destruction or position methods with explicit trait/CDR/DOM/hook/RAF/overlay protocols. Genuine public NgZone/QueryList/EventEmitter/RxJS and current public application providers are real. Reused field report retains its authentic prior commit, complete render/geometry/lifetime observations and limits. No actual legacy Angular component factory, native DOM/RAF/geometry, complete menu overlay lifetime, zone-patch-rxjs plugin, packed/AOT/consumer or all advertised floors are qualified.'};
}
export function formMenuZonePublicDeclarations(model) {
  const matches = [], stable = node => assert.ok(!ts.getJSDocTags(node).some(tag =>
    ['deprecated', 'docs-private', 'experimental', 'breaking-change', 'internal', 'developerPreview'].includes(tag.tagName.text)));
  for (const [path, raw] of model.sources) if (path.startsWith('@angular/core/') && path.endsWith('.d.ts')) {
    const source = parse(raw);
    for (const node of source.statements) if (ts.isClassDeclaration(node) && node.name?.text === 'NgZone') {
      stable(node); const members = node.members.filter(member => ['run', 'runOutsideAngular'].includes(member.name?.getText(source)));
      assert.equal(members.length, 2);
      for (const member of members) { stable(member); assert.ok(ts.isMethodDeclaration(member)); assert.equal(member.type.getText(source), 'T'); }
      matches.push({line: model.line, path, source_sha256: hash(raw), members: members.map(node => node.getText(source))});
    }
  }
  assert.equal(matches.length, 1); return matches[0];
}
