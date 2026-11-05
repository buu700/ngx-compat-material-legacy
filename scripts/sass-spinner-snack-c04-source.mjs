/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite C04 source references; comparison data never becomes a current reader. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {isAbsolute,join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {createCurrentSassSource} from './current-sass-source.mjs';
import {currentSassToolReferenceSubject} from './current-sass-tool-references.mjs';
import {captureCurrentSassMetadata,currentSassSourceSummary} from './current-sass-inspection-scope.mjs';
import {spinnerSnackPositionedTokenCss} from './sass-spinner-snack-bridge-contract.mjs';
import {currentLegacyRetentionMeasurement} from './current-sass-legacy-retention-css.mjs';
import {ordinaryCardTokenPlacementExpected} from '../compatibility/rc/ordinary-card-c04-successor-model-v1.mjs';
const SELF='scripts/sass-spinner-snack-c04-source.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
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
const CARD_EXPECTATION_INPUTS=[{"path":"compatibility/rc/ordinary-card-c04-successor-model-v1.mjs","sha256":"3252d53cdffc0a1e785e2c832a8f8dacacc132fd8dd715d3706bdcb2a58e3a44","bytes":8714},{"path":"compatibility/rc/ordinary-card-c04-successor-inputs-v1.json","sha256":"0ebb1f81be067cee2bbc2149dd9fd4e9188c4129d1482b40145a1a4893ad9634","bytes":144810},{"path":"compatibility/rc/ordinary-card-public-bridge-model-v1.mjs","sha256":"0286969a007029a3628d8a56fb17c0ee2bbfecec735abdf5d95911ac7c709a83","bytes":3929},{"path":"compatibility/rc/ordinary-card-public-bridge-model-v2.mjs","sha256":"171a32edcc51d651173d52840da6a4cdcdf4bb4280b3e717ab96419714f013ad","bytes":4036},{"path":"compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json","sha256":"59e47c924f0f541b7b262a9ee31f6e55bc4160c1c420f683247a1703be470bbf","bytes":127815},{"path":"compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs","sha256":"f094e84d2ce8a3f36aab239eb0d30940da976072a85ca0edcf29b8afb6dc9fb0","bytes":13313}];
const states=new WeakMap();
function argumentsSnapshot(args,allowed){
 assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(args),values={};
 for(const key of Reflect.ownKeys(descriptors)){assert.equal(typeof key,'string');assert.ok(allowed.includes(key));const d=descriptors[key];assert.ok(Object.hasOwn(d,'value')&&d.enumerable);Object.defineProperty(values,key,{value:d.value,enumerable:true});}
 return {args,allowed,descriptors,values};
}
function sameArguments(before){
 const after=argumentsSnapshot(before.args,before.allowed);assert.deepEqual(Reflect.ownKeys(after.descriptors),Reflect.ownKeys(before.descriptors));
 for(const key of Reflect.ownKeys(before.descriptors)){assert.equal(after.descriptors[key].value,before.descriptors[key].value);for(const flag of ['enumerable','writable','configurable'])assert.equal(after.descriptors[key][flag],before.descriptors[key][flag]);}
}
const REPORTS={
 'theming-inspection':{path:'compatibility/rc/21x-c04-theming-inspection-source-review.json',sha256:'55d2533ffe204f9e589cc82fd78d66dd286d31f89769573d71cbb1d8425687d2',bytes:133530},
 'inspection-compatibility':{path:'compatibility/rc/21x-c04-inspection-compatibility-source-review.json',sha256:'852cf937178ada91b0c604d349cf214cd810266af6118122c19e0dd534c55118',bytes:135386},
 'control-m3-theme':{path:'compatibility/rc/21x-c04-control-m3-theme-source-review.json',sha256:'69df54b7474b863fc9e1db8f1017217d7289072f4272d20f57ea21391df51fd6',bytes:1852529},
 'remaining-unthemable':{path:'compatibility/rc/21x-c04-remaining-unthemable-source-review.json.gz',sha256:'c25b0a59e7bbe5e63eebc3068a84eb010e9e558d021770de22b81d669380e31b',bytes:1824722},
};
export const SPINNER_SNACK_CONTROL_CASE_IDS=Object.freeze([
 'progress-spinner-color/custom-full-theme','progress-spinner-color/raw-color-config',
 'progress-spinner-theme/custom-full-theme','progress-spinner-theme/custom-dark-theme',
 'snack-bar-color/custom-full-theme','snack-bar-color/raw-color-config',
 'snack-bar-theme/custom-full-theme','snack-bar-theme/custom-dark-theme',
 'snack-bar-typography/custom-full-theme','snack-bar-typography/raw-typography-config',
].map(id=>'mixin-argument/'+id));
export const CURRENT_SASS_C04_RETENTION_CASE_IDS=Object.freeze([
 'mixin-css/legacy-button-color','mixin-css/legacy-button-theme','mixin-css/legacy-button-typography','direct-legacy-color/fab',
]);
const sorted=refs=>refs.sort((a,b)=>a.path.localeCompare(b.path));
const union=(a,b)=>sorted([...new Map([...a,...b].map(r=>[r.path,r])).values()]);

export {captureSpinnerSnackC04Metadata} from './measure-sass-inspection-scope.mjs';

export function spinnerSnackC04Source(args){
 const captured=argumentsSnapshot(args,['root','read']);let {root,read}=captured.values;
 root=resolve(root);const boundary=physicalBoundary(root,read);read=boundary.read;
 assert.ok(equalBytes(read(SELF),image));
 const assertCardInputs=()=>{for(const ref of CARD_EXPECTATION_INPUTS){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}};assertCardInputs();
 const bridge=createCurrentSassSource({root,read});
 const tools=currentSassToolReferenceSubject({root,read});assert.equal(tools.line,bridge.line);
 const ownedToolPaths=new Set(tools.transitions.map(row=>row.path)),ownedPaths=new Set([...bridge.transitions.map(row=>row.path),...ownedToolPaths]);
 const reports=new Map(),reportRefs=tools.line==='21.x'?Object.values(REPORTS):[];
 for(const ref of reportRefs){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);reports.set(ref.path,JSON.parse(ref.path.endsWith('.gz')?gunzipSync(raw):raw));}
 const qualifyInternal=ref=>{
  const capture=()=>captureCurrentSassMetadata(ref);
  const original=capture();
  // Other references are unchanged metadata, with no current-source qualification.
  if(!ownedPaths.has(original.path))return ref;
  const product=bridge.qualify(original);
  const source=product?{...original,sha256:product.sha256,...(Object.hasOwn(original,'bytes')?{bytes:product.bytes}:{})}:original,tool=tools.qualify(source);
  if(ownedToolPaths.has(original.path))assert.ok(tool,'unknown owned C04 tool reference');
  assert.deepEqual(capture(),original,'C04 reference changed during qualification');
  return tool??source;
 };
 const qualify=ref=>{const original=captureCurrentSassMetadata(ref);if(!ownedPaths.has(original.path))return ref;const result=qualifyInternal(ref);boundary.assertPhysical();return result;};
 const assertCurrent=()=>{bridge.assertCurrent();tools.assertCurrent();assertCardInputs();for(const ref of reportRefs){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}boundary.assertPhysical();};
 const bound=union(structuredClone([...bridge.bound,...tools.bound]),structuredClone([...reportRefs,...CARD_EXPECTATION_INPUTS])),summary=currentSassSourceSummary(bridge);
 const assertReportSuccessor=(kind,current)=>{
  assert.equal(typeof kind,'string');const currentSnapshot=captureCurrentSassMetadata(current);
  assert.ok(Object.hasOwn(REPORTS,kind));const historical=reports.get(REPORTS[kind].path);assert.ok(historical);
  const expected=structuredClone(historical);
  expected.current_source_bindings=union(bound,historical.current_source_bindings.map(qualifyInternal));
  expected.current_public_bridge=structuredClone(summary);
  if(kind==='theming-inspection'){
   assert.equal(expected.public_override_boundaries,4);expected.public_override_boundaries=9;
   assert.equal(expected.current_owned_sources_and_loaded_peers_match_retained_measurement,true);delete expected.current_owned_sources_and_loaded_peers_match_retained_measurement;
   expected.historical_owned_sources_and_loaded_peers_match_retained_measurement_except_separate_five_module_successor=true;
  }else if(kind==='inspection-compatibility'){
   assert.equal(expected.public_override_boundaries,4);expected.public_override_boundaries=9;expected.historical_public_override_boundaries=4;
   expected.shared_sass_owner=qualifyInternal(expected.shared_sass_owner);
  }else if(kind==='control-m3-theme'){
   const scopeRef=historical.current_source_bindings.find(r=>r.path==='compatibility/rc/upstream-sass-inspection-current-scope.json.gz');assert.ok(scopeRef);
   const raw=read(scopeRef.path);assert.equal(hash(raw),scopeRef.sha256);const scope=JSON.parse(gunzipSync(raw)).actual;
   const publicRefs=scope.current.loaded_sources.map(r=>({path:'/@angular/'+(r.root===0?'material':'cdk')+'/'+r.path,sha256:r.sha256,bytes:r.bytes}));
   let count=0;
   for(const row of expected.control_measurement.cases){
    const selected=SPINNER_SNACK_CONTROL_CASE_IDS.includes(row.case_id);
    row.actual.loaded_sources=row.actual.loaded_sources.map(r=>{
     if(!r.path.startsWith('/owned/material/'))return r;
     const next=qualifyInternal({...r,path:'projects/ngx-material-legacy/styles/'+r.path.slice('/owned/material/'.length)});
     return {...r,sha256:next.sha256,bytes:next.bytes};
    });
    if(/^(?:progress-spinner|snack-bar)-(?:color|theme|typography|density)$/.test(row.mixin))row.actual.loaded_sources=union(row.actual.loaded_sources,publicRefs);
    if(selected){
     assert.equal(row.comparison,'exact-untouched16');assert.equal(row.peer,null);assert.equal(row.actual.css,row.expected.css);assert.equal(row.actual.css_sha256,row.expected.css_sha256);assert.equal(row.actual.css_bytes,row.expected.css_bytes);
     const family=row.mixin.startsWith('snack-bar-')?'snack-bar':'progress-spinner',dimension=row.mixin.slice(family.length+1);
     const css=spinnerSnackPositionedTokenCss({family,dimension,originalCss:row.expected.css});assert.equal(typeof css,'string');
     row.actual.css=css;row.actual.css_sha256=hash(css);row.actual.css_bytes=Buffer.byteLength(css);
     row.comparison='finite-current-spinner-snack-positioned-public-tokens';count++;
    }
   }
   assert.equal(count,10);assert.equal(expected.control_measurement.exact_tagged_cases,52);expected.control_measurement.exact_tagged_cases=42;expected.control_measurement.current_spinner_snack_bridge_cases=10;
  }else if(kind==='remaining-unthemable'){
   for(const row of expected.argument_measurement.cases)row.actual.loaded_sources=row.actual.loaded_sources.map(ref=>{
    if(!ref.path.startsWith('/owned/material/'))return ref;
    const current=qualifyInternal({...ref,path:'projects/ngx-material-legacy/styles/'+ref.path.slice('/owned/material/'.length)});
    return {...ref,sha256:current.sha256,bytes:current.bytes};
   });
  }
  assertCurrent();assert.deepEqual(currentSnapshot,expected,'C04 report changed beyond the exact five-module source successor: '+kind);assertCurrent();assert.deepEqual(captureCurrentSassMetadata(current),currentSnapshot,'C04 current report changed during final source guards');const result=structuredClone(historical);boundary.assertPhysical();return result;
 };
 const finish=operation=>{const result=operation();boundary.assertPhysical();return result;};
 const publicBridge={...structuredClone(Object.fromEntries(Object.entries(bridge).filter(([key,value])=>!['guardNode','guardPlan'].includes(key)&&typeof value!=='function'))),qualify:ref=>finish(()=>bridge.qualify(ref)),assertCurrent:()=>finish(()=>bridge.assertCurrent()),assertHistoricalSource:(path,expected)=>finish(()=>bridge.assertHistoricalSource(path,expected))};
 assertCurrent();const result={bridge:publicBridge,qualify,assertCurrent,assertReportSuccessor,
  bound:structuredClone(bound),
  summary:structuredClone(summary),
  assertHistoricalSource:(path,expected)=>finish(()=>bridge.assertHistoricalSource(path,expected))};
 states.set(result,{bound,summary,qualify:qualifyInternal,assertCurrent,assertPhysical:boundary.assertPhysical});sameArguments(captured);boundary.assertPhysical();return result;
}

