/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact historical source graphs with a separate mandatory current coherence guard. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {delimiter,dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const HISTORICAL_REPLAY_INPUTS='compatibility/rc/historical-source-replay-inputs.json';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pins={main:'732d549711921f4d961140d2cb516c7a709fba9f0998d9c1482f6f98566fa8d2','21.x':'f5c9f9679791d1c0ebc7c246f113de1bd6895cc9169b1035ab6f818c85150067'};
const ids=['historical-menu-import','historical-menu-import-admission','menu-exit-context','selection-comparator-source','native-admission-source','tab-lifecycle-source',
 'native-individual-source','native-individual-admission','spec-fixture-context',
 'small-spec-source','followup-spec-source','peer-spec-source','control-case-context',
 'control-test-source','render-setup-source','theme-date-source','test-environment-zone-source','standalone-environment-source',
 'stability-chip-method','stability-chip-context','wide-fixture-adapter-context','historical-native-admission','test-consolidation-source','deferred-control-upstream-source','native-date-context-source','recorded-execution-source-context'];
// These six versioned replay-tool members are checked against the caller HEAD,
// separately from the qualified product/review context. Comparing the registry
// and its own verifier to that older context would require self-referential hashes.
// They remain mandatory clean Git subjects; no product, receipt or original probe
// is admitted through this tooling-only route.
const toolingPaths=['scripts/historical-source-replay.mjs','scripts/run-historical-source-probe.mjs',HISTORICAL_REPLAY_INPUTS,
 'tests/historical_source_replay_probe.mjs','tests/test_historical_source_replay.py','compatibility/rc/historical-source-replay.md'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const successorPaths=['tests/test_native_date_source_context.py','tests/test_recorded_execution_source_context.py'];
const olderRegistry='compatibility/rc/older-audit-history-inputs.json';
const blobHash=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
function environment(){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
 return env;
}
const gitArgs=args=>['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args];
const git=(root,args,options={})=>execFileSync('git',gitArgs(args),{cwd:root,env:environment(),maxBuffer:16*1024*1024,...options});
function relativePath(path){assert.equal(typeof path,'string');assert.ok(!path.includes('\\')&&!path.startsWith('/')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&part!=='.git'),'unsafe historical member path');return path;}
export function historicalReplayInputs({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path))),bytes=read(HISTORICAL_REPLAY_INPUTS),data=JSON.parse(bytes);
 assert.ok(Object.hasOwn(pins,data.line),'unregistered historical line');assert.equal(hash(bytes),pins[data.line],'historical replay input changed');
 assert.equal(data.schema_version,12);assert.deepEqual(data.entries.map(row=>row.id),ids);assert.equal(new Set(data.entries.map(row=>row.probe)).size,26);
 assert.deepEqual(data.current_wrapper_successors.map(row=>row.path),successorPaths);
 assert.deepEqual(data.mutable_progress_paths,['compatibility/rc/remaining-native-admission-worksheet.json','compatibility/rc/session-handoff.json']);
 assert.deepEqual(data.current_head_tooling_paths,toolingPaths);
 for(const entry of data.entries)assert.equal(entry.report_option,['tab-lifecycle-source','native-individual-source','native-individual-admission','spec-fixture-context','small-spec-source','followup-spec-source','peer-spec-source','control-case-context','control-test-source','render-setup-source','theme-date-source','test-environment-zone-source','standalone-environment-source','stability-chip-method','stability-chip-context'].includes(entry.id)?'--out':undefined,'historical report invocation changed');
 for(const entry of data.entries)assert.equal(entry.report_source,entry.id==='wide-fixture-adapter-context'?'stdout-json':undefined,'historical report channel changed');
 assert.equal(data.wrapper_edits.length,23);assert.equal(new Set(data.wrapper_edits.map(row=>row.path)).size,23);
 assert.match(data.wrapper_reference_commit,/^[0-9a-f]{40}$/);for(const wrapper of data.wrapper_edits)if(wrapper.reference_commit!==undefined)assert.match(wrapper.reference_commit,/^[0-9a-f]{40}$/);
 assert.equal(data.original_js_programs_and_assertions_unchanged,true);assert.equal(data.new_sha_or_authored_use_closures,0);
 return data;
}
export function historicalFrameMembers(root,frame){
 assert.match(frame.commit,/^[0-9a-f]{40}$/);assert.match(frame.tree,/^[0-9a-f]{40}$/);
 assert.equal(git(root,['rev-parse',frame.commit+'^{tree}']).toString().trim(),frame.tree,'historical tree identity changed');
 const bytes=git(root,['ls-tree','-rz',frame.commit]);assert.equal(hash(bytes),frame.tree_listing_sha256,'historical tree listing changed');
 const members=bytes.toString().split('\0').filter(Boolean).map(record=>{
  const[metadata,path]=record.split('\t'),[mode,kind,blob]=metadata.split(' ');relativePath(path);assert.equal(kind,'blob');assert.ok(['100644','100755'].includes(mode),'unsupported historical member mode');assert.match(blob,/^[0-9a-f]{40}$/);
  return {path,mode,blob};
 });assert.equal(members.length,frame.members);assert.equal(new Set(members.map(row=>row.path)).size,members.length);return members;
}
function sourceFiles(root,prefix){
 const paths=[];
 function visit(relative){for(const entry of readdirSync(resolve(root,relative),{withFileTypes:true})){
  const path=relative+'/'+entry.name;if(entry.name==='node_modules')continue;
  assert.ok(!entry.isSymbolicLink(),'symlink in current product route '+path);
  if(entry.isDirectory())visit(path);else if(entry.isFile())paths.push(path);else assert.fail('non-file in current product route '+path);
 }}visit(prefix);return paths.sort();
}
/** Two finite wrapper transitions; their original records and assertions are
 * still authenticated above. No current-HEAD source exception is introduced. */
