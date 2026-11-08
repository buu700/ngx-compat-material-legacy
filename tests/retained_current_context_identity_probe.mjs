/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {retainedCurrentContextIdentity as make} from '../scripts/retained-current-context-identity.mjs';

const root=process.cwd(),physical=path=>readFileSync(join(root,path)),live=make({root,read:physical});
assert.equal(live.products.length,1120);assert.equal(live.inputs.length,68);
assert.deepEqual(live.beforeContexts.map(row=>row.products.length),[1142,1143,1142]);
const currentByPath=new Map([...live.products,...live.inputs].map(ref=>[ref.path,ref]));
for(const profile of live.beforeContexts){
 assert.equal(profile.retired_paths.length,23);
 for(const ref of [...profile.products,...profile.inputs]){
  const result=live.resolveReference(ref),current=currentByPath.get(ref.path);
  assert.deepEqual(result,current?{kind:'current',reference:current}:{kind:'retired',historical:ref});
 }
}
const before=live.beforeContexts[0],retired=before.products.find(ref=>before.retired_paths.includes(ref.path));
const changed=before.products.find(ref=>!before.retired_paths.includes(ref.path)&&live.resolveReference(ref).reference.sha256!==ref.sha256);
const added=live.products.find(ref=>ref.path.endsWith('/tab-body-reversal.spec.ts'));
assert.ok(changed);assert.ok(added);assert.deepEqual(live.resolveReference(added),{kind:'current',reference:added});
assert.equal(live.resolveReference({path:'not/a/known/source',sha256:'0'.repeat(64)}),null);
assert.throws(()=>live.resolveReference({...changed,sha256:'0'.repeat(64)}));
assert.throws(()=>live.resolveReference({...changed,bytes:changed.bytes+1}));
let accessorCalls=0;
assert.throws(()=>live.resolveReference({get path(){accessorCalls++;return changed.path;},sha256:changed.sha256}));
assert.equal(accessorCalls,0);
const targets=[live.bound[0].path,live.bound[1].path,...live.beforeContexts.map(row=>row.report.path),changed.path,added.path,'flake.nix','.github/workflows/ci.yml'];
assert.equal(new Set(targets).size,targets.length);
for(const target of targets){
 let bad=false;
 const read=path=>{const raw=physical(path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const scope=make({root,read});
 scope.bound.length=0;scope.products.length=0;scope.inputs.length=0;scope.beforeContexts[0].products.length=0;
 const metadata=scope.resolveReference(changed);metadata.reference.sha256='0'.repeat(64);
 bad=true;assert.throws(()=>scope.assertCurrent(),undefined,'late '+target);
 assert.throws(()=>make({root,read}),undefined,'cold '+target);
 bad=false;scope.assertCurrent();assert.deepEqual(scope.resolveReference(changed),live.resolveReference(changed));
}

// Use independent copies for physical/membership mutations. The .git pointer
// permits read-only object/index queries; no shared checkout file is changed.
const scratch=mkdtempSync(join(tmpdir(),'retained-context-identity-probe-'));
try{
 const gitdir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();
 writeFileSync(join(scratch,'.git'),'gitdir: '+gitdir+'\n');
 for(const ref of live.bound){const target=join(scratch,ref.path);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(root,ref.path),target);}
 const read=path=>readFileSync(join(scratch,path));
 const clone=make({root:scratch,read});
 const extra='projects/ngx-material-legacy/context-membership-probe.tmp';
 writeFileSync(join(scratch,extra),'probe',{flag:'wx'});
 assert.throws(()=>clone.assertCurrent());rmSync(join(scratch,extra));clone.assertCurrent();
 const retiredPath=join(scratch,retired.path);assert.equal(existsSync(retiredPath),false);
 mkdirSync(dirname(retiredPath),{recursive:true});writeFileSync(retiredPath,'probe',{flag:'wx'});
 assert.throws(()=>clone.assertCurrent());rmSync(retiredPath);clone.assertCurrent();
 const changedPath=join(scratch,changed.path),original=read(changed.path);
 rmSync(changedPath);assert.throws(()=>clone.assertCurrent());writeFileSync(changedPath,original);clone.assertCurrent();
 // A callback for the final report changes a member already observed. Only a
 // complete callback-free closing sweep can reject that mixed source image.
 const last=live.bound.at(-1).path;let mutate=false;
 const lateRead=path=>{const raw=read(path);if(mutate&&path===last)writeFileSync(changedPath,Buffer.concat([original,Buffer.from(' ')]));return raw;};
 const late=make({root:scratch,read:lateRead});mutate=true;
 assert.throws(()=>late.assertCurrent());
 mutate=false;writeFileSync(changedPath,original);late.assertCurrent();
}finally{rmSync(scratch,{recursive:true,force:true});}
assert.equal(live.current_source_admission_granted,false);assert.equal(live.source_judgments_requalified,false);
assert.equal(live.current_source_reader_returned,false);assert.equal(live.g11_claim,'not-passed');
console.log(JSON.stringify({result:'pass',products:1120,inputs:68,before_contexts:3,retired_paths:23,
 cold_rejections:targets.length,late_rejections:targets.length,recovery:targets.length,
 unknown_hash_rejected:true,wrong_length_rejected:true,accessor_not_invoked:true,public_metadata_isolated:true,
 extra_missing_retired_members_rejected:true,cross_member_physical_mutation_rejected:true,source_or_audit_admission_granted:false}));
