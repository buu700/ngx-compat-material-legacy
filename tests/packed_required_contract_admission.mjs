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
import {mkdtempSync,mkdirSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {declarationObservations,declarationKeys,librarySpec,harnessCaseIds,allConsumerCaseIds,loadExportKeys,writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';
import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';
import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';
import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';
import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';
import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';
import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';
import {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';
import {packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase} from '../scripts/chip-menu-tooltip-packed-contract.mjs';
import {chipMenuTooltipPackedSamples} from './chip_menu_tooltip_packed_samples.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const contracts={table:{id:'packed-consumer/harness/table-angular-di-construction',field:'tableAngularDiConstruction'},
 chip:{id:'packed-consumer/harness/chip-individual-disabled-form-isolation',field:'chipDisabledIsolation'},
 selection:{id:'packed-consumer/harness/selection-model-comparator-public-list',field:'selectionComparatorExposure'},
 bidi:{id:'packed-consumer/harness/bidi-module-legacy-node-scope',field:'legacyBidiScope'},
 menu:{id:'packed-consumer/harness/menu-lazy-item-destruction',field:'lazyMenuLifecycle'}};

/** Whole actual collector/writer with finite synthetic observations; no product execution. */
export function probeRequiredPackedContract(name){
 const {id,field}=contracts[name]||{};assert.ok(id,'unknown finite contract');
 const path='scripts/packed-consumer-aot-smoke.mjs',raw=readFileSync(join(root,path),'utf8'),file=ts.createSourceFile(path,raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);
 const node=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='collectAcceptanceCases');assert.ok(node);const source=node.getText(file),keys=loadExportKeys();
 const load=text=>new Function('declarationObservations','declarationKeys','packagedSpec','harnessCaseIds','packedValueAccessorCases','packedTableOnPushCase','packedRadioIdentityCase','packedGeneratedIdentityCase','packedSelectDetachCase','packedMenuItemTokenCase','packedSelectFocusClickCase','packedChipDisabledCase','packedMenuLazyCase','packedTooltipContainerCase',text+';return collectAcceptanceCases;')(declarationObservations,declarationKeys,librarySpec,harnessCaseIds,packedValueAccessorCases,packedTableOnPushCase,packedRadioIdentityCase,packedGeneratedIdentityCase,packedSelectDetachCase,packedMenuItemTokenCase,packedSelectFocusClickCase,packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase);
 const expected=allConsumerCaseIds(keys);assert.equal(new Set(expected).size,expected.length);assert.ok(expected.includes(id));
 const manifest=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))),line=manifest.version.startsWith('21.')?'21.x':'main';
 const matrix=JSON.parse(readFileSync(join(root,'compatibility/rc/matrices/full-verify.json')));
 const rows=matrix.checks||matrix.entries||matrix;let roster;
 const visit=value=>{if(!value||typeof value!=='object')return;if(value.check_id==='packed-consumer'||value.id==='packed-consumer')roster=value.acceptance?.cases_by_line?.[line];for(const child of Object.values(value))if(typeof child==='object')visit(child);};visit(rows);
 assert.ok(roster,'actual line packed roster missing');assert.deepEqual(Object.values(roster).flat().sort(),[...expected].sort());
 const cases=[],mutants=[];
 const observations=fn=>[true,false,undefined,0,1,'true'].map(value=>{const rows=fn({harness:{status:'ok',result:{[field]:value,chipDisabledObservation:chipMenuTooltipPackedSamples.chip,menuLazyObservation:chipMenuTooltipPackedSamples.menu,tooltipContainerObservation:chipMenuTooltipPackedSamples.tooltip}}},keys,'/tmp/consumer','/tmp/source'),matches=rows.filter(r=>r.case_id===id);assert.equal(matches.length,1,'required contract missing');assert.equal(matches[0].result,value===true?'pass':'fail','explicit observed boolean required');return {input:value===undefined?'omitted':value,result:matches[0].result};});
 cases.push(...observations(load(source)));
 for(const [name,from,to] of [['unconditional-pass',`parsed.${field} === true`,'true'],['omitted-observation',`    '${id}': parsed.${field} === true,`,'']]){assert.ok(source.includes(from));assert.throws(()=>observations(load(source.replace(from,to))));mutants.push({id:name,rejected:true});}
 const scratch=mkdtempSync(join(tmpdir(),'packed-contract-admission-'));
 try{for(const [name,rows,pass] of [['complete',expected.map(case_id=>({case_id,result:'pass'})),true],['missing',expected.filter(x=>x!==id).map(case_id=>({case_id,result:'pass'})),false],['false',expected.map(case_id=>({case_id,result:case_id===id?'fail':'pass'})),false]]){
  const runDir=join(scratch,name),out=join(runDir,'evidence/packed-consumer/fixture');mkdirSync(out,{recursive:true});const result=writeAcceptanceReport({checkId:'packed-consumer',request:{binding:{fixture_only:true},invocation:'fixture',runId:'fixture',outputDir:out,runDir,line},cases:rows,expectedIds:expected,library:{sha256:'c'.repeat(64),bytes:1},assertionName:'observations.json',command:['synthetic-contract-observation-fixture']});assert.equal(result.passed,pass,name);const saved=JSON.parse(readFileSync(join(runDir,'reports/packed-consumer.json')));assert.equal(saved.coverage,pass?'complete':'incomplete');if(name==='missing')assert.deepEqual(saved.unresolved_case_ids,[id]);if(name==='false')assert.deepEqual(saved.failed_case_ids,[id]);cases.push({id:name,admitted:pass});
 }}finally{rmSync(scratch,{recursive:true,force:true});}
 return {schema_version:1,line,contract:id,cases:cases.length,mutants_rejected:mutants.length,derived_cases:expected.length,roster_bound:true,collector_sha256:createHash('sha256').update(source).digest('hex'),native_executed:false};
}
