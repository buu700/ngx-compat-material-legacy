/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectFocusableOptionCallers, compileFocusableOptionClosure, reviewFocusableOptionTypes} from '../scripts/focusable-option-type-review.mjs';
const report = reviewFocusableOptionTypes(), read = path => readFileSync(path, 'utf8'), mutations = [];
const first = 'projects/ngx-material-legacy/' + report.cases[0].file;
for (const [id, file, change] of [
  ['runtime-interface-value', first, text => text + '\nconsole.log(FocusableOption);\n'],
  ['missing-public-import', first, text => text.replace("import {FocusableOption} from '@angular/cdk/a11y';", '')],
  ['duplicate-public-import', first, text => text + "\nimport type {FocusableOption as Duplicate} from '@angular/cdk/a11y';\n"],
  ['private-import-route', first, text => text.replace("'@angular/cdk/a11y'", "'@angular/cdk/a11y/_focus-key-manager'")],
  ['runtime-inheritance', 'projects/ngx-material-legacy/legacy-core/option/option-base.ts', text => text.replace('implements FocusableOption, AfterViewChecked, OnDestroy', 'extends FocusableOption implements AfterViewChecked, OnDestroy')],
]) {
  const original = read(file), changed = change(original); assert.notEqual(original, changed);
  assert.throws(() => inspectFocusableOptionCallers({readSource: p => p === file ? changed : read(p)}), undefined, id); mutations.push(id);
}
const ownedFile = 'projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts';
for (const [id, change] of [
  ['owned-runtime-interface-value', text => text + '\nconsole.log(FocusableOption);\n'],
  ['owned-missing-public-interface-import', text => text.replace('FocusableOption, FocusMonitor', 'FocusMonitor')],
  ['owned-interface-inheritance', text => text.replace('extends _MatMenuItemBase', 'extends FocusableOption')],
]) {
  const original = read(ownedFile), changed = change(original); assert.notEqual(original, changed);
  assert.throws(() => inspectFocusableOptionCallers({readSource: path => path === ownedFile ? changed : read(path)}));
  mutations.push(id);
}
for (const [id, name, change] of [
  ['missing-focus', 'FocusableOption', text => text.replace('focus(origin?: FocusOrigin): void;', '')],
  ['required-origin', 'FocusableOption', text => text.replace('origin?:', 'origin:')],
  ['numeric-origin', 'FocusableOption', text => text.replace('origin?: FocusOrigin', 'origin?: number')],
  ['required-disabled', 'ListKeyManagerOption', text => text.replace('disabled?:', 'disabled:')],
  ['numeric-label', 'ListKeyManagerOption', text => text.replace('getLabel?(): string', 'getLabel?(): number')],
  ['widened-origin', 'FocusOrigin', text => text.replace("'program' | null", "'program' | null | 'unknown'")],
  ['removed-null-origin', 'FocusOrigin', text => text.replace("'program' | null", "'program'")],
]) {
  const models = structuredClone(report.models), model = models.find(m => m.line === '21.x'), before = model.declarations[name]; model.declarations[name] = change(before); assert.notEqual(before, model.declarations[name]);
  assert.throws(() => compileFocusableOptionClosure(models), undefined, id); mutations.push(id);
}
console.log(JSON.stringify({...report, mutation_rejections: mutations}, null, 2));
