/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current exact tab callers and authentic prior observations; no native/floor admission. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {emitFormMenuZoneClass, changeFormMenuZoneMethod, formMenuZonePublicDeclarations} from './form-menu-zone-use-review.mjs';
export {formMenuZonePublicDeclarations as tabZonePublicDeclarations};
const ts = createRequire(import.meta.url)('typescript'), hash = value => createHash('sha256').update(value).digest('hex');
export const HEADER = 'projects/ngx-material-legacy/legacy-tabs/internal/paginated-tab-header.ts';
export const BODY = 'projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts';
const helperPath = 'projects/ngx-material-legacy/legacy-tabs/internal/after-tab-header-render.ts';
const resizePath = 'projects/ngx-material-legacy/legacy-tabs/internal/owned-header-resize.ts';
const printer = ts.createPrinter({removeComments: true}), print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
const parse = raw => {const source = ts.createSourceFile('tab-zone.ts', raw, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;};
const owner = (source, name) => {const found = source.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === name); assert.equal(found.length, 1); return found[0];};
const ctor = cls => {const found = cls.members.filter(ts.isConstructorDeclaration); assert.equal(found.length, 1); return found[0];};
const emit = raw => ts.transpileModule(raw, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText;
export function emitTabZoneClass(raw, body = false) {
  if (!body) return emitFormMenuZoneClass(raw, 'MatPaginatedTabHeader');
  const source = parse(raw), factory = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'tabBodyNgZone');
  assert.ok(factory); return emit(print(factory, source)) + '\n' + emitFormMenuZoneClass(raw, '_MatTabBodyBase');
}
export const changeTabZoneMethod = (raw, body, name, from, to) => changeFormMenuZoneMethod(raw, body ? '_MatTabBodyBase' : 'MatPaginatedTabHeader', name, from, to);
function program(root, path, raw) {
  const options = {noResolve: true, noLib: true, experimentalDecorators: true, target: ts.ScriptTarget.ES2022}, host = ts.createCompilerHost(options);
  const absolute = join(root, path), oldRead = host.readFile.bind(host); host.readFile = path => path === absolute ? raw : oldRead(path);
  const value = ts.createProgram([absolute], options, host); return {source: value.getSourceFile(absolute), checker: value.getTypeChecker()};
}
function zoneImport(source, checker) {
  const bindings = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === '@angular/core')
    .flatMap(node => node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) ? node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === 'NgZone') : []);
  assert.equal(bindings.length, 1); const binding = bindings[0], symbol = checker.getSymbolAtLocation(binding.name);
  assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly); assert.deepEqual(symbol.declarations, [binding]); return {binding, symbol};
}
export function reviewTabZoneUses({root = process.cwd(), readMember = path => readFileSync(join(root, path))} = {}) {
  const line = JSON.parse(readMember('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const rawHeader = readMember(HEADER).toString(), rawBody = readMember(BODY).toString(), cases = [], typed = {};
  const originalHeaderPath = 'reference/material-16.2.14/tab-header-render-sources/paginated-tab-header.ts';
  const originalBodyPath = 'reference/material-16.2.14/component-motion-sources/tabs/tab-body.ts';
  const originalHeader = readMember(originalHeaderPath).toString(), originalBody = readMember(originalBodyPath).toString();
  assert.equal(hash(originalHeader), 'aede756f20cc661b3a35aa3afadea8436892a76f4ac015b340a9b55a9a4140a6');
  assert.equal(hash(originalBody), 'b8cae68f00521586ecf1b69d3bce277c3e1eeba35997b05b91223b1ffcbdfaf7');
  {
    const {source, checker} = program(root, HEADER, rawHeader), cls = owner(source, 'MatPaginatedTabHeader'), constructor = ctor(cls), parameter = constructor.parameters[4];
    assert.equal(constructor.parameters.length, 7); assert.equal(parameter.name.getText(source), '_ngZone'); assert.equal(parameter.type.getText(source), 'NgZone');
    assert.equal(Boolean(parameter.questionToken), false); assert.equal(Boolean(parameter.initializer), false);
    const {binding, symbol} = zoneImport(source, checker), references = [], accesses = [], forwarding = [];
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && checker.getSymbolAtLocation(node) === symbol) {
        assert.equal(node.parent === parameter.type, true); references.push({role: 'required-constructor-type', expression: print(parameter, source)});
      }
      if (ts.isIdentifier(node) && node !== parameter.name && checker.getSymbolAtLocation(node)?.declarations?.includes(parameter)) {
        const receiver = ts.isPropertyAccessExpression(node.parent) && node.parent.name === node ? node.parent : node, usage = receiver.parent;
        if (ts.isPropertyAccessExpression(usage) && usage.expression === receiver) {
          assert.ok(['run', 'runOutsideAngular'].includes(usage.name.text)); assert.ok(ts.isCallExpression(usage.parent) && usage.parent.expression === usage);
          accesses.push({member: usage.name.text, expression: usage.getText(source)});
        } else {
          assert.ok(ts.isCallExpression(usage)); const target = usage.expression.getText(source), index = usage.arguments.indexOf(receiver);
          assert.ok(target === 'ownedHeaderResize' && index === 1 || target === 'afterTabHeaderRender' && index === 0);
          forwarding.push({target, argument_index: index, expression: receiver.getText(source)});
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source); assert.equal(references.length, 1); assert.deepEqual(accesses.map(row => row.member), ['runOutsideAngular', 'run', 'runOutsideAngular', 'run']);
    assert.deepEqual(forwarding.map(row => [row.target, row.argument_index]), [['ownedHeaderResize', 1], ['afterTabHeaderRender', 0]]);
    const oldSource = parse(originalHeader); assert.equal(print(constructor, source), print(ctor(owner(oldSource, 'MatPaginatedTabHeader')), oldSource));
    cases.push({file: 'legacy-tabs/internal/paginated-tab-header.ts', module: '@angular/core', symbol: 'NgZone', candidate_source_sha256: hash(rawHeader), required_parameter_index: 4,
      original_authored_constructor_unchanged: true, references, member_accesses: accesses, forwarding, other_service_escapes: 0});
    typed.header = ['ngAfterContentInit', '_itemsResized', '_onContentChanges'].map(name => print(cls.members.find(node => node.name?.text === name), source)).join('\n');
  }
  {
    const {source, checker} = program(root, BODY, rawBody), cls = owner(source, '_MatTabBodyBase'), constructor = ctor(cls), {binding, symbol} = zoneImport(source, checker);
    const factory = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'tabBodyNgZone'); assert.ok(factory);
    assert.equal(factory.type.getText(source), 'NgZone | null'); const statements = factory.body.statements; assert.equal(statements.length, 2);
    const attempt = statements[0]; assert.ok(ts.isTryStatement(attempt)); assert.equal(attempt.tryBlock.statements.length, 1);
    assert.equal(attempt.tryBlock.statements[0].getText(source), 'assertInInjectionContext(tabBodyNgZone);');
    assert.equal(attempt.catchClause.block.statements.length, 1); assert.equal(attempt.catchClause.block.statements[0].getText(source), 'return null;');
    assert.equal(statements[1].getText(source), 'return inject(NgZone, {optional: true});');
    for (const name of ['assertInInjectionContext', 'inject']) {
      const imports = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === '@angular/core')
        .flatMap(node => node.importClause?.namedBindings?.elements ?? []).filter(node => (node.propertyName || node.name).text === name);
      assert.equal(imports.length, 1);
    }
    const field = cls.members.find(node => node.name?.getText(source) === '_ngZone'); assert.ok(field);
    assert.ok(field.modifiers.some(node => node.kind === ts.SyntaxKind.ReadonlyKeyword));
    assert.equal(field.initializer.getText(source), 'tabBodyNgZone()');
    const references = [], accesses = [], guards = [];
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && checker.getSymbolAtLocation(node) === symbol) {
        if (ts.isTypeReferenceNode(node.parent)) {assert.equal(node.parent.parent === factory.type, true); references.push({role: 'nullable-factory-return-type', expression: 'NgZone | null'});}
        else {assert.ok(ts.isCallExpression(node.parent) && node.parent.arguments[0] === node); assert.equal(node.parent.expression.getText(source), 'inject'); references.push({role: 'optional-public-inject-token', expression: node.parent.getText(source)});}
      }
      if (ts.isIdentifier(node) && node !== field.name && checker.getSymbolAtLocation(node)?.declarations?.includes(field)) {
        assert.ok(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node); const receiver = node.parent, usage = receiver.parent;
        if (ts.isPropertyAccessExpression(usage) && usage.expression === receiver) {
          assert.ok(ts.isCallExpression(usage.parent) && usage.parent.expression === usage); accesses.push({member: usage.name.text, expression: usage.getText(source)});
        } else {assert.ok(ts.isIfStatement(usage) && usage.expression === receiver); guards.push({role: 'optional-zone-guard', expression: receiver.getText(source)});}
      }
      ts.forEachChild(node, visit);
    }
    visit(source); assert.equal(references.length, 2); assert.deepEqual(accesses.map(row => row.member), ['run', 'runOutsideAngular']); assert.equal(guards.length, 2);
    const oldSource = parse(originalBody), oldConstructor = ctor(owner(oldSource, '_MatTabBodyBase')); assert.equal(constructor.parameters.length, 3); assert.equal(oldConstructor.parameters.length, 3);
    assert.deepEqual(constructor.parameters.map(node => [node.name.getText(source), node.type.getText(source), Boolean(node.questionToken)]),
      oldConstructor.parameters.map(node => [node.name.getText(oldSource), node.type.getText(oldSource), Boolean(node.questionToken)]));
    assert.equal(constructor.parameters[0].modifiers.find(node => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(node.kind)).kind, ts.SyntaxKind.ProtectedKeyword);
    assert.equal(oldConstructor.parameters[0].modifiers.find(node => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(node.kind)).kind, ts.SyntaxKind.PrivateKeyword);
    cases.push({file: 'legacy-tabs/internal/tab-body-base.ts', module: '@angular/core', symbol: 'NgZone', candidate_source_sha256: hash(rawBody), original_three_parameter_types_names_and_arity_preserved: true,
      existing_element_visibility_difference: {original: 'private', current: 'protected'}, authored_constructor_body_identical_claimed: false,
      references, member_accesses: accesses, guards, optional_factory_and_readonly_field: true, other_service_escapes: 0});
    typed.bodyFactory = print(factory, source); typed.body = print(cls.members.find(node => node.name?.text === '_scheduleTransitionDone'), source);
  }
  const reportPath = 'compatibility/rc/tab-header-render-source-diagnostic.json', producer = 'tests/tab_header_render_runtime_probe.mjs', worker = 'tests/tab_header_render_subject.mjs';
  const [commit, digest, producerDigest] = line === 'main' ? ['fe5b8ef8b3975fb9f6aca977276c3a2036357005', '43720acfadbbf1dfde63b64ad73d9ea8b5514a260115b5c8b1226656cc653395', 'b021bac33822cfe3d04117968ce1a15a6441e0d5889b095c1a05922d664f3d46'] :
    ['ba7d09b6c94411b35ac843eecf33b67c49e5d247', '4eeebb8cb97e3a08c7073e5f0cad258dc374cede420934a5fa9715bc343900db', '31ca524493e1e0df4d73823f25537a55825e7d870b9636dc0704cef96d1825ad'];
  assert.equal(hash(readMember(reportPath)), digest); assert.equal(hash(readMember(producer)), producerDigest);
  const gitRead = path => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', commit + ':' + path], {cwd: root, maxBuffer: 1024 * 1024});
  assert.equal(hash(gitRead(reportPath)), digest); assert.equal(hash(gitRead(producer)), producerDigest);
  const report = JSON.parse(readMember(reportPath)); assert.equal(report.line, line); assert.equal(report.results.length, 10); assert.equal(report.results.flatMap(row => row.mutations).length, 32);
  assert.deepEqual(report.sources.map(row => row.path), [HEADER, helperPath, worker]);
  for (const row of report.sources) {assert.equal(hash(readMember(row.path)), row.sha256); assert.equal(hash(gitRead(row.path)), row.sha256);}
  assert.equal(report.namespace_capsule_sha256, hash(readMember('compatibility/rc/material-public-subjects.json')));
  const motionPath = 'compatibility/rc/tab-zone-use-original-motion.json', motionDigest = line === 'main' ? '7a855591fe8cc4bcb66c0b7c2900820fa54ac862d2168bf832d0859747a0c96d' : 'cf46d91725491f3457d252e7ed757ab532c04082dac40c518588791884231527';
  assert.equal(hash(readMember(motionPath)), motionDigest); assert.equal(hash(readMember('tests/tab_body_motion_runtime_probe.mjs')), '24b4ed06cb7a86ce5ecdfe79637a23fef082873a687a9cc2d170d314ae518eef');
  const motion = JSON.parse(readMember(motionPath)); assert.equal(motion.source_sha256, hash(rawBody)); assert.equal(motion.passed, 47); assert.equal(motion.failed, 0); assert.equal(motion.mutants.length, 22);
  const helperProgram = path => {const source = parse(readMember(path).toString()); return emit(source.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(source)).join('\n'));};
  return {line, cases, rawHeader, rawBody, typed, payload: {header: emitTabZoneClass(rawHeader), body: emitTabZoneClass(rawBody, true), headerHelper: helperProgram(helperPath), resizeHelper: helperProgram(resizePath)},
    sources: [HEADER, BODY, helperPath, resizePath].map(path => ({path, sha256: hash(readMember(path))})), originals: [{path: originalHeaderPath, sha256: hash(originalHeader)}, {path: originalBodyPath, sha256: hash(originalBody)}],
    reused_header: {path: reportPath, sha256: digest, execution_commit: commit, producer: {path: producer, sha256: producerDigest}, subjects: 10, behavioral_faults: 32, freshly_rerun_claimed: false, scope: report.scope},
    fresh_original_motion: {path: motionPath, sha256: motionDigest, cases: 47, behavioral_faults: 22, borrowed_angular: motion.borrowed_angular, actual21_execution: false},
    limits: 'Whole current class definitions and constructors; Angular decorators omitted. Public framework zones/injectors/queries/key manager are genuine; header host/observer geometry, CDR/viewport/direction/items and body style/layout/animation-policy/timer adapters are explicit protocols. Header authentic prior render execution is reused with unchanged identities. Original body motion probe retains borrowed Angular22 and deterministic-clock limits. Fresh Node event/task capture is not native observer/event delivery, CSS/clock, legacy component node DI, packed/AOT/consumer or full floor qualification.'};
}
