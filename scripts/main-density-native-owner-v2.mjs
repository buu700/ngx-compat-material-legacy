/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
/** Finite callback-free continuation owner; no Sass or artifact admission. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
const root=resolve(process.argv[2]);
const bound=new Map();
function physical(path){if(typeof path!=='string'||!path||path.startsWith('/')||path.includes('\\')||path.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('invalid path');let p=root;for(const bit of path.split('/')){p=join(p,bit);if(lstatSync(p).isSymbolicLink())throw Error('linked input')}if(!lstatSync(p).isFile())throw Error('not file');const raw=readFileSync(p),old=bound.get(path);if(old&&!raw.equals(old))throw Error('changed physical input');if(!old)bound.set(path,Buffer.from(raw));return raw;}
const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
const git=(commit,path)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env});
function finalRead(){for(const [path,raw] of bound)if(!physical(path).equals(raw))throw Error('changed final physical input');}
const sha=b=>createHash('sha256').update(b).digest('hex');
const densityV3={path:'compatibility/rc/current-main-density-input-successor-v3.json',sha256:'b0feea9a089fea3c671927c548f3c4d6b07923ee9f7574d17d0630fbc6444ffc',bytes:1667};
const densityContinuations=[{"path":"compatibility/rc/main-tooltip-resource-source-programs-v1.json","sha256":"b7c7ef0e2a3a7b0f8d471983751e87155b7880b61a097c5f9254cf17fa0ec211","bytes":15324,"role":"main-tooltip-resource-source-program-continuation","base_head":"8fe95564c981a9dd73605d27beaa0496824e8444"},{"path":"compatibility/rc/main-sass-graph-resource-source-programs-v2.json","sha256":"e5a02ae6f0f4532dbc550e9e8e436fce69b9592dd81eb06a28ed1e8a689f1a98","bytes":6928,"role":"main-sass-graph-resource-source-program-continuation","base_head":"ecc1051cfb829f0b67ba9cb50e4b733d6684ebff"},{"path":"compatibility/rc/main-sass-resource-contract-programs-v1.json","sha256":"e8db18d114f9a32c946caaf72b0f3ea1ed8377c3bba6b518f5162ab947673d2a","bytes":14946,"role":"main-sass-resource-contract-program-continuation","base_head":"ecc1051cfb829f0b67ba9cb50e4b733d6684ebff"}];
const densityPaths=["scripts/current-sass-source.mjs","scripts/current-sass-spinner-snack-contract.mjs","scripts/current_sass_source.py","scripts/current_sass_spinner_snack_admission.py"];
function checkedDensityContinuations(read){
 const bytes=read(densityV3.path);if(sha(bytes)!==densityV3.sha256||bytes.length!==densityV3.bytes)throw Error('density v3 packet');const v=JSON.parse(bytes);
 if(v.schema_version!==1||v.role!=='main-ordinary-density-resource-continuation'||v.line!=='main'||v.source_scope_only!==true||v.artifact_or_audit_admission_granted!==false||v.source_end_commit!=='b94f169d4fe57d571e6a7c3f911a9395f6a60c4d'||!isDeepStrictEqual(v.previous_packet,{path:'compatibility/rc/current-main-density-input-successor-v2.json',sha256:'e6e385dde92ed1cdcc65998bdb6c9433458ed275572e528973e67a195b8c545f',bytes:92667})||!isDeepStrictEqual(v.continuations,densityContinuations)||!isDeepStrictEqual(v.paths,densityPaths))throw Error('density v3 scope');
 return densityContinuations.map(r=>{const b=read(r.path);if(sha(b)!==r.sha256||b.length!==r.bytes)throw Error('density continuation packet');const p=JSON.parse(b);if(p.schema_version!==1||p.role!==r.role||p.base_head!==r.base_head||p.source_scope_only!==true||p.historical_programs_executed!==false||p.historical_packets_rewritten!==false||p.theme_module_contract_changed!==false||p.css_or_artifact_admission_granted!==false||p.g11_claim!=='not-passed')throw Error('density continuation scope');return p;});
}
function continueDensityInput(path,initial,initialRef,packets,git){
 let current=initial,expected=initialRef;
 for(const packet of packets){const rows=packet.updates.filter(r=>r.path===path);if(rows.length>1)throw Error('duplicate density continuation');if(!rows.length)continue;const row=rows[0];if(!isDeepStrictEqual(row.before,expected)||!git(packet.base_head,path).equals(current))throw Error('density continuation predecessor');let cursor=0;const parts=[];for(const e of row.edits){if(!isDeepStrictEqual(Object.keys(e).sort(),['after','before','offset'])||!Number.isSafeInteger(e.offset)||e.offset<cursor||e.offset>current.length)throw Error('density continuation edit');const before=Buffer.from(e.before);if(!current.subarray(e.offset,e.offset+before.length).equals(before))throw Error('density continuation literal');parts.push(current.subarray(cursor,e.offset),Buffer.from(e.after));cursor=e.offset+before.length;}current=Buffer.concat([...parts,current.subarray(cursor)]);expected=row.after;if(expected.path!==path||sha(current)!==expected.sha256||current.length!==expected.bytes)throw Error('density continuation afterimage');}
 if(!git('b94f169d4fe57d571e6a7c3f911a9395f6a60c4d',path).equals(current))throw Error('density continuation commit');return {current,expected};
}
function continueSelectDensityInput(path,initial,initialRef,read,git){
 const raw=read('compatibility/rc/current-main-density-input-successor-v2.json');if(sha(raw)!=='e6e385dde92ed1cdcc65998bdb6c9433458ed275572e528973e67a195b8c545f'||raw.length!==92667)throw Error('density v2 packet');const v=JSON.parse(raw);
 if(v.schema_version!==1||v.role!=='main-ordinary-density-current-source-successor'||v.line!=='main'||v.source_scope_only!==true||v.artifact_or_audit_admission_granted!==false||!isDeepStrictEqual(v.previous_packet,{path:'compatibility/rc/current-main-density-input-successor-v1.json',sha256:'d85c0dca28dbc166e3566eb3b173917c1524c68f5116a490826748ce4876ab2a',bytes:34446})||!isDeepStrictEqual(v.updates.map(x=>x.path),densityPaths))throw Error('density v2 scope');
 const rows=v.updates.filter(x=>x.path===path);if(rows.length!==1||!isDeepStrictEqual(rows[0].before,initialRef))throw Error('density v2 predecessor');let at=0,parts=[];for(const e of rows[0].edits){if(!isDeepStrictEqual(Object.keys(e).sort(),['after','before','offset'])||!Number.isSafeInteger(e.offset)||e.offset<at||e.offset>initial.length)throw Error('density v2 edit');const old=Buffer.from(e.before);if(!initial.subarray(e.offset,e.offset+old.length).equals(old))throw Error('density v2 literal');parts.push(initial.subarray(at,e.offset),Buffer.from(e.after));at=e.offset+old.length;}const next=Buffer.concat([...parts,initial.subarray(at)]),r=rows[0].after;if(r.path!==path||sha(next)!==r.sha256||next.length!==r.bytes||!git('19ee6343365c391deb97362caec413b113665e1b',path).equals(next))throw Error('density v2 afterimage');return continueDensityInput(path,next,r,checkedDensityContinuations(read),git);
}

const path=process.argv[3],initial=process.argv[4];
if(typeof path!=='string'||typeof initial!=='string')throw Error('bad request');
const v2=physical('compatibility/rc/current-main-density-input-successor-v2.json');if(sha(v2)!=='e6e385dde92ed1cdcc65998bdb6c9433458ed275572e528973e67a195b8c545f'||v2.length!==92667)throw Error('density v2 packet');const rows=JSON.parse(v2).updates.filter(r=>r.path===path);if(rows.length!==1)throw Error('density path');
const leaf=physical('scripts/main-sass-resource-continuation.mjs');if(sha(leaf)!=='e023340b48171bd0a865899969eacc35f6489a4a2c0b820dc4dce082b6f39c7c')throw Error('leaf source');
for(const commit of ['19ee6343365c391deb97362caec413b113665e1b','8fe95564c981a9dd73605d27beaa0496824e8444','ecc1051cfb829f0b67ba9cb50e4b733d6684ebff','b94f169d4fe57d571e6a7c3f911a9395f6a60c4d'])execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',commit,'HEAD'],{cwd:root,env});
const result=continueSelectDensityInput(path,Buffer.from(initial,'base64'),rows[0].before,physical,git);

// Authenticate an exact successor of the old b94 terminal image. Historical
// images remain comparison data; physical reads always observe actual files.
const successorPath='compatibility/rc/current-main-density-source-ae9-successor-v1.json';
const successorBytes=physical(successorPath);if(sha(successorBytes)!=='131257b8e6861e23d77aaf9a347bbccb4ad571a00039f98d8b4300fe91d52790'||successorBytes.length!==35487)throw Error('density current successor packet');
const successor=JSON.parse(successorBytes);
if(successor.schema_version!==1||successor.role!=='main-density-current-source-ae9-successor'||successor.source_scope_only!==true||successor.historical_programs_executed!==false||successor.historical_packets_rewritten!==false||successor.css_or_artifact_admission_granted!==false||successor.g11_claim!=='not-passed'||successor.base_commit!=='b94f169d4fe57d571e6a7c3f911a9395f6a60c4d'||successor.source_commit!=='48e2448cc5ce3e6c7b1d6b53a3681bca655f7cd1'||successor.source_parent!=='e819975bc28c4d3a7d05beb81f2eb1202448384f'||successor.spinner_commit!=='ae9e395e2fa36afcabfd9461ddf42bcff4d79071'||successor.spinner_parent!==successor.source_commit||!isDeepStrictEqual(successor.updates.map(x=>x.path),densityPaths))throw Error('density current successor scope');
const cmd=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env});
for(const [commit,parent] of [[successor.source_commit,successor.source_parent],[successor.spinner_commit,successor.spinner_parent]])if(cmd('rev-list','--parents','-n','1',commit).toString().trim()!==commit+' '+parent)throw Error('density current successor parent');
cmd('merge-base','--is-ancestor',successor.base_commit,successor.source_parent);cmd('merge-base','--is-ancestor',successor.spinner_commit,'HEAD');
const supportPaths=['compatibility/rc/current-main-sass-form-field-executable-source-v1.json','compatibility/rc/current-main-form-field-source-successor-v1.json','compatibility/rc/current-main-sass-core-animation-export-v1.json','compatibility/rc/current-main-sass-protected-product-v1.json'];
if(!isDeepStrictEqual(successor.support.map(x=>x.path),supportPaths))throw Error('density successor support');
for(const item of successor.support){const data=git(successor.spinner_commit,item.path);if(item.sha256!==sha(data)||item.bytes!==data.length||!physical(item.path).equals(data))throw Error('density successor support image');}
const row=successor.updates.find(x=>x.path===path);if(!row||!isDeepStrictEqual(row.before,result.expected)||!git(successor.base_commit,path).equals(result.current)||!git(row.parent,path).equals(result.current))throw Error('density successor before');
const isSource=path==='scripts/current-sass-source.mjs'||path==='scripts/current_sass_source.py';
if(row.commit!==(isSource?successor.source_commit:successor.spinner_commit)||row.parent!==(isSource?successor.source_parent:successor.spinner_parent))throw Error('density successor transition');
let at=0,parts=[];for(const edit of row.edits){if(!isDeepStrictEqual(Object.keys(edit).sort(),['after','before','offset'])||!Number.isSafeInteger(edit.offset)||edit.offset<at||edit.offset>result.current.length)throw Error('density successor edit');const old=Buffer.from(edit.before);if(!result.current.subarray(edit.offset,edit.offset+old.length).equals(old))throw Error('density successor literal');parts.push(result.current.subarray(at,edit.offset),Buffer.from(edit.after));at=edit.offset+old.length;}
const current=Buffer.concat([...parts,result.current.subarray(at)]);if(row.after.path!==path||sha(current)!==row.after.sha256||current.length!==row.after.bytes||!git(row.commit,path).equals(current)||!git(successor.spinner_commit,path).equals(current))throw Error('density successor after');
result.current=current;result.expected=row.after;
if(!physical(path).equals(result.current))throw Error('physical afterimage');finalRead();process.stdout.write('ok');
