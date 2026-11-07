/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite card12 admission over the authenticated owned source successors. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual,types} from 'node:util';
import {createCurrentSassSource} from './current-sass-source.mjs';
import {ordinaryCardPublicBridgeV2Css} from '../compatibility/rc/ordinary-card-public-bridge-model-v2.mjs';
const SELF='scripts/sass-ordinary-card-gate.mjs',INPUTS='compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json';
const hash=b=>createHash('sha256').update(b).digest('hex'),image=readFileSync(fileURLToPath(import.meta.url));
const trustedCompiler=createRequire(import.meta.url)('sass'),trustedInfo=trustedCompiler.info,trustedCompile=trustedCompiler.compileString;
const raw=readFileSync(new URL('../'+INPUTS,import.meta.url));assert.equal(hash(raw),'fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8');
const packet=JSON.parse(raw),contexts=new WeakMap(),referenceRuns=new WeakMap();
const dependencies=[
 ['compatibility/rc/ordinary-card-public-bridge-model-v1.mjs','0286969a007029a3628d8a56fb17c0ee2bbfecec735abdf5d95911ac7c709a83'],
 ['compatibility/rc/ordinary-card-public-bridge-model-v2.mjs','171a32edcc51d651173d52840da6a4cdcdf4bb4280b3e717ab96419714f013ad'],
 ['compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json','59e47c924f0f541b7b262a9ee31f6e55bc4160c1c420f683247a1703be470bbf'],
];
const originalRaw=readFileSync(new URL('../'+dependencies[2][0],import.meta.url));assert.equal(hash(originalRaw),dependencies[2][1]);const originals=JSON.parse(originalRaw);
export const ORDINARY_CARD_CONTRACT='historical-ordinary-card-with-positioned-public-tokens';
export const ORDINARY_CARD_GATE_CASES=Object.freeze(originals.cases.filter(r=>r.case_id.startsWith('mixin-css/')||r.case_id.startsWith('mixin-argument/')).map(r=>r.case_id));
export const ORDINARY_CARD_DEFAULT_CASES=Object.freeze(ORDINARY_CARD_GATE_CASES.filter(id=>id.startsWith('mixin-css/')));
assert.equal(ORDINARY_CARD_GATE_CASES.length,12);assert.equal(ORDINARY_CARD_DEFAULT_CASES.length,4);
function planFor(id,oracle,catalog){
 assert.ok(ORDINARY_CARD_GATE_CASES.includes(id));const def=id.startsWith('mixin-css/'),mixin=id.split('/')[1];let row;
 if(def){const params=oracle.members.mixins[mixin].params,required=params.filter(p=>p.default===null);assert.ok(required.every(p=>['theme','config','config-or-theme','theme-or-color-config'].includes(p.name)));row={mixin,variant:'default',call:'.sass-api-probe { @include m.'+mixin+'('+required.map(()=>'$__theme').join(', ')+'); }'};}
 else{row=catalog.cases.find(r=>r.case_id===id);assert.ok(row);}
 assert.equal(row.call,originals.cases.find(r=>r.case_id===id).call);return {...row,program_sha256:hash("@use '__entry__' as m;\n"+(def?oracle.standard_theme:catalog.setup)+'\n'+row.call+'\n')};
}
const plain=value=>{
 if(value===null||['string','boolean'].includes(typeof value))return value;
 if(typeof value==='number'){assert.ok(Number.isSafeInteger(value));return value;}
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value));const array=Array.isArray(value);assert.equal(Object.getPrototypeOf(value),array?Array.prototype:Object.prototype);
 const out=array?[]:{},descriptors=Object.getOwnPropertyDescriptors(value);
 for(const key of Reflect.ownKeys(descriptors)){assert.equal(typeof key,'string','symbol metadata is not JSON');if(array&&key==='length')continue;const d=descriptors[key];assert.ok(Object.hasOwn(d,'value')&&d.enumerable,'gate metadata requires enumerable data properties');if(array)assert.match(key,/^(?:0|[1-9][0-9]*)$/);Object.defineProperty(out,key,{value:plain(d.value),writable:true,enumerable:true,configurable:true});}
 if(array){assert.equal(out.length,descriptors.length.value);assert.equal(Object.keys(out).length,out.length);}return out;
};
const measurement=m=>m&&typeof m.css==='string'&&m.css_sha256===hash(m.css)&&Number.isSafeInteger(m.css_bytes)&&m.css_bytes===Buffer.byteLength(m.css);
const order=(a,b)=>a.root-b.root||(a.path<b.path?-1:a.path>b.path?1:0);
function sourcesOk(rows){return Array.isArray(rows)&&rows.length>0&&rows.every(s=>Number.isSafeInteger(s.root)&&[0,1,2].includes(s.root)&&typeof s.path==='string'&&s.path&&!isAbsolute(s.path)&&!s.path.includes('\\')&&!s.path.includes('\0')&&s.path.split('/').every(p=>p&&p!=='.'&&p!=='..')&&/^[0-9a-f]{64}$/.test(s.sha256)&&Number.isSafeInteger(s.bytes)&&s.bytes>0)&&new Set(rows.map(s=>s.root+'\0'+s.path)).size===rows.length;}
const bufferEquals=Buffer.prototype.equals;
const equalBytes=(actual,supplied)=>Buffer.isBuffer(supplied)&&Reflect.apply(bufferEquals,actual,[supplied]);
function physical(root,path){
 assert.equal(typeof path,'string');assert.ok(path&&!isAbsolute(path)&&!path.includes('\\')&&!path.includes('\0')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));
 const regular=(base,parts)=>{let cursor=base;for(const part of parts){cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false,'linked source descendant');}assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);};
 const peer=/^node_modules\/(@angular\/(?:core|material|cdk)|sass)\/(.+)$/.exec(path);
 if(!peer)return regular(root,path.split('/'));
 const container=join(root,'node_modules');assert.equal(lstatSync(container).isSymbolicLink(),false);assert.ok(lstatSync(container).isDirectory());
 if(peer[1].startsWith('@angular/')){const scope=join(container,'@angular');assert.equal(lstatSync(scope).isSymbolicLink(),false);assert.ok(lstatSync(scope).isDirectory());}
 const base=realpathSync(join(container,peer[1]));assert.ok(lstatSync(base).isDirectory());
 if(peer[1]==='sass')assert.ok(['package.json','sass.node.js','sass.dart.js'].includes(peer[2]));
 assert.equal(JSON.parse(regular(base,['package.json'])).name,peer[1]);return regular(base,peer[2].split('/'));
}
/** Frozen source guards authenticate each retained first image against their pins.
 * This private boundary closes supplied callbacks; it is not an atomic FS snapshot. */
