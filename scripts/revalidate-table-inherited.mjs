/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {join,relative,resolve,sep} from 'node:path';
import {isDeepStrictEqual as eq} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {selectInheritedNativeProfile} from './inherited-native-profiles.mjs';
import {verifyArchive} from './overlay-inherited-archive.mjs';
import {captureToolchain} from './table-inherited-toolchain.mjs';
import {tablePinnedMembers} from './upstream-table-inherited-evidence.mjs';
import {verifyTableLiveBody} from './table-inherited-live-evidence.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),need=(v,m)=>{if(!v)throw Error(m)};
export function revalidateTable({root,runDir,record,binding,runId,invocation,library}){
 const prefix=`evidence/upstream-audit-disposition/${invocation}/`;need(typeof record?.path==='string'&&record.path.startsWith(prefix)&&/^table-live-[a-f0-9]{32}\.json$/.test(record.path.slice(prefix.length)),'invalid table live output path');
 const bytes=readEvidenceMember(runDir,record.path);need(bytes.length===record.bytes&&hash(bytes)===record.sha256,'table live bytes changed');const body=JSON.parse(bytes);need(record.path===prefix+`table-live-${body.nonce}.json`,'table nonce/path mismatch');
 const selected=selectInheritedNativeProfile(root);selected.check();const recordPath=selected.arch==='arm64'?'compatibility/rc/overlay-inherited-toolchain-main.json':'compatibility/rc/overlay-inherited-toolchain-main-x64-provisional.json';const toolBytes=readEvidenceMember(root,recordPath),profile={id:selected.id,browser_product:selected.browser_product,recordHash:hash(toolBytes)};
 const pins=tablePinnedMembers(),sourcePins=Object.fromEntries(pins.map(x=>[x.path,x.sha256]));const modes=verifyTableLiveBody(body,{binding,runId,invocation,library,profile,sourcePins});
 for(const {path,sha256} of pins){need(hash(readEvidenceMember(root,path))===sha256,'table source changed '+path);if(Object.hasOwn(body.source_before,path))need(body.source_before[path]===sha256,'table recorded source changed '+path)}
 need(eq(captureToolchain(root),JSON.parse(toolBytes).identity),'table compiler toolchain changed');
 const run=JSON.parse(readEvidenceMember(runDir,'run.json')),libs=run.artifacts?.filter(x=>x.id==='library');need(libs?.length===1&&libs[0].sha256===library.sha256&&libs[0].bytes===library.bytes,'wrong table library manifest');const archive=readEvidenceMember(runDir,libs[0].path);need(archive.length===library.bytes&&hash(archive)===library.sha256,'wrong table library bytes');
 const out=resolve(runDir,prefix),modules=realpathSync(join(root,'node_modules'))+sep;need(Array.isArray(body.bundle_inputs)&&body.bundle_inputs.length>0,'missing table bundle inputs');let stage;const seen=new Map();
 for(const x of body.bundle_inputs){need(x&&typeof x.path==='string'&&/^[a-f0-9]{64}$/.test(x.sha256)&&!seen.has(x.path),'bad table bundle input');const path=realpathSync(x.path);need(path===x.path&&hash(readFileSync(path))===x.sha256,'changed table bundle input');seen.set(path,x.sha256);if(path.startsWith(modules))continue;
  need(path.startsWith(out+sep),'table input outside stage');const rest=path.slice(out.length+1),part=rest.split(sep)[0];need(/^table-live-[A-Za-z0-9]+$/.test(part),'wrong table stage');const current=join(out,part);need(!stage||stage===current,'multiple table stages');stage=current;need(path.startsWith(join(stage,'package')+sep)||[join(stage,'out/main.js'),join(stage,'out/zoneful.js'),join(stage,'out/supplemental.js')].includes(path),'unexpected table stage input');
 }
 need(stage,'missing table stage');const catalog=JSON.parse(readEvidenceMember(root,'compatibility/rc/table-inherited-deps-main.json')).node_modules_graph;const actual=Object.fromEntries([...seen].filter(([p])=>p.startsWith(modules)).map(([p,h])=>[p.slice(modules.length),h]));need(eq(actual,catalog),'table dependency graph changed');
 need(body.mode_bundle_inputs&&eq(Object.keys(body.mode_bundle_inputs).sort(),['zoneful','zoneless']),'missing table mode input graphs');
 const bundleClaims=new Map();for(const mode of ['zoneless','zoneful']){const paths=body.mode_bundle_inputs[mode];need(Array.isArray(paths)&&paths.length>0&&new Set(paths).size===paths.length&&paths.every(p=>seen.has(p)),'bad mode input graph');const zone=paths.some(p=>/\/node_modules\/zone\.js\//.test(p));need(zone===(mode==='zoneful'),'wrong mode bundle inputs');need(paths.includes(join(stage,'out/main.js'))&&paths.includes(join(stage,'out/supplemental.js'))&&paths.includes(join(stage,'package/fesm2022/ngx-compat-material-legacy-legacy-table.mjs')),'missing table mode inputs');need(paths.includes(join(stage,'out/zoneful.js'))===(mode==='zoneful'),'wrong table mode entry');const bundle=join(stage,'dist',mode+'.js');const digest=body.modes[mode].bundle_sha256;need(realpathSync(bundle)===bundle&&hash(readFileSync(bundle))===digest,'table bundle changed');bundleClaims.set(bundle,digest);}
 need(new Set(Object.values(body.mode_bundle_inputs).flat()).size===seen.size,'uncovered table bundle inputs');const stageFiles=[...seen.keys()].filter(path=>path.startsWith(stage+sep));stageFiles.push(join(stage,'dist/zoneless.js'),join(stage,'dist/zoneful.js'));const validated_run_files=stageFiles.map(path=>{const bytes=readFileSync(path);if(bundleClaims.has(path))need(hash(bytes)===bundleClaims.get(path),'table bundle changed before snapshot');return {path:relative(runDir,path).split(sep).join('/'),sha256:hash(bytes),bytes:bytes.length}});verifyArchive(selected.python,join(runDir,libs[0].path),stage);for(const [path,digest] of seen)need(realpathSync(path)===path&&hash(readFileSync(path))===digest,'table bundle input changed during replay');for(const [path,digest] of bundleClaims)need(realpathSync(path)===path&&hash(readFileSync(path))===digest,'table bundle changed during replay');selected.check();need(eq(captureToolchain(root),JSON.parse(toolBytes).identity),'table toolchain changed during replay');return {ok:true,record,modes,nonce:body.nonce,validated_run_files};
}
if(process.argv[1]&&realpathSync(process.argv[1])===realpathSync(new URL(import.meta.url).pathname)){try{console.log(JSON.stringify(revalidateTable(JSON.parse(readFileSync(0,'utf8')))));}catch(error){console.error(String(error.message));process.exitCode=1;}}
