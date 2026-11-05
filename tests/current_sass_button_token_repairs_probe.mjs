/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure14 reconstruction and immutable original/proof controls. No compiler. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {currentButtonTokenizationExpectedMeasurement,currentButtonTokenizationMeasurementMatches} from '../scripts/upstream-button-tokenization-source-review.mjs';
import {verifyButtonTokenRepairsOriginals,currentButtonTokenRepairsExpectedReport,currentButtonTokenRepairsReportMatches} from '../scripts/upstream-button-token-repairs-source-review.mjs';
import admission from '../scripts/upstream-button-token-repairs-admission.cjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
function json(path,pin){const raw=readFileSync(path);if(pin)assert.equal(hash(raw),pin);return JSON.parse(path.endsWith('.gz')?gunzipSync(raw):raw);}
const original=json('compatibility/rc/21x-c04-button-token-repairs-originals.json.gz','e6cd6cbe4dc427eddf68991b4354b7f18b5b001c30aa88c9ca73c3384d61e80a');
const facts=verifyButtonTokenRepairsOriginals(original,json('compatibility/rc/upstream-complete-patch-census.json.gz','806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'));
const historical=json('compatibility/rc/21x-c04-button-token-repairs-source-review.json','cf2ec51ab6fd7cf98e718909940cb75ca6aaad2687bcc0544bd544dadc9ce38f');
const sharedHistorical=json('compatibility/rc/21x-c04-button-tokenization-source-review.json','4fa19472ae965a5fbc097b51ab60f344acd7791909d97221a954a25f89e9463a');
const packet=json('compatibility/rc/current-sass-source-inputs-v1.json','9c3b08100262a981698f58c9a2127697b6ca3f03fde99d864451826534f6ed1a');
const beforePacket=json(packet.historical_source_packet.path,packet.historical_source_packet.sha256);
const transitions=[...beforePacket.branches['21.x'].modules,...packet.additional_modules].map(r=>({path:r.path,before:r.before,current:r.current}));
const publicScope=json('compatibility/rc/upstream-sass-inspection-current-scope.json.gz','b0a8f0d0d2ce8cb41943a0585ccdcc25fd6bb0d30c9339f80501ef86c65726f4').actual;
const publicSources=publicScope.current.loaded_sources.map(r=>({path:'/current/@angular/'+(r.root===0?'material':'cdk')+'/'+r.path,sha256:r.sha256,bytes:r.bytes}));
// This shared report is a pure modeled envelope, not a physical source result.
// Actual production accepts it only from the independently guarded producer.
const sharedCurrent=structuredClone(sharedHistorical);
sharedCurrent.button_measurement=currentButtonTokenizationExpectedMeasurement({historical:sharedHistorical.button_measurement,transitions,publicSources});
sharedCurrent.current_source_bindings=sharedHistorical.current_source_bindings.map(r=>{const t=transitions.find(t=>t.path===r.path);return t?{path:r.path,...t.current}:r;}).sort((a,b)=>a.path.localeCompare(b.path));
sharedCurrent.current_public_bridge={module_count:4,role:'modeled shared current source metadata; no actual constructor or source admission'};
const sharedPaths=new Set(sharedHistorical.current_source_bindings.map(r=>r.path));
const ownReferences=historical.current_source_bindings.filter(r=>!sharedPaths.has(r.path)).map(r=>r.path==='scripts/upstream-button-token-repairs-source-review.mjs'?{path:r.path,sha256:hash(readFileSync(r.path)),bytes:readFileSync(r.path).length}:r);
ownReferences.push({path:'compatibility/rc/21x-c04-button-token-repairs-source-review.json',sha256:'cf2ec51ab6fd7cf98e718909940cb75ca6aaad2687bcc0544bd544dadc9ce38f',bytes:853841});
const inputs={historical,sharedHistorical,sharedCurrent,ownReferences},prior=JSON.stringify(historical),sharedPrior=JSON.stringify(sharedHistorical);
const current=currentButtonTokenRepairsExpectedReport(inputs),checks=[],check=(name,fn)=>{fn();checks.push(name);};
const match=value=>currentButtonTokenRepairsReportMatches({...inputs,current:value});
check('whole finite report matches',()=>assert.equal(match(current),true));
check('whole original9files14hunks34trees authenticated',()=>{assert.equal(facts.original_files,9);assert.equal(facts.original_hunks,14);assert.equal(facts.authenticated_tree_objects,34);assert.deepEqual(current.reviews,facts.reviews);});
check('627 and623 preserved only as historical cardinalities',()=>{assert.equal(current.historical_source_bindings,627);assert.equal(current.historical_shared_button_source_bindings,623);assert.equal(current.current_source_bindings.length,new Set([...sharedCurrent.current_source_bindings,...ownReferences].map(r=>r.path)).size);});
for(let i=0;i<14;i++){
 const old=historical.button_measurement.cases[i],row=current.button_measurement.cases[i];
 check('whole original/program retained '+row.case_id,()=>{assert.deepEqual(row.expected,old.expected);assert.equal(row.program,old.program);assert.equal(row.program_sha256,old.program_sha256);assert.equal(row.actual.loaded_sources.length,256);});
 for(const fault of ['CSS','program','source','missing-token'])check(fault+' rejected '+row.case_id,()=>{
  const value=structuredClone(current),r=value.button_measurement.cases[i];
  if(fault==='CSS')r.actual.css+='\n.changed {}';
  if(fault==='program'){r.actual_program+=' ';r.actual_program_sha256=hash(r.actual_program);}
  if(fault==='source')r.actual.loaded_sources[0].sha256='0'.repeat(64);
  if(fault==='missing-token'){const line=r.actual.css.split('\n').find(l=>/^  --mat-(?:button|text-button|filled-button|protected-button|outlined-button)-/.test(l));assert.ok(line);r.actual.css=r.actual.css.replace(line+'\n','');}
  r.actual.css_sha256=hash(r.actual.css);r.actual.css_bytes=Buffer.byteLength(r.actual.css);assert.equal(match(value),false);
  assert.equal(currentButtonTokenizationMeasurementMatches({historical:sharedHistorical.button_measurement,current:value.button_measurement,transitions,publicSources}),false);
 });
}
for(const key of Object.keys(current))check('whole report field mutation '+key,()=>{const value=structuredClone(current);if(Array.isArray(value[key]))value[key].pop();else if(value[key]&&typeof value[key]==='object')value[key].extra='foreign';else value[key]=typeof value[key]==='boolean'?!value[key]:typeof value[key]==='number'?value[key]+1:value[key]+' foreign';assert.equal(match(value),false);});
for(const key of ['historical','sharedHistorical','ownReferences'])check('changed expectation input '+key,()=>{const value=structuredClone(inputs);if(key==='ownReferences')value[key][1].sha256='0'.repeat(64);else value[key].original_hunks++;assert.throws(()=>currentButtonTokenRepairsExpectedReport(value));});
let getters=0;
for(const at of ['outer','css'])check('descriptor-only '+at,()=>{const args={...inputs,current:structuredClone(current)};if(at==='outer')Object.defineProperty(args,'current',{enumerable:true,get(){getters++;return current;}});else Object.defineProperty(args.current.button_measurement.cases[0].actual,'css',{enumerable:true,get(){getters++;return current.button_measurement.cases[0].actual.css;}});assert.equal(currentButtonTokenRepairsReportMatches(args),false);});
check('direct expectation builder rejects accessor without invocation',()=>{const args={...inputs};Object.defineProperty(args,'historical',{enumerable:true,get(){getters++;return historical;}});assert.throws(()=>currentButtonTokenRepairsExpectedReport(args));});
check('expectation builder rejects extra input keys',()=>assert.throws(()=>currentButtonTokenRepairsExpectedReport({...inputs,approved:true})));
const retained=json('compatibility/rc/ordinary-checkbox-button-legacy-composition-source-view-v1.json','a28b4f1b5f69b6c629fcae3a665539a362048180b054c0610910f427723eff0a');
check('retained actual nested whole CSS',()=>{const r=retained.rows.find(r=>r.case_id==='mixin-argument/legacy-button-theme/custom-full-theme');assert.equal(current.button_measurement.cases.find(x=>x.case_id===r.case_id).actual.css,r.candidate.css);});
const ordinary=json('compatibility/rc/parent-checkbox-button-proposed-compile-21-v2.json','cf051eb0904a1f712dc134206937756094de6f86daae3dfe7c668bdacad72793').rows.find(r=>r.family==='button');
check('retained actual ordinary whole CSS',()=>assert.equal(current.button_measurement.cases.find(r=>r.case_id===ordinary.case_id).actual.css,ordinary.css));
const body=json(admission.BUTTON_TOKEN_REPAIRS_REVIEW);
for(const row of body.reviews){const proof=admission.buttonTokenRepairsProof(row),entry={sha:row.sha,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',affected_branches:['21.x'],files:row.frozen_seed_paths,evidence_report:admission.BUTTON_TOKEN_REPAIRS_REVIEW,g11_claim:'not-passed',individual_proof:proof},args={entry,body,review:row,proof};
 check('frozen original handler proof '+row.sha,()=>{assert.equal(proof.button_token_repairs_source_scope.handler.sha256,'f37a4d04ad26be0a761a9815acf3de1d08fc32c90a057becb0745577ad49a437');assert.equal(proof.button_token_repairs_source_scope.handler.bytes,6221);assert.equal(admission.metadataOk(args),true);});
 for(const fault of ['body','entry','proof','root-getter'])check('metadata reject '+fault+'/'+row.sha,()=>{const value=structuredClone(args);if(fault==='body')value.body.g11_claim='passed';if(fault==='entry')value.entry.affected_branches=['main'];if(fault==='proof')value.proof.button_token_repairs_source_scope.handler.sha256=hash(readFileSync('scripts/upstream-button-token-repairs-admission.cjs'));if(fault==='root-getter')Object.defineProperty(value,'body',{enumerable:true,get(){getters++;return body;}});assert.equal(admission.metadataOk(value),false);});
}
check('immutable historical reports untouched',()=>{assert.equal(JSON.stringify(historical),prior);assert.equal(JSON.stringify(sharedHistorical),sharedPrior);});
check('no getter called',()=>assert.equal(getters,0));
console.log(JSON.stringify({result:'pass',checks_passed:checks.length,checks,finite_cases:14,original_files:9,original_hunks:14,historical_source_bindings:627,historical_shared_button_source_bindings:623,retained_actual_wholeCSS_checks:2,getter_calls:getters,shared_current_report_modeled:true,fresh_compiler_calls:0,actual_source_producer_executed:false,actual_current_tool_subject_executed:false,actual_packed_or_native_or_floor_qualified:false}));
