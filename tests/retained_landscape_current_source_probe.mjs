/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFileSync,mkdirSync,mkdtempSync,readFileSync,renameSync,rmSync,symlinkSync,unlinkSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {retainedLandscapeProgramSource as programs} from '../scripts/retained-landscape-program-source.mjs';
import {autocompleteLandscapeSourceJudgment as make,AUTOCOMPLETE_LANDSCAPE_REVIEW} from '../scripts/autocomplete-landscape-source-judgment.mjs';
const root=process.cwd(),physical=path=>readFileSync(join(root,path)),program=programs({root,read:physical});
assert.equal(program.bound.length,13);assert.equal(program.transitions.length,2);
for(const row of program.transitions){
 assert.deepEqual(program.qualifyMetadata(row.before),row.after);assert.deepEqual(program.qualifyMetadata(row.after),row.after);
 assert.throws(()=>program.qualifyMetadata({...row.before,sha256:'0'.repeat(64)}));
 assert.throws(()=>program.qualifyMetadata({...row.before,bytes:row.before.bytes+1}));
}
let accessors=0;assert.throws(()=>program.qualifyMetadata({get path(){accessors++;return program.transitions[0].path;},sha256:'0'.repeat(64)}));assert.equal(accessors,0);
for(const target of program.bound.map(ref=>ref.path)){
 let bad=false;const read=path=>{const raw=physical(path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const live=programs({root,read});bad=true;assert.throws(()=>live.assertCurrent());assert.throws(()=>programs({root,read}));bad=false;live.assertCurrent();
}
const source=make({root,read:physical}),expected=JSON.parse(physical(AUTOCOMPLETE_LANDSCAPE_REVIEW));
assert.deepEqual(source.body,expected);assert.equal(source.body_is_historical_metadata,true);
assert.equal(source.bound.length,69);assert.equal(source.current_matrix_obligation_count,2334);
assert.equal(source.current_diagnostic.floors.length,2);
assert.ok(source.current_diagnostic.floors.every(row=>row.cases.length===7&&row.cases.every(item=>item.result==='pass')));
assert.equal(source.current_diagnostic.mutants.length,6);assert.ok(source.current_diagnostic.mutants.every(row=>row.result==='rejected'));
const sourceRef=source.bound.find(ref=>ref.path===source.current_diagnostic.source.path);assert.equal(sourceRef.sha256,source.current_diagnostic.source.sha256);
assert.equal(source.proof.historical_behavior.source_members.length,22);
assert.throws(()=>make({root,read:physical,line:'21.x'}));
const sourceTargets=source.bound.map(ref=>ref.path);
for(const target of sourceTargets){
 let bad=false;const read=path=>{const raw=physical(path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const live=make({root,read});
 // Body metadata and bound descriptors used to expose private binding objects.
 // Editing copies must leave the real source guard and its identities intact.
 live.body.diagnostic.sha256='0'.repeat(64);live.body.original_source_intake.sha256='0'.repeat(64);
 live.current_diagnostic.source.sha256='0'.repeat(64);live.bound.forEach(ref=>ref.sha256='0'.repeat(64));
 bad=true;assert.throws(()=>live.assertExternal(),undefined,'late '+target);assert.throws(()=>make({root,read}),undefined,'cold '+target);
 bad=false;live.assertExternal();
}
// No hardlinks, checkout files, installed dependencies or old reports are
// modified by physical callback controls. Only these owned scratch copies vary.
const scratch=mkdtempSync(join(tmpdir(),'retained-landscape-current-'));
try{
 writeFileSync(join(scratch,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim()+'\n');
 for(const ref of source.bound){const path=join(scratch,ref.path);mkdirSync(dirname(path),{recursive:true});copyFileSync(join(root,ref.path),path);}
 const peerRoot=execFileSync('realpath',[join(root,'node_modules/@angular/cdk')],{encoding:'utf8'}).trim();
 const identities=JSON.parse(physical('compatibility/rc/autocomplete-landscape-cdk-sources/identities.json')).find(row=>row.line==='main');
 for(const path of ['package.json',...identities.members.map(row=>row.archive_member.replace(/^package\//,''))]){
  const target=join(scratch,'node_modules/@angular/cdk',path);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(peerRoot,path),target);
 }
 const peerDirectory=join(scratch,'node_modules/@angular/cdk'),savedPeer=join(scratch,'saved-peer'),replacementPeer=join(scratch,'replacement-peer');
 for(const path of ['package.json',...identities.members.map(row=>row.archive_member.replace(/^package\//,''))]){
  const target=join(replacementPeer,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(peerRoot,path),target);
 }
 const target='scripts/autocomplete-landscape-source-judgment.mjs',last=source.bound.at(-1).path,raw=readFileSync(join(scratch,target));let mutate=false,retarget=false;
 const read=path=>{const value=readFileSync(join(scratch,path));if(mutate&&path===last)writeFileSync(join(scratch,target),Buffer.concat([raw,Buffer.from(' ')]));
  if(retarget&&path===last){retarget=false;renameSync(peerDirectory,savedPeer);symlinkSync(replacementPeer,peerDirectory,'dir');}return value;};
 const live=make({root:scratch,read});mutate=true;assert.throws(()=>live.assertExternal());
 mutate=false;writeFileSync(join(scratch,target),raw);live.assertExternal();
 const peer=join(scratch,'node_modules/@angular/cdk/package.json'),peerRaw=readFileSync(peer);
 writeFileSync(peer,Buffer.concat([peerRaw,Buffer.from(' ')]));assert.throws(()=>live.assertExternal());writeFileSync(peer,peerRaw);live.assertExternal();
 retarget=true;assert.throws(()=>live.assertExternal(),/late installed landscape peer resolution change/);
 unlinkSync(peerDirectory);renameSync(savedPeer,peerDirectory);live.assertExternal();
}finally{rmSync(scratch,{recursive:true,force:true});}
console.log(JSON.stringify({result:'pass',program_bound:13,programs:2,program_cold_rejections:13,program_late_rejections:13,program_recoveries:13,
 current_source_bound:69,source_cold_rejections:69,source_late_rejections:69,source_recoveries:69,
 historical_report_body_equal:true,current_matrix_obligations:2334,current_cases_each_minimum:7,retained_minimums:2,behavioral_mutants_rejected:6,
 exact_native_source_members:22,unknown_hash_rejected:true,wrong_length_rejected:true,accessor_not_invoked:true,public_metadata_isolated:true,
 physical_cross_member_mutation_rejected:true,installed_peer_mutation_rejected:true,late_peer_retarget_rejected:true,
 actual_native_browser_artifact_or_floor_executed:false,g11_claim:'not-passed'}));
