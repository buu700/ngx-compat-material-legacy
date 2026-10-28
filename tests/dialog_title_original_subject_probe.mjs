/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Complete original patch replay and rejection controls, without upstream execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,symlinkSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {inspectDialogTitleOriginalSubject,verifyDialogTitleOriginalData,replayDialogTitleSection} from '../scripts/dialog-title-original-subject.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const disk=path=>readFileSync(join(root,path)),hash=value=>createHash('sha256').update(value).digest('hex');
let late=null;const read=path=>path===late?Buffer.concat([disk(path),Buffer.from('\n')]):disk(path);
const inspected=inspectDialogTitleOriginalSubject({root,read});
assert.deepEqual(inspected.result,{sha:'642d886ef117721a34c98055391c9055fde29607',
 diff_sha256:'13c81abcdf9b4b4e80e864db636af1eeb31bb1ca44110d0358e43763e5bce2b6',
 original_files:9,original_hunks:21,verified_original_blobs:18,verified_tagged_blobs:18,
 exact_patch_replays:9,exact_tagged_after_images:9,frozen_seed_files:3,source_review_only:true,
 canonical_decisions_changed:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'});
const rejected=[];
function reject(id,callback,pattern){assert.throws(callback,pattern,id);rejected.push(id);}
for(const member of inspected.bound){
 late=member.path;
 reject('cold-'+member.path,()=>inspectDialogTitleOriginalSubject({root,read}),/changed title original input/);
 reject('late-'+member.path,()=>inspected.assertCurrent(),/late title original input/);
 late=null;inspected.assertCurrent();
}

function dataFault(id,edit,pattern){
 const data=structuredClone(inspected.data);edit(data);
 reject(id,()=>verifyDialogTitleOriginalData(data),pattern);
}
function both(data,edit){edit(data.original);edit(data.replay);}
dataFault('wrong-original-commit',data=>both(data,a=>a.reviews[0].raw_commit+='\n'),/original commit identity/);
dataFault('offline-original-divergence',data=>data.replay.reviews[0].subject+=' altered',/offline original replay differs/);
dataFault('offline-tagged-divergence',data=>data.replay.tagged_reference.members.pop(),/offline tagged replay differs/);
dataFault('missing-original-file',data=>both(data,a=>a.reviews[0].sections.pop()));
dataFault('reordered-original-files',data=>both(data,a=>a.reviews[0].sections.reverse()));
dataFault('omitted-patch-section',data=>both(data,a=>a.reviews[0].sections[0].patch=''),/incomplete original patch/);
dataFault('missing-tagged-context',data=>both(data,a=>a.tagged_reference.members.pop()));
dataFault('wrong-tagged-commit',data=>both(data,a=>a.tagged_reference.commit='0'.repeat(40)));
dataFault('bad-original-blob',data=>both(data,a=>a.reviews[0].sections[0].before.blob='0'.repeat(40)),/Git blob identity/);
dataFault('changed-before-body',data=>both(data,a=>a.reviews[0].sections[0].before.body+='\n'),/blob length/);
dataFault('changed-tagged-body',data=>both(data,a=>a.tagged_reference.members[0].body+='\n'),/blob length/);
dataFault('missing-hunk-review',data=>data.body.reviews[0].complete_original_hunk_reviews.pop(),/incomplete individual hunk review/);
dataFault('reordered-hunk-review',data=>data.body.reviews[0].complete_original_hunk_reviews.reverse(),/incomplete individual hunk review/);
dataFault('unreviewed-hunk',data=>data.body.reviews[0].complete_original_hunk_reviews[0].technical_judgment='');
dataFault('broadened-frozen-seed',data=>data.body.reviews[0].frozen_seed_paths.push('src/cdk/dialog/dialog-container.ts'));
dataFault('source-proof-native-claim',data=>data.body.actual_native_artifact_browser_floor_or_full_audit_qualified=true);
dataFault('source-proof-canonical-claim',data=>data.body.canonical_guard_or_owner_stage_integrated=true);
dataFault('source-proof-G11-claim',data=>data.body.g11_claim='passed');

const section=inspected.data.original.reviews[0].sections[0];
function patchEdit(value,from,to){
 assert.equal(value.patch.split(from).length,2);
 value.patch=value.patch.replace(from,to);
 const hunk=value.hunks.find(row=>row.text.includes(from));
 if(hunk){hunk.text=hunk.text.replace(from,to);hunk.header=hunk.text.split('\n')[0];hunk.sha256=hash(hunk.text);}
 value.patch_sha256=hash(value.patch);
}
function replayFault(id,edit,pattern){
 const value=structuredClone(section);edit(value);
 reject(id,()=>replayDialogTitleSection(value),pattern);
}
replayFault('replay-requires-exact-context',value=>patchEdit(value,"     '[attr.id]': '_config.id || null',","     '[attr.id]': 'forged',"),/original hunk context/);
replayFault('replay-no-new-side-offset',value=>patchEdit(value,'@@ -60,7 +60,7 @@','@@ -60,7 +61,7 @@'),/original new-side hunk position/);
replayFault('replay-old-side-count',value=>patchEdit(value,'@@ -60,7 +60,7 @@','@@ -60,8 +60,7 @@'),/original old-side hunk length/);
replayFault('replay-new-side-count',value=>patchEdit(value,'@@ -60,7 +60,7 @@','@@ -60,7 +60,8 @@'),/original new-side hunk length/);
replayFault('replay-no-overlap',value=>patchEdit(value,'@@ -87,8 +87,13 @@','@@ -60,8 +87,13 @@'),/overlapping original hunks/);
replayFault('replay-no-unknown-line',value=>patchEdit(value,"     '[attr.id]': '_config.id || null',","!    '[attr.id]': '_config.id || null',"),/unsupported original hunk line/);
replayFault('replay-no-fuzz',value=>value.before.body='unrelated new line\n'+value.before.body,/original hunk context/);
replayFault('replay-complete-after-image',value=>value.after.body+='unreviewed tail\n',/original patch does not produce after-image/);
replayFault('replay-authenticates-file-header',value=>value.patch=value.patch.replace('diff --git a/','diff --git c/'),/original patch file header/);
replayFault('replay-no-dropped-hunks',value=>value.hunks.pop(),/unreviewed or missing original hunk/);
replayFault('replay-hunk-index',value=>value.hunks[0].index=1,/original hunk metadata/);
replayFault('replay-hunk-digest',value=>value.hunks[0].sha256='0'.repeat(64),/original hunk metadata/);
replayFault('replay-newline-preserved',value=>value.patch=value.patch.slice(0,-1));
assert.equal(replayDialogTitleSection(section).length,3);

// Exercise the physical reader with the same authenticated bytes, then a linked member.
const temporary=mkdtempSync(join(tmpdir(),'ngx-title-original-'));
try{
 for(const member of inspected.bound){const path=join(temporary,member.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,disk(member.path));}
 assert.deepEqual(inspectDialogTitleOriginalSubject({root:temporary}).result,inspected.result);
 const path=join(temporary,inspected.bound[0].path),target=path+'.actual';
 writeFileSync(target,readFileSync(path));rmSync(path);symlinkSync(target,path);
 reject('physical-linked-input',()=>inspectDialogTitleOriginalSubject({root:temporary}),/linked title original subject/);
}finally{rmSync(temporary,{recursive:true,force:true});}
inspected.assertCurrent();
const report={schema_version:1,result:'pass',node:process.version,...inspected.result,
 producer:{path:'tests/dialog_title_original_subject_probe.mjs',sha256:hash(disk('tests/dialog_title_original_subject_probe.mjs'))},
 verifier:{path:'scripts/dialog-title-original-subject.mjs',sha256:hash(disk('scripts/dialog-title-original-subject.mjs'))},
 bound:inspected.bound,rejections:rejected,upstream_code_executed:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
