/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {measureFormFieldTokenization,inspectFormFieldTokenization,compileSnapshot,FIELD_SHAS} from '../scripts/measure-form-field-tokenization-contracts.mjs';
const root=resolve(process.env.FIELD_TOKEN_REVIEW_SOURCE_ROOT??process.cwd()),read=path=>readFileSync(join(root,path));
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21x':'main';
const recorded=JSON.parse(readFileSync(new URL('../compatibility/rc/21x-c04-form-field-tokenization-measurement-'+line+'.json',import.meta.url)));
const measured=measureFormFieldTokenization({root});assert.deepEqual(measured,recorded);
const scope=inspectFormFieldTokenization({root}),rejected=[];let compiled=0,sourceRejected=0;
const type=structuredClone(scope.original.reviews[1]),mat=type.sections.find(s=>s.path==='src/material/core/tokens/m2/mat/_form-field.scss');
const old='container-text-size: typography-utils.font-size($config, body-1),';assert.ok(mat.after.body.includes(old));mat.after.body=mat.after.body.replace(old,'container-text-size: 99px,');
const badType=compileSnapshot({root,scope,row:type,side:'after',mixin:'typography'}),expectedType=measured.exact_historical_default_CSS_cases.find(r=>r.case_id==='mixin-css/form-field-typography');
assert.notEqual(badType.css_sha256,expectedType.css_sha256);compiled++;rejected.push({id:'compiled-typography-size-fault',css_sha256:badType.css_sha256});
const color=structuredClone(scope.original.reviews[0]),select=color.sections.find(s=>s.path==='src/material/form-field/_form-field-native-select.scss');
assert.ok(select.before.body.includes('prop-value($palette), 0.87'));select.before.body=select.before.body.replace('prop-value($palette), 0.87','prop-value($palette), 0.99');
const badColor=compileSnapshot({root,scope,row:color,side:'before',mixin:'color'}),expectedColor=measured.controlled_original_module_observations.find(r=>r.sha===FIELD_SHAS[0]&&r.side==='before');
assert.notEqual(badColor.css_sha256,expectedColor.css_sha256);compiled++;rejected.push({id:'compiled-native-arrow-color-fault',css_sha256:badColor.css_sha256});
const path='src/material/legacy-form-field/_form-field-theme.scss',body=scope.tagged.get(path).body,changed=body.replace('.mat-form-field-label','.contract-field-label');assert.notEqual(body,changed);
const fake={sections:[{path,after:{body:changed}}]},badLegacy=compileSnapshot({root,scope,row:fake,path,mixin:'color'});
const expectedLegacy=measured.exact_historical_default_CSS_cases.find(r=>r.case_id==='mixin-css/legacy-form-field-color');assert.notEqual(badLegacy.css_sha256,expectedLegacy.css_sha256);compiled++;rejected.push({id:'compiled-legacy-label-selector-fault',css_sha256:badLegacy.css_sha256});
const deleted='src/material/form-field/_mdc-text-field-theme-variable-refresh.scss';
assert.throws(()=>compileSnapshot({root,scope,row:scope.original.reviews[0],side:'after',path:deleted,mixin:'private-text-field-refresh-theme-variables'}),/explicitly absent original source/);
for(const target of ['projects/ngx-material-legacy/styles/form-field/_mdc-text-field-theme-variable-refresh.scss','projects/ngx-material-legacy/styles/legacy-form-field/_form-field-theme.scss','projects/ngx-material-legacy/styles/core/tokens/m2/mat/_form-field.scss','projects/ngx-material-legacy/styles/bridges/_form-field-state-overrides.scss','projects/ngx-material-legacy/styles/form-field/_form-field-theme.scss','node_modules/@angular/material/package.json']){
 let changed;
 if(target.endsWith('package.json'))changed=Buffer.from(JSON.stringify({...JSON.parse(read(target)),version:'99.0.0'}));
 else if(target.endsWith('/form-field/_form-field-theme.scss'))changed=Buffer.from(read(target).toString().replace('@include form-field-state-overrides.color(mdc-textfield.$ink-color);',''));
 else changed=Buffer.concat([read(target),Buffer.from('\n')]);
 assert.throws(()=>inspectFormFieldTokenization({root,read:path=>path===target?changed:read(path)}));sourceRejected++;
}
const report={schema_version:1,line:measured.line,historical_default_CSS_cases:5,finite_state_cases:6,original_snapshots:4,exact_typography_recipes:4,
 compiled_faults_rejected:compiled,explicit_absent_module_rejected:1,source_rejections:sourceRejected,rejected,fresh_measurement_matches_recorded:true,
 actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
