/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {measureM3ThemeBoundary,inspectM3ThemeBoundary,compileWarningModel,compileOriginalInspection} from '../scripts/measure-m3-theme-boundary-contracts.mjs';
import {themePrelude,parseStyleRules} from '../scripts/check-m3-inclusion-order.mjs';
const root=resolve(process.env.M3_BOUNDARY_SOURCE_ROOT??process.cwd()),read=path=>readFileSync(join(root,path));
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21x':'main';
const recorded=JSON.parse(readFileSync(new URL('../compatibility/rc/21x-c04-m3-theme-boundary-measurement-'+line+'.json',import.meta.url)));
const measured=measureM3ThemeBoundary({root});assert.deepEqual(measured,recorded);
const scope=inspectM3ThemeBoundary({root});
const condition='not $theme-ignore-duplication-warnings {',changedWarning=scope.model.replace(condition,'false {');assert.notEqual(changedWarning,scope.model);
const badWarning=compileWarningModel({root,body:changedWarning,caseId:'repeat'});
assert.notDeepEqual(badWarning.warnings,measured.historical_warning_and_density_cases[0].owned.warnings);
const inspection=scope.original.reviews[4].sections.find(s=>s.path==='src/material/core/theming/_inspection.scss').after.body;
const changedInspection=inspection.replace('(color, typography, density, base)','(color, typography, density)');assert.notEqual(changedInspection,inspection);
const badInspection=compileOriginalInspection({root,scope,inspection:changedInspection,caseId:'all'});assert.equal(badInspection.error,null);
assert.notEqual(badInspection.css,measured.original_inspection_cases.find(r=>r.case_id==='all')['after-rename'].css);
const sass=createRequire(join(root,'package.json'))('sass');
const contaminated=sass.compileString(themePrelude()+`\n.boundary { @include mat.card-theme($m3); @include mat.checkbox-theme($m3); @include legacy.legacy-card-theme($m2); @include legacy.legacy-checkbox-theme($m2); .mat-card { color: magenta; } }`,{
 importers:[{findFileUrl(url){return url==='@ngx-compat/material-legacy'?pathToFileURL(join(root,'projects/ngx-material-legacy/_index.scss')):null;}}],
 loadPaths:[join(root,'node_modules')],style:'expanded',silenceDeprecations:['if-function','global-builtin','color-functions','import'],logger:{warn(){},debug(){}},
});
assert.notDeepEqual(parseStyleRules(contaminated.css),parseStyleRules(measured.selected_card_checkbox_M2_M3_source_compile_cases.find(r=>r.case_id==='current-then-legacy').css));
let sourceRejected=0;
for(const target of ['projects/ngx-material-legacy/styles/core/theming/_theming.scss','projects/ngx-material-legacy/styles/_token-theming.scss','projects/ngx-material-legacy/_index.scss','projects/ngx-material-legacy/styles/card/_card-theme.scss','projects/ngx-material-legacy/styles/legacy-checkbox/_checkbox-theme.scss','projects/ngx-material-legacy/legacy-checkbox/checkbox.html','node_modules/@angular/material/package.json']){
 let changed;
 if(target.endsWith('package.json'))changed=Buffer.from(JSON.stringify({...JSON.parse(read(target)),version:'99.0.0'}));
 else if(target==='projects/ngx-material-legacy/_index.scss')changed=Buffer.from(read(target).toString().replace("@forward './styles/token-theming' as private-apply-*;",''));
 else changed=Buffer.concat([read(target),Buffer.from('\n')]);
 assert.throws(()=>inspectM3ThemeBoundary({root,read:path=>path===target?changed:read(path)}));sourceRejected++;
}
const report={schema_version:1,line:measured.line,historical_default_CSS_cases:16,historical_warning_and_density_cases:6,original_inspection_cases:8,coexistence_source_compile_cases:4,
 compiled_warning_faults_rejected:1,compiled_inspection_faults_rejected:1,compiled_contamination_faults_rejected:1,source_rejections:sourceRejected,fresh_measurement_matches_recorded:true,
 actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
