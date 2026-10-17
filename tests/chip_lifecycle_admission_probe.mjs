/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic inputs exercise the actual validators and writers; no native run. */
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {createFixture,hash} from './upstream/artifact-behavior-fixture.mjs';
import {CHIP_LIFECYCLE_NATIVE_SHAS,requiresChipLifecycleScope,chipLifecycleScopeEvidenceOk,chipLifecycleBrowserObservations,readChipLifecycleAdmissionPrior} from '../scripts/upstream-chip-lifecycle-admission.mjs';
import {historicalBehaviorRequirements,HISTORICAL_BEHAVIOR_SHAS,validateHistoricalBehavior,requiresHistoricalBehavior} from '../scripts/upstream-historical-behavior-evidence.mjs';
import {deriveHistoricalRoster,rejectionReasons,discoveryNegativeResults,isRunnerControl} from '../scripts/historical-case-roster.mjs';
import * as browserRoster from '../scripts/browser-matrix-roster.mjs';
import {qualifyRelease} from '../scripts/browser-matrix-acceptance.mjs';
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p)),ts=createRequire(import.meta.url)('typescript'),body=JSON.parse(read('compatibility/rc/chip-lifecycle-admission-source-review.json')),line=body.line,ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const entries=body.reviews.map(r=>ledger.entries.find(e=>e.sha===r.sha));let sourceControls=0,nativeControls=0;
for(const entry of entries){
 assert.equal(chipLifecycleScopeEvidenceOk(body,entry,read,root,line,historicalBehaviorRequirements),true,entry.sha);assert.equal(requiresChipLifecycleScope({sha:entry.sha},{}),true);
 for(const mutate of [e=>delete e.individual_proof,e=>e.individual_proof.proof_kind='diff-read',e=>e.final_disposition='irrelevant',e=>e.files=[],e=>e.reason='Unreviewed',e=>e.evidence_report='README.md',e=>e.source_check={}]){const changed=structuredClone(entry);mutate(changed);assert.equal(requiresChipLifecycleScope(changed,changed.individual_proof),true);assert.equal(chipLifecycleScopeEvidenceOk(body,changed,read,root,line,historicalBehaviorRequirements),false);sourceControls++;}
 const altered=structuredClone(body);altered.reviews.find(r=>r.sha===entry.sha).whole_original_hunk_reviews.pop();assert.equal(chipLifecycleScopeEvidenceOk(altered,entry,read,root,line,historicalBehaviorRequirements),false);sourceControls++;
}
const prior=readChipLifecycleAdmissionPrior(read,line),priorHistorical=prior.sources.find(m=>m.path==='scripts/upstream-historical-behavior-evidence.mjs').text;
const oldRegistry=new Function('CHIP_LIST_SOURCE','CHIP_LIST_REFERENCE','CHIP_LIST_ORIGINALS',priorHistorical.replace(/^import .*\n/gm,'').replace(/^export /gm,'')+';return {scopes,retainedRegressionCases,requiredCaseCount};')('projects/ngx-material-legacy/legacy-chips/chip-list.ts','reference/material-16.2.14/chip-blur-sources/chip-list.ts','compatibility/rc/chip-list-contract-originals.json.gz');
assert.equal(oldRegistry.scopes.size,7);assert.equal(oldRegistry.requiredCaseCount,2236);for(const [sha,definition]of oldRegistry.scopes)assert.deepEqual(historicalBehaviorRequirements(sha),definition);
assert.equal(HISTORICAL_BEHAVIOR_SHAS.length,10);for(const sha of CHIP_LIFECYCLE_NATIVE_SHAS){assert.ok(requiresHistoricalBehavior({sha},{}));assert.match(priorHistorical,/const requiredCaseCount = 2236/);}
const good=JSON.parse(read('compatibility/rc/chip-focus-browser-controls.json')).observations.find(o=>o.epoch==='current').raw;
const blur={focused_before:true,touched_before:false,focused_after:false,touched_after:true,dom_focus_moved:true};
const chipEvidence=()=> 'mat-chip-list; focus and blur '+JSON.stringify({focus_lifecycle:structuredClone(good),blur:structuredClone(blur)});
const required=historicalBehaviorRequirements(CHIP_LIFECYCLE_NATIVE_SHAS[0]);
const focusPrior=JSON.parse((await import('node:zlib')).gunzipSync(read('compatibility/rc/chip-focus-repair-prior.json.gz')));
const foundation=JSON.parse(read('compatibility/rc/chip-lifecycle-scope-source-review.json'));
const extraMembers=[...focusPrior.product_members.map(m=>m.path),...required.members,'compatibility/rc/chip-lifecycle-admission-prior.json.gz',foundation.source_acquisition.path,...body.candidate_context.current_minimum_key_manager_sources.minimum_subjects.flatMap(s=>s.source_members.map(m=>m.path))];
const first=structuredClone(entries.find(e=>e.sha===CHIP_LIFECYCLE_NATIVE_SHAS[0]));first.individual_proof.artifact_behavior={source_members:first.individual_proof.historical_behavior.source_members};
const f=createFixture(root,{entry:first,review:body.reviews.find(r=>r.sha===first.sha),extraMembers});
try{
 delete f.entry.individual_proof.artifact_behavior;
 // The fixture initially creates stand-ins for frozen authored uses. Retain
 // exactly the real reviewed product population for raw contract validation.
 const population=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','projects','testing','reference','fixtures'],{cwd:f.root,encoding:'utf8'}).trim().split('\n').filter(Boolean),allowed=new Set(focusPrior.product_members.map(m=>m.path));
 for(const p of population)if(!allowed.has(p))fs.rmSync(path.join(f.root,p));
 const git=args=>execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:f.root,encoding:'utf8'}).trim();git(['add','-A']);git(['-c','user.name=Validator fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-qm','Complete synthetic reviewed product population','--allow-empty']);
 const binding=f.request.binding;binding.source_commit=f.run.source.commit=f.run.execution_inputs.commit=git(['rev-parse','HEAD']);binding.source_tree=f.run.source.git_tree_sha=f.run.execution_inputs.tree=git(['rev-parse','HEAD^{tree}']);f.save();
 const roster=deriveHistoricalRoster(root);assert.equal(roster.ids.length+roster.discovery_negative_ids.length,2236);
 const histFile=ts.createSourceFile('writer.mjs',read('scripts/rc-test-legacy-family.mjs').toString(),ts.ScriptTarget.Latest,true),writerBody=histFile.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='writeAcceptance').getText(histFile);
 f.request.historicalExecution={run_id:f.run.run_id,invocation_id:'synthetic-historical',exit_code:0};
 const histDir=path.join(f.runDir,'evidence/historical-legacy-artifact/synthetic-historical');fs.mkdirSync(histDir,{recursive:true});
 const historicalWriter=new Function('fs','path','root','runPath','rejectionReasons','discoveryNegativeResults','isRunnerControl','cryptoSha','console',writerBody+';return writeAcceptance;')(fs,path,f.root,path.join(f.runDir,'run.json'),rejectionReasons,discoveryNegativeResults,isRunnerControl,hash,{log(){},error(){}});
 assert.equal(historicalWriter({...f.request,invocation:'synthetic-historical',outputDir:histDir},roster,{subject_mode:'artifact',artifact_sha256:f.library.sha256,totals:{executed:roster.cases.filter(r=>r.kind!=='shared-export').length},mapped_specs:roster.paths.map(historical_path=>({historical_path})),specs:roster.cases.filter(r=>r.kind!=='shared-export').map(r=>({full_name:r.full_name,success:true,skipped:false}))},f.library),true);
 const browserFile=ts.createSourceFile('browser.mjs',read('scripts/browser-matrix-acceptance.mjs').toString(),ts.ScriptTarget.Latest,true),browserWriter=browserFile.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='runAcceptance').getText(browserFile).replace(/^export /,'');
 f.request.browserExecution={run_id:f.run.run_id,invocation_id:'synthetic-browser',exit_code:0};const browserDir=path.join(f.runDir,'evidence/browser-matrix/synthetic-browser');fs.mkdirSync(browserDir,{recursive:true});
 const browserIds=browserRoster.deriveReleaseIds(browserRoster.familiesFromInventory(JSON.parse(read('testing/legacy-runner/historical-inventory.json'))),line);
 const context={root:f.root,readFileSync:fs.readFileSync,writeFileSync:fs.writeFileSync,mkdirSync:fs.mkdirSync,join:path.join,relative:path.relative,createHash:(await import('node:crypto')).createHash,Buffer,console:{log(){},error(){}},...browserRoster,qualifyRelease,
  coordinatorRequest:()=>({...f.request,outputDir:browserDir,invocation:'synthetic-browser'}),resolveLibraryFromRun:()=>({tarball:path.join(f.runDir,'library.tgz'),digest:f.library.sha256,bytes:f.library.bytes}),
  preflight:()=>({missing:[],notes:[],chrome:'synthetic-only'}),fixtureQualificationDefects:()=>[],fixtureQualificationDefectsFromTarball:()=>[],writeDetail(){},runRippleHydrationReplay:async()=>({ok:true,fixture_only:true}),
  runCloseoutDiagnostic:(_request,_library,_launch,zoneless)=>({status:'executed',exit_code:0,artifact_bound:true,runtime_passed:true,acceptance_credit:false,progress_csp_passed:true,core_high_contrast_passed:true,report:`reports/closeout-browser-diagnostics${zoneless?'-zoneless':''}.json`,observation:{schema_version:1,tarball_sha256:f.library.sha256,browser:'HeadlessChrome/128.0.0.0',error:null,zoneless,bundle_has_zone:!zoneless,zone_global:zoneless?'undefined':'function',angular_zone_entered:!zoneless,fixture_only:true}}),
  executeIds:async()=>({outcomes:browserIds.map(id=>({id,ok:true,evidence:id.endsWith('/chips/default')?chipEvidence():'Synthetic assertion fixture;no native execution'})),engines:{chromium:{launched:true,product:'Chrome/128'},firefox:{launched:true,browserName:'firefox',version:'130'},webkit:{launched:true,backend:'webkitgtk',api:'WebKit2-4.1',safari_certification:false}}}),gitValue:args=>args[0]==='status'?'':args[1]==='HEAD'?binding.source_commit:binding.source_tree};
 assert.equal(await runInNewContext('('+browserWriter+')',context)({runPath:'synthetic-only.json'}),0);
 const histReport=JSON.parse(fs.readFileSync(path.join(f.runDir,'reports/historical-legacy-artifact.json'))),histRel=histReport.outputs[0].path,histRaw=JSON.parse(fs.readFileSync(path.join(f.runDir,histRel)));
 const browserReport=JSON.parse(fs.readFileSync(path.join(f.runDir,'reports/browser-matrix.json'))),browserRel=browserReport.outputs[0].path,browserRaw=JSON.parse(fs.readFileSync(path.join(f.runDir,browserRel)));
 const targets=[f.request,histReport,histRaw,browserReport,browserRaw],snapshots=targets.map(v=>structuredClone(v));
 function save(){f.save();for(const [report,raw,rel,id]of [[histReport,histRaw,histRel,'historical-legacy-artifact'],[browserReport,browserRaw,browserRel,'browser-matrix']]){f.runPut(rel,raw);const bytes=fs.readFileSync(path.join(f.runDir,rel));report.outputs=[{path:rel,sha256:hash(bytes),bytes:bytes.length}];f.runPut('reports/'+id+'.json',report);}}
 function reset(){for(const [i,target]of targets.entries()){for(const k of Object.keys(target))delete target[k];Object.assign(target,structuredClone(snapshots[i]));}save();}
 const results=[];
 for(const sourceEntry of entries.filter(e=>CHIP_LIFECYCLE_NATIVE_SHAS.includes(e.sha))){
  const entry=structuredClone(sourceEntry),check=()=>validateHistoricalBehavior({root:f.root,entry,proof:entry.individual_proof,request:f.request});reset();const positive=check();assert.equal(positive.ok,true,positive.detail);assert.equal(positive.chip_lifecycle_browser.required_cases.length,6);results.push({sha:entry.sha,synthetic_complete_writer_case:'accepted',native_execution:false});
  function negative(id,mutate){reset();mutate();save();const r=check();assert.equal(r.ok,false,id);nativeControls++;}
  for(const [id,mutate]of [
   ['missing-packed',()=>delete f.request.packedConsumerExecution],['missing-history',()=>delete f.request.historicalExecution],['missing-browser',()=>delete f.request.browserExecution],['failed-browser',()=>f.request.browserExecution.exit_code=7],['foreign-browser-run',()=>f.request.browserExecution.run_id='foreign'],
   ['browser-slice',()=>browserReport.coverage='incomplete'],['foreign-browser-artifact',()=>browserRaw.library_sha256='0'.repeat(64)],['foreign-browser-source',()=>browserRaw.source_commit='0'.repeat(40)],['missing-runtime',()=>delete browserRaw.closeout_diagnostics.zoneless],['wrong-runtime-zone',()=>browserRaw.closeout_diagnostics.zoneless.observation.zone_global='function'],
   ['missing-historical-original',()=>histRaw.cases.pop()],['missing-retained-new-case',()=>histRaw.cases=histRaw.cases.filter(c=>!c.case_id.endsWith('/legacy-chips/chip.spec.ts#37'))],
  ])negative(id,mutate);
  for(const engine of ['chromium','firefox','webkit'])for(const runtime of ['zoneful','zoneless']){
   const id=`release/${line}/${engine}/${runtime}/chips/default`,selected=()=>browserRaw.cases.find(c=>c.case_id===id);
   negative('missing-raw-'+id,()=>selected().evidence='Synthetic pass label only');
   negative('pending-focus-regression-'+id,()=>{const raw=JSON.parse(selected().evidence.slice('mat-chip-list; focus and blur '.length));raw.focus_lifecycle.pending_after_dom_matches=false;selected().evidence='mat-chip-list; focus and blur '+JSON.stringify(raw);});
   negative('old-blur-regression-'+id,()=>{const raw=JSON.parse(selected().evidence.slice('mat-chip-list; focus and blur '.length));raw.blur.touched_after=false;selected().evidence='mat-chip-list; focus and blur '+JSON.stringify(raw);});
  }
  reset();entry.individual_proof.historical_behavior.source_members.pop();assert.equal(check().ok,false);nativeControls++;
 }
 reset();assert.equal(chipLifecycleBrowserObservations(browserRaw,line).length,6);
 const {chipLifecycleAdmissionContext,chipLifecycleAdmissionBeforeRead,CHIP_LIFECYCLE_ADMISSION_INPUTS}=await import('./chip_lifecycle_admission_context.mjs');
 const stageContext=chipLifecycleAdmissionContext(read),view=chipLifecycleAdmissionBeforeRead(read);
 for(const member of stageContext.data.current_members){const old=member.path===stageContext.prior.ledger_path?stageContext.prior.ledger_text:stageContext.prior.sources.find(m=>m.path===member.path).text;assert.equal(view(member.path).toString(),old);const unknown=Buffer.concat([read(member.path),Buffer.from(' unreviewed')]);assert.deepEqual(chipLifecycleAdmissionBeforeRead(p=>p===member.path?unknown:read(p))(member.path),unknown);}
 for(const p of [CHIP_LIFECYCLE_ADMISSION_INPUTS,stageContext.data.prior.path]){assert.throws(()=>chipLifecycleAdmissionContext(n=>n===p?Buffer.concat([read(n),Buffer.from('changed')]):read(n)));let changed=false;const live=n=>changed&&n===p?Buffer.from('changed'):read(n),captured=chipLifecycleAdmissionBeforeRead(live);changed=true;assert.throws(()=>chipLifecycleAdmissionContext(live));assert.equal(captured(stageContext.prior.ledger_path).toString(),stageContext.prior.ledger_text);}
 assert.ok(Object.isFrozen(stageContext.prior));assert.throws(()=>stageContext.prior.ledger_text='changed');
 const report={schema_version:1,line,source_subjects:7,whole_original_hunks:30,new_native_subjects:3,current_historical_scope_count:HISTORICAL_BEHAVIOR_SHAS.length,full_historical_cases:2236,full_browser_cases:912,source_controls:sourceControls,native_controls:nativeControls,existing_native_scopes_preserved:7,historical_boundary_controls:7,actual_historical_and_browser_writers_exercised:true,results,actual_native_browser_library_or_floor_execution:false,g11_claim:'not-passed'};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
}finally{f.dispose();}
