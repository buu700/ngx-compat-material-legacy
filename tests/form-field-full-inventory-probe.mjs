/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
// Synthetic source-bound fixture on a physical 4015 historical source image.
// It is not an artifact or current-source qualification.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const root=process.cwd(),load=p=>import('file://'+root+'/scripts/'+p),input=JSON.parse(readFileSync(0,'utf8')),hash=x=>createHash('sha256').update(x).digest('hex'),read=p=>JSON.parse(readFileSync(root+'/'+p)),sass=createRequire(root+'/package.json')('sass');
const {compareInventory}=await load('sass-api-inventory.mjs');const {createOrdinaryControlGateContext}=await load('sass-ordinary-control-gate.mjs');const {createSpinnerSnackGateContext}=await load('sass-spinner-snack-gate-integration.mjs');const {createOrdinaryCardGateContext}=await load('sass-ordinary-card-gate.mjs');
const {createOrdinaryDensityGateContext,ordinaryDensityGateDescriptor}=await load('sass-ordinary-density-gate.mjs');const {measureOrdinaryDensityPeer}=await load('sass-ordinary-density-peer.mjs');const {composeOrdinaryAggregateDensity}=await load('sass-ordinary-aggregate-composition.mjs');const {defaultAggregateExpectedCss}=await load('sass-default-aggregate-contract.mjs');
const {insertSpinnerSnackIntoAggregateModel}=await load('sass-spinner-snack-aggregate-contract.mjs');const {insertOrdinaryCheckboxButtonIntoAggregateModel}=await load('sass-ordinary-aggregate-contract.mjs');const {insertCardIntoAggregateModel}=await load('current-sass-card-aggregate-contract.mjs');
const {createPrivateCardGateContext,privateCardGateDescriptor}=await load('sass-private-card-gate.mjs');const {createPrivateCardContext,privateCardExpectedCss}=await load('private-card-composition.mjs');const {createCurrentSpinnerSnackContract}=await load('current-sass-spinner-snack-contract.mjs');
const ordinaryControlContext=createOrdinaryControlGateContext({root:input.controlRoot}),spinnerSnackContext=createSpinnerSnackGateContext({root:input.spinnerRoot}),ordinaryCardContext=createOrdinaryCardGateContext({root:input.cardRoot}),ordinaryDensityContext=createOrdinaryDensityGateContext({root:input.spinnerRoot}),privateCardContext=createPrivateCardGateContext({root:input.spinnerRoot});
const oracle=read('compatibility/rc/oracles/material-16.2.14-sass-api.json'),css={};for(const [name,e] of Object.entries(oracle.members.mixins))if(e.invocation.invocable)css[name]={css:'',sha256:e.invocation.css_sha256};
for(const b of [...input.control,...input.spinner,...input.card].filter(b=>b.case_id.startsWith('mixin-css/'))){const actual=b.actual_measurement??b.actual;css[b.case_id.slice(10)]={...b,css:actual.css,sha256:actual.css_sha256,actual_measurement:actual};}
for(const id of ['mixin-css/all-component-colors','mixin-css/all-component-themes']){
 const g=css[id.slice(10)],before=defaultAggregateExpectedCss(id,g.current_companion.peer),sp=insertSpinnerSnackIntoAggregateModel({caseId:id,css:before}),ord=insertOrdinaryCheckboxButtonIntoAggregateModel({caseId:id,css:sp}),complete=insertCardIntoAggregateModel({caseId:id,css:ord});
 if(typeof complete!=='string')throw Error('aggregate model failed');g.css=complete;g.sha256=hash(complete);g.actual_measurement={...g.actual_measurement,css:complete,css_sha256:hash(complete),css_bytes:Buffer.byteLength(complete)};
}
const form=read('fixtures/sass/form-field-state-contracts.json'),ff=read('tests/form_field_state_contract_fixture.json'),{FORM_FIELD_STATE_CONTRACT,formFieldStateExpectedCss}=await load('sass-form-field-state-contract.mjs');
const baseline=createCurrentSpinnerSnackContract({root:input.spinnerRoot}),sources=Object.values(baseline.source_sets)[0],line='main',measured=css=>({css,css_sha256:hash(css),css_bytes:Buffer.byteLength(css)}),base=root+'/node_modules/@angular/';
const id='mixin-css/all-component-densities',d=read('fixtures/sass/default-aggregate-contracts.json'),df=read('tests/sass_default_aggregate_fixture.json'),e=d.cases[id],peer={...df.peers[e.profile+'-main'],sources:d.peer_inputs.main.sources},prior=defaultAggregateExpectedCss(id,peer),dc=composeOrdinaryAggregateDensity({caseId:id,css:prior}),dp=measureOrdinaryDensityPeer({sass,materialRoot:base+'material',cdkRoot:base+'cdk',caseId:id,line}),dm={...measured(dc),program_sha256:e.program_sha256,sources,line,sass_version:sass.info};css[id.slice(10)]={css:dc,sha256:hash(dc),actual_measurement:dm,current_companion:{classification:'conforming-current-companion',contract:'historical-default-aggregate-with-qualified-public-members',peer},current_ordinary_density:ordinaryDensityGateDescriptor(ordinaryDensityContext,dp)};
const pi='mixin-css/private-check-duplicate-theme-styles',o=read('compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json'),original=o.cases.find(r=>r.case_id==='mixin-css/card-theme').original.css.replaceAll('.sass-api-probe ','').replace('}\n.mat-mdc-card','}\n\n.mat-mdc-card');if(hash(original)!==oracle.members.mixins[pi.slice(10)].invocation.css_sha256)throw Error('private original mismatch');
const programHash='f74770ded45c82a9caa9ae8b630ffb39aafa7a6bd1b2050004ba5e46a4776c7d',refs=Object.values(read('compatibility/rc/original16-sass-source-diagnostic-identity.json').loaded_source_sets)[0],pc=createPrivateCardContext({root:input.spinnerRoot,line}),actual=privateCardExpectedCss(pc,original),orig={...measured(original),program_sha256:programHash,sources:refs},pa={...measured(actual),line,sass_version:sass.info,program_sha256:programHash,sources},prov=read('reference/material-16.2.14/PROVENANCE.json').isolated_environment,lock=read('reference/material-16.2.14/environment-package-lock.json'),oraw=readFileSync(root+'/compatibility/rc/oracles/material-16.2.14-sass-api.json'),lraw=readFileSync(root+'/reference/material-16.2.14/environment-package-lock.json'),identity={material_version:'16.2.14',material_manifest_sha256:prov.material_manifest_sha256,lock_sha256:hash(lraw),material_integrity:lock.packages['node_modules/@angular/material'].integrity,catalog:'compatibility/rc/oracles/material-16.2.14-sass-api.json',catalog_sha256:hash(oraw),sass_version:sass.info,expected_source:'untouched-installed-material16',candidate_source:'packed-facade'};
css[pi.slice(10)]={css:actual,sha256:hash(actual),actual_measurement:pa,expected:orig,identity,current_private_card:privateCardGateDescriptor(privateCardContext),comparison:'historical-private-card-with-public-peer-overrides',error:null,mutation_rejected:true,mutation:measured(actual+'\n.wrong-nonempty-mixin { color: red; }\n')};
const opts={ordinaryControlContext,spinnerSnackContext,ordinaryCardContext,ordinaryDensityContext,privateCardContext};
const compare=value=>compareInventory(oracle,oracle.members,value,opts);
// The non-form capsules are historical main fixtures in both synthetic lanes.
// The 21.x lane exercises dispatcher transport of recorded 21.x form receipts;
// it is deliberately mixed synthetic data, never 21.x peer or branch evidence.
for(const formLine of ['main','21.x']){
 const lane={...css};
 for(const [id,e]of Object.entries(form.cases).filter(([,e])=>e.kind==='default')){
  const peer={...ff.peers[formLine][id],sources:form.peer_inputs[formLine]},c=formFieldStateExpectedCss(id,e.original,peer);
  const m={...ff.measurements[formLine][id],css:c,css_sha256:hash(c),css_bytes:Buffer.byteLength(c),sources:ff.source_sets[formLine]};
  lane[id.slice(10)]={css:c,sha256:hash(c),actual_measurement:m,current_companion:{classification:'conforming-current-companion',contract:FORM_FIELD_STATE_CONTRACT,peer}};
 }
 const results=compare(lane);assert.equal(results.length,651);assert.deepEqual(results.filter(r=>r.result!=='pass').map(r=>r.case_id),[]);
 for(const id of ['mixin-css/form-field-color','mixin-css/form-field-theme']){
  const name=id.slice(10),g=lane[name],wrong=g.css.replace('--mat-form-field-filled-caret-color:','color: red;\n  --mat-form-field-filled-caret-color:');
  assert.notEqual(wrong,g.css);const m={...g.actual_measurement,css:wrong,css_sha256:hash(wrong),css_bytes:Buffer.byteLength(wrong)};
  const changed={...lane,[name]:{...g,css:wrong,sha256:hash(wrong),actual_measurement:m}};
  assert.deepEqual(compare(changed).filter(r=>r.result!=='pass').map(r=>r.case_id),[id]);
 }
 assert.deepEqual(compare(lane).filter(r=>r.result!=='pass').map(r=>r.case_id),[]);
}
console.log(JSON.stringify({result:'pass',cases:651,synthetic_form_lanes:['main','21.x'],mutants_per_lane:2,recovered:true,scope:'historical main gate fixtures; 21.x form lane is mixed synthetic transport, not peer or artifact qualification'}));
