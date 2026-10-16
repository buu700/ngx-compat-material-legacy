/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual reader/writer with synthetic I/O; cached actual reader for raw corruptions. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFixture,hash} from './artifact-behavior-fixture.mjs';
import {writeSyntheticRippleBrowserRun,rippleReplayRuntimeSample} from './ripple-replay-fixture.mjs';
import {readEvidenceMember} from '../../scripts/upstream-packed-run-evidence.mjs';
import {validateBrowserMatrixRun} from '../../scripts/upstream-browser-run-evidence.mjs';
import {rippleHydrationApplication,rippleHydrationReplayOkay} from '../../scripts/ripple-hydration-application.mjs';
import {RIPPLE_REPLAY_SHA,RIPPLE_REPLAY_KIND,rippleReplayRequirements,requiresRippleReplay,
  rippleReplayObservedOkay,validateRippleReplay} from '../../scripts/upstream-ripple-replay-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),read=path=>readFileSync(join(root,path));
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const definition=rippleReplayRequirements(RIPPLE_REPLAY_SHA,line),ts=createRequire(import.meta.url)('typescript');
assert.equal(requiresRippleReplay({sha:RIPPLE_REPLAY_SHA},{}),true);assert.equal(requiresRippleReplay({},{proof_kind:RIPPLE_REPLAY_KIND}),true);
assert.equal(requiresRippleReplay({},{ripple_replay_behavior:null}),true);assert.equal(requiresRippleReplay({},{}),false);
for(const unknown of ['unknown','constructor','__proto__','toString'])assert.equal(rippleReplayRequirements(RIPPLE_REPLAY_SHA,unknown),null);
assert.equal(rippleReplayRequirements('unknown',line),null);
const escaped=rippleReplayRequirements(RIPPLE_REPLAY_SHA,line);escaped.members.length=0;assert.ok(rippleReplayRequirements(RIPPLE_REPLAY_SHA,line).members.length);
const note='Synthetic validator fixture only. No source judgment, native replay, peer inheritance, policy exception, compiler floor or G11 qualification.';
const entry={sha:RIPPLE_REPLAY_SHA,bucket:'behavior-semantic',subject:'Synthetic owned ripple replay fixture',final_disposition:'adapt',
  evidence_report:'compatibility/f10/disposition-ledger/evidence/fixture-ripple-replay.json',
  individual_proof:{proof_kind:RIPPLE_REPLAY_KIND,diff_sha256:definition.patch,review_depth:'individual-compatibility',affected_branches:[line],
    decision:note,peer_reference:definition.peer_reference,ripple_replay_behavior:{kind:definition.kind,runtimes:definition.runtimes,
      source_members:definition.members.map(path=>({path,sha256:hash(read(path))}))}}};
const review={schema_version:1,sha:entry.sha,line,status:'reviewed',final_disposition:'adapt',diff_sha256:definition.patch,
  patch_file:'compatibility/rc/ripple-event-replay-10db3.patch',
  diff:JSON.parse(read('compatibility/f10/disposition-ledger/evidence/closeout-ripple-event-floor-review.json')).diff,
  decision:note,semantic_pass:false,fixture_only:true,g11_claim:'not-passed'};
