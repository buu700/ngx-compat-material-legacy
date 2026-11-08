/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFileSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {retainedSelectionMetadataContext as make} from '../scripts/retained-selection-metadata-context.mjs';
import {autocompleteSelectionSourceJudgments} from '../scripts/autocomplete-selection-source-judgment.mjs';
const root=process.cwd(),physical=path=>readFileSync(join(root,path)),live=make({root,read:physical});
assert.equal(live.bound.length,45);assert.equal(live.historicalMembers.length,34);assert.equal(live.currentMembers.length,40);
for(const ref of live.historicalMembers){
 const current=live.currentMembers.find(row=>row.path===ref.path);assert.deepEqual(live.qualifyMetadata(ref),current);
 assert.deepEqual(live.historicalMetadata(current),ref);
 const {bytes,...short}=ref,{bytes:currentBytes,...expected}=current;assert.deepEqual(live.qualifyMetadata(short),expected);
}
for(const ref of live.currentMembers)assert.deepEqual(live.qualifyMetadata(ref),ref);
const original=live.historicalMembers[0],expected=live.qualifyMetadata(original);
assert.throws(()=>live.qualifyMetadata({...original,sha256:'0'.repeat(64)}));
assert.throws(()=>live.qualifyMetadata({...original,bytes:original.bytes+1}));
let accessors=0;assert.throws(()=>live.qualifyMetadata({get path(){accessors++;return original.path;},sha256:original.sha256}));assert.equal(accessors,0);
let proxies=0;assert.throws(()=>live.qualifyMetadata(new Proxy(original,{get(){proxies++;throw Error('proxy invoked');}})));assert.equal(proxies,0);
assert.equal(live.qualifyMetadata({path:'unknown/path.json',sha256:'0'.repeat(64)}),null);
const source=autocompleteSelectionSourceJudgments({root});assert.deepEqual(source.bound,live.currentMembers);
const packet=JSON.parse(physical('compatibility/rc/autocomplete-selection-ledger-successor.json'));
let proofMembers=0;
for(const [index,row]of source.reports.entries()){
 assert.deepEqual(row.body,JSON.parse(physical(packet.entries[index].review.path)));
 const proof=structuredClone(row.proof);
 proof.historical_behavior.source_members=proof.historical_behavior.source_members.map(ref=>{const selected=live.historicalMetadata(ref);assert.ok(selected);proofMembers++;return selected;});
 assert.deepEqual(proof,packet.entries[index].after_entry.individual_proof);
}
source.assertCurrent();live.assertCurrent();
for(const target of live.bound.map(ref=>ref.path)){
 let bad=false;const read=path=>{const raw=physical(path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const scope=make({root,read});scope.bound.length=0;scope.currentMembers.length=0;scope.historicalMembers[0].sha256='0'.repeat(64);
 const selected=scope.qualifyMetadata(original);selected.sha256='0'.repeat(64);
 bad=true;assert.throws(()=>scope.assertCurrent(),undefined,'late '+target);assert.throws(()=>make({root,read}),undefined,'cold '+target);
 bad=false;scope.assertCurrent();assert.deepEqual(scope.qualifyMetadata(original),expected);
}
const scratch=mkdtempSync(join(tmpdir(),'retained-selection-context-'));
try{
 writeFileSync(join(scratch,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim()+'\n');
 for(const ref of live.bound){const path=join(scratch,ref.path);mkdirSync(dirname(path),{recursive:true});copyFileSync(join(root,ref.path),path);}
 const target=original.path,last=live.bound.at(-1).path,raw=readFileSync(join(scratch,target));let mutate=false;
 const read=path=>{const value=readFileSync(join(scratch,path));if(mutate&&path===last)writeFileSync(join(scratch,target),Buffer.concat([raw,Buffer.from(' ')]));return value;};
 const scope=make({root:scratch,read});mutate=true;assert.throws(()=>scope.assertCurrent());
 mutate=false;writeFileSync(join(scratch,target),raw);scope.assertCurrent();
}finally{rmSync(scratch,{recursive:true,force:true});}
assert.equal(live.historical_code_executed_or_exposed,false);assert.equal(live.source_judgments_changed,0);
assert.equal(live.artifact_or_audit_admission_granted,false);assert.equal(live.g11_claim,'not-passed');
console.log(JSON.stringify({result:'pass',historical_members:34,current_members:40,bound:45,cold_rejections:45,late_rejections:45,recoveries:45,
 actual_source_bound_equal:true,unchanged_report_bodies:3,exact_historical_proof_projections:3,projected_member_occurrences:proofMembers,
 unknown_hash_rejected:true,wrong_length_rejected:true,accessor_not_invoked:true,proxy_not_invoked:true,public_metadata_isolated:true,
 physical_cross_member_mutation_rejected:true,historical_code_executed_or_exposed:false,artifact_or_audit_admission_granted:false}));
