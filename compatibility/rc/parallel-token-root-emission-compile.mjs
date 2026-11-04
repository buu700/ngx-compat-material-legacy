/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One custom-input emission/API diagnostic per branch. No build/rendering. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

assert.equal(process.versions.node,'24.21.0');
assert.equal(process.argv.length,5);
const root=resolve(process.argv[2]),line=process.argv[3],output=resolve(process.argv[4]);
assert.ok(['21','main'].includes(line));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const compilerRefs=[
 ['node_modules/sass/package.json','c6d07347951e35cf2fee0f4ffb14b9a298daba837d1f8d515d2e8cac064022a7',856],
 ['node_modules/sass/sass.node.js','eb7a01ba57a04a0a421bdef0bf2f43558af4790b540a45501ec83900b07b0625',343],
 ['node_modules/sass/sass.dart.js','30a2f37d9a2ee27d125681477ef5e1f3c29b446137921472bb9802f10d9e64e1',5675052],
];
for(const[path,sha256,size]of compilerRefs){const raw=readFileSync(join(root,path));assert.equal(hash(raw),sha256);assert.equal(raw.length,size);}
const require=createRequire(join(root,'package.json')),sass=require('sass');
assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));
const program=`@use 'sass:map';
@use 'projects/ngx-material-legacy' as owned;
@use '@angular/material' as peer;
$primary: owned.define-palette(map.merge(owned.$indigo-palette, (500: #123456)));
$accent: owned.define-palette(map.merge(owned.$pink-palette, (A200: #fedcba)), A200, A100, A400);
$type: owned.define-typography-config($font-family: 'TokenRootReview');
$theme: owned.define-light-theme((color: (primary: $primary, accent: $accent), typography: $type));
@include owned.progress-spinner-color($theme);
@include owned.snack-bar-color($theme);
@include owned.snack-bar-typography($theme);
.nested-review {
  @include owned.progress-spinner-color($theme);
  @include owned.snack-bar-color($theme);
  @include owned.snack-bar-typography($theme);
}
// Independent fixed literals demonstrate only the actual public API boundary.
.public-spinner-api {
  @include peer.progress-spinner-overrides((active-indicator-color: #123456));
}
.public-snack-api {
  @include peer.snack-bar-overrides((container-color: #abcdef,
    supporting-text-color: #112233, supporting-text-font: 'TokenRootReview',
    supporting-text-size: 19px, supporting-text-line-height: 27px,
    supporting-text-weight: 600, button-color: #fedcba));
}
`;
const warnings=[],started=performance.now();
const result=sass.compileString(program,{style:'expanded',charset:false,
 loadPaths:[root,join(root,'node_modules')],url:pathToFileURL(join(root,'compatibility/rc/parallel-token-root-emission-virtual.scss')),
 silenceDeprecations:['if-function','global-builtin','color-functions','import','slash-div'],
 logger:{warn(message){warnings.push(message);},debug(){}}});
const elapsed=performance.now()-started;
const css=result.css,blocks=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match=>({selector:match[1].trim(),body:match[2]}));
const one=selector=>{const rows=blocks.filter(row=>row.selector===selector);assert.ok(rows.length,selector);return rows.map(row=>row.body).join('\n');};
for(const scope of ['', '.nested-review ']){
 assert.ok(one(scope+'.mat-mdc-progress-spinner').includes('--mdc-circular-progress-active-indicator-color: #123456;'));
 assert.ok(one(scope+'.mat-mdc-progress-spinner.mat-accent').includes('--mdc-circular-progress-active-indicator-color: #fedcba;'));
 assert.ok(one(scope+'.mat-mdc-snack-bar-container').includes('--mdc-snackbar-container-color:'));
 assert.ok(one(scope+'.mat-mdc-snack-bar-container').includes('--mdc-snackbar-supporting-text-font: TokenRootReview;'));
 const body=one(scope+'.mat-mdc-snack-bar-container');
 assert.equal(body.includes('--mat-snack-bar-container-color:'),false);
 assert.equal(body.includes('--mat-snack-bar-supporting-text-font:'),false);
 assert.equal(one(scope+'.mat-mdc-progress-spinner').includes('--mat-progress-spinner-active-indicator-color:'),false);
}
assert.ok(one('.public-spinner-api').includes('--mat-progress-spinner-active-indicator-color: #123456;'));
for(const token of ['container-color','supporting-text-color','supporting-text-font','supporting-text-size','supporting-text-line-height','supporting-text-weight','button-color'])
 assert.ok(one('.public-snack-api').includes('--mat-snack-bar-'+token+':'),token);
const peer=JSON.parse(readFileSync(join(root,'node_modules/@angular/material/package.json'))).version;
assert.equal(peer,line==='21'?'21.2.14':'22.1.7');
const report={schema_version:1,line,kind:'bounded-custom-theme-emission-and-public-override-api-diagnostic',root,node:process.versions.node,compiler:sass.info,
 compiler_refs:compilerRefs.map(([path,sha256,bytes])=>({path,sha256,bytes})),actual_material_minimum:peer,
 program,program_sha256:hash(program),css,css_sha256:hash(css),css_bytes:Buffer.byteLength(css),elapsed_ms:elapsed,warnings,
 loaded_urls:result.loadedUrls.map(url=>url.href),
 actual_compiler_emission_executed:true,compile_calls:1,custom_owned_m2_colors_and_font_preserved_in_historical_tokens:true,
 historical_root_and_nested_selector_emission_confirmed:true,missing_modern_token_translation_confirmed:true,
 both_required_stable_public_overrides_mixins_accept_explicit_literal_tokens:true,
 literal_public_override_program_is_not_an_owned_bridge_or_independent_full_mapping_oracle:true,
 no_map_mutation_of_consumer_inputs:'Probe creates new maps with map.merge; production inputs and files are untouched.',
 computed_style_browser_build_packed_floor_or_complete_sass_gate_qualified:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line,result:'pass',compile_calls:1,elapsed_ms:elapsed,css_bytes:Buffer.byteLength(css),public_override_apis:2,computed_style_or_build_qualified:false}));
