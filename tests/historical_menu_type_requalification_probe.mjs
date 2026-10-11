/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectHistoricalMenuTypeRequalification, inspectOwnedMenuItemTypeUses, TYPE_INPUTS}
  from '../scripts/historical-menu-type-requalification.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const report = await inspectHistoricalMenuTypeRequalification({root});
assert.equal(report.requalified_frozen_rows, 29);
assert.equal(report.new_current_type_rows, 3);
assert.deepEqual(report.groups.map(group => group.cases), [78, 96, 58, 12, 16]);
const controls = [];
for (const [id, path] of [
  ['changed-input-identities', TYPE_INPUTS],
  ['changed-original-type-proof', 'compatibility/rc/framework-lifecycle-type-use-review.json'],
  ['changed-current-type-proof', 'compatibility/rc/historical-menu-focus-origin-requalification-diagnostic.json'],
  ['changed-authority', 'compatibility/rc/owned-menu-item-implementation-decision.json'],
]) {
  await assert.rejects(inspectHistoricalMenuTypeRequalification({root,
    readMember: member => member === path ? Buffer.from('changed evidence') : read(member)}));
  controls.push({id, rejected: true});
}
const base = read('projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts').toString('utf8');
for (const [id, changed] of [
  ['runtime-focus-origin-use', base + '\nconsole.log(FocusOrigin);\n'],
  ['generic-focus-origin-use', base.replace('origin?: FocusOrigin', 'origin?: FocusOrigin<string>')],
  ['missing-lifecycle-import', base.replace('  OnDestroy,', '')],
]) {
  assert.notEqual(changed, base);
  assert.throws(() => inspectOwnedMenuItemTypeUses(changed));
  controls.push({id, rejected: true});
}
report.negative_controls = controls;
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.line, requalified_frozen_rows: 29, new_current_type_rows: 3,
  producer_mutations: report.groups.reduce((count, group) => count + group.producer_mutation_rejections, 0),
  negative_controls: controls.length, native_or_packed_qualified: false}));
