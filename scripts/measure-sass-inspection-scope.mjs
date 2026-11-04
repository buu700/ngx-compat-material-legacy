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
import {currentSpinnerSnackBridgeSourceSubject} from '../compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-subject.mjs';

const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const oraclePath='compatibility/rc/oracles/material-16.2.14-sass-api.json';
const oracleSha='76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d';
const inspectionNames=['get-theme-version','get-theme-type','get-theme-color','get-theme-typography','get-theme-density','theme-has'];
const boundaryPaths=[
 'styles/bridges/_companion-overrides.scss','styles/bridges/_form-field-state-overrides.scss',
 'styles/datepicker/_datepicker-theme.scss','styles/progress-bar/_progress-bar-theme.scss',
 'styles/progress-spinner/_progress-spinner-theme.scss','styles/snack-bar/_snack-bar-theme.scss'];
const silence=['import','if-function','global-builtin','color-functions','mixed-decls','slash-div'];
function sources(root){
 const out=[];
 const visit=path=>{const full=join(root,path),stat=lstatSync(full);assert.equal(stat.isSymbolicLink(),false,'symlink in owned Sass population '+path);
  if(stat.isDirectory()){for(const name of readdirSync(full).sort())if(name!=='node_modules')visit(path+'/'+name);}
  else if(path.endsWith('.scss')){assert.equal(stat.isFile(),true);const raw=readFileSync(full);out.push({path,sha256:hash(raw),bytes:raw.length});}};
 visit('projects/ngx-material-legacy');return out;
}
function belongs(base,path){const part=relative(base,path);return part===''||(!isAbsolute(part)&&part!=='..'&&!part.startsWith('../'));}
function scopeProgram(entry,namespace,extra=''){return `@use 'sass:meta'; @use '${entry}' as ${namespace};
@each $name,$value in meta.module-functions(${namespace}) {@debug 'function/#{$name}';}
@each $name,$value in meta.module-mixins(${namespace}) {@debug 'mixin/#{$name}';}
${extra}`;}
function scopeExtra(peerMixins){return [...inspectionNames.map(name=>`@debug 'inspection/${name}/#{meta.function-exists('${name}',peer)}';`),...peerMixins.map(name=>`@debug 'override/${name}/#{meta.mixin-exists('${name}',peer)}';`)].join('\n');}
function compileScope({root,sass,entry,entryFile,namespace,allowed,extra=''}){
 const names=[],mixins=[],messages=[];
 const program=scopeProgram(entry,namespace,extra);
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
/** Snapshot JSON metadata through descriptors, never caller-supplied getters. */
export function captureSpinnerSnackC04Metadata(value,fields){
 if(fields!==undefined){
  assert.ok(value&&typeof value==='object');assert.ok(Array.isArray(fields));assert.equal(new Set(fields).size,fields.length);
  assert.equal(Object.getPrototypeOf(value),Object.prototype,'nonplain C04 arguments');
  const descriptors=Object.getOwnPropertyDescriptors(value),selected={};
  for(const key of fields){assert.equal(typeof key,'string');if(Object.hasOwn(descriptors,key)){const d=descriptors[key];assert.ok(Object.hasOwn(d,'value'),'C04 argument accessor');Object.defineProperty(selected,key,{value:d.value,enumerable:true});}}
  return captureSpinnerSnackC04Metadata(selected);
 }
 if(value===null||typeof value!=='object'){assert.ok(['undefined','string','number','boolean'].includes(typeof value)||value===null);return value;}
 assert.ok(Object.getPrototypeOf(value)===(Array.isArray(value)?Array.prototype:Object.prototype));
 const descriptors=Object.getOwnPropertyDescriptors(value),out=Array.isArray(value)?[]:{};
 for(const key of Reflect.ownKeys(descriptors)){
  assert.equal(typeof key,'string','C04 metadata symbol');const descriptor=descriptors[key];
  assert.ok(Object.hasOwn(descriptor,'value'),'C04 metadata accessor');
  if(Array.isArray(value)&&key==='length'){out.length=descriptor.value;continue;}
  Object.defineProperty(out,key,{value:captureSpinnerSnackC04Metadata(descriptor.value),enumerable:true,configurable:true,writable:true});
 }
 return out;
}

/** Overlay only the two qualified digest/size fields; retain root and role metadata. */
export function qualifySpinnerSnackSourceRef(bridge,incoming,prefix=''){
 const capture=()=>captureSpinnerSnackC04Metadata(incoming);
 const original=capture(),qualified=bridge.qualify({...original,path:prefix+original.path});
 assert.deepEqual(capture(),original,'source metadata changed during bridge qualification');
 return qualified?{...original,sha256:qualified.sha256,...(Object.hasOwn(original,'bytes')?{bytes:qualified.bytes}:{})}:original;
}
export function currentSpinnerSnackSourceSummary(bridge){return {role:'Separately guarded current two-module source; archived source comparisons remain historical',sources:structuredClone(bridge.transitions),guard_inputs:structuredClone(bridge.bound),current_source_reads_are_physical:true,historical_source_bytes_exposed:false,cached_independent_emission_receipt_validated:true,fresh_sass_compilation_by_source_guard:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};}
/** Complete retained scope comparison with only the enumerated current source/boundary changes. */
export function assertSpinnerSnackInspectionScopeSuccessor({root,historical,current,bridge}){
 const liveHistorical=historical,liveCurrent=current;historical=captureSpinnerSnackC04Metadata(historical);current=captureSpinnerSnackC04Metadata(current);
 const summary=captureSpinnerSnackC04Metadata(currentSpinnerSnackSourceSummary(bridge));
 bridge={qualify:bridge.qualify,assertCurrent:bridge.assertCurrent,transitions:summary.sources,bound:summary.guard_inputs};
 assert.equal(historical.owned_scss_population.length,409);assert.equal(historical.boundaries.length,4);assert.equal(historical.public_override_mixins.length,16);
 const expected=structuredClone(historical);
 expected.owned_scss_population=historical.owned_scss_population.map(r=>qualifySpinnerSnackSourceRef(bridge,r));expected.owned_population_sha256=hash(JSON.stringify(expected.owned_scss_population));
 const extra=bridge.transitions.map(r=>inspectOwnedMaterialBoundary(r.path,readFileSync(join(root,r.path))));assert.equal(extra.length,2);assert.ok(extra.every(Boolean));
 expected.boundaries=[...historical.boundaries,...extra].sort((a,b)=>a.path.localeCompare(b.path));
 expected.public_override_mixins=[...new Set([...historical.public_override_mixins,'progress-spinner-overrides','snack-bar-overrides'])].sort();assert.equal(expected.public_override_mixins.length,18);
 expected.candidate.loaded_sources=historical.candidate.loaded_sources.map(r=>r.root===0?qualifySpinnerSnackSourceRef(bridge,r,'projects/ngx-material-legacy/'):structuredClone(r));
 expected.current.program=scopeProgram('@angular/material','peer',scopeExtra(expected.public_override_mixins));expected.current.program_sha256=hash(expected.current.program);
 expected.current.messages=[...inspectionNames.map(name=>'inspection/'+name+'/true'),...expected.public_override_mixins.map(name=>'override/'+name+'/true')];
 assert.equal(historical.producer.path,'scripts/measure-sass-inspection-scope.mjs');expected.producer={...historical.producer,sha256:hash(readFileSync(join(root,historical.producer.path)))};
 expected.current_public_bridge=summary;bridge.assertCurrent();assert.deepEqual(current,expected,'current Sass scope differs beyond the exact two-module public bridge successor');bridge.assertCurrent();assert.deepEqual(captureSpinnerSnackC04Metadata(liveHistorical),historical,'historical scope changed during final source guards');assert.deepEqual(captureSpinnerSnackC04Metadata(liveCurrent),current,'current scope changed during final source guards');
 return {historical_source_rows:409,qualified_module_refs:2,historical_boundaries:4,current_boundaries:6,historical_public_override_mixins:16,current_public_override_mixins:18};
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
 const bridge=currentSpinnerSnackBridgeSourceSubject({root,read});
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
 const extra=scopeExtra(peerMixins);
 const current=compileScope({root,sass,entry:'@angular/material',namespace:'peer',allowed:[materialRoot,cdkRoot],extra});
 for(const name of inspectionNames){assert.equal(candidate.functions.includes(name),false);assert.ok(current.messages.includes(`inspection/${name}/true`));}
 for(const name of peerMixins)assert.ok(current.messages.includes(`override/${name}/true`));
 assert.ok(current.loaded_sources.some(row=>row.root===0&&row.path==='core/theming/_inspection.scss'));
 assert.ok(candidate.loaded_sources.some(row=>row.root===1&&row.path==='core/theming/_inspection.scss'));
 bridge.assertCurrent();
 return {schema_version:1,line,result:'pass',role:'Compiler-visible function ownership and direct public override boundaries; not full Sass/API/CSS/native/floor qualification',
  sass:sass.info,peer:{version:peer.version,package_json_sha256:hash(peerManifest)},
  oracle:{path:oraclePath,sha256:oracleSha,material_version:'16.2.14',function_count:25},
  entry_override_used:Boolean(entryOverride),candidate_entry:entryOverride?'test-only-override':'projects/ngx-material-legacy/_index.scss',owned_scss_population:owned,owned_population_sha256:hash(JSON.stringify(owned)),boundaries,public_override_mixins:peerMixins,
  candidate,current,inspection_names:inspectionNames,
  peer_inspection_loaded_via_public_index:true,direct_owned_inspection_calls:0,current_public_bridge:currentSpinnerSnackSourceSummary(bridge),
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
