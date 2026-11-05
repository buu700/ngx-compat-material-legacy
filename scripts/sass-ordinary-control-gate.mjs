/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite gate composition. Candidate CSS is always compared in its original form. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual,types} from 'node:util';
import {ORDINARY_CHECKBOX_BUTTON_CASES,ordinaryCheckboxButtonExpectedCss,ordinaryCheckboxButtonResultsMatch} from '../compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs';
import {LEGACY_DATEPICKER_BUTTON_CASES,legacyDatepickerButtonExpectedCss} from '../compatibility/rc/ordinary-checkbox-button-legacy-composition-model-v1.mjs';
import {createCurrentSpinnerSnackContract} from './current-sass-spinner-snack-contract.mjs';
import {aggregateDensityExpectedCss} from './sass-aggregate-density-contract.mjs';
import {DEFAULT_AGGREGATE_CONTRACT,defaultAggregateExpectedCss,defaultAggregateMeasurementOk} from './sass-default-aggregate-contract.mjs';
import {aggregateColorThemeExpectedCss} from './sass-aggregate-color-theme-contract.mjs';
import {aggregateTypographyExpectedCss} from './sass-aggregate-typography-contract.mjs';
import {rippleColorMeasurementOkay,rippleColorExpectedCss,RIPPLE_COLOR_OWNED_CASES,RIPPLE_COLOR_CONTRACT} from './sass-ripple-color-contract.mjs';

