/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two whole original source reviews, tagged slider identity and bounded historical CSS. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {replayThemingSection} from './upstream-theming-inspection-source-review.mjs';
import {reviewInspectionCompatibilitySource} from './upstream-inspection-compatibility-source-review.mjs';
import {measureSurfaceThemeContracts,verifySurfaceThemeReference} from './upstream-surface-m3-theme-source-review.mjs';
import {createCurrentSliderSelectorReports} from './current-sass-slider-selector-reports.mjs';
const CURRENT_REPORT_HELPER={"path":"scripts/current-sass-slider-selector-reports.mjs","sha256":"aabc3425e12c038aa483730bf13abf23962693b465ab87e8cefdae35036e36a3","bytes":9342};
const PREFIX='compatibility/rc/21x-c04-slider-m3-repairs-';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url)),sass=createRequire(import.meta.url)('sass');
const ORIGINAL={"path":"compatibility/rc/21x-c04-slider-m3-repairs-originals.json.gz","sha256":"7799d578f2a05a537a95fee19abceaf22e7263839061f3c1f252b0a68b7870d1","bytes":677624};
const REFERENCE={"path":"compatibility/rc/21x-c04-surface-m3-theme-tagged-sass-inputs.json.gz","sha256":"dc59dd309818a7c94db78ce310f351c03124cf6ddc1150456f9e36a75f0301e1","bytes":79756};
const REFERENCE_ORIGINALS={"path":"compatibility/rc/21x-c04-surface-m3-theme-originals.json.gz","sha256":"4419fdf147812c104f4de8dff4264a378d8d43cca197386ed75c9a4d6b56ca2b","bytes":81363};
const IDENTITY={"path":"compatibility/rc/original16-sass-source-diagnostic-identity.json","sha256":"324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe","bytes":89908};
const CATALOG={"path":"fixtures/sass/mixin-argument-contracts.json","sha256":"c1d1151a8c1fa02cea0c6fac5618bbefe11dd018bbfff1d30f5c3f35f8fc8770","bytes":143838};
const CENSUS={"path":"compatibility/rc/upstream-complete-patch-census.json.gz","sha256":"806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97","bytes":2172936};
const PATCHES={"4550637812dadb67a9af21df261899eaf3f1ae4c":"a23da920b33d5b2848939ed594a1298bcb818322f2a686652b679b20d958f6d0","90b37e5652bad1044dff3c4702aa4b73b715117a":"d12d786ece63cc1e97e30d6711b62dbb644c9f464a895e65ca5ed859f388c201"};
const TAGGED=[["src/material/slider/_slider-theme.scss","e6974ac0bf1db4ed2855261857f4dc4c736a2189"],["src/material/slider/slider.scss","e9244712551276e5b5a0f582955a8dc110ae276d"],["src/material/legacy-slider/_slider-theme.scss","3bb2255959d87690fb510a5d6928f0d8ca1c1bf4"],["src/material/legacy-slider/slider.scss","c16637bf9230b6e66804a4dc3de21106c49deba5"],["src/material/core/theming/_palette.scss","e2b5faada05cc4a2c00d3404cfb605b9d843db2b"],["src/material/core/theming/_theming.scss","767268e8de79caa0cafc15c475853d7f2e125934"]];
export const SLIDER_M3_REPAIRS_SHAS=Object.freeze(Object.keys(PATCHES));
const judgments={
 "4550637812dadb67a9af21df261899eaf3f1ae4c": {
  "src/material-experimental/theming/_custom-tokens.scss": [
   "Adds seven experimental M3 geometry values: zero padding,28px square, no caret, asymmetric border radius and opposite container/text rotations. The existing legacy component has its own tagged28px label, focus states and horizontal/vertical transforms; the exported MDC-era M2 theme remains the tagged model. Do not transplant these new token slots or overwrite either historical geometry contract."
  ],
  "src/material/core/tokens/m2/mat/_slider.scss": [
   "Populates the newer M2 token module with auto width,32px height, visible caret,4px radius,0 12px padding and unrotated text/translated container. These are the newer structural token defaults, not a reason to add a module absent from the tagged model. Review the exact original structural producer and the live separate legacy resource rather than classifying from the missing module alone.",
   "Keeps dark0.9/light0.6 opacity unchanged while removing a trailing comma and correcting a closing-brace indent. The owned modern theme already computes those values; fresh dark/light CSS and opacity mutations cover them.",
   "Reindents the four existing get-token-slots arguments without changing their calls or order. Exact original before/after source replay retains this formatting-only part within the behavioral patch."
  ],
  "src/material/slider/_slider-theme.scss": [
   "Adds mat-slider untintable token emission in the post16 base mixin next to MDC untintable tokens. That parent already exposes base/version/private-inspection APIs absent from the tagged owned theme. Preserve the actual exported historical color/typography/density/theme forward list instead of adopting a modern base/token API."
  ],
  "src/material/slider/slider.scss": [
   "Adds container transform, width/height/padding/radius/caret and text width/transform token slots, retaining the opacity slot. These belong to the unowned newer MDC structural component. The owned legacy component resource is authenticated against the complete tagged source with only three prior module reroutes and four prior high-contrast argument cleanups; no modern structural fork or geometry port is made.",
   "Centers MDC indicator text in the modern structural block. The owned legacy label retains tagged flex alignment, its distinct text node and complete motion/focus/RTL rules; no consumer HTML or selector change is authorized."
  ],
  "yarn.lock": [
   "Consolidates six caniuse-lite range selectors previously resolved to1.0.30001495/1.0.30001519/1.0.30001551 into1.0.30001570, changing archive URLs/integrities and removing duplicate data entries. This affects upstream browser-data/tool resolution, not the independently owned slider theme graph. The current pinned pnpm lock and toolchain remain their own authority; no upstream lock/install/browser-target update is inherited and no security clearance is claimed."
  ]
 },
 "90b37e5652bad1044dff3c4702aa4b73b715117a": {
  "src/material-experimental/theming/_custom-tokens.scss": [
   "Computes experimental primary ripple and null-safe5% hover/20% focus values from md-sys-color, adding three custom token entries. The owned M2 theme already emits primary/accent/warn ripple values through its historical MDC palette context, while the separate legacy focus ring retains its tagged rules; preserve both models and measure their complete CSS."
  ],
  "src/material/core/tokens/m2/mat/_slider.scss": [
   "Adds sass:map for the newer token-map merge. The owned tagged theme already owns its historical map import; an added upstream import does not prove equivalence or justify a new module.",
   "Splits palette-sensitive ripple values into a new private inspection helper and merges primary values with unchanged dark/light indicator opacity. Null colors remain null instead of rgba(null). This new private/model surface is not adopted; the owned palette producer and all three historical ripple custom-property spellings remain, with real palette/ripple/opacity CSS mutations rejected."
  ],
  "src/material/slider/_slider-theme.scss": [
   "Replaces primary/accent/warn calls to the old ripple mixin with mat-slider token maps while retaining MDC color maps. This changes all three palette routes and custom-property names; preserve the live tagged _slider-color producer and independently measured historical selectors/values instead of only testing primary.",
   "Deletes the old _slider-ripple-color helper and its three --mat-mdc-slider-* properties after moving them into the token module. The owned16 theme has its own _slider-color helper with those real properties; absence of the newer helper is not evidence that the historical output can be deleted."
  ],
  "src/material/slider/slider.scss": [
   "Moves all ripple selector blocks under the mat-slider token context, replacing var(--mat-mdc-slider-*, transparent) declarations with token-generated ripple-color/hover-state-layer-color/focus-state-layer-color slots. The redundant .mat-ripple specificity and focus/active grouping remain upstream. This is a modern structural contract change, not a legacy style migration; authenticate the full old structural source and preserve actual legacy selectors, geometry and resource ownership."
  ]
 }
};
function verifyBlob(member,path,mode,obj){
 assert.equal(member.path,path);assert.equal(member.blob,obj);assert.equal(typeof member.body,'string');assert.equal(Buffer.byteLength(member.body),member.bytes);assert.equal(hash(member.body),member.sha256);
 if(mode==='000000'){assert.equal(obj,'0'.repeat(40));assert.equal(member.absent,true);assert.equal(member.body,'');}
 else{assert.equal(mode,'100644');assert.equal(member.absent,undefined);assert.equal(gitHash('blob',member.body),obj);}
}
/** Authenticate tree paths and absence from actual Git tree bytes, without Git execution. */
function originalTrees(original){
 const trees=new Map(),used=new Set();
 for(const row of original.authenticated_tree_objects){
  assert.equal(trees.has(row.tree),false);const raw=Buffer.from(row.base64,'base64');assert.equal(raw.toString('base64'),row.base64);assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.sha256);assert.equal(gitHash('tree',raw),row.tree);trees.set(row.tree,raw);
 }
 function member(tree,path){
  const parts=path.split('/');assert.ok(parts.every(part=>part&&part!=='.'&&part!=='..'&&!part.includes('\\')));
  for(const [index,part]of parts.entries()){
   const raw=trees.get(tree);assert.ok(raw,'missing authenticated tree '+tree);used.add(tree);let cursor=0;const names=new Map();
   while(cursor<raw.length){const space=raw.indexOf(32,cursor),zero=raw.indexOf(0,space);assert.ok(space>cursor&&zero>space&&zero+21<=raw.length);const mode=raw.subarray(cursor,space).toString(),name=raw.subarray(space+1,zero).toString(),obj=raw.subarray(zero+1,zero+21).toString('hex');assert.equal(names.has(name),false);names.set(name,{mode,obj});cursor=zero+21;}
   assert.equal(cursor,raw.length);if(!names.has(part))return null;const row=names.get(part);if(index===parts.length-1)return row;assert.equal(row.mode,'40000');tree=row.obj;
  }
 }
 return {member,assertComplete:()=>assert.equal(used.size,trees.size),count:trees.size};
}

