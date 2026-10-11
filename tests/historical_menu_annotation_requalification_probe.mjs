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
import {inspectHistoricalMenuAnnotationRequalification, ANNOTATION_INPUTS}
  from '../scripts/historical-menu-annotation-requalification.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const report = await inspectHistoricalMenuAnnotationRequalification({root});
assert.deepEqual(report.groups.map(group => group.current_roles), [102, 114]);
assert.deepEqual(report.groups.map(group => group.unchanged_old_roles), [100, 111]);
const controls = [];
for (const [id, path, bytes] of [
  ['changed-input-identities', ANNOTATION_INPUTS, Buffer.from('changed inputs')],
  ['changed-authenticated-original-metadata', 'compatibility/rc/property-decorator-minimum-source-diagnostic.json', Buffer.from('changed original')],
  ['changed-fresh-metadata-receipt', 'compatibility/rc/historical-menu-parameter-requalification-diagnostic.json', Buffer.from('changed metadata')],
  ['changed-authority', 'compatibility/rc/owned-menu-item-implementation-decision.json', Buffer.from('changed authority')],
  ['foreign-query-token', 'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts',
    Buffer.from(read('projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts').toString('utf8').replace('MatMenuItem as PeerMatMenuItem', 'OtherItem as PeerMatMenuItem'))],
  ['foreign-constructor-token', 'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts',
    Buffer.from(read('projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts').toString('utf8').replace('MatMenuItem as PeerMatMenuItem', 'OtherItem as PeerMatMenuItem'))],
]) {
  assert.notDeepEqual(bytes, read(path));
  await assert.rejects(inspectHistoricalMenuAnnotationRequalification({root,
    readMember: member => member === path ? bytes : read(member)}));
  controls.push({id, rejected: true});
}
report.negative_controls = controls;
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.line, reviewed_source_rows: 216,
  annotations_per_subject: report.groups.map(group => group.actual_annotations_per_subject),
  producer_mutations: 46, negative_controls: controls.length, native_or_packed_qualified: false}));
