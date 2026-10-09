/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual peer batching and exact authored factory contracts; no native credit. */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exerciseHarnessParallel, parallelSubjects, reviewHarnessParallel} from '../scripts/harness-parallel-boundary-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path), 'utf8'), options = {};
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {assert.ok(['--report', '--compiler-root'].includes(args[index]) && args[index + 1]); options[args[index]] = args[index + 1];}
const compilerRoot = options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT;
const report = await reviewHarnessParallel({root, compilerRoot});
assert.equal(report.uses, 14); assert.equal(report.cases.flatMap(row => row.references).length, 30); assert.equal(report.source_override_used, false);
assert.deepEqual(report.behaviors.map(row => row.cases.length), [8, 8, 8]);
const {models} = await parallelSubjects(root), mutations = [];
for (const model of models.filter(model => model.subject.line !== 'original')) {
  const runtime = model.runtime;
  for (const [id, changed] of [
    ['no-detection-batching', values => Promise.all(values())],
    ['eager-values', values => {const eager = values(); return runtime.parallel(() => eager);}],
    ['double-factory', values => runtime.parallel(() => {values(); return values();})],
    ['reordered-results', async values => (await runtime.parallel(values)).reverse()],
    ['changed-object-identity', async values => (await runtime.parallel(values)).map(value => value && typeof value === 'object' ? {...value} : value)],
    ['swallowed-errors', async values => {try {return await runtime.parallel(values);} catch {return [];}}],
    ['sequential-without-batching', async values => {const out = []; for (const value of values()) out.push(await value); return out;}],
  ]) {
    await assert.rejects(exerciseHarnessParallel(runtime, changed), assert.AssertionError);
    mutations.push({id: model.subject.line + ':' + id, rejected: true});
  }
}
const file = 'projects/ngx-material-legacy/legacy-list/testing/list-item-harness-base.ts', text = read(file), call = 'parallel(() => lines.map(l => l.text()))';
assert.ok(text.includes(call));
for (const [id, changed, pattern] of [
  ['missing-public-import', text.replace("from '@angular/cdk/testing'", "from '@angular/cdk/private-testing'"), /missing\/ambiguous parallel import/],
  ['duplicate-import', text + "\nimport {parallel as Duplicate} from '@angular/cdk/testing';\n", /missing\/ambiguous parallel import/],
  ['runtime-helper-alias', text + '\nconst Borrowed = parallel;\n', /non-call parallel reference/],
  ['eager-array', text.replace(call, 'parallel(lines.map(l => l.text()))'), /parallel factory must be inline/],
  ['async-array-factory', text.replace(call, 'parallel(async () => lines.map(l => l.text()))'), /async factory produces unsupported array promise/],
  ['factory-parameter', text.replace(call, 'parallel((required: any) => lines.map(l => l.text()))'), /parallel factory requires parameters/],
  ['extra-argument', text.replace(call, 'parallel(() => lines.map(l => l.text()), true)'), /parallel requires one reviewed values factory/],
  ['non-array-factory', text.replace(call, 'parallel(() => new Set(lines))'), /parallel factory array production/],
  ['type-only-helper', text.replace('  parallel,', '  type parallel,'), /parallel runtime binding imported as type only/],
]) {
  assert.notEqual(changed, text);
  await assert.rejects(reviewHarnessParallel({root, compilerRoot, readSource: path => path === file ? changed : read(path)}), pattern);
  mutations.push({id, rejected: true});
}
const aliased = text.replace('  parallel,', '  parallel as PublicParallel,').replace(call, 'PublicParallel(() => lines.map(l => l.text()))');
const alias = await reviewHarnessParallel({root, compilerRoot, readSource: path => path === file ? aliased : read(path)});
assert.equal(alias.cases.find(row => row.file === 'legacy-list/testing/list-item-harness-base.ts').local_name, 'PublicParallel');
report.alias_positive = true; report.mutations = mutations; assert.equal(mutations.length, 23);
if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({line: report.line, uses: 14, calls: 30, subjects: 3, protocol_cases_per_subject: 8,
  mutations: mutations.length, compiler: report.type_compilation.compiler, native_executed: false}));
