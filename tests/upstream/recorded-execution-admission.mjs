/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual readers/CLI and Python bridge; every run/observation here is synthetic. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,renameSync,symlinkSync,unlinkSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFixture,hash} from './artifact-behavior-fixture.mjs';
import {ARTIFACT_BEHAVIOR_KIND,CHIP_BACKSPACE_SHA,CHIP_SEPARATOR_SHA,artifactBehaviorRequirements,requiresArtifactBehavior,validateArtifactBehavior} from '../../scripts/upstream-artifact-behavior-evidence.mjs';
import {OWNED_STYLE_KIND,SNACK_STYLE_SHA,SELECT_STYLE_SHA,ownedStyleRequirements,requiresOwnedStyle,validateOwnedStyle} from '../../scripts/upstream-owned-style-evidence.mjs';
import {ownedStyleCaseIds} from '../../scripts/owned-style-contract.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),read=path=>readFileSync(join(root,path));
const ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')).entries;
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const task=JSON.parse(read('compatibility/rc/recorded-execution-current-worksheet.json'));
const precedingLedger=JSON.parse(execFileSync('git',['--no-replace-objects','show',task.source_parent+':compatibility/f10/disposition-ledger/ledger.json'],{cwd:root,maxBuffer:16*1024*1024})).entries;
const chipIds=[CHIP_BACKSPACE_SHA,CHIP_SEPARATOR_SHA],styleIds=[SNACK_STYLE_SHA,SELECT_STYLE_SHA];
const oldArtifactIds=['1b6db8c89b00ace8aaa0e0824866acec5369635f','688c430fe8df09152ee59eb8a2ca62b5ba2fb81e','ca9c490ee30dbf7c9c147079197d0dbc0abcd611','86ebb9bfd55e637be1e6d0117a10e290c5247ebd','86a96c9290e3896485c6b6c0d039873652f543df','68b267dd59f3addf92a3b9f8ce9e8baa479df7f4'];
let controls=0,cliControls=0,sourceControls=0,styleSemanticControls=0,relabelMutants=0;const cliCases=[];
const note='Synthetic current-reader control only; no source, Angular, artifact, floor, rendering, advisory or approval qualification.';
const environment=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('RC_')));
const originalEntries=new Map([...chipIds,...styleIds].map(sha=>[sha,ledger.find(entry=>entry.sha===sha)]));
const requirements=sha=>chipIds.includes(sha)?artifactBehaviorRequirements(sha):ownedStyleRequirements(sha);
const entries=new Map([...originalEntries].map(([sha,original])=>{
  const entry=structuredClone(original),scope=requirements(sha),field=chipIds.includes(sha)?'artifact_behavior':'owned_style_behavior';
  delete entry.individual_proof.execution;
  entry.individual_proof.affected_branches=[line];
  entry.individual_proof.proof_kind=chipIds.includes(sha)?ARTIFACT_BEHAVIOR_KIND:OWNED_STYLE_KIND;
  entry.individual_proof[field]={kind:scope.kind,case_ids:scope.case_ids,source_members:scope.members.map(path=>({path,sha256:hash(read(path))}))};
  return [sha,entry];
}));
for(const sha of [...chipIds,...styleIds]){
  const metadata=requirements(sha),changed=structuredClone(metadata);changed.members.length=0;
  assert.ok(requirements(sha).members.length>0);
  assert.equal((chipIds.includes(sha)?requiresArtifactBehavior:requiresOwnedStyle)({sha},{}),true);
}
assert.equal(ownedStyleRequirements('unknown'),null);
assert.equal(requiresOwnedStyle({},{}),false);assert.equal(requiresOwnedStyle({}, {owned_style_behavior:null}),true);

