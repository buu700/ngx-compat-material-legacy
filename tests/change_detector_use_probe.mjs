/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewChangeDetectorUses, scanChangeDetectorUses} from '../scripts/change-detector-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const report = reviewChangeDetectorUses({root, compilerRoot: process.env.CLOSEOUT_TYPESCRIPT_ROOT, runtimeMutations: true});
const file = 'projects/ngx-material-legacy/legacy-form-field/form-field.ts';
const trigger = 'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts';
const context = 'projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts';
const mutations = [];
for (const [id, path, transform, pattern] of [
  ['duplicate-import', file, text => text + "\nimport {ChangeDetectorRef as OtherDetector} from '@angular/core';\n", /missing\/ambiguous detector import/],
  ['unreviewed-import-role', file, text => text + '\nconst constructedDetector = new ChangeDetectorRef();\n', /unreviewed detector import role/],
  ['unreviewed-type-context', file, text => text + '\ntype ExtraDetector = ChangeDetectorRef;\n', /unreviewed detector type context/],
  ['removed-or-deprecated-method', file, text => text.replace('this._changeDetectorRef.detectChanges()', 'this._changeDetectorRef.checkNoChanges()'), /unreviewed detector method/],
  ['computed-detector-call', file, text => text.replace('this._changeDetectorRef.detectChanges()', "this._changeDetectorRef['detectChanges']()"), /unreviewed computed detector call/],
  ['extra-call-argument', file, text => text.replace('this._changeDetectorRef.detectChanges()', 'this._changeDetectorRef.detectChanges(true)'), /detector method arguments changed/],
  ['runtime-token-type-only', trigger, text => text.replace('  ChangeDetectorRef,', '  type ChangeDetectorRef,'), /runtime core binding imported type only/],
  ['owned-constructor-token-type-only', context, text => text.replace('  ChangeDetectorRef,', '  type ChangeDetectorRef,'), /runtime core binding imported type only/],
]) {
  const before = read(path), after = transform(before); assert.notEqual(before, after);
  assert.throws(() => scanChangeDetectorUses({root, readSource: name => name === path ? after : read(name)}), pattern);
  mutations.push({id, rejected: true});
}
const alias = read(file).replace('  ChangeDetectorRef,', '  ChangeDetectorRef as BoundDetector,')
  .replace('_changeDetectorRef: ChangeDetectorRef', '_changeDetectorRef: BoundDetector');
assert.equal(scanChangeDetectorUses({root, readSource: name => name === file ? alias : read(name)})
  .cases.find(row => row.file === 'legacy-form-field/form-field.ts').local_name, 'BoundDetector');
const unrelated = read(file) + '\nfunction unrelatedDetector(){const _changeDetectorRef={checkNoChanges(){}};_changeDetectorRef.checkNoChanges();}\n';
assert.equal(scanChangeDetectorUses({root, readSource: name => name === file ? unrelated : read(name)}).calls.length, 96);
report.source_mutations = mutations; report.alias_positive = true; report.unrelated_same_name_receiver_excluded = true;
assert.equal(report.runtime_mutations.length, 8);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.line, frozen_uses: 38, current_uses: 42, supplementary_uses: 4,
  import_references: 49, receiver_declarations: 49, bound_calls: 96, mark_calls: 87, detect_calls: 9,
  runtime_subjects: 6, states_per_subject: 7, source_mutations: 8, runtime_mutations: 8,
  compiler: report.type_compilation.compiler, alias_positive: true, unrelated_same_name_receiver_excluded: true,
  actual_legacy_native_or_scheduler_qualified: false}));
