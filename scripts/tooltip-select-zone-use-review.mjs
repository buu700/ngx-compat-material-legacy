/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact current local/inherited receivers; whole original producers remain unchanged. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {emitFormMenuZoneClass, changeFormMenuZoneMethod} from './form-menu-zone-use-review.mjs';
export {menuSnackZonePublicDeclarations as tooltipSelectZonePublicDeclarations} from './menu-snack-zone-use-review.mjs';
const ts = createRequire(import.meta.url)('typescript'), hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const TOOLTIP = 'projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts';
export const SELECT = 'projects/ngx-material-legacy/legacy-select/internal/select-base.ts';
export const LEAF = 'projects/ngx-material-legacy/legacy-select/select.ts';
const printer = ts.createPrinter({removeComments: true}), print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
const parse = raw => {const source = ts.createSourceFile('zone-caller.ts', raw, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;};
const owner = (source, name) => {const matches = source.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === name); assert.equal(matches.length, 1); return matches[0];};
const ctor = cls => {const matches = cls.members.filter(ts.isConstructorDeclaration); assert.equal(matches.length, 1); return matches[0];};
export const emitTooltipSelectClass = (raw, select = false) => emitFormMenuZoneClass(raw, select ? '_MatSelectBase' : '_MatTooltipBase', select ? 'TraitsProtocol' : undefined);
export const changeTooltipZoneMethod = (raw, name, from, to) => changeFormMenuZoneMethod(raw, '_MatTooltipBase', name, from, to);
const originalPrograms = {
  'tests/tooltip_render_runtime_probe.mjs': 'c9eb1005aae281eafbe9db7214076bd9ea0a42aec4b76a847caab359948a86f6',
  'tests/test_tooltip_render_runtime.py': 'b2e84e23ee336d3da56e81f5229af58a59f3eb4eb6e578a6e2874ca8d4be35b7',
  'tests/select_render_runtime_probe.mjs': '0ed0f30b529ec98d6f1a3bb63c315ae5cf7928b4da1a0acd04aa0317063647ce',
  'tests/test_select_render_runtime.py': 'ffa4cb27f5c41371cd46c239cb742ece200bc3cda8715e7d547b0fb39e9eaeeb',
};
export function reviewTooltipSelectZoneUses({root = process.cwd(), readMember = path => readFileSync(join(root, path))} = {}) {
  const line = JSON.parse(readMember('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const cases = [], payload = {}, typed = {}, originals = [];
  for (const spec of [
    {path: TOOLTIP, name: '_MatTooltipBase', index: 4, count: 12, visibility: ts.SyntaxKind.PrivateKeyword,
      members: ['run', 'run', 'run', 'run', 'runOutsideAngular'], target: 'afterTooltipRender', key: 'tooltip',
      original: 'reference/material-16.2.14/tooltip-render-sources/tooltip.ts', digest: '14d7821fe83cdfdc8ac9d6f2f8e095a24178ad286a8f9d4eea4245e879d5501c'},
    {path: SELECT, name: '_MatSelectBase', index: 2, count: 15, visibility: ts.SyntaxKind.ProtectedKeyword,
      members: ['onStable', 'isStable'], target: 'afterSelectRender', key: 'select',
      original: 'reference/material-16.2.14/select-render-sources/select-base.ts', digest: 'ba939bcc724eab50cc71c628c3977ddd68f052bfb265a77de8793ec09562cd73'},
  ]) {
    const paths = spec.path === SELECT ? [SELECT, LEAF] : [TOOLTIP], raw = readMember(spec.path).toString();
    const options = {noResolve: true, noLib: true, experimentalDecorators: true, target: ts.ScriptTarget.ES2022};
    const host = ts.createCompilerHost(options), oldRead = host.readFile.bind(host), selected = new Map(paths.map(path => [join(root, path), readMember(path).toString()]));
    host.readFile = path => selected.has(path) ? selected.get(path) : oldRead(path);
    const program = ts.createProgram(paths.map(path => join(root, path)), options, host), checker = program.getTypeChecker(), source = program.getSourceFile(join(root, spec.path));
    const cls = owner(source, spec.name), constructor = ctor(cls), parameter = constructor.parameters[spec.index];
    assert.equal(constructor.parameters.length, spec.count); assert.equal(parameter.name.getText(source), '_ngZone'); assert.equal(parameter.type.getText(source), 'NgZone');
    assert.equal(Boolean(parameter.questionToken), false); assert.equal(Boolean(parameter.initializer), false); assert.ok(parameter.modifiers.some(node => node.kind === spec.visibility));
    const bindings = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === '@angular/core')
      .flatMap(node => node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) ? node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === 'NgZone') : []);
    assert.equal(bindings.length, 1); const binding = bindings[0], imported = checker.getSymbolAtLocation(binding.name);
    assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly); assert.deepEqual(imported.declarations, [binding]);
    const references = [], accesses = [], forwarding = [];
    for (const path of paths) {
      const file = program.getSourceFile(join(root, path));
      if (path === LEAF) {
        const leafClass = owner(file, 'MatLegacySelect'); assert.ok(!leafClass.members.some(node => node.name?.getText(file) === '_ngZone'));
        assert.equal(leafClass.heritageClauses.find(node => node.token === ts.SyntaxKind.ExtendsKeyword).types[0].expression.getText(file), '_MatSelectBase');
      }
      function visit(node) {
        if (ts.isIdentifier(node) && node !== binding.name && checker.getSymbolAtLocation(node) === imported) {
          assert.equal(node.parent === parameter.type, true); references.push({role: 'required-constructor-type', expression: print(parameter, source)});
        }
        if (ts.isIdentifier(node) && node !== parameter.name && node.text === '_ngZone') {
          assert.ok(checker.getSymbolAtLocation(node)?.declarations?.includes(parameter), 'inherited/local receiver does not bind to the required parameter');
          assert.ok(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node); const receiver = node.parent, usage = receiver.parent;
          if (ts.isPropertyAccessExpression(usage) && usage.expression === receiver) {
            accesses.push({member: usage.name.text, expression: usage.getText(file), file: path.replace('projects/ngx-material-legacy/', '')});
          } else {
            assert.ok(ts.isCallExpression(usage) && usage.expression.getText(file) === spec.target); assert.equal(usage.arguments[0] === receiver, true);
            forwarding.push({target: spec.target, argument_index: 0, expression: receiver.getText(file), file: path.replace('projects/ngx-material-legacy/', '')});
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(file);
    }
    assert.equal(references.length, 1); assert.deepEqual(accesses.map(row => row.member), spec.members); assert.equal(forwarding.length, 1);
    const original = readMember(spec.original).toString(); assert.equal(hash(original), spec.digest);
    const oldSource = parse(original), oldCtor = ctor(owner(oldSource, spec.name));
    assert.equal(print(parameter, source), print(oldCtor.parameters[spec.index], oldSource));
    cases.push({file: spec.path.replace('projects/ngx-material-legacy/', ''), module: '@angular/core', symbol: 'NgZone', candidate_source_sha256: hash(raw),
      required_parameter_index: spec.index, original_required_zone_parameter_unchanged: true, references, member_accesses: accesses, forwarding,
      inherited_forwarding_bound_to_same_parameter: spec.path === SELECT, other_service_escapes: 0, full_component_API_equivalence_claimed: false});
    payload[spec.key] = emitTooltipSelectClass(raw, spec.path === SELECT); payload[spec.key + 'Raw'] = raw;
    typed[spec.key] = print(cls.members.find(node => node.name?.text === (spec.path === SELECT ? 'optionSelectionChanges' : '_syncAriaDescription')), source);
    originals.push({path: spec.original, sha256: spec.digest});
  }
  for (const [path, digest] of Object.entries(originalPrograms)) assert.equal(hash(readMember(path)), digest);
  const reports = [];
  for (const [key, faults, digest] of [
    ['tooltip', 52, line === 'main' ? '874757e3cfd74638da45897093161db09aa4ee478ba69d33ed56a7008c542691' : '591239e2edf15b654f930019106a5acb7bb6f960f98b5f64c8ccbe743d47b1c6'],
    ['select', 40, line === 'main' ? 'c326431694d5a915bdbef74fd4883cfe340ede925ec3de468e9529ee8e079dc5' : '1ec47a33fdf38867ea6c3af923266064e228e92f427119ed52c2b05a068411a9'],
  ]) {
    const path = 'compatibility/rc/tooltip-select-zone-use-' + key + '-runtime.json'; assert.equal(hash(readMember(path)), digest);
    const report = JSON.parse(readMember(path)); assert.equal(report.line, line); assert.equal(report.results.length, 10); assert.equal(report.results.flatMap(row => row.mutations).length, faults);
    assert.equal(report.namespace_capsule_sha256, hash(readMember('compatibility/rc/material-public-subjects.json')));
    for (const source of report.sources) assert.equal(hash(readMember(source.path)), source.sha256);
    reports.push({path, sha256: digest, subjects: 10, behavioral_faults: faults, all_current_reported_source_inputs_match: true, scope: report.scope});
  }
  return {line, cases, payload, typed, originals, fresh_original_reports: reports,
    sources: [TOOLTIP, SELECT, LEAF].map(path => ({path, sha256: hash(readMember(path))})),
    preserved_original_programs: Object.entries(originalPrograms).map(([path, sha256]) => ({path, sha256})),
    limits: 'Complete current classes/constructors and unchanged original render producers, with genuine public zones/current application providers. Trait, view/DOM, focus monitor, overlay/position/visibility, ARIA and CDR services are explicit protocols. Fresh supplement checks same-service construction, focus/clipped-overlay/Escape reentry and genuine Promise context capture for description. No actual legacy node DI, native focus/DOM/geometry, full component API, packed/AOT/consumer or complete Node/compiler/RxJS floors are qualified.'};
}
