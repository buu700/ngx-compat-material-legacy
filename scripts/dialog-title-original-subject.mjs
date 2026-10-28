/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Whole original title patch authentication; no current-product or native credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';

export const TITLE_ORIGINAL_SHA='642d886ef117721a34c98055391c9055fde29607';
const PREFIX='compatibility/rc/21x-c04-dialog-title-replacement-';
const DIFF='13c81abcdf9b4b4e80e864db636af1eeb31bb1ca44110d0358e43763e5bce2b6';
const SUBJECTS=Object.freeze([
 {path:PREFIX+'originals.json.gz',sha256:'8050f240fa4a48d260ef0a69ae9a7c46c3e9bea6cdac12ac44b4b314adc6709f',bytes:96915},
 {path:PREFIX+'originals-offline-replay.json.gz',sha256:'7b02f88868404cb011169ac7e6eee802360f6adb770241fefc2ca75a55acb3f5',bytes:96848},
 {path:PREFIX+'individual-review.json',sha256:'794ffdc1bdfc7d2d234ee2ff46a591f74c471b38dee40343a551d9354f9cb4c3',bytes:47078},
].map(Object.freeze));
const PATHS=Object.freeze([
 'src/cdk/dialog/dialog-container.ts',
 'src/material/dialog/dialog-container.ts',
 'src/material/dialog/dialog-content-directives.ts',
 'src/material/dialog/dialog.spec.ts',
 'src/material/legacy-dialog/dialog-container.ts',
 'src/material/legacy-dialog/dialog-content-directives.ts',
 'tools/public_api_guard/cdk/dialog.md',
 'tools/public_api_guard/material/dialog.md',
 'tools/public_api_guard/material/legacy-dialog.md',
]);
const SEED=Object.freeze(PATHS.slice(1,4));
const TAGGED_PATHS=Object.freeze([...PATHS,
 'src/material/legacy-dialog/dialog.spec.ts',
 'src/material/legacy-dialog/dialog-container.html',
 'src/material/legacy-dialog/dialog.scss',
 'src/material/legacy-dialog/dialog.ts',
 'src/material/legacy-dialog/dialog-ref.ts',
 'src/material/dialog/dialog.ts',
 'src/material/dialog/dialog-ref.ts',
 'src/material/legacy-dialog/dialog-config.ts',
 'src/cdk/dialog/dialog-config.ts',
]);
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const objectHash=(type,raw)=>createHash('sha1').update(type+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');

function verifyBlob(value,path){
 assert.equal(value.path,path);assert.equal(typeof value.body,'string');
 const raw=Buffer.from(value.body);
 assert.equal(raw.length,value.bytes,'blob length '+path);
 assert.equal(hash(raw),value.sha256,'blob digest '+path);
 assert.equal(objectHash('blob',raw),value.blob,'Git blob identity '+path);
 assert.equal(value.absent,undefined,'title patch contains only present files');
}

/** Apply the finite, newline-terminated original hunks without fuzz or offsets. */
export function replayDialogTitleSection(section){
 const before=section.before.body.split('\n');assert.equal(before.pop(),'');
 const starts=[...section.patch.matchAll(/^@@ .*$/gm)];
 assert.equal(starts.length,section.hunks.length,'unreviewed or missing original hunk');
 const expectedHeader=`diff --git a/${section.path} b/${section.path}\nindex ${section.before.blob}..${section.after.blob} 100644\n--- a/${section.path}\n+++ b/${section.path}\n`;
 assert.equal(section.patch.slice(0,starts[0]?.index),expectedHeader,'original patch file header');
 const output=[],hunks=[];let cursor=0;
 for(const [index,start]of starts.entries()){
  const text=section.patch.slice(start.index,starts[index+1]?.index??section.patch.length);
  const lines=text.split('\n');assert.equal(lines.pop(),'');
  const header=lines.shift(),range=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: .*)?$/.exec(header);
  assert.ok(range,'original hunk header');
  const oldStart=Number(range[1])-1,newStart=Number(range[3])-1;
  assert.ok(oldStart>=cursor&&oldStart<=before.length,'overlapping original hunks');
  output.push(...before.slice(cursor,oldStart));cursor=oldStart;
  assert.equal(output.length,newStart,'original new-side hunk position');
  let removed=0,added=0;
  for(const line of lines){
   assert.ok([' ','-','+'].includes(line[0]),'unsupported original hunk line');
   if(line[0]!=='+'){assert.equal(before[cursor++],line.slice(1),'original hunk context');removed++;}
   if(line[0]!=='-'){output.push(line.slice(1));added++;}
  }
  assert.equal(removed,Number(range[2]??1),'original old-side hunk length');
  assert.equal(added,Number(range[4]??1),'original new-side hunk length');
  hunks.push({index,header,text,sha256:hash(text)});
 }
 output.push(...before.slice(cursor));
 assert.equal(output.join('\n')+'\n',section.after.body,'original patch does not produce after-image');
 assert.deepEqual(section.hunks,hunks,'original hunk metadata');
 return hunks.map(hunk=>({path:section.path,...hunk}));
}

