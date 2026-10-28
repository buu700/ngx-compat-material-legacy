/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Three complete original source reviews and bounded historical/companion Sass proof. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {sassDeclaration} from './upstream-selector-density-source-review.mjs';
import {replayThemingSection} from './upstream-theming-inspection-source-review.mjs';
import {reviewInspectionCompatibilitySource} from './upstream-inspection-compatibility-source-review.mjs';
import {companionAdditionPeerProgram,companionAdditionResultsMatch} from './sass-companion-addition-contract.mjs';
const PREFIX='compatibility/rc/21x-c04-surface-m3-theme-';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url)),sass=createRequire(import.meta.url)('sass');
const ORIGINAL={"path":"compatibility/rc/21x-c04-surface-m3-theme-originals.json.gz","sha256":"4419fdf147812c104f4de8dff4264a378d8d43cca197386ed75c9a4d6b56ca2b","bytes":81363};
const REFERENCE={"path":"compatibility/rc/21x-c04-surface-m3-theme-tagged-sass-inputs.json.gz","sha256":"dc59dd309818a7c94db78ce310f351c03124cf6ddc1150456f9e36a75f0301e1","bytes":79756};
const IDENTITY={"path":"compatibility/rc/original16-sass-source-diagnostic-identity.json","sha256":"324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe","bytes":89908};
const CATALOG={"path":"fixtures/sass/mixin-argument-contracts.json","sha256":"c1d1151a8c1fa02cea0c6fac5618bbefe11dd018bbfff1d30f5c3f35f8fc8770","bytes":143838};
const CENSUS={"path":"compatibility/rc/upstream-complete-patch-census.json.gz","sha256":"806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97","bytes":2172936};
const PATCHES={"545db61b41957df26c5e3c95a2959ca6c83a9190":"815a3a7aebd89e4c3ba55e153e40759b689ee59871607a292e8d8db21f058164","1930b1dacf07826750ffc72dbce551fe6653fd4f":"be178948b967b494542ddfc8734668f8c697261183d00ac40af03a6b9af00fe7","fbc7bdda93b7c261705da81cec6720bbf607c5ce":"c9ba2a5966107238abbd3891c37828ff19853eeb8c6b9cb4f549e355b30d3f93"};
export const SURFACE_M3_THEME_SHAS=Object.freeze(Object.keys(PATCHES));
const TAGGED=[["src/material/toolbar/_toolbar-theme.scss","f456c176d2be94082ac7c517135e311ea3e96673"],["src/material/tooltip/_tooltip-theme.scss","cbb1d364b1bf5f403cc205bc76605390d3eaa7df"],["src/material/slider/_slider-theme.scss","e6974ac0bf1db4ed2855261857f4dc4c736a2189"],["src/material/legacy-tooltip/_tooltip-theme.scss","7cc6c0004c5744e6f1c755464dc6d1eb1aab00a1"],["src/material/legacy-slider/_slider-theme.scss","3bb2255959d87690fb510a5d6928f0d8ca1c1bf4"],["src/material/core/tokens/m2/_index.scss","da279eb223b38ab2a43211678810d19426773c06"],["src/material/core/tokens/m2/mat/_toolbar.scss","3b472dcd20c28e82d8039bb5beffcb0144973cbc"],["src/material/core/tokens/m2/mdc/_plain-tooltip.scss","83e3ce579ccfde72d9a193ba7d1c0f37c60f81fd"],["src/material/core/theming/_palette.scss","e2b5faada05cc4a2c00d3404cfb605b9d843db2b"],["src/material/core/theming/_theming.scss","767268e8de79caa0cafc15c475853d7f2e125934"]];
const judgments={
 "545db61b41957df26c5e3c95a2959ca6c83a9190": {
  "src/dev-app/theme-token-api.scss": [
   "Removes the demo-only monospace brand-family override from experimental M3 theme setup; it does not change an owned consumer theme or authorize typography migration.",
   "Adds toolbar full M3 theme emission in the upstream demo html rule. The owned facade still exports its historical toolbar theme and finite companion bridge.",
   "Adds toolbar dark-color emission to that demo; preserve the owned M2 palette/variant contract and check dark CSS independently.",
   "Adds toolbar to the demo density-scale loop. The actual64/56px height sequences are reviewed in the separate density hunk rather than inferred from this call."
  ],
  "src/material-experimental/theming/_custom-tokens.scss": [
   "Repairs experimental card subtitle lookup from md-ref-color to md-sys-color and adds toolbar title-large, surface and on-surface custom tokens through a private upstream merge helper. This real card repair is outside the independently owned M2/bridge computation; do not port the private experimental system or overlook the unrelated card hunk."
  ],
  "src/material-experimental/theming/_m3-density.scss": [
   "Adds toolbar standard64/60/56/52px and mobile56/52/48/44px M3 density tables. Preserve historical toolbar density and the already-reviewed public companion mapping; source review does not qualify native M3 legacy skinning."
  ],
  "src/material-experimental/theming/_m3-tokens.scss": [
   "Registers the experimental(mat,toolbar) namespace with custom toolbar tokens and slot filtering. The historical owned token aggregator remains exactly tagged16 and its output is not replaced by this experimental generator."
  ],
  "src/material/core/tokens/m2/_index.scss": [
   "Adds toolbar token-module import to the upstream M2 aggregate. The owned toolbar token module already exists and matches the tag, while the aggregate import population remains the finite historical body.",
   "Adds toolbar to the complete M2 token aggregation result. The owned aggregator is not used by the public facade graph and has no wildcard public export; preserve its tagged body instead of expanding a modern API mirror."
  ],
  "src/material/toolbar/_toolbar-theme.scss": [
   "Adds sass:map for the new token-namespace lookup. The owned toolbar already uses its historical map model; an import alone does not prove behavioral equivalence.",
   "Branches color, typography, density and theme on version1, uses inspection token access and adds _theme-from-tokens while retaining the newer M2 path. Those parent paths already differ from16. The actual owned toolbar retains three tagged private bodies and public historical/companion output; compare with the existing finite companion contract, not a broadened golden."
  ]
 },
 "1930b1dacf07826750ffc72dbce551fe6653fd4f": {
  "src/dev-app/theme-token-api.scss": [
   "Adds tooltip full-theme M3 demo emission, without adding an owned public base mixin or M3 map API.",
   "Adds tooltip dark-color demo emission; owned modern and legacy tooltip colors are measured separately against untouched16.",
   "Adds tooltip to the experimental demo density loop; its historical no-output density result is preserved explicitly."
  ],
  "src/material-experimental/theming/_m3-density.scss": [
   "Adds an empty experimental plain-tooltip density map. This is an upstream data entry, not permission to replace any nonempty owned mixin with an empty fallback."
  ],
  "src/material-experimental/theming/_m3-tokens.scss": [
   "Adds MDC plain-tooltip M3 value generation and namespacing with slot filtering. The owned historical plain-tooltip token module remains tagged16 and consumes the owned M2 config."
  ],
  "src/material/core/tokens/m2/_index.scss": [
   "Adds plain-tooltip to the upstream M2 aggregate imports. The actual owned token module is present and tagged, but the historical aggregate is not expanded.",
   "Adds its token maps to aggregate output. Preserve the finite owned export/model boundary; presence of an internal module does not authorize new aggregated tokens."
  ],
  "src/material/tooltip/_tooltip-theme.scss": [
   "Adds map/version inspection, renames the post16 token alias, branches base/color/typography/density/theme and adds namespace-token emission. The parent already has a base API absent from16. Preserve the owned one-URL-rerouted tooltip body, .mat-mdc-tooltip rules, legacy counterpart and all existing public names; do not port this modern API or token model."
  ]
 },
 "fbc7bdda93b7c261705da81cec6720bbf607c5ce": {
  "src/dev-app/theme-token-api.scss": [
   "Adds slider full-theme emission to a later experimental demo state, including intervening snack-bar work; no synthetic three-patch contiguous chain is assumed.",
   "Adds slider dark-color emission. Preserve the tagged dark indicator opacity and palette/ripple behavior instead of assuming the M3 custom value is compatible.",
   "Adds slider to the demo density-scale loop, without changing the owned historical empty density contract."
  ],
  "src/material-experimental/theming/_custom-tokens.scss": [
   "Adds experimental mat-slider value-indicator-opacity1. The owned historical MDC-era slider uses dark0.9/light0.6 and the distinct legacy slider has its own CSS; those real outputs must remain."
  ],
  "src/material-experimental/theming/_m3-density.scss": [
   "Adds empty(mdc,slider) and(mat,slider) density maps and completes map punctuation. These experimental map entries do not justify altering the owned density API or producing a fake empty success."
  ],
  "src/material-experimental/theming/_m3-tokens.scss": [
   "Adds MDC slider M3 token generation/slot filtering under(mdc,slider). No corresponding new owned M3 generator or modern component fork is introduced.",
   "Adds custom slider opacity tokens under(mat,slider). This is a separate namespace from MDC slider tokens; review both and preserve historical selector/value semantics."
  ],
  "src/material/core/tokens/m2/_index.scss": [
   "Imports the new mat-slider M2 token module. The owned historical slider predates this token split; do not infer irrelevance from the path or add a modern module mirror.",
   "Imports the MDC slider M2 token module, which is absent in the owned16 model and not the same as the retained vendor slider theme.",
   "Adds the mat-slider maps to the aggregate, changing its output shape. Preserve the exact tagged aggregate body and independently owned theme maps.",
   "Adds MDC slider maps to the same aggregate. Both namespaces change; the tagged slider still emits its original MDC theme/ripple CSS without those post16 token APIs."
  ],
  "src/material/slider/_slider-theme.scss": [
   "Branches base/color/typography/density/theme on M3 version, renames both aliases and retains newer M2 elevation/namespace paths. These already differ from16 before the patch. Keep the actual four-URL-rerouted tagged owned slider body, palettes, ripple and dark/light opacity, not these modern base/token contracts.",
   "Adds a helper emitting both MDC slider and mat-slider namespace token maps. Both namespaces are reviewed, while the original owned/legacy slider CSS and historical public forward list remain the authority."
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
const CONTRACT_INPUTS=[{"path":"scripts/upstream-selector-density-source-review.mjs","sha256":"42f3f517fbdd1652dad3da99e0140416a0f9c2613a78627eee25291135ec4daf","bytes":22167},{"path":"scripts/sass-companion-addition-contract.mjs","sha256":"6ebac00c6000aeade23d08d25b9bb3679b3497cfc8986fe51df1bc753befaf44","bytes":3002},{"path":"scripts/sass-current-companion-peer.mjs","sha256":"3c744296c550bffcced5ec88d4d95ce787597eeee4df30cd02ba2094744e507b","bytes":3334},{"path":"scripts/companion-bridge-peer-oracle.mjs","sha256":"0bb0c5bc31c6e00b7e60346a008d0ce1a7c1a649c9c64bff504d14ac08554838","bytes":13994},{"path":"fixtures/sass/companion-addition-contracts.json","sha256":"9cd0195ccc2f0e392ba4f26c3a8cafc1bd9de35327c1777198b83731bb591eee","bytes":51471}];

export function verifySurfaceThemeOriginals(original,census){
 assert.equal(census.commits.length,1697);assert.equal(new Set(census.commits.map(row=>row.sha)).size,1697);
 assert.equal(original.line,'21.x');assert.equal(original.original_file_occurrences,17);assert.equal(original.original_hunks,32);
 assert.deepEqual(original.actual_status_occurrences,{M:17});assert.deepEqual(original.reviews.map(row=>row.sha),SURFACE_M3_THEME_SHAS);
 for(const flag of ['upstream_code_executed','credentials_used'])assert.equal(original[flag],false);
 for(const key of ['canonical_decisions_changed','project_or_shared_cache_git_mutations'])assert.equal(original[key],0);
 assert.equal(original.temporary_object_database_removed,true);
 assert.deepEqual(original.worksheet_at_capture.selected_sha_ids,SURFACE_M3_THEME_SHAS);
 const worksheet=original.inputs.find(ref=>ref.path===PREFIX+'source-worksheet.json');assert.ok(worksheet);
 const body=JSON.stringify(original.worksheet_at_capture,null,2)+'\n';assert.equal(hash(body),worksheet.sha256);assert.equal(Buffer.byteLength(body),worksheet.bytes);
 const tag=original.tagged_reference;assert.equal(tag.tag,'16.2.14');assert.equal(tag.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');
 assert.equal(gitHash('commit',tag.raw_commit),tag.commit);assert.equal(/^tree ([a-f0-9]{40})\n/.exec(tag.raw_commit)?.[1],tag.tree);
 assert.deepEqual(tag.members.map(m=>[m.path,m.blob]),TAGGED);
 const trees=originalTrees(original);for(const m of tag.members){verifyBlob(m,m.path,'100644',m.blob);assert.deepEqual(trees.member(tag.tree,m.path),{mode:'100644',obj:m.blob});}
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
 trees.assertComplete();assert.equal(trees.count,67);assert.equal(files,17);assert.equal(hunks,32);assert.equal(present,34);assert.equal(extraFiles,11);assert.equal(extraHunks,19);
 return {reviews,original_files:files,original_hunks:hunks,present_original_blobs:present,tagged_blobs:10,exact_patch_replays:files,authenticated_tree_objects:trees.count,additional_files_beyond_seed:extraFiles,additional_hunks_beyond_seed:extraHunks};
}
export function verifySurfaceThemeReference(capsule,identity,original){
 assert.equal(capsule.line,'21.x');assert.equal(capsule.members.length,52);assert.equal(capsule.archives.length,13);
 assert.deepEqual(capsule.identity,IDENTITY);assert.deepEqual(capsule.originals,ORIGINAL);
 for(const flag of ['package_install_or_runtime_execution','sass_compilation_executed_during_capture','full_facade_dependency_graph_captured'])assert.equal(capsule[flag],false);
 assert.equal(capsule.all_dependency_graph_members_match_prior_original_source_identity,true);
 assert.deepEqual(capsule.tagged_review_sources_outside_selected_compiler_graph,['src/material/core/tokens/m2/_index.scss']);
 const known=new Map(Object.values(identity.loaded_source_sets).flat().map(m=>[m.path,m])),packages=new Map(identity.packages.map(row=>[row.package,row])),sources={};
 assert.equal(new Set(capsule.members.map(m=>m.path)).size,52);assert.equal(new Set(capsule.archives.map(m=>m.package)).size,13);
 for(const m of capsule.members){const expected=known.get(m.path);assert.ok(expected);assert.equal(hash(m.body),m.sha256);assert.equal(Buffer.byteLength(m.body),m.bytes);assert.equal(m.sha256,expected.sha256);assert.equal(m.bytes,expected.bytes);sources['/'+m.path]=m.body;}
 for(const row of capsule.archives){const {acquisition,...metadata}=row;assert.ok(['existing-archive-data','pinned-public-archive-data'].includes(acquisition));assert.deepEqual(metadata,packages.get(row.package));}
 for(const m of original.tagged_reference.members){const path=m.path.replace('src/material/','@angular/material/');if(path.endsWith('/m2/_index.scss')){const expected=known.get(path);assert.ok(expected);assert.equal(m.sha256,expected.sha256);assert.equal(m.bytes,expected.bytes);}else assert.equal(sources['/'+path],m.body);}
 return sources;
}
const FAMILIES=['toolbar','tooltip','slider','legacy-tooltip','legacy-slider'];
const NAMES=FAMILIES.flatMap(f=>['color','typography',...(f.startsWith('legacy-')?[]:['density']),'theme'].map(d=>f+'-'+d));
function compileSurface(program,modules){
 const importer={canonicalize(value,ctx){
  if(value.startsWith('sass:'))return null;
  const path=value.startsWith('review:')?new URL(value).pathname:value.startsWith('@')?'/'+value:posix.normalize(posix.join(posix.dirname(ctx.containingUrl?.pathname??'/'),value));
  const parent=posix.dirname(path),name=posix.basename(path),choices=[path.endsWith('.scss')?path:path+'.scss',parent+'/'+(name.startsWith('_')?'':'_')+name+(name.endsWith('.scss')?'':'.scss'),path+'/_index.scss',path+'/index.scss'];
  const found=[...new Set(choices.filter(p=>Object.hasOwn(modules,p)))];if(!found.length)return null;assert.equal(found.length,1,'ambiguous reviewed Sass module '+value);return new URL('review:'+found[0]);
 },load(url){assert.ok(Object.hasOwn(modules,url.pathname));return {contents:modules[url.pathname],syntax:'scss'};}};
 const out=sass.compileString(program,{style:'expanded',charset:false,importers:[importer],silenceDeprecations:['import','if-function','global-builtin','color-functions','slash-div'],logger:{warn(){},debug(){}}});
 assert.ok(out.loadedUrls.every(u=>u.protocol==='review:'));
 return {css:out.css,css_sha256:hash(out.css),css_bytes:Buffer.byteLength(out.css),loaded_sources:out.loadedUrls.map(u=>({path:u.pathname,sha256:hash(modules[u.pathname]),bytes:Buffer.byteLength(modules[u.pathname])})).sort((a,b)=>a.path.localeCompare(b.path))};
}
export function measureSurfaceThemeContracts({reference,owned,peers,catalog,peerManifest,selected}={}){
 assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));assert.equal(peerManifest.version,'21.2.14');assert.equal(peerManifest.sha256,'26af34e77987b55564689c8eb7b5352db661d6a737fdec2160417ae42114f355');
 const all=catalog.cases.filter(p=>NAMES.includes(p.mixin));assert.equal(all.length,36);assert.equal(new Set(all.map(p=>p.case_id)).size,36);
 const probes=selected??all;assert.ok(Array.isArray(probes)&&probes.length>0);assert.equal(new Set(probes.map(p=>p.case_id)).size,probes.length);
 const cases=probes.map(probe=>{
  assert.deepEqual(probe,all.find(p=>p.case_id===probe.case_id),'unknown or changed surface probe');const family=FAMILIES.find(f=>probe.mixin.startsWith(f+'-')),names=NAMES.filter(n=>n.startsWith(family+'-'));
  const harness="@forward 'core/theming/theming' show define-palette, define-light-theme, define-dark-theme, get-color-config;\n@forward 'core/theming/palette' show $indigo-palette, $pink-palette, $red-palette;\n@forward 'core/typography/typography' show define-typography-level, define-typography-config, define-legacy-typography-config;\n@forward '"+family+'/'+(family.startsWith('legacy-')?family.slice(7):family)+"-theme' as "+family+'-* show '+names.join(', ')+';\n';
  const program=base=>'@use "review:'+base+'/_selected-surface-entry.scss" as m;\n'+catalog.setup+'\n'+probe.call+'\n';
  const expected=compileSurface(program('/@angular/material'),{...reference,'/@angular/material/_selected-surface-entry.scss':harness});
  const actual=compileSurface(program('/owned/material'),{...owned,...peers,'/owned/material/_selected-surface-entry.scss':harness});
  const peerProgram=companionAdditionPeerProgram(probe.case_id);let peer=null;
  if(peerProgram){const out=compileSurface(peerProgram,peers);peer={line:'21.x',peer_version:peerManifest.version,peer_package_json_sha256:peerManifest.sha256,program:peerProgram,program_sha256:hash(peerProgram),...out,
    sources:out.loaded_sources.map(s=>({root:s.path.startsWith('/@angular/material/')?0:1,path:s.path.replace(/^\/@angular\/(material|cdk)\//,''),sha256:s.sha256,bytes:s.bytes})).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path))};}
  assert.ok(peer?companionAdditionResultsMatch(probe.case_id,expected,actual,peer):actual.css===expected.css,'surface CSS differs from untouched16 and existing finite companion contract: '+probe.case_id);
  return {case_id:probe.case_id,mixin:probe.mixin,variant:probe.variant,finite_family_forward_harness:harness,expected,actual,peer,comparison:peer?'existing-finite-companion-contract':'exact-untouched16'};
 });
 return {case_count:cases.length,cases,exact_tagged_cases:cases.filter(c=>!c.peer).length,existing_companion_cases:cases.filter(c=>c.peer).length,historically_empty_density_cases:cases.filter(c=>c.mixin.endsWith('-density')&&!c.expected.css).length,full_facade_or_native_or_packed_qualified:false};
}
export function reviewSurfaceThemeSource({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const shared=reviewInspectionCompatibilitySource({root,read}),bound=new Map(shared.bound.map(ref=>[ref.path,ref]));
 function member(ref){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed surface theme source '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;}
 function current(path){const raw=read(path);return member({path,sha256:hash(raw),bytes:raw.length});}
 member({path:'scripts/upstream-surface-m3-theme-source-review.mjs',sha256:hash(image),bytes:image.length});for(const ref of [...COMPILER,...CONTRACT_INPUTS])member(ref);
 assert.equal(JSON.parse(current('package.json')).devDependencies.sass,'1.104.1');assert.equal(current('.node-version').toString().trim(),'24.21.0');current('toolchain-lock.json');
 const original=JSON.parse(gunzipSync(member(ORIGINAL)));for(const ref of [original.producer,...original.inputs])member(ref);
 const census=JSON.parse(gunzipSync(member(CENSUS))),capsule=JSON.parse(gunzipSync(member(REFERENCE))),identity=JSON.parse(member(IDENTITY)),catalog=JSON.parse(member(CATALOG));member(capsule.producer);
 const facts=verifySurfaceThemeOriginals(original,census),reference=verifySurfaceThemeReference(capsule,identity,original),tagged=new Map(original.tagged_reference.members.map(m=>[m.path,m.body]));
 const base='projects/ngx-material-legacy/',styles=base+'styles/',text=path=>current(styles+path).toString();
 const sourceRoutes={tooltip:1,slider:4};
 for(const [family,count]of Object.entries(sourceRoutes)){const path=family+'/_'+family+'-theme.scss',before=tagged.get('src/material/'+path);assert.equal((before.match(/'@material\//g)??[]).length,count);assert.equal(text(path),before.replaceAll("'@material/","'../vendor/mdc/"));}
 for(const path of ['legacy-tooltip/_tooltip-theme.scss','legacy-slider/_slider-theme.scss','core/tokens/m2/_index.scss','core/tokens/m2/mat/_toolbar.scss','core/tokens/m2/mdc/_plain-tooltip.scss','core/theming/_palette.scss'])assert.equal(text(path),tagged.get('src/material/'+path));
 const card=text('card/_card-theme.scss'),cardTokens=text('core/tokens/m2/mat/_card.scss');
 assert.ok(card.includes('$mat-card-color-tokens: tokens-mat-card.get-color-tokens($config);'));
 assert.ok(cardTokens.includes('subtitle-text-color: theming.get-color-from-palette($foreground, secondary-text),'));
 assert.equal(/md-ref-color|md-sys-color/.test(cardTokens),false);
 const toolbar=text('toolbar/_toolbar-theme.scss'),oldToolbar=tagged.get('src/material/toolbar/_toolbar-theme.scss');
 assert.equal(sassDeclaration(toolbar,'mixin','_palette-styles'),sassDeclaration(oldToolbar,'mixin','_palette-styles'));
 for(const name of ['color','typography','density'])assert.equal(sassDeclaration(toolbar,'mixin','_m2-'+name),sassDeclaration(oldToolbar,'mixin',name).replace('@mixin '+name+'(','@mixin _m2-'+name+'('));
 assert.ok(toolbar.includes("@use '../bridges/companion-overrides' as bridges;"));assert.ok(sassDeclaration(toolbar,'mixin','theme').includes('@include bridges.toolbar($theme);'));
 const facade=current(base+'_index.scss').toString(),oldFacade=reference['/@angular/material/_index.scss'];
 for(const family of FAMILIES){const stem=family.startsWith('legacy-')?family.slice(7):family,module=family+'/'+stem+'-theme';assert.ok(facade.includes("@forward './styles/"+module+"' as "+family+'-* show '));assert.ok(oldFacade.includes("@forward './"+module+"' as "+family+'-* show '));}
 const exports=JSON.parse(current('compatibility/rc/matrices/library-exports.json')).exports;
 for(const family of ['slider','tooltip']){assert.ok(exports.includes('./legacy-'+family));assert.equal(exports.includes('./'+family),false);const ts=current(base+'legacy-'+family+'/'+family+'.ts').toString();assert.ok(ts.includes("styleUrls: ['"+family+".scss']"));current(base+'legacy-'+family+'/'+family+'.scss');current(base+'legacy-'+family+'/'+family+'.html');}
 const owned={},peers={};let aggregatorDefinitions=0;
 for(const ref of shared.bound){
  if(ref.path.startsWith(styles)&&ref.path.endsWith('.scss')){const body=member(ref).toString();assert.equal(/get-theme-version|get-theme-tokens/.test(body),false,'post16 M3 inspection '+ref.path);assert.equal(/@(?:use|forward)[^;]*(?:material-experimental|m3-tokens|m3-density|custom-tokens)/.test(body),false,'experimental generator import '+ref.path);const matches=body.match(/m2-tokens-from-theme/g)??[];if(matches.length){assert.equal(ref.path,styles+'core/tokens/m2/_index.scss');assert.equal(matches.length,1);assert.ok(body.includes('@function m2-tokens-from-theme('));aggregatorDefinitions++;}owned['/owned/material/'+ref.path.slice(styles.length)]=body;}
  for(const family of ['material','cdk']){const prefix='node_modules/@angular/'+family+'/';if(ref.path.startsWith(prefix)&&ref.path.endsWith('.scss'))peers['/@angular/'+family+'/'+ref.path.slice(prefix.length)]=member(ref).toString();}
 }
 assert.equal(aggregatorDefinitions,1);assert.equal(Object.keys(owned).length,299);
 const peerPackage=current('node_modules/@angular/material/package.json'),peerManifest={version:JSON.parse(peerPackage).version,sha256:hash(peerPackage)};
 const measurement=measureSurfaceThemeContracts({reference,owned,peers,catalog,peerManifest});assert.equal(measurement.exact_tagged_cases,32);assert.equal(measurement.existing_companion_cases,4);assert.equal(measurement.historically_empty_density_cases,4);
 const assertCurrent=()=>{shared.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late surface theme source change '+ref.path);assert.equal(raw.length,ref.bytes);}};assertCurrent();
 return {report:{schema_version:1,line:'21.x',role:'Three individual whole-patch source proposals; bounded historical/companion Sass proof',...facts,
  originals:ORIGINAL,tagged_sass_reference:REFERENCE,reference_identity:IDENTITY,argument_catalog:CATALOG,current_source_bindings:structuredClone([...bound.values()]),shared_source_bindings:shared.bound.length,
  compiler:sass.info,compiler_inputs:COMPILER,existing_companion_contract_inputs:CONTRACT_INPUTS,surface_measurement:measurement,
  original_sass_graph_members:52,original_locked_archive_packages:13,owned_style_scss_members:299,owned_public_surface_mixins:NAMES,
  tooltip_module_URL_rewrites:1,slider_module_URL_rewrites:4,legacy_style_theme_byte_identical_to_tag:true,toolbar_tagged_private_bodies_preserved:3,existing_toolbar_companion_contract_unchanged:true,
  historical_M2_token_index_and_modules_preserved:true,card_subtitle_uses_owned_M2_foreground:true,experimental_generator_imports:0,card_CSS_freshly_compiled_this_review:false,owned_M2_aggregator_callers:0,owned_M3_inspection_callers:0,namespace_or_mixin_or_selector_rewrites:0,
  fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,upstream_post16_sass_or_typescript_tests_or_workflows_executed:false,package_install_or_javascript_runtime_execution:false,
  full_sass_gate_executed:false,mixed_M2_M3_native_coexistence_qualified:false,canonical_decisions_changed:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'},bound:structuredClone([...bound.values()]),assertCurrent};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);const scope=reviewSurfaceThemeSource();scope.assertCurrent();writeFileSync(process.argv[2],JSON.stringify(scope.report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'pass',original_files:17,original_hunks:32,surface_cases:scope.report.surface_measurement.case_count,source_bindings:scope.bound.length,canonical_decisions_changed:0}));
}
