#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Complete original snapshots, independent tagged16 recipes and finite existing state bridge. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync,statSync,realpathSync} from 'node:fs';
import {dirname,join,resolve,relative,isAbsolute,posix} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {standardThemeSource,invocationPlan,enumerateModule,declarationAt,SILENCE} from './sass-api-inventory.mjs';
import {measureFormFieldStatePeer,formFieldStateExpectedCss} from './sass-form-field-state-contract.mjs';
const sourceRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..'),PREFIX='compatibility/rc/21x-c04-form-field-tokenization-';
const ARCHIVE=PREFIX+'originals.json.gz',ARCHIVE_HASH='e33b0311916a938d9752abad9211326bcf0e608426996d7e5ba927e04ca1ea0c';
const HASH=raw=>createHash('sha256').update(raw).digest('hex'),ref=(path,raw)=>({path,sha256:HASH(raw),bytes:raw.length});
export const FIELD_SHAS=Object.freeze(['98f610d192015599d8e0ce1a0f2a455c31ced558','c0b3aa524115e9b2b2b5fabd2e7cec44111b8e0e']);
const ownedPath=path=>'projects/ngx-material-legacy/styles/'+path.slice('src/material/'.length);
export function inspectFormFieldTokenization({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const raw=readFileSync(join(sourceRoot,ARCHIVE));assert.equal(HASH(raw),ARCHIVE_HASH);const original=JSON.parse(gunzipSync(raw));
 assert.deepEqual(original.reviews.map(row=>row.sha),FIELD_SHAS);assert.equal(original.original_hunks,32);
 const tagged=new Map(original.tagged_reference.members.map(row=>[row.path,row])),bound=new Map();
 const member=path=>{const raw=read(path);bound.set(path,ref(path,raw));return raw;};
 const modern=[];
 for(const path of new Set(original.reviews.flatMap(row=>row.sections.map(section=>section.path)))){
  const owned=ownedPath(path);if(!existsSync(join(root,owned)))continue;
  let source=member(owned).toString();
  if(path==='src/material/form-field/_form-field-theme.scss')for(const insertion of [
   "@use '../bridges/form-field-state-overrides';\n", "@use '../vendor/mdc/textfield' as mdc-textfield;\n",
   '\n      @include form-field-state-overrides.color(mdc-textfield.$ink-color);\n',
  ]){assert.equal(source.split(insertion).length,2);source=source.replace(insertion,'');}
  const expected=tagged.get(path).body.replaceAll("'@material/","'../vendor/mdc/");
  assert.equal(source,expected,'source differs beyond exact owned relocation/bridge: '+path);modern.push({path,owned,exact_tag_after_finite_transport:true});
 }
 for(const name of ['theme','fill-theme','legacy-theme','outline-theme','standard-theme']){
  const path=`src/material/legacy-form-field/_form-field-${name}.scss`;
  assert.equal(member(ownedPath(path)).toString(),tagged.get(path).body,'legacy theme differs from tagged16');
 }
 for(const path of ['projects/ngx-material-legacy/_index.scss','projects/ngx-material-legacy/package.json',
  'projects/ngx-material-legacy/styles/bridges/_form-field-state-overrides.scss',
  'compatibility/rc/oracles/material-16.2.14-sass-api.json','fixtures/sass/mixin-argument-contracts.json','fixtures/sass/form-field-state-contracts.json'])member(path);
 // Preserve the earlier independently source-qualified three-token bridge verbatim.
 assert.equal(HASH(member('projects/ngx-material-legacy/styles/bridges/_form-field-state-overrides.scss')),'c953a6c0df04dd73b443548f4872f62fa0704881590ccb508bd7db7741f391fc');
 const manifest=JSON.parse(read('projects/ngx-material-legacy/package.json')),line=manifest.version.startsWith('21.')?'21.x':'main';
 const peer=JSON.parse(member('node_modules/@angular/material/package.json'));assert.equal(peer.version,line==='21.x'?'21.2.14':'22.1.7');assert.equal(manifest.peerDependencies['@angular/material'],'^'+peer.version);
 for(const name of ['form-field','form-field-fill','form-field-outline','form-field-standard','form-field-legacy','form-field-input'])member(`projects/ngx-material-legacy/legacy-form-field/${name}.scss`);
 for(const suffix of ['ts','html'])member('projects/ngx-material-legacy/legacy-form-field/form-field.'+suffix);
 const assertCurrent=()=>{assert.equal(HASH(readFileSync(join(sourceRoot,ARCHIVE))),ARCHIVE_HASH);for(const value of bound.values()){const raw=read(value.path);assert.equal(HASH(raw),value.sha256,'late form-field source '+value.path);assert.equal(raw.length,value.bytes);}};
 assertCurrent();return {original,tagged,modern,line,peer_version:peer.version,bound:[...bound.values()],assertCurrent};
}
function candidateFile(base){
 for(const path of [base,base+'.scss',join(dirname(base),'_'+base.split('/').at(-1).replace(/\.scss$/,'')+'.scss'),join(base,'_index.scss'),join(base,'index.scss')]){
  if(existsSync(path)&&statSync(path).isFile())return path;
 }
 throw Error('missing real owned dependency '+base);
}
/** No snapshot file is written. Explicitly absent files cannot resolve as empty Sass modules. */
export function snapshotImporter({root,scope,row=null,side='after'}={}){
 const overlay=new Map((row?.sections??[]).map(section=>[section.path,section[side]]));
 const schema='field-review:',tagSchema='field-tag:';
 function target(path){
  const candidates=[path,path+'.scss',posix.join(posix.dirname(path),'_'+posix.basename(path).replace(/\.scss$/,'')+'.scss'),posix.join(path,'_index.scss'),posix.join(path,'index.scss')];
  for(const path of candidates)if(overlay.has(path))return schema+path;
  for(const path of candidates)if(scope.tagged.has(path))return tagSchema+path;
  return pathToFileURL(candidateFile(join(root,ownedPath(path)))).href;
 }
 function rewrite(body,path){return body.replace(/(@(?:use|forward)\s+)(['"])([^'"]+)\2/g,(_,head,quote,url)=>{
  let result=url;
  if(url.startsWith('sass:'))return head+quote+url+quote;
  if(url.startsWith('@material/'))result=pathToFileURL(candidateFile(join(root,'projects/ngx-material-legacy/styles/vendor/mdc',url.slice('@material/'.length)))).href;
  else if(url==='@angular/cdk')result=pathToFileURL(candidateFile(join(root,'node_modules/@angular/cdk'))).href;
  else if(url.startsWith('.'))result=target(posix.normalize(posix.join(posix.dirname(path),url)));
  else throw Error('unhandled original source import '+url);
  return head+quote+result+quote;
 });}
 return {entry:path=>target(path),importer:{canonicalize(url){return url.startsWith(schema)||url.startsWith(tagSchema)?new URL(url):null;},load(url){
  const path=url.pathname,source=url.protocol===schema?overlay.get(path):scope.tagged.get(path);assert.ok(source,path);assert.notEqual(source.absent,true,'attempted to load an explicitly absent original source: '+path);
  return {contents:rewrite(source.body,path),syntax:'scss'};
 }}};
}
export function compileSnapshot({root=process.cwd(),scope,row,side='after',path='src/material/form-field/_form-field-theme.scss',mixin='typography',setup=standardThemeSource(),argument='$__theme',selector='.sass-api-probe'}={}){
 const sass=createRequire(join(root,'package.json'))('sass'),view=snapshotImporter({root,scope,row,side});
 const program=`@use '__entry__' as m;\n@use '${view.entry(path)}' as field;\n${setup}\n${selector} { @include field.${mixin}(${argument}); }\n`;
 const result=sass.compileString(program,{importers:[{findFileUrl(url){return url==='__entry__'?pathToFileURL(join(root,'projects/ngx-material-legacy/_index.scss')):null;}},view.importer],
  loadPaths:[join(root,'node_modules')],style:'expanded',silenceDeprecations:SILENCE,logger:{warn(){},debug(){}}});
 return {css:result.css,css_sha256:HASH(result.css),css_bytes:Buffer.byteLength(result.css),program_sha256:HASH(program),loaded:result.loadedUrls.map(url=>url.href)};
}
export function measureFormFieldTokenization({root=process.cwd()}={}){
 root=realpathSync(root);const scope=inspectFormFieldTokenization({root}),read=path=>readFileSync(join(root,path)),sass=createRequire(join(root,'package.json'))('sass');
 assert.equal(JSON.parse(read('node_modules/sass/package.json')).version,'1.104.1');
 const oracle=JSON.parse(read('compatibility/rc/oracles/material-16.2.14-sass-api.json')),args=JSON.parse(read('fixtures/sass/mixin-argument-contracts.json')),catalog=JSON.parse(read('fixtures/sass/form-field-state-contracts.json'));
 const loaded=new Map(),virtual=new Map(),allowed=[{root:realpathSync(join(root,'projects/ngx-material-legacy')),prefix:'projects/ngx-material-legacy/'},
  ...['material','cdk'].map(name=>({root:realpathSync(join(root,'node_modules/@angular',name)),prefix:'node_modules/@angular/'+name+'/'}))];
 function bind(urls){for(const href of urls){const url=new URL(href);if(url.protocol!=='file:'){assert.ok(['field-review:','field-tag:'].includes(url.protocol));virtual.set(href,{url:href,role:'Original or tagged inline source; not a physical candidate file'});continue;}
  const absolute=realpathSync(fileURLToPath(url)),group=allowed.find(g=>{const rel=relative(g.root,absolute);return !isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../');});assert.ok(group,'foreign compiler dependency '+absolute);const path=group.prefix+relative(group.root,absolute);loaded.set(path,ref(path,readFileSync(absolute)));}}
 const importers=[{findFileUrl(url){return url==='__entry__'?pathToFileURL(join(root,'projects/ngx-material-legacy/_index.scss')):null;}}];
 function compile(program){const result=sass.compileString(program,{importers,loadPaths:[join(root,'node_modules')],style:'expanded',silenceDeprecations:SILENCE,logger:{warn(){},debug(){}}});bind(result.loadedUrls.map(url=>url.href));return {css:result.css,css_sha256:HASH(result.css),css_bytes:Buffer.byteLength(result.css),program_sha256:HASH(program)};}
 const names=enumerateModule(sass,'__entry__',[join(root,'node_modules')],importers);for(const name of ['form-field-color','form-field-theme','form-field-typography','form-field-density','legacy-form-field-color','legacy-form-field-theme','legacy-form-field-typography'])assert.ok(names.mixins.includes(name));
 const defaults=[];
 for(const name of ['legacy-form-field-color','legacy-form-field-theme','legacy-form-field-typography','form-field-typography','form-field-density']){
  const entry=oracle.members.mixins[name],plan=invocationPlan(name,entry,{});assert.equal(plan.invocable,true);
  const actual=compile(`@use '__entry__' as m;\n${standardThemeSource()}\n${plan.call}\n`);
  assert.equal(actual.css_sha256,entry.invocation.css_sha256,name);assert.equal(actual.css_bytes,entry.invocation.css_bytes);
  defaults.push({case_id:'mixin-css/'+name,...actual,result:'pass'});
 }
 const states=[];
 for(const [id,entry]of Object.entries(catalog.cases)){
  const peer=measureFormFieldStatePeer({sass,materialRoot:join(root,'node_modules/@angular/material'),cdkRoot:join(root,'node_modules/@angular/cdk'),line:scope.line,caseId:id});
  const expected=formFieldStateExpectedCss(id,entry.original,peer);assert.notEqual(expected,null,'independent state recipe');
  const setup=entry.kind==='default'?oracle.standard_theme:args.setup;
  const actual=compile(`@use '__entry__' as m;\n${setup}\n${entry.call}\n`);assert.equal(actual.css,expected,'whole historical CSS plus finite state bridge differs '+id);assert.equal(actual.program_sha256,entry.original.program_sha256);
  for(const value of peer.sources){const prefix=value.root===0?'node_modules/@angular/material/':'node_modules/@angular/cdk/';loaded.set(prefix+value.path,{path:prefix+value.path,sha256:value.sha256,bytes:value.bytes});}
  states.push({case_id:id,...actual,peer,whole_CSS_matches_independent_recipe:true,result:'pass'});
 }
 const snapshots=[];
 for(const row of scope.original.reviews)for(const side of ['before','after']){
  const mixin=row.sha===FIELD_SHAS[0]?'color':'typography',actual=compileSnapshot({root,scope,row,side,mixin});bind(actual.loaded);
  const {loaded:urls,...measurement}=actual;
  snapshots.push({sha:row.sha,side,mixin,...measurement,role:'Controlled original snapshot on tagged/owned16dependencies; not an original upstream build'});
 }
 const afterType=snapshots.find(row=>row.sha===FIELD_SHAS[1]&&row.side==='after');assert.equal(afterType.css_sha256,oracle.members.mixins['form-field-typography'].invocation.css_sha256,'post-refactor typography differs from actual16recipe');
 const tagType=compileSnapshot({root,scope,mixin:'typography'});bind(tagType.loaded);assert.equal(tagType.css,afterType.css);
 const referenceFunctions=[];
 for(const path of ['src/material/core/tokens/m2/mat/_form-field.scss','src/material/core/tokens/m2/mdc/_filled-text-field.scss','src/material/core/tokens/m2/mdc/_outlined-text-field.scss','src/material/form-field/_form-field-theme.scss']){
  const kind=path.endsWith('/_form-field-theme.scss')?'mixin':'function',name=kind==='mixin'?'typography':'get-typography-tokens';
  const after=scope.original.reviews[1].sections.find(section=>section.path===path).after.body,tag=scope.tagged.get(path).body;
  const a=declarationAt(after,kind,name,1),b=declarationAt(tag,kind,name,1);assert.ok(a&&b);assert.deepEqual(a,b,'untouched16retained a different typography recipe: '+path);
  referenceFunctions.push({path,kind,name,body_sha256:HASH(a.body),matches_original_typography_after:true});
 }
 for(const value of loaded.values()){const raw=read(value.path);assert.equal(HASH(raw),value.sha256);assert.equal(raw.length,value.bytes);}
 scope.assertCurrent();return {schema_version:1,line:scope.line,result:'pass',peer_version:scope.peer_version,compiler:sass.info,
  role:'Complete originals plus finite actual Sass contract observations; no product/native/packed/full-floor/audit qualification',originals:{path:ARCHIVE,sha256:ARCHIVE_HASH},owned_tagged_source_comparisons:scope.modern,
  exact_historical_default_CSS_cases:defaults,existing_finite_state_contract_cases:states,controlled_original_module_observations:snapshots,
  original_typography_after_matches_untouched16_default:true,exact_original_typography_recipe_bodies_present_in16:referenceFunctions,
  compiler_virtual_entries:[...virtual.values()],compiler_loaded_sources:[...loaded.values()].sort((a,b)=>a.path.localeCompare(b.path)),source_input_members:scope.bound,
  producer:ref('scripts/measure-form-field-tokenization-contracts.mjs',readFileSync(fileURLToPath(import.meta.url))),
  actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.ok([3,4].includes(process.argv.length));const result=measureFormFieldTokenization({root:process.argv[3]??process.cwd()});writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:result.line,result:result.result,historical_default_cases:result.exact_historical_default_CSS_cases.length,state_contract_cases:result.existing_finite_state_contract_cases.length,original_snapshots:result.controlled_original_module_observations.length,exact_typography_recipes:result.exact_original_typography_recipe_bodies_present_in16.length}));
}