function styleExtras(){
  const code="import ast,json,pathlib,sys;root=pathlib.Path(sys.argv[1]);seen=set();queue=['owned_rendered_admission'];\nwhile queue:\n name=queue.pop();p=root/'scripts'/(name+'.py')\n if name in seen or not p.exists():continue\n seen.add(name)\n for node in ast.walk(ast.parse(p.read_text())):\n  if isinstance(node,ast.ImportFrom) and node.module:queue.append(node.module)\nprint(json.dumps(['scripts/'+name+'.py' for name in sorted(seen)]+[str(p.relative_to(root)) for p in (root/'fixtures/sass').glob('*.json')]+['compatibility/rc/oracles/material-16.2.14-sass-api.json']))";
  return [...JSON.parse(execFileSync('python3',['-c',code,root],{encoding:'utf8'})),
    ...['_index.scss','styles/core/ripple/_ripple-theme.scss','styles/core/theming/_theming.scss','styles/core/theming/_palette.scss','styles/core/density/private/_compatibility.scss','styles/core/style/_sass-utils.scss'].map(path=>'projects/ngx-material-legacy/'+path)];
}
function putObject(target,value){for(const key of Object.keys(target))delete target[key];Object.assign(target,structuredClone(value));}
for(const type of ['chip','style']){
  const ids=type==='chip'?chipIds:styleIds,base=structuredClone(entries.get(ids[0]));
  const currentReview=JSON.parse(read(originalEntries.get(ids[0]).evidence_report));
  base.evidence_report='compatibility/f10/disposition-ledger/evidence/recorded-'+type+'-fixture.json';
  const review=type==='chip'?currentReview:{...currentReview,individual_proof:base.individual_proof,fixture_only:true};
  const shim=structuredClone(base);shim.individual_proof.artifact_behavior={source_members:[...new Map(ids.flatMap(sha=>requirements(sha).members).map(path=>[path,{path,sha256:hash(read(path))}])).values()]};
  const extras=[...(type==='style'?styleExtras():[]),...ids.slice(1).map(sha=>originalEntries.get(sha).evidence_report)];
  const f=createFixture(root,{entry:shim,review,extraMembers:extras});
  // The generic fixture's source-copy shim is not the actual subject proof.
  putObject(f.entry,base);
  if(type==='style'){
    const version=f.line==='main'?'22.1.7':'21.2.14',core=f.line==='main'?'22.1.7':'21.2.23';
    f.run.oracles={current_peer:[{id:'@angular/core',version:core},{id:'@angular/cdk',version},{id:'@angular/material',version}],fixture_only:true};
    f.request.binding.oracles_sha256=execFileSync('python3',['-c','import json,sys;sys.path.insert(0,sys.argv[1]);from rc_acceptance import json_digest;print(json_digest(json.load(sys.stdin)))',join(root,'scripts')],{encoding:'utf8',input:JSON.stringify(f.run.oracles)}).trim();
    f.save();
    const depPath='evidence/dependency-eligibility/synthetic-dependency/eligibility-observations.json';
    const dep=JSON.parse(readFileSync(join(f.runDir,depPath)));dep.binding=f.request.binding;f.runPut(depPath,dep);
    const depReport=JSON.parse(readFileSync(join(f.runDir,'reports/dependency-eligibility.json')));depReport.binding=f.request.binding;
    const depBytes=readFileSync(join(f.runDir,depPath));depReport.outputs=[{path:depPath,sha256:hash(depBytes),bytes:depBytes.length}];f.runPut('reports/dependency-eligibility.json',depReport);
  }
  const selected=id=>f.observation.cases.find(item=>item.case_id===id);
  f.observation.extra.harness.ok=true;
  for(const [id,field]of [['packed-consumer/harness/chip-input-backspace-release','chipBackspaceRelease'],['packed-consumer/harness/chip-repeated-removal-and-separator','chipRepeatedEvents']]){
    selected(id).legacy_harness_passed=true;f.observation.extra.harness[field]=true;
  }
  let sassReport,bodies;
  const sassInvocation='synthetic-sass',prefix='evidence/sass-seal/'+sassInvocation+'/';
  if(type==='style'){
    f.request.sassExecution={run_id:f.run.run_id,invocation_id:sassInvocation,exit_code:0};
    const groups=JSON.parse(read('compatibility/rc/matrices/full-verify.json')).checks.find(row=>row.check_id==='sass-seal').acceptance.cases_by_line[f.line],expected=Object.values(groups).flat();
    bodies=JSON.parse(execFileSync('python3',[join(root,'tests/recorded_execution_style_fixture.py')],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,input:JSON.stringify({binding:f.request.binding,manifest:f.run,invocation_id:sassInvocation})}));
    const bodyMap=new Map(bodies.map(body=>[body.case_id,body]));
    sassReport={schema_version:1,template:false,check_id:'sass-seal',line:f.line,run_id:f.run.run_id,invocation_id:sassInvocation,binding:f.request.binding,result:'pass',coverage:'complete',exit_code:0,
      subject_kind:'artifact',subject_ids:['library'],artifacts:{library:{sha256:f.library.sha256,bytes:f.library.bytes}},expected_case_ids:expected,discovered_case_ids:expected,executed_case_ids:expected,passed_case_ids:expected,
      failed_case_ids:[],skipped_case_ids:[],unresolved_case_ids:[],exceptions:[],passed:expected.length,failed:0,skipped:0,outputs:[],case_results:[],fixture_only:true};
    for(const id of expected){
      const path=prefix+id.replaceAll('/','__')+'.json',body=bodyMap.get(id)??{case_id:id,kind:'assertion',result:'pass',fixture_only:true};
      f.runPut(path,body);const bytes=readFileSync(join(f.runDir,path));sassReport.outputs.push({path,sha256:hash(bytes),bytes:bytes.length});sassReport.case_results.push({case_id:id,result:'pass',kind:'assertion',output_paths:[path]});
    }
  }
  function save(){f.save();if(sassReport){for(const body of bodies){const path=prefix+body.case_id.replaceAll('/','__')+'.json';f.runPut(path,body);const bytes=readFileSync(join(f.runDir,path));Object.assign(sassReport.outputs.find(output=>output.path===path),{sha256:hash(bytes),bytes:bytes.length});}f.runPut('reports/sass-seal.json',sassReport);}}
  save();
  const targets=[f.entry,f.request,f.run,f.report,f.observation,...(sassReport?[sassReport]:[])],snapshots=targets.map(target=>structuredClone(target)),bodySnapshot=structuredClone(bodies);
  function reset(sha=ids[0]){targets.forEach((target,index)=>putObject(target,snapshots[index]));if(bodies)putObject(bodies,bodySnapshot);
    putObject(f.entry,entries.get(sha));if(sha===ids[0])f.entry.evidence_report=base.evidence_report;save();}
  const field=type==='chip'?'artifact_behavior':'owned_style_behavior';
  const check=()=>type==='chip'?validateArtifactBehavior({root:f.root,entry:f.entry,proof:f.entry.individual_proof,request:f.request}):validateOwnedStyle({root:f.root,entry:f.entry,proof:f.entry.individual_proof,request:f.request});
  function negative(name,mutate,pattern=/./,sha=ids[0],write=true){reset(sha);mutate();if(write)save();const result=check();assert.equal(result.ok,false,name+JSON.stringify(result));assert.match(result.detail,pattern,name);controls++;}
  const out=join(f.runDir,'evidence/upstream-audit-disposition/synthetic-upstream');mkdirSync(out,{recursive:true});
  function cli(name,sha,mutate,expected){
    reset(sha);mutate?.();save();f.runPut('seed.json',{commits:[{sha}],fixture_only:true});f.runPut('ledger.json',{entries:[f.entry],g11_claim:'not-passed',fixture_only:true});
    const reportPath=join(f.runDir,'cli-'+name+'.json'),env={...environment,RC_CHECK_ID:'upstream-audit-disposition',RC_RUN_ID:f.request.runId,RC_INVOCATION_ID:'synthetic-upstream',RC_EVIDENCE_BINDING:JSON.stringify(f.request.binding),RC_ASSERTION_OUTPUT_DIR:out,
      RC_UPSTREAM_PACKED_CONSUMER:JSON.stringify(f.request.packedConsumerExecution??null),RC_UPSTREAM_SASS_SEAL:JSON.stringify(f.request.sassExecution??null)};
    const child=spawnSync(process.execPath,[join(f.root,'scripts/check-upstream-audit-disposition.mjs'),'--admission','--line',f.line,'--seed',join(f.runDir,'seed.json'),'--ledger',join(f.runDir,'ledger.json'),'--symbols',join(f.root,'symbols.json'),'--current-symbols',join(f.root,'current.json'),'--report',reportPath],{cwd:f.root,env,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
    assert.ok([0,1].includes(child.status),child.stderr);const report=JSON.parse(readFileSync(reportPath));
    assert.equal(child.status===0,expected,name+child.stderr+JSON.stringify(report.artifact_behavior_evidence));assert.equal(report.g11_claim,'not-passed');
    if(expected)assert.equal(report.artifact_behavior_evidence.find(row=>row.sha===sha)?.ok,true);else assert.ok(report.insufficient_review_sha_ids.sensitive.includes(sha),name);
    cliCases.push({name,sha,admitted:expected});cliControls++;
  }
  try{
    for(const sha of ids){reset(sha);const result=check();let bridge;
      if(type==='style'&&!result.ok){const child=spawnSync('python3',['-B',join(f.root,'scripts/owned_rendered_admission.py'),'--validate-batch'],{cwd:f.root,encoding:'utf8',input:JSON.stringify({binding:f.request.binding,manifest:f.run,invocation_id:sassInvocation,cases:bodies.filter(body=>requirements(sha).case_ids.includes(body.case_id))})});bridge={status:child.status,stdout:child.stdout,stderr:child.stderr};}
      assert.equal(result.ok,true,JSON.stringify({type,sha,result,bridge,dirty:execFileSync('git',['status','--porcelain'],{cwd:f.root,encoding:'utf8'})}));controls++;cli(type+'-complete-'+sha.slice(0,6),sha,null,true);}
    negative('renamed-kind',()=>{f.entry.individual_proof.proof_kind='ordinary-review';},/unregistered/);
    negative('old-execution-only',()=>{delete f.entry.individual_proof[field];const old=precedingLedger.find(entry=>entry.sha===ids[0]).individual_proof;f.entry.individual_proof.proof_kind=old.proof_kind;f.entry.individual_proof.execution=structuredClone(old.execution);},/unregistered/);
    negative('wrong-cases',()=>{f.entry.individual_proof[field].case_ids.pop();},/scope/);
    negative('missing-source',()=>{f.entry.individual_proof[field].source_members.pop();},/source scope/);
    negative('stale-source',()=>{f.entry.individual_proof[field].source_members[0].sha256='f'.repeat(64);},/stale/);
    negative('wrong-patch',()=>{f.entry.individual_proof.diff_sha256='f'.repeat(64);},/unregistered/);
    negative('foreign-branch',()=>{f.entry.individual_proof.affected_branches=[f.line==='main'?'21.x':'main'];},/source branch/);
    negative('relabeled-verdict',()=>{f.entry.final_disposition='irrelevant';},/decision|unregistered/);
    negative('missing-packed-child',()=>{delete f.request.packedConsumerExecution;},/packed invocation/);
    negative('failed-packed-child',()=>{f.request.packedConsumerExecution.exit_code=3;},/packed invocation/);
    negative('foreign-library',()=>{f.report.artifacts.library.sha256='f'.repeat(64);},/packed result/);
    negative('partial-packed',()=>{f.report.coverage='slice';},/packed result/);
    reset();assert.equal((type==='chip'?validateArtifactBehavior:validateOwnedStyle)({root:f.root,entry:f.entry,proof:f.entry.individual_proof}).ok,false);controls++;
    if(type==='chip'){
      for(const [id,field]of [['packed-consumer/harness/chip-input-backspace-release','chipBackspaceRelease'],['packed-consumer/harness/chip-repeated-removal-and-separator','chipRepeatedEvents']])for(const value of [false,undefined,0,1,'true']){
        negative('keyboard-raw-flag',()=>{f.observation.extra.harness[field]=value;},/keyboard observations/);
        negative('keyboard-selected-flag',()=>{selected(id).legacy_harness_passed=value;},/keyboard observations/);
      }
      negative('failed-harness',()=>{f.observation.extra.harness.ok=false;},/keyboard observations/);
      for(const [path,from,to,pattern]of [
        ['projects/ngx-material-legacy/legacy-chips/chip-input.ts','this._focusLastChipOnBackspace = this.empty;','this._focusLastChipOnBackspace = true;',/algorithm or API/],
        ['projects/ngx-material-legacy/legacy-chips/chip.ts','case BACKSPACE:','case BACKSPACE:\n        if (event.repeat) { return; }',/repeated-removal/],
        ['projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts','until BACKSPACE is released and pressed again','when the event repeat flag is absent',/keyup assertion/],
      ]){
        reset();const file=join(f.root,path),before=readFileSync(file);assert.ok(before.toString().includes(from));const changed=before.toString().replace(from,to);
        try{writeFileSync(file,changed);f.entry.individual_proof[field].source_members.find(member=>member.path===path).sha256=hash(changed);const result=check();assert.equal(result.ok,false);assert.match(result.detail,pattern);sourceControls++;}finally{writeFileSync(file,before);}
      }
    }else{
      negative('missing-Sass-child',()=>{delete f.request.sassExecution;},/Sass invocation/);
      negative('failed-Sass-child',()=>{f.request.sassExecution.exit_code=9;},/Sass invocation/);
      negative('foreign-Sass-child',()=>{f.request.sassExecution.invocation_id='foreign';},/Sass report subject/);
      negative('partial-Sass',()=>{sassReport.coverage='slice';},/Sass result/);
      negative('Sass-missing-cell',()=>{sassReport.passed_case_ids=sassReport.passed_case_ids.slice(1);},/passed_case_ids/);
      negative('Sass-skipped-cell',()=>{sassReport.skipped=1;},/counts/);
      negative('borrowed-Sass-library',()=>{sassReport.artifacts.library.sha256='f'.repeat(64);},/Sass result/);
      negative('borrowed-Sass-binding',()=>{sassReport.binding={};},/Sass report subject/);
      for(const sha of ids)for(const id of requirements(sha).case_ids){negative('wrong-style-'+id,()=>{bodies.find(body=>body.case_id===id).properties[0].candidate='wrong-but-nonempty';},/style observations/,sha);styleSemanticControls++;}
      for(const [field,value]of [['body_scope',false],['nested_scope',true],['overlay_in_body',false],['overlay_outside_nested',false],['theme_stylesheet_sha256','f'.repeat(64)]]){
        negative('wrong-theme-frame-'+field,()=>{bodies.find(body=>body.case_id==='owned-style/theme-light/snack-container').theme_frames.reference[field]=value;},/style observations/);styleSemanticControls++;
      }
      negative('wrong-theme-program',()=>{bodies.find(body=>body.case_id==='owned-style/theme-dark/snack-container').custom_theme.case_id='mixin-argument/all-legacy-component-themes/custom-full-theme';},/style observations/);styleSemanticControls++;
      for(const sha of ids){
        const id=requirements(sha).case_ids.find(id=>id.startsWith('owned-style/theme-light/'));
        negative('inert-custom-theme',()=>{const witness=bodies.find(body=>body.case_id===id).customization_witness;for(const mode of ['reference','candidate'])witness[mode].themed=witness[mode].baseline;},/style observations/,sha);styleSemanticControls++;
        negative('borrowed-theme-baseline',()=>{const witness=bodies.find(body=>body.case_id===id).customization_witness;for(const mode of ['reference','candidate'])witness[mode].baseline='rgb(90, 91, 92)';},/style observations/,sha);styleSemanticControls++;
      }
      negative('empty-full-theme-css',()=>{const body=bodies.find(body=>body.case_id==='owned-style/theme-light/snack-container');for(const role of ['expected','actual'])Object.assign(body.custom_theme[role],{css:'',css_sha256:hash(''),css_bytes:0});for(const mode of ['reference','candidate','negative'])body.theme_frames[mode].theme_stylesheet_sha256=hash('');},/style observations/);styleSemanticControls++;
      reset();const path=sassReport.outputs[0].path,before=readFileSync(join(f.runDir,path));
      try{f.runPut(path,'tampered');assert.match(check().detail,/bytes\/hash/);controls++;}finally{f.runPut(path,before);}
      reset();const path2=prefix+'owned-style__theme-light__snack-container.json',file=join(f.runDir,path2);renameSync(file,file+'.saved');symlinkSync(file+'.saved',file);
      try{assert.match(check().detail,/symlink/);sourceControls++;}finally{unlinkSync(file);renameSync(file+'.saved',file);}
    }
    for(const sha of ids){
      cli(type+'-renamed-'+sha.slice(0,6),sha,()=>{f.entry.individual_proof.proof_kind='ordinary-review';},false);
      cli(type+'-relabeled-'+sha.slice(0,6),sha,()=>{f.entry.final_disposition='irrelevant';f.entry.bucket='docs-only';f.entry.subject='Synthetic documentation';f.entry.individual_proof.proof_kind='ordinary-review';delete f.entry.individual_proof[field];},false);
      cli(type+'-failed-child-'+sha.slice(0,6),sha,()=>{f.request[type==='chip'?'packedConsumerExecution':'sassExecution'].exit_code=7;},false);
      cli(type+'-bad-observation-'+sha.slice(0,6),sha,()=>{if(type==='chip')f.observation.extra.harness.chipRepeatedEvents=false;else bodies.find(body=>body.case_id===requirements(sha).case_ids[0]).properties[0].candidate='wrong';},false);
    }
    if(type==='chip'){
      // A real checker mutant demonstrates why mandatory dispatch belongs in
      // sensitivity as well as inside individualProofOk. No fixture execution is real.
      reset();const all=[...oldArtifactIds,...chipIds],path='compatibility/f10/disposition-ledger/evidence/relabel-fixture.json';
      const patch=read('compatibility/rc/select-focus-click-original.patch').toString(),diff=hash(patch);
      const relabeled=all.map(sha=>({sha,subject:'Synthetic documentation',bucket:'docs-only',final_disposition:'irrelevant',evidence_report:path,individual_proof:{proof_kind:'ordinary-review',diff_sha256:diff,review_depth:'individual-compatibility',affected_branches:[f.line],decision:note}}));
      f.repoPut(path,{reviews:all.map(sha=>({sha,diff_sha256:diff,diff:patch,status:'reviewed',final_disposition:'irrelevant',fixture_only:true})),fixture_only:true});
      f.runPut('relabel-seed.json',{commits:all.map(sha=>({sha}))});f.runPut('relabel-ledger.json',{entries:relabeled,g11_claim:'not-passed'});
      const reportPath=join(f.runDir,'relabel-report.json'),args=[join(f.root,'scripts/check-upstream-audit-disposition.mjs'),'--admission','--line',f.line,'--seed',join(f.runDir,'relabel-seed.json'),'--ledger',join(f.runDir,'relabel-ledger.json'),'--symbols',join(f.root,'symbols.json'),'--current-symbols',join(f.root,'current.json'),'--report',reportPath];
      const launch=()=>spawnSync(process.execPath,args,{cwd:f.root,env:{...environment,RC_CHECK_ID:'upstream-audit-disposition',RC_RUN_ID:f.request.runId,RC_INVOCATION_ID:'synthetic-upstream',RC_EVIDENCE_BINDING:JSON.stringify(f.request.binding),RC_ASSERTION_OUTPUT_DIR:out},encoding:'utf8',timeout:30000});
      let child=launch();assert.equal(child.status,1,child.stderr);assert.deepEqual(JSON.parse(readFileSync(reportPath)).insufficient_review_sha_ids.sensitive.sort(),all.toSorted());cliControls++;
      const checker=join(f.root,'scripts/check-upstream-audit-disposition.mjs'),before=readFileSync(checker),needle='const sensitive = sensitiveClass(entry) || requiresArtifactBehavior(entry, entry.individual_proof) ||';assert.equal(before.toString().split(needle).length,2);
      try{writeFileSync(checker,before.toString().replace(needle,'const sensitive = sensitiveClass(entry) ||'));child=launch();assert.equal(child.status,0,child.stderr);relabelMutants++;}finally{writeFileSync(checker,before);}
    }
  }finally{f.dispose();}
}
const report={schema_version:1,line,subjects:4,helper_controls:controls,source_and_path_controls:sourceControls,required_style_semantic_controls:styleSemanticControls,actual_CLI_controls:cliControls,mandatory_dispatch_mutants_detected:relabelMutants,existing_artifact_subjects_protected:oldArtifactIds.length,required_owned_style_cells:ownedStyleCaseIds().length,CLI_cases:cliCases,
  source_or_runtime_dispositions_changed:false,prerequisite_and_observation_results_synthetic:true,actual_Angular_browser_Sass_or_artifact_executed:false,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
