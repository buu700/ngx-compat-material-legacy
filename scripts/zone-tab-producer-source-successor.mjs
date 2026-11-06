/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Fresh synthetic tab producer controls; earlier execution stays historical. */
import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';import{readFileSync}from'node:fs';import{fileURLToPath}from'node:url';import{readCheckerOwnerMember}from'./checker-owner-source.mjs';
const SELF='scripts/zone-tab-producer-source-successor.mjs',OLD='compatibility/rc/remaining-native-admission-tab-repair-producer-controls.json',NEW='compatibility/rc/parent-zone-tab-producer-controls-v1.json',PRODUCER='scripts/native-motion-consumer.ts',TEST='tests/tab_completion_producer_probe.mjs';
const pins={'21.x':{commit:'1acdae0058291217be7121f228f48983ebb7889a',report:'59d44eda648f24e83dd012966cb943772412a01c2e951db7655868440bfe3ef5'},main:{commit:'0d681a13389565d2416b3485ab3278f4bde2e82e',report:'263ac9da78e90d0b82f76a63dfe2e3f059b28e079718534e42d47d333ccfc05f'}};
const image=readFileSync(fileURLToPath(import.meta.url)),hash=x=>createHash('sha256').update(x).digest('hex');
export function zoneTabProducerSourceSuccessor({root,read,line}){
 assert.ok(Object.hasOwn(pins,line));assert.equal(typeof read,'function');const p=pins[line],physical=path=>readCheckerOwnerMember(root,path),current=path=>{const before=physical(path),value=read(path);assert.ok(Buffer.isBuffer(value)&&value.equals(before),'nonphysical tab producer source '+path);assert.ok(before.equals(physical(path)),'tab producer source changed during callback '+path);return before;};
 const packagePath='projects/ngx-material-legacy/package.json',packageRaw=physical(packagePath),version=JSON.parse(packageRaw).version;assert.equal(version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null,line);assert.equal(hash(packageRaw),line==='21.x'?'757aa562a156f04ff55ef86bc2d886049a1fc78da2ead2c0f82112ca58d9c43d':'ba8ba4b6094c4b57b5a0bb322deb1fd01c43421690cbd4e686297d0550096c2c');
 assert.ok(physical(SELF).equals(image),'loaded tab producer helper changed');
 const refs=[{path:packagePath,sha256:hash(packageRaw),bytes:packageRaw.length},{path:SELF,sha256:hash(image),bytes:image.length},{path:OLD,sha256:'e2d96d2d159ba09bc3599cc8600d4e337e3b0640445f1ba9400b7f71b5f3884e'},{path:NEW,sha256:p.report},{path:PRODUCER,sha256:'0fc93c9a430012883c2a00e7b68dad359ed826d71fb091b344035263fd62deb5'},{path:TEST,sha256:'eb65f5c769c561f9ae61a755dcb7cdbd8c2e3e56d2d04ad8b7ee9bda8030814d'}];
 const sweep=()=>{for(const r of refs){const b=physical(r.path);assert.equal(hash(b),r.sha256,'changed physical tab producer source '+r.path);if(r.bytes!==undefined)assert.equal(b.length,r.bytes);}assert.ok(physical(SELF).equals(image),'changed loaded tab producer helper');};sweep();
 const old=JSON.parse(current(OLD)),fresh=JSON.parse(current(NEW));assert.equal(old.native_executed,false);assert.equal(fresh.native_executed,false);assert.equal(old.cases.length,29);assert.ok(old.cases.every(c=>c.result==='pass'));assert.deepEqual(fresh.cases,old.cases);assert.equal(fresh.method_sha256,old.method_sha256);assert.equal(fresh.origin_method_sha256,old.origin_method_sha256);assert.equal(fresh.source_sha256,hash(current(PRODUCER)));
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};for(const key of Object.keys(env))if(key.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(key))delete env[key];const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',p.commit+':'+PRODUCER],{cwd:root,env,maxBuffer:2*1024*1024});assert.equal(hash(before),old.source_sha256);
 const assertCurrent=()=>{sweep();for(const r of refs)assert.equal(hash(current(r.path)),r.sha256);sweep();};assertCurrent();return {bound:refs.map(r=>({...r,bytes:physical(r.path).length})),assertCurrent,assertPhysical:sweep,source_scope_only:true,actual_native_or_full_audit_qualified:false};
}
