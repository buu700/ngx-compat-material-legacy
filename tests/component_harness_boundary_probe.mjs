/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Public peer base protocol and all exact authored bindings; no native credit. */
import assert from 'node:assert/strict';
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileHarnessBaseTypes, exerciseHarnessBase, loadHarnessSubjects, reviewComponentHarnessBoundary} from '../scripts/component-harness-boundary-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path), 'utf8');
const report = await reviewComponentHarnessBoundary({root});
assert.equal(report.uses, 26); assert.equal(report.files, 26); assert.equal(report.source_override_used, false);
assert.deepEqual(report.behaviors.map(row => row.cases.length), [23, 23, 23]);
const {models} = await loadHarnessSubjects(root);
const args = process.argv.slice(2), options = {};
for (let index = 0; index < args.length; index += 2) {
  assert.ok(['--report', '--compiler-root'].includes(args[index]) && args[index + 1]);
  options[args[index]] = args[index + 1];
}
report.type_compilation = compileHarnessBaseTypes(models, options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT);
const mutations = [];
for (const model of models.filter(model => model.subject.line !== 'original')) {
  const Base = model.runtime.ComponentHarness;
  for (const [id, mutate] of [
    ['constructor-copies-factory', () => class extends Base {constructor(factory) {super({...factory});}}],
    ['host-stale-root', () => class extends Base {constructor(factory) {super(factory); this.first = factory.rootElement;} async host() {return this.first;}}],
    ['host-swallows-error', () => class extends Base {async host() {try {return await super.host();} catch {return null;}}}],
    ['document-root-wrong-factory', () => class extends Base {documentRootLocatorFactory() {return this.locatorFactory;}}],
    ['query-order', () => class extends Base {locatorFor(...queries) {return super.locatorFor(...queries.reverse());}}],
    ['query-identity', () => class extends Base {locatorForAll(...queries) {return super.locatorForAll(...queries.map(query => typeof query === 'object' ? {...query} : query));}}],
    ['locator-function-identity', () => class extends Base {locatorForOptional(...queries) {const locator = super.locatorForOptional(...queries); return () => locator();}}],
    ['factory-receiver', () => class extends Base {locatorFor(...queries) {return this.locatorFactory.locatorFor.call(this, ...queries);}}],
    ['stabilize-before-pending-factory', () => class extends Base {async forceStabilize() {return;}}],
    ['outside-tasks-before-pending-factory', () => class extends Base {async waitForTasksOutsideAngular() {return;}}],
    ['stabilize-swallows-error', () => class extends Base {async forceStabilize() {try {return await super.forceStabilize();} catch {return;}}}],
    ['outside-tasks-changes-result', () => class extends Base {async waitForTasksOutsideAngular() {await super.waitForTasksOutsideAngular(); return 'changed';}}],
  ]) {
    await assert.rejects(exerciseHarnessBase(mutate()), assert.AssertionError);
    mutations.push({id: model.subject.line + ':' + id, rejected: true});
  }
}
const file = 'projects/ngx-material-legacy/legacy-core/testing/option-harness.ts', text = read(file);
for (const [id, changed, expected] of [
  ['missing-public-import', text.replace("from '@angular/cdk/testing'", "from '@angular/cdk/private-testing'"), /missing\/ambiguous base import/],
  ['duplicate-import', text + "\nimport {ComponentHarness as DuplicateBase} from '@angular/cdk/testing';\n", /missing\/ambiguous base import/],
  ['runtime-alias', text + '\nconst Borrowed = ComponentHarness;\n', /unsupported ComponentHarness reference/],
  ['runtime-construction', text + '\nnew ComponentHarness(null as any);\n', /unsupported ComponentHarness reference/],
  ['type-only-runtime-import', text.replace('{ComponentHarness, HarnessPredicate}', '{type ComponentHarness, HarnessPredicate}'), /runtime base imported as type only/],
  ['generic-runtime-base', text.replace('extends ComponentHarness {', 'extends ComponentHarness<string> {'), /non-generic public base/],
]) {
  assert.notEqual(changed, text);
  await assert.rejects(reviewComponentHarnessBoundary({root, readSource: path => path === file ? changed : read(path)}), expected);
  mutations.push({id, rejected: true});
}
// A renamed local binding is permitted; identity and supported reference roles still apply.
const aliased = text.replace('{ComponentHarness, HarnessPredicate}', '{ComponentHarness as PublicBase, HarnessPredicate}')
  .replace('extends ComponentHarness {', 'extends PublicBase {');
const alias = await reviewComponentHarnessBoundary({root, readSource: path => path === file ? aliased : read(path)});
assert.equal(alias.cases.find(row => row.file === 'legacy-core/testing/option-harness.ts').local_name, 'PublicBase');
// Authenticated source capsules are immutable inputs; corruption tests own copies.
const scratch = mkdtempSync(join(tmpdir(), 'harness-source-capsule-'));
try {
  const capsulePath = 'compatibility/rc/component-harness-public-subjects.json';
  const capsuleBytes = readFileSync(join(root, capsulePath)), capsule = JSON.parse(capsuleBytes);
  mkdirSync(dirname(join(scratch, capsulePath)), {recursive: true});
  copyFileSync(join(root, capsulePath), join(scratch, capsulePath));
  for (const subject of capsule.subjects) for (const member of subject.members) {
    mkdirSync(dirname(join(scratch, member.path)), {recursive: true});
    copyFileSync(join(root, member.path), join(scratch, member.path));
  }
  for (const subject of capsule.subjects) for (const member of subject.members) {
    const path = join(scratch, member.path), bytes = readFileSync(path);
    writeFileSync(path, Buffer.concat([bytes, Buffer.from('corrupt')]));
    await assert.rejects(loadHarnessSubjects(scratch), /public testing gzip changed/);
    writeFileSync(path, bytes); mutations.push({id: subject.line + ':' + member.archive_member, rejected: true});
  }
  for (const [id, change] of [
    ['false-floor', capsule => {capsule.subjects[1].version = '99.0.0';}],
    ['missing-declaration-closure', capsule => {capsule.subjects[1].members.pop();}],
  ]) {
    const bad = structuredClone(capsule); change(bad);
    writeFileSync(join(scratch, capsulePath), JSON.stringify(bad));
    await assert.rejects(loadHarnessSubjects(scratch), /testing subject capsule changed/);
    mutations.push({id, rejected: true});
  }
} finally {rmSync(scratch, {recursive: true, force: true});}
report.mutations = mutations; report.alias_positive = true; assert.equal(mutations.length, 43);
if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({line: report.line, uses: report.uses, files: report.files,
  protocol_cases_per_subject: 23, subjects: 3, mutations: mutations.length, native_executed: false}));
