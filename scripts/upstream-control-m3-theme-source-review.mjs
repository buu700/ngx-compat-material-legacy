/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Four whole original control-theme reviews and bounded untouched16 CSS comparisons. */
import assert from 'node:assert/strict';
import {spinnerSnackC04Source,SPINNER_SNACK_CONTROL_CASE_IDS} from './sass-spinner-snack-c04-source.mjs';
import {spinnerSnackPositionedTokenResultsMatch} from './sass-spinner-snack-bridge-contract.mjs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {replayThemingSection} from './upstream-theming-inspection-source-review.mjs';
import {reviewInspectionCompatibilitySource} from './upstream-inspection-compatibility-source-review.mjs';
import {progressColorPeerProgram,progressColorAliasResultsMatch} from './sass-progress-color-alias-contract.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url)),sass=createRequire(import.meta.url)('sass');
const ORIGINAL={"path": "compatibility/rc/21x-c04-control-m3-theme-originals.json.gz", "sha256": "b8522419b86b1f3f6940433be3508916f4867527622f26fbf7e56e9510a2bcb6", "bytes": 105294};
const REFERENCE={"path": "compatibility/rc/21x-c04-control-m3-theme-tagged-sass-inputs.json.gz", "sha256": "2837b42003a5e39f2d50ed276bc2af682d0be367fe6603f2ff66b8db79dc7340", "bytes": 101726};
const IDENTITY={"path": "compatibility/rc/original16-sass-source-diagnostic-identity.json", "sha256": "324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe", "bytes": 89908};
const CATALOG={"path": "fixtures/sass/mixin-argument-contracts.json", "sha256": "c1d1151a8c1fa02cea0c6fac5618bbefe11dd018bbfff1d30f5c3f35f8fc8770", "bytes": 143838};
const CENSUS={"path": "compatibility/rc/upstream-complete-patch-census.json.gz", "sha256": "806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97", "bytes": 2172936};
const PATCHES={"6b57edb1b164909f8aa1eddac87a915c037e6905": "d5201f108ff5a5d5f38c6d13437c5768ac805c62ba673bba628c3b4ea867e3bd", "75029c273a4aad3ad4481d8c045c9a73ccceb34e": "878ba9207bc62a4440b2493dc75f1282cefaa83f7d45513e16dadecf3aeadafe", "2f958aced5757915f75e4036229d5df63f6ff414": "17f369ca7d3554694b90cfaedc86f20b09cd6a3b3cb05d28021b138ad93a4e63", "289ddd348395f0299a6c7cba2cde8662842df06d": "41c76fdf701d135c1709683cc34cd658d367331ea10c108a0e3a3682899aa7b4"};
const TAGGED=[["src/material/snack-bar/_snack-bar-theme.scss", "015b5d87d71d0ca924c32a1e31de097b1e836299"], ["src/material/legacy-snack-bar/_snack-bar-theme.scss", "ce31de5e37fcc284e672e3aef862e047c003f02f"], ["src/material/progress-spinner/_progress-spinner-theme.scss", "66a468c42321ca679c35c07713eb187de8f0ca64"], ["src/material/legacy-progress-spinner/_progress-spinner-theme.scss", "55696a350d86516275bc560211218b59e06a63dc"], ["src/material/radio/_radio-theme.scss", "f6be0459969c80afb0c09cf6eefeb29124cd7a2f"], ["src/material/legacy-radio/_radio-theme.scss", "fa16d5ae9b7cc70d48b5257c6a4acb5fc59732b6"], ["src/material/progress-bar/_progress-bar-theme.scss", "8441588fce506ba824d4a4af75c6572febd04b2b"], ["src/material/legacy-progress-bar/_progress-bar-theme.scss", "b20abf264907f5aae667972763d7a110f09931f3"], ["src/material/legacy-snack-bar/snack-bar-container.scss", "e81ba07cc6f61352ea1d25148737b326aaf5fd48"], ["src/material/legacy-progress-spinner/progress-spinner.scss", "2db723c01002af1d0f97079032edfcc15a6bd208"], ["src/material/legacy-radio/radio.scss", "5751e269a5993dc044f032c490f18b52e884f6bb"], ["src/material/legacy-progress-bar/progress-bar.scss", "bd1f9fb64db5855c23485d68318551292e2c33be"], ["src/material/core/tokens/m2/_index.scss", "da279eb223b38ab2a43211678810d19426773c06"], ["src/material/core/theming/_palette.scss", "e2b5faada05cc4a2c00d3404cfb605b9d843db2b"], ["src/material/core/theming/_theming.scss", "767268e8de79caa0cafc15c475853d7f2e125934"]];
const WORKSHEET_HASH="dce303521fe88f8eb4594b1f6e1335b96e2adbde9775d7392e77cb9efc7fd2b6";
const judgments={
 "6b57edb1b164909f8aa1eddac87a915c037e6905": {
  "src/dev-app/theme-token-api.scss": [
   "Adds light experimental snackbar theme emission. Preserve the exported historical modern and legacy snackbar color/typography models; no upstream demo theme is shipped.",
   "Adds dark snackbar color emission. Independently compare both owned dark and light outputs with untouched16 rather than inferring compatibility from the M3 label.",
   "Adds snackbar density calls in the experimental scale loop. The tagged modern snackbar density is historically empty; do not add M3 density slots or new no-op stubs."
  ],
  "src/material-experimental/theming/_custom-tokens.scss": [
   "Only reindents the existing typography map lookup, retaining its values and scope within this behavioral patch.",
   "Adds inverse-primary button-color for an experimental mat-snack-bar namespace. Historical owned action color comes from its own M2 accent/dark rules, which remain independently compiled."
  ],
  "src/material-experimental/theming/_m3-tokens.scss": [
   "Adds the MDC snackbar component values and token-slot filtering to the M3 generator. The owned finite16M2 facade does not call this generator.",
   "Adds the mat snack-bar custom namespace alongside a toolbar comma/indent cleanup. Preserve both historical MDC and mat snackbar token producers and the tagged aggregator shape."
  ],
  "src/material/snack-bar/_snack-bar-theme.scss": [
   "Adds sass:map for a new M3 token lookup. The owned tagged source retains its existing imports with exactly one prior MDC URL reroute.",
   "Branches base/color/typography on theme version and applies M3 tokens through a helper, while retaining newer selector-root M2 paths. Those parent paths already differ from16; do not replace the tagged owned selectors, config unwrapping or typography conversion.",
   "Branches theme emission and introduces a private token-map helper for both namespaces. Preserve the historical theme order and defaults; the independent16CSS checks cover both modern and legacy outputs."
  ]
 },
 "75029c273a4aad3ad4481d8c045c9a73ccceb34e": {
  "src/dev-app/BUILD.bazel": [
   "Renames the demo Sass target/source to theme_m3/theme-m3.scss while retaining its Material/experimental dependencies. The add-on uses its own pinned build and does not inherit this Bazel target.",
   "Updates the demo static asset filegroup to the renamed target. This is paired with the actual added/deleted file records and both DOM stylesheet-switching paths; no published add-on asset is renamed."
  ],
  "src/dev-app/dev-app/dev-app-layout.html": [
   "Renames the theme-toggle handler and tooltip state/labels to M3. This changes the unshipped dev-app template, not any historical component template or consumer HTML."
  ],
  "src/dev-app/dev-app/dev-app-layout.ts": [
   "Renames the toggle/state flag and switches the theme link between literal theme-m3.css and theme.css. The conditional still avoids redundant switching and persists state; it is not an owned input, stylesheet loader or component behavior."
  ],
  "src/dev-app/dev-app/dev-app-state.ts": [
   "Renames the persisted development state interface property from tokensEnabled to m3Enabled. The add-on exposes no such application-state contract.",
   "Changes the default state property to m3Enabled:false, keeping M2 as the demo default. No user storage migration or runtime application code is imported."
  ],
  "src/dev-app/main.ts": [
   "Updates the startup stylesheet choice to the renamed persisted flag and fixed M3 stylesheet name. This must be reviewed with the layout switch, state defaults and renamed build assets, not treated as a theme-only patch."
  ],
  "src/dev-app/theme-m3.scss": [
   "Adds the full76-line replacement demo stylesheet, including the revised experimental support warning, all inherited M3 component calls and new spinner light/dark/density calls. It uses experimental define-theme and is not shipped by the owned facade; authenticate the complete addition and the paired73-line deletion, without assuming byte-identical rename semantics."
  ],
  "src/dev-app/theme-token-api.scss": [
   "Deletes the complete73-line old token demo stylesheet. The replacement changes the warning and adds spinner calls; it does not authorize deletion/renaming of any owned Sass entry, helper or consumer binding."
  ],
  "src/material-experimental/theming-next/README.md": [
   "Removes the stale main-branch link to the deleted token demo. No removed documentation link becomes a minimum-peer or source-equivalence authority."
  ],
  "src/material-experimental/theming/_m3-tokens.scss": [
   "Registers MDC circular-progress-indicator values under the circular-progress namespace. The owned M2 circular-progress token producer and original primary/accent/warn routes remain."
  ],
  "src/material/progress-spinner/_progress-spinner-theme.scss": [
   "Adds sass:map for M3 token lookup. Preserve the tagged owned import graph with its single prior MDC URL reroute.",
   "Branches base and color on M3 version, preserves newer M2 accent/warn selector handling, and reformats historically empty typography/density mixins. The owned16color selectors differ already; compare full/raw config and dark/light CSS, keeping historical empty dimensions rather than adding workaround stubs.",
   "Adds the private nonempty-token helper used by base/color; unchanged theme orchestration calls those branches. Do not introduce the modern base/private inspection API or replace the separate legacy circle stroke palette."
  ]
 },
 "2f958aced5757915f75e4036229d5df63f6ff414": {
  "src/dev-app/theme-m3.scss": [
   "Adds the radio light-theme call to the existing experimental demo. This is separate from legacy radio styling.",
   "Adds the dark radio color call; the owned legacy foreground/disabled and palette rules remain tagged16.",
   "Adds radio density calls to the scale loop; validate owned modern radio density and touch-target output independently."
  ],
  "src/material-experimental/theming/_custom-tokens.scss": [
   "Adds on-surface ripple/disabled-label and primary checked-ripple values for the mat-radio M3 namespace. Historical owned radio has distinct palette-dependent selected, disabled and ripple states; preserve their complete emitted CSS."
  ],
  "src/material-experimental/theming/_m3-density.scss": [
   "Adds the MDC radio40/36/32/28px state-layer scale and empty mat-radio namespace while regrouping existing MDC/custom entries. Do not transplant M3 touch geometry into historical legacy radio; original M2 modern density and separate legacy structure remain checked."
  ],
  "src/material-experimental/theming/_m3-tokens.scss": [
   "Adds MDC radio-button value generation with slot filtering. The historical owned MDC token producer is retained.",
   "Adds custom mat-radio generation and filtering alongside MDC tokens. Both namespaces are material; neither is excluded merely because no experimental generator is shipped."
  ],
  "src/material/radio/_radio-theme.scss": [
   "Adds sass:map for token-map lookup. The owned original16theme already has its historical map import and three enumerated MDC URL reroutes.",
   "Branches base/color/typography/density/theme on M3 version and adds the two-namespace helper. The retained newer M2 branch already differs from16 in palette arguments and selector-root use. Preserve actual owned primary/accent/warn mapping, disabled/ripple states, typography and touch-target suppression with tagged CSS checks."
  ]
 },
 "289ddd348395f0299a6c7cba2cde8662842df06d": {
  "src/dev-app/theme-m3.scss": [
   "Adds light progress-bar theme emission to the experimental demo. It does not change the owned progress-bar public mixin names.",
   "Adds dark progress-bar color emission and a blank line. Compare dark/light original16outputs; the existing finite public-peer alias contract remains separately measured.",
   "Adds progress-bar density emission in the scale loop. The historically empty modern density remains exactly original, not a new workaround."
  ],
  "src/material-experimental/theming/_custom-tokens.scss": [
   "Adds documentation for the existing radio custom-token function without changing its values. Keep this documentation hunk within the complete behavioral commit review."
  ],
  "src/material-experimental/theming/_m3-density.scss": [
   "Adds empty MDC snackbar/circular-progress/linear-progress namespace entries so density traversal accepts them. Empty experimental namespace maps do not authorize replacing real owned legacy mixins or broadening facade output.",
   "Adds the empty custom mat snack-bar density entry; preserve the existing historical aggregator and independent own snackbar model."
  ],
  "src/material-experimental/theming/_m3-tokens.scss": [
   "Adds linear-progress-indicator M3 values under the MDC linear-progress namespace with slot filtering. Owned M2 active/track colors still come from the historical palette token producer."
  ],
  "src/material/progress-bar/_progress-bar-theme.scss": [
   "Moves sass:map to the import header and branches base tokens on M3 version. Preserve the original16owned module with its enumerated URL reroute and prior finite public-color alias addition.",
   "Branches color on M3 and retains primary/accent/warn newer M2 palette dispatch. The unchanged palette helper still emits the SVG-buffer track via theme-styles; do not omit historical motion/track output or substitute modern structural styles.",
   "Branches theme dispatch and adds the private M3 token helper. Preserve tagged order, original MDC color declarations and exactly the existing4case mat-prefixed color aliases, verified through the unchanged public-peer contract."
  ]
 }
};
export const CONTROL_M3_THEME_SHAS=Object.freeze(Object.keys(PATCHES));
const FAMILIES=['snack-bar','progress-spinner','radio','progress-bar','legacy-snack-bar','legacy-progress-spinner','legacy-radio','legacy-progress-bar'];
const NAMES=FAMILIES.flatMap(f=>['color','typography',...(f.startsWith('legacy-')?[]:['density']),'theme'].map(d=>f+'-'+d));
const STRUCTURAL=[{"path": "projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.scss", "sha256": "f87776ff2d2a32075eb2794b68cc2a8eb018ec7cedbe494dcdf4c0c586504dfc", "bytes": 1539}, {"path": "projects/ngx-material-legacy/legacy-progress-spinner/progress-spinner.scss", "sha256": "c49e724b39ca30c472b418b644cd4c9da6893c74a0b0fa45518555b4672142f3", "bytes": 3867}, {"path": "projects/ngx-material-legacy/legacy-radio/radio.scss", "sha256": "54e67218650eec5eb13b866d19bdbd9c1067204bea58fb5e4e1cfeb20d4eb718", "bytes": 6022}, {"path": "projects/ngx-material-legacy/legacy-progress-bar/progress-bar.scss", "sha256": "9072277ad7c923e98433ee109a83eb412bd85571dda1dd90c3be5db0f6d5d6b6", "bytes": 9704}];
const COMPILER=[{"path": "node_modules/sass/package.json", "sha256": "c6d07347951e35cf2fee0f4ffb14b9a298daba837d1f8d515d2e8cac064022a7", "bytes": 856}, {"path": "node_modules/sass/sass.node.js", "sha256": "eb7a01ba57a04a0a421bdef0bf2f43558af4790b540a45501ec83900b07b0625", "bytes": 343}, {"path": "node_modules/sass/sass.dart.js", "sha256": "30a2f37d9a2ee27d125681477ef5e1f3c29b446137921472bb9802f10d9e64e1", "bytes": 5675052}];
const SHARED_INPUTS=[{"path": "scripts/upstream-inspection-compatibility-source-review.mjs", "sha256": "0515520c4b953c81477361d0a9f5fecd604bd5644e6ca7400f3d23c10e518c9b", "bytes": 17293}, {"path": "scripts/upstream-theming-inspection-source-review.mjs", "sha256": "8de5351f45ab9cbcbc3083e52d1d56d784a9e515c4ac0b3fb3a04c86ff4d8605", "bytes": 17725}, {"path": "scripts/sass-progress-color-alias-contract.mjs", "sha256": "3d3eb580ee4ea123a4839f33dc40bf9273c7ca3d3c92759396b95d5709152787", "bytes": 3311}, {"path": "scripts/sass-current-companion-peer.mjs", "sha256": "3c744296c550bffcced5ec88d4d95ce787597eeee4df30cd02ba2094744e507b", "bytes": 3334}, {"path": "scripts/companion-bridge-peer-oracle.mjs", "sha256": "0bb0c5bc31c6e00b7e60346a008d0ce1a7c1a649c9c64bff504d14ac08554838", "bytes": 13994}, {"path": "compatibility/rc/progress-color-alias-contract-review.json", "sha256": "69cf2113988024630ae0bed4e0299154dbdd305ad14e71d8cf762e51e9a8ce0b", "bytes": 13333}, {"path": "projects/ngx-material-legacy/styles/core/style/_component-high-contrast.scss", "sha256": "0468c17876aaf5a54a48a3f47eb084c83be5ee1a0a4e01ccdbd396ad905fb4cb", "bytes": 1400}, {"path": "pnpm-lock.yaml", "sha256": "e8b2cd00e56fd38e40f547bcacd2b38088b71548f40b3e15137fb91a1bef87a2", "bytes": 188697}];
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

