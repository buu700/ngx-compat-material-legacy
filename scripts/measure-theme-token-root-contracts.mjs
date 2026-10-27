#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Individually observed original selector relocation using the owned16 Sass dependencies. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,relative,resolve,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {measureTokenPlacementContracts,inspectTokenPlacementSources} from './measure-unthemable-token-contracts.mjs';
import {standardThemeSource,SILENCE} from './sass-api-inventory.mjs';
const sourceRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..'),PREFIX='compatibility/rc/21x-c04-theme-token-root-';
const ARCHIVE=PREFIX+'originals.json.gz',ARCHIVE_HASH='e7343a775e1673e6cf7210cb4a58faafaa1da67f026bf013d1918b4d040340bd';
const CONTEXT=PREFIX+'helper-context.json',CONTEXT_HASH='45b5d569b49c782e60dbfa1923b9df70cf9a16306697d42200186b91f2a5babc';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),ref=(path,raw)=>({path,sha256:hash(raw),bytes:raw.length});
export const rootSubjects=Object.freeze([{sha:'408c0b492f5d7edd6571b2287bb06aa89d582758',family:'card',mixins:['base','color','typography','density']},
 {sha:'6cc6cf21f292d78c930cbda79c1f337bd6b82bfe',family:'tooltip',mixins:['color','typography','density']}]);
