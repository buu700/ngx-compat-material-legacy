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
import {verifyFoundationM3ThemeOriginals,verifyFoundationThemeReference,measureFoundationThemeContracts,reviewFoundationM3ThemeSource} from '../scripts/upstream-foundation-m3-theme-source-review.mjs';
const prefix='compatibility/rc/21x-c04-foundation-m3-theme-',read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(read(p)),zipped=p=>JSON.parse(gunzipSync(read(p)));
const original=zipped(prefix+'originals.json.gz'),census=zipped('compatibility/rc/upstream-complete-patch-census.json.gz'),capsule=zipped(prefix+'tagged-sass-inputs.json.gz'),identity=json('compatibility/rc/original16-sass-source-diagnostic-identity.json'),rejected=[];
const facts=verifyFoundationM3ThemeOriginals(original,census);
for(const [ri,row]of original.reviews.entries())for(const [si,section]of row.sections.entries()){
 const missing=structuredClone(original);missing.reviews[ri].sections.splice(si,1);assert.throws(()=>verifyFoundationM3ThemeOriginals(missing,census));rejected.push('original/missing-file/'+ri+'/'+si);
 for(const [hi]of section.hunks.entries()){const missing=structuredClone(original);missing.reviews[ri].sections[si].hunks.splice(hi,1);assert.throws(()=>verifyFoundationM3ThemeOriginals(missing,census));rejected.push('original/missing-hunk/'+ri+'/'+si+'/'+hi);}
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
for(const [id,mutate]of Object.entries(mutations)){const d=structuredClone(original);mutate(d);assert.throws(()=>verifyFoundationM3ThemeOriginals(d,census),undefined,id);rejected.push('original/'+id);}
const reference=verifyFoundationThemeReference(capsule,identity,original);
for(const id of ['missing-member','duplicate-member','forged-reference','wrong-archive','duplicate-archive','post16-identity','exclusion-widened','installation']){
 const d=structuredClone(capsule);
 if(id==='missing-member')d.members.pop();if(id==='duplicate-member')d.members[1]=structuredClone(d.members[0]);
 if(id==='forged-reference'){const m=d.members[0];m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);}
 if(id==='wrong-archive')d.archives[0].integrity='sha512-invalid';if(id==='duplicate-archive')d.archives[1]=structuredClone(d.archives[0]);
 if(id==='post16-identity')d.identity.sha256='0'.repeat(64);if(id==='exclusion-widened')d.tagged_review_sources_outside_selected_compiler_graph.push('src/material/icon/_icon-theme.scss');if(id==='installation')d.package_install_or_runtime_execution=true;
 assert.throws(()=>verifyFoundationThemeReference(d,identity,original),undefined,id);rejected.push('reference/'+id);
}
let late=null;
const scope=reviewFoundationM3ThemeSource({read:p=>p===late?Buffer.concat([read(p),Buffer.from('\n')]):read(p)}),report=scope.report,catalog=json('fixtures/sass/mixin-argument-contracts.json'),owned={},fullOwned={},peers={};
for(const ref of scope.bound){
 const base='projects/ngx-material-legacy/',styles=base+'styles/';
 if(ref.path.startsWith(base)&&ref.path.endsWith('.scss')){const rel=ref.path.slice(base.length);fullOwned['/owned/package/'+rel]=read(ref.path).toString();if(ref.path.startsWith(styles))owned['/owned/material/'+ref.path.slice(styles.length)]=read(ref.path).toString();}
 for(const family of ['material','cdk']){const start='node_modules/@angular/'+family+'/';if(ref.path.startsWith(start)&&ref.path.endsWith('.scss'))peers['/@angular/'+family+'/'+ref.path.slice(start.length)]=read(ref.path).toString();}
}
const manifest=read('node_modules/@angular/material/package.json'),args={reference,owned,fullOwned,peers,catalog,peerManifest:{version:JSON.parse(manifest).version,sha256:hash(manifest)}};
function cssMutant(id,path,before,after,mixin,variant='custom-full-theme'){
 const data=structuredClone(owned),full=structuredClone(fullOwned);assert.ok(data[path].includes(before),id);data[path]=data[path].replace(before,after);assert.notEqual(data[path],owned[path]);
 full[path.replace('/owned/material/','/owned/package/styles/')]=data[path];const probe=catalog.cases.find(p=>p.mixin===mixin&&p.variant===variant);assert.ok(probe,id);
 const ripple=mixin.startsWith('ripple-');
 assert.throws(()=>measureFoundationThemeContracts({...args,owned:data,fullOwned:full,selected:ripple?[]:[probe],selectedRipple:ripple?[probe]:[]}),/foundation (?:ripple )?CSS differs from untouched16 and unchanged finite contract|foundation ripple CSS differs from unchanged finite contract/,id);rejected.push('css/'+id);
}
const base='/owned/material/';
cssMutant('legacy-switch-checked-opacity',base+'legacy-slide-toggle/_slide-toggle-theme.scss','$thumb-checked-hue, 0.54','$thumb-checked-hue, 0.2','legacy-slide-toggle-color');
cssMutant('legacy-list-disabled-ink',base+'legacy-list/_list-theme.scss','color: theming.get-color-from-palette($foreground, disabled-text);','color: red;','legacy-list-color');
cssMutant('legacy-native-select-dark-options',base+'legacy-input/_input-theme.scss','color: palette.$dark-primary-text;','color: red;','legacy-input-theme','custom-dark-theme');
cssMutant('legacy-table-header-type',base+'legacy-table/_table-theme.scss','font-size: typography-utils.font-size($config, caption);','font-size: 1px;','legacy-table-typography');
cssMutant('legacy-tab-disabled-opacity',base+'legacy-tabs/_tabs-theme.scss','opacity: 0.4;','opacity: 0.1;','legacy-tabs-color');
cssMutant('grid-list-public-typography-value',base+'bridges/_companion-overrides.scss','tile-header-primary-text-size: map.get($system, body-medium-size)','tile-header-primary-text-size: 1px','grid-list-typography');
cssMutant('icon-palette-ink',base+'icon/_icon-theme.scss','$color: theming.get-color-from-palette($palette, text);','$color: red;','icon-color');
cssMutant('icon-button-padding',base+'button/_icon-button-theme.scss','padding: math.div($calculated-size - $_icon-size, 2);','padding: 0;','icon-button-density','raw-density-config');
cssMutant('sort-fallback-removed',base+'sort/_sort-theme.scss','#{color.mix($table-background, rgba($text-color, 1), (1 - $text-opacity) * 100%)}','red','sort-color');
cssMutant('tree-background-fallback',base+'tree/_tree-theme.scss',"#{theming.get-color-from-palette($background, 'card')}",'red','tree-color');
cssMutant('stepper-historical-color-removed',base+'stepper/_stepper-theme.scss','  @include _m2-color($config-or-theme);','','stepper-color');
cssMutant('field-state-binding-removed',base+'form-field/_form-field-theme.scss','      @include form-field-state-overrides.color(mdc-textfield.$ink-color);','','form-field-color');
cssMutant('historically-empty-input-density',base+'input/_input-theme.scss','@mixin density($config-or-theme) {}','@mixin density($config-or-theme) { .mat-input-element { height: 1px; } }','input-density');
cssMutant('ripple-historical-opacity',base+'core/ripple/_ripple-theme.scss','$color-opacity: 0.1;','$color-opacity: 0.2;','ripple-color');
cssMutant('ripple-public-color-binding',base+'core/ripple/_ripple-theme.scss','--mat-ripple-color: #{rgba($foreground-base, $color-opacity)};','--mat-ripple-color: red;','ripple-color');
cssMutant('legacy-table-color-rules-removed',base+'legacy-table/_table-theme.scss',"background: theming.get-color-from-palette($background, 'card');",'','legacy-table-color');
const selected=[catalog.cases.find(p=>p.mixin==='legacy-list-color'&&p.variant==='custom-full-theme')];
for(const [id,changes]of [
 ['empty-selection',{selected:[],selectedRipple:[]}],
 ['duplicate-selection',{selected:[...selected,...selected],selectedRipple:[]}],
 ['unknown-selection',{selected:[{...selected[0],case_id:'unknown'}],selectedRipple:[]}],
 ['changed-probe',{selected:[{...selected[0],call:'.changed {}'}],selectedRipple:[]}],
 ['wrong-peer',{selected,selectedRipple:[],peerManifest:{...args.peerManifest,version:'22.1.7'}}],
 ['wrong-peer-manifest',{selected,selectedRipple:[],peerManifest:{...args.peerManifest,sha256:'0'.repeat(64)}}],
 ['changed-catalog',{selected,selectedRipple:[],catalog:{...catalog,setup:catalog.setup+'\n.changed {}'}}],
 ['unknown-ripple',{selected:[],selectedRipple:[{...catalog.cases.find(p=>p.mixin==='ripple-color'),case_id:'unknown'}]}]
]){assert.throws(()=>measureFoundationThemeContracts({...args,...changes}),undefined,id);rejected.push('measurement/'+id);}
const latePaths=[prefix+'originals.json.gz',prefix+'tagged-sass-inputs.json.gz','scripts/upstream-foundation-m3-theme-source-review.mjs','scripts/sass-sort-companion-contract.mjs','scripts/sass-tree-companion-contract.mjs','scripts/sass-form-field-state-contract.mjs','scripts/sass-companion-addition-contract.mjs','scripts/sass-ripple-color-contract.mjs','fixtures/sass/mixin-argument-contracts.json','fixtures/sass/ripple-color-contracts.json','projects/ngx-material-legacy/styles/core/ripple/_ripple-theme.scss','projects/ngx-material-legacy/styles/form-field/_form-field-theme.scss','projects/ngx-material-legacy/styles/button/_icon-button-theme.scss','node_modules/@angular/material/sort/_m2-sort.scss'];
for(const path of latePaths){assert.ok(scope.bound.some(r=>r.path===path),path);late=path;assert.throws(()=>scope.assertCurrent(),undefined,path);rejected.push('late/'+path);}late=null;scope.assertCurrent();
const m=report.foundation_measurement;assert.equal(m.historically_empty_family_cases,22);assert.equal(new Set(rejected).size,rejected.length);
assert.equal(m.cases.filter(c=>c.collateral_control).length,8);assert.ok(m.cases.filter(c=>c.collateral_control).every(c=>c.family==='icon-button'&&c.finite_family_forward_harness.includes("@forward 'button/icon-button-theme' as icon-button-* show")));
assert.ok(m.cases.filter(c=>c.family==='icon').every(c=>!c.finite_family_forward_harness.includes('icon-button-')));
const result={result:'pass',...Object.fromEntries(Object.entries(facts).filter(([k])=>k!=='reviews')),source_bindings:scope.bound.length,argument_cases:m.case_count,affected_family_cases:m.affected_family_cases,collateral_icon_button_cases:m.collateral_icon_button_cases,ripple_cases:m.ripple_case_count,comparison_counts:m.comparison_counts,historically_empty_family_cases:m.historically_empty_family_cases,original_sass_graph_members:286,original_locked_archive_packages:38,css_semantic_mutants_detected:16,rejected,fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,component_structural_Sass_freshly_compiled:false,full_sass_gate_executed:false,mixed_M2_M3_native_coexistence_qualified:false,canonical_decisions_changed:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
