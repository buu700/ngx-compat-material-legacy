/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Run on a disposable Git-backed copy; physical controls restore bytes. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import admission from '../scripts/upstream-base-class-removal-admission.cjs';
import {applyBaseClassRemovalCanonicalStage} from '../scripts/base-class-removal-canonical-stage.mjs';
import {tabsFiniteSourceSuccessor} from '../scripts/tabs-finite-source-successor.mjs';
import {baseClassRemovalOwnerSourceSubject} from '../scripts/base-class-removal-owner-source.mjs';
const root=process.cwd(),physical=p=>readFileSync(join(root,p));
const body=JSON.parse(physical(admission.BASE_CLASS_REMOVAL_REVIEW));
const before=gunzipSync(physical('compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v2-ledger-before.json.gz'));
const entry=applyBaseClassRemovalCanonicalStage({before,body}).entries[0];
const args={root,entry,body,review:body,proof:entry.individual_proof};
const tabs=tabsFiniteSourceSuccessor({root,line:'21.x',read:physical});
let poisonPath=null,lateAction=null,armed=false,triggered=false,last;
const read=p=>{
 if(armed&&lateAction&&p===last&&!triggered){triggered=true;lateAction();}
 const value=physical(p);
 return p===poisonPath?Buffer.concat([value,Buffer.from(' ')]):value;
};
const guard=admission.inspectSource({...args,read});
if(process.argv[2]==='--expect-gap'){
 last=guard.bound.at(-1).path;
 const target=tabs.bound.find(ref=>ref.path.endsWith('tab-group-base.ts')).path;
 const file=join(root,target),original=physical(target);
 try{lateAction=()=>writeFileSync(file,Buffer.concat([original,Buffer.from(' ')]));armed=true;
  assert.doesNotThrow(()=>guard.assertCurrent(),'old actual inspector missed final tabs mutation');assert.equal(triggered,true);
 }finally{armed=false;lateAction=null;writeFileSync(file,original);}
 console.log(JSON.stringify({old_gap_reproduced:true,actual_caller:true,target,last}));process.exit(0);
}
const bound=new Map(guard.bound.map(ref=>[ref.path,ref]));
for(const ref of tabs.bound)assert.deepEqual(bound.get(ref.path),ref,'tabs judgment included '+ref.path);
last=guard.bound.at(-1).path;
assert.notEqual(last,tabs.bound[3].path);
guard.assertCurrent();
let physicalLate=0,callbackLate=0;
for(const ref of tabs.bound){
 const file=join(root,ref.path),original=physical(ref.path);
 try{writeFileSync(file,Buffer.concat([original,Buffer.from(' ')]));assert.throws(()=>guard.assertCurrent(),'late physical '+ref.path);physicalLate++;}
 finally{writeFileSync(file,original);}
 poisonPath=ref.path;try{assert.throws(()=>guard.assertCurrent(),'late callback '+ref.path);callbackLate++;}finally{poisonPath=null;}
}
const target=tabs.bound.find(ref=>ref.path.endsWith('tab-group-base.ts')).path;
const file=join(root,target),original=physical(target);
try{
 lateAction=()=>writeFileSync(file,Buffer.concat([original,Buffer.from(' ')]));armed=true;triggered=false;
 assert.throws(()=>guard.assertCurrent(),'last callback changed earlier tabs physical source');assert.equal(triggered,true);
}finally{armed=false;lateAction=null;writeFileSync(file,original);}
try{
 lateAction=()=>{poisonPath=target;};armed=true;triggered=false;
 assert.throws(()=>guard.assertCurrent(),'last callback poisoned earlier tabs supplied source');assert.equal(triggered,true);
}finally{armed=false;lateAction=null;poisonPath=null;}
guard.assertCurrent();
let outerArmed=false,outerTriggered=false,outerAction=null;
const outerRead=p=>{if(outerArmed&&outerAction&&p===last&&!outerTriggered){outerTriggered=true;outerAction();}return physical(p);};
const outer=baseClassRemovalOwnerSourceSubject({root,read:outerRead});
for(const ref of tabs.bound){assert.deepEqual(outer.source.bound.find(row=>row.path===ref.path),ref);assert.deepEqual(outer.bound.find(row=>row.path===ref.path),ref);}
outer.assertCurrent();
try{outerAction=()=>writeFileSync(file,Buffer.concat([original,Buffer.from(' ')]));outerArmed=true;
 assert.throws(()=>outer.assertCurrent(),'outer same-object final tabs mutation');assert.equal(outerTriggered,true);
}finally{outerArmed=false;outerAction=null;writeFileSync(file,original);}
outer.assertCurrent();
console.log(JSON.stringify({line:'21.x',actual_caller:true,bound:guard.bound.length,tabs_bound:tabs.bound.length,physicalLate,callbackLate,last_callback_physical_rejected:true,last_callback_supplied_rejected:true,outer_same_object_bound:true,outer_final_physical_rejected:true,native_executed:false,g11_claim:'not-passed'}));
