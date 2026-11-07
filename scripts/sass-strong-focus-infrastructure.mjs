/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact tagged-16 focus output followed by independently measured public peer output. */
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync} from 'node:fs';
import {isDeepStrictEqual,types} from 'node:util';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const helperUrls=[new URL(import.meta.url),new URL('./sass_strong_focus_infrastructure.py',import.meta.url)];
const helperImages=helperUrls.map(p=>readFileSync(p));
const helpersCurrent=()=>helperUrls.every((p,i)=>!lstatSync(p).isSymbolicLink()&&readFileSync(p).equals(helperImages[i]));
function plain(v){if(v===null||['string','boolean'].includes(typeof v))return v;if(typeof v==='number'){if(!Number.isSafeInteger(v))throw Error('number');return v}if(!v||typeof v!=='object'||types.isProxy(v))throw Error('object');const arr=Array.isArray(v);if(Object.getPrototypeOf(v)!==(arr?Array.prototype:Object.prototype))throw Error('prototype');const ds=Object.getOwnPropertyDescriptors(v),out=arr?[]:{};for(const k of Reflect.ownKeys(ds)){if(typeof k!=='string')throw Error('symbol');if(arr&&k==='length')continue;const d=ds[k];if(!Object.hasOwn(d,'value')||!d.enumerable||(arr&&!/^(?:0|[1-9][0-9]*)$/.test(k)))throw Error('descriptor');Object.defineProperty(out,k,{value:plain(d.value),enumerable:true,writable:true,configurable:true})}if(arr&&out.length!==ds.length.value)throw Error('array');return out}
const catalogUrl=new URL('../fixtures/sass/strong-focus-infrastructure-contract.json',import.meta.url);
const raw=readFileSync(catalogUrl);
if(sha(raw)!=='f68bcd081af1bee541301b2941dd7ae0639eb71e0323ba7b1d357975802b64d8')throw Error('focus catalog changed');
const catalog=JSON.parse(raw),names=['default','custom','null','false','variable','display-null','display-none','repeat'];
if(catalog.schema_version!==1||catalog.tag!=='16.2.14'||catalog.tag_commit!=='df60e733c60e572ba538f6ad0ceff3e63e527b53'||catalog.peer_version!=='22.1.7'||!isDeepStrictEqual(catalog.cases.map(x=>x.name),names)||catalog.cases[0].original_sha256!=='970c1320258c556de56a431db038cf02c8d1fa487a010fa9ef460e74ca51cb35'||catalog.peer_sources.length!==186||catalog.measurement_sources.length!==472||!isDeepStrictEqual(catalog.tag_sources,[{path:'src/material/core/focus-indicators/_focus-indicators.scss',git_blob:'785745a2805286d2bd0ebb8ebdb9da472b0017f5',sha256:'c4ec1054f22f17faf475253a301e58e16e2630a263cebd92dc00ee660d80073f',bytes:177},{path:'src/material/core/focus-indicators/_private.scss',git_blob:'8cd7070e7cd0571851ed3a6d84329d2a3033834d',sha256:'a8d9045dc9725c5867e82b82fc13d6a5ec92799627a63a1552786fdf2c9416e4',bytes:5448}])||catalog.cases.some(c=>sha(c.original_css)!==c.original_sha256||sha(c.peer_program)!==c.peer_program_sha256||sha(c.peer_css)!==c.peer_css_sha256))throw Error('focus catalog scope');
const freezeDeep=v=>{if(v&&typeof v==='object'){for(const x of Object.values(v))freezeDeep(x);Object.freeze(v);}return v;};
freezeDeep(catalog);
export const STRONG_FOCUS_CASE='mixin-css/strong-focus-indicators';
export const STRONG_FOCUS_CONTRACT='historical-strong-focus-with-public-peer';
export const STRONG_FOCUS_CALL='.sass-api-probe { @include m.strong-focus-indicators(); }';
export const STRONG_FOCUS_CASES=Object.freeze(catalog.cases);
export function measureFocusPeers(options){return catalog.cases.map(c=>measureM2PeerProgram({...options,line:'main',program:c.peer_program}));}
function expected(c,p){
 if(!peerMeasurementMatches(p,c.peer_program,{})||p.line!=='main'||p.peer_version!==catalog.peer_version||p.peer_package_json_sha256!==catalog.peer_package_json_sha256||p.css!==c.peer_css||!isDeepStrictEqual(p.sources,catalog.peer_sources))return null;
 const prefix=c.selector+' {';if(!c.original_css.startsWith(prefix)||!c.original_css.endsWith('}')||!p.css.startsWith(prefix))return null;
 const single=c.original_css.slice(0,-2)+p.css.slice(prefix.length);return Array(c.count).fill(single).join('\n');
}
function sourceOk(m){
 if(!m||m.line!=='main'||typeof m.css!=='string'||m.css_sha256!==sha(m.css)||m.css_bytes!==Buffer.byteLength(m.css)||!m.sass_version?.startsWith('dart-sass\t1.104.1\t')||!Array.isArray(m.sources)||!m.sources.length)return false;
 const required=[['_index.scss',null],['styles/core/focus-indicators/_focus-indicators.scss','e2ad7e073a9dd1954dc85a5816cc5f9c05644b9d441abc1359847b31b30f7f73'],['styles/core/focus-indicators/_private.scss','308b728b247ebfa673527ab6a3023e26fc818f40eb0e0d65b134eda97d6ccd8f']];
 return isDeepStrictEqual(m.sources,catalog.measurement_sources)&&required.every(([path,digest])=>m.sources.some(s=>s.root===0&&s.path===path&&(!digest||s.sha256===digest)))&&new Set(m.sources.map(s=>`${s.root}/${s.path}`)).size===m.sources.length&&m.sources.every(s=>[0,1,2].includes(s.root)&&typeof s.path==='string'&&s.path&&!s.path.startsWith('/')&&!s.path.includes('..')&&!s.path.includes('\\')&&/^[0-9a-f]{64}$/.test(s.sha256)&&Number.isInteger(s.bytes)&&s.bytes>0);
}
export function focusResultsMatch(actual,contract){try{
 if(!helpersCurrent()||[new URL('../fixtures/',import.meta.url),new URL('../fixtures/sass/',import.meta.url),catalogUrl].some(p=>lstatSync(p).isSymbolicLink())||sha(readFileSync(catalogUrl))!==sha(raw))return false;
 [actual,contract]=[plain(actual),plain(contract)];
 const m=actual?.actual_measurement;if(!sourceOk(m)||m.program_sha256!==catalog.default_program_sha256||actual.css!==m.css||actual.sha256!==m.css_sha256||contract?.classification!=='conforming-current-infrastructure'||contract.contract!==STRONG_FOCUS_CONTRACT||!Array.isArray(contract.variants)||contract.variants.length!==catalog.cases.length||!Array.isArray(contract.peers)||contract.peers.length!==catalog.cases.length)return false;
 for(let i=0;i<catalog.cases.length;i++){const c=catalog.cases[i],v=contract.variants[i],e=expected(c,contract.peers[i]);if(!e||v?.name!==c.name||!sourceOk(v.measurement)||v.measurement.program_sha256!==c.program_sha256||!isDeepStrictEqual(v.measurement.sources,m.sources)||v.measurement.css!==e)return false;}
 return m.css===expected(catalog.cases[0],contract.peers[0])&&helpersCurrent();
}catch{return false}}
