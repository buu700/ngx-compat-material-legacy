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
import {inspectHistoricalMenuRemainingImports, REMAINING_INPUTS}
  from '../scripts/historical-menu-remaining-import-requalification.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const report = await inspectHistoricalMenuRemainingImports({root});
assert.equal(report.source_requalified_rows, 12);
assert.deepEqual(report.groups.map(group => group.whole_group_cases), [21, 25, 21, 31, 111, 15, 4]);
const controls = [];
for (const [id, path, bytes] of [
  ['changed-input-identities', REMAINING_INPUTS, Buffer.from('changed inputs')],
  ['changed-authenticated-original-query', 'compatibility/rc/query-list-minimum-source-diagnostic.json', Buffer.from('changed original')],
  ['changed-fresh-emitter-receipt', 'compatibility/rc/historical-menu-emitter-requalification-diagnostic.json', Buffer.from('changed receipt')],
  ['changed-authority', 'compatibility/rc/owned-menu-item-implementation-decision.json', Buffer.from('changed authority')],
  ['owned-panel-readonly-lost', 'projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts',
    Buffer.from(read('projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts').toString('utf8').replace('readonly close:', 'close:'))],
  ['private-peer-panel-returned', 'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts',
    Buffer.from(read('projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts').toString('utf8').replace("import type {MatMenuPanel} from './menu-panel';", "import type {MatMenuPanel} from '@angular/material/menu';"))],
]) {
  assert.notDeepEqual(bytes, read(path));
  await assert.rejects(inspectHistoricalMenuRemainingImports({root,
    readMember: member => member === path ? bytes : read(member)}));
  controls.push({id, rejected: true});
}
report.negative_controls = controls;
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.line, reviewed_source_rows: 12,
  producer_controls: Object.values(report.producer_negative_controls).reduce((sum, count) => sum + count, 0),
  negative_controls: controls.length, panel_declaration_matches_untouched_tag: true,
  native_or_packed_qualified: false}));
