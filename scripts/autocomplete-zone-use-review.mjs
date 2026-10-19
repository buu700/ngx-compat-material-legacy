/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact current caller binding and refreshed original replay, with enumerated constructor differences. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {emitFormMenuZoneClass, changeFormMenuZoneMethod, formMenuZonePublicDeclarations} from './form-menu-zone-use-review.mjs';
export {formMenuZonePublicDeclarations as autocompleteZonePublicDeclarations};
const ts = createRequire(import.meta.url)('typescript'), hash = value => createHash('sha256').update(value).digest('hex');
export const AUTOCOMPLETE_ZONE_SOURCE = 'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts';
export const AUTOCOMPLETE_ZONE_HELPER = 'projects/ngx-material-legacy/legacy-autocomplete/internal/after-legacy-render.ts';
const EVENT = 'projects/ngx-material-legacy/legacy-core/option/option-base.ts';
const ORIGINAL = 'reference/material-16.2.14/component-behavior-sources/autocomplete/autocomplete-trigger.ts';
const CLASS = '_MatAutocompleteTriggerBase', printer = ts.createPrinter({removeComments: true});
const parse = raw => {
  const source = ts.createSourceFile('zone-caller.ts', raw, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;
};
const owner = (source, name = CLASS) => {
  const matches = source.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1); return matches[0];
};
const constructor = cls => {
  const matches = cls.members.filter(node => ts.isConstructorDeclaration(node) && node.body);
  assert.equal(matches.length, 1); return matches[0];
};
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
const tokens = raw => {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, raw), result = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    result.push([token, token === ts.SyntaxKind.StringLiteral ? scanner.getTokenValue() : scanner.getTokenText()]);
  }
  return result;
};
export const emitAutocompleteZoneClass = raw => emitFormMenuZoneClass(raw, CLASS);
export const changeAutocompleteZoneMethod = (raw, name, from, to) => changeFormMenuZoneMethod(raw, CLASS, name, from, to);
function renderEvidence(root, readMember, line) {
  const path = 'compatibility/rc/autocomplete-render-source-diagnostic.json', producer = 'tests/autocomplete_render_runtime_probe.mjs';
  const producerHash = '9e44ca5c47da794ce6883283cd59ba588570942feb1cf49899a92e20b86af96e';
  const [commit, digest] = line === 'main' ? ['f7153623c21cdc9a93769368f9837eebec57a4b1', '964af24044f2c602102a5c5ad591bbeec0c807ec28e2b5be03047afa63907e1f'] :
    ['7450169305997ab10f75802e4ff4de502b858a79', 'f4978cce80232b1c5806ee1f1cd85de1e83f299e9eeb91311a85736f301930bf'];
  const raw = readMember(path); assert.equal(hash(raw), digest); assert.equal(hash(readMember(producer)), producerHash);
  const gitRead = name => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', commit + ':' + name], {cwd: root, maxBuffer: 1024 * 1024});
  assert.equal(hash(gitRead(path)), digest); assert.equal(hash(gitRead(producer)), producerHash);
  const report = JSON.parse(raw); assert.equal(report.line, line); assert.equal(report.results.length, 10);
  assert.equal(report.results.flatMap(row => row.mutations).length, 16);
  assert.deepEqual(report.sources.map(row => row.path), [AUTOCOMPLETE_ZONE_SOURCE, AUTOCOMPLETE_ZONE_HELPER, EVENT]);
  for (const row of report.sources) assert.equal(hash(gitRead(row.path)), row.sha256);
  assert.equal(report.namespace_capsule_sha256, hash(readMember('compatibility/rc/material-public-subjects.json')));
  const freshPath = 'compatibility/rc/autocomplete-zone-use-render-diagnostic.json';
  const freshDigest = line === 'main' ? '758f740c71401c0b99c0dc0e33b8e345f81cd4886415db7498ff8d35c4a0ef26' : '59a48b19aae2207f847ae371e9a74fa587dd5e525f11cd961eedd4fafea34a15';
  const freshRaw = readMember(freshPath); assert.equal(hash(freshRaw), freshDigest);
  const fresh = JSON.parse(freshRaw); assert.equal(fresh.line, line); assert.equal(fresh.results.length, 10);
  assert.equal(fresh.results.flatMap(row => row.mutations).length, 16);
  assert.deepEqual(fresh.sources.map(row => row.path), [AUTOCOMPLETE_ZONE_SOURCE, AUTOCOMPLETE_ZONE_HELPER, EVENT]);
  for (const row of fresh.sources) assert.equal(hash(readMember(row.path)), row.sha256);
  assert.equal(fresh.namespace_capsule_sha256, report.namespace_capsule_sha256);
  assert.notEqual(fresh.sources[2].sha256, report.sources[2].sha256, 'the stale option module must not masquerade as unchanged');
  assert.deepEqual(fresh.sources.slice(0, 2), report.sources.slice(0, 2));
  return {path: freshPath, sha256: freshDigest, producer: {path: producer, sha256: producerHash},
    original_producer_unchanged_since_commit: commit, subjects: 10, behavioral_faults: 16,
    fresh_rerun_claimed: true, source_helper_event_and_namespace_match_current: true,
    superseded_report: {path, sha256: digest, execution_commit: commit, used_as_current_source_pass: false,
      stale_option_source_sha256: report.sources[2].sha256, current_option_source_sha256: fresh.sources[2].sha256}, scope: fresh.scope};
}
export function reviewAutocompleteZoneUse({root = process.cwd(), readMember = path => readFileSync(join(root, path))} = {}) {
  const raw = readMember(AUTOCOMPLETE_ZONE_SOURCE).toString();
  const options = {noResolve: true, noLib: true, experimentalDecorators: true, target: ts.ScriptTarget.ES2022};
  const host = ts.createCompilerHost(options), absolute = join(root, AUTOCOMPLETE_ZONE_SOURCE), oldRead = host.readFile.bind(host);
  host.readFile = path => path === absolute ? raw : oldRead(path);
  const program = ts.createProgram([absolute], options, host), source = program.getSourceFile(absolute), checker = program.getTypeChecker();
  const cls = owner(source), ctor = constructor(cls), parameter = ctor.parameters[3];
  assert.equal(ctor.parameters.length, 11); assert.equal(parameter.name.getText(source), '_zone');
  assert.equal(parameter.type.getText(source), 'NgZone'); assert.equal(Boolean(parameter.questionToken), false); assert.equal(Boolean(parameter.initializer), false);
  assert.ok(parameter.modifiers.some(node => node.kind === ts.SyntaxKind.PrivateKeyword));
  const bindings = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === '@angular/core')
    .flatMap(node => node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) ?
      node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === 'NgZone') : []);
  assert.equal(bindings.length, 1); const binding = bindings[0], symbol = checker.getSymbolAtLocation(binding.name);
  assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly); assert.deepEqual(symbol.declarations, [binding]);
  const references = [], accesses = [], forwarding = [];
  function visit(node) {
    if (ts.isIdentifier(node) && node !== binding.name && checker.getSymbolAtLocation(node) === symbol) {
      assert.equal(node.parent === parameter.type, true); references.push({role: 'required-constructor-type', expression: print(parameter, source).trim()});
    }
    if (ts.isIdentifier(node) && node !== parameter.name && checker.getSymbolAtLocation(node)?.declarations?.includes(parameter)) {
      assert.ok(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node);
      const receiver = node.parent, usage = receiver.parent;
      if (ts.isPropertyAccessExpression(usage) && usage.expression === receiver) {
        assert.ok(ts.isCallExpression(usage.parent) && usage.parent.expression === usage);
        assert.ok(['run', 'runOutsideAngular'].includes(usage.name.text));
        assert.equal(usage.parent.arguments.length, 1); assert.ok(ts.isArrowFunction(usage.parent.arguments[0]));
        accesses.push({member: usage.name.text, expression: usage.getText(source)});
      } else {
        assert.ok(ts.isCallExpression(usage)); assert.equal(usage.expression.getText(source), 'afterLegacyRender');
        assert.equal(usage.arguments[0] === receiver, true); assert.equal(usage.arguments[1].getText(source), 'this._viewContainerRef.injector');
        forwarding.push({target: 'afterLegacyRender', argument_index: 0, expression: receiver.getText(source)});
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source); assert.equal(references.length, 1); assert.deepEqual(accesses.map(row => row.member), ['runOutsideAngular', 'run', 'run']); assert.equal(forwarding.length, 1);
  const originalRaw = readMember(ORIGINAL).toString(); assert.equal(hash(originalRaw), 'b69decaf81ef29dd665a0b267f3a121837212157b31ddd02c3b617fa958844f2');
  const originalSource = parse(originalRaw), originalCtor = constructor(owner(originalSource));
  assert.deepEqual(ctor.parameters.map(node => print(node, source)), originalCtor.parameters.map(node => print(node, originalSource)));
  const separateNames = ['_handsetLandscapeSubscription', '_initialized', '_windowBlurHandler', 'optionSelections', '_breakpointObserver'];
  const differences = [];
  function comparable(text, phase) {
    const emitted = parse(emitAutocompleteZoneClass(text)), node = constructor(owner(emitted, 'Replay'));
    const selected = node.body.statements.filter(statement => ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression) &&
      ts.isPropertyAccessExpression(statement.expression.left) && separateNames.includes(statement.expression.left.name.text));
    assert.deepEqual(selected.map(statement => statement.expression.left.name.text), phase === 'current' ? separateNames : ['_windowBlurHandler', 'optionSelections']);
    differences.push({phase, separately_owned_initializers: selected.map(statement => ({name: statement.expression.left.name.text,
      initializer_sha256: hash(print(statement.expression.right, emitted))}))});
    const copy = ts.factory.updateConstructorDeclaration(node, node.modifiers, node.parameters,
      ts.factory.updateBlock(node.body, node.body.statements.filter(statement => !selected.includes(statement))));
    return tokens(print(copy, emitted));
  }
  assert.deepEqual(comparable(raw, 'current'), comparable(originalRaw, 'untouched16'), 'constructor differs outside enumerated existing fields/stream/focus/view-lookup boundaries');
  const line = JSON.parse(readMember('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const render = renderEvidence(root, readMember, line), names = ['ngAfterViewInit', 'closePanel', '_subscribeToClosingActions'];
  return {line, raw, case: {file: 'legacy-autocomplete/internal/autocomplete-trigger-base.ts', module: '@angular/core', symbol: 'NgZone',
    candidate_source_sha256: hash(raw), required_parameter_index: 3, references, member_accesses: accesses, forwarding,
    all_eleven_original_parameter_declarations_unchanged: true, constructor_equal_outside_enumerated_existing_boundaries: true, enumerated_existing_constructor_boundaries: differences},
    payload: {candidate: emitAutocompleteZoneClass(raw), original: emitAutocompleteZoneClass(originalRaw)},
    typed_methods: names.map(name => print(cls.members.find(node => node.name?.text === name), source)).join('\n'),
    sources: [AUTOCOMPLETE_ZONE_SOURCE, AUTOCOMPLETE_ZONE_HELPER, EVENT].map(path => ({path, sha256: hash(readMember(path))})),
    original: {path: ORIGINAL, sha256: hash(originalRaw)}, render_evidence: render,
    limits: 'Complete current/original class definitions and real constructors; fresh supplement scope is blur registration/callback/removal, render-helper identity and two view-update reentry paths. Window/DOM/focus/overlay/panel/CDR/view-container and the borrowed BreakpointObserver value are explicit protocols; the injector and public CDK service token, NgZone, QueryList/EventEmitter and RxJS are genuine. Window adapter uses actual patched Node EventEmitter for callback capture, not native browser event routing. The unchanged original render producer is freshly executed with current input bytes, retaining its separate body-only scope and limits. No actual legacy component node DI, real observer creation, native shadow focus/geometry, full overlay lifetime, packed/AOT/consumer or complete advertised floors are qualified.'};
}
