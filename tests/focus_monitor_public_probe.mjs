/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, posix, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync, spawnSync} from 'node:child_process';
import {reviewFocusMonitorUses} from '../scripts/focus-monitor-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const review = reviewFocusMonitorUses({root});
const changedPath = 'projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts';
const source = readFileSync(join(root, changedPath), 'utf8');
const mutations = [
  ['type-only-token', source.replace('FocusableOption, FocusMonitor, FocusOrigin', 'FocusableOption, type FocusMonitor, FocusOrigin')],
  ['private-service-member', source.replace('.stopMonitoring(', '._stopMonitoring(')],
  ['duplicate-import', source + "\nimport {FocusMonitor as DuplicateMonitor} from '@angular/cdk/a11y';\n"],
  ['runtime-construction', source + '\nconst unexpectedFocusService = new FocusMonitor();\n'],
  ['missing-import', source.replace('FocusableOption, FocusMonitor, FocusOrigin', 'FocusableOption, FocusOrigin')],
  ['missing-teardown', source.replace('this._focusMonitor.stopMonitoring(this._elementRef);', '')],
  ['unreviewed-reference', source + '\ntype ExtraMonitor = FocusMonitor;\n'],
];
for (const [id, changed] of mutations) {
  assert.notEqual(changed, source, id);
  assert.throws(() => reviewFocusMonitorUses({root,
    readSource: path => path === changedPath ? changed : readFileSync(join(root, path), 'utf8')}), id);
}
const printer = ts.createPrinter({removeComments: true});
const stable = node => assert.ok(!ts.getJSDocTags(node).some(tag =>
  ['deprecated', 'docs-private', 'experimental'].includes(tag.tagName.text)), 'unstable public focus API');
function declaration(model) {
  const manifest = model.packages.get('@angular/cdk');
  const entry = '@angular/cdk/' + manifest.exports['./a11y'].types.replace(/^\.\//, '');
  const chain = [], seen = new Set();
  function visit(path, name) {
    assert.ok(!seen.has(path + '#' + name)); seen.add(path + '#' + name);
    const text = model.sources.get(path); assert.equal(typeof text, 'string');
    const s = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    chain.push({path, name, sha256: hash(text)});
    const node = s.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === name);
    if (node) {
      stable(node);
      const methods = node.members.filter(n => ['monitor', 'stopMonitoring', 'focusVia', 'ngOnDestroy'].includes(n.name?.text));
      methods.forEach(stable); assert.equal(methods.length, 7);
      const signatures = methods.map(n => printer.printNode(ts.EmitHint.Unspecified, n, s).trim()
        .replace(/FocusOptions_2/g, 'FocusOptions'));
      const originalOptions = s.statements.find(n => ts.isInterfaceDeclaration(n) && n.name?.text === 'FocusOptions_2');
      return {entry, chain, signatures, original_options: originalOptions
        ? printer.printNode(ts.EmitHint.Unspecified, originalOptions, s).trim() : null};
    }
    for (const link of s.statements) {
      const clause = ts.isExportDeclaration(link) && link.exportClause && ts.isNamedExports(link.exportClause)
        ? link.exportClause : ts.isImportDeclaration(link) && link.importClause?.namedBindings
          && ts.isNamedImports(link.importClause.namedBindings) ? link.importClause.namedBindings : null;
      const item = clause?.elements.find(n => n.name.text === name);
      if (!item) continue;
      stable(item);
      const targetName = (item.propertyName || item.name).text;
      if (!link.moduleSpecifier) return visit(path, targetName);
      assert.ok(link.moduleSpecifier.text.startsWith('.'));
      return visit(posix.join(posix.dirname(path), link.moduleSpecifier.text.replace(/\.js$/, '.d.ts')), targetName);
    }
    assert.fail('public focus declaration absent');
  }
  return {line: model.line, ...visit(entry, 'FocusMonitor')};
}
const subjects = prepareMaterialPublicSubjects(root), worker = readFileSync(join(root, 'tests/focus_monitor_public_subject.mjs'));
try {
  const declarations = subjects.models.map(declaration);
  assert.deepEqual(declarations[1].signatures, declarations[0].signatures);
  assert.deepEqual(declarations[2].signatures, declarations[0].signatures);
  assert.equal(declarations[0].original_options, 'declare interface FocusOptions_2 {\n    preventScroll?: boolean;\n}');
  const results = [], controls = [];
  for (const model of subjects.models) {
    const path = join(model.root, 'focus-subject.mjs'); writeFileSync(path, worker);
    for (const production of [false, true]) {
      const output = execFileSync(process.execPath, [path, model.line, String(production)],
        {cwd: model.root, encoding: 'utf8', timeout: 10000});
      results.push({...JSON.parse(output.trim().split('\n').at(-1)), borrowed: model.borrowed});
    }
    for (const variant of ['skip-stop', 'lose-options', 'lose-child-monitor']) {
      const result = spawnSync(process.execPath, [path, model.line, 'false', variant],
        {cwd: model.root, encoding: 'utf8', timeout: 10000});
      assert.notEqual(result.status, 0, variant + ' escaped');
      assert.match(result.stderr, /AssertionError/, variant + ' did not reach an assertion');
      controls.push({line: model.line, variant, rejected_by_contract_assertion: true});
    }
  }
  const report = {...review, declarations, results, source_controls: mutations.map(([id]) => ({id, rejected: true})),
    actual_contract_controls: controls, public_subject_capsule_sha256: subjects.capsule_hash,
    producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), worker_sha256: hash(worker),
    scope: 'Complete16 current dependency/source contexts. SRI-authenticated complete Original16 and both minimum public service declarations and namespaces. Genuine public FocusMonitor factories/methods, Core injectors, ElementRef and RxJS execute against document/element/platform/NgZone/modality protocols. Seven original/minimum public method overloads are identical after the documented local original FocusOptions name is normalized; original preventScroll semantics survive. No full owned component factories, native DOM focus, actual zones/input detector, packed/AOT/compiler or Node/RxJS floors.', g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({frozen_uses: review.frozen_uses, current_uses: review.current_uses,
    subjects: results.length, cases: results.reduce((n, r) => n + r.cases.length, 0),
    source_negative_controls: mutations.length, contract_negative_controls: controls.length,
    native_or_packed_qualified: false}));
} finally {subjects.dispose();}
