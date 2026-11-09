/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current probe callbacks with explicit collaborators; no browser credit. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {inspectBrowserReferenceSource} from '../scripts/browser-reference-source.mjs';
import {readCheckerOwnerMember} from '../scripts/checker-owner-source.mjs';
import {requiredProbeSource,candidateInstallSpec} from '../scripts/browser-required-cells.mjs';
import {browserPeerVersions} from '../scripts/browser-peer-versions.mjs';
import {legacyDialogTitleLifetimeNativeOkay as okay} from '../scripts/dialog-title-lifetime-fixture.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=raw=>createHash('sha256').update(raw).digest('hex');
// The child protocol is deliberately not the public report schema.
const WORKERS=4,MAX_OUTPUT=4*1024*1024;
function partitionIndices(length,part){
 assert.ok(Number.isSafeInteger(length)&&length>=0);assert.ok(Number.isSafeInteger(part)&&part>=0&&part<WORKERS);
 return Array.from({length},(_,index)=>index).filter(index=>index%WORKERS===part);
}
function validateColdPartition(result,part,roster,report){
 assert.equal(result.error,null);assert.equal(result.code,0);assert.equal(result.signal,null);assert.equal(result.stderr,'');
 const parsed=JSON.parse(result.stdout);assert.equal(result.stdout,JSON.stringify(parsed)+'\n','unexpected child output');
 assert.deepEqual(Object.keys(parsed).sort(),['indices','kind','line','report','roster'].sort());
 assert.equal(parsed.kind,'private-cold-partition-v1');assert.equal(parsed.line,report.line);
 assert.deepEqual(parsed.roster,roster);assert.deepEqual(parsed.report,report);
 assert.deepEqual(parsed.indices,partitionIndices(roster.length,part));
 return parsed.indices;
}
function startColdPool(){
 const workers=[];
 for(let part=0;part<WORKERS;part++){
  const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--internal-cold-partition',String(part)],{cwd:root,stdio:['ignore','pipe','pipe','ipc']});
  let stdout='',stderr='',error=null,bytes=0;
  const collect=(stream,isError)=>stream.on('data',chunk=>{
   bytes+=chunk.length;if(bytes>MAX_OUTPUT){error='child output exceeds limit';child.kill();return;}
   if(isError)stderr+=chunk.toString('utf8');else stdout+=chunk.toString('utf8');
  });
  collect(child.stdout,false);collect(child.stderr,true);
  const finished=new Promise(resolve=>{
   child.on('error',failure=>{error=String(failure);});
   child.on('close',(code,signal)=>resolve({code,signal,stdout,stderr,error}));
  });
  workers.push({child,finished});
 }
 return workers;
}
async function stopColdPool(workers){
 for(const {child} of workers)if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');
 const all=Promise.all(workers.map(({finished})=>finished));
 let timer;
 const timeout=new Promise(resolve=>{timer=setTimeout(()=>resolve(false),250);});
 const complete=await Promise.race([all.then(()=>true),timeout]);clearTimeout(timer);
 if(!complete){
  for(const {child} of workers)if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');
  await all;
 }
}
function requireWorkerParent(){
 assert.equal(typeof process.send,'function','worker requires parent IPC');
 assert.equal(process.connected,true,'worker requires live parent IPC');
 const lostParent=()=>process.exit(1);process.once('disconnect',lostParent);return lostParent;
}
const args=process.argv.slice(2);
const worker=args[0]==='--internal-cold-partition';
if(worker){
 const lostParent=requireWorkerParent();
 assert.equal(args.length,2);assert.match(args[1],/^[0-3]$/);const part=Number(args[1]);
 let tamper=null;const read=path=>{const raw=readCheckerOwnerMember(root,path);return path===tamper?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const before=read('compatibility/f10/disposition-ledger/ledger.json'),subject=inspectBrowserReferenceSource({root,read});
 const roster=structuredClone(subject.bound),report=structuredClone(subject.report);
 assert.equal(new Set(roster.map(ref=>ref.path)).size,roster.length);subject.assertCurrent();
 const indices=partitionIndices(roster.length,part);
 for(const index of indices){const ref=roster[index];try{tamper=ref.path;assert.throws(()=>inspectBrowserReferenceSource({root,read}),undefined,'cold '+ref.path);}finally{tamper=null;}await new Promise(resolve=>setImmediate(resolve));}
 subject.assertCurrent();assert.ok(before.equals(read('compatibility/f10/disposition-ledger/ledger.json')));
 await new Promise((resolve,reject)=>process.stdout.write(JSON.stringify({kind:'private-cold-partition-v1',line:report.line,roster,report,indices})+'\n',error=>error?reject(error):resolve()));
 process.removeListener('disconnect',lostParent);process.disconnect();
}else{
const ts=createRequire(import.meta.url)('typescript');
const sourceOnly=args[0]==='--source-metadata';if(sourceOnly)args.shift();
 assert.ok(args.length<=1,'expected at most one report output path');
 if(args[0]?.startsWith('-'))assert.fail('unknown option '+args[0]);
 let tamper=null;const read=path=>{const raw=readCheckerOwnerMember(root,path);return path===tamper?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const before=read('compatibility/f10/disposition-ledger/ledger.json'),subject=inspectBrowserReferenceSource({root,read});
 let cold=0,late=0;const coldPaths=[],latePaths=[];
 if(!sourceOnly){
  const roster=structuredClone(subject.bound),semantic=structuredClone(subject.report);
  assert.equal(new Set(roster.map(ref=>ref.path)).size,roster.length);
  const workers=startColdPool();
  const onExit=()=>{for(const {child} of workers)if(child.exitCode===null&&child.signalCode===null)child.kill();};
  const onInterrupt=async signal=>{await stopColdPool(workers);process.exit(signal==='SIGINT'?130:143);};
  const onInt=()=>{void onInterrupt('SIGINT');},onTerm=()=>{void onInterrupt('SIGTERM');};
  process.once('exit',onExit);process.once('SIGINT',onInt);process.once('SIGTERM',onTerm);
  try{
   for(const ref of subject.bound){try{tamper=ref.path;assert.throws(()=>subject.assertCurrent(),undefined,'late '+ref.path);late++;latePaths.push(ref.path);}finally{tamper=null;}}
   const seen=new Set();
   await Promise.all(workers.map(async ({finished},part)=>{
    const result=await finished;
    for(const index of validateColdPartition(result,part,roster,semantic)){
     assert.ok(Number.isSafeInteger(index)&&index>=0&&index<roster.length&&!seen.has(index));seen.add(index);
    }
   }));
   assert.equal(seen.size,roster.length);
   for(let index=0;index<roster.length;index++){assert.ok(seen.has(index));cold++;coldPaths.push(roster[index].path);}
   assert.deepEqual(latePaths,subject.bound.map(ref=>ref.path));assert.deepEqual(coldPaths,subject.bound.map(ref=>ref.path));
  }finally{
   await stopColdPool(workers);process.removeListener('exit',onExit);process.removeListener('SIGINT',onInt);process.removeListener('SIGTERM',onTerm);
  }
 }

const versions=browserPeerVersions(JSON.parse(read('projects/ngx-material-legacy/package.json'))),generated=[];
for(const zoneless of [false,true]){
 const spec=candidateInstallSpec(versions,zoneless);
 assert.equal(ts.createSourceFile('current-lab.ts',spec.labSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length,0);
 assert.equal(spec.tsconfig.compilerOptions.skipLibCheck,false);assert.equal(spec.tsconfig.compilerOptions.strict,true);
 assert.equal('zone.js'in spec.dependencies,!zoneless);assert.equal('@angular/animations'in spec.dependencies,false);
 for(const marker of ['changeDetection:ChangeDetectionStrategy.OnPush','MAT_LEGACY_DIALOG_DATA','DialogTitleLifetimeLab','DialogTitleLifetimeBody','runDialogTitleLifetime()','lab-dialog-title-lifetime'])assert.ok(spec.labSource.includes(marker),marker);
 assert.ok(!spec.labSource.includes('.detectChanges('));assert.equal(spec.tsconfig.angularCompilerOptions.strictTemplates,true);
 generated.push({zoneless,lab_source_sha256:hash(spec.labSource),lab_source_bytes:Buffer.byteLength(spec.labSource)});
}
// Independent observations of two opening modes, three ARIA priorities and
// seven removal/reinsertion states. These are collaborator data, not DOM runs.
const good={scenarios:[]};
for(const mode of ['component','template'])for(const priority of ['titles','labelledby','label']){
 const names=['initial','first-removed','all-removed','second-returned','first-appended','second-removed','empty-again'];
 const first=['legacy-title-lifetime-first',null,null,null,'legacy-title-lifetime-first','legacy-title-lifetime-first',null];
 const second=['mat-dialog-title-1','mat-dialog-title-1',null,'mat-dialog-title-2','mat-dialog-title-2',null,null];
 const labels=[first[0],second[1],null,second[3],second[4],first[5],null];
 good.scenarios.push({mode,priority,steps:names.map((step,i)=>({step,first:first[i],second:second[i],labelledby:priority==='label'?null:priority==='labelledby'?'legacy-title-configured':labels[i],label:priority==='label'?'Explicit title label':null}))});
}
assert.equal(okay(good),true);let predicateControls=0;
for(const scenario of good.scenarios)for(const row of scenario.steps){
 const copy=structuredClone(good),s=copy.scenarios[good.scenarios.indexOf(scenario)].steps[scenario.steps.indexOf(row)];s.labelledby='stale-label';assert.equal(okay(copy),false);predicateControls++;
}
for(const value of [null,{}, {ok:true},{scenarios:good.scenarios.slice(1)},{scenarios:[good.scenarios[0],...good.scenarios.slice(0,5)]}]){assert.equal(okay(value),false);predicateControls++;}
const source=requiredProbeSource();new Function(source);
async function route(options={}){
 let time=0,opened=false,closeCalls=0,requested=0,resolveTitle,rejectTitle;
 const queue=[],surface={setAttribute(){}},window={};
 const lab={closeTransient(){closeCalls++;if(!options.stuckClose||closeCalls===1)opened=false;},runDialogTitleLifetime(){requested++;if(options.reject)return Promise.reject(Error('title observation failed'));if(options.deferred)return new Promise((res,rej)=>{resolveTitle=res;rejectTitle=rej;});return Promise.resolve(options.bad?{}:good);}};
 if(options.missingApi)delete lab.runDialogTitleLifetime;window.__lab=lab;
 const document={getElementById:id=>id==='surface'?surface:null,querySelector(selector){
  if(selector==='#wrap-dialog')return {};
  if(selector==='#p-dialog-open')return {click(){opened=true;}};
  if(selector==='mat-dialog-container #dialog-body')return opened&&!options.missingBody?{}:null;
  if(selector==='mat-dialog-container'||selector.startsWith('mat-dialog-container,'))return opened?{}:null;
  return null;
 }};
 runInNewContext(source,{window,document,Date:{now:()=>time},Promise,setTimeout:(fn,delay=0)=>{queue.push({fn,at:time+delay});}});
 window.__begin({family:'dialog',state:'default'});
 for(let i=0;i<150&&!window.__poll().done;i++){
  queue.sort((a,b)=>a.at-b.at);const item=queue.shift();if(item){time=item.at;item.fn();}await Promise.resolve();await Promise.resolve();
  if(options.deferred&&resolveTitle)break;
 }
 return {window,status:window.__poll(),requested,closeCalls,resolveTitle,rejectTitle};
}
const runs=[];
for(const options of [{},{bad:true},{missingApi:true},{missingBody:true},{stuckClose:true},{reject:true}]){
 const result=await route(options);assert.equal(result.status.done,true,JSON.stringify(options));assert.equal(result.status.ok,Object.keys(options).length===0,result.status.evidence);
 if(!Object.keys(options).length){assert.equal(result.requested,1);assert.equal(result.closeCalls,2);assert.ok(result.status.evidence.includes('rendered component/template OnPush title lifetimes'));}
 runs.push({options,result:result.status.ok?'pass':'fail',evidence:result.status.evidence});
}
for(const rejected of [false,true]){
 const result=await route({deferred:true});assert.equal(result.requested,1);const next={done:false,ok:false,evidence:'next-cell'};result.window.__status=next;
 if(rejected)result.rejectTitle(Error('late failure'));else result.resolveTitle(good);
 await Promise.resolve();await Promise.resolve();await Promise.resolve();assert.equal(result.window.__status,next);runs.push({late_completion_rejected:rejected,next_cell_status_preserved:true});
}
subject.assertCurrent();assert.ok(before.equals(read('compatibility/f10/disposition-ledger/ledger.json')));
const report={...subject.report,source_execution_mode:sourceOnly?'source-metadata':'complete-regression',full_source_fault_lifetimes_executed:!sourceOnly,bound_current_paths:subject.bound.length,
 ...(sourceOnly?{}:{cold_source_faults_rejected:cold,late_source_faults_rejected:late,cold_source_fault_paths_rejected:coldPaths,late_source_fault_paths_rejected:latePaths}),
 generated_current_lab_sources:generated,title_contract_negative_controls:predicateControls,whole_current_dialog_probe_collaborator_runs:runs,actual_angular_DOM_browser_or_packed_execution:false};
if(args[0])writeFileSync(args[0],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));

}
