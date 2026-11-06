/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual,types} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createOrdinaryDensityGateContext} from './sass-ordinary-density-gate.mjs';
import {createCurrentSpinnerSnackContract} from './current-sass-spinner-snack-contract.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url))),self=readFileSync(new URL(import.meta.url)), hashes={'21.x':'cc59d90e3d9372672075cf3251265ac5cc2994323c64b611dff2d2364fd75303',main:'cf06be9e521619c25248f885f79a0619f0f598084741a33744a708ca51961342'},sha=b=>createHash('sha256').update(b).digest('hex');
function check(line){if(!readFileSync(new URL(import.meta.url)).equals(self))throw Error('guard changed');const raw=readFileSync(join(root,'fixtures/sass/ordered-button-proof-inputs.json'));if(sha(raw)!==hashes[line])throw Error('manifest changed');const m=JSON.parse(raw);if(m.schema_version!==1||!Array.isArray(m.files)||new Set(m.files.map(x=>x.path)).size!==m.files.length)throw Error('manifest invalid');for(const e of m.files){let p=root;for(const part of e.path.split('/')){if(!part||part==='.'||part==='..')throw Error('invalid path');p=join(p,part);if(lstatSync(p).isSymbolicLink())throw Error('linked input')}const b=readFileSync(p);if(b.length!==e.bytes||sha(b)!==e.sha256)throw Error('input changed');}}
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

export function orderedButtonSourceGuard(line,sources,peers,actualCss){try{check(line);const d=createOrdinaryDensityGateContext({root}),s=createCurrentSpinnerSnackContract({root}),sets=Object.values(s.source_sets);if(s.line!==line||sets.length!==1||!isDeepStrictEqual(sources,sets[0]))return false;d.assertCurrent();s.assertCurrent();const input=expectedPlain({peers}),result=isolatedExpectedComputation(root,line,'ordered-aggregate-06',input).css===actualCss;d.assertCurrent();s.assertCurrent();check(line);return result}catch{return false}}
