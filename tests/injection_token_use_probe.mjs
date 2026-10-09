/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual public tokens,stable overloads and exact owned source controls. */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exerciseInjectionToken, injectionTokenSubjects, reviewInjectionTokenUses} from '../scripts/injection-token-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path), 'utf8'), options = {};
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {assert.ok(['--report', '--compiler-root'].includes(args[index]) && args[index + 1]); options[args[index]] = args[index + 1];}
const compilerRoot = options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT, subjects = await injectionTokenSubjects(root);
try {
  const report = await reviewInjectionTokenUses({root, subjects, compilerRoot});
  assert.equal(report.frozen_uses, 20); assert.equal(report.current_uses, 25); assert.equal(report.source_override_used, false);
  assert.deepEqual(report.behaviors.map(r => r.cases.length), [9, 9, 9]); assert.deepEqual(report.behaviors.map(r => r.unsupported_js_accessor_setter_calls), [1, 0, 0]);
  assert.deepEqual(report.authored_tokens.map(r => r.distinct_identity_count), [27, 27, 27]);
  const mutations = [];
  for (const model of subjects.models.filter(m => m.subject.line !== 'original')) {
    const core = model.runtime, Base = core.InjectionToken, cache = new Map();
    for (const [id, Token] of [
      ['description-deduplication', class extends Base {constructor(description, options) {super(description, options); if (cache.has(description)) return cache.get(description); cache.set(description, this);}}],
      ['description-changed', class extends Base {constructor(description, options) {super(description + ' changed', options);}}],
      ['eager-root-factory', class extends Base {constructor(description, options) {super(description, options); options?.factory();}}],
    ]) {assert.throws(() => exerciseInjectionToken(core, Token), assert.AssertionError); mutations.push({id: model.subject.line + ':' + id, rejected: true});}
    for (const [id, changed] of [
      ['public-context-token-lost', {...core, inject(token, options) {return options?.optional ? null : {};}}],
      ['provider-identity-lost', {...core, Injector: {create(options) {const injector = core.Injector.create(options), get = injector.get.bind(injector); injector.get = (...args) => {const result = get(...args); return result && typeof result === 'object' ? {...result} : result;}; return injector;}}}],
    ]) {assert.throws(() => exerciseInjectionToken(changed), assert.AssertionError); mutations.push({id: model.subject.line + ':' + id, rejected: true});}
  }
  const file = 'projects/ngx-material-legacy/legacy-slide-toggle/slide-toggle-config.ts', text = read(file);
  for (const [id, changed, pattern] of [
    ['private-import', text.replace("from '@angular/core'", "from '@angular/core/private'"), /25|missing frozen token import/],
    ['duplicate-import', text + "\nimport {InjectionToken as Duplicate} from '@angular/core';\n", /missing\/ambiguous token import/],
    ['runtime-alias', text + '\nconst Borrowed = InjectionToken;\n', /unreviewed token alias/],
    ['token-subclass', text + '\nclass Borrowed extends InjectionToken {}\n', /unreviewed token alias/],
    ['type-only-token', text.replace('import {InjectionToken}', 'import type {InjectionToken}'), /token runtime imported as type only/],
    ['deprecated-any-scope', text.replace("providedIn: 'root'", "providedIn: 'any'"), /deprecated\/unreviewed providedIn scope/],
    ['numeric-private-options', text.replace("{\n    providedIn: 'root',\n    factory: () => ({disableToggleValue: false}),\n  }", '-1'), /reviewed inline object/],
    ['dynamic-description', text.replace("'mat-slide-toggle-default-options'", "String('mat-slide-toggle-default-options')"), /reviewed literal/],
  ]) {
    assert.notEqual(changed, text);
    await assert.rejects(reviewInjectionTokenUses({root, subjects, skipDiagnostics: true, readSource: path => path === file ? changed : read(path)}), pattern);
    mutations.push({id, rejected: true});
  }
  const aliased = text.replace('import {InjectionToken}', 'import {InjectionToken as Token}').replace('new InjectionToken<', 'new Token<');
  const alias = await reviewInjectionTokenUses({root, subjects, skipDiagnostics: true, readSource: path => path === file ? aliased : read(path)});
  assert.equal(alias.cases.find(c => c.file === 'legacy-slide-toggle/slide-toggle-config.ts').local_name, 'Token');
  report.alias_positive = true; report.mutations = mutations; assert.equal(mutations.length, 18);
  if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
  console.log(JSON.stringify({line: report.line, frozen_uses: 20, current_uses: 25, current_delta_uses: 5, subjects: 3,
    owned_tokens_per_subject: 27, protocol_cases_per_subject: 9, unused_imports: 5, mutations: mutations.length, compiler: report.type_compilation.compiler, native_executed: false}));
} finally {subjects.dispose();}
