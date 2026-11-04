/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two current physical modules; historical source is used only for comparison. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {dirname,join,resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const PREFIX='compatibility/rc/parallel-spinner-snack-public-bridge-integration-';
const SELF=PREFIX+'source-subject.mjs',INPUTS=PREFIX+'source-inputs.json';
const INPUTS_SHA='976e6192ba51da0d69e9de1024e5f124d7e019f0426355e86cb7fa4af0d9a6d4';
const PATHS=['projects/ngx-material-legacy/styles/progress-spinner/_progress-spinner-theme.scss','projects/ngx-material-legacy/styles/snack-bar/_snack-bar-theme.scss'];
const TAGGED=['66a468c42321ca679c35c07713eb187de8f0ca64','015b5d87d71d0ca924c32a1e31de097b1e836299'];
const VERSIONS={'21.x':{core:'21.2.23',cdk:'21.2.14',material:'21.2.14'},main:{core:'22.1.7',cdk:'22.1.7',material:'22.1.7'}};
const image=readFileSync(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const gitHash=(kind,b)=>createHash('sha1').update(kind+' '+Buffer.byteLength(b)+'\0').update(b).digest('hex');
const ref=(path,b)=>({path,sha256:hash(b),bytes:b.length});
const safe=path=>{assert.equal(typeof path,'string');assert.ok(path&& !isAbsolute(path)&&!path.includes('\\')&&!path.includes('\0'));assert.ok(path.split('/').every(p=>p&&p!=='.'&&p!=='..'));return path;};
const belongs=(base,path)=>{const r=relative(base,path);return r===''||(!isAbsolute(r)&&r!=='..'&&!r.startsWith('../'));};
function regular(base,parts){let cursor=base;for(const part of parts){cursor=join(cursor,part);const s=lstatSync(cursor);assert.equal(s.isSymbolicLink(),false,'linked source descendant '+cursor);}assert.ok(lstatSync(cursor).isFile(),'source is not a regular file');return readFileSync(cursor);}
/** Only peer package roots may be linked; every descendant remains regular. */
function physical(root,path){
 safe(path);const peer=/^node_modules\/(@angular\/(?:core|material|cdk)|sass)\/(.+)$/.exec(path);
 if(!peer)return regular(root,path.split('/'));
 const container=join(root,'node_modules');assert.equal(lstatSync(container).isSymbolicLink(),false);assert.ok(lstatSync(container).isDirectory());
 if(peer[1].startsWith('@angular/')){const scope=join(container,'@angular');assert.equal(lstatSync(scope).isSymbolicLink(),false);assert.ok(lstatSync(scope).isDirectory());}
 const base=realpathSync(join(container,peer[1]));assert.ok(lstatSync(base).isDirectory());
 if(peer[1]==='sass')assert.ok(['package.json','sass.node.js','sass.dart.js'].includes(peer[2]),'unbounded Sass descendant');
 const manifest=JSON.parse(regular(base,['package.json']));assert.equal(manifest.name,peer[1]);
 return regular(base,peer[2].split('/'));
}
function git(root,args,input){return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','-c','remote.origin.promisor=false','-c','extensions.partialClone=',...args],{cwd:root,input,maxBuffer:16*1024*1024,env:{PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'}});}
function gitBlobs(root,commit,refs){
 const data=git(root,['cat-file','--batch'],refs.map(r=>commit+':'+safe(r.path)).join('\n')+'\n'),out=new Map();let cursor=0;
 for(const r of refs){const end=data.indexOf(10,cursor);assert.ok(end>cursor);const header=data.subarray(cursor,end).toString().split(' ');assert.equal(header.length,3);assert.equal(header[1],'blob');const n=Number(header[2]);assert.ok(Number.isSafeInteger(n)&&n>=0);const b=data.subarray(end+1,end+1+n);assert.equal(b.length,n);assert.equal(data[end+1+n],10);cursor=end+2+n;assert.equal(gitHash('blob',b),header[0]);assert.equal(header[0],r.blob);assert.equal(hash(b),r.sha256);assert.equal(n,r.bytes);out.set(r.path,Buffer.from(b));}
 assert.equal(cursor,data.length);return out;
}
function inverseCurrent(family,text){
 const remove=(needle,n=1)=>{assert.equal(text.split(needle).length,n+1,'missing/duplicate finite bridge addition');text=text.replaceAll(needle,'');};
 remove("@use '@angular/material' as mat;\n");
 if(family==='progress-spinner'){
  remove('    @include mat.progress-spinner-overrides($mdc-circular-progress-color-tokens);\n');
  remove('      @include mat.progress-spinner-overrides((active-indicator-color: $color));\n',2);
 }else{
  assert.equal(family,'snack-bar');
  remove('    @include mat.snack-bar-overrides(tokens-mdc-snack-bar.get-color-tokens($config));\n');
  remove('    @include mat.snack-bar-overrides(tokens-mdc-snack-bar.get-typography-tokens($config));\n');
 }
 return text;
}
/** Exact declarations inserted after their original groups; all other bytes stay. */
function receiptExpected(css){let added=0;const out=css.replace(/([^{}]+)\{([^{}]*)\}/g,(all,selector,body)=>{
 if(/(?:^|\s)\.mat-mdc-progress-spinner(?:\.mat-(?:accent|warn))?$/.test(selector.trim())){
  const next=body.replace(/(\n  --mdc-circular-progress-active-indicator-color: ([^;\n]+);\n)/g,(_,old,v)=>{added++;return old+`  --mat-progress-spinner-active-indicator-color: ${v};\n`;});assert.notEqual(next,body);return selector+'{'+next+'}';
 }
 if(!selector.trim().endsWith('.mat-mdc-snack-bar-container'))return all;
 let next=body.replace(/(\n  --mdc-snackbar-container-color: ([^;\n]+);\n  --mdc-snackbar-supporting-text-color: ([^;\n]+);\n)/g,(_,old,a,b)=>{added+=2;return old+`  --mat-snack-bar-container-color: ${a};\n  --mat-snack-bar-supporting-text-color: ${b};\n`;});
 next=next.replace(/(\n  --mdc-snackbar-supporting-text-font: ([^;\n]+);\n  --mdc-snackbar-supporting-text-line-height: ([^;\n]+);\n  --mdc-snackbar-supporting-text-size: ([^;\n]+);\n  --mdc-snackbar-supporting-text-weight: ([^;\n]+);\n)/g,(_,old,font,height,size,weight)=>{added+=4;return old+`  --mat-snack-bar-supporting-text-font: ${font};\n  --mat-snack-bar-supporting-text-line-height: ${height};\n  --mat-snack-bar-supporting-text-size: ${size};\n  --mat-snack-bar-supporting-text-weight: ${weight};\n`;});
 assert.notEqual(next,body);return selector+'{'+next+'}';
 });assert.equal(added,77);return out;}

