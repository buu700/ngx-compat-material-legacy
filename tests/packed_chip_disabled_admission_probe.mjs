/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {declarationObservations,declarationKeys,librarySpec,harnessCaseIds,allConsumerCaseIds,loadExportKeys,writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const path='scripts/packed-consumer-aot-smoke.mjs',raw=readFileSync(join(root,path),'utf8'),file=ts.createSourceFile(path,raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.equal(file.parseDiagnostics.length,0);
const node=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='collectAcceptanceCases');assert.ok(node);
const source=node.getText(file),id='packed-consumer/harness/chip-individual-disabled-form-isolation',keys=loadExportKeys();
const load=text=>new Function('declarationObservations','declarationKeys','packagedSpec','harnessCaseIds',text+';return collectAcceptanceCases;')(declarationObservations,declarationKeys,librarySpec,harnessCaseIds);
const collect=load(source),report={schema_version:1,compiler:ts.version,source:{path,sha256:createHash('sha256').update(raw).digest('hex'),complete_collector_sha256:createHash('sha256').update(source).digest('hex')},cases:[],mutants:[],scope:'Whole actual acceptance collector and report writer with synthetic observations; no Angular/chip/native/packed product execution.',native_executed:false};
function observations(fn){return [true,false,undefined,0,1,'true'].map(value=>{const rows=fn({harness:{status:'ok',result:{chipDisabledIsolation:value}}},keys,'/tmp/consumer','/tmp/source'),matches=rows.filter(r=>r.case_id===id);assert.equal(matches.length,1,'required chip-disabled-isolation case must be discovered');assert.equal(matches[0].result,value===true?'pass':'fail','explicit construction result required');return {input:value===undefined?'omitted':value,result:matches[0].result};});}
assert.equal(harnessCaseIds().filter(x=>x===id).length,1,'chip-disabled-isolation case must be registered');
report.cases=observations(collect);
for(const [name,from,to]of [['unconditional-chip-pass','parsed.chipDisabledIsolation === true','true'],['omit-chip-observation-key',"    'packed-consumer/harness/chip-individual-disabled-form-isolation': parsed.chipDisabledIsolation === true,",'']]){
 assert.ok(source.includes(from));assert.throws(()=>observations(load(source.replace(from,to))));report.mutants.push({id:name,result:'rejected'});
}
const expected=allConsumerCaseIds(keys);assert.equal(expected.length,93);assert.equal(new Set(expected).size,93);
const line=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main';report.line=line;
const scratch=mkdtempSync(join(tmpdir(),'packed-chip-admission-'));
try{
 for(const [name,rows,pass]of [['complete',expected.map(case_id=>({case_id,result:'pass'})),true],['missing-chip',expected.filter(x=>x!==id).map(case_id=>({case_id,result:'pass'})),false],['false-chip',expected.map(case_id=>({case_id,result:case_id===id?'fail':'pass'})),false]]){
  const runDir=join(scratch,name),out=join(runDir,'evidence/packed-consumer/fixture');mkdirSync(out,{recursive:true});const result=writeAcceptanceReport({checkId:'packed-consumer',request:{binding:{fixture_only:true},invocation:'fixture',runId:'fixture',outputDir:out,runDir,line},cases:rows,expectedIds:expected,library:{sha256:'c'.repeat(64),bytes:1},assertionName:'observations.json',command:['synthetic-observation-fixture']});assert.equal(result.passed,pass,name);const saved=JSON.parse(readFileSync(join(runDir,'reports/packed-consumer.json')));assert.equal(saved.coverage,pass?'complete':'incomplete',name);if(name==='missing-chip')assert.deepEqual(saved.unresolved_case_ids,[id]);if(name==='false-chip')assert.deepEqual(saved.failed_case_ids,[id]);report.cases.push({id:name,result:'pass',admitted:pass});
 }
}finally{rmSync(scratch,{recursive:true,force:true});}
const at=process.argv.indexOf('--report');if(at>=0){assert.equal(existsSync(process.argv[at+1]),false);writeFileSync(process.argv[at+1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({line,cases:report.cases.length,mutants_rejected:report.mutants.length,derived_cases:93,native_executed:false}));
