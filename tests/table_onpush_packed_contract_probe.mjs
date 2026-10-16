/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic admission and exact source controls; no Angular table is executed here. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {TABLE_ONPUSH_CASE_ID, packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';
import {tableOnPushPackedFixture} from '../scripts/table-onpush-packed-fixture.mjs';
import {reverseTableOnPushPackedSource as reverseOldTableOnPushPackedSource, TABLE_ONPUSH_SOURCE_PREIMAGES, TABLE_ONPUSH_SOURCE_EDITS} from '../scripts/table-onpush-packed-source-requalification.mjs';
import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';
import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';
import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';
import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';
import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';
import {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';
import {packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase} from '../scripts/chip-menu-tooltip-packed-contract.mjs';
import {reverseRadioIdentityPackedSource} from '../scripts/radio-identity-packed-source-requalification.mjs';
import {reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';
import {reverseSelectDetachPackedSource as reverseOldSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';
import {reverseMenuItemTokenPackedSource as reverseOldMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';
import {reverseSelectFocusClickPackedSource as reversePreviousSelectFocusClickPackedSource} from '../scripts/select-focus-click-packed-source-requalification.mjs';
import {reverseChipMenuTooltipPackedSource} from '../scripts/chip-menu-tooltip-packed-source-requalification.mjs';
const reverseSelectFocusClickPackedSource=(path,raw,line)=>reversePreviousSelectFocusClickPackedSource(path,reverseChipMenuTooltipPackedSource(path,raw,line),line);
const reverseMenuItemTokenPackedSource=(path,raw,line)=>reverseOldMenuItemTokenPackedSource(path,reverseSelectFocusClickPackedSource(path,raw,line),line);
const reverseSelectDetachPackedSource=(path,raw,line)=>reverseOldSelectDetachPackedSource(path,reverseMenuItemTokenPackedSource(path,raw,line),line);
const reverseTableOnPushPackedSource=(path,raw,line)=>reverseOldTableOnPushPackedSource(path,reverseRadioIdentityPackedSource(path,reverseGeneratedIdentityPackedSource(path,reverseSelectDetachPackedSource(path,raw,line),line),line),line);
import {allConsumerCaseIds, declarationObservations, declarationKeys, librarySpec, harnessCaseIds, loadExportKeys, writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const read=path=>readFileSync(join(root,path),'utf8'),hash=raw=>createHash('sha256').update(raw).digest('hex');
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const sample={execution:'packed-angular-testbed-dom',error:null,parent_detection_only:true,
  identities:{owned_table:true,public_table_provider:true,owned_no_data:true,public_no_data_provider:true,child_on_push:true},
  transitions:['initial','empty','restored','empty-again','repeated-empty'].map(stage=>['initial','restored'].includes(stage)
    ? {stage,stable_source:true,data_rows:1,no_data_rows:0,data_cells:stage==='initial'?['A1','B1','C1']:['A2','B2','C2']}
    : {stage,stable_source:true,data_rows:0,no_data_rows:1,row_class:'mat-no-data-row',row_role:'row',cell_class:null,colspan:'3',cell_text:'Empty rows: 3'}),
  destroy:{fixture_destroyed:true,source_rows_after:1,retained_before:'<tbody></tbody>',retained_after:'<tbody></tbody>'}};
const path='scripts/packed-consumer-aot-smoke.mjs',raw=read(path),sf=ts.createSourceFile(path,raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.equal(sf.parseDiagnostics.length,0);
const source=sf.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='collectAcceptanceCases').getText(sf);
const load=text=>new Function('declarationObservations','declarationKeys','packagedSpec','harnessCaseIds','packedValueAccessorCases','packedTableOnPushCase','packedRadioIdentityCase','packedGeneratedIdentityCase','packedSelectDetachCase','packedMenuItemTokenCase','packedSelectFocusClickCase','packedChipDisabledCase','packedMenuLazyCase','packedTooltipContainerCase',text+';return collectAcceptanceCases;')
  (declarationObservations,declarationKeys,librarySpec,harnessCaseIds,packedValueAccessorCases,packedTableOnPushCase,packedRadioIdentityCase,packedGeneratedIdentityCase,packedSelectDetachCase,packedMenuItemTokenCase,packedSelectFocusClickCase,packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase);
const keys=loadExportKeys(),expected=allConsumerCaseIds(keys);assert.equal(expected.length,106);
const observe=(input,collector=load(source))=>{
  const rows=collector({harness:{status:'ok',result:{tableOnPushRendering:input}}},keys,'/tmp/consumer','/tmp/source').filter(row=>row.case_id===TABLE_ONPUSH_CASE_ID);
  assert.equal(rows.length,1);return rows[0];
};
assert.equal(observe(sample).result,'pass');
const matrix=JSON.parse(read('compatibility/rc/matrices/full-verify.json')),check=matrix.checks.find(row=>row.check_id==='packed-consumer');
for(const branch of ['main','21.x']) {
  const roster=check.acceptance.cases_by_line[branch];if(roster.harness===null)continue;
  assert.deepEqual(Object.values(roster).flat().sort(),[...expected].sort());
}
const mutations=[
  o=>o.execution='workspace-projection',o=>o.error='child-failed',o=>o.parent_detection_only=false,
  ...Object.keys(sample.identities).map(key=>o=>o.identities[key]=false),
  o=>o.destroy.fixture_destroyed=false,o=>o.destroy.source_rows_after=0,o=>delete o.destroy.retained_before,
  o=>o.destroy.retained_after='unexpected-render',o=>o.transitions.pop(),o=>o.transitions.push(o.transitions[1]),
  o=>o.transitions.reverse(),
];
for(let i=0;i<sample.transitions.length;i++) {
  for(const [key,value] of [['stage','foreign'],['stable_source',false],['data_rows',2],['no_data_rows',2]])
    mutations.push(o=>o.transitions[i][key]=value);
  if(['initial','restored'].includes(sample.transitions[i].stage))mutations.push(o=>o.transitions[i].data_cells=['wrong']);
  else for(const [key,value] of [['row_class','cdk-no-data-row'],['row_role',null],['cell_class',''],['colspan',null],['cell_text','Empty rows: ']])
    mutations.push(o=>o.transitions[i][key]=value);
}
let negatives=0;
for(const mutate of mutations) {const changed=structuredClone(sample);mutate(changed);assert.equal(observe(changed).result,'fail');negatives++;}
for(const absent of [undefined,null,true,[],{},'pass']){assert.equal(observe(absent).result,'fail');negatives++;}
const mutants=[source.replace('packedTableOnPushCase(parsed.tableOnPushRendering)','packedTableOnPushCase(null)'),
  source.replace('if (caseId === tableOnPushCase.case_id) return tableOnPushCase;','if (caseId === tableOnPushCase.case_id) return {case_id:caseId,result:"pass"};')];
for(const mutant of mutants) {assert.notEqual(mutant,source);assert.throws(()=>{
  const fn=load(mutant);assert.equal(observe(sample,fn).result,'pass');assert.equal(observe(null,fn).result,'fail');
});}
const scratch=mkdtempSync(join(tmpdir(),'table-onpush-admission-'));
try {for(const name of ['complete','missing','failed']) {
  const runDir=join(scratch,name),out=join(runDir,'evidence/packed-consumer/fixture');mkdirSync(out,{recursive:true});
  const cases=expected.filter(id=>name!=='missing'||id!==TABLE_ONPUSH_CASE_ID).map(case_id=>({case_id,result:name==='failed'&&case_id===TABLE_ONPUSH_CASE_ID?'fail':'pass'}));
  const saved=writeAcceptanceReport({checkId:'packed-consumer',request:{binding:{fixture_only:true},invocation:'fixture',runId:'fixture',outputDir:out,runDir,line},cases,expectedIds:expected,library:{sha256:'c'.repeat(64),bytes:1},assertionName:'observations.json',command:['synthetic-table-onpush-admission-controller']});
  assert.equal(saved.passed,name==='complete');
}} finally {rmSync(scratch,{recursive:true,force:true});}
let sourceNegatives=0;
for(const file of [path,'scripts/packed-consumer-evidence.mjs','compatibility/rc/matrices/full-verify.json']) {
  const original=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show',TABLE_ONPUSH_SOURCE_PREIMAGES[line].commit+':'+file],{cwd:root,encoding:'utf8'});
  assert.equal(reverseTableOnPushPackedSource(file,read(file),line),original);
  assert.throws(()=>reverseTableOnPushPackedSource(file,read(file)+'\n',line));sourceNegatives++;
}
for(const [,after] of TABLE_ONPUSH_SOURCE_EDITS){assert.throws(()=>reverseOldTableOnPushPackedSource(path,reverseRadioIdentityPackedSource(path,reverseGeneratedIdentityPackedSource(path,reverseSelectDetachPackedSource(path,raw,line),line),line).replace(after,after+'\n// mutated addition'),line));sourceNegatives++;}
assert.throws(()=>reverseTableOnPushPackedSource('foreign.mjs',raw,line));sourceNegatives++;
assert.throws(()=>reverseTableOnPushPackedSource(path,raw,line==='main'?'21.x':'main'));sourceNegatives++;
const fixture=tableOnPushPackedFixture(),parsed=ts.createSourceFile('table-onpush-probe.ts',fixture,ts.ScriptTarget.Latest,true);
assert.equal(parsed.parseDiagnostics.length,0);assert.doesNotMatch(fixture,/ɵ|\.markForCheck\(|child\.detectChanges\(/);
assert.ok(fixture.includes('changeDetection:tableChangeDetection'));assert.ok(fixture.includes('const tableChangeDetection=ChangeDetectionStrategy.OnPush'));
assert.ok(raw.includes("writeFileSync(join(consumer, 'src/table-onpush-probe.ts'), tableOnPushPackedFixture())"));
assert.ok(raw.includes('tableOnPushRendering:tableOnPush.observed'));assert.ok(raw.includes('&& tableOnPush.okay && valueAccessors.okay'));
const result={schema_version:1,line,role:'Synthetic actual collector/writer controls, generated fixture syntax and exact whole-program reversal; no table execution',
  derived_cases:expected.length,negative_cases:negatives,collector_mutants:mutants.length,writer_cases:3,source_reversal_negative_controls:sourceNegatives,
  fixture_sha256:hash(fixture),typescript:ts.version,node:process.version,roster_bound:true,actual_packed_table_executed:false,native_browser_executed:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
