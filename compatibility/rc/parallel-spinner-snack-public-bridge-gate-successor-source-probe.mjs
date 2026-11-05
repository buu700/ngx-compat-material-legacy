/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
 */
/** Finite tool-source controls. No gate, compiler, installer, or old program runs. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const roots={'21.x':process.cwd(),main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'},P='compatibility/rc/parallel-spinner-snack-public-bridge-gate-successor-',MF='compatibility/rc/historical-contract-repair-reader-inputs.json',SELF='scripts/historical-contract-repair-readers.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),positive=[],rejected=[],fixtures=[];
for(const [line,root]of Object.entries(roots)){
 const read=p=>readFileSync(join(root,p)),data=JSON.parse(read(MF)),api=await import(pathToFileURL(join(root,SELF))),gate=data.gate_tool_successor;
 assert.ok(gate);assert.equal(data.tool_transitions.length,line==='21.x'?45:17);assert.equal(data.support_inputs.length,4);
 let altered=null;const callback=p=>{const raw=read(p);return p===altered?Buffer.concat([raw,Buffer.from('\n/* nonphysical callback */')]):raw;};
 const subject=api.historicalContractRepairReaderSubject({root,read:callback});positive.push(line+'/actual-subject');
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};for(const n of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[n];
 const raw=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',gate.prior_reader_registry.source_parent+':'+MF],{cwd:root,env,maxBuffer:1024*1024}),prior=JSON.parse(raw);assert.equal(hash(raw),gate.prior_reader_registry.sha256);assert.equal(raw.length,gate.prior_reader_registry.bytes);
 assert.equal(prior.tool_transitions.length,line==='21.x'?39:11);assert.deepEqual(data.support_inputs.slice(0,2),prior.support_inputs);
 for(let i=0;i<prior.tool_transitions.length;i++){
  const old=prior.tool_transitions[i],next=data.tool_transitions[i];
  if(line==='21.x'&&old.path==='tests/test_historical_contract_repair_source.py'){
   assert.deepEqual(next.before,old.before);assert.deepEqual(next.literal_edits.slice(0,old.literal_edits.length),old.literal_edits);assert.deepEqual({...next,after:old.after,literal_edits:old.literal_edits},old);
  }else assert.deepEqual(next,old);
 }
 positive.push(line+'/prior-rows-preserved-with-only-exact-test-rollforward');
 for(const row of data.tool_transitions)for(const side of ['before','after'])for(const size of [false,true]){
  const ref={path:row.path,sha256:row[side].sha256,...(size?{bytes:row[side].bytes}:{}),root:3,role:'historical-tool-comparison'},saved=structuredClone(ref);
  const result=subject.qualify(ref);assert.deepEqual(ref,saved);assert.deepEqual(result,{...saved,sha256:row.after.sha256,...(size?{bytes:row.after.bytes}:{})});
  const bytes=subject.comparisonBytes(ref);assert.equal(hash(bytes),row[side].sha256);assert.equal(bytes.length,row[side].bytes);positive.push(line+'/'+row.path+'/'+side+'/'+size);
 }
 for(const row of data.tool_transitions){
  assert.equal(subject.qualify({path:row.path,sha256:'0'.repeat(64)}),null);assert.throws(()=>subject.comparisonBytes({path:row.path,sha256:'0'.repeat(64)}));
  assert.throws(()=>subject.qualify({path:row.path,...row.before,bytes:row.before.bytes+1}));rejected.push(line+'/'+row.path+'/wrong-hash-size');
 }
 const unknown={path:'scripts/unknown-spinner-snack-tool.mjs',sha256:'0'.repeat(64),root:3,role:'unknown'};assert.equal(subject.qualify(unknown),null);assert.equal(subject.ownsReference(unknown),false);assert.throws(()=>subject.comparisonBytes(unknown));positive.push(line+'/unknown-outside-scope');
 const paths=[...gate.added_tool_paths,...data.support_inputs.map(r=>r.path),MF];
 for(const path of paths){
  assert.throws(()=>api.historicalContractRepairReaderSubject({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)}));rejected.push(line+'/cold-nonphysical/'+path);
  altered=path;assert.throws(subject.assertCurrent);altered=null;subject.assertCurrent();rejected.push(line+'/late-nonphysical/'+path);
 }
 const fixture=mkdtempSync(join(root,P+'fixture-'));
 try{
  for(const row of subject.bound){const dest=join(fixture,row.path);mkdirSync(dirname(dest),{recursive:true});copyFileSync(join(root,row.path),dest);}
  const fixtureRead=p=>readFileSync(join(fixture,p)),restored=()=>api.historicalContractRepairReaderSubject({root:fixture,read:fixtureRead});restored();
  for(const path of [...gate.added_tool_paths,...data.support_inputs.map(r=>r.path)]){
   const file=join(fixture,path),before=readFileSync(file);writeFileSync(file,Buffer.concat([before,Buffer.from('\n/* owned fixture mutant */')]));assert.throws(restored);writeFileSync(file,before);
   const live=restored();writeFileSync(file,Buffer.concat([before,Buffer.from('\n/* late owned fixture mutant */')]));assert.throws(live.assertCurrent);writeFileSync(file,before);restored().assertCurrent();rejected.push(line+'/actual-physical-cold-and-late/'+path);
  }
  fixtures.push({line,current_bound_files_copied:subject.bound.length,cold_late_physical_files_mutated:gate.added_tool_paths.length+data.support_inputs.length,all_restored:true,no_existing_file_mutations:true});
 }finally{assert.ok(fixture.startsWith(join(root,P+'fixture-')));rmSync(fixture,{recursive:true});}
 subject.transitions.length=0;subject.bound.length=0;subject.assertCurrent();positive.push(line+'/returned-clones-do-not-steer-guards');
}
const out={schema_version:1,result:'pass',positive,rejected,counts:{positive:positive.length,rejected:rejected.length},fixtures,current_source_callbacks_are_physical:true,old_program_or_compiler_or_gate_executed:false,full_owner_executed:false,original_profile_report_goldens_edited:false,canonical_dispositions_changed:0,g11_claim:'not-passed'};
writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(out.counts));
