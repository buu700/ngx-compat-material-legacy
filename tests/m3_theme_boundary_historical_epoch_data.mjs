/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Immutable historical JSON/program DATA; current pure metadata predicates only. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import title from '../scripts/upstream-dialog-title-admission.cjs';
import theming from '../scripts/upstream-theming-inspection-admission.cjs';
const LEDGER='compatibility/f10/disposition-ledger/ledger.json';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const refs=[
 {subject:'6e54c9a1c3dad72f65b048f8f19cb7faa18729dc:'+LEDGER,sha256:'ad496e9e699918951057987997121de26e0e66a2c92940316658ae01a49df49a',bytes:4042882,git_blob:'d5950273ea47f8f28a7d6a0358a49dc60a686870'},
 {subject:'24365f67b82cc9fe26cd5089384c5d27ce7f4ab2:'+LEDGER,sha256:'f0aa2808e6bf022e9901b6edc249e1b08e7be9b7af06af4f154131e4a54c9cee',bytes:4183477,git_blob:'cf4b9454e123895d406224a0361de0bb7f7b0462'},
 {subject:'24365f67b82cc9fe26cd5089384c5d27ce7f4ab2:tests/m3_theme_boundary_admission_probe.mjs',sha256:'55ef0497cebd401db4e24997f4653570e972636fb36235d43eb7cedbf61db9fe',bytes:14195,git_blob:'0dc9d4a4561f1faa85d9f0e23481d36cca52aa63'},
];
export function historicalM3EpochData({root=process.cwd(),env=process.env}={}){
 const output=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','cat-file','--batch'],
  {cwd:root,env,input:refs.map(ref=>ref.subject+'\n').join(''),maxBuffer:12*1024*1024});
 let offset=0;const images=refs.map(ref=>{
  const end=output.indexOf(10,offset);assert.ok(end>=offset);const header=output.subarray(offset,end).toString();
  assert.equal(header,ref.git_blob+' blob '+ref.bytes);offset=end+1;
  const raw=Buffer.from(output.subarray(offset,offset+ref.bytes));offset+=ref.bytes;
  assert.equal(output[offset++],10);assert.equal(raw.length,ref.bytes);assert.equal(hash(raw),ref.sha256);return raw;
 });assert.equal(offset,output.length);
 const [before,after,oldProgram]=images,old35=JSON.parse(before),old88=JSON.parse(after);
 // The program is provenance DATA, never evaluated, imported or normalized.
 assert.equal(oldProgram.toString().split('assert.equal(current.individual_decisions_applied,88);').length,2);
 assert.equal(old35.closed_dispositions,371);assert.equal(old88.closed_dispositions,424);
 function json(path,digest){const raw=readFileSync(join(root,path));assert.equal(hash(raw),digest);return JSON.parse(raw);}
 const titleBody=json(title.TITLE_REVIEW,'794ffdc1bdfc7d2d234ee2ff46a591f74c471b38dee40343a551d9354f9cb4c3');
 const themingBody=json(theming.THEMING_REVIEW,'6511bbe44548be85398ffb0e2f86885a79fc714d17ad3aeb2cdb605963410bd4');
 const packet=json('compatibility/rc/21x-c04-dialog-title-replacement-canonical-admitted-transition.json','87ac44ebc3d8c8fcf082803ecf4f6deac68b62ef349ce0d95c037dbb85e9cbea');
 function accepted(data,api,body,shas){return shas.filter(sha=>{
  const rows=data.entries.filter(row=>row.sha===sha);assert.equal(rows.length,1);const entry=rows[0];
  return api.metadataOk({entry,body,review:body.reviews.find(row=>row.sha===sha),proof:entry.individual_proof});
 }).length;}
 const priorTitle=accepted(old35,title,titleBody,[title.TITLE_SHA]),priorTheming=accepted(old35,theming,themingBody,theming.THEMING_SHAS);
 assert.equal(priorTitle,0);assert.equal(priorTheming,0);
 assert.equal(accepted(old88,title,titleBody,[title.TITLE_SHA]),1);assert.equal(accepted(old88,theming,themingBody,theming.THEMING_SHAS),2);
 const path='scripts/upstream-historical-behavior-evidence.mjs',beforeHash='2e3d0d372775457655239efabd3769ca3b8bd1e0de42333bd48f9926bf1c3044',afterHash='8efdc7640a20c9c6b163c3e93b664d4b4384979fb0c23304b8d3f4fad02570c1';
 function nativeMembers(data){return data.entries.flatMap(row=>(row.individual_proof?.historical_behavior?.source_members??[]).flatMap((ref,index)=>ref.path===path?[{sha:row.sha,source_member_index:index}]:[]));}
 assert.equal(packet.metadata_selection.length,14);assert.equal(new Set(packet.metadata_selection.map(row=>row.sha+':'+row.source_member_index)).size,14);
 assert.deepEqual(nativeMembers(old35),packet.metadata_selection);assert.deepEqual(nativeMembers(old88),packet.metadata_selection);
 let priorNative=0,afterNative=0;
 for(const selected of packet.metadata_selection){
  const member=data=>data.entries.find(row=>row.sha===selected.sha).individual_proof.historical_behavior.source_members[selected.source_member_index];
  assert.deepEqual(member(old35),{path,sha256:beforeHash});assert.deepEqual(member(old88),{path,sha256:afterHash});
  priorNative+=Number(member(old35).sha256===afterHash);afterNative+=Number(member(old88).sha256===afterHash);
 }assert.equal(priorNative,0);assert.equal(afterNative,14);
 return {before,report:{historical_title_metadata_admissions:priorTitle,historical_theming_metadata_admissions:priorTheming,
  historical_title_native_after_references:priorNative,historical_native_reference_selection:14,historical_native_after_positive_references:afterNative,
  historical_metadata_positive_cases:3,historical_pre_terminal_source_admissions:88,
  historical_json_and_program_authenticated_as_Git_DATA:true,historical_program_executed:false,historical_refs:structuredClone(refs)}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of Object.keys(env))if(key.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(key))delete env[key];
 console.log(JSON.stringify(historicalM3EpochData({env}).report));
}
