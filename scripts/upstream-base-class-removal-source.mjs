/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Full original object/tree/hunk proof; substantive current-source review is separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
export const BASE_CLASS_REMOVAL_SHA='55f9618b687fc0da4743a3cf27e113ceb837e151';
export const BASE_CLASS_REMOVAL_PREFIX='compatibility/rc/21x-base-class-removal-source-';
const PREFIX=BASE_CLASS_REMOVAL_PREFIX,SELF='scripts/upstream-base-class-removal-source.mjs';
const ORIGINAL={path:PREFIX+'originals.json.gz',sha256:'3cb87a97a4365dd9959ec4c5fd4a5a2e1f0d5c3656e91e7e1aef65181955f49a'};
const CENSUS={path:'compatibility/rc/upstream-complete-patch-census.json.gz',sha256:'806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'};
const WORKSHEET={path:PREFIX+'worksheet.json',sha256:'a7459210660b5eea641d1239ef0a2c8fb329df8a4c2ef8c8a89a123353b1dace',bytes:8419};
const PATCH='9407791dd755217128d0dd6f3c2c4542f1bcb8aaaa5ce3b8b745b07e190cf8d0';
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex');
export const baseClassRemovalOriginalLoadedImage=Object.freeze({path:SELF,sha256:hash(image),bytes:image.length});
const gitHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');

