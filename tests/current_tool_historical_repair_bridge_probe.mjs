/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {currentSassToolReferenceSubject as make} from '../scripts/current-sass-tool-references.mjs';
const root=resolve(process.argv[2]??'.'),baseline=make({root}),scratch=mkdtempSync(join(tmpdir(),'tool-historical-bridge-')),fixture=join(scratch,'root');mkdirSync(fixture);
for(const ref of baseline.bound){const dest=join(fixture,ref.path);mkdirSync(dirname(dest),{recursive:true});copyFileSync(join(root,ref.path),dest);}
const gitdir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();writeFileSync(join(fixture,'.git'),'gitdir: '+gitdir+'\n');
try{
 const subject=make({root:fixture}),packet=JSON.parse(readFileSync(join(fixture,'compatibility/rc/current-tool-historical-repair-source-successor-v1.json'))),hash=b=>createHash('sha256').update(b).digest('hex');
 assert.deepEqual(subject.qualify(packet.before),packet.after);assert.deepEqual(subject.qualify(packet.after),packet.after);assert.equal(hash(subject.comparisonBytes(packet.before)),packet.before.sha256);assert.equal(hash(subject.comparisonBytes(packet.after)),packet.after.sha256);
 assert.equal(subject.qualify({...packet.before,sha256:'0'.repeat(64)}),null);assert.throws(()=>subject.qualify({...packet.before,bytes:packet.before.bytes+1}));
 const paths=[packet.after.path,'compatibility/rc/current-tool-historical-repair-source-successor-v1.json',...packet.supports.map(ref=>ref.path)];
 for(const path of paths){const target=join(fixture,path),raw=readFileSync(target),changed=Buffer.from(raw);assert.ok(changed.length);changed[0]^=1;try{writeFileSync(target,changed);assert.throws(()=>subject.assertCurrent());assert.throws(()=>make({root:fixture}));}finally{writeFileSync(target,raw);}subject.assertCurrent();}
 console.log(JSON.stringify({result:'pass',cold_and_late:paths.length,old_and_current_comparison:true,full_historical_owner_qualified:false,g11_claim:'not-passed'}));
}finally{rmSync(scratch,{recursive:true,force:true});}
