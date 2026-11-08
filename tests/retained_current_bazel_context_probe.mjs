/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {BAZEL_BUILD_SHAS,bazelBuildEvidenceOk,analyzeBazelBuildSubjects} from '../scripts/upstream-bazel-build-scope.mjs';
const physical=path=>readFileSync(path),report='compatibility/rc/packed-upstream-source-bazel.json';
const body=JSON.parse(physical(report)),ledger=JSON.parse(physical('compatibility/f10/disposition-ledger/ledger.json'));
const entries=BAZEL_BUILD_SHAS.map(sha=>ledger.entries.find(row=>row.sha===sha));assert.ok(entries.every(Boolean));
const paths=execFileSync('git',['ls-files','projects/ngx-material-legacy'],{encoding:'utf8'}).trim().split('\n');
let retiredReads=0;
const retiredPaths=new Set(JSON.parse(physical('compatibility/rc/main-retained-current-context-v1.json')).before_contexts[0].retired_paths);
assert.equal(retiredPaths.size,23);
const read=path=>{if(retiredPaths.has(path)){retiredReads++;throw Error('retired source must not be read as current');}return physical(path);};
for(const entry of entries)assert.equal(bazelBuildEvidenceOk(body,entry,read,()=>paths,'main'),true,entry.sha);
assert.equal(body.candidate_context.product_members.length,1142);assert.equal(paths.length,1120);assert.equal(retiredReads,0);
const actual=analyzeBazelBuildSubjects(read);
assert.equal(actual.starlark.parsed_member_versions,376);assert.equal(actual.reviews.reduce((n,row)=>n+row.hunks,0),406);
assert.equal(actual.annotations.reduce((n,row)=>n+row.count,0),5);assert.equal(actual.configs.length,3);
const targets=['scripts/upstream-bazel-build-scope.mjs','scripts/upstream_bazel_source_analysis.py',
 'scripts/retained-current-context-identity.mjs','compatibility/rc/main-retained-current-context-v1.json',
 'compatibility/rc/main-retained-bazel-current-review-v1.json',report,'compatibility/rc/bazel-build-only-subjects.json.gz',
 '.github/workflows/ci.yml','.node-version','scripts/pack-library.mjs',
 'projects/ngx-material-legacy/legacy-autocomplete/public-api.ts','projects/ngx-material-legacy/legacy-tabs/tab-body-reversal.spec.ts'];
let rejected=0,recovery=0;
for(const target of targets){
 const changed=path=>{const raw=read(path);return path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 assert.equal(bazelBuildEvidenceOk(body,entries[0],changed,()=>paths,'main'),false,target);rejected++;
 assert.equal(bazelBuildEvidenceOk(body,entries[0],read,()=>paths,'main'),true,'recovery '+target);recovery++;
}
assert.equal(bazelBuildEvidenceOk(body,entries[0],read,()=>paths.slice(1),'main'),false,'missing population member');rejected++;
assert.equal(bazelBuildEvidenceOk(body,entries[0],read,()=>[...paths,'projects/ngx-material-legacy/BUILD.bazel'],'main'),false,'added Bazel member');rejected++;
const changedBody=structuredClone(body);changedBody.source_analysis.annotations[0].count++;
assert.equal(bazelBuildEvidenceOk(changedBody,entries[0],read,()=>paths,'main'),false,'changed original semantic fact');rejected++;
const changedEntry=structuredClone(entries[0]);changedEntry.reason+=' changed';
assert.equal(bazelBuildEvidenceOk(body,changedEntry,read,()=>paths,'main'),false,'changed individual judgment');rejected++;
let reviews=0,late=false;const target=paths[0];
const lateRead=path=>{if(path==='compatibility/rc/main-retained-bazel-current-review-v1.json'&&++reviews===3)late=true;return path===target&&late?Buffer.from('late current product'):read(path);};
assert.equal(bazelBuildEvidenceOk(body,entries[0],lateRead,()=>paths,'main'),false,'late product after initial context');assert.equal(late,true);rejected++;
assert.equal(bazelBuildEvidenceOk(body,entries[0],read,()=>paths,'main'),true,'final recovery');
console.log(JSON.stringify({result:'pass',individual_source_rows:2,historical_products:1142,current_products:1120,
 original_paths:194,hunks:406,parsed_starlark_versions:376,negative_controls:rejected,mutation_recoveries:recovery,retired_sources_read_as_current:retiredReads,runtime_or_audit_pass:false}));