export function verifyBaseClassRemovalOriginal(original,census){
 assert.equal(original.sha,BASE_CLASS_REMOVAL_SHA);assert.equal(original.line,'21.x');assert.equal(original.original_files,72);assert.equal(original.original_hunks,329);
 assert.equal(census.commits.length,1697);assert.equal(new Set(census.commits.map(row=>row.sha)).size,1697);
 const selected=census.commits.find(row=>row.sha===BASE_CLASS_REMOVAL_SHA);assert.ok(selected);
 const target=original.original_commit,parent=original.parent_commit,tag=original.tagged_reference;
 for(const commit of [target,parent,tag.commit]){
  assert.equal(gitHash('commit',commit.raw),commit.sha);assert.equal(hash(commit.raw),commit.sha256);
  const headers=commit.raw.split('\n\n')[0].split('\n');assert.equal(headers.find(line=>line.startsWith('tree ')).slice(5),commit.tree);assert.deepEqual(headers.filter(line=>line.startsWith('parent ')).map(line=>line.slice(7)),commit.parents);
 }
 assert.equal(target.sha,BASE_CLASS_REMOVAL_SHA);assert.equal(target.raw,selected.raw_commit);assert.equal(target.tree,selected.tree);assert.deepEqual(target.parents,[parent.sha]);assert.deepEqual(target.parents,selected.parents);
 assert.equal(tag.tag,'16.2.14');assert.equal(tag.commit.sha,'df60e733c60e572ba538f6ad0ceff3e63e527b53');
 const trees=new Map();for(const item of original.tree_objects){
  assert.equal(trees.has(item.sha),false);const raw=Buffer.from(item.raw_base64,'base64');assert.equal(hash(raw),item.sha256);assert.equal(gitHash('tree',raw),item.sha);
  const entries=new Map();let at=0;while(at<raw.length){const space=raw.indexOf(32,at),end=raw.indexOf(0,space+1);assert.ok(space>at&&end>space&&end+21<=raw.length);const name=raw.subarray(space+1,end).toString();assert.ok(name&&!name.includes('/')&&!entries.has(name));entries.set(name,{mode:raw.subarray(at,space).toString(),sha:raw.subarray(end+1,end+21).toString('hex')});at=end+21;}trees.set(item.sha,entries);
 }
 function tree(sha){assert.ok(trees.has(sha),'missing authenticated original tree '+sha);return trees.get(sha);}
 function lookup(commit,path){let current=commit.tree,value;const parts=path.split('/');assert.ok(parts.every(p=>p&&p!=='.'&&p!=='..'));for(const[i,name]of parts.entries()){value=tree(current).get(name);if(!value)return null;if(i<parts.length-1){assert.equal(value.mode,'40000');current=value.sha;}}return value;}
 function delta(a,b,prefix=''){
  if(a===b)return[];const before=a?tree(a):new Map(),after=b?tree(b):new Map(),rows=[];
  for(const name of [...new Set([...before.keys(),...after.keys()])].sort()){
   const x=before.get(name),y=after.get(name);if(x?.sha===y?.sha&&x?.mode===y?.mode)continue;
   if(x?.mode==='40000'||y?.mode==='40000'){assert.ok(!x||x.mode==='40000');assert.ok(!y||y.mode==='40000');rows.push(...delta(x?.sha,y?.sha,prefix+name+'/'));}
   else rows.push({path:prefix+name,status:x&&y?'M':y?'A':'D',before_mode:x?.mode??'000000',after_mode:y?.mode??'000000',before_blob:x?.sha??'0'.repeat(40),after_blob:y?.sha??'0'.repeat(40)});
  }return rows;
 }
 const changed=delta(parent.tree,target.tree);assert.deepEqual(changed,selected.complete_changed_files);assert.deepEqual(changed,original.complete_changed_files);assert.equal(changed.length,72);assert.ok(changed.every(row=>row.status==='M'&&row.before_mode==='100644'&&row.after_mode==='100644'));
 assert.equal(changed.filter(row=>row.path.startsWith('src/')).length,47);assert.equal(changed.filter(row=>row.path.startsWith('tools/public_api_guard/')).length,25);
 assert.equal(original.sections.length,72);assert.equal(original.sections.map(row=>row.patch).join(''),original.diff);assert.equal(hash(original.diff),PATCH);assert.equal(original.diff_sha256,PATCH);
 const blobs=new Map(),hunkIndex=[],files=[];
 function blob(member,commit){assert.equal(Buffer.byteLength(member.body),member.bytes);assert.equal(hash(member.body),member.sha256);assert.equal(gitHash('blob',member.body),member.blob);assert.deepEqual(lookup(commit,member.path),{mode:'100644',sha:member.blob});if(blobs.has(member.blob))assert.equal(blobs.get(member.blob).body,member.body);else blobs.set(member.blob,member);}
 for(const[i,section]of original.sections.entries()){
  const identity=Object.fromEntries(Object.keys(changed[i]).map(key=>[key,section[key]]));assert.deepEqual(identity,changed[i]);
  assert.equal(section.before.path,section.path);assert.equal(section.after.path,section.path);blob(section.before,parent);blob(section.after,target);
  assert.equal(section.before.blob,section.before_blob);assert.equal(section.after.blob,section.after_blob);assert.equal(hash(section.patch),section.patch_sha256);
  const header='diff --git a/'+section.path+' b/'+section.path+'\nindex '+section.before_blob+'..'+section.after_blob+' 100644\n--- a/'+section.path+'\n+++ b/'+section.path+'\n';assert.ok(section.patch.startsWith(header));
  const starts=[...section.patch.matchAll(/^@@ .*$/gm)],before=section.before.body.split('\n'),output=[];assert.equal(before.pop(),'');assert.equal(starts.length,section.hunks.length);let cursor=0;
  for(const[index,start]of starts.entries()){
   const text=section.patch.slice(start.index,starts[index+1]?.index??section.patch.length),lines=text.split('\n');assert.equal(lines.pop(),'');const title=lines.shift(),range=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: .*)?$/.exec(title);assert.ok(range);
   const oldCount=Number(range[2]??1),newCount=Number(range[4]??1),oldStart=Number(range[1])-(oldCount?1:0),newStart=Number(range[3])-(newCount?1:0);assert.ok(oldStart>=cursor&&oldStart<=before.length);output.push(...before.slice(cursor,oldStart));cursor=oldStart;assert.equal(output.length,newStart);let old=0,next=0;
   for(const line of lines){assert.ok([' ','-','+'].includes(line[0]));if(line[0]!=='+'){assert.equal(before[cursor++],line.slice(1));old++;}if(line[0]!=='-'){output.push(line.slice(1));next++;}}
   assert.equal(old,oldCount);assert.equal(next,newCount);assert.deepEqual(section.hunks[index],{index:index+1,header:title,text,sha256:hash(text)});hunkIndex.push({path:section.path,index:index+1,header:title,sha256:hash(text)});
  }output.push(...before.slice(cursor));assert.equal(output.join('\n')+'\n',section.after.body);files.push({path:section.path,original_hunks:section.hunks.length,before_blob:section.before_blob,after_blob:section.after_blob,patch_sha256:section.patch_sha256});
 }
 assert.equal(hunkIndex.length,329);assert.equal(tag.members.length,143);assert.equal(new Set(tag.members.map(m=>m.path)).size,143);for(const member of tag.members)blob(member,tag.commit);
 const expectedTagPaths=[];for(const row of changed){expectedTagPaths.push(row.path);const parts=row.path.split('/');let legacy;if(row.path.startsWith('src/material/')){parts[2]='legacy-'+parts[2];legacy=parts.join('/');}else legacy=row.path.replace('tools/public_api_guard/material/','tools/public_api_guard/material/legacy-');if(lookup(tag.commit,legacy))expectedTagPaths.push(legacy);else assert.equal(legacy,'src/material/legacy-snack-bar/snack-bar-ref.ts');}
 assert.deepEqual([...new Set(expectedTagPaths)].sort(),tag.members.map(m=>m.path).sort());assert.deepEqual(tag.absent_legacy_counterparts,['src/material/legacy-snack-bar/snack-bar-ref.ts']);assert.equal(lookup(tag.commit,tag.absent_legacy_counterparts[0]),null);assert.equal(blobs.size,219);assert.equal(trees.size,118);
 assert.deepEqual(original.capture_policy,{shared_cache_modified:false,lazy_fetch:false,Git_replace_objects:false,anonymous_raw_HTTPS_requests:79,credentials_used:false,isolated_object_storage:true,upstream_code_executed:false});assert.equal(original.anonymous_blob_receipts.length,79);assert.equal(new Set(original.anonymous_blob_receipts.map(row=>row.blob)).size,79);
 const commits=new Map([target,parent,tag.commit].map(c=>[c.sha,c]));for(const receipt of original.anonymous_blob_receipts){
  const commit=commits.get(receipt.commit);assert.ok(commit);assert.deepEqual(lookup(commit,receipt.path),{mode:'100644',sha:receipt.blob});const known=blobs.get(receipt.blob);assert.ok(known);assert.equal(receipt.sha256,known.sha256);assert.equal(receipt.bytes,known.bytes);assert.equal(receipt.authenticated_Git_blob,true);assert.equal(receipt.credentials_used,false);assert.equal(receipt.url,'https://raw.githubusercontent.com/angular/components/'+receipt.commit+'/'+receipt.path);
 }
 assert.equal(original.original_source_review_complete,false);assert.equal(original.canonical_decisions_changed,0);assert.equal(original.product_changes,0);assert.equal(original.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(original.g11_claim,'not-passed');
 return {original_files_authenticated:72,original_source_files:47,original_API_golden_files:25,original_hunks_replayed:329,exact_complete_patch_replays:72,original_before_after_blobs:144,tagged_reference_members:143,unique_authenticated_blobs:219,authenticated_tree_objects:118,anonymous_authenticated_blob_receipts:79,absent_tagged_legacy_counterpart:tag.absent_legacy_counterparts[0],files,hunk_index:hunkIndex};
}

