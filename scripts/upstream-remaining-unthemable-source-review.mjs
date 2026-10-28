/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Fourteen complete individual token-placement reviews; historical Sass and public-peer contracts. */
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
import {verifyFoundationThemeReference} from './upstream-foundation-m3-theme-source-review.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url)),sass=createRequire(import.meta.url)('sass');
import {companionAdditionPeerProgram,companionAdditionResultsMatch} from './sass-companion-addition-contract.mjs';
import {formFieldStatePeerProgram,formFieldStateArgumentResultsMatch} from './sass-form-field-state-contract.mjs';
const ORIGINAL={"path":"compatibility/rc/21x-c04-remaining-unthemable-originals.json.gz","sha256":"ba0baa59d421e92df04977bf49638812e03c27a68528ddf37b67c44be65c63e2","bytes":191151};
const REFERENCE={"path":"compatibility/rc/21x-c04-foundation-m3-theme-tagged-sass-inputs.json.gz","sha256":"1fd57dbc82b04d84e77ca2ab3c2b2dd52ff6f2d65245c0471e0ec78bb20917b4","bytes":243569};
const REFERENCE_ORIGINALS={"path":"compatibility/rc/21x-c04-foundation-m3-theme-originals.json.gz","sha256":"c84ffcdb6e08510c38d20d05d8296ba822451f5a275673b878401344473a92c8","bytes":178388};
const OWNED_INTEGRITY={"path":"compatibility/rc/21x-c04-foundation-m3-theme-source-review.json.gz","sha256":"796997f473b80a8fb5d4f7e78e80091330041ece6a2246d72988985b30a0450a","bytes":1791640};
const IDENTITY={"path":"compatibility/rc/original16-sass-source-diagnostic-identity.json","sha256":"324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe","bytes":89908};
const CATALOG={"path":"fixtures/sass/mixin-argument-contracts.json","sha256":"c1d1151a8c1fa02cea0c6fac5618bbefe11dd018bbfff1d30f5c3f35f8fc8770","bytes":143838};
const CENSUS={"path":"compatibility/rc/upstream-complete-patch-census.json.gz","sha256":"806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97","bytes":2172936};
const PATCHES={"dfba0edfbec52614e42e6fe0f9409a1fa0346669":"8c69e619f62040da6fffa493b03e283a82307e495710e5f49ce2b21d82c9f7e1","943b5dabf3fc14cf0dee80174a6891fef8a588c8":"8cdf6fca17031bfa25f43d5e2418c975a96033819c7af2edb25ebba6a0913add","c77ffa0cc22b5e7ed08923d97bb049ce74d71888":"29ba58a441aa76b3f87c6eb086bf321164f76bc79e4b85d14e196799fea34da1","7cd71b69799fa0cf4825ac2515fc29d26e2ecd47":"9db335d8097083e60e3b5f34bf6eb7b30df9e53d9b34f6def8de88d9d444c480","af1840209f81dcf8011e88b7d98101ff72f0ad1c":"8c9ee035aef7fe92050a6e7a5a433adadf0f702a508deb39d4f1451b43cac08e","c6bc738cd1d7ca3c5d468f91252cfb8619a17b01":"81fd0d1fda2fdb68bfe18bde84805a0e7a8e445b5b56461554af1e96eeaa9e1f","f823c2a52a4eed29d2a71c8d94790107231cc139":"94322c928c54560b17517a016218b8a9cb52a3eb1065862844aaa28a4a6d346f","59351724dfef12961e2fdbbe12bf141af065e3a8":"a9d0106d7964d60d18afa8494012fdece5981220c0c8397acbb6e419caf3ea26","bcbdf910b11c0d828faab2ff99d12f92970b636d":"2171bb25a5fb68438cd1d6ffc6f06ae6f30cf7e0ee3eb5769a65d382dafd885e","eed75ddfc794d36617008c7b3ebe4fcba4bef2ff":"1259f81664887e640db3beeca5e0d352c3bd3665d033d0968b3e4d5a7ba97fa1","52c85e55cd15d22abd02b4ff52b67c3752b2a27c":"f247022fb2d6cc6ab0551cb36d4203d3d8d2a10d581212b82178e7855ee6f6e3","9535454a9063f76aba3b21e69cda7337f829b224":"9fcc1fc65360bac2ffbd40e3b3c550eda1d374f8b8904e5a4f240a4a9211b829","3430c4d7ef986476eb3b15751f822c5d4593f0d8":"5e0d9c4db515cffead209938de1ee1557f8baa6c3108fc598516e7632845aa7c","556eeb19c8d53e8675df12670f5ccaa6148d2532":"78725152dbaf6569ae83d2200974881dbb0a3d3f079e935553174ee7326563c0"};
const TAGGED=[["src/material/_index.scss","100644","53d2b2f165ff2f5813b6030aa685909b7e51bb28"],["src/material/bottom-sheet/_bottom-sheet-theme.scss","100644","122e93d99a02b56c8560269fc124812218748d5e"],["src/material/bottom-sheet/bottom-sheet-container.scss","100644","d1f77c951b79c158f79d0479b7cbd7bb58eff370"],["src/material/button-toggle/_button-toggle-theme.scss","100644","5a113c16f4f36919d862481daf7a5f23607b7d58"],["src/material/button-toggle/button-toggle.scss","100644","bd61a83688265676427cf9171cfcefbc887281cb"],["src/material/button/_icon-button-theme.scss","100644","9123fff0533f1938ab669d0c442e4c6f3c45e518"],["src/material/button/icon-button.scss","100644","95a40ba69d249da02ee967e1d2e7fc19cc8f5bae"],["src/material/chips/_chips-theme.scss","100644","40cababb87a780ef7c3f31ddb08375a7f59dc750"],["src/material/chips/chip.scss","100644","44a9d28cdfac837740d434e04218a41acd863dd9"],["src/material/dialog/_dialog-theme.scss","100644","26b2dbcf742da71ea3532645d4c4288118b69f50"],["src/material/dialog/dialog.scss","100644","6a61c9838fff0279f6ad59f053d4d48e991bda09"],["src/material/divider/_divider-theme.scss","100644","3ee3d0680ff54ee93ce527808ee59295bb5a693b"],["src/material/divider/divider.scss","100644","3b0b66f252b5e3ba3ba4f1c784c245de7c51eed0"],["src/material/expansion/_expansion-theme.scss","100644","4d14da51c9dad5787fa468759d3dc1495266290f"],["src/material/expansion/expansion-panel.scss","100644","ce870070b051f601c62d4757ae4bcdf24f6ac6d3"],["src/material/form-field/_form-field-theme.scss","100644","667820f4f6adbad387d9edbe3cc5127f48c53aa9"],["src/material/form-field/form-field.scss","100644","fef7c40c4848f73a5963e0921a0f51cd97c078fd"],["src/material/legacy-chips/_chips-theme.scss","100644","d7890cde062e2247a2420559a18e119ffd894b2d"],["src/material/legacy-dialog/_dialog-theme.scss","100644","80fd8d7bf0cfbfb8d8c70232f4928c29515784bc"],["src/material/legacy-form-field/_form-field-theme.scss","100644","349c17968988d4c2302417a3b762d5f00b521aee"],["src/material/legacy-menu/_menu-theme.scss","100644","f0f2c5f674fd86b601806b875d34b9acc31686ff"],["src/material/legacy-radio/_radio-theme.scss","100644","fa16d5ae9b7cc70d48b5257c6a4acb5fc59732b6"],["src/material/legacy-slide-toggle/_slide-toggle-theme.scss","100644","1c614bb280ece7a58533f2c3bdc2cc613fe58dbb"],["src/material/legacy-table/_table-theme.scss","100644","26154df4a26088ccec846fcb331857e622ffe34c"],["src/material/legacy-tabs/_tabs-theme.scss","100644","0ae1ccbb4a0a3e81c747b73b524d26786ffde292"],["src/material/menu/_menu-theme.scss","100644","bc0d4fe382f5f5daf2df96e280f9ef79a2721457"],["src/material/menu/menu.scss","100644","5a6e2da18395b52f80f7a7b738c6ab3cb4226587"],["src/material/radio/_radio-theme.scss","100644","f6be0459969c80afb0c09cf6eefeb29124cd7a2f"],["src/material/radio/radio.scss","100644","45ddfd680a1a0f8d4b247dc22ac1ff4f62f744db"],["src/material/sidenav/_sidenav-theme.scss","100644","70407e8a8e63833ee5952b3b0a39f90aefa82b91"],["src/material/sidenav/drawer.scss","100644","794dbcc37854e44120c7536901dbb0fefcce0a74"],["src/material/slide-toggle/_slide-toggle-theme.scss","100644","8400964ec63fdf88bc9ce5cd126209570fd53030"],["src/material/slide-toggle/slide-toggle.scss","100644","40f6e967f1c05b71ee164f6510aeb7b2da84b932"],["src/material/table/_table-theme.scss","100644","cc15290349cea6e976dbf83251d3fe14f2b045db"],["src/material/table/table.scss","100644","44a852dcba791484d6418c0ba1f495b6800e9a7d"],["src/material/tabs/_tabs-common.scss","100644","c2df07afeaaf68ec78b27720c63c95a72c732cc3"],["src/material/tabs/_tabs-theme.scss","100644","d4d85fc32382bb900be0f982141786d6f02c5a87"]];
const WORKSHEET_HASH="e457755d100c85f42ab1ab57f1a1950da2863be0c8d97dfa1030b79a4d7b9d4b";
const judgments={"dfba0edfbec52614e42e6fe0f9409a1fa0346669":{"src/material/_index.scss":["Exports the new post16 dialog-base mixin. Keep the finite historical facade; public base exports remain absent and no wildcard forward is added."],"src/material/dialog/_dialog-theme.scss":["Adds a selector-or-root base mixin for modern MDC dialog defaults. Preserve the historical dialog color/typography/density contract and legacy container; no new base API or token relocation.","Calls the new base mixin before dimension dispatch. Retain untouched16 dispatch; fresh original/owned dialog arguments establish the existing outputs without adding root-scoped defaults."],"src/material/dialog/dialog.scss":["Deletes defaults from .mat-mdc-dialog-container after moving them to base(). Do not transplant this deletion into the owned legacy dialog container; preserve structural Sass and palette behavior."]},"943b5dabf3fc14cf0dee80174a6891fef8a588c8":{"src/material/_index.scss":["Exports the new post16 radio-base mixin. Keep the finite historical facade; public base exports remain absent and no wildcard forward is added."],"src/material/radio/_radio-theme.scss":["Adds scoped modern MDC and Material radio defaults under .mat-mdc-radio-button. The legacy radio structure and16theme are independently owned; these modern defaults are not a reason to add a base mixin.","Adds unconditional base emission to modern radio theme dispatch. Preserve16 radio dispatch and both legacy and modern historical argument outputs."],"src/material/radio/radio.scss":["Deletes modern radio structural MDC/Material defaults. Preserve the owned legacy radio styling and existing16structural recipes; theme-only relocation does not justify consumer CSS changes."]},"c77ffa0cc22b5e7ed08923d97bb049ce74d71888":{"src/material/_index.scss":["Exports the new post16 menu-base mixin. Keep the finite historical facade; public base exports remain absent and no wildcard forward is added."],"src/material/menu/_menu-theme.scss":["Introduces root/selector Material menu token-default emission. The owned historical menu palettes and legacy menu styling remain the contract; no public menu-base API is introduced.","Runs modern menu defaults before theme dimensions. Preserve the historical modern/legacy menu recipes and legacy overlay styles rather than relocating structural defaults."],"src/material/menu/menu.scss":["Deletes defaults from .mat-mdc-menu-panel. Preserve the historical menu structure/styles; no moving of owned overlay defaults or requirement for an extra consumer mixin."]},"7cd71b69799fa0cf4825ac2515fc29d26e2ecd47":{"src/material/_index.scss":["Exports the new post16 sidenav-base mixin. Keep the finite historical facade; public base exports remain absent and no wildcard forward is added."],"src/material/sidenav/_sidenav-theme.scss":["Introduces a modern sidenav base token-default mixin. Preserve each16fallback recipe and the already-owned current public companion bridge; no new base export.","Adds unconditional root-scoped token defaults to theme(). The existing finite companion addition remains separately authenticated against the approved21.x public peer."],"src/material/sidenav/drawer.scss":["Deletes drawer defaults following elevation and stacking setup. The ordinary current drawer implementation remains peer-owned; retain historical Sass fallback plus current public bridge without a local component/style fork."]},"af1840209f81dcf8011e88b7d98101ff72f0ad1c":{"src/material/_index.scss":["Exports the new post16 table-base mixin. Keep the finite historical facade; public base exports remain absent and no wildcard forward is added."],"src/material/table/_table-theme.scss":["Replaces the table-local _output-tokens helper, whose root fallback is html, with current-selector-or-root for base/color/typography/density. This changes scoping and adds a new API; preserve the original16 table recipes and independent legacy table theme.","Adds base dispatch before table dimensions. Keep original theme ordering and the existing legacy table CSS; fresh custom full/raw argument cases must match untouched16."],"src/material/table/table.scss":["Deletes modern table default tokens from structural Sass. Preserve original legacy table geometry and tagged16 theme behavior; do not change the owned table layout or modern CDK implementation."]},"c6bc738cd1d7ca3c5d468f91252cfb8619a17b01":{"src/material/_index.scss":["Exports the new post16 bottom-sheet-base mixin. Keep the finite historical facade; public base exports remain absent and no wildcard forward is added."],"src/material/bottom-sheet/_bottom-sheet-theme.scss":["Introduces selector-or-root bottom-sheet default tokens. Preserve the entire historical _m2 dimension recipes and the existing stable-public-peer companion bridge.","Adds unconditional base dispatch to modern bottom-sheet themes. Preserve original16 output followed by the already-reviewed finite current-peer addition; do not add another root emission."],"src/material/bottom-sheet/bottom-sheet-container.scss":["Deletes token defaults from .mat-bottom-sheet-container while preserving the upstream padding/elevation lines. The ordinary current companion remains peer-owned; keep16 fallback styling and the existing public bridge."]},"f823c2a52a4eed29d2a71c8d94790107231cc139":{"src/material/_index.scss":["Exports the new post16 chips-base mixin. Keep the finite historical facade; public base exports remain absent and no wildcard forward is added."],"src/material/chips/_chips-theme.scss":["Adds an MDC chip base mixin scoped to .mat-mdc-standard-chip. Preserve tagged16 modern chips and independently owned legacy chips themes and selectors.","Adds the base call before modern chips dimensions. Legacy chip CSS and historical dispatcher output stay unchanged; no new base API."],"src/material/chips/chip.scss":["Deletes MDC default chip tokens following token slots. Preserve legacy chip structural Sass and unchanged16 theme output; no consumer selector or spacing migration."]},"59351724dfef12961e2fdbbe12bf141af065e3a8":{"src/material/_index.scss":["Exports the new post16 tabs-base mixin. Keep the finite historical facade; public base exports remain absent and no wildcard forward is added."],"src/material/tabs/_tabs-common.scss":["Deletes indicator/tab/header defaults from the paginated tab-header common mixin. Preserve the legacy tab header structure and style lifecycle; no motion or pagination change is adopted.","Deletes background-header defaults from the background variant. Preserve the historical background selector and independent legacy behavior; this is not permission to drop a themed branch."],"src/material/tabs/_tabs-theme.scss":["Imports sass-utils solely for the new token-default root-placement path. The historical tab stylesheet imports remain unchanged.","Adds base emission for indicator,tab,header and header-with-background defaults at the current selector/root. Preserve the tagged16 tab recipes and legacy tab structure, including independent background styling.","Adds unconditional base dispatch to the modern tabs theme. Preserve16 modern and legacy tab theme dispatch and argument outputs; no animation or layout change is adopted."]},"bcbdf910b11c0d828faab2ff99d12f92970b636d":{"src/material/_index.scss":["Exports the new post16 button-toggle-base mixin. Keep the finite historical facade; public base exports remain absent and no wildcard forward is added."],"src/material/button-toggle/_button-toggle-theme.scss":["Moves both legacy-appearance and standard-appearance modern button-toggle default token maps into one root/selector base mixin. Preserve the16 fallback recipes and separately owned ordinary current companion bridge.","Adds unconditional base emission to modern button-toggle theme dispatch. Existing finite companion additions preserve original CSS and are independently matched to the installed approved public peer."],"src/material/button-toggle/button-toggle.scss":["Deletes default tokens from standalone/group base selectors. Keep the current companion peer-owned and preserve original fallback output plus finite bridge.","Deletes default tokens from standard-appearance standalone/group selectors. Preserve that appearance through the existing public companion token bridge.","Deletes standard-appearance token defaults from the individual control selector. Preserve current public peer behavior and the historical theme additions without a component fork."]},"eed75ddfc794d36617008c7b3ebe4fcba4bef2ff":{"src/material/_index.scss":["Exports the new post16 slide-toggle-base mixin. Keep the finite historical facade; public base exports remain absent and no wildcard forward is added."],"src/material/slide-toggle/_slide-toggle-theme.scss":["Moves MDC switch defaults into .mdc-switch base emission. The owned legacy slide-toggle and tagged16 modern theme remain unchanged, without a new base API.","Adds unconditional modern switch base dispatch. Preserve16 color/typography/density dispatch and independently compile both original and owned variants."],"src/material/slide-toggle/slide-toggle.scss":["Deletes switch default MDC tokens from modern structural Sass. The owned legacy slide-toggle geometry and tagged16modern theme remain unchanged; no animation or state-lifetime modification."]},"52c85e55cd15d22abd02b4ff52b67c3752b2a27c":{"src/material/expansion/_expansion-theme.scss":["Fills a post16 placeholder base mixin with root-scoped expansion default tokens. That placeholder is absent from the retained16 API; preserve16 fallback recipes and the existing public-peer companion bridge."],"src/material/expansion/expansion-panel.scss":["Deletes expansion panel structural defaults. The current expansion panel remains owned by the public peer; preserve historical fallback plus existing approved peer bridge."]},"9535454a9063f76aba3b21e69cda7337f829b224":{"src/material/divider/_divider-theme.scss":["Fills a post16 divider base placeholder with selector/root default tokens. Preserve original16 color and historically empty typography/density fallbacks plus the existing finite current-peer addition; do not invent an empty public base shim."],"src/material/divider/divider.scss":["Deletes divider structural defaults and an extra blank line. The ordinary divider remains peer-owned; preserve16 Sass semantics and existing finite bridge,without selector changes."]},"3430c4d7ef986476eb3b15751f822c5d4593f0d8":{"src/material/form-field/_form-field-theme.scss":["Fills a post16 base placeholder with filled/outlined text-field and Material form-field defaults. Preserve tagged16 recipes plus the exact already-owned state-color insertion; do not add a base API,alter token maps or move legacy structure."],"src/material/form-field/form-field.scss":["Removes sass-utils from modern structural imports after moving its only use. Preserve the owned legacy field stylesheet and its existing high-contrast/state handling.","Removes Material root defaults and filled/outlined structural defaults while retaining MDC slot emission. Do not transplant this split into legacy fields; the exact owned state-color bridge and original custom-theme behavior remain required."]},"556eeb19c8d53e8675df12670f5ccaa6148d2532":{"src/material/button/_icon-button-theme.scss":["Imports sass-utils for modern root-placement support. Keep the16 icon-button module and existing MDC import relocation unchanged.","Replaces a post16 base placeholder with default MDC icon-button theme emission. Preserve16 icon-button recipe outputs and the legacy button API; no new base export or empty compatibility shim."],"src/material/button/icon-button.scss":["Deletes default MDC icon-button tokens after slot emission. Preserve the16modern theme and owned legacy icon-button geometry; no consumer CSS or public legacy button changes."]}};
export const REMAINING_UNTHEMABLE_SHAS=Object.freeze(Object.keys(PATCHES));
const AFFECTED_FAMILIES=["dialog","radio","menu","sidenav","table","bottom-sheet","chips","tabs","button-toggle","slide-toggle","expansion","divider","form-field","icon-button"];
const FAMILIES=[...AFFECTED_FAMILIES,...["legacy-chips", "legacy-dialog", "legacy-form-field", "legacy-menu", "legacy-radio", "legacy-slide-toggle", "legacy-table", "legacy-tabs"]],NAMES=FAMILIES.flatMap(f=>['color','typography','density','theme'].map(d=>f+'-'+d));
const themeModule=f=>f==='icon-button'?'button/icon-button-theme':f+'/'+f.replace(/^legacy-/,'')+'-theme';
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

