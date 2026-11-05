/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Five whole-patch historical Sass decisions; no product, native or packed gate credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,lstatSync,realpathSync} from 'node:fs';
import {join,resolve,posix,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {replayThemingSection} from './upstream-theming-inspection-source-review.mjs';
import {reviewInspectionCompatibilitySource} from './upstream-inspection-compatibility-source-review.mjs';
import {spinnerSnackC04Source} from './sass-spinner-snack-c04-source.mjs';
import {captureCurrentSassMetadata} from './current-sass-inspection-scope.mjs';
import {ordinaryCheckboxButtonExpectedCss} from '../compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs';
import {legacyDatepickerButtonExpectedCss} from '../compatibility/rc/ordinary-checkbox-button-legacy-composition-model-v1.mjs';
const sass=createRequire(import.meta.url)('sass'),PREFIX='compatibility/rc/21x-c04-button-tokenization-';
const ORIGINAL={path:PREFIX+'originals.json.gz',sha256:'0c63465fed015d93af03cded959e871d448a0c555a6be19b5d88ff1ef8c1ba39',bytes:61344};
const REFERENCE={path:PREFIX+'tagged-sass-inputs.json.gz',sha256:'90a3d95d32230a9ba838be4f5e7c9067452fe8f646f5c0db289f064b92f12481',bytes:93478};
const IDENTITY={path:'compatibility/rc/original16-sass-source-diagnostic-identity.json',sha256:'324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe',bytes:89908};
const CATALOG={path:'fixtures/sass/mixin-argument-contracts.json',sha256:'c1d1151a8c1fa02cea0c6fac5618bbefe11dd018bbfff1d30f5c3f35f8fc8770',bytes:143838};
const CENSUS={path:'compatibility/rc/upstream-complete-patch-census.json.gz',sha256:'806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'};
const SOURCE_REPORT={path:PREFIX+'source-review.json',sha256:'4fa19472ae965a5fbc097b51ab60f344acd7791909d97221a954a25f89e9463a',bytes:870169};
const PUBLIC_SCOPE={path:'compatibility/rc/upstream-sass-inspection-current-scope.json.gz',sha256:'b0a8f0d0d2ce8cb41943a0585ccdcc25fd6bb0d30c9339f80501ef86c65726f4',bytes:61597};
const MODEL_INPUTS=[
 {path:'compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs',sha256:'f094e84d2ce8a3f36aab239eb0d30940da976072a85ca0edcf29b8afb6dc9fb0',bytes:13313},
 {path:'compatibility/rc/ordinary-checkbox-button-legacy-composition-model-v1.mjs',sha256:'2b136425698aa80d0ae368f74968fff94267d40b612b00b0bfba5577763a0692',bytes:5779},
 {path:'compatibility/rc/ordinary-checkbox-button-legacy-composition-cases-v1.json',sha256:'8f4186d34848a0f298170c2124bbb727ff31a3995a1e8f041ab05476ffe1125d',bytes:12675},
 {path:'compatibility/rc/ordinary-checkbox-button-legacy-composition-known-before-v1.json',sha256:'3e96bf8c73dc35d1cb9d132c74f69b6f91ee7d22b19b185cf3540d68d3cb9f43',bytes:1706},
];
const COMPILER=[
 {path:'node_modules/sass/package.json',sha256:'c6d07347951e35cf2fee0f4ffb14b9a298daba837d1f8d515d2e8cac064022a7',bytes:856},
 {path:'node_modules/sass/sass.node.js',sha256:'eb7a01ba57a04a0a421bdef0bf2f43558af4790b540a45501ec83900b07b0625',bytes:343},
 {path:'node_modules/sass/sass.dart.js',sha256:'30a2f37d9a2ee27d125681477ef5e1f3c29b446137921472bb9802f10d9e64e1',bytes:5675052},
];
const PATCHES={
 '48a988a448200c9ad4a0099e7879b9eff3da0a41':'fc902b3df4880b7ce3e889b964d3c03227e272649d07abb7495eed059848aabe',
 'f2b4a04d5b6d91e2af81610fb5c95945759ad390':'f740abe765835606847e8e9f32023790c1b28a8d356ef11b2699489af727a26a',
 '823c40192915f805132272e15a27230b621c1b77':'fbb8ba4f94fe0101c7cdc80ce54b3beaf33fc34d73f9651076a87d6fdc7d9f99',
 '5c822977dbe77b7db92233a877e26ae7c1bdeaad':'4c8c00cf669c5e9d0c80ef2108bda29b1b075f2ed31182ba0ac877eed35973d5',
 '592307261faf09f9603310a9fb97d1d18bc40f6e':'6fd643b7b34c41a3181c7f1bdc12d9e85d4faf2de5f41cf8f70fae1afe801f9c',
};
export const BUTTON_TOKENIZATION_SHAS=Object.freeze(Object.keys(PATCHES));
const TAGGED=[
 ['src/material/button/_button-theme.scss','3b55060891af05996680f8bd65a86d9408254415'],
 ['src/material/button/button.scss','b8e6dd6609b4825627a7a165de0ab9be0ec0e452'],
 ['src/material/legacy-button/_button-theme.scss','548e1b5c7334c2cc9c39e569726a4eb99ba66b20'],
 ['src/material/legacy-button/button.scss','05c24bfcd2081b00c5d063e21c964326668bc60f'],
 ['src/material/core/theming/_palette.scss','e2b5faada05cc4a2c00d3404cfb605b9d843db2b'],
 ['src/material/core/theming/_theming.scss','767268e8de79caa0cafc15c475853d7f2e125934'],
];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url));
const bufferEquals=Buffer.prototype.equals,equalBytes=(a,b)=>Buffer.isBuffer(b)&&Reflect.apply(bufferEquals,a,[b]);
function physical(root,path){
 assert.equal(typeof path,'string');assert.ok(path&&!isAbsolute(path)&&!path.includes('\\')&&!path.includes('\0')&&path.split('/').every(p=>p&&p!=='.'&&p!=='..'));
 const regular=(base,parts)=>{let file=base;for(const part of parts){file=join(file,part);assert.equal(lstatSync(file).isSymbolicLink(),false);}assert.ok(lstatSync(file).isFile());return readFileSync(file);};
 const peer=/^node_modules\/(@angular\/(?:core|material|cdk)|sass)\/(.+)$/.exec(path);if(!peer)return regular(root,path.split('/'));
 const modules=join(root,'node_modules');assert.ok(lstatSync(modules).isDirectory()&&!lstatSync(modules).isSymbolicLink());
 if(peer[1].startsWith('@angular/'))assert.ok(lstatSync(join(modules,'@angular')).isDirectory()&&!lstatSync(join(modules,'@angular')).isSymbolicLink());
 const base=realpathSync(join(modules,peer[1]));assert.ok(lstatSync(base).isDirectory());assert.equal(JSON.parse(regular(base,['package.json'])).name,peer[1]);
 if(peer[1]==='sass')assert.ok(['package.json','sass.node.js','sass.dart.js'].includes(peer[2]));return regular(base,peer[2].split('/'));
}
const ref=(path,raw)=>({path,sha256:hash(raw),bytes:raw.length});
const union=(...groups)=>[...new Map(groups.flat().map(r=>[r.path,r])).values()].sort((a,b)=>a.path.localeCompare(b.path));
const themePath='src/material/button/_button-theme.scss',stylePath='src/material/button/button.scss',testsPath='src/material/core/tokens/tests/test-validate-tokens.scss';
const judgments={
 '48a988a448200c9ad4a0099e7879b9eff3da0a41':{
  [themePath]:[
   'Adds a post16 filled-button token dependency and contrast helper using private inspection. The owned MDC-era button theme is the tagged16 body with seven module URLs relocated; preserve that real exported historical contract rather than treating this path as absent.',
   'Removes the old unelevated palette-variant mixin. The owned historical mixin remains and supplies container/label colors through its original local MDC model; no consumer helper or palette calls are renamed.',
   'Deletes the existing untinted/primary/accent/warn unelevated color and disabled-style block. This is real theming behavior, not a mechanical unused-code removal; tagged/owned color argument cases remain the oracle.',
   'Rebuilds unelevated colors with inspection-derived palettes, variable-safe black/white contrast, new token maps and disabled overrides. Do not introduce those post16 private dependencies or map rules into the finite tagged facade; both MDC-era and legacy outputs are measured.',
  ],
  [stylePath]:[
   'Adds MDC custom-property and filled-token imports to the upstream modern component stylesheet. The add-on owns the distinct legacy button resource; keep its tagged source and four authenticated module-source reroutes.',
   'Removes modern unelevated structural theme slots and the transparent container override. No corresponding modern component stylesheet is owned or exported by this add-on; do not turn it into a component fork.',
   'Declares modern unelevated CSS-variable slots and untintable defaults with fallback emission disabled. That requires the new structural producer and token model together; it is not an authorized legacy stylesheet or facade-map update.',
  ],
  'src/material/core/tokens/m2/mdc/_button-filled.scss':[
   'Adds the complete92-line filled-button token model: default36px height/4px shape, explicit null slots, inspection colors, primary state-layer colors and empty typography/density functions. The owned module is absent; preserve the original live MDC density/color implementation instead of adding compatibility-only inspection or empty replacement mixins.',
  ],
  [testsPath]:[
   'Removes a trailing comma in an existing switch validation call; this hunk adds no owned style behavior or validation coverage.',
   'Adds a filled-button validation row that actually calls extended-fab tokens and its extended light-theme reference. The complete patch contains this wrong-component assertion; a later selected patch corrects it. Do not inherit it as proof of filled-button token validity.',
  ],
 },
 'f2b4a04d5b6d91e2af81610fb5c95945759ad390':{
  [themePath]:[
   'Adds the original MDC elevation-theme import for a later raised-button workaround. It is upstream historical research data, not authorization to import a current private peer or widen owned runtime dependencies.',
   'Adds protected-button token use and renames the new contrast helper private. The existing owned16 theme has neither token dependency nor that new helper; consumer namespace/helper calls remain unchanged.',
   'Removes the old raised palette-variant mixin. Preserve the independently owned historical variant and its complete configurable-color behavior.',
   'Deletes the existing raised palette/disabled color block. This affects actual exported MDC-era Sass and cannot be classified as irrelevant from its modern component name.',
   'Lifts inspected palette and contrast values outside the unelevated block so the new filled and raised implementations share them. The owned M2 map/getter model remains separate and tagged.',
   'Adds protected/default and filled/palette token calls for raised buttons, manual2/4/8 elevation states, disabled0 elevation and reorganized disabled blocks. Retain the tagged color/elevation selectors and APIs rather than porting this private-token rewrite or its temporary workaround.',
  ],
  [stylePath]:[
   'Imports protected-button tokens into the upstream modern structural stylesheet; that component source is not part of the owned legacy add-on.',
   'Removes the original raised structural theme slot generation and transparent-container override. Preserve the legacy resource and the existing historical Sass model.',
   'Introduces raised token slots/defaults in the modern CSS producer. This is coupled with the new token module and does not justify adding modern structural CSS to the legacy package.',
  ],
  'src/material/core/tokens/m2/mdc/_button-filled.scss':[
   'Renames the new token contrast function private. This is not an owned legacy helper migration, and no public helper spelling is changed in the facade.',
   'Updates both calls to that renamed helper. The absent new token module supplies no existing owned behavior to repair.',
  ],
  'src/material/core/tokens/m2/mdc/_button-protected.scss':[
   'Adds the complete94-line protected token module with36px/4px defaults, null elevation slots, inspection-derived palette colors and its own disabled-label opacity. Preserve tagged raised/disabled output and the finite model; do not introduce post16 inspection or structural token dependencies.',
  ],
  [testsPath]:[
   'Adds the protected MDC reference-theme import to the upstream test roster, not to an owned product or test execution graph.',
   'Adds the new protected token-module import. The data is reviewed without executing upstream test automation.',
   'Adds a correctly paired protected-token/light-theme slot check. It covers the new upstream model; it is not a tagged oracle or a substitute for the owned button CSS comparisons.',
  ],
 },
 '823c40192915f805132272e15a27230b621c1b77':{
  [themePath]:[
   'Splits raised buttons from the four-variant density block, emits token density at the raised selector and retains touch-target handling. The original shared base-class specificity and MDC density mixin are live in the owned16 source and must remain; raw and full-theme density cases cover them.',
  ],
  'src/material/core/tokens/m2/mdc/_button-protected.scss':[
   'Adds sass:map and theming imports for the new token density table; this is not an owned module-source migration.',
   'Removes the fixed36px height from untintable tokens so density will provide it. Preserve the historical default/explicit density contract instead of removing a live default.',
   'Adds a36/32/28/24px table with scale clamped at minus3 through post16 inspection. The owned historical density implementation and touch-target rules remain, without adding a token API or new selector specificity.',
  ],
 },
 '5c822977dbe77b7db92233a877e26ae7c1bdeaad':{
  [themePath]:[
   'Splits unelevated buttons from the common density block into token emission and separate touch-target handling. Keep the tagged four-variant/base-class density selector and compiler-proved output.',
  ],
  'src/material/core/tokens/m2/mdc/_button-filled.scss':[
   'Imports map and theming into the new filled-token module; no corresponding owned token module or inspection dependency is introduced.',
   'Moves container height out of untintable defaults, reorders elevation defaults and adds null focus-ring slots. Do not broaden the historical accepted token/model surface or change legacy geometry.',
   'Adds the same36/32/28/24px clamped density table for filled buttons. The original owned density mixin already remains the authoritative behavior; preserve its complete CSS and raw-config call support.',
  ],
  [testsPath]:[
   'Imports the actual filled-button MDC reference theme in the upstream slot tests.',
   'Imports the matching filled-token module in that test roster.',
   'Corrects the earlier wrong filled-button row from extended-fab tokens/reference to filled-button tokens/light theme. This is an actual upstream test repair, not evidence that an owned legacy regression exists or a reason to inherit the post16 token model.',
  ],
 },
 '592307261faf09f9603310a9fb97d1d18bc40f6e':{
  [themePath]:[
   'Imports the text-token module and removes the historical text palette-variant helper. The patch already assumes intervening filled/protected token renames; each original parent is authenticated separately, without inventing a contiguous five-patch chain.',
   'Deletes the old MDC text palette/disabled block and now-unused common variables. The owned exported16 theme still provides this behavior; preserve the existing palette and disabled selectors.',
   'Adds text color/default/palette emission through inspection and a new private palette-color token helper. The owned flat M2 maps and finite historical APIs do not call those post16 surfaces.',
   'Re-adds text disabled styles outside the old shared wrapper and notes their excessive specificity. Do not transplant this transitional selector/specificity behavior into the historical facade.',
   'Moves text density to tokens and explicitly preserves negative-density zero margins that the old MDC density mixin emitted. The owned historical mixin retains those margins and touch-target behavior; do not drop them or add a new token producer.',
   'Removes text buttons from the old common density block, leaving outlined buttons there. Preserve the original four-variant/base-class scoped output instead.',
  ],
  [stylePath]:[
   'Adds text tokens, confines the remaining override-key map to outlined buttons and emits text CSS-variable slots/defaults without fallbacks. This changes the modern structural producer; no modern component source is forked and the separate tagged legacy resource stays unchanged.',
  ],
  'src/material/core/tokens/m2/mdc/_text-button.scss':[
   'Adds the complete103-line text token model, including fallback36px height,4px shape, null typography/state-layer/icon slots, light/dark label colors, palette inspection and clamped density. These new internals are absent from the owned model; preserve original namespace, map and CSS contracts.',
  ],
  [testsPath]:[
   'Imports the text-button MDC reference theme into the upstream test module.',
   'Imports the matching text-token module in that roster.',
   'Adds a text token-slot/light-theme validation case. It belongs to the new upstream model and is not executed or used as an owned expectation; unchanged tagged outputs remain the oracle.',
  ],
 },
};
function blob(member,path,absent){
 assert.equal(member.path,path);assert.equal(typeof member.body,'string');assert.equal(Buffer.byteLength(member.body),member.bytes);assert.equal(hash(member.body),member.sha256);
 if(absent){assert.equal(member.absent,true);assert.equal(member.blob,'0'.repeat(40));assert.equal(member.body,'');}
 else{assert.equal(member.absent,undefined);assert.equal(gitHash('blob',member.body),member.blob);}
}
export function verifyButtonTokenizationOriginals(original,census){
 assert.equal(census.commits.length,1697);assert.equal(new Set(census.commits.map(row=>row.sha)).size,1697);
 assert.equal(original.line,'21.x');assert.equal(original.original_file_occurrences,18);assert.equal(original.original_hunks,47);
 assert.deepEqual(original.actual_status_occurrences,{M:15,A:3});assert.deepEqual(original.reviews.map(row=>row.sha),BUTTON_TOKENIZATION_SHAS);
 assert.equal(original.upstream_code_executed,false);assert.equal(original.canonical_decisions_changed,0);
 assert.equal(original.tagged_reference.tag,'16.2.14');assert.equal(original.tagged_reference.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');
 assert.deepEqual(original.tagged_reference.members.map(m=>[m.path,m.blob]),TAGGED);for(const m of original.tagged_reference.members)blob(m,m.path,false);
 let files=0,hunks=0,present=0,additions=0;const reviews=[];
 for(const source of original.reviews){
  const row=census.commits.find(row=>row.sha===source.sha);assert.ok(row);assert.equal(gitHash('commit',source.raw_commit),source.sha);assert.equal(source.raw_commit,row.raw_commit);
  assert.deepEqual(row.parents,[source.parent]);assert.equal(hash(source.diff),PATCHES[source.sha]);assert.equal(source.diff_sha256,PATCHES[source.sha]);
  assert.deepEqual(source.frozen_seed_paths,row.ledger_comparison.listed_paths);assert.deepEqual(source.sections.map(s=>s.path),row.complete_changed_files.map(m=>m.path));assert.equal(source.sections.map(s=>s.patch).join(''),source.diff);
  const whole=[];for(const [index,section]of source.sections.entries()){
   const member=row.complete_changed_files[index];assert.equal(section.status,member.status);
   for(const side of ['before','after']){assert.equal(section[side+'_mode'],member[side+'_mode']);assert.equal(section[side].blob,member[side+'_blob']);blob(section[side],section.path,member[side+'_mode']==='000000');if(member[side+'_mode']!=='000000')present++;}
   assert.equal(hash(section.patch),section.patch_sha256);const replayed=replayThemingSection(section),comments=judgments[source.sha][section.path];assert.equal(replayed.length,comments.length);files++;hunks+=replayed.length;if(section.status==='A')additions++;
   whole.push(...replayed.map((hunk,i)=>({path:section.path,index:hunk.index,header:hunk.header,sha256:hunk.sha256,technical_judgment:comments[i]})));
  }
  reviews.push({sha:source.sha,diff_sha256:PATCHES[source.sha],complete_original_paths:source.sections.map(s=>s.path),frozen_seed_paths:source.frozen_seed_paths,whole_original_hunk_reviews:whole,source_review_complete:true,proposed_final_disposition:'do-not-adopt',affected_branches:['21.x'],review_depth:'individual-compatibility',canonical_disposition_applied:false});
 }
 assert.equal(files,18);assert.equal(hunks,47);assert.equal(present,33);assert.equal(additions,3);
 const bad=original.reviews[0].sections.find(s=>s.path===testsPath),fixed=original.reviews[3].sections.find(s=>s.path===testsPath);
 assert.ok(bad.after.body.includes("$component: 'm2.mdc.button-filled',\n  $slots: tokens-mdc-extended-fab.get-token-slots()"));
 assert.ok(fixed.after.body.includes("$component: 'm2.mdc.button-filled',\n  $slots: tokens-mdc-button-filled.get-token-slots()"));
 return {reviews,original_files:files,original_hunks:hunks,present_original_blobs:present,tagged_blobs:6,exact_patch_replays:18,added_modules:additions,upstream_wrong_component_slot_assertions_reviewed:1,upstream_slot_assertion_repairs_reviewed:1};
}
export function verifyButtonReferenceData(capsule,identity,original){
 assert.equal(capsule.line,'21.x');assert.equal(capsule.members.length,71);assert.equal(capsule.archives.length,17);assert.equal(capsule.package_install_or_runtime_execution,false);assert.equal(capsule.sass_compilation_executed_during_capture,false);
 assert.equal(capsule.all_dependency_graph_members_match_prior_original_source_identity,true);assert.equal(capsule.full_facade_dependency_graph_captured,false);
 assert.deepEqual(capsule.component_structural_sources_from_git_capsule_only,['src/material/button/button.scss','src/material/legacy-button/button.scss']);
 const known=new Map(Object.values(identity.loaded_source_sets).flat().map(m=>[m.path,m])),packages=new Map(identity.packages.map(row=>[row.package,row]));
 assert.equal(new Set(capsule.members.map(m=>m.path)).size,71);const sources={};
 for(const member of capsule.members){const expected=known.get(member.path);assert.ok(expected);assert.equal(hash(member.body),member.sha256);assert.equal(Buffer.byteLength(member.body),member.bytes);assert.equal(member.sha256,expected.sha256);assert.equal(member.bytes,expected.bytes);sources['/'+member.path]=member.body;}
 for(const row of capsule.archives){const {acquisition,...metadata}=row;assert.ok(['existing-archive-data','pinned-public-archive-data'].includes(acquisition));assert.deepEqual(metadata,packages.get(row.package));}
 for(const member of original.tagged_reference.members){const path='/'+member.path.replace('src/material/','@angular/material/');if(!member.path.endsWith('/button.scss'))assert.equal(sources[path],member.body);}
 assert.ok(sources['/@angular/material/_index.scss']);return sources;
}
export const BUTTON_NAMES=['button-color','button-typography','button-density','button-theme','legacy-button-color','legacy-button-typography','legacy-button-theme'];
export const CURRENT_BUTTON_TOKENIZATION_CASE_IDS=Object.freeze([
 'button-color/custom-full-theme','button-color/raw-color-config','button-density/custom-full-theme','button-density/raw-density-config',
 'button-theme/custom-full-theme','button-theme/custom-dark-theme','button-typography/custom-full-theme','button-typography/raw-typography-config',
 'legacy-button-color/custom-full-theme','legacy-button-color/raw-color-config','legacy-button-theme/custom-full-theme','legacy-button-theme/custom-dark-theme',
 'legacy-button-typography/custom-full-theme','legacy-button-typography/raw-typography-config',
].map(id=>'mixin-argument/'+id));
const HARNESS_PATH='/@angular/material/_selected-button-entry.scss';
const HARNESS=`@forward 'core/theming/theming' show define-palette, define-light-theme, define-dark-theme, get-color-config;
@forward 'core/theming/palette' show $indigo-palette, $pink-palette, $red-palette;
@forward 'core/typography/typography' show define-typography-level, define-typography-config, define-legacy-typography-config;
@forward 'button/button-theme' as button-* show button-color, button-typography, button-density, button-theme;
@forward 'legacy-button/button-theme' as legacy-button-* show legacy-button-color, legacy-button-typography, legacy-button-theme;
`;
function compileButton(program,modules,current=false){
 const importer={canonicalize(value,context){
  if(value.startsWith('sass:'))return null;
  let path;if(value.startsWith('review:'))path=new URL(value).pathname;
  else if(current&&value==='@angular/material')path='/current/@angular/material';
  else if(current&&/^@angular\/cdk(?:\/|$)/.test(value))path='/current/'+value;
  else if(value.startsWith('@'))path='/'+value;else path=posix.normalize(posix.join(posix.dirname(context.containingUrl?.pathname??'/'),value));
  const parent=posix.dirname(path),name=posix.basename(path),choices=[path.endsWith('.scss')?path:path+'.scss',parent+'/'+(name.startsWith('_')?'':'_')+name+(name.endsWith('.scss')?'':'.scss'),path+'/_index.scss',path+'/index.scss'];
  const found=[...new Set(choices.filter(path=>Object.hasOwn(modules,path)))];if(!found.length)return null;assert.equal(found.length,1,'ambiguous reviewed Sass module '+value);return new URL('review:'+found[0]);
 },load(url){assert.ok(Object.hasOwn(modules,url.pathname));return {contents:modules[url.pathname],syntax:'scss'};}};
 const result=sass.compileString(program,{style:'expanded',charset:false,importers:[importer],silenceDeprecations:['import','if-function','global-builtin','color-functions','slash-div'],logger:{warn(){},debug(){}}});
 assert.ok(result.loadedUrls.every(url=>url.protocol==='review:'));
 const loaded=result.loadedUrls.map(url=>{const path=url.pathname,body=modules[path];assert.equal(typeof body,'string');return {path,sha256:hash(body),bytes:Buffer.byteLength(body)};}).sort((a,b)=>a.path.localeCompare(b.path));
 return {css:result.css,css_sha256:hash(result.css),css_bytes:Buffer.byteLength(result.css),loaded_sources:loaded};
}
/** Pure CSS layer; complete original/program/source authentication is external. */
export function currentButtonTokenizationExpectedCss({caseId,originalCss}={}){
 if(!CURRENT_BUTTON_TOKENIZATION_CASE_IDS.includes(caseId))return null;
 return caseId.startsWith('mixin-argument/legacy-button-')?legacyDatepickerButtonExpectedCss({caseId,originalCss}):ordinaryCheckboxButtonExpectedCss({caseId,originalCss});
}
export function measureButtonContracts({reference,owned,peers,catalog,selected}={}){
 assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));
 const all=catalog.cases.filter(row=>BUTTON_NAMES.includes(row.mixin));assert.deepEqual(all.map(r=>r.case_id),CURRENT_BUTTON_TOKENIZATION_CASE_IDS);const probes=selected??all;
 assert.ok(probes.length&&probes.every(row=>all.some(value=>JSON.stringify(value)===JSON.stringify(row))));assert.equal(new Set(probes.map(r=>r.case_id)).size,probes.length);
 const currentHarness='/owned/material/_selected-button-entry.scss';
 assert.ok(Object.keys(reference).every(path=>!path.startsWith('/current/')&&!path.startsWith('/owned/')));
 assert.ok(Object.keys(owned).every(path=>path.startsWith('/owned/material/')));assert.ok(peers&&Object.keys(peers).length);
 assert.ok(Object.keys(peers).every(path=>/^\/current\/@angular\/(?:material|cdk)\//.test(path)));
 const originalModules={...reference,[HARNESS_PATH]:HARNESS},currentModules={...owned,...peers,[currentHarness]:HARNESS};
 const rows=probes.map(probe=>{
  const program='@use "review:/@angular/material/selected-button-entry" as m;\n'+catalog.setup+'\n'+probe.call+'\n';
  const actualProgram=program.replace('review:/@angular/material/selected-button-entry','review:/owned/material/selected-button-entry');
  const expected=compileButton(program,originalModules),actual=compileButton(actualProgram,currentModules,true);
  const css=currentButtonTokenizationExpectedCss({caseId:probe.case_id,originalCss:expected.css});assert.equal(typeof css,'string');assert.equal(actual.css,css,'button CSS differs from finite independently derived current model: '+probe.case_id);
  assert.ok(actual.css.length>0);return {case_id:probe.case_id,mixin:probe.mixin,call:probe.call,program,program_sha256:hash(program),expected,actual,actual_program:actualProgram,actual_program_sha256:hash(actualProgram),comparison:probe.mixin.startsWith('legacy-')?'finite-nested-legacy-datepicker-button-public-tokens':'finite-ordinary-button-public-tokens',complete_css_matches_finite_current_model:true};
 });
 return {cases:rows,case_count:rows.length,finite_button_forward_harness:HARNESS,full_facade_or_structural_or_native_or_packed_qualified:false};
}

/** Pure expectation metadata. The producer separately authenticates the entire
 * historical report, source transitions, public scope and original graph. */
export function currentButtonTokenizationExpectedMeasurement({historical,transitions,publicSources}={}){
 historical=captureCurrentSassMetadata(historical);transitions=captureCurrentSassMetadata(transitions);publicSources=captureCurrentSassMetadata(publicSources);
 assert.equal(historical.case_count,14);assert.deepEqual(historical.cases.map(r=>r.case_id),CURRENT_BUTTON_TOKENIZATION_CASE_IDS);
 const source=new Map(transitions.map(r=>[r.path,r]));assert.equal(source.size,5);
 assert.deepEqual([...source.keys()].sort(),['button','checkbox','progress-spinner','snack-bar','card'].map(f=>'projects/ngx-material-legacy/styles/'+f+'/_'+f+'-theme.scss').sort());
 assert.equal(publicSources.length,185);assert.equal(new Set(publicSources.map(r=>r.path)).size,185);
 for(const r of publicSources){assert.match(r.path,/^\/current\/@angular\/(?:material|cdk)\//);assert.ok(r.path.split('/').slice(1).every(p=>p&&p!=='.'&&p!=='..'&&!p.includes('\\')));assert.match(r.sha256,/^[0-9a-f]{64}$/);assert.ok(Number.isSafeInteger(r.bytes)&&r.bytes>0);}
 const expected=structuredClone(historical);
 for(const row of expected.cases){
  assert.equal(row.complete_css_matches,true);assert.equal(row.actual.css,row.expected.css);assert.equal(row.actual.css_sha256,row.expected.css_sha256);assert.equal(row.actual.css_bytes,row.expected.css_bytes);
  assert.equal(hash(row.expected.css),row.expected.css_sha256);assert.equal(Buffer.byteLength(row.expected.css),row.expected.css_bytes);assert.equal(hash(row.program),row.program_sha256);
  const css=currentButtonTokenizationExpectedCss({caseId:row.case_id,originalCss:row.expected.css});assert.equal(typeof css,'string');
  row.actual={css,css_sha256:hash(css),css_bytes:Buffer.byteLength(css),loaded_sources:union(row.actual.loaded_sources.map(r=>{
   assert.ok(r.path.startsWith('/@angular/material/'));const path=r.path.slice('/@angular/material/'.length),changed=source.get('projects/ngx-material-legacy/styles/'+path);
   if(changed){assert.ok([changed.before.sha256,changed.current.sha256].includes(r.sha256));assert.equal(r.bytes,r.sha256===changed.before.sha256?changed.before.bytes:changed.current.bytes);}
   return {...r,path:'/owned/material/'+path,...(changed?{sha256:changed.current.sha256,bytes:changed.current.bytes}:{})};
  }),publicSources)};
  row.actual_program=row.program.replace('review:/@angular/material/selected-button-entry','review:/owned/material/selected-button-entry');assert.notEqual(row.actual_program,row.program);row.actual_program_sha256=hash(row.actual_program);
  delete row.complete_css_matches;row.comparison=row.mixin.startsWith('legacy-')?'finite-nested-legacy-datepicker-button-public-tokens':'finite-ordinary-button-public-tokens';row.complete_css_matches_finite_current_model=true;
 }
 return expected;
}
/** Strict pure whole-measurement comparison; no source/producer/run admission. */
export function currentButtonTokenizationMeasurementMatches({historical,current,transitions,publicSources}={}){
 try{assert.deepEqual(captureCurrentSassMetadata(current),currentButtonTokenizationExpectedMeasurement({historical,transitions,publicSources}));return true;}catch{return false;}
}
export function reviewButtonTokenizationSource({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 root=resolve(root);const suppliedRead=read,retained=new Map();
 read=path=>{const actual=physical(root,path),before=retained.get(path);if(before)assert.ok(equalBytes(actual,before));else retained.set(path,Buffer.from(actual));assert.ok(equalBytes(actual,suppliedRead(path)),'nonphysical button source '+path);assert.ok(equalBytes(actual,physical(root,path)),'button input changed during callback '+path);return actual;};
 const finalPhysical=()=>{for(const[path,before]of retained)assert.ok(equalBytes(physical(root,path),before),'changed final button input '+path);};
 const shared=reviewInspectionCompatibilitySource({root,read}),c04=spinnerSnackC04Source({root,read}),bound=new Map(shared.bound.map(ref=>[ref.path,ref]));for(const r of c04.bound)bound.set(r.path,r);
 function member(ref){ref=c04.qualify(ref);const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed button source '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;}
 function current(path){const raw=read(path);return member({path,sha256:hash(raw),bytes:raw.length});}
 member({path:'scripts/upstream-button-tokenization-source-review.mjs',sha256:hash(image),bytes:image.length});for(const ref of COMPILER)member(ref);
 for(const ref of MODEL_INPUTS)member(ref);const historicalReport=JSON.parse(member(SOURCE_REPORT)),publicScope=JSON.parse(gunzipSync(member(PUBLIC_SCOPE))).actual;
 assert.equal(JSON.parse(current('package.json')).devDependencies.sass,'1.104.1');assert.equal(current('.node-version').toString().trim(),'24.21.0');current('toolchain-lock.json');
 const original=JSON.parse(gunzipSync(member(ORIGINAL))),census=JSON.parse(gunzipSync(member(CENSUS))),capsule=JSON.parse(gunzipSync(member(REFERENCE))),identity=JSON.parse(member(IDENTITY)),catalog=JSON.parse(member(CATALOG));member(capsule.producer);
 const facts=verifyButtonTokenizationOriginals(original,census),reference=verifyButtonReferenceData(capsule,identity,original),tagged=new Map(original.tagged_reference.members.map(m=>[m.path,m.body]));
 const base='projects/ngx-material-legacy/',styles=base+'styles/',modern=styles+'button/_button-theme.scss',legacy=styles+'legacy-button/_button-theme.scss',component=base+'legacy-button/button.scss';
 const oldModern=tagged.get(themePath);assert.equal((oldModern.match(/'@material\//g)??[]).length,7);current(modern);c04.assertHistoricalSource(modern,oldModern.replaceAll("'@material/","'../vendor/mdc/"));assert.equal(current(legacy).toString(),tagged.get('src/material/legacy-button/_button-theme.scss'));
 let routed=tagged.get('src/material/legacy-button/_button-theme.scss');for(const module of ['core/theming/theming','core/style/private','core/typography/typography','core/typography/typography-utils','datepicker/datepicker-legacy-compat']){const before="@use '../"+module+"';";assert.equal(routed.split(before).length,2);routed=routed.replace(before,"@use '../styles/"+module+"';");}assert.equal(current(base+'legacy-button/_button-theme.scss').toString(),routed);
 let structural=tagged.get('src/material/legacy-button/button.scss');const rewrites=[["@use '@angular/cdk';","@use '../styles/core/style/component-high-contrast' as cdk;"],...['core/style/layout-common','core/focus-indicators/private','datepicker/datepicker-legacy-compat'].map(module=>["@use '../"+module+"';","@use '../styles/"+module+"';"])];for(const [before,after]of rewrites){assert.equal(structural.split(before).length,2);structural=structural.replace(before,after);}assert.equal(current(component).toString(),structural);
 const absent=['button-filled','button-protected','filled-button','protected-button','text-button'].map(name=>styles+'core/tokens/m2/mdc/_'+name+'.scss').concat([styles+'button/button.scss']);
 const assertAbsent=()=>{for(const path of absent){let missing=false;try{read(path);}catch(error){assert.equal(error.code,'ENOENT');missing=true;}assert.equal(missing,true,'unreviewed modern token/component source '+path);}};assertAbsent();
 const facade=current(base+'_index.scss').toString(),tagIndex=reference['/@angular/material/_index.scss'];
 for(const [module,namespace]of [['button/button-theme','button-*'],['legacy-button/button-theme','legacy-button-*']]){assert.ok(facade.includes("@forward './styles/"+module+"' as "+namespace+' show '));assert.ok(tagIndex.includes("@forward './"+module+"' as "+namespace+' show '));}
 const exports=JSON.parse(current('compatibility/rc/matrices/library-exports.json')).exports;assert.ok(exports.includes('./legacy-button'));assert.equal(exports.includes('./button'),false);
 const ts=current(base+'legacy-button/button.ts').toString();assert.equal((ts.match(/styleUrls:\s*\['button\.scss'\]/g)??[]).length,2);assert.ok(ts.includes('button[mat-button]')&&ts.includes('a[mat-button]'));
 const owned={};for(const ref of shared.bound)if(ref.path.startsWith(styles)&&ref.path.endsWith('.scss'))owned['/owned/material/'+ref.path.slice(styles.length)]=member(ref).toString();
 const publicSources=publicScope.current.loaded_sources.map(r=>({path:'/current/@angular/'+(r.root===0?'material':'cdk')+'/'+r.path,sha256:r.sha256,bytes:r.bytes}));
 assert.equal(publicSources.length,185);const peers={};for(const r of publicSources){const path='node_modules/'+r.path.slice('/current/'.length);peers[r.path]=member({path,sha256:r.sha256,bytes:r.bytes}).toString();}
 const measurement=measureButtonContracts({reference,owned,peers,catalog});assert.equal(measurement.case_count,14);
 const assertCurrent=()=>{shared.assertCurrent();c04.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late button source change '+ref.path);assert.equal(raw.length,ref.bytes);}assertAbsent();finalPhysical();};assertCurrent();
 const report={schema_version:1,line:'21.x',role:'Five whole-patch source decisions with finite current ordinary and nested legacy button CSS; no canonical or full product qualification',...facts,
  originals:ORIGINAL,tagged_sass_reference:REFERENCE,reference_identity:IDENTITY,argument_catalog:CATALOG,current_source_bindings:union([...bound.values()]),absent_owned_token_or_modern_component_paths:absent,
  historical_exported_functions:25,owned_scss_members:409,public_override_boundaries:9,modern_theme_module_source_rewrites:7,legacy_theme_module_source_rewrites:5,legacy_structural_module_source_rewrites:4,namespace_or_mixin_or_selector_rewrites:0,legacy_style_theme_byte_identical_to_tag:true,
  original_sass_graph_members:71,original_locked_archive_packages:17,compiler:sass.info,compiler_inputs:COMPILER,button_measurement:measurement,
  fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,upstream_post16_sass_or_typescript_tests_or_workflows_executed:false,package_install_or_javascript_runtime_execution:false,
  full_sass_gate_executed:false,canonical_decisions_changed:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',
  current_public_bridge:structuredClone(c04.summary),historical_modern_theme_exact_after_seven_MDC_relocations:true,current_modern_theme_exact_after_seven_MDC_relocations:false};
 const expected=structuredClone(historicalReport);expected.role=report.role;expected.public_override_boundaries=9;
 expected.current_source_bindings=union(c04.bound,historicalReport.current_source_bindings.map(r=>c04.qualify(r)),MODEL_INPUTS,[SOURCE_REPORT,PUBLIC_SCOPE]);
 expected.button_measurement=currentButtonTokenizationExpectedMeasurement({historical:historicalReport.button_measurement,transitions:c04.bridge.transitions,publicSources});
 expected.current_public_bridge=structuredClone(c04.summary);expected.historical_modern_theme_exact_after_seven_MDC_relocations=true;expected.current_modern_theme_exact_after_seven_MDC_relocations=false;
 assert.deepEqual(report,expected,'button source report changed beyond the exact finite current successor');
 const snapshot=captureCurrentSassMetadata(report);assertCurrent();assert.deepEqual(captureCurrentSassMetadata(report),snapshot);finalPhysical();
 return {report,historical_report:structuredClone(historicalReport),bound:structuredClone([...bound.values()]),assertCurrent};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);const scope=reviewButtonTokenizationSource();scope.assertCurrent();writeFileSync(process.argv[2],JSON.stringify(scope.report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({result:'pass',original_files:18,original_hunks:47,button_cases:scope.report.button_measurement.case_count,source_bindings:scope.bound.length,canonical_decisions_changed:0}));
}
