/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Run on a disposable Git-backed copy; never mutate the working checkout. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tabsFiniteSourceSuccessor} from '../scripts/tabs-finite-source-successor.mjs';
import {baseClassRemovalCanonicalFrameSubject} from '../scripts/base-class-removal-owner-source.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p));
const packet='compatibility/rc/parent-base-admission-tabs-inspector-successor-v1.json';
const data=JSON.parse(read('compatibility/rc/parent-base-admission-tab-final-callback-current-helper-successor-v4.json')),finite=JSON.parse(read('compatibility/rc/parent-tabs-finite-source-successor-v1.json'));
const selector=tabsFiniteSourceSuccessor({root,line:'21.x',read});
for(const row of finite.branches['21.x'].transitions){
 assert.equal(selector.qualify(row.before).sha256,row.after.sha256);
 assert.throws(()=>selector.qualify({...row.before,sha256:'0'.repeat(64)}));
}
const frame=baseClassRemovalCanonicalFrameSubject({root,read});frame.assertCurrent();
assert.ok(frame.bound.some(ref=>ref.path===packet));
assert.equal(frame.inspectSourceFunctionSha256,data.inspect_source_function_sha256.after);
for(const path of [packet,'scripts/upstream-base-class-removal-admission.cjs','projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts']){
 const old=read(path);try{writeFileSync(join(root,path),Buffer.concat([old,Buffer.from('\n')]));
 assert.throws(()=>frame.assertCurrent());assert.throws(()=>baseClassRemovalCanonicalFrameSubject({root,read}));
 }finally{writeFileSync(join(root,path),old);}
 frame.assertCurrent();
}
let poison=false;const callback=p=>poison&&p===packet?Buffer.from('wrong'):read(p);
const subject=baseClassRemovalCanonicalFrameSubject({root,read:callback});poison=true;
assert.throws(()=>subject.assertCurrent());assert.throws(()=>baseClassRemovalCanonicalFrameSubject({root,read:callback}));
poison=false;subject.assertCurrent();
let mutate=false;const changing=p=>{const raw=read(p);if(mutate&&p===packet){mutate=false;writeFileSync(join(root,p),Buffer.concat([raw,Buffer.from('\n')]));}return raw;};
const guarded=baseClassRemovalCanonicalFrameSubject({root,read:changing});const before=read(packet);
try{mutate=true;assert.throws(()=>guarded.assertCurrent());}finally{writeFileSync(join(root,packet),before);}
guarded.assertCurrent();console.log('finite selector and actual frame controls pass');
