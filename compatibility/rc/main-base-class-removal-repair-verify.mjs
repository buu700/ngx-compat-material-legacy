/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Independent main-peer checks; transferred21 results are provenance,not main qualification. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve, relative, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root = process.cwd(), prefix = 'compatibility/rc/main-base-class-removal-repair-';
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex'), bound = new Map();
function readBound(path, expected) {
  const absolute = resolve(root, path), raw = readFileSync(absolute);
  if (expected) assert.equal(hash(raw), expected, path);
  const ref = {path: relative(root, absolute), sha256: hash(raw), bytes: raw.length};
  if (bound.has(absolute)) assert.deepEqual(bound.get(absolute), ref); else bound.set(absolute, ref);
  return raw;
}
assert.equal(process.version, 'v24.21.0'); assert.equal(ts.version, '6.0.3');
readBound(fileURLToPath(import.meta.url)); readBound(require.resolve('typescript'));
const worksheet = JSON.parse(readBound(prefix + 'worksheet.json'));
const transfer = JSON.parse(readBound(worksheet.transfer.path, worksheet.transfer.sha256));
assert.equal(transfer.line, 'main'); assert.equal(transfer.changes.length, 4);
for (const ref of worksheet.protected_inputs) assert.equal(readBound(ref.path, ref.sha256).length, ref.bytes);
const versions = {};
for (const name of ['@angular/core', '@angular/compiler', '@angular/material', '@angular/cdk']) {
  const version = JSON.parse(readBound('node_modules/' + name + '/package.json')).version;
  assert.equal(version, '22.1.7', name); versions[name] = version;
}
versions.rxjs = JSON.parse(readBound('node_modules/rxjs/package.json')).version;
const applied = transfer.changes.map(change => {
  assert.equal(hash(change.before_source), change.before_sha256);
  assert.equal(hash(change.after_source), change.after_sha256);
  assert.equal(hash(change.patch), change.patch_sha256);
  assert.equal(readBound(change.path, change.after_sha256).toString(), change.after_source);
  return {id: change.id, path: change.path, before_sha256: change.before_sha256,
    after_sha256: change.after_sha256, equals_verified_21_implementation: true};
});
const exception = transfer.api_exception;
assert.equal(hash(exception.before_source), exception.before_sha256);
const oldApi = JSON.parse(exception.before_source);
assert.equal(oldApi.differences.filter(row => JSON.stringify(row) === JSON.stringify(exception.removed_exact_entry)).length, 1);
oldApi.differences = oldApi.differences.filter(row => JSON.stringify(row) !== JSON.stringify(exception.removed_exact_entry));
assert.equal(JSON.stringify(oldApi, null, 2) + '\n', exception.after_source);
assert.equal(readBound(exception.path, exception.after_sha256).toString(), exception.after_source);
assert.equal(oldApi.differences.length, 113);
for (const member of transfer.tagged_reference.members) {
  assert.equal(hash(member.body), member.sha256);
  assert.equal(createHash('sha1').update('blob ' + Buffer.byteLength(member.body) + '\0').update(member.body).digest('hex'), member.blob);
}
function classNode(text, name) {
  const source = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  const node = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === name); assert.ok(node, name);
  return {source, node};
}
function method(text, owner, name) {
  const {source, node} = classNode(text, owner);
  const member = node.members.find(n => ts.isMethodDeclaration(n) && n.name.getText(source) === name); assert.ok(member, name);
  return member.getText(source);
}
function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text), out = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) out.push([kind, scanner.getTokenText()]);
  return out;
}
const current = id => transfer.changes.find(row => row.id === id);
const tagged = path => {const row = transfer.tagged_reference.members.find(row => row.path === path); assert.ok(row, path); return row.body;};
const comparisons = [
  ['error', 'MatLegacyErrorHarness', '_getErrorPredicate', 'src/material/form-field/testing/error-harness.ts', '_MatErrorHarnessBase'],
  ['ink', '_MatTabNavBase', 'updateActiveLink', 'src/material/tabs/tab-nav-bar/tab-nav-bar.ts', '_MatTabNavBase'],
  ['keyboard', '_MatMenuBase', '_handleKeydown', 'src/material/menu/menu.ts', '_MatMenuBase'],
].map(([id, owner, name, originalPath, originalOwner]) => {
  assert.deepEqual(tokens(method(readBound(current(id).path).toString(), owner, name)),
    tokens(method(tagged(originalPath), originalOwner, name)));
  return {id, member: name, tagged_path: originalPath, exact_untouched_tagged_method_tokens: true};
});
const refPath = 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-ref.ts';
const localRefText = readBound(refPath).toString();
const ownRef = classNode(localRefText, 'MatSnackBarRef');
const tagRef = classNode(tagged('src/material/snack-bar/snack-bar-ref.ts'), 'MatSnackBarRef');
assert.deepEqual(tokens(ownRef.node.getText(ownRef.source)), tokens(tagRef.node.getText(tagRef.source)));

