/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {reviewRequiredValidatorUses, scanRequiredValidatorUses} from '../scripts/required-validator-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const options = {}, args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  assert.ok(['--report', '--compiler-root'].includes(args[i]) && args[i + 1]); options[args[i]] = args[i + 1];
}
const subjects = prepareMaterialPublicSubjects(root);
try {
  const report = reviewRequiredValidatorUses({root, subjects,
    compilerRoot: options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT});
  const checkbox = 'projects/ngx-material-legacy/legacy-checkbox/internal/checkbox-required-validator.ts';
  const chips = 'projects/ngx-material-legacy/legacy-chips/chip-list.ts';
  const field = 'projects/ngx-material-legacy/legacy-form-field/form-field.ts';
  const mutations = [];
  for (const [id, file, change, pattern] of [
    ['duplicate-token-import', checkbox, text => text + "\nimport {NG_VALIDATORS as Duplicate} from '@angular/forms';\n", /ambiguous required-validator import/],
    ['type-only-runtime-parent', checkbox, text => text.replace('{CheckboxRequiredValidator,', '{type CheckboxRequiredValidator,'), /AssertionError/],
    ['runtime-validator-fn', field, text => text + '\nconst Runtime=ValidatorFn;\n', /unreviewed ValidatorFn role/],
    ['required-reference-swapped', chips, text => text.replace('Validators.required)', 'Validators.requiredTrue)'), /unreviewed Validators role/],
    ['validator-subclass-override', checkbox, text => text.replace('extends CheckboxRequiredValidator {}', 'extends CheckboxRequiredValidator { validate(){return null;} }'), /historical validator subclass has overrides/],
    ['multi-registration-lost', checkbox, text => text.replace('multi: true', 'multi: false'), /historical multi provider changed/],
    ['directive-provider-detached', checkbox, text => text.replace('providers: [MAT_CHECKBOX_REQUIRED_VALIDATOR]', 'providers: []'), /historical directive provider attachment changed/],
    ['selector-drift', checkbox, text => text.replace('mat-checkbox[required]', 'mat-checkbox[changed]'), /historical required selector changed/],
    ['cache-nullability-lost', field, text => text.replace('ValidatorFn | null = null', 'ValidatorFn = null'), /unreviewed ValidatorFn role/],
    ['core-identity-lost', checkbox, text => text.replace("from '@angular/core';", "from './fake-core';"), /unreviewed required-validator import module/],
  ]) {
    const before = read(file), after = change(before); assert.notEqual(after, before);
    assert.throws(() => scanRequiredValidatorUses({root,
      readSource: path => path === file ? after : read(path)}), pattern);
    mutations.push({id, rejected: true});
  }
  const text = read(checkbox);
  const alias = text.replace('{CheckboxRequiredValidator,', '{CheckboxRequiredValidator as PublicCheckboxBase,')
    .replace('extends CheckboxRequiredValidator', 'extends PublicCheckboxBase');
  assert.equal(scanRequiredValidatorUses({root, readSource: path => path === checkbox ? alias : read(path)})
    .cases.find(row => row.symbol === 'CheckboxRequiredValidator' && row.file.startsWith('legacy-checkbox/'))
    .local_name, 'PublicCheckboxBase');
  report.alias_positive = true;
  for (const model of subjects.models.filter(model => model.line !== 'original')) {
    const script = `import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {exerciseRequiredValidatorRuntime} from ${JSON.stringify(join(root,'scripts/required-validator-use-review.mjs'))};
const core=await import('@angular/core');await import('@angular/compiler');const forms=await import('@angular/forms');
const payload=JSON.parse(readFileSync(new URL('./required-validator-payload.json',import.meta.url))),mutations=[];
for(const[id,change]of[
 ['explicit-false-precedence-lost',{getter_body:payload.getters[0].body.replaceAll('??','||')}],
 ['validator-cache-assignment-lost',{cache_method:payload.cache_method.replace('this._previousControlValidatorFn = validatorFn;','')}],
 ['multi-token-value-not-array',{provider_code:code=>code.replace('multi: true','multi: false')}]
]){assert.throws(()=>exerciseRequiredValidatorRuntime({core,forms},payload,change),assert.AssertionError);mutations.push({id,rejected:true});}
console.log(JSON.stringify(mutations));`;
    writeFileSync(join(model.root, 'required-validator-mutations.mjs'), script);
    const result = JSON.parse(execFileSync(process.execPath,
      ['--max-old-space-size=512', join(model.root, 'required-validator-mutations.mjs')],
      {cwd: model.root, env: process.env, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024}));
    for (const row of result) mutations.push({id: model.line + ':' + row.id, rejected: row.rejected});
  }
  assert.equal(mutations.length, 16); report.mutations = mutations;
  assert.equal(report.cases.length, 7);
  assert.ok(report.runtime.every(row => row.getters.length === 4 && row.getters.every(g => g.states.length === 13)));
  assert.ok(report.runtime.every(row => row.validators.length === 2 && row.validators.every(v => v.observations.length === 30)));
  if (options['--report']) {
    assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({line: report.line, frozen_uses: 6, current_uses: 7,
    supplemental_current_uses: 1, subjects: 3, getter_observations_per_subject: 52,
    checkbox_observations_per_subject: 60, actual_provider_objects_per_subject: 2,
    validator_cache_steps_per_subject: 7, mutations: 16,
    compiler: report.type_compilation.compiler, native_executed: false}));
} finally { subjects.dispose(); }
