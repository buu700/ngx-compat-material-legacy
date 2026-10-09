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
import {exerciseParameterDecorators, parameterDecoratorSubjects, reviewParameterDecoratorUses} from '../scripts/parameter-decorator-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(join(root, p), 'utf8'), options = {};
const args = process.argv.slice(2); for (let i = 0; i < args.length; i += 2) {assert.ok(['--report', '--compiler-root'].includes(args[i]) && args[i + 1]); options[args[i]] = args[i + 1];}
const subjects = await parameterDecoratorSubjects(root);
try {
  const report = await reviewParameterDecoratorUses({root, subjects, compilerRoot: options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT});
  assert.equal(report.frozen_uses, 89); assert.equal(report.current_uses, 112); assert.equal(report.source_override_used, false); assert.equal(report.current_delta_uses, 23);
  assert.equal(report.cases.flatMap(c => c.references).length, 207); assert.equal(report.cases.filter(c => c.unused_import_erasure).length, 5); assert.deepEqual(report.authored_annotations.map(c => c.annotation_count), [205, 205, 205]); assert.deepEqual(report.behaviors.map(c => c.cases.length), [15, 15, 15]);
  const mutations = [];
  for (const model of subjects.models.filter(m => m.subject.line !== 'original')) {
    const core = model.runtime;
    for (const [id, api] of [
      ['inject-token-cloned', {...core, Inject: class extends core.Inject {constructor(token) {super({...token});}}}],
      ['optional-replaced-with-self', {...core, Optional: core.Self}],
      ['self-replaced-with-skipSelf', {...core, Self: core.SkipSelf}],
      ['skipSelf-replaced-with-self', {...core, SkipSelf: core.Self}],
      ['host-replaced-with-optional', {...core, Host: core.Optional}],
    ]) {assert.throws(() => exerciseParameterDecorators(core, api), assert.AssertionError); mutations.push({id: model.subject.line + ':' + id, rejected: true});}
    const Base = core.Optional;
    function Shifted(...args) {if (new.target) return Reflect.construct(Base, args, new.target); const annotation = Base(...args); const changed = (target, key, index) => annotation(target, key, index + 1); changed.annotation = annotation.annotation; return changed;}
    Shifted.prototype = Base.prototype;
    assert.throws(() => exerciseParameterDecorators(core, {...core, Optional: Shifted}), assert.AssertionError); mutations.push({id: model.subject.line + ':parameter-slot-shifted', rejected: true});
  }
  const file = 'projects/ngx-material-legacy/legacy-slider/slider.ts', text = read(file);
  for (const [id, changed, pattern] of [
    ['duplicate-import', text + "\nimport {Optional as Duplicate} from '@angular/core';\n", /missing\/ambiguous parameter import/],
    ['runtime-alias', text + '\nconst Alias = Optional;\n', /unreviewed parameter alias/],
    ['type-only-runtime', text.replace('  Optional,', '  type Optional,'), /runtime parameter decorator imported type only/],
    ['optional-extra-argument', text.replace('@Optional()', '@Optional(true)'), /historical parameter decorator arity/],
    ['inject-argument-omitted', text.replace('@Inject(ANIMATION_MODULE_TYPE)', '@Inject()'), /historical parameter decorator arity/],
    ['class-decorator-misuse', text + '\n@Optional() class Invalid {}\n', /constructor annotation/],
    ['dynamic-token-expression', text.replace('@Inject(ANIMATION_MODULE_TYPE)', '@Inject({token: ANIMATION_MODULE_TYPE})'), /unreviewed token expression shape/],
  ]) {assert.notEqual(changed, text); await assert.rejects(reviewParameterDecoratorUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? changed : read(p)}), pattern); mutations.push({id, rejected: true});}
  const alias = text.replace('  Optional,', '  Optional as Maybe,').replaceAll('@Optional()', '@Maybe()'); const aliased = await reviewParameterDecoratorUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? alias : read(p)}); assert.equal(aliased.cases.find(c => c.file === 'legacy-slider/slider.ts' && c.symbol === 'Optional').local_name, 'Maybe'); report.alias_positive = true;
  report.mutations = mutations; assert.equal(mutations.length, 19);
  if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
  console.log(JSON.stringify({line: report.line, frozen_uses: 89, current_uses: 112, current_delta_uses: 23, references: 207, annotation_shapes_per_subject: 205, factory_metadata_objects: 2, unused_imports: 5, subjects: 3, controls_per_subject: 15, mutations: mutations.length, compiler: report.type_compilation.compiler, native_host_boundary_executed: false}));
} finally {subjects.dispose();}
