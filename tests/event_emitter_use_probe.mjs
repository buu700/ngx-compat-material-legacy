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
import {eventEmitterSubjects, exerciseEventEmitter, reviewEventEmitterUses} from '../scripts/event-emitter-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(join(root, p), 'utf8'), options = {};
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {assert.ok(['--report', '--compiler-root'].includes(args[i]) && args[i + 1]); options[args[i]] = args[i + 1];}
const subjects = await eventEmitterSubjects(root);
try {
  const report = await reviewEventEmitterUses({root, subjects, compilerRoot: options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT});
  assert.equal(report.frozen_uses, 19); assert.equal(report.current_uses, 21); assert.equal(report.source_override_used, false);
  assert.deepEqual(report.authored_constructions.map(c => c.construction_count), [41, 41, 41]);
  assert.equal(report.cases.flatMap(c => c.references).length, 82);
  assert.deepEqual(report.behaviors.map(c => c.cases.length), [15, 15, 15]);
  assert.deepEqual(report.behaviors.map(c => c.signal_listener_reads_tracked), [true, false, false]);
  const mutations = [];
  for (const model of subjects.models.filter(m => m.subject.line !== 'original')) {
    const core = model.runtime, Base = core.EventEmitter;
    for (const [id, Type] of [
      ['changed-payload', class extends Base {emit(v) {super.emit({changed: v});}}],
      ['default-async', class extends Base {constructor(async = true) {super(async);}}],
      ['async-ignored', class extends Base {constructor() {super(false);}}],
      ['completion-ignored', class extends Base {complete() {}}],
      ['signal-suppression-lost', class extends Base {emit(v) {this.next(v);}}],
      ['context-capture-lost', class extends Base {constructor(async) {super(async); this.destroyRef = undefined;}}],
    ]) {
      await assert.rejects(exerciseEventEmitter(core, Type), assert.AssertionError);
      mutations.push({id: model.subject.line + ':' + id, rejected: true});
    }
  }
  const file = 'projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts', text = read(file);
  for (const [id, changed, pattern] of [
    ['duplicate-import', text + "\nimport {EventEmitter as Duplicate} from '@angular/core';\n", /missing\/ambiguous emitter import/],
    ['runtime-alias', text + '\nconst Alias = EventEmitter;\n', /typed emitter boundary/],
    ['subclass', text + '\nclass Derived extends EventEmitter<void> {}\n', /unreviewed emitter alias/],
    ['type-only-runtime', text.replace('  EventEmitter,', '  type EventEmitter,'), /runtime emitter imported type only/],
    ['async-removed', text.replace('new EventEmitter<void>(true)', 'new EventEmitter<void>()'), /historical emitter scheduling mode changed/],
    ['dynamic-async-mode', text.replace('new EventEmitter<void>(true)', 'new EventEmitter<void>(Boolean(1))'), /unreviewed async argument/],
  ]) {
    assert.notEqual(changed, text);
    await assert.rejects(reviewEventEmitterUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? changed : read(p)}), pattern);
    mutations.push({id, rejected: true});
  }
  const aliased = text.replace('  EventEmitter,', '  EventEmitter as Emitter,').replaceAll('EventEmitter<', 'Emitter<');
  const alias = await reviewEventEmitterUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? aliased : read(p)});
  assert.equal(alias.cases.find(c => c.file === 'legacy-tabs/internal/tab-body-base.ts').local_name, 'Emitter');
  report.alias_positive = true; report.mutations = mutations; assert.equal(mutations.length, 18);
  if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
  console.log(JSON.stringify({line: report.line, frozen_uses: 19, current_uses: 21, current_delta_uses: 2, constructions: 41, async_constructions: 2, references: 82, controls_per_subject: 15, subjects: 3, mutations: mutations.length, compiler: report.type_compilation.compiler, native_executed: false}));
} finally {subjects.dispose();}
