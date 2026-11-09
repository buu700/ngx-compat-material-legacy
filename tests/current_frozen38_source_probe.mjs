/** @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. Use of this source code is governed by the MIT license in LICENSE. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {currentSassToolReferenceSubject as make} from '../scripts/current-sass-tool-references.mjs';
const root=process.cwd(),read=p=>readFileSync(resolve(root,p)),packetPath='compatibility/rc/current-inventory-frozen-38-roster-source-v1.json',ownerPath='compatibility/rc/current-inventory-frozen-38-owner-source-v1.json',packet=JSON.parse(read(packetPath));
const paths=[packetPath,ownerPath,'scripts/current-inventory-source-subject.mjs',packet.after.path,...packet.support.map(x=>x.path)];let bad=null;const callback=p=>p===bad?Buffer.concat([read(p),Buffer.from(' ')]):read(p);const subject=make({root,read:callback});
for(const path of paths){bad=path;assert.throws(()=>subject.assertCurrent());assert.throws(()=>make({root,read:callback}));bad=null;subject.assertCurrent();const file=resolve(root,path),raw=read(path);try{writeFileSync(file,Buffer.concat([raw,Buffer.from(' ')]));assert.throws(()=>subject.assertCurrent());assert.throws(()=>make({root}));}finally{writeFileSync(file,raw);}subject.assertCurrent();}
const old=execFileSync('git',['--no-replace-objects','show',packet.source_parent+':'+packet.before.path],{cwd:root,maxBuffer:8*1024*1024});assert.throws(()=>make({root,read:p=>p===packet.before.path?old:read(p)}));subject.assertCurrent();console.log(JSON.stringify({result:'pass',paths:paths.length,cold_late_physical:paths.length,cold_late_callback:paths.length,old_roster_rejected:true,recovery:true,g11_claim:'not-passed'}));