function physicalBoundary(root,providedRead){
 assert.equal(lstatSync(root).isSymbolicLink(),false);assert.ok(lstatSync(root).isDirectory());const retained=new Map();
 const read=path=>{const actual=physical(root,path),prior=retained.get(path);if(prior)assert.ok(equalBytes(actual,prior),'changed retained physical input '+path);else retained.set(path,Buffer.from(actual));
  if(providedRead!==undefined){assert.equal(typeof providedRead,'function');const supplied=providedRead(path);assert.ok(equalBytes(actual,supplied),'nonphysical supplied input '+path);}
  assert.ok(equalBytes(physical(root,path),actual),'physical input changed during supplied read '+path);return actual;};
 const assertPhysical=()=>{for(const[path,before]of retained)assert.ok(equalBytes(physical(root,path),before),'changed final physical input '+path);};
 return {read,assertPhysical,bound:()=>[...retained].map(([path,b])=>({path,sha256:hash(b),bytes:b.length}))};
}
function tool(root,path,read){return read(path);}
function state(context){const value=contexts.get(context);assert.ok(value,'unregistered gate context');return value;}
function captureArgs(args,allowed){
 assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);const descriptors=Object.getOwnPropertyDescriptors(args),values={};
 for(const key of Reflect.ownKeys(descriptors)){assert.equal(typeof key,'string');assert.ok(allowed.includes(key),'unknown gate argument');const d=descriptors[key];assert.ok(Object.hasOwn(d,'value')&&d.enumerable,'gate arguments require enumerable data properties');Object.defineProperty(values,key,{value:d.value,writable:true,enumerable:true,configurable:true});}
 return {args,allowed,descriptors,values};
}
function sameArgs(captured){const now=captureArgs(captured.args,captured.allowed);assert.deepEqual(Reflect.ownKeys(now.descriptors),Reflect.ownKeys(captured.descriptors));for(const key of Reflect.ownKeys(captured.descriptors)){const a=captured.descriptors[key],b=now.descriptors[key];assert.equal(a.value,b.value,'gate argument identity changed');for(const flag of ['enumerable','writable','configurable'])assert.equal(a[flag],b[flag],'gate argument descriptor changed');}}
function compilerSlots(sass){assert.ok(sass&&typeof sass==='object'&&!types.isProxy(sass));const all=Object.getOwnPropertyDescriptors(sass),out={};for(const key of ['info','compileString']){const d=all[key];assert.ok(d&&Object.hasOwn(d,'value')&&d.enumerable,'compiler slots require own data properties');out[key]=d;}return out;}
function sameCompilerSlots(sass,before){const after=compilerSlots(sass);for(const key of ['info','compileString']){assert.equal(after[key].value,before[key].value,'compiler slot changed');for(const flag of ['enumerable','writable','configurable'])assert.equal(after[key][flag],before[key][flag],'compiler slot descriptor changed');}}
function payload(captured,fields,defaults){const out={};for(const key of fields)Object.defineProperty(out,key,{value:Object.hasOwn(captured.values,key)?captured.values[key]:defaults[key],writable:true,enumerable:true,configurable:true});return out;}
function guarded(args,fields,operation,defaults={}){
 try{const captured=captureArgs(args,['context',...fields]),s=state(captured.values.context),incoming=payload(captured,fields,defaults),snapshot=plain(incoming);const result=operation(snapshot,s);if(result!==true)return false;s.assertCurrent();sameArgs(captured);assert.deepEqual(plain(incoming),snapshot,'gate metadata changed during source guards');s.assertPhysical();return result;}catch{return false;}
}

