/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact erased-import/removal controls with complete genuine public declarations. */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {harnessTypeSubjects, reviewHarnessErasedTypes} from '../scripts/harness-erased-types-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path), 'utf8'), options = {};
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {assert.ok(['--report', '--compiler-root'].includes(args[index]) && args[index + 1]); options[args[index]] = args[index + 1];}
const compilerRoot = options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT;
const subjects = await harnessTypeSubjects(root), report = await reviewHarnessErasedTypes({root, compilerRoot, subjects});
assert.equal(report.uses, 33); assert.equal(report.expanded_factory_members, 21); assert.equal(report.source_override_used, false);
const mutations = [], file = 'projects/ngx-material-legacy/legacy-card/testing/card-harness-filters.ts', text = read(file);
for (const [id, changed, pattern] of [
  ['private-import', text.replace("from '@angular/cdk/testing'", "from '@angular/cdk/private-testing'"), /missing\/ambiguous erased type import/],
  ['duplicate-import', text + "\nimport {BaseHarnessFilters as Duplicate} from '@angular/cdk/testing';\n", /missing\/ambiguous erased type import/],
  ['runtime-alias', text + '\nconst Borrowed = BaseHarnessFilters;\n', /outside erased interface\/type position/],
  ['runtime-class-heritage', text + '\nclass Borrowed extends BaseHarnessFilters {}\n', /outside erased interface\/type position/],
  ['wrong-generic-arity', text.replace('extends BaseHarnessFilters', 'extends BaseHarnessFilters<string>'), /generic arity changed/],
]) {
  assert.notEqual(changed, text);
  await assert.rejects(reviewHarnessErasedTypes({root, subjects, skipDiagnostics: true, readSource: path => path === file ? changed : read(path)}), pattern);
  mutations.push({id, rejected: true});
}
const factoryFile = 'projects/ngx-material-legacy/legacy-tooltip/testing/tooltip-harness-base.ts', factory = read(factoryFile);
for (const [id, changed, pattern] of [
  ['removed-import-restored', factory + "\nimport {AsyncFactoryFn as Locator} from '@angular/cdk/testing';\n", /removed AsyncFactoryFn import reintroduced/],
  ['removed-name-restored', factory + '\ntype AsyncFactoryFn<T> = () => Promise<T>;\n', /removed AsyncFactoryFn reference reintroduced/],
  ['factory-required-parameter', factory.replace('_optionalPanel: () =>', '_optionalPanel: (required: number) =>'), /factory requires no parameters/],
  ['factory-promise-like', factory.replace('() => Promise<TestElement | null>', '() => PromiseLike<TestElement | null>'), /must return Promise<T>/],
]) {
  assert.notEqual(changed, factory);
  await assert.rejects(reviewHarnessErasedTypes({root, subjects, skipDiagnostics: true, readSource: path => path === factoryFile ? changed : read(path)}), pattern);
  mutations.push({id, rejected: true});
}
const aliased = text.replace('import {BaseHarnessFilters}', 'import {BaseHarnessFilters as Filters}').replace('extends BaseHarnessFilters', 'extends Filters');
const alias = await reviewHarnessErasedTypes({root, subjects, skipDiagnostics: true, readSource: path => path === file ? aliased : read(path)});
assert.equal(alias.cases.find(row => row.file === 'legacy-card/testing/card-harness-filters.ts').local_name, 'Filters');
const typeOnly = text.replace('import {BaseHarnessFilters}', 'import type {BaseHarnessFilters}');
await reviewHarnessErasedTypes({root, subjects, skipDiagnostics: true, readSource: path => path === file ? typeOnly : read(path)});
report.alias_positive = true; report.type_only_positive = true; report.mutations = mutations; assert.equal(mutations.length, 9);
if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({line: report.line, uses: 33, files: report.files, expanded_factory_members: 21,
  subjects: 3, mutations: mutations.length, strict_negative_checks: 7, compiler: report.type_compilation.compiler, native_executed: false}));
