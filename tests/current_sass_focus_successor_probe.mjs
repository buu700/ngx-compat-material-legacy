/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createCurrentSassSource as create} from '../scripts/current-sass-source.mjs';
const root=process.argv[2],read=p=>readFileSync(join(root,p)),packetPath='compatibility/rc/current-main-strong-focus-source-v1.json',packet=JSON.parse(read(packetPath)),make=options=>create({root,...options}),s=make();
assert.deepEqual(s.qualify(packet.before),packet.after);assert.throws(()=>s.qualify({...packet.before,sha256:'0'.repeat(64)}));
for(const path of [packet.before.path,packetPath,packet.review.path,'scripts/stepper-current-peer-source-v5.mjs']){const file=join(root,path),old=read(path);
 try{writeFileSync(file,Buffer.concat([old,Buffer.from(' foreign')]));assert.throws(()=>make());assert.throws(()=>s.assertCurrent());}finally{writeFileSync(file,old);}
 let armed=false;const last=s.bound.at(-1).path,live=make({read:p=>{const b=read(p);if(armed&&p===last){armed=false;writeFileSync(file,Buffer.concat([old,Buffer.from(' late')]));}return b;}});
 try{armed=true;assert.throws(()=>live.assertCurrent());}finally{writeFileSync(file,old);}live.assertCurrent();}
console.log(JSON.stringify({bound:s.bound,transitions:s.transitions,source_sets:s.source_sets}));