/** Only the four authenticated nested ordinary-button measurements change. */
export function assertSpinnerSnackRetentionSuccessor(args){
 const captured=argumentsSnapshot(args,['historical','current','source']);let {historical,current,source}=captured.values;
 const liveHistorical=historical,liveCurrent=current;historical=captureCurrentSassMetadata(historical);current=captureCurrentSassMetadata(current);
 source=states.get(source);assert.ok(source,'unrecognized C04 source subject');
 const expected=structuredClone(historical),fab=historical.subjects.find(row=>row.family==='fab');assert.ok(fab);assert.equal(fab.legacy_prefix,'legacy-button');
 for(const key of ['input_members','loaded_sources'])expected[key]=historical[key].map(source.qualify);
 expected.input_members.push(...source.bound.filter(ref=>!expected.input_members.some(r=>r.path===ref.path)));
 expected.producer=source.qualify(historical.producer);expected.current_public_bridge=structuredClone(source.summary);
 const snack=expected.subjects.find(row=>row.family==='snack-bar');assert.ok(snack);
 snack.modern_theme_exact_after_MDC_relocation=false;snack.historical_modern_source_exact_after_MDC_relocation=true;snack.separate_current_public_bridge=true;
 for(const id of CURRENT_SASS_C04_RETENTION_CASE_IDS){
  const rows=id.startsWith('direct-')?expected.direct_original_legacy_color_cases:expected.public_legacy_default_CSS_cases;
  const selected=rows.filter(row=>row.case_id===id);assert.equal(selected.length,1);Object.assign(selected[0],currentLegacyRetentionMeasurement(id));
 }
 source.assertCurrent();assert.deepEqual(current,expected,'legacy retention changed beyond the finite five-module source and nested button CSS successor');
 source.assertCurrent();sameArguments(captured);assert.deepEqual(captureCurrentSassMetadata(liveHistorical),historical);assert.deepEqual(captureCurrentSassMetadata(liveCurrent),current);source.assertPhysical();return true;
}

