/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual collector/writer and generated-child controls with synthetic inputs; no packed execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {packedNativeDateConstructorCase,packedNativeDateProviderCase} from '../scripts/native-date-packed-contract.mjs';
import {packedSelectionComparatorCase} from '../scripts/selection-comparator-packed-contract.mjs';
import {packedLegacyBidiScopeCase} from '../scripts/bidi-isolated-packed-contract.mjs';
import {packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase} from '../scripts/chip-menu-tooltip-packed-contract.mjs';
import {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';
import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';
import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';
import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';
import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';
import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';
import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';
import {allConsumerCaseIds,declarationObservations,declarationKeys,librarySpec,harnessCaseIds,loadExportKeys,writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';
import {nativeDatePackedSample} from './native_date_packed_sample.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
const ts=createRequire(import.meta.url)('typescript'),hash=value=>createHash('sha256').update(value).digest('hex');
const path='scripts/packed-consumer-aot-smoke.mjs',raw=read(path).toString(),file=ts.createSourceFile(path,raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.equal(file.parseDiagnostics.length,0);
const node=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='collectAcceptanceCases');assert.ok(node);
const collectorText=node.getText(file),dependencies={declarationObservations,declarationKeys,packagedSpec:librarySpec,harnessCaseIds,
 packedValueAccessorCases,packedTableOnPushCase,packedRadioIdentityCase,packedGeneratedIdentityCase,packedSelectDetachCase,packedMenuItemTokenCase,
 packedSelectFocusClickCase,packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase,packedLegacyBidiScopeCase,packedSelectionComparatorCase,
 packedNativeDateConstructorCase,packedNativeDateProviderCase};
const load=text=>new Function(...Object.keys(dependencies),text+';return collectAcceptanceCases;')(...Object.values(dependencies));
const collector=load(collectorText),keys=loadExportKeys(),expected=allConsumerCaseIds(keys),sample=nativeDatePackedSample();
assert.equal(expected.length,106);assert.equal(new Set(expected).size,106);
const profiles=[{kind:'constructor',field:'nativeDateConstructorObservation',legacy:'nativeDateConstructor',evaluate:packedNativeDateConstructorCase},
 {kind:'provider',field:'nativeDateProviderObservation',legacy:'nativeDateProvider',evaluate:packedNativeDateProviderCase}];
const observe=(profile,value,legacy=true,fn=collector)=>{
 const rows=fn({harness:{status:'ok',result:{[profile.field]:value,[profile.legacy]:legacy}}},keys,'/tmp/consumer','/tmp/source');
 assert.deepEqual(rows.map(row=>row.case_id).sort(),[...expected].sort());
 const matches=rows.filter(row=>row.case_id===profile.evaluate(sample[profile.kind]).case_id);assert.equal(matches.length,1);return matches[0];
};
function leaves(value,path=[]){return value!==null&&typeof value==='object'?Object.entries(value).flatMap(([key,child])=>leaves(child,[...path,key])):[path];}
let corruptions=0,collectorMutants=0,writerCases=0;
for(const profile of profiles){
 const complete=sample[profile.kind],id=profile.evaluate(complete).case_id;assert.equal(expected.filter(value=>value===id).length,1);
 const good=observe(profile,complete);assert.equal(good.result,'pass');assert.equal(good.legacy_harness_passed,true);assert.deepEqual(good.observation,complete);
 for(const value of [undefined,null,true,[],{},'pass']){assert.equal(observe(profile,value).result,'fail');corruptions++;}
 for(const leaf of leaves(complete))for(const remove of [false,true]){
  const value=structuredClone(complete),parent=leaf.slice(0,-1).reduce((o,key)=>o[key],value),key=leaf.at(-1),old=parent[key];
  if(remove)delete parent[key];else parent[key]=typeof old==='boolean'?!old:typeof old==='number'?old+1:old===null?'failure':old+'-changed';
  assert.equal(observe(profile,value).result,'fail',profile.kind+' ignored '+leaf.join('.'));corruptions++;
 }
 for(const legacy of [false,undefined,0,1,'true']){
  // Use the actual optional argument value, including undefined, without defaulting it to true.
  const fn=(...args)=>collector(...args),result=fn({harness:{status:'ok',result:{[profile.field]:complete,[profile.legacy]:legacy}}},keys,'/tmp/consumer','/tmp/source').find(row=>row.case_id===id);
  assert.equal(result.result,'fail');corruptions++;
 }
 for(const [before,after] of [
  [profile.evaluate.name+'(parsed.'+profile.field+')',"({case_id:'"+id+"',result:'pass'})"],
  ["const ok = harnessMap[caseId] === true && row.result === 'pass';",'const ok = harnessMap[caseId] === true;'],
  ["const ok = harnessMap[caseId] === true && row.result === 'pass';","const ok = row.result === 'pass';"],
  ['    if (detailedBehaviorCases.has(caseId)) {','    if (false) {'],
 ]){
  assert.equal(collectorText.split(before).length,2);const mutant=load(collectorText.replace(before,after));
  assert.throws(()=>{assert.equal(observe(profile,complete,true,mutant).result,'pass');assert.equal(observe(profile,null,true,mutant).result,'fail');assert.equal(observe(profile,complete,false,mutant).result,'fail');});collectorMutants++;
 }
 const scratch=mkdtempSync(join(tmpdir(),'native-date-packed-writer-'));
 try{for(const name of ['complete','missing-observation','corrupt-observation','old-assertion-failed','missing-case']){
  const value=name==='missing-observation'?undefined:structuredClone(complete);if(name==='corrupt-observation')value.execution='status-only';
  const selected=observe(profile,value,name!=='old-assertion-failed');
  const runDir=join(scratch,name),outputDir=join(runDir,'evidence/packed-consumer/fixture');mkdirSync(outputDir,{recursive:true});
  const cases=expected.filter(case_id=>name!=='missing-case'||case_id!==id).map(case_id=>case_id===id?selected:{case_id,result:'pass'});
  const result=writeAcceptanceReport({checkId:'packed-consumer',request:{binding:{fixture_only:true},invocation:'fixture',runId:'fixture',outputDir,runDir,
   line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main'},cases,expectedIds:expected,
   library:{sha256:'c'.repeat(64),bytes:1},assertionName:'fixture-observations.json',command:['synthetic-native-date-collector-control']});
  assert.equal(result.passed,name==='complete');const saved=JSON.parse(readFileSync(join(runDir,'reports/packed-consumer.json')));
  assert.equal(saved.coverage,name==='complete'?'complete':'incomplete');
  if(name==='missing-case')assert.deepEqual(saved.unresolved_case_ids,[id]);
  else if(name!=='complete')assert.deepEqual(saved.failed_case_ids,[id]);
  writerCases++;
 }}finally{rmSync(scratch,{recursive:true,force:true});}
}
const task=JSON.parse(read('compatibility/rc/native-date-packed-integration-worksheet.json'));
const stored=read(task.prior.path);assert.equal(hash(stored),task.prior.sha256);const priorRaw=gunzipSync(stored);assert.equal(hash(priorRaw),task.prior.raw_sha256);
const prior=JSON.parse(priorRaw);assert.equal(prior.source_parent,task.source_parent);assert.equal(prior.line,task.line);
const original=prior.members.find(row=>row.path===path);assert.ok(original);assert.equal(hash(original.text),original.sha256);
assert.equal(execFileSync('git',['show',task.source_parent+':'+path],{cwd:root,encoding:'utf8'}),original.text);
const rules=JSON.parse(read('compatibility/rc/native-date-packed-integration-edits.json'));assert.equal(rules.producer_edits.length,8);
let restored=raw;for(const [before,after]of [...rules.producer_edits].reverse()){assert.equal(restored.split(after).length,2);restored=restored.replace(after,()=>before);}
assert.equal(restored,original.text,'Original complete producer not recovered');
function generated(source){
 const ast=ts.createSourceFile('producer.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);const values=[];
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='writeFileSync'&&node.arguments[1]&&ts.isNoSubstitutionTemplateLiteral(node.arguments[1])&&node.arguments[1].text.includes('class HarnessHost'))values.push(node.arguments[1].text);ts.forEachChild(node,visit);}visit(ast);
 assert.equal(values.length,1);const text=values[0],tree=ts.createSourceFile('harness.ts',text,ts.ScriptTarget.Latest,true);assert.equal(tree.parseDiagnostics.length,0);return {text,tree};
}
const child=generated(raw),oldChild=generated(original.text);
function mainFacts(child){
 const main=child.tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='main');assert.ok(main?.body);
 const variables=new Map();for(const [index,node]of main.body.statements.entries())if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations)variables.set(declaration.name.getText(child.tree),{index,node:declaration});
 return {main,variables};
}
const current=mainFacts(child),old=mainFacts(oldChild),variable=name=>{assert.ok(current.variables.has(name),name);return current.variables.get(name);};
for(const name of ['direct','subclass','smallYear','nativeDateConstructor','provided','nativeDateProvider'])
 assert.equal(variable(name).node.getText(child.tree),old.variables.get(name).node.getText(oldChild.tree),'Original '+name+' observer changed');
