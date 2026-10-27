/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Real admission/writer controls with synthetic results, never native credit. */
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {deriveHistoricalRoster,rejectionReasons,discoveryNegativeResults,isRunnerControl} from '../scripts/historical-case-roster.mjs';
import * as current from '../scripts/upstream-historical-behavior-evidence.mjs';
import {createFixture,hash} from './upstream/artifact-behavior-fixture.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p)),ts=createRequire(import.meta.url)('typescript');
assert.equal(process.versions.node,JSON.parse(read('toolchain-lock.json')).repository.node);
assert.equal(ts.version,JSON.parse(read('package.json')).devDependencies.typescript);
const sha='008212a9807fd01fd32fe136a075763b7b2c854d';
const transition='compatibility/rc/autocomplete-landscape-native-contract-transition.json';
const raw=read(transition),packet=JSON.parse(raw),line=packet.line;
assert.equal(hash(raw),{main:'99e2d8d316f83caf0ece1fe5b990be099db3e5e6495b758af4a89bbb86877192',
  '21.x':'ee071f30f5c985d15cc33f4decb7fd0a672d48a755d533c8adf6ba8b71c6fa28'}[line]);
assert.equal(packet.sha,sha);
const registry=packet.registry.path;
const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+registry],
  {cwd:root,env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'},maxBuffer:1024*1024}).toString();
assert.equal(hash(before),packet.registry.before_sha256);assert.equal(hash(read(registry)),packet.registry.after_sha256);
assert.equal(read(registry).toString().replace(packet.insertion.text,''),before,'registry changed beyond the exact addition');
// Import the genuine prior module with only relative import URLs relocated.
// Its registry, validator and helper bodies remain the authenticated originals.
const oldSyntax=ts.createSourceFile(registry,before,ts.ScriptTarget.Latest,true);
assert.equal(oldSyntax.parseDiagnostics.length,0);
let relocated=before;
const replacements=oldSyntax.statements.filter(ts.isImportDeclaration).map(node=>node.moduleSpecifier)
  .filter(node=>node.text.startsWith('.')).map(node=>({start:node.getStart(oldSyntax),end:node.end,
    text:JSON.stringify(pathToFileURL(path.resolve(root,path.dirname(registry),node.text)).href)}));
for(const edit of replacements.sort((a,b)=>b.start-a.start))relocated=relocated.slice(0,edit.start)+edit.text+relocated.slice(edit.end);
const previous=await import('data:text/javascript;base64,'+Buffer.from(relocated).toString('base64'));
assert.equal(previous.historicalBehaviorRequirements(sha),null);
assert.deepEqual(current.HISTORICAL_BEHAVIOR_SHAS.filter(id=>id!==sha),previous.HISTORICAL_BEHAVIOR_SHAS);
for(const id of previous.HISTORICAL_BEHAVIOR_SHAS)
  assert.deepEqual(current.historicalBehaviorRequirements(id),previous.historicalBehaviorRequirements(id),'existing native requirement changed '+id);
assert.deepEqual(current.historicalRegressionRequirements(),previous.historicalRegressionRequirements());
assert.equal(current.validateHistoricalBehavior.toString(),previous.validateHistoricalBehavior.toString());
assert.equal(current.requiresHistoricalBehavior.toString(),previous.requiresHistoricalBehavior.toString());
assert.ok(current.requiresHistoricalBehavior({sha},{}),'stripping optional proof markers bypassed the finite SHA requirement');
const definition=current.historicalBehaviorRequirements(sha);
assert.equal(definition.kind,'autocomplete-landscape-viewport');assert.equal(definition.patch,packet.original_diff_sha256);
const expected=packet.required_named_cases.map(({index,...row})=>row);
assert.deepEqual(definition.cases,expected);assert.equal(definition.cases.length,5);
const roster=deriveHistoricalRoster(root);assert.equal(roster.ids.length+roster.discovery_negative_ids.length,2236);
for(const row of expected){
  const actual=roster.cases.find(c=>c.case_id===row.case_id);
  for(const [key,value]of Object.entries(row))assert.equal(actual?.[key],value,'wrong current named regression');
}
const matrix=JSON.parse(read('compatibility/rc/matrices/full-verify.json'));
const allIds=Object.values(matrix.checks.find(c=>c.check_id==='historical-legacy-artifact').acceptance.cases_by_line[line]).flat();
assert.equal(allIds.length,2236);assert.equal(new Set(allIds).size,2236);
assert.ok(roster.ids.every(id=>allIds.includes(id)));assert.ok(roster.discovery_negative_ids.every(id=>allIds.includes(id)));
const spec=read('projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts').toString();
assert.ok(spec.includes("inputReference.style.bottom = '75px';"));
assert.ok(spec.includes(".mat-form-field-flex"));
const members=definition.members.map(p=>({path:p,sha256:hash(read(p))}));
const patch='compatibility/rc/resource-style-upstream-patches/'+sha+'.patch';assert.equal(hash(read(patch)),definition.patch);
const note='Synthetic admission controls only. No actual Angular view, overlay geometry, packed library, browser, runtime or peer floor is executed or qualified.';
const f=createFixture(root,{review:{sha,status:'reviewed',final_disposition:'already-adapted',patch_file:patch,diff_sha256:definition.patch,fixture_only:true},
  entry:{sha,subject:'Synthetic landscape admission subject',bucket:'behavior-semantic',final_disposition:'already-adapted',
    evidence_report:'compatibility/rc/synthetic-landscape-admission.json',fixture_only:true,
    individual_proof:{proof_kind:current.HISTORICAL_BEHAVIOR_KIND,review_depth:'individual-compatibility',diff_sha256:definition.patch,
      affected_branches:[line],decision:note,artifact_behavior:{source_members:members}}}});
delete f.proof.artifact_behavior;
f.proof.historical_behavior={kind:definition.kind,case_ids:definition.cases.map(row=>row.case_id),source_members:members};
f.request.historicalExecution={run_id:f.run.run_id,invocation_id:'synthetic-landscape',exit_code:0};
const relative='evidence/historical-legacy-artifact/synthetic-landscape/historical-observations.json';
const outputDir=path.join(f.runDir,path.dirname(relative));fs.mkdirSync(outputDir,{recursive:true});
const writerSyntax=ts.createSourceFile('writer.mjs',read('scripts/rc-test-legacy-family.mjs').toString(),ts.ScriptTarget.Latest,true);
const writerBody=writerSyntax.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='writeAcceptance').getText(writerSyntax);
const writer=new Function('fs','path','root','runPath','rejectionReasons','discoveryNegativeResults','isRunnerControl','cryptoSha','console',
  writerBody+';return writeAcceptance;')(fs,path,f.root,path.join(f.runDir,'run.json'),rejectionReasons,discoveryNegativeResults,isRunnerControl,hash,{log(){},error(){}});
