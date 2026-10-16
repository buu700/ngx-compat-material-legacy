/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic collector/writer controls. This does not execute packed components. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {MENU_ITEM_TOKEN_CASE_ID,packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';
import {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';
import {packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase} from '../scripts/chip-menu-tooltip-packed-contract.mjs';
import {menuItemTokenPackedFixture} from '../scripts/menu-item-token-packed-fixture.mjs';
import {MENU_ITEM_TOKEN_PACKED_PREIMAGES,MENU_ITEM_TOKEN_PACKED_EDITS,reverseMenuItemTokenPackedSource as reverseOldMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';
import {reverseSelectFocusClickPackedSource as reversePreviousSelectFocusClickPackedSource} from '../scripts/select-focus-click-packed-source-requalification.mjs';
import {reverseChipMenuTooltipPackedSource} from '../scripts/chip-menu-tooltip-packed-source-requalification.mjs';
const reverseSelectFocusClickPackedSource=(path,raw,line)=>reversePreviousSelectFocusClickPackedSource(path,reverseChipMenuTooltipPackedSource(path,raw,line),line);
const reverseMenuItemTokenPackedSource=(path,raw,line)=>reverseOldMenuItemTokenPackedSource(path,reverseSelectFocusClickPackedSource(path,raw,line),line);
import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';
import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';
import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';
import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';
import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';
import {allConsumerCaseIds,declarationObservations,declarationKeys,librarySpec,harnessCaseIds,loadExportKeys,writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const read=p=>readFileSync(join(root,p),'utf8'),hash=b=>createHash('sha256').update(b).digest('hex');
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const trueFields=fields=>Object.fromEntries(fields.split(' ').map(field=>[field,true]));
const sample={execution:'packed-angular-testbed-dom',error:null,generations:['legacy','current'].map(generation=>({generation,ancestor_decoy_present:true,
 cycles:[0,1].map(cycle=>({cycle,fresh_instances:true,
 queries:{all:['child-disabled','child-first','first','submenu','wrapped'],direct:['first','submenu','wrapped'],shallow:['first','submenu'],child:['child-disabled','child-first'],sibling:['sibling-item']},
 peer_token_query_count:6,legacy_item_query_count:generation==='legacy'?6:0,
 providers:['child-disabled','child-first','first','sibling-item','submenu','wrapped'].map(kind=>({kind,public_token_is_item:true,owned_instance:generation==='legacy',peer_instance:generation!=='legacy',parent_matches:true})),
 ...trueFields('root_optional_self_null sibling_optional_self_null submenu_self_item submenu_parent_root submenu_mode initial_closed'),
 opened:trueFields('root_open child_open sibling_closed root_focus_after_down child_focus_after_right root_panel_resolves child_panel_resolves root_controls child_controls distinct_panels child_parent_root root_direct_unchanged generation_structure'),
 back:trueFields('root_open child_closed focus_submenu child_panel_removed child_aria_closed'),
 closed:trueFields('root_closed child_closed root_panel_removed child_panel_removed root_aria_closed focus_root_trigger'),
 sibling:trueFields('sibling_open root_closed child_closed own_panel_resolves own_controls own_query_only'),
 reopened:trueFields('root_open child_open sibling_closed root_panel_resolves child_panel_resolves same_self_item'),
 removed:{items_destroyed:12,subjects_closed:true,known_panels_remaining:0,item_nodes_disconnected:true,remaining_item_tokens:0,remaining_triggers:0}})),
 cleanup:{fixture_destroyed:true,fixture_host_connected:false,known_panels_remaining:0,item_nodes_disconnected:true,own_subscriptions_closed:true}}))};
assert.equal(packedMenuItemTokenCase(sample).result,'pass');
const producerPath='scripts/packed-consumer-aot-smoke.mjs',raw=read(producerPath),sf=ts.createSourceFile(producerPath,raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0);
const source=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='collectAcceptanceCases').getText(sf);
const load=text=>new Function('declarationObservations','declarationKeys','packagedSpec','harnessCaseIds','packedValueAccessorCases','packedTableOnPushCase','packedRadioIdentityCase','packedGeneratedIdentityCase','packedSelectDetachCase','packedMenuItemTokenCase','packedSelectFocusClickCase','packedChipDisabledCase','packedMenuLazyCase','packedTooltipContainerCase',text+';return collectAcceptanceCases;')(
 declarationObservations,declarationKeys,librarySpec,harnessCaseIds,packedValueAccessorCases,packedTableOnPushCase,packedRadioIdentityCase,packedGeneratedIdentityCase,packedSelectDetachCase,packedMenuItemTokenCase,packedSelectFocusClickCase,packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase);
const keys=loadExportKeys(),expected=allConsumerCaseIds(keys);assert.equal(expected.length,106);assert.equal(new Set(expected).size,106);
const observe=(value,fn=load(source))=>{const rows=fn({harness:{status:'ok',result:{menuItemToken:value}}},keys,'/tmp/consumer','/tmp/source').filter(row=>row.case_id===MENU_ITEM_TOKEN_CASE_ID);assert.equal(rows.length,1);return rows[0];};
assert.equal(observe(sample).result,'pass');
let negatives=0;const changeAt=(value,path,fn)=>{let parent=value;for(const key of path.slice(0,-1))parent=parent[key];fn(parent,path.at(-1));};
function controls(value,path=[]){
 if(Array.isArray(value)){
  const copy=structuredClone(sample);changeAt(copy,path,(parent,key)=>parent[key]=parent[key].slice(1));assert.equal(observe(copy).result,'fail','truncated '+path.join('.'));negatives++;
  for(const [index,member]of value.entries())controls(member,[...path,index]);
 }else if(value!==null&&typeof value==='object'){
  for(const [key,member]of Object.entries(value)){
   const copy=structuredClone(sample);changeAt(copy,[...path,key],(parent,key)=>delete parent[key]);assert.equal(observe(copy).result,'fail','missing '+[...path,key].join('.'));negatives++;
   controls(member,[...path,key]);
  }
 }else{
  const copy=structuredClone(sample);changeAt(copy,path,(parent,key)=>parent[key]=typeof value==='boolean'?!value:typeof value==='number'?value+1:typeof value==='string'?'corrupted':'unconfirmed');
  assert.equal(observe(copy).result,'fail','changed '+path.join('.'));negatives++;
 }
}
controls(sample);
for(const absent of [undefined,null,true,[],{},'pass']){assert.equal(observe(absent).result,'fail');negatives++;}
const mutants=[source.replace('packedMenuItemTokenCase(parsed.menuItemToken)','packedMenuItemTokenCase(null)'),
 source.replace('if (caseId === menuItemTokenCase.case_id) return menuItemTokenCase;','if (caseId === menuItemTokenCase.case_id) return {case_id:caseId,result:"pass"};'),
 source.replace('    if (caseId === menuItemTokenCase.case_id) return menuItemTokenCase;','')];
for(const changed of mutants){assert.notEqual(changed,source);assert.throws(()=>{const fn=load(changed);assert.equal(observe(sample,fn).result,'pass');assert.equal(observe(null,fn).result,'fail');});}
const scratch=mkdtempSync(join(tmpdir(),'menu-token-packed-admission-'));
try{for(const name of ['complete','missing','failed']){const runDir=join(scratch,name),out=join(runDir,'evidence/packed-consumer/fixture');mkdirSync(out,{recursive:true});const cases=expected.filter(id=>name!=='missing'||id!==MENU_ITEM_TOKEN_CASE_ID).map(case_id=>({case_id,result:name==='failed'&&case_id===MENU_ITEM_TOKEN_CASE_ID?'fail':'pass'}));const saved=writeAcceptanceReport({checkId:'packed-consumer',request:{binding:{fixture_only:true},invocation:'fixture',runId:'fixture',outputDir:out,runDir,line},cases,expectedIds:expected,library:{sha256:'c'.repeat(64),bytes:1},assertionName:'observations.json',command:['synthetic-menu-token-admission']});assert.equal(saved.passed,name==='complete');}}finally{rmSync(scratch,{recursive:true,force:true});}
const matrix=JSON.parse(read('compatibility/rc/matrices/full-verify.json')),check=matrix.checks.find(row=>row.check_id==='packed-consumer');
for(const branch of ['main','21.x']){const roster=check.acceptance.cases_by_line[branch];if(roster.harness===null)continue;assert.deepEqual(Object.values(roster).flat().sort(),[...expected].sort());}
let sourceNegatives=0;
for(const path of Object.keys(MENU_ITEM_TOKEN_PACKED_PREIMAGES[line].members)){
 const original=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show',MENU_ITEM_TOKEN_PACKED_PREIMAGES[line].commit+':'+path],{cwd:root,encoding:'utf8'});
 assert.equal(reverseMenuItemTokenPackedSource(path,read(path),line),original);assert.throws(()=>reverseMenuItemTokenPackedSource(path,read(path)+'\n',line));sourceNegatives++;
 if(MENU_ITEM_TOKEN_PACKED_EDITS[path])for(const [,after]of MENU_ITEM_TOKEN_PACKED_EDITS[path]){const prior=reverseSelectFocusClickPackedSource(path,read(path),line);assert.ok(prior.includes(after));assert.throws(()=>reverseOldMenuItemTokenPackedSource(path,prior.replace(after,()=>after+'\n// foreign addition'),line));sourceNegatives++;}
}
assert.throws(()=>reverseMenuItemTokenPackedSource('foreign.mjs',raw,line));sourceNegatives++;
assert.throws(()=>reverseMenuItemTokenPackedSource(producerPath,raw,line==='main'?'21.x':'main'));sourceNegatives++;
const fixture=menuItemTokenPackedFixture(),parsed=ts.createSourceFile('menu-item-token-probe.ts',fixture,ts.ScriptTarget.Latest,true);assert.equal(parsed.parseDiagnostics.length,0);
assert.doesNotMatch(fixture,/ɵ|\.next\(|\.emit\(|\._handleKeydown\(/);
for(const subject of ["provide:MatMenuItem,useValue:ANCESTOR_ITEM","key(first._getHostElement(),'ArrowDown',40)","key(subItem._getHostElement(),'ArrowRight',39)","key(childFirst._getHostElement(),'ArrowLeft',37)",'root._allItems','root._directDescendantItems','root.items','node.injector.get(MatMenuItem)===item','fixture.componentInstance.visible=false','fixture.destroy()'])assert.ok(fixture.includes(subject),subject);
assert.ok(raw.indexOf('const menuItemToken=await observePackedMenuItemToken();')<raw.indexOf('const fixture = TestBed.createComponent(HarnessHost);'));
const prior=reverseMenuItemTokenPackedSource('scripts/packed-consumer-evidence.mjs',read('scripts/packed-consumer-evidence.mjs'),line);
const priorSource=ts.createSourceFile('prior-evidence.mjs',prior,ts.ScriptTarget.Latest,true),roster=priorSource.statements.filter(ts.isVariableStatement).flatMap(n=>n.declarationList.declarations).find(n=>n.name.getText(priorSource)==='HARNESS_CASE_IDS').initializer;
assert.ok(ts.isArrayLiteralExpression(roster));const priorIds=roster.elements.map(n=>{assert.ok(ts.isStringLiteral(n));return n.text;});
assert.deepEqual(harnessCaseIds().filter(id=>id!==MENU_ITEM_TOKEN_CASE_ID),priorIds);
const output={schema_version:1,line,role:'Synthetic actual collector/writer controls and exact source reversal only; real packed menu execution pending',derived_cases:106,retained_previous_cases:105,negative_cases:negatives,collector_mutants:mutants.length,writer_cases:3,source_reversal_negative_controls:sourceNegatives,
 producer_sha256:hash(read('tests/menu_item_token_packed_contract_probe.mjs')),source_guard_sha256:hash(read('scripts/menu-item-token-packed-source-requalification.mjs')),packed_producer_sha256:hash(raw),packed_evidence_sha256:hash(read('scripts/packed-consumer-evidence.mjs')),
 fixture_sha256:hash(fixture),contract_sha256:hash(read('scripts/menu-item-token-packed-contract.mjs')),typescript:ts.version,node:process.version,roster_bound:true,actual_packed_menu_or_components_executed:false,native_browser_executed:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(output));