/** Pure production12 expectation; the frozen sixteen-case model is data, not authority. */
export function ordinaryCardExpectedCss(args){const v=plain(args);assert.deepEqual(Object.keys(v).sort(),['caseId','originalCss']);assert.ok(ORDINARY_CARD_GATE_CASES.includes(v.caseId));return ordinaryCardPublicBridgeV2Css(v);}
export function ordinaryCardResultsMatch(args){try{const v=plain(args);assert.deepEqual(Object.keys(v).sort(),['actual','caseId','original']);const css=ordinaryCardExpectedCss({caseId:v.caseId,originalCss:v.original.css});return measurement(v.original)&&measurement(v.actual)&&v.actual.css===css;}catch{return false;}}
export function createOrdinaryCardGateContext(args={}){
 const captured=captureArgs(args,['root','read']);let {root=process.cwd(),read}=captured.values;root=resolve(root);const boundary=physicalBoundary(root,read);read=boundary.read;
 const source=createCurrentSassSource({root,read}),line=source.line,branch=packet.branches[line];assert.ok(branch);
 const member=ref=>{const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256);if(ref.bytes!==undefined)assert.equal(bytes.length,ref.bytes);return bytes;};
 assert.ok(equalBytes(read(SELF),image));for(const[path,sha256]of dependencies)member({path,sha256});member({path:INPUTS,sha256:hash(raw),bytes:raw.length});
 for(const key of ['oracle','catalog','provenance','reference_lock'])member(packet[key]);for(const r of packet.compiler_inputs)member(r);
 const oracle=JSON.parse(read(packet.oracle.path)),catalog=JSON.parse(read(packet.catalog.path)),provenance=JSON.parse(read(packet.provenance.path)),lock=JSON.parse(read(packet.reference_lock.path));assert.equal(branch.compiler,provenance.sass_info);
 const sourceDescriptor=plain(source.descriptor);assert.equal(sourceDescriptor.source_subject.path,'scripts/current-sass-source.mjs');assert.equal(sourceDescriptor.source_packet.path,'compatibility/rc/current-sass-source-inputs-v2.json');member(sourceDescriptor.source_subject);member(sourceDescriptor.source_packet);
 const modules=sourceDescriptor.source_modules,focusPath='projects/ngx-material-legacy/styles/core/focus-indicators/_focus-indicators.scss';assert.equal(modules.length,line==='main'?7:6);assert.equal(new Set(modules.map(r=>r.path)).size,modules.length);
 assert.deepEqual(modules.map(r=>r.path).sort(),[...['progress-spinner','snack-bar','checkbox','button','card'].map(f=>'projects/ngx-material-legacy/styles/'+f+'/_'+f+'-theme.scss'),'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss',...(line==='main'?[focusPath]:[])].sort());
 if(line==='main'){const fp=JSON.parse(read('compatibility/rc/current-main-strong-focus-source-v1.json'));assert.deepEqual(modules.find(r=>r.path===focusPath),fp.after);}
 assert.deepEqual(modules.find(r=>r.path.endsWith('/card/_card-theme.scss')),{path:'projects/ngx-material-legacy/styles/card/_card-theme.scss',sha256:'dc5e055d95aabf5c8a8ae4ba70acee8a9a1315e6f46715e8846c932f79d51fbf',bytes:5349});
 const currentByPath=new Map(modules.map(r=>[r.path,r])),sets=plain(source.source_sets),successors=plain(source.source_set_successors);assert.equal(Object.keys(sets).length,1);assert.equal(successors.length,1);
 for(const [historical_sha256,rows]of Object.entries(branch.source_sets)){
  assert.equal(hash(JSON.stringify(rows)),historical_sha256);const expected=rows.map(r=>{const current=r.root===0&&currentByPath.get('projects/ngx-material-legacy/'+r.path);return current?{...r,sha256:current.sha256,bytes:current.bytes}:{...r};}),current_sha256=hash(JSON.stringify(expected));
  assert.deepEqual(successors,[{historical_sha256,current_sha256}]);assert.deepEqual(sets[current_sha256],expected);
 }
 const currentSources=plain(Object.values(sets)[0]);assert.ok(sourcesOk(currentSources));assert.equal(currentSources.length,line==='21.x'?471:472);for(const r of modules)member(r);
 const plans=new Map(ORDINARY_CARD_GATE_CASES.map(id=>[id,planFor(id,oracle,catalog)]));
 const descriptor={contract:ORDINARY_CARD_CONTRACT,source:sourceDescriptor,case_ids:[...ORDINARY_CARD_GATE_CASES],models:dependencies.map(([path,sha256])=>({path,sha256}))};
 const assertCurrent=()=>{source.assertCurrent();assert.ok(equalBytes(read(SELF),image));for(const[path,sha256]of dependencies)member({path,sha256});source.assertCurrent();boundary.assertPhysical();};
 const context=Object.freeze({line,assertCurrent,get bound(){return boundary.bound();},source_scope_only:true,gate_or_artifact_admission_granted:false});
 contexts.set(context,{root,line,source,assertCurrent,assertPhysical:boundary.assertPhysical,descriptor:plain(descriptor),currentSources,plans,oracle,catalog,provenance,lock,branch});assertCurrent();sameArgs(captured);boundary.assertPhysical();return context;
}
export function ordinaryCardGateDescriptor(context){const s=state(context);s.assertCurrent();const d=structuredClone(s.descriptor);s.assertPhysical();return d;}
function currentMeasurement(s,id,m){return Boolean(s.plans.has(id)&&measurement(m)&&m.program_sha256===s.plans.get(id).program_sha256&&(!Object.hasOwn(m,'line')||m.line===s.line)&&(!Object.hasOwn(m,'sass_version')||m.sass_version===s.branch.compiler)&&sourcesOk(m.sources)&&isDeepStrictEqual([...m.sources].sort(order),s.currentSources));}
export function ordinaryCardGateMeasurementOk(args={}){return guarded(args,['caseId','actual'],(v,s)=>currentMeasurement(s,v.caseId,v.actual));}
function originalIdentity(s,id){const def=id.startsWith('mixin-css/');return {material_version:'16.2.14',material_manifest_sha256:s.provenance.isolated_environment.material_manifest_sha256,lock_sha256:packet.reference_lock.sha256,material_integrity:s.lock.packages['node_modules/@angular/material'].integrity,catalog:packet[def?'oracle':'catalog'].path,catalog_sha256:packet[def?'oracle':'catalog'].sha256,expected_source:'untouched-installed-material16',candidate_source:'packed-facade',sass_version:s.branch.compiler};}
function originalMeasurement(s,id,m){return Boolean(s.plans.has(id)&&measurement(m)&&m.program_sha256===s.plans.get(id).program_sha256&&sourcesOk(m.sources)&&isDeepStrictEqual([...m.sources].sort(order),originals.all_original_loaded_sources));}
function directMatch(s,v){return Boolean(ORDINARY_CARD_GATE_CASES.includes(v.caseId)&&currentMeasurement(s,v.caseId,v.actual)&&originalMeasurement(s,v.caseId,v.original)&&isDeepStrictEqual(v.identity,originalIdentity(s,v.caseId))&&isDeepStrictEqual(v.descriptor,s.descriptor)&&ordinaryCardResultsMatch({caseId:v.caseId,original:v.original,actual:v.actual}));}
export function ordinaryCardGateDirectMatch(args={}){return guarded(args,['caseId','original','actual','identity','descriptor'],(v,s)=>directMatch(s,v));}
export function ordinaryCardGateDefaultMatch(args={}){return guarded(args,['caseId','got'],(v,s)=>{const g=v.got,plan=s.plans.get(v.caseId);if(!ORDINARY_CARD_DEFAULT_CASES.includes(v.caseId)||!plan||g.comparison!==ORDINARY_CARD_CONTRACT||g.error!==null||g.mutation_rejected!==true||['current_companion','current_infrastructure','current_peer_alias','current_spinner_snack_bridge','current_ordinary_controls'].some(k=>Object.hasOwn(g,k)))return false;
 if(g.mixin!==plan.mixin||g.variant!==plan.variant||g.call!==plan.call||g.css!==g.actual_measurement?.css||g.sha256!==g.actual_measurement?.css_sha256)return false;const wrong=g.css+'\n.wrong-nonempty-mixin { color: red; }\n';if(!isDeepStrictEqual(g.mutation,{css:wrong,css_sha256:hash(wrong),css_bytes:Buffer.byteLength(wrong)}))return false;return directMatch(s,{caseId:v.caseId,original:g.expected,actual:g.actual_measurement,identity:g.identity,descriptor:g.current_ordinary_card});});}