export function assertSpinnerSnackTokenPlacementSuccessor(args){
 const captured=argumentsSnapshot(args,['historical','current','source']);let {historical,current,source}=captured.values;
 const liveHistorical=historical,liveCurrent=current;historical=captureCurrentSassMetadata(historical);current=captureCurrentSassMetadata(current);
 source=states.get(source);assert.ok(source,'unrecognized C04 source subject');
 let expected=structuredClone(historical);
 assert.equal(expected.public_legacy_default_CSS_cases.length,15);assert.equal(expected.direct_original_legacy_color_cases.length,5);
 for(const key of ['input_members','loaded_sources'])expected[key]=historical[key].map(source.qualify);
 expected.input_members.push(...source.bound.filter(ref=>!expected.input_members.some(r=>r.path===ref.path)));
 expected.producer=source.qualify(historical.producer);expected.current_public_bridge=structuredClone(source.summary);
 for(const row of expected.families){
  const bridge=['checkbox','progress-spinner'].includes(row.family);
  if(bridge){assert.equal(row.modern_theme_exact_tagged_bytes_after_MDC_import_relocation,true);row.modern_theme_exact_tagged_bytes_after_MDC_import_relocation=false;}
  row.historical_modern_source_exact_after_MDC_relocation=bridge;row.separate_current_public_bridge=bridge;
 }
 expected=ordinaryCardTokenPlacementExpected({line:historical.line,prior:expected});
 source.assertCurrent();assert.deepEqual(current,expected,'token placement changed beyond the finite current five-module source successor');source.assertCurrent();sameArguments(captured);assert.deepEqual(captureCurrentSassMetadata(liveHistorical),historical,'historical token-placement input changed during final guards');assert.deepEqual(captureCurrentSassMetadata(liveCurrent),current,'current token-placement input changed during final guards');source.assertPhysical();return true;
}
