/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFileSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {retainedValidatorProgramSource as make} from '../scripts/retained-validator-program-source.mjs';
const root=process.cwd(),physical=path=>readFileSync(join(root,path)),live=make({root,read:physical});
assert.equal(live.transitions.length,3);assert.equal(live.bound.length,24);
const receipt=JSON.parse(physical('compatibility/rc/retained-validator-context-successor-149de.json'));
const originalPacket=JSON.parse(physical('compatibility/rc/main-retained-validator-programs-v1.json'));
const expectedPaths=new Set(['scripts/retained-validator-program-source.mjs','compatibility/rc/main-retained-validator-programs-v1.json',originalPacket.source_input.path,...originalPacket.programs.map(row=>row.path),...originalPacket.support.map(row=>row.path),'compatibility/rc/retained-validator-context-successor-4015.json','compatibility/rc/retained-validator-context-successor-149de.json',...receipt.transitions.map(row=>row.path)]);
assert.deepEqual(new Set(live.bound.map(row=>row.path)),expectedPaths);
for(const row of live.transitions)for(const ref of [row.before,row.intermediate,row.current]){
 assert.deepEqual(live.qualifyMetadata(ref),row.current);
 const {bytes,...short}=ref,{bytes:currentBytes,...expected}=row.current;
 assert.deepEqual(live.qualifyMetadata(short),expected);
}
const original=live.transitions[0].before,expected=live.transitions[0].current;
assert.throws(()=>live.qualifyMetadata({...original,sha256:'0'.repeat(64)}));
assert.throws(()=>live.qualifyMetadata({...original,bytes:original.bytes+1}));
let accessorCalls=0;assert.throws(()=>live.qualifyMetadata({get path(){accessorCalls++;return original.path;},sha256:original.sha256}));assert.equal(accessorCalls,0);
assert.equal(live.qualifyMetadata({path:'unknown/program.mjs',sha256:'0'.repeat(64)}),null);
// Reentry during the enclosing guard's own loop must poison the transaction
// even when a reader catches the nested rejection. Recovery must remain usable.
for(const target of ['scripts/retained-validator-program-source.mjs','compatibility/rc/main-retained-validator-programs-v1.json','tests/retained_current_context_identity_probe.mjs','tests/test_current_reader_source_successors.py','compatibility/rc/retained-validator-context-successor-149de.json']){
 let scope,attempt=false,nestedRejected=0;
 const read=path=>{const raw=physical(path);if(attempt&&path===target){try{scope.assertCurrent();}catch{nestedRejected++;}}return raw;};
 scope=make({root,read});attempt=true;assert.throws(()=>scope.assertCurrent(),/reentry/);assert.equal(nestedRejected,1,target);
 attempt=false;scope.assertCurrent();
}
for(const target of live.bound.map(ref=>ref.path)){
 let bad=false;const read=path=>{const raw=physical(path);return path===target&&bad?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const scope=make({root,read});scope.bound.length=0;scope.transitions[0].current.sha256='0'.repeat(64);
 const exposed=scope.qualifyMetadata(original);exposed.sha256='0'.repeat(64);
 bad=true;assert.throws(()=>scope.assertCurrent(),undefined,'late '+target);assert.throws(()=>make({root,read}),undefined,'cold '+target);
 bad=false;scope.assertCurrent();assert.deepEqual(scope.qualifyMetadata(original),expected);
}
// Independent copies exercise a physical late cross-member mutation without
// modifying checkout sources, historical reports, or hardlinked evidence.
const scratch=mkdtempSync(join(tmpdir(),'retained-validator-program-probe-'));
try{
 writeFileSync(join(scratch,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim()+'\n');
 for(const ref of live.bound){const path=join(scratch,ref.path);mkdirSync(dirname(path),{recursive:true});copyFileSync(join(root,ref.path),path);}
 // The loaded validator image must match the physical source both on entry
 // and in the existing guard; recovery uses the same confined image.
 const selfPath=join(scratch,'scripts/retained-validator-program-source.mjs'),selfRaw=readFileSync(selfPath);
 const selfScope=make({root:scratch,read:path=>readFileSync(join(scratch,path))});
 writeFileSync(selfPath,Buffer.concat([selfRaw,Buffer.from(' ')]));
 assert.throws(()=>selfScope.assertCurrent());assert.throws(()=>make({root:scratch,read:path=>readFileSync(join(scratch,path))}));
 writeFileSync(selfPath,selfRaw);selfScope.assertCurrent();
 // Genuine whole predecessor bodies must fail cold and late and recover.
 const scratchRead=path=>readFileSync(join(scratch,path)),physicalScope=make({root:scratch,read:scratchRead});
 for(const row of receipt.transitions){
  const path=join(scratch,row.path),current=scratchRead(row.path);
  const before=execFileSync('git',['show',`${receipt.source_parent}:${row.path}`],{cwd:root});
  writeFileSync(path,before);assert.throws(()=>physicalScope.assertCurrent(),undefined,'late predecessor '+row.path);
  assert.throws(()=>make({root:scratch,read:scratchRead}),undefined,'cold predecessor '+row.path);
  writeFileSync(path,current);physicalScope.assertCurrent();
 }
 const target=original.path,last=live.bound.at(-1).path,raw=readFileSync(join(scratch,target));let mutate=false;
 const read=path=>{const value=readFileSync(join(scratch,path));if(mutate&&path===last)writeFileSync(join(scratch,target),Buffer.concat([raw,Buffer.from(' ')]));return value;};
 const scope=make({root:scratch,read});mutate=true;assert.throws(()=>scope.assertCurrent());
 mutate=false;writeFileSync(join(scratch,target),raw);scope.assertCurrent();
}finally{rmSync(scratch,{recursive:true,force:true});}
assert.equal(live.current_read_route_returned,false);assert.equal(live.artifact_or_audit_admission_granted,false);
assert.equal(live.source_judgments_changed,0);assert.equal(live.g11_claim,'not-passed');
console.log(JSON.stringify({result:'pass',programs:3,bound:24,cold_rejections:24,late_rejections:24,recoveries:24,whole_predecessor_bodies_rejected_and_recovered:true,exact_program_source_union:true,self_source_physical_rejected_and_recovered:true,
 caught_reentry_rejected_and_recovered:true,
 unknown_hash_rejected:true,wrong_length_rejected:true,accessor_not_invoked:true,public_metadata_isolated:true,
 physical_cross_member_mutation_rejected:true,historical_code_executed_or_exposed:false,artifact_or_audit_admission_granted:false}));
