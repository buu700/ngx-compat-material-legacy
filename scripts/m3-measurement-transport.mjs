/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two exact code images and 26 exact program transports; never a raw-execution reader. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const SOURCE=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PARENT='cd577db612745ea0a18a6b775b4e2f671b28b16c';
const PREFIX='compatibility/rc/21x-c04-m3-theme-boundary-';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export const M3_TRANSPORT_CODE=Object.freeze([
 {path:'scripts/measure-m3-theme-boundary-contracts.mjs',before:'d63bbed8c86ee32e3c94da6c4f5b9a9c536b2707b54b918362d9bade9dab9363',before_bytes:20993,after:'3c1cf48046eec53b9dcb1b9aabd538db664bcf3d8822ea10ebccb4037297d3df',after_bytes:21127},
 {path:'tests/m3_theme_boundary_source_probe.mjs',before:'7e2543a7e26d114a69ce6e1591311e3435ec60c81dcaf7c61b639bb441194857',before_bytes:4398,after:'c380adc93b76d0884a52bfc864a2ee8f7d048665df69ff45146b6be67aeb0855',after_bytes:4407},
]);
export const M3_PORTABLE_WITNESSES=Object.freeze({
 '21.x':{path:PREFIX+'measurement-portable-21x.json',sha256:'60192e2b78818f1fc704d519f7ceb1a83a56b9ee8926a89aa3a6df9b0eed073e',bytes:219303},
 main:{path:PREFIX+'measurement-portable-main.json',sha256:'bbb828a9466435ee9bfc55f3f751e73953d734732bcf029816c862cff9858da7',bytes:219497},
});
const historicalHashes={'21.x':'54320dd2343b30eb96e8ceca82bd72176949182967a078ac1d0354713e7a02df',main:'d321cbc8896265012bf97ad205e58c65e6520e3d84f68e848258e59a25003cd8'};
// These are original witness identities, never execution or filesystem destinations.
const captureRoots={'21.x':'/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy',main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'};
const originals=new Map();
function originalCode(ref){
 if(!originals.has(ref.path)){
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
  const bytes=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',PARENT+':'+ref.path],{cwd:SOURCE,env,maxBuffer:1024*1024});
  assert.equal(hash(bytes),ref.before);assert.equal(bytes.length,ref.before_bytes);originals.set(ref.path,bytes);
 }
 return Buffer.from(originals.get(ref.path));
}
/** Private old metadata view only. The caller keeps its raw reader unchanged. */
export function m3MeasurementSourceEpoch({read}){
 const before=new Map(M3_TRANSPORT_CODE.map(ref=>[ref.path,originalCode(ref)]));
 const currentRefs=M3_TRANSPORT_CODE.map(ref=>({path:ref.path,sha256:ref.after,bytes:ref.after_bytes}));
 const assertCurrent=()=>{for(const ref of currentRefs){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed M3 transport source '+ref.path);assert.equal(raw.length,ref.bytes);}};
 assertCurrent();
 const beforeRead=path=>{if(!before.has(path))return read(path);assertCurrent();return Buffer.from(before.get(path));};
 return {beforeRead,currentRefs,assertCurrent};
}
function warningRows(value){
 assert.deepEqual(value.historical_warning_and_density_cases.map(row=>row.case_id),['repeat','separate-ids','nested','ignored','legacy-color-config','changed-color']);
 const rows=value.historical_warning_and_density_cases.flatMap(row=>['owned','tagged16','original_before','original_after'].map(stage=>row[stage]));
 assert.deepEqual(value.original_versioned_M3_warning_change.map(row=>row.side),['before','after']);
 rows.push(...value.original_versioned_M3_warning_change);assert.equal(rows.length,26);return rows;
}
/** Every historical hash is reconstructed; no arbitrary field is ignored. */
export function historicalM3MeasurementView({portable,historical}){
 const line=portable.line;assert.ok(Object.hasOwn(M3_PORTABLE_WITNESSES,line));assert.equal(historical.line,line);
 assert.equal(hash(JSON.stringify(portable,null,2)+'\n'),M3_PORTABLE_WITNESSES[line].sha256,'unqualified portable witness');
 assert.equal(hash(JSON.stringify(historical,null,2)+'\n'),historicalHashes[line],'unqualified historical witness');
 const producer=M3_TRANSPORT_CODE[0];assert.deepEqual(portable.producer,{path:producer.path,sha256:producer.after,bytes:producer.after_bytes});
 assert.deepEqual(historical.producer,{path:producer.path,sha256:producer.before,bytes:producer.before_bytes});
 const view=structuredClone(portable),rows=warningRows(view),prior=warningRows(historical);
 const imports=[['legacy-model:typography','core/typography/_typography.scss'],['legacy-model:palette','core/theming/_palette.scss'],['legacy-model:density','core/density/private/_compatibility.scss']];
 for(let i=0;i<rows.length;i++){
  const row=rows[i],authored=row.authored_program;assert.equal(typeof authored,'string');assert.equal(hash(authored),row.program_sha256,'changed authored program');
  let transported=authored;
  for(const [id,path]of imports){const from="'"+id+"'",to="'"+pathToFileURL(join(captureRoots[line],'projects/ngx-material-legacy/styles',path)).href+"'";assert.equal(transported.split(from).length,2,'unexpected program import population');transported=transported.replace(from,to);}
  const digest=hash(transported);assert.equal(digest,prior[i].program_sha256,'historical program is not the exact three-import transport');
  row.program_sha256=digest;delete row.authored_program;
 }
 // The immutable producer reference belongs to this historical view only.
 view.producer={...historical.producer};assert.deepEqual(view,historical,'non-transport measurement difference');return view;
}
