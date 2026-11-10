/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {inspectDialogCurrentOwner} from '../scripts/dialog-caller-current-owner.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path));
const actual=inspectDialogCurrentOwner({root,read});
assert.equal(actual.line,'main'); assert.equal(actual.current_source_files,48);
assert.equal(actual.overlay_source_files,138); assert.equal(actual.source_roles,88);
assert.equal(actual.rows.length,18); assert.equal(actual.historical_review.reviews.length,18);
assert.equal(actual.current_role_facts.length,18);
const changed=[
 'compatibility/rc/dialog-caller-prior.json.gz',
 'compatibility/rc/dialog-caller-current-epoch/input-manifest.json',
 'compatibility/rc/dialog-caller-current-epoch/current-strict-diagnostic.json',
 'compatibility/rc/dialog-caller-current-epoch/current-roles-diagnostic.json',
 'compatibility/rc/dialog-caller-current-epoch/resource-runtime-v3-diagnostic.json',
 'compatibility/rc/dialog-caller-public-sources/03306f25c7f5ab1fde85e0f020cccfaa751b67a90faca8509b6ae205d5c8014e.gz',
 'tests/a11y_caller_node_protocol.mjs',
 'compatibility/f10/authored-use-reviews/dialog-callers.json',
 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts',
 'projects/ngx-material-legacy/legacy-autocomplete/autocomplete-module.ts',
 'projects/ngx-material-legacy/legacy-core/option/option.html',
];
for (const path of changed) assert.throws(()=>inspectDialogCurrentOwner({root,read:member=>member===path?Buffer.concat([read(member),Buffer.from('\n')]):read(member)}),undefined,path);
const oldPath='projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts';
const old=execFileSync('git',['--no-replace-objects','show','4cb2733bf1:'+oldPath],{cwd:root});
assert.throws(()=>inspectDialogCurrentOwner({root,read:path=>path===oldPath?old:read(path)}));
let changedLate;
const late=path=>path===changedLate?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
inspectDialogCurrentOwner({root,read:late});changedLate=oldPath;
assert.throws(()=>inspectDialogCurrentOwner({root,read:late}));
console.log(JSON.stringify({line:actual.line,source_roles:actual.source_roles,corruptions_rejected:changed.length,before_source_rejected:true,late_source_rejected:true,native_packed_AOT_or_full_floor_qualified:actual.native_packed_AOT_or_full_floor_qualified}));
