/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createOrdinaryDensityGateContext as create} from '../scripts/sass-ordinary-density-gate.mjs';
const root=process.argv[2];assert.ok(existsSync(join(root,'.density-successor-disposable')));const packetPath='compatibility/rc/current-main-density-input-successor-v1.json',packet=JSON.parse(readFileSync(join(root,packetPath))),s=create({root});
for(const path of [packet.updates[0].path,packet.updates[1].path,packetPath]){const file=join(root,path),old=readFileSync(file);try{writeFileSync(file,Buffer.concat([old,Buffer.from(' foreign')]));assert.throws(()=>create({root}));assert.throws(()=>s.assertCurrent());}finally{writeFileSync(file,old);}s.assertCurrent();}
console.log(JSON.stringify({result:'pass',exact_updates:packet.updates.length,cold_late:3}));
