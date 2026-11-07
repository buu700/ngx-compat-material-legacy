/** @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. Use of this source code is governed by the MIT license in LICENSE. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {currentSassToolReferenceSubject} from '../scripts/current-sass-tool-references.mjs';
const root=resolve(process.argv[2]), planner='scripts/canonical-source-guard-plan.mjs', packet='compatibility/rc/current-tool-planner-source-successor-v1.json', rc='scripts/rc-verify.py', rcPacket='compatibility/rc/current-tool-rc-verify-source-successor-v1.json';
const subject=currentSassToolReferenceSubject({root});assert.equal(subject.epoch,6);subject.assertCurrent();
assert.equal(subject.qualify({path:planner,sha256:'0'.repeat(64)}),null);
const oldRc={path:rc,sha256:'3a3a68dd67abf6b0c535853beea818f003867b5a1a1734e6bea683c82b51521c',bytes:103517},newRc={path:rc,sha256:'92b12b9f95207d32160a6a8df98e09a1ac9ee5264fdaf6a2f9057ff8bc3deadd',bytes:103230};
assert.deepEqual(subject.qualify(oldRc),newRc);assert.equal(subject.comparisonBytes(oldRc).length,oldRc.bytes);
assert.equal(subject.qualify({...oldRc,sha256:'0'.repeat(64)}),null);
assert.throws(()=>currentSassToolReferenceSubject({root,read:path=>path===rc?subject.comparisonBytes(oldRc):readFileSync(resolve(root,path))}));
for(const path of [planner,packet,rc,rcPacket]){
 const f=resolve(root,path),original=readFileSync(f);
 try {writeFileSync(f,Buffer.concat([original,Buffer.from('\n')]));assert.throws(()=>currentSassToolReferenceSubject({root}));assert.throws(()=>subject.assertCurrent());}
 finally {writeFileSync(f,original);}
 subject.assertCurrent();
}
assert.throws(()=>currentSassToolReferenceSubject({root,read:path=>path===planner?Buffer.from('wrong'):readFileSync(resolve(root,path))}));
let armed=false,changed=false;
const watched=currentSassToolReferenceSubject({root,read:path=>{
 const result=readFileSync(resolve(root,path));
 if(armed&&!changed){writeFileSync(resolve(root,planner),Buffer.concat([readFileSync(resolve(root,planner)),Buffer.from('\n')]));changed=true;}
 return result;
}});
const savedPlanner=readFileSync(resolve(root,planner));
try {armed=true;assert.throws(()=>watched.assertCurrent());assert.ok(changed);} finally {writeFileSync(resolve(root,planner),savedPlanner);}
armed=false;watched.assertCurrent();

const packagePath='projects/ngx-material-legacy/package.json',packageFile=resolve(root,packagePath),plannerFile=resolve(root,planner),packageRaw=readFileSync(packageFile),plannerRaw=readFileSync(plannerFile),seen=[];
try {
 const old=execFileSync('git',['show','2fbecd1b2687e26515c205cbd5c0024e9474b4b8:'+planner],{cwd:root});
 writeFileSync(plannerFile,old);writeFileSync(packageFile,JSON.stringify({...JSON.parse(packageRaw),version:'21.0.0'}));
 try {currentSassToolReferenceSubject({root,read:path=>{seen.push(path);return readFileSync(resolve(root,path));}});}catch{}
 assert.ok(seen.includes('compatibility/rc/parent-base-class-tool-successor-inputs-v3.json'));
 assert.ok(!seen.includes(packet));assert.ok(!seen.includes(rcPacket));
} finally {writeFileSync(packageFile,packageRaw);writeFileSync(plannerFile,plannerRaw);}
subject.assertCurrent();
console.log(JSON.stringify({result:'pass',epoch:subject.epoch,bound:subject.bound}));
