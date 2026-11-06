/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite gate composition. Candidate CSS is always compared in its original form. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual,types} from 'node:util';
import {SPINNER_SNACK_BRIDGE_CASES,SPINNER_SNACK_BRIDGE_CONTRACT,spinnerSnackBridgeResultsMatch} from './sass-spinner-snack-bridge-contract.mjs';
import {createCurrentSpinnerSnackContract} from './current-sass-spinner-snack-contract.mjs';
import {SPINNER_SNACK_AGGREGATE_CASES,insertSpinnerSnackIntoAggregateModel} from './sass-spinner-snack-aggregate-contract.mjs';
import {insertOrdinaryCheckboxButtonIntoAggregateModel} from './sass-ordinary-aggregate-contract.mjs';
import {insertCardIntoAggregateModel} from './current-sass-card-aggregate-contract.mjs';
import {DEFAULT_AGGREGATE_CONTRACT,defaultAggregateExpectedCss,defaultAggregateMeasurementOk} from './sass-default-aggregate-contract.mjs';
import {aggregateColorThemeExpectedCss} from './sass-aggregate-color-theme-contract.mjs';
import {aggregateTypographyExpectedCss} from './sass-aggregate-typography-contract.mjs';
import {rippleColorMeasurementOkay} from './sass-ripple-color-contract.mjs';

