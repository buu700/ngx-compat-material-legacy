/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {reviewAbstractControlUses, scanAbstractControlUses} from '../scripts/abstract-control-use-review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i += 2) {
  assert.ok(['--report', '--compiler-root'].includes(args[i]) && args[i + 1]);
  options[args[i]] = args[i + 1];
}
const subjects = prepareMaterialPublicSubjects(root);
try {
  const report = reviewAbstractControlUses({root, subjects,
    compilerRoot: options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT});
  const mutations = [];
  const mixinFile = 'projects/ngx-material-legacy/internal/common-behaviors/error-state.ts';
  const selectFile = 'projects/ngx-material-legacy/legacy-select/internal/select-base.ts';
  for (const [id, file, change, pattern] of [
    ['duplicate-import', mixinFile, text => text + "\nimport {AbstractControl as Duplicate} from '@angular/forms';\n", /missing\/ambiguous AbstractControl import/],
    ['runtime-construction', mixinFile, text => text + '\nconst value = new AbstractControl(null, null);\n', /unreviewed AbstractControl role/],
    ['cast-expression-changed', mixinFile, text => text.replace('this.ngControl.control as AbstractControl', 'null as AbstractControl'), /historical control cast expression changed/],
    ['unreviewed-generic-cast', mixinFile, text => text.replace('as AbstractControl)', 'as AbstractControl<string>)'), /unreviewed AbstractControl role/],
    ['undefined-cache-state-erased', selectFile, text => text.replace('AbstractControl | null | undefined', 'AbstractControl | null'), /historical previous-control union changed/],
    ['cache-assignment-changed', selectFile, text => text.replace('this._previousControl = ngControl.control;', 'this._previousControl = null;'), /select ngDoCheck differs from tagged original/],
  ]) {
    const before = read(file), after = change(before);
    assert.notEqual(after, before);
    assert.throws(() => scanAbstractControlUses({root,
      readSource: path => path === file ? after : read(path)}), pattern);
    mutations.push({id, rejected: true});
  }
  const text = read(mixinFile);
  const alias = text.replace('{AbstractControl,', '{AbstractControl as BoundControl,')
    .replace('as AbstractControl)', 'as BoundControl)');
  const aliased = scanAbstractControlUses({root,
    readSource: path => path === mixinFile ? alias : read(path)});
  assert.equal(aliased.cases.find(row => row.file === 'internal/common-behaviors/error-state.ts')
    .local_name, 'BoundControl');
  report.alias_positive = true;
  for (const model of subjects.models.filter(model => model.line !== 'original')) {
    const script = `import assert from 'node:assert/strict'; import {readFileSync} from 'node:fs';
import {exerciseAbstractControlRuntime} from ${JSON.stringify(join(root, 'scripts/abstract-control-use-review.mjs'))};
await import('@angular/compiler'); const forms=await import('@angular/forms');const material=await import('@angular/material/core');
const payload=JSON.parse(readFileSync(new URL('./abstract-control-payload.json',import.meta.url))), mutations=[];
for (const [id,method] of [
 ['cache-reference-lost',payload.owned_select_method.replace('this._previousControl = ngControl.control;', 'this._previousControl = null;')],
 ['initial-disabled-resync-added',payload.owned_select_method.replace('this._previousControl !== undefined &&', 'true &&')]
]) { assert.notEqual(method,payload.owned_select_method);assert.throws(()=>exerciseAbstractControlRuntime({forms,material},payload,{select_method:method}),assert.AssertionError);mutations.push({id,rejected:true});}
console.log(JSON.stringify(mutations));`;
    writeFileSync(join(model.root, 'abstract-control-mutations.mjs'), script);
    const result = JSON.parse(execFileSync(process.execPath,
      ['--max-old-space-size=512', join(model.root, 'abstract-control-mutations.mjs')],
      {cwd: model.root, env: process.env, encoding: 'utf8', timeout: 60000,
        maxBuffer: 1024 * 1024}));
    for (const row of result) mutations.push({id: model.line + ':' + row.id, rejected: row.rejected});
  }
  assert.equal(mutations.length, 10);
  report.mutations = mutations;
  assert.deepEqual(report.runtime.map(row => row.cases.length), [4, 4, 4]);
  assert.deepEqual(report.runtime.map(row => row.observations.length), [12, 12, 12]);
  if (options['--report']) {
    assert.equal(existsSync(options['--report']), false);
    writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({line: report.line, frozen_uses: 23, current_uses: 23,
    type_references: 23, casts: 22, previous_control_fields: 1,
    subjects: 3, controls_per_subject: 4, observations_per_subject: 12,
    mixin_identity_calls_per_subject: 115, select_steps_per_subject: 12,
    mutations: 10, compiler: report.type_compilation.compiler, native_executed: false}));
} finally { subjects.dispose(); }