const errorPath = current('error').path, servicePath = current('snack').path;
const intro = `import {HarnessPredicate,ComponentHarnessConstructor} from '@angular/cdk/testing';
import {MatErrorHarness as Peer,ErrorHarnessFilters} from '@angular/material/form-field/testing';
import {MatLegacyErrorHarness as Owned} from '../../${errorPath.replace(/\.ts$/, '')}';
class Derived extends Owned {static predicate(){return super._getErrorPredicate(Derived,{text:/legacy/});}}
class Domain extends Owned {static predicateFor<T extends Peer>(type:ComponentHarnessConstructor<T>,options:ErrorHarnessFilters={}){
 return super._getErrorPredicate(type,options);}}
const one:HarnessPredicate<Owned>=Owned.with({text:'legacy'});
const two:HarnessPredicate<Derived>=Derived.with({text:/legacy/});
Derived.predicate();Domain.predicateFor(Peer);Domain.predicateFor(Owned);Domain.predicateFor(Derived);
`;
const options = {strict: true, strictPropertyInitialization: false, experimentalDecorators: true,
  skipLibCheck: false, noEmit: true, types: [], target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']};
const compilerCells = [];
for (const visibility of ['historical-protected-domain', 'outside-protected-control']) {
  const path = join(root, prefix + 'virtual-consumer.ts');
  const body = intro + (visibility === 'outside-protected-control' ? '\nOwned._getErrorPredicate(Owned,{});\n' : '');
  const host = ts.createCompilerHost(options), actualRead = host.readFile.bind(host), actualExists = host.fileExists.bind(host);
  host.readFile = file => resolve(file) === path ? body : actualRead(file);
  host.fileExists = file => resolve(file) === path || actualExists(file);
  host.getSourceFile = (file, languageVersion) => {
    const text = host.readFile(file); return text === undefined ? undefined : ts.createSourceFile(file, text, languageVersion, true);
  };
  host.writeFile = () => assert.fail('Main source compilation must not emit');
  const started = performance.now(), program = ts.createProgram([path, resolve(root, servicePath)], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).map(d => ({code: d.code,
    file: d.file ? relative(root, d.file.fileName) : null, message: ts.flattenDiagnosticMessageText(d.messageText, '\n')}));
  if (visibility === 'historical-protected-domain') assert.deepEqual(diagnostics, [], JSON.stringify(diagnostics));
  else {assert.equal(diagnostics.length, 1, JSON.stringify(diagnostics)); assert.equal(diagnostics[0].code, 2445);}
  for (const source of program.getSourceFiles()) if (resolve(source.fileName) !== path)
    assert.equal(readBound(source.fileName).toString(), source.text);
  compilerCells.push({visibility, consumer: body, seconds: (performance.now() - started) / 1000, diagnostics});
}
assert.doesNotMatch(ts.transpileModule(readBound(errorPath).toString(), {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
}}).outputText, /@angular\/material\/form-field\/testing/);

for (const specifier of ['@angular/compiler', '@angular/core', '@angular/material/snack-bar', '@angular/cdk/keycodes', 'rxjs'])
  readBound(fileURLToPath(import.meta.resolve(specifier)));
await import('@angular/compiler');
const {Injector} = await import('@angular/core');
const {MatSnackBarRef: PeerRef, MAT_SNACK_BAR_DATA} = await import('@angular/material/snack-bar');
const {Subject} = await import('rxjs');
const keys = await import('@angular/cdk/keycodes');
function classReplay(text, name, dependencies) {
  const {source, node} = classNode(text, name);
  const result = ts.transform(node, [context => current => {
    const visit = n => ts.isDecorator(n) ? undefined : ts.visitEachChild(n, visit, context);
    return ts.visitNode(current, visit);
  }]);
  let printed;
  try {printed = ts.createPrinter({removeComments: true}).printNode(ts.EmitHint.Unspecified, result.transformed[0], source);}
  finally {result.dispose();}
  const code = ts.transpileModule(printed.replace(/^export /, ''), {compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None,
  }}).outputText;
  return new Function(...Object.keys(dependencies), code + ';return ' + name)(...Object.values(dependencies));
}
const LocalRef = classReplay(localRefText, 'MatSnackBarRef', {Subject}); assert.notEqual(LocalRef, PeerRef);
const actualService = readBound(servicePath).toString();
function injectors(text) {
  const Service = classReplay(text, '_MatSnackBarBase', {Injector, MatSnackBarRef: LocalRef,
    PeerMatSnackBarRef: PeerRef, MAT_SNACK_BAR_DATA});
  return [false, true].map(inherited => {
    const parent = Injector.create({providers: inherited ? [{provide: PeerRef, useValue: {modern: true}}] : []});
    const marker = {legacy: true}, data = {message: 'legacy'};
    const service = new Service(null, null, parent, null, null, {}), content = service._createInjector({data}, marker);
    try {assert.equal(content.get(LocalRef), marker); assert.equal(content.get(PeerRef, null), marker);
      assert.equal(content.get(MAT_SNACK_BAR_DATA), data); return {inherited_modern_ref: inherited, both_tokens_resolve_owned_ref: true};
    } finally {content.destroy(); parent.destroy();}
  });
}
const injectorCases = injectors(actualService), provider = '{provide: PeerMatSnackBarRef, useValue: snackBarRef},';
assert.equal(actualService.split(provider).length, 2);
assert.throws(() => injectors(actualService.replace(provider, '')), {name: 'AssertionError'});
const navClass = classReplay('class Nav {' + method(readBound(current('ink').path).toString(), '_MatTabNavBase', 'updateActiveLink') + '}', 'Nav', {});
const hide = method(readBound('projects/ngx-material-legacy/legacy-tabs/ink-bar.ts').toString(), 'MatLegacyInkBar', 'hide');
const Ink = classReplay('class Ink {' + hide + '}', 'Ink', {});
const navCases = [null, [], [{active: false, id: 'a'}], [{active: true, id: 'a'}]].map(items => {
  const nav = new navClass(), ink = new Ink(), style = {visibility: 'visible'};
  ink._elementRef = {nativeElement: {style}};
  Object.assign(nav, {_items: items === null ? null : {toArray: () => items}, _inkBar: ink,
    selectedIndex: 0, tabPanel: {_activeTabId: null}, _changeDetectorRef: {markForCheck: () => {}}});
  nav.updateActiveLink();
  assert.equal(style.visibility, items && !items.some(i => i.active) ? 'hidden' : 'visible');
  return {items, selected_index: nav.selectedIndex, visibility: style.visibility};
});
const keyNames = ['ESCAPE', 'LEFT_ARROW', 'RIGHT_ARROW', 'UP_ARROW', 'DOWN_ARROW', 'hasModifierKey'];
const Menu = classReplay('class Menu {' + method(readBound(current('keyboard').path).toString(), '_MatMenuBase', '_handleKeydown') + '}',
  'Menu', Object.fromEntries(keyNames.map(name => [name, keys[name]])));