assert.equal(variable('nativeDateConstructor').index<variable('nativeDateProviderObservation').index,true);
assert.equal(variable('nativeDateManual').index<variable('direct').index,true);
assert.equal(variable('nativeDateConstructorObservation').node.initializer.getText(child.tree),'nativeDateManual.observed');
assert.equal(variable('nativeDateProviderObservation').node.initializer.getText(child.tree),'observePackedNativeDateProviders(nativeDateManual.direct)');
const firstOverride=current.main.body.statements.findIndex(node=>node.getText(child.tree).startsWith('TestBed.overrideComponent'));
assert.ok(variable('nativeDateProviderObservation').index<firstOverride);
const out=variable('out').node.initializer,oldOut=old.variables.get('out').node.initializer;
const okay=out.properties.find(node=>node.name?.getText(child.tree)==='ok');
assert.equal(okay.initializer.getText(child.tree),oldOut.properties.find(node=>node.name?.getText(oldChild.tree)==='ok').initializer.getText(oldChild.tree));
for(const name of ['nativeDateConstructorObservation','nativeDateProviderObservation'])assert.ok(out.properties.some(node=>ts.isShorthandPropertyAssignment(node)&&node.name.text===name));
for(const fragment of ["'src/native-date-probe.ts'), nativeDatePackedFixture()","'src/native-date-contract.mjs'), readFileSync(join(root, 'scripts/native-date-packed-contract.mjs')))",
 "import {nativeDatePackedFixture} from './native-date-packed-fixture.mjs'","import {observePackedNativeDateManual,observePackedNativeDateProviders} from './native-date-probe'",
 "import {packedNativeDateConstructorCase,packedNativeDateProviderCase} from './native-date-contract.mjs'"])assert.ok(raw.includes(fragment),fragment);
