/** Extra model-boundary controls; no Sass, source producer or packed execution. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {insertSpinnerSnackIntoAggregateModel} from '../../scripts/sass-spinner-snack-aggregate-contract.mjs';
const root=resolve(process.argv[2]),hash=b=>createHash('sha256').update(b).digest('hex');
const results=[];let rejections=0;
for(const suffix of ['21','main']){
 const path=`compatibility/rc/parent-spinner-snack-aggregate-integration-${suffix}-v1.json`,raw=readFileSync(join(root,path)),body=JSON.parse(raw);
 for(const row of body.rows){
  const caseId=row.case_id,css=row.historical.css,expected=insertSpinnerSnackIntoAggregateModel({caseId,css});
  assert.equal(expected,row.current.css);assert.equal(hash(expected),row.modeled_sha256);
  const scope=caseId.startsWith('mixin-css/')?'sass-api-probe':'sass-argument-probe';
  const blocks=[...css.matchAll(new RegExp('\\.'+scope+' \\.mat-mdc-snack-bar-container \\{\\n[^{}]*\\n\\}','g'))].map(m=>m[0]);assert.ok(blocks.length);
  const wrong=[expected,css+'\n'+blocks[0],css.replace(blocks[0],''),css.replaceAll('.mat-mdc-snack-bar-container','.mat-mdc-unknown-container'),
   css.replace(blocks[0],blocks[0].replace(' {\n',' {\n  unknown: true;\n'))];
  for(const value of wrong){assert.equal(insertSpinnerSnackIntoAggregateModel({caseId,css:value}),null);rejections++;}
  for(const unknown of ['mixin-css/all-legacy-component-themes','mixin-css/all-component-densities','mixin-css/all-owned-component-themes','mixin-css/not-an-aggregate']){
   assert.equal(insertSpinnerSnackIntoAggregateModel({caseId:unknown,css}),null);rejections++;
  }
  results.push({line:body.line,case_id:caseId,expected_sha256:hash(expected),strict_original_fragment_rejections:9});
 }
}
const output=join(root,'compatibility/rc/parent-spinner-snack-aggregate-integration-js-controls-v1.json');
writeFileSync(output,JSON.stringify({schema_version:1,status:'finite-pure-model-controls-pass',cases:results.length,rejected_unknown_or_malformed_model_inputs:rejections,results,
 pure_model_requires_independent_old_model_authentication:true,compiler_executed_by_this_probe:false,packed_or_existing_gate_integrated:false,g11_claim:'not-passed'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({cases:results.length,rejections,packed:false}));
