/** @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. Use of this source code is governed by the MIT license in LICENSE. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {currentToolMatrixSource as make} from '../scripts/current-tool-matrix-source.mjs';
const root=resolve(process.argv[2]),packetPath='compatibility/rc/current-tool-matrix-hint-id-source-successor-v1.json';
const packet=JSON.parse(readFileSync(resolve(root,packetPath))),paths=[packetPath,packet.source_review.path,...packet.transitions.map(t=>t.path)];
const read=p=>readFileSync(resolve(root,p)),subject=make({root});subject.assertCurrent();
for(const path of paths){
 const name=resolve(root,path),original=readFileSync(name);
 try{writeFileSync(name,Buffer.concat([original,Buffer.from('\n')]));assert.throws(()=>make({root}));assert.throws(()=>subject.assertCurrent());}
 finally{writeFileSync(name,original)}subject.assertCurrent();
 assert.throws(()=>make({root,read:p=>p===path?Buffer.from('changed'):read(p)}));
}
for(const t of packet.transitions.filter(t=>t.prior_exists)){
 const old=execFileSync('git',['--no-replace-objects','show',packet.source_parent+':'+t.path],{cwd:root});
 assert.throws(()=>make({root,read:p=>p===t.path?old:read(p)}));
}
let nested=false;assert.throws(()=>make({root,read:p=>{if(!nested){nested=true;try{make({root});}catch{}}return read(p);}}),/reentrant/);assert.ok(nested);
assert.throws(()=>subject.comparisonBytes({...subject.before,sha256:'0'.repeat(64)}));subject.assertCurrent();
console.log(JSON.stringify({result:'pass',cold_late_physical:paths.length,forged_callbacks:paths.length,historical_callbacks:3,reentrant:true,unknown_reference_rejected:true}));
