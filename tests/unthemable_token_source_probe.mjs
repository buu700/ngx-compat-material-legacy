/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual historical CSS, five real selector faults and exact source-boundary controls. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {compileLegacyColorSource,inspectTokenPlacementSources,measureTokenPlacementContracts,tokenPlacementFamilies} from '../scripts/measure-unthemable-token-contracts.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path));
const measured=measureTokenPlacementContracts({root}),repeat=measureTokenPlacementContracts({root});
assert.deepEqual(repeat,measured,'fresh measurements changed without source changes');
assert.equal(measured.public_legacy_default_CSS_cases.length,15);assert.equal(measured.direct_original_legacy_color_cases.length,5);
const rejected=[];
for(const family of tokenPlacementFamilies){
  const path=`projects/ngx-material-legacy/styles/legacy-${family}/_${family}-theme.scss`,body=read(path).toString();
  const changed=body.replace(/\.mat-[a-z-]+/,' .contract-selector-fault');assert.notEqual(changed,body);
  const mutant=compileLegacyColorSource({root,family,body:changed});
  const expected=measured.direct_original_legacy_color_cases.find(row=>row.case_id==='direct-legacy-color/'+family);
  assert.notEqual(mutant.css_sha256,expected.css_sha256,'actual CSS fault was invisible: '+family);
  rejected.push({id:'actual-selector-CSS/'+family,compiled:true,expected_css_sha256:expected.css_sha256,mutated_css_sha256:mutant.css_sha256});
  assert.throws(()=>inspectTokenPlacementSources({root,read:input=>input===path?Buffer.from(changed):read(input)}));
  rejected.push({id:'changed-legacy-source/'+family});
}
const facade='projects/ngx-material-legacy/_index.scss';
assert.throws(()=>inspectTokenPlacementSources({root,read:path=>path===facade?Buffer.concat([read(path),Buffer.from("\n@forward './styles/checkbox/checkbox-theme' as checkbox-* show checkbox-base;\n")]):read(path)}));
rejected.push({id:'unapproved-modern-base-export'});
const progress='projects/ngx-material-legacy/styles/progress-bar/_progress-bar-theme.scss';
assert.throws(()=>inspectTokenPlacementSources({root,read:path=>path===progress?Buffer.from(read(path).toString().replace('mat.progress-bar-overrides','mat.m2-define-palette')):read(path)}));
rejected.push({id:'changed-public-progress-bridge'});
const peer='node_modules/@angular/material/package.json';
assert.throws(()=>inspectTokenPlacementSources({root,read:path=>path===peer?Buffer.from(JSON.stringify({...JSON.parse(read(path)),version:'99.0.0'})):read(path)}));
rejected.push({id:'younger-than-advertised-Material-peer'});
const report={schema_version:1,line:measured.line,public_legacy_CSS_cases:15,direct_legacy_color_cases:5,
  repeat_measurement_identical:true,actual_selector_CSS_faults_rejected:5,rejection_controls:rejected.length,rejected,
  actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
