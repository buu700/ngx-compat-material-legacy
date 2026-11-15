/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {dirname,join,resolve,sep} from 'node:path';
import {isDeepStrictEqual as eq} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {selectInheritedNativeProfile} from './inherited-native-profiles.mjs';
import {verifyArchive} from './overlay-inherited-archive.mjs';
import {captureToolchain} from './overlay-inherited-toolchain.mjs';
import {captureSass} from './datepicker-inherited-sass-toolchain.mjs';
import {fixturePins} from './datepicker-inherited-fixture-pins.mjs';
import {verifyDatepickerPeers} from './datepicker-inherited-peers.mjs';
import {verifyDatepickerLiveBody} from './datepicker-inherited-live-evidence.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),need=(v,m)=>{if(!v)throw Error(m)};
export function revalidateDatepicker({root,runDir,record,binding,runId,invocation,library}){
 const prefix=`evidence/upstream-audit-disposition/${invocation}/`;need(typeof record?.path==='string'&&record.path.startsWith(prefix)&&/^datepicker-live-[a-f0-9]{64}\.json$/.test(record.path.slice(prefix.length)),'invalid live output path');
 const bytes=readEvidenceMember(runDir,record.path);need(bytes.length===record.bytes&&hash(bytes)===record.sha256,'live bytes changed');const body=JSON.parse(bytes);
 need(record.path===prefix+`datepicker-live-${body.nonce}.json`,'nonce/path mismatch');
 const selected=selectInheritedNativeProfile(root);selected.check();const profile={id:selected.id,browser_product:selected.browser_product,recordHash:selected.arch==='arm64'?'ad74c81bd537a16a7324cd440ad3b36e9788030d21a0ad1bc1ab36772f26e503':'2e7c5d5b11cf001f06dcb8db6714d50e0bef440d63580a8ffa090760461f33f0'};
 const cases=verifyDatepickerLiveBody(body,{binding,runId,invocation,library,profile});const run=JSON.parse(readEvidenceMember(runDir,'run.json'));const libs=run.artifacts?.filter(x=>x.id==='library');need(libs?.length===1&&libs[0].sha256===library.sha256&&libs[0].bytes===library.bytes,'wrong library manifest');const archive=join(runDir,libs[0].path);const archiveBytes=readEvidenceMember(runDir,libs[0].path);need(archiveBytes.length===library.bytes&&hash(archiveBytes)===library.sha256,'wrong library bytes');
 const checkTools=()=>{const recordPath=selected.arch==='arm64'?'compatibility/rc/overlay-inherited-toolchain-main.json':'compatibility/rc/overlay-inherited-toolchain-main-x64-provisional.json';const tool=readEvidenceMember(root,recordPath),sass=readEvidenceMember(root,'compatibility/rc/datepicker-inherited-sass-toolchain-main.json');need(hash(tool)===profile.recordHash&&eq(captureToolchain(root),JSON.parse(tool).identity),'compiler toolchain changed');need(hash(sass)==='2202de22ddf427335e526d2bc17d8f058670f4450faf2b2f565e2160de8750dd'&&eq(captureSass(root),JSON.parse(sass)),'Sass toolchain changed');for(const [name,digest] of Object.entries(fixturePins))need(hash(readEvidenceMember(root,'tests/datepicker-inherited/'+name))===digest,'fixture bytes changed');selected.check();};
 checkTools();const peers=verifyDatepickerPeers(root);const out=resolve(runDir,prefix);let stage;
 for(const mode of ['zoneless','zoneful']){
  const rows=body.results[mode].bundle_inputs;let modeDir;for(const x of rows){need(x&&typeof x.path==='string'&&/^[a-f0-9]{64}$/.test(x.sha256),'bad input identity');const path=realpathSync(x.path);need(path===x.path&&hash(readFileSync(path))===x.sha256,'changed bundle input');
   const owner=Object.entries(peers).find(([,p])=>path.startsWith(p.path+sep));
   if(owner){need(x.owner===owner[0],'wrong peer owner');continue}
   need(x.owner===null&&path.startsWith(out+sep),'input outside owned stage');const marker=sep+'fixture'+sep+mode+sep;const index=path.indexOf(marker,out.length);need(index>out.length,'wrong fixture stage');const dir=path.slice(0,index)+marker.slice(0,-1);need(!modeDir||modeDir===dir,'multiple fixture directories');modeDir=dir;need(path===join(dir,'out/main.js')||path.startsWith(join(dir,'package')+sep),'unexpected fixture input');
  }
  need(modeDir,'missing owned package input');const currentStage=dirname(dirname(modeDir));need(!stage||currentStage===stage,'different fixture stages');stage=currentStage;
  for(const n of ['core','form-field','input'])need(rows.some(x=>x.path===join(modeDir,`package/fesm2022/ngx-compat-material-legacy-legacy-${n}.mjs`)),'missing packed legacy input');
  need(rows.some(x=>x.owner==='@angular/material'&&x.path.endsWith('/fesm2022/datepicker.mjs')),'missing Material datepicker input');verifyArchive(selected.python,archive,modeDir);
 }
 verifyArchive(selected.python,archive,stage);need(eq(verifyDatepickerPeers(root),peers),'peer changed during validation');checkTools();return {ok:true,record,cases,nonce:body.nonce};
}
if(process.argv[1]&&realpathSync(process.argv[1])===realpathSync(new URL(import.meta.url).pathname)){
 try{const args=JSON.parse(readFileSync(0,'utf8'));console.log(JSON.stringify(revalidateDatepicker(args)));}catch(error){console.error(String(error.message));process.exitCode=1;}
}
