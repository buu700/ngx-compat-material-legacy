/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Three whole core tokenization reviews; unchanged owned CSS and ordinary public-peer boundaries. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {replayThemingSection} from './upstream-theming-inspection-source-review.mjs';
import {reviewInspectionCompatibilitySource} from './upstream-inspection-compatibility-source-review.mjs';
import {sassDeclaration} from './upstream-selector-density-source-review.mjs';
import {sortPeerProgram,sortCompanionResultsMatch} from './sass-sort-companion-contract.mjs';
import {treePeerProgram,treeCompanionResultsMatch} from './sass-tree-companion-contract.mjs';
import {rippleColorPeerProgram,rippleColorOriginalMeasurement,rippleColorArgumentResultsMatch,RIPPLE_COLOR_CONTRACT} from './sass-ripple-color-contract.mjs';
import {verifyFoundationThemeReference} from './upstream-foundation-m3-theme-source-review.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url)),sass=createRequire(import.meta.url)('sass');
const ORIGINAL={
  "path": "compatibility/rc/21x-c04-core-tokenization-originals.json.gz",
  "sha256": "a332d70b185ae67f7e5da513876b0063f8cfd65e56dcb03699c2debc32b82423",
  "bytes": 64223
};
const REFERENCE={
  "path": "compatibility/rc/21x-c04-foundation-m3-theme-tagged-sass-inputs.json.gz",
  "sha256": "1fd57dbc82b04d84e77ca2ab3c2b2dd52ff6f2d65245c0471e0ec78bb20917b4",
  "bytes": 243569
};
const REFERENCE_ORIGINALS={
  "path": "compatibility/rc/21x-c04-foundation-m3-theme-originals.json.gz",
  "sha256": "c84ffcdb6e08510c38d20d05d8296ba822451f5a275673b878401344473a92c8",
  "bytes": 178388
};
const OWNED_INTEGRITY={
  "path": "compatibility/rc/21x-c04-foundation-m3-theme-source-review.json.gz",
  "sha256": "796997f473b80a8fb5d4f7e78e80091330041ece6a2246d72988985b30a0450a",
  "bytes": 1791640
};
const IDENTITY={
  "path": "compatibility/rc/original16-sass-source-diagnostic-identity.json",
  "sha256": "324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe",
  "bytes": 89908
};
const CATALOG={
  "path": "fixtures/sass/mixin-argument-contracts.json",
  "sha256": "c1d1151a8c1fa02cea0c6fac5618bbefe11dd018bbfff1d30f5c3f35f8fc8770",
  "bytes": 143838
};
const CENSUS={
  "path": "compatibility/rc/upstream-complete-patch-census.json.gz",
  "sha256": "806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97",
  "bytes": 2172936
};
const PATCHES={
  "f2ad33442e5cba6084438278a7bafca3814ed897": "a52edf0e8456e528fbe9a9836115a830460eb10469f8014717b7bcbb7f16842f",
  "92c701ffef53c39860f0ec0765c967d5ad6030f0": "4dc75a89ead76236de1bc52d4714f065334396fec491e7944e6ed5d6e962e303",
  "47341ac0d6a56c7adb6dca5f89ba2d6fcfb7d572": "1077cf310f68dc9667288cb8066fcdc5f02f6e83fb768aaf4eef1ced74f06793"
};
const TAGGED=[
  [
    "src/material/core/tokens/m2/mat/_sort.scss",
    "000000",
    "0000000000000000000000000000000000000000"
  ],
  [
    "src/material/sort/_sort-theme.scss",
    "100644",
    "2bfb50249d1bd76ebab3778f20883db79ba31375"
  ],
  [
    "src/material/sort/sort-header.scss",
    "100644",
    "ee772bb68223aaa4d8fd0b9f6825a918a2722e1c"
  ],
  [
    "src/material/core/tokens/m2/mat/_tree.scss",
    "000000",
    "0000000000000000000000000000000000000000"
  ],
  [
    "src/material/tree/BUILD.bazel",
    "100644",
    "bb12bb15360b1e31dcd9e0ca1ee26a2f3bbc388b"
  ],
  [
    "src/material/tree/_tree-theme.scss",
    "100644",
    "871c27b853865fb520caeda9b9f4afab72df95c3"
  ],
  [
    "src/material/tree/_tree-variables.scss",
    "100644",
    "dce20f39caccf04764171cc7f60a29160364a7c1"
  ],
  [
    "src/material/tree/tree.scss",
    "100644",
    "201d191d0dac95a9166800b9f6be18a105a2cf8d"
  ],
  [
    "src/material/core/_core-theme.scss",
    "100644",
    "86d235b6dd27635f25d1b755b93156d8502cb141"
  ],
  [
    "src/material/core/ripple/_ripple-theme.scss",
    "100644",
    "a55a7da27764eb574dca1be41b32f2737cd9fd84"
  ],
  [
    "src/material/core/ripple/_ripple.scss",
    "100644",
    "ca5b93f709dc81859ae7c501ed02f6dd2360ade6"
  ],
  [
    "src/material/core/tokens/m2/mat/_ripple.scss",
    "000000",
    "0000000000000000000000000000000000000000"
  ],
  [
    "src/material/legacy-core/_core-theme.scss",
    "100644",
    "db43b6a6f8ab6159163d8b6fedcfc571bf28a569"
  ],
  [
    "src/material/_index.scss",
    "100644",
    "53d2b2f165ff2f5813b6030aa685909b7e51bb28"
  ],
  [
    "src/material/core/theming/_palette.scss",
    "100644",
    "e2b5faada05cc4a2c00d3404cfb605b9d843db2b"
  ],
  [
    "src/material/core/theming/_theming.scss",
    "100644",
    "767268e8de79caa0cafc15c475853d7f2e125934"
  ],
  [
    "src/material/core/density/private/_compatibility.scss",
    "100644",
    "ea01986af74b523eb1b5515f8f7d6af1319cf5df"
  ],
  [
    "src/material/core/style/_sass-utils.scss",
    "100644",
    "772cfbec7b3529e02be4fff48fc21d295ec58400"
  ]
];
const WORKSHEET_HASH="441958d4e17a4f25a93820a58e62de27082dab5fb0b0136285ee8b099fac5bf1";
const judgments={
  "f2ad33442e5cba6084438278a7bafca3814ed897": {
    "src/material/core/tokens/m2/mat/_sort.scss": [
      "Adds a complete60-line sort token namespace: empty base/type/density maps and an arrow-color map using card/secondary-text color mixing or the unchanged non-color value. The older parent already uses inspection; the owned16recipe remains local and retains its original selector/fallback, with the existing public sort bridge. No new inspection/token-slot API is imported into the facade."
    ],
    "src/material/sort/_sort-theme.scss": [
      "Moves direct arrow CSS into token emission and adds token namespace, selector-root and density dispatch. Preserve the actual tagged16recipe with its original full/raw argument interpretation, appended public-peer contribution and historical empty type/density dimensions. The newer empty base helper is not an owned facade export or a new workaround."
    ],
    "src/material/sort/sort-header.scss": [
      "Adds the structural stylesheet's token imports. There is no owned ordinary sort implementation; current MatSortHeader remains provided by the minimum public Material peer, so do not copy or fork this component stylesheet.",
      "Adds the structural arrow color token slot without changing the existing initial opacity or animation comments. The existing owned public sort bridge supplies this public slot while preserving the historical arrow declaration as a fallback. This is a source/token-consumption check, not native animation or computed-style certification."
    ]
  },
  "92c701ffef53c39860f0ec0765c967d5ad6030f0": {
    "src/material/core/tokens/m2/mat/_tree.scss": [
      "Adds tree surface/text/body-2 typography tokens and a density table clamped at-4 whose terminal height is28px. That differs from the retained16variable-based density recipe. Preserve the16variables/fallbacks and the already documented ordinary-current-peer token semantics as separate contracts. Fresh endpoint probes compare both, including-4,-6,minimum and the historical invalid-7 error; no new exception or original golden is introduced."
    ],
    "src/material/tree/BUILD.bazel": [
      "Adds the tree Sass library dependency to the structural Sass binary so its new imports resolve. The add-on keeps its own pinned tooling and does not inherit this Bazel target or an ordinary tree fork."
    ],
    "src/material/tree/_tree-theme.scss": [
      "Removes compatibility/tree-variable imports and direct color selectors, replacing them with tree token emission and an empty base helper. Keep actual tagged16color/type/density recipes and meaningful selectors/fallbacks; stable public tree-overrides remains the separate current-companion boundary.",
      "Replaces direct typography and legacy density calculation with token maps, retaining the parent's private typography-back-compat call. The owned16model never imports that current/private inspection surface. Its tree variables/defaults and legacy compatibility policy remain intact; the unchanged eight finite tree contracts and separate endpoint measurements cover the existing bridge."
    ],
    "src/material/tree/_tree-variables.scss": [
      "Deletes the complete14-line48pxdefault/24pxminimum/configurable maximum density module. The untouched16tag contains exactly this body, which the owned facade still uses. Do not delete it, replace it with the newer28pxterminal map, rename bindings or mutate consumer configuration."
    ],
    "src/material/tree/tree.scss": [
      "Introduces container/node color and font token slots into the current ordinary tree stylesheet. Preserve owned16theme selectors and their old values as fallbacks, while the existing public bridge supplies the current peer's slots. The public peer owns this ordinary component and its structural styles; no fork or blanketv16pixel identity is claimed.",
      "Adds the min-height slot only to the non-nested node and explicitly leaves nested-node applicability as a TODO. The retained16density selector also targets the non-nested node. Source inspection and endpoint Sass checks do not certify browser layout, typography inheritance or nested-node native behavior."
    ]
  },
  "47341ac0d6a56c7adb6dca5f89ba2d6fcfb7d572": {
    "src/material/core/_core-theme.scss": [
      "Activates ripple typography/density calls and updates a pseudo-checkbox TODO argument. The added ripple dimensions are empty in the new token module, but the parent already has newer theme-object dispatch. Keep the complete tagged16core body/order and its existing TODO behavior rather than adding new empty stubs; compile modern core and distinct legacy-core arguments freshly."
    ],
    "src/material/core/ripple/_ripple-theme.scss": [
      "Replaces direct0.1-opacity/CSS-variable ripple CSS with token maps and empty typography/density functions. The new color generator substitutes static dark/light colors for a non-color base, unlike the16CSS-variable-plus-opacity branch. Preserve the exact old branch and only the previously owned public color binding, with no new alias exception.",
      "Adds density/type theme dispatch after color. Retain the actual tagged16color-only ripple theme orchestration and the complete core/legacy-core call order. Thirty-two finite full/raw/dark arguments freshly verify the old CSS and unchanged sort/tree/ripple predicates."
    ],
    "src/material/core/ripple/_ripple.scss": [
      "Adds token imports to the structural ripple module. The owned historical module keeps its existing local high-contrast helper route and original geometry; do not import newer private token helpers.",
      "Adds the public ripple color variable with a black0.1 fallback before high-contrast suppression. The owned structural body remains exactly tagged16apart from its previously reviewed high-contrast route. Its existing public color binding is emitted by the owned theme at the documented boundary. No motion, shadow-DOM or browser qualification is inferred from this source review."
    ],
    "src/material/core/tokens/m2/mat/_ripple.scss": [
      "Adds the complete49-line mat-ripple token namespace. Its color function deliberately converts non-color base values to black/white before applying0.1opacity; other dimensions are empty and token slots are merged. Do not transplant this model into the independently owned16foreground/CSS-variable branch or expose the new token generator. The module is proven absent from the16tag and remains absent from owned styles."
    ]
  }
};
export const CORE_TOKENIZATION_SHAS=Object.freeze(Object.keys(PATCHES));
const FAMILIES=['sort','tree','ripple','core','legacy-core'];
const NAMES=FAMILIES.flatMap(f=>['color','typography','density','theme'].map(d=>f+'-'+d));
const COMPILER=[
  {
    "path": "node_modules/sass/package.json",
    "sha256": "c6d07347951e35cf2fee0f4ffb14b9a298daba837d1f8d515d2e8cac064022a7",
    "bytes": 856
  },
  {
    "path": "node_modules/sass/sass.node.js",
    "sha256": "eb7a01ba57a04a0a421bdef0bf2f43558af4790b540a45501ec83900b07b0625",
    "bytes": 343
  },
  {
    "path": "node_modules/sass/sass.dart.js",
    "sha256": "30a2f37d9a2ee27d125681477ef5e1f3c29b446137921472bb9802f10d9e64e1",
    "bytes": 5675052
  }
];
const SHARED_INPUTS=[
  {
    "path": "scripts/upstream-inspection-compatibility-source-review.mjs",
    "sha256": "0515520c4b953c81477361d0a9f5fecd604bd5644e6ca7400f3d23c10e518c9b",
    "bytes": 17293
  },
  {
    "path": "scripts/upstream-theming-inspection-source-review.mjs",
    "sha256": "8de5351f45ab9cbcbc3083e52d1d56d784a9e515c4ac0b3fb3a04c86ff4d8605",
    "bytes": 17725
  },
  {
    "path": "scripts/upstream-selector-density-source-review.mjs",
    "sha256": "42f3f517fbdd1652dad3da99e0140416a0f9c2613a78627eee25291135ec4daf",
    "bytes": 22167
  },
  {
    "path": "scripts/upstream-foundation-m3-theme-source-review.mjs",
    "sha256": "30c07556a14151b492b917b475226224652b845304783d7612f58875a1aaa3c2",
    "bytes": 50713
  },
  {
    "path": "scripts/sass-sort-companion-contract.mjs",
    "sha256": "9145daf1c9a246979a5717cdb66e0ef59dedc9b46e4f2cd079deb5975c14103b",
    "bytes": 3326
  },
  {
    "path": "scripts/sass-tree-companion-contract.mjs",
    "sha256": "e74d28348b1b454face34eb944e0f60e20cd7df28484b5fbfcf7b7f37a7c93ee",
    "bytes": 4489
  },
  {
    "path": "scripts/sass-ripple-color-contract.mjs",
    "sha256": "92e7173b0db32bdf88f7597c9d986168c3b094ee5e655c379fcab7cafbc310ef",
    "bytes": 12772
  },
  {
    "path": "scripts/sass-current-companion-peer.mjs",
    "sha256": "3c744296c550bffcced5ec88d4d95ce787597eeee4df30cd02ba2094744e507b",
    "bytes": 3334
  },
  {
    "path": "scripts/companion-bridge-peer-oracle.mjs",
    "sha256": "0bb0c5bc31c6e00b7e60346a008d0ce1a7c1a649c9c64bff504d14ac08554838",
    "bytes": 13994
  },
  {
    "path": "fixtures/sass/ripple-color-contracts.json",
    "sha256": "8a925af4d5bb8c44be9fc16e60f0fa9c05db9f3dec8a614e093814852b8b0cab",
    "bytes": 3022703
  },
  {
    "path": "compatibility/handoff/codex-closeout/reference/PRODUCT-CONTRACT.md",
    "sha256": "60aeb5b5bf0b59acab729f4b355f895a9ac664317a0e208d68447bf4b40f00b0",
    "bytes": 7805
  },
  {
    "path": "compatibility/rc/tree-current-companion-contract-review.json",
    "sha256": "70a553201a5d779b26ff79dacb59f61ef972fc078a3557c4be8b1a0e7e3273d6",
    "bytes": 78275
  },
  {
    "path": "pnpm-lock.yaml",
    "sha256": "e8b2cd00e56fd38e40f547bcacd2b38088b71548f40b3e15137fb91a1bef87a2",
    "bytes": 188697
  },
  {
    "path": "compatibility/rc/oracles/material-16.2.14-sass-api.json",
    "sha256": "76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d",
    "bytes": 171243
  },
  {
    "path": "fixtures/sass/mixin-argument-contracts.json",
    "sha256": "c1d1151a8c1fa02cea0c6fac5618bbefe11dd018bbfff1d30f5c3f35f8fc8770",
    "bytes": 143838
  },
  {
    "path": "fixtures/sass/owned-aggregate-contracts.json",
    "sha256": "b83f5ee9e898004e2fce2ae49719dbed923dd2b5eabf06f3f463a8ad33f24c7a",
    "bytes": 97224
  },
  {
    "path": "fixtures/sass/aggregate-color-theme-contracts.json",
    "sha256": "98ea32b16e3ad8cbf0dcbb5b461f69276747edd3a3b479d6c49156111c36b30b",
    "bytes": 188143
  },
  {
    "path": "fixtures/sass/default-aggregate-contracts.json",
    "sha256": "f4475a505ad874fa2b888d16866bd2a8c35351ec10f26a299070335b3335c85f",
    "bytes": 570654
  },
  {
    "path": "fixtures/sass/ordered-aggregate-contracts.json",
    "sha256": "e1cea016a0d4348ec32fc6f41b9e44623624f5ea101dfc9914db3c93abb8d6dc",
    "bytes": 563203
  }
];
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

