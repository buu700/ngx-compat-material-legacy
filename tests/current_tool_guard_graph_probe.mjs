/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Genuine tool factory on disposable physical inputs; no product admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {currentSassToolReferenceSubject} from '../scripts/current-sass-tool-references.mjs';
import {composeCanonicalSourceGuards} from '../scripts/canonical-source-guard-plan.mjs';

const root=process.argv[2],helper='scripts/canonical-source-guard-plan.mjs';
const disk=path=>readFileSync(join(root,path)),write=(path,raw)=>writeFileSync(join(root,path),raw);
const helperBefore=disk(helper),suffix=Buffer.from('\n// graph control drift\n');
let calls=0,onRead=()=>{},override=null,rejected=0;
const read=path=>{const raw=disk(path);calls++;onRead(path);return override?override(path,raw):raw;};
const reset=()=>{calls=0;onRead=()=>{};override=null;};
const reject=(fn,match=()=>true)=>{assert.throws(fn,error=>error?.code==='ERR_ASSERTION'&&match(error));rejected++;};
write(helper,Buffer.concat([helperBefore,suffix]));
try{
 onRead=()=>write(helper,helperBefore);reject(()=>currentSassToolReferenceSubject({root,read}));assert.equal(calls,0);
}finally{write(helper,helperBefore);reset();}
const source=currentSassToolReferenceSubject({root,read});reset();
assert.ok(Object.isFrozen(source.guardNode)&&Object.isFrozen(source.guardPlan));
assert.equal(source.guardPlan.node,source.guardNode);assert.equal(source.guardPlan.assertCurrent,source.assertCurrent);
const target='scripts/rc-verify.py',before=disk(target);
assert.ok(source.bound.some(ref=>ref.path===target));
write(target,Buffer.concat([before,suffix]));
try{onRead=()=>write(target,before);reject(source.assertCurrent);assert.equal(calls,0);}
finally{write(target,before);reset();}
source.assertCurrent();reset();
for(const forge of [raw=>Buffer.concat([raw,suffix]),()=>({})]){
 let reached=false;
 override=(path,raw)=>{if(path===target){reached=true;return forge(raw);}return raw;};
 try{reject(source.assertCurrent,error=>error.message.includes(target)&&error.message.includes('nonphysical'));assert.equal(reached,true);}finally{reset();}
 source.assertCurrent();reset();
}
for(const returned of ['old','new']){
 let changed=false,restoredLater=false,callbacksAfterMutation=0;
 onRead=path=>{
  if(changed){callbacksAfterMutation++;if(path!==target){write(target,before);restoredLater=true;}}
  else if(path===target){write(target,Buffer.concat([before,suffix]));changed=true;}
 };
 override=(path,raw)=>path===target&&returned==='new'?disk(path):raw;
 try{reject(source.assertCurrent,error=>error.message.includes(target)&&/nonphysical|changed during callback/.test(error.message));assert.equal(changed,true);assert.equal(restoredLater,false);assert.equal(callbacksAfterMutation,0);}
 finally{write(target,before);reset();}
 source.assertCurrent();reset();
}
source.assertCurrent();const last=calls;reset();let changed=false;
onRead=()=>{if(calls===last){changed=true;write(helper,Buffer.concat([helperBefore,suffix]));}};
try{reject(source.assertCurrent);assert.equal(changed,true);}
finally{write(helper,helperBefore);reset();}
source.assertCurrent();reset();
const alternate=composeCanonicalSourceGuards(Object.freeze([source.guardNode]));
for(const [outer,inner]of [[alternate,source.assertCurrent],[source.assertCurrent,alternate]]){
 let nested=false;
 onRead=path=>{if(path===target&&!nested){nested=true;reject(inner);}};
 try{outer();assert.equal(nested,true);}finally{reset();}
 source.assertCurrent();reset();
}
const row=source.transitions[0],ref={path:row.path,...row.before},after={path:row.path,...row.after};
const operations=[()=>assert.deepEqual(source.qualify(ref),after),
 ()=>assert.deepEqual(source.predecessorReference(after),ref),
 ()=>assert.equal(createHash('sha256').update(source.comparisonBytes(ref)).digest('hex'),ref.sha256)];
for(const operation of operations){
 let nested=false;
 onRead=path=>{if(path===target&&!nested){nested=true;operation();}};
 try{source.assertCurrent();assert.equal(nested,true);}finally{reset();}
 override=(path,raw)=>path===row.path?Buffer.concat([raw,suffix]):raw;
 try{reject(operation);}finally{reset();}
 operation();source.assertCurrent();reset();
}
assert.equal(rejected,12);assert.ok(disk(helper).equals(helperBefore));assert.ok(disk(target).equals(before));
console.log(JSON.stringify({result:'pass',line:source.line,rejected_faults:rejected,
 actual_factory_node:true,alternate_scheduler_reentry_controls:2,independent_nested_side_operations:3,
 side_operation_forged_reader_controls:3,source_bound:source.bound.length,restoration_passed:true,
 product_owner_or_compiler_executed:false,g11_claim:'not-passed'}));
