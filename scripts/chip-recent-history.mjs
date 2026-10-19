/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Seven immutable source-test modules. Never current or native admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter,dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {historicalFrameMembers,inspectHistoricalReplayCurrent,verifyHistoricalCurrentSubjects} from './historical-source-replay.mjs';
import {olderAuditHistoryInputs,selectOlderAuditModules} from './older-audit-history-inputs.mjs';
import {chipBlurHistoryInputs} from './chip-blur-history-inputs.mjs';

export const CHIP_RECENT_HISTORY_INPUTS='compatibility/rc/chip-recent-history-inputs.json';
export const CHIP_RECENT_HISTORY_IDS=Object.freeze(['lifecycle-scope','focus-repair','focus-browser',
  'lifecycle-admission','source-qualification','native-requalification','role-requalification']);
const pins={main:'0bec81d070453c3224e8b06577c49658d53dbb570a48a81bce4d238fedf4d5d9',
  '21.x':'66c698888d08f80322a5c939e05cbabb39c1afbbb6c36f99287edc32f7aee46c'};
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
function env() {
  const result={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',PYTHONDONTWRITEBYTECODE:'1'};
  for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete result[name];
  // Original modules may expose optional diagnostics. Their outputs must stay
  // outside the immutable checkout; the runner owns its own result path.
  for(const name of Object.keys(result))if(name.startsWith('NGX_')&&name.endsWith('_DIAGNOSTIC'))delete result[name];
  return result;
}
const args=a=>['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...a];
const git=(root,a)=>execFileSync('git',args(a),{cwd:root,env:env(),maxBuffer:16*1024*1024});
export function recentHistoryInputs({root=rootDefault,read=p=>readFileSync(join(root,p))}={}) {
  const bytes=read(CHIP_RECENT_HISTORY_INPUTS),data=JSON.parse(bytes);
  assert.equal(hash(bytes),pins[data.line],'changed recent history inputs');assert.equal(data.schema_version,1);
  assert.deepEqual(data.entries.map(e=>e.id),CHIP_RECENT_HISTORY_IDS);assert.equal(data.case_count,19);
  assert.equal(new Set(data.entries.map(e=>e.program)).size,7);
  const stored=read(data.prior.path);assert.equal(hash(stored),data.prior.sha256,'changed recent history preimages');
  const raw=gunzipSync(stored);assert.equal(hash(raw),data.prior.raw_sha256);const prior=JSON.parse(raw);
  assert.equal(prior.line,data.line);assert.equal(prior.source_parent,data.source_parent);
  assert.equal(prior.python_preimages.length,7);
  for(const m of prior.python_preimages)assert.equal(hash(m.text),m.sha256);
  assert.equal(data.actual_current_source_native_packed_or_floor_qualified,false);assert.equal(data.g11_claim,'not-passed');
  for(const entry of data.entries) {
    assert.match(entry.program,/^tests\/test_chip_[a-z_]+\.py$/);
    assert.equal(entry.module,entry.program.slice(0,-3).replaceAll('/','.'));
    assert.ok(entry.case_ids.length===2||entry.case_ids.length===3);assert.equal(new Set(entry.case_ids).size,entry.case_ids.length);
    assert.ok(entry.case_ids.every(id=>id.startsWith(entry.module+'.')&&/\.test_[A-Za-z0-9_]+$/.test(id)));
    assert.equal(entry.timeout_ms,150000);
    assert.equal(hash(git(root,['show',entry.frame.commit+':'+entry.program])),entry.program_sha256,'changed original Python program');
  }
  return {data,prior,sha256:hash(bytes)};
}
export function validateRecentCaseReceipt(entry,receipt) {
  assert.equal(receipt.tests_run,entry.case_ids.length,'missing original test');
  assert.deepEqual(receipt.started,[...entry.case_ids]);assert.deepEqual(receipt.passed,[...entry.case_ids]);
  for(const field of ['failures','errors','skipped','expected_failures','unexpected_successes'])assert.deepEqual(receipt[field],[],'original case did not pass: '+field);
  assert.equal(receipt.successful,true);return true;
}
const pythonProgram=String.raw`
import json,sys,unittest
class RecordedResult(unittest.TextTestResult):
    def __init__(self,*a,**kw):
        super().__init__(*a,**kw);self.started_ids=[];self.passed_ids=[]
    def startTest(self,test):
        self.started_ids.append(test.id());super().startTest(test)
    def addSuccess(self,test):
        self.passed_ids.append(test.id());super().addSuccess(test)
suite=unittest.defaultTestLoader.loadTestsFromNames(json.loads(sys.argv[1]))
result=unittest.TextTestRunner(stream=sys.stderr,verbosity=2,resultclass=RecordedResult).run(suite)
body={'tests_run':result.testsRun,'started':result.started_ids,'passed':result.passed_ids,
      'failures':[t.id() for t,_ in result.failures],'errors':[t.id() for t,_ in result.errors],
      'skipped':[t.id() for t,_ in result.skipped],'expected_failures':[t.id() for t,_ in result.expectedFailures],
      'unexpected_successes':[t.id() for t in result.unexpectedSuccesses],'successful':result.wasSuccessful()}
with open(sys.argv[2],'x') as output:json.dump(body,output)
sys.exit(0 if result.wasSuccessful() else 1)
`;
function completion(child) {
  return new Promise((done,fail)=>{child.once('error',fail);child.once('close',(code,signal)=>done({code,signal}));});
}
function stop(child,signal='SIGTERM') {
  if(!child?.pid)return;
  try {if(process.platform==='win32')child.kill(signal);else process.kill(-child.pid,signal);}
  catch(error) {if(error.code!=='ESRCH')throw error;}
}
async function extract(root,frame,checkout) {
  const archive=spawn('git',args(['archive','--format=tar',frame.commit]),{cwd:root,env:env(),stdio:['ignore','pipe','pipe']});
  const tar=spawn('tar',['-xf','-','-C',checkout],{env:env(),stdio:['pipe','ignore','pipe']});
  let errors='';archive.stderr.on('data',b=>errors=(errors+b).slice(-4000));tar.stderr.on('data',b=>errors=(errors+b).slice(-4000));
  tar.stdin.on('error',()=>{});archive.stdout.pipe(tar.stdin);
  try {const results=await Promise.all([completion(archive),completion(tar)]);assert.ok(results.every(r=>r.code===0),'historical extraction failed '+errors);}
  finally {if(archive.exitCode===null)archive.kill('SIGTERM');if(tar.exitCode===null)tar.kill('SIGTERM');}
}
export function verifyRecentHistoricalGraph(checkout,members) {
  const files=[];
  function walk(relative='') {
    for(const item of readdirSync(join(checkout,relative),{withFileTypes:true})) {
      if(!relative&&['.git','node_modules'].includes(item.name))continue;
      const path=relative?relative+'/'+item.name:item.name;assert.ok(!item.isSymbolicLink(),'symlink in historical source graph');
      if(item.isDirectory())walk(path);else {assert.ok(item.isFile());files.push(path);}
    }
  }
  walk();assert.deepEqual(files.sort(),members.map(m=>m.path).sort(),'historical membership changed');
  let bytes=0;for(const member of members) {
    const path=join(checkout,member.path),raw=readFileSync(path);
    assert.equal(!!(lstatSync(path).mode&0o100),member.mode==='100755','historical executable mode changed '+member.path);
    assert.equal(blob(raw),member.blob,'historical bytes changed '+member.path);bytes+=raw.length;
  }
  return bytes;
}
function dependencies(root) {
  for(const path of [join(root,'node_modules'),...(process.env.NODE_PATH||'').split(delimiter).filter(Boolean)])
    if(existsSync(path)&&lstatSync(path).isDirectory())return path;
  assert.fail('Existing workspace dependencies required; no installer is run');
}
export async function runRecentHistory({root=rootDefault,id,reportPath}={}) {
  assert.ok(CHIP_RECENT_HISTORY_IDS.includes(id),'unregistered recent history stage');
  const {data,sha256}=recentHistoryInputs({root}),entry=data.entries.find(e=>e.id===id);
  return runHistoricalModules({root,id,reportPath,data,sha256,entry,modules:[entry.module],complete:true,
    temporaryPrefix:'ngx-chip-recent-history-',implementationSources:['scripts/chip-recent-history.mjs','scripts/run-chip-recent-history.mjs','tests/chip_recent_history.py']});
}
export async function runOlderAuditHistory({root=rootDefault,requested=[],reportPath}={}) {
  const {data,sha256}=olderAuditHistoryInputs({root}),selection=selectOlderAuditModules(data,requested);
  return runHistoricalModules({root,id:data.id,reportPath,data,sha256,...selection,
    temporaryPrefix:'ngx-older-audit-history-',implementationSources:['scripts/chip-recent-history.mjs',
      'scripts/older-audit-history-inputs.mjs','scripts/run-older-audit-history.mjs','tests/older_audit_history.py']});
}
export async function runChipBlurHistory({root=rootDefault,reportPath}={}) {
  const {data,sha256}=chipBlurHistoryInputs({root});
  return runHistoricalModules({root,id:data.id,reportPath,data,sha256,entry:data,modules:[data.module],complete:true,
    temporaryPrefix:'ngx-chip-blur-history-',omittedDiagnosticEnv:['CLOSEOUT_CHIP_BLUR_REPORT'],
    implementationSources:['scripts/chip-recent-history.mjs','scripts/chip-blur-history-inputs.mjs',
      'scripts/run-chip-blur-history.mjs','tests/chip_blur_history.py']});
}
async function runHistoricalModules({root,id,reportPath,data,sha256,entry,modules,complete,temporaryPrefix,implementationSources,omittedDiagnosticEnv=[]}) {
  const started=Date.now();
  const current=inspectHistoricalReplayCurrent({root}),members=historicalFrameMembers(root,entry.frame);
  const parent=mkdtempSync(join(tmpdir(),temporaryPrefix)),checkout=join(parent,'checkout');mkdirSync(checkout);
  let report;
  try {
    await extract(root,entry.frame,checkout);const historicalBytes=verifyRecentHistoricalGraph(checkout,members);
    git(checkout,['init','-q','--object-format=sha1']);
    const common=resolve(root,git(root,['rev-parse','--git-common-dir']).toString().trim());
    writeFileSync(join(checkout,'.git/objects/info/alternates'),join(common,'objects')+'\n');
    writeFileSync(join(checkout,'.git/HEAD'),entry.frame.commit+'\n');git(checkout,['read-tree',entry.frame.commit]);
    symlinkSync(dependencies(root),join(checkout,'node_modules'),'dir');writeFileSync(join(checkout,'.git/info/exclude'),'/node_modules/\n');
    assert.equal(git(checkout,['status','--porcelain','--untracked-files=all']).toString(),'');
    const childEnv=env();for(const name of omittedDiagnosticEnv)delete childEnv[name];
    const child=spawn('python3',['-B','-c',pythonProgram,JSON.stringify(modules),join(parent,'cases.json')],
      {cwd:checkout,env:childEnv,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='',timedOut=false,overflow=false;
    let escalation;const terminate=()=>{stop(child);escalation??=setTimeout(()=>stop(child,'SIGKILL'),1000);};
    child.stdout.on('data',b=>{stdout+=b;if(stdout.length>8*1024*1024){overflow=true;terminate();}});
    child.stderr.on('data',b=>{stderr+=b;if(stderr.length>8*1024*1024){overflow=true;terminate();}});
    const timer=setTimeout(()=>{timedOut=true;terminate();},entry.timeout_ms);
    let finished;
    try {finished=await completion(child);}
    finally {clearTimeout(timer);clearTimeout(escalation);stop(child);}
    const receipt=existsSync(join(parent,'cases.json'))?JSON.parse(readFileSync(join(parent,'cases.json'))):null;
    const clean=git(checkout,['status','--porcelain','--untracked-files=all']).toString()==='';
    assert.equal(verifyRecentHistoricalGraph(checkout,members),historicalBytes);
    const after=verifyHistoricalCurrentSubjects({root,data:current.data,members:current.members});assert.deepEqual(after,current.guard);
    report={schema_version:1,line:data.line,id,inputs_sha256:sha256,entry,
      selected_modules:modules,complete_registered_module_set:complete,
      historical_members_verified:members.length,historical_bytes_verified:historicalBytes,
      current_guard:current.guard,current_guard_passed_before_and_after:true,
      exit_code:finished.code,signal:finished.signal,timed_out:timedOut,output_overflow:overflow,
      receipt,original_stdout:stdout,original_stderr:stderr,historical_post_execution_clean:clean,
      original_program_unchanged:true,temporary_graph_removed:false,
      elapsed_ms:Date.now()-started,node:process.version,
      implementation_sources:implementationSources
        .map(path=>({path,sha256:hash(readFileSync(join(root,path)))})),
      actual_current_source_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
    assert.equal(timedOut,false,'historical module timed out');assert.equal(overflow,false,'historical output overflow');
    assert.equal(finished.code,0,'historical module failed\n'+stderr.slice(-10000));assert.equal(clean,true);
    validateRecentCaseReceipt(entry,receipt);
  } finally {
    rmSync(parent,{recursive:true,force:true});if(report)report.temporary_graph_removed=true;
    if(reportPath&&report)writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  }
  return report;
}