function compileRemaining(program,modules){
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

export function verifyRemainingUnthemableOriginals(original,census){
 assert.equal(original.line,'21.x');assert.equal(original.original_file_occurrences,38);assert.equal(original.original_hunks,54);
 assert.deepEqual(original.actual_status_occurrences,{M:38});assert.deepEqual(original.reviews.map(r=>r.sha),REMAINING_UNTHEMABLE_SHAS);
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
 trees.assertComplete();assert.equal(trees.count,123);assert.equal(files,38);assert.equal(hunks,54);assert.equal(present,76);assert.equal(absent,0);
 return {reviews,original_files:files,original_hunks:hunks,present_original_blobs:present,authenticated_absent_images:absent,tagged_blobs:37,authenticated_tagged_absences:0,exact_patch_replays:files,authenticated_tree_objects:trees.count,additional_files_beyond_seed:extraFiles,additional_hunks_beyond_seed:extraHunks};
}

export function verifyRemainingUnthemableReference(capsule,identity,priorOriginals,original){
 const reference=verifyFoundationThemeReference(capsule,identity,priorOriginals),outside=[];
 for(const member of original.tagged_reference.members){const path='/'+member.path.replace('src/material/','@angular/material/');if(Object.hasOwn(reference,path))assert.equal(reference[path],member.body,'tag/archive source differs '+member.path);else outside.push(member.path);}
 assert.deepEqual(outside,["src/material/bottom-sheet/bottom-sheet-container.scss", "src/material/button-toggle/button-toggle.scss", "src/material/button/icon-button.scss", "src/material/chips/chip.scss", "src/material/dialog/dialog.scss", "src/material/divider/divider.scss", "src/material/expansion/expansion-panel.scss", "src/material/form-field/form-field.scss", "src/material/menu/menu.scss", "src/material/radio/radio.scss", "src/material/sidenav/drawer.scss", "src/material/slide-toggle/slide-toggle.scss", "src/material/table/table.scss", "src/material/tabs/_tabs-common.scss"]);return reference;
}
export function measureRemainingUnthemableContracts({reference,owned,peers,catalog,peerManifest,selected}={}){
 const raw=readFileSync(new URL('../'+CATALOG.path,import.meta.url));assert.equal(hash(raw),CATALOG.sha256);assert.deepEqual(catalog,JSON.parse(raw));
 assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));assert.equal(peerManifest.version,'21.2.14');assert.equal(peerManifest.sha256,'26af34e77987b55564689c8eb7b5352db661d6a737fdec2160417ae42114f355');
 const all=catalog.cases.filter(p=>NAMES.includes(p.mixin));assert.equal(all.length,160);assert.equal(new Set(all.map(p=>p.case_id)).size,160);
 const probes=selected??all;assert.ok(probes.length>0);assert.equal(new Set(probes.map(p=>p.case_id)).size,probes.length);
 function peer(program){const out=compileRemaining(program,peers);return {line:'21.x',peer_version:peerManifest.version,peer_package_json_sha256:peerManifest.sha256,program,program_sha256:hash(program),...out,sources:out.loaded_sources.map(s=>({root:s.path.startsWith('/@angular/material/')?0:1,path:s.path.replace(/^\/@angular\/(material|cdk)\//,''),sha256:s.sha256,bytes:s.bytes})).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path))};}
 const cases=probes.map(probe=>{
  assert.deepEqual(probe,all.find(p=>p.case_id===probe.case_id),'unknown or changed token placement probe');
  const family=FAMILIES.find(f=>['color','typography','density','theme'].some(d=>f+'-'+d===probe.mixin));assert.ok(family);
  const names=[...new Set(all.filter(p=>p.mixin.startsWith(family+'-')&&p.mixin.slice(family.length+1).indexOf('-')<0).map(p=>p.mixin))];
  const harness="@forward 'core/theming/theming' show define-palette, define-light-theme, define-dark-theme, get-color-config;\n@forward 'core/theming/palette' show $indigo-palette, $pink-palette, $red-palette;\n@forward 'core/typography/typography' show define-typography-level, define-typography-config, define-legacy-typography-config;\n@forward '"+themeModule(family)+"' as "+family+'-* show '+names.join(', ')+';\n';
  const program=base=>'@use "review:'+base+'/_remaining-selected.scss" as m;\n'+catalog.setup+'\n'+probe.call+'\n';
  const expected=compileRemaining(program('/@angular/material'),{...reference,'/@angular/material/_remaining-selected.scss':harness}),actual=compileRemaining(program('/owned/material'),{...owned,...peers,'/owned/material/_remaining-selected.scss':harness});
  let comparison='exact-untouched16',evidence=null,match=actual.css===expected.css;
  for(const [label,recipe,predicate]of [['form-field-state',formFieldStatePeerProgram,formFieldStateArgumentResultsMatch],['companion-addition',companionAdditionPeerProgram,companionAdditionResultsMatch]]){
   const code=recipe(probe.case_id);if(code){evidence=peer(code);comparison=label;match=predicate(probe.case_id,expected,actual,evidence);break;}
  }
  assert.ok(match,'remaining token placement CSS differs from untouched16 and unchanged finite contract: '+probe.case_id);
  return {case_id:probe.case_id,mixin:probe.mixin,variant:probe.variant,family,harness,expected,actual,peer:evidence,comparison};
 });
 const comparison_counts={};for(const row of cases)comparison_counts[row.comparison]=(comparison_counts[row.comparison]??0)+1;
 return {case_count:cases.length,cases,comparison_counts,historically_empty_cases:cases.filter(c=>!c.expected.css).length,full_sass_or_native_or_packed_qualified:false};
}
function verifyOwnedBodies({original,current,styles}){
 const tagged=new Map(original.tagged_reference.members.map(m=>[m.path,m.body]));
 const exact=FAMILIES.filter(f=>!['bottom-sheet','button-toggle','divider','expansion','sidenav','form-field'].includes(f));
 for(const f of exact){const rel=themeModule(f).replace(/\/([^/]+)$/,'/_$1')+'.scss';assert.equal(current(styles+rel).toString(),tagged.get('src/material/'+rel).replaceAll("'@material/","'../vendor/mdc/"),'tagged theme changed '+f);}
 for(const f of ['bottom-sheet','button-toggle','divider','expansion','sidenav']){
  const rel=f+'/_'+f+'-theme.scss',tag=tagged.get('src/material/'+rel),body=current(styles+rel).toString();
  for(const d of ['color','typography','density'])assert.equal(sassDeclaration(body,'mixin','_m2-'+d),sassDeclaration(tag,'mixin',d).replace('@mixin '+d+'(','@mixin _m2-'+d+'('),'tagged fallback changed '+f+'/'+d);
 }
 const formTag=tagged.get('src/material/form-field/_form-field-theme.scss').replaceAll("'@material/","'../vendor/mdc/");
 const formColor=sassDeclaration(formTag,'mixin','color'),end='\n    }\n  }\n}';assert.ok(formColor.endsWith(end));
 const formExpected=formTag.replace("@use './mdc-text-field-theme-variable-refresh';","@use './mdc-text-field-theme-variable-refresh';\n@use '../bridges/form-field-state-overrides';\n@use '../vendor/mdc/textfield' as mdc-textfield;")
  .replace(formColor,formColor.slice(0,-end.length)+'\n\n      @include form-field-state-overrides.color(mdc-textfield.$ink-color);'+end);
 assert.equal(current(styles+'form-field/_form-field-theme.scss').toString(),formExpected,'tagged field body or finite insertion changed');
 for(const f of AFFECTED_FAMILIES){const rel=themeModule(f).replace(/\/([^/]+)$/,'/_$1')+'.scss';assert.equal(/@mixin\s+base\s*\(/.test(current(styles+rel).toString()),false,'post16 base mixin leaked '+f);}
 return {exact_tagged_theme_bodies:exact.length,tagged_fallback_dimension_recipes:15,complete_tagged_form_field_with_existing_state_insertion:true,post16_base_mixins_absent:AFFECTED_FAMILIES};
}
export function reviewRemainingUnthemableSource({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const shared=reviewInspectionCompatibilitySource({root,read}),bound=new Map(shared.bound.map(ref=>[ref.path,ref]));
 function member(ref){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed remaining unthemable subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;}
 function current(path){const raw=read(path);return member({path,sha256:hash(raw),bytes:raw.length});}
 member({path:'scripts/upstream-remaining-unthemable-source-review.mjs',sha256:hash(image),bytes:image.length});for(const ref of [...COMPILER,...SHARED_INPUTS])member(ref);
 assert.equal(JSON.parse(current('package.json')).devDependencies.sass,'1.104.1');assert.equal(JSON.parse(read('package.json')).packageManager,'pnpm@12.4.2');assert.equal(current('.node-version').toString().trim(),'24.21.0');assert.equal(current('.npm-version').toString().trim(),'11.19.0');current('toolchain-lock.json');
 const original=JSON.parse(gunzipSync(member(ORIGINAL)));for(const ref of [original.producer,...original.inputs])member(ref);
 const facts=verifyRemainingUnthemableOriginals(original,JSON.parse(gunzipSync(member(CENSUS)))),capsule=JSON.parse(gunzipSync(member(REFERENCE)));member(capsule.producer);
 const reference=verifyRemainingUnthemableReference(capsule,JSON.parse(member(IDENTITY)),JSON.parse(gunzipSync(member(REFERENCE_ORIGINALS))),original);
 const priorOwned=JSON.parse(gunzipSync(member(OWNED_INTEGRITY))),base='projects/ngx-material-legacy/',styles=base+'styles/';
 // This prior record authenticates unchanged owned input bytes only. Its CSS/results are never read.
 const integrityRefs=priorOwned.current_source_bindings.filter(ref=>ref.path.startsWith(base)&&ref.path.endsWith('.scss'));assert.equal(integrityRefs.length,409);for(const ref of integrityRefs)member(ref);
 const catalog=JSON.parse(member(CATALOG)),owned={},fullOwned={},peers={};
 for(const ref of shared.bound){
  if(ref.path.startsWith(base)&&ref.path.endsWith('.scss')){const body=member(ref).toString();fullOwned['/owned/package/'+ref.path.slice(base.length)]=body;if(ref.path.startsWith(styles))owned['/owned/material/'+ref.path.slice(styles.length)]=body;}
  for(const family of ['material','cdk']){const p='node_modules/@angular/'+family+'/';if(ref.path.startsWith(p)&&ref.path.endsWith('.scss'))peers['/@angular/'+family+'/'+ref.path.slice(p.length)]=member(ref).toString();}
 }
 assert.equal(Object.keys(owned).length,299);assert.equal(Object.keys(fullOwned).length,409);
 const ownedBodies=verifyOwnedBodies({original,current,styles}),entry=current(base+'_index.scss').toString();for(const f of AFFECTED_FAMILIES)assert.equal(entry.includes(f+'-base'),false,'post16 base export leaked '+f);
 const pkg=current('node_modules/@angular/material/package.json'),measurement=measureRemainingUnthemableContracts({reference,owned,peers,catalog,peerManifest:{version:JSON.parse(pkg).version,sha256:hash(pkg)}});assert.equal(measurement.case_count,160);
 const assertCurrent=()=>{shared.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late remaining token placement source change '+ref.path);assert.equal(raw.length,ref.bytes);}};assertCurrent();
 return {report:{schema_version:1,line:'21.x',role:'Fourteen complete individual token placement source proposals; unchanged historical outputs and existing finite companion contracts only',...facts,originals:ORIGINAL,reference:REFERENCE,reference_originals:REFERENCE_ORIGINALS,owned_input_integrity_only:OWNED_INTEGRITY,current_source_bindings:structuredClone([...bound.values()]),compiler:sass.info,compiler_inputs:COMPILER,shared_contract_inputs:SHARED_INPUTS,argument_measurement:measurement,owned_theme_bodies:ownedBodies,owned_scss_members_rehashed:409,reference_sass_members:286,reference_locked_archives:38,prior_CSS_results_reused:false,tagged_reference_Sass_executed:true,approved_installed_minimum_peer_public_Sass_executed:true,captured_post16_patch_Sass_TypeScript_tests_or_workflows_executed:false,component_structural_Sass_freshly_compiled:false,full_Sass_gate_executed:false,canonical_decisions_changed:0,golden_or_finite_contract_changes:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'},bound:structuredClone([...bound.values()]),assertCurrent};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);const scope=reviewRemainingUnthemableSource();scope.assertCurrent();writeFileSync(process.argv[2],JSON.stringify(scope.report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'pass',original_files:38,original_hunks:54,argument_cases:160,bound:scope.bound.length,canonical_decisions_changed:0}));
}
