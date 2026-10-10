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
import {reviewControlForwardingUse, scanControlForwardingUse} from '../scripts/control-forwarding-use-review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const options = {}, args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  assert.ok(['--report', '--compiler-root'].includes(args[i]) && args[i + 1]);
  options[args[i]] = args[i + 1];
}
const subjects = prepareMaterialPublicSubjects(root);
try {
  const report = reviewControlForwardingUse({root, subjects,
    compilerRoot: options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT});
  const file = 'projects/ngx-material-legacy/legacy-form-field/form-field.ts';
  const before = read(file), mutations = [];
  for (const [id, after, pattern] of [
    ['duplicate-ancestor-import', before + "\nimport {AbstractControlDirective as Duplicate} from '@angular/forms';\n", /missing\/ambiguous control directive import/],
    ['unreviewed-runtime-construction', before + '\nconst control = new AbstractControlDirective();\n', /unreviewed control directive role/],
    ['keyof-type-role-changed', before.replace('prop: keyof AbstractControlDirective', 'prop: AbstractControlDirective'), /historical forwarding key type changed/],
    ['historical-null-values-normalized', before.replace('return control && control[prop];', 'return !!(control && control[prop]);'), /whole forwarding body differs from tagged original/],
    ['host-class-name-changed', before.replace('[class.ng-invalid]', '[class.ng-invalid-changed]'), /historical ng state class bindings changed/],
    ['host-state-key-swapped', before.replace('_shouldForward("invalid")', '_shouldForward("valid")'), /historical ng state class bindings changed/],
  ]) {
    assert.notEqual(after, before);
    assert.throws(() => scanControlForwardingUse({root,
      readSource: path => path === file ? after : read(path)}), pattern);
    mutations.push({id, rejected: true});
  }
  const alias = before.replace('{AbstractControlDirective,', '{AbstractControlDirective as BoundDirective,')
    .replace('keyof AbstractControlDirective', 'keyof BoundDirective');
  assert.equal(scanControlForwardingUse({root, readSource: path => path === file ? alias : read(path)})
    .case.local_name, 'BoundDirective');
  report.alias_positive = true;
  for (const model of subjects.models.filter(model => model.line !== 'original')) {
    const script = `import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {exerciseControlForwardingRuntime} from ${JSON.stringify(join(root,'scripts/control-forwarding-use-review.mjs'))};
await import('@angular/compiler');const forms=await import('@angular/forms');
const payload=JSON.parse(readFileSync(new URL('./control-forwarding-payload.json',import.meta.url))),method=payload.owned_method,mutations=[];
for(const[id,changed]of[
 ['absent-controls-coerced-to-false',method.replace('return control && control[prop];','return !!(control && control[prop]);')],
 ['state-lookup-always-invalid',method.replace('control[prop]','control.invalid')]
]){assert.notEqual(changed,method);assert.throws(()=>exerciseControlForwardingRuntime({forms},payload,{method:changed}),assert.AssertionError);mutations.push({id,rejected:true});}
console.log(JSON.stringify(mutations));`;
    writeFileSync(join(model.root, 'control-forwarding-mutations.mjs'), script);
    const result = JSON.parse(execFileSync(process.execPath,
      ['--max-old-space-size=512', join(model.root, 'control-forwarding-mutations.mjs')],
      {cwd: model.root, env: process.env, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024}));
    for (const row of result) mutations.push({id: model.line + ':' + row.id, rejected: row.rejected});
  }
  assert.equal(mutations.length, 10); report.mutations = mutations;
  assert.equal(report.bindings.length, 7);
  assert.ok(report.runtime.every(row => row.results.every(method => method.observations.length === 11)));
  if (options['--report']) {
    assert.equal(existsSync(options['--report']), false);
    writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({line: report.line, frozen_uses: 1, current_uses: 1,
    state_class_bindings: 7, subjects: 3, scenarios_per_method: 11, methods_per_subject: 2,
    property_reads_per_subject: 154, mutations: 10, compiler: report.type_compilation.compiler,
    native_executed: false}));
} finally { subjects.dispose(); }
