/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {assertCurrentReviewTestSources} from './current_sass_review_test_scope.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {verifyRemainingUnthemableOriginals,verifyRemainingUnthemableReference,measureRemainingUnthemableContracts,reviewRemainingUnthemableSource} from '../scripts/upstream-remaining-unthemable-source-review.mjs';
import {sassDeclaration} from '../scripts/upstream-selector-density-source-review.mjs';
const prefix='compatibility/rc/21x-c04-remaining-unthemable-',read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(read(p)),zip=p=>JSON.parse(gunzipSync(read(p))),rejected=[];
const original=zip(prefix+'originals.json.gz'),census=zip('compatibility/rc/upstream-complete-patch-census.json.gz'),capsule=zip('compatibility/rc/21x-c04-foundation-m3-theme-tagged-sass-inputs.json.gz'),prior=zip('compatibility/rc/21x-c04-foundation-m3-theme-originals.json.gz'),identity=json('compatibility/rc/original16-sass-source-diagnostic-identity.json');
const facts=verifyRemainingUnthemableOriginals(original,census);
for(const [ri,row]of original.reviews.entries())for(const [si,section]of row.sections.entries()){
 const missing=structuredClone(original);missing.reviews[ri].sections.splice(si,1);assert.throws(()=>verifyRemainingUnthemableOriginals(missing,census));rejected.push('original/missing-file/'+ri+'/'+si);
 for(const [hi]of section.hunks.entries()){const missing=structuredClone(original);missing.reviews[ri].sections[si].hunks.splice(hi,1);assert.throws(()=>verifyRemainingUnthemableOriginals(missing,census));rejected.push('original/missing-hunk/'+ri+'/'+si+'/'+hi);}
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
 'changed-tag-commit':d=>d.tagged_reference.raw_commit+=' ',
 'changed-tag-source':d=>{const m=d.tagged_reference.members[1];m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);},
 'missing-tree':d=>d.authenticated_tree_objects.shift(),
 'duplicate-tree':d=>d.authenticated_tree_objects.push(structuredClone(d.authenticated_tree_objects[0])),
 'altered-tree':d=>d.authenticated_tree_objects[0].base64+='AA==',
 'capture-worksheet':d=>d.worksheet_at_capture.status='passed',
 'captured-code-executed':d=>d.upstream_code_executed=true,
 'credentials':d=>d.credentials_used=true,
 'shared-cache-write':d=>d.project_or_shared_cache_git_mutations=1,
 'g11':d=>d.g11_claim='passed',
 'missing-tag':d=>d.tagged_reference.members.pop(),
 'duplicate-tag':d=>d.tagged_reference.members[1]=structuredClone(d.tagged_reference.members[0]),
 'wrong-file-count':d=>d.original_file_occurrences--,
 'wrong-hunk-count':d=>d.original_hunks--
};
for(const [id,mutate]of Object.entries(faults)){const d=structuredClone(original);mutate(d);assert.throws(()=>verifyRemainingUnthemableOriginals(d,census),undefined,id);rejected.push('original/'+id);}
const reference=verifyRemainingUnthemableReference(capsule,identity,prior,original);
for(const id of ['missing-member','duplicate-member','forged-reference','wrong-archive','duplicate-archive','post16-identity','exclusion-widened','installation']){
 const d=structuredClone(capsule);
 if(id==='missing-member')d.members.pop();if(id==='duplicate-member')d.members[1]=structuredClone(d.members[0]);
 if(id==='forged-reference'){const m=d.members[0];m.body+='\n';m.sha256=hash(m.body);m.bytes=Buffer.byteLength(m.body);}
 if(id==='wrong-archive')d.archives[0].integrity='sha512-invalid';if(id==='duplicate-archive')d.archives[1]=structuredClone(d.archives[0]);
 if(id==='post16-identity')d.identity.sha256='0'.repeat(64);if(id==='exclusion-widened')d.tagged_review_sources_outside_selected_compiler_graph.push('src/material/menu/menu.scss');if(id==='installation')d.package_install_or_runtime_execution=true;
 assert.throws(()=>verifyRemainingUnthemableReference(d,identity,prior,original),undefined,id);rejected.push('reference/'+id);
}
let late=null;
const scope=reviewRemainingUnthemableSource({read:p=>p===late?Buffer.concat([read(p),Buffer.from('\n')]):read(p)}),report=scope.report,catalog=json('fixtures/sass/mixin-argument-contracts.json'),owned={},peers={};
const sourceQualification=assertCurrentReviewTestSources({kind:'remaining-unthemable',scope:scope});
for(const ref of scope.bound){
 const base='projects/ngx-material-legacy/styles/';if(ref.path.startsWith(base)&&ref.path.endsWith('.scss'))owned['/owned/material/'+ref.path.slice(base.length)]=read(ref.path).toString();
 for(const f of ['material','cdk']){const base='node_modules/@angular/'+f+'/';if(ref.path.startsWith(base)&&ref.path.endsWith('.scss'))peers['/@angular/'+f+'/'+ref.path.slice(base.length)]=read(ref.path).toString();}
}
const manifest=read('node_modules/@angular/material/package.json'),args={reference,owned,peers,catalog,peerManifest:{version:JSON.parse(manifest).version,sha256:hash(manifest)}};
const families=json(prefix+'source-worksheet.json').families,legacy=original.tagged_reference.members.filter(m=>m.path.includes('/legacy-')).map(m=>m.path.split('/')[2]);assert.equal(families.length,14);assert.equal(legacy.length,8);
const themeModule=f=>f==='icon-button'?'button/_icon-button-theme.scss':f+'/_'+f.replace(/^legacy-/,'')+'-theme.scss';
const critical=[prefix+'originals.json.gz',prefix+'originals-capture.py',prefix+'source-worksheet.json','scripts/upstream-remaining-unthemable-source-review.mjs','compatibility/rc/21x-c04-foundation-m3-theme-tagged-sass-inputs.json.gz','compatibility/rc/21x-c04-foundation-m3-theme-originals.json.gz','compatibility/rc/21x-c04-foundation-m3-theme-source-review.json.gz','compatibility/rc/original16-sass-source-diagnostic-identity.json','fixtures/sass/mixin-argument-contracts.json','projects/ngx-material-legacy/_index.scss','node_modules/sass/sass.dart.js','node_modules/@angular/material/package.json',...[...families,...legacy].map(f=>'projects/ngx-material-legacy/styles/'+themeModule(f)),'node_modules/@angular/material/core/theming/_inspection.scss','node_modules/@angular/material/core/style/_sass-utils.scss'];
assert.equal(critical.length,36);assert.equal(new Set(critical).size,36);
for(const path of critical){assert.ok(scope.bound.some(r=>r.path===path),'missing expected binding '+path);late=path;assert.throws(()=>scope.assertCurrent(),undefined,path);rejected.push('live-source/'+path);}late=null;scope.assertCurrent();
let cssMutants=0;
for(const f of [...families,...legacy]){
 const path='/owned/material/'+themeModule(f),body=owned[path],name=body.includes('@mixin _m2-color(')?'_m2-color':'color',before=sassDeclaration(body,'mixin',name),brace=before.indexOf('{');assert.ok(brace>=0);
 const after=before.slice(0,brace+1)+'\n  outline: 13px solid magenta;'+before.slice(brace+1),mutated={...owned,[path]:body.replace(before,after)},probe=catalog.cases.find(p=>p.mixin===f+'-color'&&p.variant==='custom-full-theme');assert.ok(probe,f);assert.notEqual(mutated[path],body);
 assert.throws(()=>measureRemainingUnthemableContracts({...args,owned:mutated,selected:[probe]}),/remaining token placement CSS differs/,f);rejected.push('css/changed-'+f+'-color');cssMutants++;
}
for(const id of ['unknown-case','changed-call','changed-setup','younger-peer','wrong-peer-identity']){
 const probe=structuredClone(catalog.cases.find(p=>p.mixin==='dialog-color'&&p.variant==='custom-full-theme')),value={...args,selected:[probe]};
 if(id==='unknown-case')probe.case_id+='-unreviewed';if(id==='changed-call')probe.call+='\n';if(id==='changed-setup')value.catalog={...catalog,setup:catalog.setup+'\n'};if(id==='younger-peer')value.peerManifest={...value.peerManifest,version:'22.1.7'};if(id==='wrong-peer-identity')value.peerManifest={...value.peerManifest,sha256:'0'.repeat(64)};
 assert.throws(()=>measureRemainingUnthemableContracts(value),undefined,id);rejected.push('arguments/'+id);
}
assert.equal(rejected.length,38+54+24+8+36+22+5);assert.equal(new Set(rejected).size,rejected.length);assert.equal(scope.bound.length,sourceQualification.expected_source_bindings);assert.equal(hash(read('compatibility/f10/disposition-ledger/ledger.json')),'2eadcd59193c5cde7a6dcb9f6c469adca84f46688162d1866ad579c58743bc13');scope.assertCurrent();
const out={schema_version:1,result:'pass',...facts,source_bindings:scope.bound.length,...sourceQualification,argument_cases:report.argument_measurement.case_count,comparison_counts:report.argument_measurement.comparison_counts,historically_empty_cases:report.argument_measurement.historically_empty_cases,owned_theme_bodies:report.owned_theme_bodies,css_semantic_mutants_detected:cssMutants,late_source_change_controls:critical.length,owned_scss_members_rehashed:report.owned_scss_members_rehashed,reference_sass_members:286,reference_locked_archives:38,rejected,prior_CSS_results_reused:false,tagged_reference_Sass_executed:true,approved_installed_minimum_peer_public_Sass_executed:true,captured_post16_patch_Sass_TypeScript_tests_or_workflows_executed:false,canonical_decisions_changed:0,golden_or_finite_contract_changes:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n',{flag:'wx'});if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(out));