export function inspectThemeRootSources({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const bound=new Map(),member=path=>{const raw=read(path);bound.set(path,ref(path,raw));return raw;};
 const archiveRaw=readFileSync(join(sourceRoot,ARCHIVE));assert.equal(hash(archiveRaw),ARCHIVE_HASH);
 const original=JSON.parse(gunzipSync(archiveRaw));assert.deepEqual(original.reviews.map(row=>row.sha),rootSubjects.map(row=>row.sha));
 const contextRaw=readFileSync(join(sourceRoot,CONTEXT));assert.equal(hash(contextRaw),CONTEXT_HASH);
 const context=JSON.parse(contextRaw);assert.equal(context.contexts.length,5);assert.equal(new Set(context.contexts.map(row=>row.blob)).size,1);
 const helperPath='projects/ngx-material-legacy/styles/core/style/_sass-utils.scss';
 assert.equal(member(helperPath).toString(),context.contexts[0].body,'owned helper differs from actual original contexts');
 const old=inspectTokenPlacementSources({root,read});for(const value of old.bound)bound.set(value.path,value);
 const tagged=new Map(original.tagged_reference.members.map(row=>[row.path,row]));
 for(const subject of rootSubjects){
  const family=subject.family;
  for(const type of ['modern','legacy']){
   const name=type==='modern'?family:'legacy-'+family,path=`projects/ngx-material-legacy/styles/${name}/_${family}-theme.scss`;
   const expected=tagged.get(`src/material/${name}/_${family}-theme.scss`).body;
   assert.equal(member(path).toString(),type==='modern'?expected.replaceAll("'@material/","'../vendor/mdc/"):expected);
  }
  for(const suffix of ['scss','ts','html'])member(`projects/ngx-material-legacy/legacy-${family}/${family}.${suffix}`);
 }
 const tooltip=member('projects/ngx-material-legacy/legacy-tooltip/tooltip.scss').toString();
 assert.ok(tooltip.includes('.mat-tooltip-panel.mat-tooltip-panel-non-interactive {\n  pointer-events: none;'));
 const assertCurrent=()=>{
  assert.equal(hash(readFileSync(join(sourceRoot,ARCHIVE))),ARCHIVE_HASH);assert.equal(hash(readFileSync(join(sourceRoot,CONTEXT))),CONTEXT_HASH);
  for(const value of bound.values()){const raw=read(value.path);assert.equal(hash(raw),value.sha256,'late source '+value.path);assert.equal(raw.length,value.bytes);}
  old.assertCurrent();
 };
 assertCurrent();return {original,context,line:old.line,peer_version:old.peer_version,tagged,bound:[...bound.values()],assertCurrent};
}
export function compileOriginalTheme({root=process.cwd(),family,body,mixin,selector=null}={}){
 assert.ok(rootSubjects.some(row=>row.family===family));assert.ok(['base','color','typography','density'].includes(mixin));
 const sass=createRequire(join(root,'package.json'))('sass');
 const theme=standardThemeSource().replaceAll('m.define-typography-config()','contract_typography.define-typography-config()')
  .replaceAll('m.define-','contract_model.define-').replaceAll('m.$','contract_palette.$');
 const prefix="@use '../core/theming/theming' as contract_model;\n@use '../core/theming/palette' as contract_palette;\n@use '../core/typography/typography' as contract_typography;\n";
 const call=`@include ${mixin}($__theme);`,program=prefix+body.replaceAll("'@material/","'../vendor/mdc/")+'\n'+theme+'\n'+(selector?`${selector} { ${call} }`:call)+'\n';
 const url=pathToFileURL(join(root,`projects/ngx-material-legacy/styles/${family}/_${family}-theme.scss`));
 const result=sass.compileString(program,{url,style:'expanded',silenceDeprecations:SILENCE,logger:{warn(){},debug(){}}});
 return {css:result.css,program_sha256:hash(program),css_sha256:hash(result.css),css_bytes:Buffer.byteLength(result.css),
  // This entry URL is virtual: the inline original body, not the physical candidate file, was compiled.
  virtual_entry:`styles/${family}/_${family}-theme.scss`,loaded:result.loadedUrls.filter(loaded=>loaded.href!==url.href).map(loaded=>loaded.href)};
}
export function assertTokenRootRelocation({before,after,family,selector=null}={}){
 const component='.mat-mdc-'+family,old=selector?selector+' '+component:component,newSelector=selector??'html';
 assert.equal(before.css.replaceAll(old,newSelector),after.css,'selector relocation changed token values or left the old component wrapper');
 if(before.css_bytes){assert.ok(before.css.includes(old+' {'));assert.ok(after.css.includes(newSelector+' {'));assert.notEqual(before.css_sha256,after.css_sha256);}
 return before.css_bytes>0;
}
export function measureThemeTokenRoots({root=process.cwd()}={}){
 root=realpathSync(root);const scope=inspectThemeRootSources({root}),read=path=>readFileSync(join(root,path));
 const legacy=measureTokenPlacementContracts({root}),observations=[],referenceCases=[],loaded=new Map();
 const allowed=[{root:realpathSync(join(root,'projects/ngx-material-legacy')),prefix:'projects/ngx-material-legacy/'},
  ...['material','cdk'].map(name=>({root:realpathSync(join(root,'node_modules/@angular',name)),prefix:'node_modules/@angular/'+name+'/'}))];
 function bind(compiled){for(const url of compiled.loaded){const absolute=realpathSync(fileURLToPath(url));
  const group=allowed.find(g=>{const rel=relative(g.root,absolute);return !isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../');});assert.ok(group);
  const path=group.prefix+relative(group.root,absolute);loaded.set(path,ref(path,readFileSync(absolute)));}}
 for(const subject of rootSubjects){
  const row=scope.original.reviews.find(row=>row.sha===subject.sha);assert.equal(row.sections.length,1);const section=row.sections[0];
  for(const selector of [null,'.theme-root-scope','.theme-parent .theme-child'])for(const mixin of subject.mixins){
   const before=compileOriginalTheme({root,family:subject.family,body:section.before.body,mixin,selector});
   const after=compileOriginalTheme({root,family:subject.family,body:section.after.body,mixin,selector});
   const observable=assertTokenRootRelocation({before,after,family:subject.family,selector});bind(before);bind(after);
   observations.push({sha:subject.sha,family:subject.family,mixin,selector:selector??'root',observable_token_emission:observable,
    before:{program_sha256:before.program_sha256,css_sha256:before.css_sha256,css_bytes:before.css_bytes},
    after:{program_sha256:after.program_sha256,css_sha256:after.css_sha256,css_bytes:after.css_bytes},token_values_preserved:true,result:'pass'});
   if(mixin!=='base'){
    const tagged=compileOriginalTheme({root,family:subject.family,body:scope.tagged.get(section.path).body,mixin,selector});bind(tagged);
    assert.equal(tagged.css,before.css,'original pre-patch call differs from actual16context');
    referenceCases.push({case_id:subject.family+'/'+mixin+'/'+(selector??'root'),css_sha256:tagged.css_sha256,css_bytes:tagged.css_bytes,result:'pass'});
   }
  }
 }
 for(const value of loaded.values()){const raw=read(value.path);assert.equal(hash(raw),value.sha256);assert.equal(raw.length,value.bytes);}
 scope.assertCurrent();return {schema_version:1,line:scope.line,result:'pass',peer_version:scope.peer_version,
  role:'Original module selector observations on owned16dependencies; not an original upstream build or product/browser/artifact qualification',
  original:{path:ARCHIVE,sha256:ARCHIVE_HASH},helper_context:{path:CONTEXT,sha256:CONTEXT_HASH},
  source_input_members:scope.bound,shared_historical_legacy_measurement:legacy,original_module_selector_observations:observations,
  pre_patch_modern_calls_equal_untouched16_source:referenceCases,loaded_original_module_dependencies:[...loaded.values()].sort((a,b)=>a.path.localeCompare(b.path)),
  retained_tooltip_noninteractive_specificity:true,producer:ref('scripts/measure-theme-token-root-contracts.mjs',readFileSync(fileURLToPath(import.meta.url))),
  actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.ok([3,4].includes(process.argv.length));const result=measureThemeTokenRoots({root:process.argv[3]??process.cwd()});
 writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:result.line,result:result.result,original_selector_cases:result.original_module_selector_observations.length,
  observable_selector_cases:result.original_module_selector_observations.filter(row=>row.observable_token_emission).length,
  untouched16_modern_reference_cases:result.pre_patch_modern_calls_equal_untouched16_source.length,legacy_default_CSS_cases:result.shared_historical_legacy_measurement.public_legacy_default_CSS_cases.length}));
}
