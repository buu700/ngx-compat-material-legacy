/** @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. Use of this source code is governed by the MIT license in LICENSE. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,realpathSync,lstatSync,unlinkSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,sep,dirname,basename,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {currentInventorySourceSubject as make} from '../scripts/current-inventory-source-subject.mjs';
const root=process.cwd(),physical=p=>readFileSync(resolve(root,p));
const realRoot=realpathSync(root),temporaryRoot=realpathSync(tmpdir()),sourceRoot=realpathSync(resolve(fileURLToPath(new URL('..',import.meta.url)))),parent=dirname(realRoot),nonce=process.env.INVENTORY_SOURCE_PROBE_NONCE,markerPath=join(realRoot,'.inventory-source-probe.json');
assert.equal(dirname(parent),temporaryRoot,'mutation probe requires a private temporary parent');assert.match(basename(parent),/^roster-seven-[a-zA-Z0-9_]+$/);assert.match(basename(realRoot),/^(?:[0-9]|1[0-6])$/);assert.notEqual(realRoot,sourceRoot);assert.match(nonce??'',/^[a-f0-9]{64}$/);for(const path of [parent,realRoot]){const st=lstatSync(path);assert.ok(st.isDirectory()&&!st.isSymbolicLink());assert.equal(st.mode&0o777,0o700);if(process.getuid)assert.equal(st.uid,process.getuid());}const markerStat=lstatSync(markerPath),gitDir=join(realRoot,'.git'),gitStat=lstatSync(gitDir);assert.ok(markerStat.isFile()&&!markerStat.isSymbolicLink()&&markerStat.nlink===1);assert.equal(markerStat.mode&0o777,0o600);assert.ok(gitStat.isDirectory()&&!gitStat.isSymbolicLink());if(process.getuid)assert.equal(markerStat.uid,process.getuid());const marker=JSON.parse(readFileSync(markerPath));assert.deepEqual(Object.keys(marker).sort(),['head','nonce','partition']);assert.equal(marker.nonce,nonce);assert.equal(marker.partition,Number(basename(realRoot)));assert.match(marker.head,/^[a-f0-9]{40}$/);const clean={};for(const [key,value] of Object.entries(process.env))if(!key.startsWith('GIT_')&&key!=='INVENTORY_SOURCE_PROBE_NONCE')clean[key]=value;clean.GIT_CONFIG_GLOBAL='/dev/null';clean.GIT_CONFIG_SYSTEM='/dev/null';clean.GIT_NO_REPLACE_OBJECTS='1';clean.GIT_NO_LAZY_FETCH='1';clean.GIT_TERMINAL_PROMPT='0';const gitArgs=['--git-dir',gitDir,'--work-tree',realRoot,'rev-parse'];assert.equal(execFileSync('git',[...gitArgs,'HEAD'],{cwd:root,env:clean,encoding:'utf8'}).trim(),marker.head);assert.equal(realpathSync(execFileSync('git',[...gitArgs,'--git-common-dir'],{cwd:root,env:clean,encoding:'utf8'}).trim()),gitDir);
const packetPath='compatibility/rc/current-inventory-f9-physical-owner-roster-successor-v1.json';
const packet=JSON.parse(physical(packetPath));
const subject=make({root});subject.assertCurrent();
assert.equal(packet.roster_transitions.length,24);
for(const row of [...packet.source_updates,...packet.metadata_updates,...packet.matrix_updates]){
 const old=execFileSync('git',['--no-replace-objects','show',row.source_parent+':'+row.path],{cwd:root,maxBuffer:16*1024*1024});
 assert.deepEqual(subject.comparisonBytes(row.before),old);
 const latest=subject.qualify(row.before);assert.equal(latest.sha256,subject.bound.find(x=>x.path===row.path).sha256);
}
const targets=[packetPath,packet.source_updates.at(-1).path,packet.support[0].path,packet.metadata_support[0].path,packet.roster_transitions.at(-1).after.path];
for(const p of targets){const path=resolve(root,p),st=lstatSync(path),raw=physical(p);assert.ok(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);try{writeFileSync(path,Buffer.concat([raw,Buffer.from(' ')]));assert.throws(()=>make({root}));assert.throws(()=>subject.assertCurrent());}finally{writeFileSync(path,raw)}subject.assertCurrent();}
let nested=false;assert.throws(()=>make({root,read:p=>{let b=physical(p);if(!nested){nested=true;try{make({root})}catch{}}return b}}),/reentr/);assert.ok(nested);subject.assertCurrent();
let armed=false,entered=false;const late=make({root,read:p=>{const b=physical(p);if(armed&&!entered){entered=true;try{make({root})}catch{}}return b}});armed=true;assert.throws(()=>late.assertCurrent(),/reentr/);armed=false;late.assertCurrent();
const missing=resolve(root,'projects/ngx-material-legacy/internal/common-module.ts');const finalPath=subject.bound.at(-1).path;let create=false;const deletion=make({root,read:p=>{const b=physical(p);if(create&&p===finalPath){mkdirSync(dirname(missing),{recursive:true});writeFileSync(missing,'unexpected')};return b}});try{create=true;assert.throws(()=>deletion.assertCurrent());}finally{create=false;try{unlinkSync(missing)}catch{}}deletion.assertCurrent();
const equals=Buffer.prototype.equals;let shadow=false;const forged=make({root,read:p=>{let b=physical(p);if(shadow&&p===finalPath){Buffer.prototype.equals=()=>true;return Buffer.from('forged')}return b}});try{shadow=true;assert.throws(()=>forged.assertCurrent());}finally{shadow=false;Buffer.prototype.equals=equals}forged.assertCurrent();
console.log(JSON.stringify({result:'pass',transitions:24,physical_mutations:targets.length,cross_reentry:true,late_retired_path:true,forged_equals:true}));
