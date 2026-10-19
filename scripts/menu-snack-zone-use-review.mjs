/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Two exact stability callers; original lifecycle producers remain unchanged. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {emitFormMenuZoneClass, changeFormMenuZoneMethod} from './form-menu-zone-use-review.mjs';
const ts = createRequire(import.meta.url)('typescript'), hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const MENU_ZONE_SOURCE = 'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts';
export const SNACK_ZONE_SOURCE = 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts';
const specifications = [
  {path: MENU_ZONE_SOURCE, name: '_MatMenuBase', index: 1, arity: 4, references: 3,
    original: 'reference/material-16.2.14/menu-focus-sources/menu.ts', originalHash: '6331b83ef79611313f58650d4813eb0de44c2710deec830a292674328afc2bef',
    members: ['onStable', 'isStable'], methods: ['focusFirstItem'], aliases: 0},
  {path: SNACK_ZONE_SOURCE, name: '_MatSnackBarContainerBase', index: 0, arity: 5, references: 1,
    original: 'reference/material-16.2.14/snack-exit-sources/snack-bar-container.ts', originalHash: 'b05c4729015b916f7cb654809d86f9ba3e51e9a9a14b68ad34a47dce1602ff47',
    members: ['run', 'run', 'run', 'run', 'run', 'isStable', 'onMicrotaskEmpty', 'runOutsideAngular'], aliases: 1,
    methods: ['onAnimationEnd', '_notifyEnter', 'exit', '_completeExit', '_screenReaderAnnounce']},
];
const printer = ts.createPrinter({removeComments: true}), print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
const parse = raw => {const source = ts.createSourceFile('zone-caller.ts', raw, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;};
const owner = (source, name) => {const matches = source.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === name); assert.equal(matches.length, 1); return matches[0];};
const enclosingMethod = node => {while (node && !ts.isMethodDeclaration(node)) node = node.parent; return node?.name?.text;};
export const emitMenuSnackZoneClass = (raw, snack) => emitFormMenuZoneClass(raw, snack ? '_MatSnackBarContainerBase' : '_MatMenuBase', snack ? 'PortalProtocol' : undefined);
export const changeSnackZoneMethod = (raw, method, from, to) => changeFormMenuZoneMethod(raw, '_MatSnackBarContainerBase', method, from, to);
const originalProgramHashes = line => ({
  'tests/menu_focus_runtime_probe.mjs': line === 'main' ? 'cb826031477ab10035f672ae862d1e4e491bcec9bc424e447e2c81e2bb7aa569' : '54a95be614c169b34caa2fbeff3a5a095fc04658d49928d9d6e9d54a8d899e3a',
  'tests/menu_focus_runtime_subject.mjs': '65c2faa754fa13cfba0fa2f1a5faa0dea500ffc2a8ef25903a4f1dcc0efadeda',
  'tests/test_menu_focus_runtime.py': 'a4e656b916b6734ead928d8ccf137d6ac650ef6c914d00e458dbc85d2b29ca47',
  'tests/snack_exit_runtime_probe.mjs': line === 'main' ? '80a81c47e784fa9150b9680b3d4ff642ba25cffde302e142fd99d12234b63b76' : 'a42604ac34f1e9bcfdd42a38bd9a7699a1a0ec7badc5df82126f591fa90f7930',
  'tests/snack_exit_runtime_subject.mjs': '3c6000fcd516246f4ddc5e14d6a570e92090847c111c5ef985c4eeb849b78ce4',
  'tests/test_snack_exit_runtime.py': 'cf6fdd418a00819772e7118e936f3bed65bb261c6fe37239ef6704bad7cf56cf',
});
export function reviewMenuSnackZoneUses({root = process.cwd(), readMember = path => readFileSync(join(root, path))} = {}) {
  const line = JSON.parse(readMember('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const cases = [], payload = {}, typedMethods = {}, sources = [], originals = [];
  for (const spec of specifications) {
    const raw = readMember(spec.path).toString(), original = readMember(spec.original).toString(); assert.equal(hash(original), spec.originalHash);
    const options = {noResolve: true, noLib: true, experimentalDecorators: true, target: ts.ScriptTarget.ES2022};
    const host = ts.createCompilerHost(options), absolute = join(root, spec.path), oldRead = host.readFile.bind(host);
    host.readFile = path => path === absolute ? raw : oldRead(path);
    const program = ts.createProgram([absolute], options, host), source = program.getSourceFile(absolute), checker = program.getTypeChecker();
    const cls = owner(source, spec.name), constructors = cls.members.filter(ts.isConstructorDeclaration), ctor = constructors.find(node => node.body), parameter = ctor.parameters[spec.index];
    assert.equal(ctor.parameters.length, spec.arity); assert.equal(parameter.name.getText(source), '_ngZone'); assert.equal(parameter.type.getText(source), 'NgZone');
    assert.equal(Boolean(parameter.questionToken), false); assert.equal(Boolean(parameter.initializer), false);
    assert.ok(parameter.modifiers.some(node => node.kind === ts.SyntaxKind.PrivateKeyword));
    const bindings = source.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === '@angular/core')
      .flatMap(node => node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) ? node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === 'NgZone') : []);
    assert.equal(bindings.length, 1); const binding = bindings[0], imported = checker.getSymbolAtLocation(binding.name);
    assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly); assert.deepEqual(imported.declarations, [binding]);
    const references = [], accesses = [], aliases = new Set(), aliasRows = [];
    function member(receiver) {
      const usage = receiver.parent;
      if (ts.isPropertyAccessExpression(usage) && usage.expression === receiver) {
        assert.ok(spec.members.includes(usage.name.text));
        accesses.push({member: usage.name.text, method: enclosingMethod(usage), expression: usage.getText(source)});
      } else {
        assert.ok(ts.isVariableDeclaration(usage) && usage.initializer === receiver && ts.isIdentifier(usage.name));
        assert.equal(usage.name.text, 'zone'); assert.equal(enclosingMethod(usage), '_completeExit');
        assert.ok(usage.parent.flags & ts.NodeFlags.Const); aliases.add(usage);
        aliasRows.push({name: 'zone', method: '_completeExit', initializer: receiver.getText(source)});
      }
    }
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && checker.getSymbolAtLocation(node) === imported) {
        assert.ok(ts.isTypeReferenceNode(node.parent) && ts.isParameter(node.parent.parent)); const ref = node.parent.parent;
        assert.ok(constructors.includes(ref.parent)); assert.equal(ref.parent.parameters.indexOf(ref), spec.index);
        assert.equal(Boolean(ref.questionToken), false); references.push({role: ref.parent.body ? 'required-implementation-type' : 'historical-overload-type', expression: print(ref, source).trim()});
      }
      if (ts.isIdentifier(node) && node !== parameter.name && checker.getSymbolAtLocation(node)?.declarations?.includes(parameter)) {
        assert.ok(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node); member(node.parent);
      } else if (ts.isIdentifier(node) && aliases.size && checker.getSymbolAtLocation(node)?.declarations?.some(declaration => aliases.has(declaration)) && !aliases.has(node.parent)) {
        member(node);
      }
      ts.forEachChild(node, visit);
    }
    visit(source); assert.equal(references.length, spec.references); assert.equal(aliases.size, spec.aliases); assert.deepEqual(accesses.map(row => row.member), spec.members);
    const oldSource = parse(original), oldClass = owner(oldSource, spec.name);
    assert.deepEqual(constructors.map(node => print(node, source)), oldClass.members.filter(ts.isConstructorDeclaration).map(node => print(node, oldSource)), 'authored constructor changed');
    cases.push({file: spec.path.replace('projects/ngx-material-legacy/', ''), module: '@angular/core', symbol: 'NgZone', candidate_source_sha256: hash(raw), required_parameter_index: spec.index,
      original_authored_constructors_unchanged: true, field_initializers_or_complete_component_API_unchanged_claimed: false, references, member_accesses: accesses, internal_aliases: aliasRows, other_service_escapes: 0});
    const key = spec.path === MENU_ZONE_SOURCE ? 'menu' : 'snack'; payload[key] = emitMenuSnackZoneClass(raw, key === 'snack');
    payload[key + 'Raw'] = raw; typedMethods[key] = spec.methods.map(name => print(cls.members.find(node => node.name?.text === name), source)).join('\n');
    sources.push({path: spec.path, sha256: hash(raw)}); originals.push({path: spec.original, sha256: hash(original)});
  }
  const originalPrograms = originalProgramHashes(line);
  for (const [path, digest] of Object.entries(originalPrograms)) assert.equal(hash(readMember(path)), digest);
  const freshReports = [];
  for (const [key, count, digest] of [
    ['menu', 40, line === 'main' ? '57881c80d3533f1a8cb790f9d8a99c2cefba6eece3f54ba29bcc8ddc65b0f04a' : '2b22ecd1d59620545614488303b83b3bec0c7c6e7839c765c1d72f4845ea4021'],
    ['snack', 54, line === 'main' ? '82b5dde53879567130fca51d4bbf9f1b8177f41c6cc5366ca624a62c89fd60aa' : '487336a3166cf3435dafb86b4ef26e107c41993da8a53e16acfdc45506756d15'],
  ]) {
    const path = 'compatibility/rc/menu-snack-zone-use-' + key + '-runtime.json', raw = readMember(path); assert.equal(hash(raw), digest);
    const report = JSON.parse(raw); assert.equal(report.line, line); assert.equal(report.results.length, 10);
    assert.equal(report.results.flatMap(row => row.mutations).length, count); assert.equal(report.existing_constructor_and_public_declarations_unchanged, true);
    assert.equal(report.namespace_capsule_sha256, hash(readMember('compatibility/rc/material-public-subjects.json')));
    for (const input of report.sources) assert.equal(hash(readMember(input.path)), input.sha256);
    if (key === 'menu') assert.equal(report.sources[0].path, MENU_ZONE_SOURCE); else assert.equal(report.sources[0].path, SNACK_ZONE_SOURCE);
    freshReports.push({path, sha256: digest, subjects: 10, behavioral_faults: count, all_current_reported_source_inputs_match: true, scope: report.scope});
  }
  return {line, cases, sources, originals, payload, typedMethods, fresh_reports: freshReports,
    preserved_original_programs: Object.entries(originalPrograms).map(([path, sha256]) => ({path, sha256})),
    limits: 'Complete current class constructors/members are replayed with original lifecycle assertions retained. Menu key manager and framework primitives are genuine; menu item/host/DOM protocols remain explicit. Snack portal parent, DOM/CDR/config/platform and timer/frame/animation-policy surroundings are protocols. Fresh supplement observes genuine public service identity, outside-caller contexts and actual Node task capture with an announcement timer deliberately accelerated from150ms to0ms. No actual legacy Angular component node DI, real native focus/CSS/150ms timing, packed/AOT/consumer or all runtime/compiler/RxJS floors are qualified.'};
}
export function menuSnackZonePublicDeclarations(model) {
  const found = [], names = ['run', 'runOutsideAngular', 'onStable', 'onMicrotaskEmpty', 'isStable'];
  const stable = node => assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'docs-private', 'internal', 'experimental', 'developerPreview', 'breaking-change'].includes(tag.tagName.text)));
  for (const [path, text] of model.sources) if (path.startsWith('@angular/core/') && path.endsWith('.d.ts')) {
    const source = parse(text);
    for (const cls of source.statements) if (ts.isClassDeclaration(cls) && cls.name?.text === 'NgZone') {
      stable(cls); const members = cls.members.filter(node => names.includes(node.name?.getText(source))); assert.equal(members.length, 5);
      for (const node of members) {stable(node); const name = node.name.getText(source);
        if (name === 'run' || name === 'runOutsideAngular') {assert.ok(ts.isMethodDeclaration(node)); assert.equal(node.type.getText(source), 'T');}
        else {assert.ok(node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword)); assert.equal(node.type.getText(source), name === 'isStable' ? 'boolean' : 'EventEmitter<any>');}}
      found.push({line: model.line, path, source_sha256: hash(text), members: members.map(node => node.getText(source))});
    }
  }
  assert.equal(found.length, 1); return found[0];
}
