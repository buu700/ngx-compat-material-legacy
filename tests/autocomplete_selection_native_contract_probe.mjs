/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Proposed registry/writer admission controls; synthetic results grant no native credit. */
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {deriveHistoricalRoster,rejectionReasons,discoveryNegativeResults,isRunnerControl} from '../scripts/historical-case-roster.mjs';
import {autocompleteSelectionSpecSubject} from '../scripts/autocomplete-selection-spec-subject.mjs';
import {autocompleteSelectionHistoricalScopes} from '../scripts/autocomplete-selection-native-scopes.mjs';
import {createFixture,hash} from './upstream/artifact-behavior-fixture.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p)),ts=createRequire(import.meta.url)('typescript');
assert.equal(process.versions.node,JSON.parse(read('toolchain-lock.json')).repository.node);
assert.equal(ts.version,JSON.parse(read('package.json')).devDependencies.typescript);
const packetPath='compatibility/rc/autocomplete-selection-native-contract-proposal.json';
const raw=read(packetPath),packet=JSON.parse(raw),line=packet.line;
const mode=process.argv[3]??'selection';assert.ok(['selection','landscape'].includes(mode));
assert.equal(hash(raw),{main:'f53ca24623f8876b28f6af99a4e2ad80ecc3934073aed5931fb59aa641a7d0e7',
  '21.x':'9807d4a66c303445a1af43a2c4bb66217b7391af9ee62ab33f290c3b9bb066ba'}[line]);
assert.equal(packet.schema_version,1);assert.equal(packet.production_registry_activated,false);
assert.equal(packet.canonical_SHA_decisions_changed,0);assert.equal(packet.actual_native_browser_artifact_or_floor_executed,false);
assert.equal(packet.existing_named_historical_cases,2236);assert.equal(packet.new_or_renamed_case_IDs,0);
assert.equal(packet.existing_source_or_validator_bodies_changed,0);assert.equal(packet.g11_claim,'not-passed');
assert.equal(packet.scope_module.path,'scripts/autocomplete-selection-native-scopes.mjs');
for(const ref of [packet.scope_module,packet.source_proposals,packet.native_spec_successor,packet.original_subjects]){
  const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);
}
const nativeSpec=autocompleteSelectionSpecSubject({root,read,line});
assert.deepEqual(nativeSpec.bound[0],packet.native_spec_successor);
const sourceProposals=JSON.parse(read(packet.source_proposals.path));
const originals=JSON.parse(gunzipSync(read(packet.original_subjects.path)));
const registry=packet.registry.path;
assert.equal(registry,'scripts/upstream-historical-behavior-evidence.mjs');
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
assert.equal(packet.current_product_subjects.length,5);
for(const ref of packet.current_product_subjects){
  const original=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+ref.path],
    {cwd:root,env,maxBuffer:1024*1024});
  assert.equal(hash(original),ref.sha256);assert.equal(original.length,ref.bytes);
  assert.equal(hash(read(ref.path)),ref.sha256);assert.equal(read(ref.path).length,ref.bytes);
}
const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+registry],
  {cwd:root,env,maxBuffer:1024*1024}).toString();
assert.equal(hash(before),packet.registry.before_sha256);assert.equal(Buffer.byteLength(before),packet.registry.before_bytes);
assert.equal(packet.literal_edits.length,2);let candidate=before;
for(const edit of packet.literal_edits){assert.equal(candidate.split(edit.before).length,2);candidate=candidate.replace(edit.before,edit.after);}
assert.equal(hash(candidate),packet.registry.after_sha256);assert.equal(Buffer.byteLength(candidate),packet.registry.after_bytes);
assert.ok([packet.registry.before_sha256,packet.registry.after_sha256].includes(hash(read(registry))));

// Import the authenticated old module and the exact proposed two-edit successor.
// Only relative import URLs are relocated; every validator body remains intact.
async function importSubject(text){
  const syntax=ts.createSourceFile(registry,text,ts.ScriptTarget.Latest,true);assert.equal(syntax.parseDiagnostics.length,0);
  const edits=syntax.statements.filter(ts.isImportDeclaration).map(node=>node.moduleSpecifier)
    .filter(node=>node.text.startsWith('.')).map(node=>({start:node.getStart(syntax),end:node.end,
      text:JSON.stringify(pathToFileURL(path.resolve(root,path.dirname(registry),node.text)).href)}));
  for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);
  return import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
}
const previous=await importSubject(before),proposed=await importSubject(candidate);
const subjectShas=['d5d468a29a2db4c0676c57d60bc8431ed4fd6e18','13629b0cd814ccc5fa01cf670b8b3001bc0021ff','cf868a5089a4c9eaddd4a55fd18b952fb96d5c19'];
const expectedIndices=[[46],[37,38,39,172],[37,39,42,46]];
assert.deepEqual(packet.subjects.map(row=>row.sha),subjectShas);
assert.deepEqual(proposed.HISTORICAL_BEHAVIOR_SHAS.filter(sha=>!subjectShas.includes(sha)),previous.HISTORICAL_BEHAVIOR_SHAS);
for(const sha of previous.HISTORICAL_BEHAVIOR_SHAS)
  assert.deepEqual(proposed.historicalBehaviorRequirements(sha),previous.historicalBehaviorRequirements(sha),'changed prior native requirement '+sha);
