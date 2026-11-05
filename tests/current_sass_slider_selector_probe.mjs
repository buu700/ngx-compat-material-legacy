/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure report relationship and actual five-source fixture; no tool constructor/compiler. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createCurrentSassSource} from '../scripts/current-sass-source.mjs';
import {currentSassSourceSummary} from '../scripts/current-sass-inspection-scope.mjs';
import {currentSliderSelectorReportReference,currentSliderSelectorExpectedReport,currentSliderSelectorReportMatches} from '../scripts/current-sass-slider-selector-reports.mjs';
import selector from '../scripts/upstream-selector-density-admission.cjs';
import slider from '../scripts/upstream-slider-m3-repairs-admission.cjs';

const root=process.argv[2];assert.ok(root.includes('ngx-current-sass-source-test-'));
const hash=raw=>createHash('sha256').update(raw).digest('hex'),read=path=>readFileSync(join(root,path));
const source=createCurrentSassSource({root});assert.equal(source.line,'21.x');
const summary=currentSassSourceSummary(source),bound=source.bound;
// These are repeated pure report-model cases. Cache only complete identical
// metadata judgments from the real source owner; keep its physical guards at
// the boundary, and exercise late physical mutation explicitly below.
const judgments=new Map();
const qualify=ref=>{const key=JSON.stringify(ref);if(!judgments.has(key))judgments.set(key,source.qualify(ref));const selected=judgments.get(key);return selected?{...ref,sha256:selected.sha256,...(Object.hasOwn(ref,'bytes')?{bytes:selected.bytes}:{})}:structuredClone(ref);};
// This context intentionally supplies only real five-product qualification.
// Old tool rows stay historical model inputs; it does not claim current tool admission.
const modelSource={bound,summary,qualify};
const reportRefs=['selector-density','slider-m3-repairs'].map(currentSliderSelectorReportReference);
for(const ref of reportRefs){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
const sharedRef={path:'compatibility/rc/21x-c04-inspection-compatibility-source-review.json',sha256:'852cf937178ada91b0c604d349cf214cd810266af6118122c19e0dd534c55118',bytes:135386};
const sharedRaw=read(sharedRef.path);assert.equal(hash(sharedRaw),sharedRef.sha256);assert.equal(sharedRaw.length,sharedRef.bytes);
const historicalShared=JSON.parse(sharedRaw),helperPath='scripts/current-sass-slider-selector-reports.mjs',helper=read(helperPath);
const extra=[...reportRefs,sharedRef,{path:helperPath,sha256:hash(helper),bytes:helper.length}];
const union=refs=>[...new Map(refs.map(row=>[row.path,row])).values()].sort((a,b)=>a.path.localeCompare(b.path));
const checks=[],check=(name,action)=>{action();checks.push(name);};let getters=0;
for(const ref of reportRefs){
 const kind=ref.path.includes('selector-density')?'selector-density':'slider-m3-repairs',historical=JSON.parse(read(ref.path));
 const expected=structuredClone(historical);
 expected.current_source_bindings=union([...bound,...historical.current_source_bindings.map(qualify),...extra]);
 expected.current_public_bridge=structuredClone(summary);expected.public_override_boundaries=9;expected.historical_public_override_boundaries=4;
 if(kind==='slider-m3-repairs'){
  expected.shared_source_bindings=union([...bound,...historicalShared.current_source_bindings.map(qualify)]).length;
  expected.shared_measurement_inputs=historical.shared_measurement_inputs.map(qualify);
  for(const row of expected.slider_measurement.cases)row.actual.loaded_sources=row.actual.loaded_sources.map(ref=>{
   if(!ref.path.startsWith('/owned/material/'))return ref;
   const current=qualify({...ref,path:'projects/ngx-material-legacy/styles/'+ref.path.slice('/owned/material/'.length)});
   return {...ref,sha256:current.sha256,bytes:current.bytes};
  });
 }
 const args={kind,historical,historicalShared,source:modelSource,current:expected};
 check(kind+'/independent-whole-report-model',()=>assert.deepEqual(currentSliderSelectorExpectedReport(args),expected));
 check(kind+'/exact-relationship',()=>assert.equal(currentSliderSelectorReportMatches(args),true));
 const mutations={
  extra:v=>v.allowed=true,boundary:v=>v.public_override_boundaries=4,historical_boundary:v=>v.historical_public_override_boundaries=9,
  descriptor:v=>v.current_public_bridge.sources.pop(),source_hash:v=>v.current_source_bindings[0].sha256='0'.repeat(64),
  old_source_count:v=>v.current_source_bindings.pop(),compiler:v=>v.compiler='foreign',canonical:v=>v.canonical_decisions_changed=1,
 };
 if(kind==='selector-density')Object.assign(mutations,{
  caller:v=>v.selector_callers[0].calls++,extra_caller:v=>v.selector_callers.push({path:'unexpected.scss',calls:1}),
  selector_css:v=>v.selector_measurement.cases[0].owned.css+=' ',selector_program:v=>v.selector_measurement.cases[0].program+=' ',
  selector_debug:v=>v.selector_measurement.cases[0].owned.debug.push('extra'),selector_virtual:v=>v.selector_measurement.cases[0].owned.loaded_virtual_modules.push('/unexpected'),
  density_error:v=>v.density_measurement.cases.find(row=>row.id==='invalid-range').owned.error+=' ',
  density_flags:v=>v.density_measurement.cases[0].owned.debug[0]='true,true',
 });
 else Object.assign(mutations,{
  css:v=>v.slider_measurement.cases[0].actual.css+=' ',expected_css:v=>v.slider_measurement.cases[0].expected.css+=' ',
  program:v=>v.slider_measurement.cases[0].finite_family_forward_harness+=' ',loaded:v=>v.slider_measurement.cases[0].actual.loaded_sources[0].sha256='0'.repeat(64),
  shared_count:v=>v.shared_source_bindings++,shared_input:v=>v.shared_measurement_inputs[0].sha256='0'.repeat(64),
 });
 for(const[name,mutate]of Object.entries(mutations))check(kind+'/reject-'+name,()=>{const current=structuredClone(expected);mutate(current);assert.equal(currentSliderSelectorReportMatches({...args,current}),false);});
 check(kind+'/old-report-mutation-reject',()=>{const old=structuredClone(historical);old.product_changes=1;assert.equal(currentSliderSelectorReportMatches({...args,historical:old}),false);});
 check(kind+'/descriptor-getter-no-execution',()=>{const current=structuredClone(expected);Object.defineProperty(current,'compiler',{enumerable:true,get(){getters++;return expected.compiler;}});assert.equal(currentSliderSelectorReportMatches({...args,current}),false);});
 check(kind+'/late-current-metadata-reject',()=>{const current=structuredClone(expected);let once=false;const late={...modelSource,qualify(ref){if(!once){once=true;current.g11_claim='passed';}return qualify(ref);}};assert.equal(currentSliderSelectorReportMatches({...args,source:late,current}),false);});
 if(kind==='selector-density'){
  const callers=[];for(const ref of union([...bound,...historical.current_source_bindings]).filter(row=>row.path.startsWith('projects/')&&row.path.endsWith('.scss'))){const text=read(ref.path).toString(),calls=[...text.matchAll(/@include\s+sass-utils\.current-selector-or-root\s*\(/g)].length;if(calls)callers.push({path:ref.path,calls});}
  callers.sort((a,b)=>a.path.localeCompare(b.path));
  check('actual-pinned-current-selector-callers-exact20/41',()=>{assert.deepEqual(callers,historical.selector_callers);assert.equal(callers.length,20);assert.equal(callers.reduce((n,row)=>n+row.calls,0),41);});
 }
}
for(const [family,handler,prefix]of [['selector-density',selector,'SELECTOR_DENSITY'],['slider-m3-repairs',slider,'SLIDER_M3_REPAIRS']]){
 const body=JSON.parse(read(handler[prefix+'_REVIEW'])),packet=JSON.parse(read('compatibility/rc/21x-c04-'+family+'-canonical-transition.json'));
 for(const row of body.reviews){
  const proof=handler[family==='selector-density'?'selectorDensityProof':'sliderM3RepairsProof'](row),oldHandler=packet.source_members.find(ref=>ref.path==='scripts/upstream-'+family+'-admission.cjs');
  check(family+'/historical-handler-proof/'+row.sha,()=>assert.deepEqual(proof[handler[prefix+'_SCOPE_KEY']].handler,oldHandler));
  const entry={sha:row.sha,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',affected_branches:['21.x'],files:row.frozen_seed_paths,evidence_report:handler[prefix+'_REVIEW'],g11_claim:'not-passed',individual_proof:proof};
  const args={entry,body,review:row,proof};check(family+'/pure-metadata/'+row.sha,()=>assert.equal(handler.metadataOk(args),true));
  check(family+'/proof-cannot-be-current-handler/'+row.sha,()=>{const changed=structuredClone(args);changed.proof[handler[prefix+'_SCOPE_KEY']].handler.sha256=hash(read('scripts/upstream-'+family+'-admission.cjs'));assert.equal(handler.metadataOk(changed),false);});
  check(family+'/metadata-getter-reject/'+row.sha,()=>{const changed=structuredClone(args);Object.defineProperty(changed.entry,'reason',{enumerable:true,get(){getters++;return row.decision;}});assert.equal(handler.metadataOk(changed),false);});
 }
}
const target=join(root,source.transitions[2].path),before=readFileSync(target);
check('actual-late-current-source-reject-and-restoration',()=>{try{writeFileSync(target,Buffer.concat([before,Buffer.from('\n// fixture-only mutation\n')]));assert.throws(()=>source.assertCurrent());}finally{writeFileSync(target,before);}source.assertCurrent();});
check('actual-known-product-foreign-hash-reject',()=>assert.throws(()=>source.qualify({path:source.transitions[2].path,sha256:'0'.repeat(64)})));
check('zero-getters',()=>assert.equal(getters,0));
console.log(JSON.stringify({line:source.line,result:'pass',checks,checks_passed:checks.length,getter_calls:getters,actual_five_module_source_fixture:true,
 report_relationship_modeled_only:true,current_C04_tool_constructor_executed:false,actual_source_producers_or_handlers_executed:false,
 compiler_calls:0,original_CSS_program_error_debug_unchanged:true,historical_source_rows:{selector:619,slider:638},
 selector_caller_modules:20,selector_calls:41,current_public_boundaries:9,historical_public_boundaries:4,
 artifact_or_audit_credit:false,g11_claim:'not-passed'}));
