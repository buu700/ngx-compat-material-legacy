/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {browserSurfaceSourceSuccessor} from '../scripts/browser-surface-source-successor.mjs';
import {readCheckerOwnerMember} from '../scripts/checker-owner-source.mjs';
import {inspectBrowserReferenceSource} from '../scripts/browser-reference-source.mjs';
const root=process.cwd(),mode=process.argv[2];assert.ok(['helper','subject'].includes(mode));
const read=path=>readCheckerOwnerMember(root,path),line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const packetPath='compatibility/rc/parent-browser-surface-finite-successor-v1.json';
const packet=JSON.parse(read(packetPath)),rows=packet.branches[line].transitions;
let poisoned=null;const callback=path=>path===poisoned?Buffer.from('nonphysical'):read(path);
const subject=mode==='helper'?browserSurfaceSourceSuccessor({root,read:callback,line}):inspectBrowserReferenceSource({root,read:callback});
subject.assertCurrent();
if(mode==='helper')for(const row of rows){assert.equal(subject.qualify(row.before).sha256,row.after.sha256);assert.equal(subject.qualify(row.after).sha256,row.after.sha256);assert.throws(()=>subject.qualify({...row.before,sha256:'0'.repeat(64)}));assert.throws(()=>subject.qualify({...row.before,bytes:row.before.bytes+1}));}
for(const path of [packetPath,...rows.map(row=>row.path)]){
 poisoned=path;assert.throws(()=>subject.assertCurrent());
 assert.throws(()=>mode==='helper'?browserSurfaceSourceSuccessor({root,read:callback,line}):inspectBrowserReferenceSource({root,read:callback}));
 poisoned=null;subject.assertCurrent();
 const original=read(path);try{writeFileSync(join(root,path),Buffer.concat([original,Buffer.from('\n')]));
  assert.throws(()=>subject.assertCurrent());assert.throws(()=>mode==='helper'?browserSurfaceSourceSuccessor({root,read:callback,line}):inspectBrowserReferenceSource({root,read:callback}));
 }finally{writeFileSync(join(root,path),original);}subject.assertCurrent();
}
let mutate=false;const changing=path=>{const original=read(path);if(mutate&&path===packetPath){mutate=false;writeFileSync(join(root,path),Buffer.concat([original,Buffer.from('\n')]));}return original;};
const guarded=mode==='helper'?browserSurfaceSourceSuccessor({root,read:changing,line}):inspectBrowserReferenceSource({root,read:changing});const old=read(packetPath);
try{mutate=true;assert.throws(()=>guarded.assertCurrent());}finally{writeFileSync(join(root,packetPath),old);}guarded.assertCurrent();
console.log(JSON.stringify({result:'pass',line,mode,unknown_reference_rejected:mode==='helper',physical_and_callback_controls:3,full_owner_or_native_qualified:false}));
