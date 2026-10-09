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
import {exercisePropertyDecorators, propertyDecoratorSubjects, reviewPropertyDecoratorUses} from '../scripts/property-decorator-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(join(root, p), 'utf8'), options = {};
const args = process.argv.slice(2); for (let i = 0; i < args.length; i += 2) {assert.ok(['--report', '--compiler-root'].includes(args[i]) && args[i + 1]); options[args[i]] = args[i + 1];}
const subjects = await propertyDecoratorSubjects(root);
try {
  const report = await reviewPropertyDecoratorUses({root, subjects, compilerRoot: options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT});
  assert.equal(report.frozen_uses, 99); assert.equal(report.current_uses, 101); assert.equal(report.source_override_used, false); assert.equal(report.current_delta_uses, 2);
  assert.equal(report.cases.flatMap(c => c.references).length, 321); assert.equal(report.cases.filter(c => c.unused_import_erasure).length, 9); assert.deepEqual(report.authored_annotations.map(c => c.annotation_count), [321, 321, 321]); assert.deepEqual(report.behaviors.map(c => c.cases.length), [14, 14, 14]);
  const mutations = [];
  for (const model of subjects.models.filter(m => m.subject.line !== 'original')) {
    const core = model.runtime;
    for (const [id, api] of [
      ['input-alias-corrupted', {...core, Input: class extends core.Input {constructor(arg) {super(arg); this.alias = 'corrupted';}}}],
      ['output-replaced-with-input', {...core, Output: core.Input}],
      ['viewChild-replaced-with-contentChild', {...core, ViewChild: core.ContentChild}],
      ['contentChild-replaced-with-contentChildren', {...core, ContentChild: core.ContentChildren}],
      ['contentChildren-replaced-with-contentChild', {...core, ContentChildren: core.ContentChild}],
      ['input-transform-eager', {...core, Input: class extends core.Input {constructor(arg) {super(arg); arg?.transform?.('eager');}}}],
    ]) {assert.throws(() => exercisePropertyDecorators(core, api), assert.AssertionError); mutations.push({id: model.subject.line + ':' + id, rejected: true});}
    const Base = core.Input;
    function Renamed(...args) {if (new.target) return Reflect.construct(Base, args, new.target); const annotation = Base(...args); return (target, key) => annotation(target, key + 'Changed');}
    Renamed.prototype = Base.prototype;
    assert.throws(() => exercisePropertyDecorators(core, {...core, Input: Renamed}), assert.AssertionError); mutations.push({id: model.subject.line + ':property-registration-renamed', rejected: true});
  }
  const file = 'projects/ngx-material-legacy/legacy-slider/slider.ts', text = read(file);
  for (const [id, changed, pattern] of [
    ['duplicate-import', text + "\nimport {Input as Duplicate} from '@angular/core';\n", /missing\/ambiguous property import/],
    ['runtime-alias', text + '\nconst Alias = Input;\n', /unreviewed property alias/],
    ['type-only-runtime', text.replace('  Input,', '  type Input,'), /runtime property decorator imported type only/],
    ['input-argument-count', text.replace('@Input()', "@Input('alias', true)"), /property decorator argument count/],
    ['class-decorator-misuse', text + '\n@Input() class Invalid {}\n', /unreviewed property target/],
    ['unreviewed-input-field', text.replace('@Input()', '@Input({isSignal:true})'), /unreviewed input option/],
  ]) {assert.notEqual(changed, text); await assert.rejects(reviewPropertyDecoratorUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? changed : read(p)}), pattern); mutations.push({id, rejected: true});}
  const queryFile = 'projects/ngx-material-legacy/legacy-tabs/tab-group.ts', queryText = read(queryFile), deprecated = queryText.replace('{descendants: true}', '{descendants: true, emitDistinctChangesOnly:false}'); assert.notEqual(deprecated, queryText); await assert.rejects(reviewPropertyDecoratorUses({root, subjects, skipDiagnostics: true, readSource: p => p === queryFile ? deprecated : read(p)}), /deprecated query option is not admitted/); mutations.push({id: 'deprecated-query-option', rejected: true});
  const alias = text.replace('  Input,', '  Input as Bind,').replaceAll('@Input(', '@Bind('); const aliased = await reviewPropertyDecoratorUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? alias : read(p)}); assert.equal(aliased.cases.find(c => c.file === 'legacy-slider/slider.ts' && c.symbol === 'Input').local_name, 'Bind'); report.alias_positive = true;
  report.mutations = mutations; assert.equal(mutations.length, 21);
  if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
  console.log(JSON.stringify({line: report.line, frozen_uses: 99, current_uses: 101, current_delta_uses: 2, references: 321, annotation_shapes_per_subject: 321, unused_imports: 9, subjects: 3, controls_per_subject: 14, mutations: mutations.length, compiler: report.type_compilation.compiler, native_executed: false}));
} finally {subjects.dispose();}
