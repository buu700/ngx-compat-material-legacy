/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {verifySliderM3RepairsOriginals,assertHistoricalSliderSources,reviewSliderM3RepairsSource} from '../scripts/upstream-slider-m3-repairs-source-review.mjs';
import {verifySurfaceThemeReference,measureSurfaceThemeContracts} from '../scripts/upstream-surface-m3-theme-source-review.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),prefix='compatibility/rc/21x-c04-slider-m3-repairs-';
const original=JSON.parse(gunzipSync(read(prefix+'originals.json.gz'))),census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz'))),rejected=[];
// The reused measurement/parser module must still enforce all its prior controls.
const prior=JSON.parse(execFileSync(process.execPath,['tests/surface_m3_theme_source_review_probe.mjs'],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));
assert.equal(prior.result,'pass');assert.equal(prior.rejected.length,134);assert.equal(new Set(prior.rejected).size,134);assert.equal(prior.semantic_mutants_detected,10);
const facts=verifySliderM3RepairsOriginals(original,census);assert.equal(facts.original_files,9);assert.equal(facts.original_hunks,14);
const originalFaults=['unknown-sha','duplicate-sha','missing-lock','missing-experimental','missing-modern-theme','missing-structural','missing-hunk','changed-commit','changed-parent','changed-diff','wrong-parent','wrong-before-tree','wrong-after-tree','wrong-mode','before-absent','after-absent','changed-blob','omitted-seed','changed-tag-commit','changed-tag-tree','missing-tagged-structure','forged-tagged-structure','wrong-absent-tagged-path','missing-tree','changed-tree','duplicate-tree','upstream-execution','credential-use','shared-git-mutation','capture-worksheet-change','g11-claim'];
for(const fault of originalFaults){
 const data=structuredClone(original),first=data.reviews[0],section=first.sections[0];
 if(fault==='unknown-sha')first.sha='0'.repeat(40);
 if(fault==='duplicate-sha')data.reviews[1].sha=first.sha;
 if(fault==='missing-lock')first.sections=first.sections.filter(s=>s.path!=='yarn.lock');
 if(fault==='missing-experimental')first.sections=first.sections.filter(s=>!s.path.includes('_custom-tokens.scss'));
 if(fault==='missing-modern-theme')first.sections=first.sections.filter(s=>s.path!=='src/material/slider/_slider-theme.scss');
 if(fault==='missing-structural')first.sections=first.sections.filter(s=>s.path!=='src/material/slider/slider.scss');
 if(fault==='missing-hunk')section.hunks.pop();
 if(fault==='changed-commit')first.raw_commit+=' ';
 if(fault==='changed-parent')first.parent_raw_commit+=' ';
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
 if(fault==='missing-tagged-structure')data.tagged_reference.members=data.tagged_reference.members.filter(m=>m.path!=='src/material/legacy-slider/slider.scss');
 if(fault==='forged-tagged-structure'){const m=data.tagged_reference.members.find(m=>m.path==='src/material/legacy-slider/slider.scss');m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);}
 if(fault==='wrong-absent-tagged-path')data.tagged_reference.absent_paths=['src/material/slider/slider.scss'];
 if(fault==='missing-tree')data.authenticated_tree_objects.shift();
 if(fault==='changed-tree'){const m=data.authenticated_tree_objects[0],raw=Buffer.concat([Buffer.from(m.base64,'base64'),Buffer.from('\n')]);m.base64=raw.toString('base64');m.bytes=raw.length;m.sha256=hash(raw);}
 if(fault==='duplicate-tree')data.authenticated_tree_objects.push(structuredClone(data.authenticated_tree_objects[0]));
 if(fault==='upstream-execution')data.upstream_code_executed=true;
 if(fault==='credential-use')data.credentials_used=true;
 if(fault==='shared-git-mutation')data.project_or_shared_cache_git_mutations=1;
 if(fault==='capture-worksheet-change')data.worksheet_at_capture.status='passed';
 if(fault==='g11-claim')data.g11_claim='passed';
 assert.throws(()=>verifySliderM3RepairsOriginals(data,census),undefined,fault);rejected.push('original/'+fault);
}
let late=null,added=null;const mutable=path=>path===added?Buffer.from('// unreviewed counterpart\n'):path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const scope=reviewSliderM3RepairsSource({root,read:mutable}),fullReview=structuredClone(scope.report),bound=new Set(scope.bound.map(ref=>ref.path));assert.equal(bound.size,638);assert.ok(fullReview.reviews.every(r=>r.proposed_final_disposition==='do-not-adopt'));
const capsule=JSON.parse(gunzipSync(read('compatibility/rc/21x-c04-surface-m3-theme-tagged-sass-inputs.json.gz'))),oldOriginal=JSON.parse(gunzipSync(read('compatibility/rc/21x-c04-surface-m3-theme-originals.json.gz'))),identity=JSON.parse(read('compatibility/rc/original16-sass-source-diagnostic-identity.json')),reference=verifySurfaceThemeReference(capsule,identity,oldOriginal),catalog=JSON.parse(read('fixtures/sass/mixin-argument-contracts.json')),owned={},peers={};
for(const ref of scope.bound){const styles='projects/ngx-material-legacy/styles/';if(ref.path.startsWith(styles)&&ref.path.endsWith('.scss'))owned['/owned/material/'+ref.path.slice(styles.length)]=read(ref.path).toString();for(const family of ['material','cdk']){const p='node_modules/@angular/'+family+'/';if(ref.path.startsWith(p)&&ref.path.endsWith('.scss'))peers['/@angular/'+family+'/'+ref.path.slice(p.length)]=read(ref.path).toString();}}
const manifest=read('node_modules/@angular/material/package.json'),args={reference,owned,peers,catalog,peerManifest:{version:JSON.parse(manifest).version,sha256:hash(manifest)}};
function cssMutant(fault,path,before,after,mixin,variant='custom-full-theme'){
 const data=structuredClone(owned);assert.ok(data[path].includes(before),fault);data[path]=data[path].replace(before,after);assert.notEqual(data[path],owned[path]);const probe=catalog.cases.find(p=>p.mixin===mixin&&p.variant===variant);assert.ok(probe);
 assert.throws(()=>measureSurfaceThemeContracts({...args,owned:data,selected:[probe]}),/surface CSS differs from untouched16 and existing finite companion contract/,fault);rejected.push('css/'+fault);
}
const modern='/owned/material/slider/_slider-theme.scss',legacy='/owned/material/legacy-slider/_slider-theme.scss';
cssMutant('dark-indicator-opacity',modern,'if($is-dark, 0.9, 0.6)','if($is-dark, 1, 0.6)','slider-theme','custom-dark-theme');
cssMutant('light-indicator-opacity',modern,'if($is-dark, 0.9, 0.6)','if($is-dark, 0.9, 1)','slider-color');
cssMutant('hover-ripple-alpha',modern,'rgba($ripple-color, 0.05)','rgba($ripple-color, 0.2)','slider-color');
cssMutant('focus-ripple-alpha',modern,'rgba($ripple-color, 0.2)','rgba($ripple-color, 0.05)','slider-color');
cssMutant('primary-palette-route',modern,'@include _slider-color(primary, on-primary);','@include _slider-color(secondary, on-secondary);','slider-color');
cssMutant('warn-palette-route',modern,'@include _slider-color(error, on-error);','@include _slider-color(primary, on-primary);','slider-color');
cssMutant('density-no-longer-empty',modern,'@mixin density($config-or-theme) {}','@mixin density($config-or-theme) { .mat-mdc-slider { height: 1px; } }','slider-density');
cssMutant('legacy-focus-alpha',legacy,'$opacity: 0.2;','$opacity: 0.05;','legacy-slider-color');
cssMutant('legacy-disabled-fill',legacy,'background-color: $mat-slider-disabled-color;','background-color: red;','legacy-slider-color');
const tagged=new Map(original.tagged_reference.members.map(m=>[m.path,m.body])),sources={tagged,modernTheme:read('projects/ngx-material-legacy/styles/slider/_slider-theme.scss').toString(),legacyTheme:read('projects/ngx-material-legacy/styles/legacy-slider/_slider-theme.scss').toString(),legacyStructural:read('projects/ngx-material-legacy/legacy-slider/slider.scss').toString()};
for(const [fault,before,after]of [
 ['legacy-label-width','$thumb-label-size: 28px !default;','$thumb-label-size: 32px !default;'],
 ['legacy-padding','$padding: 8px !default;','$padding: 16px !default;'],
 ['legacy-focused-radius','border-radius: 50% 50% 0;','border-radius: 4px;'],
 ['legacy-label-transform','transform: rotate(45deg);','transform: rotate(30deg);'],
 ['legacy-noop-motion','    transition: none;','    transition: all 1s;'],
 ['legacy-high-contrast-context','cdk.high-contrast(active)','cdk.high-contrast()'],
]){assert.ok(sources.legacyStructural.includes(before),fault);assert.throws(()=>assertHistoricalSliderSources({...sources,legacyStructural:sources.legacyStructural.replace(before,after)}),/historical legacy slider structure\/geometry\/motion changed/,fault);rejected.push('static-identity/'+fault);}
const roles=[
 'scripts/upstream-slider-m3-repairs-source-review.mjs',prefix+'originals-capture.py',prefix+'originals.json.gz',prefix+'source-worksheet.json',
 'scripts/upstream-surface-m3-theme-source-review.mjs','compatibility/rc/21x-c04-surface-m3-theme-originals.json.gz','compatibility/rc/21x-c04-surface-m3-theme-reference-capture.py','compatibility/rc/21x-c04-surface-m3-theme-tagged-sass-inputs.json.gz',
 'compatibility/rc/original16-sass-source-diagnostic-identity.json','fixtures/sass/mixin-argument-contracts.json',
 'projects/ngx-material-legacy/styles/slider/_slider-theme.scss','projects/ngx-material-legacy/styles/legacy-slider/_slider-theme.scss','projects/ngx-material-legacy/legacy-slider/slider.scss',
 'projects/ngx-material-legacy/legacy-slider/slider.ts','projects/ngx-material-legacy/legacy-slider/slider.html','projects/ngx-material-legacy/_index.scss',
 'projects/ngx-material-legacy/styles/core/style/_component-high-contrast.scss','node_modules/sass/package.json','node_modules/sass/sass.node.js','node_modules/sass/sass.dart.js',
 'node_modules/@angular/material/package.json','pnpm-lock.yaml','.node-version','.npm-version','toolchain-lock.json',
];
assert.equal(new Set(roles).size,25);assert.ok(roles.every(path=>bound.has(path)));
for(const path of roles){late=path;assert.throws(()=>scope.assertCurrent(),undefined,path);rejected.push('late/'+path);}late=null;scope.assertCurrent();
for(const path of scope.report.absent_owned_modern_slider_or_token_paths){added=path;assert.throws(()=>scope.assertCurrent());rejected.push('absent/'+path);}added=null;scope.assertCurrent();
late=prefix+'originals-capture.py';assert.throws(()=>reviewSliderM3RepairsSource({root,read:mutable}));rejected.push('no-cached-source-pass');late=null;scope.assertCurrent();
scope.bound.length=0;scope.report.current_source_bindings.length=0;late=prefix+'source-worksheet.json';assert.throws(()=>scope.assertCurrent());late=null;scope.assertCurrent();rejected.push('public-metadata-cannot-rewrite-guards');
const report={schema_version:1,result:'pass',...facts,reviews:undefined,source_bindings:bound.size,slider_cases:fullReview.slider_measurement.case_count,exact_tagged_CSS_cases:14,historically_empty_density_cases:2,
 original_sass_graph_members:52,original_locked_archive_packages:13,css_semantic_mutants_detected:9,static_source_identity_mutants_detected:6,component_structural_Sass_freshly_compiled:false,
 fresh_prior_surface_controls_executed:true,preserved_prior_rejection_controls:prior.rejected,preserved_prior_CSS_semantic_mutants:10,rejected,
 fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,upstream_lock_changes_adopted:false,canonical_decisions_changed:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,
 full_sass_gate_executed:false,mixed_M2_M3_native_coexistence_qualified:false,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(fullReview,null,2)+'\n',{flag:'wx'});
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