/** Only referenceObserver's already-authenticated untouched16 environment belongs here. */
export function measureOrdinaryCardDefaultReferences(args={}){
 const captured=captureArgs(args,['sass','referenceEntry','referenceRoot','identity']);let {sass,referenceEntry,referenceRoot,identity}=captured.values;
 const pinned=ref=>{const bytes=readFileSync(new URL('../'+ref.path,import.meta.url));assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);return JSON.parse(bytes);};
 const oracle=pinned(packet.oracle),catalog=pinned(packet.catalog),provenance=pinned(packet.provenance),lock=pinned(packet.reference_lock),identitySnapshot=plain(identity),slots=compilerSlots(sass),compiler=slots.info.value,compile=slots.compileString.value;assert.equal(sass,trustedCompiler,'reference observer requires the pinned local Sass module');assert.equal(compiler,trustedInfo);assert.equal(compile,trustedCompile);assert.equal(typeof compile,'function');assert.ok(Object.values(packet.branches).some(branch=>branch.compiler===compiler));
 const expectedIdentity={material_version:'16.2.14',material_manifest_sha256:provenance.isolated_environment.material_manifest_sha256,lock_sha256:packet.reference_lock.sha256,material_integrity:lock.packages['node_modules/@angular/material'].integrity,expected_source:'untouched-installed-material16',candidate_source:'packed-facade',sass_version:compiler};
 for(const[k,v]of Object.entries(expectedIdentity))assert.equal(identitySnapshot[k],v);
 referenceRoot=realpathSync(referenceRoot);referenceEntry=realpathSync(referenceEntry);const index=readFileSync(referenceEntry);assert.equal(hash(index),catalog.original_entry_identity.sha256);assert.equal(index.length,catalog.original_entry_identity.bytes);assert.equal(relative(referenceRoot,referenceEntry).replaceAll('\\','/'),catalog.original_entry_identity.path);
 const results={};
 for(const id of ORDINARY_CARD_DEFAULT_CASES){const row=planFor(id,oracle,catalog),program="@use '__entry__' as m;\n"+oracle.standard_theme+'\n'+row.call+'\n';assert.equal(hash(program),row.program_sha256);
  const measured=Reflect.apply(compile,sass,[program.replace("'__entry__'",JSON.stringify(pathToFileURL(referenceEntry).href)),{loadPaths:[referenceRoot],style:'expanded',silenceDeprecations:['if-function','global-builtin','color-functions','import'],logger:{warn(){},debug(){}}}]);
  assert.ok(Array.isArray(measured.loadedUrls)&&measured.loadedUrls.every(url=>url.protocol==='file:'));
  const sources=measured.loadedUrls.filter(url=>url.protocol==='file:').map(url=>{const path=realpathSync(fileURLToPath(url)),rel=relative(referenceRoot,path).replaceAll('\\','/');assert.ok(rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../'));const bytes=readFileSync(path);return {root:0,path:rel,sha256:hash(bytes),bytes:bytes.length};}).sort(order);
  const expected={css:measured.css,css_sha256:hash(measured.css),css_bytes:Buffer.byteLength(measured.css),program_sha256:hash(program),sources};assert.ok(measurement(expected)&&sourcesOk(sources));assert.equal(expected.css_sha256,oracle.members.mixins[row.mixin].invocation.css_sha256);assert.equal(expected.css_bytes,oracle.members.mixins[row.mixin].invocation.css_bytes);
  results[id]={expected,identity:{...expectedIdentity,catalog:packet.oracle.path,catalog_sha256:packet.oracle.sha256},mixin:row.mixin,variant:row.variant,call:row.call};
 }
 assert.deepEqual(plain(identity),identitySnapshot);sameCompilerSlots(sass,slots);sameArgs(captured);referenceRuns.set(results,plain(results));return results;
}
export function attachOrdinaryCardDefaultReferences(args={}){
 const captured=captureArgs(args,['context','css','references']),{context,css,references}=captured.values;
 const retained=referenceRuns.get(references);assert.ok(retained,'defaults require the real reference measurement routine');assert.deepEqual(plain(references),retained);const candidate=plain(css),s=state(context);s.assertCurrent();
 const out={...candidate};for(const id of ORDINARY_CARD_DEFAULT_CASES){const name=id.slice(10),got=out[name];assert.ok(got?.actual_measurement);const wrong=got.css+'\n.wrong-nonempty-mixin { color: red; }\n';out[name]={...got,...structuredClone(retained[id]),comparison:ORDINARY_CARD_CONTRACT,error:null,mutation:{css:wrong,css_sha256:hash(wrong),css_bytes:Buffer.byteLength(wrong)},mutation_rejected:!directMatch(s,{caseId:id,original:retained[id].expected,actual:{...got.actual_measurement,css:wrong,css_sha256:hash(wrong),css_bytes:Buffer.byteLength(wrong)},identity:retained[id].identity,descriptor:got.current_ordinary_card})};}
 s.assertCurrent();sameArgs(captured);assert.deepEqual(plain(references),retained);assert.deepEqual(plain(css),candidate);s.assertPhysical();return out;
}
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>canonical(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));}
/** Same finite CSS relationship under the complete original packed assertion envelope. */
export function ordinaryCardGateAssertionOk(args={}){
 return guarded(args,['body','active','invocation'],(v,s)=>{
  const b=v.body,a=v.active,id=b.case_id,plan=s.plans.get(id);if(!plan)return false;
  const envelope={kind:'assertion',check_id:'sass-seal',group:'sass-api-and-values',result:'pass',exit_code:0,line:s.line,run_id:a.manifest.run_id,invocation_id:v.invocation,binding:a.binding,error:null,mutation_rejected:true,comparison:ORDINARY_CARD_CONTRACT};
  for(const [key,value]of Object.entries(envelope))if(!isDeepStrictEqual(b[key],value))return false;
  if(['current_companion','current_spinner_snack_bridge','current_infrastructure','current_peer_alias','current_ordinary_controls'].some(k=>Object.hasOwn(b,k)))return false;
  if(a.binding.source_line!==s.line||a.manifest.source.line!==s.line||a.binding.run_id!==a.manifest.run_id||typeof a.manifest.run_id!=='string'||!a.manifest.run_id||typeof v.invocation!=='string'||!v.invocation)return false;
  for(const [key,name]of [['source_commit','commit'],['source_tree','git_tree_sha'],['source_content_sha256','content_sha256']])if(a.binding[key]!==a.manifest.source[name]||!(key==='source_content_sha256'?/^[0-9a-f]{64}$/:/^[0-9a-f]{40}$/).test(a.binding[key]))return false;
  if(a.binding.artifacts_sha256!==hash(canonical(a.manifest.artifacts)))return false;const library=a.manifest.artifacts.filter(r=>r.id==='library');if(library.length!==1||!/^[0-9a-f]{64}$/.test(library[0].sha256)||b.tarball_sha256!==library[0].sha256)return false;
  if(!directMatch(s,{caseId:id,original:b.expected,actual:b.actual,identity:b.identity,descriptor:b.current_ordinary_card}))return false;
  if(['mixin','variant','call'].some(k=>b[k]!==plan[k]))return false;
  if(ORDINARY_CARD_DEFAULT_CASES.includes(id)){const inv=s.oracle.members.mixins[plan.mixin].invocation;if(b.oracle!==packet.oracle.path||b.oracle_sha256!==packet.oracle.sha256||b.expected_sha256!==b.expected.css_sha256||b.expected_sha256!==inv.css_sha256||!Number.isSafeInteger(b.expected_bytes)||b.expected_bytes!==b.expected.css_bytes||b.expected_bytes!==inv.css_bytes||b.actual_sha256!==b.actual.css_sha256||!Number.isSafeInteger(b.actual_bytes)||b.actual_bytes!==b.actual.css_bytes||!isDeepStrictEqual(b.actual_measurement,b.actual))return false;}
  else{const original=s.catalog.cases.find(r=>r.case_id===id);if(Object.entries(original).some(([k,x])=>!isDeepStrictEqual(b[k],x)))return false;}
  const wrong=b.actual.css+'\n.wrong-nonempty-mixin { color: red; }\n';return isDeepStrictEqual(b.mutation,{css:wrong,css_sha256:hash(wrong),css_bytes:Buffer.byteLength(wrong)});
 });
}
