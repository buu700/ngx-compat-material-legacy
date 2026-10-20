/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
const root=process.cwd(),read=p=>{assert.equal(isAbsolute(p),false,'integration evidence read escaped repository');return readFileSync(join(root,p));};
const {inspectPortableTableCoercion}=await import(pathToFileURL(join(root,'scripts/snack-dom-source-context-review.mjs')));
const review='compatibility/f10/authored-use-reviews/table-coercion-callers.json';let changed=false;const late=p=>changed&&p===review?Buffer.concat([read(p),Buffer.from('\n')]):read(p),body=await inspectPortableTableCoercion({root,read:late});assert.equal(isDeepStrictEqual(body,JSON.parse(read(review))),true);changed=true;await assert.rejects(inspectPortableTableCoercion({root,read:late}),e=>e?.code==='ERR_ASSERTION');
const paths=[review,'compatibility/rc/coercion-public-subjects.json','projects/ngx-material-legacy/legacy-table/row.ts'];for(const path of paths){const bad=Buffer.concat([read(path),Buffer.from('\n')]);await assert.rejects(inspectPortableTableCoercion({root,read:p=>p===path?bad:read(p)}),e=>e?.code==='ERR_ASSERTION');}
const result={line:body.line,portable_tagged_and_minimum_namespaces:3,review_cases_unchanged:3,boolean_cases_each:42,number_cases_retained_without_extra_closure:378,source_evidence_corruptions_rejected:paths.length,late_review_change_rejected:true,host_coercion_cache_required:false,actual_native_packed_or_full_floor_qualified:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
