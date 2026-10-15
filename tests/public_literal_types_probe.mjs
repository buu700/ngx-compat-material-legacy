/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Type/erasure boundary only; partial fixtures confer no whole-peer/component credit. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {preparePublicLiteralTypes,checkPublicLiteralDomains,reviewPublicLiteralUses,inspectPublicLiteralSource} from '../scripts/public-literal-types-use-review.mjs';
const root=resolve('.'),read=path=>readFileSync(join(root,path)),model=preparePublicLiteralTypes({root});
const baseline=reviewPublicLiteralUses({root,model});
assert.equal(baseline.cases.filter(c=>c.population==='frozen').length,10);
assert.equal(baseline.cases.filter(c=>c.population==='current').length,11);
assert.equal(baseline.files.length,16);assert.equal(baseline.models.length,33);
assert.equal(baseline.files.filter(f=>f.targets).reduce((n,f)=>n+f.targets.length,0),9);
assert.deepEqual(baseline.cases.filter(c=>c.unused_binding).map(c=>[c.file,c.symbol]),[['legacy-tooltip/internal/tooltip-base.ts','TooltipVisibility']]);
assert.deepEqual(baseline.domains,{positives:108,negatives:195,assignments:44,equalities:22,strict:true,skip_lib_check:false,fixture_sha256:baseline.domains.fixture_sha256});
let negatives=0;
for(const target of model.models.filter(m=>m.line===baseline.line)) {
  const bad=structuredClone(model.models);bad.find(m=>m.line===target.line&&m.module===target.module&&m.symbol===target.symbol).body+=" | 'not-historical-state'";
  assert.throws(()=>checkPublicLiteralDomains(bad,root));negatives++;
}
const nonliteral=structuredClone(model.models);nonliteral.find(m=>m.line===baseline.line).body='string';
assert.throws(()=>checkPublicLiteralDomains(nonliteral,root));negatives++;
const forged=structuredClone(model);forged.models[0].body+=" | 'forged'";
assert.throws(()=>reviewPublicLiteralUses({root,model:forged}));negatives++;
const capsule='compatibility/rc/public-literal-types-declaration-subjects.json';
for(const mutate of [b=>b.subjects[0].line='foreign',b=>b.packages[0].archive_sri_verified=false]) {
  const bad=JSON.parse(read(capsule));mutate(bad);
  assert.throws(()=>preparePublicLiteralTypes({root,readMember:path=>path===capsule?Buffer.from(JSON.stringify(bad)):read(path)}));negatives++;
}
const stored=model.inputs.find(p=>p.path.endsWith('.gz')).path,badStored=Buffer.from(read(stored));badStored[4]^=1;
assert.throws(()=>preparePublicLiteralTypes({root,readMember:path=>path===stored?badStored:read(path)}));negatives++;
const fileKey=c=>JSON.stringify([c.file,c.module,c.symbol]);
function inspect(path,text) {
  const result=inspectPublicLiteralSource({root,filePath:path,uses:baseline.cases,prepared:model,line:baseline.line,readSource:p=>p===path?text:read(p).toString()});
  const expected=baseline.cases.filter(c=>'projects/ngx-material-legacy/'+c.file===path);
  assert.deepEqual(result.cases.map(fileKey).sort(),expected.map(fileKey).sort());return result;
}
const barPath='projects/ngx-material-legacy/legacy-progress-bar/progress-bar.ts',bar=read(barPath).toString();
const tooltipPath='projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts',tooltip=read(tooltipPath).toString();
const surfacePath='projects/ngx-material-legacy/legacy-tooltip/public-api.ts',surface=read(surfacePath).toString();
for(const [id,path,text,original] of [
  ['runtime-mode',barPath,bar+'\nconst modeValue=ProgressBarMode;\n',bar],
  ['generic-mode',barPath,bar.replace('mode: ProgressBarMode','mode: ProgressBarMode<unknown>'),bar],
  ['lost-annotation',barPath,bar.replace('mode: ProgressBarMode','mode: string'),bar],
  ['duplicate-mode-import',barPath,bar+"\nimport {ProgressBarMode as ExtraMode} from '@angular/material/progress-bar';\n",bar],
  ['renamed-public-alias',surfacePath,surface.replace('TooltipPosition as LegacyTooltipPosition','TooltipPosition as DifferentTooltipPosition'),surface],
  ['foreign-public-module',surfacePath,surface.replaceAll("from '@angular/material/tooltip'","from '@angular/material/progress-bar'"),surface],
  ['runtime-previously-unused-visibility',tooltipPath,tooltip+'\nconst visibleValue=TooltipVisibility;\n',tooltip],
]) {assert.notEqual(text,original,id);assert.throws(()=>inspect(path,text),undefined,id);negatives++;}
const renamed=tooltip.replace(/\bTooltipPosition\b/g,'PositionAlias').replace('  PositionAlias,','  TooltipPosition as PositionAlias,');
assert.notEqual(renamed,tooltip);const alias=inspect(tooltipPath,renamed);
assert.equal(alias.cases.find(c=>c.symbol==='TooltipPosition').local_name,'PositionAlias');
assert.equal(alias.file.emit_sha256,baseline.files.find(f=>f.file===tooltipPath).emit_sha256);
assert.equal(negatives,23);
const result={...baseline,negative_controls_rejected:negatives,import_alias_positive:true,complete_component_or_barrel_qualified:false,
  native_or_packed_or_compiler_floor_executed:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:baseline.line,aliases:11,alias_subjects:33,frozen_uses:10,current_uses:11,files:16,
  strict_positive_assignments:108,strict_negative_assignments:195,bidirectional_assignments:44,strict_equalities:22,
  historical_public_aliases:9,negative_controls:negatives,import_alias_positive:true,
  complete_component_or_barrel_or_native_or_packed_qualified:false,g11_claim:'not-passed'}));