function compileCore(program,modules){
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

export function verifyCoreTokenizationOriginals(original,census){
 assert.equal(original.line,'21.x');assert.equal(original.original_file_occurrences,12);assert.equal(original.original_hunks,17);
 assert.deepEqual(original.actual_status_occurrences,{M:8,A:3,D:1});assert.deepEqual(original.reviews.map(r=>r.sha),CORE_TOKENIZATION_SHAS);
 assert.equal(original.upstream_code_executed,false);assert.equal(original.credentials_used,false);assert.equal(original.project_or_shared_cache_git_mutations,0);assert.equal(original.temporary_object_database_removed,true);assert.equal(original.canonical_decisions_changed,0);assert.equal(original.g11_claim,'not-passed');
 assert.equal(hash(JSON.stringify(original.worksheet_at_capture,null,2)+'\n'),WORKSHEET_HASH);
 assert.equal(census.commits.length,1697);assert.equal(new Set(census.commits.map(r=>r.sha)).size,1697);
 const trees=originalTrees(original),tag=original.tagged_reference;assert.equal(tag.tag,'16.2.14');assert.equal(tag.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');assert.equal(gitHash('commit',tag.raw_commit),tag.commit);assert.equal(/^tree ([a-f0-9]{40})\n/.exec(tag.raw_commit)?.[1],tag.tree);
 assert.deepEqual(tag.members.map(m=>[m.path,m.mode,m.blob]),TAGGED);
 for(const m of tag.members){verifyBlob(m,m.path,m.mode,m.blob);assert.deepEqual(trees.member(tag.tree,m.path),m.mode==='000000'?null:{mode:m.mode,obj:m.blob});}
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
 trees.assertComplete();assert.equal(trees.count,59);assert.equal(files,12);assert.equal(hunks,17);assert.equal(present,20);assert.equal(absent,4);
 return {reviews,original_files:files,original_hunks:hunks,present_original_blobs:present,authenticated_absent_images:absent,tagged_blobs:15,authenticated_tagged_absences:3,exact_patch_replays:files,authenticated_tree_objects:trees.count,additional_files_beyond_seed:extraFiles,additional_hunks_beyond_seed:extraHunks};
}

export function verifyCoreTokenizationReference(capsule,identity,priorOriginals,original){
 const reference=verifyFoundationThemeReference(capsule,identity,priorOriginals),outside=[];
 for(const member of original.tagged_reference.members){
  const path='/'+member.path.replace('src/material/','@angular/material/');
  if(member.mode==='000000'){assert.equal(Object.hasOwn(reference,path),false);continue;}
  if(Object.hasOwn(reference,path))assert.equal(reference[path],member.body,'tag/archive source differs '+member.path);else outside.push(member.path);
 }
 assert.deepEqual(outside,['src/material/sort/sort-header.scss','src/material/tree/BUILD.bazel','src/material/tree/tree.scss']);
 return reference;
}

/** Expected CSS comes from untouched16 and unchanged finite predicates, never the owned snapshot. */
export function measureCoreTokenizationContracts({reference,owned,fullOwned,peers,catalog,peerManifest,selected}={}){
 const raw=readFileSync(new URL('../'+CATALOG.path,import.meta.url));assert.equal(hash(raw),CATALOG.sha256);assert.deepEqual(catalog,JSON.parse(raw));
 assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));assert.equal(peerManifest.version,'21.2.14');assert.equal(peerManifest.sha256,'26af34e77987b55564689c8eb7b5352db661d6a737fdec2160417ae42114f355');
 const all=catalog.cases.filter(p=>NAMES.includes(p.mixin));assert.equal(all.length,32);assert.equal(new Set(all.map(p=>p.case_id)).size,32);
 const probes=selected??all;assert.ok(probes.length>0);assert.equal(new Set(probes.map(p=>p.case_id)).size,probes.length);
 function peer(program){const out=compileCore(program,peers);return {line:'21.x',peer_version:peerManifest.version,peer_package_json_sha256:peerManifest.sha256,program,program_sha256:hash(program),...out,sources:out.loaded_sources.map(s=>({root:s.path.startsWith('/@angular/material/')?0:1,path:s.path.replace(/^\/@angular\/(material|cdk)\//,''),sha256:s.sha256,bytes:s.bytes})).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path))};}
 const cases=probes.map(probe=>{
  assert.deepEqual(probe,all.find(p=>p.case_id===probe.case_id),'unknown or changed core tokenization probe');
  const family=FAMILIES.find(f=>['color','typography','density','theme'].some(d=>f+'-'+d===probe.mixin));assert.ok(family);
  let expected,actual,evidence=null,comparison='exact-untouched16',harness=null;
  if(['sort','tree'].includes(family)){
   const names=['color','typography','density','theme'].map(d=>family+'-'+d);
   harness="@forward 'core/theming/theming' show define-palette, define-light-theme, define-dark-theme, get-color-config;\n@forward 'core/theming/palette' show $indigo-palette, $pink-palette, $red-palette;\n@forward 'core/typography/typography' show define-typography-level, define-typography-config, define-legacy-typography-config;\n@forward '"+family+'/'+family+"-theme' as "+family+'-* show '+names.join(', ')+';\n';
   const program=base=>'@use "review:'+base+'/_core-selected.scss" as m;\n'+catalog.setup+'\n'+probe.call+'\n';
   expected=compileCore(program('/@angular/material'),{...reference,'/@angular/material/_core-selected.scss':harness});actual=compileCore(program('/owned/material'),{...owned,...peers,'/owned/material/_core-selected.scss':harness});
   const code=family==='sort'?sortPeerProgram(probe.case_id):treePeerProgram(probe.case_id);
   if(code){evidence=peer(code);comparison=family;assert.ok((family==='sort'?sortCompanionResultsMatch:treeCompanionResultsMatch)(probe.case_id,expected,actual,evidence),'core tokenization finite '+family+' contract differs: '+probe.case_id);}
   else assert.equal(actual.css,expected.css,'core tokenization original CSS differs: '+probe.case_id);
  }else{
   const logical="@use '__entry__' as m;\n"+catalog.setup+'\n'+probe.call+'\n';
   const expectedRaw=compileCore(logical.replace("'__entry__'","'review:/@angular/material/_index.scss'"),reference),actualRaw=compileCore(logical.replace("'__entry__'","'review:/owned/package/_index.scss'"),{...fullOwned,...peers});
   expected={...expectedRaw,program_sha256:hash(logical),sources:expectedRaw.loaded_sources.map(s=>({root:0,path:s.path.slice(1),sha256:s.sha256,bytes:s.bytes})).sort((a,b)=>a.path.localeCompare(b.path))};
   actual={...actualRaw,line:'21.x',sass_version:sass.info,program_sha256:hash(logical),sources:actualRaw.loaded_sources.map(s=>({root:s.path.startsWith('/owned/package/')?0:s.path.startsWith('/@angular/material/')?1:2,path:s.path.replace(/^\/(?:owned\/package|@angular\/(?:material|cdk))\//,''),sha256:s.sha256,bytes:s.bytes})).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path))};
   const code=rippleColorPeerProgram(probe.case_id);
   if(code){const original=rippleColorOriginalMeasurement(probe.case_id);assert.equal(expected.css,original.css);assert.equal(expected.program_sha256,original.program_sha256);assert.deepEqual(expected.sources,original.sources);evidence=peer(code);comparison='ripple-color';assert.ok(rippleColorArgumentResultsMatch(probe.case_id,expected,actual,{classification:'conforming-current-companion',contract:RIPPLE_COLOR_CONTRACT,peer:evidence}),'core tokenization finite ripple contract differs: '+probe.case_id);}
   else assert.equal(actual.css,expected.css,'core tokenization original CSS differs: '+probe.case_id);
  }
  return {case_id:probe.case_id,mixin:probe.mixin,variant:probe.variant,family,harness,expected,actual,peer:evidence,comparison};
 });
 const comparisons={};for(const row of cases)comparisons[row.comparison]=(comparisons[row.comparison]??0)+1;
 return {case_count:cases.length,cases,comparison_counts:comparisons,full_facade_cases:cases.filter(p=>!p.harness).length,historically_empty_cases:cases.filter(p=>!p.expected.css).length,full_sass_or_native_or_packed_qualified:false};
}

/** Existing ownership rule: historical declarations are fallbacks; ordinary peers retain current tokens. */
export function measureTreeDensityBoundary({reference,owned,peers}={}){
 const template=treePeerProgram('mixin-argument/tree-density/raw-density-config');assert.equal(template.split('density: -2').length,2);
 const rows=[];
 for(const scale of [0,-1,-2,-3,-4,-5,-6,-7,'minimum','maximum','default']){
  const argument=JSON.stringify(scale),program=entry=>'@use "review:'+entry+'" as tree;\n.probe { @include tree.density('+argument+'); }\n';
  function attempt(code,modules){try{return compileCore(code,modules);}catch(error){if(!error.sassMessage)throw error;return {error:error.sassMessage};}}
  const expected=attempt(program('/@angular/material/tree/_tree-theme.scss'),reference),actual=attempt(program('/owned/material/tree/_tree-theme.scss'),{...owned,...peers}),peer=attempt(template.replace('density: -2','density: '+argument),peers);
  if(scale===-7){assert.equal(actual.error,expected.error);assert.ok(expected.error.includes('between 24px and 48px'));assert.equal(peer.error,undefined);rows.push({scale,expected,actual,peer,historical_invalid_argument_preserved:true});continue;}
  for(const out of [expected,actual,peer])assert.equal(out.error,undefined);
  const legacy=/min-height: ([^;\n]+);/.exec(expected.css)?.[1],fallback=/min-height: var\(--mat-tree-node-min-height, ([^)]+)\)/.exec(actual.css)?.[1],token=/--mat-tree-node-min-height: ([^;\n]+);/.exec(actual.css)?.[1],peerToken=/--mat-tree-node-min-height: ([^;\n]+);/.exec(peer.css)?.[1];
  assert.ok(legacy&&fallback&&token&&peerToken);assert.equal(fallback,legacy,'historical tree fallback differs '+scale);assert.equal(token,peerToken,'ordinary tree public-peer token differs '+scale);
  rows.push({scale,expected,actual,peer,legacy_height:legacy,owned_fallback:fallback,owned_public_token:token,peer_public_token:peerToken,historical_fallback_preserved:true,current_peer_token_matched:true});
 }
 assert.deepEqual(rows.filter(row=>row.legacy_height&&row.legacy_height!==row.peer_public_token).map(row=>row.scale),[-4,-6,'minimum']);
 return {role:'Supplemental source boundary measurements, not new finite CSS exceptions or native qualification',rows,historical_valid_arguments:10,historical_invalid_arguments:1,historical_fallbacks_preserved:10,ordinary_public_peer_tokens_matched:10,documented_ownership_differences:3,golden_or_finite_contract_changes:0};
}

export function reviewCoreTokenizationSource({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const shared=reviewInspectionCompatibilitySource({root,read}),bound=new Map(shared.bound.map(ref=>[ref.path,ref]));
 function member(ref){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed core tokenization subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;}
 function current(path){const raw=read(path);return member({path,sha256:hash(raw),bytes:raw.length});}
 member({path:'scripts/upstream-core-tokenization-source-review.mjs',sha256:hash(image),bytes:image.length});for(const ref of [...COMPILER,...SHARED_INPUTS])member(ref);
 assert.equal(JSON.parse(current('package.json')).devDependencies.sass,'1.104.1');assert.equal(JSON.parse(read('package.json')).packageManager,'pnpm@12.4.2');assert.equal(current('.node-version').toString().trim(),'24.21.0');assert.equal(current('.npm-version').toString().trim(),'11.19.0');current('toolchain-lock.json');
 const original=JSON.parse(gunzipSync(member(ORIGINAL)));for(const ref of [original.producer,...original.inputs])member(ref);
 const facts=verifyCoreTokenizationOriginals(original,JSON.parse(gunzipSync(member(CENSUS)))),capsule=JSON.parse(gunzipSync(member(REFERENCE)));member(capsule.producer);
 const reference=verifyCoreTokenizationReference(capsule,JSON.parse(member(IDENTITY)),JSON.parse(gunzipSync(member(REFERENCE_ORIGINALS))),original);
 const priorOwned=JSON.parse(gunzipSync(member(OWNED_INTEGRITY))),base='projects/ngx-material-legacy/',styles=base+'styles/';
 // This prior record authenticates unchanged owned input bytes only. Its CSS/results are never read.
 const integrityRefs=priorOwned.current_source_bindings.filter(ref=>ref.path.startsWith(base)&&ref.path.endsWith('.scss'));assert.equal(integrityRefs.length,409);for(const ref of integrityRefs)member(ref);
 const catalog=JSON.parse(member(CATALOG)),owned={},fullOwned={},peers={};
 for(const ref of shared.bound){
  if(ref.path.startsWith(base)&&ref.path.endsWith('.scss')){const body=member(ref).toString();fullOwned['/owned/package/'+ref.path.slice(base.length)]=body;if(ref.path.startsWith(styles))owned['/owned/material/'+ref.path.slice(styles.length)]=body;}
  for(const family of ['material','cdk']){const p='node_modules/@angular/'+family+'/';if(ref.path.startsWith(p)&&ref.path.endsWith('.scss'))peers['/@angular/'+family+'/'+ref.path.slice(p.length)]=member(ref).toString();}
 }
 assert.equal(Object.keys(owned).length,299);assert.equal(Object.keys(fullOwned).length,409);
 const tag=new Map(original.tagged_reference.members.filter(m=>m.mode==='100644').map(m=>[m.path,m.body]));
 for(const rel of ['core/_core-theme.scss','legacy-core/_core-theme.scss','tree/_tree-variables.scss'])assert.equal(current(styles+rel).toString(),tag.get('src/material/'+rel),'tagged core or tree variables changed '+rel);
 const structural=tag.get('src/material/core/ripple/_ripple.scss').replace("@use '@angular/cdk';","@use '../style/high-contrast' as legacy-high-contrast;").replace('cdk.high-contrast(active, off)','legacy-high-contrast.active()');assert.equal(current(styles+'core/ripple/_ripple.scss').toString(),structural);
 const rippleTag=tag.get('src/material/core/ripple/_ripple-theme.scss'),rippleColor=sassDeclaration(rippleTag,'mixin','color');
 const publicBinding=`  // Public ripple infrastructure can inject its structural styles after the
  // theme. Bind its public color token to this independently owned M2 model.
  @include sass-utils.current-selector-or-root() {
    @if (meta.type-of($foreground-base) == color) {
      --mat-ripple-color: #{rgba($foreground-base, $color-opacity)};
    }
    @else {
      --mat-ripple-color: #{$foreground-base};
    }
  }
}`;
 const expectedRipple=rippleTag.replace("@use '../theming/theming';","@use '../theming/theming';\n@use '../style/sass-utils';").replace(rippleColor,rippleColor.slice(0,-1)+'\n'+publicBinding);assert.equal(current(styles+'core/ripple/_ripple-theme.scss').toString(),expectedRipple,'tagged ripple branch or existing public binding changed');
 const absent=original.tagged_reference.members.filter(m=>m.mode==='000000').map(m=>styles+m.path.slice('src/material/'.length));assert.equal(absent.length,3);
 const assertAbsent=()=>{for(const path of absent){let missing=false;try{read(path);}catch(error){assert.equal(error.code,'ENOENT');missing=true;}assert.equal(missing,true,'new token module imported into historical facade '+path);}};assertAbsent();
 const exports=JSON.parse(current('compatibility/rc/matrices/library-exports.json')).exports;for(const name of ['sort','tree'])assert.equal(exports.includes('./'+name),false);
 const pkg=current('node_modules/@angular/material/package.json'),measurement=measureCoreTokenizationContracts({reference,owned,fullOwned,peers,catalog,peerManifest:{version:JSON.parse(pkg).version,sha256:hash(pkg)}});
 assert.equal(measurement.case_count,32);assert.deepEqual(measurement.comparison_counts,{'ripple-color':10,'exact-untouched16':10,sort:4,tree:8});
 const endpoint=measureTreeDensityBoundary({reference,owned,peers});
 const assertCurrent=()=>{shared.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late core tokenization source change '+ref.path);assert.equal(raw.length,ref.bytes);}assertAbsent();};assertCurrent();
 return {report:{schema_version:1,line:'21.x',role:'Three complete individual core tokenization source proposals; finite CSS and existing ordinary-peer ownership boundary only',...facts,originals:ORIGINAL,reference:REFERENCE,reference_originals:REFERENCE_ORIGINALS,owned_input_integrity_only:OWNED_INTEGRITY,current_source_bindings:structuredClone([...bound.values()]),compiler:sass.info,compiler_inputs:COMPILER,shared_contract_inputs:SHARED_INPUTS,argument_measurement:measurement,tree_density_boundary:endpoint,owned_scss_members_rehashed:409,reference_sass_members:286,reference_locked_archives:38,tagged_core_and_tree_variable_bodies_preserved:true,tagged_ripple_structural_geometry_preserved:true,tagged_ripple_color_and_variable_branches_preserved:true,ordinary_sort_tree_structural_implementation_owned:false,absent_owned_token_modules:absent,prior_CSS_results_reused:false,tagged_reference_Sass_executed:true,approved_installed_minimum_peer_public_Sass_executed:true,captured_post16_patch_Sass_TypeScript_tests_or_workflows_executed:false,component_structural_Sass_freshly_compiled:false,full_Sass_gate_executed:false,canonical_decisions_changed:0,golden_or_finite_contract_changes:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'},bound:structuredClone([...bound.values()]),assertCurrent};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);const scope=reviewCoreTokenizationSource();scope.assertCurrent();writeFileSync(process.argv[2],JSON.stringify(scope.report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'pass',original_files:12,original_hunks:17,argument_cases:32,tree_density_boundaries:11,bound:scope.bound.length,canonical_decisions_changed:0}));
}
