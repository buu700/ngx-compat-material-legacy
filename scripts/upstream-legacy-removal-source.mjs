/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Complete original-object authentication only; substantive review is separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {gunzipSync,inflateSync} from 'node:zlib';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SHA='f7e3ae3bd1b86d5987df57bb06d350001c592931',TAG='df60e733c60e572ba538f6ad0ceff3e63e527b53';
const SOURCE={path:'compatibility/rc/21x-legacy-removal-source-originals.json.gz',sha256:'2d7f5c44b2343e64267b8881714e98c2fe14b31e61dd39609b20c7e0ee5ccd85'};
const CENSUS={path:'compatibility/rc/upstream-complete-patch-census.json.gz',sha256:'806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'};
const SELF='scripts/upstream-legacy-removal-source.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const hash=raw=>createHash('sha256').update(raw).digest('hex'),git=(kind,raw)=>createHash('sha1').update(kind+' '+raw.length+'\0').update(raw).digest('hex');
const zero='0'.repeat(40),lines=text=>text.match(/[^\n]*\n|[^\n]+$/g)??[];
function binaryLiterals(patch){
 const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~';assert.equal(alphabet.length,85);
 const blocks=[...patch.matchAll(/literal (\d+)\n((?:[^\n]+\n)+)\n/g)];assert.equal(blocks.length,2);
 return blocks.map(match=>{
  const chunks=[];
  for(const line of match[2].trimEnd().split('\n')){
   const first=line.charCodeAt(0),count=first>=65&&first<=90?first-64:first>=97&&first<=122?first-70:0;
   assert.ok(count>=1&&count<=52);assert.equal(line.length-1,Math.ceil(count/4)*5);const decoded=Buffer.alloc(Math.ceil(count/4)*4);
   for(let start=1,at=0;start<line.length;start+=5,at+=4){let value=0;for(const char of line.slice(start,start+5)){const digit=alphabet.indexOf(char);assert.ok(digit>=0);value=value*85+digit;}assert.ok(value<=0xffffffff);decoded.writeUInt32BE(value,at);}
   assert.ok(decoded.subarray(count).every(value=>value===0));chunks.push(decoded.subarray(0,count));
  }
  const raw=inflateSync(Buffer.concat(chunks),{maxOutputLength:2*1024*1024});assert.equal(raw.length,Number(match[1]));return raw;
 });
}
/** Apply only parsed unified text data, with independently checked coordinates. */
function replayText(before,patch){
 const original=lines(before),out=[];let cursor=0;
 for(const text of patch.split(/(?=^@@ )/m).slice(1)){
  const rows=lines(text),header=rows.shift().trimEnd().match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);assert.ok(header);
  const oldCount=header[2]===undefined?1:Number(header[2]),newCount=header[4]===undefined?1:Number(header[4]);
  const at=Number(header[1])-(oldCount?1:0),newAt=Number(header[3])-(newCount?1:0),old=[],next=[];let previous=null;
  for(const row of rows){
   if(row.startsWith('\\')){assert.equal(row.trimEnd(),'\\ No newline at end of file');assert.ok(previous);for(const list of previous===' '?[old,next]:previous==='-'?[old]:[next]){assert.ok(list.at(-1).endsWith('\n'));list[list.length-1]=list.at(-1).slice(0,-1);}continue;}
   assert.ok([' ','-','+'].includes(row[0]));previous=row[0];if(previous!=='+')old.push(row.slice(1));if(previous!=='-')next.push(row.slice(1));
  }
  assert.equal(old.length,oldCount);assert.equal(next.length,newCount);assert.ok(at>=cursor);out.push(...original.slice(cursor,at));assert.equal(out.length,newAt);
  assert.equal(original.slice(at,at+oldCount).join(''),old.join(''));out.push(...next);cursor=at+oldCount;
 }
 out.push(...original.slice(cursor));return out.join('');
}
export function authenticateLegacyRemovalOriginals(capsule,census){
 assert.equal(capsule.line,'21.x');assert.equal(capsule.canonical_decisions_changed,0);assert.equal(capsule.product_changes,0);assert.equal(capsule.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(capsule.g11_claim,'not-passed');
 assert.deepEqual(capsule.capture_policy,{existing_cache_only:true,lazy_fetch:false,Git_replace_objects:false,shared_cache_modified:false,network_fetches:0,upstream_code_executed:false,credentials_used:false});
 const commits=[capsule.original_commit,capsule.parent_commit,capsule.tagged_reference.commit];
 for(const commit of commits){const raw=Buffer.from(commit.raw_commit);assert.equal(git('commit',raw),commit.sha);assert.equal(hash(raw),commit.sha256);const head=commit.raw_commit.split('\n\n',1)[0].split('\n');assert.deepEqual(head.filter(row=>row.startsWith('tree ')).map(row=>row.slice(5)),[commit.tree]);assert.deepEqual(head.filter(row=>row.startsWith('parent ')).map(row=>row.slice(7)),commit.parents);}
 assert.equal(commits[0].sha,SHA);assert.deepEqual(commits[0].parents,[commits[1].sha]);assert.equal(commits[2].sha,TAG);assert.equal(capsule.tagged_reference.tag,'16.2.14');
 const row=census.commits.find(row=>row.sha===SHA);assert.ok(row);assert.equal(row.raw_commit,commits[0].raw_commit);assert.equal(row.tree,commits[0].tree);assert.deepEqual(row.parents,commits[0].parents);
 const trees=new Map(),used=new Set();assert.equal(capsule.tree_objects.length,217);
 for(const item of capsule.tree_objects){
  assert.ok(!trees.has(item.sha));const raw=Buffer.from(item.raw_base64,'base64');assert.equal(raw.toString('base64'),item.raw_base64);assert.equal(hash(raw),item.sha256);assert.equal(git('tree',raw),item.sha);const entries=new Map();let at=0;
  while(at<raw.length){const space=raw.indexOf(32,at),end=raw.indexOf(0,space+1);assert.ok(space>at&&end>space);assert.ok(end+21<=raw.length);const mode=raw.subarray(at,space).toString(),name=raw.subarray(space+1,end).toString();assert.ok(name&&!['.','..'].includes(name)&&!name.includes('/')&&!entries.has(name));assert.ok(['40000','100644','100755','120000','160000'].includes(mode));entries.set(name,{mode,sha:raw.subarray(end+1,end+21).toString('hex')});at=end+21;}
  assert.equal(at,raw.length);trees.set(item.sha,entries);
 }
 const tree=id=>{assert.ok(trees.has(id),'missing authenticated tree '+id);used.add(id);return trees.get(id);};
 const lookup=(commit,path)=>{const parts=path.split('/');assert.ok(parts.length&&parts.every(part=>part&&!['.','..','.git'].includes(part)));let current=commit.tree;for(const[index,part]of parts.entries()){const found=tree(current).get(part);if(!found)return null;if(index===parts.length-1)return found;assert.equal(found.mode,'40000');current=found.sha;}assert.fail();};
 // Derive the full changed-file population from the authenticated trees.
 // The filtered inventory and even the producer's section list are not scope.
 const changed=[];
 function delta(beforeId,afterId,prefix=''){
  if(beforeId===afterId)return;const before=beforeId?tree(beforeId):new Map(),after=afterId?tree(afterId):new Map();
  for(const name of [...new Set([...before.keys(),...after.keys()])].sort()){
   const a=before.get(name),b=after.get(name),path=prefix+name;if(a?.sha===b?.sha&&a?.mode===b?.mode)continue;
   if(a?.mode==='40000'||b?.mode==='40000'){assert.ok(!a||a.mode==='40000');assert.ok(!b||b.mode==='40000');delta(a?.sha,b?.sha,path+'/');continue;}
   assert.ok(!a||a.mode==='100644');assert.ok(!b||b.mode==='100644');changed.push({path,status:!a?'A':!b?'D':'M',before_mode:a?.mode??'000000',after_mode:b?.mode??'000000',before_blob:a?.sha??zero,after_blob:b?.sha??zero});
  }
 }
 delta(commits[1].tree,commits[0].tree);changed.sort((a,b)=>Buffer.compare(Buffer.from(a.path),Buffer.from(b.path)));assert.equal(changed.length,746);assert.deepEqual(changed,row.complete_changed_files);assert.equal(row.complete_changed_file_count,746);
 function payload(member,commit,path,expected){
  assert.equal(member.path,path);assert.equal(member.blob,expected);const entry=lookup(commit,path);
  const raw=member.encoding==='utf8'?Buffer.from(member.body):member.encoding==='base64'?Buffer.from(member.body,'base64'):null;assert.ok(raw);if(member.encoding==='base64')assert.equal(raw.toString('base64'),member.body);
  assert.equal(raw.length,member.bytes);assert.equal(hash(raw),member.sha256);
  if(expected===zero){assert.equal(entry,null);assert.equal(member.absent,true);assert.equal(raw.length,0);}else{assert.deepEqual(entry,{mode:'100644',sha:expected});assert.notEqual(member.absent,true);assert.equal(git('blob',raw),expected);}
  return raw;
 }
 assert.equal(capsule.sections.length,746);const parts=capsule.diff.split(/(?=^diff --git )/m).filter(Boolean);assert.equal(parts.length,746);assert.equal(hash(capsule.diff),capsule.diff_sha256);let hunks=0,binary=0,empty=0;const statuses={};
 for(const[index,section]of capsule.sections.entries()){
  const expected=changed[index];for(const key of Object.keys(expected))assert.equal(section[key],expected[key]);const {path,status}=section;statuses[status]=(statuses[status]??0)+1;
  assert.equal(section.patch,parts[index]);assert.equal(hash(section.patch),section.patch_sha256);assert.ok(section.patch.startsWith('diff --git a/'+path+' b/'+path+'\n'));
  assert.ok(section.patch.includes('index '+section.before_blob+'..'+section.after_blob));if(status==='D')assert.ok(section.patch.includes('deleted file mode 100644\n'));
  const before=payload(section.before,commits[1],path,section.before_blob),after=payload(section.after,commits[0],path,section.after_blob),texts=section.patch.split(/(?=^@@ )/m).slice(1);
  assert.equal(section.hunks.length,texts.length);for(const[i,text]of texts.entries())assert.deepEqual(section.hunks[i],{index:i+1,header:text.split('\n')[0],text,sha256:hash(text)});
  if(path.endsWith('.png')){assert.equal(path,'src/material/legacy-tabs/Tabs Pagination.png');assert.equal(status,'D');assert.equal(texts.length,0);const literals=binaryLiterals(section.patch);assert.ok(literals[0].equals(after));assert.ok(literals[1].equals(before));assert.deepEqual(section.binary_literal_reconstruction,{forward_bytes:0,reverse_bytes:before.length,reverse_sha256:hash(before)});binary++;}
  else if(!texts.length){assert.equal(status,'D');assert.equal(before.length,0);assert.equal(after.length,0);assert.equal(section.empty_text_deletion,true);empty++;}
  else{assert.equal(section.before.encoding,'utf8');assert.equal(section.after.encoding,'utf8');assert.equal(replayText(before.toString(),section.patch),after.toString());hunks+=texts.length;}
 }
 assert.deepEqual(statuses,{M:44,D:702});assert.equal(hunks,797);assert.equal(binary,1);assert.equal(empty,1);assert.equal(capsule.original_files,746);assert.equal(capsule.original_text_hunks,hunks);assert.equal(capsule.binary_deletion_sections,binary);assert.deepEqual(capsule.status_occurrences,statuses);
 const tagged=capsule.tagged_reference.members;assert.equal(tagged.length,119);assert.equal(new Set(tagged.map(row=>row.path)).size,119);assert.deepEqual(tagged.map(row=>row.path),capsule.worksheet_at_capture.tag_source_paths);
 for(const member of tagged)payload(member,commits[2],member.path,member.blob);
 assert.equal(tagged.filter(row=>row.path.endsWith('/public-api.ts')).length,44);assert.equal(tagged.filter(row=>row.path.startsWith('tools/public_api_guard/material/legacy-')&&row.path.endsWith('.md')).length,44);
 assert.deepEqual([...used].sort(),[...trees.keys()].sort());
 return {schema_version:1,line:'21.x',sha:SHA,complete_original_files:746,original_text_hunks:hunks,modified_files:44,deleted_files:702,authenticated_binary_deletions:binary,authenticated_empty_text_deletions:empty,authenticated_tree_objects:trees.size,untouched_tagged_members:tagged.length,tagged_primary_testing_API_files:44,tagged_API_goldens:44,complete_changed_population_derived_from_tree_objects:true,all_text_hunks_replayed_to_exact_after_blobs:true,both_binary_literals_reconstructed:true,substantive_hunk_or_ownership_review_completed:false,canonical_decisions_changed:0,upstream_code_executed:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
export function inspectLegacyRemovalOriginals({root,read=path=>readEvidenceMember(root,path)}={}){
 const bound=new Map(),member=ref=>{const raw=read(ref.path);assert.ok(Buffer.isBuffer(raw));assert.ok(raw.equals(readEvidenceMember(root,ref.path)));if(ref.sha256)assert.equal(hash(raw),ref.sha256,'changed original source '+ref.path);bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;};
 const raw=member(SOURCE),censusRaw=member(CENSUS);member({path:SELF,sha256:hash(image)});
 const original=JSON.parse(gunzipSync(raw,{maxOutputLength:64*1024*1024})),census=JSON.parse(gunzipSync(censusRaw,{maxOutputLength:64*1024*1024})),facts=authenticateLegacyRemovalOriginals(original,census);
 const assertCurrent=()=>{for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late original source '+ref.path);assert.equal(raw.length,ref.bytes);assert.ok(raw.equals(readEvidenceMember(root,ref.path)));}};
 assertCurrent();return {bound:structuredClone([...bound.values()]),facts:structuredClone(facts),assertCurrent};
}
