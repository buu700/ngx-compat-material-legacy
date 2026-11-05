/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure finite reconstruction, retained source-view CSS only; no compiler/producer. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {currentButtonTokenizationExpectedCss,currentButtonTokenizationExpectedMeasurement,currentButtonTokenizationMeasurementMatches,CURRENT_BUTTON_TOKENIZATION_CASE_IDS} from '../scripts/upstream-button-tokenization-source-review.mjs';
import admission from '../scripts/upstream-button-tokenization-admission.cjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
function json(path,pin){const raw=readFileSync(path);if(pin)assert.equal(hash(raw),pin);return JSON.parse(path.endsWith('.gz')?gunzipSync(raw):raw);}
const historicalReport=json('compatibility/rc/21x-c04-button-tokenization-source-review.json','4fa19472ae965a5fbc097b51ab60f344acd7791909d97221a954a25f89e9463a');
const packet=json('compatibility/rc/current-sass-source-inputs-v2.json','46e1c8e8657880c1168010c8ec1b5967cbb4aa4c289a4d9b9ae29e3b2182b0a9');
const base=json(packet.historical_source_packet.path,packet.historical_source_packet.sha256);
const transitions=[...base.branches['21.x'].modules,...packet.additional_modules].map(r=>({path:r.path,before:r.before,current:r.current}));
const scope=json('compatibility/rc/upstream-sass-inspection-current-scope.json.gz','b0a8f0d0d2ce8cb41943a0585ccdcc25fd6bb0d30c9339f80501ef86c65726f4').actual;
const publicSources=scope.current.loaded_sources.map(r=>({path:'/current/@angular/'+(r.root===0?'material':'cdk')+'/'+r.path,sha256:r.sha256,bytes:r.bytes}));
const historical=historicalReport.button_measurement,before=JSON.stringify(historical),current=currentButtonTokenizationExpectedMeasurement({historical,transitions,publicSources});
const checks=[],check=(name,fn)=>{fn();checks.push(name);},match=value=>currentButtonTokenizationMeasurementMatches({historical,current:value,transitions,publicSources});
check('all14originalcaseIDs unchanged',()=>assert.deepEqual(current.cases.map(r=>r.case_id),CURRENT_BUTTON_TOKENIZATION_CASE_IDS));
check('exact pure14case model matches',()=>assert.equal(match(current),true));
for(let i=0;i<14;i++){
 const old=historical.cases[i],row=current.cases[i];
 check('untouched whole original/program retained '+row.case_id,()=>{assert.deepEqual(row.expected,old.expected);assert.equal(row.program,old.program);assert.equal(row.program_sha256,old.program_sha256);assert.equal(row.actual.loaded_sources.length,256);assert.ok(row.actual.loaded_sources.every(r=>r.path.startsWith('/owned/material/')||r.path.startsWith('/current/@angular/')));});
 check('changed complete candidateCSS rejected '+row.case_id,()=>{const value=structuredClone(current),r=value.cases[i];r.actual.css+='\n.changed {}';r.actual.css_sha256=hash(r.actual.css);r.actual.css_bytes=Buffer.byteLength(r.actual.css);assert.equal(match(value),false);});
 check('changed program/source rejected '+row.case_id,()=>{const value=structuredClone(current),r=value.cases[i];r.actual_program+=' ';r.actual_program_sha256=hash(r.actual_program);r.actual.loaded_sources[0].sha256='0'.repeat(64);assert.equal(match(value),false);});
 const added=row.actual.css.split('\n').find(line=>/^  --mat-(?:button|text-button|filled-button|protected-button|outlined-button)-/.test(line));assert.ok(added);
 check('missing public declaration rejected '+row.case_id,()=>{const value=structuredClone(current),r=value.cases[i];r.actual.css=r.actual.css.replace(added+'\n','');r.actual.css_sha256=hash(r.actual.css);r.actual.css_bytes=Buffer.byteLength(r.actual.css);assert.equal(match(value),false);});
}
for(const[name,mutate]of Object.entries({missing:v=>v.cases.pop(),duplicate:v=>v.cases[1]=v.cases[0],unknown:v=>v.cases[0].case_id='mixin-argument/checkbox-color/custom-full-theme',harness:v=>v.finite_button_forward_harness+=' ',originalCSS:v=>v.cases[0].expected.css+=' ',originalProgram:v=>v.cases[0].program+=' ',libraryClaim:v=>v.full_facade_or_structural_or_native_or_packed_qualified=true,alias:v=>v.cases[0].actual.loaded_sources[0].path='/@angular/material/_selected-button-entry.scss',peerMissing:v=>v.cases[0].actual.loaded_sources.pop(),extra:v=>v.approved=true})){
 const value=structuredClone(current);mutate(value);check('whole model rejects '+name,()=>assert.equal(match(value),false));
}
let getters=0;const hostile=structuredClone(current);Object.defineProperty(hostile.cases[0].actual,'css',{enumerable:true,get(){getters++;return current.cases[0].actual.css;}});
check('getter rejected without invocation',()=>assert.equal(match(hostile),false));check('gettercount0',()=>assert.equal(getters,0));
check('foreign direct case excluded',()=>assert.equal(currentButtonTokenizationExpectedCss({caseId:'mixin-argument/checkbox-color/custom-full-theme',originalCss:historical.cases[0].expected.css}),null));
check('original71graph measurements not mutated',()=>assert.equal(JSON.stringify(historical),before));
const legacy=json('compatibility/rc/ordinary-checkbox-button-legacy-composition-source-view-v1.json','a28b4f1b5f69b6c629fcae3a665539a362048180b054c0610910f427723eff0a');
const retained=legacy.rows.find(r=>r.case_id==='mixin-argument/legacy-button-theme/custom-full-theme');
check('retained actual nested sourceview wholeCSS matches independent model',()=>assert.equal(current.cases.find(r=>r.case_id===retained.case_id).actual.css,retained.candidate.css));
const parent=json('compatibility/rc/parent-checkbox-button-proposed-compile-21-v2.json','cf051eb0904a1f712dc134206937756094de6f86daae3dfe7c668bdacad72793');
const ordinary=parent.rows.find(r=>r.family==='button');
check('retained actual ordinary sourceview wholeCSS matches independent model',()=>assert.equal(current.cases.find(r=>r.case_id===ordinary.case_id).actual.css,ordinary.css));
const body=json(admission.BUTTON_TOKENIZATION_REVIEW);
for(const row of body.reviews){const proof=admission.buttonTokenizationProof(row),entry={sha:row.sha,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',affected_branches:['21.x'],files:row.frozen_seed_paths,evidence_report:admission.BUTTON_TOKENIZATION_REVIEW,g11_claim:'not-passed',individual_proof:proof};
 check('frozen original metadata proof '+row.sha,()=>{assert.equal(proof.button_tokenization_source_scope.handler.sha256,'914515e0cef3b98721868655f15e10c057320a795cfe48f0cdb5a199ddb71ac4');assert.equal(admission.metadataOk({entry,body,review:row,proof}),true);});
 check('pure metadata getter rejected '+row.sha,()=>{const value={entry,body,review:row,proof};Object.defineProperty(value,'body',{get(){getters++;return body;},enumerable:true});assert.equal(admission.metadataOk(value),false);});}
console.log(JSON.stringify({result:'pass',checks,checks_passed:checks.length,finite_cases:14,root_ordinary_cases:8,nested_legacy_cases:6,original_graph_members:71,current_public_graph_members:185,current_loaded_members_each:256,retained_actual_wholeCSS_checks:2,getter_calls:getters,fresh_compiler_calls:0,actual_source_producer_executed:false,actual_C04_tool_subject_executed:false,actual_packed_or_native_or_floor_qualified:false}));
