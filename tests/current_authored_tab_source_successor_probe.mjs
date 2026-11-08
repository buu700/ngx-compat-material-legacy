/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),{currentAuthoredTabSourceSuccessor:make}=await import(pathToFileURL(root+'/scripts/current-authored-tab-source-successor.mjs'));
const first=make({root}),targets=first.bound.map(ref=>ref.path),before={...first.before};
for(const target of targets){let bad=false;const read=path=>{const raw=readFileSync(root+'/'+path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};const live=make({root,read});bad=true;assert.throws(()=>live.assertCurrent(),undefined,'late '+target);assert.throws(()=>make({root,read}),undefined,'cold '+target);bad=false;live.assertCurrent();}
assert.throws(()=>first.qualify({...before,sha256:'0'.repeat(64)}));
assert.throws(()=>first.qualify({...before,bytes:before.bytes+1}));
let getterCalls=0;assert.throws(()=>first.qualify({get path(){getterCalls++;return before.path;},sha256:before.sha256}));assert.equal(getterCalls,0);
first.bound.length=0;first.before.sha256='0'.repeat(64);first.after.sha256='0'.repeat(64);assert.equal(first.qualify(before).sha256,'dede4ab944da8fee8881644e27c0b2224c70e4120246c54e99976c48084ab2a5');first.assertCurrent();
console.log(JSON.stringify({result:'pass',targets:targets.length,cold_rejections:targets.length,late_rejections:targets.length,recovery:targets.length,unknown_hash_rejected:true,wrong_length_rejected:true,accessor_not_invoked:true,public_metadata_isolated:true}));
