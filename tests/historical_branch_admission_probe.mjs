/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual writer and roster, with synthetic browser results in owned temporary runs. */
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {deriveHistoricalRoster,rejectionReasons,discoveryNegativeResults,isRunnerControl} from '../scripts/historical-case-roster.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const read=p=>fs.readFileSync(path.join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const prefix='compatibility/rc/historical-branch-admission-',raw=read(prefix+'inputs.json');
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
assert.equal(hash(raw),{main:'c9c81f831e4140f3a02c7c7b6b95fe284771da940f8efcee365f54267ac3c904','21.x':'0fca9a08785217834aa5a5777738f7a09b81a62408311338eac7f51da9ea34d7'}[line]);
const inputs=JSON.parse(raw),stored=read(inputs.prior_contexts.path);assert.equal(hash(stored),inputs.prior_contexts.sha256);
const uncompressed=gunzipSync(stored);assert.equal(hash(uncompressed),inputs.prior_contexts.raw_sha256);const prior=JSON.parse(uncompressed);
assert.equal(inputs.line,line);assert.equal(prior.line,line);
const producer='scripts/rc-test-legacy-family.mjs',current=read(producer).toString(),before=prior.members.find(r=>r.path===producer);
assert.equal(hash(before.text),before.sha256);
const oldGuard=`  if (request.line !== '${line}') {\n    console.error('historical-legacy-artifact: finite roster is derived for ${line} only');`;
const newGuard="  const version = JSON.parse(fs.readFileSync(path.join(root, 'projects/ngx-material-legacy/package.json'), 'utf8')).version;\n  const sourceLine = version.startsWith('22.') ? 'main' : version.startsWith('21.') ? '21.x' : null;\n  if (!sourceLine || request.line !== sourceLine) {\n    console.error('historical-legacy-artifact: acceptance requires the actual checkout source line');";
assert.equal(current.split(newGuard).length,2);assert.equal(current.replace(newGuard,oldGuard),before.text,'historical writer changed outside exact source-line guard');
const parse=(name,text)=>{const file=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
const oldParser=prior.members.find(r=>r.path==='scripts/historical-case-roster.mjs'),parserText=read(oldParser.path).toString();assert.equal(hash(oldParser.text),oldParser.sha256);
const previous=parse(oldParser.path,oldParser.text),next=parse(oldParser.path,parserText),preserved=[];
for(const name of ['deriveHistoricalRoster','fullNameOf','isRunnerControl','rejectionReasons','discoveryNegativeResults','loadScope','resolveCall','walkFunctionBody']){
 const method=(file)=>file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name)?.getText(file);
 assert.ok(method(previous));assert.equal(method(next),method(previous),'historical binding primitive changed '+name);preserved.push(name);
}
const matrixPath='compatibility/rc/matrices/full-verify.json',matrix=JSON.parse(read(matrixPath)),oldMatrix=JSON.parse(prior.members.find(r=>r.path===matrixPath).text);
const historical=matrix.checks.find(r=>r.check_id==='historical-legacy-artifact'),oldHistorical=oldMatrix.checks.find(r=>r.check_id==='historical-legacy-artifact');
const recovered=structuredClone(matrix);recovered.checks.find(r=>r.check_id==='historical-legacy-artifact').acceptance.cases_by_line[line]=oldHistorical.acceptance.cases_by_line[line];
assert.deepEqual(recovered,oldMatrix,'matrix changed outside current-line historical requirements');
const roster=deriveHistoricalRoster(root),recorded=JSON.parse(read(prefix+'current-roster.json'));assert.deepEqual(recorded.roster,roster);
for(const member of recorded.source_members)assert.equal(hash(read(member.path)),member.sha256,'historical source changed during derivation');
assert.equal(roster.paths.length,57);assert.equal(roster.ids.length,2220);assert.equal(roster.discovery_negative_ids.length,5);
const expected=[...roster.ids,...roster.discovery_negative_ids],groups=historical.acceptance.cases_by_line[line],required=Object.values(groups).flat();
assert.deepEqual([...required].sort(),[...expected].sort());assert.equal(new Set(required).size,2225);
const preceding=Object.values(oldHistorical.acceptance.cases_by_line[line]).flat();assert.equal(preceding.length,2157);
assert.ok(preceding.every(id=>required.includes(id)),'preceding historical case obligation removed');
const producerFile=parse(producer,current),body=producerFile.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='writeAcceptance');assert.ok(body);
const scratch=fs.mkdtempSync(path.join(tmpdir(),'historical-writer-controls-')),controls=[];
const specRows=roster.cases.filter(row=>row.kind!=='shared-export').map(row=>({full_name:row.full_name,success:true,skipped:false}));
const library={id:'library',sha256:hash('synthetic writer unit subject'),bytes:29};
const base={subject_mode:'artifact',artifact_sha256:library.sha256,totals:{executed:specRows.length},mapped_specs:roster.paths.map(historical_path=>({historical_path})),specs:specRows};
function invoke(id,change,accepted){
 const runDir=path.join(scratch,id),outputDir=path.join(runDir,'evidence/historical-legacy-artifact/unit');fs.mkdirSync(outputDir,{recursive:true});
 const request={line,runId:'synthetic-unit',invocation:'unit',runDir,outputDir,binding:{source_clean:true,source_line:line}},results=structuredClone(base);
 change?.(request,results);
 const messages=[],console={log:(...s)=>messages.push(s.join(' ')),error:(...s)=>messages.push(s.join(' '))};
 const fn=new Function('fs','path','root','runPath','rejectionReasons','discoveryNegativeResults','isRunnerControl','cryptoSha','console',body.getText(producerFile)+';return writeAcceptance;')(
  fs,path,root,path.join(runDir,'run.json'),rejectionReasons,discoveryNegativeResults,isRunnerControl,hash,console);
 const actual=fn(request,roster,results,library);assert.equal(actual,accepted,id+' returned the wrong admission result');
 const reportPath=path.join(runDir,'reports/historical-legacy-artifact.json');
 if(accepted){
  const report=JSON.parse(fs.readFileSync(reportPath));assert.equal(report.line,line);assert.equal(report.coverage,'complete');assert.equal(report.passed,2225);assert.equal(report.failed,0);
  assert.deepEqual(report.expected_case_ids,expected);assert.deepEqual(report.passed_case_ids,expected);assert.deepEqual(report.binding,request.binding);
  assert.equal(report.outputs.length,1);const output=report.outputs[0],bytes=fs.readFileSync(path.join(runDir,output.path));assert.equal(hash(bytes),output.sha256);assert.equal(bytes.length,output.bytes);
  const observations=JSON.parse(bytes);assert.equal(observations.cases.length,2225);assert.ok(observations.cases.every(row=>row.result==='pass'));
 }else if(fs.existsSync(reportPath))assert.equal(JSON.parse(fs.readFileSync(reportPath)).result,'fail');
 controls.push({id,expected_acceptance:accepted,observed_acceptance:actual,synthetic_only:true});
}
try{
 invoke('complete-current-line',null,true);
 for(const [id,change]of [
  ['wrong-checkout-line',request=>{request.line=line==='main'?'21.x':'main';}],
  ['unknown-line',request=>{request.line='unknown';}],
  ['dirty-source',request=>{request.binding.source_clean=false;}],
  ['workspace-dist-subject',(_request,results)=>{results.subject_mode='workspace-dist';}],
  ['wrong-artifact',(_request,results)=>{results.artifact_sha256='0'.repeat(64);}],
  ['missing-path',(_request,results)=>{results.mapped_specs.pop();}],
  ['aggregate-only',(_request,results)=>{results.specs=[];}],
  ['missing-spec',(_request,results)=>{results.specs.pop();}],
  ['forged-spec-name',(_request,results)=>{results.specs[0].full_name='forged';}],
  ['skipped-spec',(_request,results)=>{results.specs[0].skipped=true;}],
  ['failed-spec',(_request,results)=>{results.specs[0].success=false;}],
  ['extra-component-spec',(_request,results)=>{results.specs.push({full_name:'unaccounted spec',success:true,skipped:false});}],
 ])invoke(id,change,false);
 const report={schema_version:1,line,input_capsule_sha256:hash(raw),historical_paths:57,actual_current_derived_cases:roster.ids.length,component_specs:specRows.length,
  required_discovery_negative_cases:5,total_required_cases:2225,preceding_required_cases:2157,preceding_case_ids_retained:true,additional_required_cases:68,
  complete_preceding_writer_recovered_except_line_guard:true,unchanged_historical_binding_primitives:preserved,all_other_matrix_fields_and_packed106_cases_unchanged:true,
  writer_controls:controls,source_members:[producer,oldParser.path,matrixPath,'tests/historical_branch_admission_probe.mjs','tests/historical_case_parameterization_probe.mjs'].map(p=>({path:p,sha256:hash(read(p))})),
  scope:'Current source derivation, actual writer body and real discovery/binding primitives with synthetic Karma results in owned temporary directories. No actual browser, library artifact, toolchain/floor, G11 or upstream behavior execution.',
  actual_browser_artifact_or_floor_executed:false,g11_claim:'not-passed'};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line,required_historical_cases:2225,preceding_case_ids_retained:2157,added_required_cases:68,writer_controls:controls.length,actual_browser_artifact_or_floor_executed:false}));
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
