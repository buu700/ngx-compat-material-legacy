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
import {exerciseForwardRef, forwardRefSubjects, reviewForwardRefUses} from '../scripts/forward-ref-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(join(root, p), 'utf8'), options = {};
const args = process.argv.slice(2); for (let i = 0; i < args.length; i += 2) {assert.ok(['--report', '--compiler-root'].includes(args[i]) && args[i + 1]); options[args[i]] = args[i + 1];}
const subjects = await forwardRefSubjects(root);
try {
  const report = await reviewForwardRefUses({root, subjects, compilerRoot: options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT});
  assert.equal(report.frozen_uses, 11); assert.equal(report.current_uses, 11); assert.equal(report.source_override_used, false);
  assert.equal(report.cases.flatMap(c => c.references).length, 12); assert.equal(report.cases.filter(c => c.unused_import_erasure).length, 1);
  assert.deepEqual(report.behaviors.map(c => c.cases.length), [13, 13, 13]); assert.deepEqual(report.authored_callbacks.map(c => c.callback_count), [12, 12, 12]);
  const mutations = [];
  for (const model of subjects.models.filter(m => m.subject.line !== 'original')) {
    const core = model.runtime, cache = new Map();
    for (const [id, forward, resolveRef] of [
      ['eager-callback', fn => {fn(); return core.forwardRef(fn);}, core.resolveForwardRef],
      ['callback-cloned', fn => core.forwardRef(() => fn()), core.resolveForwardRef],
      ['marker-omitted', fn => fn, core.resolveForwardRef],
      ['resolution-memoized', core.forwardRef, ref => {if (!cache.has(ref)) cache.set(ref, core.resolveForwardRef(ref)); return cache.get(ref);}],
      ['plain-functions-invoked', core.forwardRef, ref => typeof ref === 'function' ? ref() : ref],
      ['debug-string-corrupted', fn => {const ref = core.forwardRef(fn); ref.toString = () => 'corrupted'; return ref;}, core.resolveForwardRef],
    ]) {assert.throws(() => exerciseForwardRef(core, 'development', forward, resolveRef), assert.AssertionError); mutations.push({id: model.subject.line + ':' + id, rejected: true});}
  }
  const file = 'projects/ngx-material-legacy/legacy-checkbox/checkbox.ts', text = read(file);
  for (const [id, changed, pattern] of [
    ['duplicate-import', text + "\nimport {forwardRef as Duplicate} from '@angular/core';\n", /missing\/ambiguous forwardRef import/],
    ['runtime-alias', text + '\nconst Alias = forwardRef;\n', /unreviewed forwardRef alias/],
    ['type-only-runtime', text.replace('  forwardRef,', '  type forwardRef,'), /runtime forwardRef imported type only/],
    ['callback-constructs-class', text.replace('forwardRef(() => MatLegacyCheckbox)', 'forwardRef(() => new MatLegacyCheckbox())'), /pure zero-argument local class/],
    ['callback-requires-argument', text.replace('forwardRef(() => MatLegacyCheckbox)', 'forwardRef((required: unknown) => MatLegacyCheckbox)'), /pure zero-argument local class/],
    ['callback-nonclass-target', text.replace('forwardRef(() => MatLegacyCheckbox)', 'forwardRef(() => MAT_LEGACY_CHECKBOX_CONTROL_VALUE_ACCESSOR)'), /same-file class declaration/],
    ['extra-call-argument', text.replace('forwardRef(() => MatLegacyCheckbox)', 'forwardRef(() => MatLegacyCheckbox, true)'), /one forward callback/],
  ]) {assert.notEqual(changed, text); await assert.rejects(reviewForwardRefUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? changed : read(p)}), pattern); mutations.push({id, rejected: true});}
  const alias = text.replace('  forwardRef,', '  forwardRef as Forward,').replaceAll('forwardRef(', 'Forward(');
  const aliased = await reviewForwardRefUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? alias : read(p)}); assert.equal(aliased.cases.find(c => c.file === 'legacy-checkbox/checkbox.ts').local_name, 'Forward'); report.alias_positive = true;
  // Public API mode switch in this isolated child process; no Angular hook/global/prototype patch.
  subjects.models.find(m => m.subject.line === 'main').runtime.enableProdMode();
  report.production_behaviors = subjects.models.map(m => ({line: m.subject.line, ...exerciseForwardRef(m.runtime, 'production')}));
  assert.deepEqual(report.production_behaviors.map(c => c.cases.length), [12, 12, 12]); assert.deepEqual(report.production_behaviors.map(c => c.debug_to_string_installed), [true, false, false]);
  report.mutations = mutations; assert.equal(mutations.length, 19);
  if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
  console.log(JSON.stringify({line: report.line, frozen_uses: 11, current_uses: 11, callbacks: 12, unused_imports: 1, subjects: 3, development_controls_per_subject: 13, production_controls_per_subject: 12, mutations: mutations.length, compiler: report.type_compilation.compiler, native_executed: false}));
} finally {subjects.dispose();}
