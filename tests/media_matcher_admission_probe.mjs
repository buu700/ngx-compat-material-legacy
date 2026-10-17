/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual admission/writer/installed metadata; browser/package execution is synthetic. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createFixture,hash} from './upstream/artifact-behavior-fixture.mjs';
import {writeSyntheticBrowserRun} from './upstream/browser-run-fixture.mjs';
import {mediaMatcherPeerRequirements,readMediaMatcherPeer} from '../scripts/media-matcher-peer-identity.mjs';
import {MEDIA_MATCHER_SHA,MEDIA_MATCHER_KIND,mediaMatcherRequirements,requiresMediaMatcher,mediaMatcherNativeOkay,validateMediaMatcher} from '../scripts/upstream-media-matcher-evidence.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p));
const line=json('projects/ngx-material-legacy/package.json').version.startsWith('21.')?'21.x':'main';
const ts=createRequire(import.meta.url)('typescript');
const probeRule='@media (min-width: 0px) html --closeout-peer-query-css-probe: 1 /* {body{ }}';
const sample=()=>({available:true,valid_query_matches:true,unsafe_query_matches:false,before_marker:'',after_marker:'',unsafe_query_css_injected:false,attempted_rules:[probeRule],removed_probe_rules:0,cleanup_marker:'',error:null});
let metadataControls=0,predicateControls=0,helpers=0,cliCases=0;
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'media-matcher-installed-identity-'));
const decoded=member=>{const stored=read(member.path);assert.equal(hash(stored),member.stored_sha256);const raw=gunzipSync(stored);assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);return raw;};
try{
 for(const branch of ['main','21.x']){
  const peer=mediaMatcherPeerRequirements(branch),pkgRoot=path.join(temp,'node_modules/@angular/cdk');
  for(const member of peer.members){const target=path.join(pkgRoot,member.module_path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,decoded(member));}
  assert.deepEqual(readMediaMatcherPeer(temp),peer.consumer_peer);metadataControls++;
  const type=ts.createSourceFile('layout.d.ts',decoded(peer.members[3]).toString(),ts.ScriptTarget.Latest,true);assert.equal(type.parseDiagnostics.length,0);
  const cls=type.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MediaMatcher');assert.ok(cls);
  const method=cls.members.find(n=>ts.isMethodDeclaration(n)&&n.name.getText(type)==='matchMedia');assert.ok(method);
  assert.equal(method.parameters.length,1);assert.equal(method.parameters[0].type.getText(type),'string');assert.equal(method.type.getText(type),'MediaQueryList');
  for(const n of [cls,method])assert.ok(!ts.getJSDocTags(n).some(tag=>['deprecated','docs-private','experimental','breaking-change'].includes(tag.tagName.text)));
  assert.ok(type.statements.some(n=>ts.isExportDeclaration(n)&&n.exportClause?.elements?.some(e=>e.name.text==='MediaMatcher')));
  const implementation=decoded(peer.members[2]).toString();assert.equal(implementation.includes("query.replace(/[{}]/g, '')"),branch==='main');
  const manifest=decoded(peer.members[0]);
  for(const bad of ['../escape.mjs','./fesm2022/../escape.mjs','./elsewhere.mjs']){
    const pkg=JSON.parse(manifest);pkg.exports['./layout'].default=bad;fs.writeFileSync(path.join(pkgRoot,'package.json'),JSON.stringify(pkg));
    assert.throws(()=>readMediaMatcherPeer(temp),/wrong public layout exports/);metadataControls++;
  }
  fs.writeFileSync(path.join(pkgRoot,'package.json'),manifest);
  const runtimePath=path.join(pkgRoot,peer.consumer_peer.runtime_member),runtime=fs.readFileSync(runtimePath);
  fs.writeFileSync(runtimePath,Buffer.from('export const MediaMatcher = null;'));assert.throws(()=>readMediaMatcherPeer(temp),/no longer exports/);metadataControls++;
  fs.unlinkSync(runtimePath);const external=path.join(temp,'external.mjs');fs.writeFileSync(external,runtime);fs.symlinkSync(external,runtimePath);
  assert.throws(()=>readMediaMatcherPeer(temp),/escapes installed package/);metadataControls++;
  fs.unlinkSync(runtimePath);fs.writeFileSync(runtimePath,runtime);
  const chunk=path.join(pkgRoot,peer.consumer_peer.implementation_member),bytes=fs.readFileSync(chunk);fs.writeFileSync(chunk,Buffer.concat([bytes,Buffer.from('\n// changed peer\n')]));
  assert.notDeepEqual(readMediaMatcherPeer(temp),peer.consumer_peer);metadataControls++;fs.writeFileSync(chunk,bytes);
 }
}finally{fs.rmSync(temp,{recursive:true,force:true});}
for(const branch of ['foreign','__proto__','constructor']){assert.equal(mediaMatcherPeerRequirements(branch),null);assert.equal(mediaMatcherRequirements(MEDIA_MATCHER_SHA,branch),null);}
assert.equal(mediaMatcherRequirements(MEDIA_MATCHER_SHA,'21.x'),null);
const escaped=mediaMatcherPeerRequirements('main');escaped.members.length=0;assert.equal(mediaMatcherPeerRequirements('main').members.length,4);
const definition=mediaMatcherRequirements(MEDIA_MATCHER_SHA,'main');assert.deepEqual(definition,json('compatibility/rc/media-matcher-admission-contract.json').main);
assert.ok(requiresMediaMatcher({sha:MEDIA_MATCHER_SHA},{}));assert.ok(requiresMediaMatcher({},{proof_kind:MEDIA_MATCHER_KIND}));assert.ok(requiresMediaMatcher({},{media_matcher_behavior:null}));assert.equal(requiresMediaMatcher({},{}),false);
assert.ok(mediaMatcherNativeOkay(sample()));predicateControls++;
for(const [key,values] of Object.entries({available:[false,null],valid_query_matches:[false,'true'],unsafe_query_matches:[true,null],before_marker:['1',null],after_marker:['1',null],cleanup_marker:['1',null],unsafe_query_css_injected:[true,null],removed_probe_rules:[1,null],error:['SyntaxError',undefined],attempted_rules:[[],[probeRule,probeRule],['@media '+"(min-width: 0px) {html {--closeout-peer-query-css-probe: 1} /*"+' {body{ }}'],[probeRule.replace('html','body')]]}))for(const value of values){const raw=sample();raw[key]=value;assert.equal(mediaMatcherNativeOkay(raw),false,key+':'+JSON.stringify(value));predicateControls++;}
const ledger=json('compatibility/f10/disposition-ledger/ledger.json'),entry=structuredClone(ledger.entries.find(e=>e.sha===MEDIA_MATCHER_SHA));
const observations=[];
if(line==='21.x'){
 assert.equal(entry.final_disposition,'security-review');assert.equal(validateMediaMatcher({root,entry,proof:entry.individual_proof,request:{line}}).ok,false);helpers++;
 // Neither the main source decision nor valid diagnostic-shaped data grants21.x inheritance.
 for(const altered of [{...entry,final_disposition:'inherited'}, {sha:MEDIA_MATCHER_SHA,final_disposition:'irrelevant'}, {sha:MEDIA_MATCHER_SHA}]){
  assert.equal(validateMediaMatcher({root,entry:altered,proof:{affected_branches:['21.x'],proof_kind:MEDIA_MATCHER_KIND},request:{line}}).ok,false);helpers++;
 }
}else{
 const review=json(entry.evidence_report);assert.equal(entry.individual_proof.proof_kind,MEDIA_MATCHER_KIND);assert.equal(review.native_admission.qualified_by_this_document,false);
 entry.individual_proof.artifact_behavior={source_members:entry.individual_proof.media_matcher_behavior.source_members};
 const f=createFixture(root,{entry,review});delete f.entry.individual_proof.artifact_behavior;
 const browser=await writeSyntheticBrowserRun(root,f,()=>({peer_media_matcher:sample(),media_matcher_peer:structuredClone(definition.consumer_peer)}));
 const targets=[f.entry,f.request,f.run,f.report,f.observation,browser.report,browser.observation],originals=targets.map(v=>structuredClone(v));
 const peerPath=definition.installed_member.path,peerBytes=fs.readFileSync(path.join(f.root,peerPath));
 const inspect=()=>validateMediaMatcher({root:f.root,entry:f.entry,proof:f.entry.individual_proof,request:f.request});
 function reset(){for(const[i,target]of targets.entries()){for(const key of Object.keys(target))delete target[key];Object.assign(target,structuredClone(originals[i]));}f.repoPut(peerPath,peerBytes);browser.save();}
 function negative(name,mutate,pattern=/./){reset();mutate();browser.save();const result=inspect();assert.equal(result.ok,false,name);assert.match(result.detail,pattern,name);helpers++;}
 try{
  assert.equal(inspect().ok,true,JSON.stringify(inspect()));helpers++;
  negative('renamed-kind',()=>f.entry.individual_proof.proof_kind='source-done',/unregistered/);
  negative('wrong-sha',()=>f.entry.sha='a'.repeat(40),/unregistered/);
  negative('wrong-patch',()=>f.entry.individual_proof.diff_sha256='a'.repeat(64),/unregistered/);
  negative('relabel-disposition',()=>f.entry.final_disposition='irrelevant',/unregistered/);
  negative('wrong-scope',()=>f.entry.individual_proof.media_matcher_behavior.kind='other',/scope/);
  negative('missing-runtime-scope',()=>f.entry.individual_proof.media_matcher_behavior.runtimes.pop(),/scope/);
  negative('wrong-case',()=>f.entry.individual_proof.media_matcher_behavior.case_ids=['other'],/scope/);
  negative('wrong-branch',()=>f.entry.individual_proof.affected_branches=['21.x'],/peer/);
  negative('wrong-installed-hash',()=>f.entry.individual_proof.installed_member.sha256='a'.repeat(64),/peer/);
  negative('wrong-types-hash',()=>f.entry.individual_proof.public_declaration.sha256='a'.repeat(64),/peer/);
  negative('borrowed-delegation',()=>f.entry.individual_proof.reachable_behavior.id='other',/delegation/);
  negative('missing-source',()=>f.entry.individual_proof.media_matcher_behavior.source_members.pop(),/scope/);
  negative('duplicate-source',()=>{const s=f.entry.individual_proof.media_matcher_behavior.source_members;s[1]=s[0];},/scope/);
  negative('stale-source',()=>f.entry.individual_proof.media_matcher_behavior.source_members[0].sha256='a'.repeat(64),/stale/);
  negative('self-rehashed-peer-forgery',()=>{const stored=gzipSync(Buffer.from('export class MediaMatcher {}'));f.repoPut(peerPath,stored);f.entry.individual_proof.media_matcher_behavior.source_members.find(m=>m.path===peerPath).sha256=hash(stored);},/authenticated/);
  negative('missing-packed',()=>delete f.request.packedConsumerExecution);
  negative('missing-browser',()=>delete f.request.browserExecution);
  negative('foreign-run',()=>f.request.browserExecution.run_id='other');
  negative('sliced-browser',()=>browser.report.coverage='slice');
  negative('missing-runtime',()=>delete browser.observation.closeout_diagnostics.zoneless);
  negative('missing-browser-case',()=>browser.observation.cases.pop());
  negative('wrong-artifact',()=>browser.observation.library_sha256='a'.repeat(64));
  negative('wrong-source',()=>browser.observation.source_commit='a'.repeat(40));
  negative('foreign-minimum',()=>f.request.line='21.x',/unregistered/);
  for(const runtime of ['zoneful','zoneless']){
   const raw=()=>browser.observation.closeout_diagnostics[runtime].observation;
   negative(runtime+'-wrong-identity',()=>raw().media_matcher_peer.implementation_sha256='a'.repeat(64),/actually installed/);
   negative(runtime+'-wrong-runtime',()=>raw().zoneless=runtime==='zoneful');
   negative(runtime+'-borrowed-browser',()=>delete raw().peer_media_matcher,/observations/);
   negative(runtime+'-missing-insertion',()=>raw().peer_media_matcher.attempted_rules=[],/observations/);
   negative(runtime+'-raw-query-insertion',()=>raw().peer_media_matcher.attempted_rules=[probeRule.replace('html','{html {')],/observations/);
   negative(runtime+'-marker-injection',()=>raw().peer_media_matcher.after_marker='1',/observations/);
   negative(runtime+'-hidden-error',()=>raw().peer_media_matcher.error='SyntaxError',/observations/);
  }
  const output=path.join(f.runDir,'evidence/upstream-audit-disposition/synthetic-media');fs.mkdirSync(output,{recursive:true});
  function cli(name,mutate,expected,coordinator=true){
   reset();mutate?.();browser.save();f.runPut('seed.json',{commits:[{sha:MEDIA_MATCHER_SHA}],fixture_only:true});f.runPut('ledger.json',{entries:[f.entry],fixture_only:true,g11_claim:'not-passed'});
   const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('RC_')));
   if(coordinator)Object.assign(env,{RC_CHECK_ID:'upstream-audit-disposition',RC_RUN_ID:f.request.runId,RC_INVOCATION_ID:'synthetic-media',RC_EVIDENCE_BINDING:JSON.stringify(f.request.binding),RC_ASSERTION_OUTPUT_DIR:output,RC_UPSTREAM_PACKED_CONSUMER:JSON.stringify(f.request.packedConsumerExecution??null),RC_UPSTREAM_BROWSER_MATRIX:JSON.stringify(f.request.browserExecution??null)});
   const out=path.join(f.runDir,'cli-'+name+'.json'),child=spawnSync(process.execPath,[path.join(f.root,'scripts/check-upstream-audit-disposition.mjs'),'--admission','--line',line,'--seed',path.join(f.runDir,'seed.json'),'--ledger',path.join(f.runDir,'ledger.json'),'--symbols',path.join(f.root,'symbols.json'),'--current-symbols',path.join(f.root,'current.json'),'--report',out],{cwd:f.root,env,encoding:'utf8',timeout:30000});
   assert.ok([0,1].includes(child.status),name+child.stderr+String(child.error||''));const report=JSON.parse(fs.readFileSync(out));
   assert.equal(child.status,expected?0:1,name+child.stderr+JSON.stringify(report.artifact_behavior_evidence));assert.equal(report.g11_claim,'not-passed');assert.equal(report.disposition_admission,expected?'pass':'incomplete');
   if(expected){assert.equal(report.inherited_execution_evidence[0].ok,true);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,'disposition-observations.json'))).inherited_execution_evidence,report.inherited_execution_evidence);}
   observations.push({name,exit_code:child.status,fixture_only:true,actual_native_or_packed_executed:false});cliCases++;
  }
  cli('complete',null,true);cli('no-coordinator',null,false,false);
  cli('missing-packed',()=>delete f.request.packedConsumerExecution,false);cli('missing-browser',()=>delete f.request.browserExecution,false);
  cli('browser-slice',()=>browser.report.coverage='slice',false);cli('missing-runtime',()=>delete browser.observation.closeout_diagnostics.zoneless,false);
  cli('wrong-actual-peer',()=>browser.observation.closeout_diagnostics.zoneful.observation.media_matcher_peer.runtime_sha256='a'.repeat(64),false);
  cli('rehashed-semantic-regression',()=>browser.observation.closeout_diagnostics.zoneful.observation.peer_media_matcher.after_marker='1',false);
  cli('borrowed-successful-browser',()=>delete browser.observation.closeout_diagnostics.zoneful.observation.peer_media_matcher,false);
  cli('renamed-kind',()=>f.entry.individual_proof.proof_kind='complete-individual-runtime-review',false);
  cli('relabel-irrelevant',()=>{f.entry.final_disposition='irrelevant';f.entry.subject='metadata fixture';f.entry.files=[];},false);
  cli('removed-proof-irrelevant',()=>{f.entry.final_disposition='irrelevant';f.entry.subject='metadata fixture';f.entry.files=[];delete f.entry.individual_proof;},false);
  cli('restored-complete',null,true);
 }finally{f.dispose();}
}
const report={schema_version:1,line,actual_helper_controls:helpers,actual_CLI_controls:cliCases,metadata_controls:metadataControls,predicate_controls:predicateControls,public_declarations_reviewed_at_both_minimums:true,security_review_preserved:true,actual_browser_writer_with_synthetic_IO:line==='main',packed_case_roster:106,browser_case_roster:912,fixture_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed',observations};
const out=process.argv.indexOf('--out');if(out>=0)fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,observations:undefined}));
