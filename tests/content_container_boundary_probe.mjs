/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact content-loader boundary with real owned/original class context; no native credit. */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {contentSubjects, exerciseContentContainer, reviewContentBoundary} from '../scripts/content-container-boundary-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path), 'utf8');
const args = process.argv.slice(2), options = {};
for (let index = 0; index < args.length; index += 2) {
  assert.ok(['--report', '--compiler-root'].includes(args[index]) && args[index + 1]); options[args[index]] = args[index + 1];
}
const compilerRoot = options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT;
const report = await reviewContentBoundary({root, compilerRoot});
assert.equal(report.uses, 11); assert.equal(report.files, 11); assert.equal(report.contexts.length, 6); assert.equal(report.source_override_used, false);
assert.deepEqual(report.behaviors.map(row => row.cases.length), [34, 34, 34]);
assert.equal(report.cases.flatMap(row => row.references).length, 12);
const {models} = await contentSubjects(root), mutations = [];
for (const model of models.filter(model => model.subject.line !== 'original')) {
  const Base = model.runtime.ContentContainerComponentHarness;
  for (const [id, mutate] of [
    ['root-loader-clone', () => class extends Base {async getRootHarnessLoader() {return {...await super.getRootHarnessLoader()};}}],
    ['bypassed-virtual-root', () => class extends Base {async getHarness(query) {return (await this.locatorFactory.rootHarnessLoader()).getHarness(query);}}],
    ['changed-query-identity', () => class extends Base {getHarness(query) {return super.getHarness({...query});}}],
    ['changed-selector', () => class extends Base {getChildLoader(selector) {return super.getChildLoader(selector + ' changed');}}],
    ['lost-null-and-result-identity', () => class extends Base {async getHarnessOrNull(query) {return {...await super.getHarnessOrNull(query)};}}],
    ['loader-receiver', () => class extends Base {async getAllHarnesses(query) {const loader = await this.getRootHarnessLoader(); return loader.getAllHarnesses.call(this, query);}}],
    ['synchronous-loader-error-swallowed', () => class extends Base {async getChildLoader(selector) {try {return await super.getChildLoader(selector);} catch {return null;}}}],
    ['root-factory-error-swallowed', () => class extends Base {async getRootHarnessLoader() {try {return await super.getRootHarnessLoader();} catch {return null;}}}],
  ]) {
    await assert.rejects(exerciseContentContainer(mutate()), assert.AssertionError); mutations.push({id: model.subject.line + ':' + id, rejected: true});
  }
}
const file = 'projects/ngx-material-legacy/legacy-card/testing/card-harness.ts', text = read(file);
for (const [id, changed, pattern] of [
  ['missing-public-import', text.replace("from '@angular/cdk/testing'", "from '@angular/cdk/private-testing'"), /missing\/ambiguous content import/],
  ['duplicate-import', text + "\nimport {ContentContainerComponentHarness as Duplicate} from '@angular/cdk/testing';\n", /missing\/ambiguous content import/],
  ['dynamic-base-alias', text + '\nconst Borrowed = ContentContainerComponentHarness;\n', /unsupported content base reference/],
  ['type-only-runtime-base', text.replace('HarnessPredicate, ContentContainerComponentHarness}', 'HarnessPredicate, type ContentContainerComponentHarness}'), /content runtime base imported as type only/],
  ['subclass-constructor', text.replace('extends ContentContainerComponentHarness<MatLegacyCardSection> {', 'extends ContentContainerComponentHarness<MatLegacyCardSection> { constructor(factory: any) {super(factory);}'), /content constructor needs separate review/],
  ['subclass-accessor', text.replace('extends ContentContainerComponentHarness<MatLegacyCardSection> {', 'extends ContentContainerComponentHarness<MatLegacyCardSection> { get locatorFactory(): any {return null;}'), /content locatorFactory redeclaration needs separate review/],
  ['new-peer-call', text + '\nfunction notHistorical(h: MatLegacyCardHarness) {return h.countHarnesses(MatLegacyCardHarness);}\n', /new peer method outside historical content contract/],
  ['new-peer-element-call', text + "\nfunction notHistorical(h: MatLegacyCardHarness) {return h['getHarnessAtIndex'](MatLegacyCardHarness, 0);}\n", /new peer method outside historical content contract/],
]) {
  assert.notEqual(changed, text);
  await assert.rejects(reviewContentBoundary({root, compilerRoot, readSource: path => path === file ? changed : read(path)}), pattern);
  mutations.push({id, rejected: true});
}
for (const [file, id, from, to] of [
  ['projects/ngx-material-legacy/legacy-menu/testing/menu-harness-base.ts', 'menu-wrong-document-root', 'return this.documentRootLocatorFactory().harnessLoaderFor(`#${panelId}`);', 'return this.locatorFactory.rootHarnessLoader();'],
  ['projects/ngx-material-legacy/legacy-tabs/testing/tab-harness.ts', 'tabs-wrong-content-id', 'harnessLoaderFor(`#${contentId}`)', 'harnessLoaderFor(`#changed-${contentId}`)'],
]) {
  const before = read(file), changed = before.replace(from, to); assert.notEqual(changed, before);
  await assert.rejects(reviewContentBoundary({root, compilerRoot, readSource: path => path === file ? changed : read(path)}), /owned root context method differs/);
  mutations.push({id, rejected: true});
}
const aliased = text.replace('HarnessPredicate, ContentContainerComponentHarness}', 'HarnessPredicate, ContentContainerComponentHarness as PublicContent}')
  .replace('extends ContentContainerComponentHarness<', 'extends PublicContent<');
const alias = await reviewContentBoundary({root, compilerRoot, readSource: path => path === file ? aliased : read(path)});
assert.equal(alias.cases.find(row => row.file === 'legacy-card/testing/card-harness.ts').local_name, 'PublicContent');
report.alias_positive = true; report.mutations = mutations; assert.equal(mutations.length, 26);
if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({line: report.line, uses: report.uses, subclasses: 12, subjects: 3,
  protocol_cases_per_subject: 34, owned_contexts: 6, mutations: mutations.length, compiler: report.type_compilation.compiler, native_executed: false}));
