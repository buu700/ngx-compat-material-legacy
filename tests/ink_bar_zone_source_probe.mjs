/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewInkBarZoneUse} from '../scripts/ink-bar-zone-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(join(root, p), 'utf8');
const hash = b => createHash('sha256').update(b).digest('hex');
const path = 'projects/ngx-material-legacy/legacy-tabs/ink-bar.ts', text = read(path), recorded_case = reviewInkBarZoneUse({root});
const controls = [];
for (const [id, changed] of [
  ['type-only-constructor-token', text.replace('  NgZone,', '  type NgZone,')],
  ['optional-zone', text.replace('_ngZone: NgZone', '_ngZone?: NgZone')],
  ['private-zone-access', text.replace('this._ngZone.isStable', 'this._ngZone._nesting')],
  ['unreviewed-extra-role', text + '\nconst extraZone = inject(NgZone);\n'],
]) {
  assert.notEqual(changed, text);
  assert.throws(() => reviewInkBarZoneUse({root, readSource: p => p === path ? changed : read(p)}), assert.AssertionError, id);
  controls.push({id, rejected: true});
}
const report = {schema_version: 1, line: JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main',
  recorded_case, controls, producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))),
  review_producer_sha256: hash(read('scripts/ink-bar-zone-use-review.mjs')),
  scope: 'Finite constructor token and three public accesses only. Four actual source faults reject changed import ownership, optional construction, unsupported member and extra use. Full native/AOT/packed/floor/G11 remains separate.'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.line, source_roles: 1, public_accesses: 3, negatives: controls.length}));