const COMPILER=[
 {path:'node_modules/sass/package.json',sha256:'c6d07347951e35cf2fee0f4ffb14b9a298daba837d1f8d515d2e8cac064022a7',bytes:856},
 {path:'node_modules/sass/sass.node.js',sha256:'eb7a01ba57a04a0a421bdef0bf2f43558af4790b540a45501ec83900b07b0625',bytes:343},
 {path:'node_modules/sass/sass.dart.js',sha256:'30a2f37d9a2ee27d125681477ef5e1f3c29b446137921472bb9802f10d9e64e1',bytes:5675052},
];
const SHARED_INPUTS=[{"path":"scripts/upstream-surface-m3-theme-source-review.mjs","sha256":"a1e360329856236b703ae1bb9e540627d160dad64f020c86521e07a6ca4c8d6a","bytes":32508},{"path":"scripts/upstream-selector-density-source-review.mjs","sha256":"42f3f517fbdd1652dad3da99e0140416a0f9c2613a78627eee25291135ec4daf","bytes":22167},{"path":"scripts/sass-companion-addition-contract.mjs","sha256":"6ebac00c6000aeade23d08d25b9bb3679b3497cfc8986fe51df1bc753befaf44","bytes":3002},{"path":"scripts/sass-current-companion-peer.mjs","sha256":"3c744296c550bffcced5ec88d4d95ce787597eeee4df30cd02ba2094744e507b","bytes":3334},{"path":"scripts/companion-bridge-peer-oracle.mjs","sha256":"0bb0c5bc31c6e00b7e60346a008d0ce1a7c1a649c9c64bff504d14ac08554838","bytes":13994},{"path":"fixtures/sass/companion-addition-contracts.json","sha256":"9cd0195ccc2f0e392ba4f26c3a8cafc1bd9de35327c1777198b83731bb591eee","bytes":51471},{"path":"projects/ngx-material-legacy/styles/core/style/_component-high-contrast.scss","sha256":"0468c17876aaf5a54a48a3f47eb084c83be5ee1a0a4e01ccdbd396ad905fb4cb","bytes":1400},{"path":"pnpm-lock.yaml","sha256":"e8b2cd00e56fd38e40f547bcacd2b38088b71548f40b3e15137fb91a1bef87a2","bytes":188697},{"path":".npm-version","sha256":"005206ab803f8881d8227540b7980b37e723b69a8849edb31734a90b7e7964e2","bytes":8}];
export function verifySliderM3RepairsOriginals(original,census){
 assert.equal(census.commits.length,1697);assert.equal(new Set(census.commits.map(row=>row.sha)).size,1697);
 assert.equal(original.line,'21.x');assert.equal(original.original_file_occurrences,9);assert.equal(original.original_hunks,14);
 assert.deepEqual(original.actual_status_occurrences,{M:9});assert.deepEqual(original.reviews.map(row=>row.sha),SLIDER_M3_REPAIRS_SHAS);
 for(const flag of ['upstream_code_executed','credentials_used'])assert.equal(original[flag],false);
 for(const key of ['canonical_decisions_changed','project_or_shared_cache_git_mutations'])assert.equal(original[key],0);
 assert.equal(original.temporary_object_database_removed,true);assert.equal(original.g11_claim,'not-passed');
 assert.deepEqual(original.worksheet_at_capture.selected_sha_ids,SLIDER_M3_REPAIRS_SHAS);
 const worksheet=original.inputs.find(ref=>ref.path===PREFIX+'source-worksheet.json');assert.ok(worksheet);
 const body=JSON.stringify(original.worksheet_at_capture,null,2)+'\n';assert.equal(hash(body),worksheet.sha256);assert.equal(Buffer.byteLength(body),worksheet.bytes);
 const tag=original.tagged_reference;assert.equal(tag.tag,'16.2.14');assert.equal(tag.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');
 assert.equal(gitHash('commit',tag.raw_commit),tag.commit);assert.equal(/^tree ([a-f0-9]{40})\n/.exec(tag.raw_commit)?.[1],tag.tree);
 assert.deepEqual(tag.members.map(m=>[m.path,m.blob]),TAGGED);
 const trees=originalTrees(original);for(const m of tag.members){verifyBlob(m,m.path,'100644',m.blob);assert.deepEqual(trees.member(tag.tree,m.path),{mode:'100644',obj:m.blob});}
 assert.deepEqual(tag.absent_paths,['src/material/core/tokens/m2/mat/_slider.scss']);for(const path of tag.absent_paths)assert.equal(trees.member(tag.tree,path),null);
 const reviews=[];let files=0,hunks=0,present=0,extraFiles=0,extraHunks=0;
 for(const source of original.reviews){
  const row=census.commits.find(row=>row.sha===source.sha);assert.ok(row);
  assert.equal(gitHash('commit',source.raw_commit),source.sha);assert.equal(source.raw_commit,row.raw_commit);
  assert.equal(gitHash('commit',source.parent_raw_commit),source.parent);assert.deepEqual(row.parents,[source.parent]);
  assert.equal(/^tree ([a-f0-9]{40})\n/.exec(source.raw_commit)?.[1],row.tree);assert.equal(source.after_tree,row.tree);
  assert.equal(/^tree ([a-f0-9]{40})\n/.exec(source.parent_raw_commit)?.[1],source.before_tree);
  assert.equal(hash(source.diff),PATCHES[source.sha]);assert.equal(source.diff_sha256,PATCHES[source.sha]);
  assert.deepEqual(source.frozen_seed_paths,row.ledger_comparison.listed_paths);assert.deepEqual(source.sections.map(s=>s.path),row.complete_changed_files.map(m=>m.path));
  assert.equal(source.sections.map(s=>s.patch).join(''),source.diff);
  const whole=[];for(const [index,section]of source.sections.entries()){
   const member=row.complete_changed_files[index];assert.equal(section.status,'M');assert.equal(section.status,member.status);
   for(const side of ['before','after']){const mode=member[side+'_mode'],obj=member[side+'_blob'];assert.equal(section[side+'_mode'],mode);verifyBlob(section[side],section.path,mode,obj);assert.deepEqual(trees.member(source[side+'_tree'],section.path),{mode,obj});present++;}
   assert.equal(hash(section.patch),section.patch_sha256);
   const replayed=replayThemingSection(section),comments=judgments[source.sha][section.path];assert.equal(replayed.length,comments.length);files++;hunks+=replayed.length;
   if(!source.frozen_seed_paths.includes(section.path)){extraFiles++;extraHunks+=replayed.length;}
   whole.push(...replayed.map((hunk,i)=>({path:section.path,index:hunk.index,header:hunk.header,sha256:hunk.sha256,technical_judgment:comments[i]})));
  }
  reviews.push({sha:source.sha,diff_sha256:PATCHES[source.sha],complete_original_paths:source.sections.map(s=>s.path),frozen_seed_paths:source.frozen_seed_paths,
   whole_original_hunk_reviews:whole,source_review_complete:true,proposed_final_disposition:'do-not-adopt',affected_branches:['21.x'],review_depth:'individual-compatibility',canonical_disposition_applied:false});
 }
 trees.assertComplete();assert.equal(trees.count,50);assert.equal(files,9);assert.equal(hunks,14);assert.equal(present,18);assert.equal(extraFiles,3);assert.equal(extraHunks,3);
 const lock=original.reviews[0].sections.find(section=>section.path==='yarn.lock');assert.ok(lock);assert.equal(lock.hunks.length,1);
 const lockLines=lock.hunks[0].text.split('\n');
 assert.deepEqual(lockLines.filter(line=>line.startsWith('-  version ')).map(line=>line.slice(12,-1)),['1.0.30001495','1.0.30001519','1.0.30001551']);
 assert.deepEqual(lockLines.filter(line=>line.startsWith('+  version ')),['+  version "1.0.30001570"']);
 const rangeLine=lockLines.find(line=>line.startsWith('+caniuse-lite@'));assert.ok(rangeLine);assert.equal(rangeLine.slice(1,-1).split(', ').length,6);
 return {reviews,original_files:files,original_hunks:hunks,present_original_blobs:present,tagged_blobs:6,exact_patch_replays:files,authenticated_tree_objects:trees.count,authenticated_absent_tagged_modules:1,tagged_structural_data_blobs:2,additional_files_beyond_seed:extraFiles,additional_hunks_beyond_seed:extraHunks};
}

/** Exact tagged bodies with only enumerated prior source/helper routing changes. */
export function assertHistoricalSliderSources({tagged,modernTheme,legacyTheme,legacyStructural}){
 const oldModern=tagged.get('src/material/slider/_slider-theme.scss');assert.equal((oldModern.match(/'@material\//g)??[]).length,4);
 assert.equal(modernTheme,oldModern.replaceAll("'@material/","'../vendor/mdc/"),'historical modern slider theme changed');
 assert.equal(legacyTheme,tagged.get('src/material/legacy-slider/_slider-theme.scss'),'historical legacy slider theme changed');
 let structural=tagged.get('src/material/legacy-slider/slider.scss');
 const routes=[["@use '@angular/cdk';","@use '../styles/core/style/component-high-contrast' as cdk;"],...["variables","vendor-prefixes"].map(name=>["@use '../core/style/"+name+"';","@use '../styles/core/style/"+name+"';"])];
 for(const [before,after]of routes){assert.equal(structural.split(before).length,2);structural=structural.replace(before,after);}
 assert.equal((structural.match(/cdk\.high-contrast\(active, off\)/g)??[]).length,4);
 structural=structural.replaceAll('cdk.high-contrast(active, off)','cdk.high-contrast(active)');
 assert.equal(legacyStructural,structural,'historical legacy slider structure/geometry/motion changed');
}
export function reviewSliderM3RepairsSource({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 root=resolve(root);const helperBytes=readFileSync(join(root,CURRENT_REPORT_HELPER.path));assert.equal(hash(helperBytes),CURRENT_REPORT_HELPER.sha256);assert.equal(helperBytes.length,CURRENT_REPORT_HELPER.bytes);
 const currentSource=createCurrentSliderSelectorReports({root,read});read=currentSource.read;
 const shared=reviewInspectionCompatibilitySource({root,read}),bound=new Map([...shared.bound,...currentSource.bound].map(ref=>[ref.path,ref]));
 function member(ref){ref=currentSource.qualify(ref);const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed slider repair source '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;}
 function current(path){const raw=read(path);return member({path,sha256:hash(raw),bytes:raw.length});}
 member({path:'scripts/upstream-slider-m3-repairs-source-review.mjs',sha256:hash(image),bytes:image.length});for(const ref of [...COMPILER,...SHARED_INPUTS])member(ref);
 const pkg=JSON.parse(current('package.json'));assert.equal(pkg.devDependencies.sass,'1.104.1');assert.equal(pkg.packageManager,'pnpm@12.4.2');assert.equal(current('.node-version').toString().trim(),'24.21.0');assert.equal(read('.npm-version').toString().trim(),'11.19.0');current('toolchain-lock.json');
 const original=JSON.parse(gunzipSync(member(ORIGINAL)));for(const ref of [original.producer,...original.inputs])member(ref);
 const facts=verifySliderM3RepairsOriginals(original,JSON.parse(gunzipSync(member(CENSUS)))),capsule=JSON.parse(gunzipSync(member(REFERENCE))),identity=JSON.parse(member(IDENTITY)),oldOriginal=JSON.parse(gunzipSync(member(REFERENCE_ORIGINALS))),catalog=JSON.parse(member(CATALOG));
 for(const ref of [capsule.producer,oldOriginal.producer,...oldOriginal.inputs])member(ref);
 const reference=verifySurfaceThemeReference(capsule,identity,oldOriginal),tagged=new Map(original.tagged_reference.members.map(m=>[m.path,m.body]));
 for(const [path,body]of tagged)if(!path.endsWith('/slider.scss'))assert.equal(reference['/'+path.replace('src/material/','@angular/material/')],body);
 const base='projects/ngx-material-legacy/',styles=base+'styles/';
 assertHistoricalSliderSources({tagged,modernTheme:current(styles+'slider/_slider-theme.scss').toString(),legacyTheme:current(styles+'legacy-slider/_slider-theme.scss').toString(),legacyStructural:current(base+'legacy-slider/slider.scss').toString()});
 const ts=current(base+'legacy-slider/slider.ts').toString();assert.ok(ts.includes("selector: 'mat-slider'"));assert.ok(ts.includes("styleUrls: ['slider.scss']"));assert.ok(ts.includes("templateUrl: 'slider.html'"));assert.equal(ts.includes("from '@angular/material/slider'"),false);current(base+'legacy-slider/slider.html');
 const facade=current(base+'_index.scss').toString(),exports=JSON.parse(current('compatibility/rc/matrices/library-exports.json')).exports;
 for(const family of ['slider','legacy-slider']){const source=family+'/slider-theme',forward="' as "+family+'-* show ';assert.ok(facade.includes("@forward './styles/"+source+forward));assert.ok(reference['/@angular/material/_index.scss'].includes("@forward './"+source+forward));}
 assert.ok(exports.includes('./legacy-slider'));assert.equal(exports.includes('./slider'),false);
 const absent=[styles+'core/tokens/m2/mat/_slider.scss',styles+'slider/slider.scss',base+'slider/slider.ts'];
 const assertAbsent=()=>{for(const path of absent){let missing=false;try{read(path);}catch(error){assert.equal(error.code,'ENOENT');missing=true;}assert.equal(missing,true,'unreviewed modern slider/token source '+path);}};assertAbsent();
 const owned={},peers={};for(const ref of shared.bound){
  if(ref.path.startsWith(styles)&&ref.path.endsWith('.scss'))owned['/owned/material/'+ref.path.slice(styles.length)]=member(ref).toString();
  for(const family of ['material','cdk']){const prefix='node_modules/@angular/'+family+'/';if(ref.path.startsWith(prefix)&&ref.path.endsWith('.scss'))peers['/@angular/'+family+'/'+ref.path.slice(prefix.length)]=member(ref).toString();}
 }
 assert.equal(Object.keys(owned).length,299);
 const peerPackage=current('node_modules/@angular/material/package.json'),peerManifest={version:JSON.parse(peerPackage).version,sha256:hash(peerPackage)},selected=catalog.cases.filter(p=>p.mixin.startsWith('slider-')||p.mixin.startsWith('legacy-slider-'));
 assert.equal(selected.length,14);assert.equal(selected.filter(p=>p.mixin.startsWith('slider-')).length,8);assert.equal(selected.filter(p=>p.mixin.startsWith('legacy-slider-')).length,6);
 const measurement=measureSurfaceThemeContracts({reference,owned,peers,catalog,peerManifest,selected});assert.equal(measurement.exact_tagged_cases,14);assert.equal(measurement.existing_companion_cases,0);assert.equal(measurement.historically_empty_density_cases,2);
 const assertCurrent=()=>{shared.assertCurrent();currentSource.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late slider repair source change '+ref.path);assert.equal(raw.length,ref.bytes);}assertAbsent();currentSource.assertCurrent();};assertCurrent();
 const report={schema_version:1,line:'21.x',role:'Two individual whole-patch source proposals; tagged slider source identity and fourteen exact historical CSS cases',...facts,
  originals:ORIGINAL,tagged_sass_reference:REFERENCE,reference_originals:REFERENCE_ORIGINALS,reference_identity:IDENTITY,argument_catalog:CATALOG,current_source_bindings:structuredClone([...bound.values()]),shared_source_bindings:shared.bound.length,public_override_boundaries:8,historical_public_override_boundaries:4,current_public_bridge:structuredClone(currentSource.summary),
  compiler:sass.info,compiler_inputs:COMPILER,shared_measurement_inputs:SHARED_INPUTS.map(ref=>currentSource.qualify(ref)),slider_measurement:measurement,absent_owned_modern_slider_or_token_paths:absent,
  original_sass_graph_members:52,original_locked_archive_packages:13,modern_theme_module_URL_rewrites:4,legacy_theme_byte_identical_to_tag:true,legacy_component_module_URL_rewrites:3,prior_high_contrast_argument_cleanups:4,
  legacy_component_other_source_changes:0,namespace_or_mixin_or_selector_rewrites:0,post16_slider_base_or_private_inspection_adopted:false,
  upstream_lock_change_packages:['caniuse-lite'],upstream_lock_old_versions:['1.0.30001495','1.0.30001519','1.0.30001551'],upstream_lock_new_version:'1.0.30001570',upstream_lock_range_selectors:6,upstream_lock_or_browser_target_changes_adopted:false,
  fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,component_structural_Sass_freshly_compiled:false,upstream_post16_sass_or_typescript_tests_or_workflows_executed:false,original_or_post16_package_javascript_executed:false,
  full_sass_gate_executed:false,mixed_M2_M3_native_coexistence_qualified:false,canonical_decisions_changed:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
 report.current_source_bindings.sort((a,b)=>a.path.localeCompare(b.path));
 const historical_report=currentSource.assertReportSuccessor('slider-m3-repairs',report);
 return {report,historical_report,bound:structuredClone([...bound.values()]),assertCurrent};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);const scope=reviewSliderM3RepairsSource();scope.assertCurrent();writeFileSync(process.argv[2],JSON.stringify(scope.report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'pass',original_files:9,original_hunks:14,slider_cases:scope.report.slider_measurement.case_count,source_bindings:scope.bound.length,canonical_decisions_changed:0}));
}
