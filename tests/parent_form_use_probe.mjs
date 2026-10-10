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
import {reviewParentFormUses, scanParentFormUses} from '../scripts/parent-form-use-review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i += 2) {
  assert.ok(['--report', '--compiler-root'].includes(args[i]) && args[i + 1]);
  options[args[i]] = args[i + 1];
}
const subjects = prepareMaterialPublicSubjects(root);
try {
  const report = reviewParentFormUses({root, subjects,
    compilerRoot: options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT});
  const file = 'projects/ngx-material-legacy/legacy-chips/chip-list.ts';
  const before = read(file), mutations = [];
  for (const [id, after, pattern] of [
    ['duplicate-parent-import', before + "\nimport {NgForm as Duplicate} from '@angular/forms';\n", /missing\/ambiguous parent-form import/],
    ['unreviewed-runtime-alias', before + '\nconst Alias = NgForm;\n', /unreviewed parent-form role/],
    ['decorated-token-type-only', before.replace('  NgForm,', '  type NgForm,'), /parent-form runtime token imported type only/],
    ['inherited-parent-lookup-blocked', before.replace('@Optional() _parentForm: NgForm', '@Optional() @Self() _parentForm: NgForm'), /parent-form lookup flags changed/],
    ['parent-member-name-changed', before.replace('public _parentForm: NgForm', 'public _otherParent: NgForm'), /parent-form member name changed/],
    ['unreviewed-generic-reference', before.replace('public _parentForm: NgForm', 'public _parentForm: NgForm<string>'), /unreviewed parent-form role/],
  ]) {
    assert.notEqual(after, before);
    assert.throws(() => scanParentFormUses({root,
      readSource: path => path === file ? after : read(path)}), pattern);
    mutations.push({id, rejected: true});
  }
  const alias = before.replace('  NgForm,', '  NgForm as ParentForm,').replaceAll(': NgForm', ': ParentForm');
  const aliased = scanParentFormUses({root, readSource: path => path === file ? alias : read(path)});
  assert.equal(aliased.cases.find(row => row.file === 'legacy-chips/chip-list.ts' &&
    row.symbol === 'NgForm').local_name, 'ParentForm');
  report.alias_positive = true;
  for (const model of subjects.models.filter(model => model.line !== 'original')) {
    const script = `import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {exerciseParentFormRuntime} from ${JSON.stringify(join(root,'scripts/parent-form-use-review.mjs'))};
const core=await import('@angular/core');await import('@angular/compiler');const forms=await import('@angular/forms');const material=await import('@angular/material/core');const rxjs=await import('rxjs');
const payload=JSON.parse(readFileSync(new URL('./parent-form-payload.json',import.meta.url))), body=payload.mixins[0].body, mutations=[];
for (const [id,changed] of [
 ['parent-group-precedence-reversed',body.replace('this._parentFormGroup || this._parentForm','this._parentForm || this._parentFormGroup')],
 ['state-transition-emission-dropped',body.replace('this.stateChanges.next();','')]
]) {assert.notEqual(changed,body);assert.throws(()=>exerciseParentFormRuntime({core,forms,material,rxjs},payload,{mixin_body:changed}),assert.AssertionError);mutations.push({id,rejected:true});}
console.log(JSON.stringify(mutations));`;
    writeFileSync(join(model.root, 'parent-form-mutations.mjs'), script);
    const result = JSON.parse(execFileSync(process.execPath,
      ['--max-old-space-size=512', join(model.root, 'parent-form-mutations.mjs')],
      {cwd: model.root, env: process.env, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024}));
    for (const row of result) mutations.push({id: model.line + ':' + row.id, rejected: row.rejected});
  }
  assert.equal(mutations.length, 10);
  report.mutations = mutations;
  assert.deepEqual(report.runtime.map(row => row.cases.length), [5, 5, 5]);
  assert.deepEqual(report.runtime.map(row => row.mixins.length), [23, 23, 23]);
  assert.ok(report.runtime.every(row => row.mixins.every(mixin => mixin.sequence.length === 13)));
  if (options['--report']) {
    assert.equal(existsSync(options['--report']), false);
    writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({line: report.line, frozen_uses: 48, current_uses: 48,
    type_references: 52, decorated_optional_constructors: 4, subjects: 3,
    controls_per_subject: 5, mixin_transition_observations_per_subject: 299,
    mutations: 10, compiler: report.type_compilation.compiler, native_executed: false}));
} finally { subjects.dispose(); }
