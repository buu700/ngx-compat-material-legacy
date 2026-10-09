/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual peer predicate behavior and exact imported authored use controls. */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exerciseHarnessPredicate, predicateSubjects, reviewHarnessPredicate} from '../scripts/harness-predicate-boundary-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path), 'utf8'), options = {};
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {assert.ok(['--report', '--compiler-root'].includes(args[index]) && args[index + 1]); options[args[index]] = args[index + 1];}
const compilerRoot = options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT;
const subjects = await predicateSubjects(root), report = await reviewHarnessPredicate({root, compilerRoot, subjects});
assert.equal(report.uses, 49); assert.equal(report.source_override_used, false); assert.deepEqual(report.behaviors.map(row => row.cases.length), [14, 14, 14]);
const mutations = [], fieldObservations = [];
for (const model of subjects.models) {
  const Base = model.runtime.HarnessPredicate; let setters = 0;
  class UnsupportedAccessor extends Base {get harnessType() {return model.runtime.ComponentHarness;} set harnessType(value) {setters++;}}
  new UnsupportedAccessor(model.runtime.ComponentHarness, {});
  assert.equal(setters, model.subject.line === 'original' ? 1 : 0);
  fieldObservations.push({line: model.subject.line, unsupported_accessor_setter_calls: setters, authored_subclasses: 0,
    scope: 'Measured JS difference;both strict declaration compilers reject data-property accessor override. Direct factories only are reviewed.'});
  if (model.subject.line === 'original') continue;
  for (const [id, factory] of [
    ['wrong-harness-type', Base => class extends Base {constructor(type, options) {super(type, options); this.harnessType = class {};}}],
    ['ignored-base-selector', Base => class extends Base {constructor(type, options) {super(type, {...options, selector: undefined});}}],
    ['ancestor-first-only', Base => class extends Base {getSelector() {return super.getSelector().split(',')[0];}}],
    ['changed-description', Base => class extends Base {getDescription() {return super.getDescription() + ' changed';}}],
    ['regex-full-match', Base => class extends Base {static async stringMatches(value, pattern) {value = await value; return typeof pattern === 'string' ? value === pattern : pattern === null ? value === null : value !== null && value.match(pattern)?.[0] === value;}}],
    ['falsy-option-skipped', Base => class extends Base {addOption(name, option, predicate) {return option ? super.addOption(name, option, predicate) : this;}}],
    ['lost-chain-identity', Base => class extends Base {addOption(...args) {super.addOption(...args); return {};}}],
    ['evaluate-or', Base => class extends Base {async evaluate(item) {const results = await Promise.all(this._predicates.map(p => p(item))); return results.some(Boolean);}}],
    ['evaluate-short-circuit', Base => class extends Base {async evaluate(item) {for (const predicate of this._predicates) if (!await predicate(item)) return false; return true;}}],
    ['filter-reordered', Base => class extends Base {async filter(items) {return (await super.filter(items)).reverse();}}],
    ['filter-lost-identity', Base => class extends Base {async filter(items) {return (await super.filter(items)).map(item => ({...item}));}}],
    ['swallowed-predicate-error', Base => class extends Base {async evaluate(item) {try {return await super.evaluate(item);} catch {return false;}}}],
    ['unbatched-evaluation', Base => class extends Base {async evaluate(item) {return (await Promise.all(this._predicates.map(p => p(item)))).every(Boolean);}}],
  ]) {
    await assert.rejects(exerciseHarnessPredicate(model.runtime, factory(Base)), assert.AssertionError);
    mutations.push({id: model.subject.line + ':' + id, rejected: true});
  }
}
const file = 'projects/ngx-material-legacy/legacy-button/testing/button-harness.ts', text = read(file), ctor = 'new HarnessPredicate(MatLegacyButtonHarness, options)';
assert.ok(text.includes(ctor));
for (const [id, changed, pattern] of [
  ['private-import', text.replace("from '@angular/cdk/testing'", "from '@angular/cdk/private-testing'"), /missing\/ambiguous HarnessPredicate import/],
  ['duplicate-import', text + "\nimport {HarnessPredicate as Duplicate} from '@angular/cdk/testing';\n", /missing\/ambiguous HarnessPredicate import/],
  ['runtime-alias', text + '\nconst Borrowed = HarnessPredicate;\n', /unreviewed predicate runtime reference/],
  ['predicate-subclass', text + '\nclass Borrowed extends HarnessPredicate {}\n', /unreviewed predicate runtime reference/],
  ['type-only-runtime', text.replace(', HarnessPredicate}', ', type HarnessPredicate}'), /predicate runtime imported as type only/],
  ['missing-options', text.replace(ctor, 'new HarnessPredicate(MatLegacyButtonHarness)'), /reviewed constructor and options/],
  ['new-unreviewed-instance-member', text.replace(ctor, ctor + '.getSelector()'), /unreviewed predicate chain member/],
  ['static-private-access', text + '\nHarnessPredicate._addBaseOptions();\n', /unreviewed predicate runtime reference/],
  ['static-matcher-alias', text + '\nconst matcher = HarnessPredicate.stringMatches;\n', /unreviewed static matcher alias/],
  ['new-private-state', text.replace(ctor, ctor + '._predicates'), /unreviewed predicate chain member/],
]) {
  assert.notEqual(changed, text);
  await assert.rejects(reviewHarnessPredicate({root, subjects, skipDiagnostics: true, readSource: path => path === file ? changed : read(path)}), pattern);
  mutations.push({id, rejected: true});
}
const aliased = text.replace(', HarnessPredicate}', ', HarnessPredicate as PublicPredicate}').replace(/\bHarnessPredicate\b/g, 'PublicPredicate')
  .replace('PublicPredicate as PublicPredicate', 'HarnessPredicate as PublicPredicate');
const alias = await reviewHarnessPredicate({root, subjects, skipDiagnostics: true, readSource: path => path === file ? aliased : read(path)});
assert.equal(alias.cases.find(row => row.file === 'legacy-button/testing/button-harness.ts').local_name, 'PublicPredicate');
report.alias_positive = true; report.field_observations = fieldObservations; report.mutations = mutations; assert.equal(mutations.length, 36);
if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({line: report.line, uses: 49, population: report.population, subjects: 3, protocol_cases_per_subject: 14,
  mutations: mutations.length, compiler: report.type_compilation.compiler, native_executed: false}));
