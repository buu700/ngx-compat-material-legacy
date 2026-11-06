/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Run on a disposable Git-backed copy; every physical mutation restores bytes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {historicalContractRepairSourceSubject,readHistoricalContractRepairMember} from '../scripts/historical-contract-repair-source.mjs';
import {dialogFocusFiniteSourceSuccessor} from '../scripts/dialog-focus-finite-source-successor.mjs';
const root=process.cwd(),physical=p=>readHistoricalContractRepairMember(root,p),file=p=>join(root,p);
const line=JSON.parse(physical('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const focus=dialogFocusFiniteSourceSuccessor({root,line,read:physical});
let armed=false,triggered=false,action=null,trigger=null,poison=null;
const read=p=>{if(armed&&p===trigger&&!triggered){triggered=true;action();}const raw=physical(p);return p===poison?Buffer.concat([raw,Buffer.from(' ')]) :raw;};
const subject=historicalContractRepairSourceSubject({root,read});
for(const ref of focus.bound)assert.deepEqual(subject.bound.find(r=>r.path===ref.path),ref);
for(const path of ['projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts','projects/ngx-material-legacy/legacy-dialog/dialog-container.ts']){
 const row=focus.packet.branches[line].transitions.find(r=>r.path===path);assert.ok(row);
 assert.equal(subject.qualify({path,sha256:row.before.sha256,bytes:row.before.bytes}).sha256,row.after.sha256);
 assert.equal(subject.historicalReference({path,sha256:row.after.sha256,bytes:row.after.bytes}).sha256,row.before.sha256);
 assert.throws(()=>subject.qualify({path,sha256:'0'.repeat(64),bytes:row.before.bytes}));
}
subject.assertCurrent();
const targets=[focus.bound.find(r=>r.path.endsWith('dialog-container-base.ts')),focus.bound.find(r=>r.path.endsWith('/core.d.ts'))];
for(const [ref,mutant,label] of [[targets[0],raw=>Buffer.concat([Buffer.from("import {inject} from '@angular/core';\n"),raw]),'extra product import'],[targets[0],raw=>Buffer.concat([raw,Buffer.from('\nexport const unreviewedBody = 1;\n')]),'extra product body'],[targets[1],raw=>Buffer.concat([raw,Buffer.from('\ndeclare const unreviewedPeer: unique symbol;\n')]),'extra peer declaration']]){const original=physical(ref.path);try{writeFileSync(file(ref.path),mutant(original));assert.throws(()=>subject.assertCurrent(),label);}finally{writeFileSync(file(ref.path),original);}}
trigger=subject.bound.at(-1).path;
const target=targets[0].path,original=physical(target);
try{action=()=>writeFileSync(file(target),Buffer.concat([original,Buffer.from(' ')]));armed=true;assert.throws(()=>subject.assertCurrent(),'late last callback physical focus');assert.equal(triggered,true);}finally{armed=false;action=null;writeFileSync(file(target),original);triggered=false;}
try{action=()=>{poison=target;};armed=true;assert.throws(()=>subject.assertCurrent(),'late last callback supplied focus');assert.equal(triggered,true);}finally{armed=false;action=null;poison=null;triggered=false;}
subject.assertCurrent();
let canonical=null;
if(line==='21.x'){
 const {baseClassRemovalOwnerSourceSubject}=await import('../scripts/base-class-removal-owner-source.mjs');
 const outer=baseClassRemovalOwnerSourceSubject({root,read});
 for(const ref of focus.bound)assert.deepEqual(outer.source.bound.find(r=>r.path===ref.path),ref);
 outer.assertCurrent();trigger=outer.source.bound.at(-1).path;
 try{action=()=>writeFileSync(file(target),Buffer.concat([original,Buffer.from(' ')]));armed=true;assert.throws(()=>outer.assertCurrent(),'outer final focus physical');assert.equal(triggered,true);}finally{armed=false;action=null;writeFileSync(file(target),original);triggered=false;}
 outer.assertCurrent();canonical={bound:outer.bound.length,outer_final_focus_rejected:true};
}
console.log(JSON.stringify({line,historical_bound:subject.bound.length,focus_bound:focus.bound.length,focus_current_and_predecessor:true,mutant_import_body_and_peer_declaration_rejected:true,late_callback_physical_and_supplied_rejected:true,canonical,source_scope_only:true,g11_claim:'not-passed'}));
