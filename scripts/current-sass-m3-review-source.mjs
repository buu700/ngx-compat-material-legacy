/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Three finite report successors. Historical records remain data; CSS is unchanged. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {join,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {captureCurrentSassMetadata} from './current-sass-inspection-scope.mjs';
const SELF='scripts/current-sass-m3-review-source.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const REPORTS={
 "core-tokenization": {
  "path": "compatibility/rc/21x-c04-core-tokenization-source-review.json.gz",
  "sha256": "ba0ce00a87e99a2b75b9ce89314dd9874878ce86682daefaad864de2e1ef6c04",
  "bytes": 2290293,
  "count": 642,
  "key": "argument_measurement",
  "cases": 32
 },
 "foundation-m3-theme": {
  "path": "compatibility/rc/21x-c04-foundation-m3-theme-source-review.json.gz",
  "sha256": "796997f473b80a8fb5d4f7e78e80091330041ece6a2246d72988985b30a0450a",
  "bytes": 1791640,
  "count": 641,
  "key": "foundation_measurement",
  "cases": 136
 },
 "surface-m3-theme": {
  "path": "compatibility/rc/21x-c04-surface-m3-theme-source-review.json",
  "sha256": "676d90777a549f651819bd40e6e244b529912cb463cae8f5f958fcca0f78269b",
  "bytes": 1559335,
  "count": 634,
  "key": "surface_measurement",
  "cases": 36
 }
};
const productPaths=['button','checkbox','progress-spinner','snack-bar','card'].map(f=>'projects/ngx-material-legacy/styles/'+f+'/_'+f+'-theme.scss');
const refOnly=r=>({path:r.path,sha256:r.sha256,bytes:r.bytes});
export function m3ReviewBindingUnion(...groups){
 const map=new Map();for(const r of groups.flat()){const ref=refOnly(r),old=map.get(ref.path);if(old)assert.deepEqual(old,ref,'conflicting report source '+ref.path);else map.set(ref.path,ref);}
 return [...map.values()].sort((a,b)=>a.path.localeCompare(b.path));
}
export function m3ReviewSourceInputs(kind){assert.ok(Object.hasOwn(REPORTS,kind));return [refOnly(REPORTS[kind]),{path:SELF,sha256:hash(image),bytes:image.length}];}
export function authenticateM3HistoricalReport(kind,raw){
 assert.ok(Object.hasOwn(REPORTS,kind));assert.ok(Buffer.isBuffer(raw));const known=REPORTS[kind];assert.equal(hash(raw),known.sha256);assert.equal(raw.length,known.bytes);
 const historical=JSON.parse(kind==='surface-m3-theme'?raw:gunzipSync(raw));assert.equal(historical.line,'21.x');assert.equal(historical.current_source_bindings.length,known.count);assert.equal(historical[known.key].case_count,known.cases);return historical;
}
const bufferEquals=Buffer.prototype.equals,equalBytes=(a,b)=>Buffer.isBuffer(b)&&Reflect.apply(bufferEquals,a,[b]);
function physical(root,path){
 assert.equal(typeof path,'string');assert.ok(path&&!isAbsolute(path)&&!path.includes('\\')&&!path.includes('\0')&&path.split('/').every(p=>p&&p!=='.'&&p!=='..'));
 const regular=(base,parts)=>{let file=base;for(const part of parts){file=join(file,part);assert.equal(lstatSync(file).isSymbolicLink(),false);}assert.ok(lstatSync(file).isFile());return readFileSync(file);};
 const peer=/^node_modules\/(@angular\/(?:core|material|cdk)|sass)\/(.+)$/.exec(path);if(!peer)return regular(root,path.split('/'));
 const modules=join(root,'node_modules');assert.ok(lstatSync(modules).isDirectory()&&!lstatSync(modules).isSymbolicLink());
 if(peer[1].startsWith('@angular/'))assert.ok(lstatSync(join(modules,'@angular')).isDirectory()&&!lstatSync(join(modules,'@angular')).isSymbolicLink());
 const base=realpathSync(join(modules,peer[1]));assert.ok(lstatSync(base).isDirectory());assert.equal(JSON.parse(regular(base,['package.json'])).name,peer[1]);
 if(peer[1]==='sass')assert.ok(['package.json','sass.node.js','sass.dart.js'].includes(peer[2]));return regular(base,peer[2].split('/'));
}
const ref=(path,raw)=>({path,sha256:hash(raw),bytes:raw.length});

