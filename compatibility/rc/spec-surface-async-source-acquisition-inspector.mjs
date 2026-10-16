/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Capture authentication only; unmatched suite labels are not test removals. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2],out=process.argv[3],read=p=>readFileSync(resolve(root,p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const {reviewCompleteSingleSpec}=await import(pathToFileURL(resolve(root,'scripts/authenticated-single-spec-review.mjs')));
const {originalEnvironmentCases}=await import(pathToFileURL(resolve(root,'scripts/spec-test-environment-source-review.mjs')));
const worksheet=JSON.parse(read('compatibility/rc/spec-surface-async-source-worksheet.json'));
const source='compatibility/rc/spec-surface-async-source-subjects.json.gz', acquisition='compatibility/rc/spec-surface-async-source-acquisition.json.gz';
const packet=JSON.parse(gunzipSync(read(source))),record=JSON.parse(gunzipSync(read(acquisition))), census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));
assert.equal(packet.line,worksheet.line);assert.equal(record.line,worksheet.line);
for(const p of [packet,record]){
 assert.equal(hash(read(p.producer.path)),p.producer.sha256);
 assert.equal(hash(p.selection.worksheet_text),p.selection.sha256);
 assert.deepEqual(JSON.parse(p.selection.worksheet_text).subjects,worksheet.subjects);
}
assert.equal(record.shared_cache_written,false);assert.equal(record.credentials_used_or_changed,false);
assert.equal(record.upstream_or_candidate_source_executed,false);
assert.deepEqual(packet.subjects.map(n=>n.sha),worksheet.subjects);
const rows=[];
for(const s of packet.subjects){
 const original=census.commits.find(n=>n.sha===s.sha);assert.equal(s.raw_commit,original.raw_commit);assert.deepEqual(s.complete_changed_files,original.complete_changed_files);
 const hunks=reviewCompleteSingleSpec(s,worksheet.subjects),before=originalEnvironmentCases(s,'before'),after=originalEnvironmentCases(s,'after');
 const left=new Map(before.map(n=>[n.key,n])),right=new Map(after.map(n=>[n.key,n]));assert.equal(left.size,before.length);assert.equal(right.size,after.length);
 const row={sha:s.sha,path:s.members[0].path,files:s.members.length,hunks:hunks.length,hunk_records:hunks,
  before_static_occurrences:before.length,after_static_occurrences:after.length,
  retained_order_equal:JSON.stringify(before.filter(n=>right.has(n.key)).map(n=>n.key))===JSON.stringify(after.filter(n=>left.has(n.key)).map(n=>n.key)),
  removed:before.filter(n=>!right.has(n.key)).map(({path,suites,mode,name,sha256})=>({path,suites,mode,name,sha256})),
  added:after.filter(n=>!left.has(n.key)).map(({path,suites,mode,name,sha256})=>({path,suites,mode,name,sha256})),
  unchanged_callback_semantics:before.filter(n=>right.get(n.key)?.callback_sha256===n.callback_sha256).length,
  semantic_applicability_review_complete:false,actual_Angular_or_floor_qualified:false};
 rows.push(row);
}
const result={schema_version:1,line:worksheet.line,complete_original_files:rows.reduce((n,r)=>n+r.files,0),complete_original_hunks:rows.reduce((n,r)=>n+r.hunks,0),
 originals:{path:source,sha256:hash(read(source))},acquisition:{path:acquisition,sha256:hash(read(acquisition))},
 authenticator:{path:'scripts/authenticated-single-spec-review.mjs',sha256:hash(read('scripts/authenticated-single-spec-review.mjs'))},
 static_collector:{path:'scripts/spec-test-environment-source-review.mjs',sha256:hash(read('scripts/spec-test-environment-source-review.mjs'))},
 rows,semantic_reviews_pending:4,unmatched_labels_not_confirmed_test_additions_or_removals:true,source_acquisition_and_hunk_authentication_only:true,actual_Angular_native_artifact_or_floor_qualified:false,g11_claim:'not-passed'};
writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...result,rows:rows.map(({hunk_records,removed,added,...row})=>({...row,unmatched_before_labels:removed.length,unmatched_after_labels:added.length}))}));
