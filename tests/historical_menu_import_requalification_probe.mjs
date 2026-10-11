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
import {inspectHistoricalMenuImportRequalification, MENU_IMPORT_INPUTS} from '../scripts/historical-menu-import-requalification.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const result = await inspectHistoricalMenuImportRequalification({root});
const controls = [];
const base = 'projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts';
const guard = 'projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox.ts';
for (const [id, path, change, expected] of [
  ['changed-input-capsule', MENU_IMPORT_INPUTS, bytes => Buffer.concat([bytes, Buffer.from(' ')]), /input identity changed/],
  ['changed-executed-evidence', 'compatibility/rc/owned-menu-item-element-ref-requalification.json', bytes => Buffer.concat([bytes, Buffer.from(' ')]), /evidence identity changed/],
  ['changed-owner-authority', 'compatibility/rc/owned-menu-item-implementation-decision.json', bytes => Buffer.concat([bytes, Buffer.from(' ')]), /evidence identity changed/],
  ['owned-menu-element-token-type-only', base, bytes => Buffer.from(bytes.toString().replace('  ElementRef,', '  type ElementRef,')), /ElementRef constructor token imported as type only/],
  ['owned-menu-detector-token-type-only', base, bytes => Buffer.from(bytes.toString().replace('  ChangeDetectorRef,', '  type ChangeDetectorRef,')), /runtime core binding imported type only/],
  ['owned-menu-detector-call-lost', base, bytes => Buffer.from(bytes.toString().replace('this._changeDetectorRef?.markForCheck();', '')), /95 !== 96/],
  ['changed-owned-menu-source-outside-context-review', base, bytes => Buffer.from(bytes.toString().replaceAll('ElementRef<HTMLElement>', 'ElementRef<SVGElement>')), /changed source outside reviewed context callers/],
  ['remaining-context-guard-lost', guard, bytes => Buffer.from(bytes.toString().replace('assertInInjectionContext(MatLegacyPseudoCheckbox);', '')), /missing or additional context guard/],
]) {
  const before = read(path), changed = change(before); assert.notDeepEqual(changed, before, id + ': mutation did not apply');
  await assert.rejects(inspectHistoricalMenuImportRequalification({root,
    readMember: file => file === path ? changed : read(file)}), expected, id + ': mutation escaped');
  controls.push({id, rejected: true});
}
const report = {...result, negative_controls: controls};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.line, existing_element_roles: 71, existing_detector_roles: 41,
  current_context_roles: 9, original_detector_calls: 94, added_historical_detector_calls: 2,
  negative_controls: controls.length, native_or_packed_qualified: false}));