const expression=variable('detailedPackedBehaviorsOkay').node.initializer.getText(child.tree);
// Other historical predicates receive synthetic pass stubs only for this expression test.
// Their source and the final ok expression above remain exact; their own current probes remain separate.
const childDeps={packedChipDisabledCase:()=>({result:'pass'}),packedMenuLazyCase:()=>({result:'pass'}),packedTooltipContainerCase:()=>({result:'pass'}),
 packedLegacyBidiScopeCase:()=>({result:'pass'}),packedSelectionComparatorCase:()=>({result:'pass'}),packedNativeDateConstructorCase,packedNativeDateProviderCase,
 chipDisabledObservation:null,menuLazyObservation:null,tooltipContainerObservation:null,isolatedLegacyBidi:{observed:null},selectionComparator:{observed:null}};
function childOkay(text,constructor,provider){const values={...childDeps,nativeDateConstructorObservation:constructor,nativeDateProviderObservation:provider};return new Function(...Object.keys(values),'return ('+text+');')(...Object.values(values));}
assert.equal(childOkay(expression,sample.constructor,sample.provider),true);
for(const which of ['constructor','provider'])for(const value of [undefined,null,true,{}, {...sample[which],error:'failed'}]){
 assert.equal(childOkay(expression,which==='constructor'?value:sample.constructor,which==='provider'?value:sample.provider),false);
}
let childMutants=0;
for(const [profile,name]of [[profiles[0],'nativeDateConstructorObservation'],[profiles[1],'nativeDateProviderObservation']]){
 const before=profile.evaluate.name+'('+name+')';assert.equal(expression.split(before).length,2);
 const changed=expression.replace(before,"({result:'pass'})");
 assert.throws(()=>assert.equal(childOkay(changed,profile.kind==='constructor'?null:sample.constructor,profile.kind==='provider'?null:sample.provider),false));childMutants++;
}
const report={schema_version:1,line:task.line,actual_collector_corruptions_rejected:corruptions,collector_mutants_rejected:collectorMutants,actual_writer_controls:writerCases,
 generated_child_observation_negatives:10,child_predicate_mutants_rejected:childMutants,full_roster:106,original_complete_producer_recovered:true,original_manual_calendar_provider_and_ok_checks_unchanged:true,
 producer_sha256:hash(raw),collector_sha256:hash(collectorText),generated_harness_sha256:hash(child.text),
 packed_collector_integrated:true,synthetic_inputs:true,actual_Angular_DI_or_artifact_factory_executed:false,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
