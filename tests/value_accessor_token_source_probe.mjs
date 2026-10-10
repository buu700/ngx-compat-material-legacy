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
import {scanValueAccessorTokenUses} from '../scripts/value-accessor-token-source-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path), 'utf8');
const report = scanValueAccessorTokenUses({root}), mutations = [];
const file = 'projects/ngx-material-legacy/legacy-checkbox/checkbox.ts';
const barrel = 'projects/ngx-material-legacy/legacy-checkbox/public-api.ts';
for (const [id, path, transform, pattern] of [
  ['duplicate-token-import', file, text => text + "\nimport {NG_VALUE_ACCESSOR as Duplicate} from '@angular/forms';\n", /ambiguous accessor-token import/],
  ['token-type-only', file, text => text.replace('{NG_VALUE_ACCESSOR}', '{type NG_VALUE_ACCESSOR}'), /runtime accessor token imported type only/],
  ['multi-false', file, text => text.replace('multi: true', 'multi: false'), /accessor multi flag changed/],
  ['wrong-class-target', file, text => text.replace('forwardRef(() => MatLegacyCheckbox)', 'forwardRef(() => MatLegacyCheckboxChange)'), /actual accessor component\/directive decorator/],
  ['provider-detached', file, text => text.replace('providers: [MAT_LEGACY_CHECKBOX_CONTROL_VALUE_ACCESSOR]', 'providers: []'), /accessor provider detached/],
  ['selector-changed', file, text => text.replace("selector: 'mat-checkbox'", "selector: 'mat-checkbox-changed'"), /historical accessor selector changed/],
  ['barrel-rerouted', barrel, text => text.replace("from './checkbox'", "from './another-checkbox'"), /public accessor provider export points to another module/],
]) {
  const before = read(path), after = transform(before); assert.notEqual(before, after);
  assert.throws(() => scanValueAccessorTokenUses({root, readSource: name => name === path ? after : read(name)}), pattern);
  mutations.push({id, rejected: true});
}
const alias = read(file).replace('{NG_VALUE_ACCESSOR}', '{NG_VALUE_ACCESSOR as AccessorToken}')
  .replace('provide: NG_VALUE_ACCESSOR', 'provide: AccessorToken');
assert.equal(scanValueAccessorTokenUses({root, readSource: name => name === file ? alias : read(name)})
  .cases.find(row => row.file === 'legacy-checkbox/checkbox.ts').local_name, 'AccessorToken');
report.mutations = mutations; report.alias_positive = true;
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({frozen_uses: 6, actual_class_symbols: 6, actual_decorator_attachments: 6,
  tagged_provider_objects: 6, public_exports: 6, mutations: 7, alias_positive: true,
  actual_class_instances_or_native_cva_executed: false}));
