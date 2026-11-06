/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Public measurement exports; acceptance computes expected CSS in isolation. */
export * from './sass-ordered-aggregate-model.mjs';
import {ORDERED_AGGREGATE_CASES,ORDERED_AGGREGATE_CONTRACT,orderedAggregateMeasurementOk} from './sass-ordered-aggregate-model.mjs';
import {orderedButtonSourceGuard} from './sass-ordered-button-source-guard.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual,types} from 'node:util';
const expectedSha=b=>createHash('sha256').update(b).digest('hex'),expectedEngineHash='6f6475a85f4361d0bb90c15c5b966c799499def63d2f1f5a93e2bfb09d584b86';
function expectedPlain(v){
 if(v===null||['string','boolean'].includes(typeof v))return v;
 if(typeof v==='number'){if(!Number.isSafeInteger(v))throw Error('number');return v;}
 if(!v||typeof v!=='object'||types.isProxy(v))throw Error('plain expected input');
 const a=Array.isArray(v);if(Object.getPrototypeOf(v)!==(a?Array.prototype:Object.prototype))throw Error('prototype');
 const out=a?[]:{},ds=Object.getOwnPropertyDescriptors(v);
 for(const k of Reflect.ownKeys(ds)){if(typeof k!=='string')throw Error('symbol');if(a&&k==='length')continue;const d=ds[k];if(!Object.hasOwn(d,'value')||!d.enumerable||(a&&!/^(?:0|[1-9][0-9]*)$/.test(k)))throw Error('descriptor');Object.defineProperty(out,k,{value:expectedPlain(d.value),enumerable:true,writable:true,configurable:true});}
 if(a&&out.length!==ds.length.value)throw Error('sparse array');return out;
}
function isolatedExpectedComputation(root,line,operation,input){
 const payload=expectedPlain(input),raw=readFileSync(join(root,'scripts/sass-expected-snapshot-engine.mjs'));
 if(expectedSha(raw)!==expectedEngineHash)throw Error('trusted expected bootstrap changed');
 const env={LANG:'C.UTF-8',LC_ALL:'C.UTF-8',TZ:'UTC'};
 const result=spawnSync(process.execPath,['--input-type=module','--eval',raw.toString('utf8'),root,line,operation],{cwd:root,env,input:JSON.stringify(payload),encoding:'utf8',timeout:150000,maxBuffer:20*1024*1024});
 if(result.error||result.status!==0||result.signal)throw Error('expected isolation failed: '+String(result.stderr).slice(0,1000));
 const out=expectedPlain(JSON.parse(result.stdout));
 if(out.line!==line||out.operation!==operation||out.request_sha256!==expectedSha(JSON.stringify(payload))||out.schema_version!==1||typeof out.css!=='string'||out.css_sha256!==expectedSha(out.css)||out.css_bytes!==Buffer.byteLength(out.css)||!isDeepStrictEqual(payload,expectedPlain(input)))throw Error('expected output identity');
 if(expectedSha(readFileSync(join(root,'scripts/sass-expected-snapshot-engine.mjs')))!==expectedEngineHash)throw Error('bootstrap changed during evaluation');
 return out;
}

function isolatedAggregateMatches(line,sources,peers,actualCss){
 const root=dirname(dirname(fileURLToPath(import.meta.url))),out=isolatedExpectedComputation(root,line,'ordered-aggregate-06',{peers});
 if(out.css!==actualCss)return false;
 const raw=readFileSync(join(root,'fixtures/sass/expected-isolation-inputs.json'));
 if(expectedSha(raw)!==out.closure_sha256)return false;
 const files=JSON.parse(raw).files,roots=['projects/ngx-material-legacy/','node_modules/@angular/material/','node_modules/@angular/cdk/'];
 const expected=files.flatMap(row=>roots.flatMap((prefix,index)=>row.path.startsWith(prefix)&&row.path.endsWith('.scss')?[{root:index,path:row.path.slice(prefix.length),sha256:row.sha256,bytes:row.bytes}]:[])).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path));
 return expected.length>0&&isDeepStrictEqual(expected,expectedPlain(sources));
}

const entry=ORDERED_AGGREGATE_CASES['06-aggregate-and-companions'];
export function orderedAggregateResultMatches(row,record){try{
  const m=record?.actual_measurement,c=record?.current_companion;
  if(!m||!c||Object.hasOwn(record,'current_infrastructure'))return false;
  return row?.status==='blocked'&&row.baseline_sha256===entry.reference_sha256&&row.candidate_sha256===m.css_sha256
    &&record.status==='compiled'&&record.module==='@ngx-compat/material-legacy'&&record.fixture_sha256===entry.fixture_sha256&&record.css_sha256===m.css_sha256
    &&c.classification==='conforming-current-companion'&&c.contract===ORDERED_AGGREGATE_CONTRACT&&orderedAggregateMeasurementOk(m,m.line)&&m.sass_version==='dart-sass\t1.104.1\t(Sass Compiler)\t[Dart]\ndart2js\t3.13.3\t(Dart Compiler)\t[Dart]'&&orderedButtonSourceGuard(m.line,m.sources,c.peers,m.css)&&isolatedAggregateMatches(m.line,m.sources,c.peers,m.css);}catch{return false}
}
