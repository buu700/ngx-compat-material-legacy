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
const ts=createRequire(import.meta.url)('typescript');
const args=process.argv.slice(2),sourceOnly=args[0]==='--source-metadata';if(sourceOnly)args.shift();
 assert.ok(args.length<=1,'expected at most one report output path');
 if(args[0]?.startsWith('-'))assert.fail('unknown option '+args[0]);
 let tamper=null;const read=path=>{const raw=readCheckerOwnerMember(root,path);return path===tamper?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const before=read('compatibility/f10/disposition-ledger/ledger.json'),subject=inspectBrowserReferenceSource({root,read});
 let cold=0,late=0;const coldPaths=[],latePaths=[];
 if(!sourceOnly){
  for(const ref of subject.bound){tamper=ref.path;assert.throws(()=>subject.assertCurrent(),undefined,'late '+ref.path);late++;latePaths.push(ref.path);tamper=null;}
  for(const ref of subject.bound){tamper=ref.path;assert.throws(()=>inspectBrowserReferenceSource({root,read}),undefined,'cold '+ref.path);cold++;coldPaths.push(ref.path);tamper=null;}
  assert.deepEqual(latePaths,subject.bound.map(ref=>ref.path));assert.deepEqual(coldPaths,subject.bound.map(ref=>ref.path));
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