assert.deepEqual(proposed.historicalRegressionRequirements(),previous.historicalRegressionRequirements());
for(const method of ['validateHistoricalBehavior','requiresHistoricalBehavior','historicalBehaviorRequirements'])
  assert.equal(proposed[method].toString(),previous[method].toString(),'changed existing validator '+method);
const oldSelection=previous.historicalBehaviorRequirements('77ffdf98ba71c11d908b29e02b516dddf487ae0b');
const common=Object.freeze(oldSelection.members.slice(0,-3));
const prefix='historical-legacy-artifact/original-and-shared-cases/src/material/';
const nativeCase=(p,index,full_name)=>({case_id:prefix+p+'#'+index,historical_path:'src/material/'+p,candidate:'projects/ngx-material-legacy/'+p,full_name});
const ownDefinitions=autocompleteSelectionHistoricalScopes(common,nativeCase);
const expectedMembers=[...common,'scripts/autocomplete-selection-native-scopes.mjs',
  'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts',
  'projects/ngx-material-legacy/legacy-autocomplete/autocomplete-trigger.ts',nativeSpec.path,
  'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.html','projects/ngx-material-legacy/legacy-autocomplete/autocomplete.scss'];
assert.deepEqual(ownDefinitions.map(([sha])=>sha),subjectShas);
const roster=deriveHistoricalRoster(root);assert.equal(roster.ids.length+roster.discovery_negative_ids.length,2236);
const matrix=JSON.parse(read('compatibility/rc/matrices/full-verify.json'));
const allIds=Object.values(matrix.checks.find(row=>row.check_id==='historical-legacy-artifact').acceptance.cases_by_line[line]).flat();
assert.equal(allIds.length,2236);assert.equal(new Set(allIds).size,2236);
assert.ok([...roster.ids,...roster.discovery_negative_ids].every(id=>allIds.includes(id)));
for(const [index,subject]of packet.subjects.entries()){
  const definition=proposed.historicalBehaviorRequirements(subject.sha),review=sourceProposals.reviews[index];
  assert.equal(review.sha,subject.sha);assert.equal(definition.patch,subject.diff_sha256);assert.equal(definition.patch,review.diff_sha256);
  assert.equal(review.complete_original_hunk_reviews.length,subject.original_hunks);
  assert.deepEqual(review.proposed_existing_native_case_indices,expectedIndices[index]);
  const expected=subject.named_cases.map(({case_id,historical_path,candidate,full_name})=>({case_id,historical_path,candidate,full_name}));
  assert.deepEqual(subject.named_cases.map(row=>row.index),expectedIndices[index]);
  assert.deepEqual(definition.cases,expected);assert.deepEqual(definition.members,expectedMembers);
  assert.deepEqual(ownDefinitions[index][1],definition);
  assert.equal(previous.historicalBehaviorRequirements(subject.sha),null);
  assert.ok(proposed.requiresHistoricalBehavior({sha:subject.sha},{}),'missing optional markers bypassed the new SHA requirement');
  for(const row of expected){
    const actual=roster.cases.find(c=>c.case_id===row.case_id);
    for(const [key,value]of Object.entries(row))assert.equal(actual?.[key],value,'wrong current named native assertion');
  }
}

// Extract the real acceptance writer, retaining its body and all full-run checks.
const writerSyntax=ts.createSourceFile('writer.mjs',read('scripts/rc-test-legacy-family.mjs').toString(),ts.ScriptTarget.Latest,true);
const writerBody=writerSyntax.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='writeAcceptance').getText(writerSyntax);
const results=[];
const landscapeSha='008212a9807fd01fd32fe136a075763b7b2c854d';
const runtimeSubjects=mode==='selection'?packet.subjects:[{sha:landscapeSha,
  patch_file:'compatibility/rc/resource-style-upstream-patches/'+landscapeSha+'.patch'}];
