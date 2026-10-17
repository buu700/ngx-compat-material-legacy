/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {packedLegacyBidiScopeCase} from '../scripts/bidi-isolated-packed-contract.mjs';
import {packedSelectionComparatorCase} from '../scripts/selection-comparator-packed-contract.mjs';
import {packedNativeDateConstructorCase,packedNativeDateProviderCase} from '../scripts/native-date-packed-contract.mjs';
/** Synthetic admission controls. Real extracted-artifact component execution is separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {GENERATED_IDENTITY_CASE_ID, GENERATED_IDENTITY_ROLE_COUNTS, packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';
import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';
import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';
import {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';
import {packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase} from '../scripts/chip-menu-tooltip-packed-contract.mjs';
import {generatedIdentityPackedFixture} from '../scripts/generated-identity-packed-fixture.mjs';
import {GENERATED_IDENTITY_PACKED_PREIMAGES, GENERATED_IDENTITY_PACKED_EDITS, reverseGeneratedIdentityPackedSource as reverseOldGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';
import {reverseSelectDetachPackedSource as reverseOldSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';
import {reverseMenuItemTokenPackedSource as reverseOldMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';
import {reverseSelectFocusClickPackedSource as reversePreviousSelectFocusClickPackedSource} from '../scripts/select-focus-click-packed-source-requalification.mjs';
import {reverseChipMenuTooltipPackedSource} from '../scripts/chip-menu-tooltip-packed-source-requalification.mjs';
const reverseSelectFocusClickPackedSource=(path,raw,line)=>reversePreviousSelectFocusClickPackedSource(path,reverseChipMenuTooltipPackedSource(path,raw,line),line);
const reverseMenuItemTokenPackedSource=(path,raw,line)=>reverseOldMenuItemTokenPackedSource(path,reverseSelectFocusClickPackedSource(path,raw,line),line);
const reverseSelectDetachPackedSource=(path,raw,line)=>reverseOldSelectDetachPackedSource(path,reverseMenuItemTokenPackedSource(path,raw,line),line);
const reverseGeneratedIdentityPackedSource=(path,raw,line)=>reverseOldGeneratedIdentityPackedSource(path,reverseSelectDetachPackedSource(path,raw,line),line);
import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';
import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';
import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';
import {allConsumerCaseIds, declarationObservations, declarationKeys, librarySpec, harnessCaseIds, loadExportKeys, writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const read = path => readFileSync(join(root, path), 'utf8'), hash = raw => createHash('sha256').update(raw).digest('hex');
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
const counts = {option:1, 'optgroup-label':1, autocomplete:1, select:2, 'select-value':2, 'select-panel':2,
  'active-option':3, 'menu-panel':1, 'snack-live':1, 'tab-link':1, 'tab-panel':1};
assert.deepEqual(GENERATED_IDENTITY_ROLE_COUNTS, counts);
const structure = ['option_text','group_label','autocomplete_panel','select_trigger','select_value','select_panel_wrap','menu_panel','menu_content','tab_link','tab_panel','snack_container'];
function makeOrder(first) {
  const names = first === 'legacy' ? ['legacy','current'] : ['current','legacy'];
  const id = (generation, role, index = 0) => {
    if (role === 'select-panel') return id(generation, 'select', index) + '-panel';
    const prefix = {option:'mat-option-', 'active-option':'mat-option-', 'optgroup-label':'mat-optgroup-label-',
      autocomplete:'mat-autocomplete-', select:'mat-select-', 'select-value':'mat-select-value-',
      'menu-panel':'mat-menu-panel-', 'snack-live':'mat-snack-bar-container-live-', 'tab-link':'mat-tab-link-', 'tab-panel':'mat-tab-nav-panel-'}[role];
    return (role==='snack-live'&&generation==='legacy'?'mat-legacy-snack-bar-container-live-':prefix) + (role === 'active-option' ? index + 10 : index) + (generation === 'legacy'&&role!=='snack-live' ? '-legacy' : '');
  };
  const edge = (generation, name, attribute, value) => ({generation,name,attribute,value,target_id:value,target_count:1,exact_target:true});
  return {order:first+'-first', creation_order:names, scopes_separate:true, duplicate_id_snapshots:[],
    nodes:names.flatMap(generation => Object.entries(counts).flatMap(([role, count]) => Array.from({length:count}, (_,index) =>
      ({generation,role,index,id:id(generation,role,index),resolution_count:1,exact_node:true,owner_matches:true})))),
    generations:names.map(generation => ({generation,public_instances:true,option_explicit_id:`packed-${generation}-option-explicit`,option_explicit_resolves:true,
      group_label:`Standalone ${generation}`,snack_panel_class:true,legacy_structure:generation==='legacy'?Object.fromEntries(structure.map(key=>[key,true])):{}})),
    default_edges:names.flatMap(generation => [
      edge(generation,'group-label','aria-labelledby',id(generation,'optgroup-label')),
      edge(generation,'autocomplete-panel',generation==='legacy'?'aria-owns':'aria-controls',id(generation,'autocomplete')),
      edge(generation,'autocomplete-active','aria-activedescendant',id(generation,'active-option',0)),
      ...[0,1].flatMap(index => [edge(generation,`select-${index}-panel`,'aria-controls',id(generation,'select-panel',index)),
        edge(generation,`select-${index}-active`,'aria-activedescendant',id(generation,'active-option',index+1))]),
      edge(generation,'menu-panel','aria-controls',id(generation,'menu-panel')),
      edge(generation,'tab-panel','aria-controls',id(generation,'tab-panel')),
      edge(generation,'tab-label','aria-labelledby',id(generation,'tab-link')),
    ]),
    changed_tab_edges:names.flatMap(generation => [edge(generation,'tab-panel','aria-controls',id(generation,'tab-panel')),
      edge(generation,'tab-label','aria-labelledby',`packed-${generation}-tab-explicit`)]),
    explicit:names.map(generation => ({generation,ids:Object.fromEntries(['autocomplete','select','tab-panel','tab-link'].map(role=>[role,`packed-${generation}-${role}-override`])),
      select_value_id:id(generation,'select-value',0),option_id:`packed-${generation}-option-explicit`,values_resolve:true})),
    explicit_edges:names.flatMap(generation => [edge(generation,'autocomplete-panel',generation==='legacy'?'aria-owns':'aria-controls',`packed-${generation}-autocomplete-override`),
      edge(generation,'select-0-panel','aria-controls',`packed-${generation}-select-override-panel`),
      edge(generation,'tab-panel','aria-controls',`packed-${generation}-tab-panel-override`),
      edge(generation,'tab-label','aria-labelledby',`packed-${generation}-tab-link-override`)]),
    snack_lifecycle:['opened','first-dismissed','both-dismissed'].map((stage,index)=>({stage,modal_owns:['packed-identity-preserved',...names.slice(index).map(generation=>id(generation,'snack-live'))],
      live_present:names.map((_,i)=>i>=index),all_references_resolve:true})),
    cleanup:{fixtures_destroyed:2,modal_disposed:true,retained_target_count:0,overlay_target_count:0}};
}
const sample = {execution:'packed-angular-testbed-dom',error:null,orders:[makeOrder('legacy'),makeOrder('current')]};
assert.equal(packedGeneratedIdentityCase(sample).result, 'pass');
const producerPath = 'scripts/packed-consumer-aot-smoke.mjs', raw = read(producerPath);
const sf = ts.createSourceFile(producerPath, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(sf.parseDiagnostics.length,0);
const source = sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='collectAcceptanceCases').getText(sf);
const load = text => new Function('declarationObservations','declarationKeys','packagedSpec','harnessCaseIds','packedValueAccessorCases','packedTableOnPushCase','packedRadioIdentityCase','packedGeneratedIdentityCase','packedSelectDetachCase','packedMenuItemTokenCase','packedSelectFocusClickCase','packedChipDisabledCase','packedMenuLazyCase','packedTooltipContainerCase','packedLegacyBidiScopeCase', 'packedSelectionComparatorCase', 'packedNativeDateConstructorCase', 'packedNativeDateProviderCase',text+';return collectAcceptanceCases;')(
  declarationObservations,declarationKeys,librarySpec,harnessCaseIds,packedValueAccessorCases,packedTableOnPushCase,packedRadioIdentityCase,packedGeneratedIdentityCase,packedSelectDetachCase,packedMenuItemTokenCase,packedSelectFocusClickCase,packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase,packedLegacyBidiScopeCase, packedSelectionComparatorCase,packedNativeDateConstructorCase,packedNativeDateProviderCase);
const keys = loadExportKeys(), expected = allConsumerCaseIds(keys);
assert.equal(expected.length,106); assert.equal(new Set(expected).size,106);
const observe = (value, fn=load(source)) => {
  const rows = fn({harness:{status:'ok',result:{generatedIdentity:value}}},keys,'/tmp/consumer','/tmp/source').filter(r=>r.case_id===GENERATED_IDENTITY_CASE_ID);
  assert.equal(rows.length,1); return rows[0];
};
assert.equal(observe(sample).result,'pass');
const mutations = [o=>o.execution='workspace-projection',o=>o.error='failed',o=>o.orders.pop(),o=>o.orders.reverse()];
for (let order=0;order<2;order++) {
  const change = fn => mutations.push(o=>fn(o.orders[order]));
  change(o=>o.order='wrong'); change(o=>o.creation_order.reverse()); change(o=>o.scopes_separate=false);
  change(o=>o.duplicate_id_snapshots.push('duplicate')); change(o=>o.nodes.pop()); change(o=>o.nodes.push(o.nodes[0]));
  change(o=>{const node=o.nodes.find(n=>n.generation==='legacy'&&n.role==='snack-live'),prior=node.id;node.id='mat-snack-bar-container-live-0-legacy';for(const stage of o.snack_lifecycle)stage.modal_owns=stage.modal_owns.map(id=>id===prior?node.id:id);});
  for (let row=0;row<32;row++) for (const [key,value] of [['id','wrong'],['generation','wrong'],['role','wrong'],['index',50],['resolution_count',0],['resolution_count',2],['exact_node',false],['owner_matches',false]]) change(o=>o.nodes[row][key]=value);
  for (let generation=0;generation<2;generation++) {
    for(const key of ['public_instances','option_explicit_resolves','snack_panel_class']) change(o=>o.generations[generation][key]=false);
    for(const key of ['option_explicit_id','group_label']) change(o=>o.generations[generation][key]='wrong');
    for(const role of ['autocomplete','select','tab-panel','tab-link']) change(o=>o.explicit[generation].ids[role]='wrong');
    for(const key of ['select_value_id','option_id']) change(o=>o.explicit[generation][key]='wrong');
    change(o=>o.explicit[generation].values_resolve=false);
  }
  const legacy=sample.orders[order].generations.findIndex(row=>row.generation==='legacy');
  for(const key of structure) change(o=>o.generations[legacy].legacy_structure[key]=false);
  for(const array of ['default_edges','changed_tab_edges','explicit_edges']) {
    change(o=>o[array].pop()); change(o=>o[array].push(o[array][0]));
    for(let row=0;row<sample.orders[order][array].length;row++) for(const [key,value] of [['generation','wrong'],['name','wrong'],['attribute','aria-hidden'],['value','wrong-target'],['target_id','wrong-target'],['target_count',0],['target_count',2],['exact_target',false]]) change(o=>o[array][row][key]=value);
  }
  for(let index=0;index<3;index++) {
    change(o=>o.snack_lifecycle[index].stage='wrong'); change(o=>o.snack_lifecycle[index].modal_owns=[]);
    change(o=>o.snack_lifecycle[index].modal_owns.push('peer-duplicate')); change(o=>o.snack_lifecycle[index].live_present[0]=!o.snack_lifecycle[index].live_present[0]);
    change(o=>o.snack_lifecycle[index].all_references_resolve=false);
  }
  change(o=>o.snack_lifecycle.pop()); change(o=>o.explicit.pop()); change(o=>o.generations.pop());
  for(const [key,value] of [['fixtures_destroyed',1],['modal_disposed',false],['retained_target_count',1],['overlay_target_count',1]]) change(o=>o.cleanup[key]=value);
}
let negatives=0;
for(const mutate of mutations){const changed=structuredClone(sample);mutate(changed);assert.equal(observe(changed).result,'fail');negatives++;}
for(const absent of [undefined,null,true,[],{},'pass']){assert.equal(observe(absent).result,'fail');negatives++;}
const mutants = [source.replace('packedGeneratedIdentityCase(parsed.generatedIdentity)','packedGeneratedIdentityCase(null)'),
  source.replace('if (caseId === generatedIdentityCase.case_id) return generatedIdentityCase;','if (caseId === generatedIdentityCase.case_id) return {case_id:caseId,result:"pass"};'),
  source.replace('    if (caseId === generatedIdentityCase.case_id) return generatedIdentityCase;','')];
for(const changed of mutants){assert.notEqual(changed,source);assert.throws(()=>{const fn=load(changed);assert.equal(observe(sample,fn).result,'pass');assert.equal(observe(null,fn).result,'fail');});}
const scratch=mkdtempSync(join(tmpdir(),'generated-identity-packed-admission-'));
try{for(const name of ['complete','missing','failed']){const runDir=join(scratch,name),out=join(runDir,'evidence/packed-consumer/fixture');mkdirSync(out,{recursive:true});const cases=expected.filter(id=>name!=='missing'||id!==GENERATED_IDENTITY_CASE_ID).map(case_id=>({case_id,result:name==='failed'&&case_id===GENERATED_IDENTITY_CASE_ID?'fail':'pass'}));const saved=writeAcceptanceReport({checkId:'packed-consumer',request:{binding:{fixture_only:true},invocation:'fixture',runId:'fixture',outputDir:out,runDir,line},cases,expectedIds:expected,library:{sha256:'c'.repeat(64),bytes:1},assertionName:'observations.json',command:['synthetic-generated-identity-admission']});assert.equal(saved.passed,name==='complete');}}finally{rmSync(scratch,{recursive:true,force:true});}
const matrix=JSON.parse(read('compatibility/rc/matrices/full-verify.json')),check=matrix.checks.find(row=>row.check_id==='packed-consumer');
for(const branch of ['main','21.x']){const roster=check.acceptance.cases_by_line[branch];if(roster.harness===null)continue;assert.deepEqual(Object.values(roster).flat().sort(),[...expected].sort());}
let sourceNegatives=0;
for(const path of Object.keys(GENERATED_IDENTITY_PACKED_PREIMAGES[line].members)){
  const original=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show',GENERATED_IDENTITY_PACKED_PREIMAGES[line].commit+':'+path],{cwd:root,encoding:'utf8'});
  assert.equal(reverseGeneratedIdentityPackedSource(path,read(path),line),original);
  assert.throws(()=>reverseGeneratedIdentityPackedSource(path,read(path)+'\n',line));sourceNegatives++;
  if(GENERATED_IDENTITY_PACKED_EDITS[path])for(const [,after] of GENERATED_IDENTITY_PACKED_EDITS[path]){const prior=reverseSelectDetachPackedSource(path,read(path),line);assert.ok(prior.includes(after));assert.throws(()=>reverseOldGeneratedIdentityPackedSource(path,prior.replace(after,()=>after+'\n// mutated addition'),line));sourceNegatives++;}
}
assert.throws(()=>reverseGeneratedIdentityPackedSource('foreign.mjs',raw,line));sourceNegatives++;
assert.throws(()=>reverseGeneratedIdentityPackedSource(producerPath,raw,line==='main'?'21.x':'main'));sourceNegatives++;
const fixture=generatedIdentityPackedFixture(),parsed=ts.createSourceFile('generated-identity-probe.ts',fixture,ts.ScriptTarget.Latest,true);
assert.equal(parsed.parseDiagnostics.length,0);assert.doesNotMatch(fixture,/ɵ|_IdGenerator|provide:\s*MatOption|\.ngOnDestroy\(/);
assert.ok(fixture.includes('split(/\\s+/)'));assert.ok(fixture.includes('fixture.destroy()'));assert.doesNotMatch(fixture,/once\(ref\.afterOpened\(\)\)/);
assert.ok(raw.indexOf('const generatedIdentity=await observePackedGeneratedIdentity();')<raw.indexOf('const fixture = TestBed.createComponent(HarnessHost);'));
const output={schema_version:1,line,role:'Synthetic actual collector/writer controls and whole source reversals; no actual packed component execution',derived_cases:106,retained_previous_cases:103,negative_cases:negatives,collector_mutants:mutants.length,writer_cases:3,source_reversal_negative_controls:sourceNegatives,producer_sha256:hash(read('tests/generated_identity_packed_contract_probe.mjs')),source_guard_sha256:hash(read('scripts/generated-identity-packed-source-requalification.mjs')),packed_producer_sha256:hash(raw),packed_evidence_sha256:hash(read('scripts/packed-consumer-evidence.mjs')),fixture_sha256:hash(fixture),contract_sha256:hash(read('scripts/generated-identity-packed-contract.mjs')),typescript:ts.version,node:process.version,roster_bound:true,actual_packed_generated_identity_executed:false,native_browser_executed:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(output));
