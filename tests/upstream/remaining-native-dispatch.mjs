/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual root CLI on synthetic complete packed/native reports. No product qualification. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFixture,hash} from './artifact-behavior-fixture.mjs';
import {writeSyntheticBrowserRun} from './browser-run-fixture.mjs';
import {writeSyntheticNativeMotionRun} from './native-motion-run-fixture.mjs';
import {writeSyntheticRippleBrowserRun} from './ripple-replay-fixture.mjs';
import {formFieldHoverSample} from '../form_field_hover_sample.mjs';
import {tabCompletionMotionSample} from '../tab_completion_sample.mjs';
import {samplePass} from '../../scripts/native-motion-roster.mjs';
import {FORM_FIELD_HOVER_SHA,FORM_FIELD_HOVER_KIND,formFieldHoverRequirements} from '../../scripts/upstream-form-field-hover-evidence.mjs';
import {TAB_COMPLETION_SHA,TAB_COMPLETION_KIND,tabCompletionRequirements} from '../../scripts/upstream-tab-completion-evidence.mjs';
import {RIPPLE_REPLAY_SHA,RIPPLE_REPLAY_KIND,rippleReplayRequirements} from '../../scripts/upstream-ripple-replay-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),read=path=>readFileSync(join(root,path));
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const note='Synthetic root dispatch regression fixture. No individual original-hunk/source judgment, native replay, compiler floor or G11 qualification.';
const environment=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('RC_')));
const cases=[];
for(const subject of ['hover','tabs','ripple']){
  const [sha,kind,requirements,field,patchPath]=subject==='hover'?[FORM_FIELD_HOVER_SHA,FORM_FIELD_HOVER_KIND,formFieldHoverRequirements,
    'form_field_hover_behavior','compatibility/f10/disposition-ledger/evidence/patches/cf456a2d43837497367662e7de22f1b2bcbf4f00-whole-form-hover.patch']:
    subject==='tabs'?[TAB_COMPLETION_SHA,TAB_COMPLETION_KIND,tabCompletionRequirements,'tab_completion_behavior',
      'compatibility/rc/resource-style-upstream-patches/0064b4218b375b30b65bf1c13530d8620f20d980.patch']:
    [RIPPLE_REPLAY_SHA,RIPPLE_REPLAY_KIND,rippleReplayRequirements,'ripple_replay_behavior','compatibility/rc/ripple-event-replay-10db3.patch'];
  const definition=requirements(sha,line),disposition=subject==='ripple'?'adapt':'do-not-adopt';
  const scope={kind:definition.kind,runtimes:definition.runtimes,source_members:definition.members.map(path=>({path,sha256:hash(read(path))}))};
  if(subject==='hover')scope.themes=definition.themes;
  if(subject==='tabs')Object.assign(scope,{engines:definition.engines,modes:definition.modes,case_ids:definition.case_ids});
  const proof={proof_kind:kind,diff_sha256:definition.patch,review_depth:'individual-compatibility',affected_branches:[line],decision:note,[field]:scope,
    [subject==='hover'?'installed_member':'peer_reference']:definition.installed_member??definition.peer_reference};
  proof.artifact_behavior={source_members:scope.source_members};
  const entry={sha,bucket:'behavior-semantic',subject:'Synthetic '+subject+' root dispatch',final_disposition:disposition,
    evidence_report:'compatibility/f10/disposition-ledger/evidence/fixture-'+subject+'-dispatch.json',individual_proof:proof};
  const review={schema_version:1,sha,line,status:'reviewed',final_disposition:disposition,diff_sha256:definition.patch,patch_file:patchPath,
    decision:note,semantic_pass:false,fixture_only:true,g11_claim:'not-passed'};
  if(subject==='hover')review.diff=JSON.parse(read('compatibility/f10/disposition-ledger/evidence/closeout-form-field-hover-source-review.json')).reviews.find(row=>row.sha===sha).diff;
  if(subject==='ripple')review.diff=JSON.parse(read('compatibility/f10/disposition-ledger/evidence/closeout-ripple-event-floor-review.json')).diff;
  assert.equal(hash(review.diff??read(patchPath)),definition.patch,'complete original diff identity');
  const f=createFixture(root,{entry,review});delete f.entry.individual_proof.artifact_behavior;
  try {
    const native=subject==='tabs'?await writeSyntheticNativeMotionRun(root,f,id=>{
      const parts=id.split('/');return parts[5]==='tabs'&&parts[4]!=='interruption-destruction'?tabCompletionMotionSample(parts.at(-1)):samplePass(id);
    }):subject==='hover'?await writeSyntheticBrowserRun(root,f,()=>({peer_form_hover:formFieldHoverSample(),progress_csp:{compiled_css_sha256:'c'.repeat(64)}})):
      await writeSyntheticRippleBrowserRun(root,f);
    const targets=[f.entry,f.request,f.run,f.report,f.observation,native.report,native.observation],originals=targets.map(value=>structuredClone(value));
    function reset(){for(const[index,target]of targets.entries()){for(const key of Object.keys(target))delete target[key];Object.assign(target,structuredClone(originals[index]));}native.save();}
    const out=join(f.runDir,'evidence/upstream-audit-disposition/synthetic-dispatch');mkdirSync(out,{recursive:true});
    function cli(name,mutate,expected,override={}){
      reset();mutate?.();native.save();f.runPut('seed.json',{commits:[{sha}],fixture_only:true});
      f.runPut('ledger.json',{entries:[f.entry],fixture_only:true,g11_claim:'not-passed'});
      const reportPath=join(f.runDir,name+'.json'),env={...environment,RC_CHECK_ID:'upstream-audit-disposition',RC_RUN_ID:f.request.runId,
        RC_INVOCATION_ID:'synthetic-dispatch',RC_EVIDENCE_BINDING:JSON.stringify(f.request.binding),RC_ASSERTION_OUTPUT_DIR:out,
        RC_UPSTREAM_PACKED_CONSUMER:JSON.stringify(f.request.packedConsumerExecution??null),
        RC_UPSTREAM_BROWSER_MATRIX:JSON.stringify(f.request.browserExecution??null),
        RC_UPSTREAM_NATIVE_MOTION:JSON.stringify(f.request.nativeMotionExecution??null),...override};
      const child=spawnSync(process.execPath,[join(f.root,'scripts/check-upstream-audit-disposition.mjs'),'--admission','--line',line,
        '--seed',join(f.runDir,'seed.json'),'--ledger',join(f.runDir,'ledger.json'),'--symbols',join(f.root,'symbols.json'),
        '--current-symbols',join(f.root,'current.json'),'--report',reportPath],{cwd:f.root,env,encoding:'utf8',timeout:30000});
      if(expected==='parse-failure'){
        assert.equal(child.status,2,name+child.stderr);assert.equal(existsSync(reportPath),false);
        assert.match(child.stderr,/RC_UPSTREAM_NATIVE_MOTION is not JSON/);
      }else{
        assert.ok([0,1].includes(child.status),name+child.stderr);
        const observed=JSON.parse(readFileSync(reportPath));
        assert.equal(child.status===0,expected,subject+'/'+name+child.stderr+JSON.stringify(observed.artifact_behavior_evidence));
        assert.equal(observed.authored_use_review_evidence.insufficient,0);assert.equal(observed.g11_claim,'not-passed');
        if(expected){assert.equal(observed.artifact_behavior_evidence.length,1);assert.equal(observed.artifact_behavior_evidence[0].sha,sha);
          assert.equal(observed.artifact_behavior_evidence[0].ok,true);
          const owned=JSON.parse(readFileSync(join(out,'disposition-observations.json')));assert.deepEqual(owned.artifact_behavior_evidence,observed.artifact_behavior_evidence);}
      }
      cases.push({subject,name,rejected:expected!==true,result:'pass'});
    }
    const capture=subject==='tabs'?'nativeMotionExecution':'browserExecution';
    cli('complete',null,true);
    cli('missing-observed-prerequisite',()=>{delete f.request[capture];},false);
    cli('failed-observed-prerequisite',()=>{f.request[capture].exit_code=7;},false);
    cli('foreign-observed-run',()=>{f.request[capture].run_id='foreign';},false);
    cli('missing-packed-prerequisite',()=>{delete f.request.packedConsumerExecution;},false);
    cli('stale-reviewed-source',()=>{f.entry.individual_proof[field].source_members[0].sha256='0'.repeat(64);},false);
    cli('relabel-irrelevant',()=>{f.entry.final_disposition='irrelevant';f.entry.bucket='low-risk';f.entry.individual_proof.proof_kind='ordinary-source';delete f.entry.individual_proof[field];},false);
    cli('rehashed-raw-failure',()=>{
      if(subject==='hover')native.observation.closeout_diagnostics.zoneful.observation.peer_form_hover.state_token_scenarios[0].hint.opacity='0';
      else if(subject==='tabs'){
        for(const row of native.observation.cases)if(row.case_id.includes('/tabs/')&&row.case_id.endsWith('/enabled'))row.observation.native_transition.trusted_events=[];
      }else native.observation.hydration_replay.results[0].public_peer_replay.replayed.creations.push({phase:'replay'});
    },false);
    if(subject==='tabs')cli('malformed-native-capture',null,'parse-failure',{RC_UPSTREAM_NATIVE_MOTION:'{'});
  }finally{f.dispose();}
}
const result={schema_version:1,line,scope:note,actual_root_cli_cases:cases.length,cases,
  each_registered_sha_forces_individual_native_admission:true,observed_native_capture_required:true,
  root_dispatch_exercised:true,actual_native_packed_or_floor_qualified:false,
  root_sha256:hash(read('scripts/check-upstream-audit-disposition.mjs')),producer_sha256:hash(read('tests/upstream/remaining-native-dispatch.mjs'))};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({line,actual_root_cli_cases:cases.length,root_dispatch_exercised:true,actual_native_packed_or_floor_qualified:false}));
