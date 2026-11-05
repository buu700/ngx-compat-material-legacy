/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite raw report composition; historical observations remain immutable data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {captureCurrentSassMetadata} from './current-sass-inspection-scope.mjs';
import {canonicalSourcePhysicalBoundary} from './current-sass-canonical-source-boundary.mjs';
import {spinnerSnackC04Source} from './sass-spinner-snack-c04-source.mjs';
import {ordinaryCardM3BoundaryExpectedDefaults} from '../compatibility/rc/ordinary-card-c04-successor-model-v1.mjs';

const SELF='scripts/current-m3-theme-boundary-contract.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const hash=raw=>createHash('sha256').update(raw).digest('hex'),bufferEquals=Buffer.prototype.equals;
const PREFIX='compatibility/rc/21x-c04-m3-theme-boundary-';
const WITNESSES={
 '21.x':{path:PREFIX+'measurement-portable-21x.json',sha256:'60192e2b78818f1fc704d519f7ceb1a83a56b9ee8926a89aa3a6df9b0eed073e',bytes:219303},
 main:{path:PREFIX+'measurement-portable-main.json',sha256:'bbb828a9466435ee9bfc55f3f751e73953d734732bcf029816c862cff9858da7',bytes:219497},
};
export const M3_CURRENT_ABSENT=Object.freeze(['projects/ngx-material-legacy/styles/core/style/_validation.scss','projects/ngx-material-legacy/styles/core/theming/_inspection.scss']);
const union=(first,second)=>{const result=structuredClone(first),seen=new Map(result.map(row=>[row.path,row]));assert.equal(seen.size,result.length);assert.equal(new Set(second.map(row=>row.path)).size,second.length);for(const row of second){if(seen.has(row.path))assert.deepEqual(seen.get(row.path),row,'conflicting M3 source binding');else {seen.set(row.path,row);result.push(structuredClone(row));}}return result;};
function witness(portable){
 const ref=WITNESSES[portable.line];assert.ok(ref);const raw=JSON.stringify(portable,null,2)+'\n';assert.equal(hash(raw),ref.sha256,'unqualified portable M3 baseline');assert.equal(Buffer.byteLength(raw),ref.bytes);return ref;
}
/** Pure composition only. The caller authenticates every projected physical reference. */
export function composeCurrentM3BoundaryReport(args){
 const {portable,referencePairs,sourceBindings,currentPublicBridge}=captureCurrentSassMetadata(args);witness(portable);
 const refs=[...portable.input_members,...portable.loaded_sources,...portable.measurement_tools_from_review_worktree,portable.producer];
 const keys=new Set(refs.map(ref=>JSON.stringify(ref)));assert.equal(referencePairs.length,keys.size);
 const pairs=new Map();for(const pair of referencePairs){assert.deepEqual(Object.keys(pair),['before','current']);const key=JSON.stringify(pair.before);assert.ok(keys.has(key)&&!pairs.has(key));assert.equal(pair.before.path,pair.current.path);assert.deepEqual(Object.keys(pair.current),Object.keys(pair.before));assert.match(pair.current.sha256,/^[0-9a-f]{64}$/);assert.ok(Number.isSafeInteger(pair.current.bytes)&&pair.current.bytes>=0);pairs.set(key,pair.current);}
 const qualify=ref=>{const result=pairs.get(JSON.stringify(ref));assert.ok(result);return structuredClone(result);};
 const expected=structuredClone(portable);
 expected.historical_default_CSS_cases=ordinaryCardM3BoundaryExpectedDefaults({line:portable.line,historical:portable.historical_default_CSS_cases});
 expected.input_members=union(portable.input_members.map(qualify),sourceBindings);
 expected.loaded_sources=portable.loaded_sources.map(qualify);
 expected.measurement_tools_from_review_worktree=portable.measurement_tools_from_review_worktree.map(qualify);
 expected.producer=qualify(portable.producer);expected.current_public_bridge=currentPublicBridge;
 expected.historical_default_CSS_roster_retained_with_separate_finite_public_tokens=true;
 return expected;
}
export function assertCurrentM3BoundaryReportSuccessor(args){
 const {projection,current}=captureCurrentSassMetadata(args),expected=composeCurrentM3BoundaryReport(projection);
 assert.deepEqual(current,expected,'M3 report changed beyond the finite five-source and four default-CSS successor');return structuredClone(projection.portable);
}
function argumentsSnapshot(args){
 assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(args);for(const key of Reflect.ownKeys(descriptors)){assert.ok(['root','read'].includes(key));assert.ok(Object.hasOwn(descriptors[key],'value'));}
 const values=Object.fromEntries(Object.entries(descriptors).map(([key,d])=>[key,d.value]));
 return {values,assertCurrent(){assert.equal(Object.getPrototypeOf(args),Object.prototype);const now=Object.getOwnPropertyDescriptors(args);assert.deepEqual(Reflect.ownKeys(now),Reflect.ownKeys(descriptors));for(const key of Reflect.ownKeys(descriptors)){assert.ok(Object.hasOwn(now[key],'value'));assert.equal(now[key].value,descriptors[key].value);for(const flag of ['enumerable','configurable','writable'])assert.equal(now[key][flag],descriptors[key][flag]);}}};
}
/** Private current source context. It never invokes an historical source constructor. */
export function currentM3ThemeBoundarySubject(args){
 const captured=argumentsSnapshot(args);let {root,read}=captured.values;root=resolve(root);
 const physical=canonicalSourcePhysicalBoundary({root,read,absentPaths:M3_CURRENT_ABSENT});read=physical.read;
 const source=spinnerSnackC04Source({root,read}),bound=new Map(source.bound.map(row=>[row.path,row]));
 const member=ref=>{const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);const actual={path:ref.path,sha256:ref.sha256,bytes:raw.length};if(bound.has(ref.path))assert.deepEqual(bound.get(ref.path),actual);else bound.set(ref.path,actual);return raw;};
 member({path:SELF,sha256:hash(image),bytes:image.length});
 assert.equal(source.summary.current_source.source_modules.length,5);const portable=JSON.parse(member(WITNESSES[source.bridge.line]));witness(portable);
 const assertCurrent=()=>{source.assertCurrent();for(const row of bound.values())member(row);captured.assertCurrent();physical.assertPhysical();};
 const projection=()=>{
  const refs=[...portable.input_members,...portable.loaded_sources,...portable.measurement_tools_from_review_worktree,portable.producer],pairs=new Map();
  for(const before of refs){const key=JSON.stringify(before);if(!pairs.has(key))pairs.set(key,{before:structuredClone(before),current:source.qualify(before)});}
  const result={portable:structuredClone(portable),referencePairs:[...pairs.values()],sourceBindings:structuredClone([...bound.values()]),currentPublicBridge:structuredClone(source.summary)};
  assertCurrent();return result;
 };
 const expectedReport=()=>{const result=composeCurrentM3BoundaryReport(projection());assertCurrent();physical.assertPhysical();return result;};
 const assertSuccessor=current=>{const before=captureCurrentSassMetadata(current),result=assertCurrentM3BoundaryReportSuccessor({projection:projection(),current:before});assertCurrent();assert.deepEqual(captureCurrentSassMetadata(current),before,'M3 current report changed during final guards');physical.assertPhysical();return result;};
 const qualifyReference=incoming=>{const before=captureCurrentSassMetadata(incoming),result=source.qualify(before);if(result===before)return result;assertCurrent();assert.deepEqual(captureCurrentSassMetadata(incoming),before);physical.assertPhysical();return result;};
 const result={line:portable.line,bound:structuredClone([...bound.values()]),summary:structuredClone(source.summary),portable:structuredClone(portable),expectedReport,assertSuccessor,assertCurrent,qualifyReference,
  assertHistoricalSource:(path,expected)=>{assert.ok(typeof expected==='string'||Buffer.isBuffer(expected));const before=Buffer.from(expected),result=source.assertHistoricalSource(path,before);assertCurrent();assert.ok(typeof expected==='string'||Reflect.apply(bufferEquals,before,[expected]),'M3 historical comparison changed during final guards');physical.assertPhysical();return result;},assertPhysical:physical.assertPhysical};
 assertCurrent();physical.assertPhysical();return result;
}