assert.equal(hash(review.diff),definition.patch,'complete original diff identity');
entry.individual_proof.artifact_behavior={source_members:entry.individual_proof.ripple_replay_behavior.source_members};
const f=createFixture(root,{entry,review});delete f.entry.individual_proof.artifact_behavior;
let readerCases=0,semanticCases=0;
try {
  const browser=await writeSyntheticRippleBrowserRun(root,f);
  const targets=[f.entry,f.request,f.run,f.report,f.observation,browser.report,browser.observation],originals=targets.map(value=>structuredClone(value));
  function reset(write=true){for(const[index,target]of targets.entries()){for(const key of Object.keys(target))delete target[key];Object.assign(target,structuredClone(originals[index]));}if(write)browser.save();}
  const check=()=>validateRippleReplay({root:f.root,entry:f.entry,proof:f.entry.individual_proof,request:f.request});
  function negative(name,mutate,pattern=/./,noSave=false){reset();mutate();if(!noSave)browser.save();const result=check();assert.equal(result.ok,false,name);assert.match(result.detail,pattern,name);readerCases++;}
  assert.equal(check().ok,true,JSON.stringify(check()));readerCases++;
  const prerequisite=validateBrowserMatrixRun({root:f.root,request:f.request});assert.equal(prerequisite.ok,true);
  const source=ts.createSourceFile('guard.mjs',read('scripts/upstream-ripple-replay-evidence.mjs').toString(),ts.ScriptTarget.Latest,true);
  assert.equal(source.parseDiagnostics.length,0);
  const executable=source.statements.filter(node=>!ts.isImportDeclaration(node)).map(node=>node.getText(source).replace(/^export /,'')).join('\n');
  const bytes=new Map(definition.members.map(path=>[path,readEvidenceMember(f.root,path)]));
  const cached=new Function('createHash','isDeepStrictEqual','gunzipSync','readEvidenceMember','validateBrowserMatrixRun','rippleHydrationApplication','rippleHydrationReplayOkay',
    executable+';return validateRippleReplay;')(createHash,isDeepStrictEqual,gunzipSync,
    (_root,path)=>{assert.ok(bytes.has(path),path);return bytes.get(path);},()=>({...prerequisite,observation:browser.observation}),rippleHydrationApplication,rippleHydrationReplayOkay);
  const cachedCheck=()=>cached({root:f.root,entry:f.entry,proof:f.entry.individual_proof,request:f.request});assert.equal(cachedCheck().ok,true);
  const observed=()=>browser.observation.hydration_replay;
  const badRaw=(name,mutate)=>{reset(false);mutate(observed());assert.equal(cachedCheck().ok,false,name);semanticCases++;};
  for(const[field,value]of [['schema_version',2],['line','foreign'],['run_id','foreign'],['tarball_sha256','0'.repeat(64)],
    ['producer_sha256','0'.repeat(64)],['node','unknown'],['ok',false],['error','failed']])badRaw('header-'+field,row=>{row[field]=value;});
  badRaw('missing-runtime',row=>{row.results.pop();});badRaw('duplicate-runtime',row=>{row.results[1]=structuredClone(row.results[0]);});
  for(let index=0;index<2;index++){
    const mutations=[r=>{r.ok=false;},r=>{r.lock_sha256='';},r=>{r.dependencies={};},r=>{r.source_sha256={};},
      r=>{r.server_hydration_metadata=false;},r=>{r.before_bootstrap=false;},r=>{r.ssr_button_reused=false;},r=>{r.window_errors.push('failure');},
      r=>{r.destroyed=false;},r=>{r.remaining_ripple_nodes=1;},r=>{delete r.native_peer_events;},r=>{delete r.public_peer_replay;}];
    const sample=rippleReplayRuntimeSample(line,index?'zoneless':'zoneful');
    for(const name of Object.keys(sample.dependencies))mutations.push(r=>{r.dependencies[name]='0';});
    for(const path of Object.keys(sample.source_sha256))mutations.push(r=>{r.source_sha256[path]='0'.repeat(64);});
    for(const[field,value]of [['launched',false],['engine','firefox'],['protocol','webdriver'],['product','Firefox/130'],['binary',''],['port',0]])mutations.push(r=>{r.browser[field]=value;});
    for(const phase of ['replayed','live']){
      for(const field of ['actual_peer_directive_present','actual_owned_renderer_present'])mutations.push(r=>{r[phase][field]=false;});
      for(const field of ['clicks','owned_ripple_launches','peer_ripple_launches'])mutations.push(r=>{r[phase][field]=0;});
      mutations.push(r=>{r[phase].deliveries.pop();});mutations.push(r=>{r[phase].deliveries.reverse();});
      for(let n=0;n<sample[phase].deliveries.length;n++)for(const[field,value]of [['type','foreign'],['path_threw',!sample[phase].deliveries[n].path_threw],['target_id','other'],['peer_present',false]])mutations.push(r=>{r[phase].deliveries[n][field]=value;});
    }
    for(const path of ['captured_native','native_peer_events.normal_input','native_peer_events.fault_input']){
      const select=r=>path.split('.').reduce((value,key)=>value[key],r);
      mutations.push(r=>select(r).pop());mutations.push(r=>select(r).reverse());
      for(let n=0;n<3;n++)for(const[field,value]of [['type','foreign'],['trusted',false],['target_id','other']])mutations.push(r=>{select(r)[n][field]=value;});
    }
    for(const[field,value]of [['phase','wrong'],['normal_creations',0],['fault_creations',line==='main'?0:1],['path_calls',0]])mutations.push(r=>{r.native_peer_events[field]=value;});
    mutations.push(r=>{r.native_peer_events.normal_errors.push('unexpected');});
    mutations.push(r=>{r.native_peer_events.fault_errors=line==='main'?['unexpected']:[];});
    if(line==='21.x')mutations.push(r=>{r.native_peer_events.fault_errors=['unrelated failure'];});
    function publicLeaves(node,path=[]){for(const[key,value]of Object.entries(node)){
      const next=[...path,key];if(value&&typeof value==='object')publicLeaves(value,next);
      else mutations.push(r=>{let target=r.public_peer_replay;for(const part of next.slice(0,-1))target=target[part];
        target[next.at(-1)]=typeof value==='boolean'?!value:typeof value==='number'?value+1:'foreign';});
    }}
    publicLeaves(sample.public_peer_replay);
    for(const [n,mutate]of mutations.entries())badRaw('runtime-'+index+'-mutation-'+n,row=>mutate(row.results[index]));
  }
  negative('foreign-sha',()=>{f.entry.sha='0'.repeat(40);},/unregistered/);
  negative('renamed-kind',()=>{f.entry.individual_proof.proof_kind='ordinary-source';},/unregistered/);
  negative('wrong-patch',()=>{f.entry.individual_proof.diff_sha256='0'.repeat(64);},/unregistered/);
  negative('wrong-peer',()=>{f.entry.individual_proof.peer_reference.helper_has_replay_catch=!definition.peer_reference.helper_has_replay_catch;},/peer reference/);
  negative('wrong-line',()=>{f.request.line=line==='main'?'21.x':'main';},/peer reference/);
  for(const field of ['kind','runtimes'])negative('scope-'+field,()=>{f.entry.individual_proof.ripple_replay_behavior[field]='wrong';},/scope/);
  negative('missing-source',()=>{f.entry.individual_proof.ripple_replay_behavior.source_members.pop();},/source scope/);
  negative('duplicate-source',()=>{const rows=f.entry.individual_proof.ripple_replay_behavior.source_members;rows[1]=structuredClone(rows[0]);},/source scope/);
  negative('stale-source',()=>{f.entry.individual_proof.ripple_replay_behavior.source_members[0].sha256='0'.repeat(64);},/source member/);
  negative('missing-browser',()=>{delete f.request.browserExecution;},/coordinator-observed browser/);
  negative('failed-browser',()=>{f.request.browserExecution.exit_code=8;},/coordinator-observed browser/);
  negative('missing-packed',()=>{delete f.request.packedConsumerExecution;});
  negative('browser-slice',()=>{browser.report.executed_case_ids.pop();},/browser executed/);
  negative('raw-rehashed-failure',()=>{observed().results[0].public_peer_replay.replayed.creations.push({phase:'replay'});},/route observations/);
  negative('missing-hydration-report',()=>{delete browser.observation.hydration_replay;},/native prerequisites/);
  negative('marker-hydration-report',()=>{browser.observation.hydration_replay={ok:true};},/route observations/);
  negative('tampered-output',()=>{f.runPut(browser.relative,'{}');},/bytes\/hash/,true);
  reset();
  const result={schema_version:1,line,scope:note,helper_sha256:hash(read('scripts/upstream-ripple-replay-evidence.mjs')),
    producer_sha256:hash(read('tests/upstream/ripple-replay-admission.mjs')),actual_reader_writer_controls:readerCases,
    cached_actual_body_raw_controls:semanticCases,full_packed_prerequisite:106,full_browser_prerequisite:912,
    original_application_and_observer_controls_unchanged:true,root_dispatch_exercised:false,actual_native_packed_or_floor_qualified:false};
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}finally{f.dispose();}