export function inspectBaseClassRemovalOriginal({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const bound=new Map(),member=ref=>{const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed base original input '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;};
 member({path:SELF,sha256:hash(image),bytes:image.length});const original=JSON.parse(gunzipSync(member(ORIGINAL))),census=JSON.parse(gunzipSync(member(CENSUS))),facts=verifyBaseClassRemovalOriginal(original,census);
 const worksheet=JSON.parse(member(WORKSHEET));for(const key of ['protected_ledger','protected_registry','protected_roster','prior_source_admission'])member(worksheet[key]);
 const assertCurrent=()=>{for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late base original input '+ref.path);assert.equal(raw.length,ref.bytes);}};
 assertCurrent();return {original,report:{schema_version:1,line:'21.x',sha:BASE_CLASS_REMOVAL_SHA,role:'Complete authenticated original data;individual substantive applicability review remains open',originals:ORIGINAL,source_census:CENSUS,...facts,source_bindings:structuredClone([...bound.values()]),substantive_current_source_review_complete:false,canonical_decisions_changed:0,product_changes:0,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'},bound:structuredClone([...bound.values()]),assertCurrent};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);const result=inspectBaseClassRemovalOriginal();result.assertCurrent();writeFileSync(process.argv[2],JSON.stringify(result.report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'original-data-qualified',original_files:72,original_hunks:329,substantive_source_review_complete:false,canonical_decisions_changed:0}));
}