/** Public read callbacks must return actual current bytes. Final sweep has no callbacks. */
export function m3ReviewPhysicalReader({root,read:suppliedRead}){
 root=resolve(root);assert.equal(typeof suppliedRead,'function');const retained=new Map();
 const read=path=>{const actual=physical(root,path),before=retained.get(path);if(before)assert.ok(equalBytes(actual,before),'changed retained M3 input '+path);else retained.set(path,Buffer.from(actual));assert.ok(equalBytes(actual,suppliedRead(path)),'nonphysical M3 input '+path);assert.ok(equalBytes(actual,physical(root,path)),'M3 input changed during callback '+path);return actual;};
 const assertPhysical=()=>{for(const[path,before]of retained)assert.ok(equalBytes(physical(root,path),before),'changed final M3 input '+path);};return {read,assertPhysical};
}
function actualSourceReference(ref,qualify,virtual){
 let path=null;
 if(virtual){if(ref.path.startsWith('/owned/material/'))path='projects/ngx-material-legacy/styles/'+ref.path.slice('/owned/material/'.length);else if(ref.path.startsWith('/owned/package/'))path='projects/ngx-material-legacy/'+ref.path.slice('/owned/package/'.length);}
 else if(ref.root===0)path='projects/ngx-material-legacy/'+ref.path;
 if(!productPaths.includes(path))return ref;
 const current=qualify({path,sha256:ref.sha256,bytes:ref.bytes});assert.equal(current.path,path);assert.match(current.sha256,/^[0-9a-f]{64}$/);assert.ok(Number.isSafeInteger(current.bytes)&&current.bytes>0);
 return {...ref,sha256:current.sha256,bytes:current.bytes};
}
/** Pure finite metadata expectation, not a report/source admission. The producer
 * authenticates raw history, uses the current owner and compares the WHOLE result. */
export function currentM3ReviewExpectedReport({kind,historical,qualify,ownerBound,summary,sharedBound}={}){
 assert.ok(Object.hasOwn(REPORTS,kind));historical=captureCurrentSassMetadata(historical);ownerBound=captureCurrentSassMetadata(ownerBound);summary=captureCurrentSassMetadata(summary);sharedBound=captureCurrentSassMetadata(sharedBound);
 const known=REPORTS[kind];assert.equal(historical.line,'21.x');assert.equal(historical.current_source_bindings.length,known.count);assert.equal(historical[known.key].case_count,known.cases);assert.equal(typeof qualify,'function');
 const expected=structuredClone(historical);
 expected.current_source_bindings=m3ReviewBindingUnion(ownerBound,historical.current_source_bindings.map(r=>qualify(r)),m3ReviewSourceInputs(kind));
 const toolKey=kind==='surface-m3-theme'?'existing_companion_contract_inputs':'shared_contract_inputs';expected[toolKey]=historical[toolKey].map(r=>qualify(r));
 for(const list of ['cases','ripple'])for(const row of expected[known.key][list]??[]){
  // Every emitted CSS/program/expected/peer field stays byte/value identical.
  row.actual.loaded_sources=row.actual.loaded_sources.map(r=>actualSourceReference(r,qualify,true));
  if(Object.hasOwn(row.actual,'sources'))row.actual.sources=row.actual.sources.map(r=>actualSourceReference(r,qualify,false));
 }
 if(kind==='core-tokenization'){assert.equal(expected.tree_density_boundary.rows.length,11);for(const row of expected.tree_density_boundary.rows)if(Object.hasOwn(row.actual,'loaded_sources'))row.actual.loaded_sources=row.actual.loaded_sources.map(r=>actualSourceReference(r,qualify,true));}
 if(kind==='surface-m3-theme')expected.shared_source_bindings=sharedBound.length;
 expected.current_public_bridge=summary;return expected;
}
