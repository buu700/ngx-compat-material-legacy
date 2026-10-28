/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {verifyButtonTokenizationOriginals,verifyButtonReferenceData,reviewButtonTokenizationSource,measureButtonContracts} from '../scripts/upstream-button-tokenization-source-review.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=raw=>createHash('sha1').update('blob '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const original=JSON.parse(gunzipSync(read('compatibility/rc/21x-c04-button-tokenization-originals.json.gz')));
const census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz'))),rejected=[];
const facts=verifyButtonTokenizationOriginals(original,census);assert.equal(facts.original_files,18);assert.equal(facts.original_hunks,47);
for(const fault of ['unknown-sha','duplicate-sha','missing-file','missing-hunk','changed-commit','changed-diff','omitted-seed','forged-tag','added-before-present','added-after-absent','wrong-parent','wrong-addition-mode']){
 const data=structuredClone(original),first=data.reviews[0],added=first.sections[2];
 if(fault==='unknown-sha')first.sha='0'.repeat(40);
 if(fault==='duplicate-sha')data.reviews[1].sha=first.sha;
 if(fault==='missing-file')first.sections.shift();
 if(fault==='missing-hunk')first.sections[0].hunks.pop();
 if(fault==='changed-commit')first.raw_commit+=' ';
 if(fault==='changed-diff'){first.diff+='\n';first.diff_sha256=hash(first.diff);}
 if(fault==='omitted-seed')first.frozen_seed_paths.pop();
 if(fault==='forged-tag'){const m=data.tagged_reference.members[2];m.body+='\n';m.bytes=Buffer.byteLength(m.body);m.sha256=hash(m.body);m.blob=gitHash(m.body);}
 if(fault==='added-before-present')added.before.absent=false;
 if(fault==='added-after-absent')added.after.absent=true;
 if(fault==='wrong-parent')first.parent='0'.repeat(40);
 if(fault==='wrong-addition-mode')added.before_mode='100644';
 assert.throws(()=>verifyButtonTokenizationOriginals(data,census),undefined,fault);rejected.push('original/'+fault);
}
const capsule=JSON.parse(gunzipSync(read('compatibility/rc/21x-c04-button-tokenization-tagged-sass-inputs.json.gz'))),identity=JSON.parse(read('compatibility/rc/original16-sass-source-diagnostic-identity.json'));
const reference=verifyButtonReferenceData(capsule,identity,original);
for(const fault of ['source-body','source-roster','archive-integrity','package-runtime-claim']){
 const data=structuredClone(capsule);
 if(fault==='source-body'){const m=data.members[0];m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);}
 if(fault==='source-roster')data.members.pop();
 if(fault==='archive-integrity')data.archives[0].integrity='sha512-forged';
 if(fault==='package-runtime-claim')data.package_install_or_runtime_execution=true;
 assert.throws(()=>verifyButtonReferenceData(data,identity,original),undefined,fault);rejected.push('reference/'+fault);
}
let late=null,added=null;const mutable=path=>path===added?Buffer.from('// unreviewed modern module\n'):path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const scope=reviewButtonTokenizationSource({root,read:mutable});assert.equal(scope.report.reviews.length,5);assert.ok(scope.report.reviews.every(row=>row.proposed_final_disposition==='do-not-adopt'));
const bound=new Set(scope.bound.map(ref=>ref.path)),owned={};for(const ref of scope.bound){const prefix='projects/ngx-material-legacy/styles/';if(ref.path.startsWith(prefix)&&ref.path.endsWith('.scss'))owned['/@angular/material/'+ref.path.slice(prefix.length)]=read(ref.path).toString();}
const catalog=JSON.parse(read('fixtures/sass/mixin-argument-contracts.json')),modern='/@angular/material/button/_button-theme.scss',legacy='/@angular/material/legacy-button/_button-theme.scss';
for(const fault of ['container-color','raised-selector','disabled-opacity','empty-density','legacy-ripple-opacity','legacy-font-size','legacy-disabled-overlay']){
 const data=structuredClone(owned);let name='button-color';
 if(fault==='container-color')data[modern]=data[modern].replace('container-color: $background','container-color: red');
 if(fault==='raised-selector')data[modern]=data[modern].replaceAll('.mat-mdc-raised-button','.mutant-raised-button');
 if(fault==='disabled-opacity')data[modern]=data[modern].replace('if($is-dark, 0.5, 0.38)','if($is-dark, 0.5, 0.18)');
 if(fault==='empty-density'){name='button-density';const from=data[modern].match(/@mixin density\(\$config-or-theme\) \{[\s\S]*?\n\}/)?.[0];assert.ok(from);data[modern]=data[modern].replace(from,'@mixin density($config-or-theme) {}');}
 if(fault==='legacy-ripple-opacity'){name='legacy-button-color';data[legacy]=data[legacy].replace('$_ripple-opacity: 0.1;','$_ripple-opacity: 0.8;');}
 if(fault==='legacy-font-size'){name='legacy-button-typography';data[legacy]=data[legacy].replace('size: typography-utils.font-size($config, button);','size: 99px;');}
 if(fault==='legacy-disabled-overlay'){name='legacy-button-color';data[legacy]=data[legacy].replace('background-color: transparent;','background-color: red;');}
 assert.notDeepEqual(data,owned);const probe=catalog.cases.find(row=>row.mixin===name&&row.variant==='custom-full-theme');assert.ok(probe);
 assert.throws(()=>measureButtonContracts({reference,owned:data,catalog,selected:[probe]}),/button CSS differs from untouched16/,fault);rejected.push('semantic/'+fault);
}
const roles=[
 'scripts/upstream-button-tokenization-source-review.mjs','scripts/upstream-inspection-compatibility-source-review.mjs',
 'compatibility/rc/21x-c04-button-tokenization-originals.json.gz','compatibility/rc/21x-c04-button-tokenization-tagged-sass-inputs.json.gz','compatibility/rc/21x-c04-button-tokenization-reference-capture.py',
 'compatibility/rc/original16-sass-source-diagnostic-identity.json','fixtures/sass/mixin-argument-contracts.json','compatibility/rc/upstream-complete-patch-census.json.gz',
 'projects/ngx-material-legacy/_index.scss','projects/ngx-material-legacy/styles/button/_button-theme.scss','projects/ngx-material-legacy/styles/legacy-button/_button-theme.scss',
 'projects/ngx-material-legacy/legacy-button/_button-theme.scss','projects/ngx-material-legacy/legacy-button/button.scss','projects/ngx-material-legacy/legacy-button/button.ts',
 'projects/ngx-material-legacy/styles/vendor/mdc/button/_button-filled-theme.scss','projects/ngx-material-legacy/styles/core/theming/_theming.scss','projects/ngx-material-legacy/styles/core/theming/_palette.scss',
 'node_modules/sass/package.json','node_modules/sass/sass.node.js','node_modules/sass/sass.dart.js','package.json','.node-version','toolchain-lock.json',
 'projects/ngx-material-legacy/package.json','compatibility/rc/matrices/library-exports.json',
];
assert.equal(roles.length,25);assert.ok(roles.every(path=>bound.has(path)));
for(const path of roles){late=path;assert.throws(()=>scope.assertCurrent(),undefined,path);rejected.push('late/'+path);}late=null;scope.assertCurrent();
for(const path of scope.report.absent_owned_token_or_modern_component_paths){added=path;assert.throws(()=>scope.assertCurrent());rejected.push('absent/'+path);}added=null;scope.assertCurrent();
scope.bound.length=0;scope.report.current_source_bindings.length=0;late='projects/ngx-material-legacy/styles/button/_button-theme.scss';assert.throws(()=>scope.assertCurrent());late=null;scope.assertCurrent();rejected.push('public-metadata-cannot-rewrite-guards');
const report={schema_version:1,result:'pass',original_files:18,original_hunks:47,present_original_blobs:33,tagged_blobs:6,exact_patch_replays:18,added_modules:3,
 proposed_individual_source_decisions:5,source_bindings:bound.size,original_sass_graph_members:71,original_locked_archive_packages:17,button_cases:scope.report.button_measurement.case_count,
 modern_theme_module_source_rewrites:7,legacy_theme_module_source_rewrites:5,legacy_structural_module_source_rewrites:4,namespace_or_mixin_or_selector_rewrites:0,
 upstream_wrong_component_slot_assertions_reviewed:1,upstream_slot_assertion_repairs_reviewed:1,semantic_mutants_detected:7,rejected,
 fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,upstream_post16_sass_or_typescript_tests_or_workflows_executed:false,package_install_or_javascript_runtime_execution:false,
 full_sass_gate_executed:false,canonical_decisions_changed:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
