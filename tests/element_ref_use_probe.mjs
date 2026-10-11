/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete public modules,scoped field differences and exact authored imports. */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {elementRefSubjects, exerciseElementRef, reviewElementRefUses} from '../scripts/element-ref-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path), 'utf8'), options = {};
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {assert.ok(['--report', '--compiler-root'].includes(args[index]) && args[index + 1]); options[args[index]] = args[index + 1];}
const compilerRoot = options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT, subjects = await elementRefSubjects(root);
try {
  const report = await reviewElementRefUses({root, subjects, compilerRoot}); assert.equal(report.frozen_uses, 67); assert.equal(report.current_uses, 72); assert.equal(report.source_override_used, false);
  assert.deepEqual(report.behaviors.map(r => r.cases.length), [10, 10, 10]); assert.deepEqual(report.behaviors.map(r => r.unsupported_js_accessor_setter_calls), [1, 0, 0]);
  const mutations = [];
  for (const model of subjects.models.filter(m => m.subject.line !== 'original')) {
    const runtime = model.runtime, Base = runtime.ElementRef;
    for (const [id, Ref] of [
      ['native-object-cloned', class extends Base {constructor(value) {super(value && typeof value === 'object' ? {...value} : value);}}],
      ['falsy-native-defaulted', class extends Base {constructor(value) {super(value || {});}}],
      ['foreign-prototype', class {constructor(value) {this.nativeElement = value;}}],
    ]) {assert.throws(() => exerciseElementRef(runtime, Ref), assert.AssertionError); mutations.push({id: model.subject.line + ':' + id, rejected: true});}
    for (const [id, changed] of [
      ['provided-token-identity-lost', {...runtime, createEnvironmentInjector(...args) {const environment = runtime.createEnvironmentInjector(...args), get = environment.get.bind(environment); environment.get = (token, ...rest) => {const result = get(token, ...rest); return token === Base ? {...result} : result;}; return environment;}}],
      ['optional-provided-token-lost', {...runtime, inject(token, options) {return options?.optional ? null : runtime.inject(token, options);}}],
      ['context-error-swallowed', {...runtime, runInInjectionContext(environment, fn) {try {return runtime.runInInjectionContext(environment, fn);} catch {return undefined;}}}],
      ['outside-context-not-rejected', {...runtime, inject(...args) {try {return runtime.inject(...args);} catch {return new Base({});}}}],
    ]) {assert.throws(() => exerciseElementRef(changed), assert.AssertionError); mutations.push({id: model.subject.line + ':' + id, rejected: true});}
  }
  const file = 'projects/ngx-material-legacy/legacy-core/option/option-base.ts', text = read(file);
  for (const [id, changed, pattern] of [
    ['private-import', text.replace("from '@angular/core'", "from '@angular/core/private'"), /current ElementRef delta changed|missing frozen ElementRef import/],
    ['duplicate-import', text + "\nimport {ElementRef as Duplicate} from '@angular/core';\n", /missing\/ambiguous ElementRef import/],
    ['runtime-alias', text + '\nconst Borrowed = ElementRef;\n', /unreviewed ElementRef runtime/],
    ['element-ref-subclass', text + '\nclass Borrowed extends ElementRef {}\n', /unreviewed ElementRef runtime/],
    ['manual-construction-added', text + '\nnew ElementRef({});\n', /unreviewed ElementRef runtime/],
    ['type-only-node-token', text.replace('  ElementRef,', '  type ElementRef,'), /Angular ElementRef constructor token imported as type only/],
  ]) {
    assert.notEqual(changed, text);
    await assert.rejects(reviewElementRefUses({root, subjects, skipDiagnostics: true, readSource: path => path === file ? changed : read(path)}), pattern);
    mutations.push({id, rejected: true});
  }
  const tooltip = 'projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts', tooltipText = read(tooltip);
  const aliased = tooltipText.replace('  ElementRef,', '  ElementRef as NativeRef,').replace(/\bElementRef\b/g, 'NativeRef').replace('NativeRef as NativeRef', 'ElementRef as NativeRef');
  const alias = await reviewElementRefUses({root, subjects, skipDiagnostics: true, readSource: path => path === tooltip ? aliased : read(path)});
  assert.equal(alias.cases.find(c => c.file === 'legacy-tooltip/internal/tooltip-base.ts').local_name, 'NativeRef');
  const context = 'projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts', contextText = read(context);
  const typeOnly = contextText.replace('  ElementRef,', '  type ElementRef,');
  assert.notEqual(typeOnly, contextText);
  await assert.rejects(reviewElementRefUses({root, subjects, skipDiagnostics: true, readSource: path => path === context ? typeOnly : read(path)}), /Angular ElementRef constructor token imported as type only/);
  mutations.push({id: 'owned-menu-constructor-token-type-only', rejected: true});
  report.alias_positive = true; report.mutations = mutations; assert.equal(mutations.length, 21);
  report.angular_constructor_input_references = report.cases.flatMap(c => c.references).filter(r => r.angular_constructor_input).length;
  if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
  console.log(JSON.stringify({line: report.line, frozen_uses: 67, current_uses: 72, current_delta_uses: 5, subjects: 3, protocol_cases_per_subject: 10,
    mutations: mutations.length, angular_constructor_input_references: report.angular_constructor_input_references, compiler: report.type_compilation.compiler, native_executed: false}));
} finally {subjects.dispose();}
