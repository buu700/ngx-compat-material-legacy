/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),raw=path=>readFileSync(join(root,path));
const {dialogServiceDefaultSourceRebinding:qualify}=await import(pathToFileURL(join(root,'scripts/dialog-caller-service-default-source-rebinding.mjs')));
const q=qualify();
for(const path of ['compatibility/rc/dialog-caller-service-default-source-impact.json',q.prior.prior_review_members[0].path,q.boundary.targets[0].path]) {
 assert.throws(()=>qualify({read:member=>member===path?Buffer.concat([raw(member),Buffer.from('\n')]):raw(member)}),error=>error?.code==='ERR_ASSERTION');
}
let changed;const late=path=>path===changed?Buffer.concat([raw(path),Buffer.from('\n')]):raw(path);
qualify({read:late});changed=q.boundary.targets[0].path;
assert.throws(()=>qualify({read:late}),error=>error?.code==='ERR_ASSERTION');
console.log(JSON.stringify({line:q.line,source_rebindings_prepared:q.rows.length,complete_prior_cases_preserved:q.review.reviews.length,API_signatures_and_other_class_members_unchanged:q.review.API_signatures_and_other_class_members_unchanged,source_closures:0,corruptions_rejected:3,late_changes_rejected:1,canonical_writes_performed:0,native_packed_AOT_or_full_floor_qualified:false}));
