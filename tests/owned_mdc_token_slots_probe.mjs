/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Genuine token-map faults must fail the untouched reference test logic. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {ownedMdcTokenValidationInputs,compileOwnedMdcTokenValidation,measureOwnedMdcTokenSlots} from '../scripts/measure-owned-mdc-token-slots.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const inputs=ownedMdcTokenValidationInputs({root}),measurement=measureOwnedMdcTokenSlots({root});
assert.equal(measurement.reference_cases,19);assert.equal(measurement.original_changed_contracts_present,2);
assert.equal(measurement.recorded_vendor_members_matched,119);assert.equal(measurement.compiled.executed_case_ids.length,19);
assert.equal(measurement.consumer_archived_import_negative.result,'pass');assert.equal(measurement.compiled.css_bytes,0);
assert.deepEqual(measureOwnedMdcTokenSlots({root}),measurement,'repeat source measurement differs');
const rejected=[],marker='  $x: mdc-validate.theme-styles($reference, $slots);';
assert.equal(inputs.source.split(marker).length,2);
for(const [component,token]of [['m2.mdc.filled-text-field','container-color'],['m2.mdc.outlined-text-field','outline-color']]){
  for(const fault of ['missing','unexpected']){
    const mutation=fault==='missing'?`map.remove($slots, ${token})`:'map.set($slots, ngx-unexpected-token, true)';
    const source=inputs.source.replace(marker,`  @if $component == '${component}' { $slots: ${mutation}; }\n`+marker);
    const expected=fault==='missing'?new RegExp('required tokens are missing: '+token):/tokens are invalid: ngx-unexpected-token/;
    assert.throws(()=>compileOwnedMdcTokenValidation({root,source,slots:inputs.slots}),expected,component+':'+fault);
    rejected.push(component+':'+fault);
  }
}
const omitted=inputs.source.replace(/@include validate-slots\(\s*\$component: 'm2\.mdc\.filled-text-field',[\s\S]*?\n\);\n/,'');
assert.notEqual(omitted,inputs.source);
assert.throws(()=>compileOwnedMdcTokenValidation({root,source:omitted,slots:inputs.slots}),/tagged slot case roster changed/);
rejected.push('omitted-required-added-contract');
const members=['compatibility/rc/21x-c04-token-test-build-originals.json.gz','compatibility/vendored-sass-manifest.json',
  'reference/material-16.2.14/environment-package-lock.json','projects/ngx-material-legacy/package.json',
  'package.json','projects/ngx-material-legacy/styles/vendor/mdc/theme/_validate.scss'];
for(const path of members){
  const corrupt=raw=>{
    if(path==='projects/ngx-material-legacy/package.json'||path==='package.json'){
      const value=JSON.parse(raw),field=path==='package.json'?'devDependencies':'dependencies';
      value[field]['@material/textfield']='15.0.0-canary.bc9ae6c9c.0';return Buffer.from(JSON.stringify(value));
    }
    return Buffer.concat([raw,Buffer.from(' ')]);
  };
  assert.throws(()=>measureOwnedMdcTokenSlots({root,read:name=>name===path?corrupt(read(name)):read(name)}),undefined,path);
  rejected.push('changed-input:'+path);
}
for(const ref of [...measurement.input_members,measurement.producer])assert.equal(hash(read(ref.path)),ref.sha256,'changed original source or oracle '+ref.path);
const report={schema_version:1,line:'21.x',authentic_reference_cases_executed:19,original_added_contracts_executed:2,
  actual_Sass_slot_faults_rejected:4,omitted_required_case_rejected:true,input_faults_rejected:6,rejection_controls:rejected.length,rejected,
  owned_loaded_sources:measurement.compiled.loaded_sources.length,recorded_vendor_members_matched:119,
  no_consumer_CSS_emitted:measurement.compiled.css_bytes===0,consumer_archived_import_rejected:true,
  original_source_and_oracle_bytes_rechecked:true,product_or_consumer_files_written:0,
  repeat_measurement_identical:true,
  full_651_Sass_rendered_packed_native_floor_or_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify({report,measurement},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
