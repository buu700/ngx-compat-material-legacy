#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Compiler visibility and owned/public-peer boundary only; no full Sass gate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,lstatSync,readdirSync,realpathSync,writeFileSync} from 'node:fs';
import {dirname,isAbsolute,join,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const oraclePath='compatibility/rc/oracles/material-16.2.14-sass-api.json';
const oracleSha='76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d';
const inspectionNames=['get-theme-version','get-theme-type','get-theme-color','get-theme-typography','get-theme-density','theme-has'];
const boundaryPaths=[
 'styles/bridges/_companion-overrides.scss','styles/bridges/_form-field-state-overrides.scss',
 'styles/datepicker/_datepicker-theme.scss','styles/progress-bar/_progress-bar-theme.scss'];
const silence=['import','if-function','global-builtin','color-functions','mixed-decls','slash-div'];
function sources(root){
 const out=[];
 const visit=path=>{const full=join(root,path),stat=lstatSync(full);assert.equal(stat.isSymbolicLink(),false,'symlink in owned Sass population '+path);
  if(stat.isDirectory()){for(const name of readdirSync(full).sort())if(name!=='node_modules')visit(path+'/'+name);}
  else if(path.endsWith('.scss')){assert.equal(stat.isFile(),true);const raw=readFileSync(full);out.push({path,sha256:hash(raw),bytes:raw.length});}};
 visit('projects/ngx-material-legacy');return out;
}
function belongs(base,path){const part=relative(base,path);return part===''||(!isAbsolute(part)&&part!=='..'&&!part.startsWith('../'));}
function compileScope({root,sass,entry,entryFile,namespace,allowed,extra=''}){
 const names=[],mixins=[],messages=[];
 const program=`@use 'sass:meta'; @use '${entry}' as ${namespace};
@each $name,$value in meta.module-functions(${namespace}) {@debug 'function/#{$name}';}
@each $name,$value in meta.module-mixins(${namespace}) {@debug 'mixin/#{$name}';}
${extra}`;
 const compiled=sass.compileString(program,{loadPaths:[join(root,'node_modules')],silenceDeprecations:silence,
  importers:entryFile?[{findFileUrl(url){return url==='owned-material16-inspection-scope'?pathToFileURL(entryFile):null;}}]:[],
  logger:{warn(){},debug(message){if(message.startsWith('function/'))names.push(message.slice(9));
   else if(message.startsWith('mixin/'))mixins.push(message.slice(6));else messages.push(message);}}});
 const loaded=compiled.loadedUrls.map(url=>{assert.equal(url.protocol,'file:');const path=realpathSync(fileURLToPath(url));
  const group=allowed.findIndex(base=>belongs(base,path));assert.ok(group>=0,'unrelated Sass load '+path);
  const raw=readFileSync(path);return {root:group,path:relative(allowed[group],path).replaceAll('\\','/'),sha256:hash(raw),bytes:raw.length};
 }).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path));
 return {program,program_sha256:hash(program),functions:names.sort(),mixins:mixins.sort(),messages,
  css_bytes:Buffer.byteLength(compiled.css),css_sha256:hash(compiled.css),loaded_sources:loaded};
}
export function inspectOwnedMaterialBoundary(path,raw){
  const text=raw.toString().replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  assert.equal(/(?:\bprivate-)?(?:get-theme-(?:version|type|color|typography|density)|theme-has)\s*\(/.test(text),false,'owned source contains a post16 inspection API '+path);
  const imports=[...text.matchAll(/@(use|forward)\s+(['"])(@angular\/material[^'"]*)\2([^;]*);/g)];
  if(!imports.length)return null;
  assert.equal(imports.length,1);const match=imports[0];
  assert.equal(match[1],'use');assert.equal(match[3],'@angular/material');assert.equal(match[4].trim(),'as mat');
  const calls=[...text.matchAll(/\bmat\.([\w-]+)\s*\(/g)].map(match=>match[1]);
  const includes=[...text.matchAll(/@include\s+mat\.([\w-]+)\s*\(/g)].map(match=>match[1]);
  assert.deepEqual(calls,includes,'owned source calls a peer function rather than a public override mixin');
  assert.ok(calls.length);assert.ok(calls.every(name=>name.endsWith('-overrides')&&!name.startsWith('m2-')));
  assert.equal(/\$module\s*:/.test(text),false,'dynamic peer namespace lookup needs separate review');
  return {path,sha256:hash(raw),bytes:Buffer.byteLength(raw),peer_url:match[3],public_mixin_calls:includes,
   local_function_lookups:[...text.matchAll(/meta\.get-function\(\s*(['"])([^'"]+)\1\s*\)/g)].map(match=>match[2])};
}

export function measureSassInspectionScope({root=rootDefault,entryOverride}={}){
 root=realpathSync(root);const read=path=>readFileSync(join(root,path));
 const manifest=JSON.parse(read('projects/ngx-material-legacy/package.json'));
 const line=manifest.version.startsWith('21.')?'21.x':'main';
 const materialRoot=realpathSync(join(root,'node_modules/@angular/material'));
 const cdkRoot=realpathSync(join(root,'node_modules/@angular/cdk'));
 const peerManifest=readFileSync(join(materialRoot,'package.json')),peer=JSON.parse(peerManifest);
 assert.equal(peer.version,line==='21.x'?'21.2.14':'22.1.7');
 const oracleBytes=read(oraclePath);assert.equal(hash(oracleBytes),oracleSha);
 const oracle=JSON.parse(oracleBytes);assert.equal(oracle.provenance.version,'16.2.14');
 assert.equal(hash(read(oracle.provenance.lock_path)),oracle.provenance.lock_sha256);
 const owned=sources(root),boundaries=[];
 for(const member of owned){
  const boundary=inspectOwnedMaterialBoundary(member.path,read(member.path));
  if(boundary)boundaries.push(boundary);
 }
 assert.deepEqual(boundaries.map(row=>row.path.replace('projects/ngx-material-legacy/','')).sort(),boundaryPaths.sort());
 const peerMixins=[...new Set(boundaries.flatMap(row=>row.public_mixin_calls))].sort();
 const sass=createRequire(join(root,'package.json'))('sass');
 const allowed=[realpathSync(join(root,'projects/ngx-material-legacy')),materialRoot,cdkRoot];
 const entryFile=entryOverride?fileURLToPath(entryOverride):join(allowed[0],'_index.scss');
 if(entryOverride)allowed.push(dirname(fileURLToPath(entryOverride)));
 const candidate=compileScope({root,sass,entry:'owned-material16-inspection-scope',entryFile,namespace:'legacy',allowed});
 assert.deepEqual(candidate.functions,Object.keys(oracle.members.functions).sort(),'historical exported function names changed');
 assert.equal(candidate.functions.length,25);
 const extra=[...inspectionNames.map(name=>`@debug 'inspection/${name}/#{meta.function-exists('${name}',peer)}';`),
  ...peerMixins.map(name=>`@debug 'override/${name}/#{meta.mixin-exists('${name}',peer)}';`)].join('\n');
 const current=compileScope({root,sass,entry:'@angular/material',namespace:'peer',allowed:[materialRoot,cdkRoot],extra});
 for(const name of inspectionNames){assert.equal(candidate.functions.includes(name),false);assert.ok(current.messages.includes(`inspection/${name}/true`));}
 for(const name of peerMixins)assert.ok(current.messages.includes(`override/${name}/true`));
 assert.ok(current.loaded_sources.some(row=>row.root===0&&row.path==='core/theming/_inspection.scss'));
 assert.ok(candidate.loaded_sources.some(row=>row.root===1&&row.path==='core/theming/_inspection.scss'));
 return {schema_version:1,line,result:'pass',role:'Compiler-visible function ownership and direct public override boundaries; not full Sass/API/CSS/native/floor qualification',
  sass:sass.info,peer:{version:peer.version,package_json_sha256:hash(peerManifest)},
  oracle:{path:oraclePath,sha256:oracleSha,material_version:'16.2.14',function_count:25},
  entry_override_used:Boolean(entryOverride),candidate_entry:entryOverride?'test-only-override':'projects/ngx-material-legacy/_index.scss',owned_scss_population:owned,owned_population_sha256:hash(JSON.stringify(owned)),boundaries,public_override_mixins:peerMixins,
  candidate,current,inspection_names:inspectionNames,
  peer_inspection_loaded_via_public_index:true,direct_owned_inspection_calls:0,
  actual_current_product_or_floor_or_G11_qualified:false,full_sass_gate_executed:false,
  producer:{path:'scripts/measure-sass-inspection-scope.mjs',sha256:hash(read('scripts/measure-sass-inspection-scope.mjs'))}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'one fresh output path is required');
 const measured=measureSassInspectionScope();writeFileSync(process.argv[2],JSON.stringify(measured,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:measured.line,result:measured.result,owned_scss_members:measured.owned_scss_population.length,
  historical_functions:measured.candidate.functions.length,public_override_mixins:measured.public_override_mixins.length,
  direct_owned_inspection_calls:measured.direct_owned_inspection_calls,peer_inspection_loaded:measured.peer_inspection_loaded_via_public_index}));
}
