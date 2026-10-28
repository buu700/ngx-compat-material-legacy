#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite source review; original helpers are observations, never candidate implementations. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {dirname,join,resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {standardThemeSource,invocationPlan,enumerateModule,SILENCE as INVENTORY_SILENCE} from './sass-api-inventory.mjs';
import {snapshotImporter} from './measure-form-field-tokenization-contracts.mjs';
import {themePrelude,parseStyleRules} from './check-m3-inclusion-order.mjs';

const SOURCE=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PREFIX='compatibility/rc/21x-c04-m3-theme-boundary-';
const ARCHIVE=PREFIX+'originals.json.gz',ARCHIVE_HASH='9fd83918610ec1133fe0f31d74a6b01c96155dff3c4913167c045b716d242805';
const HASH=raw=>createHash('sha256').update(raw).digest('hex');
const SILENCE=INVENTORY_SILENCE.filter(name=>name!=='mixed-decls');
const ref=(path,raw)=>({path,sha256:HASH(raw),bytes:raw.length});
export const M3_BOUNDARY_SHAS=Object.freeze(['3f544ef015fbb8c56e991d4e0a9a539d9e153577','027b171c91fc880aef3b3a66cb7c5d0f5c419501','305af4f0e0e0f68e929b6aeb328296ac42295c16','0df4d082e0aab1958fdbe5aa48fef0203079abc2','32981cc4500a8c0065574bfb1357d2d8a78494de']);
const own=path=>'projects/ngx-material-legacy/styles/'+path.slice('src/material/'.length);
const PRIVATE_TOKENS=['private-apply-card-theme-from-tokens','private-apply-checkbox-theme-from-tokens'];
export function inspectM3ThemeBoundary({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const raw=readFileSync(join(SOURCE,ARCHIVE));assert.equal(HASH(raw),ARCHIVE_HASH);
 const original=JSON.parse(gunzipSync(raw)),tagged=new Map(original.tagged_reference.members.map(row=>[row.path,row]));
 assert.deepEqual(original.reviews.map(row=>row.sha),M3_BOUNDARY_SHAS);assert.equal(original.original_hunks,42);
 const bound=new Map(),member=path=>{const raw=read(path);bound.set(path,ref(path,raw));return raw;};
 for(const path of ['src/material/card/_card-theme.scss','src/material/checkbox/_checkbox-theme.scss','src/material/_token-theming.scss']){
  assert.equal(member(own(path)).toString(),tagged.get(path).body.replaceAll("'@material/","'../vendor/mdc/"));
 }
 for(const family of ['card','checkbox']){
  const path=`src/material/legacy-${family}/_${family}-theme.scss`;assert.equal(member(own(path)).toString(),tagged.get(path).body);
  for(const suffix of ['scss','html']){
   const tag=`src/material/legacy-${family}/${family}.${suffix}`,local=`projects/ngx-material-legacy/legacy-${family}/${family}.${suffix}`;
   let expected=tagged.get(tag).body.replace("@use '@angular/cdk';","@use '../styles/core/style/component-high-contrast' as cdk;").replaceAll("@use '../core/","@use '../styles/core/");
   if(family==='card')expected=expected.replace('cdk.high-contrast(active, off)','cdk.high-contrast(active)');
   if(family==='checkbox')expected=expected.replace('  @include cdk.high-contrast(black-on-white, off) {','  // Preserve the historical palette-specific class; current CDK coerces it to active.\n  .cdk-high-contrast-black-on-white & {');
   if(family==='checkbox'&&suffix==='html')expected=expected.replace('           [attr.aria-describedby]="ariaDescribedby"\n','           [attr.aria-describedby]="ariaDescribedby"\n'+`           [attr.aria-checked]="indeterminate ? 'mixed' : null"\n`+'           [attr.aria-controls]="ariaControls"\n           [attr.aria-expanded]="ariaExpanded"\n           [attr.aria-owns]="ariaOwns"\n');
   assert.equal(member(local).toString(),expected,'unreviewed historical resource delta '+local);
  }
 }
 const modelPath='projects/ngx-material-legacy/styles/core/theming/_theming.scss';
 const model=member(modelPath).toString(),tagModel=tagged.get('src/material/core/theming/_theming.scss').body;
 // Retain the previously owned current-Sass color-function transport; all other bytes are tagged.
 const expected=tagModel.replace("@use '../density/private/compatibility';","@use '../density/private/compatibility';\n@use 'sass:color';").replaceAll('opacity($color)','color.opacity($color)');
 assert.equal(model,expected,'M2 model differs beyond exact color-function transport');
 const facade=member('projects/ngx-material-legacy/_index.scss').toString();
 assert.ok(facade.includes("@forward './styles/token-theming' as private-apply-*;"));
 assert.equal(/inspection|style\/validation|@forward\s+['"]@angular\/material/.test(facade),false);
 const manifest=JSON.parse(member('projects/ngx-material-legacy/package.json')),line=manifest.version.startsWith('21.')?'21.x':'main';
 const peer=JSON.parse(member('node_modules/@angular/material/package.json'));assert.equal(peer.version,line==='21.x'?'21.2.14':'22.1.7');assert.equal(manifest.peerDependencies['@angular/material'],'^'+peer.version);
 const oraclePath='compatibility/rc/oracles/material-16.2.14-sass-api.json',oracleRaw=member(oraclePath);
 assert.equal(HASH(oracleRaw),'76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d');
 const absent=['src/material/core/style/_validation.scss','src/material/core/theming/_inspection.scss'];
 for(const path of absent)assert.equal(existsSync(join(root,own(path))),false,'post16 model unexpectedly installed');
 const tools=['scripts/check-m3-inclusion-order.mjs','scripts/measure-form-field-tokenization-contracts.mjs','scripts/sass-api-inventory.mjs'].map(path=>ref(path,readFileSync(join(SOURCE,path))));
 member('projects/ngx-material-legacy/styles/core/style/_component-high-contrast.scss');member('compatibility/rc/component-high-contrast-source-proof.json');member('compatibility/rc/oracles/material-16.2.14-sass-argument-cases.json');
 const assertCurrent=()=>{assert.equal(HASH(readFileSync(join(SOURCE,ARCHIVE))),ARCHIVE_HASH);for(const value of tools)assert.equal(HASH(readFileSync(join(SOURCE,value.path))),value.sha256);for(const value of bound.values()){const raw=read(value.path);assert.equal(HASH(raw),value.sha256,'late source change '+value.path);assert.equal(raw.length,value.bytes);}};
 assertCurrent();return {original,tagged,model,tagModel,modelPath,oracle:JSON.parse(oracleRaw),line,peer_version:peer.version,bound:[...bound.values()],tools,absent,assertCurrent};
}

/** Compile a complete original/owned M2 model with real warning and density-flag side effects. */
export function compileWarningModel({root=process.cwd(),body,caseId}={}){
 const sass=createRequire(join(root,'package.json'))('sass'),warnings=[];
 const path='src/material/core/theming/_theming.scss';
 assert.equal(body.split("@use 'palette';").length,2);
 const row={sections:[{path,after:{body:body.replace("@use 'palette';","@use './palette';")}}]};
 const view=snapshotImporter({root,scope:{tagged:new Map()},row});
 const emit=`@include m.private-check-duplicate-theme-styles($__theme, 'same') { .probe { density-root: compatibility.$private-density-generate-at-root; density-styles: compatibility.$private-density-generate-styles; } }`;
 let call;
 if(caseId==='repeat')call=emit+'\n'+emit;
 else if(caseId==='separate-ids')call=emit+'\n'+emit.replace("'same'","'other'");
 else if(caseId==='nested')call=`@for $i from 1 through 2 { @include m.private-check-duplicate-theme-styles($__theme, 'outer') { ${emit} } }`;
 else if(caseId==='ignored')call='m.$theme-ignore-duplication-warnings: true;\n'+emit+'\n'+emit;
 else if(caseId==='legacy-color-config')call='$__theme: m.get-color-config($__theme);\n'+emit+'\n'+emit;
 else if(caseId==='changed-color')call=emit+`\n$__theme: m.define-dark-theme((color: (primary: m.define-palette(m.$indigo-palette), accent: m.define-palette(m.$pink-palette, A200, A100, A400), warn: m.define-palette(m.$red-palette)), typography: m.define-typography-config(), density: 0));\n`+emit;
 else if(caseId==='versioned-m3')call=`$__theme: (_mat-theming-internals-do-not-access: (theme-version: 1, theme-type: light, color-tokens: (c: red), typography-tokens: (t: 1), density-scale: 0, density-tokens: (d: 1), other-tokens: (o: 1)));\n`+emit+'\n'+emit;
 else throw Error('unknown warning case '+caseId);
 const transport=source=>source.replaceAll('m.define-typography-config()','boundary_type.define-typography-config()').replace(/m\.\$(indigo|pink|red)-palette/g,(_,name)=>'boundary_palette.$'+name+'-palette');
 const setup=transport(standardThemeSource());call=transport(call);
 const program=`@use 'sass:meta';\n@use '${view.entry(path)}' as m;\n@use 'legacy-model:typography' as boundary_type;\n@use 'legacy-model:palette' as boundary_palette;\n@use 'legacy-model:density' as compatibility;\n${setup}\n$__original: $__theme;\n$__original-inspect: meta.inspect($__original);\n${call}\n.after { warning-setting: m.$theme-ignore-duplication-warnings; original-preserved: $__original-inspect == meta.inspect($__original); density-root: compatibility.$private-density-generate-at-root; density-styles: compatibility.$private-density-generate-styles; }\n`;
 const imports={'legacy-model:typography':'core/typography/_typography.scss','legacy-model:palette':'core/theming/_palette.scss','legacy-model:density':'core/density/private/_compatibility.scss'};
 const importer={findFileUrl(url){return Object.hasOwn(imports,url)?pathToFileURL(join(root,'projects/ngx-material-legacy/styles',imports[url])):null;}};
 const result=sass.compileString(program,{importers:[importer,view.importer],loadPaths:[join(root,'node_modules')],style:'expanded',silenceDeprecations:SILENCE,logger:{warn(message,options){if(!options.deprecation)warnings.push(message);},debug(){}}});
 return {case_id:caseId,program_sha256:HASH(program),authored_program:program,css_sha256:HASH(result.css),css_bytes:Buffer.byteLength(result.css),css:result.css,warnings,loaded:result.loadedUrls.map(url=>url.href)};
}

/** Observe original added helpers without copying or publishing a versioned model. */
export function compileOriginalInspection({root=process.cwd(),scope,inspection,caseId}={}){
 const validation=scope.original.reviews[1].sections.find(s=>s.path==='src/material/core/style/_validation.scss').after;
 const path='src/material/core/theming/_inspection.scss',row={sections:[{path,after:{body:inspection}},{path:'src/material/core/style/_validation.scss',after:validation}]};
 const view=snapshotImporter({root,scope,row}),sass=createRequire(join(root,'package.json'))('sass');
 let call;
 if(caseId==='versions')call=`.probe { plain: i.get-theme-version((color: red)); invalid: i.get-theme-version('bad'); versioned: i.get-theme-version($theme); }`;
 else if(caseId==='all')call='.probe { value: meta.inspect(i.get-theme-tokens($theme)); }';
 else if(['color','other','base','invalid-system'].includes(caseId))call=`.probe { value: meta.inspect(i.get-theme-tokens($theme, ${caseId==='invalid-system'?'invalid':caseId})); }`;
 else if(caseId==='invalid-theme')call='.probe { value: meta.inspect(i.get-theme-tokens((color: red))); }';
 else if(caseId==='validation')call=`.probe { empty-map: v.validate-type((), map); wrong-type: v.validate-type(1px, map, null); allowed: meta.inspect(v.validate-allowed-values((color, invalid, invalid), color)); }`;
 else throw Error('unknown inspection case '+caseId);
 const program=`@use 'sass:meta';\n@use '${view.entry(path)}' as i;\n@use '${view.entry('src/material/core/style/_validation.scss')}' as v;\n$theme: (_mat-theming-internals-do-not-access: (theme-version: 1, color-tokens: (shared: (color: red)), typography-tokens: (shared: (type: 12px)), density-tokens: (shared: (density: 1)), other-tokens: (shared: (other: 2)), base-tokens: (shared: (base: 3))));\n${call}`;
 try {
  const result=sass.compileString(program,{importers:[view.importer],style:'expanded',silenceDeprecations:SILENCE,logger:{warn(){},debug(){}}});
  return {case_id:caseId,program_sha256:HASH(program),css_sha256:HASH(result.css),css_bytes:Buffer.byteLength(result.css),css:result.css,error:null,loaded:result.loadedUrls.map(url=>url.href)};
 }catch(error){return {case_id:caseId,program_sha256:HASH(program),css:null,error:String(error.sassMessage??error.message),loaded:[]};}
}

export function measureM3ThemeBoundary({root=process.cwd()}={}){
 root=realpathSync(root);const read=path=>readFileSync(join(root,path)),scope=inspectM3ThemeBoundary({root,read}),sass=createRequire(join(root,'package.json'))('sass');
 assert.equal(JSON.parse(read('node_modules/sass/package.json')).version,'1.104.1');
 const loaded=new Map(),virtual=new Set(),allowed=[{root:realpathSync(join(root,'projects/ngx-material-legacy')),prefix:'projects/ngx-material-legacy/'},...['material','cdk'].map(name=>({root:realpathSync(join(root,'node_modules/@angular',name)),prefix:'node_modules/@angular/'+name+'/'}))];
 function bind(urls){for(const href of urls){const url=new URL(href);if(url.protocol!=='file:'){assert.ok(['field-review:','field-tag:'].includes(url.protocol));virtual.add(href);continue;}const path=realpathSync(fileURLToPath(url)),group=allowed.find(g=>{const p=relative(g.root,path);return !isAbsolute(p)&&p!=='..'&&!p.startsWith('../');});assert.ok(group,'foreign Sass source '+path);const name=group.prefix+relative(group.root,path);loaded.set(name,ref(name,readFileSync(path)));}}
 const importers=[{findFileUrl(url){return ['__entry__','@ngx-compat/material-legacy'].includes(url)?pathToFileURL(join(root,'projects/ngx-material-legacy/_index.scss')):null;}}];
 const compile=program=>{const warnings=[];const r=sass.compileString(program,{importers,loadPaths:[join(root,'node_modules')],style:'expanded',silenceDeprecations:SILENCE,logger:{warn(message,options){if(!options.deprecation)warnings.push(message);},debug(){}}});bind(r.loadedUrls.map(url=>url.href));return {program_sha256:HASH(program),css:r.css,css_sha256:HASH(r.css),css_bytes:Buffer.byteLength(r.css),warnings};};
 const names=enumerateModule(sass,'__entry__',[join(root,'node_modules')],importers);
 for(const name of PRIVATE_TOKENS)assert.ok(names.mixins.includes(name),'historical token export removed');
 for(const name of ['private-validate-type','private-validate-allowed-values','get-theme-version','get-theme-tokens'])assert.equal(names.functions.includes(name),false);
 const defaults=[];
 for(const name of [...['legacy-card','legacy-checkbox','card','checkbox'].flatMap(prefix=>['color','typography','theme'].map(s=>prefix+'-'+s)),'card-density','checkbox-density',...PRIVATE_TOKENS]){
  const entry=scope.oracle.members.mixins[name],plan=invocationPlan(name,entry);assert.equal(plan.invocable,true,name);
  const r=compile(`@use '__entry__' as m;\n${standardThemeSource()}\n${plan.call}\n`);assert.equal(r.css_sha256,entry.invocation.css_sha256,name);assert.equal(r.css_bytes,entry.invocation.css_bytes,name);
  defaults.push({case_id:'mixin-css/'+name,...r,result:'pass'});
 }
 const warnings=[],source=scope.original.reviews[2].sections.find(s=>s.path==='src/material/core/theming/_theming.scss');
 const warningCases=['repeat','separate-ids','nested','ignored','legacy-color-config','changed-color'];
 for(const caseId of warningCases){
  const actual=compileWarningModel({root,body:scope.model,caseId}),tag=compileWarningModel({root,body:scope.tagModel,caseId});
  const before=compileWarningModel({root,body:source.before.body,caseId}),after=compileWarningModel({root,body:source.after.body,caseId});
  for(const value of [actual,tag,before,after])bind(value.loaded);
  assert.equal(actual.css,tag.css,caseId);assert.deepEqual(actual.warnings,tag.warnings,caseId);
  assert.match(actual.css,/original-preserved: true/);
  assert.equal(before.css,after.css,caseId);assert.deepEqual(before.warnings,after.warnings,caseId);
  const project=({loaded,...value})=>value;
  warnings.push({case_id:caseId,owned:project(actual),tagged16:project(tag),original_before:project(before),original_after:project(after),owned_exact_tagged_CSS_and_warnings:true,original_M2_before_after_CSS_and_warnings_equal:true});
 }
 const originalM3=['before','after'].map(side=>{const r=compileWarningModel({root,body:source[side].body,caseId:'versioned-m3'});bind(r.loaded);const{loaded:urls,...value}=r;return {side,...value};});
 assert.notDeepEqual(originalM3[0].warnings,originalM3[1].warnings,'versioned warning change has no observed effect');assert.equal(originalM3[1].warnings.length,4);
 const inspection=scope.original.reviews[3].sections[0],terminology=scope.original.reviews[4].sections.find(s=>s.path==='src/material/core/theming/_inspection.scss'),helpers=[];
 const uncomment=body=>body.split('\n').filter(line=>!line.trim().startsWith('//')).join('').replace(/\s+/g,'');
 assert.equal(uncomment(inspection.before.body),uncomment(inspection.after.body));
 for(const caseId of ['versions','all','color','other','base','invalid-system','invalid-theme','validation']){
  const values={};for(const [stage,body]of [['before-comments',inspection.before.body],['after-comments',inspection.after.body],['before-rename',terminology.before.body],['after-rename',terminology.after.body]]){const value=compileOriginalInspection({root,scope,inspection:body,caseId});bind(value.loaded);const{loaded:urls,...r}=value;values[stage]=r;}
  assert.deepEqual(values['before-comments'],values['after-comments'],'comment-only helper semantics changed');assert.deepEqual(values['after-comments'],values['before-rename']);
  if(['versions','color','invalid-theme','validation'].includes(caseId))assert.deepEqual(values['before-rename'],values['after-rename']);
  if(caseId==='invalid-system'){assert.match(values['before-rename'].error,/or other/);assert.match(values['after-rename'].error,/or base/);}
  if(caseId==='all'){assert.notEqual(values['before-rename'].css,values['after-rename'].css);assert.match(values['before-rename'].css,/other: 2/);assert.match(values['after-rename'].css,/base: 3/);}
  if(caseId==='base'){assert.ok(values['before-rename'].error);assert.equal(values['after-rename'].error,null);}
  if(caseId==='other'){assert.equal(values['before-rename'].error,null);assert.ok(values['after-rename'].error);}
  helpers.push({case_id:caseId,...values});
 }
 const current='@include mat.card-theme($m3); @include mat.checkbox-theme($m3);',legacy='@include legacy.legacy-card-theme($m2); @include legacy.legacy-checkbox-theme($m2);';
 const coexist=[];
 for(const [id,body]of [['current-only',current],['legacy-only',legacy],['current-then-legacy',current+'\n'+legacy],['legacy-then-current',legacy+'\n'+current]]){
  const r=compile(themePrelude()+`\n.boundary { ${body} }\n`);assert.ok(r.css_bytes>0);coexist.push({case_id:id,...r,rules:parseStyleRules(r.css)});
 }
 const C=coexist[0],L=coexist[1];assert.deepEqual(coexist[2].rules,[...C.rules,...L.rules]);assert.deepEqual(coexist[3].rules,[...L.rules,...C.rules]);
 assert.match(C.css,/--mat-card/);assert.match(C.css,/--mat-checkbox/);assert.match(L.css,/\.mat-card/);assert.match(L.css,/\.mat-checkbox/);
 for(const row of coexist)delete row.rules;
 for(const value of loaded.values()){const raw=read(value.path);assert.equal(HASH(raw),value.sha256);assert.equal(raw.length,value.bytes);}
 scope.assertCurrent();return {schema_version:1,line:scope.line,result:'pass',role:'Five individually reviewed upstream changes; finite source/Sass observations only',peer_version:scope.peer_version,advertised_Material_minimum_equals_installed:true,compiler:sass.info,original:{path:ARCHIVE,sha256:ARCHIVE_HASH},historical_default_CSS_cases:defaults,historical_private_token_exports_retained:PRIVATE_TOKENS,post16_inspection_exports_absent:true,historical_warning_and_density_cases:warnings,original_versioned_M3_warning_change:originalM3,original_inspection_cases:helpers,selected_card_checkbox_M2_M3_source_compile_cases:coexist,all_four_orders_preserve_exact_original_rule_sequences:true,input_members:scope.bound,measurement_tools_from_review_worktree:scope.tools,loaded_sources:[...loaded.values()].sort((a,b)=>a.path.localeCompare(b.path)),virtual_original_sources:[...virtual].sort(),producer:ref('scripts/measure-m3-theme-boundary-contracts.mjs',readFileSync(fileURLToPath(import.meta.url))),original_module_helpers_not_a_full_upstream_build:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.ok([3,4].includes(process.argv.length));const result=measureM3ThemeBoundary({root:process.argv[3]??process.cwd()});writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:result.line,result:result.result,defaults:result.historical_default_CSS_cases.length,warning_cases:result.historical_warning_and_density_cases.length,inspection_cases:result.original_inspection_cases.length,coexistence_source_cases:result.selected_card_checkbox_M2_M3_source_compile_cases.length}));
}
