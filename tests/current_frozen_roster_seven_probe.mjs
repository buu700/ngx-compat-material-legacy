/** @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. Use of this source code is governed by the MIT license in LICENSE. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {currentInventorySourceSubject as make} from '../scripts/current-inventory-source-subject.mjs';
const root=process.cwd(),physical=p=>readFileSync(resolve(root,p));
const packetPath='compatibility/rc/current-inventory-frozen-roster-seven-commit-successor-v1.json',packet=JSON.parse(physical(packetPath));
const roster=packet.transitions.at(-1).after.path;
const windowPath='compatibility/rc/current-inventory-window-table-source-routing-v1.json',windowPacket=JSON.parse(physical(windowPath));
const retainedPath='compatibility/rc/current-inventory-retained-support-source-v1.json',retained=JSON.parse(physical(retainedPath));
const latePath='compatibility/rc/current-inventory-late-support-source-v1.json',late=JSON.parse(physical(latePath));
const retainedCurrentPath='compatibility/rc/current-inventory-retained-context-current-source-v1.json',retainedCurrent=JSON.parse(physical(retainedCurrentPath));
const validatorCurrentPath='compatibility/rc/current-inventory-retained-validator-current-source-v1.json',validatorCurrent=JSON.parse(physical(validatorCurrentPath));
const allRefs=[validatorCurrentPath,...validatorCurrent.support.map(x=>x.path),retainedCurrentPath,packetPath,roster,...new Set(packet.transitions.flatMap(t=>t.support.map(r=>r.path))),windowPath,...windowPacket.updates.map(x=>x.path),retainedPath,...retained.transitions.map(x=>x.path),latePath,...late.transitions.map(x=>x.path)];
const chunk=Number(process.argv[2]??0);assert.ok(Number.isInteger(chunk)&&chunk>=0&&chunk<4);const refs=allRefs.filter((_,i)=>i%4===chunk);const subject=make({root});
if(chunk===0){
for(const row of windowPacket.updates){const before=execFileSync('git',['--no-replace-objects','show',windowPacket.source_parent+':'+row.path],{cwd:root});assert.deepEqual(subject.qualify(row.before),row.after);assert.ok(subject.comparisonBytes(row.before).equals(before));assert.ok(subject.comparisonBytes(row.after).equals(physical(row.path)));}
for(const row of retained.transitions){const before=execFileSync('git',['--no-replace-objects','show',row.source_parent+':'+row.path],{cwd:root}),successor=row.path===retainedCurrent.path?retainedCurrent:validatorCurrent.transitions.find(x=>x.path===row.path);assert.ok(successor);assert.deepEqual(subject.qualify(row.before),successor.after);assert.ok(subject.comparisonBytes(row.before).equals(before));assert.ok(subject.comparisonBytes(row.after).equals(execFileSync('git',['--no-replace-objects','show',(row.path===retainedCurrent.path?retainedCurrent.source_parent:validatorCurrent.source_parent)+':'+row.path],{cwd:root})));assert.deepEqual(subject.qualify(row.after),successor.after);assert.ok(subject.comparisonBytes(successor.after).equals(physical(row.path)));}
for(const row of late.transitions){const before=execFileSync('git',['--no-replace-objects','show',row.source_parent+':'+row.path],{cwd:root});assert.deepEqual(subject.qualify(row.before),row.after);assert.ok(subject.comparisonBytes(row.before).equals(before));assert.ok(subject.comparisonBytes(row.after).equals(physical(row.path)));}
}
for(const path of refs){const file=resolve(root,path),raw=physical(path);try{writeFileSync(file,Buffer.concat([raw,Buffer.from(' ')]));assert.throws(()=>make({root}),undefined,'cold physical '+path);assert.throws(()=>subject.assertCurrent(),undefined,'late physical '+path);}finally{writeFileSync(file,raw);}subject.assertCurrent();}
for(const path of refs){let armed=false;const read=p=>{const raw=physical(p);return armed&&p===path?Buffer.concat([raw,Buffer.from(' ')]):raw;};const live=make({root,read});armed=true;assert.throws(()=>live.assertCurrent(),undefined,'late callback '+path);assert.throws(()=>make({root,read}),undefined,'cold callback '+path);armed=false;live.assertCurrent();}
if(chunk===0){
const historical=execFileSync('git',['--no-replace-objects','show',packet.base_commit+':'+roster],{cwd:root,maxBuffer:8*1024*1024});assert.throws(()=>make({root,read:p=>p===roster?historical:physical(p)}));
let armed=false,nested=false,live;live=make({root,read:p=>{const raw=physical(p);if(armed&&!nested){nested=true;try{live.assertCurrent();}catch{}}return raw;}});armed=true;assert.throws(()=>live.assertCurrent(),/reentr/);assert.equal(nested,true);armed=false;live.assertCurrent();
}
console.log(JSON.stringify({result:'pass',paths:refs.length,physical_and_callback_cold_late:true,historical_roster_rejected:chunk===0,reentry_recovery:chunk===0,g11_claim:'not-passed'}));
