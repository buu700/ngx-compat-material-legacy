/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete immutable collector/source tests; no packed or native execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter,join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {tabPortalSourceParentReader} from './tab-portal-source-context.mjs';
import {historicalFrameMembers,inspectHistoricalReplayCurrent,verifyHistoricalCurrentSubjects} from './historical-source-replay.mjs';
import {validateRecentCaseReceipt,verifyRecentHistoricalGraph} from './chip-recent-history.mjs';
export const PACKED_COLLECTOR_HISTORY_INPUTS='compatibility/rc/packed-collector-history-inputs.json';
export const PACKED_COLLECTOR_FAMILIES=Object.freeze(['menu-item-token','radio-identity','select-detach','table-onpush','select-focus-click','generated-identity']);
const pins={main:'69e8670d7349e45a273462387b9f1817223fd3367466c2e8a6f69282185f0f25','21.x':'c818f7f204d98b2bd173977edcff2e1b413674ef79afa94547a4bd5ba927a8ff'};
const hash=b=>createHash('sha256').update(b).digest('hex'),json=b=>JSON.stringify(b,null,2)+'\n';
const defaultRead=root=>p=>readFileSync(join(root,p));
function environment(){
 const result={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',PYTHONDONTWRITEBYTECODE:'1'};
 for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete result[name];
 for(const name of Object.keys(result))if(name.startsWith('NGX_')&&name.endsWith('_DIAGNOSTIC'))delete result[name];
 return result;
}
const args=a=>['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...a];
const git=(root,a)=>execFileSync('git',args(a),{cwd:root,env:environment(),maxBuffer:16*1024*1024});
export function packedCollectorHistoryInputs({root=process.cwd(),read=defaultRead(root)}={}){
 read=tabPortalSourceParentReader({root,read});
 const bytes=read(PACKED_COLLECTOR_HISTORY_INPUTS),data=JSON.parse(bytes);assert.equal(hash(bytes),pins[data.line],'unknown collector history inputs');
 assert.equal(data.schema_version,1);assert.equal(data.id,'packed-collector-history');assert.equal(data.case_count,10);assert.equal(data.timeout_ms,300000);
 assert.deepEqual(data.entries.map(e=>e.family),PACKED_COLLECTOR_FAMILIES);assert.equal(new Set(data.case_ids).size,10);assert.deepEqual(data.case_ids,data.entries.flatMap(e=>e.case_ids));
 assert.equal(data.actual_current_source_native_packed_or_floor_qualified,false);assert.equal(data.g11_claim,'not-passed');
 const stored=read(data.prior.path);assert.equal(hash(stored),data.prior.sha256,'changed collector history preimages');const raw=gunzipSync(stored);assert.equal(hash(raw),data.prior.raw_sha256);const prior=JSON.parse(raw);
 assert.equal(prior.line,data.line);assert.equal(prior.source_parent,data.source_parent);assert.deepEqual(prior.frame,data.frame);assert.equal(prior.originals.length,6);
 for(const entry of data.entries){
  assert.equal(entry.program,entry.module.replaceAll('.','/')+'.py');assert.ok(entry.case_ids.includes(entry.delegated_case_id));
  const original=prior.originals.find(m=>m.path===entry.program);assert.ok(original);assert.equal(hash(original.text),entry.program_sha256);assert.equal(hash(git(root,['show',data.frame.commit+':'+entry.program])),entry.program_sha256);
  let proposed=original.text;assert.equal(original.substitutions.length,2);for(const [from,to]of original.substitutions){assert.equal(proposed.split(from).length,2);proposed=proposed.replace(from,to);}
  assert.equal(hash(proposed),entry.wrapper_sha256);assert.equal(hash(read(entry.program)),entry.wrapper_sha256,'unknown collector history wrapper '+entry.program);
 }
 assert.equal(data.current_identical_subjects.length,14);
 for(const m of data.current_identical_subjects){assert.equal(hash(git(root,['show',data.frame.commit+':'+m.path])),m.sha256);assert.equal(hash(read(m.path)),m.sha256,'current collector subject differs from original: '+m.path);}
 for(const m of data.protected)assert.equal(hash(read(m.path)),m.sha256,'changed protected collector source: '+m.path);
 assert.equal(hash(read(data.matrix.path)),data.matrix.sha256,'live matrix changed');const old=git(root,['show',data.frame.commit+':'+data.matrix.path]);assert.equal(hash(old),data.matrix.historical_sha256);
 const packed=m=>m.checks.find(c=>c.check_id==='packed-consumer');const current=packed(JSON.parse(read(data.matrix.path))),historical=packed(JSON.parse(old));assert.equal(hash(json(current)),data.matrix.packed_check_sha256);assert.equal(hash(json(historical)),data.matrix.packed_check_sha256,'packed check changed');
 return {data,prior,sha256:hash(bytes)};
}
export function validatePackedCollectorReceipt(data,receipt){
 validateRecentCaseReceipt(data,receipt);assert.equal(receipt.node_observations.length,6);assert.equal(new Set(receipt.node_observations.map(m=>m.probe)).size,6);
 for(const entry of data.entries){const observation=receipt.node_observations.find(m=>m.probe===entry.probe);assert.ok(observation,'missing original Node probe');assert.equal(observation.exit_code,0);assert.equal(observation.summary.line,data.line);assert.equal(observation.summary.derived_cases,106);assert.equal(hash(observation.stdout),observation.stdout_sha256);assert.deepEqual(JSON.parse(observation.stdout.trim().split('\n').at(-1)),observation.summary);for(const [key,value]of Object.entries(observation.summary))if(key.startsWith('actual_')||key==='native_browser_executed')assert.equal(value,false);}
 return true;
}
const pythonProgram=String.raw`
import json,subprocess,sys,unittest
from unittest.mock import patch
modules=json.loads(sys.argv[1]);probes=set(json.loads(sys.argv[2]));observations=[]
original_run=subprocess.run
def observe(*args,**kwargs):
    result=original_run(*args,**kwargs)
    command=args[0] if args else kwargs.get('args')
    if isinstance(command,list) and len(command)==2 and command[0]=='node' and command[1] in probes:
        import hashlib
        observations.append({'probe':command[1],'exit_code':result.returncode,'stdout':result.stdout,
            'stderr':result.stderr,'stdout_sha256':hashlib.sha256(result.stdout.encode()).hexdigest(),
            'summary':json.loads(result.stdout.strip().splitlines()[-1]) if result.returncode==0 else None})
    return result
class RecordedResult(unittest.TextTestResult):
    def __init__(self,*a,**kw):
        super().__init__(*a,**kw);self.started_ids=[];self.passed_ids=[]
    def startTest(self,test):
        self.started_ids.append(test.id());super().startTest(test)
    def addSuccess(self,test):
        self.passed_ids.append(test.id());super().addSuccess(test)
suite=unittest.defaultTestLoader.loadTestsFromNames(modules)
with patch('subprocess.run',observe):
    result=unittest.TextTestRunner(stream=sys.stderr,verbosity=2,resultclass=RecordedResult).run(suite)
body={'tests_run':result.testsRun,'started':result.started_ids,'passed':result.passed_ids,
      'failures':[t.id() for t,_ in result.failures],'errors':[t.id() for t,_ in result.errors],
      'skipped':[t.id() for t,_ in result.skipped],'expected_failures':[t.id() for t,_ in result.expectedFailures],
      'unexpected_successes':[t.id() for t in result.unexpectedSuccesses],'successful':result.wasSuccessful(),
      'node_observations':observations}
with open(sys.argv[3],'x') as output:json.dump(body,output)
sys.exit(0 if result.wasSuccessful() else 1)
`;
const completion=child=>new Promise((done,fail)=>{child.once('error',fail);child.once('close',(code,signal)=>done({code,signal}));});
function stop(child,signal='SIGTERM'){if(!child?.pid)return;try{if(process.platform==='win32')child.kill(signal);else process.kill(-child.pid,signal);}catch(error){if(error.code!=='ESRCH')throw error;}}
async function extract(root,frame,checkout){
 const archive=spawn('git',args(['archive','--format=tar',frame.commit]),{cwd:root,env:environment(),stdio:['ignore','pipe','pipe']}),tar=spawn('tar',['-xf','-','-C',checkout],{env:environment(),stdio:['pipe','ignore','pipe']});let errors='';
 archive.stderr.on('data',b=>errors=(errors+b).slice(-4000));tar.stderr.on('data',b=>errors=(errors+b).slice(-4000));tar.stdin.on('error',()=>{});archive.stdout.pipe(tar.stdin);
 try{assert.ok((await Promise.all([completion(archive),completion(tar)])).every(r=>r.code===0),'historical extraction failed '+errors);}finally{if(archive.exitCode===null)archive.kill('SIGTERM');if(tar.exitCode===null)tar.kill('SIGTERM');}
}
function dependencies(root){for(const path of [join(root,'node_modules'),...(process.env.NODE_PATH||'').split(delimiter).filter(Boolean)])if(existsSync(path)&&lstatSync(path).isDirectory())return path;assert.fail('Existing workspace dependencies required; no installer is run');}
export async function runPackedCollectorHistory({root=process.cwd(),reportPath}={}){
 const started=Date.now(),inputs=packedCollectorHistoryInputs({root}),{data}=inputs,current=inspectHistoricalReplayCurrent({root}),members=historicalFrameMembers(root,data.frame);
 const parent=mkdtempSync(join(tmpdir(),'ngx-packed-collector-history-')),checkout=join(parent,'checkout');mkdirSync(checkout);let report;
 try{
  await extract(root,data.frame,checkout);const historicalBytes=verifyRecentHistoricalGraph(checkout,members);git(checkout,['init','-q','--object-format=sha1']);const common=resolve(root,git(root,['rev-parse','--git-common-dir']).toString().trim());writeFileSync(join(checkout,'.git/objects/info/alternates'),join(common,'objects')+'\n');writeFileSync(join(checkout,'.git/HEAD'),data.frame.commit+'\n');git(checkout,['read-tree',data.frame.commit]);symlinkSync(dependencies(root),join(checkout,'node_modules'),'dir');writeFileSync(join(checkout,'.git/info/exclude'),'/node_modules/\n');assert.equal(git(checkout,['status','--porcelain','--untracked-files=all']).toString(),'');
  const child=spawn('python3',['-B','-c',pythonProgram,JSON.stringify(data.entries.map(e=>e.module)),JSON.stringify(data.entries.map(e=>e.probe)),join(parent,'cases.json')],{cwd:checkout,env:environment(),detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});let stdout='',stderr='',timedOut=false,overflow=false,escalation;
  const terminate=()=>{stop(child);escalation??=setTimeout(()=>stop(child,'SIGKILL'),1000);};child.stdout.on('data',b=>{stdout+=b;if(stdout.length>8*1024*1024){overflow=true;terminate();}});child.stderr.on('data',b=>{stderr+=b;if(stderr.length>8*1024*1024){overflow=true;terminate();}});const timer=setTimeout(()=>{timedOut=true;terminate();},data.timeout_ms);let finished;
  try{finished=await completion(child);}finally{clearTimeout(timer);clearTimeout(escalation);stop(child);}
  const receipt=existsSync(join(parent,'cases.json'))?JSON.parse(readFileSync(join(parent,'cases.json'))):null,clean=git(checkout,['status','--porcelain','--untracked-files=all']).toString()==='';assert.equal(verifyRecentHistoricalGraph(checkout,members),historicalBytes);assert.equal(packedCollectorHistoryInputs({root}).sha256,inputs.sha256);assert.deepEqual(verifyHistoricalCurrentSubjects({root,data:current.data,members:current.members}),current.guard);
  report={schema_version:1,line:data.line,id:data.id,inputs_sha256:inputs.sha256,frame:data.frame,historical_members_verified:members.length,historical_bytes_verified:historicalBytes,current_guard:current.guard,current_guard_passed_before_and_after:true,current_collector_writer_probe_and_contract_identity_count:14,packed_check_unchanged:true,receipt,exit_code:finished.code,signal:finished.signal,timed_out:timedOut,output_overflow:overflow,original_stdout:stdout,original_stderr:stderr,original_programs_unchanged:true,historical_post_execution_clean:clean,temporary_graph_removed:false,elapsed_ms:Date.now()-started,node:process.version,implementation_sources:['scripts/packed-collector-history.mjs','scripts/run-packed-collector-history.mjs','tests/packed_collector_history.py'].map(path=>({path,sha256:hash(readFileSync(join(root,path)))})),actual_current_source_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
  assert.equal(timedOut,false);assert.equal(overflow,false);assert.equal(finished.code,0,'original collector modules failed\n'+stderr.slice(-16000));assert.equal(clean,true);validatePackedCollectorReceipt(data,receipt);
 }finally{rmSync(parent,{recursive:true,force:true});if(report)report.temporary_graph_removed=true;if(report&&reportPath)writeFileSync(reportPath,json(report),{flag:'wx'});}
 return report;
}
