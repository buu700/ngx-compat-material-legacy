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
import {verifyCoreTokenizationOriginals,verifyCoreTokenizationReference,measureCoreTokenizationContracts,measureTreeDensityBoundary,reviewCoreTokenizationSource} from '../scripts/upstream-core-tokenization-source-review.mjs';
const prefix='compatibility/rc/21x-c04-core-tokenization-',read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(read(p)),zip=p=>JSON.parse(gunzipSync(read(p))),rejected=[];
const original=zip(prefix+'originals.json.gz'),census=zip('compatibility/rc/upstream-complete-patch-census.json.gz'),capsule=zip('compatibility/rc/21x-c04-foundation-m3-theme-tagged-sass-inputs.json.gz'),prior=zip('compatibility/rc/21x-c04-foundation-m3-theme-originals.json.gz'),identity=json('compatibility/rc/original16-sass-source-diagnostic-identity.json');
const facts=verifyCoreTokenizationOriginals(original,census);
for(const [ri,row]of original.reviews.entries())for(const [si,section]of row.sections.entries()){
 const missing=structuredClone(original);missing.reviews[ri].sections.splice(si,1);assert.throws(()=>verifyCoreTokenizationOriginals(missing,census));rejected.push('original/missing-file/'+ri+'/'+si);
 for(const [hi]of section.hunks.entries()){const missing=structuredClone(original);missing.reviews[ri].sections[si].hunks.splice(hi,1);assert.throws(()=>verifyCoreTokenizationOriginals(missing,census));rejected.push('original/missing-hunk/'+ri+'/'+si+'/'+hi);}
}
const faults={
 'unknown-sha':d=>d.reviews[0].sha='0'.repeat(40),
 'duplicate-sha':d=>d.reviews[1].sha=d.reviews[0].sha,
 'changed-commit':d=>d.reviews[0].raw_commit+=' ',
 'changed-parent':d=>d.reviews[0].parent_raw_commit+=' ',
 'wrong-parent':d=>d.reviews[0].parent='0'.repeat(40),
 'wrong-before-tree':d=>d.reviews[0].before_tree=d.reviews[0].after_tree,
 'wrong-after-tree':d=>d.reviews[0].after_tree=d.reviews[0].before_tree,
 'changed-diff':d=>{d.reviews[0].diff+='\n';d.reviews[0].diff_sha256=hash(d.reviews[0].diff);},
 'changed-mode':d=>d.reviews[0].sections[1].before_mode='100755',
 'forged-body':d=>{const m=d.reviews[0].sections[1].before;m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);},
 'added-before-present':d=>d.reviews[0].sections[0].before.absent=false,
 'deleted-after-present':d=>d.reviews[1].sections.find(s=>s.status==='D').after.absent=false,
 'changed-tag-commit':d=>d.tagged_reference.raw_commit+=' ',
 'changed-tag-source':d=>{const m=d.tagged_reference.members[1];m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);},
 'tagged-absence-filled':d=>{const m=d.tagged_reference.members[0];m.body='@mixin replacement() {}';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);},
 'tagged-absence-present-mode':d=>d.tagged_reference.members[0].mode='100644',
 'tagged-present-absent-mode':d=>d.tagged_reference.members[1].mode='000000',
 'missing-tree':d=>d.authenticated_tree_objects.shift(),
 'duplicate-tree':d=>d.authenticated_tree_objects.push(structuredClone(d.authenticated_tree_objects[0])),
 'altered-tree':d=>d.authenticated_tree_objects[0].base64+='AA==',
 'capture-worksheet':d=>d.worksheet_at_capture.status='passed',
 'captured-code-executed':d=>d.upstream_code_executed=true,
 'credentials':d=>d.credentials_used=true,
 'shared-cache-write':d=>d.project_or_shared_cache_git_mutations=1,
 'g11':d=>d.g11_claim='passed'
};
for(const [id,mutate]of Object.entries(faults)){const d=structuredClone(original);mutate(d);assert.throws(()=>verifyCoreTokenizationOriginals(d,census),undefined,id);rejected.push('original/'+id);}
const reference=verifyCoreTokenizationReference(capsule,identity,prior,original);
for(const id of ['missing-member','duplicate-member','forged-reference','wrong-archive','duplicate-archive','post16-identity','exclusion-widened','installation']){
 const d=structuredClone(capsule);
 if(id==='missing-member')d.members.pop();if(id==='duplicate-member')d.members[1]=structuredClone(d.members[0]);
 if(id==='forged-reference'){const m=d.members[0];m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);}
 if(id==='wrong-archive')d.archives[0].integrity='sha512-invalid';if(id==='duplicate-archive')d.archives[1]=structuredClone(d.archives[0]);
 if(id==='post16-identity')d.identity.sha256='0'.repeat(64);if(id==='exclusion-widened')d.tagged_review_sources_outside_selected_compiler_graph.push('src/material/tree/tree.scss');if(id==='installation')d.package_install_or_runtime_execution=true;
 assert.throws(()=>verifyCoreTokenizationReference(d,identity,prior,original),undefined,id);rejected.push('reference/'+id);
}
let late=null,created=null;
const scope=reviewCoreTokenizationSource({read:p=>p===created?Buffer.from('@mixin unreviewed() {}'):p===late?Buffer.concat([read(p),Buffer.from('\n')]):read(p)}),report=scope.report,catalog=json('fixtures/sass/mixin-argument-contracts.json'),owned={},fullOwned={},peers={};
for(const ref of scope.bound){
 const base='projects/ngx-material-legacy/',styles=base+'styles/';if(ref.path.startsWith(base)&&ref.path.endsWith('.scss')){fullOwned['/owned/package/'+ref.path.slice(base.length)]=read(ref.path).toString();if(ref.path.startsWith(styles))owned['/owned/material/'+ref.path.slice(styles.length)]=read(ref.path).toString();}
 for(const f of ['material','cdk']){const base='node_modules/@angular/'+f+'/';if(ref.path.startsWith(base)&&ref.path.endsWith('.scss'))peers['/@angular/'+f+'/'+ref.path.slice(base.length)]=read(ref.path).toString();}
}
const manifest=read('node_modules/@angular/material/package.json'),args={reference,owned,fullOwned,peers,catalog,peerManifest:{version:JSON.parse(manifest).version,sha256:hash(manifest)}};
function cssMutant(id,path,before,after,mixin,variant='custom-full-theme'){
 const mutated=structuredClone(owned),full=structuredClone(fullOwned);assert.ok(mutated[path].includes(before),id);mutated[path]=mutated[path].replace(before,after);assert.notEqual(mutated[path],owned[path]);full[path.replace('/owned/material/','/owned/package/styles/')]=mutated[path];
 const probe=catalog.cases.find(p=>p.mixin===mixin&&p.variant===variant);assert.ok(probe);
 assert.throws(()=>measureCoreTokenizationContracts({...args,owned:mutated,fullOwned:full,selected:[probe]}),/core tokenization (?:finite|original)/,id);rejected.push('css/'+id);
}
const base='/owned/material/';
cssMutant('sort-old-fallback',base+'sort/_sort-theme.scss','#{color.mix($table-background, rgba($text-color, 1), (1 - $text-opacity) * 100%)}','red','sort-color');
cssMutant('tree-variable-default',base+'tree/_tree-variables.scss','$node-height: 48px','$node-height: 52px','tree-density');
cssMutant('tree-ink-fallback',base+'tree/_tree-theme.scss','#{theming.get-color-from-palette($foreground, text)}','red','tree-color');
cssMutant('core-app-background',base+'core/_core-theme.scss','background-color: theming.get-color-from-palette($background, background);','background-color: red;','core-color');
cssMutant('core-ripple-dispatch-removed',base+'core/_core-theme.scss','  @include ripple-theme.color($config);','','core-color');
cssMutant('legacy-core-marker',base+'legacy-core/_core-theme.scss','display: none;','display: block;','legacy-core-color');
cssMutant('ripple-old-opacity',base+'core/ripple/_ripple-theme.scss','$color-opacity: 0.1;','$color-opacity: 0.2;','ripple-color');
cssMutant('ripple-public-color',base+'core/ripple/_ripple-theme.scss','--mat-ripple-color: #{rgba($foreground-base, $color-opacity)};','--mat-ripple-color: red;','ripple-color');
cssMutant('core-option-type-removed',base+'core/_core-theme.scss','  @include option-theme.typography($config);','','core-typography');
for(const [id,path,before,after]of [
 ['ordinary-peer-token-changed',base+'bridges/_companion-overrides.scss','node-min-height: map.get((0: 48px, -1: 44px, -2: 40px, -3: 36px, -4: 28px), $scale)','node-min-height: map.get((0: 48px, -1: 44px, -2: 40px, -3: 36px, -4: 32px), $scale)'],
 ['historical-minimum-error-lost',base+'tree/_tree-variables.scss','$node-minimum-height: 24px','$node-minimum-height: 20px']
]){const data=structuredClone(owned);assert.ok(data[path].includes(before),id);data[path]=data[path].replace(before,after);assert.throws(()=>measureTreeDensityBoundary({...args,owned:data}),undefined,id);rejected.push('density/'+id);}
const probe=catalog.cases.find(p=>p.mixin==='sort-density'&&p.variant==='custom-full-theme');
for(const [id,change]of [['empty',{selected:[]}],['duplicate',{selected:[probe,probe]}],['unknown',{selected:[{...probe,case_id:'unknown'}]}],['changed-call',{selected:[{...probe,call:'.unexpected {}'}]}],['wrong-peer',{selected:[probe],peerManifest:{...args.peerManifest,version:'22.1.7'}}],['changed-catalog',{selected:[probe],catalog:{...catalog,setup:catalog.setup+'\n.unexpected {}'}}]]){assert.throws(()=>measureCoreTokenizationContracts({...args,...change}),undefined,id);rejected.push('measurement/'+id);}
const latePaths=[prefix+'originals.json.gz',prefix+'originals-capture.py',prefix+'source-worksheet.json','scripts/upstream-core-tokenization-source-review.mjs','scripts/upstream-foundation-m3-theme-source-review.mjs','scripts/sass-sort-companion-contract.mjs','scripts/sass-tree-companion-contract.mjs','scripts/sass-ripple-color-contract.mjs','compatibility/rc/21x-c04-foundation-m3-theme-source-review.json.gz','compatibility/handoff/codex-closeout/reference/PRODUCT-CONTRACT.md','projects/ngx-material-legacy/styles/tree/_tree-variables.scss','projects/ngx-material-legacy/styles/core/ripple/_ripple.scss','node_modules/sass/sass.node.js','node_modules/@angular/material/tree/_m2-tree.scss'];
for(const path of latePaths){assert.ok(scope.bound.some(row=>row.path===path),path);late=path;assert.throws(()=>scope.assertCurrent(),undefined,path);rejected.push('late/'+path);}late=null;
for(const path of report.absent_owned_token_modules){created=path;assert.throws(()=>scope.assertCurrent(),undefined,path);rejected.push('absence/'+path);}created=null;scope.assertCurrent();
assert.equal(new Set(rejected).size,rejected.length);assert.equal(report.argument_measurement.historically_empty_cases,6);
assert.deepEqual(report.argument_measurement.cases.filter(row=>!row.expected.css).map(row=>row.mixin).sort(),['core-density','core-density','sort-density','sort-density','sort-typography','sort-typography']);
const result={result:'pass',...Object.fromEntries(Object.entries(facts).filter(([key])=>key!=='reviews')),source_bindings:scope.bound.length,argument_cases:32,comparison_counts:report.argument_measurement.comparison_counts,historically_empty_cases:6,tree_density_supplemental_boundaries:11,historical_valid_density_fallbacks:10,current_public_density_tokens:10,historical_invalid_density_arguments:1,documented_ownership_differences:3,css_semantic_mutants_detected:9,density_semantic_mutants_detected:2,rejected,owned_scss_members_rehashed:409,reference_sass_members:286,reference_locked_archives:38,canonical_decisions_changed:0,golden_or_finite_contract_changes:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,prior_CSS_results_reused:false,tagged_reference_Sass_executed:true,approved_installed_minimum_peer_public_Sass_executed:true,captured_post16_patch_Sass_TypeScript_tests_or_workflows_executed:false,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