const SELF='scripts/sass-ordinary-control-gate.mjs',INPUTS='compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json';
const hash=b=>createHash('sha256').update(b).digest('hex'),image=readFileSync(fileURLToPath(import.meta.url));
const trustedCompiler=createRequire(import.meta.url)('sass'),trustedInfo=trustedCompiler.info,trustedCompile=trustedCompiler.compileString;
const raw=readFileSync(new URL('../'+INPUTS,import.meta.url));assert.equal(hash(raw),'fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8');
const ownedRaw=readFileSync(new URL('../fixtures/sass/owned-aggregate-contracts.json',import.meta.url));assert.equal(hash(ownedRaw),'b83f5ee9e898004e2fce2ae49719dbed923dd2b5eabf06f3f463a8ad33f24c7a');const owned=JSON.parse(ownedRaw);assert.equal(owned.cases.length,20);
const packet=JSON.parse(raw),contexts=new WeakMap(),referenceRuns=new WeakMap();
const dependencies=[
 ['scripts/current-sass-spinner-snack-contract.mjs','1d826e445dcd35f19d3bc5529f54248966cb3151833f5e7319badf904881e3e7'],
 ['compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs','f094e84d2ce8a3f36aab239eb0d30940da976072a85ca0edcf29b8afb6dc9fb0'],
 ['compatibility/rc/ordinary-checkbox-button-legacy-composition-model-v1.mjs','2b136425698aa80d0ae368f74968fff94267d40b612b00b0bfba5577763a0692'],
 ['compatibility/rc/ordinary-checkbox-button-legacy-composition-cases-v1.json','8f4186d34848a0f298170c2124bbb727ff31a3995a1e8f041ab05476ffe1125d'],
 ['compatibility/rc/ordinary-checkbox-button-legacy-composition-known-before-v1.json','3e96bf8c73dc35d1cb9d132c74f69b6f91ee7d22b19b185cf3540d68d3cb9f43'],
 ['scripts/sass-default-aggregate-contract.mjs','8f7d599e4187a94e66670015cd3f0e28a223209d887b9481727d1a60d9a2303a'],
 ['scripts/sass-aggregate-color-theme-contract.mjs','7d883b820a7ff2f5eb98e49fdab72d4306b6370605902b3bf71e7bd2d8e362ec'],
 ['scripts/sass-aggregate-typography-contract.mjs','77ac326df5c2fa3b9cf3f08ea1fb400761f750502015c9c724a9b2436bb49b11'],
 ['scripts/sass-aggregate-density-contract.mjs','99ac7674aecf5bd4204c3c418e25dd7cf2d4329fe07fd7803dddeda0050cc090'],
 ['scripts/sass-ripple-color-contract.mjs','92e7173b0db32bdf88f7597c9d986168c3b094ee5e655c379fcab7cafbc310ef'],
 ['fixtures/sass/owned-aggregate-contracts.json','b83f5ee9e898004e2fce2ae49719dbed923dd2b5eabf06f3f463a8ad33f24c7a'],
 ['reference/material-16.2.14/owned-aggregate-membership.scss','bcc15a0593fe733501d6d1c002dc706c79fe1ba66d7d26dd072d69681ebfe63f'],
];
export const ORDINARY_CONTROL_CONTRACT='historical-ordinary-controls-with-positioned-public-tokens';
export const ORDINARY_CONTROL_GATE_CASES=Object.freeze([...ORDINARY_CHECKBOX_BUTTON_CASES,...LEGACY_DATEPICKER_BUTTON_CASES]);
export const ORDINARY_CONTROL_DEFAULT_CASES=Object.freeze(ORDINARY_CONTROL_GATE_CASES.filter(id=>id.startsWith('mixin-css/')));
assert.equal(ORDINARY_CONTROL_GATE_CASES.length,65);assert.equal(ORDINARY_CONTROL_DEFAULT_CASES.length,15);
function planFor(id,oracle,catalog){
 if(!ORDINARY_CONTROL_GATE_CASES.includes(id))return null;
 if(id.startsWith('owned-aggregate/')){const row=owned.cases.find(r=>r.case_id===id);assert.ok(row);return {...row,program_sha256:hash("@use '__entry__' as m;\n"+owned.setup+'\n'+row.call+'\n'),reference_program_sha256:hash("@use '__entry__' as m;\n"+owned.setup+'\n'+row.reference_call+'\n')};}
 const def=id.startsWith('mixin-css/'),mixin=id.split('/')[1];let row;
 if(def){const params=oracle.members.mixins[mixin].params,required=params.filter(p=>p.default===null);assert.ok(required.every(p=>['theme','config','config-or-theme','theme-or-color-config'].includes(p.name)));row={mixin,variant:'default',call:'.sass-api-probe { @include m.'+mixin+'('+required.map(()=>'$__theme').join(', ')+'); }'};}
 else{row=catalog.cases.find(r=>r.case_id===id);assert.ok(row);}
 return {...row,program_sha256:hash("@use '__entry__' as m;\n"+(def?oracle.standard_theme:catalog.setup)+'\n'+row.call+'\n')};
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
 try{const captured=captureArgs(args,['context',...fields]),s=state(captured.values.context),incoming=payload(captured,fields,defaults),snapshot=plain(incoming);const result=operation(snapshot,s);if(result!==true)return false;s.assertCurrent();sameArgs(captured);assert.deepEqual(plain(incoming),snapshot,'gate metadata changed during source guards');s.assertPhysical();return result;}catch{return false;}
}
export function createOrdinaryControlGateContext(args={}){
 const captured=captureArgs(args,['root','read']);let {root=process.cwd(),read}=captured.values;
 root=resolve(root);const boundary=physicalBoundary(root,read);read=boundary.read;const source=createCurrentSpinnerSnackContract({root,read}),line=source.line,branch=packet.branches[line];
 const assertCurrent=()=>{source.assertCurrent();assert.ok(tool(root,SELF,read).equals(image));for(const[path,sha256]of dependencies)assert.equal(hash(tool(root,path,read)),sha256);source.assertCurrent();boundary.assertPhysical();};
 const oracle=JSON.parse(readFileSync(join(root,packet.oracle.path))),catalog=JSON.parse(readFileSync(join(root,packet.catalog.path))),provenance=JSON.parse(readFileSync(join(root,packet.provenance.path))),lock=JSON.parse(readFileSync(join(root,packet.reference_lock.path)));
 const sets=Object.values(source.source_sets);assert.equal(sets.length,1);const currentSources=plain(sets[0]);
 const descriptor=plain(source.descriptor);
 const plans=new Map(ORDINARY_CONTROL_GATE_CASES.map(id=>[id,planFor(id,oracle,catalog)]));
 const ordinaryDescriptor={contract:ORDINARY_CONTROL_CONTRACT,source:descriptor,case_ids:[...ORDINARY_CONTROL_GATE_CASES],models:dependencies.slice(1,5).map(([path,sha256])=>({path,sha256}))};
 const context=Object.freeze({line,assertCurrent,source_scope_only:true,gate_or_artifact_admission_granted:false});
 contexts.set(context,{root,line,source,assertCurrent,assertPhysical:boundary.assertPhysical,descriptor:plain(ordinaryDescriptor),currentSources,plans,oracle,catalog,provenance,lock,branch});assertCurrent();sameArgs(captured);boundary.assertPhysical();return context;
}
export function ordinaryControlGateDescriptor(context){const s=state(context);s.assertCurrent();const descriptor=structuredClone(s.descriptor);s.assertPhysical();return descriptor;}
function currentMeasurement(s,id,m){const plan=s.plans.get(id);return Boolean(plan&&measurement(m)&&m.program_sha256===plan.program_sha256&&(!Object.hasOwn(m,'line')||m.line===s.line)&&(!Object.hasOwn(m,'sass_version')||m.sass_version===s.branch.compiler)&&sourcesOk(m.sources)&&isDeepStrictEqual([...m.sources].sort(order),s.currentSources));}
export function ordinaryControlGateMeasurementOk(args={}){return guarded(args,['caseId','actual'],(v,s)=>currentMeasurement(s,v.caseId,v.actual));}
function originalIdentity(s,id){const def=id.startsWith('mixin-css/'),isOwned=id.startsWith('owned-aggregate/');return {material_version:'16.2.14',material_manifest_sha256:s.provenance.isolated_environment.material_manifest_sha256,lock_sha256:packet.reference_lock.sha256,material_integrity:s.lock.packages['node_modules/@angular/material'].integrity,catalog:isOwned?'fixtures/sass/owned-aggregate-contracts.json':packet[def?'oracle':'catalog'].path,catalog_sha256:isOwned?hash(ownedRaw):packet[def?'oracle':'catalog'].sha256,expected_source:'untouched-installed-material16',candidate_source:'packed-facade',sass_version:s.branch.compiler};}
function originalMeasurement(s,id,m){return measurement(m)&&m.program_sha256===(s.plans.get(id)?.reference_program_sha256??s.plans.get(id)?.program_sha256)&&sourcesOk(m.sources)&&m.sources.every(r=>r.root===0)&&m.sources.some(r=>isDeepStrictEqual(r,{root:0,...s.catalog.original_entry_identity}));}
function priorExpected(s,v){
 const id=v.caseId,c=v.companion;
 if(id.startsWith('owned-aggregate/')){let before=v.original.css;if(Object.hasOwn(RIPPLE_COLOR_OWNED_CASES,id)){if(c?.classification!=='conforming-current-companion'||c.contract!==RIPPLE_COLOR_CONTRACT||c.peer?.line!==s.line||!rippleColorMeasurementOkay(id,v.actual,s.line))return null;before=rippleColorExpectedCss(id,v.original,c.peer);}else if(c!==null)return null;return before===null?null:legacyDatepickerButtonExpectedCss({caseId:id,originalCss:before});}
 if(ORDINARY_CHECKBOX_BUTTON_CASES.includes(id)){if(c!==null)return null;return ordinaryCheckboxButtonExpectedCss({caseId:id,originalCss:v.original.css});}
 let before=v.original.css;
 if(id.includes('/all-legacy-component-')||id.includes('/private-all-legacy-component-')){
  if(!c||c.classification!=='conforming-current-companion')return null;
  if(id.startsWith('mixin-css/')){if(c.contract!==DEFAULT_AGGREGATE_CONTRACT||c.peer?.line!==s.line||!defaultAggregateMeasurementOk(id,v.actual,s.line))return null;before=defaultAggregateExpectedCss(id,c.peer);}
  else if(id.includes('typographies')){if(c.contract!=='historical-typography-aggregate-with-qualified-members'||c.peer?.line!==s.line)return null;before=aggregateTypographyExpectedCss(id,v.original,c.peer);}
  else if(id.includes('densities')){if(c.contract!=='historical-density-aggregate-with-qualified-tail')return null;before=aggregateDensityExpectedCss(id,v.original,c.peers);}
  else{if(c.contract!=='historical-color-theme-aggregate-with-qualified-members'||c.peer?.line!==s.line||!rippleColorMeasurementOkay(id,v.actual,s.line))return null;before=aggregateColorThemeExpectedCss(id,v.original,c.peer);}
 }else if(c!==null)return null;
 if(id.includes('/private-all-legacy-component-densities/'))return before;
 if(id==='mixin-css/private-all-legacy-component-densities')return before;
 return before===null?null:legacyDatepickerButtonExpectedCss({caseId:id,originalCss:before});
}
function directMatch(s,v){
 if(!ORDINARY_CONTROL_GATE_CASES.includes(v.caseId)||!currentMeasurement(s,v.caseId,v.actual)||!originalMeasurement(s,v.caseId,v.original)||!isDeepStrictEqual(v.identity,originalIdentity(s,v.caseId))||!isDeepStrictEqual(v.descriptor,s.descriptor))return false;
 if(v.caseId.startsWith('mixin-css/')){const inv=s.oracle.members.mixins[s.plans.get(v.caseId).mixin].invocation;if(v.original.css_sha256!==inv.css_sha256||v.original.css_bytes!==inv.css_bytes)return false;}
 const expected=priorExpected(s,v);return expected!==null&&v.actual.css===expected;
}
export function ordinaryControlGateDirectMatch(args={}){return guarded(args,['caseId','original','actual','identity','descriptor','companion'],(v,s)=>directMatch(s,v),{companion:null});}
export function ordinaryControlGateDefaultMatch(args={}){
 return guarded(args,['caseId','got'],(v,s)=>{const g=v.got,plan=s.plans.get(v.caseId);
  if(!ORDINARY_CONTROL_DEFAULT_CASES.includes(v.caseId)||!plan||g.comparison!==ORDINARY_CONTROL_CONTRACT||g.error!==null||g.mutation_rejected!==true||['current_infrastructure','current_peer_alias','current_spinner_snack_bridge'].some(k=>Object.hasOwn(g,k)))return false;
  if(g.mixin!==plan.mixin||g.variant!==plan.variant||g.call!==plan.call||g.css!==g.actual_measurement?.css||g.sha256!==g.actual_measurement?.css_sha256)return false;
  const wrong=g.css+'\n.wrong-nonempty-mixin { color: red; }\n';if(!isDeepStrictEqual(g.mutation,{css:wrong,css_sha256:hash(wrong),css_bytes:Buffer.byteLength(wrong)}))return false;
  return directMatch(s,{caseId:v.caseId,original:g.expected,actual:g.actual_measurement,identity:g.identity,descriptor:g.current_ordinary_controls,companion:g.current_companion??null});
 });
}
/** Only referenceObserver's already-authenticated untouched16 environment belongs here. */
export function measureOrdinaryControlDefaultReferences(args={}){
 const captured=captureArgs(args,['sass','referenceEntry','referenceRoot','identity']);let {sass,referenceEntry,referenceRoot,identity}=captured.values;
 const pinned=ref=>{const bytes=readFileSync(new URL('../'+ref.path,import.meta.url));assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);return JSON.parse(bytes);};
 const oracle=pinned(packet.oracle),catalog=pinned(packet.catalog),provenance=pinned(packet.provenance),lock=pinned(packet.reference_lock),identitySnapshot=plain(identity),slots=compilerSlots(sass),compiler=slots.info.value,compile=slots.compileString.value;assert.equal(sass,trustedCompiler,'reference observer requires the pinned local Sass module');assert.equal(compiler,trustedInfo);assert.equal(compile,trustedCompile);assert.equal(typeof compile,'function');assert.ok(Object.values(packet.branches).some(branch=>branch.compiler===compiler));
 const expectedIdentity={material_version:'16.2.14',material_manifest_sha256:provenance.isolated_environment.material_manifest_sha256,lock_sha256:packet.reference_lock.sha256,material_integrity:lock.packages['node_modules/@angular/material'].integrity,expected_source:'untouched-installed-material16',candidate_source:'packed-facade',sass_version:compiler};
 for(const[k,v]of Object.entries(expectedIdentity))assert.equal(identitySnapshot[k],v);
 referenceRoot=realpathSync(referenceRoot);referenceEntry=realpathSync(referenceEntry);const index=readFileSync(referenceEntry);assert.equal(hash(index),catalog.original_entry_identity.sha256);assert.equal(index.length,catalog.original_entry_identity.bytes);assert.equal(relative(referenceRoot,referenceEntry).replaceAll('\\','/'),catalog.original_entry_identity.path);
 const results={};
 for(const id of ORDINARY_CONTROL_DEFAULT_CASES){const row=planFor(id,oracle,catalog),program="@use '__entry__' as m;\n"+oracle.standard_theme+'\n'+row.call+'\n';assert.equal(hash(program),row.program_sha256);
  const measured=Reflect.apply(compile,sass,[program.replace("'__entry__'",JSON.stringify(pathToFileURL(referenceEntry).href)),{loadPaths:[referenceRoot],style:'expanded',silenceDeprecations:['if-function','global-builtin','color-functions','import'],logger:{warn(){},debug(){}}}]);
  assert.ok(Array.isArray(measured.loadedUrls)&&measured.loadedUrls.every(url=>url.protocol==='file:'));
  const sources=measured.loadedUrls.filter(url=>url.protocol==='file:').map(url=>{const path=realpathSync(fileURLToPath(url)),rel=relative(referenceRoot,path).replaceAll('\\','/');assert.ok(rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../'));const bytes=readFileSync(path);return {root:0,path:rel,sha256:hash(bytes),bytes:bytes.length};}).sort(order);
  const expected={css:measured.css,css_sha256:hash(measured.css),css_bytes:Buffer.byteLength(measured.css),program_sha256:hash(program),sources};assert.ok(measurement(expected)&&sourcesOk(sources));assert.equal(expected.css_sha256,oracle.members.mixins[row.mixin].invocation.css_sha256);assert.equal(expected.css_bytes,oracle.members.mixins[row.mixin].invocation.css_bytes);
  results[id]={expected,identity:{...expectedIdentity,catalog:packet.oracle.path,catalog_sha256:packet.oracle.sha256},mixin:row.mixin,variant:row.variant,call:row.call};
 }
 assert.deepEqual(plain(identity),identitySnapshot);sameCompilerSlots(sass,slots);sameArgs(captured);referenceRuns.set(results,plain(results));return results;
}
export function attachOrdinaryControlDefaultReferences(args={}){
 const captured=captureArgs(args,['context','css','references']),{context,css,references}=captured.values;
 const retained=referenceRuns.get(references);assert.ok(retained,'defaults require the real reference measurement routine');assert.deepEqual(plain(references),retained);const candidate=plain(css),s=state(context);s.assertCurrent();
 const out={...candidate};for(const id of ORDINARY_CONTROL_DEFAULT_CASES){const name=id.slice(10),got=out[name];assert.ok(got?.actual_measurement);const wrong=got.css+'\n.wrong-nonempty-mixin { color: red; }\n';out[name]={...got,...structuredClone(retained[id]),comparison:ORDINARY_CONTROL_CONTRACT,error:null,mutation:{css:wrong,css_sha256:hash(wrong),css_bytes:Buffer.byteLength(wrong)},mutation_rejected:!directMatch(s,{caseId:id,original:retained[id].expected,actual:{...got.actual_measurement,css:wrong,css_sha256:hash(wrong),css_bytes:Buffer.byteLength(wrong)},identity:retained[id].identity,descriptor:got.current_ordinary_controls,companion:got.current_companion??null})};}
 s.assertCurrent();sameArgs(captured);assert.deepEqual(plain(references),retained);assert.deepEqual(plain(css),candidate);s.assertPhysical();return out;
}
