/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {packedLegacyBidiScopeCase} from '../scripts/bidi-isolated-packed-contract.mjs';
import {packedSelectionComparatorCase} from '../scripts/selection-comparator-packed-contract.mjs';
/** Actual collector/writer controls; actual Angular focus/click remains deferred. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {SELECT_FOCUS_CLICK_CASE_ID,packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';
import {packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase} from '../scripts/chip-menu-tooltip-packed-contract.mjs';
import {selectFocusClickPackedFixture} from '../scripts/select-focus-click-packed-fixture.mjs';
import {SELECT_FOCUS_CLICK_PREIMAGES,SELECT_FOCUS_CLICK_EDITS,reverseSelectFocusClickPackedSource as reversePreviousSelectFocusClickPackedSource} from '../scripts/select-focus-click-packed-source-requalification.mjs';
import {reverseChipMenuTooltipPackedSource} from '../scripts/chip-menu-tooltip-packed-source-requalification.mjs';
const reverseSelectFocusClickPackedSource=(path,raw,line)=>reversePreviousSelectFocusClickPackedSource(path,reverseChipMenuTooltipPackedSource(path,raw,line),line);
import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';
import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';
import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';
import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';
import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';
import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';
import {allConsumerCaseIds,declarationObservations,declarationKeys,librarySpec,harnessCaseIds,loadExportKeys,writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),read=p=>readFileSync(join(root,p),'utf8'),hash=b=>createHash('sha256').update(b).digest('hex');
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const events=(pairs,open)=>[...Array.from({length:pairs},()=>[true,false]).flat(),...(open?[true]:[])];
function state(host,pairs,open){return {panel_open:open,overlay_attached:open,expanded:String(open),controls:open?host+'-panel':null,value:'a',focused:true,panel_id:host+'-panel',panel_resolution_count:open?1:0,panel_connected:open,opened_events:events(pairs,open),directive_detach_count:pairs};}
const sample={execution:'packed-angular-testbed-dom',error:null,contexts:['legacy','current'].flatMap(generation=>['bare','form-field'].map(enclosure=>{
 const host=generation+'-'+enclosure;
 return {generation,enclosure,public_select_instance:true,public_overlay_directive_instance:true,foreign_generation_nodes:0,host_id:host,enclosure_present:enclosure==='form-field',legacy_structure:true,initial:state(host,0,false),
 cycles:[0,1].map(cycle=>({cycle,after_focus:{...state(host,cycle,true),focus_handler_delta:1,no_touch_on_focus:true},after_click:{...state(host,cycle,true),focus_handler_delta:0,no_extra_touched:true,state_change_delta:0,no_detach:true,same_panel_node:true,same_overlay_ref:true},after_backdrop:state(host,cycle+1,false)})),
 blocked:['disabled','empty'].map(kind=>({kind,disabled:kind==='disabled',option_count:kind==='disabled'?2:0,...state(host,2,false),events_unchanged:true,noop_open_state_change_delta:0,noop_open_touch_delta:0})),
 plain_click:{before:state(host,2,false),opened:state(host,2,true),closed:state(host,3,false)},manual_toggle:{opened:state(host,3,true),closed:state(host,4,false)},closed_noop:{...state(host,4,false),state_change_delta:0,touch_delta:0,events_unchanged:true,no_detach:true},
 cleanup:{fixture_destroyed:true,host_connected:false,known_panels_remaining:0,any_overlay_attached:false,own_subscriptions_closed:true}};
}))};
assert.equal(packedSelectFocusClickCase(sample).result,'pass');
const producerPath='scripts/packed-consumer-aot-smoke.mjs',raw=read(producerPath),sf=ts.createSourceFile(producerPath,raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0);
const source=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='collectAcceptanceCases').getText(sf);
const load=text=>new Function('declarationObservations','declarationKeys','packagedSpec','harnessCaseIds','packedValueAccessorCases','packedTableOnPushCase','packedRadioIdentityCase','packedGeneratedIdentityCase','packedSelectDetachCase','packedMenuItemTokenCase','packedSelectFocusClickCase','packedChipDisabledCase','packedMenuLazyCase','packedTooltipContainerCase','packedLegacyBidiScopeCase', 'packedSelectionComparatorCase',text+';return collectAcceptanceCases;')(
 declarationObservations,declarationKeys,librarySpec,harnessCaseIds,packedValueAccessorCases,packedTableOnPushCase,packedRadioIdentityCase,packedGeneratedIdentityCase,packedSelectDetachCase,packedMenuItemTokenCase,packedSelectFocusClickCase,packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase,packedLegacyBidiScopeCase, packedSelectionComparatorCase);
const keys=loadExportKeys(),expected=allConsumerCaseIds(keys);assert.equal(expected.length,106);assert.equal(new Set(expected).size,106);
const baseline={selectOpened:true,selectClosed:true,viewportShared:true};
const observe=(value,base=baseline,fn=load(source))=>{const rows=fn({harness:{status:'ok',result:{...base,selectFocusClick:value}}},keys,'/tmp/consumer','/tmp/source').filter(row=>row.case_id===SELECT_FOCUS_CLICK_CASE_ID);assert.equal(rows.length,1);return rows[0];};
assert.equal(observe(sample).result,'pass');let negatives=0;
const setAt=(value,path,fn)=>{let parent=value;for(const key of path.slice(0,-1))parent=parent[key];fn(parent,path.at(-1));};
function controls(value,path=[]){
 if(Array.isArray(value)){
  const bad=structuredClone(sample);setAt(bad,path,(parent,key)=>parent[key]=parent[key].length?parent[key].slice(1):['corrupted']);assert.equal(observe(bad).result,'fail','changed array '+path.join('.'));negatives++;
  for(const [index,member]of value.entries())controls(member,[...path,index]);
 }else if(value!==null&&typeof value==='object'){
  for(const [key,member]of Object.entries(value)){
   // Focus is observational when the control is disabled/empty or initially unfocused.
   if(key==='focused'&&(path.includes('initial')||path.includes('blocked')))continue;
   const bad=structuredClone(sample);setAt(bad,[...path,key],(parent,key)=>delete parent[key]);assert.equal(observe(bad).result,'fail','missing '+[...path,key].join('.'));negatives++;
   controls(member,[...path,key]);
  }
 }else{
  const bad=structuredClone(sample);setAt(bad,path,(parent,key)=>parent[key]=typeof value==='boolean'?!value:typeof value==='number'?value+1:typeof value==='string'?'corrupted':'unconfirmed');assert.equal(observe(bad).result,'fail','changed '+path.join('.'));negatives++;
 }
}
controls(sample);for(const absent of [undefined,null,true,[],{},'pass']){assert.equal(observe(absent).result,'fail');negatives++;}
for(const field of Object.keys(baseline))for(const value of [false,undefined,'true',1]){assert.equal(observe(sample,{...baseline,[field]:value}).result,'fail',field);negatives++;}
const mutants=[source.replace('packedSelectFocusClickCase(parsed.selectFocusClick)','packedSelectFocusClickCase(null)'),
 source.replace("const ok = harnessMap[caseId] === true && selectFocusClickCase.result === 'pass';",'const ok = true;'),
 source.replace('if (caseId === selectFocusClickCase.case_id) {','if (false) {'),
 source.replace("const ok = harnessMap[caseId] === true && selectFocusClickCase.result === 'pass';","const ok = selectFocusClickCase.result === 'pass';")];
for(const mutated of mutants){assert.notEqual(mutated,source);assert.throws(()=>{const fn=load(mutated);assert.equal(observe(sample,baseline,fn).result,'pass');assert.equal(observe(null,baseline,fn).result,'fail');assert.equal(observe(sample,{...baseline,selectOpened:false},fn).result,'fail');});}
const scratch=mkdtempSync(join(tmpdir(),'select-focus-click-admission-'));
try{for(const name of ['complete','missing','failed']){const runDir=join(scratch,name),out=join(runDir,'evidence/packed-consumer/fixture');mkdirSync(out,{recursive:true});const cases=expected.filter(id=>name!=='missing'||id!==SELECT_FOCUS_CLICK_CASE_ID).map(case_id=>({case_id,result:name==='failed'&&case_id===SELECT_FOCUS_CLICK_CASE_ID?'fail':'pass'}));const saved=writeAcceptanceReport({checkId:'packed-consumer',request:{binding:{fixture_only:true},invocation:'fixture',runId:'fixture',outputDir:out,runDir,line},cases,expectedIds:expected,library:{sha256:'c'.repeat(64),bytes:1},assertionName:'observations.json',command:['synthetic-select-focus-click-admission']});assert.equal(saved.passed,name==='complete');}}finally{rmSync(scratch,{recursive:true,force:true});}
const matrix=JSON.parse(read('compatibility/rc/matrices/full-verify.json')),check=matrix.checks.find(row=>row.check_id==='packed-consumer');
for(const branch of ['main','21.x']){const roster=check.acceptance.cases_by_line[branch];if(roster.harness===null)continue;assert.deepEqual(Object.values(roster).flat().sort(),[...expected].sort());}
let sourceNegatives=0;
for(const path of Object.keys(SELECT_FOCUS_CLICK_PREIMAGES[line].members)){
 const before=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show',SELECT_FOCUS_CLICK_PREIMAGES[line].commit+':'+path],{cwd:root,encoding:'utf8'});assert.equal(reverseSelectFocusClickPackedSource(path,read(path),line),before);assert.throws(()=>reverseSelectFocusClickPackedSource(path,read(path)+'\n',line));sourceNegatives++;
 for(const [,after]of SELECT_FOCUS_CLICK_EDITS[path]||[]){const prior=reverseChipMenuTooltipPackedSource(path,read(path),line);assert.ok(prior.includes(after));assert.throws(()=>reversePreviousSelectFocusClickPackedSource(path,prior.replace(after,()=>after+'\n// foreign addition'),line));sourceNegatives++;}
}
assert.throws(()=>reverseSelectFocusClickPackedSource('foreign.mjs',raw,line));sourceNegatives++;assert.throws(()=>reverseSelectFocusClickPackedSource(producerPath,raw,line==='main'?'21.x':'main'));sourceNegatives++;
const fixture=selectFocusClickPackedFixture(),parsed=ts.createSourceFile('select-focus-click-probe.ts',fixture,ts.ScriptTarget.Latest,true);assert.equal(parsed.parseDiagnostics.length,0);
assert.doesNotMatch(fixture,/ɵ|\.emit\(|\.next\(|select\._|\.triggerEventHandler\(/);
for(const fragment of ['host!.focus();await settle()','trigger.click();await settle()','backdrop().click()','select.registerOnTouched(()=>touched++)','same_panel_node:select.panel?.nativeElement===panel','select.toggle()','fixture.destroy()'])assert.ok(fixture.includes(fragment),fragment);
const beforeEvidence=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show',SELECT_FOCUS_CLICK_PREIMAGES[line].commit+':scripts/packed-consumer-evidence.mjs'],{cwd:root,encoding:'utf8'});assert.equal(beforeEvidence,read('scripts/packed-consumer-evidence.mjs'));
const output={schema_version:1,line,role:'Synthetic actual collector/writer and whole-source controls; actual focus/click component execution remains pending',derived_cases:106,retained_previous_cases:106,existing_select_case_strengthened:true,original_select_harness_conditions_retained:3,negative_cases:negatives,collector_mutants:mutants.length,writer_cases:3,source_reversal_negative_controls:sourceNegatives,
 producer_sha256:hash(read('tests/select_focus_click_packed_contract_probe.mjs')),source_guard_sha256:hash(read('scripts/select-focus-click-packed-source-requalification.mjs')),packed_producer_sha256:hash(raw),fixture_sha256:hash(fixture),contract_sha256:hash(read('scripts/select-focus-click-packed-contract.mjs')),typescript:ts.version,node:process.version,roster_bound:true,actual_packed_focus_click_executed:false,native_browser_executed:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(output));