const menuCases = [{id: 'escape', code: keys.ESCAPE}, {id: 'modified-escape', code: keys.ESCAPE, modified: true},
  {id: 'nested-ltr-left', code: keys.LEFT_ARROW, parent: true}, {id: 'nested-rtl-right', code: keys.RIGHT_ARROW, parent: true, direction: 'rtl'},
  {id: 'root-left', code: keys.LEFT_ARROW}, {id: 'down-delegates', code: keys.DOWN_ARROW}].map(scenario => {
    const menu = new Menu(), events = [];
    Object.assign(menu, {parentMenu: scenario.parent ? {} : null, direction: scenario.direction || 'ltr',
      closed: {emit: reason => events.push(['closed', reason])},
      _keyManager: {setFocusOrigin: value => events.push(['origin', value]), onKeydown: () => events.push(['delegate'])}});
    menu._handleKeydown({keyCode: scenario.code, altKey: !!scenario.modified,
      preventDefault: () => events.push(['prevent']), stopPropagation: () => events.push(['stop'])});
    assert.equal(events.some(e => e[0] === 'stop'), scenario.id !== 'down-delegates');
    if (scenario.id === 'down-delegates') assert.deepEqual(events, [['origin', 'keyboard'], ['delegate']]);
    return {id: scenario.id, events};
  });
const names = transfer.changes.map(c => c.path).concat(exception.path).sort();
const changed = execFileSync('git', ['diff', '--name-only', worksheet.baseline_commit, '--', 'projects', exception.path],
  {cwd: root, encoding: 'utf8'}).trim().split('\n').filter(Boolean).sort();
assert.deepEqual(changed, names);
for (const [path, ref] of bound) {const raw = readFileSync(path); assert.equal(hash(raw), ref.sha256); assert.equal(raw.length, ref.bytes);}
const report = {schema_version: 1, line: 'main', node: process.version, compiler: ts.version, versions,
  applied, exact_untouched_tag_method_comparisons: comparisons, whole_owned_ref_matches_untouched_tag: true,
  actual_source_compiler_cells: compilerCells, protected_visibility_control_rejected: true, type_import_erased: true,
  actual_owned_service_public_injector_cases: injectorCases, missing_provider_control_rejected: true,
  nav_method_cases: navCases, menu_method_cases: menuCases, original_programs_executed: false,
  API_exception_rows: {before: 114, after: 113, exact_obsolete_row_removed: true},
  exact_changed_paths: changed, HTML_CSS_SCSS_or_golden_changes: false,
  scope: 'Actual main helper/service sources compiled at main peers;whole service and exact nav/menu/ink-bar methods replayed with genuine public Injector,keycodes and token values. Receiver/DOM/style/CDR/parent service fields are protocols and Angular decorators are removed for replay. Tagged source is parsed only. No whole-product/AOT,node-DI,native DOM/propagation/layout/motion,packed,consumer or full floors.',
  source_owner_reconciliation_complete: false, canonical_dispositions_changed: 0, canonical_admission_ready: false,
  actual_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed', source_bindings: [...bound.values()]};
writeFileSync(prefix + 'qualified.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({result: 'four-historical-repairs-independently-verified-on-main', actual_source_compiler_cells: 2,
  protected_visibility_control_rejected: true, actual_service_injector_cases: 2, nav_cases: 4, menu_cases: 6,
  exact_untouched_tag_methods: 3, obsolete_API_exception_removed: true, native_or_packed_qualified: false}));