const rejected=[];
try{
  assert.equal(writer({...f.request,invocation:'synthetic-landscape',outputDir},roster,{
    subject_mode:'artifact',artifact_sha256:f.library.sha256,
    totals:{executed:roster.cases.filter(row=>row.kind!=='shared-export').length},
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
  const check=()=>current.validateHistoricalBehavior({root:f.root,entry:f.entry,proof:f.entry.individual_proof,request:f.request});
  reset();assert.equal(check().ok,true,'complete synthetic admission must reach the success path');
  const reject=(id,change,pattern)=>{reset();change();save();const result=check();assert.equal(result.ok,false,id);
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
  const result={schema_version:1,line,sha,node:process.version,typescript:ts.version,prior_scopes_preserved:previous.HISTORICAL_BEHAVIOR_SHAS.length,
    prior_validator_and_regression_requirements_unchanged:true,required_named_native_cases:5,full_historical_cases:2236,
    complete_synthetic_admission_passed:true,rejected,producer_sha256:hash(read('tests/autocomplete_landscape_admission_probe.mjs')),
    actual_browser_artifact_or_floor_executed:false,canonical_ledger_changed:false,g11_claim:'not-passed'};
  if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({line,prior_scopes_preserved:result.prior_scopes_preserved,named_cases:5,
    full_historical_cases:2236,synthetic_rejections:rejected.length,actual_browser_artifact_or_floor_executed:false}));
}finally{f.dispose();}
