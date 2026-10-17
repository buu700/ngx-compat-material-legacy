/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual writer/validator/CLI; inventories, artifacts and browser results are synthetic. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {createFixture,hash} from './upstream/artifact-behavior-fixture.mjs';
import {writeSyntheticBrowserRun} from './upstream/browser-run-fixture.mjs';
import {contentObserverNativeSample} from './content_observer_native_sample.mjs';
import {CONTENT_OBSERVER_SHA} from '../scripts/content-observer-native-contract.mjs';
import {CONTENT_OBSERVER_KIND,contentObserverRequirements,requiresContentObserver,validateContentObserver} from '../scripts/upstream-content-observer-evidence.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p));
const line=json('projects/ngx-material-legacy/package.json').version.startsWith('21.')?'21.x':'main';
const definition=contentObserverRequirements(CONTENT_OBSERVER_SHA,line),ledger=json('compatibility/f10/disposition-ledger/ledger.json');
const entry=structuredClone(ledger.entries.find(row=>row.sha===CONTENT_OBSERVER_SHA)),review=json(entry.evidence_report);
assert.equal(entry.individual_proof.proof_kind,CONTENT_OBSERVER_KIND);assert.equal(review.native_admission.qualified_by_this_document,false);
assert.ok(requiresContentObserver({sha:CONTENT_OBSERVER_SHA},{}));assert.ok(requiresContentObserver({},{proof_kind:CONTENT_OBSERVER_KIND}));
assert.ok(requiresContentObserver({},{content_observer_behavior:null}));assert.equal(requiresContentObserver({},{}),false);
for(const branch of ['unknown','__proto__','constructor'])assert.equal(contentObserverRequirements(CONTENT_OBSERVER_SHA,branch),null);
const escaped=contentObserverRequirements(CONTENT_OBSERVER_SHA,line);escaped.members.length=0;assert.ok(contentObserverRequirements(CONTENT_OBSERVER_SHA,line).members.length>0);
// Execute the actual metadata producer against authenticated archive members;
// this uses no installer, consumer build or browser.
const ts=createRequire(import.meta.url)('typescript'),source=read('scripts/browser-surface-families.mjs').toString();
const program=ts.createSourceFile('surface.mjs',source,ts.ScriptTarget.Latest,true),metadataNames=['observerPeerRoot','observerPeerPackage','observerPeerExports','observerPublicMember','contentObserverPeer'];
const statements=program.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>metadataNames.includes(row.name.getText(program))));assert.equal(statements.length,5);
const readInstalled=new Function('consumer','join','readFileSync','createHash',statements.map(node=>node.getText(program)).join('\n')+';return contentObserverPeer;');
const capsuleBytes=read('compatibility/rc/material-public-subjects.json');assert.equal(hash(capsuleBytes),'f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3');
const decode=member=>{const stored=read(member.path);assert.equal(hash(stored),member.stored_sha256);const raw=gunzipSync(stored);assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);return raw;};
const temp=fs.mkdtempSync(path.join((await import('node:os')).tmpdir(),'observer-installed-identity-'));let metadataControls=0;
try{for(const branch of ['main','21.x']){
  const subject=JSON.parse(capsuleBytes).subjects.find(row=>row.line===branch),metadata=subject.members.find(row=>row.package==='@angular/cdk'&&row.module_path==='package.json');
  const manifest=decode(metadata),packageRoot=path.join(temp,'node_modules/@angular/cdk');fs.mkdirSync(packageRoot,{recursive:true});fs.writeFileSync(path.join(packageRoot,'package.json'),manifest);
  for(const member of subject.members.filter(row=>row.package==='@angular/cdk'&&['fesm2022/observers.mjs','types/observers.d.ts'].includes(row.module_path))){
    const target=path.join(packageRoot,member.module_path);fs.mkdirSync(path.dirname(target),{recursive:true});const body=decode(member);fs.writeFileSync(target,body);
    if(member.module_path.endsWith('.d.ts')){
      const types=ts.createSourceFile(member.module_path,body.toString(),ts.ScriptTarget.Latest,true);assert.equal(types.parseDiagnostics.length,0);
      for(const name of ['ContentObserver','CdkObserveContent']){
        const cls=types.statements.find(node=>ts.isClassDeclaration(node)&&node.name.text===name);assert.ok(cls);
        assert.ok(!ts.getJSDocTags(cls).some(tag=>['deprecated','docs-private','experimental','breaking-change'].includes(tag.tagName.text)));
        assert.ok(types.statements.some(node=>ts.isExportDeclaration(node)&&node.exportClause?.elements?.some(row=>row.name.text===name)));
        if(name==='ContentObserver'){const observe=cls.members.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(types)==='observe');assert.ok(observe);assert.ok(!ts.getJSDocTags(observe).some(tag=>['deprecated','docs-private','experimental','breaking-change'].includes(tag.tagName.text)));assert.equal(observe.parameters.length,1);assert.match(observe.type.getText(types),/MutationRecord/);}
      }
    }
  }
  const crypto=await import('node:crypto');assert.deepEqual(readInstalled(temp,path.join,fs.readFileSync,crypto.createHash),contentObserverRequirements(CONTENT_OBSERVER_SHA,branch).consumer_peer);metadataControls++;
  for(const invalid of ['../escape.mjs','./types/../escape.mjs']){
    const bad=JSON.parse(manifest);bad.exports['./observers'].default=invalid;fs.writeFileSync(path.join(packageRoot,'package.json'),JSON.stringify(bad));
    assert.throws(()=>readInstalled(temp,path.join,fs.readFileSync,crypto.createHash),/invalid public observer export path/);metadataControls++;
  }
  fs.writeFileSync(path.join(packageRoot,'package.json'),manifest);
}}finally{fs.rmSync(temp,{recursive:true,force:true});}
entry.individual_proof.artifact_behavior={source_members:entry.individual_proof.content_observer_behavior.source_members};
const f=createFixture(root,{entry,review});delete f.entry.individual_proof.artifact_behavior;
const browser=await writeSyntheticBrowserRun(root,f,zoneless=>({content_observer:contentObserverNativeSample(zoneless),content_observer_peer:structuredClone(definition.consumer_peer)}));
const targets=[f.entry,f.request,f.run,f.report,f.observation,browser.report,browser.observation],originals=targets.map(value=>structuredClone(value));
const peerPath=definition.installed_member.path,peerBytes=fs.readFileSync(path.join(f.root,peerPath));
let helpers=0,cliCases=0;const observations=[];
function reset(){for(const[i,target]of targets.entries()){for(const key of Object.keys(target))delete target[key];Object.assign(target,structuredClone(originals[i]));}f.repoPut(peerPath,peerBytes);browser.save();}
const inspect=()=>validateContentObserver({root:f.root,entry:f.entry,proof:f.entry.individual_proof,request:f.request});
function negative(name,mutate,pattern=/./){reset();mutate();browser.save();const result=inspect();assert.equal(result.ok,false,name);assert.match(result.detail,pattern,name);helpers++;}
try{
  assert.equal(inspect().ok,true,JSON.stringify(inspect()));helpers++;
  negative('renamed-kind',()=>f.entry.individual_proof.proof_kind='source-completed',/unregistered/);
  negative('wrong-sha',()=>f.entry.sha='a'.repeat(40),/unregistered/);
  negative('wrong-patch',()=>f.entry.individual_proof.diff_sha256='a'.repeat(64),/unregistered/);
  negative('relabel-disposition',()=>f.entry.final_disposition='irrelevant',/unregistered/);
  negative('wrong-scope',()=>f.entry.individual_proof.content_observer_behavior.kind='other',/scope/);
  negative('missing-runtime-scope',()=>f.entry.individual_proof.content_observer_behavior.runtimes.pop(),/scope/);
  negative('missing-stage-scope',()=>f.entry.individual_proof.content_observer_behavior.stages.pop(),/scope/);
  negative('wrong-case',()=>f.entry.individual_proof.content_observer_behavior.case_ids=['other'],/scope/);
  negative('wrong-branch',()=>f.entry.individual_proof.affected_branches=[line==='main'?'21.x':'main'],/installed/);
  negative('wrong-peer',()=>f.entry.individual_proof.installed_member.version='16.2.14',/installed/);
  negative('wrong-type-summary',()=>f.entry.individual_proof.public_declaration.sha256='a'.repeat(64),/installed/);
  negative('marker-id',()=>f.entry.individual_proof.reachable_behavior.id='arbitrary-success',/delegation/);
  negative('missing-source',()=>f.entry.individual_proof.content_observer_behavior.source_members.pop(),/source scope/);
  negative('stale-source',()=>f.entry.individual_proof.content_observer_behavior.source_members[0].sha256='a'.repeat(64),/stale/);
  negative('rehashed-wrong-peer',()=>{const changed=Buffer.concat([peerBytes,Buffer.from('wrong-peer')]);f.repoPut(peerPath,changed);
    f.entry.individual_proof.content_observer_behavior.source_members.find(row=>row.path===peerPath).sha256=hash(changed);},/authenticated.*bytes/);
  negative('missing-packed',()=>delete f.request.packedConsumerExecution,/packed invocation/);
  negative('failed-packed',()=>f.request.packedConsumerExecution.exit_code=7,/packed invocation/);
  negative('packed-slice',()=>f.report.coverage='slice',/packed result/);
  negative('missing-browser',()=>delete f.request.browserExecution,/browser invocation/);
  negative('failed-browser',()=>f.request.browserExecution.exit_code=7,/browser invocation/);
  negative('browser-slice',()=>browser.report.coverage='slice',/browser result/);
  negative('stale-browser-job',()=>browser.report.invocation_id='old-job',/browser report subject/);
  negative('foreign-browser-artifact',()=>browser.report.artifacts.library.sha256='a'.repeat(64),/browser result/);
  negative('incomplete-browser-roster',()=>browser.report.executed_case_ids.pop(),/browser executed_case_ids/);
  negative('foreign-browser-source',()=>browser.observation.source_tree='a'.repeat(40),/assertion subject/);
  negative('missing-native-runtime',()=>delete browser.observation.closeout_diagnostics.zoneless,/native runtimes/);
  for(const runtime of ['zoneful','zoneless']){
    const raw=()=>browser.observation.closeout_diagnostics[runtime].observation;
    negative(runtime+'-wrong-peer-bytes',()=>raw().content_observer_peer.runtime_sha256='a'.repeat(64),/actually installed/);
    negative(runtime+'-wrong-peer-types',()=>raw().content_observer_peer.types_sha256='a'.repeat(64),/actually installed/);
    negative(runtime+'-missing-raw',()=>delete raw().content_observer,/native content observer/);
    negative(runtime+'-rehashed-comment-regression',()=>raw().content_observer.stages[0].public_events=1,/native content observer/);
    negative(runtime+'-rehashed-owner-regression',()=>raw().content_observer.stages[3].owned_callbacks=0,/native content observer/);
    negative(runtime+'-rehashed-cleanup-regression',()=>raw().content_observer.native_generations[0].disconnects=0,/native content observer/);
    negative(runtime+'-rehashed-current-context',()=>raw().content_observer.stages[3].public_zones=[runtime==='zoneless'],/native content observer/);
  }
  const output=path.join(f.runDir,'evidence/upstream-audit-disposition/synthetic-observer');fs.mkdirSync(output,{recursive:true});
  function cli(name,mutate,expected,coordinator=true){
    reset();mutate?.();browser.save();f.runPut('seed.json',{commits:[{sha:CONTENT_OBSERVER_SHA}],fixture_only:true});
    f.runPut('ledger.json',{entries:[f.entry],fixture_only:true,g11_claim:'not-passed'});
    const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('RC_')));
    if(coordinator)Object.assign(env,{RC_CHECK_ID:'upstream-audit-disposition',RC_RUN_ID:f.request.runId,RC_INVOCATION_ID:'synthetic-observer',
      RC_EVIDENCE_BINDING:JSON.stringify(f.request.binding),RC_ASSERTION_OUTPUT_DIR:output,
      RC_UPSTREAM_PACKED_CONSUMER:JSON.stringify(f.request.packedConsumerExecution??null),RC_UPSTREAM_BROWSER_MATRIX:JSON.stringify(f.request.browserExecution??null)});
    const out=path.join(f.runDir,'cli-'+name+'.json');
    const child=spawnSync(process.execPath,[path.join(f.root,'scripts/check-upstream-audit-disposition.mjs'),'--admission','--line',line,
      '--seed',path.join(f.runDir,'seed.json'),'--ledger',path.join(f.runDir,'ledger.json'),'--symbols',path.join(f.root,'symbols.json'),
      '--current-symbols',path.join(f.root,'current.json'),'--report',out],{cwd:f.root,env,encoding:'utf8',timeout:30000});
    assert.ok([0,1].includes(child.status),name+child.stderr+String(child.error||''));const report=JSON.parse(fs.readFileSync(out));
    assert.equal(child.status,expected?0:1,name+child.stderr+JSON.stringify(report.artifact_behavior_evidence));
    assert.equal(report.g11_claim,'not-passed');assert.equal(report.disposition_admission,expected?'pass':'incomplete');
    if(expected){assert.equal(report.inherited_execution_evidence[0].ok,true);
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,'disposition-observations.json'))).inherited_execution_evidence,report.inherited_execution_evidence);}
    observations.push({name,exit_code:child.status,fixture_only:true,actual_native_or_packed_executed:false});cliCases++;
  }
  cli('complete',null,true);
  cli('no-coordinator',null,false,false);
  cli('missing-packed',()=>delete f.request.packedConsumerExecution,false);
  cli('missing-browser',()=>delete f.request.browserExecution,false);
  cli('browser-slice',()=>browser.report.coverage='slice',false);
  cli('missing-runtime',()=>delete browser.observation.closeout_diagnostics.zoneless,false);
  cli('wrong-actual-peer',()=>browser.observation.closeout_diagnostics.zoneful.observation.content_observer_peer.runtime_sha256='a'.repeat(64),false);
  cli('rehashed-semantic-regression',()=>browser.observation.closeout_diagnostics.zoneful.observation.content_observer.stages[0].public_events=1,false);
  cli('borrowed-successful-browser',()=>delete browser.observation.closeout_diagnostics.zoneful.observation.content_observer,false);
  cli('renamed-kind',()=>f.entry.individual_proof.proof_kind='complete-individual-runtime-review',false);
  cli('relabel-irrelevant',()=>{f.entry.final_disposition='irrelevant';f.entry.subject='metadata fixture';f.entry.files=[];},false);
  cli('removed-proof-irrelevant',()=>{f.entry.final_disposition='irrelevant';f.entry.subject='metadata fixture';f.entry.files=[];delete f.entry.individual_proof;},false);
  cli('restored-complete',null,true);
}finally{f.dispose();}
const report={schema_version:1,line,actual_helper_controls:helpers,actual_CLI_controls:cliCases,actual_installed_metadata_producer_controls:metadataControls,public_observer_declarations_reviewed_at_both_minimums:true,actual_browser_writer_with_synthetic_IO:true,
  packed_case_roster:106,browser_case_roster:912,fixture_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed',observations};
const out=process.argv.indexOf('--out');if(out>=0)fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,observations:undefined}));
