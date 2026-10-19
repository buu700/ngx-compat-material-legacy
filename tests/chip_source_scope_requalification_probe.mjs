/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectSourceScopeRequalification,sourceScopeWrites,sourceScopePrior,
  validateSourceScopes,SOURCE_SCOPE_PREFIX} from '../scripts/chip-source-scope-requalification.mjs';
import {historicalRippleAuthoredReader} from '../scripts/ripple-global-options-integration.mjs';
import {chipFocusNativeDefinitions} from '../scripts/chip-focus-native-requalification.mjs';
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex');
const qualification=inspectSourceScopeRequalification({read:historicalRippleAuthoredReader()}),prior=sourceScopePrior(read);
const entries=JSON.parse(read(prior.ledger_path)).entries,controls=[];
function overridden(path,bytes){return p=>p===path?Buffer.from(bytes):read(p);}
function rejected(name,subject,reader=read,changedEntries=entries) {
  const result=validateSourceScopes({read:reader,entries:changedEntries,selected:[subject]});
  assert.equal(result.length,1);assert.equal(result[0].ok,false,name);controls.push(name);
}
const families=[...new Set(prior.selected.map(s=>s.reason))];assert.equal(families.length,7);
for(const family of families) {
  const subject=prior.selected.find(s=>s.reason===family),entry=entries.find(e=>e.sha===subject.sha);
  const body=JSON.parse(read(entry.evidence_report));
  if(family==='invalid-slider-thumb-destroy-scope')body.diff_sha256='0'.repeat(64);
  else if(family==='invalid-test-consolidation-scope'||family==='invalid-test-import-cleanup-scope')
    body.reviews[0].source_analysis.diff_sha256='0'.repeat(64);
  else body.reviews[0].diff_sha256='0'.repeat(64);
  const raw=JSON.stringify(body),next=structuredClone(entries),row=next.find(e=>e.sha===entry.sha);
  if(row.source_check?.evidence_report_sha256)row.source_check.evidence_report_sha256=hash(raw);
  rejected('resealed original patch/analysis tamper: '+family,subject,overridden(entry.evidence_report,raw),next);
}
const sourceCases=[
  ['invalid-build-scope','projects/ngx-material-legacy/legacy-chips/chip.ts',s=>s+'\n// unreviewed source\n'],
  ['invalid-slider-input-scope','projects/ngx-material-legacy/legacy-slider/slider.html',s=>s+'\n<input matSliderThumb>\n'],
  ['invalid-slider-range-followup-scope','projects/ngx-material-legacy/legacy-slider/slider.html',s=>s+'\n<input matSliderStartThumb>\n'],
  ['invalid-slider-thumb-destroy-scope','projects/ngx-material-legacy/legacy-slider/slider.ts',s=>s+'\n// mat-slider-visual-thumb\n'],
  ['invalid-test-consolidation-scope','testing/legacy-runner/historical-inventory.json',s=>s+'\n'],
  ['invalid-test-import-cleanup-scope','testing/legacy-runner/historical-inventory.json',s=>s+'\n'],
  ['invalid-bazel-build-only-scope','scripts/pack-library.mjs',s=>s+'\n// unreviewed Bazel builder\n'],
];
for(const [reason,path,mutate]of sourceCases)
  rejected('raw current source tamper: '+reason,prior.selected.find(s=>s.reason===reason),overridden(path,mutate(read(path).toString())));
const consolidation=prior.selected.find(s=>s.reason==='invalid-test-consolidation-scope');
const ce=entries.find(e=>e.sha===consolidation.sha),cb=JSON.parse(read(ce.evidence_report));
const buildBytes=read(cb.candidate_context.path),alias='compatibility/rc/unreviewed-build-alias.json';
cb.candidate_context.path=alias;const cr=JSON.stringify(cb),altered=structuredClone(entries);
altered.find(e=>e.sha===ce.sha).source_check.evidence_report_sha256=hash(cr);
rejected('unregistered consolidation context path',consolidation,p=>p===alias?buildBytes:p===ce.evidence_report?Buffer.from(cr):read(p),altered);
for(const path of [
  ...prior.approved_product_delta.map(m=>m.path),
  'projects/ngx-material-legacy/legacy-slider/slider.scss',
  prior.reports[0].path,prior.authored_members[0].path,
]) {
  assert.throws(()=>sourceScopeWrites({read:historicalRippleAuthoredReader({read:overridden(path,Buffer.concat([read(path),Buffer.from('\n')]))})}));
  controls.push('snapshot builder refuses unknown bytes: '+path);
}
assert.throws(()=>sourceScopePrior(overridden(SOURCE_SCOPE_PREFIX+'prior.json.gz',Buffer.concat([read(SOURCE_SCOPE_PREFIX+'prior.json.gz'),Buffer.from('\n')]))));
controls.push('changed immutable prior');
const native=await chipFocusNativeDefinitions({requireNoCoordinator:true});
assert.equal(native.length,prior.line==='main'?34:33);
const result={...qualification,rejection_controls:controls.length,controls,
  native_profiles_requiring_coordinator:native.length,all_native_requirements_unchanged:true,
  actual_native_browser_or_floor_execution:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({line:prior.line,subjects:qualification.source_subjects.length,
  rejection_controls:controls.length,native_profiles_requiring_coordinator:native.length,
  actual_native_browser_or_floor_execution:false}));
