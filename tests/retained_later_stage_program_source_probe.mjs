/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFileSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {retainedLaterStageProgramSource as make} from '../scripts/retained-later-stage-program-source.mjs';
const root=process.cwd(),physical=path=>readFileSync(join(root,path)),live=make({root,read:physical});
const packet=JSON.parse(physical('compatibility/rc/main-retained-later-stage-programs-v1.json'));
assert.equal(live.transitions.length,3);assert.equal(live.bound.length,20);
let known=0;
for(const row of packet.programs)for(const step of row.steps)for(const ref of [step.before,step.after]){
 const expected=live.transitions.find(item=>item.path===row.path).current;
 const descriptor={path:ref.path,sha256:ref.sha256,bytes:ref.bytes};
 assert.deepEqual(live.qualifyMetadata(descriptor),expected);
 const {bytes,...short}=descriptor,{bytes:currentBytes,...shortExpected}=expected;
 assert.deepEqual(live.qualifyMetadata(short),shortExpected);known++;
}
const original=live.transitions[0].before,expected=live.transitions[0].current;
assert.throws(()=>live.qualifyMetadata({...original,sha256:'0'.repeat(64)}));
assert.throws(()=>live.qualifyMetadata({...original,bytes:original.bytes+1}));
let accessorCalls=0;assert.throws(()=>live.qualifyMetadata({get path(){accessorCalls++;return original.path;},sha256:original.sha256}));assert.equal(accessorCalls,0);
let proxyCalls=0;assert.throws(()=>live.qualifyMetadata(new Proxy(original,{get(){proxyCalls++;throw new Error('proxy invoked');}})));assert.equal(proxyCalls,0);
assert.throws(()=>live.qualifyMetadata({...original,extra:true}));
assert.throws(()=>live.qualifyMetadata({...original,[Symbol('extra')]:true}));
assert.throws(()=>live.qualifyMetadata(Object.create(original)));
assert.equal(live.qualifyMetadata({path:'unknown/program.mjs',sha256:'0'.repeat(64)}),null);
for(const target of live.bound.map(ref=>ref.path)){
 let bad=false;const read=path=>{const raw=physical(path);return path===target&&bad?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const scope=make({root,read});scope.bound.length=0;scope.transitions[0].current.sha256='0'.repeat(64);
 const exposed=scope.qualifyMetadata(original);exposed.sha256='0'.repeat(64);
 bad=true;assert.throws(()=>scope.assertCurrent(),undefined,'late '+target);assert.throws(()=>make({root,read}),undefined,'cold '+target);
 bad=false;scope.assertCurrent();assert.deepEqual(scope.qualifyMetadata(original),expected);
}
// A callback can mutate an already-read physical member. The final sweep
// must catch it without modifying the checkout or hardlinked evidence.
const scratch=mkdtempSync(join(tmpdir(),'retained-later-program-probe-'));
try{
 writeFileSync(join(scratch,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim()+'\n');
 for(const ref of live.bound){const path=join(scratch,ref.path);mkdirSync(dirname(path),{recursive:true});copyFileSync(join(root,ref.path),path);}
 const target=original.path,last=live.bound.at(-1).path,raw=readFileSync(join(scratch,target));let mutate=false;
 const read=path=>{const value=readFileSync(join(scratch,path));if(mutate&&path===last)writeFileSync(join(scratch,target),Buffer.concat([raw,Buffer.from(' ')]));return value;};
 const scope=make({root:scratch,read});mutate=true;assert.throws(()=>scope.assertCurrent());
 mutate=false;writeFileSync(join(scratch,target),raw);scope.assertCurrent();
}finally{rmSync(scratch,{recursive:true,force:true});}
assert.equal(live.historical_code_executed_or_exposed,false);assert.equal(live.artifact_or_audit_admission_granted,false);
assert.equal(live.source_judgments_changed,0);assert.equal(live.g11_claim,'not-passed');
console.log(JSON.stringify({result:'pass',programs:3,bound:20,known_step_descriptors:known,cold_rejections:20,late_rejections:20,recoveries:20,
 unknown_hash_rejected:true,wrong_length_rejected:true,accessor_not_invoked:true,proxy_not_invoked:true,public_metadata_isolated:true,
 physical_cross_member_mutation_rejected:true,historical_code_executed_or_exposed:false,artifact_or_audit_admission_granted:false}));
