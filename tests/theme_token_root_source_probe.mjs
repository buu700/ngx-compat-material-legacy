/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {rootSubjects,inspectThemeRootSources,compileOriginalTheme,assertTokenRootRelocation,measureThemeTokenRoots} from '../scripts/measure-theme-token-root-contracts.mjs';
import {compileLegacyColorSource} from '../scripts/measure-unthemable-token-contracts.mjs';
const root=resolve(process.env.THEME_ROOT_REVIEW_SOURCE_ROOT??process.cwd()),read=path=>readFileSync(join(root,path));
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21x':'main';
const recorded=JSON.parse(readFileSync(new URL('../compatibility/rc/21x-c04-theme-token-root-measurement-'+line+'.json',import.meta.url)));
const actual=measureThemeTokenRoots({root});assert.deepEqual(actual,recorded);
const inspected=inspectThemeRootSources({root}),rejected=[];let compiledFaults=0,sourceRejections=0;
for(const subject of rootSubjects){
 const section=inspected.original.reviews.find(row=>row.sha===subject.sha).sections[0],selector='.theme-root-scope';
 const before=compileOriginalTheme({root,family:subject.family,body:section.before.body,mixin:'color',selector});
 const wrapperFault=section.after.body.replaceAll('@include sass-utils.current-selector-or-root() {','.mat-mdc-'+subject.family+' {');
 assert.notEqual(wrapperFault,section.after.body);
 const misplaced=compileOriginalTheme({root,family:subject.family,body:wrapperFault,mixin:'color',selector});
 assert.throws(()=>assertTokenRootRelocation({before,after:misplaced,family:subject.family,selector}));compiledFaults++;
 rejected.push({id:'compiled-original-selector-fault/'+subject.family,css_sha256:misplaced.css_sha256});
 const include=subject.family==='card'?'@include mdc-elevated-card-theme.theme($mdc-elevated-card-color-tokens);':'@include mdc-plain-tooltip-theme.theme($mdc-tooltip-color-tokens);';
 const badValues=section.after.body.replace(include,'--contract-token-value-fault: 1;');assert.notEqual(badValues,section.after.body);
 const incorrect=compileOriginalTheme({root,family:subject.family,body:badValues,mixin:'color',selector});
 assert.throws(()=>assertTokenRootRelocation({before,after:incorrect,family:subject.family,selector}));compiledFaults++;
 rejected.push({id:'compiled-original-token-value-fault/'+subject.family,css_sha256:incorrect.css_sha256});
 const legacy=`projects/ngx-material-legacy/styles/legacy-${subject.family}/_${subject.family}-theme.scss`,legacyBody=read(legacy).toString();
 const changedLegacy=legacyBody.replace(/\.mat-[a-z-]+/,'.contract-selector-fault');assert.notEqual(changedLegacy,legacyBody);
 const legacyFault=compileLegacyColorSource({root,family:subject.family,body:changedLegacy});
 const expected=actual.shared_historical_legacy_measurement.direct_original_legacy_color_cases.find(row=>row.case_id==='direct-legacy-color/'+subject.family);
 assert.notEqual(legacyFault.css_sha256,expected.css_sha256);compiledFaults++;
 rejected.push({id:'compiled-legacy-selector-fault/'+subject.family,css_sha256:legacyFault.css_sha256});
 assert.throws(()=>inspectThemeRootSources({root,read:path=>path===legacy?Buffer.from(changedLegacy):read(path)}));sourceRejections++;
 const modern=`projects/ngx-material-legacy/styles/${subject.family}/_${subject.family}-theme.scss`;
 assert.throws(()=>inspectThemeRootSources({root,read:path=>path===modern?Buffer.from(read(path).toString().replace('.mat-mdc-'+subject.family,'html')):read(path)}));sourceRejections++;
}
for(const target of ['projects/ngx-material-legacy/styles/core/style/_sass-utils.scss','projects/ngx-material-legacy/_index.scss','node_modules/@angular/material/package.json']){
 let changed;
 if(target.endsWith('package.json'))changed=Buffer.from(JSON.stringify({...JSON.parse(read(target)),version:'99.0.0'}));
 else if(target.endsWith('_index.scss'))changed=Buffer.concat([read(target),Buffer.from('\n// card-base\n')]);
 else changed=Buffer.from(read(target).toString().replace('@at-root #{& or $root}','@at-root html'));
 assert.notEqual(changed.toString(),read(target).toString());
 assert.throws(()=>inspectThemeRootSources({root,read:path=>path===target?changed:read(path)}));sourceRejections++;
}
const report={schema_version:1,line:actual.line,original_selector_cases:actual.original_module_selector_observations.length,
 observable_selector_cases:actual.original_module_selector_observations.filter(row=>row.observable_token_emission).length,
 untouched16_modern_reference_cases:actual.pre_patch_modern_calls_equal_untouched16_source.length,
 shared_legacy_default_CSS_cases:actual.shared_historical_legacy_measurement.public_legacy_default_CSS_cases.length,
 selected_legacy_default_CSS_cases:6,actual_compiled_faults_rejected:compiledFaults,source_rejections:sourceRejections,rejected,
 fresh_measurement_matches_recorded:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
assert.equal(compiledFaults,6);assert.equal(sourceRejections,7);
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
