/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {reviewHarnessFilterReexports} from '../scripts/harness-filter-reexports-review.mjs';
const root = resolve('.'), report = reviewHarnessFilterReexports({root});
const mutations = [
  ['projects/ngx-material-legacy/legacy-menu/testing/menu-harness-filters.ts', text => text.replace('triggerText?: string | RegExp;', 'triggerText?: string | RegExp; triggerIconName?: string | RegExp;')],
  ['projects/ngx-material-legacy/legacy-menu/testing/public-api.ts', text => text.replace("export {LegacyMenuHarnessFilters} from './menu-harness-filters';", "export {MenuHarnessFilters as LegacyMenuHarnessFilters} from '@angular/material/menu/testing';")],
  ['projects/ngx-material-legacy/legacy-checkbox/testing/public-api.ts', text => text.replace('CheckboxHarnessFilters as LegacyCheckboxHarnessFilters', 'CheckboxHarnessFilters as WrongCheckboxFilters')],
  ['projects/ngx-material-legacy/legacy-tooltip/testing/tooltip-harness.ts', text => text + '\nconst invalidRuntimeFilter = TooltipHarnessFilters;\n'],
];
for (const [path, mutate] of mutations) {
  const original = readFileSync(path, 'utf8'), replacement = mutate(original); assert.notEqual(replacement, original);
  assert.throws(() => reviewHarnessFilterReexports({root, compile: false, readSource: rel => rel === path ? replacement : readFileSync(rel, 'utf8')}));
}
console.log(JSON.stringify({...report, mutations: mutations.length}));