const SELF='scripts/sass-spinner-snack-gate-integration.mjs',INPUTS='compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json';
const hash=b=>createHash('sha256').update(b).digest('hex'),image=readFileSync(fileURLToPath(import.meta.url));
const raw=readFileSync(new URL('../'+INPUTS,import.meta.url));assert.equal(hash(raw),'fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8');
const packet=JSON.parse(raw),contexts=new WeakMap(),referenceRuns=new WeakMap();
const dependencies=[
 ['scripts/current-sass-spinner-snack-contract.mjs','1460552c5787a120e5f42c1cb2a85cedcd5cfeef25dc78a84daaceb09eb4c777'],
 ['scripts/sass-spinner-snack-bridge-contract.mjs','5fe7386872355fa2261856a64392433b29e332d40446c4c03a95db4a5d36ba46'],
 ['scripts/sass-spinner-snack-aggregate-contract.mjs','2e5a955774961793e0578fd17e6d47ce5d72fe8d60a5f56daa442ab5528bc4c0'],
 ['scripts/current-sass-card-aggregate-contract.mjs','02208408e559bca7f99e73b75ad060d2a96a51deab8f26ed515a8ff6a4bd2b0c'],
 ['compatibility/rc/ordinary-card-public-bridge-model-v1.mjs','0286969a007029a3628d8a56fb17c0ee2bbfecec735abdf5d95911ac7c709a83'],
 ['scripts/sass-ordinary-aggregate-contract.mjs','a83fe3f31fab8e4973f4d8eeed303e51bb0dd44f0a2ba64d6d1f6739bd60e2d6'],
 ['compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs','f094e84d2ce8a3f36aab239eb0d30940da976072a85ca0edcf29b8afb6dc9fb0'],
 ['scripts/sass-default-aggregate-contract.mjs','fbdf6b2bf55518a2d9be62aaf5bce95edbd679bce842bd20601c57669bb63cfc'],
 ['scripts/sass-aggregate-color-theme-contract.mjs','68d0aae9a0314ab49b82f63638a30661638bbd840487b1409da5ea62a03efef0'],
 ['scripts/sass-aggregate-typography-contract.mjs','db5ec59660647a5590302253925212e1688b4ee3eab1714b5b20c26c0844548a'],
 ['scripts/sass-ripple-color-contract.mjs','92e7173b0db32bdf88f7597c9d986168c3b094ee5e655c379fcab7cafbc310ef'],
];
export const SPINNER_SNACK_GATE_CASES=Object.freeze([...SPINNER_SNACK_BRIDGE_CASES,...SPINNER_SNACK_AGGREGATE_CASES]);
export const SPINNER_SNACK_DEFAULT_CASES=Object.freeze(SPINNER_SNACK_BRIDGE_CASES.filter(id=>id.startsWith('mixin-css/')));
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
 return {read,assertPhysical};
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
 try{const captured=captureArgs(args,['context',...fields]),s=state(captured.values.context),incoming=payload(captured,fields,defaults),snapshot=plain(incoming);s.assertCurrent();const result=operation(snapshot,s);s.assertCurrent();sameArgs(captured);assert.deepEqual(plain(incoming),snapshot,'gate metadata changed during source guards');s.assertPhysical();return result;}catch{return false;}
}
export function createSpinnerSnackGateContext(args={}){
 const captured=captureArgs(args,['root','read']);let {root=process.cwd(),read}=captured.values;
 root=resolve(root);const boundary=physicalBoundary(root,read);read=boundary.read;const source=createCurrentSpinnerSnackContract({root,read}),line=source.line,branch=packet.branches[line];
 const assertCurrent=()=>{source.assertCurrent();assert.ok(tool(root,SELF,read).equals(image));for(const[path,sha256]of dependencies)assert.equal(hash(tool(root,path,read)),sha256);source.assertCurrent();boundary.assertPhysical();};
 const oracle=JSON.parse(readFileSync(join(root,packet.oracle.path))),catalog=JSON.parse(readFileSync(join(root,packet.catalog.path))),provenance=JSON.parse(readFileSync(join(root,packet.provenance.path))),lock=JSON.parse(readFileSync(join(root,packet.reference_lock.path)));
 const sets=Object.values(source.source_sets);assert.equal(sets.length,1);const currentSources=plain(sets[0]);
 const descriptor=plain(source.descriptor);
 const plans=new Map(branch.cases.map(row=>[row.case_id,row]));
 for(const id of SPINNER_SNACK_AGGREGATE_CASES){const isDefault=id.startsWith('mixin-css/'),mixin=isDefault?id.slice(10):id.split('/')[1],probe=isDefault?{call:'.sass-api-probe { @include m.'+mixin+'('+(mixin.endsWith('typographies')?'':'$__theme')+'); }'}:catalog.cases.find(p=>p.case_id===id);assert.ok(probe);plans.set(id,{...probe,mixin,program_sha256:hash("@use '__entry__' as m;\n"+(isDefault?oracle.standard_theme:catalog.setup)+'\n'+probe.call+'\n')});}
 const context=Object.freeze({line,assertCurrent,source_scope_only:true,gate_or_artifact_admission_granted:false});
 contexts.set(context,{root,line,source,assertCurrent,assertPhysical:boundary.assertPhysical,descriptor:plain(descriptor),currentSources,plans,oracle,catalog,provenance,lock,branch});assertCurrent();sameArgs(captured);boundary.assertPhysical();return context;
}
export function spinnerSnackGateDescriptor(context){const s=state(context);s.assertCurrent();const descriptor=structuredClone(s.descriptor);s.assertPhysical();return descriptor;}
function currentMeasurement(s,id,m){const plan=s.plans.get(id);return Boolean(plan&&measurement(m)&&m.program_sha256===plan.program_sha256&&(!Object.hasOwn(m,'line')||m.line===s.line)&&(!Object.hasOwn(m,'sass_version')||m.sass_version===s.branch.compiler)&&sourcesOk(m.sources)&&isDeepStrictEqual([...m.sources].sort(order),s.currentSources));}
export function spinnerSnackGateMeasurementOk(args={}){return guarded(args,['caseId','actual'],(v,s)=>currentMeasurement(s,v.caseId,v.actual));}
function originalIdentity(s,id){const def=id.startsWith('mixin-css/');return {material_version:'16.2.14',material_manifest_sha256:s.provenance.isolated_environment.material_manifest_sha256,lock_sha256:packet.reference_lock.sha256,material_integrity:s.lock.packages['node_modules/@angular/material'].integrity,catalog:packet[def?'oracle':'catalog'].path,catalog_sha256:packet[def?'oracle':'catalog'].sha256,expected_source:'untouched-installed-material16',candidate_source:'packed-facade',sass_version:s.branch.compiler};}
function originalMeasurement(s,id,m){return measurement(m)&&m.program_sha256===s.plans.get(id)?.program_sha256&&sourcesOk(m.sources)&&m.sources.every(r=>r.root===0)&&m.sources.some(r=>isDeepStrictEqual(r,{root:0,...s.catalog.original_entry_identity}));}
function directMatch(s,v){return SPINNER_SNACK_BRIDGE_CASES.includes(v.caseId)&&currentMeasurement(s,v.caseId,v.actual)&&originalMeasurement(s,v.caseId,v.original)&&isDeepStrictEqual(v.identity,originalIdentity(s,v.caseId))&&isDeepStrictEqual(v.descriptor,s.descriptor)&&spinnerSnackBridgeResultsMatch({caseId:v.caseId,line:s.line,original:v.original,actual:v.actual});}
export function spinnerSnackGateDirectMatch(args={}){
 return guarded(args,['caseId','original','actual','identity','descriptor'],(v,s)=>directMatch(s,v));
}
export function spinnerSnackGateDefaultMatch(args={}){
 return guarded(args,['caseId','got'],(v,s)=>{
  const g=v.got,plan=s.plans.get(v.caseId);if(!SPINNER_SNACK_DEFAULT_CASES.includes(v.caseId)||!plan||g.comparison!==SPINNER_SNACK_BRIDGE_CONTRACT||g.error!==null||g.mutation_rejected!==true||['current_companion','current_infrastructure','current_peer_alias'].some(k=>Object.hasOwn(g,k)))return false;
  if(g.mixin!==plan.mixin||g.variant!==plan.variant||g.call!==plan.call||g.css!==g.actual_measurement?.css||g.sha256!==g.actual_measurement?.css_sha256)return false;
  const wrong=g.css+'\n.wrong-nonempty-mixin { color: red; }\n';if(!isDeepStrictEqual(g.mutation,{css:wrong,css_sha256:hash(wrong),css_bytes:Buffer.byteLength(wrong)}))return false;
  return directMatch(s,{caseId:v.caseId,original:g.expected,actual:g.actual_measurement,identity:g.identity,descriptor:g.current_spinner_snack_bridge});
 });
}
export function spinnerSnackGateAggregateMatch(args={}){
 return guarded(args,['caseId','original','actual','companion','descriptor'],(v,s)=>{
  if(!SPINNER_SNACK_AGGREGATE_CASES.includes(v.caseId)||!currentMeasurement(s,v.caseId,v.actual)||!isDeepStrictEqual(v.descriptor,s.descriptor)||v.companion?.classification!=='conforming-current-companion'||v.companion.peer?.line!==s.line)return false;
  let before;
  if(v.caseId.startsWith('mixin-css/')){if(v.companion.contract!==DEFAULT_AGGREGATE_CONTRACT||!defaultAggregateMeasurementOk(v.caseId,v.actual,s.line))return false;before=defaultAggregateExpectedCss(v.caseId,v.companion.peer);}
  else if(v.caseId.includes('all-component-typographies')){if(v.companion.contract!=='historical-typography-aggregate-with-qualified-members'||!originalMeasurement(s,v.caseId,v.original))return false;before=aggregateTypographyExpectedCss(v.caseId,v.original,v.companion.peer);}
  else{if(v.companion.contract!=='historical-color-theme-aggregate-with-qualified-members'||!originalMeasurement(s,v.caseId,v.original)||!rippleColorMeasurementOkay(v.caseId,v.actual,s.line))return false;before=aggregateColorThemeExpectedCss(v.caseId,v.original,v.companion.peer);}
  if(before===null)return false;const spinnerSnack=insertSpinnerSnackIntoAggregateModel({caseId:v.caseId,css:before});if(spinnerSnack===null)return false;
  const ordinary=insertOrdinaryCheckboxButtonIntoAggregateModel({caseId:v.caseId,css:spinnerSnack});if(ordinary===null)return false;
  const expected=insertCardIntoAggregateModel({caseId:v.caseId,css:ordinary});return expected!==null&&v.actual.css===expected;
 },{original:null});
}
/** Only referenceObserver's already-authenticated untouched16 environment belongs here. */
export function measureSpinnerSnackDefaultReferences(args={}){
 const captured=captureArgs(args,['sass','referenceEntry','referenceRoot','identity']);let {sass,referenceEntry,referenceRoot,identity}=captured.values;
 const pinned=ref=>{const bytes=readFileSync(new URL('../'+ref.path,import.meta.url));assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);return JSON.parse(bytes);};
 const oracle=pinned(packet.oracle),catalog=pinned(packet.catalog),provenance=pinned(packet.provenance),lock=pinned(packet.reference_lock),identitySnapshot=plain(identity),slots=compilerSlots(sass),compiler=slots.info.value,compile=slots.compileString.value;assert.equal(typeof compile,'function');assert.ok(Object.values(packet.branches).some(branch=>branch.compiler===compiler));
 const expectedIdentity={material_version:'16.2.14',material_manifest_sha256:provenance.isolated_environment.material_manifest_sha256,lock_sha256:packet.reference_lock.sha256,material_integrity:lock.packages['node_modules/@angular/material'].integrity,expected_source:'untouched-installed-material16',candidate_source:'packed-facade',sass_version:compiler};
 for(const[k,v]of Object.entries(expectedIdentity))assert.equal(identitySnapshot[k],v);
 referenceRoot=realpathSync(referenceRoot);referenceEntry=realpathSync(referenceEntry);const index=readFileSync(referenceEntry);assert.equal(hash(index),catalog.original_entry_identity.sha256);assert.equal(index.length,catalog.original_entry_identity.bytes);assert.equal(relative(referenceRoot,referenceEntry).replaceAll('\\','/'),catalog.original_entry_identity.path);
 const results={};
 for(const id of SPINNER_SNACK_DEFAULT_CASES){const row=packet.branches['21.x'].cases.find(r=>r.case_id===id),program="@use '__entry__' as m;\n"+oracle.standard_theme+'\n'+row.call+'\n';assert.equal(hash(program),row.program_sha256);
  const measured=Reflect.apply(compile,sass,[program.replace("'__entry__'",JSON.stringify(pathToFileURL(referenceEntry).href)),{loadPaths:[referenceRoot],style:'expanded',silenceDeprecations:['if-function','global-builtin','color-functions','import'],logger:{warn(){},debug(){}}}]);
  assert.ok(Array.isArray(measured.loadedUrls)&&measured.loadedUrls.every(url=>url.protocol==='file:'));
  const sources=measured.loadedUrls.filter(url=>url.protocol==='file:').map(url=>{const path=realpathSync(fileURLToPath(url)),rel=relative(referenceRoot,path).replaceAll('\\','/');assert.ok(rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../'));const bytes=readFileSync(path);return {root:0,path:rel,sha256:hash(bytes),bytes:bytes.length};}).sort(order);
  const expected={css:measured.css,css_sha256:hash(measured.css),css_bytes:Buffer.byteLength(measured.css),program_sha256:hash(program),sources};assert.ok(measurement(expected)&&sourcesOk(sources));assert.equal(expected.css_sha256,oracle.members.mixins[row.mixin].invocation.css_sha256);assert.equal(expected.css_bytes,oracle.members.mixins[row.mixin].invocation.css_bytes);
  results[id]={expected,identity:{...expectedIdentity,catalog:packet.oracle.path,catalog_sha256:packet.oracle.sha256},mixin:row.mixin,variant:row.variant,call:row.call};
 }
 assert.deepEqual(plain(identity),identitySnapshot);sameCompilerSlots(sass,slots);sameArgs(captured);referenceRuns.set(results,plain(results));return results;
}
export function attachSpinnerSnackDefaultReferences(args={}){
 const captured=captureArgs(args,['context','css','references']),{context,css,references}=captured.values;
 const retained=referenceRuns.get(references);assert.ok(retained,'defaults require the real reference measurement routine');assert.deepEqual(plain(references),retained);const candidate=plain(css),s=state(context);s.assertCurrent();
 const out={...candidate};for(const id of SPINNER_SNACK_DEFAULT_CASES){const name=id.slice(10),got=out[name];assert.ok(got?.actual_measurement);const wrong=got.css+'\n.wrong-nonempty-mixin { color: red; }\n';out[name]={...got,...structuredClone(retained[id]),comparison:SPINNER_SNACK_BRIDGE_CONTRACT,error:null,mutation:{css:wrong,css_sha256:hash(wrong),css_bytes:Buffer.byteLength(wrong)},mutation_rejected:!spinnerSnackBridgeResultsMatch({caseId:id,line:s.line,original:retained[id].expected,actual:{css:wrong,css_sha256:hash(wrong),css_bytes:Buffer.byteLength(wrong)}})};}
 s.assertCurrent();sameArgs(captured);assert.deepEqual(plain(references),retained);assert.deepEqual(plain(css),candidate);s.assertPhysical();return out;
}
