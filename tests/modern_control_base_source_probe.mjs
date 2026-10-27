/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {retentionSubjects,compileRetainedLegacyColor,inspectLegacyThemeRetention,measureLegacyThemeRetention} from '../scripts/measure-legacy-theme-retention.mjs';
const root=resolve(process.argv[3]??process.env.MODERN_CONTROL_REVIEW_SOURCE_ROOT??process.cwd()),read=path=>readFileSync(join(root,path));
const measured=measureLegacyThemeRetention({root}),repeat=measureLegacyThemeRetention({root});
assert.deepEqual(repeat,measured,'fresh measurements changed without source changes');
assert.equal(measured.public_legacy_default_CSS_cases.length,12);assert.equal(measured.direct_original_legacy_color_cases.length,4);
const rejected=[];
for(const subject of retentionSubjects){
  const paths=measured.subjects.find(row=>row.sha===subject.sha).paths;
  const body=read(paths.legacy).toString(),changed=body.replace(/\.mat-[a-z-]+/,'.contract-selector-fault');
  assert.notEqual(changed,body);
  const mutant=compileRetainedLegacyColor({root,family:subject.family,body:changed});
  const expected=measured.direct_original_legacy_color_cases.find(row=>row.case_id==='direct-legacy-color/'+subject.family);
  assert.notEqual(mutant.css_sha256,expected.css_sha256,'compiled CSS fault invisible: '+subject.family);
  rejected.push({id:'actual-selector-CSS/'+subject.family,compiled:true,expected_css_sha256:expected.css_sha256,mutated_css_sha256:mutant.css_sha256});
  assert.throws(()=>inspectLegacyThemeRetention({root,read:path=>path===paths.legacy?Buffer.from(changed):read(path)}));
  rejected.push({id:'changed-legacy-source/'+subject.family});
  assert.throws(()=>inspectLegacyThemeRetention({root,read:path=>path===paths.modern?Buffer.concat([read(path),Buffer.from('\n@mixin base($theme) {}\n')]):read(path)}));
  rejected.push({id:'post16-modern-base-source/'+subject.family});
  const original=read(paths.structural).toString(),changedStructure=original.replace(/\.mat-[a-z-]+/,'.contract-structure-fault');
  assert.notEqual(changedStructure,original);
  assert.throws(()=>inspectLegacyThemeRetention({root,read:path=>path===paths.structural?Buffer.from(changedStructure):read(path)}));
  rejected.push({id:'changed-historical-structure/'+subject.family});
}
const facade='projects/ngx-material-legacy/_index.scss';
assert.throws(()=>inspectLegacyThemeRetention({root,read:path=>path===facade?Buffer.concat([read(path),Buffer.from('\n// fab-base\n')]):read(path)}));
rejected.push({id:'unapproved-base-facade'});
const peer='node_modules/@angular/material/package.json';
assert.throws(()=>inspectLegacyThemeRetention({root,read:path=>path===peer?Buffer.from(JSON.stringify({...JSON.parse(read(path)),version:'99.0.0'})):read(path)}));
rejected.push({id:'younger-than-advertised-Material-peer'});
let seen=0;
assert.throws(()=>inspectLegacyThemeRetention({root,read:path=>path===facade&&++seen>1?Buffer.concat([read(path),Buffer.from('\n')]):read(path)}));
rejected.push({id:'late-source-change'});
const report={schema_version:1,line:measured.line,public_legacy_CSS_cases:12,direct_legacy_color_cases:4,
  repeat_measurement_identical:true,actual_selector_CSS_faults_rejected:4,rejection_controls:rejected.length,rejected,
  actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
assert.equal(rejected.length,19);
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