export function currentSpinnerSnackBridgeSourceSubject({root=process.cwd(),read:providedRead}={}){
 root=resolve(root);assert.equal(lstatSync(root).isSymbolicLink(),false);assert.ok(lstatSync(root).isDirectory());
 const bound=new Map();
 const read=path=>{const actual=physical(root,path);if(providedRead){const supplied=providedRead(path);assert.ok(Buffer.isBuffer(supplied)&&supplied.equals(actual),'nonphysical bridge source input '+path);}const current=ref(path,actual),prior=bound.get(path);if(prior)assert.deepEqual(current,prior,'changed bridge source input '+path);else bound.set(path,current);return actual;};
 const self=read(SELF);assert.ok(self.equals(image),'loaded bridge subject differs from current source');
 const packetRaw=read(INPUTS);assert.equal(hash(packetRaw),INPUTS_SHA);const packet=JSON.parse(packetRaw);assert.equal(packet.schema_version,1);assert.deepEqual(packet.paths,PATHS);assert.equal(packet.qualifies_old_product_bytes_as_current,false);
 const manifest=JSON.parse(read('projects/ngx-material-legacy/package.json')),line=manifest.version.startsWith('21.')?'21.x':manifest.version.startsWith('22.')?'main':null;assert.ok(line);
 const subject=packet.branches[line];assert.deepEqual(subject.minimum_versions,VERSIONS[line]);assert.deepEqual(subject.modules.map(m=>m.path),PATHS);
 const member=r=>{const b=read(r.path);assert.equal(hash(b),r.sha256,'changed finite bridge input '+r.path);assert.equal(b.length,r.bytes);return b;};
 assert.equal(new Set(subject.inputs.map(r=>r.path)).size,subject.inputs.length);for(const r of subject.inputs)member(r);
 assert.equal(process.versions.node,'24.21.0');const tool=JSON.parse(read('toolchain-lock.json')),rootManifest=JSON.parse(read('package.json'));assert.equal(tool.repository.node,process.versions.node);assert.equal(rootManifest.devDependencies.sass,'1.104.1');assert.equal(JSON.parse(read('node_modules/sass/package.json')).version,'1.104.1');
 for(const [name,version]of Object.entries(VERSIONS[line]))assert.equal(JSON.parse(read('node_modules/@angular/'+name+'/package.json')).version,version);
 const rawCommit=git(root,['cat-file','commit',subject.before_commit]);assert.equal(gitHash('commit',rawCommit),subject.before_commit);assert.equal(hash(rawCommit),subject.before_commit_sha256);assert.ok(rawCommit.toString().startsWith('tree '+subject.before_tree+'\n'));
 const oldRefs=subject.modules.map(m=>({path:m.path,...m.before}));
 const historical=gitBlobs(root,subject.before_commit,[...oldRefs,...subject.unchanged_owned_sass_before_inputs]);
 for(const r of subject.unchanged_owned_sass_before_inputs){assert.equal(PATHS.includes(r.path),false);assert.ok(member(r).equals(historical.get(r.path)),'owned getter/model differs from authenticated before source');}
 for(const [i,m]of subject.modules.entries()){
  const old=historical.get(m.path),current=member(m.current).toString(),tag=Buffer.from(m.tagged.body);assert.equal(gitHash('blob',tag),TAGGED[i]);assert.equal(gitHash('blob',tag),m.tagged.blob);assert.equal(hash(tag),m.tagged.sha256);assert.equal(tag.length,m.tagged.bytes);
  assert.equal(old.toString(),tag.toString().replaceAll("'@material/","'../vendor/mdc/"));
  assert.equal(inverseCurrent(m.family,current),old.toString(),'source differs beyond the finite public bridge calls');
 }
 const entries=JSON.parse(read('research/sass-symbols.json')).entries;
 for(const f of ['progress-spinner','snack-bar'])for(const d of ['color','typography','density','theme']){const hits=entries.filter(e=>e.symbol===f+'-'+d);assert.equal(hits.length,1);assert.equal(hits[0].category,'explicit-current-component-bridge');}
 const receipt=JSON.parse(member(subject.semantic_receipt));assert.equal(receipt.line,line);assert.equal(resolve(receipt.root),root);assert.deepEqual(receipt.actual_minimum_versions,VERSIONS[line]);assert.equal(receipt.program_sha256,subject.receipt_program_sha256);assert.equal(hash(receipt.program),receipt.program_sha256);
 assert.equal(receipt.actual_compiler_emission_executed,true);assert.equal(receipt.compile_calls,2);assert.equal(receipt.negative_controls.length,18);assert.ok(receipt.negative_controls.every(r=>r.rejected===true));
 assert.equal(hash(receipt.baseline.css),receipt.baseline.css_sha256);assert.equal(hash(receipt.candidate.css),receipt.candidate.css_sha256);assert.equal(receipt.candidate.css,receiptExpected(receipt.baseline.css));
 for(const m of subject.modules){const rows=receipt.source_bindings.filter(r=>r.path===m.path);assert.equal(rows.length,1);assert.equal(rows[0].before_sha256,m.before.sha256);assert.equal(rows[0].current_sha256,m.current.sha256);assert.equal(rows[0].current_bytes,m.current.bytes);}
 const roots=[{root:realpathSync(join(root,'projects/ngx-material-legacy')),prefix:'projects/ngx-material-legacy/'},...['material','cdk'].map(name=>({root:realpathSync(join(root,'node_modules/@angular/'+name)),prefix:'node_modules/@angular/'+name+'/'}))];
 const loaded=new Set();for(const href of receipt.candidate.loaded_urls){const url=new URL(href);assert.equal(url.protocol,'file:');const path=fileURLToPath(url);if(path===join(root,'compatibility/rc/parallel-spinner-snack-public-bridge-virtual.scss'))continue;const target=realpathSync(path),group=roots.find(g=>belongs(g.root,target));assert.ok(group,'foreign loaded Sass input');const normalized=group.prefix+relative(group.root,target).replaceAll('\\','/');assert.ok(bound.has(normalized),'unbound loaded Sass input '+normalized);loaded.add(normalized);}
 const ownedLoaded=[...loaded].filter(p=>p.startsWith('projects/ngx-material-legacy/')&&!PATHS.includes(p)).sort();assert.deepEqual(ownedLoaded,subject.unchanged_owned_sass_before_inputs.map(r=>r.path).sort());
 const publicIndex=read('node_modules/@angular/material/_index.scss').toString();
 for(const [family,name]of Object.entries(subject.minimum_api)){assert.ok(publicIndex.includes(name));assert.ok(read('node_modules/@angular/material/'+family+'/_'+family+'-theme.scss').toString().includes('@mixin overrides($tokens: ())'));
  const consumer=receipt.actual_minimum_peer_component_consumers[family];const bytes=read(consumer.path);assert.equal(hash(bytes),consumer.sha256);for(const name of consumer.variables)assert.ok(bytes.toString().includes(name));}
 const tokenNames=['--mat-progress-spinner-active-indicator-color',...['container-color','supporting-text-color','supporting-text-font','supporting-text-line-height','supporting-text-size','supporting-text-weight'].map(n=>'--mat-snack-bar-'+n)];for(const name of tokenNames)assert.ok(Object.values(receipt.actual_minimum_peer_component_consumers).some(r=>r.variables.includes(name)));
 const assertCurrent=()=>{for(const r of bound.values()){const actual=physical(root,r.path);if(providedRead){const supplied=providedRead(r.path);assert.ok(Buffer.isBuffer(supplied)&&supplied.equals(actual),'nonphysical or late bridge source '+r.path);}assert.equal(hash(actual),r.sha256,'late bridge source '+r.path);assert.equal(actual.length,r.bytes);}};
 const qualify=incoming=>{
  if(!incoming||typeof incoming!=='object')return null;
  const capture=()=>{const d=Object.getOwnPropertyDescriptors(incoming);for(const name of ['path','sha256'])assert.ok(d[name]&&Object.hasOwn(d[name],'value'),'reference fields must be data properties');if(d.bytes)assert.ok(Object.hasOwn(d.bytes,'value'),'reference size must be a data property');return {path:d.path.value,sha256:d.sha256.value,...(d.bytes?{bytes:d.bytes.value}:{})};};
  const original=capture(),m=subject.modules.find(m=>m.path===original.path);if(!m)return null;
  const selected=original.sha256===m.before.sha256?m.before:original.sha256===m.current.sha256?m.current:null;assert.ok(selected,'unknown two-module source reference');if(Object.hasOwn(original,'bytes'))assert.equal(original.bytes,selected.bytes);
  assertCurrent();assert.deepEqual(capture(),original,'reference mutated during bridge qualification');
  const result={path:m.path,sha256:m.current.sha256,...(Object.hasOwn(original,'bytes')?{bytes:m.current.bytes}:{})};
  assert.deepEqual(capture(),original,'reference mutated before bridge qualification returned');return result;
 };
 const assertHistoricalSource=(path,expected)=>{safe(path);const m=subject.modules.find(m=>m.path===path);assert.ok(m,'unknown historical bridge comparison');assert.ok(typeof expected==='string'||Buffer.isBuffer(expected));const copy=Buffer.from(expected);assertCurrent();assert.equal(hash(copy),m.before.sha256,'historical expected hash differs');assert.equal(copy.length,m.before.bytes);assert.ok(copy.equals(historical.get(path)),'historical expected source differs');assertCurrent();return {path,before_sha256:m.before.sha256,current_sha256:m.current.sha256,exact_historical_comparison:true,current_physical_source_guarded:true};};
 assertCurrent();
 return {root,line,qualify,assertHistoricalSource,assertCurrent,bound:structuredClone([...bound.values()]),transitions:structuredClone(subject.modules.map(m=>({path:m.path,before:m.before,current:m.current}))),source_scope_only:true,metadata_refs_qualified:2,current_source_reads_are_physical:true,historical_source_bytes_exposed:false,semantic_receipt:structuredClone(subject.semantic_receipt),compiled_source_inputs:loaded.size,unchanged_owned_sass_authenticated_against_before_commit:ownedLoaded.length,independent_emission_receipt_validated:true,fresh_sass_compilation_this_call:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
