/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic admission controls only. Does not instantiate or qualify any control. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {VALUE_ACCESSOR_FAMILIES,VALUE_ACCESSOR_CASE_IDS,packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';
import {valueAccessorPackedFixture} from '../scripts/value-accessor-packed-fixture.mjs';
import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';
import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';
import {allConsumerCaseIds,declarationObservations,declarationKeys,librarySpec,harnessCaseIds,loadExportKeys,writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const definitions=[
 ['autocomplete','MatLegacyAutocompleteTrigger','one','two','one',2],
 ['checkbox','MatLegacyCheckbox',true,false,true,1],
 ['selection-list','MatLegacySelectionList',['one'],['two'],['one'],1],
 ['radio','MatLegacyRadioGroup','one','two','one',1],
 ['slide-toggle','MatLegacySlideToggle',true,false,true,1],
 ['slider','MatLegacySlider',2,3,4,1],
];
assert.deepEqual(VALUE_ACCESSOR_FAMILIES,definitions.map(row=>row[0]));
const samples=definitions.map(([family,name,model,user,after,count])=>({
 family,execution:'packed-angular-testbed-dom',target_class:name,error:null,
 registration:{instance_owned:true,exact_prototype:true,directive_is_form_control:true,control_identity:true,accessor_identity:true,owner_occurrences:1,array_length:count},
 model_write:{pristine:true,model,view:model,events:[model]},user_write:{dirty:true,model:user,view:user,events:[model,user]},
 touch:{before:false,after:true,events:[model,user]},disabled:{control:true,view:true},reenabled:{control:false,view:false,value:user},
 destroy:{fixture_destroyed:true,retained_before:user,retained_after:user,model:after},
}));
const raw=readFileSync(join(root,'scripts/packed-consumer-aot-smoke.mjs'),'utf8'),file=ts.createSourceFile('packed-consumer.mjs',raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.equal(file.parseDiagnostics.length,0);
const node=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='collectAcceptanceCases');assert.ok(node);
const source=node.getText(file),keys=loadExportKeys(),expected=allConsumerCaseIds(keys),manifest=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json')));
const line=manifest.version.startsWith('21.')?'21.x':'main';assert.equal(expected.length,103);
const load=text=>new Function('declarationObservations','declarationKeys','packagedSpec','harnessCaseIds','packedValueAccessorCases','packedTableOnPushCase','packedRadioIdentityCase',text+';return collectAcceptanceCases;')
 (declarationObservations,declarationKeys,librarySpec,harnessCaseIds,packedValueAccessorCases,packedTableOnPushCase,packedRadioIdentityCase);
const collect=load(source),observations=rows=>collect({harness:{status:'ok',result:{valueAccessorRegistration:rows}}},keys,'/tmp/consumer','/tmp/source')
 .filter(row=>VALUE_ACCESSOR_CASE_IDS.includes(row.case_id));
assert.deepEqual(observations(samples).map(row=>row.result),Array(6).fill('pass'));
assert.deepEqual(observations(samples).map(row=>row.case_id),VALUE_ACCESSOR_CASE_IDS);
let roster;
function visit(value){if(!value||typeof value!=='object')return;if(value.check_id==='packed-consumer')roster=value.acceptance.cases_by_line[line];for(const child of Object.values(value))if(typeof child==='object')visit(child);}
visit(JSON.parse(readFileSync(join(root,'compatibility/rc/matrices/full-verify.json'))));
assert.deepEqual(Object.values(roster).flat().sort(),[...expected].sort());
const controls=[
 ['wrong-execution-subject',row=>row.execution='workspace-projection'],
 ['wrong-owned-class',row=>row.target_class='SyntheticAccessor'],
 ['wrong-target-prototype',row=>row.registration.exact_prototype=false],
 ['selected-other-accessor',row=>row.registration.accessor_identity=false],
 ['wrong-control-directive',row=>row.registration.directive_is_form_control=false],
 ['unrelated-form-control',row=>row.registration.control_identity=false],
 ['missing-multi-alias',row=>row.registration.owner_occurrences=0],
 ['duplicate-multi-alias',row=>row.registration.owner_occurrences=2],
 ['wrong-multi-array',row=>row.registration.array_length=0],
 ['model-write-not-reflected',row=>row.model_write.view='wrong'],
 ['model-write-echo',row=>row.model_write.events.push(row.model_write.model)],
 ['user-change-not-reflected',row=>row.user_write.model='wrong'],
 ['user-change-no-callback',row=>row.user_write.events=[]],
 ['user-change-duplicate-callback',row=>row.user_write.events.push(row.user_write.model)],
 ['missing-dirty-propagation',row=>row.user_write.dirty=false],
 ['touch-not-propagated',row=>row.touch.after=false],
 ['already-touched-without-blur',row=>row.touch.before=true],
 ['disabled-view-not-updated',row=>row.disabled.view=false],
 ['reenable-view-not-updated',row=>row.reenabled.view=true],
 ['reenable-drops-value',row=>row.reenabled.value='wrong'],
 ['fixture-not-destroyed',row=>row.destroy.fixture_destroyed=false],
 ['callback-still-connected-after-destroy',row=>row.destroy.retained_after='wrong'],
 ['destroy-control-did-not-update',row=>row.destroy.model='wrong'],
 ['missing-retained-state',row=>delete row.destroy.retained_before],
 ['child-error',row=>row.error='injected actual-child failure marker'],
];
let negativeCases=0;
for(let index=0;index<samples.length;index++)for(const [id,mutate] of controls){
 const changed=structuredClone(samples);mutate(changed[index]);
 const rows=observations(changed);assert.equal(rows[index].result,'fail',samples[index].family+':'+id);
 assert.equal(rows.filter(row=>row.result==='fail').length,1);negativeCases++;
}
for(const rows of [undefined,[],true,'true',samples.slice(1),[...samples,samples[0]],[...samples,{family:'foreign'}]]){
 assert.ok(observations(rows).every(row=>row.result==='fail'),'missing/foreign/duplicate population must not pass');negativeCases++;
}
const mutants=[source.replace('packedValueAccessorCases(parsed.valueAccessorRegistration)','packedValueAccessorCases([])'),
 source.replace('if (valueAccessorCases.has(caseId)) return valueAccessorCases.get(caseId);','if (valueAccessorCases.has(caseId)) return {case_id:caseId,result:"pass"};')];
for(const mutant of mutants){assert.notEqual(mutant,source);const fn=load(mutant);
 const broken=structuredClone(samples);broken[0].registration.accessor_identity=false;
 assert.throws(()=>{const good=fn({harness:{result:{valueAccessorRegistration:samples}}},keys,'/tmp/c','/tmp/r').filter(r=>VALUE_ACCESSOR_CASE_IDS.includes(r.case_id));assert.ok(good.every(r=>r.result==='pass'));
  const bad=fn({harness:{result:{valueAccessorRegistration:broken}}},keys,'/tmp/c','/tmp/r').find(r=>r.case_id===VALUE_ACCESSOR_CASE_IDS[0]);assert.equal(bad.result,'fail');});
}
const scratch=mkdtempSync(join(tmpdir(),'cva-packed-admission-'));
try {for(const name of ['complete','missing','failed']){
 const runDir=join(scratch,name),output=join(runDir,'evidence/packed-consumer/fixture');mkdirSync(output,{recursive:true});
 const cases=expected.filter(id=>name!=='missing'||id!==VALUE_ACCESSOR_CASE_IDS[0]).map(case_id=>({case_id,result:name==='failed'&&case_id===VALUE_ACCESSOR_CASE_IDS[0]?'fail':'pass'}));
 const saved=writeAcceptanceReport({checkId:'packed-consumer',request:{binding:{fixture_only:true},invocation:'fixture',runId:'fixture',outputDir:output,runDir,line},cases,expectedIds:expected,library:{sha256:'c'.repeat(64),bytes:1},assertionName:'observations.json',command:['synthetic-CVA-admission-controller']});
 assert.equal(saved.passed,name==='complete');
 }}finally{rmSync(scratch,{recursive:true,force:true});}
const generated=valueAccessorPackedFixture(),fixture=ts.createSourceFile('value-accessor-probe.ts',generated,ts.ScriptTarget.Latest,true);
assert.equal(fixture.parseDiagnostics.length,0);assert.ok(generated.includes('directive.valueAccessor===instance'));assert.ok(generated.includes('fixture.destroy();await teardownTick()'));
assert.ok(raw.includes("writeFileSync(join(consumer, 'src/value-accessor-probe.ts'), valueAccessorPackedFixture())"));
assert.ok(raw.includes('valueAccessorRegistration:valueAccessors.rows'));assert.ok(raw.includes('&& valueAccessors.okay && engineFreeAnimationPolicy'));
const result={schema_version:1,line,role:'Synthetic CVA contract/actual collector/writer controls and generated fixture syntax; no actual control execution',families:6,derived_cases:expected.length,negative_cases:negativeCases,collector_mutants:mutants.length,writer_cases:3,fixture_sha256:createHash('sha256').update(generated).digest('hex'),roster_bound:true,actual_packed_control_instances_executed:false,native_browser_executed:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
