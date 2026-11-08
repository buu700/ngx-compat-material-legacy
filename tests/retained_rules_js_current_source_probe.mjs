/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFileSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {retainedRulesJsBuildCurrentSource as make} from '../scripts/retained-rules-js-current-source.mjs';
const root=process.cwd(),physical=path=>readFileSync(join(root,path)),live=make({root,read:physical});
live.assertFresh();
const proposal=live.proposal,current=live.currentProposal;
assert.equal(live.refs.length,1201);
assert.equal(proposal.candidate_context.product_member_count,1142);
assert.equal(current.candidate_context.product_member_count,1120);
assert.deepEqual(current.analysis,proposal.analysis);
assert.deepEqual(current.individual_decisions,proposal.individual_decisions);
assert.equal(current.analysis.original_file_occurrences,135);assert.equal(current.analysis.original_hunks,195);
assert.equal(current.candidate_context.product_members.some(ref=>ref.path==='projects/ngx-material-legacy/legacy-tabs/tab-body-reversal.spec.ts'),true);
assert.equal(current.candidate_context.product_members.filter(ref=>ref.path.endsWith('/internal/common-module.ts')).length,1);
assert.throws(()=>make({root,read:physical,line:'21.x'}));
const targets=[
 'scripts/retained-rules-js-current-source.mjs',
 'compatibility/rc/main-retained-rules-js-current-review-v1.json',
 'compatibility/rc/upstream-rules-js-build-individual-review.json',
 'compatibility/rc/upstream-rules-js-build-subjects.json.gz',
 'scripts/upstream_rules_js_build_scope.py',
 '.bazelrc','BUILD.bazel','WORKSPACE','scripts/pack-library.mjs',
 'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts',
];
for(const target of targets){
 let bad=false;const read=path=>{const raw=physical(path);return path===target&&bad?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const scope=make({root,read});scope.refs.length=0;scope.proposal.canonical_admitted=true;
 scope.currentProposal.analysis.original_hunks=0;scope.currentProposal.candidate_context.product_members.length=0;
 bad=true;assert.throws(()=>scope.assertCurrent(),undefined,'late '+target);assert.throws(()=>make({root,read}),undefined,'cold '+target);
 bad=false;scope.assertCurrent();assert.equal(scope.currentProposal.analysis.original_hunks,195);
}
const spec='projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts';
const before=execFileSync('git',['show','1c4ace0fa7a0e7cc4d3e919f415e05ca5e46f3c0:'+spec],{cwd:root,maxBuffer:2*1024*1024});
assert.throws(()=>make({root,read:path=>path===spec?before:physical(path)}));
// Separate regular copies exercise callbacks that alter physical state; no
// checkout, installed dependency or hardlinked evidence is modified.
const scratch=mkdtempSync(join(tmpdir(),'retained-rules-js-current-'));
try{
 writeFileSync(join(scratch,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim()+'\n');
 for(const ref of live.refs){const path=join(scratch,ref.path);mkdirSync(dirname(path),{recursive:true});copyFileSync(join(root,ref.path),path);}
 for(const ref of Object.values(proposal.candidate_context.installed_peer_manifests)){
  const path=join(scratch,ref.path);mkdirSync(dirname(path),{recursive:true});copyFileSync(join(root,ref.path),path);
 }
 const target=targets[0],last=live.refs.at(-1).path,raw=readFileSync(join(scratch,target));let mutate=false;
 const read=path=>{const value=readFileSync(join(scratch,path));if(mutate&&path===last)writeFileSync(join(scratch,target),Buffer.concat([raw,Buffer.from(' ')]));return value;};
 const scope=make({root:scratch,read});mutate=true;assert.throws(()=>scope.assertCurrent());
 mutate=false;writeFileSync(join(scratch,target),raw);scope.assertCurrent();
 const peer=join(scratch,'node_modules/@angular/cdk/package.json'),peerRaw=readFileSync(peer);
 writeFileSync(peer,Buffer.concat([peerRaw,Buffer.from(' ')]));assert.throws(()=>scope.assertCurrent());
 writeFileSync(peer,peerRaw);scope.assertCurrent();
 // Reintroducing a retired physical member must fail even when Git's cached
 // population has not changed and its content is never requested by a reader.
 const retired=join(scratch,'projects/ngx-material-legacy/legacy-autocomplete/internal/common-module.ts');
 mkdirSync(dirname(retired),{recursive:true});writeFileSync(retired,'// reintroduced fixture\n');
 assert.throws(()=>scope.assertCurrent());rmSync(retired);scope.assertCurrent();
}finally{rmSync(scratch,{recursive:true,force:true});}
console.log(JSON.stringify({result:'pass',individual_source_exclusions:3,original_file_occurrences:135,original_hunks:195,
 historical_members:1142,current_members:1120,bound:1201,cold_rejections:targets.length,late_rejections:targets.length,recoveries:targets.length,
 fresh_complete_analysis_equal:true,public_metadata_isolated:true,historical_source_callback_rejected:true,
 physical_cross_member_mutation_rejected:true,peer_mutation_rejected:true,retired_member_reintroduction_rejected:true,
 runtime_artifact_floor_or_security_qualification:false,g11_claim:live.g11_claim}));
