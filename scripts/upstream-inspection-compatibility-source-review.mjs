/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Four whole-patch source proposals; the shared owned Sass model has one owner. */
import assert from 'node:assert/strict';
import {spinnerSnackC04Source} from './sass-spinner-snack-c04-source.mjs';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {replayThemingSection,reviewThemingInspectionSource} from './upstream-theming-inspection-source-review.mjs';
const PREFIX='compatibility/rc/21x-c04-inspection-compatibility-';
const ORIGINAL={path:PREFIX+'originals-complete-context.json.gz',sha256:'e72d76b03e3ae23b8a26412080c916a322f949808a9e91010478f72b0d9317e8'};
const SEED={path:PREFIX+'originals.json.gz',sha256:'59521edcba188cc615f73c60c06499d079fdac5660c15b3761483c3736a34612'};
const CENSUS={path:'compatibility/rc/upstream-complete-patch-census.json.gz',sha256:'806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'};
const PATCHES=Object.freeze({
 eeb0cf2666a2346ee99bb023c833da7255720654:'e576846f91a8e961418aa17089ac1f82e3c8d956fadde7bf71d883cc33ee4208',
 '5d65f1dc4a719fd673b4d77f2f5bdba61d7ac523':'7425e82ef12006a04904dbbfa8a36d793d4e3b89980c89ab19818c400a1a4374',
 f6949e3e57fe25406968eeaea90ba662343c3e79:'d791af4c9299cba50bd3c02eab558a4372f358ab6c883fc019a0d829f42c079e',
 '456741a61a8e85e597e82503941ccab97777bc97':'93fbaf24ad1a15053e4e168bcef18c0071c709e6482699d468d3fcc9db0944d8',
});
export const INSPECTION_COMPATIBILITY_SHAS=Object.freeze(Object.keys(PATCHES));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url));
const TAGGED=[
 ['src/material/_index.scss','53d2b2f165ff2f5813b6030aa685909b7e51bb28'],
 ['src/material/core/theming/_palette.scss','e2b5faada05cc4a2c00d3404cfb605b9d843db2b'],
 ['src/material/core/theming/_theming.scss','767268e8de79caa0cafc15c475853d7f2e125934'],
 ['src/material/core/typography/_typography.scss','5daff39e7c045ba4b4f9bbaf4ba5761d8aca4ca4'],
 ['src/material/paginator/_paginator-variables.scss','d7746ed5814273ac7cd0edf2eb1075668f15d2c8'],
 ['src/material/button-toggle/_button-toggle-variables.scss','a4d54e09230fdb33c42fba9419db8a6973435afd'],
 ['src/material/legacy-paginator/_paginator-variables.scss','0b41a650c2f0be3413e62fdb4dcee502ac232d48'],
 ['src/material/legacy-paginator/_paginator-theme.scss','12cd9787d2bb9500c97505805a7ea5fc9230710c'],
];
const judgments={
 'src/material/_index.scss':[
  'Exports a new legacy-inspection compatibility flag. This is a post16 inspection API configuration surface, absent from the tagged facade. Keep the owned historical namespace/export map and do not require consumers to set a new flag.',
 ],
 'src/material/core/theming/_m2-inspection.scss':[
  'Adds private extraction of a nested m2-config and uses it for theme type. The add-on owns the tagged M2 map shape and does not call this post16 inspection module; current peer use is limited to authenticated public override mixins.',
  'Unwraps nested m2-config before color inspection. The owned legacy palette/config getters operate on the historical maps directly and make no current private inspection calls; retain that independently owned contract.',
  'Unwraps nested m2-config before typography inspection. The owned historical typography model and namespace bindings remain separate; do not introduce a private peer configuration carrier.',
  'Unwraps nested m2-config before density inspection. The legacy density caller and exact tagged paginator variables/theme remain present; no new inspection flag or private getter is needed.',
  'Changes theme-has to unwrap the new carrier and adds documentation. The owned facade does not export/call post16 theme-has; the existing finite25-function compiler surface and four public override boundaries remain unchanged.',
 ],
 'src/material/core/theming/_theming.scss':[
  'Adds a public default-true compatibility switch. Material16 does not expose that switch; adding it would expand the legacy facade and permit a mode that intentionally disables historical getter access.',
  'Replaces the backwards-compatible color-map merge with version0/m2-config internals, conditionally copying legacy keys. The owned helper is byte-identical to the tagged Material16 function and keeps direct map access. Do not alter consumer map shape or import the compatibility-only peer model.',
 ],
 'src/material/core/theming/tests/theming-inspection-api.spec.ts':[
  'Adds sass:map to the upstream test harness for new flag tests. This changes no owned production source; the original test harness is retained as data and is not executed or inherited by the add-on.',
  'Reindents existing density/theme-has assertions and adds flag-disabled tests, including intentional failure of old getters. Those tests describe the new private inspection contract, not the historical facade; preserve legacy getter and map behavior.',
  'Nests/reindents the existing M3 assertion block under its M3 describe group without changing its expected values. No new owned runtime behavior is supplied by this test organization; complete original hunks are retained rather than classifying from the title.',
 ],
 'src/material/core/theming/_inspection.scss':[
  'Moves a closing brace onto its own line after the same error statement. The exact before-to-after literal replacement proves this is whitespace-only in an unowned post16 inspection module. No inherited behavior fix or owned source change is claimed.',
 ],
 'src/material/paginator/_paginator-variables.scss':[
  'Deletes the MDC-path compatibility file, whose before-image exactly matches the tagged Material16 MDC file. That path is absent from the owned package; the distinct tagged legacy paginator variables and real density caller remain byte-identical. Do not translate this deletion into removing the live legacy density contract.',
 ],
 'src/material/button-toggle/_button-toggle-variables.scss':[
  'Deletes an unused MDC-path variable file whose before-image exactly matches the tagged file. The owned button-toggle theme uses independent token density data and no import of this file; the package declares no modern variable-module export. Keep its existing token defaults and legacy geometry unchanged.',
 ],
};
function blob(member,path,absent){
 assert.equal(member.path,path);assert.equal(typeof member.body,'string');assert.equal(Buffer.byteLength(member.body),member.bytes);assert.equal(hash(member.body),member.sha256);
 if(absent){assert.equal(member.absent,true);assert.equal(member.blob,'0'.repeat(40));assert.equal(member.body,'');}
 else{assert.equal(member.absent,undefined);assert.equal(gitHash('blob',member.body),member.blob);}
}
export function verifyInspectionCompatibilityOriginals(original,census){
 assert.equal(census.commits.length,1697);assert.equal(new Set(census.commits.map(row=>row.sha)).size,1697);
 assert.equal(original.line,'21.x');assert.equal(original.original_file_occurrences,7);assert.equal(original.original_hunks,14);
 assert.deepEqual(original.actual_status_occurrences,{M:5,D:2});assert.deepEqual(original.reviews.map(row=>row.sha),INSPECTION_COMPATIBILITY_SHAS);
 assert.equal(original.upstream_code_executed,false);assert.equal(original.canonical_decisions_changed,0);
 assert.equal(original.tagged_reference.tag,'16.2.14');assert.equal(original.tagged_reference.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');
 assert.deepEqual(original.tagged_reference.members.map(m=>[m.path,m.blob]),TAGGED);
 const tagged=new Map();for(const member of original.tagged_reference.members){blob(member,member.path,false);tagged.set(member.path,member);}
 let files=0,hunks=0,present=0;const reviews=[];
 for(const source of original.reviews){
  const row=census.commits.find(row=>row.sha===source.sha);assert.ok(row);assert.equal(gitHash('commit',source.raw_commit),source.sha);assert.equal(source.raw_commit,row.raw_commit);
  assert.deepEqual(row.parents,[source.parent]);assert.equal(hash(source.diff),PATCHES[source.sha]);assert.equal(source.diff_sha256,PATCHES[source.sha]);
  assert.deepEqual(source.frozen_seed_paths,row.ledger_comparison.listed_paths);assert.deepEqual(source.sections.map(s=>s.path),row.complete_changed_files.map(m=>m.path));
  assert.equal(source.sections.map(s=>s.patch).join(''),source.diff);const whole=[];
  for(const [index,section]of source.sections.entries()){
   const member=row.complete_changed_files[index];assert.equal(section.status,member.status);
   for(const side of ['before','after']){assert.equal(section[side+'_mode'],member[side+'_mode']);assert.equal(section[side].blob,member[side+'_blob']);blob(section[side],section.path,member[side+'_mode']==='000000');if(member[side+'_mode']!=='000000')present++;}
   assert.equal(hash(section.patch),section.patch_sha256);const replayed=replayThemingSection(section);assert.equal(replayed.length,judgments[section.path].length);files++;hunks+=replayed.length;
   whole.push(...replayed.map((hunk,i)=>({path:section.path,index:hunk.index,header:hunk.header,sha256:hunk.sha256,technical_judgment:judgments[section.path][i]})));
   if(section.status==='D')assert.deepEqual(section.before,tagged.get(section.path));
  }
  reviews.push({sha:source.sha,diff_sha256:PATCHES[source.sha],complete_original_paths:source.sections.map(s=>s.path),frozen_seed_paths:source.frozen_seed_paths,
   whole_original_hunk_reviews:whole,source_review_complete:true,proposed_final_disposition:source.sha===INSPECTION_COMPATIBILITY_SHAS[0]?'do-not-adopt':'not-applicable',affected_branches:['21.x'],review_depth:'individual-compatibility',canonical_disposition_applied:false});
 }
 assert.equal(files,7);assert.equal(hunks,14);assert.equal(present,12);
 const fix=original.reviews[1].sections[0],from="    @error 'Valid systems are: base, color, typography, density. Got:' $system;  }\n",to="    @error 'Valid systems are: base, color, typography, density. Got:' $system;\n  }\n";
 assert.equal(fix.before.body.split(from).length,2);assert.equal(fix.before.body.replace(from,to),fix.after.body);
 return {reviews,original_files:files,original_hunks:hunks,present_original_blobs:present,tagged_blobs:8,exact_patch_replays:7,whitespace_only_fixups:1,tagged_deleted_modern_files:2};
}
export function assertHistoricalInspectionModel(path,raw){
 const text=raw.toString().replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 assert.equal(text.includes('theme-legacy-inspection-api-compatibility'),false,'post16 compatibility flag in owned source '+path);
 if(path==='projects/ngx-material-legacy/styles/core/theming/_theming.scss')assert.equal(text.includes('_mat-theming-internals-do-not-access'),false,'post16 map carrier in owned model');
}
function backwardsHelper(text){
 const start=text.indexOf('@function private-create-backwards-compatibility-theme(');assert.ok(start>=0);assert.equal(text.indexOf('@function private-create-backwards-compatibility-theme(',start+1),-1);
 const open=text.indexOf('{',start);let depth=1,index=open+1;for(;depth&&index<text.length;index++){if(text[index]==='{')depth++;if(text[index]==='}')depth--;}
 assert.equal(depth,0);return text.slice(start,index);
}
export function reviewInspectionCompatibilitySource({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const shared=reviewThemingInspectionSource({root,read}),bound=new Map(shared.bound.map(ref=>[ref.path,ref]));
 const c04=spinnerSnackC04Source({root,read});for(const ref of c04.bound)bound.set(ref.path,ref);
 function member(ref){ref=c04.qualify(ref);const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed inspection source subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;}
 function current(path){const raw=read(path);return member({path,sha256:hash(raw),bytes:raw.length});}
 member({path:'scripts/upstream-inspection-compatibility-source-review.mjs',sha256:hash(image),bytes:image.length});
 const original=JSON.parse(gunzipSync(member(ORIGINAL))),seed=JSON.parse(gunzipSync(member(SEED))),census=JSON.parse(gunzipSync(member(CENSUS)));
 assert.deepEqual(original.reviews,seed.reviews);assert.equal(original.seed_capsule_sha256,SEED.sha256);
 const facts=verifyInspectionCompatibilityOriginals(original,census),tagged=new Map(original.tagged_reference.members.map(m=>[m.path,m]));
 for(const ref of shared.bound)if(ref.path.startsWith('projects/')&&ref.path.endsWith('.scss'))assertHistoricalInspectionModel(ref.path,member(ref));
 const modelPath='projects/ngx-material-legacy/styles/core/theming/_theming.scss',model=read(modelPath).toString();
 assert.equal(backwardsHelper(model),backwardsHelper(tagged.get('src/material/core/theming/_theming.scss').body));
 assert.ok(model.includes('$_disable-color-backwards-compatibility: false;'));
 const legacyVariables=tagged.get('src/material/legacy-paginator/_paginator-variables.scss'),legacyTheme=tagged.get('src/material/legacy-paginator/_paginator-theme.scss');
 let routedLegacyTheme=legacyTheme.body;
 for(const path of ['theming/theming','typography/typography','typography/typography-utils','density/private/compatibility']){
  const before="@use '../core/"+path+"';",after="@use '../styles/core/"+path+"';";
  assert.equal(routedLegacyTheme.split(before).length,2);routedLegacyTheme=routedLegacyTheme.replace(before,after);
 }
 for(const base of ['projects/ngx-material-legacy/styles/legacy-paginator/','projects/ngx-material-legacy/legacy-paginator/']){
  assert.equal(current(base+'_paginator-variables.scss').toString(),legacyVariables.body);assert.equal(current(base+'_paginator-theme.scss').toString(),base.includes('/styles/')?legacyTheme.body:routedLegacyTheme);
 }
 assert.ok(legacyTheme.body.includes("@use './paginator-variables';"));assert.ok(legacyTheme.body.includes('paginator-variables.$density-config'));assert.ok(legacyTheme.body.includes('min-height: $height;'));
 const absent=['projects/ngx-material-legacy/styles/core/theming/_inspection.scss','projects/ngx-material-legacy/styles/core/theming/_m2-inspection.scss','projects/ngx-material-legacy/styles/paginator/_paginator-variables.scss','projects/ngx-material-legacy/styles/button-toggle/_button-toggle-variables.scss'];
 const assertAbsent=()=>{for(const path of absent){let missing=false;try{read(path);}catch(error){assert.equal(error.code,'ENOENT');missing=true;}assert.equal(missing,true,'unreviewed modern/inspection counterpart '+path);}};assertAbsent();
 const tokens=current('projects/ngx-material-legacy/styles/core/tokens/m2/mat/_standard-button-toggle.scss').toString();assert.ok(tokens.includes('0: 48px,')&&tokens.includes('-4: 24px,'));
 const packagePath='projects/ngx-material-legacy/package.json',ngPackagePath='projects/ngx-material-legacy/ng-package.json',exportsPath='compatibility/rc/matrices/library-exports.json';
 const pkg=JSON.parse(current(packagePath)),ng=JSON.parse(current(ngPackagePath)),exports=JSON.parse(current(exportsPath));
 assert.ok(pkg.version.startsWith('21.'));assert.deepEqual(Object.keys(pkg.exports),['.','./_index']);assert.ok(ng.assets.includes('./styles/**/*.scss'));
 assert.equal(exports.exports.some(key=>key.includes('paginator-variables')||key.includes('button-toggle-variables')||key==='./button-toggle'),false);
 const assertCurrent=()=>{c04.assertCurrent();shared.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late inspection source change '+ref.path);assert.equal(raw.length,ref.bytes);}assertAbsent();};assertCurrent();
 const report={schema_version:1,line:'21.x',role:'Four individually reviewed original source proposals; no canonical admission or fresh full Sass execution',...facts,
  originals:ORIGINAL,seed_originals:SEED,source_census:CENSUS,shared_sass_owner:{path:'scripts/upstream-theming-inspection-source-review.mjs',sha256:shared.bound.find(ref=>ref.path==='scripts/upstream-theming-inspection-source-review.mjs').sha256},
  current_source_bindings:structuredClone([...bound.values()].sort((a,b)=>a.path.localeCompare(b.path))),current_public_bridge:structuredClone(c04.summary),absent_owned_counterparts:absent,historical_exported_functions:25,owned_scss_members:409,public_override_boundaries:8,historical_public_override_boundaries:4,
  tagged_backwards_helper_preserved:true,tagged_legacy_paginator_variables_and_caller_preserved:true,button_toggle_token_defaults_preserved:true,package_asset_and_export_declarations_checked:true,
  legacy_theme_module_source_rewrites:4,legacy_theme_namespace_or_mixin_or_selector_rewrites:0,
  fresh_compiler_execution_this_review:false,upstream_code_executed:false,source_scope_only:true,canonical_decisions_changed:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
 const historical_report=c04.assertReportSuccessor('inspection-compatibility',report);
 return {report,historical_report,bound:structuredClone([...bound.values()]),assertCurrent};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);const review=reviewInspectionCompatibilitySource();review.assertCurrent();writeFileSync(process.argv[2],JSON.stringify(review.report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({result:'pass',original_files:7,original_hunks:14,proposed_individual_source_decisions:4,canonical_decisions_changed:0}));
}
