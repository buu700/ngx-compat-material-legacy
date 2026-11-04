/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {verifyControlM3ThemeOriginals,verifyControlThemeReference,measureControlThemeContracts,reviewControlM3ThemeSource} from '../scripts/upstream-control-m3-theme-source-review.mjs';
const prefix='compatibility/rc/21x-c04-control-m3-theme-',read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(read(p)),zipped=p=>JSON.parse(gunzipSync(read(p)));
const original=zipped(prefix+'originals.json.gz'),census=zipped('compatibility/rc/upstream-complete-patch-census.json.gz'),capsule=zipped(prefix+'tagged-sass-inputs.json.gz'),identity=json('compatibility/rc/original16-sass-source-diagnostic-identity.json'),rejected=[];
const facts=verifyControlM3ThemeOriginals(original,census);
for(const [ri,row]of original.reviews.entries())for(const [si,section]of row.sections.entries()){
 const missing=structuredClone(original);missing.reviews[ri].sections.splice(si,1);assert.throws(()=>verifyControlM3ThemeOriginals(missing,census));rejected.push('original/missing-file/'+ri+'/'+si);
 for(const [hi]of section.hunks.entries()){const missing=structuredClone(original);missing.reviews[ri].sections[si].hunks.splice(hi,1);assert.throws(()=>verifyControlM3ThemeOriginals(missing,census));rejected.push('original/missing-hunk/'+ri+'/'+si+'/'+hi);}
}
const mutations={
 'unknown-sha':d=>d.reviews[0].sha='0'.repeat(40),
 'duplicate-sha':d=>d.reviews[1].sha=d.reviews[0].sha,
 'changed-commit':d=>d.reviews[0].raw_commit+=' ',
 'changed-parent':d=>d.reviews[0].parent_raw_commit+=' ',
 'wrong-parent':d=>d.reviews[0].parent='0'.repeat(40),
 'wrong-before-tree':d=>d.reviews[0].before_tree=d.reviews[0].after_tree,
 'wrong-after-tree':d=>d.reviews[0].after_tree=d.reviews[0].before_tree,
 'changed-diff':d=>{d.reviews[0].diff+='\n';d.reviews[0].diff_sha256=hash(d.reviews[0].diff);},
 'changed-mode':d=>d.reviews[0].sections[0].before_mode='100755',
 'forged-body':d=>{const m=d.reviews[0].sections[0].before;m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);},
 'added-before-present':d=>{const m=d.reviews[1].sections.find(s=>s.status==='A').before;m.absent=false;},
 'deleted-after-present':d=>{const m=d.reviews[1].sections.find(s=>s.status==='D').after;m.absent=false;},
 'changed-tag-commit':d=>d.tagged_reference.raw_commit+=' ',
 'changed-tag-blob':d=>d.tagged_reference.members[0].blob='0'.repeat(40),
 'changed-tag-source':d=>{const m=d.tagged_reference.members[0];m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);},
 'missing-tree':d=>d.authenticated_tree_objects.shift(),
 'duplicate-tree':d=>d.authenticated_tree_objects.push(structuredClone(d.authenticated_tree_objects[0])),
 'altered-tree':d=>d.authenticated_tree_objects[0].base64+='AA==',
 'capture-worksheet':d=>d.worksheet_at_capture.status='passed',
 'upstream-execution':d=>d.upstream_code_executed=true,
 'credentials':d=>d.credentials_used=true,
 'shared-cache-write':d=>d.project_or_shared_cache_git_mutations=1,
 'g11':d=>d.g11_claim='passed'
};
for(const [id,mutate]of Object.entries(mutations)){const d=structuredClone(original);mutate(d);assert.throws(()=>verifyControlM3ThemeOriginals(d,census),undefined,id);rejected.push('original/'+id);}
const reference=verifyControlThemeReference(capsule,identity,original);
for(const id of ['missing-member','duplicate-member','forged-reference','wrong-archive','duplicate-archive','post16-identity','exclusion-widened','installation']){
 const d=structuredClone(capsule);
 if(id==='missing-member')d.members.pop();if(id==='duplicate-member')d.members[1]=structuredClone(d.members[0]);
 if(id==='forged-reference'){const m=d.members[0];m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);}
 if(id==='wrong-archive')d.archives[0].integrity='sha512-invalid';if(id==='duplicate-archive')d.archives[1]=structuredClone(d.archives[0]);
 if(id==='post16-identity')d.identity.sha256='0'.repeat(64);if(id==='exclusion-widened')d.tagged_review_sources_outside_selected_compiler_graph.push('src/material/radio/_radio-theme.scss');if(id==='installation')d.package_install_or_runtime_execution=true;
 assert.throws(()=>verifyControlThemeReference(d,identity,original),undefined,id);rejected.push('reference/'+id);
}
let late=null;
const scope=reviewControlM3ThemeSource({read:p=>p===late?Buffer.concat([read(p),Buffer.from('\n')]):read(p)}),report=scope.report,catalog=json('fixtures/sass/mixin-argument-contracts.json'),owned={},peers={};
for(const ref of scope.bound){const p='projects/ngx-material-legacy/styles/';if(ref.path.startsWith(p)&&ref.path.endsWith('.scss'))owned['/owned/material/'+ref.path.slice(p.length)]=read(ref.path).toString();for(const family of ['material','cdk']){const start='node_modules/@angular/'+family+'/';if(ref.path.startsWith(start)&&ref.path.endsWith('.scss'))peers['/@angular/'+family+'/'+ref.path.slice(start.length)]=read(ref.path).toString();}}
const manifest=read('node_modules/@angular/material/package.json'),args={reference,owned,peers,catalog,peerManifest:{version:JSON.parse(manifest).version,sha256:hash(manifest)}};
function cssMutant(id,path,before,after,mixin,variant='custom-full-theme'){
 const data=structuredClone(owned);assert.ok(data[path].includes(before),id);data[path]=data[path].replace(before,after);assert.notEqual(data[path],owned[path]);const probe=catalog.cases.find(p=>p.mixin===mixin&&p.variant===variant);assert.ok(probe);
 assert.throws(()=>measureControlThemeContracts({...args,owned:data,selected:[probe]}),/control CSS differs from untouched16 and existing finite progress alias contract/,id);rejected.push('css/'+id);
}
const base='/owned/material/';
cssMutant('snackbar-light-background',base+'legacy-snack-bar/_snack-bar-theme.scss','#323232','#232323','legacy-snack-bar-color');
cssMutant('snackbar-dark-background',base+'legacy-snack-bar/_snack-bar-theme.scss','map.get(palette.$grey-palette, 50)','map.get(palette.$grey-palette, 900)','legacy-snack-bar-theme','custom-dark-theme');
cssMutant('legacy-spinner-primary',base+'legacy-progress-spinner/_progress-spinner-theme.scss','stroke: theming.get-color-from-palette($primary);','stroke: theming.get-color-from-palette($accent);','legacy-progress-spinner-color');
cssMutant('modern-spinner-warn',base+'progress-spinner/_progress-spinner-theme.scss','map.get($config, warn)','map.get($config, primary)','progress-spinner-color');
cssMutant('radio-disabled-state',base+'legacy-radio/_radio-theme.scss','border-color: theming.get-color-from-palette($foreground, disabled);','border-color: red;','legacy-radio-color');
cssMutant('radio-touch-target',base+'radio/_radio-theme.scss','display: none;','display: block;','radio-density','raw-density-config');
cssMutant('progress-track-opacity',base+'core/tokens/m2/mdc/_linear-progress.scss','$alpha: -0.75','$alpha: -0.5','progress-bar-color');
cssMutant('public-progress-alias-removed',base+'progress-bar/_progress-bar-theme.scss','  @include mat.progress-bar-overrides($color-tokens);','','progress-bar-color');
cssMutant('original-progress-palette',base+'legacy-progress-bar/_progress-bar-theme.scss','map.get($config, primary)','map.get($config, accent)','legacy-progress-bar-color');
cssMutant('historical-spinner-density',base+'progress-spinner/_progress-spinner-theme.scss','@mixin density($config-or-theme) {}','@mixin density($config-or-theme) { .mat-mdc-progress-spinner { width: 1px; } }','progress-spinner-density');
cssMutant('public-spinner-token-removed',base+'progress-spinner/_progress-spinner-theme.scss','    @include mat.progress-spinner-overrides($mdc-circular-progress-color-tokens);','','progress-spinner-color');
cssMutant('public-snackbar-color-tokens-removed',base+'snack-bar/_snack-bar-theme.scss','    @include mat.snack-bar-overrides(tokens-mdc-snack-bar.get-color-tokens($config));','','snack-bar-color');
cssMutant('public-snackbar-typography-tokens-removed',base+'snack-bar/_snack-bar-theme.scss','    @include mat.snack-bar-overrides(tokens-mdc-snack-bar.get-typography-tokens($config));','','snack-bar-typography');
const selected=[catalog.cases.find(p=>p.mixin==='legacy-radio-color'&&p.variant==='custom-full-theme')];
for(const [id,changes]of [['changed-catalog-setup',{catalog:{...catalog,setup:catalog.setup+'\n.changed-catalog {}'}}],['empty-selection',{selected:[]}],['duplicate-selection',{selected:[...selected,...selected]}],['unknown-selection',{selected:[{...selected[0],case_id:'unknown'}]}],['changed-probe',{selected:[{...selected[0],call:'.changed {}'}]}],['wrong-peer',{selected,peerManifest:{...args.peerManifest,version:'22.1.7'}}]]){assert.throws(()=>measureControlThemeContracts({...args,...changes}),undefined,id);rejected.push('measurement/'+id);}
const latePaths=[prefix+'originals.json.gz',prefix+'tagged-sass-inputs.json.gz','scripts/upstream-control-m3-theme-source-review.mjs','scripts/sass-progress-color-alias-contract.mjs','fixtures/sass/mixin-argument-contracts.json','projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.scss','projects/ngx-material-legacy/styles/progress-bar/_progress-bar-theme.scss','node_modules/@angular/material/progress-bar/_m2-progress-bar.scss'];
for(const path of latePaths){assert.ok(scope.bound.some(r=>r.path===path),path);late=path;assert.throws(()=>scope.assertCurrent(),undefined,path);rejected.push('late/'+path);}late=null;scope.assertCurrent();
assert.equal(report.control_measurement.exact_tagged_cases,42);assert.equal(report.control_measurement.existing_progress_alias_cases,4);assert.equal(report.control_measurement.historically_empty_cases,14);assert.equal(new Set(rejected).size,rejected.length);
const result={result:'pass',...Object.fromEntries(Object.entries(facts).filter(([k])=>k!=='reviews')),source_bindings:scope.bound.length,control_cases:56,exact_tagged_CSS_cases:42,current_spinner_snack_bridge_cases:10,existing_progress_alias_cases:4,historically_empty_cases:14,original_sass_graph_members:82,original_locked_archive_packages:22,css_semantic_mutants_detected:13,rejected,fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,component_structural_Sass_freshly_compiled:false,full_sass_gate_executed:false,mixed_M2_M3_native_coexistence_qualified:false,canonical_decisions_changed:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
