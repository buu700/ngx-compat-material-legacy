/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {currentSassToolReferenceSubject} from '../scripts/current-sass-tool-references.mjs';
import {inventoryRcAcceptanceSourceSuccessor} from '../scripts/inventory-rc-acceptance-source-successor.mjs';
const root=process.argv[2], disk=p=>readFileSync(join(root,p));
const packet=JSON.parse(disk('compatibility/rc/parent-base-class-tool-successor-inputs-v4.json'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const source=currentSassToolReferenceSubject({root});
assert.equal(source.epoch,5);assert.equal(packet.updates.length,18);
for(const {path,before,after} of packet.updates){
 const current={path,...source.transitions.find(row=>row.path===path).after};
 assert.deepEqual(source.qualify(before),current);
 assert.deepEqual(source.qualify(after),current);
 assert.equal(hash(source.comparisonBytes(before)),before.sha256);
 assert.equal(hash(source.comparisonBytes(after)),after.sha256);
 assert.equal(source.qualify({...before,sha256:'0'.repeat(64)}),null);
 const target=join(root,path),saved=disk(path),old=source.comparisonBytes(before);
 try{writeFileSync(target,old);assert.throws(()=>source.assertCurrent());assert.throws(()=>currentSassToolReferenceSubject({root}));}
 finally{writeFileSync(target,saved);}
 let armed=false;
 const last=path;
 const live=currentSassToolReferenceSubject({root,read:p=>{const bytes=disk(p);if(armed&&p===last){armed=false;writeFileSync(target,old);}return bytes;}});
 try{armed=true;assert.throws(()=>live.assertCurrent(),/current tool changed during callback/);assert.equal(armed,false);}finally{writeFileSync(target,saved);}
}
for(const ref of [...packet.receipts,...JSON.parse(disk(packet.receipts[4].path)).sources,...JSON.parse(disk(packet.receipts[6].path)).sources]){
 const path=join(root,ref.path),saved=disk(ref.path);
 try{writeFileSync(path,Buffer.concat([saved,Buffer.from('\n')]));assert.throws(()=>source.assertCurrent());assert.throws(()=>currentSassToolReferenceSubject({root}));}finally{writeFileSync(path,saved);}
}
// Directly verify the RC owner's V2 packet and reject changes to its bound sources.
const rc=inventoryRcAcceptanceSourceSuccessor({root,read:disk});
const rcPacket=JSON.parse(disk('compatibility/rc/parent-inventory-rc-acceptance-finite-successor-v2.json'));
assert.deepEqual(rc.qualify(rcPacket.before),rcPacket.after);assert.deepEqual(rc.qualify(rcPacket.after),rcPacket.after);
assert.throws(()=>rc.qualify({...rcPacket.before,sha256:'0'.repeat(64)}),/unknown inventory rc source reference/);
for(const ref of [packet.receipts.at(-1),...rcPacket.receipts]){
 const path=join(root,ref.path),saved=disk(ref.path);
 try{writeFileSync(path,Buffer.concat([saved,Buffer.from('\n')]));assert.throws(()=>rc.assertCurrent(),/changed physical inventory rc successor/);}
 finally{writeFileSync(path,saved);}
}
rc.assertCurrent();
// Exercise public operations with exact V4 metadata, without evaluating getters or proxies.
const ref=packet.updates[0].before, after={path:ref.path,...source.transitions.find(row=>row.path===ref.path).after};
assert.deepEqual(source.referenceBatch([{kind:'qualify',reference:ref},{kind:'comparison',reference:ref}]),[after,source.comparisonBytes(ref)]);
assert.throws(()=>source.referenceBatch([{kind:'comparison',reference:{...ref,sha256:'0'.repeat(64)}}]));
assert.throws(()=>source.qualify({...ref,bytes:ref.bytes+1}));
let called=0;const accessor={...ref};Object.defineProperty(accessor,'extra',{enumerable:true,get(){called++;throw Error('getter evaluated');}});
assert.throws(()=>source.qualify(accessor));assert.throws(()=>source.qualify(new Proxy(ref,{get(){called++;throw Error('proxy evaluated');}})));assert.equal(called,0);
assert.throws(()=>currentSassToolReferenceSubject({root,read:()=>Buffer.from('wrong')}),/nonphysical current tool input/);
let armed=false;const incoming={...ref,extra:{value:'before'}};
const live=currentSassToolReferenceSubject({root,read:p=>{const bytes=disk(p);if(armed){armed=false;incoming.extra.value='after';}return bytes;}});
armed=true;assert.throws(()=>live.qualify(incoming),/changed|Expected values/);assert.equal(armed,false);
incoming.extra.value='before';assert.deepEqual(live.qualify(incoming),{...after,extra:{value:'before'}});
source.assertCurrent();
console.log(JSON.stringify({result:'pass',transitions:packet.updates.length,receipts:packet.receipts.length,source_bound:source.bound.length,physical_cold_late_unknown:true,old_images_comparison_only:true,g11_claim:'not-passed'}));
