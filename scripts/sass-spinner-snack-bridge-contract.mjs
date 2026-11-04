/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact positioned aliases; pure CSS comparison grants no artifact admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {join,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {currentSpinnerSnackBridgeSourceSubject} from '../compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-subject.mjs';
const SELF='scripts/sass-spinner-snack-bridge-contract.mjs',INPUTS='compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json';
const INPUTS_SHA='fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8';
const hash=b=>createHash('sha256').update(b).digest('hex'),image=readFileSync(fileURLToPath(import.meta.url));
const raw=readFileSync(new URL('../'+INPUTS,import.meta.url));assert.equal(hash(raw),INPUTS_SHA);const packet=JSON.parse(raw),contexts=new WeakMap();
export const SPINNER_SNACK_BRIDGE_CONTRACT='historical-spinner-snack-css-with-positioned-public-tokens';
export const SPINNER_SNACK_BRIDGE_CASES=Object.freeze([
 'mixin-css/progress-spinner-color','mixin-css/progress-spinner-theme','mixin-css/snack-bar-color','mixin-css/snack-bar-theme','mixin-css/snack-bar-typography',
 ...['progress-spinner-color/custom-full-theme','progress-spinner-color/raw-color-config','progress-spinner-theme/custom-full-theme','progress-spinner-theme/custom-dark-theme',
 'snack-bar-color/custom-full-theme','snack-bar-color/raw-color-config','snack-bar-theme/custom-full-theme','snack-bar-theme/custom-dark-theme','snack-bar-typography/custom-full-theme','snack-bar-typography/raw-typography-config'].map(id=>'mixin-argument/'+id),
]);
for(const branch of Object.values(packet.branches))assert.deepEqual(branch.cases.map(row=>row.case_id),SPINNER_SNACK_BRIDGE_CASES);
function plain(value){
 if(value===null||['string','boolean'].includes(typeof value))return value;
 if(typeof value==='number'){assert.ok(Number.isSafeInteger(value));return value;}
 assert.ok(value&&typeof value==='object');const array=Array.isArray(value);assert.ok(array||Object.getPrototypeOf(value)===Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(value),out=array?[]:{};
 for(const[key,descriptor]of Object.entries(descriptors)){if(array&&key==='length')continue;assert.ok(Object.hasOwn(descriptor,'value')&&descriptor.enumerable,'metadata must contain data properties');if(array)assert.match(key,/^(?:0|[1-9][0-9]*)$/);out[key]=plain(descriptor.value);}
 if(array){assert.equal(out.length,value.length);assert.equal(Object.keys(out).length,value.length);}return out;
}
function measurement(value){return value&&typeof value.css==='string'&&value.css_sha256===hash(value.css)&&Number.isSafeInteger(value.css_bytes)&&value.css_bytes===Buffer.byteLength(value.css);}
const escaped=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** Caller authenticates the original. Only these two exact selector scopes and
 * declaration skeletons are modeled; values and every old byte survive. */
export function spinnerSnackPositionedTokenCss({family,dimension,originalCss}={}){
 try{
  assert.equal(typeof originalCss,'string');const scope=originalCss.startsWith('.sass-api-probe ')?'.sass-api-probe':originalCss.startsWith('.sass-argument-probe ')?'.sass-argument-probe':null;assert.ok(scope);
  const value='([^;\\r\\n{}]+)',selector=escaped(scope+' .mat-mdc-'+(family==='progress-spinner'?'progress-spinner':'snack-bar-container'));
  if(family==='progress-spinner'){
   assert.ok(['color','theme'].includes(dimension));
   const rule=variant=>selector+escaped(variant)+' \\{\\n  --mdc-circular-progress-active-indicator-color: '+value+';\\n\\}';
   assert.equal(new RegExp('^'+['','.mat-accent','.mat-warn'].map(rule).join('\\n')+'$').exec(originalCss)?.[0],originalCss);
   return originalCss.replace(/(  --mdc-circular-progress-active-indicator-color: ([^;\r\n{}]+);\n)/g,(_,old,v)=>old+'  --mat-progress-spinner-active-indicator-color: '+v+';\n');
  }
  assert.equal(family,'snack-bar');assert.ok(['color','typography','theme'].includes(dimension));
  const color='  --mdc-snackbar-container-color: '+value+';\\n  --mdc-snackbar-supporting-text-color: '+value+';\\n  --mat-snack-bar-button-color: '+value+';\\n';
  const typography=['font','line-height','size','weight'].map(name=>'  --mdc-snackbar-supporting-text-'+name+': '+value+';\\n').join('');
  const rule=body=>selector+' \\{\\n'+body+'\\}';
  assert.equal(new RegExp('^'+(dimension==='theme'?rule(color)+'\\n'+rule(typography):rule(dimension==='color'?color:typography))+'$').exec(originalCss)?.[0],originalCss);
  let expected=originalCss;
  if(dimension!=='typography')expected=expected.replace(/(  --mdc-snackbar-container-color: ([^;\r\n{}]+);\n  --mdc-snackbar-supporting-text-color: ([^;\r\n{}]+);\n)/,(_,old,a,b)=>old+'  --mat-snack-bar-container-color: '+a+';\n  --mat-snack-bar-supporting-text-color: '+b+';\n');
  if(dimension!=='color')expected=expected.replace(/(  --mdc-snackbar-supporting-text-font: ([^;\r\n{}]+);\n  --mdc-snackbar-supporting-text-line-height: ([^;\r\n{}]+);\n  --mdc-snackbar-supporting-text-size: ([^;\r\n{}]+);\n  --mdc-snackbar-supporting-text-weight: ([^;\r\n{}]+);\n)/,(_,old,font,height,size,weight)=>old+['font','line-height','size','weight'].map((name,i)=>'  --mat-snack-bar-supporting-text-'+name+': '+[font,height,size,weight][i]+';\n').join(''));
  return expected;
 }catch{return null;}
}
export function spinnerSnackPositionedTokenResultsMatch({family,dimension,original,actual}={}){
 try{original=plain(original);actual=plain(actual);const expected=spinnerSnackPositionedTokenCss({family,dimension,originalCss:original.css});return expected!==null&&measurement(original)&&measurement(actual)&&actual.css===expected;}catch{return false;}
}
function selected(caseId,line){assert.ok(Object.hasOwn(packet.branches,line));const row=packet.branches[line].cases.find(row=>row.case_id===caseId);assert.ok(row);return row;}
export function spinnerSnackBridgeExpectedCss({caseId,line,original}={}){
 try{const row=selected(caseId,line);original=plain(original);assert.ok(measurement(original));assert.equal(original.css_sha256,row.original_sha256);assert.equal(original.css_bytes,row.original_bytes);
  const family=row.mixin.startsWith('progress-spinner-')?'progress-spinner':'snack-bar',dimension=row.mixin.slice(family.length+1);return spinnerSnackPositionedTokenCss({family,dimension,originalCss:original.css});
 }catch{return null;}
}
export function spinnerSnackBridgeResultsMatch({caseId,line,original,actual}={}){
 try{actual=plain(actual);const expected=spinnerSnackBridgeExpectedCss({caseId,line,original});return expected!==null&&measurement(actual)&&actual.css===expected;}catch{return false;}
}
function safe(path){assert.equal(typeof path,'string');assert.ok(path&&!isAbsolute(path)&&!path.includes('\\')&&!path.includes('\0')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));}
function physical(root,path){
 safe(path);const peer=/^node_modules\/(@angular\/(?:core|material|cdk)|sass)\/(.+)$/.exec(path);let cursor=root,parts=path.split('/');
 if(peer){assert.equal(lstatSync(join(root,'node_modules')).isSymbolicLink(),false);if(peer[1].startsWith('@angular/'))assert.equal(lstatSync(join(root,'node_modules/@angular')).isSymbolicLink(),false);cursor=realpathSync(join(root,'node_modules',peer[1]));assert.equal(JSON.parse(readFileSync(join(cursor,'package.json'))).name,peer[1]);parts=peer[2].split('/');}
 for(const part of parts){cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false);}assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);
}
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>canonical(key)+':'+canonical(value[key])).join(',')+'}';return JSON.stringify(value).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));}
function sourceOrder(a,b){return a.root-b.root||(a.path<b.path?-1:a.path>b.path?1:0);}
function sourcesOk(rows){return Array.isArray(rows)&&rows.length>0&&rows.every(row=>{try{safe(row.path);return Number.isSafeInteger(row.root)&&[0,1,2].includes(row.root)&&/^[0-9a-f]{64}$/.test(row.sha256)&&Number.isSafeInteger(row.bytes)&&row.bytes>0;}catch{return false;}})&&new Set(rows.map(row=>row.root+'\0'+row.path)).size===rows.length;}
/** Physical workspace/current-source context only. Artifact assertions must also
 * satisfy the caller's independently validated active run and library binding. */
