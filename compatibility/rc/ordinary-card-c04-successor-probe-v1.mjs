/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure retained-data tests; no Sass or source-owner constructor. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join,resolve} from 'node:path';
import {ordinaryCardC04ExpectedMeasurement,ordinaryCardC04MeasurementMatches,ordinaryCardC04ExpectedCase,ordinaryCardC04CaseMatches,ordinaryCardTokenPlacementExpected,ordinaryCardTokenPlacementReportMatches,ordinaryCardM3BoundaryExpectedDefaults,ordinaryCardM3BoundaryPriorDefaults,ordinaryCardM3BoundaryDefaultsMatch,ordinaryCardM3BoundaryDefaultExpected,ORDINARY_CARD_C04_PRODUCTION_CASE_IDS,ORDINARY_CARD_C04_DIAGNOSTIC_CASE_IDS} from './ordinary-card-c04-successor-model-v1.mjs';
const root=process.cwd(),historicalRoot=resolve(process.argv[2]??root),hash=b=>createHash('sha256').update(b).digest('hex');
const packetRaw=readFileSync(new URL('./ordinary-card-c04-successor-inputs-v1.json',import.meta.url));assert.equal(hash(packetRaw),'0ebb1f81be067cee2bbc2149dd9fd4e9188c4129d1482b40145a1a4893ad9634');const packet=JSON.parse(packetRaw);
const checks=[],check=(name,fn)=>{fn();checks.push(name);};let getterCalls=0,trapCalls=0;
check('production12 separate from diagnostics4',()=>{assert.equal(ORDINARY_CARD_C04_PRODUCTION_CASE_IDS.length,12);assert.equal(ORDINARY_CARD_C04_DIAGNOSTIC_CASE_IDS.length,4);assert.ok(ORDINARY_CARD_C04_DIAGNOSTIC_CASE_IDS.every(id=>!id.startsWith('mixin-')));});
let retainedCases=0;
for(const kind of ['surface','remaining']){
 const spec=packet.measurements[kind],raw=readFileSync(join(historicalRoot,spec.source_report.path));assert.equal(hash(raw),spec.source_report.sha256);assert.equal(raw.length,spec.source_report.bytes);
 const report=JSON.parse(spec.source_report.path.endsWith('.gz')?gunzipSync(raw):raw),historical=report[spec.field],before=JSON.stringify(historical),current=ordinaryCardC04ExpectedMeasurement({kind,historical});
 check(kind+' whole exact measurement',()=>assert.equal(ordinaryCardC04MeasurementMatches({kind,historical,current}),true));
 check(kind+' exact roster/card absence',()=>{assert.equal(current.case_count,spec.case_count);assert.deepEqual(current.cases.map(r=>r.case_id),spec.case_ids);assert.ok(current.cases.every(r=>!r.case_id.includes('/card-')&&r.actual.loaded_sources.every(s=>s.path!=='/owned/material/card/_card-theme.scss')));});
 for(const old of historical.cases){
  const expected=ordinaryCardC04ExpectedCase({kind,historical:old});retainedCases++;
  check(kind+' original/peer/CSS/program retained '+old.case_id,()=>{const {actual:beforeActual,...beforeRest}=old,{actual:afterActual,...afterRest}=expected;assert.deepEqual(afterRest,beforeRest);for(const key of Object.keys(beforeActual).filter(k=>k!=='loaded_sources'))assert.deepEqual(afterActual[key],beforeActual[key]);assert.equal(ordinaryCardC04CaseMatches({kind,historical:old,current:expected}),true);});
  check(kind+' whole CSS mutation rejects '+old.case_id,()=>{const bad=structuredClone(expected);bad.actual.css+='\n.changed {}';bad.actual.css_sha256=hash(bad.actual.css);bad.actual.css_bytes=Buffer.byteLength(bad.actual.css);assert.equal(ordinaryCardC04CaseMatches({kind,historical:old,current:bad}),false);});
 }
 for(const fault of ['case-count','missing-row','extra'])check(kind+' whole envelope '+fault,()=>{const bad=structuredClone(current);if(fault==='case-count')bad.case_count++;if(fault==='missing-row')bad.cases.pop();if(fault==='extra')bad.approved=true;assert.equal(ordinaryCardC04MeasurementMatches({kind,historical,current:bad}),false);});
 for(const fault of ['original','source','peer','harness','getter'])check(kind+' selected contract '+fault,()=>{
  const old=historical.cases.find(r=>r.peer)??historical.cases[0],bad=ordinaryCardC04ExpectedCase({kind,historical:old});
  if(fault==='original')bad.expected.css+=' ';
  if(fault==='source')bad.actual.loaded_sources[0].sha256='0'.repeat(64);
  if(fault==='peer')bad.peer={foreign:true};
  if(fault==='harness')bad.finite_family_forward_harness='foreign';
  if(fault==='getter')Object.defineProperty(bad.actual,'css',{enumerable:true,get(){getterCalls++;return old.actual.css;}});
  assert.equal(ordinaryCardC04CaseMatches({kind,historical:old,current:bad}),false);
 });
 check(kind+' original fragment unmodified',()=>assert.equal(JSON.stringify(historical),before));
}
for(const line of ['21.x','main']){
 const spec=packet.token_placement[line],prior={schema_version:1,line,families:structuredClone(spec.four_module_families),public_legacy_default_CSS_cases:structuredClone(spec.public_legacy_default_CSS_cases),direct_original_legacy_color_cases:structuredClone(spec.direct_original_legacy_color_cases),public_selected_mixin_names:structuredClone(spec.public_selected_mixin_names),post16_base_exports_absent:structuredClone(spec.post16_base_exports_absent),input_members:[{path:'modeled/qualified-current-input',sha256:'a'.repeat(64),bytes:1}],current_public_bridge:{role:'modeled already-authenticated5module summary; no source authority'},other_exact_field:{value:'unchanged'}},before=JSON.stringify(prior),current=ordinaryCardTokenPlacementExpected({line,prior});
 check(line+' only3card source flags change',()=>{const expected=structuredClone(prior),card=expected.families.find(r=>r.family==='card');card.modern_theme_exact_tagged_bytes_after_MDC_import_relocation=false;card.historical_modern_source_exact_after_MDC_relocation=true;card.separate_current_public_bridge=true;assert.deepEqual(current,expected);assert.equal(ordinaryCardTokenPlacementReportMatches({line,prior,current}),true);assert.equal(JSON.stringify(prior),before);});
 for(const [key,rows]of [['public_legacy_default_CSS_cases',current.public_legacy_default_CSS_cases],['direct_original_legacy_color_cases',current.direct_original_legacy_color_cases]])for(let i=0;i<rows.length;i++)check(line+' unchanged legacy CSS/program '+rows[i].case_id,()=>{const bad=structuredClone(current);bad[key][i].program_sha256='0'.repeat(64);bad[key][i].css_sha256='0'.repeat(64);assert.equal(ordinaryCardTokenPlacementReportMatches({line,prior,current:bad}),false);});
 for(const fault of ['family','namespace','input','summary','extra'])check(line+' exact token metadata '+fault,()=>{const bad=structuredClone(current);if(fault==='family')bad.families.find(r=>r.family==='tooltip').legacy_theme_exact_tagged_bytes=false;if(fault==='namespace')bad.public_selected_mixin_names[0]='card-base';if(fault==='input')bad.input_members[0].sha256='0'.repeat(64);if(fault==='summary')bad.current_public_bridge.approved=true;if(fault==='extra')bad.approved=true;assert.equal(ordinaryCardTokenPlacementReportMatches({line,prior,current:bad}),false);});
 const historical=packet.m3_boundary[line].historical_defaults,beforeDefaults=JSON.stringify(historical),four=ordinaryCardM3BoundaryPriorDefaults({line,historical}),five=ordinaryCardM3BoundaryExpectedDefaults({line,historical});
 check(line+' exact2card delta after approved4module defaults',()=>{assert.deepEqual(five.filter((row,i)=>JSON.stringify(row)!==JSON.stringify(four[i])).map(r=>r.case_id),['mixin-css/card-color','mixin-css/card-theme']);assert.equal(ordinaryCardM3BoundaryDefaultsMatch({line,historical,current:five}),true);assert.equal(JSON.stringify(historical),beforeDefaults);});
 for(let i=0;i<16;i++){
  const old=historical[i],row=five[i];
  check(line+' exact default program/warnings '+row.case_id,()=>{assert.equal(row.program_sha256,old.program_sha256);assert.deepEqual(row.warnings,old.warnings);assert.equal(row.result,old.result);assert.deepEqual(ordinaryCardM3BoundaryDefaultExpected({line,caseId:row.case_id}),row);});
 }
 for(const fault of ['css','program','warnings','unknown','extra'])check(line+' exact16boundary '+fault,()=>{const bad=structuredClone(five);if(fault==='css'){bad[6].css+=' ';bad[6].css_sha256=hash(bad[6].css);bad[6].css_bytes=Buffer.byteLength(bad[6].css);}if(fault==='program')bad[6].program_sha256='0'.repeat(64);if(fault==='warnings')bad[6].warnings.push('foreign');if(fault==='unknown')bad[6].case_id='mixin-css/card-base';if(fault==='extra')bad[6].approved=true;assert.equal(ordinaryCardM3BoundaryDefaultsMatch({line,historical,current:bad}),false);});
}
check('outer getter rejects without invocation',()=>{const a={line:'21.x',caseId:'mixin-css/card-color'};Object.defineProperty(a,'caseId',{enumerable:true,get(){getterCalls++;return'mixin-css/card-color';}});assert.throws(()=>ordinaryCardM3BoundaryDefaultExpected(a));});
check('proxy rejects without traps',()=>assert.throws(()=>ordinaryCardM3BoundaryDefaultExpected(new Proxy({},{getPrototypeOf(){trapCalls++;return Object.prototype;}}))));
check('symbol rejects',()=>assert.throws(()=>ordinaryCardM3BoundaryDefaultExpected({line:'21.x',caseId:'mixin-css/card-color',[Symbol('foreign')]:true})));
check('diagnostic is not a production boundary default',()=>assert.throws(()=>ordinaryCardM3BoundaryDefaultExpected({line:'21.x',caseId:'source-custom-foreground/card-theme'})));
check('unknown measurement kind rejects',()=>assert.throws(()=>ordinaryCardC04ExpectedMeasurement({kind:'control',historical:{}})));
check('no getter or proxy trap called',()=>{assert.equal(getterCalls,0);assert.equal(trapCalls,0);});
console.log(JSON.stringify({schema_version:1,result:'pass',checks_passed:checks.length,checks,retained_surface_cases:36,retained_remaining_cases:160,retained_case_comparisons:retainedCases,retained_measurement_line:'21.x',root_line:JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main',token_placement_profiles:2,unchanged_legacy_records_each:20,m3_default_profiles:2,m3_default_records_each:16,card_changed_default_ids:['mixin-css/card-color','mixin-css/card-theme'],production_card_cases:12,separate_diagnostics:4,getter_calls:getterCalls,proxy_trap_calls:trapCalls,fresh_compiler_calls:0,source_or_tool_owner_constructed:false,actual_source_producer_executed:false,actual_five_module_css_or_artifact_qualified:false}));