/** Pure data verification, independently usable by the synchronous admission owner. */
export function verifyDialogTitleOriginalData({original,replay:offline,body}={}){
 for(const archive of [original,offline]){
  assert.equal(archive.schema_version,1);assert.equal(archive.line,'21.x');
  assert.equal(archive.original_file_occurrences,9);assert.equal(archive.original_hunks,21);
  assert.equal(archive.canonical_decisions_changed,0);assert.equal(archive.g11_claim,'not-passed');
  assert.deepEqual(archive.reviews.map(row=>row.sha),[TITLE_ORIGINAL_SHA]);
 }
 assert.deepEqual(original.reviews,offline.reviews,'offline original replay differs');
 assert.deepEqual(original.tagged_reference,offline.tagged_reference,'offline tagged replay differs');
 assert.equal(body.schema_version,1);assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');
 assert.equal(body.source_review_complete,true);assert.equal(body.original_file_occurrences,9);
 assert.equal(body.original_hunks,21);assert.equal(body.present_original_blob_occurrences,18);
 assert.equal(body.canonical_decisions_changed,0);assert.equal(body.canonical_guard_or_owner_stage_integrated,false);
 assert.equal(body.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
 assert.equal(body.g11_claim,'not-passed');assert.equal(body.g13_claim,'not-passed');
 assert.deepEqual(body.originals,SUBJECTS[0]);assert.deepEqual(body.offline_replay,SUBJECTS[1]);
 assert.deepEqual(body.reviews.map(row=>row.sha),[TITLE_ORIGINAL_SHA]);
 const source=original.reviews[0],review=body.reviews[0];
 assert.equal(objectHash('commit',source.raw_commit),TITLE_ORIGINAL_SHA,'original commit identity');
 assert.equal(source.raw_commit.split('\n').filter(line=>line.startsWith('parent ')).join('\n'),'parent '+source.parent);
 assert.equal(source.parent,'977e97140635f206d065a649577f699db2f93bfa');
 assert.equal(source.diff_sha256,DIFF);assert.equal(hash(source.diff),DIFF);
 assert.equal(review.diff_sha256,DIFF);assert.equal(review.diff,source.diff);
 assert.deepEqual(source.sections.map(section=>section.path),PATHS);
 assert.deepEqual(review.complete_original_paths,PATHS);assert.deepEqual(source.frozen_seed_paths,SEED);
 assert.deepEqual(review.frozen_seed_paths,SEED);
 assert.equal(source.sections.map(section=>section.patch).join(''),source.diff,'incomplete original patch');
 const tagged=original.tagged_reference;
 assert.equal(tagged.tag,'16.2.14');assert.equal(tagged.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');
 assert.deepEqual(tagged.members.map(member=>member.path),TAGGED_PATHS);
 const members=new Map();for(const member of tagged.members){verifyBlob(member,member.path);members.set(member.path,member);}
 const hunks=[];
 for(const section of source.sections){
  assert.equal(section.status,'M');assert.equal(section.before_mode,'100644');assert.equal(section.after_mode,'100644');
  verifyBlob(section.before,section.path);verifyBlob(section.after,section.path);
  assert.equal(hash(section.patch),section.patch_sha256,'section patch digest');
  hunks.push(...replayDialogTitleSection(section));
  assert.deepEqual(section.after,members.get(section.path),'after-image differs from untouched tagged file');
 }
 assert.equal(hunks.length,21);
 assert.deepEqual(review.complete_original_hunk_reviews.map(({technical_judgment,...hunk})=>hunk),hunks,'incomplete individual hunk review');
 for(const hunk of review.complete_original_hunk_reviews)assert.ok(typeof hunk.technical_judgment==='string'&&hunk.technical_judgment.trim().length>30,'missing individual hunk judgment');
 assert.equal(review.status,'reviewed');assert.equal(review.source_scope_only,true);
 assert.equal(review.proposed_final_disposition,'already-adapted');assert.equal(review.canonical_disposition_applied,false);
 assert.equal(review.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
 assert.equal(review.g11_claim,'not-passed');assert.equal(review.g13_claim,'not-passed');
 return {sha:TITLE_ORIGINAL_SHA,diff_sha256:DIFF,original_files:9,original_hunks:21,
  verified_original_blobs:18,verified_tagged_blobs:18,exact_patch_replays:9,
  exact_tagged_after_images:9,frozen_seed_files:3,source_review_only:true,
  canonical_decisions_changed:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}

function regular(root,path){
 let file=resolve(root);assert.ok(lstatSync(file).isDirectory()&&!lstatSync(file).isSymbolicLink());
 for(const part of path.split('/')){assert.ok(part&&part!=='.'&&part!=='..'&&!part.includes('\\'));file=join(file,part);assert.equal(lstatSync(file).isSymbolicLink(),false,'linked title original subject');}
 assert.ok(lstatSync(file).isFile());return readFileSync(file);
}

export function inspectDialogTitleOriginalSubject({root=process.cwd(),read=path=>regular(root,path)}={}){
 const bound=SUBJECTS.map(ref=>({...ref}));
 const raw=bound.map(ref=>{const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed title original input '+ref.path);assert.equal(value.length,ref.bytes);return value;});
 const data={original:JSON.parse(gunzipSync(raw[0])),replay:JSON.parse(gunzipSync(raw[1])),body:JSON.parse(raw[2])};
 const result=verifyDialogTitleOriginalData(data);
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'late title original input '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {result,data,bound:structuredClone(bound),assertCurrent};
}
