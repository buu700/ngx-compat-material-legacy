/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite pure C04 expectations. No source, producer, packed or audit authority. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {types} from 'node:util';
import {ordinaryCardPublicBridgeV2Css} from './ordinary-card-public-bridge-model-v2.mjs';
import {ordinaryCheckboxButtonExpectedCss} from './ordinary-checkbox-button-expectation-model-v1.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const raw=readFileSync(new URL('./ordinary-card-c04-successor-inputs-v1.json',import.meta.url));
assert.equal(hash(raw),'0ebb1f81be067cee2bbc2149dd9fd4e9188c4129d1482b40145a1a4893ad9634');
const inputs=JSON.parse(raw);
for(const ref of [inputs.card_model,inputs.checkbox_button_model,inputs.card_original_cases]){
 const bytes=readFileSync(new URL('../../'+ref.path,import.meta.url));assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);
}
assert.equal(inputs.candidate_css_used_in_expected,false);assert.equal(inputs.fresh_compiler_calls,0);
const digest=value=>hash(JSON.stringify(value));
function plain(value){
 if(value===null||['string','boolean'].includes(typeof value))return value;
 if(typeof value==='number'){assert.ok(Number.isSafeInteger(value));return value;}
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value));const array=Array.isArray(value);assert.equal(Object.getPrototypeOf(value),array?Array.prototype:Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(value),out=array?[]:{};
 for(const key of Reflect.ownKeys(descriptors)){assert.equal(typeof key,'string');if(array&&key==='length')continue;const d=descriptors[key];assert.ok(Object.hasOwn(d,'value')&&d.enumerable);if(array)assert.match(key,/^(?:0|[1-9][0-9]*)$/);Object.defineProperty(out,key,{value:plain(d.value),enumerable:true,writable:true,configurable:true});}
 if(array){assert.equal(out.length,descriptors.length.value);assert.equal(Object.keys(out).length,out.length);}return out;
}
function argumentsFor(args,keys){const value=plain(args);assert.deepEqual(Object.keys(value).sort(),[...keys].sort());return value;}
function measurement(kind){assert.ok(Object.hasOwn(inputs.measurements,kind),'unknown retained C04 measurement');return inputs.measurements[kind];}
function lineData(line){assert.ok(Object.hasOwn(inputs.token_placement,line),'unknown minimum line');return inputs.token_placement[line];}
function sourceMetadataSuccessor(row){
 for(const ref of row.actual.loaded_sources){
  assert.notEqual(ref.path,'/owned/material/card/_card-theme.scss','card is outside these retained selected compiler graphs');
  if(!ref.path.startsWith('/owned/material/'))continue;
  const path='projects/ngx-material-legacy/styles/'+ref.path.slice('/owned/material/'.length),transition=inputs.four_module_transitions.find(r=>r.path===path);
  if(transition){assert.equal(ref.sha256,transition.before.sha256);assert.equal(ref.bytes,transition.before.bytes);ref.sha256=transition.current.sha256;ref.bytes=transition.current.bytes;}
 }
 return row;
}
export const ORDINARY_CARD_C04_PRODUCTION_CASE_IDS=Object.freeze([...inputs.production_card_case_ids]);
export const ORDINARY_CARD_C04_DIAGNOSTIC_CASE_IDS=Object.freeze([...inputs.diagnostic_card_case_ids]);
export const ORDINARY_CARD_C04_M3_CHANGED_CASE_IDS=Object.freeze(['mixin-css/card-color','mixin-css/card-theme']);
/** Only the already-approved four-module source metadata changes in these
 * original36/160 cases. The fifth owned card module is never loaded. */
