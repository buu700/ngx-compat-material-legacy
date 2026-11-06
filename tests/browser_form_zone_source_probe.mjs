/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';import{join}from'node:path';import{execFileSync}from'node:child_process';import{browserFormZoneSourceSuccessor}from'../scripts/browser-form-zone-source-successor.mjs';
const root=process.cwd(),line=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main',path='scripts/browser-form-families.mjs',full=join(root,path),original=readFileSync(full),prior=execFileSync('git',['show',(line==='21.x'?'1acdae0058291217be7121f228f48983ebb7889a':'0d681a13389565d2416b3485ab3278f4bde2e82e')+':'+path],{cwd:root}),good=p=>readFileSync(join(root,p)),construct=read=>browserFormZoneSourceSuccessor({root,read,line});
const accepted=construct(good);assert.equal(accepted.after.path,path);accepted.assertCurrent();
assert.throws(()=>construct(p=>p===path?prior:good(p)),'old callback bytes must fail');assert.throws(()=>construct(p=>p===path?Buffer.from('unknown'):good(p)),'unknown callback bytes must fail');assert.throws(()=>browserFormZoneSourceSuccessor({root,read:good,line:'unknown'}));assert.throws(()=>browserFormZoneSourceSuccessor({root,read:good,line:line==='main'?'21.x':'main'}),'opposite valid line must fail');assert.equal(accepted.qualify(accepted.before).sha256,accepted.after.sha256);assert.equal(accepted.qualify({...accepted.before,sha256:'0'.repeat(64)}),null);assert.equal(accepted.qualify({...accepted.before,path:'scripts/other.mjs'}),null);
try{writeFileSync(full,prior);assert.throws(()=>construct(good),'old physical image must fail');writeFileSync(full,original);const guard=construct(good);writeFileSync(full,Buffer.concat([original,Buffer.from('\n')]));assert.throws(()=>guard.assertCurrent(),'late physical mutation must fail');assert.throws(()=>guard.assertPhysical(),'late physical sweep must fail');writeFileSync(full,original);
 let triggered=false;assert.throws(()=>construct(p=>{const b=good(p);if(p===path&&!triggered){triggered=true;writeFileSync(full,Buffer.concat([b,Buffer.from('\n')]));}return b;}),'physical mutation during callback must fail');assert.equal(triggered,true);
}finally{writeFileSync(full,original)}
construct(good).assertCurrent();
let allCold=0,allLate=0;
for(const ref of accepted.bound){const f=join(root,ref.path),bytes=readFileSync(f);try{writeFileSync(f,Buffer.concat([bytes,Buffer.from(' ')]));assert.throws(()=>construct(good),'cold physical '+ref.path);allCold++;assert.throws(()=>accepted.assertCurrent(),'late physical '+ref.path);allLate++;}finally{writeFileSync(f,bytes)}}
assert.equal(allCold,accepted.bound.length);assert.equal(allLate,accepted.bound.length);construct(good).assertCurrent();console.log(JSON.stringify({all_bound_physical_cold_rejected:allCold,all_bound_physical_late_rejected:allLate,line,positive:true,old_and_unknown_callback_rejected:true,unknown_line_rejected:true,cold_physical_old_rejected:true,late_physical_rejected:true,mutation_during_callback_rejected:true,source_scope_only:true,actual_native_or_full_audit_qualified:false}));
