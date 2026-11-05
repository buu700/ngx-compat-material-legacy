/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {verifySelectorDensityOriginals,reviewSelectorDensitySource,measureSelectorHelper,measureLegacyDensity,sassDeclaration} from '../scripts/upstream-selector-density-source-review.mjs';
import {assertCurrentSliderSelectorTestSources} from './current_sass_slider_selector_sources.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=raw=>createHash('sha1').update('blob '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const original=JSON.parse(gunzipSync(read('compatibility/rc/21x-c04-selector-density-originals-complete-context.json.gz')));
const census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz'))),rejected=[];
const facts=verifySelectorDensityOriginals(original,census);assert.equal(facts.original_files,4);assert.equal(facts.original_hunks,5);
for(const fault of ['unknown-sha','missing-file','missing-hunk','changed-commit','changed-diff','omitted-seed','forged-tag','deleted-after-present','missing-absence','changed-disabled-test']){
 const data=structuredClone(original),first=data.reviews[0];
 if(fault==='unknown-sha')first.sha='0'.repeat(40);
 if(fault==='missing-file')first.sections.shift();
 if(fault==='missing-hunk')first.sections[0].hunks.pop();
 if(fault==='changed-commit')first.raw_commit+=' ';
 if(fault==='changed-diff'){first.diff+='\n';first.diff_sha256=hash(first.diff);}
 if(fault==='omitted-seed')first.frozen_seed_paths.pop();
 if(fault==='forged-tag'){const m=data.tagged_reference.members[0];m.body+='\n';m.bytes=Buffer.byteLength(m.body);m.sha256=hash(m.body);m.blob=gitHash(m.body);}
 if(fault==='deleted-after-present')data.reviews[1].sections[0].after.absent=false;
 if(fault==='missing-absence')delete data.reviews[1].sections[0].after.absent;
 if(fault==='changed-disabled-test'){const m=first.sections[1].after;m.body=m.body.replace('// expect(hasDensityStyles', 'expect(hasDensityStyles');m.bytes=Buffer.byteLength(m.body);m.sha256=hash(m.body);m.blob=gitHash(m.body);}
 assert.throws(()=>verifySelectorDensityOriginals(data,census),undefined,fault);rejected.push('original/'+fault);
}
const tagged=Object.fromEntries(original.tagged_reference.members.map(m=>[m.path.replace('src/material/',''),m.body]));
const owned=Object.fromEntries(Object.keys(tagged).map(path=>[path,read('projects/ngx-material-legacy/styles/'+path).toString()]));
assert.equal(sassDeclaration(original.reviews[0].sections[0].before.body,'mixin','current-selector-or-root'),sassDeclaration(tagged['core/style/_sass-utils.scss'],'mixin','current-selector-or-root'));
const utils='core/style/_sass-utils.scss',density='core/density/private/_compatibility.scss',theming='core/theming/_theming.scss',variables='legacy-paginator/_paginator-variables.scss';
for(const fault of ['wrong-root','reviewed-conditional-substitution','discarded-content','wrong-selector']){
 let source=owned[utils];
 if(fault==='wrong-root')source=source.replace('$root: html','$root: body');
 if(fault==='reviewed-conditional-substitution')source=source.replace(sassDeclaration(source,'mixin','current-selector-or-root'),sassDeclaration(original.reviews[0].sections[0].after.body,'mixin','current-selector-or-root'));
 if(fault==='discarded-content')source=source.replace('@content;','--mutant: true;');
 if(fault==='wrong-selector')source=source.replace('@at-root #{& or $root}','@at-root .unrelated');
 assert.notEqual(source,owned[utils]);assert.throws(()=>measureSelectorHelper({owned:source,tagged:tagged[utils],reviewedAfter:original.reviews[0].sections[0].after.body}));rejected.push('selector/'+fault);
}
for(const fault of ['lost-wrapper','lost-root-state','lost-flag-reset','changed-minimum','changed-interval']){
 const source=structuredClone(owned);
 if(fault==='lost-wrapper')source[density]=source[density].replace(sassDeclaration(source[density],'mixin','private-density-legacy-compatibility'),'@mixin private-density-legacy-compatibility() { @content; }');
 if(fault==='lost-root-state')source[theming]=source[theming].replace('  compatibility.$private-density-generate-at-root: private-is-legacy-constructed-theme($theme);','');
 if(fault==='lost-flag-reset')source[theming]=source[theming].replace('  compatibility.$private-density-generate-at-root: false;','').replace('  compatibility.$private-density-generate-styles: true;','');
 if(fault==='changed-minimum')source[variables]=source[variables].replace('$minimum-height: 40px','$minimum-height: 44px');
 if(fault==='changed-interval')source[density]=source[density].replace('$_density-interval: 4px','$_density-interval: 3px');
 assert.notDeepEqual(source,owned);assert.throws(()=>measureLegacyDensity({owned:source,tagged}));rejected.push('density/'+fault);
}
let late=null;const mutable=path=>late===path?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const scope=reviewSelectorDensitySource({root,read:mutable});assert.equal(scope.report.reviews.length,2);assert.ok(scope.report.reviews.every(row=>row.proposed_final_disposition==='do-not-adopt'));
const sourceQualification=assertCurrentSliderSelectorTestSources({kind:'selector-density',scope,root,read:mutable});
assert.equal(scope.report.selector_callers.length,20);assert.equal(scope.report.selector_callers.reduce((n,row)=>n+row.calls,0),41);
const roles=[
 'scripts/upstream-selector-density-source-review.mjs','scripts/upstream-inspection-compatibility-source-review.mjs',
 'compatibility/rc/21x-c04-selector-density-originals-complete-context.json.gz','compatibility/rc/21x-c04-selector-density-originals.json.gz',
 'compatibility/rc/upstream-complete-patch-census.json.gz','compatibility/rc/upstream-sass-inspection-current-scope.json.gz',
 'projects/ngx-material-legacy/styles/core/style/_sass-utils.scss','projects/ngx-material-legacy/styles/core/density/private/_compatibility.scss',
 'projects/ngx-material-legacy/styles/core/theming/_theming.scss','projects/ngx-material-legacy/styles/legacy-paginator/_paginator-theme.scss',
 'projects/ngx-material-legacy/styles/legacy-core/theming/_all-theme.scss','projects/ngx-material-legacy/_index.scss',
 'node_modules/sass/package.json','node_modules/sass/sass.node.js','node_modules/sass/sass.dart.js','package.json','.node-version','toolchain-lock.json',
];
const bound=new Set(scope.bound.map(ref=>ref.path));assert.ok(roles.every(path=>bound.has(path)));
for(const path of roles){late=path;assert.throws(()=>scope.assertCurrent(),undefined,path);rejected.push('late/'+path);}late=null;scope.assertCurrent();
scope.bound.length=0;scope.report.current_source_bindings.length=0;late=utils;late='projects/ngx-material-legacy/styles/'+utils;assert.throws(()=>scope.assertCurrent());late=null;scope.assertCurrent();rejected.push('public-metadata-cannot-rewrite-guards');
const report={schema_version:1,result:'pass',original_files:4,original_hunks:5,present_original_blobs:7,tagged_blobs:6,exact_patch_replays:4,disabled_original_density_assertions:1,
 original_before_selector_mixin_matches_tag:true,proposed_individual_source_decisions:2,source_bindings:bound.size,...sourceQualification,selector_cases:scope.report.selector_measurement.case_count,density_cases:scope.report.density_measurement.case_count,
 reviewed_after_changed_css_cases:scope.report.selector_measurement.reviewed_after_changed_css_cases,original_order_reversal_reproduced_on_pinned_compiler:false,
 selector_caller_modules:scope.report.selector_callers.length,selector_calls:scope.report.selector_callers.reduce((n,row)=>n+row.calls,0),density_caller_modules:scope.report.density_wrapper_callers.length,
 semantic_mutants_detected:9,rejected,fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,reviewed_after_selector_mixin_sass_executed:true,
 upstream_typescript_tests_or_workflows_executed:false,full_sass_gate_executed:false,canonical_decisions_changed:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