export function ordinaryCardC04ExpectedMeasurement(args){
 const {kind,historical}=argumentsFor(args,['kind','historical']),spec=measurement(kind);
 assert.equal(digest(historical),spec.historical_fragment_sha256);assert.equal(historical.case_count,spec.case_count);assert.deepEqual(historical.cases.map(r=>r.case_id),spec.case_ids);
 const expected=structuredClone(historical);for(const row of expected.cases)sourceMetadataSuccessor(row);
 assert.equal(digest(expected),spec.four_module_fragment_sha256);return expected;
}
export function ordinaryCardC04MeasurementMatches(args){
 try{const {kind,historical,current}=argumentsFor(args,['kind','historical','current']);assert.deepEqual(current,ordinaryCardC04ExpectedMeasurement({kind,historical}));return true;}catch{return false;}
}
export function ordinaryCardC04ExpectedCase(args){
 const {kind,historical}=argumentsFor(args,['kind','historical']),spec=measurement(kind),id=historical.case_id;
 assert.ok(Object.hasOwn(spec.historical_case_sha256s,id),'unknown retained case');assert.equal(digest(historical),spec.historical_case_sha256s[id]);
 const expected=sourceMetadataSuccessor(structuredClone(historical));assert.equal(digest(expected),spec.four_module_case_sha256s[id]);return expected;
}
export function ordinaryCardC04CaseMatches(args){
 try{const {kind,historical,current}=argumentsFor(args,['kind','historical','current']);assert.deepEqual(current,ordinaryCardC04ExpectedCase({kind,historical}));return true;}catch{return false;}
}
/** Compose only after the parent has authenticated its complete prior report
 * and qualified source/tool/summary metadata. This function grants no authority. */
export function ordinaryCardTokenPlacementExpected(args){
 const {line,prior}=argumentsFor(args,['line','prior']),spec=lineData(line);assert.equal(prior.line,line);
 assert.deepEqual(prior.families,spec.four_module_families);
 for(const key of ['public_legacy_default_CSS_cases','direct_original_legacy_color_cases','public_selected_mixin_names','post16_base_exports_absent'])assert.deepEqual(prior[key],spec[key]);
 const expected=structuredClone(prior),card=expected.families.find(r=>r.family==='card');assert.ok(card);
 assert.equal(card.modern_theme_exact_tagged_bytes_after_MDC_import_relocation,true);assert.equal(card.historical_modern_source_exact_after_MDC_relocation,false);assert.equal(card.separate_current_public_bridge,false);
 card.modern_theme_exact_tagged_bytes_after_MDC_import_relocation=false;card.historical_modern_source_exact_after_MDC_relocation=true;card.separate_current_public_bridge=true;
 return expected;
}
export function ordinaryCardTokenPlacementReportMatches(args){
 try{const {line,prior,current}=argumentsFor(args,['line','prior','current']);assert.deepEqual(current,ordinaryCardTokenPlacementExpected({line,prior}));return true;}catch{return false;}
}
function boundaryDefaults(line,historical,includeCard){
 lineData(line);const spec=inputs.m3_boundary[line];assert.equal(digest(historical),spec.historical_fragment_sha256);assert.equal(historical.length,16);
 const expected=structuredClone(historical);
 for(const row of expected){
  let css=null;
  if(['mixin-css/checkbox-color','mixin-css/checkbox-theme'].includes(row.case_id))css=ordinaryCheckboxButtonExpectedCss({caseId:row.case_id,originalCss:row.css});
  if(includeCard&&ORDINARY_CARD_C04_M3_CHANGED_CASE_IDS.includes(row.case_id))css=ordinaryCardPublicBridgeV2Css({caseId:row.case_id,originalCss:row.css});
  if(css!==null){assert.equal(typeof css,'string');row.css=css;row.css_sha256=hash(css);row.css_bytes=Buffer.byteLength(css);}
 }
 assert.equal(digest(expected),includeCard?spec.five_module_fragment_sha256:spec.four_module_fragment_sha256);return expected;
}
/** Actual producer framing stays @use '__entry__' + standardThemeSource + the
 * original invocationPlan call. Every recorded program hash/warning is retained. */
export function ordinaryCardM3BoundaryExpectedDefaults(args){
 const {line,historical}=argumentsFor(args,['line','historical']);return boundaryDefaults(line,historical,true);
}
export function ordinaryCardM3BoundaryPriorDefaults(args){
 const {line,historical}=argumentsFor(args,['line','historical']);return boundaryDefaults(line,historical,false);
}
export function ordinaryCardM3BoundaryDefaultsMatch(args){
 try{const {line,historical,current}=argumentsFor(args,['line','historical','current']);assert.deepEqual(current,boundaryDefaults(line,historical,true));return true;}catch{return false;}
}
/** Exact16 defaults only. Program/result/warnings and all unaffected CSS remain
 * from the authenticated original record; only four approved token rows change. */
export function ordinaryCardM3BoundaryDefaultExpected(args){
 const {line,caseId}=argumentsFor(args,['line','caseId']);lineData(line);const rows=boundaryDefaults(line,inputs.m3_boundary[line].historical_defaults,true),selected=rows.filter(r=>r.case_id===caseId);assert.equal(selected.length,1,'unknown M3 boundary default');return selected[0];
}
