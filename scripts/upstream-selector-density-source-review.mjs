/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Whole-patch review and bounded tagged/owned Sass behavior; no product gate credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {replayThemingSection} from './upstream-theming-inspection-source-review.mjs';
import {reviewInspectionCompatibilitySource} from './upstream-inspection-compatibility-source-review.mjs';
const require=createRequire(import.meta.url),sass=require('sass');
import {createCurrentSliderSelectorReports} from './current-sass-slider-selector-reports.mjs';
const CURRENT_REPORT_HELPER={"path":"scripts/current-sass-slider-selector-reports.mjs","sha256":"aabc3425e12c038aa483730bf13abf23962693b465ab87e8cefdae35036e36a3","bytes":9342};
const PREFIX='compatibility/rc/21x-c04-selector-density-';
const ORIGINAL={path:PREFIX+'originals-complete-context.json.gz',sha256:'953704cbc6582bee957c2caa11e533d43a3367a50c77ccb981e35fa9d742e77d'};
const SEED={path:PREFIX+'originals.json.gz',sha256:'dbb813e06a0c09df47429b966f4fdaa59295ac9d1303f1d80b4caeb90ff5ccd7'};
const CENSUS={path:'compatibility/rc/upstream-complete-patch-census.json.gz',sha256:'806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'};
const PATCHES={
 '999029aa5a23e9577503775c1ea4513e5c3cb4f9':'249c9cc504ffdd33543602ea6736e3d064bb6bb7df3d994d4d41494455fadc5e',
 '4395cdf55a4b08d76aecd2e0378f3079289ce9c0':'a46ce23442183185d6483e3747f9080c4d80b6251db87aa559126a8dbdd75c6b',
};
export const SELECTOR_DENSITY_SHAS=Object.freeze(Object.keys(PATCHES));
const TAGGED=[
 ['src/material/core/style/_sass-utils.scss','772cfbec7b3529e02be4fff48fc21d295ec58400'],
 ['src/material/core/density/private/_compatibility.scss','ea01986af74b523eb1b5515f8f7d6af1319cf5df'],
 ['src/material/core/theming/_theming.scss','767268e8de79caa0cafc15c475853d7f2e125934'],
 ['src/material/legacy-paginator/_paginator-theme.scss','12cd9787d2bb9500c97505805a7ea5fc9230710c'],
 ['src/material/core/theming/_palette.scss','e2b5faada05cc4a2c00d3404cfb605b9d843db2b'],
 ['src/material/legacy-paginator/_paginator-variables.scss','0b41a650c2f0be3413e62fdb4dcee502ac232d48'],
];
const COMPILER=[
 {path:'node_modules/sass/package.json',sha256:'c6d07347951e35cf2fee0f4ffb14b9a298daba837d1f8d515d2e8cac064022a7',bytes:856},
 {path:'node_modules/sass/sass.node.js',sha256:'eb7a01ba57a04a0a421bdef0bf2f43558af4790b540a45501ec83900b07b0625',bytes:343},
 {path:'node_modules/sass/sass.dart.js',sha256:'30a2f37d9a2ee27d125681477ef5e1f3c29b446137921472bb9802f10d9e64e1',bytes:5675052},
];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url));
const judgments={
 'src/material/core/style/_sass-utils.scss':[
  'Replaces at-root/interpolated parent selection with an if-parent/content branch and a nested default root. The original commit documents reversed declaration order on its historical compiler. The owned helper is the exact Material16 blob; bounded pinned-Sass tests compare it with the untouched tag and the reviewed replacement, including the original red-then-green example. Preserve tagged emitted rule grouping; no older-compiler or full consumer-floor clearance is claimed.',
 ],
 'src/material/core/theming/tests/theming-mixin-api.spec.ts':[
  'Disables the dark-theme density assertion and records that root inclusion and inclusion inside html differ. The whole regression-test hunk was reviewed; it adds no replacement active assertion. Do not disable or broaden an owned legacy density check to admit a source change. Actual tagged/owned root, scoped, duplicate and flag-reset behavior is measured separately.',
 ],
 'src/material/core/density/private/_compatibility.scss':[
  'Deletes the complete74-line density helper, exactly the untouched Material16 blob. This file is live in the owned legacy paginator and tree paths and controls root placement, duplicate suppression, density scaling and errors. Keep the local historical helper; an upstream unused label cannot remove this owned contract.',
 ],
 'src/material/core/theming/_theming.scss':[
  'Removes the compatibility module import. The owned Material16 theming mixin still sets that module state around real legacy density callers; deleting the import would sever a live dependency.',
  'Removes root-generation and duplicate-suppression setup/reset around content. The owned mixin remains exact to the tagged function, and bounded tagged/owned tests require first legacy density at root, repeat suppression, independent component IDs, valid min/max bounds and restoration of both flags. Preserve this behavior and the existing warning policy.',
 ],
};
function blob(member,path,absent){
 assert.equal(member.path,path);assert.equal(typeof member.body,'string');assert.equal(Buffer.byteLength(member.body),member.bytes);assert.equal(hash(member.body),member.sha256);
 if(absent){assert.equal(member.absent,true);assert.equal(member.blob,'0'.repeat(40));assert.equal(member.body,'');}
 else{assert.equal(member.absent,undefined);assert.equal(gitHash('blob',member.body),member.blob);}
}
export function verifySelectorDensityOriginals(original,census){
 assert.equal(census.commits.length,1697);assert.equal(new Set(census.commits.map(row=>row.sha)).size,1697);
 assert.equal(original.line,'21.x');assert.equal(original.original_file_occurrences,4);assert.equal(original.original_hunks,5);
 assert.deepEqual(original.actual_status_occurrences,{M:3,D:1});assert.deepEqual(original.reviews.map(row=>row.sha),SELECTOR_DENSITY_SHAS);
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
   whole_original_hunk_reviews:whole,source_review_complete:true,proposed_final_disposition:'do-not-adopt',affected_branches:['21.x'],review_depth:'individual-compatibility',canonical_disposition_applied:false});
 }
 assert.equal(files,4);assert.equal(hunks,5);assert.equal(present,7);
 const patch=original.reviews[0];assert.ok(patch.raw_commit.includes('resulting in the order\nbeing flipped:'));
 const test=patch.sections[1];assert.ok(test.before.body.includes("    expect(hasDensityStyles(parsed, '.dark-theme')).toBe('all');"));
 assert.equal(test.after.body.includes("\n    expect(hasDensityStyles(parsed, '.dark-theme')).toBe('all');"),false);
 assert.ok(test.after.body.includes("// expect(hasDensityStyles(parsed, '.dark-theme')).toBe('all');"));
 return {reviews,original_files:files,original_hunks:hunks,present_original_blobs:present,tagged_blobs:6,exact_patch_replays:4,disabled_original_density_assertions:1};
}
export function sassDeclaration(text,kind,name){
 const marker='@'+kind+' '+name+'(',start=text.indexOf(marker);assert.ok(start>=0,marker);assert.equal(text.indexOf(marker,start+1),-1);
 const open=text.indexOf('{',start);let depth=1,index=open+1;for(;depth&&index<text.length;index++){if(text[index]==='{')depth++;if(text[index]==='}')depth--;}
 assert.equal(depth,0);return text.slice(start,index);
}
function compile(program,modules){
 const logs=[],warnings=[];const importer={canonicalize(value,context){
  let url;try{url=new URL(value,context.containingUrl??'review:/');}catch{return null;}
  if(url.protocol!=='review:')return null;
  let path=url.pathname;if(!path.endsWith('.scss'))path=posix.join(posix.dirname(path),'_'+posix.basename(path)+'.scss');
  return Object.hasOwn(modules,path)?new URL('review:'+path):null;
 },load(url){assert.ok(Object.hasOwn(modules,url.pathname));return {contents:modules[url.pathname],syntax:'scss'};}};
 try{
  const result=sass.compileString(program,{style:'expanded',charset:false,importers:[importer],silenceDeprecations:['if-function','global-builtin','color-functions','import','slash-div'],logger:{warn(message){warnings.push(message);},debug(message){logs.push(message);}}});
  assert.ok(result.loadedUrls.every(url=>url.protocol==='review:'));
  return {css:result.css,css_sha256:hash(result.css),debug:logs,warnings,loaded_virtual_modules:result.loadedUrls.map(url=>url.pathname).sort()};
 }catch(error){if(typeof error.sassMessage!=='string')throw error;return {error:error.sassMessage,debug:logs,warnings};}
}
const SELECTOR_CASES=[
 ['root','@include own.current-selector-or-root { --probe: root; }'],
 ['root-custom','@include own.current-selector-or-root(body) { --probe: custom; }'],
 ['scoped','.scope { @include own.current-selector-or-root { --probe: scoped; } }'],
 ['selector-list','.first, .second { @include own.current-selector-or-root { --probe: list; } }'],
 ['nested','.outer { .inner { @include own.current-selector-or-root { --probe: nested; } } }'],
 ['media','@media (min-width: 40rem) { .scope { @include own.current-selector-or-root { --probe: media; } } }'],
 ['supports','@supports (display: grid) { .scope { @include own.current-selector-or-root { --probe: supports; } } }'],
 ['layer','@layer specimen { .scope { @include own.current-selector-or-root { --probe: layer; } } }'],
 ['ordered','.scope { --before: one; @include own.current-selector-or-root { --inside: two; } --after: three; }'],
 ['scope-variable','.scope { $value: before; @include own.current-selector-or-root { $value: after; --inside: #{$value}; } --after: #{$value}; }'],
 ['nested-rule','.scope { .child { --child: one; } @include own.current-selector-or-root { --inside: two; .second { --nested: three; } } --after: four; }'],
 ['original-counterexample','div { @include own.current-selector-or-root { color: red; } color: green; }'],
];
export function measureSelectorHelper({owned,tagged,reviewedAfter}){
 assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));
 const cases=SELECTOR_CASES.map(([id,body])=>{
  const program='@use "review:/utils" as own;\n'+body,outputs={};
  for(const [role,source]of [['tagged',tagged],['owned',owned],['reviewed_after',sassDeclaration(reviewedAfter,'mixin','current-selector-or-root')]])outputs[role]=compile(program,{'/_utils.scss':source});
  assert.equal(outputs.tagged.error,undefined,id);assert.deepEqual(outputs.owned,outputs.tagged,'owned selector behavior differs from tagged16: '+id);assert.equal(outputs.reviewed_after.error,undefined,id);
  if(id==='original-counterexample')for(const value of Object.values(outputs))assert.equal([...value.css.matchAll(/color: (red|green);/g)].at(-1)[1],'green','original declaration-order counterexample still fails');
  return {id,program,program_sha256:hash(program),...outputs,reviewed_after_changes_emitted_css:outputs.reviewed_after.css!==outputs.tagged.css};
 });
 assert.equal(cases.filter(row=>row.reviewed_after_changes_emitted_css).length,4);
 return {cases,case_count:cases.length,owned_matches_untouched_tag:true,reviewed_after_changed_css_cases:4,original_order_reversal_reproduced_on_pinned_compiler:false,original_counterexample_final_color:'green',older_compiler_or_browser_or_full_consumer_qualified:false};
}
const DENSITY_CASES=[
 ['legacy-once',`.dark { @include emit($legacy, same); @debug flags(); } .light { @include emit($legacy, same); @debug flags(); }`],
 ['modern-scoped',`.first { @include emit($modern, same); @debug flags(); } .second { @include emit($modern, same); @debug flags(); }`],
 ['min-max',`@include paginator.density(minimum); @include paginator.density(maximum); @debug flags();`],
 ['disabled',`compatibility.$private-density-generate-styles: false; .disabled { @include paginator.density(0); } compatibility.$private-density-generate-styles: true; .enabled { @include paginator.density(0); } @debug flags();`],
 ['legacy-then-modern',`.old { @include emit($legacy, old); @debug flags(); } .new { @include emit($modern, new); @debug flags(); }`],
 ['distinct-ids',`.first { @include emit($legacy, first); @debug flags(); } .second { @include emit($legacy, second); @debug flags(); }`],
 ['invalid-range',`@include paginator.density(-5);`],
 ['invalid-scale',`@include paginator.density(wide);`],
];
export function measureLegacyDensity({owned,tagged}){
 const cases=DENSITY_CASES.map(([id,body])=>{
  const program=`@use 'review:/core/theming/theming' as theming;\n@use 'review:/core/density/private/compatibility';\n@use 'review:/legacy-paginator/density-subject' as paginator;\n$legacy: (_is-legacy-theme: true, density: 0);\n$modern: (color: null, typography: null, density: -1);\n@function flags() { @return '#{compatibility.$private-density-generate-at-root},#{compatibility.$private-density-generate-styles}'; }\n@mixin emit($theme, $id) { @include theming.private-check-duplicate-theme-styles($theme,$id) { @include paginator.density($theme); } }\n`+body;
  const results={};for(const [role,sources]of [['tagged',tagged],['owned',owned]]){
   const modules=Object.fromEntries(Object.entries(sources).map(([path,source])=>['/'+path,source]));
   modules['/legacy-paginator/_density-subject.scss']="@use '../core/theming/theming';\n@use '../core/density/private/compatibility';\n@use './paginator-variables';\n"+sassDeclaration(sources['legacy-paginator/_paginator-theme.scss'],'mixin','density');
   results[role]=compile(program,modules);
  }
  assert.deepEqual(results.owned,results.tagged,'owned density differs from untouched tagged16: '+id);
  const expected=results.tagged;
  if(id.startsWith('invalid-'))assert.equal(expected.error,id==='invalid-range'?'"mat-density: height must be between 40px and 56px (inclusive), but received 36px."':'"mat-density: Supported density scales default, minimum, maximum, but received wide."',id);
  else{
   assert.equal(expected.error,undefined,id);assert.ok(expected.debug.every(value=>value==='false,true'),'density flags not restored: '+id);
   if(id==='legacy-once'){assert.equal((expected.css.match(/min-height: 56px/g)??[]).length,1);assert.equal(/\.dark|\.light/.test(expected.css),false);}
   if(id==='modern-scoped'){assert.ok(expected.css.includes('.first .mat-paginator-container')&&expected.css.includes('.second .mat-paginator-container'));assert.equal((expected.css.match(/min-height: 52px/g)??[]).length,2);}
   if(id==='min-max')assert.ok(expected.css.includes('min-height: 40px;')&&expected.css.includes('min-height: 56px;'));
   if(id==='disabled')assert.equal(expected.css.includes('.disabled'),false);
   if(id==='legacy-then-modern')assert.ok(expected.css.startsWith('.mat-paginator-container')&&expected.css.includes('.new .mat-paginator-container'));
   if(id==='distinct-ids')assert.equal((expected.css.match(/min-height: 56px/g)??[]).length,2);
  }
  return {id,program,program_sha256:hash(program),...results};
 });
 return {cases,case_count:cases.length,tagged_density_mixin_extracted_without_body_edits:true,full_paginator_color_typography_or_product_qualified:false};
}
export function reviewSelectorDensitySource({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 root=resolve(root);const helperBytes=readFileSync(join(root,CURRENT_REPORT_HELPER.path));assert.equal(hash(helperBytes),CURRENT_REPORT_HELPER.sha256);assert.equal(helperBytes.length,CURRENT_REPORT_HELPER.bytes);
 const currentSource=createCurrentSliderSelectorReports({root,read});read=currentSource.read;
 const shared=reviewInspectionCompatibilitySource({root,read}),bound=new Map([...shared.bound,...currentSource.bound].map(ref=>[ref.path,ref]));
 function member(ref){ref=currentSource.qualify(ref);const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed selector/density source '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;}
 function current(path){const raw=read(path);return member({path,sha256:hash(raw),bytes:raw.length});}
 member({path:'scripts/upstream-selector-density-source-review.mjs',sha256:hash(image),bytes:image.length});
 for(const ref of COMPILER)member(ref);
 assert.equal(JSON.parse(current('package.json')).devDependencies.sass,'1.104.1');assert.equal(current('.node-version').toString().trim(),'24.21.0');current('toolchain-lock.json');
 const original=JSON.parse(gunzipSync(member(ORIGINAL))),seed=JSON.parse(gunzipSync(member(SEED))),census=JSON.parse(gunzipSync(member(CENSUS)));
 assert.deepEqual(original.reviews,seed.reviews);assert.equal(original.seed_capsule_sha256,SEED.sha256);
 const facts=verifySelectorDensityOriginals(original,census),taggedMembers=new Map(original.tagged_reference.members.map(m=>[m.path,m]));
 const owned={},tagged={};for(const [path]of TAGGED){const part=path.replace('src/material/','');owned[part]=current('projects/ngx-material-legacy/styles/'+part).toString();tagged[part]=taggedMembers.get(path).body;}
 for(const path of ['core/style/_sass-utils.scss','core/density/private/_compatibility.scss','legacy-paginator/_paginator-theme.scss','legacy-paginator/_paginator-variables.scss'])assert.equal(owned[path],tagged[path],path);
 assert.equal(sassDeclaration(owned['core/theming/_theming.scss'],'mixin','private-check-duplicate-theme-styles'),sassDeclaration(tagged['core/theming/_theming.scss'],'mixin','private-check-duplicate-theme-styles'));
 const selector=measureSelectorHelper({owned:owned['core/style/_sass-utils.scss'],tagged:tagged['core/style/_sass-utils.scss'],reviewedAfter:original.reviews[0].sections[0].after.body});
 const density=measureLegacyDensity({owned,tagged});
 const selectorCallers=[],densityCallers=[];
 for(const ref of shared.bound.filter(ref=>ref.path.startsWith('projects/')&&ref.path.endsWith('.scss'))){
  const text=member(ref).toString();for(const [name,target]of [['sass-utils.current-selector-or-root',selectorCallers],['compatibility.private-density-legacy-compatibility',densityCallers]]){
   const calls=[...text.matchAll(new RegExp('@include\\s+'+name.replaceAll('.','\\.')+'\\s*\\(','g'))];if(calls.length)target.push({path:ref.path,calls:calls.length});
  }
 }
 selectorCallers.sort((a,b)=>a.path.localeCompare(b.path));densityCallers.sort((a,b)=>a.path.localeCompare(b.path));
 assert.equal(selectorCallers.length,20);assert.equal(selectorCallers.reduce((n,row)=>n+row.calls,0),41);assert.deepEqual(densityCallers.map(ref=>ref.path),['projects/ngx-material-legacy/legacy-paginator/_paginator-theme.scss','projects/ngx-material-legacy/styles/legacy-paginator/_paginator-theme.scss','projects/ngx-material-legacy/styles/tree/_tree-theme.scss']);
 const facade=member(shared.bound.find(ref=>ref.path==='projects/ngx-material-legacy/_index.scss')).toString();assert.ok(facade.includes("@forward './styles/core/style/sass-utils' as private-*;"));
 const aggregate=member(shared.bound.find(ref=>ref.path==='projects/ngx-material-legacy/styles/legacy-core/theming/_all-theme.scss')).toString();
 for(const path of ['legacy-paginator/paginator-theme','tree/tree-theme','badge/badge-theme'])assert.ok(aggregate.includes(path));
 const assertCurrent=()=>{shared.assertCurrent();currentSource.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late selector/density source change '+ref.path);assert.equal(raw.length,ref.bytes);}currentSource.assertCurrent();};assertCurrent();
 const report={schema_version:1,line:'21.x',role:'Two individually reviewed source proposals and bounded Sass behavior; no full product or canonical admission credit',...facts,
  originals:ORIGINAL,seed_originals:SEED,source_census:CENSUS,current_source_bindings:structuredClone([...bound.values()]),selector_callers:selectorCallers,density_wrapper_callers:densityCallers,historical_exported_functions:25,owned_scss_members:409,public_override_boundaries:9,historical_public_override_boundaries:4,current_public_bridge:structuredClone(currentSource.summary),
  compiler:sass.info,compiler_inputs:COMPILER,selector_measurement:selector,density_measurement:density,
  fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,reviewed_after_selector_mixin_sass_executed:true,upstream_typescript_tests_or_workflows_executed:false,full_sass_gate_executed:false,canonical_decisions_changed:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
 report.current_source_bindings.sort((a,b)=>a.path.localeCompare(b.path));
 const historical_report=currentSource.assertReportSuccessor('selector-density',report);
 return {report,historical_report,bound:structuredClone([...bound.values()]),assertCurrent};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);const scope=reviewSelectorDensitySource();scope.assertCurrent();writeFileSync(process.argv[2],JSON.stringify(scope.report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({result:'pass',original_files:4,original_hunks:5,selector_cases:scope.report.selector_measurement.case_count,density_cases:scope.report.density_measurement.case_count,source_bindings:scope.bound.length,canonical_decisions_changed:0}));
}
