/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic actual-collector/writer controls; no component execution claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {SELECT_DETACH_CASE_ID,packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';
import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';
import {selectDetachPackedFixture} from '../scripts/select-detach-packed-fixture.mjs';
import {SELECT_DETACH_PACKED_PREIMAGES,SELECT_DETACH_PACKED_EDITS,reverseSelectDetachPackedSource as reverseOldSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';
import {reverseMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';
const reverseSelectDetachPackedSource=(path,raw,line)=>reverseOldSelectDetachPackedSource(path,reverseMenuItemTokenPackedSource(path,raw,line),line);
import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';
import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';
import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';
import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';
import {allConsumerCaseIds,declarationObservations,declarationKeys,librarySpec,harnessCaseIds,loadExportKeys,writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const read=p=>readFileSync(join(root,p),'utf8'),hash=b=>createHash('sha256').update(b).digest('hex');
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
function state(generation,cycle,open){
 const host=generation+'-select',panel=host+'-panel';
 return {panel_open:open,expanded:String(open),controls:open?panel:null,active_descendant:open?generation+'-option':null,value:'a',focused:true,
  overlay_attached:open,panel_connected:open,panel_id:panel,panel_resolution_count:open?1:0,panel_resolves_exactly:true,real_close_strategy:true,
  selected_option_id:generation+'-option',active_resolution_count:1,active_option_is_in_panel:true,
  directive_detach_count:cycle+(open?0:1),ref_detach_count:cycle+(open?0:1),
  opened_events:[...Array.from({length:cycle},()=>[true,false]).flat(),...(open?[true]:[true,false])]};
}
const sample={execution:'packed-angular-testbed-dom',error:null,tokens_distinct:true,generations:['legacy','current'].map(generation=>({generation,
 public_select_instance:true,public_scrollable_instance:true,public_overlay_directive_instance:true,foreign_generation_nodes:0,host_id:generation+'-select',
 initial:{panel_open:false,expanded:'false',controls:null,active_descendant:null,value:'a'},
 cycles:[0,1].map(cycle=>({cycle,opened:state(generation,cycle,true),closed:state(generation,cycle,false),idle_scroll:state(generation,cycle,false)})),
 native_scroll_events:Array.from({length:4},()=>({type:'scroll',target_matches_scrollable:true})),
 cleanup:{fixture_destroyed:true,host_connected:false,panel_resolution_count:0,any_overlay_attached:false,own_subscriptions_closed:true}}))};
assert.equal(packedSelectDetachCase(sample).result,'pass');
const producerPath='scripts/packed-consumer-aot-smoke.mjs',raw=read(producerPath),sf=ts.createSourceFile(producerPath,raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0);
const source=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='collectAcceptanceCases').getText(sf);
const load=text=>new Function('declarationObservations','declarationKeys','packagedSpec','harnessCaseIds','packedValueAccessorCases','packedTableOnPushCase','packedRadioIdentityCase','packedGeneratedIdentityCase','packedSelectDetachCase','packedMenuItemTokenCase',text+';return collectAcceptanceCases;')(
 declarationObservations,declarationKeys,librarySpec,harnessCaseIds,packedValueAccessorCases,packedTableOnPushCase,packedRadioIdentityCase,packedGeneratedIdentityCase,packedSelectDetachCase,packedMenuItemTokenCase);
const keys=loadExportKeys(),expected=allConsumerCaseIds(keys);assert.equal(expected.length,106);assert.equal(new Set(expected).size,106);
const observe=(value,fn=load(source))=>{const rows=fn({harness:{status:'ok',result:{selectScrollDetach:value}}},keys,'/tmp/consumer','/tmp/source').filter(row=>row.case_id===SELECT_DETACH_CASE_ID);assert.equal(rows.length,1);return rows[0];};
assert.equal(observe(sample).result,'pass');
const mutations=[o=>o.execution='workspace-projection',o=>o.error='failure',o=>o.tokens_distinct=false,o=>o.generations.pop(),o=>o.generations.push(o.generations[0])];
for(let generation=0;generation<2;generation++){
 const change=fn=>mutations.push(o=>fn(o.generations[generation]));
 for(const key of ['public_select_instance','public_scrollable_instance','public_overlay_directive_instance'])change(o=>o[key]=false);
 change(o=>o.generation='unknown');change(o=>o.host_id='');change(o=>o.foreign_generation_nodes=1);change(o=>o.cycles.pop());change(o=>o.cycles.reverse());
 for(const [key,value]of [['panel_open',true],['expanded','true'],['controls','stale'],['active_descendant','stale'],['value','b']])change(o=>o.initial[key]=value);
 for(let cycle=0;cycle<2;cycle++){
  change(o=>o.cycles[cycle].cycle=50);
  for(const [key,value]of [['panel_open',false],['expanded','false'],['value','b'],['focused',false],['overlay_attached',false],['panel_connected',false],['real_close_strategy',false],['panel_id','wrong'],['controls','other-panel'],['panel_resolution_count',0],['panel_resolution_count',2],['panel_resolves_exactly',false],['selected_option_id','wrong'],['active_descendant','wrong'],['active_resolution_count',0],['active_resolution_count',2],['active_option_is_in_panel',false],['directive_detach_count',50],['ref_detach_count',50],['opened_events',[]]])change(o=>o.cycles[cycle].opened[key]=value);
  for(const phase of ['closed','idle_scroll'])for(const [key,value]of [['panel_open',true],['expanded','true'],['controls','stale'],['active_descendant','stale'],['value','b'],['focused',false],['overlay_attached',true],['panel_connected',true],['panel_resolution_count',1],['directive_detach_count',50],['ref_detach_count',50],['opened_events',[]]])change(o=>o.cycles[cycle][phase][key]=value);
 }
 change(o=>o.native_scroll_events.pop());for(let event=0;event<4;event++){change(o=>o.native_scroll_events[event].type='manual-callback');change(o=>o.native_scroll_events[event].target_matches_scrollable=false);}
 for(const [key,value]of [['fixture_destroyed',false],['host_connected',true],['panel_resolution_count',1],['any_overlay_attached',true],['own_subscriptions_closed',false]])change(o=>o.cleanup[key]=value);
}
let negatives=0;
for(const mutate of mutations){const bad=structuredClone(sample);mutate(bad);assert.equal(observe(bad).result,'fail');negatives++;}
for(const absent of [undefined,null,true,[],{},'pass']){assert.equal(observe(absent).result,'fail');negatives++;}
const mutants=[source.replace('packedSelectDetachCase(parsed.selectScrollDetach)','packedSelectDetachCase(null)'),
 source.replace('if (caseId === selectDetachCase.case_id) return selectDetachCase;','if (caseId === selectDetachCase.case_id) return {case_id:caseId,result:"pass"};'),
 source.replace('    if (caseId === selectDetachCase.case_id) return selectDetachCase;','')];
for(const changed of mutants){assert.notEqual(changed,source);assert.throws(()=>{const fn=load(changed);assert.equal(observe(sample,fn).result,'pass');assert.equal(observe(null,fn).result,'fail');});}
const scratch=mkdtempSync(join(tmpdir(),'select-detach-packed-admission-'));
try{for(const name of ['complete','missing','failed']){const runDir=join(scratch,name),out=join(runDir,'evidence/packed-consumer/fixture');mkdirSync(out,{recursive:true});const cases=expected.filter(id=>name!=='missing'||id!==SELECT_DETACH_CASE_ID).map(case_id=>({case_id,result:name==='failed'&&case_id===SELECT_DETACH_CASE_ID?'fail':'pass'}));const saved=writeAcceptanceReport({checkId:'packed-consumer',request:{binding:{fixture_only:true},invocation:'fixture',runId:'fixture',outputDir:out,runDir,line},cases,expectedIds:expected,library:{sha256:'c'.repeat(64),bytes:1},assertionName:'observations.json',command:['synthetic-select-detach-admission']});assert.equal(saved.passed,name==='complete');}}finally{rmSync(scratch,{recursive:true,force:true});}
const matrix=JSON.parse(read('compatibility/rc/matrices/full-verify.json')),check=matrix.checks.find(row=>row.check_id==='packed-consumer');
for(const branch of ['main','21.x']){const roster=check.acceptance.cases_by_line[branch];if(roster.harness===null)continue;assert.deepEqual(Object.values(roster).flat().sort(),[...expected].sort());}
let sourceNegatives=0;
for(const path of Object.keys(SELECT_DETACH_PACKED_PREIMAGES[line].members)){
 const original=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show',SELECT_DETACH_PACKED_PREIMAGES[line].commit+':'+path],{cwd:root,encoding:'utf8'});
 assert.equal(reverseSelectDetachPackedSource(path,read(path),line),original);assert.throws(()=>reverseSelectDetachPackedSource(path,read(path)+'\n',line));sourceNegatives++;
 if(SELECT_DETACH_PACKED_EDITS[path])for(const [,after]of SELECT_DETACH_PACKED_EDITS[path]){const prior=reverseMenuItemTokenPackedSource(path,read(path),line);assert.ok(prior.includes(after));assert.throws(()=>reverseOldSelectDetachPackedSource(path,prior.replace(after,()=>after+'\n// foreign addition'),line));sourceNegatives++;}
}
assert.throws(()=>reverseSelectDetachPackedSource('foreign.mjs',raw,line));sourceNegatives++;
assert.throws(()=>reverseSelectDetachPackedSource(producerPath,raw,line==='main'?'21.x':'main'));sourceNegatives++;
const fixture=selectDetachPackedFixture(),parsed=ts.createSourceFile('select-detach-probe.ts',fixture,ts.ScriptTarget.Latest,true);assert.equal(parsed.parseDiagnostics.length,0);
assert.doesNotMatch(fixture,/ɵ|_overlayDir|_scrollStrategy|provide:\s*ScrollDispatcher|new CloseScrollStrategy|\.detach\.emit\(|select\.close\(/);
assert.ok(fixture.includes("dispatchEvent(new Event('scroll'))"));assert.ok(fixture.includes('scrollable.elementScrolled().subscribe'));
assert.ok(fixture.includes('ref.getConfig().scrollStrategy instanceof CloseScrollStrategy'));assert.ok(fixture.includes('fixture.destroy()'));
assert.ok(raw.indexOf('const selectScrollDetach=await observePackedSelectDetach();')<raw.indexOf('const fixture = TestBed.createComponent(HarnessHost);'));
const output={schema_version:1,line,role:'Synthetic actual collector/writer controls and exact whole-source reversal; actual scroll/component execution remains pending',derived_cases:106,retained_previous_cases:104,
 negative_cases:negatives,collector_mutants:mutants.length,writer_cases:3,source_reversal_negative_controls:sourceNegatives,producer_sha256:hash(read('tests/select_detach_packed_contract_probe.mjs')),
 source_guard_sha256:hash(read('scripts/select-detach-packed-source-requalification.mjs')),packed_producer_sha256:hash(raw),packed_evidence_sha256:hash(read('scripts/packed-consumer-evidence.mjs')),
 fixture_sha256:hash(fixture),contract_sha256:hash(read('scripts/select-detach-packed-contract.mjs')),typescript:ts.version,node:process.version,roster_bound:true,actual_packed_scroll_or_components_executed:false,native_browser_executed:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(output));