export function createSpinnerSnackBridgeContract({root=process.cwd(),read:providedRead}={}){
 root=resolve(root);assert.ok(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink());const bound=new Map();
 const read=path=>{const bytes=physical(root,path);if(providedRead){const supplied=providedRead(path);assert.ok(Buffer.isBuffer(supplied)&&supplied.equals(bytes),'nonphysical CSS contract input '+path);}const current={path,sha256:hash(bytes),bytes:bytes.length},prior=bound.get(path);if(prior)assert.deepEqual(current,prior);else bound.set(path,current);return bytes;};
 const member=ref=>{const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);return bytes;};
 assert.ok(read(SELF).equals(image));member({path:INPUTS,sha256:INPUTS_SHA,bytes:raw.length});
 for(const name of ['oracle','catalog','provenance','reference_lock','source_subject','source_packet'])member(packet[name]);for(const ref of packet.compiler_inputs)member(ref);
 const source=currentSpinnerSnackBridgeSourceSubject({root,read}),line=source.line,branch=packet.branches[line];member(branch.observation);
 assert.deepEqual(source.transitions.map(row=>({path:row.path,...row.current})),branch.source_modules);assert.equal(branch.compiler,JSON.parse(read(packet.provenance.path)).sass_info);
 const oracle=JSON.parse(read(packet.oracle.path)),catalog=JSON.parse(read(packet.catalog.path)),provenance=JSON.parse(read(packet.provenance.path)),lock=JSON.parse(read(packet.reference_lock.path));
 for(const row of branch.cases){const isDefault=row.case_id.startsWith('mixin-css/'),setup=isDefault?oracle.standard_theme:catalog.setup;assert.equal(hash(setup),row.setup_sha256);if(isDefault){assert.equal(oracle.members.mixins[row.mixin].invocation.css_sha256,row.original_sha256);}else assert.deepEqual(catalog.cases.find(p=>p.case_id===row.case_id),{case_id:row.case_id,mixin:row.mixin,variant:row.variant,argument:catalog.cases.find(p=>p.case_id===row.case_id).argument,call:row.call});assert.equal(hash("@use '__entry__' as m;\n"+setup+'\n'+row.call+'\n'),row.program_sha256);
  const set=branch.source_sets[row.source_set_sha256];assert.ok(sourcesOk(set));assert.equal(hash(JSON.stringify(set)),row.source_set_sha256);for(const ref of set){const path=['projects/ngx-material-legacy/','node_modules/@angular/material/','node_modules/@angular/cdk/'][ref.root]+ref.path;member({path,sha256:ref.sha256,bytes:ref.bytes});}}
 const assertCurrent=()=>{source.assertCurrent();for(const ref of bound.values())member(ref);source.assertCurrent();};
 const context=Object.freeze({line,bound:structuredClone([...bound.values()]),assertCurrent,source_scope_only:true,gate_or_artifact_admission_granted:false});contexts.set(context,{line,branch,source,assertCurrent,oracle,catalog,provenance,lock});assertCurrent();return context;
}
/** Strict assertion composition; a boolean/JSON approval flag is never used. */
export function spinnerSnackBridgeAssertionOk({context,body,active,invocation}={}){
 try{
  const state=contexts.get(context);assert.ok(state);const snapshot=plain({body,active,invocation}),b=snapshot.body,a=snapshot.active,line=state.line,row=selected(b.case_id,line);
  const envelope={kind:'assertion',check_id:'sass-seal',group:'sass-api-and-values',result:'pass',exit_code:0,line,run_id:a.manifest.run_id,invocation_id:snapshot.invocation,binding:a.binding,mutation_rejected:true,error:null};for(const[key,value]of Object.entries(envelope))assert.deepEqual(b[key],value);
  assert.equal(a.binding.source_line,line);assert.equal(a.binding.run_id,a.manifest.run_id);assert.equal(a.manifest.source.line,line);for(const[key,name]of [['source_commit','commit'],['source_tree','git_tree_sha'],['source_content_sha256','content_sha256']]){assert.equal(a.binding[key],a.manifest.source[name]);assert.match(a.binding[key],key==='source_content_sha256'?/^[0-9a-f]{64}$/:/^[0-9a-f]{40}$/);}assert.equal(a.binding.artifacts_sha256,hash(canonical(a.manifest.artifacts)));assert.equal(typeof a.manifest.run_id,'string');assert.ok(a.manifest.run_id);assert.equal(typeof snapshot.invocation,'string');assert.ok(snapshot.invocation);
  const library=a.manifest.artifacts.filter(row=>row.id==='library');assert.equal(library.length,1);assert.match(library[0].sha256,/^[0-9a-f]{64}$/);assert.equal(b.tarball_sha256,library[0].sha256);assert.equal(b.comparison,SPINNER_SNACK_BRIDGE_CONTRACT);assert.equal(b.call,row.call);assert.equal(b.mixin,row.mixin);assert.equal(b.variant,row.variant);
  const identity={material_version:'16.2.14',material_manifest_sha256:state.provenance.isolated_environment.material_manifest_sha256,lock_sha256:packet.reference_lock.sha256,material_integrity:state.lock.packages['node_modules/@angular/material'].integrity,catalog:row.case_id.startsWith('mixin-css/')?packet.oracle.path:packet.catalog.path,catalog_sha256:row.case_id.startsWith('mixin-css/')?packet.oracle.sha256:packet.catalog.sha256,expected_source:'untouched-installed-material16',candidate_source:'packed-facade',sass_version:state.branch.compiler};assert.deepEqual(b.identity,identity);
  assert.deepEqual(b.current_spinner_snack_bridge,{contract:SPINNER_SNACK_BRIDGE_CONTRACT,source_line:line,source_subject:packet.source_subject,source_packet:packet.source_packet,source_modules:state.branch.source_modules,compiler_inputs:packet.compiler_inputs});
  assert.equal(b.expected.program_sha256,row.program_sha256);assert.equal(b.actual.program_sha256,row.program_sha256);assert.ok(sourcesOk(b.expected.sources)&&b.expected.sources.every(s=>s.root===0));assert.ok(b.expected.sources.some(s=>isDeepStrictEqual(s,{root:0,...state.catalog.original_entry_identity})));assert.ok(sourcesOk(b.actual.sources));assert.deepEqual([...b.actual.sources].sort(sourceOrder),state.branch.source_sets[row.source_set_sha256]);
  assert.ok(spinnerSnackBridgeResultsMatch({caseId:b.case_id,line,original:b.expected,actual:b.actual}));assert.equal(Object.hasOwn(b,'current_companion'),false);assert.equal(Object.hasOwn(b,'current_peer_alias'),false);
  const wrong=b.actual.css+'\n.wrong-nonempty-mixin { color: red; }\n';assert.deepEqual(b.mutation,{css:wrong,css_sha256:hash(wrong),css_bytes:Buffer.byteLength(wrong)});
  state.assertCurrent();assert.deepEqual(plain({body,active,invocation}),snapshot,'live assertion metadata changed during source guards');return true;
 }catch{return false;}
}
