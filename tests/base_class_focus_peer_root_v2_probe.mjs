/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Run only on a disposable copy with the normal pinned pnpm package-root links. */
import assert from 'node:assert/strict';
import {lstatSync,readFileSync,renameSync,symlinkSync,unlinkSync,writeFileSync} from 'node:fs';
import {basename,join} from 'node:path';
import {readHistoricalContractRepairMember} from '../scripts/historical-contract-repair-source.mjs';
import {baseClassRemovalOwnerSourceSubject} from '../scripts/base-class-removal-owner-source.mjs';
const root=process.cwd(),physical=p=>readHistoricalContractRepairMember(root,p);
assert.ok(lstatSync(join(root,'node_modules/@angular/core')).isSymbolicLink(),'requires ordinary pnpm peer-root link');
const core='node_modules/@angular/core/types/core.d.ts';
let poison=false,armed=false,triggered=false,trigger=null,action=null;
const read=p=>{if(armed&&p===trigger&&!triggered){triggered=true;action();}const raw=physical(p);return poison&&p===core?Buffer.concat([raw,Buffer.from(' ')]):raw;};
const owner=baseClassRemovalOwnerSourceSubject({root,read});
assert.ok(owner.bound.some(ref=>ref.path===core));owner.assertCurrent();
poison=true;try{assert.throws(()=>owner.assertCurrent(),'spoofed core declaration callback');}finally{poison=false;}
const corePath=join(root,core),original=readFileSync(corePath);
try{writeFileSync(corePath,Buffer.concat([original,Buffer.from('\ndeclare const unreviewedPeer: unique symbol;\n')]));assert.throws(()=>owner.assertCurrent(),'changed core declaration physical bytes');}finally{writeFileSync(corePath,original);}
trigger=owner.source.bound.at(-1).path;
try{action=()=>writeFileSync(corePath,Buffer.concat([original,Buffer.from('\ndeclare const latePeer: unique symbol;\n')]));armed=true;assert.throws(()=>owner.assertCurrent(),'last callback changed earlier core declaration');assert.equal(triggered,true);}finally{armed=false;action=null;writeFileSync(corePath,original);triggered=false;}
const withLink=(path,body)=>{const originalPath=join(root,path),backup=originalPath+'.v2-probe-original';renameSync(originalPath,backup);symlinkSync(basename(backup),originalPath);try{body();}finally{unlinkSync(originalPath);renameSync(backup,originalPath);}};
withLink('node_modules/@angular/core/types/_discovery-chunk.d.ts',()=>assert.throws(()=>owner.assertCurrent(),'linked peer descendant'));
withLink('scripts/canonical-source-guard-plan.mjs',()=>assert.throws(()=>owner.assertCurrent(),'unrelated owned symlink'));
owner.assertCurrent();
console.log(JSON.stringify({normal_pnpm_peer_root_link:true,owner_bound:owner.bound.length,core_callback_spoof_rejected:true,core_physical_mutation_rejected:true,late_core_callback_mutation_rejected:true,linked_peer_descendant_rejected:true,unrelated_owned_symlink_rejected:true,g11_claim:'not-passed'}));