function currentWrapperSuccessors(root,data,members,read){
 const memberMap=new Map(members.map(m=>[m.path,m]));assert.ok(memberMap.has(olderRegistry),'missing successor source registry');
 const raw=read(olderRegistry),captured=git(root,['show',data.current_frame.commit+':'+olderRegistry]);
 assert.ok(raw.equals(captured),'current wrapper successor registry changed');
 const inputs=JSON.parse(raw);assert.equal(inputs.line,data.line);assert.equal(inputs.module_count,20);assert.equal(inputs.case_count,50);
 const stored=read(inputs.prior.path);assert.equal(hash(stored),inputs.prior.sha256,'wrapper successor prior changed');
 const priorBytes=gunzipSync(stored);assert.equal(hash(priorBytes),inputs.prior.raw_sha256);const prior=JSON.parse(priorBytes);
 const result=new Map(),expected=[];
 for(const path of successorPaths){
  const wrapper=data.wrapper_edits.find(w=>w.path===path),entry=inputs.entries.find(e=>e.program===path),before=prior.preimages.find(m=>m.path===path);
  assert.ok(wrapper&&entry&&before&&memberMap.has(path));assert.equal(hash(before.text),before.sha256);assert.equal(before.sha256,wrapper.after_sha256);
  const original=git(root,['show',inputs.frame.commit+':'+path]);assert.equal(hash(original),entry.program_sha256);assert.equal(hash(original),wrapper.after_sha256);
  const current=git(root,['show',data.current_frame.commit+':'+path]);assert.equal(hash(current),entry.wrapper_sha256);
  expected.push({path,original_wrapper_record_sha256:hash(JSON.stringify(wrapper)),original_after_sha256:wrapper.after_sha256,
   current_sha256:entry.wrapper_sha256,originals_registry:{path:olderRegistry,sha256:hash(raw)},
   original_program:{commit:inputs.frame.commit,sha256:entry.program_sha256},source_scope_only:true,actual_native_or_packed_qualified:false});
  result.set(path,{bytes:current,sha256:entry.wrapper_sha256});
 }
 assert.deepEqual(data.current_wrapper_successors,expected,'unregistered wrapper successor identity');return result;
}
export function verifyHistoricalCurrentSubjects({root=rootDefault,data,members,readMember,productPaths}={}){
 const read=readMember||((path)=>{let cursor=root;assert.ok(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink());for(const part of path.split('/')){cursor=join(cursor,part);assert.ok(!lstatSync(cursor).isSymbolicLink(),'symlink in current source route '+path);}assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);}),mutable=new Set(data.mutable_progress_paths),wrappers=new Map(data.wrapper_edits.map(row=>[row.path,row]));
 const currentByPath=new Map(members.map(row=>[row.path,row])),tooling=new Set(toolingPaths),successors=currentWrapperSuccessors(root,data,members,read);let guarded=0;
 for(const member of members){
  if(mutable.has(member.path)||tooling.has(member.path))continue;
  const bytes=read(member.path),wrapper=wrappers.get(member.path);
  if(wrapper){
   const original=git(root,['show',(wrapper.reference_commit||data.wrapper_reference_commit)+':'+member.path]);assert.equal(hash(original),wrapper.before_sha256);
   let proposed=original.toString();for(const edit of wrapper.edits){assert.equal(proposed.split(edit.before).length,2,'wrapper edit not exact');proposed=proposed.replace(edit.before,edit.after);}
   assert.equal(hash(proposed),wrapper.after_sha256);
   const successor=successors.get(member.path);
   assert.ok([blobHash(original),blobHash(Buffer.from(proposed)),...(successor?[blobHash(successor.bytes)]:[])].includes(member.blob),'registered wrapper base changed');
   assert.ok([wrapper.before_sha256,wrapper.after_sha256,...(successor?[successor.sha256]:[])].includes(hash(bytes)),'current historical-replay wrapper changed '+member.path);
  }else assert.equal(blobHash(bytes),member.blob,'current historical-replay subject changed '+member.path);
  guarded++;
 }
 const toolingCommit=git(root,['rev-parse','HEAD']).toString().trim(),toolingTree=git(root,['rev-parse',toolingCommit+'^{tree}']).toString().trim();
 for(const path of toolingPaths){
  assert.ok(currentByPath.has(path),'registered tooling member missing from source frame');
  const original=git(root,['show',toolingCommit+':'+path]);
  assert.ok(read(path).equals(original),'current historical-replay tooling changed '+path);guarded++;
 }
 for(const wrapper of wrappers.keys())assert.ok(currentByPath.has(wrapper));
 const product=members.filter(row=>row.path.startsWith('projects/ngx-material-legacy/')).map(row=>row.path).sort();
 assert.deepEqual(productPaths||sourceFiles(root,'projects/ngx-material-legacy'),product,'current product membership changed');
 for(const entry of data.entries){assert.equal(hash(read(entry.probe)),entry.probe_sha256,'original historical probe changed');assert.ok(currentByPath.has(entry.probe));}
 return {line:data.line,guarded_current_members:guarded,current_product_members:product.length,
  current_tooling_members:toolingPaths.length,tooling_reference:{commit:toolingCommit,tree:toolingTree},
  exact_wrapper_edits_only:true,authenticated_current_wrapper_successors:successors.size,mutable_progress_paths:[...mutable],current_source_qualification:false,current_native_or_packed_qualification:false};
}
export function inspectHistoricalReplayCurrent({root=rootDefault,readMember,productPaths}={}){
 const data=historicalReplayInputs({root,readMember}),members=historicalFrameMembers(root,data.current_frame);
 return {data,members,guard:verifyHistoricalCurrentSubjects({root,data,members,readMember,productPaths})};
}
function regularTree(root,members){
 const files=[];
 function visit(relative=''){for(const entry of readdirSync(resolve(root,relative),{withFileTypes:true})){
  const path=relative?relative+'/'+entry.name:entry.name;assert.ok(!entry.isSymbolicLink(),'historical graph contains a symlink');
  if(entry.isDirectory())visit(path);else{assert.ok(entry.isFile());files.push(path);}
 }}visit();assert.deepEqual(files.sort(),members.map(row=>row.path).sort(),'incomplete historical file graph');
 let bytes=0;for(const member of members){const value=readFileSync(resolve(root,member.path));assert.equal(blobHash(value),member.blob,'historical member changed '+member.path);bytes+=value.length;}return bytes;
}
function completion(child){return new Promise((done,fail)=>{child.once('error',fail);child.once('close',(code,signal)=>done({code,signal}));});}
async function extractFrame(root,frame,target){
 const archive=spawn('git',gitArgs(['archive','--format=tar',frame.commit]),{cwd:root,env:environment(),stdio:['ignore','pipe','pipe']});
 const tar=spawn('tar',['-xf','-','-C',target],{env:environment(),stdio:['pipe','ignore','pipe']});
 let archiveError='',tarError='';archive.stderr.on('data',bytes=>{archiveError=(archiveError+bytes).slice(-4000);});tar.stderr.on('data',bytes=>{tarError=(tarError+bytes).slice(-4000);});
 tar.stdin.on('error',()=>{});archive.stdout.pipe(tar.stdin);
 try{const[packed,extracted]=await Promise.all([completion(archive),completion(tar)]);assert.equal(packed.code,0,'historical archive failed '+archiveError);assert.equal(extracted.code,0,'historical extraction failed '+tarError);}
 finally{if(archive.exitCode===null)archive.kill('SIGTERM');if(tar.exitCode===null)tar.kill('SIGTERM');}
}
function dependencyRoot(root){
 const candidates=[join(root,'node_modules'),...(process.env.NODE_PATH||'').split(delimiter).filter(Boolean)];
 for(const candidate of candidates)if(existsSync(candidate)&&lstatSync(candidate).isDirectory())return candidate;
 // pnpm workspace roots can themselves be links.
 for(const candidate of candidates)if(existsSync(candidate))return candidate;
 assert.fail('Historical source replay needs the already installed workspace dependencies; no installer is run');
}
export async function runHistoricalSourceProbe({root=rootDefault,id,reportPath}={}){
 assert.ok(ids.includes(id),'unregistered historical probe');
 const started=Date.now(),{data,members:currentMembers,guard}=inspectHistoricalReplayCurrent({root});
 const entry=data.entries.find(row=>row.id===id);assert.ok(entry,'unregistered historical probe');
 const members=historicalFrameMembers(root,entry.frame);assert.equal(hash(git(root,['show',entry.frame.commit+':'+entry.probe])),entry.probe_sha256);
 const parent=mkdtempSync(join(tmpdir(),'ngx-historical-source-')),checkout=join(parent,'checkout');mkdirSync(checkout);
 let report;
 try{
  await extractFrame(root,entry.frame,checkout);const historicalBytes=regularTree(checkout,members);
  const common=resolve(root,git(root,['rev-parse','--git-common-dir']).toString().trim());
  git(checkout,['init','-q','--object-format=sha1']);writeFileSync(join(checkout,'.git/objects/info/alternates'),join(common,'objects')+'\n');writeFileSync(join(checkout,'.git/HEAD'),entry.frame.commit+'\n');git(checkout,['read-tree',entry.frame.commit]);
  symlinkSync(dependencyRoot(root),join(checkout,'node_modules'),'dir');writeFileSync(join(checkout,'.git/info/exclude'),'/node_modules/\n');
  assert.equal(git(checkout,['status','--porcelain','--untracked-files=all']).toString(),'','historical graph is dirty before execution');
  const diagnostic=join(parent,'original-report.json'),env=environment();
  env.NODE_PATH=[join(root,'node_modules'),...(env.NODE_PATH||'').split(delimiter).filter(Boolean)].join(delimiter);
  const child=spawn(process.execPath,[entry.probe,...(entry.report_option?[entry.report_option]:[]),diagnostic],{cwd:checkout,env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='',timedOut=false;
  child.stdout.on('data',bytes=>{stdout+=bytes;if(stdout.length>4*1024*1024)child.kill('SIGTERM');});child.stderr.on('data',bytes=>{stderr=(stderr+bytes).slice(-4*1024*1024);});
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');},entry.timeout_ms);
  let finished;try{finished=await completion(child);}finally{clearTimeout(timer);}
  const postStatus=git(checkout,['status','--porcelain','--untracked-files=all']).toString();
  // One fixed original program reports JSON on stdout. Preserve that program's
  // complete assertions/interface; the prior twenty retain their file reports.
  let original;
  if(entry.report_source==='stdout-json'){
   assert.equal(entry.id,'wide-fixture-adapter-context');assert.equal(existsSync(diagnostic),false,'unexpected adapter report file');
   original=JSON.parse(stdout);
   assert.equal(original.qualified_entries,13);assert.equal(original.unrelated_rows_preserved,1684);
   assert.equal(original.scope_rejection_controls,7);assert.equal(original.native_rejection_controls,15);
   assert.equal(original.all1697_verdicts_unchanged,true);assert.equal(original.actual_Angular_native_artifact_or_floor_qualified,false);
  }else original=existsSync(diagnostic)?JSON.parse(readFileSync(diagnostic)):null;
  if(entry.id==='test-consolidation-source'){assert.equal(original?.subjects,32);assert.equal(original.negative_controls,25);assert.equal(original.retained_historical_sources,12);assert.equal(original.actual_original_tests_or_product_runtime_executed,false);}
  if(entry.id==='deferred-control-upstream-source'){assert.equal(original?.reviewed_SHAs,80);assert.equal(original.controls.length,12);assert.equal(original.native_or_packed_or_full_floors_qualified,false);}
  if(original){assert.equal(original.line,data.line,'historical report line changed');assert.notEqual(original.g11_claim,'passed');for(const flag of ['actual_native_packed_or_floor_qualified','native_or_packed_qualified','packed_or_native_qualified'])assert.notEqual(original[flag],true,'historical probe claimed runtime qualification');}
  // Recheck the caller graph after the original program runs. It was never replaced.
  const after=verifyHistoricalCurrentSubjects({root,data,members:currentMembers});assert.deepEqual(after,guard);
  report={schema_version:1,line:data.line,inputs_sha256:hash(readFileSync(resolve(root,HISTORICAL_REPLAY_INPUTS))),helper_sha256:hash(readFileSync(resolve(root,'scripts/historical-source-replay.mjs'))),cli_sha256:hash(readFileSync(resolve(root,'scripts/run-historical-source-probe.mjs'))),probe_id:id,probe:entry.probe,probe_sha256:entry.probe_sha256,frame:entry.frame,
   historical_members_verified:members.length,historical_bytes_verified:historicalBytes,complete_original_program_unchanged:true,
   current_guard:guard,current_guard_passed_before_and_after:true,exit_code:finished.code,signal:finished.signal,timed_out:timedOut,
   original_stdout:stdout,original_stderr:stderr,original_report:original,historical_post_execution_clean:postStatus==='',
   node:process.version,typescript:createRequire(import.meta.url)('typescript').version,elapsed_ms:Date.now()-started,
   source_scope:'Historical source model and its original rejection controls only. Current source/runtime, application, compiler, Node/RxJS and peer floors require their own gates.',
   actual_current_source_or_native_or_packed_qualified:false,g11_claim:'not-passed',temporary_graph_removed:false};
  assert.equal(timedOut,false,'historical probe timed out');assert.equal(finished.code,0,'historical probe failed\n'+stderr.slice(-6000));assert.equal(postStatus,'','historical probe changed its source graph');assert.ok(original,'historical probe report missing');
 }finally{
  rmSync(parent,{recursive:true,force:true});if(report)report.temporary_graph_removed=true;
  if(reportPath&&report)writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 }
 return report;
}
