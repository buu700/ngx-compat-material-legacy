/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {verifyButtonTokenRepairsOriginals,reviewButtonTokenRepairsSource} from '../scripts/upstream-button-token-repairs-source-review.mjs';
import {verifyButtonReferenceData,measureButtonContracts} from '../scripts/upstream-button-tokenization-source-review.mjs';
import {assertCurrentButtonTokenRepairsTestSources} from './current_sass_button_token_repairs_test_scope.mjs';
import {assertPhysicalAbsentCounterpart} from './current_sass_review_test_scope.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const prefix='compatibility/rc/21x-c04-button-token-repairs-',original=JSON.parse(gunzipSync(read(prefix+'originals.json.gz'))),census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz'))),rejected=[];
// Execute the retained controls, rather than carrying their old passing receipt forward.
const prior=JSON.parse(execFileSync(process.execPath,['tests/button_tokenization_source_review_probe.mjs'],{cwd:root,encoding:'utf8',timeout:90000,maxBuffer:1024*1024}));
assert.equal(prior.result,'pass');assert.equal(prior.rejected.length,55);assert.equal(new Set(prior.rejected).size,55);assert.equal(prior.semantic_mutants_detected,7);
const facts=verifyButtonTokenRepairsOriginals(original,census);assert.equal(facts.original_files,9);assert.equal(facts.original_hunks,14);
for(const fault of ['unknown-sha','duplicate-sha','missing-deleted-module','missing-added-module','missing-hunk','changed-commit','changed-parent-commit','changed-diff','wrong-parent','wrong-before-tree','wrong-deletion-mode','deleted-after-present','deleted-before-absent','added-before-present','added-after-absent','omitted-seed','forged-tag','missing-tree','changed-tree','duplicate-tree','upstream-execution-claim','capture-worksheet-change']){
 const data=structuredClone(original),first=data.reviews[0],rename=data.reviews[1],deleted=rename.sections.find(row=>row.status==='D'),added=rename.sections.find(row=>row.status==='A');
 if(fault==='unknown-sha')first.sha='0'.repeat(40);
 if(fault==='duplicate-sha')rename.sha=first.sha;
 if(fault==='missing-deleted-module')rename.sections.splice(rename.sections.indexOf(deleted),1);
 if(fault==='missing-added-module')rename.sections.splice(rename.sections.indexOf(added),1);
 if(fault==='missing-hunk')rename.sections[0].hunks.pop();
 if(fault==='changed-commit')first.raw_commit+=' ';
 if(fault==='changed-parent-commit')first.parent_raw_commit+=' ';
 if(fault==='changed-diff'){first.diff+='\n';first.diff_sha256=hash(first.diff);}
 if(fault==='wrong-parent')first.parent='0'.repeat(40);
 if(fault==='wrong-before-tree')first.before_tree=first.after_tree;
 if(fault==='wrong-deletion-mode')deleted.after_mode='100644';
 if(fault==='deleted-after-present')deleted.after.absent=false;
 if(fault==='deleted-before-absent')deleted.before.absent=true;
 if(fault==='added-before-present')added.before.absent=false;
 if(fault==='added-after-absent')added.after.absent=true;
 if(fault==='omitted-seed')rename.frozen_seed_paths.pop();
 if(fault==='forged-tag'){const m=data.tagged_reference.members[2];m.body+='\n';m.bytes=Buffer.byteLength(m.body);m.sha256=hash(m.body);m.blob=gitHash('blob',m.body);}
 if(fault==='missing-tree')data.authenticated_tree_objects.shift();
 if(fault==='changed-tree'){const m=data.authenticated_tree_objects[0],raw=Buffer.concat([Buffer.from(m.base64,'base64'),Buffer.from('\n')]);m.base64=raw.toString('base64');m.bytes=raw.length;m.sha256=hash(raw);}
 if(fault==='duplicate-tree')data.authenticated_tree_objects.push(structuredClone(data.authenticated_tree_objects[0]));
 if(fault==='upstream-execution-claim')data.upstream_code_executed=true;
 if(fault==='capture-worksheet-change')data.worksheet_at_capture.status='passed';
 assert.throws(()=>verifyButtonTokenRepairsOriginals(data,census),undefined,fault);rejected.push('original/'+fault);
}
let late=null;const mutable=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const scope=reviewButtonTokenRepairsSource({root,read:mutable});assert.equal(scope.report.reviews.length,2);assert.ok(scope.report.reviews.every(row=>row.proposed_final_disposition==='do-not-adopt'));const fullReview=structuredClone(scope.report);const bound=new Set(scope.bound.map(row=>row.path));const population=assertCurrentButtonTokenRepairsTestSources({scope,root,read});assert.equal(bound.size,population.expected_source_bindings);
const capsule=JSON.parse(gunzipSync(read('compatibility/rc/21x-c04-button-tokenization-tagged-sass-inputs.json.gz'))),identity=JSON.parse(read('compatibility/rc/original16-sass-source-diagnostic-identity.json')),reference=verifyButtonReferenceData(capsule,identity,original),catalog=JSON.parse(read('fixtures/sass/mixin-argument-contracts.json')),owned={},peers={};
for(const ref of scope.bound){const prefix='projects/ngx-material-legacy/styles/';if(ref.path.startsWith(prefix)&&ref.path.endsWith('.scss'))owned['/owned/material/'+ref.path.slice(prefix.length)]=read(ref.path).toString();}
const publicScope=JSON.parse(gunzipSync(read('compatibility/rc/upstream-sass-inspection-current-scope.json.gz'))).actual;
for(const ref of publicScope.current.loaded_sources){const family=ref.root===0?'material':'cdk',path='node_modules/@angular/'+family+'/'+ref.path,raw=read(path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);peers['/current/@angular/'+family+'/'+ref.path]=raw.toString();}
assert.equal(Object.keys(peers).length,185);const modern='/owned/material/button/_button-theme.scss';
for(const fault of ['raised-uses-filled-producer','dark-disabled-label-opacity','filled-token-prefix','protected-token-prefix']){
 const data=structuredClone(owned);let variant='custom-full-theme',name='button-color';
 if(fault==='raised-uses-filled-producer'){
  const before='@mixin _raised-button-variant($foreground, $background) {\n  @include mdc-button-protected-theme.theme((';assert.ok(data[modern].includes(before));data[modern]=data[modern].replace(before,before.replace('mdc-button-protected-theme','mdc-button-filled-theme'));
 }
 if(fault==='dark-disabled-label-opacity'){
  const before='$disabled-ink-color: rgba($on-surface, if($is-dark, 0.5, 0.38));';assert.ok(data[modern].includes(before));data[modern]=data[modern].replace(before,before.replace('0.5','0.38'));variant='custom-dark-theme';name='button-theme';
 }
 for(const kind of ['filled','protected'])if(fault===kind+'-token-prefix'){
  const path='/owned/material/vendor/mdc/button/_button-'+kind+'-theme.scss',before="$custom-property-prefix: '"+kind+"-button';";assert.ok(data[path].includes(before));data[path]=data[path].replace(before,"$custom-property-prefix: 'button-"+kind+"';");
 }
 assert.notDeepEqual(data,owned);const probe=catalog.cases.find(row=>row.mixin===name&&row.variant===variant);assert.ok(probe);assert.throws(()=>measureButtonContracts({reference,owned:data,peers,catalog,selected:[probe]}),/button CSS differs from finite independently derived current model/,fault);rejected.push('semantic/'+fault);
}
const roles=[
 'scripts/upstream-button-token-repairs-source-review.mjs',prefix+'originals.json.gz',prefix+'reference-capture.py',prefix+'source-worksheet.json',
 'scripts/upstream-button-tokenization-source-review.mjs','compatibility/rc/21x-c04-button-tokenization-originals.json.gz',
 'projects/ngx-material-legacy/styles/vendor/mdc/button/_button-filled-theme.scss','projects/ngx-material-legacy/styles/vendor/mdc/button/_button-protected-theme.scss',
 'projects/ngx-material-legacy/styles/button/_button-theme.scss','projects/ngx-material-legacy/styles/legacy-button/_button-theme.scss','projects/ngx-material-legacy/_index.scss',
 'projects/ngx-material-legacy/styles/core/theming/_palette.scss','projects/ngx-material-legacy/legacy-button/button.ts',
 'node_modules/sass/package.json','node_modules/sass/sass.node.js','node_modules/sass/sass.dart.js','toolchain-lock.json',
];
assert.equal(new Set(roles).size,17);assert.ok(roles.every(path=>bound.has(path)));
for(const path of roles){late=path;assert.throws(()=>scope.assertCurrent(),undefined,path);rejected.push('late/'+path);}late=null;scope.assertCurrent();
for(const path of scope.report.absent_owned_token_or_modern_component_paths){assertPhysicalAbsentCounterpart({root,path,assertCurrent:scope.assertCurrent});rejected.push('absent/'+path);}scope.assertCurrent();
scope.bound.length=0;scope.report.current_source_bindings.length=0;late=prefix+'reference-capture.py';assert.throws(()=>scope.assertCurrent());late=null;scope.assertCurrent();rejected.push('public-metadata-cannot-rewrite-guards');
const report={schema_version:1,result:'pass',...facts,reviews:undefined,...population,source_bindings:bound.size,shared_button_source_bindings:scope.report.shared_button_source_bindings,original_sass_graph_members:71,original_locked_archive_packages:17,button_cases:scope.report.button_measurement.case_count,
 fresh_prior_button_controls_executed:true,preserved_prior_rejections:prior.rejected,preserved_prior_semantic_mutants:7,additional_semantic_mutants_detected:4,rejected,
 owned_raised_producer_already_protected:true,owned_dark_disabled_opacity_already_historical:true,owned_MDC_prefixes_already_correct:true,
 transient_exclusive_physical_absent_source_mutations:6,persistent_product_source_changes:0,
 fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,upstream_post16_sass_or_typescript_tests_or_workflows_executed:false,package_install_or_javascript_runtime_execution:false,
 full_sass_gate_executed:false,canonical_decisions_changed:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(fullReview,null,2)+'\n',{flag:'wx'});
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
