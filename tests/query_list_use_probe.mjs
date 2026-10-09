/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exerciseQueryList, queryListSubjects, reviewQueryListUses} from '../scripts/query-list-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(join(root, p), 'utf8'), options = {};
const args = process.argv.slice(2); for (let i = 0; i < args.length; i += 2) {assert.ok(['--report', '--compiler-root'].includes(args[i]) && args[i + 1]); options[args[i]] = args[i + 1];}
const subjects = await queryListSubjects(root);
try {
  const report = await reviewQueryListUses({root, subjects, compilerRoot: options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT});
  assert.equal(report.frozen_uses, 21); assert.equal(report.current_uses, 21); assert.equal(report.source_override_used, false);
  assert.equal(report.cases.flatMap(c => c.references).length, 38); assert.equal(report.cases.flatMap(c => c.references).filter(r => r.kind === 'query-type').length, 36);
  assert.equal(report.cases.filter(c => c.unused_import_erasure).length, 1);
  assert.deepEqual(report.behaviors.map(c => c.cases.length), [17, 17, 17]);
  assert.deepEqual(report.owned_executions.map(c => c.receipts.reduce((sum, r) => sum + r.cases.length, 0)), [30, 30, 30]);
  assert.deepEqual(report.behaviors.map(c => c.unsupported_js_iterator_accessor_calls), [1, 0, 0]);
  const mutations = [];
  for (const model of subjects.models.filter(m => m.subject.line !== 'original')) {
    const core = model.runtime, Base = core.QueryList;
    for (const [id, Type] of [
      ['flatten-results-lost', class extends Base {reset(tree, identity) {super.reset(tree.filter(v => !Array.isArray(v)), identity);}}],
      ['object-identity-lost', class extends Base {get(i) {const v = super.get(i); return v ? {...v} : v;}}],
      ['array-copy-order-changed', class extends Base {toArray() {return super.toArray().reverse();}}],
      ['default-distinct-mode', class extends Base {constructor() {super(true);}}],
      ['notifications-omitted', class extends Base {notifyOnChanges() {}}],
      ['identity-accessor-ignored', class extends Base {reset(tree) {super.reset(tree);}}],
      ['destruction-omitted', class extends Base {destroy() {}}],
    ]) {assert.throws(() => exerciseQueryList(core, Type), assert.AssertionError); mutations.push({id: model.subject.line + ':' + id, rejected: true});}
  }
  const file = 'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts', text = read(file);
  for (const [id, changed, pattern] of [
    ['duplicate-import', text + "\nimport {QueryList as Duplicate} from '@angular/core';\n", /missing\/ambiguous query import/],
    ['runtime-alias', text + '\nconst Alias = QueryList;\n', /typed query boundary/],
    ['subclass', text + '\nclass Derived extends QueryList<void> {}\n', /unreviewed query alias/],
    ['type-only-runtime', text.replace('  QueryList,', '  type QueryList,'), /runtime query imported type only/],
    ['distinct-mode-changed', text.replace('new QueryList<MatMenuItem>()', 'new QueryList<MatMenuItem>(true)'), /historical query uses default notification mode/],
    ['parent-filter-removed', text.replace('item._parentMenu === (this as MatMenuPanel<MatMenuItem>)', 'true'), /whole query consumer differs from original/],
    ['notify-call-removed', text.replace('this._directDescendantItems.notifyOnChanges();', ''), /whole query consumer differs from original/],
  ]) {assert.notEqual(changed, text); await assert.rejects(reviewQueryListUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? changed : read(p)}), pattern); mutations.push({id, rejected: true});}
  const lineFile = 'projects/ngx-material-legacy/legacy-core/internal/line/line.ts', lineText = read(lineFile), changed = lineText.replace('setClass(element, `${prefix}-multi-line`, false);', '');
  assert.notEqual(changed, lineText); await assert.rejects(reviewQueryListUses({root, subjects, skipDiagnostics: true, readSource: p => p === lineFile ? changed : read(p)}), /whole query helper differs from original/); mutations.push({id: 'stale-line-class-not-cleared', rejected: true});
  const alias = text.replace('  QueryList,', '  QueryList as Query,').replaceAll('QueryList<', 'Query<');
  const aliased = await reviewQueryListUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? alias : read(p)}); assert.equal(aliased.cases.find(c => c.file === 'legacy-menu/internal/menu-base.ts').local_name, 'Query');
  report.alias_positive = true; report.mutations = mutations; assert.equal(mutations.length, 22);
  if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
  console.log(JSON.stringify({line: report.line, frozen_uses: 21, current_uses: 21, references: 38, types: 36, constructions: 2, unused_imports: 1, subjects: 3, controls_per_subject: 17, original_owned_context_cases_per_subject: 30, mutations: mutations.length, compiler: report.type_compilation.compiler, native_executed: false}));
} finally {subjects.dispose();}
