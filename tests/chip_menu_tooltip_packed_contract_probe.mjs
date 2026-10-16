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
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {chipMenuTooltipPackedSamples as samples} from './chip_menu_tooltip_packed_samples.mjs';
import {packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase} from '../scripts/chip-menu-tooltip-packed-contract.mjs';
import {reverseChipMenuTooltipPackedSource} from '../scripts/chip-menu-tooltip-packed-source-requalification.mjs';
import {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';
import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';
import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';
import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';
import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';
import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';
import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';
import {allConsumerCaseIds,declarationObservations,declarationKeys,librarySpec,harnessCaseIds,loadExportKeys,writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p),'utf8');
const ts=createRequire(import.meta.url)('typescript'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const path='scripts/packed-consumer-aot-smoke.mjs',raw=read(path),file=ts.createSourceFile(path,raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.equal(file.parseDiagnostics.length,0);const source=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='collectAcceptanceCases').getText(file);
const dependencies={declarationObservations,declarationKeys,packagedSpec:librarySpec,harnessCaseIds,packedValueAccessorCases,packedTableOnPushCase,
 packedRadioIdentityCase,packedGeneratedIdentityCase,packedSelectDetachCase,packedMenuItemTokenCase,packedSelectFocusClickCase,
 packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase};
const load=text=>new Function(...Object.keys(dependencies),text+';return collectAcceptanceCases;')(...Object.values(dependencies));
const collect=load(source),keys=loadExportKeys(),expected=allConsumerCaseIds(keys);assert.equal(expected.length,106);assert.equal(new Set(expected).size,106);
const profiles={chip:{field:'chipDisabledObservation',legacy:'chipDisabledIsolation',evaluate:packedChipDisabledCase},
 menu:{field:'menuLazyObservation',legacy:'lazyMenuLifecycle',evaluate:packedMenuLazyCase},
 tooltip:{field:'tooltipContainerObservation',legacy:'tooltipOriginalEagerDependencies',evaluate:packedTooltipContainerCase}};
const controls=[],collectorMutants=[],writerControls=[];
for(const [name,{field,legacy,evaluate}]of Object.entries(profiles)){
 const sample=samples[name],id=evaluate(sample).case_id;assert.equal(evaluate(sample).result,'pass');
 const observe=(data,...options)=>{const old=options.length?options[0]:true,fn=options[1]||collect;const rows=fn({harness:{status:'ok',result:{[field]:data,[legacy]:old}}},keys,'/tmp/consumer','/tmp/source').filter(row=>row.case_id===id);assert.equal(rows.length,1);return rows[0];};
 const good=observe(sample);assert.equal(good.result,'pass');assert.equal(good.legacy_harness_passed,true);assert.deepEqual(good.observation,sample);
 const set=(value,path,change)=>{let parent=value;for(const k of path.slice(0,-1))parent=parent[k];change(parent,path.at(-1));};
 function inspect(value,path=[]){
  if(Array.isArray(value)){
   const bad=structuredClone(sample);set(bad,path,(p,k)=>p[k]=p[k].slice(1));assert.equal(observe(bad).result,'fail',name+': array '+path.join('.'));controls.push({contract:name,kind:'array',path:path.join('.')});
   value.forEach((v,i)=>inspect(v,[...path,i]));
  }else if(value!==null&&typeof value==='object'){
   for(const [k,v]of Object.entries(value)){
    const bad=structuredClone(sample);set(bad,[...path,k],(p,k)=>delete p[k]);assert.equal(observe(bad).result,'fail',name+': missing '+[...path,k].join('.'));controls.push({contract:name,kind:'missing',path:[...path,k].join('.')});inspect(v,[...path,k]);
   }
  }else{
   const bad=structuredClone(sample);set(bad,path,(p,k)=>p[k]=typeof value==='boolean'?!value:typeof value==='number'?value+1:typeof value==='string'?'corrupted':'unknown');
   assert.equal(observe(bad).result,'fail',name+': changed '+path.join('.'));controls.push({contract:name,kind:'changed',path:path.join('.')});
  }
 }
 inspect(sample);
 for(const absent of [undefined,null,true,[],{},'pass']){assert.equal(observe(absent).result,'fail');controls.push({contract:name,kind:'absent-observation'});}
 for(const bad of [false,undefined,0,1,'true']){assert.equal(observe(sample,bad).result,'fail');controls.push({contract:name,kind:'legacy-boolean'});}
 for(const [mutant,from,to]of [
  ['unconditional-pass',"const ok = harnessMap[caseId] === true && row.result === 'pass';",'const ok = true;'],
  ['ignore-observation',"const ok = harnessMap[caseId] === true && row.result === 'pass';",'const ok = harnessMap[caseId] === true;'],
  ['ignore-legacy-check',"const ok = harnessMap[caseId] === true && row.result === 'pass';","const ok = row.result === 'pass';"],
  ['omit-detailed-case','    if (detailedBehaviorCases.has(caseId)) {','    if (false) {'],
 ]){
  assert.equal(source.split(from).length,2);const fn=load(source.replace(from,to));
  assert.throws(()=>{assert.equal(observe(sample,true,fn).result,'pass');assert.equal(observe(null,true,fn).result,'fail');assert.equal(observe(sample,false,fn).result,'fail');});collectorMutants.push({contract:name,mutant,rejected:true});
 }
 const scratch=mkdtempSync(join(tmpdir(),'chip-menu-tooltip-writer-'));
 try{for(const outcome of ['complete','missing','failed']){
  const runDir=join(scratch,outcome),outputDir=join(runDir,'evidence/packed-consumer/fixture');mkdirSync(outputDir,{recursive:true});
  const cases=expected.filter(row=>outcome!=='missing'||row!==id).map(case_id=>({case_id,result:outcome==='failed'&&case_id===id?'fail':'pass'}));
  const result=writeAcceptanceReport({checkId:'packed-consumer',request:{binding:{fixture_only:true},invocation:'fixture',runId:'fixture',outputDir,runDir,line},cases,expectedIds:expected,library:{sha256:'c'.repeat(64),bytes:1},assertionName:'observations.json',command:['synthetic-chip-menu-tooltip-admission']});
  assert.equal(result.passed,outcome==='complete');writerControls.push({contract:name,outcome,admitted:result.passed});
 }}finally{rmSync(scratch,{recursive:true,force:true});}
}
const capsule=JSON.parse(read('compatibility/rc/chip-menu-tooltip-packed-source-inputs.json'));let sourceControls=0;
for(const member of capsule.members){
 const before=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show',(member.guard_source_commit||capsule.source_parent)+':'+member.path],{cwd:root,encoding:'utf8'});
 assert.equal(reverseChipMenuTooltipPackedSource(member.path,read(member.path),line),before);
 assert.throws(()=>reverseChipMenuTooltipPackedSource(member.path,read(member.path)+'\n',line));sourceControls++;
}
assert.throws(()=>reverseChipMenuTooltipPackedSource('foreign.mjs',raw,line));sourceControls++;
assert.throws(()=>reverseChipMenuTooltipPackedSource(path,raw,line==='main'?'21.x':'main'));sourceControls++;
for(const member of ['compatibility/rc/chip-menu-tooltip-packed-source-inputs.json',capsule.preimages.path]){
 assert.throws(()=>reverseChipMenuTooltipPackedSource(path,raw,line,{readMember:p=>p===member?Buffer.from(readFileSync(join(root,p)).toString()+' '):readFileSync(join(root,p))}));sourceControls++;
}
// Parse the actual generated TypeScript, including the new observations, without building/installing peers.
const writes=[];
function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='writeFileSync'&&node.arguments.length>=2&&(ts.isTemplateExpression(node.arguments[1])||ts.isNoSubstitutionTemplateLiteral(node.arguments[1])))writes.push(node.arguments[1]);ts.forEachChild(node,visit);}visit(file);
const harness=writes.find(n=>n.getText(file).includes('class HarnessHost'));
assert.ok(harness);assert.ok(ts.isNoSubstitutionTemplateLiteral(harness),'harness interpolation needs explicit evaluation');
const generated=harness.text,generatedFile=ts.createSourceFile('packed-harness.ts',generated,ts.ScriptTarget.Latest,true);
assert.equal(generatedFile.parseDiagnostics.length,0);
for(const fragment of ['menuSnapshot(\'transfer-after\')','portal.viewContainerRef===eagerTipContainer','templateListNode.injector.get(NgModel).valueAccessor===templateList',"chipSnapshot('form-disabled')",'detailedPackedBehaviorsOkay && text'])assert.ok(generated.includes(fragment),fragment);
const matrix=JSON.parse(read('compatibility/rc/matrices/full-verify.json')),check=matrix.checks.find(row=>row.check_id==='packed-consumer');
assert.deepEqual(Object.values(check.acceptance.cases_by_line[line]).flat().sort(),[...expected].sort());
const output={schema_version:1,line,role:'Synthetic actual collector/writer and source-reversal diagnostics; no product, packed AOT, native or floor execution',
 strengthened_existing_cases:3,retained_case_ids:106,observation_corruption_controls:controls.length,collector_mutants_rejected:collectorMutants.length,
 writer_controls:writerControls.length,source_controls:sourceControls,controls,collector_mutants:collectorMutants,
 producer_sha256:hash(read('tests/chip_menu_tooltip_packed_contract_probe.mjs')),packed_producer_sha256:hash(raw),
 contract_sha256:hash(read('scripts/chip-menu-tooltip-packed-contract.mjs')),source_guard_sha256:hash(read('scripts/chip-menu-tooltip-packed-source-requalification.mjs')),
 actual_packed_or_native_or_floor_executed:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line,retained_case_ids:106,controls:controls.length,collector_mutants:collectorMutants.length,writer_controls:writerControls.length,source_controls:sourceControls}));
