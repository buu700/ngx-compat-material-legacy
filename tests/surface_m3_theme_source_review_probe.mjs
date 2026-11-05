/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {assertCurrentM3ReviewTestSources} from './current_sass_m3_review_test_scope.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {verifySurfaceThemeOriginals,verifySurfaceThemeReference,measureSurfaceThemeContracts,reviewSurfaceThemeSource} from '../scripts/upstream-surface-m3-theme-source-review.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),prefix='compatibility/rc/21x-c04-surface-m3-theme-';
const original=JSON.parse(gunzipSync(read(prefix+'originals.json.gz'))),census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz'))),rejected=[];
const facts=verifySurfaceThemeOriginals(original,census);assert.equal(facts.original_files,17);assert.equal(facts.original_hunks,32);
for(const fault of ['unknown-sha','duplicate-sha','missing-demo','missing-experimental','missing-token-index','missing-hunk','changed-commit','changed-parent-commit','changed-diff','wrong-parent','wrong-before-tree','wrong-after-tree','wrong-mode','before-absent','after-absent','changed-blob','omitted-seed','changed-tag-commit','changed-tag-tree','missing-tag-member','forged-tag-member','missing-tree','changed-tree','duplicate-tree','upstream-execution','credential-use','shared-git-mutation','capture-worksheet-change']){
 const data=structuredClone(original),first=data.reviews[0],section=first.sections[0];
 if(fault==='unknown-sha')first.sha='0'.repeat(40);
 if(fault==='duplicate-sha')data.reviews[1].sha=first.sha;
 if(fault==='missing-demo')first.sections=first.sections.filter(s=>!s.path.startsWith('src/dev-app/'));
 if(fault==='missing-experimental')first.sections=first.sections.filter(s=>!s.path.includes('_custom-tokens.scss'));
 if(fault==='missing-token-index')first.sections=first.sections.filter(s=>!s.path.endsWith('/m2/_index.scss'));
 if(fault==='missing-hunk')section.hunks.pop();
 if(fault==='changed-commit')first.raw_commit+=' ';
 if(fault==='changed-parent-commit')first.parent_raw_commit+=' ';
 if(fault==='changed-diff'){first.diff+='\n';first.diff_sha256=hash(first.diff);}
 if(fault==='wrong-parent')first.parent='0'.repeat(40);
 if(fault==='wrong-before-tree')first.before_tree=first.after_tree;
 if(fault==='wrong-after-tree')first.after_tree=first.before_tree;
 if(fault==='wrong-mode')section.before_mode='100755';
 if(fault==='before-absent')section.before.absent=true;
 if(fault==='after-absent')section.after.absent=true;
 if(fault==='changed-blob'){section.before.body+='\n';section.before.sha256=hash(section.before.body);section.before.bytes=Buffer.byteLength(section.before.body);}
 if(fault==='omitted-seed')first.frozen_seed_paths.pop();
 if(fault==='changed-tag-commit')data.tagged_reference.raw_commit+=' ';
 if(fault==='changed-tag-tree')data.tagged_reference.tree=first.before_tree;
 if(fault==='missing-tag-member')data.tagged_reference.members.pop();
 if(fault==='forged-tag-member'){const m=data.tagged_reference.members[3];m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);}
 if(fault==='missing-tree')data.authenticated_tree_objects.shift();
 if(fault==='changed-tree'){const m=data.authenticated_tree_objects[0],raw=Buffer.concat([Buffer.from(m.base64,'base64'),Buffer.from('\n')]);m.base64=raw.toString('base64');m.bytes=raw.length;m.sha256=hash(raw);}
 if(fault==='duplicate-tree')data.authenticated_tree_objects.push(structuredClone(data.authenticated_tree_objects[0]));
 if(fault==='upstream-execution')data.upstream_code_executed=true;
 if(fault==='credential-use')data.credentials_used=true;
 if(fault==='shared-git-mutation')data.project_or_shared_cache_git_mutations=1;
 if(fault==='capture-worksheet-change')data.worksheet_at_capture.status='passed';
 assert.throws(()=>verifySurfaceThemeOriginals(data,census),undefined,fault);rejected.push('original/'+fault);
}
const capsule=JSON.parse(gunzipSync(read(prefix+'tagged-sass-inputs.json.gz'))),identity=JSON.parse(read('compatibility/rc/original16-sass-source-diagnostic-identity.json')),reference=verifySurfaceThemeReference(capsule,identity,original);
for(const member of capsule.members){const data=structuredClone(capsule),m=data.members.find(x=>x.path===member.path);m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);assert.throws(()=>verifySurfaceThemeReference(data,identity,original));rejected.push('reference/'+member.path);}
for(const fault of ['duplicate-member','missing-member','unknown-package','wrong-integrity','execution-claim','index-not-reviewed']){
 const data=structuredClone(capsule);
 if(fault==='duplicate-member')data.members[1]=structuredClone(data.members[0]);
 if(fault==='missing-member')data.members.pop();
 if(fault==='unknown-package')data.archives[0].package='unknown';
 if(fault==='wrong-integrity')data.archives[0].integrity+='x';
 if(fault==='execution-claim')data.package_install_or_runtime_execution=true;
 if(fault==='index-not-reviewed')data.tagged_review_sources_outside_selected_compiler_graph=[];
 assert.throws(()=>verifySurfaceThemeReference(data,identity,original));rejected.push('reference/'+fault);
}
let late=null;const mutable=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const scope=reviewSurfaceThemeSource({root,read:mutable}),fullReview=structuredClone(scope.report),bound=new Set(scope.bound.map(ref=>ref.path));const sourcePopulation=assertCurrentM3ReviewTestSources({kind:'surface-m3-theme',scope,root,read:mutable});
assert.equal(fullReview.reviews.length,3);assert.ok(fullReview.reviews.every(r=>r.proposed_final_disposition==='do-not-adopt'));
const owned={},peers={};for(const ref of scope.bound){
 const styles='projects/ngx-material-legacy/styles/';if(ref.path.startsWith(styles)&&ref.path.endsWith('.scss'))owned['/owned/material/'+ref.path.slice(styles.length)]=read(ref.path).toString();
 for(const family of ['material','cdk']){const prefix='node_modules/@angular/'+family+'/';if(ref.path.startsWith(prefix)&&ref.path.endsWith('.scss'))peers['/@angular/'+family+'/'+ref.path.slice(prefix.length)]=read(ref.path).toString();}
}
const catalog=JSON.parse(read('fixtures/sass/mixin-argument-contracts.json')),manifest=read('node_modules/@angular/material/package.json'),peerManifest={version:JSON.parse(manifest).version,sha256:hash(manifest)};
const args={reference,owned,peers,catalog,peerManifest},theme='/owned/material/';
function mutated(fault,path,before,after,mixin,variant='custom-full-theme'){
 const data=structuredClone(owned);assert.ok(data[path].includes(before),fault);data[path]=data[path].replace(before,after);assert.notEqual(data[path],owned[path]);
 const probe=catalog.cases.find(p=>p.mixin===mixin&&p.variant===variant);assert.ok(probe,fault);
 assert.throws(()=>measureSurfaceThemeContracts({...args,owned:data,selected:[probe]}),/surface CSS differs from untouched16 and existing finite companion contract/,fault);rejected.push('semantic/'+fault);
}
mutated('slider-m3-opacity',theme+'slider/_slider-theme.scss','#{if($is-dark, 0.9, 0.6)}','#{1}','slider-theme','custom-dark-theme');
mutated('slider-ripple-opacity',theme+'slider/_slider-theme.scss','rgba($ripple-color, 0.2)','rgba($ripple-color, 0.4)','slider-color');
mutated('slider-density-no-longer-empty',theme+'slider/_slider-theme.scss','@mixin density($config-or-theme) {}','@mixin density($config-or-theme) { .mat-mdc-slider { height: 1px; } }','slider-density');
mutated('tooltip-container-color',theme+'core/tokens/m2/mdc/_plain-tooltip.scss','container-color: theming.get-color-from-palette($background, tooltip),','container-color: red,','tooltip-color');
mutated('tooltip-density-no-longer-empty',theme+'core/tokens/m2/mdc/_plain-tooltip.scss','@function get-density-tokens($config) {\n  @return ();','@function get-density-tokens($config) {\n  @return (container-color: red);','tooltip-density');
mutated('toolbar-historical-color-removed',theme+'toolbar/_toolbar-theme.scss','@include _m2-color($config-or-theme);','// historical color removed','toolbar-color');
mutated('toolbar-bridge-removed',theme+'toolbar/_toolbar-theme.scss','@include bridges.toolbar($theme);','// companion bridge removed','toolbar-theme');
mutated('toolbar-selector',theme+'toolbar/_toolbar-theme.scss','  .mat-toolbar {','  .wrong-toolbar {','toolbar-color');
mutated('legacy-tooltip-opacity',theme+'legacy-tooltip/_tooltip-theme.scss','get-color-from-palette($background, tooltip, 0.9)','get-color-from-palette($background, tooltip, 1)','legacy-tooltip-color');
mutated('legacy-slider-color',theme+'legacy-slider/_slider-theme.scss','background-color: theming.get-color-from-palette($palette);','background-color: red;','legacy-slider-color');
for(const [label,override]of [
 ['empty-selection',{selected:[]}],['unknown-selection',{selected:[{case_id:'unknown'}]}],
 ['duplicate-selection',{selected:[catalog.cases.find(p=>p.mixin==='slider-color'),catalog.cases.find(p=>p.mixin==='slider-color')]}],
 ['younger-peer',{peerManifest:{...peerManifest,version:'22.1.7'}}],['foreign-peer-identity',{peerManifest:{...peerManifest,sha256:'0'.repeat(64)}}],
]){assert.throws(()=>measureSurfaceThemeContracts({...args,...override}));rejected.push('measurement/'+label);}
const roles=[
 'scripts/upstream-surface-m3-theme-source-review.mjs',prefix+'originals-capture.py',prefix+'originals.json.gz',prefix+'source-worksheet.json',prefix+'reference-capture.py',prefix+'tagged-sass-inputs.json.gz',
 'compatibility/rc/original16-sass-source-diagnostic-identity.json','fixtures/sass/mixin-argument-contracts.json',
 'scripts/upstream-selector-density-source-review.mjs','scripts/sass-companion-addition-contract.mjs','scripts/sass-current-companion-peer.mjs','scripts/companion-bridge-peer-oracle.mjs','fixtures/sass/companion-addition-contracts.json',
 'projects/ngx-material-legacy/styles/toolbar/_toolbar-theme.scss','projects/ngx-material-legacy/styles/tooltip/_tooltip-theme.scss','projects/ngx-material-legacy/styles/slider/_slider-theme.scss',
 'projects/ngx-material-legacy/styles/legacy-tooltip/_tooltip-theme.scss','projects/ngx-material-legacy/styles/legacy-slider/_slider-theme.scss',
 'projects/ngx-material-legacy/styles/core/tokens/m2/_index.scss','projects/ngx-material-legacy/styles/core/tokens/m2/mat/_toolbar.scss','projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_plain-tooltip.scss',
 'projects/ngx-material-legacy/styles/card/_card-theme.scss','projects/ngx-material-legacy/styles/core/tokens/m2/mat/_card.scss',
 'projects/ngx-material-legacy/_index.scss','projects/ngx-material-legacy/legacy-slider/slider.ts','projects/ngx-material-legacy/legacy-tooltip/tooltip.ts',
 'node_modules/sass/package.json','node_modules/sass/sass.node.js','node_modules/sass/sass.dart.js','node_modules/@angular/material/package.json','.node-version','toolchain-lock.json',
];
assert.equal(new Set(roles).size,32);assert.ok(roles.every(path=>bound.has(path)));
for(const path of roles){late=path;assert.throws(()=>scope.assertCurrent(),undefined,path);rejected.push('late/'+path);}late=null;scope.assertCurrent();
scope.bound.length=0;scope.report.current_source_bindings.length=0;late=prefix+'reference-capture.py';assert.throws(()=>scope.assertCurrent());late=null;scope.assertCurrent();rejected.push('public-metadata-cannot-rewrite-guards');
const report={schema_version:1,result:'pass',...facts,reviews:undefined,source_bindings:bound.size,...sourcePopulation,original_sass_graph_members:52,original_locked_archive_packages:13,
 surface_cases:fullReview.surface_measurement.case_count,exact_tagged_cases:fullReview.surface_measurement.exact_tagged_cases,existing_companion_cases:fullReview.surface_measurement.existing_companion_cases,
 historically_empty_density_cases:fullReview.surface_measurement.historically_empty_density_cases,semantic_mutants_detected:10,rejected,
 fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,existing_companion_contract_unchanged:true,
 product_changes:0,consumer_HTML_CSS_SCSS_changes:0,canonical_decisions_changed:0,full_sass_gate_executed:false,mixed_M2_M3_native_coexistence_qualified:false,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(fullReview,null,2)+'\n',{flag:'wx'});
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