if(mode==='landscape'){
  const spec=read(nativeSpec.path).toString();
  assert.ok(spec.includes("inputReference.style.bottom = '75px';"));
  assert.ok(spec.includes('.mat-form-field-flex'));
  const retained=proposed.historicalBehaviorRequirements(landscapeSha);
  assert.equal(retained.kind,'autocomplete-landscape-viewport');assert.equal(retained.cases.length,5);
}
for(const subject of runtimeSubjects){
  const sha=subject.sha,definition=proposed.historicalBehaviorRequirements(sha),expected=definition.cases;
  const patch=mode==='selection'?packet.original_subjects.path:subject.patch_file;
  const diff=mode==='selection'?originals.commits.find(row=>row.sha===sha).diff:read(patch).toString();
  assert.equal(hash(diff),definition.patch);
  if(mode==='landscape'){
    assert.equal(patch,'compatibility/rc/resource-style-upstream-patches/'+sha+'.patch');
    assert.deepEqual(definition,previous.historicalBehaviorRequirements(landscapeSha));
  }
  const members=definition.members.map(p=>({path:p,sha256:hash(p===registry?candidate:read(p))}));
  const note='Synthetic admission controls only. No actual Angular view, packed library, browser, runtime or peer floor is executed or qualified.';
  // The fixture carries the authenticated originals archive plus its complete
  // diff text. No reference bytes are normalized or rewritten for this test.
  const f=createFixture(root,{extraMembers:[packet.scope_module.path],review:{sha,status:'reviewed',final_disposition:'already-adapted',patch_file:patch,diff,diff_sha256:definition.patch,fixture_only:true},
    entry:{sha,subject:'Synthetic per-patch selection native subject',bucket:'behavior-semantic',final_disposition:'already-adapted',
      evidence_report:'compatibility/rc/synthetic-selection-native-admission.json',fixture_only:true,
      individual_proof:{proof_kind:proposed.HISTORICAL_BEHAVIOR_KIND,review_depth:'individual-compatibility',diff_sha256:definition.patch,
        affected_branches:[line],decision:note,artifact_behavior:{source_members:members}}}});
  try{
    // Commit the exact proposed registry into the disposable synthetic checkout.
    // Its clean-tree binding therefore authenticates these actual candidate bytes.
    f.repoPut(registry,candidate);
    const git=args=>execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:f.root,env,encoding:'utf8'}).trim();
    git(['add','--',registry]);
    const changed=git(['diff','--cached','--name-only']);assert.ok(changed===''||changed===registry);
    if(changed)git(['-c','user.name=Validator fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-qm','Synthetic proposed native registry']);
    const commit=git(['rev-parse','HEAD']),tree=git(['rev-parse','HEAD^{tree}']);
    assert.equal(git(['status','--porcelain']), '');
    Object.assign(f.run.source,{commit,git_tree_sha:tree});Object.assign(f.run.execution_inputs,{commit,tree});
    Object.assign(f.request.binding,{source_commit:commit,source_tree:tree});
    delete f.proof.artifact_behavior;
    f.proof.historical_behavior={kind:definition.kind,case_ids:expected.map(row=>row.case_id),source_members:members};
    const invocation='synthetic-selection-'+sha.slice(0,8);
    f.request.historicalExecution={run_id:f.run.run_id,invocation_id:invocation,exit_code:0};
    const relative='evidence/historical-legacy-artifact/'+invocation+'/historical-observations.json';
    const outputDir=path.join(f.runDir,path.dirname(relative));fs.mkdirSync(outputDir,{recursive:true});
    f.save();
    const writer=new Function('fs','path','root','runPath','rejectionReasons','discoveryNegativeResults','isRunnerControl','cryptoSha','console',
      writerBody+';return writeAcceptance;')(fs,path,f.root,path.join(f.runDir,'run.json'),rejectionReasons,discoveryNegativeResults,isRunnerControl,hash,{log(){},error(){}});
    assert.equal(writer({...f.request,invocation,outputDir},roster,{
      subject_mode:'artifact',artifact_sha256:f.library.sha256,totals:{executed:roster.cases.filter(row=>row.kind!=='shared-export').length},
      mapped_specs:roster.paths.map(historical_path=>({historical_path})),
      specs:roster.cases.filter(row=>row.kind!=='shared-export').map(row=>({full_name:row.full_name,success:true,skipped:false})),
    },f.library),true);
    const report=JSON.parse(fs.readFileSync(path.join(f.runDir,'reports/historical-legacy-artifact.json')));
    const native=JSON.parse(fs.readFileSync(path.join(f.runDir,relative)));
    const targets=[f.entry,f.request,f.report,report,native],originals=targets.map(value=>structuredClone(value));
    const save=()=>{f.save();f.runPut(relative,native);const bytes=fs.readFileSync(path.join(f.runDir,relative));
      report.outputs=[{path:relative,sha256:hash(bytes),bytes:bytes.length}];f.runPut('reports/historical-legacy-artifact.json',report);};
    const reset=()=>{for(const [i,target]of targets.entries()){
      for(const key of Object.keys(target))delete target[key];Object.assign(target,structuredClone(originals[i]));}save();};
    const check=()=>proposed.validateHistoricalBehavior({root:f.root,entry:f.entry,proof:f.entry.individual_proof,request:f.request});
    reset();const positive=check();assert.equal(positive.ok,true,positive.detail);
    const rejected=[],reject=(id,change,pattern)=>{reset();change();save();const result=check();assert.equal(result.ok,false,id);
      assert.match(result.detail,pattern,id);rejected.push({id,detail:result.detail});};
    for(const required of expected){
      const index=required.case_id.split('#')[1];
      reject('omitted-required-scope-'+index,()=>f.entry.individual_proof.historical_behavior.case_ids.splice(expected.indexOf(required),1),/scope/);
      reject('wrong-executed-name-'+index,()=>native.cases.find(c=>c.case_id===required.case_id).executed_full_name='unrelated passing test',/test identity/);
    }
    reject('missing-packed-invocation',()=>delete f.request.packedConsumerExecution,/coordinator-observed packed/);
    reject('missing-native-invocation',()=>delete f.request.historicalExecution,/coordinator-observed historical/);
    reject('failed-native-invocation',()=>f.request.historicalExecution.exit_code=9,/coordinator-observed historical/);
    reject('foreign-native-run',()=>f.request.historicalExecution.run_id='foreign',/coordinator-observed historical/);
    reject('wrong-checkout-line',()=>f.request.line=line==='main'?'21.x':'main',/run binding/);
    reject('wrong-patch',()=>f.entry.individual_proof.diff_sha256='0'.repeat(64),/unregistered/);
    reject('stripped-kind',()=>delete f.entry.individual_proof.proof_kind,/unregistered/);
    reject('wrong-scope',()=>f.entry.individual_proof.historical_behavior.kind='ordinary-review',/scope/);
    reject('broadened-scope',()=>f.entry.individual_proof.historical_behavior.case_ids.push('unrelated'),/scope/);
    reject('omitted-source',()=>f.entry.individual_proof.historical_behavior.source_members.pop(),/source scope/);
    reject('duplicate-source',()=>{const rows=f.entry.individual_proof.historical_behavior.source_members;rows[0]=rows[1];},/source scope/);
    reject('stale-source',()=>f.entry.individual_proof.historical_behavior.source_members[0].sha256='0'.repeat(64),/stale historical source/);
    reject('partial-full-suite',()=>report.passed_case_ids.pop(),/incomplete/);
    reject('skipped-full-suite',()=>report.skipped++,/counts/);
    reject('failed-full-suite',()=>report.failed++,/counts/);
    reject('historical-exception',()=>report.exceptions.push({case_id:expected[0].case_id}),/unresolved historical/);
    reject('wrong-observed-library',()=>native.library_sha256='0'.repeat(64),/assertion subject/);
    reject('wrong-required-candidate',()=>native.cases.find(c=>c.case_id===expected[0].case_id).candidate='projects/foreign.spec.ts',/test identity/);
    assert.equal(rejected.length,18+2*expected.length);
    results.push({sha,kind:definition.kind,named_native_cases:expected,source_member_count:members.length,
      complete_synthetic_admission_passed:true,rejected});
  }finally{f.dispose();}
}
nativeSpec.assertCurrent();assert.equal(results.length,mode==='selection'?3:1);
for(const ref of packet.current_product_subjects)assert.equal(hash(read(ref.path)),ref.sha256,'late current selection source change');
const rejectionCount=mode==='selection'?72:28;
assert.equal(results.reduce((sum,row)=>sum+row.rejected.length,0),rejectionCount);
const result={schema_version:1,line,node:process.version,typescript:ts.version,
  mode,
  role:'Proposed native-contract admission controls only; production registry activation and individual canonical source admission remain separate.',
  proposal:{path:packetPath,sha256:hash(raw),bytes:raw.length},prior_scopes_preserved:previous.HISTORICAL_BEHAVIOR_SHAS.length,
  prior_validator_and_regression_requirements_unchanged:true,full_historical_cases:2236,new_or_renamed_case_IDs:0,
  subjects:results,named_case_occurrences:mode==='selection'?9:5,unique_named_cases:mode==='selection'?6:5,synthetic_rejections:rejectionCount,
  production_registry_activated:hash(read(registry))===packet.registry.after_sha256,
  producer_sha256:hash(read('tests/autocomplete_selection_native_contract_probe.mjs')),
  actual_browser_artifact_or_floor_executed:false,canonical_ledger_changed:false,g11_claim:'not-passed'};
if(process.argv[2]&&process.argv[2]!=='-')fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line,mode,prior_scopes_preserved:result.prior_scopes_preserved,individual_subjects:results.length,named_case_occurrences:result.named_case_occurrences,
  unique_named_cases:result.unique_named_cases,full_historical_cases:2236,synthetic_rejections:rejectionCount,production_registry_activated:result.production_registry_activated,
  actual_browser_artifact_or_floor_executed:false}));