function compileControl(program,modules){
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

export function verifyControlM3ThemeOriginals(original,census){
 assert.equal(original.line,'21.x');assert.equal(original.original_file_occurrences,24);assert.equal(original.original_hunks,43);
 assert.deepEqual(original.actual_status_occurrences,{M:22,A:1,D:1});assert.deepEqual(original.reviews.map(r=>r.sha),CONTROL_M3_THEME_SHAS);
 assert.equal(original.upstream_code_executed,false);assert.equal(original.credentials_used,false);assert.equal(original.project_or_shared_cache_git_mutations,0);assert.equal(original.temporary_object_database_removed,true);assert.equal(original.canonical_decisions_changed,0);assert.equal(original.g11_claim,'not-passed');
 assert.equal(hash(JSON.stringify(original.worksheet_at_capture,null,2)+'\n'),WORKSHEET_HASH);
 assert.equal(census.commits.length,1697);assert.equal(new Set(census.commits.map(r=>r.sha)).size,1697);
 const trees=originalTrees(original),tag=original.tagged_reference;assert.equal(tag.tag,'16.2.14');assert.equal(tag.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');assert.equal(gitHash('commit',tag.raw_commit),tag.commit);assert.equal(/^tree ([a-f0-9]{40})\n/.exec(tag.raw_commit)?.[1],tag.tree);
 assert.deepEqual(tag.members.map(m=>[m.path,m.blob]),TAGGED);
 for(const m of tag.members){verifyBlob(m,m.path,'100644',m.blob);assert.deepEqual(trees.member(tag.tree,m.path),{mode:'100644',obj:m.blob});}
 let files=0,hunks=0,present=0,absent=0,extraFiles=0,extraHunks=0;const reviews=[];
 for(const source of original.reviews){
  const row=census.commits.find(r=>r.sha===source.sha);assert.ok(row);assert.equal(source.subject,row.seed_subject);assert.equal(gitHash('commit',source.raw_commit),source.sha);assert.equal(source.raw_commit,row.raw_commit);assert.equal(gitHash('commit',source.parent_raw_commit),source.parent);assert.deepEqual(row.parents,[source.parent]);
  assert.equal(/^tree ([a-f0-9]{40})\n/.exec(source.raw_commit)?.[1],row.tree);assert.equal(source.after_tree,row.tree);assert.equal(/^tree ([a-f0-9]{40})\n/.exec(source.parent_raw_commit)?.[1],source.before_tree);
  assert.equal(hash(source.diff),PATCHES[source.sha]);assert.equal(source.diff_sha256,PATCHES[source.sha]);assert.equal(source.sections.map(s=>s.patch).join(''),source.diff);assert.deepEqual(source.sections.map(s=>s.path),row.complete_changed_files.map(m=>m.path));assert.deepEqual(source.frozen_seed_paths,row.ledger_comparison.listed_paths);
  const whole=[];
  for(const [index,section]of source.sections.entries()){
   const m=row.complete_changed_files[index];assert.equal(section.status,m.status);assert.ok(['M','A','D'].includes(section.status));
   for(const side of ['before','after']){const mode=m[side+'_mode'],obj=m[side+'_blob'];assert.equal(section[side+'_mode'],mode);verifyBlob(section[side],section.path,mode,obj);assert.deepEqual(trees.member(source[side+'_tree'],section.path),mode==='000000'?null:{mode,obj});mode==='000000'?absent++:present++;}
   assert.equal(hash(section.patch),section.patch_sha256);const replayed=replayThemingSection(section),comments=judgments[source.sha][section.path];assert.equal(replayed.length,comments.length);files++;hunks+=replayed.length;
   if(!source.frozen_seed_paths.includes(section.path)){extraFiles++;extraHunks+=replayed.length;}
   whole.push(...replayed.map((h,i)=>({path:section.path,index:h.index,header:h.header,sha256:h.sha256,technical_judgment:comments[i]})));
  }
  reviews.push({sha:source.sha,diff_sha256:PATCHES[source.sha],complete_original_paths:source.sections.map(s=>s.path),frozen_seed_paths:source.frozen_seed_paths,whole_original_hunk_reviews:whole,source_review_complete:true,proposed_final_disposition:'do-not-adopt',affected_branches:['21.x'],review_depth:'individual-compatibility',canonical_disposition_applied:false});
 }
 trees.assertComplete();assert.equal(trees.count,66);assert.equal(files,24);assert.equal(hunks,43);assert.equal(present,46);assert.equal(absent,2);
 return {reviews,original_files:files,original_hunks:hunks,present_original_blobs:present,authenticated_absent_images:absent,tagged_blobs:15,exact_patch_replays:files,authenticated_tree_objects:trees.count,additional_files_beyond_seed:extraFiles,additional_hunks_beyond_seed:extraHunks};
}
export function verifyControlThemeReference(capsule,identity,original){
 assert.equal(capsule.line,'21.x');assert.equal(capsule.members.length,82);assert.equal(capsule.archives.length,22);assert.deepEqual(capsule.identity,IDENTITY);assert.deepEqual(capsule.originals,ORIGINAL);
 for(const flag of ['package_install_or_runtime_execution','sass_compilation_executed_during_capture','full_facade_dependency_graph_captured'])assert.equal(capsule[flag],false);
 assert.equal(capsule.all_dependency_graph_members_match_prior_original_source_identity,true);
 const outside=['src/material/core/tokens/m2/_index.scss','src/material/legacy-snack-bar/snack-bar-container.scss','src/material/legacy-progress-spinner/progress-spinner.scss','src/material/legacy-radio/radio.scss','src/material/legacy-progress-bar/progress-bar.scss'];assert.deepEqual(capsule.tagged_review_sources_outside_selected_compiler_graph,outside);
 const known=new Map(Object.values(identity.loaded_source_sets).flat().map(m=>[m.path,m])),packages=new Map(identity.packages.map(m=>[m.package,m])),sources={};
 assert.equal(new Set(capsule.members.map(m=>m.path)).size,82);assert.equal(new Set(capsule.archives.map(m=>m.package)).size,22);
 for(const m of capsule.members){const expected=known.get(m.path);assert.ok(expected);assert.equal(hash(m.body),m.sha256);assert.equal(Buffer.byteLength(m.body),m.bytes);assert.equal(m.sha256,expected.sha256);assert.equal(m.bytes,expected.bytes);sources['/'+m.path]=m.body;}
 for(const row of capsule.archives){const {acquisition,...metadata}=row;assert.ok(['existing-archive-data','pinned-public-archive-data'].includes(acquisition));assert.deepEqual(metadata,packages.get(row.package));}
 for(const m of original.tagged_reference.members)if(!outside.includes(m.path))assert.equal(sources['/'+m.path.replace('src/material/','@angular/material/')],m.body);
 return sources;
}
export function measureControlThemeContracts({reference,owned,peers,catalog,peerManifest,selected}={}){
 const catalogRaw=readFileSync(new URL('../'+CATALOG.path,import.meta.url));assert.equal(hash(catalogRaw),CATALOG.sha256);assert.deepEqual(catalog,JSON.parse(catalogRaw));
 assert.deepEqual(catalog.cases.filter(p=>SPINNER_SNACK_CONTROL_CASE_IDS.includes(p.case_id)).map(p=>p.case_id),SPINNER_SNACK_CONTROL_CASE_IDS);
 assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));assert.equal(peerManifest.version,'21.2.14');assert.equal(peerManifest.sha256,'26af34e77987b55564689c8eb7b5352db661d6a737fdec2160417ae42114f355');
 const all=catalog.cases.filter(p=>NAMES.includes(p.mixin));assert.equal(all.length,56);assert.equal(new Set(all.map(p=>p.case_id)).size,56);const probes=selected??all;assert.ok(probes.length>0);assert.equal(new Set(probes.map(p=>p.case_id)).size,probes.length);
 const cases=probes.map(probe=>{
  assert.deepEqual(probe,all.find(p=>p.case_id===probe.case_id),'unknown or changed control theme probe');const family=FAMILIES.find(f=>probe.mixin.startsWith(f+'-')),names=NAMES.filter(n=>n.startsWith(family+'-'));
  const harness="@forward 'core/theming/theming' show define-palette, define-light-theme, define-dark-theme, get-color-config;\n@forward 'core/theming/palette' show $indigo-palette, $pink-palette, $red-palette;\n@forward 'core/typography/typography' show define-typography-level, define-typography-config, define-legacy-typography-config;\n@forward '"+family+'/'+family.replace(/^legacy-/,'')+"-theme' as "+family+'-* show '+names.join(', ')+';\n';
  const program=base=>'@use "review:'+base+'/_selected-control-entry.scss" as m;\n'+catalog.setup+'\n'+probe.call+'\n';
  const expected=compileControl(program('/@angular/material'),{...reference,'/@angular/material/_selected-control-entry.scss':harness}),actual=compileControl(program('/owned/material'),{...owned,...peers,'/owned/material/_selected-control-entry.scss':harness});
  const peerProgram=progressColorPeerProgram(probe.case_id);let peer=null;
  if(peerProgram){const out=compileControl(peerProgram,peers);peer={line:'21.x',peer_version:peerManifest.version,peer_package_json_sha256:peerManifest.sha256,program:peerProgram,program_sha256:hash(peerProgram),...out,sources:out.loaded_sources.map(s=>({root:s.path.startsWith('/@angular/material/')?0:1,path:s.path.replace(/^\/@angular\/(material|cdk)\//,''),sha256:s.sha256,bytes:s.bytes})).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path))};}
  const bridgeCase=SPINNER_SNACK_CONTROL_CASE_IDS.includes(probe.case_id),dimension=probe.mixin.slice(family.length+1);
  assert.ok(peer?progressColorAliasResultsMatch(probe.case_id,expected,actual,peer):bridgeCase?spinnerSnackPositionedTokenResultsMatch({family,dimension,original:expected,actual}):actual.css===expected.css,'control CSS differs from untouched16 and existing finite progress alias contract: '+probe.case_id);
  return {case_id:probe.case_id,mixin:probe.mixin,variant:probe.variant,finite_family_forward_harness:harness,expected,actual,peer,comparison:peer?'existing-finite-progress-color-alias':bridgeCase?'finite-current-spinner-snack-positioned-public-tokens':'exact-untouched16'};
 });
 return {case_count:cases.length,cases,exact_tagged_cases:cases.filter(c=>c.comparison==='exact-untouched16').length,current_spinner_snack_bridge_cases:cases.filter(c=>c.comparison==='finite-current-spinner-snack-positioned-public-tokens').length,existing_progress_alias_cases:cases.filter(c=>c.peer).length,historically_empty_cases:cases.filter(c=>!c.expected.css).length,full_facade_or_native_or_packed_qualified:false};
}
export function reviewControlM3ThemeSource({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const shared=reviewInspectionCompatibilitySource({root,read}),bound=new Map(shared.bound.map(ref=>[ref.path,ref]));
 const c04=spinnerSnackC04Source({root,read});for(const ref of c04.bound)bound.set(ref.path,ref);
 function member(ref){ref=c04.qualify(ref);const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed control theme source '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;}
 function current(path){const raw=read(path);return member({path,sha256:hash(raw),bytes:raw.length});}
 member({path:'scripts/upstream-control-m3-theme-source-review.mjs',sha256:hash(image),bytes:image.length});for(const ref of [...COMPILER,...SHARED_INPUTS,...STRUCTURAL])member(ref);
 assert.equal(JSON.parse(current('package.json')).devDependencies.sass,'1.104.1');assert.equal(JSON.parse(read('package.json')).packageManager,'pnpm@12.4.2');assert.equal(current('.node-version').toString().trim(),'24.21.0');assert.equal(current('.npm-version').toString().trim(),'11.19.0');current('toolchain-lock.json');
 const original=JSON.parse(gunzipSync(member(ORIGINAL)));for(const ref of [original.producer,...original.inputs])member(ref);const facts=verifyControlM3ThemeOriginals(original,JSON.parse(gunzipSync(member(CENSUS))));
 const capsule=JSON.parse(gunzipSync(member(REFERENCE)));member(capsule.producer);const reference=verifyControlThemeReference(capsule,JSON.parse(member(IDENTITY)),original),catalog=JSON.parse(member(CATALOG)),tagged=new Map(original.tagged_reference.members.map(m=>[m.path,m.body]));
 const base='projects/ngx-material-legacy/',styles=base+'styles/';
 for(const f of ['snack-bar','progress-spinner','radio','progress-bar']){
  const rel=f+'/_'+f+'-theme.scss',tag=tagged.get('src/material/'+rel),currentSource=current(styles+rel).toString();let routed=tag.replaceAll("'@material/","'../vendor/mdc/");
  if(f==='progress-bar'){routed='// Copyright Google LLC All Rights Reserved. MIT license; see LICENSE.\n// Copyright (c) 2026 Ryan Lester.\n'+routed;routed=routed.replace("@use 'sass:map';","@use 'sass:map';\n@use '@angular/material' as mat;");routed=routed.replace('  @include mdc-linear-progress-theme.theme($color-tokens);','  @include mdc-linear-progress-theme.theme($color-tokens);\n  // Current public peers consume mat-prefixed slots for the same M2 colors.\n  @include mat.progress-bar-overrides($color-tokens);');}
  if(['snack-bar','progress-spinner'].includes(f))c04.assertHistoricalSource(styles+rel,routed);else assert.equal(currentSource,routed,'historical modern theme changed '+f);assert.equal(current(styles+'legacy-'+rel).toString(),tagged.get('src/material/legacy-'+rel),'historical legacy theme changed '+f);
 }
 for(const ref of STRUCTURAL){const rel=ref.path.slice(base.length),tag=tagged.get('src/material/'+rel);let routed=tag.replace("@use '@angular/cdk';","@use '../styles/core/style/component-high-contrast' as cdk;").replaceAll("@use '../core/style/","@use '../styles/core/style/").replaceAll('cdk.high-contrast(active, off)','cdk.high-contrast(active)');const body=member(ref).toString();if(rel.includes('snack-bar'))assert.ok(body.startsWith(routed+'\n\n@keyframes mat-legacy-snack-bar-enter {'));else assert.equal(body,routed,'legacy structural baseline changed '+rel);}
 assert.equal(current(styles+'core/tokens/m2/_index.scss').toString(),tagged.get('src/material/core/tokens/m2/_index.scss'));
 const facade=current(base+'_index.scss').toString(),exports=JSON.parse(current('compatibility/rc/matrices/library-exports.json')).exports;
 for(const f of FAMILIES){
  const suffix=f+'/'+f.replace(/^legacy-/,'')+"-theme' as "+f+'-* show',expected=NAMES.filter(n=>n.startsWith(f+'-')).sort();
  for(const [source,prefix]of [[facade,"@forward './styles/"],[reference['/@angular/material/_index.scss'],"@forward './"]]){
   const head=prefix+suffix;assert.equal(source.split(head).length,2,'missing or duplicate finite family forward '+f);const tail=source.slice(source.indexOf(head)+head.length);assert.deepEqual(tail.slice(0,tail.indexOf(';')).split(',').map(x=>x.trim()).sort(),expected,'changed historical finite forward names '+f);
  }
  if(f.startsWith('legacy-'))assert.ok(exports.includes('./'+f));else assert.equal(exports.includes('./'+f),false);
 }
 const owned={},peers={};for(const ref of shared.bound){if(ref.path.startsWith(styles)&&ref.path.endsWith('.scss')){const body=member(ref).toString();assert.equal(/get-theme-version|get-theme-tokens/.test(body),false);assert.equal(/@(?:use|forward)[^;]*(?:material-experimental|m3-tokens|m3-density|custom-tokens)/.test(body),false);owned['/owned/material/'+ref.path.slice(styles.length)]=body;}for(const family of ['material','cdk']){const p='node_modules/@angular/'+family+'/';if(ref.path.startsWith(p)&&ref.path.endsWith('.scss'))peers['/@angular/'+family+'/'+ref.path.slice(p.length)]=member(ref).toString();}}
 assert.equal(Object.keys(owned).length,299);const pkg=current('node_modules/@angular/material/package.json');
 const measurement=measureControlThemeContracts({reference,owned,peers,catalog,peerManifest:{version:JSON.parse(pkg).version,sha256:hash(pkg)}});assert.equal(measurement.exact_tagged_cases,42);assert.equal(measurement.current_spinner_snack_bridge_cases,10);assert.equal(measurement.existing_progress_alias_cases,4);
 const assertCurrent=()=>{c04.assertCurrent();shared.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late control theme source change '+ref.path);assert.equal(raw.length,ref.bytes);}};assertCurrent();
 const report={schema_version:1,line:'21.x',role:'Four individual complete control-theme source proposals; bounded historical CSS and unchanged finite progress alias contract',...facts,originals:ORIGINAL,tagged_sass_reference:REFERENCE,reference_identity:IDENTITY,argument_catalog:CATALOG,current_source_bindings:structuredClone([...bound.values()].sort((a,b)=>a.path.localeCompare(b.path))),current_public_bridge:structuredClone(c04.summary),compiler:sass.info,compiler_inputs:COMPILER,shared_contract_inputs:SHARED_INPUTS,control_measurement:measurement,original_sass_graph_members:82,original_locked_archive_packages:22,legacy_theme_byte_identical_to_tag:true,legacy_structural_original_geometry_preserved:true,existing_snack_motion_source_unchanged:true,component_structural_Sass_freshly_compiled:false,fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,upstream_post16_sass_or_typescript_tests_or_workflows_executed:false,original_or_post16_package_javascript_executed:false,full_sass_gate_executed:false,mixed_M2_M3_native_coexistence_qualified:false,canonical_decisions_changed:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
 const historical_report=c04.assertReportSuccessor('control-m3-theme',report);
 return {report,historical_report,bound:structuredClone([...bound.values()]),assertCurrent};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert.equal(process.argv.length,3);const scope=reviewControlM3ThemeSource();scope.assertCurrent();writeFileSync(process.argv[2],JSON.stringify(scope.report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'pass',original_files:24,original_hunks:43,control_cases:scope.report.control_measurement.case_count,source_bindings:scope.bound.length,canonical_decisions_changed:0}));}
