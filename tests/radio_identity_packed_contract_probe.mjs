/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {packedLegacyBidiScopeCase} from '../scripts/bidi-isolated-packed-contract.mjs';
import {packedSelectionComparatorCase} from '../scripts/selection-comparator-packed-contract.mjs';
/** Synthetic admission/source controls; actual packed Angular execution remains separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {RADIO_IDENTITY_CASE_ID,packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';
import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';
import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';
import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';
import {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';
import {packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase} from '../scripts/chip-menu-tooltip-packed-contract.mjs';
import {radioIdentityPackedFixture} from '../scripts/radio-identity-packed-fixture.mjs';
import {RADIO_IDENTITY_PACKED_PREIMAGES,RADIO_IDENTITY_PACKED_EDITS,reverseRadioIdentityPackedSource as reverseOldRadioIdentityPackedSource} from '../scripts/radio-identity-packed-source-requalification.mjs';
import {reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';
import {reverseSelectDetachPackedSource as reverseOldSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';
import {reverseMenuItemTokenPackedSource as reverseOldMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';
import {reverseSelectFocusClickPackedSource as reversePreviousSelectFocusClickPackedSource} from '../scripts/select-focus-click-packed-source-requalification.mjs';
import {reverseChipMenuTooltipPackedSource} from '../scripts/chip-menu-tooltip-packed-source-requalification.mjs';
const reverseSelectFocusClickPackedSource=(path,raw,line)=>reversePreviousSelectFocusClickPackedSource(path,reverseChipMenuTooltipPackedSource(path,raw,line),line);
const reverseMenuItemTokenPackedSource=(path,raw,line)=>reverseOldMenuItemTokenPackedSource(path,reverseSelectFocusClickPackedSource(path,raw,line),line);
const reverseSelectDetachPackedSource=(path,raw,line)=>reverseOldSelectDetachPackedSource(path,reverseMenuItemTokenPackedSource(path,raw,line),line);
const reverseRadioIdentityPackedSource=(path,raw,line)=>reverseOldRadioIdentityPackedSource(path,reverseGeneratedIdentityPackedSource(path,reverseSelectDetachPackedSource(path,raw,line),line),line);
import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';
import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';
import {allConsumerCaseIds,declarationObservations,declarationKeys,librarySpec,harnessCaseIds,loadExportKeys,writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),read=path=>readFileSync(join(root,path),'utf8'),hash=raw=>createHash('sha256').update(raw).digest('hex');
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const hosts=['legacy-generated','packed-legacy-explicit','current-a','current-b','current-c','current-d'];
const sample={execution:'packed-angular-testbed-dom',error:null,scopes_separate:true,
 identities:{owned_group:true,owned_buttons:true,peer_group:true,peer_buttons:true,dispatcher_shared:true,generations_distinct:true},
 initial:{group_names:['legacy-generated-group','current-generated-group'],host_ids:hosts,input_ids:hosts.map(id=>id+'-input'),
  links:hosts.map((id,index)=>({host_id:id,input_id:id+'-input',label_for:id+'-input',native_name:index<2?'legacy-generated-group':'current-generated-group'})),
  legacy_structure:Array.from({length:2},()=>({label:true,container:true,outer_circle:true,inner_circle:true,label_content:true,input_class:true})),
  selection:{legacy:'a',peer:'a',legacy_native:'a',peer_native:'a'}},
 transitions:[['legacy-b','b','a'],['peer-c','b','c'],['legacy-a','a','c'],['shared-peer-b',null,'b'],['shared-legacy-b','b',null],['restored-independent','b','c']].map(([stage,legacy,peer])=>({stage,legacy,peer,legacy_native:legacy,peer_native:peer})),
 explicit:{group_name:'packed-radio-shared',legacy_names:Array(2).fill('packed-radio-shared'),peer_names:Array(4).fill('packed-radio-shared'),host_id:'packed-legacy-explicit',input_id:'packed-legacy-explicit-input',label_for:'packed-legacy-explicit-input'},
 destroy:{fixture_destroyed:true,notified_distinct_names:2,checked_before:[false,true,false,false,true,false],checked_after:[false,true,false,false,true,false]}};
const producerPath='scripts/packed-consumer-aot-smoke.mjs',raw=read(producerPath),sf=ts.createSourceFile(producerPath,raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0);
const source=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='collectAcceptanceCases').getText(sf);
const load=text=>new Function('declarationObservations','declarationKeys','packagedSpec','harnessCaseIds','packedValueAccessorCases','packedTableOnPushCase','packedRadioIdentityCase','packedGeneratedIdentityCase','packedSelectDetachCase','packedMenuItemTokenCase','packedSelectFocusClickCase','packedChipDisabledCase','packedMenuLazyCase','packedTooltipContainerCase','packedLegacyBidiScopeCase', 'packedSelectionComparatorCase',text+';return collectAcceptanceCases;')(declarationObservations,declarationKeys,librarySpec,harnessCaseIds,packedValueAccessorCases,packedTableOnPushCase,packedRadioIdentityCase,packedGeneratedIdentityCase,packedSelectDetachCase,packedMenuItemTokenCase,packedSelectFocusClickCase,packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase,packedLegacyBidiScopeCase, packedSelectionComparatorCase);
const keys=loadExportKeys(),expected=allConsumerCaseIds(keys);assert.equal(expected.length,106);assert.equal(new Set(expected).size,106);
const observe=(value,fn=load(source))=>{const rows=fn({harness:{status:'ok',result:{radioIdentity:value}}},keys,'/tmp/consumer','/tmp/source').filter(r=>r.case_id===RADIO_IDENTITY_CASE_ID);assert.equal(rows.length,1);return rows[0];};
assert.equal(observe(sample).result,'pass');
const mutations=[o=>o.execution='workspace-projection',o=>o.error='fixture-failure',o=>o.scopes_separate=false,
 ...Object.keys(sample.identities).map(key=>o=>o.identities[key]=false),
 o=>o.initial.group_names=['same','same'],o=>o.initial.group_names[0]='',o=>o.initial.group_names.pop(),
 o=>o.initial.host_ids[0]=o.initial.host_ids[1],o=>o.initial.input_ids[0]=o.initial.input_ids[1],o=>o.initial.host_ids.pop(),o=>o.initial.input_ids.pop(),
 o=>o.initial.links.pop(),o=>o.transitions.pop(),o=>o.transitions.reverse(),
 o=>o.explicit.group_name='other',o=>o.explicit.legacy_names[0]='other',o=>o.explicit.peer_names[3]='other',o=>o.explicit.host_id='other',o=>o.explicit.input_id='other',o=>o.explicit.label_for='other',
 o=>o.destroy.fixture_destroyed=false,o=>o.destroy.notified_distinct_names=1,o=>o.destroy.checked_before[1]=false,o=>o.destroy.checked_after[4]=false];
for(let i=0;i<6;i++)for(const key of ['host_id','input_id','label_for','native_name'])mutations.push(o=>o.initial.links[i][key]='wrong');
for(let i=0;i<2;i++)for(const key of Object.keys(sample.initial.legacy_structure[i]))mutations.push(o=>o.initial.legacy_structure[i][key]=false);
for(const key of Object.keys(sample.initial.selection))mutations.push(o=>o.initial.selection[key]='wrong');
for(let i=0;i<6;i++)for(const key of ['stage','legacy','peer','legacy_native','peer_native'])mutations.push(o=>o.transitions[i][key]='wrong');
let negatives=0;for(const mutate of mutations){const changed=structuredClone(sample);mutate(changed);assert.equal(observe(changed).result,'fail');negatives++;}
for(const absent of [undefined,null,true,[],{},'pass']){assert.equal(observe(absent).result,'fail');negatives++;}
const mutants=[source.replace('packedRadioIdentityCase(parsed.radioIdentity)','packedRadioIdentityCase(null)'),source.replace('if (caseId === radioIdentityCase.case_id) return radioIdentityCase;','if (caseId === radioIdentityCase.case_id) return {case_id:caseId,result:"pass"};'),source.replace('    if (caseId === radioIdentityCase.case_id) return radioIdentityCase;','')];
for(const changed of mutants){assert.notEqual(changed,source);assert.throws(()=>{const fn=load(changed);assert.equal(observe(sample,fn).result,'pass');assert.equal(observe(null,fn).result,'fail');});}
const scratch=mkdtempSync(join(tmpdir(),'radio-identity-packed-admission-'));
try{for(const name of ['complete','missing','failed']){const runDir=join(scratch,name),out=join(runDir,'evidence/packed-consumer/fixture');mkdirSync(out,{recursive:true});const cases=expected.filter(id=>name!=='missing'||id!==RADIO_IDENTITY_CASE_ID).map(case_id=>({case_id,result:name==='failed'&&case_id===RADIO_IDENTITY_CASE_ID?'fail':'pass'}));const saved=writeAcceptanceReport({checkId:'packed-consumer',request:{binding:{fixture_only:true},invocation:'fixture',runId:'fixture',outputDir:out,runDir,line},cases,expectedIds:expected,library:{sha256:'c'.repeat(64),bytes:1},assertionName:'observations.json',command:['synthetic-radio-identity-packed-admission']});assert.equal(saved.passed,name==='complete');}}finally{rmSync(scratch,{recursive:true,force:true});}
const matrix=JSON.parse(read('compatibility/rc/matrices/full-verify.json')),check=matrix.checks.find(row=>row.check_id==='packed-consumer');
for(const branch of ['main','21.x']){const roster=check.acceptance.cases_by_line[branch];if(roster.harness===null)continue;assert.deepEqual(Object.values(roster).flat().sort(),[...expected].sort());}
let sourceNegatives=0;for(const path of Object.keys(RADIO_IDENTITY_PACKED_PREIMAGES[line].members)){const original=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show',RADIO_IDENTITY_PACKED_PREIMAGES[line].commit+':'+path],{cwd:root,encoding:'utf8'});assert.equal(reverseRadioIdentityPackedSource(path,read(path),line),original);assert.throws(()=>reverseRadioIdentityPackedSource(path,read(path)+'\n',line));sourceNegatives++;
 if(RADIO_IDENTITY_PACKED_EDITS[path])for(const [,after] of RADIO_IDENTITY_PACKED_EDITS[path]){const prior=reverseGeneratedIdentityPackedSource(path,reverseSelectDetachPackedSource(path,read(path),line),line);assert.ok(prior.includes(after));assert.throws(()=>reverseOldRadioIdentityPackedSource(path,prior.replace(after,after+'\n// mutated addition'),line));sourceNegatives++;}
}
assert.throws(()=>reverseRadioIdentityPackedSource('foreign.mjs',raw,line));sourceNegatives++;assert.throws(()=>reverseRadioIdentityPackedSource(producerPath,raw,line==='main'?'21.x':'main'));sourceNegatives++;
const fixture=radioIdentityPackedFixture(),parsed=ts.createSourceFile('radio-identity-probe.ts',fixture,ts.ScriptTarget.Latest,true);assert.equal(parsed.parseDiagnostics.length,0);assert.doesNotMatch(fixture,/ɵ|_IdGenerator|new UniqueSelectionDispatcher|provide:\s*UniqueSelectionDispatcher|\.ngOnDestroy\(/);assert.ok(fixture.includes('fixture.destroy()'));assert.ok(fixture.includes('input(node).click()'));assert.ok(fixture.includes('legacyScope.queryAll(By.directive(MatRadioButton)).length===0'));assert.ok(raw.indexOf('const radioIdentity=await observePackedRadioIdentity();')<raw.indexOf('const fixture = TestBed.createComponent(HarnessHost);'));
const output={schema_version:1,line,role:'Synthetic actual collector/writer controls, generated fixture syntax and exact whole-program reversal; no actual radio component execution',derived_cases:106,retained_previous_cases:102,negative_cases:negatives,collector_mutants:mutants.length,writer_cases:3,source_reversal_negative_controls:sourceNegatives,fixture_sha256:hash(fixture),contract_sha256:hash(read('scripts/radio-identity-packed-contract.mjs')),typescript:ts.version,node:process.version,roster_bound:true,actual_packed_radio_executed:false,native_browser_executed:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(output));
